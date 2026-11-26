# GastroGoan: guía del sistema para el dueño

Escrita en lenguaje llano para que puedas entender cómo funciona todo, saber qué es tuyo y dónde vive, y poner el negocio a buen recaudo. **No contiene contraseñas ni claves.** Lo que no he podido comprobar desde aquí lo marco con «comprobar».

## 1. El sistema en una página

GastroGoan no tiene un servidor propio. Son ficheros que se descargan al navegador del cliente y una nube que paga cada restaurante.

| Pieza | Qué es | Dónde vive | Quién la paga |
|---|---|---|---|
| **App de gestión** (`app.gastrogoan.com`) | La aplicación que usa el hostelero y su equipo | Cloudflare Pages (proyecto de la app) | Tú, gratis (tráfico ilimitado) |
| **Web de reservas** (`reservas.gastrogoan.com`) | Lo que ve el cliente final: carta, reservas, pedidos | **Servidor propio en Hetzner** (Helsinki, IP `5.222.10.11`, ~6 €/mes; se baja la web de GitHub cada 5 min). Cloudflare Pages queda como marcha atrás | Tú, ~6 €/mes (excepción aceptada) |
| **Web comercial** (`gastrogoan.com`) | Donde vendes | Cloudflare Pages | Tú, gratis |
| **Panel de admin** (`admin.gastrogoan.com`) | Generador de licencias y panel del Plan 360 | Cloudflare Pages | Tú, gratis |
| **Datos de cada negocio** | Ventas, carta, personal… | **Firebase del propio negocio** (cada uno crea el suyo, gratis) | El negocio |
| **Registro de licencias** | Qué códigos has vendido y de quién son | **Firebase de la plataforma** (`plataforma-gastrogoan`) | Tú, gratis |
| **Cobros con tarjeta de los clientes de cada restaurante** | Dinero del restaurante, no tuyo | Stripe del restaurante + el Worker `gastro` de Cloudflare (`gastro.gastrogoan.workers.dev`), que entra a Firebase con una **cuenta de servicio** | El restaurante |
| **Vigilancia** | Avisa si cae una web | UptimeRobot (plan gratuito) | Tú, gratis |
| **Registrador del dominio** | Donde está registrado `gastrogoan.com` | **Cloudflare** (antes estuvo en Canva) | Tú, precio de coste |
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
| Cloudflare | Hosting, DNS, registrador del dominio, Worker de pagos | Ídem | comprobar |
| Firebase `plataforma-gastrogoan` | Registro de licencias y cuenta de servicio del Worker | Ídem | comprobar |
| Stripe (tu cuenta) | Cobro de licencias y del Plan 360 | — | comprobar |
| Cuenta de Google del admin | Entrar como administrador en el generador | — | comprobar |
| Registrador del dominio (Cloudflare, misma cuenta que arriba) | Que no caduque `gastrogoan.com` | — | sí (misma cuenta de Cloudflare) |
| Hetzner | Servidor de la web de reservas | Ídem | comprobar |
| UptimeRobot | Avisos de caída | — | comprobar |
| Correo de GastroGoan | Recuperar todo lo anterior | — | comprobar |

**Verificación en dos pasos: hecha el 26/11** en tus cuentas (confirma que también está en Hetzner y UptimeRobot). Sigue pendiente guardar los **códigos de recuperación** impresos en un sitio físico seguro y una **segunda persona** con acceso de emergencia.

## 4. Qué pasa si falla algo
| Si… | Qué ven los clientes | Qué haces |
|---|---|---|
| Cloudflare Pages cae unas horas | La app ya abierta sigue funcionando (guarda una copia y los datos están en el aparato) | Esperar; revisar el estado de Cloudflare |
| Un operador bloquea la IP de Cloudflare en un partido | La web de reservas ya no depende de Cloudflare (sale de Hetzner); la app y el pago con tarjeta sí | Ver `docs/LALIGA-PUESTA-A-PUNTO.md` |
| El servidor de reservas no contesta | Clientes nuevos no abren la web de reservas | UptimeRobot avisa. Recrearlo (abajo) o marcha atrás a Cloudflare Pages |
| El cobro con tarjeta deja de funcionar | Los clientes no pueden pagar | Ver «Si el cobro con tarjeta deja de funcionar» |
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
| **Las claves del Worker** (Stripe, cuenta de servicio de Firebase…) | **Solo** en Cloudflare (Variables y secretos) y en tu gestor de contraseñas; nunca en el repositorio ni en el chat | Una vez |

### Dónde guardar las copias (regla 3-2-1)
**Tres copias, en dos tipos de soporte, y una fuera de casa.** Todas con la misma carpeta que genera `bash tools/copia-maestra.sh` (repositorio entero con su historial, reglas de Firebase, generador de licencias, Worker de pagos, kit de servidor, panel, textos legales y guías; probado: se restaura con `git clone gastrogoan.bundle`).
1. **GitHub** (ya existe, pero no cuenta como copia si pierdes el acceso a la cuenta).
2. **Un disco externo o USB cifrado**, en tu casa. Una copia al mes y otra antes de cualquier cambio grande.
3. **Una nube privada fuera de tus cuentas de trabajo** (otra cuenta de correo o de Drive, con la carpeta comprimida y cifrada con contraseña). Sin ella, un robo, un incendio o el cierre de una cuenta se llevan todo.

### Lo que hay que guardar a mano (no está en el repositorio)
| Qué | Dónde se guarda | Cada cuánto |
|---|---|---|
| Contraseñas, claves de Stripe y del Worker, códigos de recuperación | Gestor de contraseñas + una hoja impresa en un sitio físico seguro | Al cambiarlas |
| **Registro de licencias** (`issuedCodes`, `ownerNames`, `codeClaims`, `adminSalesLog`) | Consola de Firebase de la plataforma → Exportar JSON; dentro de la carpeta de copia | Cada mes |
| **Reglas de Firebase** de la plataforma y de cada negocio | Ya están en `reglas/` y salen en la copia (`reglas/…plataforma.json`, `reglas/…cada-negocio.json`, `database.rules.propuesta.json`); además anota qué versión está publicada y cuándo | Con cada cambio de reglas |
| Configuración de Cloudflare (proyectos de Pages, dominios y DNS, variables del Worker) | Capturas de pantalla o exportación del DNS, en la carpeta de copia | Cada trimestre |
| Configuración de Stripe (enlaces de pago, webhooks, qué productos hay) | Capturas y apuntes, nunca las claves | Al cambiar |
| Lista de clientes y negocios | El registro de licencias y tu hoja de ventas | Cada mes |
| El Worker de pagos publicado | `worker/pagos-worker.js` va en la copia; lo que está pegado en Cloudflare debe ser idéntico | Al cambiarlo |

**Comprobación anual:** restaurar una copia en una carpeta nueva y confirmar que se abre. Una copia que no se ha probado no es una copia.

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
- **El repositorio es público**: cualquiera puede leer el código y el historial. No hay claves dentro (revisado), pero sí hubo datos personales en versiones anteriores; considera pasarlo a privado cuando decidas. Ojo, tiene tres consecuencias: la revocación de licencias se lee de `raw.githubusercontent.com` (dejaría de funcionar), el servidor de Hetzner baja la web de GitHub sin llaves (dejaría de poder) y GitHub Actions pasa a 2.000 minutos al mes.

## 10. Si el cobro con tarjeta deja de funcionar
Los pagos pasan por el Worker `gastro` de Cloudflare. Por orden:
1. **¿Está vivo?** Abre en el navegador o ejecuta `curl -i https://gastro.gastrogoan.workers.dev/stripe/estado`. Debe contestar un JSON. Si da **404 o una página HTML**, el Worker ha perdido su código.
2. **Que NO esté conectado a Git.** Cloudflare → Workers → `gastro` → Configuración → Compilaciones: no debe haber ningún repositorio conectado. (El 26/11 estaba conectado a GitHub y en cada publicación se redesplegaba como «solo activos estáticos», borrando el código de pagos y sus claves. Por eso ahora es un Worker nuevo, sin Git.) Si lo está, desconéctalo y vuelve a pegar `worker/pagos-worker.js`.
3. **Las claves siguen puestas.** Configuración → Variables y secretos: deben estar las de Stripe y `FIREBASE_SERVICE_ACCOUNT` (el JSON de la cuenta de servicio de `plataforma-gastrogoan`, como secreto). Si faltan, se vuelven a poner desde tu gestor de contraseñas. Lista completa y nombres exactos en `worker/README.md`.
4. **El aviso de Stripe llega.** Stripe → Desarrolladores → Webhooks: el destino es `https://gastro.gastrogoan.workers.dev/stripe/webhook` y los últimos envíos deben salir en verde.
5. Si sigue sin ir, dímelo con el mensaje exacto; nunca pegues una clave en el chat.

## 11. Cómo recrear el servidor de reservas
Cuando el servidor no arranca o quieres uno limpio (los datos viven en Firebase; en el servidor no hay nada que perder):
1. En Hetzner crea un servidor nuevo: Ubuntu 24.04, el tipo más barato con 2 GB, IPv4, **sin llave SSH**, y en «User data» pega el contenido de `servidor/fase1/cloud-init.yaml` (si cambias algo, regenéralo con `python3 servidor/fase1/generar-cloud-init.py`).
2. Mira en la consola (`>_`) que salga `GG-ARRANQUE: LISTO`.
3. **Pruébalo sin tocar el DNS** en `x-x-x-x.sslip.io` (la IP con guiones, p. ej. `5-222-10-11.sslip.io`): debe cargar con candado y dejar hacer una reserva de prueba.
4. En Cloudflare → DNS cambia el registro **A** de `reservas` a la IP nueva (nube **gris**, TTL 1 min).
5. **Reinicia el servidor** (Hetzner → Power) para que pida el certificado al momento.
6. Comprueba `https://reservas.gastrogoan.com` y, cuando todo vaya, **borra el servidor viejo** (si no, pagas dos).
Marcha atrás: ver `docs/LALIGA-PUESTA-A-PUNTO.md`. Última vez hecho: 26/11 (IP `5.222.2.92` → `5.222.10.11`).
