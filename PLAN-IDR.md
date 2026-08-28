# I+D — Creación de platos, menús y cartas

Módulo nuevo en la carpeta de **Cocina**. Un asistente que ayuda a crear
platos, menús y cartas **de este restaurante concreto**, no de un
restaurante genérico.

No es un chat. Es un cuaderno de I+D que va preguntando, y donde los
números los pone el escandallo, no el modelo.

---

## 0. El ADN Gastronómico (la base de todo)

Al lado de las tres burbujas de creación hay una cuarta cosa, distinta:
**el ADN**. Es lo que hace que a una casa de comidas catalana le proponga
una escudella y no un ramen.

Se rellena **una vez** y se puede editar cuando cambie el negocio. **Todo
lo que se genera después pasa por aquí.** Sin ADN, el módulo avisa de que
las propuestas van a ser genéricas y ofrece rellenarlo primero.

### Cómo se rellena

Conversando, no con un formulario de 12 campos. Y con un atajo: la app ya
conoce su carta, así que el asistente puede **proponer un borrador** —
"por lo que veo cocináis catalán de mercado con toques de brasa, ¿voy
bien?"— y que el cocinero lo corrija. Es mucho más rápido que empezar en
blanco, y engancha desde el primer minuto.

### Qué recoge

| | Para qué sirve |
|---|---|
| **Cocina y tradición** | Catalana de mercado, italiana del sur, fusión nikkei… Es la línea maestra |
| **Nivel de la casa** | Casa de comidas, bistró, gastronómico. Cambia por completo la ambición técnica |
| **Producto insignia** | Lo que no puede faltar nunca |
| **Líneas rojas** | Lo que en esta casa NO se hace. Tan importante como lo anterior |
| **Público** | Barrio, oficina, turista, celebración |
| **Objetivo de coste** | Food cost al que se quiere trabajar |
| **Equipamiento real** | Sin Roner no se proponen bajas temperaturas. Sale de Mantenimiento |
| **Equipo** | Cuántos en partida y con qué nivel: limita lo que es sacable en servicio |
| **Producto y proximidad** | Si se trabaja mercado y temporada o carta fija |
| **Dietas obligatorias** | Si siempre tiene que haber opción vegetariana o sin gluten |
| **Idioma de los platos** | Que los nombres salgan en catalán, castellano o como se use en la casa |

Se guarda como un bloque corto que se le pasa al modelo en **cada**
generación. Es barato en consumo y es lo que más cambia el resultado.

---

## 1. Nuevo plato

Paso a paso, corto en cada paso, con la posibilidad de saltárselo.

1. **De qué partimos** — producto base, o "sorpréndeme dentro de mi ADN"
2. **Temporada y mercado** — qué hay ahora; cruzado con sus ingredientes reales
3. **Tratamiento del producto** — técnica principal, coherente con su equipamiento
4. **Salsa o fondo**
5. **Guarnición**
6. **Acabado y emplatado**
7. **Escandallo** — *lo calcula la app*, no el modelo
8. **Nombre y descripción de carta**, en el idioma de la casa
9. **Guardar** → crea el escandallo, la ficha técnica y, si se quiere, entra en la carta

En cada paso el asistente **propone dos o tres caminos** con un motivo, no
uno solo. Elegir es más fácil que inventar, y deja el criterio en el
cocinero.

**Volver atrás** rehace lo que dependa de ese paso y respeta lo demás.

---

## 2. Nuevo menú

Dos caminos, porque **no se diseñan igual**.

### Tradicional (menú del día / de mediodía)
Se piensa por **coste y rotación**. Número de primeros y segundos, precio
de venta, aprovechamiento entre platos (que un fondo sirva para dos),
rotación semanal para no repetir, y el coste medio real del menú
completo.

### Degustación
Se piensa por **progresión**. Número de pases, hilo conductor, que no se
repitan técnicas ni bases, que suba de intensidad, el orden clásico
respetado (o roto a propósito), maridaje si hay bodega, y ritmo de
servicio: cuántos pases se pueden sacar con la gente que hay en partida.

---

## 3. Nueva carta

Lo más difícil, porque no es una lista de platos buenos: es **equilibrio**.

- Estructura por secciones y cuántos platos en cada una
- **Reparto de bases y técnicas**: que no vaya todo al horno ni todo lleve la misma crema
- **Carga de servicio**: cuántos platos exigen trabajo al momento
- **Mise en place compartida**: que los platos se apoyen entre ellos
- Dietas cubiertas según su ADN
- **Margen del conjunto**, calculado con sus precios reales
- Estacionalidad: qué entra y qué sale respecto a la carta actual

---

## 4. Las reglas de honestidad (no inventar)

Esto es lo que separa esto de un chat tonto, y va escrito en las
instrucciones del asistente:

1. **Si no lo sabe, lo dice y pregunta.** "No conozco bien ese plato
   regional: ¿me lo describes, o me pegas una receta de referencia y
   trabajo sobre ella?" Nunca rellenar el hueco con algo verosímil.
2. **Los números no los pone el modelo.** Coste, food cost, margen y
   alérgenos salen del escandallo. Si el modelo estima algo distinto,
   manda la app.
3. **Los ingredientes salen de los suyos.** Si propone algo que no tiene,
   lo marca como "esto habría que comprarlo", separado de lo que ya hay.
4. **Distingue tradición de invención.** Que se sepa qué es un plato
   clásico y qué es una adaptación suya.
5. **Sin datos suficientes, no opina.** Si lleva dos semanas de ventas, lo
   dice en vez de inventarse una tendencia.

### Buscar información

La app **no puede buscar en internet por su cuenta**: al ser 100%
navegador, los buscadores rechazan la llamada. Así que:

- **Siempre disponible**: pide la referencia y el cocinero le pega el
  texto o la receta. Trabaja sobre eso.
- **Si el proveedor lo trae de serie**: se activa su búsqueda y ya está.
  Se diseña para que sea un extra, nunca la base.

### Fuera de alcance: conservación

**Conservación, fermentación, envasado al vacío, curados y conservas
quedan FUERA del módulo.** No por falta de capacidad, sino porque un
tiempo o una temperatura equivocada ahí no es un plato malo: es una
intoxicación. Si la conversación deriva, el asistente lo dice y remite al
APPCC del negocio.

---

## 5. Cómo se monta

- **Un módulo más de Cocina.** Entrada en `FOLDERS.cocina`, su vista y su
  render, como Escandallo o Megalista.
- **Clave del propio negocio**, igual que su Firebase: el coste es suyo,
  cero para GastroGoan. Verificado que el navegador puede llamar
  directamente a los proveedores (Google y Anthropic responden a la
  llamada desde navegador; OpenAI sin comprobar).
- **La clave, por dispositivo** (`localStorage`), no en `DB.business`: ese
  bloque se sincroniza con su Firebase y su propio personal podría leerla.
  Mismo criterio que se tomó con el idioma.
- **Una capa fina en medio** para que el proveedor sea un ajuste y no una
  decisión de por vida.
- **Respuesta estructurada**, no prosa: platos con ingredientes y
  cantidades que la app entienda, para poder costearlos y crearlos.
- **Se guarda solo.** Es una conversación larga: si se corta internet o se
  cierra la tablet, mañana sigue ahí.
- **Tope de gasto** visible y duro, para que nada se enganche consumiendo
  la cuota del cliente.
- **Sin IA, el módulo sigue.** Las creaciones guardadas se ven, se editan
  y se imprimen sin conexión. La IA es el ayudante, no el soporte.

### Marca

Sin marca de terceros en la interfaz: es el asistente de I+D de
GastroGoan. Pero **no se le hace negar que es una IA** — ni es honesto ni
se puede garantizar. Y hay que leer las condiciones del proveedor antes de
publicar.

---

## 6. Cómo se prueba

El problema nuevo: **una IA no da siempre la misma respuesta**, y las 19
pruebas de la batería se apoyan en que la app sí.

Se resuelve **fingiendo el proveedor** en las pruebas. Con respuestas
fijas se comprueba lo que sí es determinista, que es casi todo lo que
importa:

- Que una propuesta se convierte en escandallo y ficha correctos
- Que el coste calculado es el de la app, no el del modelo
- Que los alérgenos se arrastran
- Que sin clave, sin internet o con la cuota agotada avisa y no rompe
- Que la conversación sobrevive a cerrar y volver a abrir
- Que el ADN llega de verdad a cada generación
- Que el tope de gasto corta

---

## 7. Riesgos

| Riesgo | Qué se hace |
|---|---|
| Primera dependencia externa de la app | El módulo funciona sin IA; los fallos se explican en cristiano |
| Toca el alta, que es el punto frágil | La clave se pide **dentro del módulo**, no en el alta. Quien no use I+D no se entera |
| El cliente se gasta dinero sin darse cuenta | Tope duro y contador visible |
| Capas gratuitas que cambian | Verificar el día de montarlo, y no prometer "gratis" en la venta |
| Respuestas genéricas | El ADN, sus ingredientes y sus precios en cada generación |

---

## 8. Orden propuesto

1. **ADN Gastronómico** — sin esto lo demás es genérico
2. **Nuevo plato** — la unidad; valida todo el circuito hasta la carta
3. **Nuevo menú** (tradicional y degustación)
4. **Nueva carta** — la más difícil, y la que más se apoya en las anteriores

Cada fase deja pruebas puestas antes de pasar a la siguiente.
