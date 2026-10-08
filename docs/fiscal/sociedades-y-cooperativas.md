# Sociedades y cooperativas en la Gestión Económica (auditoría fiscal, 8/10/2026)

Objetivo del dueño: que la Cuenta de Resultados, Tesorería y el calendario de Hacienda den lo mismo que el gestor, con una tolerancia de ±5 %. Este documento cubre SL, SLU, SA, sociedad laboral, sociedad civil con objeto mercantil, cooperativas de trabajo asociado y sociedades de nueva creación, ejercicio 2026.

Solo lectura del código. No se ha tocado nada de `js/`. Los cuatro expedientes están calculados a mano en `docs/fiscal/expedientes-sociedades.json` (entradas, resultados esperados y lo que da la app hoy), pensado para convertirse en prueba.

## 0. Fuentes y lo que NO se pudo comprobar

| Dato | Fuente consultada | Estado |
|---|---|---|
| Tipos IS 2025-2028 (micro, reducida dimensión, nueva creación, cooperativas) y DT 44.ª LIS | Manual práctico de Sociedades 2025, AEAT, apartado "Tipos de gravamen" | Verificado en la fuente oficial |
| Reserva de capitalización 20 % (23 / 26,5 / 30 % por plantilla), límite 20 % y 25 % si INCN < 1 M€ | Manual práctico de Sociedades 2025, AEAT | Verificado |
| Modelo 202: plazos (1-20 abril, octubre, diciembre), base = cuota del último período con plazo vencido el día 1 del mes, obligación del 40.3 por encima de 6 M€ | Instrucciones del modelo 202 para 2025, AEAT | Verificado |
| Reserva de nivelación 10 % / 1 M€ (art. 105 LIS) | Resultados de búsqueda de segunda mano | Sin confirmar en AEAT/BOE |
| Resto de la LIS (arts. 15, 18, 26, 40, 102-103), Ley 20/1990, RIRPF art. 80, LGSS | Conocimiento propio, sin contraste | Marcado "verificar" donde hay duda |

El BOE y la sede de la AEAT están bloqueados desde este entorno (solo se pudo leer a través del navegador de Apify). Los porcentajes y artículos que no salen en la tabla de arriba hay que contrastarlos con el texto consolidado antes de programar nada. Donde cito un artículo con duda lo marco.

### Tipos del IS para períodos que empiezan en 2026 (verificados)

| Contribuyente | 2026 | 2027 |
|---|---|---|
| General | 25 % | 25 % |
| Microempresa (INCN del período anterior < 1 M€) | 19 % hasta 50.000 €, 21 % el resto | 17 % / 20 % |
| Reducida dimensión (art. 101, INCN < 10 M€) | 23 % | 22 % |
| Nueva creación (primer período con base positiva y el siguiente) | 15 % | 15 % |
| Cooperativa fiscalmente protegida, resultados cooperativos, micro | 16 % hasta 50.000 €, 18 % el resto | 14 % / 17 % |
| Cooperativa protegida, cooperativos, reducida dimensión | 20 % | 19 % |
| Cooperativa protegida, cooperativos, nueva creación | 12 % | 12 % |
| Cooperativa protegida, extracooperativos | como el general / micro / ERD de la tabla superior | idem |
| Bonificación cuota cooperativa especialmente protegida | 50 % de la cuota íntegra (Ley 20/1990, art. 34) | idem |

El cambio de tipo cada enero es lo que más envejece el código: 2027 baja micro y ERD otra vez.

## 1. Mapa norma contra código

Leyenda: CORRECTO, ERROR (calcula mal lo que sí intenta calcular), FALTA (no existe), FUERA DE ALCANCE (no aplica a hostelería pequeña o no es objeto de la app).

| # | Concepto | Norma | Estado | Dónde / qué hace la app |
|---|---|---|---|---|
| 1 | Tipo general 25 % | LIS 29.1 | CORRECTO | `hr.js:506`, `finance.js:731` |
| 2 | Micro 19 % / 21 % en 2026 | LIS 29.1, DT 44.ª | CORRECTO solo en 2026 | `hr.js:495-502`. Escala cableada. En 2027 será 17/20: caduca |
| 3 | ERD 23 % en 2026 | DT 44.ª | CORRECTO solo en 2026 | `hr.js:503-505`. Cableado, 2027 = 22 % |
| 4 | Nueva creación 15 % | LIS 29.1.b | ERROR parcial | `hr.js:489-492`: usa `DB.business.anyo` (año de apertura del local, no de la sociedad) y cuenta años naturales. La norma cuenta períodos con base positiva (ver 2.7) |
| 5 | Tipo según el año que se mira | LIS 29 | ERROR | `tipoImpuestoAño(año)` (`hr.js:410-419`) usa `pctDefectoSociedad()` de HOY para cualquier año. Mirar 2025 con 2026 |
| 6 | La sugerencia "nunca se aplica sola" | n/a | ERROR de coherencia | El comentario (`hr.js:481`) lo dice, pero `pctDefectoSociedad()` (`hr.js:435-438`) la aplica en cuanto `pctImpuestoBeneficio` es null |
| 7 | Facturación del año anterior | LIS 101, 29.1 | ERROR | `hr.js:493-494` suma solo ventas que haya en la app. Negocio recién migrado, o sociedad con ventas anteriores fuera de la app, cae al 25 % (ver 2.2) |
| 8 | Gastos no deducibles (multas, donativos, atenciones > 1 % INCN, IS, sanciones) | LIS 15 | FALTA | No existe ajuste extracontable. Base imponible = resultado contable |
| 9 | Deducción donativos Ley 49/2002 (40 %, verificar tabla vigente) | Ley 49/2002 art. 20 | FALTA | No existe |
| 10 | Reserva de capitalización | LIS 25 | FALTA | No existe. 20 % del incremento de fondos propios, límite 25 % de la base si INCN < 1 M€ |
| 11 | Reserva de nivelación | LIS 105 | FALTA (opcional) | No existe. Verificar compatibilidad con micro |
| 12 | Libertad de amortización ≤ 300 € / 25.000 € | LIS 12.3 (el comentario del código cita el art. 103, que es de ERD: verificar) | CORRECTO en efecto | `finance.js:499-508` |
| 13 | Amortización acelerada ERD (doble del coeficiente, art. 103) y libertad con empleo (art. 102) | LIS 102-103 | FALTA | Solo tabla IS lineal (`finance.js:468-476`). Efecto: diferimiento, no ahorro neto |
| 14 | Tabla de coeficientes IS | LIS 12.1.a, RIS | CORRECTO | `finance.js:468-476` (obras 10, maquinaria 12, mobiliario 10, informática 25, vehículo 16) |
| 15 | Obras en local alquilado según contrato | PGC | CORRECTO | `finance.js:486-488` |
| 16 | Existencias | PGC 61 | CORRECTO | `finance.js:626-659` |
| 17 | Compensación de bases negativas | LIS 26 | CORRECTO con límites | `hr.js:391-404`: sin límite de años (bien), sin tope 70 % (no muerde por debajo de 1 M€, que es el mínimo siempre compensable). No hay régimen especial para micro/ERD: no falta nada ahí |
| 18 | Bases negativas anteriores a la app | LIS 26 | FALTA | Solo se calculan desde años con ventas en la app. No hay campo "bases negativas pendientes" |
| 19 | Pérdidas se calculan sobre base contable | LIS 26 | ERROR menor | `hr.js:397` suma el resultado contable, no la base imponible; hereda el defecto 8 |
| 20 | Impuesto por año, no mes a mes | LIS | CORRECTO | `hr.js:421-430`, probado en `test/auditoria-contable.mjs:97` |
| 21 | 202: 18 % de la cuota, tres pagos (abril, octubre, diciembre) | LIS 40.2 | CORRECTO en reparto | `hr.js:470-474`; fechas en `hr.js:2788` |
| 22 | 202: qué cuota se toma | Instrucciones 202 | ERROR | Abril debe usar el IS del año X-2 (el X-1 aún no tiene plazo vencido el 1 de abril); octubre y diciembre usan X-1. La app usa X-1 para los tres (`hr.js:470`) |
| 23 | 202: base = cuota íntegra menos deducciones, bonificaciones y retenciones | Instrucciones 202 | ERROR | `hr.js:471` usa base × tipo, sin deducciones (donativos, reserva capitalización ya reducen la base, pero bonificación coop. no) |
| 24 | 202: tipo del cálculo | n/a | ERROR | `hr.js:471` llama `impuestoAnual(baseAnt)` SIN `pctDefecto`, así que si el dueño no guardó el % cae al 25 % aunque la app muestre 19 % |
| 25 | 202 modalidad 40.3 (> 6 M€) | LIS 40.3 | FUERA DE ALCANCE | Ninguna hostelería de este perfil llega |
| 26 | 200 en julio | LIS | CORRECTO | `hr.js:2794` (25 julio). Sin importe: solo aviso |
| 27 | Dividendos y 123 al 19 % | LIRPF 101.4 | CORRECTO | `hr.js:1556-1560`. No son gasto |
| 28 | Intereses de préstamos de socios (retención 19 %, modelo 123) | LIRPF 101.4 | FALTA | Solo dividendos |
| 29 | Operaciones vinculadas socio-sociedad a valor de mercado | LIS 18 | FUERA DE ALCANCE | La app no lo audita (un alquiler del local de un socio sí podría pasar por el 115) |
| 30 | Nómina del administrador | LIS 15 / LSC 217-219 | CORRECTO si cargo retribuido en estatutos | `finance.js:441-445`: en sociedad la retribución SÍ es gasto. La app no pregunta por los estatutos |
| 31 | Retención del administrador (35 %, 19 % si INCN < 100.000 €) | RIRPF 80.1.3 | FALTA preset | `hr.js:822`: el IRPF por defecto es 15 %. Editable, pero no sugiere 35 % |
| 32 | Seguridad social del administrador | LGSS | FALTA | El autónomo societario cotiza por RETA a su cargo. `hr.js:865` propone SS empresa del 32,15 % como en un asalariado |
| 33 | Socio trabajador autónomo societario | LGSS | FALTA | Sin concepto separado de las cuotas RETA que la sociedad no paga |
| 34 | Cooperativa: tipos 2026 (16/18 micro, 20 ERD, 12 nueva creación) | Ley 20/1990 art. 33 tras Ley 7/2024 | ERROR | `finance.js:731` y `hr.js:436`: 20 % plano |
| 35 | Cooperativa: resultados cooperativos y extracooperativos separados | Ley 20/1990 | FALTA | El texto de la app lo reconoce ("esta app no lo calcula", `i18n.js:2665, 2375`) |
| 36 | Cooperativa: dotación FEP y 50 % del FRO deducibles | Ley 20/1990, cap. IV | FALTA | Resultado contable sin fondos |
| 37 | Cooperativa especialmente protegida: bonificación 50 % | Ley 20/1990 art. 34 | FALTA | No existe |
| 38 | Anticipos laborales de socios de trabajo | Ley 27/1999 | FALTA (aceptable) | Se meten como personal y funciona; sin preset de retención |
| 39 | IVA 303 trimestral, régimen general | LIVA | CORRECTO | Cubierto por `test/auditoria-contable.mjs` |
| 40 | IVA: compensación de cuotas negativas entre trimestres | LIVA 99 | FALTA | `ivaLiquidarMes` (`hr.js:315`) deja cada trimestre aislado: no arrastra el saldo negativo al siguiente. El año cierra bien; la caja del T2 y T3 no |
| 41 | 111, 115, 180, 190, 347, 390 | RIRPF, LIS | CORRECTO | `hr.js:2783-2793`. Las fechas del T4 son 30/01 para todo. Verificar: 111, 115 y 123 del 4T vencen el 20 de enero; 190 y 180 el 31 de enero |
| 42 | Sociedad civil con objeto mercantil | LIS 7 | FALTA de etiqueta | Tributa IS desde 2016 igual que una SL. El selector dice "Sociedad (S.L., S.A....)" (`i18n.js:2367`): añadir "S.C. con objeto mercantil" |
| 43 | Sociedad laboral SLL/SAL | LIS | CORRECTO | Tributa como SL. Sin diferencia fiscal en el IS |
| 44 | Cuentas anuales (depósito) | LSC | FUERA DE ALCANCE | No es impuesto |
| 45 | Cuota líquida mínima (art. 30 bis) | LIS | FUERA DE ALCANCE | Aplica a INCN ≥ 20 M€ |
| 46 | Límite 30 % EBITDA a gastos financieros | LIS 16 | FUERA DE ALCANCE | El mínimo de 1 M€ lo cubre |

## 2. Hallazgos priorizados por impacto en euros

Los importes salen de los expedientes (sección 3). Impacto = diferencia entre el impuesto del año según la app y el que daría el gestor.

### 2.1 Cooperativas: 20 % plano sobre el excedente bruto (ERROR / FALTA, +14.353 € en el expediente 3)

Cooperativa de trabajo asociado de 3 socios, 400.000 € de ventas, excedente de 112.170 €. El gestor llega a una cuota líquida de 8.081 € (7,2 % del excedente). La app calcula 22.434 € (20 % del excedente). Sobreestima en un 178 %.

Tres causas apiladas: no dota el FEP ni el FRO (la base baja 5.608 + 11.217 €); no aplica el tipo micro 16/18 %; no aplica la bonificación del 50 % a la cooperativa especialmente protegida. Ninguna de las tres existe en el código (`finance.js:731`). El 202 también sale unas tres veces por encima del real.

Mínimo viable, sin modelar toda la Ley 20/1990: tres campos en Mi Negocio (cooperativa protegida / especialmente protegida; porcentaje de dotación FEP y FRO, con los mínimos legales por defecto; si hay resultados extracooperativos) y una función `impuestoCooperativa(excedente)`. Lo extracooperativo no se trata: se avisa y se deja al gestor.

### 2.2 Sin facturación del año anterior en la app: 25 % en vez de 19-21 % (ERROR, +5.940 € en el expediente 1)

`sugerenciaImpuestoSociedad()` (`hr.js:493-506`) calcula la categoría de tamaño con las ventas del año anterior que haya en la app. Una SL que se da de alta en GastroGoan en 2026 con un negocio que ya existía no tiene esas ventas y cae al 25 %. Es el caso típico de un cliente que acaba de comprar la licencia.

En el expediente 1 el resultado antes de impuestos es 51.643 €. La app saca 12.911 € y el gestor 6.971 € (diferencia del 85 %): 25 % frente a 19/21 %, más la compensación de las bases negativas y los ajustes que tampoco ve. Aislando el tipo: 51.643 × 25 % frente a 51.643 × 19,06 % = 3.065 € de diferencia.

Arreglo: campo "Cifra de negocios del año anterior" en Mi Negocio, que manda sobre el cálculo de ventas cuando existe. El tamaño se decide con el INCN del período anterior (art. 29.1 / 101), no con la facturación del año en curso.

### 2.3 Bases negativas anteriores a la app (FALTA, 3.150 € en el expediente 1)

`perdidasCompensables` (`hr.js:391-404`) solo mira años con ventas en la app. Una sociedad con 15.000 € de bases negativas del ejercicio anterior (año sin datos) pierde 15.000 × 21 % = 3.150 € de ahorro. Es la causa de que el expediente 1 se aleje tanto cuando falta 2025. Falta el campo "Bases imponibles negativas pendientes a 1 de enero" con año de origen (la compensación no caduca para sociedades; el 70 % solo muerde por encima de 1 M€).

### 2.4 Administrador socio: SS de empresa que no existe (ERROR por defecto, 2.206 € en el expediente 1; 1.466 € en el 2)

El socio administrador que controla la sociedad cotiza por RETA a su cargo. La sociedad no paga el 32,15 % de SS de empresa, que es lo que `hr.js:865` propone al marcar "nómina automática". En el expediente 1 eso son 11.574 € de gasto inventado y 2.206 € de impuesto de menos (-31 %). En el expediente 2, 7.716 € de gasto inventado y 1.466 € de impuesto.

Además la retención del administrador es del 35 % (19 % si la cifra de negocios del penúltimo ejercicio es menor de 100.000 €) y la app propone 15 %: el 111 sale corto. En el expediente 1, la diferencia en el 111 es 36.000 × 20 % = 7.200 € al año.

Arreglo: al marcar "es administrador / titular" en una sociedad, preset de IRPF 35 % y SS empresa 0 %, con aviso "su cuota de autónomos la paga él". Pregunta única: "¿Los estatutos fijan un cargo remunerado?". Sin eso la retribución no es gasto deducible (art. 217 LSC, verificar).

### 2.5 Modelo 202: cuota del año equivocado, sin minorar y con tipo equivocado (ERROR, 1.080 € a 2.437 € en el expediente 1)

Tres defectos en `pagoACuentaTrimestre` (`hr.js:470-474`):

1. Abril usa el IS del año anterior. Debe usar el de dos años atrás, porque el del anterior aún no ha vencido el 1 de abril. Expediente 1: abril 2026 debería ser 1.080 € (IS 2024 = 6.000 €) y la app da 0 €. Abril 2027 debería ser 0 € (IS 2025 = 0 por pérdidas) y la app da 1.257 €.
2. Llama a `impuestoAnual(baseAnt)` sin `pctDefecto`: si el dueño no guardó el %, calcula al 25 % aunque el CDR muestre 19 %. Expediente 1, 2027: 4.947 € al 25 %, 3.759 € al 19 %, 2.510 € reales.
3. No resta deducciones ni bonificaciones. La cuota que manda es la íntegra menos deducciones y bonificaciones, no base × tipo.

En el expediente 2 (SLU micro): real 828 + 850,50 + 850,50. Con el % sin guardar la app da 3 × 1.012,50 (+20 %); con 19 % guardado, 3 × 769,50 (-8,7 %).

Arreglo: guardar en `DB.ge` la cuota líquida de cada IS cerrado, con año, y que el 202 lea esa. Si no hay dato, pedirlo como el mismo campo del punto 2.3.

### 2.6 Los tipos 2026 están escritos a mano (ERROR latente, ~800 € por cada 40.000 € de base)

`hr.js:495-505` tiene 19/21 y 23 fijos. A partir del 1 de enero de 2027 serán 17/20 y 22. La sugerencia se queda vieja el día 1 y pasa a sobreestimar unos 2 puntos: 800 € por cada 40.000 € de base. Un mismo error afecta a quien mire 2025 (21/22 reales) con los tipos 2026.

Arreglo: tabla `TIPOS_IS[año]` con micro, ERD, nueva creación y cooperativas, y `tipoImpuestoAño(año)` que consulta el año visto. La tabla de este documento sirve de semilla (2025-2028 verificados).

### 2.7 Nueva creación: la app cuenta años naturales, la ley cuenta períodos con base positiva (ERROR, ~800 € en el tercer ejercicio del expediente 4)

`hr.js:489-492` da el 15 % si han pasado 1 año o menos desde `DB.business.anyo`. Dos problemas:

- El 15 % es para el primer período con base positiva y el siguiente. Si el primer año hay pérdidas (lo normal en un restaurante nuevo), el 15 % dura hasta el tercer año. Expediente 4: pérdidas en 2026, bases positivas en 2027 y 2028. La app da el 15 % en 2027 (bien) y el micro 17/20 % en 2028 (mal: debe seguir al 15 %). Con base 2027 de 39.880 €, 2 puntos son unos 800 €, y el 202 de 2028 (octubre y diciembre) se calcula al tipo equivocado.
- `anyo` es el año de apertura del local, no de constitución de la sociedad. Un autónomo que se transforma en SL no es entidad de nueva creación si ya ejercía la actividad él o personas vinculadas (art. 29.1.b LIS, verificar redacción). Ese caso, que en hostelería es muy frecuente, no puede aplicar el 15 %.

Arreglo: dos campos en Mi Negocio, "Primer período con base positiva" (año) y "Es entidad de nueva creación (sí/no)", con la advertencia de la transformación.

### 2.8 Ajustes de la base (menos de 300 € cada uno, pero son la parte más barata de arreglar)

Con el tipo del 19-21 %, el efecto de cada concepto es pequeño y a veces se compensa:

| Concepto | Expediente | Efecto en euros |
|---|---|---|
| Multa 600 y donativo 500 (no deducibles) | 1 | +231 € de cuota |
| Donativo, deducción del 40 % | 1 | -200 € |
| Atenciones a clientes por encima del 1 % de INCN (3.000 frente a 2.500) | 2 | +95 € |
| Reserva de capitalización (1.555 €) | 2 | -295 € |

En el expediente 1 la multa y el donativo se anulan con la deducción, y por eso la app con 2025 completo acierta (0,2 %) por pura casualidad. Se arregla con una línea "Ajustes a la base imponible" (positivos y negativos) en la ficha del ejercicio, y un campo "Incremento de fondos propios". La reserva de capitalización exige dotar una reserva indisponible: la app debe avisar.

### 2.9 IVA: el saldo a compensar no se arrastra entre trimestres (FALTA, solo caja)

`ivaLiquidarMes` (`hr.js:315`). Expediente 1: T1 sale -7.557 € por la inversión; el T2 (+5.043 €) se paga de hecho 0 € y el T3 sólo 2.529 €. La app enseña 5.043 € a pagar en T2. El año acaba igual (7.572 €); el problema es de tesorería y de calendario. El expediente 4 añade el caso de devolución en el T4.

### 2.10 Menores

- Etiqueta "Sociedad (S.L., S.A....)": añadir sociedad civil mercantil y sociedad laboral para que nadie elija "Comunidad de Bienes" por no verse (y tribute por IRPF, que es lo contrario).
- Intereses de préstamos de socios: 19 % al 123 (hoy solo dividendos).
- `setPctImpuesto` (`hr.js:2894`) guarda 0 % si el campo se deja vacío (`|| 0`), y desde ese momento la sugerencia nunca vuelve a aplicarse.
- Fechas de T4 en el calendario (`hr.js:2778`, ver línea 41 del mapa).
- Reserva de nivelación y amortización acelerada ERD: opcionales. No ahorran, difieren. No priorizar.

## 3. Los cuatro expedientes

Todos los detalles (entradas completas, trimestres, comparación con la app) están en `docs/fiscal/expedientes-sociedades.json`. Convenciones: años naturales, ventas repartidas por igual, préstamo francés con la primera cuota en el mes de compra, SS empresa 32,15 %. Importes sin IVA salvo que se diga.

### 3.1 SL de restaurante, 600.000 € de ventas (ejercicio 2026)

Entradas principales: INCN 2025 de 560.000 € (micro). 8 empleados con 168.000 € de bruto, administrador con 36.000 € de nómina (retención 35 %) y cargo retribuido en los estatutos. Compras 186.000 € (80 % al 10 %, 20 % al 21 %), existencias de 8.000 a 9.500 €. Alquiler 36.000 € con retención del 19 %. Inversión de 60.000 € (+ 21 % de IVA) financiada a 5 años al 5 %. Multa 600 €, donativo 500 €, atenciones 1.200 €. Bases negativas de 15.000 € de 2025; cuota IS 2024 de 6.000 € y 2025 de 0.

Cuenta de resultados PGC:

| Concepto | € |
|---|---|
| Cifra de negocios | 600.000,00 |
| Aprovisionamientos (con variación de existencias) | -184.500,00 |
| Personal (sueldos 204.000 + SS 54.012) | -258.012,00 |
| Otros gastos de explotación | -92.700,00 |
| EBITDA | 64.788,00 |
| Amortización | -10.600,00 |
| Resultado de explotación | 54.188,00 |
| Gastos financieros | -2.545,26 |
| Resultado antes de impuestos | 51.642,74 |
| Impuesto sobre beneficios | -6.971,12 |
| Resultado del ejercicio | 44.671,62 |

Impuesto de Sociedades (modelo 200, julio 2027):

| Paso | € |
|---|---|
| Resultado contable | 51.642,74 |
| Multa y donativo (no deducibles) | +1.100,00 |
| Base previa | 52.742,74 |
| Compensación de bases negativas | -15.000,00 |
| Base imponible | 37.742,74 |
| Cuota íntegra (19 % hasta 50.000; no se pasa) | 7.171,12 |
| Deducción donativo 40 % | -200,00 |
| Cuota líquida | 6.971,12 |
| Pagos fraccionados 2026 | -1.080,00 |
| A ingresar en julio de 2027 | 5.891,12 |

Pagos fraccionados 2026: abril 1.080 € (18 % del IS 2024), octubre 0 y diciembre 0 (IS 2025 = 0). 2027: abril 0, octubre y diciembre 1.254,80 € cada uno.

IVA trimestral: repercutido 15.000 € cada trimestre. Soportado 22.557 € en T1 (con la inversión) y 9.957 € en los demás. Resultado -7.557, +5.043, +5.043, +5.043. Tras compensar: 0, 0, 2.529 y 5.043 € a ingresar; total anual 7.572 €. Modelo 111: 6.930 € por trimestre (27.720 € al año, 190). Modelo 115: 1.710 € por trimestre (6.840 € al año, 180). El 347 incluye al distribuidor, los suministros y el vendedor de la maquinaria (72.600 € con IVA).

Dónde está la app fuera del ±5 %:

| Escenario | Impuesto app | Diferencia |
|---|---|---|
| Sin datos de 2025 en la app | 12.910,69 € | +5.939,57 € (+85 %) |
| Con 2025 completo | 6.985,43 € | +14,31 € (+0,2 %), por compensación casual de errores |
| Con 2025 y nómina de administrador con SS empresa por defecto | 4.779,01 € | -31 % |
| 202 de 2026 | 0, 0, 0 | real 1.080, 0, 0 |
| 202 de 2027 | 3 × 1.253,18 € (19 %) o 3 × 1.648,92 € (25 %) | real 0, 1.254,80, 1.254,80 |

### 3.2 SLU microempresa, 250.000 € de ventas (ejercicio 2026)

Entradas: INCN 2025 de 240.000 €. 2 empleados con 38.000 € de bruto, administrador único con 24.000 € de nómina (35 %). Compras 80.000 €. Atenciones a clientes de 3.000 €. TPV de 1.200 € y 3 piezas de 250 € (libertad de amortización). IS 2024 de 4.600 €, IS 2025 de 4.725 € (beneficio tras impuestos 17.775 €). Dividendo de 10.000 € el 15 de junio.

| Concepto | € |
|---|---|
| Cifra de negocios | 250.000 |
| Aprovisionamientos | -80.000 |
| Personal | -74.217 |
| Otros gastos de explotación | -52.300 |
| EBITDA | 43.483 |
| Amortización | -4.000 |
| Resultado antes de impuestos | 39.483 |
| Impuesto sobre beneficios | -7.301,32 |
| Resultado | 32.181,68 |

IS: ajuste de +500 € por atenciones por encima del 1 % de la cifra de negocios (2.500 €). Base previa 39.983 €. Reserva de capitalización 20 % de 7.775 € = 1.555 € (el límite del 25 % no muerde). Base imponible 38.428 €. Cuota al 19 %: 7.301,32 €. Pagos fraccionados 2026 de 2.529 € (abril 828, octubre 850,50, diciembre 850,50), a ingresar 4.772,32 € en julio de 2027. Hay que dotar una reserva indisponible de 1.555 €.

Modelo 123 del segundo trimestre (vence el 20 de julio): retención 1.900 € sobre el dividendo de 10.000 €; el socio cobra 8.100 €. IVA anual 5.820,50 € (1.148 en T1 y 1.557,50 en cada uno de los demás). 111: 2.860 € por trimestre. 115: 1.026 € por trimestre.

Dónde la app falla: el impuesto anual sale a 7.501,77 € (+2,75 %, dentro del margen) porque los errores se compensan, pero no ve el ajuste ni la reserva. El 202 sale con el % sin guardar a 3 × 1.012,50 € (+20 %) y con el 19 % guardado a 3 × 769,50 € (-8,7 %). Fuera del ±5 % en los dos casos.

### 3.3 Cooperativa de trabajo asociado, 3 socios, 400.000 € de ventas (ejercicio 2026)

Entradas: especialmente protegida, INCN 2025 de 380.000 €. Anticipos laborales a los socios 72.000 € (retención 12 %), 1 asalariado de 20.000 €. Compras 124.000 €. Todo resultado cooperativo. FRO 20 %, FEP 5 %. Cuotas líquidas anteriores: 1.700 € (2024) y 1.900 € (2025). Se paga en efectivo el 50 % de lo disponible como retorno.

| Concepto | € |
|---|---|
| Excedente antes de FEP e impuesto | 112.170,00 |
| Dotación FEP (5 %) | -5.608,50 |
| Resultado antes de impuestos | 106.561,50 |
| Dotación FRO (20 % del excedente) | 22.434,00 |
| Base imponible (excedente menos FEP menos 50 % del FRO) | 95.344,50 |
| Cuota íntegra (16 % hasta 50.000, 18 % el resto) | 16.162,01 |
| Bonificación 50 % | -8.081,01 |
| Cuota líquida | 8.081,01 |
| Tipo efectivo sobre el excedente | 7,2 % |
| Pagos fraccionados 2026 | 306 + 342 + 342 |
| A ingresar en julio de 2027 | 7.091,01 |
| Disponible para retornos | 76.046,50 |
| Retorno pagado (50 %) | 38.023,25 |
| Retención del 123 al 19 % | 7.224,42 |

111 anual 10.440 €, 115 anual 4.560 €.

La app: 20 % de 112.170 € = 22.434 € (+14.353 €, +178 %). Si los anticipos se meten con la SS por defecto, 17.804 €, que tampoco cuadra. Fuera del ±5 % por mucho; el 202 sale unas tres veces por encima del real.

Nota de seguridad: el régimen especialmente protegido depende de requisitos de la Ley 20/1990 (límite de asalariados, entre otros) que la app no puede comprobar. El selector debería preguntarlo y avisar de que, si no se cumple, la bonificación del 50 % no existe.

### 3.4 SL de nueva creación (constituida el 1/3/2026), primer y segundo año

Año 1 (marzo a diciembre de 2026): ventas 300.000 €, compras 99.000 € (existencias finales 5.000 €), 6 empleados con 96.000 € de bruto, alquiler 25.000 €, gastos de constitución 1.200 €. Inversiones: obras de 80.000 € a 10 años de contrato (10 %) y maquinaria de 40.000 €. Préstamo de 100.000 € al 6 % a 84 cuotas (cuota 1.460,86 €).

| | Año 1 (2026) | Año 2 (2027) |
|---|---|---|
| Amortización | 10.666,67 | 12.800,00 |
| Intereses | 4.780,90 | 5.071,42 |
| Resultado antes de impuestos | -3.511,57 | 43.391,78 |
| Compensación de bases negativas | n/a | -3.511,57 |
| Base imponible | -3.511,57 | 39.880,21 |
| Tipo | n/a | 15 % (primer período con base positiva) |
| Cuota | 0 | 5.982,03 |
| Pagos fraccionados | 0, 0, 0 | 2027: 0, 0, 0 (IS de 2025 y 2026 = 0) |

El 202 de octubre y diciembre de 2028 es de 1.076,77 € cada uno (18 % de 5.982,03); abril de 2028 es 0 (sale del IS 2026).

IVA 2026: T1 solo marzo (repercutido 3.000, soportado 27.718,30 con las inversiones, resultado -24.718,30). T2 a T4 con +1.445,10 cada uno: se compensan y el T4 cierra en -20.383 € (solicitud de devolución). 111 anual 7.680 €, 115 anual 4.750 €.

Dónde la app falla: año 1 correcto (0 €). Año 2 correcto (15 %, 5.982,03 €). Año 3 (2028): la app pasa al micro 17/20 % (la ley mantiene el 15 % por ser el segundo período con base positiva), y calcula 1.076,77 € de 202 de abril cuando el real es 0. Si el local lleva años abierto y se da de alta la sociedad (año de apertura antiguo), la app nunca da el 15 %.

## 4. Cómo convertir los expedientes en prueba

`docs/fiscal/expedientes-sociedades.json` tiene en cada expediente `entradas`, `esperado` y `app_hoy`. Para `test/sociedades.mjs`, siguiendo el patrón de `test/auditoria-contable.mjs`:

1. Sembrar `DB.business.formaJuridica = 'sociedad'` (o `'cooperativa'`), `DB.sales` con la facturación del año (y del anterior), `DB.ge.variables`, `fijos`, `capex` y `existencias` desde `entradas`.
2. Llamar a `GE.resultadoAntesImpMes`, `GE.impuestoMes`, `GE.pagoACuentaTrimestre` e `GE.resumenAño`, y comparar con `esperado` con tolerancia del 5 % (y del 1 % para la cuenta de resultados, que es aritmética).
3. Mientras falte la funcionalidad, declarar los casos fuera del margen con `acepta` en vez de `espera` (el convenio del 14/09), diciendo el motivo, para que no tumben la batería pero tampoco se olviden.

Orden recomendado de implementación, de más a menos euros por cliente: (1) cooperativas con FEP, FRO, tipo micro y bonificación; (2) campo "cifra de negocios del año anterior" y "bases negativas pendientes"; (3) preset de administrador (35 %, SS empresa 0 %); (4) 202 con cuota guardada del IS y año X-2 en abril; (5) tabla `TIPOS_IS[año]`; (6) nueva creación por períodos con base positiva; (7) ajustes a la base y reserva de capitalización; (8) arrastre del saldo de IVA.

## 5. Lo que ya está bien y no hay que tocar

Impuesto por año completo y no mes a mes. Pérdidas compensadas sin límite de años. Amortización con la tabla del IS, libertad de amortización de bienes de hasta 300 €, obras según contrato y reparto de intereses y principal del préstamo. Variación de existencias. Dividendos como no gasto con el 123 al 19 %. 111, 115, 303, 347, 190, 180 y 390 en su sitio. 200 en julio. Escala micro y ERD de 2026 (solo hay que parametrizarla por año).
