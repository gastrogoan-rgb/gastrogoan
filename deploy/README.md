# Publicar GastroGoan

Dos sitios estáticos, servidos desde este repositorio:

| Carpeta | Se publica en | Qué es |
|---|---|---|
| `deploy/app/public` | `app.gastrogoan.com` | La app de gestión (+ `sw.js` y `version.json`) |
| `deploy/reservas/public` | `reservas.gastrogoan.com` | La web pública de reservas y pedidos |

**Nunca se editan a mano.** Salen de `bash build.sh` y se copian con
`bash deploy/actualizar.sh`. Si se editan aquí, el siguiente build los pisa.

## Dónde se aloja, y por qué

**Cloudflare Pages**, plan gratuito. La razón es una sola y es decisiva a
escala: **el ancho de banda para contenido estático es ilimitado**, y esta app
es 100% estática. Con 5.000 negocios el tráfico ronda los 270 GB al mes —
Netlify gratis da 15 GB (300 créditos a 20 créditos/GB) y además cobra 15
créditos por publicación, o sea **20 publicaciones al mes**. Aquí son 500.

⚠️ **Cloudflare NO exige cambiar los nameservers si solo se usan
subdominios.** Ese fue el muro la primera vez. Con `app.` y `reservas.` basta
con dar de alta el dominio en el panel de Pages y crear luego un CNAME en el
DNS que ya se esté usando. El registrador (Canva) no se toca.

## Dar de alta un sitio en Cloudflare Pages

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → conectar con
   GitHub y elegir este repositorio.
2. Rama de producción: **`main`** (es la que publica; ver CLAUDE.md).
3. **Build command**: vacío. No hay que compilar nada: los ficheros ya van
   hechos en el repositorio.
4. **Build output directory**: `deploy/app/public` para la app, o
   `deploy/reservas/public` para reservas.
5. Cuando termine, comprobar en la dirección `*.pages.dev` que da Cloudflare
   **antes** de tocar ningún DNS.
6. **Custom domains** → añadir `app.gastrogoan.com` (o `reservas.…`).
   Cloudflare dirá a qué destino apuntar.
7. En el DNS actual, cambiar el CNAME de ese subdominio a ese destino.

El orden importa: **primero se comprueba en `pages.dev`, después se mueve el
DNS.** Así el sitio que está en producción no se cae en ningún momento.

## Los ficheros de configuración

- `wrangler.jsonc` (en cada sitio): solo hace falta si se publica con la
  herramienta de línea de comandos de Cloudflare. Con el panel no se usa, pero
  se conserva porque documenta la configuración correcta.
- **NO hay `_redirects` en reservas, y es a propósito.** Cloudflare rechaza el
  fichero entero con *"Infinite loop detected"* por la regla de la raíz
  (`/ → /index.html`), porque choca con su propia limpieza de `/index.html`.
  Ya costó un rato la primera vez. No hace falta: `not_found_handling:
  single-page-application` en `wrangler.jsonc` hace lo mismo, y la página saca
  el nombre del negocio del pathname (`getSlugFromUrl`), no solo de `?n=`.

## ⚠️ Tienen que ser PAGES, no Workers

Cloudflare junta los dos productos en el panel y es fácil crear el que no es,
pero para esto **no valen igual**:

- **Workers**: para asignarle un dominio propio, ese dominio tiene que estar
  entero en Cloudflare, **nameservers incluidos**. El registrador de
  gastrogoan.com (Canva) no permite cambiarlos. Callejón sin salida — y es
  exactamente el muro del primer intento con Cloudflare.
- **Pages**: para un **subdominio** basta con darlo de alta en el panel y
  crear un CNAME donde esté el DNS. Ni nameservers ni tocar el registrador.

Como `app.` y `reservas.` son subdominios, **Pages funciona y Workers no**.

### Crear cada sitio

Cloudflare → **Workers & Pages** → **Create** → pestaña **Pages** →
**Connect to Git** → este repositorio.

| | app | reservas |
|---|---|---|
| Framework preset | **None** | **None** |
| Build command | *(vacío)* | *(vacío)* |
| Build output directory | `deploy/app/public` | `deploy/reservas/public` |
| Production branch | `main` | `main` |

⚠️ Con un *framework preset* distinto de None, Cloudflare esconde el campo de
la carpeta de salida y decide él: por ahí se pierde un rato.

Los enlaces cortos de reservas (`reservas.gastrogoan.com/casapaco`) funcionan
gracias a `404.html`, que es una copia de la propia página: cualquier ruta que
no sea un fichero cae ahí, y la página saca el nombre del negocio del pathname
(`getSlugFromUrl`). **No se pone `_redirects`**: Cloudflare rechaza el fichero
entero con *"Infinite loop detected"* por la regla de la raíz.

### Mover el dominio (sin cortar el servicio)

1. Comprobar primero en la dirección `*.pages.dev` que da Cloudflare.
2. En el proyecto → **Custom domains** → añadir el subdominio. Cloudflare dirá
   a qué destino apuntar (algo como `<proyecto>.pages.dev`).
3. En el DNS actual, cambiar el CNAME de ese subdominio a ese destino.

**Primero se comprueba, después se mueve el DNS.** Así producción no se cae.

Los `wrangler.jsonc` se conservan solo por si algún día se publica desde la
línea de comandos; con Pages no se usan.
