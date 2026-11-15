# Plantilla de revisión visual de móvil (14/11/2026)

Se aplica **igual a cada pantalla**, de la primera a la última. Es una revisión de DISEÑO hecha MIRANDO la imagen, no de reglas medibles (esas ya las vigilan las pruebas).
Contexto del dueño: *«la experiencia en móvil es nefasta, hay mil cosas que se ven colapsadas, feas, y baja la calidad de la app»*.

## Qué se mira en cada fotograma (las 10 preguntas)
1. **Primer vistazo**: ¿se entiende en 3 segundos qué es la pantalla y qué se puede hacer? ¿Qué es lo MÁS importante y se ve primero?
2. **Jerarquía**: ¿hay un título/cifra/acción principal claramente por encima del resto, o todo pesa igual?
3. **Altura útil**: ¿cuánto alto se gasta ANTES del contenido real (cabecera, volver, título, subtítulo, franjas de botones)? ¿Se ve contenido útil sin hacer scroll?
4. **Aire y densidad**: ¿está apelotonado (poco aire, cosas pegadas) o disperso (huecos muertos, filas con un solo botón, cajas enormes con poco dentro)?
5. **Alineación y orden**: ¿bordes alineados, filas de la misma altura, iconos del mismo tamaño? ¿Algo que parezca «fuera de sitio»?
6. **Texto**: ¿se lee bien? ¿Algún texto cortado, con «…», en columna estrecha de pocas letras, partido a mitad de palabra, demasiado pequeño o demasiado largo?
7. **Botones y toques**: ¿se distinguen las acciones principales de las secundarias? ¿Iconos sin rótulo que no se entienden? ¿Botones demasiado juntos?
8. **Coherencia**: ¿se parece a las otras pantallas (mismos botones, chips, tarjetas, colores)? ¿Algo con estilo de otra época?
9. **Estados**: ¿vacío, muchos datos, nombres largos, importes grandes, errores? (el negocio de prueba está lleno: fijarse en lo que se desborda).
10. **Una mano**: ¿lo importante queda al alcance del pulgar (abajo) o hay que estirarse arriba?

## Cómo se puntúa cada pantalla
**1 = roto/inutilizable · 2 = feo o confuso, hay que rehacerlo · 3 = aceptable con defectos claros · 4 = bien con detalles · 5 = muy bien.**
Se puntúa SIEMPRE con la misma vara. No suavizar al final ni endurecer al principio.

## Qué hay que entregar (misma estructura para todos)
Por cada pantalla/estado revisado:
```
### <nombre> (<ancho>) — nota N/5
Fotogramas vistos: <n> (de <total>)
Defectos (ordenados de más a menos grave), cada uno con:
 - [GRAVE|MEDIO|LEVE] qué se ve mal (en qué fotograma) → por qué molesta → qué cambiaría (concreto) → selector/función donde está si lo sabes
Lo que está bien (1-2 líneas, para no romperlo al arreglar)
```
Al final del informe: un RESUMEN con (a) causas COMUNES a varias pantallas (lo que arreglado una vez mejora muchas), (b) lista de las 8 peores pantallas, (c) nº de pantallas revisadas y de fotogramas vistos.

## Reglas de la casa que NO se tocan al proponer cambios
- Lo marcado/elegido va en verde oliva, nunca en negro. Los cuatro fondos de la app y `--muted` se mantienen (contraste ≥ 4,5:1).
- Objetivos táctiles ≥ 44 px (los botones compactos de Comandas Cocina están aceptados). Nada de letra < 11 px. Campos ≥ 16 px en móvil.
- Una palabra nunca se parte. Las reglas de móvil van todas juntas al final de `css/styles.css`.
- Editar y eliminar van en un menú «⋯». Lo denso se pliega en móvil (`plegable`/`pl-extra`).
- Textos en es/ca/en. No inventar funciones: se propone solo maquetación y orden.
