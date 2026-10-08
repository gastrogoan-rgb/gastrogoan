# IVA, nóminas y retenciones: auditoría de Gestión Económica (8/10/2026)

Bloque transversal: vale para autónomo, CB, SL y cooperativa. El objetivo es que
Gestión Económica dé las mismas cifras que el gestor, con un margen de ±5 %.
Se revisa el código de `js/hr.js`, `js/finance.js` y `js/tpv.js` contra la
norma de 2026. Los ejemplos están calculados a mano y se pueden reproducir con
`docs/fiscal/expedientes-nominas-iva.json`.

Etiquetas: **CORRECTO** · **ERROR** (la app calcula mal) · **FALTA** (la app no
lo contempla y la cifra se desvía) · **FUERA DE ALCANCE** (no merece modelarse
en una app de gestión; lo hace la gestoría).

---

## 1. Resumen: lo que hay que arreglar, por impacto en euros

| # | Estado | Qué pasa | Dónde | Impacto típico |
|---|---|---|---|---|
| H01 | FALTA | La nómina se calcula **desde el neto**, con un **IRPF que escribe el dueño (15 % por defecto)**. No hay salario de tablas ni algoritmo de retenciones | `hr.js:822`, `843-845`, `979-981` | Camarero: coste **+9,2 %** (+2.307 €/año) y 111 **+1.746 €/año**. Tiempo parcial: **+17,7 %**. Jefe de cocina: **−11,7 %** (−10.850 €/año) y 111 **−10.107 €/año** |
| H02 | FALTA | **Fijo discontinuo** sin meses de actividad: la app cuenta la nómina los 12 meses | `hr.js:847-850`, `1043` | **+9.636 €/año** por trabajador con 7 meses de campaña (+71 %) |
| H03 | ERROR | El 111 solo suma el IRPF de las nóminas **con autocálculo**. Una nómina metida a mano aporta 0 € y la app no avisa | `finance.js:32-34` | Desaparece todo el IRPF de esas nóminas: 1.378 €/año por camarero |
| H04 | FALTA | El **socio-administrador** de una SL se trata como asalariado del Régimen General, con retención libre | `hr.js:831-836`, `946-949` | SS ≈ 9.600 €/año frente a ≈ 4.500-5.500 € en el RETA. Retención del 15 % frente al 35/19 % |
| H05 | FALTA | La **manutención en especie** no cotiza. Está exenta de IRPF, pero cotiza en la SS | `finance.js:2512-2515` | ≈ 340 €/año por trabajador (empresa) y 69 € (trabajador) |
| H06 | FALTA | No hay pluses de convenio, **horas extra** (cotización adicional), propinas por nómina ni 15 pagas | `hr.js:841-866` | Las horas extra se quedan sin el 28,30 % adicional |
| H07 | ERROR | El IVA va **por plato, no por canal**: la cerveza o el refresco azucarado **para llevar o a domicilio** sale al 10 % de sala en vez del 21 % | `tpv.js:3664-3679` | **150 €/trimestre** en el ejemplo (600 €/año), más la sanción |
| H08 | ERROR | El **autoconsumo** del titular se valora a coste también en el IRPF. En el IRPF va a valor de mercado | `finance.js:577-581`, `613` | ≈ 700 €/año de IRPF de un autónomo que come en su local |
| H09 | FALTA | No está la **bonificación del 50 %** de los fijos discontinuos de hostelería en febrero, marzo y noviembre | `hr.js:972-978` | Hasta 654 €/año por trabajador |
| H10 | FALTA | Al terminar un temporal no se suman la **indemnización** (12 días/año) ni las vacaciones no disfrutadas | `hr.js:972-997` | 152 € por contrato de 3 meses |
| H11 | ERROR | **111, 115 y 123 del 4T** con plazo hasta el 30/01. El plazo real es el **20/01** | `hr.js:2778`, `2783-2785` | Recargo del 1 % (≈ 35 €) y riesgo de sanción |
| H12 | FALTA | No hay **349** ni aviso de alta en el ROI cuando hay ISP de una plataforma de la UE | `hr.js:3277-3281` | Mínimo 300 € de sanción por declaración no presentada |
| H13 | ERROR | El **347** no incluye las comisiones de las plataformas españolas (Glovo) | `hr.js:3315-3329` | Unos 300 € de sanción |
| H14 | ERROR | Con 14 pagas, el IRPF de las extras se reparte en 12 meses y el **111 trimestral** no cuadra con lo retenido | `hr.js:982`, `996` | 0 € al año. ±48 €/trimestre por camarero y ±693 € por jefe de cocina |
| H15 | ERROR | En persona física, el "IRPF" del titular con autocálculo entra en el 111 | `finance.js:32-34` | Una retención que no existe |
| H16 | ERROR | El **202 de abril** se calcula con el IS de N-1; debe usar el de N-2 | `hr.js:470-474` | 18 % de la diferencia entre las dos cuotas |
| H17 | ERROR | El texto `mn.ticket.vatDescLong` dice que "no hay un IVA distinto por plato" | `i18n.js:2914` (+ca/en) | 0 € (confunde) |
| H18 | ERROR | El 347 de clientes suma la propina | `hr.js:3337` | Despreciable |
| H19 | FALTA | La parte del trabajador de la cotización de solidaridad no se descuenta del neto | `hr.js:986-995` | 1,93 €/mes en N5 |
| H20 | FALTA | Faltan las fechas de domiciliación (día 15; 25/01 para el 303 del 4T) | `hr.js:2772-2807` | 0 € |
| H21 | FALTA | Faltan los datos por perceptor para el 190 | `hr.js:3271-3341` | 0 € directo |

**La conclusión pesa más que la lista.** Las tablas de cotización de 2026 están
bien: tipos, MEI, AT/EP, bases, solidaridad y contrato corto, sin un solo
error. El ±5 % se pierde antes, en la **entrada**. El dueño escribe un neto y un
IRPF que no conoce, y con el 15 % por defecto cualquier sueldo de hostelería
sale entre un 9 % y un 18 % caro. El fijo discontinuo, el contrato más
frecuente del sector, no se puede representar. Arreglar H01, H02 y H03 vale más
que todo lo demás junto.

---

## 2. Parámetros de 2026: comprobados contra la fuente

| Parámetro | App | Norma 2026 | Estado |
|---|---|---|---|
| Empresa, indefinido: CC 23,60 + desempleo 5,50 + FOGASA 0,20 + FP 0,60 + MEI 0,75 + AT/EP 1,50 | 32,15 % (`hr.js:947`) | 32,15 % | CORRECTO |
| Empresa, temporal (desempleo 6,70) | 33,35 % (`hr.js:948`) | 33,35 % | CORRECTO |
| Trabajador: 4,70 + 1,55/1,60 + 0,10 + MEI 0,15 | 6,50 / 6,55 % | 6,50 / 6,55 % | CORRECTO |
| MEI 2026 (0,90 = 0,75 + 0,15) | sí | RDL 2/2023 | CORRECTO |
| AT/EP, CNAE 56 (5610 restaurantes, 5630 bares): IT 0,80 + IMS 0,70 | 1,50 | Tarifa de la DA 4ª de la Ley 42/2006. El repartidor en moto no pasa al cuadro II f (más de 3,5 t) | CORRECTO |
| Base máxima | 5.101,20 (`hr.js:974`) | Orden PJC/297/2026 | CORRECTO |
| Bases mínimas, grupos 1/2/3 | 1.989,30 / 1.649,70 / 1.435,20 | Orden PJC/297/2026 | CORRECTO |
| Base mínima, grupos 4-11 | 1.424,40 | 47,48 €/día × 30. Si la Orden fija 1.424,50 para los grupos 4-7, la diferencia es de 0,10 € | CORRECTO (confirmar en el BOE) |
| Solidaridad: 1,15 / 1,25 / 1,46 (empresa 0,96 / 1,04 / 1,22) | parte de la empresa (`hr.js:977`) | art. 19 bis LGSS (RDL 2/2023) | CORRECTO (falta la parte del trabajador, H19) |
| Tramos de solidaridad sobre el exceso de la base máxima (+10 % y +50 %) | `hr.js:987-993` | 5.611,32 y 7.651,80 €/mes | CORRECTO |
| Contrato de menos de 30 días: 3 × 23,60 % × 47,48 | 33,62 € (`hr.js:978`) | art. 151 LGSS | CORRECTO |
| SMI 2026: 1.221 €/mes en 14 pagas (17.094 €/año) | `hr.js:954` | RD 126/2026 | CORRECTO |
| 14 pagas: devengo × 14/12 y base con la prorrata de las extras | `hr.js:982-985` | art. 147 LGSS | CORRECTO |
| Base mínima a tiempo parcial proporcional a la jornada | `hr.js:984` | Base mínima por hora de la Orden. Equivale a la proporción si se cotiza por las horas reales | CORRECTO (aproximación válida) |
| IRPF: escala de retención, mínimo de 5.550, gastos de 2.000, reducción del art. 20 (7.302 / 14.852 / 17.673,52 / 19.747,50), límites excluyentes (15.876 en situación 3 sin hijos) y límite del 43 % | **no existe** | Algoritmo AEAT 2026 (versión 10-09-2026) | FALTA (H01) |

---

## 3. A) Nóminas: revisión del código

### 3.1 Cómo calcula hoy (`GE.calcNomina`, `hr.js:979-997`)

```
bruto    = neto / (1 − (IRPF% + SS trabajador%))      ← el neto lo escribe el dueño
brutoMes = bruto × pagas / 12
base     = min(5.101,20 ; max(base mín. grupo × jornada ; brutoMes))
SS emp.  = base × SS% + solidaridad(brutoMes − 5.101,20) + 33,62 × contratos cortos
coste    = brutoMes + SS emp.
IRPF 111 = brutoMes × IRPF%
```

### 3.2 Revisión punto por punto

| Tema | Estado | Detalle |
|---|---|---|
| Convenio: salario de tablas | **FALTA (H01)** | El V ALEH es estatal, pero solo fija la estructura: grupos, áreas, formación e IT. **Las tablas salariales son del convenio provincial**. La app pide un *neto* y deduce el bruto, al revés de como trabaja un gestor: tabla → bruto → SS → IRPF → neto. Hay que poder escribir el **bruto de tablas** (salario base + pluses) por grupo profesional y que el neto salga como resultado. |
| Grupos profesionales | CORRECTO a medias | Hay grupo de **cotización** 1-11, que es lo que necesita la base mínima. El grupo **profesional** del ALEH (área y nivel) no está, y no hace falta para calcular. Orientación: camarero y cocinero, grupo 8; ayudante, 9-10; jefe de cocina o de sala, 3. |
| 14 pagas o prorrateadas | CORRECTO | Hay 12 y 14. Faltan las **15 pagas** (algunos provinciales tienen una paga de marzo o de beneficios) y el mes en que se cobra cada extra (H14). |
| Plus de nocturnidad, transporte | FALTA (H06) | Hoy solo entran a través del neto. Cotizan y tributan los dos: el plus de transporte cotiza desde 2014. |
| Manutención | **FALTA (H05)** | La comida del personal en el local es **retribución en especie**. Está exenta de IRPF como comedor de empresa (art. 42.3.a LIRPF, art. 45 RIRPF), pero **cotiza** (art. 147 LGSS, valorada a coste). La app la anota como merma "comidaPersonal" y nunca cotiza. Los provinciales suelen fijar su valor mensual. |
| Propinas | FUERA DE ALCANCE (avisar) | Fuera del IVA: CORRECTO (`tpv.js:5304-5308`, `5614-5618`). Si se reparten **por nómina**, son rendimiento del trabajo (IRPF y cotización). Si van del bote directamente al personal, quedan fuera de la nómina. Basta con una nota. |
| Horas extra | FALTA (H06) | Cotización adicional: 23,60 % + 4,70 % (fuerza mayor: 12 % + 2 %). Sin ese campo, el coste de un mes con horas extra sale un 28,3 % corto en esa parte. |
| Indefinido / temporal | CORRECTO | Tipos bien elegidos (`gfContratoCambia`, `hr.js:955-960`). |
| Fijo discontinuo | **FALTA (H02)** | Cotiza como indefinido (5,50 / 1,55): los tipos valen. Pero la nómina es un gasto fijo **mensual de 12 meses**: un ayudante de 7 meses le cuesta a la app 23.126 € en vez de 13.490 €. Faltan los **meses de actividad**, y con ellos la bonificación de febrero, marzo y noviembre (H09). |
| Tiempo parcial | CORRECTO | La jornada en % reduce la base mínima. Faltan las horas complementarias, que entran como horas ordinarias. |
| Contrato de menos de 30 días | CORRECTO a medias | Los 33,62 € están. Faltan la indemnización y las vacaciones (H10). Además, un contrato de 15 días no es un "gasto fijo mensual": hoy se mete en un mes y hay que borrarlo después. |
| Bases mínima y máxima | CORRECTO | Ver la sección 2. |
| Cotización a cargo del trabajador sobre la base | ERROR menor | La app aplica el % del trabajador al **bruto** (dentro del neto → bruto), no a la **base**. Con 14 pagas, en los meses ordinarios se cotiza por la prorrata y en las extras no. El efecto anual es de −0,7 % a −1,2 % (N1, N3), dentro del ±5 %. Se arregla solo al pasar a "bruto de tablas". |
| Solidaridad del trabajador | FALTA (H19) | 0,19 / 0,21 / 0,24 %. Unos céntimos. |
| AT/EP | CORRECTO | 1,50 % para el CNAE 56. |
| Bonificaciones | FALTA / FUERA DE ALCANCE | La bonificación de fijos discontinuos de hostelería en febrero, marzo y noviembre (RDL 1/2023) es frecuente y modelable: **FALTA (H09)**. El resto (contratación de desempleados, jóvenes con garantía juvenil, discapacidad, víctimas, sustitución) depende de la situación de la persona y de la vigencia de cada programa: **FUERA DE ALCANCE**. Basta con un campo "bonificación €/mes" a mano. |
| Contratos formativos (formación en alternancia) | FUERA DE ALCANCE | Cuotas fijas. Campo manual. |
| Administrador de la SL | **FALTA (H04)** | Socio con control: **RETA (autónomo societario)**, no Régimen General (art. 305.2.b LGSS). Retención: **35 %, o 19 % si la cifra de negocios de la entidad es menor de 100.000 €** (art. 101.2 LIRPF). La app le aplica 32,15 % + 6,50 % y deja el IRPF al 15 %. |
| Retención de IRPF del trabajador | **FALTA (H01)** | No hay algoritmo. Ver 3.3. |
| Coste empresa total | CORRECTO dentro de lo que modela | Bruto devengado + SS de la empresa + contrato corto. Faltan la especie (H05), las horas extra (H06) y la indemnización (H10). |

### 3.3 Retención del trabajador: lo mínimo para estar en ±5 %

El algoritmo oficial (AEAT 2026, versión del 10/09; el cambio de septiembre
solo afecta a La Palma) cabe en unas 40 líneas, sin discapacidad, pensiones ni
movilidad:

1. `RETRIB` = retribución íntegra **anual prevista** (salario + pluses + extras + especie no exenta).
2. Si `RETRIB` ≤ límite excluyente (situación 3: 15.876 / 16.342 / 16.867 con 0 / 1 / 2+ hijos; situación 2: 17.197 / 18.130 / 19.262; situación 1: — / 17.644 / 18.694) → **tipo 0 %**. Esto **prevalece sobre el mínimo del 2 %**.
3. `RNT = RETRIB − cotizaciones del trabajador`; reducción del art. 20: 7.302 si RNT ≤ 14.852; 7.302 − 1,75 × (RNT − 14.852) hasta 17.673,52; 2.364,34 − 1,14 × (RNT − 17.673,52) hasta 19.747,50.
4. `BASE = RNT − 2.000 − reducción`.
5. `CUOTA = escala(BASE) − escala(mínimos)`. Mínimos: 5.550 + descendientes (2.400 / 2.700 / 4.000 / 4.500, al 50 % si conviven los dos progenitores; +2.800 si son menores de 3 años).
6. Si `RETRIB` ≤ 35.200: `CUOTA ≤ 43 % × (RETRIB − límite excluyente)`.
7. `TIPO = truncar(CUOTA / RETRIB × 100, 2)`; **contrato de menos de un año: mínimo del 2 %** (art. 86.2 RIRPF); relación especial: 15 %.
8. Regularización: cuando cambie la retribución, `nuevo tipo = (cuota anual − retenido) / retribución pendiente`. Se puede dejar como FUERA DE ALCANCE si se recalcula el tipo cada vez que se edita la nómina.

Escala de retención: 19 % hasta 12.450 · 24 % hasta 20.200 · 30 % hasta 35.200 · 37 % hasta 60.000 · 45 % hasta 300.000 · 47 % a partir de ahí.

---

## 4. Seis nóminas de 2026 calculadas a mano

Los salarios de tabla son **ejemplos**, no los de un convenio provincial
concreto. Todas las personas son de situación familiar 3, salvo que se diga
otra cosa. Las cifras salen de `expedientes-nominas-iva.json → nominas`.

### N1 · Camarero/a indefinido, jornada completa, 14 pagas
Salario base 1.320 €/mes × 14 + plus de transporte 50 €/mes × 12 → **19.080 €/año**. Grupo de cotización 8.

| | Ordinaria | Extra (jun/dic) |
|---|---|---|
| Bruto | 1.370,00 | 1.320,00 |
| Base de cotización (1.370 + 1.320 × 2/12) | 1.590,00 | — |
| SS trabajador (6,50 %) | 103,35 | 0,00 |
| IRPF: **7,22 %** | 98,91 | 95,30 |
| **Neto** | **1.167,74** | **1.224,70** |
| SS empresa (32,15 %) | 511,19 | — |

IRPF: RNT 17.839,80 · reducción 2.174,78 · base 13.665,02 · cuota 2.657,10 − 1.054,50 = 1.602,60 → límite del 43 %: (19.080 − 15.876) × 0,43 = **1.377,72** → 7,22 %.
**Coste empresa: 25.214,28 €/año (2.101,19 €/mes devengado).**
La app, con el neto real y su IRPF por defecto del 15 %, da 27.521,52 € (**+9,2 %**) y un 111 de 3.123,84 € en vez de 1.377,58 €.

### N2 · Ayudante de cocina fijo discontinuo, abril-octubre (7 meses), extras prorrateadas
1.250 € + prorrata de 208,33 = **1.458,33 €/mes** · retribución anual 10.208,33 €.

| Bruto | SS trab. | IRPF | Neto | SS empresa | Coste/mes activo |
|---|---|---|---|---|---|
| 1.458,33 | 94,79 | 0 % (por debajo del límite de 15.876) | **1.363,54** | 468,85 | **1.927,18** |

**Coste anual: 13.490,28 €** (0 € los meses inactivos). La app lo cuenta 12 meses: 23.126,28 € (**+71 %**), o 27.545,28 € con el IRPF por defecto.
Si se le llama en marzo o noviembre: bonificación de 218,02 €/mes (50 % × 29,90 % × base).

### N3 · Cocinero/a a tiempo parcial, 20 h (50 %), indefinido, 14 pagas
Tabla de jornada completa: 1.450 € → 725 €/mes × 14 = 10.150 €/año. Base 845,83 (la mínima a media jornada es 712,20).

| | Ordinaria | Extra |
|---|---|---|
| Bruto | 725,00 | 725,00 |
| SS trabajador | 54,98 | 0 |
| IRPF | 0 % | 0 % |
| **Neto** | **670,02** | **725,00** |
| SS empresa | 271,94 | — |

**Coste empresa: 13.413,28 €/año.** La app, con el IRPF por defecto: 15.791,16 € (**+17,7 %**).

### N4 · Camarero/a temporal de 3 meses (circunstancias de la producción), jornada completa
1.320 € + prorrata de 220 = 1.540 €/mes.

| Bruto | SS trab. (6,55 %) | IRPF | Neto | SS empresa (33,35 %) |
|---|---|---|---|---|
| 1.540,00 | 100,87 | 0 % (4.620 € al año: el límite excluyente prevalece sobre el 2 %) | **1.439,13** | 513,59 |

Indemnización al terminar: 12 días/año → **151,89 €**, exenta de IRPF y fuera de la base.
**Coste total del contrato: 6.312,66 €.**
*Variante N4b, para ver el mínimo del 2 %:* temporal de 10 meses a 1.650 €/mes → retribución de 16.500 €; el 43 % limita la cuota a 268,32 € (1,62 %) → **sube al 2 %**: 33,00 €/mes, neto de 1.508,92 €.

### N5 · Jefe/a de cocina indefinido, 5.200 €/mes × 14, 2 hijos (al 50 %)
Remuneración mensual con prorrata: 6.066,67 € → base **5.101,20** (tope) · exceso de 965,47 € → solidaridad.

| | Ordinaria | Extra |
|---|---|---|
| Bruto | 5.200,00 | 5.200,00 |
| SS trabajador (6,50 % × 5.101,20 + solidaridad 1,93) | 333,50 | 0 |
| IRPF: **26,67 %** | 1.386,84 | 1.386,84 |
| **Neto** | **3.479,66** | **3.813,16** |
| SS empresa (32,15 % × 5.101,20 + solidaridad 9,63) | 1.649,67 | — |

IRPF: retribución 72.800 · RNT 68.798,00 · base 66.798,00 · cuota 20.960,60 − escala(8.100) 1.539,00 = 19.421,60 → 26,67 %.
**Coste empresa: 92.596,04 €/año.** La app, con el neto real y el IRPF real, da 92.691 € (+0,1 %: la base y la solidaridad están bien). Con el 15 % por defecto da 81.746 € (**−11,7 %**) y un 111 de 9.309 € frente a 19.416 €.

### N6 · Extra de 15 días (temporal de menos de 30 días)
Salario de 15 días: 770,00 + vacaciones no disfrutadas (1,23 días) 63,29 = **833,29** (por encima de la base mínima de 15 días, 712,20).

| Bruto | SS trab. | IRPF | Indemnización | Neto | SS empresa | Contrato corto |
|---|---|---|---|---|---|---|
| 833,29 | 54,58 | 0 % | 24,97 | **803,68** | 277,90 | 33,62 |

**Coste total: 1.169,78 €.**

---

## 5. B) IVA en hostelería

### 5.1 Revisión

| Tema | Estado | Detalle |
|---|---|---|
| Servicio en sala o terraza, comida y **toda la bebida, alcohol incluido**: 10 % | CORRECTO | Art. 91.Uno.2.2º LIVA. Texto de ayuda en `i18n.js:2284`. |
| Para llevar / domicilio: comida 10 %, **alcohol y refrescos con azúcar añadido 21 %**, agua 10 % | **ERROR (H07)** | Es entrega de bienes (art. 91.Uno.1.1º; refrescos con azúcar al 21 % desde la Ley 11/2020). El texto de ayuda lo explica bien, pero `resolveLineIvaPct` (`tpv.js:3664`) solo mira el **plato**, nunca el `order.tipo`. La misma cerveza no puede ir al 10 % en sala y al 21 % para llevar. Hace falta un `ivaPctLlevar` por plato, o una regla: si `order.tipo ≠ 'mesa'` y el plato está marcado como "alcohol o azucarado", 21 %. |
| Pan común, leche, huevos, fruta, verdura y aceite de oliva **vendidos como bienes**: 4 % | CORRECTO (opción disponible) | La carta ofrece 21/10/4/0 (`menu.js:889`). Mismo problema de canal que H07, de importe mínimo. |
| Envío a domicilio con repartidor propio: 10 % | CORRECTO | Accesorio a la comida (art. 79.Dos LIVA), `tpv.js:3713-3717`. Si lo cobra la **plataforma** al cliente, no es venta del restaurante. |
| Plataformas: comisión con IVA español (Glovo, 21 %) | CORRECTO | `tpv.js:5297-5311`; IVA soportado en `hr.js:309-312`. |
| Plataformas con ISP (factura desde la UE) | CORRECTO en el 303 | `hr.js:3280`: autorrepercusión y deducción a la vez. **FALTA el 349 y el ROI (H12)**. |
| Comisión sobre PVP con IVA, sin la propina, con o sin el envío | CORRECTO | `tpv.js:5303-5309`. |
| Propinas: fuera del IVA | CORRECTO | No forman parte de la contraprestación. Se excluyen de `items` y de VeriFactu (`tpv.js:5614-5618`). |
| Vales polivalentes sin IVA al venderlos; univalentes con IVA al venderlos y restados al canjearlos | CORRECTO | `finance.js:582-603`. La norma es la Resolución de la DGT de 28/12/2018 (BOE 31/12/2018), que traspone la Directiva 2016/1065. **La cita "art. 75.Dos bis" del comentario no es correcta**: conviene cambiarla. |
| Señales: IVA al cobrarlas, al 10 % (art. 75.Dos LIVA), y se descuentan de la venta final | CORRECTO | `finance.js:363-378`. Una señal que se queda el restaurante por un *no-show* sigue sujeta, y la app no la devuelve: bien. |
| Autoconsumo del titular: IVA sobre el coste (art. 79.Tres) al 10 % | CORRECTO en IVA | `finance.js:581`. **ERROR en IRPF (H08)**: el art. 28.3 LIRPF valora el autoconsumo a **valor de mercado**. Si el titular se lleva alcohol, ese IVA es el 21 %: el efecto es menor. |
| Comida del personal | FUERA DE ALCANCE en IVA | Es un criterio discutido (autoconsumo o retribución en especie). Lo decide el gestor. |
| Prorrata | FUERA DE ALCANCE | Un restaurante no suele tener operaciones exentas. Las subvenciones ya no la afectan desde 2015 y la app no les pone IVA: bien. |
| Criterio de caja (RECC) | FUERA DE ALCANCE | En un restaurante se cobra al momento: no compensa. Si un **proveedor** está en el RECC, el IVA se deduce cuando se le paga. Basta con un aviso. |
| Recargo de equivalencia | CORRECTO (no aplica) | Solo afecta a minoristas personas físicas que revenden **sin transformar**. La hostelería presta servicios y transforma. |
| SII | FUERA DE ALCANCE | Solo con más de 6 M€ de facturación, o por opción. VeriFactu va aparte. |
| Otros ingresos: máquinas 21 %, alquiler de espacio 21 %, subvención sin IVA | CORRECTO | `finance.js:580`. Un espacio alquilado **con servicio de catering** es restauración: 10 %. |
| Bien de inversión: deducción en el periodo de la compra; vehículo al 50 % | CORRECTO | `hr.js:284-290`; art. 95.Tres LIVA. |

### 5.2 Un trimestre de IVA a mano (3T 2026: julio-septiembre)

Restaurante con sala, comida y bebida para llevar, delivery por Glovo (factura
española) y por Uber Eats (factura desde Países Bajos, ISP), señales y vales.
Los importes de venta llevan el IVA incluido.

**Repercutido**

| Concepto | Total | Tipo | Base | Cuota |
|---|---|---|---|---|
| Sala (comida, vino, copas) | 66.000,00 | 10 | 60.000,00 | 6.000,00 |
| Para llevar: comida | 8.800,00 | 10 | 8.000,00 | 800,00 |
| Para llevar: cerveza y vino | 1.210,00 | **21** | 1.000,00 | 210,00 |
| Para llevar: refrescos con azúcar | 605,00 | **21** | 500,00 | 105,00 |
| Para llevar: agua | 110,00 | 10 | 100,00 | 10,00 |
| Glovo (venta del restaurante) | 11.000,00 | 10 | 10.000,00 | 1.000,00 |
| Uber Eats (venta del restaurante) | 5.500,00 | 10 | 5.000,00 | 500,00 |
| Envío con repartidor propio | 330,00 | 10 | 300,00 | 30,00 |
| Señales cobradas para cenas de octubre | 2.200,00 | 10 | 2.000,00 | 200,00 |
| − Señales cobradas en junio por cenas de este trimestre | −1.100,00 | 10 | −1.000,00 | −100,00 |
| Vale univalente vendido | 550,00 | 10 | 500,00 | 50,00 |
| − Vale univalente de junio canjeado ahora | −330,00 | 10 | −300,00 | −30,00 |
| Autoconsumo del titular (a coste) | — | 10 | 600,00 | 60,00 |
| **Régimen general** | | 10 % | **85.200,00** | **8.520,00** |
| | | 21 % | **1.500,00** | **315,00** |
| ISP: comisión de Uber Eats (25 % × 5.500) | | 21 | 1.375,00 | 288,75 |
| **Total devengado (casilla 27)** | | | | **9.123,75** |

Fuera del IVA: propinas 1.500 € y vales polivalentes vendidos 1.000 €.

**Soportado deducible**

| Concepto | Base | Tipo | Cuota |
|---|---|---|---|
| Materia prima al 10 % | 18.000,00 | 10 | 1.800,00 |
| Materia prima al 4 % | 3.000,00 | 4 | 120,00 |
| Bebidas al 21 % | 3.000,00 | 21 | 630,00 |
| Luz / gas / agua | 2.400 / 900 / 300 | 21 / 21 / 10 | 504,00 / 189,00 / 30,00 |
| Alquiler (con retención del 19 %) | 4.500,00 | 21 | 945,00 |
| Gestoría (con retención del 15 %) | 450,00 | 21 | 94,50 |
| Envases para llevar | 600,00 | 21 | 126,00 |
| Teléfono | 150,00 | 21 | 31,50 |
| Comisión de Glovo (30 % × 11.000) | 3.300,00 | 21 | 693,00 |
| ISP de Uber Eats (deducción) | 1.375,00 | 21 | 288,75 |
| **Operaciones corrientes (casillas 28-29)** | 37.975,00 | | **5.451,75** |
| Horno, bien de inversión (casillas 30-31) | 6.000,00 | 21 | 1.260,00 |
| **Total a deducir (casilla 45)** | | | **6.711,75** |

**Resultado del 303 (casilla 46): 9.123,75 − 6.711,75 = 2.412,00 € a ingresar**,
hasta el **20/10/2026** (domiciliado, hasta el 15/10).
Retenciones del mismo trimestre: **115 = 2.565,00 €** (alquiler) y 111 de
profesionales = 202,50 €, más el IRPF de las nóminas.

**Lo que haría la app hoy.** Si la cerveza, el vino y los refrescos tienen el
10 % de sala, declara **150 € de IVA de menos** (H07). El resto del trimestre
lo calcula igual: señales, vales, autoconsumo, ISP y comisiones están bien
resueltos.

---

## 6. C) Retenciones, modelos y calendario

### 6.1 Retenciones y modelos

| Modelo | Estado | Detalle |
|---|---|---|
| 111, trabajadores | ERROR / FALTA | Sin algoritmo (H01). Solo suma las nóminas con autocálculo (H03). Reparte las extras en 12 meses (H14). Incluye al titular persona física (H15). |
| 111, profesionales 15 % / 7 % | CORRECTO | `finance.js:42-46`; art. 101.5 LIRPF. |
| 111, administradores 35 % / 19 % | FALTA (H04) | |
| 115, alquiler 19 % | CORRECTO | `finance.js:43`. Excepciones (arrendador con certificado, valor catastral bajo): un aviso basta. |
| 123, dividendos 19 % | CORRECTO | `hr.js:1556`. |
| 180 / 190 | FALTA parcial (H21) | Salen en el calendario, sin datos por perceptor (NIF, clave A/E, íntegro, retención, especie). |
| 303 / 390 | CORRECTO salvo H07 | Resumen trimestral con fila de ISP (`hr.js:3274-3281`). |
| 347 | CORRECTO salvo H13 y H18 | Umbral de 3.005,06 € con IVA, por trimestres, por NIF, sin las operaciones con retención (`hr.js:3308-3340`). Faltan las comisiones de plataformas españolas. Las de una plataforma de la UE **no** van aquí: van al 349. |
| 349 | FALTA (H12) | Adquisición intracomunitaria de servicios (clave I) cuando hay ISP de la UE, con alta previa en el ROI (modelo 036). |
| 202 | ERROR (H16) | Abril: IS de N-2. Octubre y diciembre: IS de N-1. Las fechas están bien. |

### 6.2 Calendario (`renderCalendarioFiscal`, `hr.js:2772-2807`)

| Modelo | Plazo real | Domiciliación | La app dice | Estado |
|---|---|---|---|---|
| 303, 111, 115, 123, 130/131 de 1T, 2T y 3T | 20/04, 20/07, 20/10 (2026: lunes, lunes, martes) | hasta el 15 | 20 del mes siguiente | CORRECTO |
| **111, 115, 123 del 4T 2026** | **20/01/2027** | 15/01/2027 | 30/01/2027 | **ERROR (H11)** |
| 303 del 4T 2026, 390 | 30/01 → **01/02/2027** (el 30 es sábado) | 25/01/2027 | 30/01/2027 | CORRECTO (conservador) |
| 130 / 131 del 4T | 01/02/2027 | 25/01/2027 | 30/01/2027 | CORRECTO (conservador) |
| 190, 180, 184 | 31/01 → **01/02/2027** (domingo) | — | 30/01/2027 | CORRECTO (conservador) |
| 347 | febrero → **01/03/2027** (el 28/02 es domingo) | — | 28/02/2027 | CORRECTO (conservador) |
| 349 | 20 del mes siguiente; el 4T hasta el 30/01 | — | — | FALTA (H12) |
| 202 | 1-20 de abril, octubre y diciembre (20/12/2026 es domingo → 21/12) | hasta el 15 | 20/04, 20/10, 20/12 | CORRECTO (conservador) |
| 200 | 25/07 → 26/07/2027 | 20/07/2027 | 25/07/2027 | CORRECTO (conservador) |
| 100 (Renta) | 30/06/2027 | 25/06/2027 | 30/06/2027 | CORRECTO |

La regla general en el código basta: `vence = 20 del mes siguiente`, y en el
4T, **20/01 para las retenciones** y 30/01 para el IVA y los pagos
fraccionados. Que la app enseñe un día antes del corrimiento a día hábil no
perjudica a nadie. Lo que sí perjudica es enseñar un día posterior al plazo
real, y eso es justo lo que hace H11.

---

## 7. Qué cambiaría, en orden

1. **Nómina desde el bruto de tablas** (H01): salario base + pluses (nocturnidad, transporte, manutención en especie con su valor) + horas extra del mes + número de pagas (12/14/15) y meses de las extras. Neto y retención como **resultado**, con el algoritmo de la sección 3.3 y los datos personales mínimos: situación 1/2/3, hijos, menores de 3 y contrato de menos de un año. El % de IRPF se deja editable solo como "forzar el tipo que dice la gestoría". Si se escribe un neto, se usa el algoritmo inverso, por iteración.
2. **Meses de actividad** por nómina (H02) y bonificación de febrero, marzo y noviembre (H09).
3. **El 111 suma todas las nóminas** (H03): sin autocálculo, aviso "esta nómina no informa del IRPF". Titular persona física fuera (H15). Extras en su mes (H14).
4. **Administrador**: tipo "administrador (RETA)" con cuota de autónomo societario y retención del 35/19 % (H04).
5. **IVA por canal** para alcohol y refrescos con azúcar (H07); arreglar `mn.ticket.vatDescLong` (H17).
6. **Calendario**: 20/01 para el 111/115/123 del 4T (H11) y las fechas de domiciliación (H20).
7. 347 con comisiones de plataformas (H13); 349 y aviso del ROI (H12); autoconsumo a valor de mercado en IRPF (H08); indemnización y vacaciones al terminar un temporal (H10).

---

## 8. Cómo convertir los expedientes en prueba

`docs/fiscal/expedientes-nominas-iva.json` contiene:

- `parametros_2026`: tipos, bases, escala, límites y mínimos.
- `nominas[]`: entradas (`entradas`) y resultados esperados (`base_cotizacion_mes`, `ss`, `irpf.tipo`, `nomina_ordinaria.neto`, `coste_empresa_anual`…). En `app` está lo que da hoy `GE.calcNomina` con esas personas: sirve de prueba de regresión del desvío.
- `iva_trimestre`: líneas con su tipo y las casillas 27, 28-29, 30-31, 45 y 46 esperadas.
- `calendario[]` y `hallazgos[]` (id, estado, fichero:línea, impacto, fuente).

Prueba sugerida, `test/nominas-iva.mjs`: sembrar `DB.sales` y `DB.ge.*` con
las líneas de `iva_trimestre` y comprobar `GE.ivaLiquidarMes` sumado en
jul-sep = 2.412,00 (±0,05). Para cada nómina, cuando exista el cálculo desde el
bruto, comprobar el neto, la SS y el coste con tolerancia de 0,05 €. Hasta
entonces, `N5.app.A` (92.691,24) sirve para fijar que la base y la solidaridad
no se rompen.

---

## 9. Fuentes

- Orden PJC/297/2026, de cotización (BOE 31/03/2026, efectos 01/01/2026): bases mínima y máxima, tipos. Resumen en [laboral-social.com](https://www.laboral-social.com/node/30379) y [grupo2000.es](https://www.grupo2000.es/category/bases-y-tipos-de-cotizacion-2026/).
- MEI 0,90 % y solidaridad 1,15 / 1,25 / 1,46 % (RDL 2/2023, art. 19 bis LGSS): [BBVA Mi Jubilación](https://www.bbvamijubilacion.es/blog/cuota-de-solidaridad-2026-tramos-salariales-de-cotizacion-por-encima-de-la-base-maxima-y-tipos-aplicados/).
- SMI 2026, RD 126/2026 (1.221 €/mes × 14): [notariosyregistradores.com](https://www.notariosyregistradores.com/web/normas/concretas/salario-minimo-interprofesional-2026/).
- Algoritmo de retenciones 2026 de la AEAT (versiones del 09/09 y del 10/09/2026): [ALGORITMO_2026.pdf](https://www3.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/ALGORITMO_2026.pdf) y [Algoritmo Retenciones-2026_10sept.pdf](https://sede.agenciatributaria.gob.es/static_files/Sede/Programas_ayuda/Retenciones/2026/Algoritmo%20Retenciones-2026_10sept.pdf). Leído el texto completo: escala, art. 20, límites excluyentes, límite del 43 % y mínimos del 2 % y el 15 %.
- Bonos en el IVA: Resolución de la DGT de 28/12/2018 (BOE 31/12/2018), [fiscal-impuestos.com](https://www.fiscal-impuestos.com/tratamiento-bonos-convertibles-iva-resolucion-direccion-general-tributos-boe.html).
- LGSS (RDLeg 8/2015): arts. 147, 149, 151, 19 bis y 305. LIRPF: arts. 7.e, 20, 28.3, 42.3.a y 101. RIRPF: arts. 45, 78, 80-86. LIVA: arts. 75, 79, 84, 91 y 95. LGT: arts. 27, 198 y 199. LIS: art. 40. ET: arts. 16, 38 y 49.1.c. RD 1065/2007: arts. 31-35. V ALEH (estructura) y convenios provinciales de hostelería (tablas).

> Las cifras de los convenios provinciales (tablas, plus de transporte,
> valor de la manutención) cambian de una provincia a otra. En los
> ejemplos son inventadas a propósito. Lo que sí es norma de 2026 son los
> tipos, las bases y el algoritmo.
