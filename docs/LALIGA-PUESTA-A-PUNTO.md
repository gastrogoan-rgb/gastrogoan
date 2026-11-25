# LaLiga: puesta a punto de la web de reservas en IP propia (fase 1)

**Problema:** en los partidos, algunos operadores bloquean IP de Cloudflare y la web de reservas no abre a clientes que nunca la han abierto. **Remedio de la fase 1:** servir SOLO `reservas.gastrogoan.com` desde servidores con IP propia. La app, el panel y los pagos siguen en Cloudflare: no se mueve nada que cobre dinero hasta comprobar que esto funciona.

Todo lo necesario está en `servidor/fase1/`. Probado aquí: la configuración de Caddy valida y sirve la web (raíz, enlace corto y cabeceras), y la actualización automática publica, actualiza y NO borra nada si falla la red o la versión viene rota. **Lo que todavía no se ha probado es el servidor real**, porque no existe.

## Qué NO podemos prometer
- Que LaLiga no acabe bloqueando también la IP de un proveedor. Por eso son **dos servidores en proveedores distintos**.
- Que el cliente que ya tenía la web abierta vea diferencia: ese ya funcionaba (service worker).
- Que el pago con tarjeta funcione en un bloqueo: el Worker de pagos sigue en Cloudflare. Ver «Pendiente de la fase 2».

## Cómo funciona (sin llaves y sin ordenador)
El servidor **no necesita que nadie entre en él**. Al crearlo con `servidor/fase1/cloud-init.yaml` queda configurado solo y, **cada 5 minutos, se baja de GitHub la última web de reservas** (la misma carpeta `deploy/reservas/public` que usa Cloudflare). Como el repositorio es público, solo la LEE: no hay ninguna llave ni contraseña guardada en ningún sitio. El puerto de entrada por SSH está cerrado. Si algún día hace falta tocarlo, se borra y se vuelve a crear con el mismo texto (3 minutos; los datos viven en Firebase, no aquí).
Cada versión se guarda en su carpeta y se cambia de golpe; las 3 últimas se conservan para volver atrás. Si GitHub falla o la versión viene rota, **no se toca lo que ya estaba publicado** (probado: `servidor/fase1/gg-actualizar.sh`).
Los ficheros de `servidor/fase1/` son la fuente; `cloud-init.yaml` se genera con `python3 servidor/fase1/generar-cloud-init.py` para que nunca se desincronicen.

## Pasos (en este orden, uno cada vez)
1. **Cuenta en Hetzner con verificación en dos pasos** (tú). Hecho el 25/11.
2. **Crear el servidor** (tú): proyecto nuevo, Ubuntu 24.04, el tipo más barato con 2 GB de RAM, IPv4 activada, SIN llave SSH, y en «Cloud config / User data» se pega el contenido de `servidor/fase1/cloud-init.yaml`.
3. **Mirar la IP** (juntos): en hayahora.futbol, buscar la IP asignada. Si aparece bloqueada en algún operador, se borra el servidor y se crea otro.
4. **Probar sin tocar el DNS** (tú desde el móvil o la tablet): el servidor publica además una dirección de prueba con la IP, `x-x-x-x.sslip.io` (con la IP con guiones), con certificado válido. Si la web carga ahí, el servidor funciona. Se prueba una reserva y el enlace corto.
5. **Cambiar el DNS** (tú, en Cloudflare): borrar el CNAME de `reservas` y crear un registro **A** hacia la IP con la **nube gris** (solo DNS, sin proxy) y TTL bajo (60 s).
6. **Probar en un partido real.** Con datos móviles de una operadora que bloquee, abrir la web y apuntar día, hora y operador.
7. **Segundo servidor** (más adelante, si la prueba va bien): repetir 2 a 5 en otro proveedor y añadir un segundo registro A.

## Marcha atrás
Volver a poner el CNAME de `reservas` apuntando al proyecto de Cloudflare Pages. No se pierde nada: los datos viven en Firebase, no en el servidor.

## Mantenimiento (casi nada)
- Las actualizaciones de seguridad del sistema son automáticas.
- Caddy renueva solo el certificado.
- Cada vez que se publica una versión nueva de la web de reservas en `main`, el servidor la recoge solo en menos de 5 minutos.
- Vigilancia gratuita (UptimeRobot) avisando si cae `reservas.gastrogoan.com`.

## Pendiente de la fase 2 (decidir después de ver la fase 1 funcionar)
- Mover también `gastrogoan.com` (web comercial), la app y el panel.
- El Worker de pagos de Stripe: hoy está en Cloudflare. Moverlo exige cambiar el webhook de Stripe y `PAGOS_WORKER_URL` (js/core.js); ya está probado en local un adaptador en `servidor/pagos/`, pero NO se activa sin tu visto bueno.
- Mientras tanto, durante un bloqueo, un cliente nuevo puede ver la reserva pero no pagar la señal con tarjeta.
