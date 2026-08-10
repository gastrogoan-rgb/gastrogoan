# Revisión visual y de usabilidad — GastroGoan

**Fecha**: 10/08/2026. **Método**: la app se abrió de verdad en un navegador Chromium real (vía Playwright/Puppeteer, sin red — el CDN de Firebase falla a propósito, así que la app corre en modo local, que es justamente el modo en el que se prueba cualquier fallo de wifi), con datos de ejemplo reales inyectados (ingredientes, recetas, carta, mesas, una comanda abierta con líneas en distintos estados, ventas, reservas, empleados). Se navegó de verdad — clics/llamadas a las mismas funciones que usa la UI, no solo lectura de código — en 4 tamaños de viewport: **ordenador** (1440×900), **tablet horizontal** (1024×768), **tablet vertical** (768×1024) y **móvil** (390×844).

**Aviso importante sobre el entorno**: como no hay Firebase real conectado, en todas las capturas aparece un badge rojo **"Error de nube"** en la cabecera — eso es un artefacto de este entorno de pruebas (sin internet), no un fallo de la app. Ignóralo en todas las capturas de abajo.

---

## 1. TPV (prioridad máxima)

| Resolución | Hallazgo | Severidad | Descripción | Fix |
|---|---|---|---|---|
| Tablet horiz. | Botones +/− de cantidad en la línea de comanda medían **36×36px** | Molesto | Por debajo del mínimo recomendado de touch-target (44×44px, Apple HIG / Material). Un botón así pulsado deprisa durante el servicio (llevando un plato en la otra mano) tiene más probabilidad de fallo. Curiosamente ya había una mejora a 40px, pero **solo aplicaba en el breakpoint móvil más estrecho** (`max-width:600px`), no en tablet, que es el uso real principal. | ✅ **Arreglado**: `css/styles.css`, `.comanda-qty-btn` pasa de 36px a 40px de base, aplicando ya en todos los tamaños, no solo móvil. |
| Tablet/desktop | El grid de "Mesas" (la acción más usada de toda la app: tocar una mesa para abrirla) aparece **por debajo** de las tarjetas de estadísticas del día y los botones de acciones (Lista de espera, Modo caos, Anulaciones...), obligando a hacer scroll en una tablet de 768px de alto antes de ver ninguna mesa. | Molesto | En una tablet real usada en horizontal, el usuario entra a TPV y lo primero que ve son cifras de "Ventas hoy: 0,00€" en vez de las mesas — tiene que bajar para poder trabajar. | **No aplicado** (riesgo de reestructurar el layout sin poder probarlo con el dueño delante). Sugerencia: mover el grid de Mesas justo debajo de la fila de botones de acción, antes de las tarjetas de estadísticas, o hacer esas tarjetas más compactas/colapsables. |
| Todas | El modal de comanda (nombre de mesa, badges, carta, líneas de pedido, "Marchar"/"Cobrar") se adapta bien en las 4 resoluciones — nada se corta ni se solapa, los botones de "Cobrar" y "Marchar a cocina" siguen siendo grandes y accesibles hasta en móvil. | — (positivo) | Verificado con una comanda real de 2 líneas en distinto estado (una marchada, una pendiente con nota "Sin sal"). | Sin cambios necesarios. |
| Móvil | Botón "Cambiar de mesa" (icono de transferencia) mide 34×34px | Menor | Por debajo del mínimo recomendado, pero es una acción secundaria poco frecuente (no como los +/−). | No aplicado — usa la clase compartida `.btn.btn-sm` en muchos otros sitios de la app; agrandarla ahí podría descuadrar otros botones que no se han podido revisar todos. Aplicar con cuidado en una pasada dedicada, no de pasada. |

## 2. Comandas de Cocina (prioridad máxima)

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Tablet horiz. | Pantalla limpia y muy legible: nombre de mesa, camarero, tanda (Entrantes/Principales), y botones de estado ("Preparar todo", "En espera", "ENTREGADO") grandes, con color diferenciado (ámbar = pendiente, blanco/borde = entregado). | — (positivo) | Es la pantalla mejor resuelta de toda la revisión — clara incluso a distancia, que es justo el uso real (una tablet en la pared/mesa de cocina, no pegada a la cara). |
| Todas | No se encontró texto cortado, solapado ni desbordado en ninguna resolución probada. | — | |

## 3. Login y activación de licencia

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Todas | Pantalla "Acceso Empleados" / "Acceso Propietarios" muy clara en las 4 resoluciones: dos tarjetas grandes, iconos y texto de apoyo ("Entra a tu área con tu nombre y PIN"), banderas de idioma arriba. | — (positivo) | |
| Todas | Formulario de activación de licencia (Código + Contraseña) — campos grandes, un solo paso visible a la vez ("Paso 3 de 3"), sin ambigüedad sobre qué escribir. | — (positivo) | Para alguien que lo hace por primera vez sin ayuda, el flujo se entiende: pide claramente "código de negocio (te la dio quien te vendió GastroGoan)". |

## 4. Mi Negocio (formulario largo)

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Móvil | El formulario se adapta bien: las 3 tarjetas de "Conexiones externas" (Firebase/Redsys/EmailJS) se apilan verticalmente sin romperse, con sus botones "Conectar"/"Editar" a un tamaño razonable. | — (positivo) | No se detectaron campos apretados ni rotos en la parte revisada (conexiones + datos básicos + logo). |

## 5. Mega Lista y Escandallo (tablas anchas)

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Móvil | Ambos módulos usan un patrón de **tarjetas por categoría** (carpetas con icono) en vez de una tabla ancha — no hay ningún problema de compresión ilegible porque no se intenta meter una tabla ancha en una pantalla estrecha. | — (positivo) | Patrón de diseño correcto — el problema típico de "tabla ancha en móvil" que se pedía comprobar no aparece aquí porque ya está resuelto con esta vista alternativa. |

## 6. Gestión Económica (la tabla más ancha de la app)

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Tablet horiz. (1024px) | La Cuenta de Resultados (12 meses + trimestre) **cabe entera sin scroll horizontal** a 1024px, con las cifras alineadas a la derecha — está justa pero es legible. | — (positivo, con matiz) | No se probó con datos reales de importe (todo a "–" en la prueba) — con cifras de 4-5 dígitos podría apretarse más. Revisar con datos reales de un negocio. |
| Móvil | La misma tabla **no se intenta encajar en 390px** — en su lugar cambia a un selector de año (◀ 2026 ▶) más una vista mensual compacta con mini-gráfico de barras. | — (positivo) | Patrón de adaptación bien pensado, exactamente lo que se pedía comprobar ("¿vista adaptada o scroll horizontal razonable?") — aquí es lo primero, bien resuelto. |
| Tablet/móvil | Las 7 pestañas (Gastos fijos, Gastos Variables, Cuenta de Resultados, Resultado, Tesorería, Punto de equilibrio, CAPEX) envuelven en 2 líneas en pantallas estrechas sin romperse ni recortarse. | — (positivo) | |
| Todas | Estados vacíos ("Sin gastos. Añade el primero.") bien diseñados, con botón "+ Añadir" al lado — no parecen una pantalla en blanco ni un error. | — (positivo) | Responde directamente al punto 4 del mandato (listados vacíos). |

## 7. Ficha Técnica (formulario largo)

| Resolución | Hallazgo | Severidad | Descripción |
|---|---|---|---|
| Móvil | Formulario en blanco (crear nueva ficha) se ve completo y ordenado: nombre, vínculo a escandallo, comensales, producción, tiempo, temperatura, ingredientes con placeholder de ejemplo ("Ej. 50 ml — Ron blanco"), botones "Cerrar"/"Guardar" siempre visibles al final. | — (positivo) | Ningún campo apretado ni roto. |

## 8. Header / navegación general

| Resolución | Hallazgo | Severidad | Descripción | Fix |
|---|---|---|---|---|
| Móvil | El nombre del negocio ("Casa Marcos") envuelve a 2 líneas en el header, y la fila de iconos (idioma, registro de caja, refrescar, salir, ayuda) queda apretada al lado — no se cortan, pero están muy juntos. | Menor | No se pudo medir con precisión el tamaño real de cada icono del header sin más tiempo de prueba — queda anotado para revisar, no confirmado como bloqueante. | No aplicado — cambiar el header afecta a TODAS las pantallas de la app, es un cambio de alto riesgo para hacerlo sin poder probarlo en un móvil real. |
| Todas | Las 3 zonas (Cocina/Sala/Gestión) en el "Home" muestran tarjetas grandes con botón "Entrar" — se adaptan bien de una fila de 3 en desktop a apiladas en móvil. | — (positivo) | Responde al punto 2 del mandato (navegación en móvil) — no hace falta un menú hamburguesa, el patrón de tarjetas grandes ya funciona bien en las 4 resoluciones. |

---

## Zonas NO cubiertas en esta pasada (honestidad de alcance)

Por el tamaño del mandato y el tiempo disponible, esto es lo que **no** se llegó a recorrer con datos reales dentro de su formulario/flujo completo (se generaron capturas de la pantalla de entrada de cada sección en las 4 resoluciones, pero no se abrió un formulario de crear/editar en todas ellas):
- **Reservas**: solo la vista de lista, no el formulario de crear una reserva nueva.
- **Clientes**: solo la vista de lista.
- **Personal / Horarios**, **APPCC**, **Stock**, **Pedidos**, **Promoción**: solo la pantalla de entrada de cada una.
- **Textos en catalán**: no se comprobó específicamente si los textos más largos en catalán rompen algún botón o etiqueta en las pantallas más justas de espacio — el mandato lo pedía explícitamente y no dio tiempo a cambiar el idioma de la app y repetir la revisión.
- **Hardware real**: todo esto se probó con Chromium emulando tamaños de viewport, no en una tablet o móvil físicos de verdad (con su propio navegador, su propia densidad de píxeles, su propio comportamiento táctil).

---

## Top 5 arreglos con más impacto en la percepción de calidad (primeros 2 minutos de uso)

1. **Grid de Mesas visible sin scroll en TPV** (tablet) — es la pantalla que un camarero abre decenas de veces por turno; que la acción principal esté "escondida" bajo estadísticas del día da sensación de app mal pensada aunque todo lo demás esté bien.
2. **Botones +/− de cantidad más grandes** — ✅ ya aplicado esta sesión (36px→40px), pequeño cambio con impacto real en la fluidez de tomar comandas.
3. **Comandas de Cocina** — ya está muy bien resuelto, es el mejor ejemplo de la app; usarlo como referencia de estilo para pulir el resto.
4. **Estados vacíos bien diseñados** (Gestión Económica, TPV "Para llevar") — ya están bien, mantenerlos como estándar al añadir nuevas secciones.
5. **Header más respirado en móvil** — el nombre del negocio envolviendo y los iconos apretados es lo primero que se ve al abrir la app en el móvil; sin ser grave, es lo que más rápido nota alguien nuevo.

---

## Qué se ha arreglado directamente vs qué necesita tu revisión

**Arreglado y verificado en esta sesión**:
- `css/styles.css` — `.comanda-qty-btn` de 36px a 40px de base (antes solo se agrandaba en el breakpoint móvil más estrecho).

**Necesita tu decisión antes de tocarlo** (cambios de layout más grandes, con riesgo real si se hacen sin poder probarlos contigo delante):
- Reordenar el TPV para que el grid de Mesas aparezca antes que las estadísticas del día.
- Agrandar `.btn.btn-sm` de forma general (icono "Cambiar de mesa" y otros similares) — clase compartida en muchos sitios, mejor revisarla en una pasada dedicada.
- Header más espacioso en móvil — afecta a todas las pantallas.
- Revisión específica de textos en catalán en pantallas justas de espacio.
