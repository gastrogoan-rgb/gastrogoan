# GastroGoan: guía del sistema para el dueño

Escrita en lenguaje llano para que puedas entender cómo funciona todo, saber qué es tuyo y dónde vive, y poner el negocio a buen recaudo. **No contiene contraseñas ni claves.** Lo que no he podido comprobar desde aquí lo marco con «comprobar».

## 1. El sistema en una página

GastroGoan no tiene un servidor propio. Son ficheros que se descargan al navegador del cliente y una nube que paga cada restaurante.

| Pieza | Qué es | Dónde vive | Quién la paga |
|---|---|---|---|
| **App de gestión** (`app.gastrogoan.com`) | La aplicación que usa el hostelero y su equipo | Cloudflare Pages (proyecto de la app) | Tú, gratis (tráfico ilimitado) |
| **Web de reservas** (`reservas.gastrogoan.com`) | Lo que ve el cliente final: carta, reservas, pedidos | Cloudflare Pages | Tú, gratis |
| **Web comercial** (`gastrogoan.com`) | Donde vendes | Cloudflare Pages | Tú, gratis |
| **Panel de admin** (`admin.gastrogoan.com`) | Generador de licencias y panel del Plan 360 | Cloudflare Pages | Tú, gratis |
| **Datos de cada negocio** | Ventas, carta, personal… | **Firebase del propio negocio** (cada uno crea el suyo, gratis) | El negocio |
| **Registro de licencias** | Qué códigos has vendido y de quién son | **Firebase de la plataforma** (`plataforma-gastrogoan`) | Tú, gratis |
| **Cobros con tarjeta de los clientes de cada restaurante** | Dinero del restaurante, no tuyo | Stripe del restaurante + un Worker de Cloudflare | El restaurante |
| **Código** | Todo el programa | GitHub (`gastrogoan-rgb/gastrogoan`, **público**) | Gratis |

Por qué importa: **ninguna pieza te cuesta dinero por cada cliente que vendes.** Esa es la regla de oro y lo que permite llegar a 5.000 licencias sin cuotas.

## 2. Cómo viaja un cambio hasta el cliente
1. Se cambia el código en la rama de trabajo.
2. `bash build.sh` genera la carpeta `dist/`; `bash deploy/actualizar.sh` la copia dentro de `deploy/`.
3. Se hace commit, se sube la rama y se fusiona en `main`.
4. Cloudflare Pages publica desde `main`. **Si no está en `main`, el cliente no lo ve.**
5. El sello de versión (abajo en la app) te dice qué versión estás mirando.
6. Las apps abiertas se actualizan solas si nadie está trabajando; si hay alguien trabajando, avisan con una barra.

## 3. Quién tiene qué (inventario de accesos)
Rellénalo tú y guárdalo **en un gestor de contraseñas**, nunca en un documento suelto.

| Cuenta | Para qué | Quién más debería poder entrar | ¿Tiene verificación en dos pasos? |
|---|---|---|---|
| GitHub (propietario del repositorio) | Código y publicación | Una segunda persona de confianza como respaldo | comprobar |
| Cloudflare | Hosting, DNS, Worker de pagos | Ídem | comprobar |
| Firebase `plataforma-gastrogoan` | Registro de licencias | Ídem | comprobar |
| Stripe (tu cuenta) | Cobro de licencias y del Plan 360 | — | comprobar |
| Cuenta de Google del admin | Entrar como administrador en el generador | — | comprobar |
| Registrador del dominio | Que no caduque `gastrogoan.com` | — | comprobar |
| Correo de GastroGoan | Recuperar todo lo anterior | — | comprobar |

Dos cosas que conviene hacer ya: activar la **verificación en dos pasos** en todas, y guardar los **códigos de recuperación** impresos en un sitio físico seguro.

## 4. Qué pasa si falla algo
| Si… | Qué ven los clientes | Qué haces |
|---|---|---|
| Cloudflare Pages cae unas horas | La app ya abierta sigue funcionando (guarda una copia y los datos están en el aparato) | Esperar; revisar el estado de Cloudflare |
| Un operador bloquea la IP de Cloudflare en un partido | La web de reservas puede no abrir a clientes nuevos | Plan LaLiga: servidores con IP propia (ver `servidor/`) |
| Firebase de un negocio falla | Ese negocio trabaja en local y sube al volver | Nada |
| Firebase de la plataforma falla | No se pueden canjear códigos nuevos ni crear cuentas | Esperar; los negocios ya activos siguen |
| Se pierde un código de licencia o un PIN | Un cliente no entra | Generador de licencias, paso 3 (reemite la cuenta) |
| Alguien filtra un código | Podría usarse en otra cuenta | Liberarlo en el generador (`codeClaims`) |
| Subes una versión con un fallo | Todos lo ven | **Volver a la versión anterior en Cloudflare Pages** (Despliegues → elegir el anterior → «Rollback»; comprobar el nombre exacto del botón en tu panel) |
| Se te pierde el acceso a GitHub o Cloudflare | No puedes publicar | Por eso hace falta una segunda persona con acceso y los códigos de recuperación |

## 5. Copias: qué guardar, dónde y cada cuánto
| Qué | Cómo | Cada cuánto |
|---|---|---|
| **El código** | Ya está en GitHub. Haz una copia local del repositorio (`git clone`) en tu disco | Al cerrar cada semana |
| **El registro de licencias** (`issuedCodes`, `ownerNames`, `codeClaims`, `adminSalesLog`) | Consola de Firebase → Realtime Database → Exportar JSON | Cada mes y antes de cualquier cambio de reglas |
| **Las reglas de Firebase** | Ya están en `reglas/` | Con el código |
| **Los datos de cada cliente** | Los guarda su propio Firebase; la app tiene «Copia de seguridad» manual | Que cada cliente la use (recordatorio diario en la app) |
| **El Worker de pagos** | Está en `worker/pagos-worker.js`; se pega a mano en Cloudflare | Con el código |
| **Las claves del Worker** | En Cloudflare. Apúntalas en tu gestor de contraseñas | Una vez |

## 6. Qué no tocar nunca (aprendido a golpes)
- `generador-licencias.html` **no se publica en la web comercial**; solo como `admin.gastrogoan.com/app.html`.
- Nunca escribir en el Firebase de producción para probar. Hay una cuenta de prueba (`pruebamia`) para eso.
- No editar `dist/` a mano: se regenera.
- No cambiar las reglas de Firebase en un solo sitio: viven en tres copias que deben ser idénticas.
- No desactivar la comprobación de cambios sin guardar ni las pruebas para «ir más rápido».

## 7. Qué cuesta cada cosa y hasta dónde llega
- **Cloudflare Pages**: tráfico ilimitado y 500 publicaciones al mes. Es la razón de elegirlo.
- **Firebase del negocio**: plan gratuito, 100 conexiones simultáneas (una pestaña abierta = una conexión). Un negocio no llega.
- **Firebase de la plataforma**: solo licencias y una guía mínima. Aguanta miles de negocios.
- **Stripe**: comisión por cobro, la paga quien cobra.
- **Si algún día pasas de cuotas cero**: el único coste fijo previsto es un servidor de unos 5 a 10 € al mes para el problema de LaLiga. Es una excepción que tú ya has aceptado.

## 8. Cómo entender el código sin ser programador
- `CLAUDE.md` es la memoria del proyecto: qué se decidió, por qué, y los errores que ya se pisaron. Léelo por secciones; no hace falta entenderlo entero.
- `docs/` y `reports/` tienen los análisis largos.
- `test/todo.sh` lanza unas 237 comprobaciones automáticas. **Si todo sale en verde, la app cumple lo que sabemos comprobar.** Lo que no está comprobado es lo que hay que mirar con un cliente real.
- Cada vez que se publica, pídeme: «¿qué sello tengo que ver y qué cambió?»

## 9. Riesgo de depender de una sola persona (o de una sola IA)
- **Tú** eres el único con las cuentas. Mitigación: segunda persona con acceso de emergencia y códigos de recuperación impresos.
- **Yo** trabajo con la memoria que dejan estos documentos. Si cambias de asistente o de informático, esta guía y `CLAUDE.md` son lo que le ahorra semanas. Mantenerlos al día es parte del trabajo.
- **El repositorio es público**: cualquiera puede leer el código y el historial. No hay claves dentro (revisado), pero sí hubo datos personales en versiones anteriores; considera pasarlo a privado cuando decidas (ojo: en privado, GitHub Actions pasa a 2.000 minutos al mes).
