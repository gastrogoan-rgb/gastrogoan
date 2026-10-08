# Autónomos y comunidades de bienes en hostelería: auditoría del motor fiscal (ejercicio 2026)

Alcance: personas físicas en estimación directa simplificada (EDS) y normal
(EDN), y entidades en atribución de rentas (comunidad de bienes, sociedad
civil sin objeto mercantil). Módulos y sociedades quedan fuera de este bloque.

Objetivo del dueño: que Gestión Económica dé lo mismo que un gestor con un
**±5 %** de margen. Este documento contiene:

1. el catálogo de variables que cambian el resultado y, para cada una, qué
   hace hoy el código (`fichero:línea`) y su veredicto;
2. la tabla de hallazgos ordenada por impacto en euros;
3. cuatro expedientes completos, calculados a mano, con lo que da el gestor
   y lo que da la app. Los datos de entrada y los resultados esperados están
   en `docs/fiscal/expedientes-autonomos-cb.json`, listos para convertirlos
   en prueba.

Veredictos: **CORRECTO**, **ERROR** (lo hace mal), **FALTA** (no lo hace y
cambia el resultado), **FUERA DE ALCANCE** (no se puede modelar con lo que la
app sabe; hay que avisar o pedir el dato) y **A VERIFICAR** (criterio
discutible o no confirmado contra la fuente).

> Nota sobre las fuentes: desde este entorno no se pudo abrir boe.es (el
> proxy lo bloquea). Las referencias a la LIRPF (Ley 35/2006), el RIRPF
> (RD 439/2007), la LIVA (Ley 37/1992) y la LIS (Ley 27/2014) se citan por
> artículo. Se comprobó contra la Sede de la AEAT el texto de las novedades
> de la Ley 31/2022 (PGE 2023), que es la última norma que tocó las
> reducciones del art. 32. Las cifras de 2026 que dependen de una orden del
> año (RETA, SMI) están marcadas.

---

## 1. Mapa: variables, código y veredicto

### 1.1 Rendimiento neto de la actividad (arts. 27-32 LIRPF, 28-32 RIRPF)

| # | Variable | Norma | Qué hace la app | Veredicto |
|---|---|---|---|---|
| 1 | Ingresos: ventas netas de IVA, otros ingresos, subvenciones | art. 28 LIRPF | `geResultadoAntesImpMes` (js/finance.js:664) y `resultadoAntesImpMes` (js/hr.js:346) | CORRECTO |
| 2 | **Autoconsumo** del titular (lo que come o se lleva de su negocio) | art. 28.3 LIRPF: «valor normal en el mercado». En IVA, a coste (art. 79.Tres LIVA) | Lo valora a **coste** en IRPF y en IVA (js/finance.js:613-619) | **ERROR** en IRPF (en IVA está bien) |
| 3 | Retribución del titular / retiradas de comuneros | arts. 27 y 30 LIRPF: no es gasto | `gfEsRetribucionTitular` y `geFijosDeduciblesForMonth` (js/finance.js:441-462) | CORRECTO |
| 4 | Cuota de autónomos (RETA) del titular y de los comuneros | art. 30.2.1ª LIRPF | Gasto fijo de la categoría PERSONAL que no es retribución (js/finance.js:441-445) | CORRECTO |
| 5 | Cuota RETA 2026 por ingresos reales: tramo, tarifa plana, regularización | RDL 13/2022; tabla de 2025 prorrogada para 2026 (RDL 3/2026 y Orden PJC/297/2026, a verificar) | No se calcula: el negocio escribe lo que paga. No avisa de que el tramo elegido no cuadra con el rendimiento | FALTA (aviso, no cambia el resultado del año) |
| 6 | Sueldos, SS empresa, pagas extra | art. 30 LIRPF | Bloque de nóminas (js/hr.js:946 `SS_2026`), devengo ×14/12 | CORRECTO (otro bloque) |
| 7 | Amortización EDS: **tabla simplificada** (Orden de 27-3-1998) | art. 30.1 RIRPF | `AMORT_TIPOS.ed` (js/finance.js:468-476) | CORRECTO |
| 8 | Amortización EDN: **tabla del IS** | art. 29 RIRPF → art. 12.1.a LIS | Usa la tabla EDS para toda persona física, también en EDN (js/finance.js:483) | **ERROR** (informática 26→25 %, software 26→33 %, útiles 30→25 %) |
| 9 | Elementos de hasta 300 €, tope 25.000 €/año | art. 12.3.e LIS (por remisión del art. 28 LIRPF) | js/finance.js:480-508. El comentario cita «art. 103 LIS»: la cita es incorrecta, la regla no | CORRECTO (corregir la cita) |
| 10 | Amortización acelerada ×2 de empresa de reducida dimensión | art. 103 LIS, por remisión | No existe | FALTA (opcional; el gestor la usa solo si conviene) |
| 11 | Obras en local alquilado: según los años de contrato | PGC NRV 3ª.h | js/finance.js:487-488 | CORRECTO |
| 12 | **Turismo de uso mixto** | art. 22.2 RIRPF: un turismo no afecto en exclusiva **no** es elemento afecto. Ni amortización ni gastos en IRPF. En IVA, 50 % (art. 95.Tres LIVA) | Amortiza el 100 % (más el 50 % de IVA no deducible) también en persona física (js/finance.js:491-498, 514-522) | **ERROR** en IRPF (el IVA está bien) |
| 13 | Intereses del préstamo como gasto, el principal no | art. 30 LIRPF | Cuadro francés (js/finance.js:532-566) | CORRECTO |
| 14 | Suministros de la vivienda (30 % × parte afecta) | art. 30.2.5ª.b LIRPF | — | FUERA DE ALCANCE (un bar tiene local; no aplica) |
| 15 | Manutención del titular fuera del municipio (26,67 €/día en España, 48,08 € en el extranjero, pago electrónico) | art. 30.2.5ª.c LIRPF + art. 9 RIRPF | — | FUERA DE ALCANCE (importe pequeño; puede entrar como gasto variable) |
| 16 | Seguro de enfermedad del titular, cónyuge e hijos menores de 25 (500 €/persona; 1.500 € con discapacidad) | art. 30.2.5ª.a LIRPF | — | FALTA (bajo: ≤ 2.000 € de gasto) |
| 17 | Variación de existencias | PGC | js/finance.js:635-659 | CORRECTO |
| 18 | **5 % de difícil justificación, máx. 2.000 €** (solo EDS) | art. 30.2.4ª RIRPF (el 7 % fue solo para 2023, DA 56ª LIRPF) | js/finance.js:701-702 | CORRECTO en el IRPF anual |
| 19 | 5 % en una CB: límite de 2.000 € **por comunero** | DGT V1195-16 (criterio individual). Recurso de casación 84/2025 admitido por el Supremo el 21-1-2026: puede cambiar | Lo aplica por comunero (js/finance.js:720-724) | CORRECTO (A VERIFICAR cuando resuelva el Supremo) |
| 20 | Reducción del art. 32.2.1º-2º (6.498 € / 14.047,50 / 19.747,50) | Exige cliente único, sin empleados, gastos ≤ 30 %… | No existe | FUERA DE ALCANCE (un bar con clientes y empleados no la cumple nunca) |
| 21 | Reducción por rentas bajas del art. 32.2.3º: 1.620 € si las rentas ≤ 8.000; 1.620 − 0,405 × (rentas − 8.000) hasta 12.000 | art. 32.2.3º LIRPF (sin cambios en 2023-2026) | js/finance.js:695-698. Supone que no hay otras rentas | CORRECTO en importes. FALTA comprobar otras rentas (> 6.500 € la anula) |
| 22 | **Reducción del 20 % por inicio de actividad** (primer año con rendimiento positivo y el siguiente; tope de 100.000 €) | art. 32.3 LIRPF | No existe | **FALTA** (afecta a TODO negocio nuevo, que es justo quien compra la app) |
| 23 | Pérdidas de años anteriores: 4 años | art. 48 LIRPF | `perdidasCompensables` (js/hr.js:391-404) | CORRECTO. Matiz: las resta antes del 5 % y de las reducciones; el gestor las resta en la base liquidable (diferencia pequeña) |
| 24 | Límite de la EDS: cifra de negocios del año anterior ≤ 600.000 € | art. 28.1 RIRPF | El dueño elige simplificada o normal (js/app.js:6954). No avisa si pasa de 600.000 € | FALTA (aviso; la diferencia es el 5 % y la tabla) |

### 1.2 Del rendimiento al IRPF del titular (arts. 56-81 LIRPF)

| # | Variable | Norma | Qué hace la app | Veredicto |
|---|---|---|---|---|
| 25 | Escala general 2026 | arts. 63 y 74 LIRPF | Escala combinada de referencia 19/24/30/37/45/47 (js/finance.js:674) | CORRECTO como estatal + supletoria |
| 26 | **Escala autonómica real** (Madrid, Cataluña, Andalucía, Valencia…) | art. 74 LIRPF + ley de cada CCAA | No se pide la comunidad | FALTA (selector de CCAA con su escala), o FUERA DE ALCANCE avisado. La diferencia en la cuota puede pasar del 5 % en las comunidades que más se separan; hay que medirla por comunidad antes de dar una cifra |
| 27 | Mínimo personal 5.550 € (+1.150 desde 65 años, +1.400 más desde 75) | arts. 57 y 63 LIRPF | 5.550 fijo, restado como cuota (js/finance.js:675, 705) | CORRECTO el método. FALTA la edad |
| 28 | **Mínimo por descendientes** (2.400 / 2.700 / 4.000 / 4.500; +2.800 si es menor de 3 años; se reparte entre los progenitores), ascendientes y discapacidad | arts. 58-60 LIRPF | No existe | **FALTA** |
| 29 | Tributación conjunta, reducción por monoparentalidad | art. 84 LIRPF | — | FUERA DE ALCANCE (avisar) |
| 30 | **Otras rentas del titular o del comunero** (sueldo en otra empresa, alquileres): suben el tipo marginal | arts. 45-50 LIRPF | Autónomo: nada. CB: `tipoIrpf` puesto a mano por comunero (js/finance.js:722-723) | **FALTA** en el autónomo; en la CB depende de que alguien rellene el tipo, y nada se lo pide |
| 31 | Deducciones autonómicas y estatales (maternidad, familia numerosa, vivienda…) | arts. 68-81 LIRPF | — | FUERA DE ALCANCE (avisar en el texto del impuesto) |
| 32 | Impuesto por año, no por mes; tipo efectivo × acumulado | — | js/hr.js:364-430 | CORRECTO |

### 1.3 Pagos fraccionados, retenciones e IVA

| # | Variable | Norma | Qué hace la app | Veredicto |
|---|---|---|---|---|
| 33 | Modelo 130: 20 % del rendimiento acumulado − lo pagado en los trimestres anteriores | art. 110.1.a RIRPF | js/hr.js:455-469 | CORRECTO |
| 34 | **5 % de difícil justificación en el 130** (EDS) | Instrucciones del modelo 130 (gastos fiscalmente deducibles incluyen las provisiones y los gastos de difícil justificación) | No lo resta: el 130 sale un 1 % del rendimiento más alto, o sea ≈ +5 % del 130 | **ERROR** (A VERIFICAR el criterio de cada gestor: la mayoría lo resta) |
| 35 | Deducción art. 110.3.c RIRPF: 100/75/50/25 € por trimestre según el rendimiento del año anterior (≤ 9.000 / 10.000 / 11.000 / 12.000) | art. 110.3.c RIRPF | js/hr.js:460-468 | CORRECTO en importes |
| 36 | 110.3.c en una CB: se mira el rendimiento de **cada comunero** | arts. 88 LIRPF y 110 RIRPF | Mira el de la CB entera (js/hr.js:460) | ERROR (bajo: hasta 400 € por comunero y año) |
| 37 | 110.3.c con rendimiento anterior negativo o en el año de alta | art. 110.3.c RIRPF | Da 0 (js/hr.js:461) | A VERIFICAR (la letra «iguales o inferiores a 9.000» incluye los negativos) |
| 38 | 130 de la CB: lo presenta cada comunero por su parte | art. 110 RIRPF | Una sola cifra para la CB; la suma es igual salvo el 110.3.c | CORRECTO (FALTA el desglose por comunero en Tesorería) |
| 39 | Retenciones soportadas en el 130 (ingresos con retención) | art. 110.3 RIRPF | — | FUERA DE ALCANCE (en hostelería no hay) |
| 40 | Exención del 130 si el 70 % de los ingresos llevan retención | art. 109.1 RIRPF | — | FUERA DE ALCANCE (no aplica a hostelería) |
| 41 | Modelo 111: nóminas + profesionales al 15 % (7 % los tres primeros años) | arts. 80 y 101 RIRPF | js/finance.js:43-45, 220-223 | CORRECTO |
| 42 | Modelo 115: alquiler del local al 19 % | art. 100 RIRPF | js/finance.js:43 | CORRECTO |
| 43 | 190 y 180 (resúmenes anuales) | Órdenes de los modelos | Resumen del año (js/hr.js:3271-3306) | CORRECTO |
| 44 | IVA régimen general: repercutido 10 % restauración; soportado deducible | arts. 91, 92-114 LIVA | `ivaLiquidarMes` (js/hr.js:315-323) | CORRECTO |
| 45 | **Cuotas a compensar entre trimestres**: un 303 negativo de T1-T3 no se cobra, se compensa en los siguientes; solo el 4T se puede pedir devuelto | art. 99.Cinco y 115 LIVA | Cada trimestre se enseña suelto y el negativo como «a tu favor» (js/hr.js:2781-2782, 3276) | **FALTA** (el total del año cuadra; la Tesorería por trimestre no) |
| 46 | IVA del turismo al 50 % | art. 95.Tres LIVA | js/finance.js:494 | CORRECTO |
| 47 | Recargo de equivalencia | arts. 148-163 LIVA | No se usa | CORRECTO (la hostelería transforma lo que vende: régimen general) |
| 48 | Prorrata | arts. 102-106 LIVA | No se usa | CORRECTO (un bar no tiene operaciones exentas relevantes) |
| 49 | 390, 347 | arts. 71 RIVA; RD 1065/2007 | js/hr.js:3271-3340 | CORRECTO (otro bloque) |
| 50 | **184** de la CB con reparto por comuneros | art. 90 LIRPF; Orden HAP/2250/2015 | Atribuye el resultado contable por % (js/hr.js:3297-3306) | CORRECTO en el reparto. Matiz: el 184 lleva el rendimiento íntegro y los gastos, no solo el neto |
| 51 | Calendario: 303/111/115/130 del 1 al 20; 4T hasta el 30 de enero; 184 hasta el 31 de enero; 347 en febrero; renta hasta el 30 de junio | Órdenes de los modelos | js/hr.js:2772-2797 | CORRECTO (el 184 sale con la fecha del 390, el 30/01: un día antes, inofensivo) |

---

## 2. Hallazgos ordenados por impacto en euros

El impacto se mide en los expedientes de la sección 3: euros de cuota de IRPF
(o de pago a cuenta) que la app da de más (+) o de menos (−) frente al gestor.

| Prioridad | Hallazgo | Tipo | Impacto medido | Dónde | Arreglo propuesto |
|---|---|---|---|---|---|
| 1 | Otras rentas del titular/comunero no se tienen en cuenta: tipo marginal equivocado | FALTA | **CB1, comunero B: −3.605 € (−25,7 %)**; CB entera −3.605 € (−14,8 %) | js/finance.js:699-726 | Campo «otras rentas netas del año» por titular y por comunero; calcular el IRPF incremental: escala(actividad + otras) − escala(otras). Mantener `tipoIrpf` como alternativa |
| 2 | Turismo de uso mixto amortizado en el IRPF | ERROR | **A2: 5.304 € de gasto que no lo es → −2.387 € de cuota** | js/finance.js:514-522 | Casilla «turismo de uso mixto» en el vehículo: en persona física, amortización 0 (y sus gastos tampoco), IVA al 50 % igual |
| 3 | Reducción del 20 % por inicio de actividad (art. 32.3 LIRPF) | FALTA | **CB2: +2.143 € en total (+85 %)** junto con el orden de las pérdidas (punto 9) | js/finance.js:699-706 | Fecha de inicio de actividad por titular/comunero; 20 % del rendimiento positivo (máx. 100.000) el primer año positivo y el siguiente |
| 4 | Autoconsumo valorado a coste en el IRPF | ERROR | **A2: 4.800 € de ingreso de menos → −2.160 € de cuota** | js/finance.js:613-619 | IRPF: valor de mercado (precio de carta sin IVA de lo consumido, o coste × margen medio); IVA: seguir a coste |
| 5 | 303 sin compensar el negativo de trimestres anteriores | FALTA | Total del año igual; Tesorería por trimestre: **A2 enseña 6.020,57 € a pagar en T2 cuando no se paga nada** (T1 dejó 8.790,75 a compensar); A1 1.122,72 €, CB1 2.372,89 € | js/hr.js:2781-2782, 3276 | Arrastrar el saldo negativo T1→T4; en T4, elegir devolución o compensar el año siguiente |
| 6 | Mínimo por descendientes (y edad, discapacidad) | FALTA | **A2: +750,50 €** (3.950 € de mínimo × 19 %). Con dos hijos y mínimo entero, +1.501 € | js/finance.js:675, 705 | Datos personales del titular/comunero: año de nacimiento, hijos (edad, % de mínimo), ascendientes, discapacidad |
| 7 | 130 sin el 5 % de difícil justificación (EDS) | ERROR | **A1 +399,99 € (+3,8 %); CB1 +799,99 € (+4,7 %); CB2 +547,40 € (+5,3 %)** | js/hr.js:455-469 | Restar `min(2000, 5 % del acumulado)` en simplificada (por comunero en CB) |
| 8 | Escala autonómica | FALTA | Sin medir (depende de la CCAA); en las comunidades que más se separan de la referencia puede superar el ±5 % | js/finance.js:674 | Selector de CCAA con su escala 2026 o aviso fijo de que se usa la estatal × 2 |
| 9 | Pérdidas anteriores restadas ANTES del 5 % y de las reducciones del art. 32 | ERROR menor | Parte de los +2.143 € de CB2 (el 5 % se calcula sobre una base menor) | js/hr.js:416-418, js/finance.js:702 | Calcular el 5 % y las reducciones sobre el rendimiento del año; compensar las pérdidas después, en la base liquidable |
| 10 | EDN con la tabla de amortización de la EDS | ERROR | **A2: 170,50 € de gasto de menos → +76,73 €** | js/finance.js:483 | `modalidadDirecta === 'normal'` → tabla `is` |
| 11 | 110.3.c por la CB entera y no por comunero | ERROR | Hasta 400 €/comunero y año (no sale en los expedientes) | js/hr.js:460 | Calcular el 130 por comunero con su rendimiento anterior |
| 12 | 110.3.c con rendimiento anterior ≤ 0 → 0 € | A VERIFICAR | Hasta 400 €/año de pago a cuenta | js/hr.js:461 | Confirmar el criterio (instrucciones del 130 / DGT) |
| 13 | Sin aviso al pasar de 600.000 € en EDS | FALTA | En A2, si el dueño dejara «simplificada»: 2.000 € de gasto de más → −900 € | js/app.js:6954 | Aviso en Mi Negocio cuando la facturación del año anterior pasa de 600.000 € |
| 14 | 32.2.3 sin comprobar otras rentas > 6.500 € | FALTA | Hasta 1.620 € de base (≈ 300 €) | js/finance.js:695-698 | Con el dato de «otras rentas» del punto 1 |
| 15 | Seguro de enfermedad (500 €/persona) | FALTA | ≤ 2.000 € de gasto | — | Puede ir como gasto fijo con una marca; tope por persona |
| 16 | Cuota RETA por ingresos reales sin aviso de tramo | FALTA | 0 € en el año (se regulariza después); sí afecta a la Tesorería del año siguiente | — | Sugerir el tramo 2026 con el rendimiento previsto (rendimiento + cuota − 7 %) |
| 17 | Cita «art. 103 LIS» en el comentario de los 300 € | Cita | 0 € | js/finance.js:477-480, 499-500 | Cambiar por art. 12.3.e LIS |

**Resumen por expediente** (desviación de la app frente al gestor; el
objetivo es ±5 %):

| Expediente | Resultado | IVA del año | 130 del año | IRPF | ¿Dentro del ±5 %? |
|---|---|---|---|---|---|
| A1 Bar, autónomo EDS | 0,0 % | 0,0 % | +3,8 % | 0,0 % | Sí (el 130, rozando) |
| A2 Restaurante, autónomo EDN | −6,1 % | 0,0 % | −6,1 % | −6,0 % | **No** (turismo, autoconsumo, mínimo familiar) |
| CB1 Restaurante, CB 2 socios | 0,0 % | 0,0 % | +4,7 % | −14,8 % (comunero B −25,7 %) | **No** (otras rentas del comunero B) |
| CB2 Cafetería, CB nueva 3 socios | 0,0 % | 0,0 % | +5,3 % | +85,4 % (A +70,7 %, B +99,1 %, C 189,85 € frente a 0) | **No** (art. 32.3 y orden de las pérdidas) |

Lo que ya funciona bien: la cuenta de resultados de un autónomo o una CB
«normal» (sin turismo, sin autoconsumo relevante y sin otras rentas) sale
**exacta**, y el IVA y las retenciones (111/115) del año también. Los fallos
están todos del rendimiento hacia abajo, en lo que la app no sabe de la
persona.

---

## 3. Expedientes

Supuestos comunes (también en el JSON):

- Ejercicio 2026, cifras en euros, ventas y compras en **base** (sin IVA).
  Ventas de restauración al 10 %.
- Estacionalidad de las ventas por mes (pesos): 12 · 12,5 · 14 · 15 · 16 ·
  17 · 19 · 18 · 15,5 · 15 · 14 · 14.
- Escala del IRPF: la combinada de referencia del motor, para aislar los
  errores de lógica (la de cada comunidad, aparte: hallazgo 8). Cuota =
  escala(base liquidable) − escala(mínimos).
- El gestor resta el 5 % de difícil justificación en el 130 (EDS).
- Las inversiones se compran el día 1 del mes (la app amortiza el mes de
  compra entero; así coinciden).
- La columna «App» es la reproducción de las fórmulas de `js/finance.js` y
  `js/hr.js` con los mismos datos. Al convertirlo en prueba hay que
  sembrar los datos en la app real y comparar contra la columna «Gestor».

### A1 · Bar de barrio, autónomo en estimación directa simplificada

Titular soltero, 45 años, sin otras rentas, en el negocio desde 2015
(rendimiento 2025: 30.000 €). Un empleado indefinido. Expediente de
**control**: no tiene ninguna de las trampas, y la app debe cuadrar.

**Entrada**

- Ventas 180.000 € (base). Compras 32 % de las ventas: 70 % al 10 %, 30 % al 21 % (bebidas).
- Gastos fijos al mes: alquiler 1.500 (+21 %, retención 19 %), luz y gas 650 (21 %),
  agua 90 (10 %), teléfono 50 (21 %), gestoría 120 (21 %, retención 15 %), seguro 70
  (exento), limpieza y mantenimiento 100 (21 %), RETA 380, «RETRIBUCIÓN EMPRESARIO»
  2.000 (no es gasto).
- Personal: 1.600 € × 14 pagas = 22.400; SS empresa 32,15 % = 7.201,60; retención 8 % = 1.792.
- Inversiones: cafetera y lavavajillas 12.000 + IVA (maquinaria, 1-3-2026) con préstamo de
  14.520 € a 60 cuotas de 280 €; TPV y tablet 900 + IVA (informática, 1-3-2026, al
  contado); menaje 250 + IVA (útiles, 1-5-2026: escaso valor).

**Cuenta de resultados 2026**

| Concepto | Gestor | App |
|---|---:|---:|
| Ventas | 180.000,00 | 180.000,00 |
| Compras | −57.599,99 | −57.599,99 |
| Gastos fijos (sin la retribución del titular) | −35.520,00 | −35.520,00 |
| Personal | −29.601,60 | −29.601,60 |
| Amortización (1.200 maquinaria + 195 TPV + 250 menaje) | −1.645,00 | −1.645,00 |
| Intereses del préstamo | −666,49 | −666,49 |
| **Rendimiento neto previo** | **54.966,92** | **54.966,92** |
| 5 % difícil justificación (tope) | −2.000,00 | −2.000,00 |
| Base liquidable | 52.966,92 | 52.966,92 |
| **IRPF de la actividad** (cuota − mínimo personal 5.550) | **14.244,76** | **14.244,76** |

**Trimestres**

| | T1 | T2 | T3 | T4 | Año |
|---|---:|---:|---:|---:|---:|
| 303 resultado | −2.073,46 | 1.122,72 | 1.430,86 | 891,18 | 1.371,30 |
| 303 a ingresar (gestor, compensando) | 0 (compensar 2.073,46) | 0 (compensar 950,74) | 480,12 | 891,18 | 1.371,30 |
| 111 (nómina + gestoría) | 502,00 | 502,00 | 502,00 | 502,00 | 2.008,00 |
| 115 | 855,00 | 855,00 | 855,00 | 855,00 | 3.420,00 |
| 130 gestor | 1.786,21 | 2.873,68 | 3.527,33 | 2.406,17 | 10.593,39 |
| 130 app | 1.880,22 | 3.024,92 | 3.682,07 | 2.406,17 | 10.993,38 |

Cuota diferencial de la renta 2026: gestor 3.651,37 € a pagar; app 3.251,38 €.

**Veredicto:** dentro del ±5 % en todo. El 130 sale un 3,8 % alto (no resta
el 5 %). La app enseña en T2 1.122,72 € de IVA a pagar cuando no se paga
nada (hallazgo 5).

### A2 · Restaurante, autónomo en estimación directa normal

Facturó 640.000 € en 2025: en 2026 la EDN es obligatoria (art. 28.1 RIRPF).
Titular de 40 años, dos hijos de 5 y 2 años; el mínimo por descendientes se
reparte al 50 % con el otro progenitor: (2.400 + 2.700 + 2.800) / 2 = 3.950 €.
Turismo de uso mixto. Come en su restaurante (autoconsumo). Rendimiento 2025:
85.000 €.

**Entrada**

- Ventas 660.000 €. Compras 30 %: 75 % al 10 %, 25 % al 21 %.
- Fijos al mes: alquiler 4.000 (21 %, ret. 19 %), suministros 2.200 (21 %), gestoría 300
  (21 %, ret. 15 %), seguros 150, mantenimiento 600 (21 %), marketing 500 (21 %), RETA 600,
  retribución del titular 4.000 (no es gasto).
- Personal: 6 empleados, bruto 150.000; SS empresa 48.225; retenciones 18.000.
- Inversiones (1-2-2026 salvo el coche): cocina 40.000 + IVA (maquinaria) con préstamo de
  48.400 € a 84 cuotas de 700 €; software y web 3.000 + IVA; ordenadores 2.400 + IVA;
  turismo 30.000 + IVA (1-1-2026, al contado, uso mixto).
- Autoconsumo: 200 €/mes a coste, 600 €/mes a precio de carta sin IVA.

**Cuenta de resultados 2026**

| Concepto | Gestor | App | Por qué |
|---|---:|---:|---|
| Ventas | 660.000,00 | 660.000,00 | |
| Autoconsumo | 7.200,00 | 2.400,00 | art. 28.3 LIRPF: valor de mercado |
| Compras | −198.000,00 | −198.000,00 | |
| Gastos fijos | −100.200,00 | −100.200,00 | |
| Personal | −198.225,00 | −198.225,00 | |
| Amortización | −5.857,50 | −10.991,00 | turismo 5.304 (no afecto); software 33 % y no 26 %; informática 25 % y no 26 % |
| Intereses | −2.402,19 | −2.402,19 | |
| **Rendimiento neto** | **162.515,32** | **152.581,82** | **−6,1 %** |
| Mínimos (personal + familiar) | 9.500,00 | 5.550,00 | |
| **IRPF** | **62.228,39** | **58.508,82** | **−3.719,57 € (−6,0 %)** |

Desglose de los −3.719,57 € (todo en el tramo del 45 %, salvo el mínimo,
que se resta al 19 %): turismo −2.386,80; autoconsumo −2.160,00; tablas de
amortización +76,73 (la app amortiza 192,50 € menos de software y 22,00 € más
de informática); mínimo familiar +750,50.

**Trimestres**

| | T1 | T2 | T3 | T4 | Año |
|---|---:|---:|---:|---:|---:|
| 303 resultado (igual en los dos) | −8.790,75 | 6.020,57 | 7.028,25 | 4.900,93 | 9.159,00 |
| 303 a ingresar (gestor) | 0 (compensar 8.790,75) | 0 (compensar 2.770,18) | 4.258,07 | 4.900,93 | 9.159,00 |
| 111 | 4.635,00 | 4.635,00 | 4.635,00 | 4.635,00 | 18.540,00 |
| 115 | 2.280,00 | 2.280,00 | 2.280,00 | 2.280,00 | 9.120,00 |
| 130 gestor | 4.680,47 | 9.354,70 | 11.643,41 | 6.824,49 | 32.503,07 |
| 130 app | 4.181,47 | 8.858,80 | 11.147,51 | 6.328,59 | 30.516,37 |

El IVA del autoconsumo va a coste en los dos (240 € al año): correcto.
Cuota diferencial de la renta: gestor 29.725,32 €; app 27.992,45 €.

**Veredicto:** fuera del ±5 % en el resultado, el 130 y el IRPF.

### CB1 · Restaurante en comunidad de bienes, 2 comuneros al 50 %

Dos empleados. Obra de adecuación del local alquilado (contrato de 10 años)
con préstamo. La CB paga el RETA de los dos (760 €/mes). Rendimiento 2025 de
la CB: 70.000 €. El comunero B cobra además 18.000 € brutos en otra empresa:
rendimiento neto del trabajo 18.000 − 1.170 (SS 6,5 %) − 2.000 (art. 19.2.f) =
14.830 €; sin reducción del art. 20 porque tiene más de 6.500 € de otras
rentas. En la app nadie ha rellenado su `tipoIrpf`.

**Entrada**

- Ventas 300.000 €. Compras 31 %: 72 % al 10 %, 28 % al 21 %.
- Fijos al mes: alquiler 2.200 (21 %, ret. 19 %), suministros 1.000 (21 %), gestoría 200
  (21 %, ret. 15 %), seguro 100, otros servicios 300 (21 %), RETA de los dos 760, retiradas
  de los comuneros 3.600 (no son gasto).
- Personal: bruto 44.800; SS empresa 14.403,20; retenciones 3.584.
- Obra 30.000 + IVA (1-1-2026), préstamo de 36.300 € a 60 cuotas de 650 €; 10 % anual.

**Cuenta de resultados de la CB y atribución (modelo 184)**

| Concepto | Gestor | App |
|---|---:|---:|
| Ventas | 300.000,00 | 300.000,00 |
| Compras | −93.000,00 | −93.000,00 |
| Gastos fijos | −54.720,00 | −54.720,00 |
| Personal | −59.203,20 | −59.203,20 |
| Amortización de la obra | −3.000,00 | −3.000,00 |
| Intereses | −948,68 | −948,68 |
| **Rendimiento neto de la CB** | **89.128,12** | **89.128,12** |
| Atribuido a A (50 %) | 44.564,06 | 44.564,06 |
| Atribuido a B (50 %) | 44.564,06 | 44.564,06 |

**IRPF de cada comunero**

| | A gestor | A app | B gestor | B app |
|---|---:|---:|---:|---:|
| Rendimiento atribuido | 44.564,06 | 44.564,06 | 44.564,06 | 44.564,06 |
| 5 % (tope 2.000 por comunero, DGT V1195-16) | −2.000,00 | −2.000,00 | −2.000,00 | −2.000,00 |
| Otras rentas | 0 | 0 | 14.830,00 | (no lo sabe) |
| Base liquidable | 42.564,06 | 42.564,06 | 57.394,06 | 42.564,06 |
| Cuota total | 10.395,70 | 10.395,70 | 15.882,80 | 10.395,70 |
| − cuota que pagaría solo por el sueldo | — | — | −1.882,20 | — |
| **IRPF por la actividad** | **10.395,70** | **10.395,70** | **14.000,60** | **10.395,70** |

Total CB: gestor 24.396,30 €, app 20.791,40 € (−14,8 %).

**Trimestres de la CB**

| | T1 | T2 | T3 | T4 | Año |
|---|---:|---:|---:|---:|---:|
| 303 resultado | −4.858,08 | 2.372,89 | 2.813,88 | 1.882,91 | 2.211,60 |
| 303 a ingresar (gestor) | 0 (compensar 4.858,08) | 0 (compensar 2.485,19) | 328,69 | 1.882,91 | 2.211,60 |
| 111 | 986,00 | 986,00 | 986,00 | 986,00 | 3.944,00 |
| 115 | 1.254,00 | 1.254,00 | 1.254,00 | 1.254,00 | 5.016,00 |
| 130 gestor, cada comunero | 1.358,71 | 2.386,33 | 2.873,72 | 1.894,06 | 8.512,82 |
| 130 gestor, suma | 2.717,42 | 4.772,66 | 5.747,44 | 3.788,12 | 17.025,64 |
| 130 app (CB) | 2.860,44 | 5.023,86 | 6.049,93 | 3.891,40 | 17.825,63 |

Cuota diferencial de la renta: A 1.882,88 €; B 5.487,78 €.

**Veredicto:** cuentas, IVA y retenciones exactos; 130 +4,7 %; IRPF del
comunero B −25,7 % (fuera del margen).

### CB2 · Cafetería en comunidad de bienes nueva, 3 comuneros (50/30/20)

Alta en marzo de 2025; es la primera actividad de los tres. 2025 cerró con
−12.000 € (están en la app). 2026 es el primer año positivo: reducción del
20 % (art. 32.3 LIRPF) y compensación de la pérdida de 2025 (art. 48 LIRPF).
Tarifa plana del RETA hasta febrero (3 × 90 €), después 3 × 300 €.

**Entrada**

- Ventas 150.000 €. Compras 30 %: 80 % al 10 %, 20 % al 21 %.
- Fijos al mes: alquiler 1.200 (21 %, ret. 19 %), suministros 500 (21 %), gestoría 100
  (21 %, ret. 15 %), seguro 60, otros servicios 150 (21 %), RETA 270 (enero-febrero) y 900
  (marzo-diciembre).
- Personal: media jornada, bruto 11.200; SS empresa 3.600,80; retención 224.
- Maquinaria de 15.000 € comprada el 1-3-2025: 1.800 € de amortización en 2026.

**Cuenta de resultados de la CB** (igual en el gestor y en la app)

| Concepto | Importe |
|---|---:|
| Ventas | 150.000,00 |
| Compras | −45.000,00 |
| Gastos fijos | −33.660,00 |
| Personal | −14.800,80 |
| Amortización | −1.800,00 |
| **Rendimiento neto** | **54.739,20** |

**IRPF de cada comunero**

| | A (50 %) | B (30 %) | C (20 %) |
|---|---:|---:|---:|
| Rendimiento atribuido (184) | 27.369,60 | 16.421,76 | 10.947,84 |
| 5 % difícil justificación | −1.368,48 | −821,09 | −547,39 |
| Reducción art. 32.3 (20 %) | −5.200,22 | −3.120,13 | −2.080,09 |
| Reducción art. 32.2.3 (rentas < 12.000) | 0 | 0 | −1.490,25 |
| Pérdida 2025 compensada | −6.000,00 | −3.600,00 | −2.400,00 |
| Base liquidable | 14.800,90 | 8.880,54 | 4.430,10 |
| **IRPF gestor** | **1.875,22** | **632,80** | **0,00** |
| **IRPF app** | **3.201,34** | **1.259,83** | **189,85** |
| Desviación | +70,7 % | +99,1 % | +189,85 € |

Total: gestor 2.508,02 €, app 4.651,02 € (+85,4 %).

**Trimestres de la CB**

| | T1 | T2 | T3 | T4 | Año |
|---|---:|---:|---:|---:|---:|
| 303 (sin negativos) | 783,23 | 1.279,63 | 1.514,77 | 1.018,37 | 4.596,00 |
| 111 | 101,00 | 101,00 | 101,00 | 101,00 | 404,00 |
| 115 | 684,00 | 684,00 | 684,00 | 684,00 | 2.736,00 |
| 130 gestor, suma de los tres | 2.012,36 | 2.814,30 | 3.307,56 | 2.266,22 | 10.400,44 |
| 130 app | 2.118,27 | 2.962,42 | 3.481,65 | 2.385,50 | 10.947,84 |

El 130 no lleva la reducción del 32.3 ni compensa la pérdida de 2025, así que
los tres comuneros salen a devolver en la renta (A −3.325,00; B −2.487,34;
C −2.080,08). La deducción del 110.3.c con el rendimiento negativo de 2025 se
ha dejado a 0 en los dos lados (hallazgo 12, a verificar).

**Veredicto:** cuentas e IVA exactos; 130 +5,3 %; IRPF +85 %. Es el caso
que más se separa, y es el del cliente típico de la app (negocio nuevo).

---

## 4. Cómo convertirlo en prueba

`expedientes-autonomos-cb.json` tiene, por expediente, `entrada` (ventas y
compras mensuales en base, mezcla de IVA, gastos fijos con su IVA y su
retención, nóminas anuales, inversiones con préstamo, autoconsumo, datos de
los comuneros) y `esperado.gestor` (cuenta de resultados, `iva303` y
`iva303Liquidacion` por trimestre, `m111`, `m115`, `m130` o `m130Total`, IRPF
desglosado). `esperado.app` es lo que da hoy la fórmula de la app:
sirve para comprobar que la siembra en la prueba es fiel antes de exigir los
valores del gestor.

Una prueba nueva (p. ej. `test/fiscal-autonomos-cb.mjs`) sembraría cada
expediente con la semilla de `test/auditoria-contable.mjs` (ventas con
`items[].ivaPct`, `DB.ge.fijos`, `DB.ge.capex`, `DB.business.comuneros`) y
compararía con `esperado.gestor` con un margen del 5 %. Hoy fallarían A2,
CB1 y CB2; A1 debe pasar ya.
