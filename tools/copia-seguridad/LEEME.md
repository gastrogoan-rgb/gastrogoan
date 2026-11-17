# Copias de seguridad de GastroGoan

Lo único que **no se puede reconstruir** si se pierde es lo que vive en la Firebase de la plataforma
(`plataforma-gastrogoan`): los códigos de licencia emitidos, los nombres de cuenta reservados y quién ha canjeado qué.
El código y las reglas ya están en GitHub; los datos de cada restaurante están en su propia Firebase y en su aparato.

## Cada mes (y tras varias altas)
1. En tu ordenador: `GG_ADMIN_EMAIL=… GG_ADMIN_PASS=… node tools/copia-seguridad/exportar-plataforma.mjs`
2. Se crea una carpeta `copia-plataforma-AAAA-MM-DD` con un JSON por rama.
3. Cópiala a **dos sitios distintos** (por ejemplo, un disco externo y una nube personal) y **nunca** dentro del repositorio.

## Cuando cambies algo
- **Reglas de Firebase** (plataforma y de negocio): ya están en `reglas/`. Tras publicarlas, guarda también una captura de la pestaña «Reglas».
- **Worker de Cloudflare** (pagos y, si se publica, pedidos externos): el código está en `worker/`. Guarda aparte, en tu gestor de contraseñas, sus variables y claves.
- **Accesos** (Cloudflare, Stripe, Firebase, GitHub, registrador del dominio): gestor de contraseñas + códigos de recuperación impresos.
- **Registros DNS** del dominio: una captura o exportación cuando cambien.

## Cómo se recupera
- *Se pierde la Firebase de plataforma*: se crea otra, se pegan las reglas de `reglas/reglas-de-la-plataforma.json` y se importan las ramas guardadas (Realtime Database → Importar JSON, rama a rama). `ownerAuth` no se exporta a propósito: cada cuenta se reemite desde el generador (paso 3) con el mismo usuario y un PIN nuevo, y el cliente recupera sus negocios volviendo a canjear sus códigos.
- *Se pierde un aparato del restaurante*: entra con su cuenta en otro; los datos bajan de la nube de su negocio.
