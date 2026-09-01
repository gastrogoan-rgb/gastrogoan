# Las dos reglas de Firebase

Dos ficheros, dos sitios distintos. **No se mezclan.**

| Fichero | Dónde se pega | Quién lo hace |
|---|---|---|
| `reglas-de-la-plataforma.json` | Proyecto **`plataforma-gastrogoan`** | Solo el dueño de GastroGoan, una vez |
| `reglas-de-cada-negocio.json` | El proyecto Firebase **de cada cliente** | Cada hostelero, en el paso 5 del asistente de nube |

En los dos casos: consola de Firebase → **Realtime Database** → pestaña
**Reglas** → borrar todo y pegar → **Publicar**.

## Por qué hay que actualizarlas

El espejo público (lo que lee la web de reservas: la carta, el aforo, las
reservas que entran) **se ha mudado a la nube de cada negocio**. Vivía en la
compartida, y ahí el techo llega antes de lo que parece: el plan gratuito de
Firebase da **100 conexiones simultáneas**, y una conexión es una pestaña
abierta. Con el espejo compartido, cada app de gestión y cada cliente mirando
la carta ocupaban una conexión del MISMO proyecto — a partir de unos 50-100
negocios, la web de reservas empieza a fallar para todos a la vez, un viernes
por la noche.

- **Las del negocio** añaden los nodos que faltaban (`aforoHold`,
  `pedidosHold`, `mesaHold`, `orderStatus`, `reservationStatus`) para que su
  propia nube pueda alojar el espejo entero.
- **Las de la plataforma** abren a lectura `publicLookup` y `publicSlugs`, que
  es lo único que sigue viviendo ahí: una guía mínima de dónde está cada
  negocio. Se consulta por REST, sin abrir socket, así que no gasta ninguna
  conexión.

## Nadie se rompe mientras tanto

La app **comprueba escribiendo** si la nube del negocio acepta el espejo
completo, y solo entonces le manda ahí a la web pública. Un negocio con las
reglas viejas sigue funcionando en la compartida, igual que hasta ahora, y se
muda solo en cuanto su dueño pegue estas reglas.
