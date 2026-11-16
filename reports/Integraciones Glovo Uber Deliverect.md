# Integración con Glovo, Uber Eats y Deliverect — conclusión (15/11)

Fuentes leídas: la definición oficial de la API de partners de Glovo (api-docs.glovoapp.com/partners, OpenAPI), `vtex-apps/glovo-integration`, `morscate/uber-eats`, el tema `uber-eats-api` de GitHub y la documentación de Deliverect para TPV.

## Lo común a las tres
- **Hay que ser partner aprobado.** Sin aprobación no hay credenciales. Glovo: escribir a su equipo de integraciones con los endpoints de prueba y los países. Uber Eats: app en el portal de desarrolladores + el alcance `eats.pos_provisioning`, que Uber concede a los proveedores de TPV que aprueba. Deliverect: alta como partner de TPV.
- **Los pedidos llegan por webhook** (un POST a una URL HTTPS pública). Ninguna deja «preguntar» desde el navegador. Por eso hace falta un pequeño servidor: un Worker de Cloudflare, igual que el de pagos de Stripe (plan gratuito: 100.000 peticiones al día). El Worker recibe el pedido, comprueba la firma y lo deja en un buzón. La app lo recoge por REST, igual que hace hoy con `comprobarPagosTarjeta`.
- **Las credenciales son de GastroGoan, no de cada restaurante.** Las respuestas de vuelta (aceptar, listo, carta, cerrar) tienen que salir del Worker, nunca del navegador.

## Glovo (directo)
- Un token estático para toda la integración. Cada local se identifica con su `store_id` (external id).
- Webhooks: pedido despachado (obligatorio), recogido y cancelado (opcionales). Hay hasta 3 reintentos, así que hay que deduplicar por id de pedido.
- API: aceptar, listo para recoger, en reparto, recogido por el cliente, entregado, ajustar el tiempo de preparación, sustituir productos o cambiar el precio, subir la carta (con esquema y validador), actualizar en bloque la disponibilidad y cerrar temporalmente.
- Hay entorno de pruebas (stage) y soporte en Jira.
- Coste para el restaurante: ninguno extra; sigue pagando la comisión de Glovo de siempre.
- `vtex-apps/glovo-integration` **no sirve tal cual**: VTEX lo dejó sin mantener, es exclusivo de VTEX y la propia documentación de Glovo es mejor. Solo sirve como confirmación de los endpoints.

## Uber Eats (directo)
- OAuth con credenciales de cliente (de GastroGoan). Cada restaurante enlaza su tienda (provisioning).
- Webhook de pedido. Endpoints de pedidos: aceptar, rechazar, cancelar, tiempo de listo y marcar listo. También carta (GET/PUT) y la posición del repartidor propio.
- `morscate/uber-eats` está en PHP/Laravel, así que solo sirve de referencia. En el tema de GitHub solo hay un *scraper*, que no sirve.
- **Sin comprobar todavía**: el plazo para aceptar un pedido antes de que se cancele solo, y el formato exacto de la firma del webhook. Se miran cuando Uber dé acceso.

## Deliverect (agregador)
- Una sola integración da acceso a Glovo, Uber Eats, Just Eat y otras.
- Pero **el restaurante paga Deliverect** (del orden de 1.400 $ al año; precio en España sin confirmar). Cumple la regla de la casa, porque no le cuesta nada a GastroGoan, pero es caro para un local pequeño.

## Recomendación
1. **Escribir ya a Glovo** (es gratis y Glovo es fuerte en España), en paralelo a la petición a Deliverect.
2. Construir **un núcleo común «pedido de plataforma»**: Worker + buzón + entrada en el TPV con su canal, su comisión y sus estados. Así cada plataforma es solo un adaptador. Esfuerzo: núcleo ~1 semana; Glovo ~1 semana + su certificación; Uber Eats ~1 semana + la suya.
3. Deliverect, solo para quien quiera todas las plataformas en una tablet y acepte su cuota.
4. ⚠️ Lo que se guarde en la nube de la plataforma tiene que ser pequeño y borrarse al entregarse: a 5.000 negocios crecería con cada pedido.
