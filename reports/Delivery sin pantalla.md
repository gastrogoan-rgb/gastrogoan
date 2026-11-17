# Negocios que reparten sin pantalla en el local (17/11)

**Pregunta:** un negocio que solo hace delivery o take away y no tiene una tablet mirando el TPV: ¿cómo se entera de que entra un pedido, a coste cero por licencia?

## Lo que ya hace la app hoy
| Necesidad | Qué hay | Condición |
|---|---|---|
| Enterarse de un pedido nuevo | Alarma persistente cada 8 s (sonido, vibración y título de la pestaña) hasta que se atiende; Wake Lock para que la pantalla no se apague | La app abierta en algún aparato (cualquier móvil sirve) |
| Aviso con la app en segundo plano | Notification API del navegador | Solo con la pestaña abierta; el navegador no despierta una página cerrada sin un servidor de push |
| Papel en cocina | Con «Imprimir» en Mi Negocio, el pedido web aceptado sale solo por la impresora (Bluetooth o navegador/AirPrint), con canal, nombre, ventana y nº | Impresora configurada |
| Aceptar sin mirar | Los pedidos de la web dentro de zona y con el pago resuelto se aceptan solos | Norma del 8/11 |
| Repartidor | Vista propia con «Salgo», «Entregado», Maps y Waze | Móvil del repartidor |

## Lo que NO se puede a coste cero
- **Push con la app cerrada y WhatsApp automático al dueño:** exigen un servidor de push o la API de WhatsApp Business (cuesta por mensaje). Descartado por la regla de «nada por cliente».
- **SMS:** igual.

## Recomendación para un negocio sin pantalla
1. **Un móvil viejo** con la app abierta en «Para llevar / Delivery», con «Activar sonido» pulsado y enchufado. Es una pantalla pequeña pero basta: la alarma suena y vibra hasta que se atiende.
2. **Impresora** con «Imprimir» activado: el papel es el aviso que ya conoce cualquier cocina.
3. Para las plataformas (Glovo, Uber Eats): cuando haya una fuente de pedidos (ver `reports/Integraciones Glovo Uber Deliverect.md`) entran por el mismo buzón y disparan la misma alarma e impresión.

## Pendiente de decidir (no técnico)
Si algún día se acepta un coste, el único salto real es un servicio de push con la app cerrada. Hoy no compensa: la alarma con la app abierta cubre el caso.
