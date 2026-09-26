# Libro de marca (Plan 360º)

El dosier final que se entrega al hostelero: **las respuestas y conclusiones
del Cuestionario en profundidad** (Día 1, "Este es tu negocio"), maquetadas
como documento de marca con el diseño de GastroGoan. **No lleva preguntas:
lleva conclusiones.**

## El proceso acordado con el dueño (27/09/2026)

1. El coach me pasa las respuestas del cuestionario de UN negocio (lo más
   cómodo: botón **"Ver / copiar todo"** del cuestionario en el panel del
   coach, o un documento). Si quiere fotos (logo, moodboard, plato
   estrella…), me las pasa también.
2. Yo (Claude) relleno esta plantilla con esas respuestas, redacto las
   conclusiones (la conclusión clave de cada capítulo, la "Lectura de tu
   coach" de cada página, el resumen "Tu negocio en una página" y la hoja
   de ruta 30·60·90) y genero el **PDF**.
3. El coach lo revisa y pide cambios si hace falta.
4. El coach lo sube en **Recursos → Libro de marca → "Subir PDF"** (máx.
   15 MB) y pulsa **"Guardar y enviar"**. Hasta que no hay un PDF subido,
   el negocio no ve nada en Libro de marca.

## Los ficheros

| Fichero | Qué es |
|---|---|
| `generar.mjs` | Genera la plantilla (HTML + PDF A4) en `salida/`. `node tools/libro-marca/generar.mjs` |
| `cobertura.mjs` | Mapa pregunta → sitio en el libro. **Una entrada por cada pregunta** de `PLAN360_NEGOCIO_AREAS`, en el mismo orden |
| `salida/` | PDFs generados (ignorado por git) |

## Garantía de cobertura — lo que no se puede romper

El dueño exigió que **entre TODO el cuestionario** (323 preguntas), dando más
espacio a lo importante. `generar.mjs` cruza `cobertura.mjs` con el
cuestionario REAL de `admin-panel/plan360.html` y **aborta si falta una sola
pregunta**. Salida esperada:

```
Cobertura: 323 / 323 preguntas (129 en páginas principales, 194 en fichas detalladas)
desbordadas: []
```

- `'d'` = va en una página principal de diseño (lo que define el negocio).
- `['T'|'S'|'N'|'L'|'C'|'M', …]` = campo en la **ficha detallada** del final
  de cada capítulo (texto, Sí/Parcial/No, cifra, lista de 3, checklist,
  cuadrante de menú engineering).
- ⚠️ Si alguien añade o quita preguntas del cuestionario, hay que tocar
  `cobertura.mjs` — el generador lo cantará.
- `desbordadas` debe salir vacío: detecta contenido que se sale de la
  página o pisa el bloque "Lectura de tu coach".

## Estructura del libro (39 páginas)

Portada · Presentación + índice · Tu negocio en una página · 8 capítulos
(portadilla oscura con la conclusión clave + páginas de diseño + ficha
detallada en Cocina, Sala, Equipo, Gestión y Captación) · Hoja de ruta
30·60·90 con firmas · Contraportada.

Diseño: Schibsted Grotesk + IBM Plex Mono (de `fonts/`, locales),
tinta/oliva/crema, sin esquinas redondeadas. Los huecos a rellenar son
`<mark class="ph">[ … ]</mark>` (helper `ph()`); al rellenar un negocio se
sustituyen por el texto real.

## Pendiente para la primera vez que se rellene de verdad

La plantilla genera los huecos vacíos. Para un negocio concreto, lo más
directo es: copiar `generar.mjs`, sustituir cada `ph('…')` por el contenido
de ese negocio (o añadir un objeto de datos y leer de él), quitar los
bloques que no apliquen y regenerar. Mantener la comprobación de
cobertura: toda respuesta del cuestionario tiene que aparecer.
