# 🎹 El Cuaderno del Pianista — T-Clas

Cuaderno de estudio de piano para los alumnos, basado en sus partituras.
Material de nivel adulto: análisis musical, técnica e interpretación, con un
enfoque cercano para **disfrutar entendiendo lo que se toca**.

## Cómo verlo e imprimirlo

1. Abre **`index.html`** en cualquier navegador (Chrome, Edge, Safari...). Es un único
   archivo, no necesita internet ni programas. El logo está incrustado como vector (SVG),
   así que se ve nítido a cualquier tamaño y no depende de imágenes externas.
2. Para imprimir o crear un PDF: `Ctrl+P` (o `Cmd+P` en Mac) → tamaño **A4** →
   **márgenes "Ninguno"** y activa **"Gráficos de fondo"** para que salgan los colores y el sello.

## Qué contiene

- **Portada** con el logo de T-Clas + preliminares: "Cómo aprovechar el cuaderno",
  "Símbolos y convenciones" e **índice del repertorio** (las 23 obras por nivel,
  sin fechas: cada alumno avanza a su ritmo).
- **44 sesiones** organizadas en tres niveles por dificultad:
  - **Nivel I · Fundamentos** — piezas accesibles para asentar la base.
  - **Nivel II · Desarrollo** — dificultad media, 2 sesiones por obra.
  - **Nivel III · Maestría** — las obras más largas/difíciles, 3 sesiones por obra.
- Cada sesión tiene 7 apartados: **I La obra · II Análisis musical · III Técnica del día ·
  IV Plan de estudio · V Pasajes exigentes · VI Interpretación · VII Objetivos**.
  Con diagramas de teclado, escalas con digitación, tiras de ritmo, metas de metrónomo
  y recuadros destacados para los pasajes difíciles. El sello de T-Clas aparece en cada hoja.

## Editar el cuaderno

El contenido está troceado para poder retocarlo fácil:

- `_head.html` — estilos, logo (sello) y configuración técnica.
- `_front.html` — portada, prólogo, símbolos e índice del repertorio.
- `partials/diaNN.html` — cada sesión por separado.
- `_tail.html` — contraportada.

Tras editar cualquier parte, regenera el documento final con:

```bash
bash build.sh
```

Esto vuelve a crear `index.html` juntando todas las piezas.
