# GastroGoan: previsión de costes y límites por número de clientes

Redactado el 26/11/2026 a petición del informático externo (punto «Previsión de costes por cliente» de `CHECKLIST-LUNES.md`). Es la ampliación de `GUIA-PARA-EL-DUENO.md` §7.

**Cómo leerlo.** Cada cifra externa (precio o límite de un proveedor) lleva su fuente y la fecha en que se consultó (26/11/2026). Si no he podido verificarla, pone **«no verificado»** y no hay cifra. Las cuentas que son mías (no del proveedor) van marcadas como **estimación** con sus supuestos, para que se puedan discutir. Los precios de los proveedores cambian: antes de decidir nada con dinero, volver a abrir la fuente.

**Regla de oro (CLAUDE.md):** nada puede costarle dinero al dueño por cada cliente que vende, y no hay pagos recurrentes si hay alternativa técnica. Todo lo de abajo se mide contra eso.

---

## 1. Qué paga quién

| Pieza | Para qué sirve | Quién la paga |
|---|---|---|
| Cloudflare Pages (4 proyectos: app, reservas, web comercial, admin) | Servir los ficheros estáticos | GastroGoan, plan gratuito |
| Firebase de la plataforma (`plataforma-gastrogoan`) | Registro de licencias y guía mínima | GastroGoan, plan gratuito (Spark) |
| Firebase de cada negocio | Todos los datos del negocio y el espejo público | **El negocio**, plan gratuito (Spark) |
| Stripe (cobros del restaurante) | Cobrar a sus clientes | **El restaurante** (comisión) |
| Stripe (cobro de licencias y Plan 360) | Cobrar a los hosteleros | GastroGoan (comisión sobre cada venta) |
| Worker de pagos (Cloudflare) | Crear cobros y recibir el aviso de Stripe | GastroGoan, plan gratuito |
| Servidor Hetzner (`reservas.gastrogoan.com`) | Servir la web de reservas con IP propia (LaLiga) | GastroGoan, ~5,5 €/mes + IVA (**único coste fijo**) |
| Dominios | `gastrogoan.com` y subdominios | GastroGoan (renovación anual) |
| IA (Gemini/Claude/ChatGPT) | I+D y «Pregúntale a tus números» | **El negocio**, con su propia clave |

---

## 2. Límites y precios externos verificados

| Dato | Valor | Fuente (consultada el 26/11/2026) |
|---|---|---|
| Firebase Spark, Realtime Database: conexiones simultáneas | 100 | firebase.google.com/pricing y firebase.google.com/docs/database/usage/limits |
| Firebase Spark: almacenamiento | 1 GB | firebase.google.com/pricing |
| Firebase Spark: descarga | 10 GB al mes | firebase.google.com/pricing |
| Firebase Blaze: conexiones | 200.000 por base de datos; se pueden crear más bases | firebase.google.com/pricing |
| Firebase Blaze: precio sobre lo gratuito | 5 $/GB almacenado (gratis hasta 1 GB); 1 $/GB descargado (gratis hasta 360 MB/día) | firebase.google.com/pricing |
| Firebase Authentication | 50.000 usuarios activos al mes sin coste | firebase.google.com/pricing (la página no da límites específicos de sesión anónima) |
| Firebase RTDB: escrituras | 1.000 por segundo por base de datos («no es un límite duro») | firebase.google.com/docs/database/usage/limits |
| Firebase RTDB: tamaño de escritura | 256 MB por REST, 16 MB por SDK | firebase.google.com/docs/database/usage/limits |
| Cloudflare Pages Free: publicaciones | 500 al mes (y 1 a la vez) | developers.cloudflare.com/pages/platform/limits/ |
| Cloudflare Pages: ficheros por sitio / tamaño máximo de un fichero | 20.000 / 25 MiB | developers.cloudflare.com/pages/platform/limits/ |
| Cloudflare Pages: proyectos por cuenta / dominios por proyecto (Free) | 100 / 100 | developers.cloudflare.com/pages/platform/limits/ |
| Cloudflare Pages: peticiones a ficheros estáticos | «gratuitas e ilimitadas» en planes gratuito y de pago | developers.cloudflare.com/pages/functions/pricing/ |
| Cloudflare Workers Free: peticiones | 100.000 al día (se reinicia a medianoche UTC) | developers.cloudflare.com/workers/platform/limits/ |
| Cloudflare Workers Free: CPU por petición / subpeticiones | 10 ms / 50 | developers.cloudflare.com/workers/platform/limits/ |
| Stripe: tarjetas europeas estándar | 1,5 % + 0,25 € por cobro correcto | stripe.com/es/pricing |
| Stripe: tarjetas europeas premium | 2,8 % + 0,25 € | stripe.com/es/pricing |
| Stripe Connect, modelo «tú controlas las comisiones de tus usuarios» | La plataforma paga 2 €/mes por cuenta activa + 0,25 % + 0,10 € por transferencia | stripe.com/es/connect/pricing |
| Stripe Connect, modelo «Stripe controla las comisiones» | La plataforma no paga nada por cuenta, volumen ni transferencia | stripe.com/es/connect/pricing |
| Stripe Connect, cobro directo | La cuenta conectada paga las comisiones, devoluciones y contracargos de Stripe | stripe.com/es/connect/pricing |
| Hetzner Cloud CPX02 (1 vCPU, 1 GB, 20 GB NVMe) en Helsinki | 5,49 €/mes sin IVA, 20 TB de tráfico incluidos; exceso 1,00 €/TB | hetzner.com/cloud/regular-performance/ |
| Cloudflare Registrar | Precio de coste, sin recargo sobre el registro | cloudflare.com/products/registrar/ (la página no da el precio de un .com) |

### No verificado (no hay cifra; no la invento)

- Precio anual de `gastrogoan.com` y de la renovación. El registrador es Cloudflare (confirmado por el dueño el 26/11; antes estuvo en Canva): mirar el precio en su panel.
- Si el límite de 500 publicaciones de Pages es **por cuenta o por proyecto** (la página del límite no lo aclara). Importa porque hay cuatro proyectos desde el mismo repositorio.
- Qué pasa exactamente en Firebase Spark cuando se supera la cuota de descarga o de almacenamiento (si se corta, si se limita, hasta cuándo). No he encontrado el texto oficial.
- Cómo cuenta Firebase Authentication los usuarios anónimos para el límite de 50.000 al mes.
- Comisión de Stripe por cobrar las licencias como **suscripción** (Stripe Billing): suele cobrarse aparte del 1,5 % + 0,25 €, pero no he podido verificar la cifra.
- Que `responsibilities: {fees_collector:'stripe', losses_collector:'stripe'}` (lo que crea hoy el Worker, `worker/pagos-worker.js`, línea 292) equivale exactamente al modelo «Stripe controla las comisiones» de la tabla. Es la lectura natural y encaja con CLAUDE.md («comisiones a su cargo»), pero **pedir a Stripe (soporte) confirmación por escrito**: si no fuera así, serían 2 €/mes por restaurante conectado y rompería la regla de oro (a 500 restaurantes con Stripe: 1.000 €/mes).
- Tiempo de desconexión por inactividad de una conexión de Firebase y política de limpieza de cuentas anónimas.

---

## 3. Tabla de uso por número de licencias

Supuestos de las estimaciones, para que se puedan corregir:

- Tamaño medido de la web de reservas: `deploy/reservas/public/index.html` = 736 KB, 230 KB comprimido (medido hoy). La app: `deploy/app/public/index.html` = 7,9 MB, 2,5 MB comprimido (medido hoy con `gzip -9`).
- Cada app guarda el programa en el navegador (`sw.js`): una vez descargada, solo consulta `version.json` (29 bytes).
- Ratio de conexiones a la plataforma: la app abre una conexión a `plataforma-gastrogoan` solo cuando necesita la plataforma y la suelta **30 s después** de la última operación (`PLATAFORMA_ESPERA_ANTES_DE_SOLTAR`, js/core.js). Excepción: un negocio con reglas antiguas mantiene un oyente permanente (ver §4.2).

| Pieza | 1 licencia | 50 licencias | 500 licencias | 5.000 licencias |
|---|---|---|---|---|
| **Cloudflare Pages** (peticiones estáticas ilimitadas) | 0 € | 0 € | 0 € | 0 € |
| Publicaciones de Pages (límite 500/mes; 4 proyectos) | no depende de los clientes, depende de cuánto se publique: con publicación «por tandas» (CLAUDE.md) sobra | igual | igual | igual |
| **Firebase de la plataforma**: datos | unos KB | unos cientos de KB (estimación) | unos MB (estimación) | decenas de MB como mucho (estimación; el límite es 1 GB) |
| Firebase de la plataforma: conexiones simultáneas (límite 100) | 1-2 | menos de 10 | ver §4.2, pico estimado 2-17 | ver §4.2, pico estimado 17-80 con negocios al día; con negocios en reglas antiguas, **se acerca al techo** |
| **Firebase de cada negocio** (lo paga el negocio) | 0 € mientras no pase de 100 conexiones, 1 GB y 10 GB/mes de descarga; ver §4.1 | igual por negocio | igual por negocio | igual por negocio; **no suma** a GastroGoan |
| **Stripe**, cobros del restaurante | 0 € para GastroGoan (el restaurante paga 1,5 % + 0,25 € o 2,8 % + 0,25 €) | idem | idem | idem, **siempre que se confirme el modelo de comisiones** (§2) |
| **Stripe**, venta de licencias (a cargo de GastroGoan, descontado del ingreso) | estimación: 300 € + IVA = 363 € cobrados; tarjeta estándar europea: 5,70 € (1,5 % + 0,25 €), premium: 10,41 € (2,8 % + 0,25 €); más la comisión de suscripción, **no verificada** | por 50 ventas: ~285 a ~520 € | ~2.850 a ~5.200 € | ~28.500 a ~52.000 € (siempre unos 1,6 % a 2,9 % de lo cobrado, más Billing) |
| **Worker de pagos**: 100.000 peticiones/día, 10 ms CPU | 0 € | 0 € | 0 € | 0 € si no se pasa de 100.000 peticiones al día; con unas 3-4 peticiones por cobro (estimación) son unos 25.000 cobros al día; **el límite de 10 ms de CPU no está medido** (§4.3) |
| **Hetzner CPX02**: 20 TB incluidos | 5,49 € + IVA/mes | 5,49 € | 5,49 € | 5,49 €; la web pesa 230 KB comprimida, así que 20 TB son unas 87 millones de cargas completas al mes (estimación aritmética); cada cliente solo la baja entera una vez (service worker) |
| **Dominios** | no verificado | no verificado | no verificado | no verificado (coste anual fijo, no crece con las licencias) |
| **Coste mensual de GastroGoan por infraestructura** | ~5,5 € + IVA | ~5,5 € + IVA | ~5,5 € + IVA | ~5,5 € + IVA (más el dominio y la comisión de Stripe sobre sus propias ventas) |

El dato que sostiene la tabla: **lo único que crece con el número de licencias es lo que usa la plataforma compartida (Firebase de `plataforma-gastrogoan`)**, y es muy poco (códigos, nombres de cuenta, referencias). Lo que crece mucho (ventas, reservas, carta) cae en la nube de cada negocio.

---

## 4. Lo que se rompe primero, y cuándo

Ordenado de lo que antes puede dar problemas a lo que más tarda. «Negocios» es el número de licencias activas.

### 1. La descarga del Firebase de un negocio con muchas ventas (desde el primer cliente, a los meses)

Se rompe **por negocio, no por número de clientes**, y lo paga el negocio, pero el dueño de GastroGoan recibiría la llamada.

- CLAUDE.md mide (con 20.000 ventas): cada cobro subía las 20.000 ventas (12,7 MB) y cada otro aparato las recibía enteras.
- **Estimación mía** con esas cifras: un negocio con 3 aparatos y 100 cobros al día, con 20.000 ventas en la lista, descargaría unos 2,5 GB al día en los otros dos aparatos; la cuota gratuita (10 GB/mes) se agotaría en unos 4 días. 20.000 ventas son unos 7 meses a 100 tickets/día. Con menos ventas guardadas el consumo es proporcionalmente menor (con 2.000 ventas, unos 0,25 GB/día).
- La corrección existe: «Guardar las ventas una a una» (`ventasPorMes`, js/ventas-nube.js), que baja el cobro a unos 0,5 KB. **Está apagada en todo negocio existente** y la enciende el propietario en Mi Negocio → Datos; solo se enciende sola en negocios nuevos.
- Qué se haría: (a) medir con un negocio real el consumo en la consola de Firebase del propio negocio (no verificado: no hay medición real, solo la estimación); (b) decidir si se enciende por defecto para todos los negocios con la versión nueva; (c) recordar el archivado anual de ventas (la app ya avisa).

### 2. Las 100 conexiones de la plataforma, si hay negocios con reglas antiguas (entre decenas y unos cientos de negocios)

- Un negocio que no ha actualizado sus reglas de Firebase se queda con su espejo público en la nube compartida, y mantiene un oyente permanente (js/core.js, `marcarPlataformaEnUsoPermanente`). Cada pestaña de esos negocios ocupa una de las 100 conexiones de la plataforma.
- **Estimación**: cada pestaña abierta de un negocio «antiguo» es una conexión fija, así que con 30-50 negocios así y 2 pestañas cada uno ya se llega al techo. Esto es lo que CLAUDE.md describe como «a partir de unos 50-100 negocios, la web de reservas falla para todos a la vez, un viernes por la noche».
- Los negocios al día no mantienen conexión: la sueltan a los 30 s. Por la ley de Little (llegadas × duración), 1.000 aperturas de app en media hora = ~0,56 por segundo × 30 s = ~17 conexiones. Cinco veces más pico serían ~83 (estimación, no medida).
- **No sé hoy cuántos negocios siguen con reglas antiguas**: es un número que se puede mirar en la consola de Firebase de la plataforma (Uso → Conexiones). Apuntarlo antes del primer pico de ventas.
- Qué se haría, por orden de coste: (1) empujar la actualización de reglas con el asistente «Actualizar mis reglas»; (2) vigilar la gráfica de conexiones con alerta al llegar al 70 %; (3) si aun así hace falta, crear una segunda base de plataforma para el espejo de los antiguos (gratis, pero trabajo); (4) pasar a Blaze (200.000 conexiones; 5 $/GB y 1 $/GB sobre lo gratuito, **verificado**): es la salida de emergencia, no un plan, porque rompe la decisión del dueño de no tener pagos recurrentes (la factura sería de uso, no fija; a esta escala el uso sería de céntimos, pero es una tarjeta asociada con coste variable: **decisión del dueño**).

### 3. El Worker de pagos y su límite de CPU (a partir de cientos de restaurantes con tarjeta activa; no medido)

- Los 100.000/día sobran con mucho margen. El punto débil es el **límite de 10 ms de CPU por petición** del plan gratuito (verificado): verificar la firma de Stripe (HMAC) y manejar JSON suele caber, pero **no está medido en este Worker**. Si no cupiera, ya fallaría hoy con un solo restaurante, no a 500.
- Qué se haría: medir una petición real del webhook con el panel del Worker; si se queda cerca de 10 ms, partirlo o pasar a un Worker de pago (5 $/mes según la tabla pública de Cloudflare, **no verificado** hoy) o al servidor propio (`servidor/pagos/`, ya preparado y probado en local).

### 4. El servidor único de Hetzner (desde ya, y no depende del número de clientes)

- No es un problema de capacidad (20 TB incluidos, la web pesa 230 KB comprimida), es de **disponibilidad**: un servidor es un punto único de fallo y la web de reservas depende de él (CLAUDE.md, «LaLiga»).
- Qué se haría: vigilancia gratuita (UptimeRobot, no verificado su plan gratuito hoy), un segundo servidor en otro proveedor con otro registro A, y tener a mano el camino de vuelta a Cloudflare Pages (documentado en CLAUDE.md).

### 5. Las 500 publicaciones de Pages (no depende de clientes)

- Con la publicación «por tandas» que se decidió, no se acerca. Si cada push a `main` lanza una publicación en cada uno de los cuatro proyectos y el límite fuera por cuenta, serían unos 125 pushes al mes (estimación). **Aclarar si el límite es por cuenta o por proyecto** (§2).

### 6. Lo que NO se rompe con el número de clientes

- Tráfico de Cloudflare Pages: ilimitado en ficheros estáticos (verificado).
- Almacenamiento de la plataforma: la guía mínima por negocio (códigos, nombres, referencia a su nube) son unos KB; 1 GB es margen de sobra a 5.000 (estimación).
- Autenticación: 50.000 usuarios activos al mes sin coste (verificado). Cada aparato nuevo es un usuario anónimo; con 5.000 negocios × ~4 aparatos = 20.000 (estimación), dentro del límite, pero no he verificado cómo cuenta Firebase los anónimos.

---

## 5. Cosas que conviene medir antes de vender a escala

1. Conexiones simultáneas de `plataforma-gastrogoan` en un viernes por la noche (consola de Firebase → Realtime Database → Uso).
2. Consumo de descarga en un negocio real con meses de ventas (consola de Firebase de ese negocio).
3. Tiempo de CPU de una petición del webhook de Stripe en el Worker.
4. Cuántos negocios siguen con reglas antiguas (`comprobarEspejoEnNubePropia` lo sabe por negocio; no hay hoy un recuento global).
5. El precio y la fecha de renovación del dominio.

## 6. Resumen para el informático

- **Coste de infraestructura de GastroGoan, a cualquier escala hoy previsible:** ~5,5 € + IVA al mes (Hetzner) más el dominio (no verificado) más la comisión de Stripe sobre sus propias ventas.
- **Riesgos de coste:** (a) la regla de comisiones de Stripe Connect, a confirmar por escrito; (b) que se pase a Blaze por una de las salidas de emergencia.
- **Riesgos de servicio antes que de coste:** la descarga del Firebase de un negocio con muchas ventas (con la solución ya hecha pero apagada), las conexiones de la plataforma con negocios antiguos, y el servidor único.
