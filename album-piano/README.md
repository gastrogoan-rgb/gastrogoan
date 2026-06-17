# 🎹 44 días al piano — Álbum de ejercicios

Cuaderno de ejercicios de piano para los alumnos, basado en sus partituras.
Pensado para **pasarlo bien tocando**, con micro-teoría, trucos y juegos.

## Cómo verlo e imprimirlo

1. Abre **`index.html`** en cualquier navegador (Chrome, Edge, Safari...). Es un único
   archivo, no necesita internet ni programas.
2. Para imprimir o crear un PDF: `Ctrl+P` (o `Cmd+P` en Mac) → tamaño **A4** →
   **márgenes "Ninguno"** y activa **"Gráficos de fondo"** para que salgan los colores.
   Cada día sale en su propia hoja.

## Qué contiene

- Portada + guía "Cómo usar" + leyenda de símbolos + mini-diccionario de música.
- Calendario visual de los 44 días.
- **44 días** de ejercicios organizados en 3 etapas:
  - **Iniciación** (días 1–9): piezas fáciles para coger soltura.
  - **Despegue** (días 10–29): dificultad media, 2 días por pieza.
  - **Reto final** (días 30–44): las piezas más largas/difíciles, 3 días por pieza.
- Cada día: dato curioso · dificultad (estrellas) · calentamiento · micro-teoría ·
  ejercicios por partes (manos separadas → juntas) · truco de la profe · reto divertido ·
  autoevaluación. Con diagramas de teclado, números de dedos y tiras de ritmo.

## Editar el álbum

El contenido está troceado para poder retocarlo fácil:

- `_head.html` — estilos y portada técnica.
- `_front.html` — portada, guía, leyenda, glosario y calendario.
- `partials/diaNN.html` — cada día por separado.
- `_tail.html` — contraportada.

Tras editar cualquier parte, regenera el documento final con:

```bash
bash build.sh
```

Esto vuelve a crear `index.html` juntando todas las piezas.
