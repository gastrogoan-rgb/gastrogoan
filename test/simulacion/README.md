# Simulación del módulo de I+D

Aquí es donde el I+D se ejecuta **de punta a punta con contenido real**: un
bistró catalán de mercado con 28 ingredientes y sus precios, su ADN completo,
y los cuatro flujos seguidos — elaboración base, plato, carta y menú.

No hace falta ninguna clave de IA. `respuestas.json` contiene lo que
contestaría el asistente, escrito a mano como lo escribiría un jefe de cocina.
El resto del circuito (casar ingredientes, convertir unidades, encadenar
elaboraciones, escandallar, montar la carta) corre de verdad.

```bash
python3 -m http.server 8950 &
node test/simulacion/correr.mjs
```

Deja en `salida/` lo que la app le pidió al asistente en cada paso y el estado
final: recetas con su coste y su food cost, elaboraciones en stock, la carta
montada y los avisos de cada prueba.

## Para qué sirve

Las pruebas de `test/idr.mjs` comprueban piezas. Esto comprueba el resultado:
si los platos salen coherentes entre sí, si los costes cuadran, si los avisos
que da la app son ciertos. **De aquí salieron tres fallos que ninguna prueba
unitaria veía:**

- avisos de equipamiento falsos ("usa plancha y tu equipamiento no lo permite"
  en una cocina con plancha, solo porque no estaba escrita en el ADN);
- food cost ridículamente bajo sin avisar (cuatro platos seguidos por debajo
  del 10% con un objetivo del 30%);
- el menú no se costeaba entero, solo plato a plato, que es justo el número
  que no decide nada en un menú cerrado.

Al tocar el módulo, vuelve a correrla y compara `salida/estado.json`.
