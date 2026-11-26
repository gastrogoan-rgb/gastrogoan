# Pedido en grupo: estado de la implementación (27/11/2026)

Rama de trabajo: `worktree-agent-afe3cbf72fd58bf1b` (copia `/home/user/gastrogoan/.claude/worktrees/agent-afe3cbf72fd58bf1b`). NO se ha publicado, ni fusionado a `main`, ni subido a `claude/beautiful-dijkstra-58bru6`.
Diseño de partida: `docs/PEDIDO-EN-GRUPO-DISENO.md`. Alcance (dueño, 26/11): solo mesa (QR), pago AL PEDIR y pago de «mi parte» con tarjeta (Stripe), sin que el camarero divida la cuenta.

## Cómo retomar
1. `git log --oneline` en la rama: un commit por pieza (reglas, Worker, app, web, pruebas…).
2. Mirar la lista de abajo: lo marcado `[x]` está hecho y probado; lo `[ ]` falta.
3. Pruebas del grupo: `node test/reglas.mjs`, `SOLO=grupo-reglas.mjs bash test/emulador/run.sh`, y las de navegador `test/grupo-*.mjs` (cada una con puerto propio, ver su cabecera).

## Decisiones menores resueltas (criterio conservador)
- Modo A (pagar al pedir) y B (pagar mi parte al final) a la vez; con las dos, el comensal elige (como `qrMesaHayEleccion`).
- Platos compartidos: partes iguales entre los marcados (el que lo pide siempre entra); reparto en céntimos por mayor resto, el resto va al primer hueco por orden. **Una línea compartida solo se paga al final** (no al pedir).
- Líneas sin dueño (las del camarero): las cobra el camarero en caja; no se reparten.
- Importe mínimo por pago: 5 € por defecto (configurable, 0 = sin mínimo); nunca por debajo de 0,50 € (Stripe).
- Propina: 0 / 5 / 10 % / otra, sobre la parte de quien paga; tope 50 % de su parte.
- Cierre: solo el camarero («Cerrar mesa», visible con todo pagado). Nunca automático en modo grupo.
- Primer pedido de un hueco nuevo sin pagar: lo revisa siempre el camarero, aunque el negocio tenga «directo a cocina».
- Máximo de comensales: 12 (huecos m0…m11); el negocio puede bajarlo (2-12).
- Hueco abandonado: a las 8 h sin latido lo puede reclamar otro (regla `now - 28800000`).
- Se queda fuera (Fase 3 del diseño): «cubrir a otro», reembolso automático, contraseña de mesa.

## Piezas
(Se va marcando.)
- [x] Reglas aditivas en las 4 copias (`FIREBASE_RULES_JSON`, `reglas/reglas-de-cada-negocio.json`, `reglas/reglas-de-la-plataforma.json`, `database.rules.propuesta.json`): `mesaGrupo/$token` + `uid`/`slot` en `requests`. Probado: `test/reglas.mjs` (14 casos) y `test/emulador/grupo-reglas.mjs` (18 casos, negocio y plataforma).
- [ ] Worker: `expires_at` (parámetro opcional `expiraMin`).
- [ ] App: `js/grupo-mesa.js` (config, sonda de reglas, cuenta por comensal, verificación del hueco, publicación, expulsión, limpieza).
- [ ] App: ganchos en `js/core.js` (recibir pedido y pago con hueco, no cerrar la mesa, limpieza al rotar el token).
- [ ] Mi Negocio: casilla «Pedido en grupo» (apagada por defecto) + estado de reglas.
- [ ] TPV: panel del grupo en la comanda (miembros, quién debe qué, expulsar, Cerrar mesa).
- [ ] Web pública: unirse, borradores, compartir plato, pagar mi parte, degradación, conexión (socket / REST).
- [ ] Pruebas: navegador (comensal 5 anchos, camarero), emulador (dos comensales + tablet), ataque, Worker.
- [ ] Manual y Ayuda es/ca/en.
- [ ] `todo.sh` (dos listas).
