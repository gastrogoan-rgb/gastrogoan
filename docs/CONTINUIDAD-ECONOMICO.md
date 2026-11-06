# Registro de continuidad — Auditoría económica y fiscal (encargo maestro del 6/11)

> Documento vivo. Si la sesión se corta, **empezar aquí**. Cada fase dice qué está hecho, qué no y qué decisiones se tomaron.
> Especificación completa: el mensaje «ENCARGO MAESTRO DEFINITIVO» del dueño (6/11). Resumen de sus reglas innegociables:
> resultados demostrables (nada aproximado presentado como definitivo), un único motor fiscal (sin lógica fiscal repartida),
> reglas con fuente normativa y vigencia (si no se puede verificar, no se presenta como certeza), no tocar datos reales,
> orden estricto de fases, y declarar con honestidad lo pendiente.

## Orden obligatorio de fases
1. Reconocimiento y auditoría · 2. Auditoría económica y fiscal · 3. Correcciones · 4. Verificación de la Cuenta de Resultados ·
5. Previsión de impuestos (mejorar la EXISTENTE, no sustituirla) · 6. Motor fiscal modular · 7. Validación de todo ·
8. Beneficio real vs. tesorería (SOLO tras validar 1-7) · 9. Integración y pruebas globales · 10. Auditoría final de regresión.

## Peticiones concretas del dueño sobre la Cuenta de Resultados (6/11)
- [x] Diseño nuevo (barra de periodo, chips, tarjetas) — `test/economia-resultados.mjs`.
- [x] Gráfica «Resultado mensual»: curva, resultado del mes al pasar el ratón (globo + titular), pestañas neto / antes de impuestos / ventas.
- [x] Notas largas fuera de la vista: botón «¿Cómo se calcula?» (con la explicación de la forma jurídica del negocio) y `?` por fila.
- [x] «Intereses de préstamos» explicado (concepto, por qué no es gasto la devolución, de dónde sale, caso real del negocio).
- [x] «Resultado antes de impuestos» y «Resultado neto» verificados con cifras hechas a mano (sociedad micro, reducida, tipo fijo, autónomo, CB) — `test/fiscal-independiente.mjs`.
- [~] IVA, IRPF y retenciones: IVA (tipo único), 111 verificados a mano; falta 115, IVA con varios tipos y anulaciones en la prueba independiente, y los regímenes especiales (ver «Pendiente de verificar»).
- [~] Variables por forma jurídica: autónomo (simplificada, normal, hijos, inicio de actividad, otras rentas), sociedad (micro, reducida, general, nueva, tipo fijo) y CB verificadas. **Cooperativa y módulos: sin verificar contra fuente oficial** → pendiente.
- [x] Mi Negocio: forma jurídica y régimen **bloqueados**, fijados desde el generador (alta y botón «⚖ Fiscal») — `test/fiscal-fijado.mjs`.
- [ ] Pasada por todo el bloque de Gestión Económica (Módulos pendiente de diseño; Ventas/Fijos/Variables/Tesorería/Equilibrio/Inversiones ya con diseño nuevo y pruebas).

## Estado de las pantallas de Gestión Económica (diseño nuevo)
| Pantalla | Estado |
|---|---|
| Ventas | Publicada (06/11 09:22) |
| Gastos fijos | Publicada (06/11 12:38) |
| Gastos variables | Publicada (06/11 12:54) |
| Tesorería | Publicada (06/11 13:46) |
| Punto de equilibrio | Publicada (06/11 13:46) |
| Inversiones | Publicada (06/11 13:46) |
| Cuenta de Resultados | Hecha y probada; publicando |
| Módulos | Diseño nuevo (6/11) |

## Registro de decisiones
- 6/11: el dueño pidió ser frugal con la sesión («no gastes tantísimo uso»). Se trabaja sin subagentes, con lecturas dirigidas y pruebas selectivas.
- 6/11: la conciliación bancaria sigue siendo manual (no hay integración bancaria; costaría por cliente).

## Errores detectados / corregidos
| # | Hallazgo | Estado |
|---|---|---|
| F-1 | **IRPF autónomo: las reducciones de 6.498 € y de 1.620 € se aplicaban las dos, una detrás de otra.** La AEAT (Manual práctico de Renta 2025) dice que la de 1.620 € solo se aplica si NO se cumplen los requisitos de la de 6.498 €. Regalaba hasta 1.620 € de reducción de más a todo autónomo pequeño (ej.: 16.000 € de rendimiento → salía ~153 € menos de IRPF). Además la de 1.620 € se medía con el rendimiento solo, no con las rentas totales (< 12.000 €). | **Corregido y probado** (`irpfActividad`) |
| F-2 | **IS de una sociedad sin tipo fijado**: se aplicaba a cualquier año el tipo «sugerido» calculado con los números del año EN CURSO (un año pasado salía con un tipo equivocado) y como % plano, sin los dos tramos de la microempresa. | **Corregido y probado** (`impuestoSociedades`: cuota exacta por tramos del año calculado) |
| F-3 | `TIPOS_IS` solo tenía 2026 y 2027 (2025 se calculaba con los de 2026; 2028 con erd 22 % cuando es 21 %; 2029+ con 22 % cuando es 20 %). | **Corregido** y verificado con la AEAT (Manual de Sociedades 2025, disp. trans. 44.ª LIS) |
| F-4 | La cuota de un préstamo metida como **gasto fijo** se cuenta ENTERA como gasto, devolución incluida. | **Corregido**: aviso en el propio formulario de Gastos fijos y chip «Préstamo: mejor en Inversiones» en la lista (`gfEsPrestamo`) |
| F-5 | **Territorio**: la escala del IRPF era la general (19–47 %) para todos. | **Corregido** para las 15 comunidades de régimen común y Ceuta/Melilla (escala estatal + autonómica 2025 verificada con la AEAT, fijada desde el generador y mostrada en Mi Negocio). **Foral** (Navarra, País Vasco): escala de webs de terceros, regla «pendiente», fiabilidad media; mínimo y reducciones estatales como aproximación. **Límite**: mínimo personal estatal. |
| F-6 | **Sin deducibilidad por gasto**: todo gasto cuenta al 100 % en la base fiscal y su IVA se deduce entero. No hay gastos no deducibles / parcialmente deducibles (atenciones a clientes, vehículo al 50 %, multas…) ni prorrata. El resultado contable y el fiscal son el mismo número. | **Pendiente** (diseño en motor fiscal) |
| F-7 | Tipos de **cooperativa** (`coopMicro`, `coopErd`, `coopNueva`) no contrastados con fuente oficial. | **Pendiente de verificar** (la app ya avisa de que la cooperativa necesita revisión de la gestoría) |
| F-8 | Años anteriores a 2025: `tiposIsAño` usa los de 2025. | **Documentado**: el motor lo declara (`ANTES-2025`) y la previsión baja a fiabilidad BAJA. Cargar reglas históricas queda pendiente. |

## Pendiente de verificar con fuente oficial (no se presenta como certeza)
- Modelo 130: tratamiento del 5 % de difícil justificación en los pagos fraccionados (hoy no se aplica en el 130; se aplica en el IRPF anual).
- Retención 115 (19 %) y su aplicación sobre alquiler con IVA / comunidades.
- Módulos: índices y límites de la Orden HAC/1425/2025 (ya hay prueba `fiscal-rapido` con casos de la AEAT; falta la pasada completa).
- Cooperativas (F-7). Régimen simplificado de IVA, recargo de equivalencia y criterio de caja: no implementados, y no se ofrecen.

## Fase 1 — Reconocimiento
(pendiente)


## Fase 5-6 — Motor fiscal y previsión de impuestos (6/11, hecho)
- `js/motor-fiscal.js` (cuarto sitio de alta ya hecho: build.sh, index.html, test/estatico.mjs, test/apple.mjs): catálogo `FISCAL_REGLAS` (id, descripción, fuente, referencia, vigencia, territorio, a quién aplica, estado `verificada` / `revisada` / `pendiente`), escalas del IRPF por territorio (`motorIrpfCuotaEscala`), `fiscalTrazaAnual` (el impuesto paso a paso con datos, reglas, avisos y nivel de fiabilidad), `fiscalPrevision` (obligaciones del trimestre con estado estimado / devengado / plazo pasado / presentado / pagado y comparación previsto-real) y `fiscalSimular` (simulación aparte).
- `irpfActividadDetalle` es la ÚNICA implementación del IRPF del autónomo (`irpfActividad` solo toma la cuota) y devuelve los pasos para la traza.
- Tesorería: la tarjeta «Pagos a Hacienda» la pinta el motor: importes con estado, fiabilidad, hora de actualización, avisos, «Ver cálculo», «Simular» y «Marcar» (presentado/pagado con importe real → `DB.ge.obligaciones`).
- Pruebas: `test/fiscal-motor.mjs` (11 casos, incl. escala de Cataluña a mano), `test/fiscal-independiente.mjs`.

## Fase 8 — Beneficio y caja (6/11, hecho, solo sobre cifras ya auditadas)
- Pestaña nueva «Beneficio y caja» (`renderBC`, js/hr.js): puente del resultado neto a la caja estimada (impuesto provisionado, amortización, variación de existencias, IVA, retenciones, devolución de préstamos, inversiones pagadas, préstamos recibidos, pagos a Hacienda registrados), dinero disponible de verdad a partir del saldo que escribe el usuario, razones por las que no coinciden (solo las que pesan), evolución mes a mes y previsión de liquidez a 30/60/90 días separando lo CONFIRMADO de lo ESTIMADO.
- No incluye (y la pantalla lo dice): vales regalo y señales de reservas, nóminas o facturas de proveedor aún sin pagar, SS del trabajador. Es una estimación: el extracto manda.
- Pruebas: `test/beneficio-caja.mjs` con las cuentas hechas a mano (caja de un mes = 11.000 − 605 − 1.700 = 8.695 €, con inversión, con préstamo y con un pago a Hacienda).

## Qué queda
- Manual de uso y tour: sin actualizar para Gestión Económica (capítulos en 3 idiomas; la prueba exige los mismos `<h4>`).
- Resto de comunidades autónomas; prorrata de IVA; cooperativas (F-7); régimen simplificado de IVA, recargo de equivalencia y criterio de caja (no implementados, no se ofrecen); 5 % de difícil justificación en el 130; reglas de ejercicios < 2025.
- Módulos (pestaña) sin diseño nuevo.
