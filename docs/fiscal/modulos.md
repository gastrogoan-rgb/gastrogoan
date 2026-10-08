# Auditoría fiscal: estimación objetiva (módulos) en hostelería, 2026

Fecha: 8/10/2026. Alcance: IRPF por módulos (modelo 131) e IVA régimen simplificado (303/390) para los epígrafes IAE 671, 672, 673, 675 y 676.
Solo lectura de código; no se ha tocado `js/`. Código auditado: `js/hr.js` (`MODULOS_EPIGRAFES` 525-541, `calcularModulos` 557-646, `pagoACuentaTrimestre` 448-475, `ivaLiquidarMes` 315-323, `renderModulos` 2300-2385) y `js/finance.js` (`irpfActividad` 699-706, escala 674-682).

## Fuentes

- **Orden HAC/1425/2025, de 9/12/2025** (BOE-A-2025-25272, BOE 11/12/2025, en vigor 12/12/2025). Leída entera desde el BOE. Se citan sus artículos, anexos y tablas.
- Manual práctico IVA 2025 de la AEAT, «Actividades de temporada», con ejemplo resuelto (epígrafe 676). Sirve para fijar cómo se prorratean las unidades en una actividad de temporada.
- Límites de exclusión 2026: los RDL 16/2025 y 2/2026 que los prorrogaban NO fueron convalidados. La AEAT publicó una nota (abril 2026) que mantiene los límites de 2016-2024 (DT 32.ª LIRPF y equivalente en IVA): 250.000 € de ingresos, 125.000 € facturados a empresarios, 250.000 € de compras. Sin ley que los respalde, la seguridad jurídica es menor. Fuente secundaria (prensa especializada); no se pudo abrir la nota de la AEAT.
- No verificado en esta sesión: la cuantía vigente de la reducción del art. 32.2.3º LIRPF (ver hallazgo E-10) y la numeración de casillas del 131/303.

## Cifras 2026 (verificadas contra el BOE)

La Orden mantiene las cuantías de 2025 (preámbulo). Hostelería está en el **Anexo II** de la Orden.

| Epígrafe | Asalariado | No asal. | kW | Mesa | Barra (m) | Máq. A | Máq. B | Exceso | Cuota mín. IVA | Ingreso a cuenta 1T-3T |
|---|---|---|---|---|---|---|---|---|---|---|
| 671.4 (2 tenedores) | 3.709,88 | 17.434,55 | 201,55 | 585,77 | - | 1.077,06 | 3.810,65 | 51.617,08 | 13 % | 4 % |
| 671.5 (1 tenedor) | 3.602,80 | 16.174,82 | 125,97 | 220,45 | - | 1.077,06 | 3.810,65 | 38.081,38 | 20 % | 6 % |
| 672.1,2,3 (cafeterías) | 1.448,68 | 13.743,56 | 478,69 | 377,92 | - | 957,39 | 3.747,67 | 39.070,26 | 13 % | 4 % |
| 673.1 (bar cat. especial) | 4.056,30 | 15.538,66 | 321,23 | 233,04 | 371,62 | 957,39 | 2.903,66 | 30.586,03 | 6 % | 2 % |
| 673.2 (otros bares) | 1.643,93 | 11.413,08 | 94,48 | 119,67 | 163,76 | 806,23 | 2.947,75 | 19.084,78 | 6 % | 2 % |
| 675 (quioscos) | 2.802,88 | 14.461,60 | 107,07 | 26,45 por m² | - | - | - | 16.596,83 | 3 % | 1 % |
| 676 (chocolat./heladerías) | 2.418,67 | 20.016,97 | 541,68 | 220,45 | - | 806,23 | - | 25.528,25 | 20 % | 6 % |

Cuota devengada IVA por unidad (€/año):

| Epígrafe | Empleado | kW | Mesa | Barra | Máq. A | Máq. B | Comisión loterías |
|---|---|---|---|---|---|---|---|
| 671.4 | 2.993,81 | 150,57 | 168,29 | - | 239,15 | 841,46 | 0,21 por € |
| 671.5 | 2.400,36 | 70,86 | 124,00 | - | 239,15 | 841,46 | 0,21 por € |
| 672 | 2.356,07 | 124,00 | 70,86 | - | 221,43 | 832,60 | 0,21 por € |
| 673.1 | 3.294,97 | 69,09 | 60,23 | 77,95 | 221,43 | 655,45 | 0,21 por € |
| 673.2 | 2.577,52 | 47,83 | 56,69 | 62,89 | 177,15 | 655,45 | 0,21 por € |
| 675 | 4.357,86 | 50,48 | 4,06 por m² | - | - | - | 0,21 por € |
| 676 | 3.817,55 | 141,72 | 46,05 | - | 177,15 | - | 0,21 por € |

El epígrafe **677.1 no está en la Orden de 2026**: queda FUERA DE ALCANCE (no tributa por módulos).

## Procedimiento oficial (resumen con cita)

IRPF (Anexo II, instrucciones):
1. **Fase 1, previo**: suma de unidades × módulo (2 decimales). Titular = 1 persona no asalariada (0,25 si acredita dedicación inferior a 1.800 h por causa objetiva). Cónyuge/hijos menores no asalariados al 50 %. Discapacidad ≥ 33 % al 75 %. Asalariado: horas / horas de convenio (por defecto 1.800); menores de 19 y contratos de formación al 60 %; discapacitado al 40 %. Mesa = 4 plazas, y se ajusta en proporción. Máquinas A/B solo si NO son del titular. Barra medida por el lado del público.
2. **Fase 2, minorado**: previo menos incentivo al empleo menos amortización. Empleo: coeficientes por tramos (hasta 1: 0,10; 1,01-3: 0,15; 3,01-5: 0,20; 5,01-8: 0,25; más de 8: 0,30), más 0,40 sobre el incremento respecto al año anterior (el incremento no entra en la escala). El conjunto se multiplica una vez por el rendimiento por unidad de «personal asalariado». Amortización: tabla (edificios 5 %, útiles/informática 40 %, transporte y resto 25 %, intangible 15 %) y libertad de amortización de bienes ≤ 601,01 € hasta 3.005,06 €/año.
3. **Fase 3, índices**, en este orden: b.1 pequeña dimensión (persona física, un solo local, sin vehículo de más de 1.000 kg, **sin asalariados**: 0,70 hasta 2.000 hab., 0,75 hasta 5.000, 0,80 más; **con hasta 2 asalariados: 0,90** sea cual sea el municipio); b.2 temporada (1,50 hasta 60 días; 1,35 de 61 a 120; 1,25 de 121 a 180); b.3 exceso (1,30 sobre la parte que supera la cuantía del epígrafe); b.4 inicio de actividad (0,80 primer año, 0,90 segundo; 0,60/0,70 con discapacidad). Incompatibilidades: **b.1 con b.3**, **b.2 con b.4**.
4. **Disposición adicional 1.ª**: reducción del 5 % sobre el rendimiento neto de módulos (instrucción 2.3). Se tiene en cuenta en los pagos fraccionados. (El 10 % del RDL 22/2026 es solo Ceuta, y está en tramitación como proyecto de ley.)
5. **Pagos fraccionados**: 4 % del rendimiento (3 % si no más de un asalariado; 2 % si ninguno), con datos-base a 1 de enero. Temporada: rendimiento diario (anual / días de actividad del año anterior) × días del trimestre × %. Declaración obligatoria aunque salga cero. Plazos: 20 de abril, julio y octubre; el 4T hasta el 30 de enero.

IVA simplificado (Anexo II, instrucciones; Anexo III §4):
- Cuota devengada = suma de módulos. Personal empleado = asalariados + titular y demás no asalariados.
- Menos cuotas soportadas por bienes y servicios corrientes (no activos fijos), **solo deducibles en la declaración del último trimestre** del año, más el 1 % de la devengada como difícil justificación. **No se deducen las cuotas de hostelería, restauración y viajes** si hay local determinado.
- Cuota derivada = **mayor** entre ese resultado y la cuota mínima (% del epígrafe × devengada). En temporada ambas se multiplican por el índice 1,50/1,35/1,25.
- Después: se suman las operaciones del art. 123.Uno.B LIVA (adquisiciones intracomunitarias, inversión del sujeto pasivo, venta de activos fijos) y se restan las cuotas de **activos fijos**, en el trimestre en que se soportan o en los siguientes.
- Trimestres 1.º a 3.º: ingreso a cuenta = % del epígrafe × cuota devengada (en temporada: × días del trimestre × cuota diaria × índice). El 4.º liquida la cuota anual menos lo ingresado a cuenta.
- Exclusión (art. 3 de la Orden): 250.000 € de ingresos, 125.000 € facturados a empresarios, 250.000 € de compras (sin inmovilizado). Se computan cónyuge y ascendientes/descendientes con actividades similares y dirección común. Superarlos excluye a partir del año siguiente.
- Renuncia: hasta el 31/12 del año anterior, o tácita presentando el 1T en directa/general. Para el IRPF vincula tres años (art. 33 RIRPF; no verificado aquí).

## Resultado de la comparación con el código

Etiquetas: CORRECTO / ERROR / FALTA / FUERA DE ALCANCE. Impacto en euros por año, con los expedientes de más abajo.

### CORRECTO

| Punto | Código |
|---|---|
| Las cuantías IRPF e IVA de 671.4, 671.5, 672, 673.1, 673.2 coinciden con el BOE, también exceso y cuota mínima | `hr.js:525-541` |
| Minoración de empleo por tramos y 0,40 de incremento fuera de la escala | `hr.js:582-592` |
| Orden de las fases: empleo y amortización, índice temporada o inicio, exceso, luego 5 % | `hr.js:594-615` |
| Temporada e inicio incompatibles (rama `else if`); tramos 1,50/1,35/1,25 y 0,80/0,90 | `hr.js:601-608` |
| Exceso = 30 % sobre lo que supera la cuantía | `hr.js:609-612` |
| Pago fraccionado 4 / 3 / 2 % según asalariados | `hr.js:618` |
| Pago fraccionado ya con el 5 % aplicado (DA 1.ª.3) | `hr.js:615,619` |
| IVA: 1 % de difícil justificación, mayor de (devengada menos soportado) y cuota mínima | `hr.js:627-638` |
| IVA de activos fijos se resta después de la cuota mínima (Anexo III §4) | `hr.js:638` |
| Reducción del 5 % general | `hr.js:615` |
| Calendario 303: 20 de abril/julio/octubre y 30 de enero para el 4T | `hr.js:2778` |

### ERROR (ordenados por impacto)

**E-1. Temporada: las unidades no se prorratean y el IVA no sigue el método de temporada.** `hr.js:561-565,601-604,625,637-638`.
- El BOE (instrucción 7 de IRPF; 8 y 9 de IVA) manda calcular el promedio por horas (personal) o por días (kW, mesas, barra, máquinas) del periodo de actividad. El código toma kW, mesas y titular enteros y solo aplica el índice 1,25/1,35/1,50.
- Es la manera en que la AEAT resuelve su propio ejemplo: 10 kW × 92 / 365 = 2,52 kW.
- En el IVA no aplica el índice de temporada ni a la cuota ni a la mínima, y reparte entre 4 en lugar del ingreso a cuenta por días.
- Expediente B (cafetería de temporada, 122 días): rendimiento 41.322,97 € en la app frente a 12.149,83 €; IRPF anual +8.682 €; IVA anual +3.808 € (los pagos del 131 son a cuenta de ese IRPF: +3.063 €). **Unos 12.500 € de impuesto de más al año.**
- Qué falla en detalle: el titular no puede prorratearse (solo hay casilla); kW y mesas el usuario los tendría que prorratear a mano sin que nada se lo diga; el IVA ignora la temporada.

**E-2. Índice de inicio de actividad no se aplica nunca desde la pantalla.** `hr.js:605` compara `mc.anioInicio === MODULOS_ANIO` con igualdad estricta, y `saveModulosField` (`hr.js:2295-2298`) guarda el valor del `<input>` como **cadena** («2025»), así que no coincide con el número.
- Reproducido: con `anioInicio:'2025'` el índice sale `null`; con `2025` numérico sale 0,90.
- Expediente C: rendimiento 37.818,98 € frente a 34.037,08 € (+11,1 %); IRPF +1.318 €; 131 +605 €/año.
- Corrección: `parseInt(mc.anioInicio)`. El test existente no lo ve porque nunca informa `anioInicio`.

**E-3. 303 trimestral con un reparto que no existe en la norma.** `hr.js:315-323` (`ivaLiquidarMes` = anual / 12 por mes con actividad) y `hr.js:644` (`ivaTrimestral` = anual / 4).
- Realidad: en 1T-3T se ingresa el % del epígrafe sobre la devengada (2 % en 673.2, 4 % en 671.4 y 672, 6 % en 671.5 y 676); el 4T lleva el grueso.
- El IVA soportado, que solo se deduce en el 4T, se reparte a lo largo del año. El IVA de activos fijos se deduce en su trimestre.
- Expediente C: la app enseña 933,24 € en 1T, 2T y 3T; la realidad es 764,56 €, 764,56 € y −495,44 € (a compensar por la inversión de 6.000 €). El 4T real es 2.699 € y la app deja 311 € en el calendario en octubre (sólo cuentan los meses ya transcurridos). Error de caja de hasta 1.800 € en un trimestre; el total anual sí coincide.
- Además, mientras el año no ha terminado, `geMesConActividad` deja el 4T con 1 de 3 meses, y el 4T real (el que más pesa) casi no se ve.

**E-4. Pago fraccionado de temporada.** `hr.js:448-453`.
- La norma pide rendimiento diario × días del trimestre × %. El código da el mismo importe en los cuatro trimestres, incluso cuando la actividad no abre (1T y 4T deben salir 0 euros y se declaran igual).
- Expediente B: la app da 826,46 €/trim. (3.305,84 €/año) frente a 59,75 € en 2T y 183,24 € en 3T (242,99 €/año).

**E-5. Calculador de comparación con directa usa un total mezclado.** `hr.js:2370-2378`: `totalModulos = rendimiento × pctPago × 4 + ivaAnual` suma pagos fraccionados (no el IRPF real) con IVA. Los pagos del 131 no son el impuesto del año (el modelo 100 liquida). Impacto: la comparación orienta mal, error de la diferencia IRPF anual − pagos.

**E-6. Comentario y código contradicen la ley en la reducción de rentas bajas (32.2.3º LIRPF).** `finance.js:693-704`: se omite en módulos con el argumento de que «exige estimación directa». La reducción del 32.2.3º se aplica también a contribuyentes en estimación objetiva (manual de Renta de la AEAT); la exigencia de directa es de la reducción de 2.000 € del 32.2.1º. Además la fórmula 1.620 € (8.000-12.000) es la anterior a 2023 y no se ha verificado su vigencia. Impacto acotado a rendimientos bajos (≤ ~14.000 €) y con otras rentas ≤ 6.500 €: entre ~300 € y ~1.400 €/año. **Estado: dudoso; confirmar con el bloque de estimación directa.**

### FALTA (ordenadas por impacto)

**F-1. Máquinas recreativas tipo A y B** (módulos IRPF e IVA, y comisión de loterías). En `MODULOS_EPIGRAFES` no existen, y la interfaz no pregunta. Son las máquinas de terceros (las propias no cuentan), muy comunes en bares y restaurantes.
- Expediente A (bar con 2 máquinas B): las máquinas suman 5.895,50 € al previo (5.040 € al rendimiento tras b.1 y 5 %); IRPF −874 €; IVA −1.298 €; 131 −437 €/año a cuenta. **≈ 2.170 € de impuesto de menos al año** y un dueño que ve un resultado demasiado bueno.

**F-2. Índice corrector de pequeña dimensión (b.1).** Titular persona física, un local, sin vehículo pesado: 0,70/0,75/0,80 sin asalariados según habitantes; 0,90 con hasta 2 asalariados. Es la regla que más autónomos de bar aplican. Además b.1 **excluye** el índice de exceso; en cuanto se añada b.1 hay que desactivar el exceso o se calculará un tributo falso.
- Expediente A: +10 % de rendimiento (≈ +1.400 € de rendimiento y +336 € de IRPF si no hubiera máquinas). Expediente B: -30 % adicional (incluido en E-1).

**F-3. Límites de exclusión (250.000 / 125.000 / 250.000).** No hay comprobación alguna (búsqueda de `250000` sin resultados en `js/`). La app tiene ventas y compras reales: debería avisar al 80 % del límite y al superarlo («a partir del año siguiente pasas a directa y a IVA general»). Impacto: cambio de régimen, miles de euros y un expediente de la AEAT si se ignora. Computar también cónyuge y familia con actividad similar (la app no lo sabe: advertirlo).

**F-4. Otras percepciones empresariales.** Anexo III §3: en las actividades del Anexo II el rendimiento neto de módulos se incrementa con **subvenciones corrientes y de capital** (y otras percepciones). La app tiene `otrosIngresos` con tipo `subvencion` (`finance.js:580`) y no lo suma. Impacto: la subvención íntegra tributa; 5.000 € de subvención ≈ 1.200-1.500 € de IRPF.

**F-5. Epígrafes 675 y 676.** La Orden los incluye (cuantías en la tabla). 676 (heladerías, chocolaterías, horchaterías) es un negocio típico de temporada, justo el caso peor resuelto (E-1). 675 usa superficie en m² en lugar de mesas.

**F-6. Cómputo del personal.** `hr.js:551-554,562` cuenta empleados activos como enteros (con `personalOverride` manual). Faltan: promedio ponderado por horas del año; titular a 0,25 con dedicación reducida; cónyuge/hijos al 50 %; discapacidad al 75 %/40 %; menores de 19 al 60 %; no contar alumnos en prácticas. Impacto: por cada media jornada mal contada, ~1.800 € de previo (1.643 € en 673.2; 3.710 € en 671.4) y 1.300-3.300 € de cuota IVA.

**F-7. Minoración del 131 por rendimientos bajos (art. 110.3.c RIRPF).** Si el rendimiento neto del año anterior ≤ 12.000 €: 100/75/50/25 € por trimestre (hasta 9.000/10.000/11.000/12.000). La app lo hace en el 130 (`hr.js:455-468`) pero no en el 131. Hasta 400 €/año.

**F-8. Cuotas soportadas no deducibles en el simplificado** (hostelería, restauración y desplazamientos con local determinado) y partidas del art. 123.Uno.B: adquisiciones intracomunitarias, inversión del sujeto pasivo (la app ya marca `isp` en plataformas) y venta de activos fijos (`hr.js:632-638` suma todo el IVA soportado). Se deduce de más; impacto = IVA de esas facturas (cientos de euros).

**F-9. Mesas = 4 plazas.** La interfaz pide «Número de mesas» sin aclarar la unidad (`hr.js:2319`). Un restaurante de 40 plazas son 10 mesas, no 20 de dos. En 671.4, 10 mesas de más son +5.858 € de previo y ~+1.700 € de IRPF. Falta una nota y, mejor, un campo de plazas.

**F-10. Amortización escrita a mano** (`hr.js:2339`) en lugar de salir de las inversiones con la tabla del Anexo II (5/40/25/15 %, libertad ≤ 601,01 €). El 131 usa el coeficiente máximo de los bienes a 1 de enero. Impacto: el que se equivoque el usuario; aviso suficiente.

**F-11. Gastos extraordinarios y reducción de módulos** por incendios, inundaciones, grandes averías o incapacidad temporal (Anexo III §1-2; plazo de 30 días). Impacto: depende del siniestro, y la solicitud tiene plazo. Al menos un aviso.

**F-12. Inicio de actividad a mitad de año y cese.** Pago fraccionado por trimestres completos y días del trimestre incompleto; 2 % de ventas si no hay datos-base. Los índices de inicio con discapacidad (0,60/0,70).

**F-13. Pestaña Módulos no genera nada para el gestor** (modelos 131/303/390 por trimestre, bases de módulos). Hay un resumen, pero sin los módulos aplicados trimestre a trimestre.

### FUERA DE ALCANCE

- 677.1 (no existe en la Orden 2026) y el resto de epígrafes no hosteleros.
- Reducción del 10 % de Ceuta (RDL 22/2026, en tramitación) y La Palma (RDL 23/2026).
- Renuncia y revocación: el plazo ya pasó (31/12/2025); la app no puede resolverlo, pero conviene un aviso («renunciar vincula tres años»).
- Presentación de los modelos (lo hace el gestor).
- Retenciones soportadas en el 131 (casilla de retenciones): poco frecuentes en hostelería.

## Los tres expedientes

Cálculos a mano con Python (`docs/fiscal/expedientes-modulos.json` los recoge en formato convertible a prueba). Contexto común: persona física autónoma, ejercicio 2026, 5 % de reducción general, sin otros ingresos.

### Expediente A. Bar 673.2: titular, 1 asalariado, 2 máquinas B

Datos: titular trabaja (1 no asalariado), 1 asalariado a jornada completa (año anterior: 1), 10 kW, 8 mesas, 7 m de barra, 2 máquinas tipo B de terceros, amortización 1.200 €, un solo local, municipio de más de 5.000 habitantes. Compras con IVA soportado: 24.000 € al 10 %, 8.000 € al 21 %, 6.000 € al 21 %. Compra de una máquina de 1.500 € + 21 % en mayo.

IRPF:
- Previo = 1.643,93 + 11.413,08 + 10 × 94,48 + 8 × 119,67 + 7 × 163,76 + 2 × 2.947,75 = **22.000,99**
- Empleo: 1 persona en el primer tramo = 0,10 × 1.643,93 = 164,39 (sin incremento).
- Minorado = 22.000,99 − 164,39 − 1.200 = **20.636,60**
- b.1: titular persona física, un local, con asalariados ≤ 2 → 0,90 → 18.572,94. (El exceso, 19.084,78, queda excluido por b.1.)
- Rendimiento neto = 18.572,94 × 0,95 = **17.644,29**
- 131: 3 % (un asalariado) = **529,33 por trimestre**, 2.117,32 al año. IRPF anual por la escala: **2.557,63** (la reducción 32.2.3º no aplica: rendimiento > 12.000).

IVA:
- Devengada = 2 × 2.577,52 + 10 × 47,83 + 8 × 56,69 + 7 × 62,89 + 2 × 655,45 = **7.837,99**
- Soportado corriente = 2.400 + 1.680 + 1.260 = 5.340; difícil justificación 1 % = 78,38.
- Diferencia = 2.419,61; cuota mínima 6 % = 470,28; cuota derivada = **2.419,61**; activos fijos −315,00.
- **IVA anual = 2.104,61.**
- 303: 1T 156,76 (2 % de la devengada); 2T 156,76 − 315,00 = −158,24 (a compensar); 3T 156,76; 4T 2.419,61 − 3 × 156,76 = **1.949,33**. 390 = 2.104,61.

Qué muestra la app hoy (sin máquinas ni b.1, con IVA de activos fijos en su sitio):

| Concepto | Esperado | App | Diferencia |
|---|---|---|---|
| Rendimiento neto | 17.644,29 | 14.004,04 | −20,6 % |
| 131 por trimestre | 529,33 | 420,12 | −20,6 % |
| IRPF anual | 2.557,63 | 1.683,97 | −34 % |
| IVA anual | 2.104,61 | 806,82 | −61,7 % |
| 303 1T-3T | 156,76 / −158,24 / 156,76 | 201,70 cada uno | fuera de ±5 % |
| 303 4T | 1.949,33 | 67,23 (1 mes) | fuera de ±5 % |

Aislando causas: sin las máquinas la app debería dar 12.603,64 € (con b.1), y da 14.004,04 € (+11,1 %, falta b.1). Con las máquinas y sin b.1 daría 19.604,77 €.

### Expediente B. Cafetería 672 en municipio pequeño, con temporada

Datos: titular único, sin asalariados, local propio en un municipio de 1.800 habitantes, abre del 1/6 al 30/9 (**122 días**; 30 en el 2T y 92 en el 3T), 9 horas diarias el titular, 25 kW, 24 mesas, amortización 800 €, sin vehículo. Compras: 9.000 € al 10 %, 3.000 € y 2.000 € al 21 %. Sin inversiones.

Unidades de promedio (BOE, instrucciones 7 y 9): titular = 122 × 9 / 1.800 = **0,61**; kW = 25 × 122 / 365 = **8,36**; mesas = 24 × 122 / 365 = **8,02**.

IRPF:
- Previo = 0,61 × 13.743,56 + 8,36 × 478,69 + 8,02 × 377,92 = **15.416,34**; minorado = 14.616,34.
- b.1 (sin asalariados, ≤ 2.000 hab.): 0,70 → 10.231,44. b.2 temporada: 122 días caen en el tramo de 121 a 180, índice **1,25** → 12.789,30. Exceso no aplica (b.1).
- Rendimiento neto = **12.149,83**. Rendimiento diario = 12.149,83 / 122 = 99,59.
- 131 (2 %, sin asalariados): 1T 0; 2T = 30 × 99,59 × 2 % = **59,75**; 3T = 92 × 99,59 × 2 % = **183,24**; 4T 0. Total 242,99. IRPF anual **1.253,97**.

IVA:
- Devengada = 0,61 × 2.356,07 + 8,36 × 124,00 + 8,02 × 70,86 = **3.042,14**.
- Soportado 1.950 (900 + 630 + 420); 1 % = 30,42; diferencia = 1.061,72 × 1,25 = 1.327,15; mínima 13 % = 395,48 × 1,25 = 494,35.
- **IVA anual = 1.327,15** (mayor de las dos).
- Ingreso a cuenta (4 %, cuota diaria 3.042,14 / 122 = 24,94, índice 1,25): 1T 0; 2T 30 × 24,94 × 4 % × 1,25 = **37,40**; 3T 92 × … = **114,70**; 4T = 1.327,15 − 152,10 = **1.175,05**. Las cuatro declaraciones se presentan aunque sean cero.

La app hoy (con kW 25, mesas 24, temporada 122 y sin posibilidad de prorratear el titular): rendimiento 41.322,97 (exceso incluido), 131 826,46 por trimestre, IVA anual 5.135,14, IRPF 9.936,50. Si el dueño prorratea a mano kW y mesas (8,36 y 8,02): 23.721,89 de rendimiento (el titular sigue entero y falta b.1).

| Concepto | Esperado | App | Diferencia |
|---|---|---|---|
| Rendimiento neto | 12.149,83 | 41.322,97 | +240 % |
| 131 anual | 242,99 | 3.305,84 | +1.260 % |
| IRPF anual | 1.253,97 | 9.936,50 | +692 % |
| IVA anual | 1.327,15 | 5.135,14 | +287 % |

### Expediente C. Restaurante 671.4 de 2 tenedores, 3 empleados

Datos: titular trabaja; 3 asalariados que suman **2,5 unidades** (dos a jornada completa y una a media; año anterior: 2,0); 35 kW; 20 mesas de cuatro plazas; segunda campaña (alta en 2025, sin discapacidad); amortización 4.000 €; compras: 70.000 € al 10 %, 15.000 € y 18.000 € al 21 %; inversión de 6.000 € + 21 % en agosto.

IRPF:
- Previo = 2,5 × 3.709,88 + 17.434,55 + 35 × 201,55 + 20 × 585,77 = **45.478,90**.
- Empleo: tramos de 2,0 unidades (0,10 + 1 × 0,15 = 0,25) + incremento 0,5 × 0,40 = 0,20 → **0,45 × 3.709,88 = 1.669,45**.
- Minorado = 45.478,90 − 1.669,45 − 4.000 = **39.809,45** (< 51.617,08: sin exceso).
- b.4 segundo año: 0,90 → 35.828,51. Rendimiento neto = **34.037,08**.
- 131: 4 % = **1.361,48 por trimestre**, 5.445,92 al año. IRPF anual **7.322,12**.

IVA:
- Devengada = 3,5 × 2.993,81 + 35 × 150,57 + 20 × 168,29 = **19.114,09**.
- Soportado = 7.000 + 3.150 + 3.780 = 13.930; 1 % = 191,14; diferencia = 4.992,94; mínima 13 % = 2.484,83. **Cuota derivada 4.992,94**; activos fijos −1.260,00. **IVA anual = 3.732,94.**
- 303: 1T 764,56 (4 %); 2T 764,56; 3T 764,56 − 1.260,00 = **−495,44** (a compensar); 4T 4.992,94 − 3 × 764,56 = **2.699,26** (2.203,82 si se compensa el 3T).

La app hoy (cifras reales de la pantalla, con el año de inicio escrito como lo haría un usuario):

| Concepto | Esperado | App | Diferencia |
|---|---|---|---|
| Rendimiento neto | 34.037,08 | 37.818,98 | +11,1 % |
| 131 por trimestre | 1.361,48 | 1.512,76 | +11,1 % |
| IRPF anual | 7.322,12 | 8.640,02 | +18 % |
| IVA anual | 3.732,94 | 3.732,94 | 0 % |
| 303 1T / 2T / 3T | 764,56 / 764,56 / −495,44 | 933,24 cada uno | fuera de ±5 % |
| 303 4T | 2.699,26 | 311,08 (sólo cuenta un mes en octubre) | fuera de ±5 % |

Con el año de inicio como número (`2025`), la app reproduce exactamente 34.037,08 y 1.361,48. El resto del motor (empleo por tramos, exceso, IVA) es correcto.

## Dónde está hoy fuera del ±5 %

| Expediente | Magnitud | Causa |
|---|---|---|
| A | rendimiento, 131, IRPF, IVA | F-1 (máquinas), F-2 (b.1) |
| A | 303 trimestral | E-3 |
| B | todo | E-1, E-4, F-2 |
| C | rendimiento, 131, IRPF | E-2 |
| C | 303 trimestral | E-3 |
| A, B, C | IVA anual en C | dentro de ±5 % (el cálculo anual del IVA es correcto cuando las unidades son las correctas) |

Con los datos bien introducidos y sin máquinas, temporada ni pequeña dimensión, el motor anual reproduce a mano el BOE (restaurante: IVA al céntimo; IRPF al céntimo si se resuelve E-2).

## Recomendación de arreglo, por orden

1. E-2: una línea (`parseInt`), con su prueba. Cuesta minutos y devuelve un ~11 % a cualquier negocio en su primer o segundo año.
2. E-1 + E-4 + el IVA de temporada: nuevo campo «días de temporada» que prorratee kW, mesas, barra y máquinas, que pida las horas del titular y de cada empleado, y calcule el 131 y el 303 por días.
3. F-1 y F-2 (máquinas A/B y pequeña dimensión, desactivando el exceso cuando b.1 aplique).
4. E-3: calendario del 303 con ingreso a cuenta por epígrafe y 4T con el grueso; IVA de activos fijos en su trimestre.
5. F-3: avisos de límites (70 %/80 %/100 % de 250.000 y 125.000 €).
6. F-4 (subvenciones), F-5 (675/676), F-6 (cómputo del personal), F-7 (minoración 131), F-9 (nota de mesas).
7. Las pruebas: `test/modulos.mjs` no cubre temporada, inicio ni pequeña dimensión; los tres expedientes de este informe se pueden convertir en `test/modulos-expedientes.mjs` a partir del JSON.
