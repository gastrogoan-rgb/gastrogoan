# Pedido en grupo: estado de la implementación (27/11/2026)

Rama de trabajo: `worktree-agent-afe3cbf72fd58bf1b` (copia `/home/user/gastrogoan/.claude/worktrees/agent-afe3cbf72fd58bf1b`). NO se ha publicado, ni fusionado a `main`, ni subido a `claude/beautiful-dijkstra-58bru6`.
Diseño de partida: `docs/PEDIDO-EN-GRUPO-DISENO.md`. Alcance (dueño, 26/11): solo mesa (QR), con pago AL PEDIR y pago de «mi parte» con tarjeta (Stripe), sin que el camarero divida la cuenta.

## Estado: las dos fases están construidas y probadas. Lo que falta está al final.

## Cómo retomar
1. `git log --oneline` en la rama: un commit por pieza (reglas, Worker, app, web, pruebas…).
2. Pruebas del grupo (cada una con puerto propio, nunca el 8950):
   - `node test/reglas.mjs` (14 casos, incluye las cuatro copias de reglas iguales).
   - `node test/pagos-worker.mjs` (11 casos; `expiraMin`).
   - `node test/grupo-cuentas.mjs` (app, puerto 8964, 10 casos), `node test/grupo-web.mjs` (web, 5 anchos × 3 idiomas, puerto 8965, 24 casos).
   - Emulador (reglas reales): `SOLO=grupo-reglas.mjs bash test/emulador/run.sh` y `SOLO=grupo-mesa.mjs bash test/emulador/run.sh` (ambas ya están en `run.sh`).
   - ⚠️ Un emulador que sobrevive a una pasada anterior conserva los datos: `grupo-mesa.mjs` borra primero `public/{id}` y `tenants/{id}`.
3. Los `todo.sh` ya llevan `grupo-cuentas` y `grupo-web` en las dos listas (`lanzar` y `espera`).

## Decisiones menores resueltas (criterio conservador)
- Modo A (pagar al pedir) y B (pagar mi parte al final) a la vez; con las dos, el comensal elige.
- Platos compartidos: partes iguales entre los marcados (el que lo pide siempre entra); en céntimos por mayor resto, el sobrante al primer hueco por orden. **Una línea compartida solo se paga al final** (la app descarta el reparto si se paga al pedir).
- Líneas sin dueño (las del camarero o las de un ajeno): no se reparten, las cobra el camarero en caja.
- Importe mínimo por pago: 5 € por defecto (configurable, 0 = sin mínimo); nunca por debajo de 0,50 € (Stripe).
- Propina: 0 / 5 / 10 % / otra, sobre la parte de quien paga; tope 50 % de su parte (web); la app solo acepta como propina lo que viene en el pago anunciado y nunca más de lo pagado.
- Cierre: solo el camarero («Cerrar mesa», visible con todo cobrado). Nunca automático en modo grupo (`order.grupo`).
- Primer pedido de un comensal nuevo sin pagar: lo revisa siempre el camarero, aunque el negocio tenga «directo a cocina».
- Máximo de comensales 12 (huecos m0…m11), configurable 2-12. Hueco sin latido 8 h: lo puede reclamar otro (regla `now - 28800000`).
- Expulsar: se guarda el uid del expulsado en el hueco; la web le impide reclamar otro hueco con la misma sesión y la app rechaza sus pedidos y pagos. Quien borre los datos del navegador tendrá otro uid (límite asumido).
- Fuera (Fase 3 del diseño): «cubrir a otro», reembolso automático, contraseña de mesa.

## Piezas hechas
- [x] Reglas aditivas en las 4 copias (`FIREBASE_RULES_JSON` de js/core.js, `reglas/reglas-de-cada-negocio.json`, `reglas/reglas-de-la-plataforma.json`, `database.rules.propuesta.json`): `mesaGrupo/$token` y `uid`/`slot` en `requests`. El `uid` solo se exige al CREAR la solicitud (si no, la app no podía reclamarla: lo cazó el emulador).
- [x] Worker: `expiraMin` (30-120 min → `expires_at`) y `slot` en metadatos; sin ellos todo igual.
- [x] App (`js/grupo-mesa.js`, dada de alta en los 4 sitios): sonda de reglas (`comprobarReglasGrupo`), verificación del hueco (`grupoVerificarSolicitud`), cuenta por comensal al céntimo (`grupoCuenta`), publicación (`grupoPublicaMesa`), limpieza al cerrar/rotar (`grupoMantenerMesa`), panel del camarero, expulsar, cerrar mesa, tarjeta de Mi Negocio (apagada por defecto).
- [x] Ganchos en `js/core.js` (recibir pedido y pago con hueco, `aplicarPagoMesaQr` con tope por comensal y sin cierre automático, sonda, asistente de reglas, rotar token con confirmación, no republicar durante la limpieza).
- [x] Web (`reservagastrogoan.html`): unirse, borradores sin precios, compartir plato, pagar mi parte con propina, conexión por socket con desconexión a los 3 min y respaldo REST, es/ca/en.
- [x] Manual (capítulo «Reservas y Pedidos Online», 3 idiomas) y Ayuda (`HELP_FAQS`, 3 idiomas).
- [x] Pruebas: reglas, Worker, app, web (5 anchos × 3 idiomas), emulador de reglas (ataques) y emulador de punta a punta (dos comensales + ajeno + tablet).

## Lo que NO está cerrado
- `test/movil.mjs` no se pudo correr aquí: necesita `dist/ggburger.json`, que no existe en esta copia (falla antes de tocar nada nuestro). La tarjeta de Mi Negocio y el panel del TPV no se han medido a 5 anchos con esa prueba; el panel usa las reglas `.gg-fila`-like propias (`.gr-*`) y solo está medido por `grupo-web.mjs` (web).
- El panel del camarero (`.gr-panel`) y la tarjeta de Mi Negocio no tienen prueba de 5 anchos propia.
- El pago real con Stripe (Worker desplegado + cuenta conectada) no se ha probado; en las pruebas la «confirmación del banco» se aplica llamando a `aplicarPagoMesaQr`.
- Sin probar con un aparato real, y sin medir cuántas conexiones consume una mesa de 6 en un Firebase real.
- La batería completa `test/todo.sh` no se ha lanzado entera (solo las pruebas relacionadas, ver la lista de arriba y el informe).
