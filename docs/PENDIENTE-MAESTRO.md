# Pendiente maestro de GastroGoan

**Un solo sitio para todo lo que queda por hacer.** Actualizado el 26/11/2026 (jueves, noche). Meta inmediata: poder empezar a vender el lunes 30/11 con tranquilidad.
Quién: **Yo** = Claude · **Juntos** = hacen falta tus cuentas · **Tú** = solo tú puedes. Marca `[x]` al terminar y ponle la fecha.
Los demás pendientes antiguos siguen en `docs/PENDIENTES.md`, `docs/PENDIENTE.md` y `reports/`; este manda cuando haya duda.

## 1. En curso ahora mismo
- [x] **Yo** · Plan 360º, tanda 2: publicada en `main` el 25/11 (commit `0f51e962`: panel del coach, fotos aparte, marcador semanal, informe de cierre, datos del coach fuera del código, manual en es/ca/en). Cerrada el 26/11 con la **prueba de ciclo completo** (`test/plan360-ciclo-app.mjs`: 5 etapas × 320/360/390 × es/ca/en × 17 pantallas; `test/plan360-ciclo-panel.mjs`: 4 etapas × 3 anchos × 19 pantallas) y un arreglo: la descripción de una tarea que fuera el aviso «(Contenido pendiente de definir)» se pintaba al cliente (`plan360DescReal`, js/app.js). Ambas pruebas están en `todo.sh`.
  - **Sigue abierto del Plan 360**: el **cobro automático con Stripe** (decisión tuya, aparcado). Haría falta: enlace de pago o Checkout de Stripe para 950 € + IVA (o 475 € + 475 € el día 15), una ruta nueva en el Worker (`worker/pagos-worker.js`) que reciba el aviso firmado de Stripe y lo deje en `gastrogoan/pagos`, que el panel lo escriba en `plan360Servicio.cobros360`, el aviso en la agenda y pegar el Worker a mano en Cloudflare. Hoy los cobros se anotan a mano en el panel.
  - **Contrato propio del mantenimiento (26/11, sin publicar, rama de trabajo):** `PLAN360_MANT_CONTRACT_TEXT` («Acuerdo de servicio de mantenimiento», copias idénticas en `js/core.js` y `admin-panel/plan360.html`). El negocio lo lee y lo firma al pulsar «Sí, quiero activarlo» (su firma ES la aceptación: `plan360ContratoMant`, `plan360MantenimientoActivar`); el panel lo ve en Documentación inicial › «Acuerdo de mantenimiento» (sin enviar / enviado / firmado, también en la tarjeta de Mantenimiento), puede prepararlo/enviarlo y firmarlo en persona, y «Mi agenda» avisa de «Mantenimiento activo sin acuerdo firmado». La cláusula 11 del acuerdo del 360 remite a este contrato (los ya firmados no cambian: `signedText`; la firma en persona del panel ahora también guarda `signedText`). Prueba `test/plan360-contrato-mant.mjs`. **Cobro por Stripe, no transferencia (26/11):** la cláusula 3 del acuerdo del 360 y la 6 del de mantenimiento dicen «enlace de pago seguro de Stripe», sin IBAN; el IBAN del coach ya no es obligatorio (`COACH_CAMPOS`, `plan360CoachDatos`); `{{coachIban}}` sigue soportado en `plan360FillTemplate` pero ningún texto lo usa. **Falta:** que lo revise el abogado junto al del 360 (borrador; ver la lista de tareas de «Tú» abajo) y publicar (`deploy/actualizar.sh` + merge). Un negocio que ya estaba en mantenimiento recibirá el aviso «Firma el acuerdo de mantenimiento».
  - Comprobar con el abogado el contrato del Plan 360 y el nuevo del mantenimiento (con los datos del coach ya fuera del código: si alguna vez estuvieron en el repositorio público, siguen en su historial).
- [x] **Yo** · Batería completa y publicación con sello **26/11/2026 15:33** (en `origin/main`, commits `181778eb`/`41319a48`; después `7b6cfc00` y `839319f4` con la cuenta de servicio de los Workers). Contenido: CSP de las## 2. Antes del lunes (para vender tranquilos)
Detalle en `docs/CHECKLIST-LUNES.md`.
**Hecho y publicado (26/11):**
- [x] **Yo** · Revisión de seguridad con mentalidad de atacante: CSP, filtro de bots, aforo con autocuración y regla de `aforoHold`, `PUENTE_CLAVE` obligatoria, Worker de pagos que exige la cuenta del dueño, `tenantLookup` endurecido.
- [x] **Yo** · Cifrado del PIN reforzado (H3, PBKDF2, migración perezosa; el H2 sigue por compatibilidad, ver CLAUDE.md).
- [x] **Tú** · Pruebas reales del 26/11: reserva en la web publicada, entrada como empleado, **cobro real de 0,55 €** con el aviso de Stripe marcando el pedido como pagado, UptimeRobot, verificación en dos pasos, servidor de Hetzner nuevo (el viejo, borrado), reglas de Firebase de la plataforma y del negocio pegadas.
- [x] **Juntos** · Retirado el «Database secret» obsoleto: los Workers usan una cuenta de servicio (queda el secreto como respaldo si no hay cuenta).
- [x] ~~Turnstile~~ **descartado a propósito** (las reglas de Firebase no pueden exigir un captcha y haría falta un Worker intermedio, justo lo que el servidor propio evita).
**Pendiente:**
- [ ] **Yo** · Herramientas automáticas: gitleaks, Semgrep, `npm audit`, cabeceras de los tres dominios.
- [ ] **Tú** · **Devolver el cobro de prueba de 0,55 €** en Stripe.
- [ ] **Tú** · Segunda IA (Gemini o ChatGPT) revisando el repositorio con los mismos objetivos de atacante.
- [ ] **Juntos** · Prueba de alta completa de un cliente nuevo en el dominio real.
- [ ] **Tú** · Escribir tu DNI e IBAN en «Mis datos de coach» del panel (el IBAN ya es opcional: los contratos cobran por Stripe; el DNI sí hace falta).
- [ ] **Tú** · Comprobar el enlace de Stripe de la App y que la web diga 300 € + IVA el primer año.
- [ ] **Tú** · Abogado: condiciones de compra, privacidad, contrato del Plan 360, acuerdo de mantenimiento (y su traducción), contrato de encargado y registro de actividades RGPD.
- [ ] **Tú** · Soporte: WhatsApp, horario y qué hacer si un cliente pierde el PIN.
- [ ] **Tú** · Elegir 2 o 3 primeros clientes a los que puedas llamar cada día.
- [ ] **Tú** · Copia maestra fuera de nuestras cuentas (código, `issuedCodes`, `ownerNames`, `codeClaims`, `adminSalesLog`) y segunda persona con acceso de emergencia (la verificación en dos pasos ya está hecha).
- [ ] **Tú** · Practicar una vez la marcha atrás en Cloudflare Pages (versión anterior en dos clics).
- [ ] **Tú** · Informático: enviar el email y el dossier (ya redactados, en PDF). Antes, que diga si el análisis tiene coste.

l panel (sin eso el contrato no se envía).
- [ ] **Tú** · Comprobar el enlace de Stripe de la App y que la web diga 300 € + IVA el primer año.
- [ ] **Tú** · Abogado: condiciones de compra, privacidad, contrato del Plan 360 y acuerdo de mantenimiento (también su traducción al catalán y al inglés).
- [ ] **Tú** · Soporte: WhatsApp, horario y qué hacer si un cliente pierde el PIN.
- [ ] **Tú** · Elegir 2 o 3 primeros clientes a los que puedas llamar cada día.
- [ ] **Tú** · Verificación en dos pasos en todas tus cuentas, códigos de recuperación impresos y una segunda persona con acceso de emergencia (`docs/GUIA-PARA-EL-DUENO.md`).
- [ ] **Yo** · Responder al informático: enviar el email y el dossier. **Tú** lo envías; ya está redactado y en PDF. Antes, que diga si el análisis tiene coste.

## 3. Después del lunes (por orden)
- [ ] **Juntos** · **Plan de continuidad: que la app no se caiga y no dependamos de nadie.** Un solo punto con cinco partes: (1) copias fuera de nuestras cuentas, del código y del registro de licencias (`issuedCodes`, `ownerNames`, `codeClaims`, `adminSalesLog`), con una restauración probada de verdad; (2) accesos de respaldo, o sea verificación en dos pasos, códigos impresos y una segunda persona con acceso de emergencia en GitHub, Cloudflare, Firebase y Stripe; (3) volver a la versión anterior en dos clics, practicado una vez; (4) vigilancia gratuita que avise si cae `app.`, `reservas.` o `admin.`; (5) guías al día (`CLAUDE.md`, `docs/GUIA-PARA-EL-DUENO.md`) y un procedimiento para que otra persona o IA pueda retomar el proyecto sin nosotros. Detalle en `docs/GUIA-PARA-EL-DUENO.md`, secciones 3 a 5 y 9.
- [ ] **Yo** · **Repasado global de fallos de copias viejas** (lo que pidió el 25/11 tras el bug de la contraseña): empleados (bajas, permisos, sesiones abiertas), nombre y licencia del negocio, web pública frente a la app, ajustes por aparato (claves de IA, VeriFactu, idioma, QR de mesa). Un agente a la vez, con una prueba por hallazgo.
- [x] Ventas una a una en la nube (26/11, `js/ventas-nube.js`): HECHO y probado con emulador de dos aparatos, pero **apagado en los negocios existentes**. **Tú**: tras publicar, activarlo en un negocio con muchas ventas (Mi Negocio → Datos) cuando TODOS sus aparatos hayan abierto la app actualizada. Ver CLAUDE.md.
- [ ] **Yo** · Cobro que se cuelga: sigue sin causa confirmada. Cuando lo notes, dime cuántas ventas llevas en el día y qué pulsas.
- [x] **Yo** · `tenantLookup` endurecido el 25/11 (no se puede apuntar a otra nube ni borrar) y publicado. Reglas pegadas por el dueño el 26/11.
- [x] **Yo** · Política de contenido (CSP) de las tres webs: hecha y publicada (con `'unsafe-inline'` a propósito; `test/csp.mjs`).
- [x] **Juntos** · «Secreto heredado de Firebase» sustituido por cuenta de servicio (26/11).
- [x] **Yo** · Barredor de ventanas a 360 px (`test/ventanas-todas.mjs`): **arreglado el cuelgue** (esperaba a animaciones infinitas de la portada). Termina en ~10 s por vista. ⚠️ Cobertura baja, pendiente: inicio abre 0 ventanas, Mega Lista 1 de 5 botones, I+D 1 de 7; una corrida sin ventanas ya sale en rojo. Ver `CONTROL_CALIDAD/INCIDENCIAS.md` C-05.
- [~] **Yo** · Pruebas antiguas del emulador (QR y espejo): `espejo-sesion` **arreglada**. `cobro.mjs` ya sale con código 1 si algo falla; el estado de `cobro`, `aparato-nuevo` y `qr-mesa-nube` está en la sección 3 quater.
- [ ] **Yo** · Importar la liquidación de Glovo, Uber Eats y Just Eat cuando tengamos ficheros reales (ventas, comisión e IVA).
- [ ] **Tú** · Mensajes a Glovo, Uber Eats, Just Eat y Deliverect para pedir acceso a su API (textos preparados antes). Credenciales de pruebas siempre por `request_credential`, nunca en el chat.
- [ ] **Juntos** · Servidores para LaLiga (ver 4): segundo servidor y probar en un partido real.
- [ ] **Tú** · Probar con una clave real de IA el módulo de I+D (Gemini, Claude o ChatGPT). Sin eso no sabemos si el módulo vale.
- [ ] **Tú** · Probar con el hardware delante: impresora térmica, cajón, iPhone y iPad.
- [ ] **Juntos** · Cobro automático del Plan 360º con Stripe y delivery (Glovo/Uber/Just Eat): ambos se hacen «juntos», más adelante.
- [ ] **Tú** · Primer servicio real con un cliente: es lo que más fallos encuentra.

## 3 bis. LaLiga: decidido el 25/11 (noche), esperar y ver
- Fase 1 hecha: la web de reservas sale de un servidor de Hetzner. **Recreado el 26/11: IP actual 5.222.10.11** (el de 5.222.2.92 se borró). Vigilado con UptimeRobot. **Se deja con UN solo servidor unos días y se mira cómo va** (vigilancia + un partido real) antes de más cambios.
- **Para valorar después, por este orden:** (1) segundo servidor con dos registros A (los navegadores prueban el otro solos si uno cae); (2) versión 3 del servidor: web comercial `gastrogoan.com` y desvío de los pagos de Stripe a través del servidor (sin mover claves); (3) cambio automático a Cloudflare si el servidor cae (vigilante en GitHub + llave de Cloudflare limitada; tarda 5-15 min; ver las limitaciones en la conversación del 25/11).
- **La app y el panel NO se mueven** (decisión razonada: quien ya tiene la app instalada no sufre bloqueos; moverla concentra el riesgo en una sola máquina).

## 3 ter. Revisión completa de pendientes (25/11, noche): lo que se añadió a la lista
Tres lectores revisaron todos los documentos de pendientes y comprobaron contra el código qué sigue abierto (descartaron unos 55 puntos ya hechos). Se añadieron: protección contra bots en la web de reservas (hecha el 26/11 con campo trampa y mínimo de 3 s; Turnstile descartado); el PIN del cliente en claro en `adminSalesLog` del generador; fiscal sin código (horas extra, finiquitos, 349, comisiones de Glovo en el 347, límites de módulos, País Vasco foral y ejercicios ≤ 2022); pequeños (fecha fija en `js/novedades.js`, 8 frases que faltan, «atrás» desde la hoja de Escandallo/Fichas y las ventanas, constante residual `PLAN360_DEFAULT_PROGRAM` en el panel, documentos viejos). **Cerrado el 26/11:** fecha de Novedades (`localeActual()`, prueba `novedades-fecha`), constante del panel (campo `task` quitado, la lectura se conserva), 8 frases con cita comprobada en Wikiquote (365, `frases-dia`), «atrás» de Escandallo y Fichas (`atras-hojas`; las ventanas-modal ya cierran con «atrás» desde el 18/11), documentos viejos (sección 8 marcada histórica). Detalle en `CONTROL_CALIDAD/INCIDENCIAS.md`, C-01 a C-08; criterios del gestor; repetir el vídeo en un Android real; VeriFactu (no sirve aún: falta cuenta de pago, declaración responsable —el enlace apunta a un fichero inexistente— y decisión autónomo/sociedad); pedido en grupo y fidelización; los ~90 emojis del generador; inspección visual de los paneles del coach.
Contradicción de `tenantLookup` cerrada: se endureció el 25/11 (`reglas/NOTAS.md` conserva el estudio del 17/11 como histórico).

## 3 quater. Pruebas del emulador (26/11)
Ejecutadas de verdad el 26/11 con el emulador oficial (`SOLO=<prueba> bash test/emulador/run.sh`; arranca sin problemas aquí):
- `aparato-nuevo.mjs`: **9 de 9 en verde**, repetida dos veces (sin fallos intermitentes). Si fallaba antes, ya no reproduce: no hay nada que arreglar.
- `qr-mesa-nube.mjs`: **7 de 7 en verde**, repetida dos veces.
- `cobro.mjs`: sale con **código 1** si algo falla (ya no con 0). **2 de 4 en rojo, y es de la APP, no de la prueba**: los casos 1 («dos cobros a la vez: no se pierde ninguna venta») y 1b («el cobro duplicado queda anotado») fallan porque dos aparatos cobrando la misma mesa crean dos ventas con el MISMO `id` (`id: order.id`, js/tpv.js líneas 4589, 4726 y 5173); `mergeArraysById` las funde en una (queda `["7000:Efectivo"]`, el cobro con tarjeta se pierde) y `avisarSiCobroDuplicado` (js/core.js:10310, busca ids repetidos) no puede saltar nunca. Sin tocar `js/` hasta que lo decidas (es zona de cobros). Los casos 2 (un solo cerrojo de cierre de caja) y 3 (reserva nueva aparece sola) pasan. `cobro.mjs` no está en `run.sh`.
- **Yo** · Decidir con el dueño cómo evitar el id repetido en cobros simultáneos (id de venta propio del aparato, o conservar las dos ventas al fundir).

## 4. LaLiga (bloqueos de Cloudflare en partidos)
- Causa: operadores bloquean por IP; Cloudflare no da IP dedicada en el plan gratuito.
- Estado: UN servidor (Hetzner, 5.222.10.11) con la web de reservas; el segundo está por decidir. Plan: dos servidores con IP propia en proveedores distintos (por ejemplo Hetzner y otro), con Caddy, `unattended-upgrades` y despliegue automático desde GitHub. Primero la web de reservas y la comercial; la app después. Kit preparado en `servidor/`, sin usar.
- Coste previsto: unos 5 a 10 € al mes por servidor. Es la excepción a tu norma de cero cuotas, ya aceptada.
- [ ] **Tú** · Elegir proveedores y crear las cuentas. **Yo** · comprobar antes que las IP no estén en la lista de bloqueo (hayahora.futbol), preparar el kit y probarlo en un partido.

## 5. Decisiones que dependen de ti
- [ ] ¿Repositorio privado? Oculta el generador de licencias, pero tiene tres consecuencias: (1) la revocación de licencias se lee de `raw.githubusercontent.com` en `js/core.js` y dejaría de funcionar (sería fail-open, nadie se bloquea, pero tampoco se revoca); (2) el servidor de Hetzner baja la web de GitHub sin llaves y dejaría de poder; (3) GitHub Actions pasa a 2.000 min/mes y la batería completa en cada push los gastaría.
- [ ] Cobro automático del Plan 360º y delivery: decididos «juntos», más adelante.
- [x] `tenantLookup`: corregido. Ventas por meses: hecho, apagado en negocios existentes (se enciende por negocio).
- [ ] ¿Traducir el contrato del Plan 360 al catalán y al inglés con revisión legal, o dejarlo solo en castellano?
- [ ] ¿Cuándo se migra todo (app, comercial y admin) al servidor propio?

## 6. No prometer todavía
VeriFactu como funcional · pedidos de Glovo/Uber/Just Eat dentro de la app · Bizum con Stripe Connect v2 · cobro automático del Plan 360 (hasta que esté hecho) · que no habrá fallos.

## 7. Hechos hoy (25/11)
- Cambio de contraseña: la antigua deja de valer en todos los aparatos (dueño) y el PIN del trabajador manda la nube. Publicado con sello 25/11/2026 11:44.
- Dossier técnico para el informático (PDF y Word) y borrador de respuesta.
- Plan 360º: auditoría completa, plantilla base de 34 tareas, arreglos de la tanda 1 en app y panel.
- Documentos: `docs/CHECKLIST-LUNES.md`, `docs/GUIA-PARA-EL-DUENO.md` y este.

## 8. Hechos el 26/11
- Publicación con sello 26/11/2026 15:33 (ver sección 1). Workers con cuenta de servicio. El Worker `gastro` se recreó sin Git (estaba conectado a GitHub y se redesplegaba borrando el código de pagos). Servidor de reservas recreado. Documentos para el informático: `docs/PREVISION-DE-COSTES.md`, `docs/RGPD-REGISTRO-DE-ACTIVIDADES.md`, `docs/RGPD-CONTRATO-ENCARGADO.md`.
