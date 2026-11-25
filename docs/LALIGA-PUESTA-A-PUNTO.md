# LaLiga: puesta a punto de la web de reservas en IP propia (fase 1)

**Problema:** en los partidos, algunos operadores bloquean IP de Cloudflare y la web de reservas no abre a clientes que nunca la han abierto. **Remedio de la fase 1:** servir SOLO `reservas.gastrogoan.com` desde servidores con IP propia. La app, el panel y los pagos siguen en Cloudflare: no se mueve nada que cobre dinero hasta comprobar que esto funciona.

Todo lo necesario está en `servidor/fase1/` (configuración validada con Caddy 2.8.4; **el servidor real todavía no se ha probado**, no existe).

## Qué NO podemos prometer
- Que LaLiga no acabe bloqueando también la IP de un proveedor. Por eso son **dos servidores en proveedores distintos**.
- Que el cliente que ya tenía la web abierta vea diferencia: ese ya funcionaba (service worker).
- Que el pago con tarjeta funcione en un bloqueo: el Worker de pagos sigue en Cloudflare. Ver «Pendiente de la fase 2».

## Pasos (en este orden)
1. **Elegir proveedores y crear cuentas** (tú). Uno en Hetzner y otro en un proveedor distinto y de otra red (por ejemplo OVH o Scaleway). Servidor pequeño de 1 vCPU y 2 GB, Ubuntu 24.04. Unos 5 € al mes cada uno.
2. **Mirar la IP antes de usarla** (juntos). En hayahora.futbol, buscar la IP asignada: si ya aparece bloqueada en algún operador, pedir otra al proveedor y repetir.
3. **Crear el servidor con `servidor/fase1/cloud-init.yaml`** en el campo «user data», sustituyendo `SUSTITUYE_POR_TU_CLAVE_PUBLICA` por tu clave pública SSH. Deja el servidor con firewall, entrada solo por clave, actualizaciones automáticas y Docker.
4. **Publicar la web:** `bash deploy/actualizar.sh` y luego `bash servidor/fase1/publicar.sh gastro@IP`.
5. **Comprobar sin tocar el DNS:** `bash servidor/fase1/comprobar.sh IP`. Comprueba la página, el enlace corto, las cabeceras, que se pueda incrustar y el certificado. Si algo falla, NO se sigue.
6. **Repetir 3 a 5 con el segundo servidor.**
7. **Cambiar el DNS** (en Cloudflare, tú): borrar el CNAME de `reservas` y crear **dos registros A** (uno por servidor), con la **nube gris** (solo DNS, sin proxy) y TTL bajo (60 s). Si algo va mal, se vuelve al CNAME anterior en un minuto.
8. **Probar en un partido real.** Con un móvil con datos de un operador que bloquee, abrir la web, y apuntar día, hora y operador del resultado.

## Marcha atrás
Volver a poner el CNAME de `reservas` apuntando al proyecto de Cloudflare Pages. No se pierde nada: los datos viven en Firebase, no en el servidor.

## Mantenimiento (casi nada)
- Las actualizaciones de seguridad del sistema son automáticas.
- Caddy renueva solo el certificado.
- Cada vez que se publica una versión nueva de la web de reservas, repetir el paso 4 en los dos servidores (o automatizarlo más adelante con GitHub Actions).
- Vigilancia gratuita (UptimeRobot) avisando si cae `reservas.gastrogoan.com`.

## Pendiente de la fase 2 (decidir después de ver la fase 1 funcionar)
- Mover también `gastrogoan.com` (web comercial), la app y el panel.
- El Worker de pagos de Stripe: hoy está en Cloudflare. Moverlo exige cambiar el webhook de Stripe y `PAGOS_WORKER_URL` (js/core.js); ya está probado en local un adaptador en `servidor/pagos/`, pero NO se activa sin tu visto bueno.
- Mientras tanto, durante un bloqueo, un cliente nuevo puede ver la reserva pero no pagar la señal con tarjeta.
