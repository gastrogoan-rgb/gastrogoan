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

## Ojo: esto son Workers, no Pages

Cloudflare ha ido juntando los dos productos en el panel. Estos sitios están
dados de alta como **Workers con recursos estáticos**, no como Pages, así que
en la configuración **no existe "Build output directory"**: la carpeta se
declara en `wrangler.jsonc` (`assets.directory`) y el panel solo necesita
saber en qué carpeta del repositorio está ese fichero.

Configuración de cada uno, en **Settings → Build**:

| | `gastrogoanapp` | `gastrogoan-reservas` |
|---|---|---|
| Root directory | `deploy/app` | `deploy/reservas` |
| Build command | *(vacío)* | *(vacío)* |
| Deploy command | `npx wrangler deploy` | `npx wrangler deploy` |
| Production branch | `main` | `main` |

El nombre del Worker tiene que coincidir con el `name` de su `wrangler.jsonc`,
o Cloudflare publicará en un Worker distinto del que tiene el dominio.

**Y lo que de verdad importa para la escala**: como estos Workers no tienen
script (`main`), solo recursos estáticos, sus peticiones son **gratuitas e
ilimitadas** y NO cuentan contra el tope de 100.000 peticiones al día del plan
gratuito. Ese tope solo aplica a Workers que ejecutan código.
