# Contrato de encargado del tratamiento (art. 28 RGPD) — BORRADOR

> **BORRADOR para revisión por un abogado; no es asesoramiento legal.** Redactado el 26/11/2026 y ajustado a la arquitectura real de GastroGoan (ver `docs/RGPD-REGISTRO-DE-ACTIVIDADES.md`, de donde salen los datos de §2 a §4). Lo que depende de una decisión jurídica va marcado **[A REVISAR POR EL ABOGADO]**. No se han inventado cláusulas más allá del contenido que el art. 28 exige; la redacción final y los plazos son del abogado. Los textos entre corchetes se completan por cada cliente.

---

**CONTRATO DE ENCARGADO DEL TRATAMIENTO DE DATOS PERSONALES**

En [localidad], a [fecha].

**REUNIDOS**

De una parte, **[nombre o razón social del restaurante]**, NIF [NIF], domicilio en [domicilio], correo [correo], en adelante **EL RESPONSABLE**.

De otra, **[nombre del titular de GastroGoan]**, autónomo, NIF [NIF], domicilio en [domicilio], correo [correo], titular de la herramienta **GastroGoan**, en adelante **EL ENCARGADO**.

## 1. Objeto

1.1. Este contrato regula el tratamiento de datos personales que EL ENCARGADO pueda realizar por cuenta de EL RESPONSABLE al prestarle los servicios de la licencia de GastroGoan (aplicación de gestión de restaurante y web de reservas y pedidos) y, si los contrata, el **Plan 360º** y el **servicio de mantenimiento**, de acuerdo con el art. 28 del Reglamento (UE) 2016/679 (RGPD).

1.2. **Cómo funciona el servicio (descripción de hechos).** GastroGoan se entrega como ficheros que se ejecutan en el navegador del propio restaurante. **EL ENCARGADO no aloja los datos del restaurante.** Los datos se guardan (a) en el dispositivo del restaurante y (b) en un proyecto de **Firebase (Google) creado y contratado por EL RESPONSABLE a su nombre**, en el que EL RESPONSABLE es quien administra el acceso. EL ENCARGADO no mantiene copia de esos datos en servidores propios.

1.3. **Alcance del acceso de EL ENCARGADO.** EL ENCARGADO podrá acceder a datos personales de EL RESPONSABLE únicamente en estos casos:
 a) **Soporte técnico** a petición de EL RESPONSABLE (p. ej. compartiendo pantalla o abriendo su negocio con su consentimiento).
 b) **Plan 360º y mantenimiento**, si se contratan: lectura y escritura de los datos de ese servicio (cuestionarios, tareas, resumen de números del negocio: ventas, tickets, costes, resultado, reseñas agregadas) en la nube de EL RESPONSABLE. **No se leen fichas de clientes finales, reservas ni datos de empleados** para prestar este servicio; el resumen de números es agregado. **[A REVISAR POR EL ABOGADO: confirmar con el dueño de GastroGoan, antes de firmar, que el panel del Plan 360º no lee esos datos personales]**.
 c) **Operaciones de licencia** (alta, revocación, cambio de código): trata datos de contacto de EL RESPONSABLE (nombre, correo, teléfono), que son datos de GastroGoan como responsable propio (ver cláusula 11).

1.4. **Limitación técnica que EL RESPONSABLE debe conocer.** La nube de cada negocio se abre con el código de licencia y una sesión de Firebase: quien conozca ese código y la referencia de la nube puede leer los datos del negocio. EL ENCARGADO se compromete a no usarlo fuera de lo previsto en 1.3 y a custodiar los códigos. Hacerlo más estricto exige un cambio de arquitectura (funciones en la nube y plan de pago de Google) que no está previsto por ahora. **[A REVISAR POR EL ABOGADO: si debe constar aquí o en una cláusula de riesgos conocidos]**.

## 2. Descripción del tratamiento

| Elemento | Contenido |
|---|---|
| Naturaleza | Alojamiento técnico de la herramienta, soporte, y prestación del Plan 360º / mantenimiento (consulta de datos del servicio) |
| Finalidad | Prestar los servicios contratados a EL RESPONSABLE, y nada más |
| Duración | La de la licencia y servicios contratados |
| Tipos de datos | Datos identificativos y de contacto (nombre, teléfono, correo, dirección, código postal), datos de reservas y pedidos, historial de consumo y puntos, alergias declaradas por clientes (categoría especial, art. 9), datos de empleados (nombre, rol, contacto, DNI/NIF opcional, horarios, fichajes, nómina), datos económicos del negocio. **Datos de tarjeta: nunca**; los trata Stripe en la cuenta de EL RESPONSABLE |
| Categorías de interesados | Clientes finales del restaurante; empleados; el propio titular |

(Los detalles por tratamiento están en el registro de actividades.)

## 3. Obligaciones de EL ENCARGADO (art. 28.3)

EL ENCARGADO se obliga a:

a) **Tratar los datos solo siguiendo instrucciones documentadas** de EL RESPONSABLE; este contrato y el uso normal de la herramienta lo son. Si cree que una instrucción infringe la normativa, lo comunicará. (art. 28.3.a)
b) **Garantizar la confidencialidad** de las personas autorizadas a tratar los datos. (art. 28.3.b)
c) **Aplicar las medidas de seguridad del art. 32**, las descritas en el Anexo I. (art. 28.3.c)
d) **Subencargados:** solo con las condiciones de la cláusula 5. (art. 28.3.d)
e) **Asistir a EL RESPONSABLE** en atender los derechos de los interesados, mediante medios técnicos: la herramienta incluye la supresión de un cliente (`Derecho al olvido`, con anotación en el registro de auditoría), la edición de fichas, la exportación de datos y el registro de bajas de comunicaciones comerciales. **Si un interesado se dirige a EL ENCARGADO, se lo trasladará en un plazo de [X días hábiles] [A REVISAR POR EL ABOGADO].** (art. 28.3.e)
f) **Asistir en seguridad, notificación de brechas y evaluaciones de impacto** (arts. 32 a 36). **EL ENCARGADO notificará a EL RESPONSABLE sin dilación indebida, y en todo caso en [X horas] desde que tenga constancia, cualquier brecha de seguridad que afecte a datos de EL RESPONSABLE** **[A REVISAR POR EL ABOGADO: plazo]**. (art. 28.3.f)
g) **Al terminar el servicio**, suprimir o devolver los datos que pudiera tener en su poder (cláusula 8). (art. 28.3.g)
h) **Poner a disposición la información necesaria** para demostrar el cumplimiento y permitir auditorías (cláusula 7). (art. 28.3.h)

## 4. Obligaciones de EL RESPONSABLE

EL RESPONSABLE se obliga a:
a) Cumplir el RGPD como responsable: base legal, información a los interesados (la web de reservas incluye un aviso de privacidad con sus datos si él los completa en Mi Negocio), consentimiento para comunicaciones comerciales y atención de derechos.
b) **Crear y mantener su proyecto de Firebase, sus claves y las reglas de seguridad actualizadas** (la aplicación avisa si están desactualizadas), y mantener su dispositivo y sus PIN en buen estado.
c) Custodiar los códigos de licencia y los PIN, y avisar a EL ENCARGADO si sospecha que se han filtrado.
d) No introducir datos personales innecesarios, en particular en campos de texto libre (notas, mensajes), y evitar escribir datos personales en las consultas de la herramienta de IA que opcionalmente configure con su propia clave.

## 5. Subencargados

5.1. EL RESPONSABLE autoriza la intervención de los siguientes subencargados, **en la medida en que intervengan en la prestación de los servicios**. Los dos primeros son proveedores que EL RESPONSABLE contrata directamente (proyecto de Firebase) o que recibe como parte de la web pública; aun así se listan por transparencia:

| Subencargado | Servicio | Qué datos toca | Observaciones |
|---|---|---|---|
| **Google (Firebase: Realtime Database y Authentication)** | Base de datos y sesión anónima del negocio | Todos los de la herramienta de EL RESPONSABLE | **El proyecto es de EL RESPONSABLE** y su contrato con Google es directo; en la nube compartida de la plataforma (`plataforma-gastrogoan`) solo hay licencias, cuentas sin PIN y referencias técnicas, sin datos de clientes finales |
| **Cloudflare** | Alojamiento de los ficheros de la aplicación y de la web comercial; ejecución del Worker de pagos | Tráfico (dirección IP, cabeceras) de quien abre la web; el Worker procesa referencias de pago y confirmaciones, sin datos de tarjeta | Cloudflare Pages sirve contenido estático; qué registros conserva Cloudflare **no verificado** [A REVISAR POR EL ABOGADO] |
| **Stripe** | Cobros con tarjeta (cuenta de EL RESPONSABLE) y cobro de las licencias de GastroGoan | Datos de pago | **Stripe es responsable o encargado según su propia relación con EL RESPONSABLE** (cuenta conectada, cobro directo); no es un subencargado de EL ENCARGADO para los cobros del restaurante **[A REVISAR POR EL ABOGADO: calificación jurídica]** |
| **Hetzner Online GmbH** (servidor en Helsinki) | Servir la web pública de reservas con IP propia | Tráfico de quien abre la web (IP); **no guarda datos de clientes** (los datos van al buzón de EL RESPONSABLE, cifrados). El fichero de configuración no activa el registro de accesos; **a confirmar en el servidor** | |

5.2. **Proveedores de IA** (Google, Anthropic, OpenAI) que EL RESPONSABLE active con **su propia clave**: son contratados por él; EL ENCARGADO no interviene ni recibe esos datos.

5.3. **Cambios:** EL ENCARGADO informará a EL RESPONSABLE de cualquier cambio o incorporación de subencargados con [X días] de antelación, para que pueda oponerse. **[A REVISAR POR EL ABOGADO: plazo y consecuencias de la oposición]**.

5.4. Cuando haya subencargado, EL ENCARGADO le impondrá, mediante contrato, obligaciones equivalentes a las de este contrato, y responderá ante EL RESPONSABLE. **[A REVISAR POR EL ABOGADO: los proveedores grandes se contratan con sus términos estándar, no a medida; cómo se acredita la equivalencia]**.

## 6. Transferencias internacionales

Google, Cloudflare y Stripe pueden tratar datos fuera del Espacio Económico Europeo. EL RESPONSABLE elige la región de su proyecto de Firebase al crearlo. **No se ha verificado la ubicación de los proyectos de ningún cliente ni de la plataforma.** Las garantías aplicables (cláusulas contractuales tipo, decisiones de adecuación) son las que figuren en los términos vigentes de cada proveedor. **[A REVISAR POR EL ABOGADO]**.

## 7. Auditoría e información

EL ENCARGADO pondrá a disposición de EL RESPONSABLE, cuando lo pida por escrito, la información razonable para demostrar el cumplimiento: este contrato, el registro de actividades, la descripción de medidas (Anexo I) y las reglas de seguridad publicadas. Las auditorías o inspecciones in situ **[A REVISAR POR EL ABOGADO: plazo, frecuencia, quién corre con el coste]**.

## 8. Fin del servicio y devolución o supresión de los datos

8.1. **Los datos están en el dispositivo y en el Firebase de EL RESPONSABLE**, no en EL ENCARGADO. Al terminar, EL RESPONSABLE conserva todo y puede descargar una copia (la herramienta incluye copia de seguridad y exportación). Si deja de renovar la licencia, la herramienta puede dejar de actualizarse; **la consecuencia exacta sobre el uso de los datos existentes: [A REVISAR POR EL ABOGADO]** (mejor aclararlo en las condiciones de compra).

8.2. EL ENCARGADO **suprimirá**, en un plazo de [X días] desde el fin, los datos de EL RESPONSABLE a los que hubiera tenido acceso para soporte o para el Plan 360º que conserve fuera de la nube de EL RESPONSABLE (p. ej. capturas, exportaciones o notas de trabajo), salvo que la ley obligue a conservarlos. Los datos de la nube compartida de la plataforma (licencia, cuenta, negocio vinculado) se mantienen mientras exista el código, salvo petición. **[A REVISAR POR EL ABOGADO: plazos]**.

## 9. Medidas de seguridad

Las del **Anexo I**. EL RESPONSABLE reconoce que ha sido informado de las limitaciones indicadas en la cláusula 1.4 y en el Anexo I.

## 10. Responsabilidad

**[A REVISAR POR EL ABOGADO]**: reparto de responsabilidad, límites y su compatibilidad con el art. 82 RGPD.

## 11. Datos de EL RESPONSABLE tratados por GastroGoan como responsable propio

Los datos de contacto y facturación del propio restaurante para vender, entregar y cobrar la licencia los trata GastroGoan como **responsable**, no como encargado, con la política de privacidad de la web comercial. **[A REVISAR POR EL ABOGADO]**.

## 12. Duración, ley aplicable y jurisdicción

El contrato dura lo que dure la licencia y los servicios. **Ley aplicable y jurisdicción: [A REVISAR POR EL ABOGADO]**.

Firmado en dos ejemplares.

EL RESPONSABLE: ____________________    EL ENCARGADO: ____________________

---

## ANEXO I — Medidas de seguridad (descripción de lo que existe hoy)

Sin garantizar más de lo que hay. El detalle técnico está en el registro de actividades (§5), `docs/SECURITY_NOTES.md` y `CLAUDE.md`.

1. **Datos en el dispositivo** (IndexedDB) y **en la nube del propio restaurante** (Firebase), no en servidores de GastroGoan.
2. **Acceso por cuentas y PIN**: el PIN del propietario no se almacena (la ruta de la cuenta se deriva de usuario y PIN); los PIN se validan con PBKDF2-SHA256 de 210.000 iteraciones y sal aleatoria con compatibilidad con un formato anterior más débil (en retirada). PIN de propietario de 6-12 caracteres en cuentas nuevas; PIN de empleado de 4 dígitos.
3. **Sesión**: caduca tras 8 horas sin uso (propietario).
4. **Seis modos de acceso** con permisos distintos; la gestión económica es exclusiva del propietario; acciones sensibles con confirmación por PIN y registro de auditoría (últimos 500 eventos).
5. **Solicitudes de reserva y pedido de la web pública cifradas** (RSA-OAEP 2048 y AES-GCM) con clave pública del negocio; la clave privada solo está en su aplicación.
6. **Reglas de seguridad de Firebase** publicadas (limitación de escrituras, validación de campos, tokens mínimos) y verificadas por pruebas automáticas; aviso en la aplicación si un negocio las tiene antiguas.
7. **Cabeceras de seguridad HTTP** en los sitios publicados (la política de contenido está pendiente).
8. **Copias de seguridad y archivado** con recordatorio; lápidas para que lo borrado no reaparezca entre dispositivos.
9. **Pruebas automáticas** de aislamiento entre cuentas, permisos y sincronización.
10. **Limitaciones conocidas y aceptadas** (deben leerse): código de licencia como credencial no revocable de los datos del negocio; sesión anónima de Firebase y lectura abierta del buzón con el identificador público (por eso se cifra); sesión falsificable desde las herramientas del navegador, inherente a no tener servidor; repositorio público; **no hay todavía auditoría de seguridad por un tercero humano**.

---

## Notas para quien lo revise (no forman parte del contrato)

- Antes de firmar con el primer cliente: confirmar con el dueño qué lee de verdad el panel del Plan 360º y el soporte (cláusula 1.3.b).
- Falta decidir si el contrato va como adenda a las condiciones de compra (aceptación con la compra) o como documento firmado aparte. **[A REVISAR POR EL ABOGADO]**
- La calificación de Stripe, Cloudflare y Hetzner (encargado, subencargado o responsable independiente) y la verificación de sus condiciones de tratamiento de datos vigentes **no se han comprobado** en esta redacción.
