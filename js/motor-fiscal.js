/* ============================================================
   MOTOR FISCAL (encargo maestro, fase 6)
   ============================================================
   UNA sola fuente para las reglas fiscales, con su fuente normativa, su vigencia y su estado de verificación, y
   para explicar CÓMO se ha llegado a cada cifra (trazabilidad). Las pantallas consultan este fichero y pintan su
   resultado; no llevan reglas propias.

   Qué hay aquí:
     · FISCAL_REGLAS .......... catálogo de reglas: id, qué dice, fuente, referencia, vigencia, territorio, a quién
                                aplica y si está VERIFICADA con fuente oficial, revisada por una gestoría, o pendiente.
     · Escalas del IRPF ....... estatal + autonómica por territorio (`motorIrpfCuotaEscala`).
     · fiscalTrazaAnual ....... el impuesto del año paso a paso: datos usados, reglas aplicadas, fórmula y avisos.
     · fiscalPrevision ........ obligaciones del trimestre (estimadas / devengadas / presentadas / pagadas) con
                                su fiabilidad, y la comparación entre lo previsto y lo real.
     · fiscalSimular .......... «¿y si…?»: SIMULACIÓN, nunca se mezcla con la previsión sobre datos reales.

   ⚠️ Regla de la casa: si una regla no se ha podido verificar, NO se presenta como certeza: sale «pendiente» y la
   previsión baja su fiabilidad. Las cifras que no se pueden justificar no se enseñan como definitivas.
   Los cálculos de dinero siguen viviendo en js/finance.js y js/hr.js (GE); este fichero decide QUÉ regla manda y
   explica el resultado. Prueba: test/fiscal-independiente.mjs (cifras hechas a mano) y test/fiscal-motor.mjs. */

const FISCAL_VERIFICADO_EN = '2026-11-06';
// estado: 'verificada' = contrastada con fuente oficial (AEAT/BOE) en la fecha indicada;
//         'revisada'   = la dio por buena una gestoría (revisión del 5/10) pero no se ha vuelto a contrastar con la fuente;
//         'pendiente'  = sin verificar: no se presenta como certeza.
const FISCAL_REGLAS = [
  {id:'IRPF-ESC-ESTATAL', concepto:'IRPF', descripcion:'Escala estatal de la base liquidable general: 9,5 / 12 / 15 / 18,5 / 22,5 / 24,5 % hasta 12.450 / 20.200 / 35.200 / 60.000 / 300.000 € y resto.',
    fuente:'AEAT · Manual práctico de Renta 2025, «Gravamen estatal»', referencia:'Ley 35/2006 (LIRPF) art. 63', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb'], estado:'verificada'},
  {id:'IRPF-ESC-CAT', concepto:'IRPF', descripcion:'Escala autonómica de Cataluña (2025): 9,5 / 12,5 / 16 / 19 / 21,5 / 23,5 / 24,5 / 25,5 % hasta 12.500 / 22.000 / 33.000 / 53.000 / 90.000 / 120.000 / 175.000 € y resto.',
    fuente:'AEAT · Manual práctico de Renta 2025, «Comunidad Autónoma de Cataluña»', referencia:'Decreto legislativo 1/2024 (Cataluña) art. 611-1; Decreto-ley 5/2025', desde:'2025-01-01', hasta:null, territorio:'cataluna', aplicaA:['autonomo','cb'], estado:'verificada',
    nota:'Verificada para el ejercicio 2025. Para 2026 se aplica la misma hasta confirmar que no cambia.'},
  {id:'IRPF-ESC-GENERAL', concepto:'IRPF', descripcion:'Escala general combinada de referencia (estatal + autonómica supletoria): 19 / 24 / 30 / 37 / 45 / 47 %. La usa quien no tiene comunidad fijada.',
    fuente:'Suma de la escala estatal (verificada) y una escala autonómica supletoria', referencia:'Ley 35/2006 art. 63 y 74', desde:'2025-01-01', hasta:null, territorio:'general', aplicaA:['autonomo','cb'], estado:'pendiente',
    nota:'La parte estatal está verificada; la parte autonómica supletoria no se ha contrastado con el texto oficial. Cada comunidad tiene la suya: las 15 de régimen común están cargadas y verificadas; elige la tuya.'},
  {id:'IRPF-MIN-PERSONAL', concepto:'IRPF', descripcion:'Mínimo personal del contribuyente: 5.550 €; por descendientes: 2.400 / 2.700 / 4.000 / 4.500 €.',
    fuente:'AEAT · «Mínimo del contribuyente»', referencia:'LIRPF art. 57 y 58', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb'], estado:'verificada',
    nota:'5.550 € verificado con la AEAT; algunas comunidades fijan otros importes (no cargados). Los de descendientes los dio por buenos la gestoría.'},
  {id:'IRPF-DIFICIL-5', concepto:'IRPF', descripcion:'Gastos de difícil justificación en estimación directa SIMPLIFICADA: 5 % del rendimiento, máximo 2.000 € al año.',
    fuente:'Revisión de una gestoría (5/10/2026)', referencia:'RIRPF art. 30.2.4.ª', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo'], estado:'revisada'},
  {id:'IRPF-RED-6498', concepto:'IRPF', descripcion:'Reducción de 6.498 € (rendimiento neto ≤ 14.047,50 €; baja 1,14 € por euro hasta 0 en 19.747,50 €) si las demás rentas no pasan de 6.500 €.',
    fuente:'AEAT · Manual práctico de Renta 2025, «Reducción trabajadores autónomos»', referencia:'LIRPF art. 32 (Ley 31/2022)', desde:'2023-01-01', hasta:null, territorio:'*', aplicaA:['autonomo'], estado:'verificada'},
  {id:'IRPF-RED-1620', concepto:'IRPF', descripcion:'Reducción de 1.620 € (rentas totales ≤ 8.000 €; baja 0,405 por euro hasta 12.000 €). ALTERNATIVA a la de 6.498 €: solo si no se cumplen sus requisitos.',
    fuente:'AEAT · Manual práctico de Renta 2025, «Reducción para contribuyentes con rentas no exentas inferiores a 12.000 euros»', referencia:'LIRPF art. 32.2.3.º', desde:'2023-01-01', hasta:null, territorio:'*', aplicaA:['autonomo'], estado:'verificada'},
  {id:'IRPF-INICIO-20', concepto:'IRPF', descripcion:'Reducción del 20 % del rendimiento neto positivo (hasta 100.000 €) el primer año con beneficio y el siguiente. Solo si el titular lo marca.',
    fuente:'AEAT · «Reducción en el rendimiento neto por inicio de una actividad económica»', referencia:'LIRPF art. 32.3', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo'], estado:'verificada'},
  {id:'IS-TIPOS', concepto:'Impuesto sobre Sociedades', descripcion:'Tipos por tramos: microempresas (INCN < 1 M€) 21/22 % en 2025, 19/21 % en 2026, 17/20 % desde 2027; reducida dimensión 24/23/22/21/20 % (2025-2029); nueva creación 15 %; general 25 %.',
    fuente:'AEAT · Manual práctico de Sociedades 2025, «Tipos de gravamen»', referencia:'LIS art. 29 y disp. trans. 44.ª (Ley 7/2024)', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['sociedad'], estado:'verificada'},
  {id:'IS-COOP', concepto:'Impuesto sobre Sociedades', descripcion:'Cooperativa fiscalmente protegida: excedente menos dotación al FEP y 50 % del FRO; tipo del art. 29.1 LIS menos 3 puntos (máx. 20 %): 18/19 % microempresa 2025, 16/18 % en 2026, 14/17 % desde 2027, 20 % general; nueva creación 12 %; y bonificación del 50 % de la cuota si es especialmente protegida.',
    fuente:'AEAT · Manual práctico de Sociedades 2025, «Tipos de gravamen» y «Cuota íntegra previa» (cooperativas); BOE · Ley 20/1990, arts. 16.5, 24 y 34.2', referencia:'Ley 20/1990 y LIS art. 29', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['cooperativa'], estado:'verificada',
    nota:'Verificada para fiscalmente protegidas, resultados cooperativos, 2025-2028 (2029 derivado de la misma regla). NO separa los resultados extracooperativos (tipo del art. 29.1), ni cubre cooperativas de crédito ni no protegidas.'},
  {id:'IVA-GENERAL', concepto:'IVA', descripcion:'IVA a liquidar = repercutido − soportado deducible; se declara por trimestre (303) hasta el día 20 del mes siguiente (30 de enero el 4.º). Saldo a favor: se compensa en el año y se devuelve en el 4.º.',
    fuente:'Revisión de una gestoría (5/10/2026)', referencia:'LIVA arts. 75-99; Orden HAC', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb','sociedad','cooperativa'], estado:'revisada'},
  {id:'IVA-MODULOS', concepto:'IVA', descripcion:'En módulos (régimen simplificado) el IVA sale de la cuota del régimen, no de lo vendido.',
    fuente:'BOE · Orden HAC/1425/2025 (módulos 2026); casos de la AEAT en test/fiscal-rapido.mjs', referencia:'Orden HAC/1425/2025', desde:'2026-01-01', hasta:'2026-12-31', territorio:'*', aplicaA:['autonomo'], estado:'revisada'},
  {id:'RET-111', concepto:'Retenciones', descripcion:'IRPF retenido a empleados y profesionales (111): trimestral, hasta el día 20 del mes siguiente (20 de enero el 4.º).',
    fuente:'Revisión de una gestoría (5/10/2026); retención del trabajador: algoritmo AEAT 2026', referencia:'RIRPF arts. 80-101', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb','sociedad','cooperativa'], estado:'revisada'},
  {id:'RET-115', concepto:'Retenciones', descripcion:'Retención del 19 % sobre el alquiler del local (115), si el arrendador es persona física o sociedad no exenta.',
    fuente:'Revisión de una gestoría (5/10/2026)', referencia:'LIRPF art. 101.8; RIRPF art. 75', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb','sociedad','cooperativa'], estado:'revisada'},
  {id:'PF-130', concepto:'Pagos fraccionados', descripcion:'Modelo 130 (autónomo en directa): 20 % del rendimiento acumulado del año menos lo ya pagado y la deducción por rendimientos bajos del año anterior.',
    fuente:'Revisión de una gestoría (5/10/2026)', referencia:'RIRPF art. 110', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo'], estado:'revisada',
    nota:'Pendiente de contrastar el tratamiento del 5 % de difícil justificación dentro del propio 130 (hoy no se aplica en el pago fraccionado).'},
  {id:'PF-202', concepto:'Pagos fraccionados', descripcion:'Modelo 202 (sociedad): 18 % de la cuota del último Impuesto de Sociedades, en abril, octubre y diciembre.',
    fuente:'Revisión de una gestoría (5/10/2026)', referencia:'LIS art. 40.2', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['sociedad'], estado:'revisada'},
  {id:'DEDUC-USUARIO', concepto:'Deducibilidad', descripcion:'La deducibilidad de cada gasto (total, parcial, no deducible, pendiente) la fija el usuario con su gestoría; la app no decide qué es deducible.',
    fuente:'Decisión de diseño: no se inventan porcentajes sin justificación normativa', referencia:'LIRPF art. 28; LIS art. 15; LIVA arts. 95-96', desde:'2025-01-01', hasta:null, territorio:'*', aplicaA:['autonomo','cb','sociedad','cooperativa'], estado:'revisada'},
  {id:'ANTES-2025', concepto:'Ejercicios anteriores', descripcion:'Las reglas cargadas empiezan en el ejercicio 2025. Un ejercicio anterior se calcula con las de 2025 y NO es fiable.',
    fuente:'Limitación conocida', referencia:'—', desde:null, hasta:'2024-12-31', territorio:'*', aplicaA:['autonomo','cb','sociedad','cooperativa'], estado:'pendiente'}
];
function fiscalRegla(id){ return FISCAL_REGLAS.find(r => r.id === id) || null; }
function fiscalReglasVigentes(fecha, forma, territorio){
  const f = fecha || new Date().toISOString().slice(0, 10);
  return FISCAL_REGLAS.filter(r => (!r.desde || r.desde <= f) && (!r.hasta || r.hasta >= f)
    && (!forma || r.aplicaA.includes(forma))
    && (r.territorio === '*' || !territorio || r.territorio === territorio));
}
const FISCAL_ESTADO_TXT = {
  verificada: () => gl({es:'Verificada con fuente oficial', ca:'Verificada amb font oficial', en:'Verified against an official source'}),
  revisada:   () => gl({es:'Revisada por una gestoría', ca:'Revisada per una gestoria', en:'Reviewed by an accountant'}),
  pendiente:  () => gl({es:'Pendiente de verificar', ca:'Pendent de verificar', en:'Pending verification'})
};

/* ---------- Territorio y escalas del IRPF ---------- */
/* Escalas AUTONÓMICAS de 2025 (régimen común), copiadas del Manual práctico de Renta 2025 de la AEAT
   («Gravamen autonómico», una página por comunidad, consultadas el 6/11/2026). Cada fila es [desde, tipo %]:
   el tipo vale desde esa base hasta el «desde» de la fila siguiente. Se contrastaron con la columna de cuota
   íntegra de la propia tabla (p. ej. 12.450 × 9 % = 1.120,50 en Asturias), porque el texto de la página no dice
   por sí solo si la base es el principio o el final del tramo. Navarra y País Vasco (régimen foral) tienen su
   propia hacienda: sus escalas van aparte (`IRPF_ESCALAS_FORALES`) y NO están contrastadas con fuente oficial. */
const IRPF_ESCALAS_AUTONOMICAS = {
  andalucia:   {nombre:() => gl({es:'Andalucía', ca:'Andalusia', en:'Andalusia'}), ref:'Normativa de Andalucía (escala 2025)',
    filas:[[0,9.5],[13000,12],[21100,15],[35200,18.5],[60000,22.5]]},
  aragon:      {nombre:() => gl({es:'Aragón', ca:'Aragó', en:'Aragon'}), ref:'Normativa de Aragón (escala 2025)',
    filas:[[0,9.5],[13072.5,12],[21210,15],[36960,18.5],[52500,20.5],[60000,23],[80000,24],[90000,25],[130000,25.5]]},
  asturias:    {nombre:() => gl({es:'Principado de Asturias', ca:'Principat d\'Astúries', en:'Asturias'}), ref:'Ley 3/2025 (Asturias)',
    filas:[[0,9],[12450,12],[17707.2,14],[33007.2,19.2],[53407.2,21.5],[70000,22.5],[90000,25],[175000,26]]},
  baleares:    {nombre:() => gl({es:'Illes Balears', ca:'Illes Balears', en:'Balearic Islands'}), ref:'Normativa de las Illes Balears (escala 2025)',
    filas:[[0,9],[10000,11.25],[18000,14.25],[30000,17.5],[48000,19],[70000,21.75],[90000,22.75],[120000,23.75],[175000,24.75]]},
  canarias:    {nombre:() => gl({es:'Canarias', ca:'Canàries', en:'Canary Islands'}), ref:'D. Leg. 1/2009 art. 18 bis; Ley 9/2025 (Canarias)',
    filas:[[0,9],[13748,11.5],[19422,14],[35924,18.5],[57566,23.5],[93268,25],[123745,26]]},
  cantabria:   {nombre:() => gl({es:'Cantabria', ca:'Cantàbria', en:'Cantabria'}), ref:'Normativa de Cantabria (escala 2025)',
    filas:[[0,8.5],[13000,11],[21000,14.5],[35200,18],[60000,22.5],[90000,24.5]]},
  clm:         {nombre:() => gl({es:'Castilla-La Mancha', ca:'Castella-la Manxa', en:'Castilla-La Mancha'}), ref:'Normativa de Castilla-La Mancha (escala 2025)',
    filas:[[0,9.5],[12450,12],[20200,15],[35200,18.5],[60000,22.5]]},
  cyl:         {nombre:() => gl({es:'Castilla y León', ca:'Castella i Lleó', en:'Castile and León'}), ref:'Normativa de Castilla y León (escala 2025)',
    filas:[[0,9],[12450,12],[20200,14],[35200,18.5],[53407.2,21.5]]},
  extremadura: {nombre:() => gl({es:'Extremadura', ca:'Extremadura', en:'Extremadura'}), ref:'Normativa de Extremadura (escala 2025)',
    filas:[[0,8],[12450,10],[20200,16],[24200,17.5],[35200,21],[60000,23.5],[80200,24],[99200,24.5],[120200,25]]},
  galicia:     {nombre:() => gl({es:'Galicia', ca:'Galícia', en:'Galicia'}), ref:'D. Leg. 1/2011 art. 4 (Galicia)',
    filas:[[0,9],[12985.35,11.65],[21068.6,14.9],[35200,18.4],[60000,22.5]]},
  madrid:      {nombre:() => gl({es:'Comunidad de Madrid', ca:'Comunitat de Madrid', en:'Community of Madrid'}), ref:'D. Leg. 1/2010 art. 1 (Madrid)',
    filas:[[0,8.5],[13362.22,10.7],[19004.63,12.8],[35425.68,17.4],[57320.4,20.5]]},
  murcia:      {nombre:() => gl({es:'Región de Murcia', ca:'Regió de Múrcia', en:'Region of Murcia'}), ref:'Normativa de la Región de Murcia (escala 2025)',
    filas:[[0,9.5],[12450,11.2],[20200,13.3],[34000,17.9],[60000,22.5]]},
  rioja:       {nombre:() => gl({es:'La Rioja', ca:'La Rioja', en:'La Rioja'}), ref:'Ley 10/2017 art. 31 (La Rioja); Ley 13/2023',
    filas:[[0,8],[12450,10.6],[20200,13.6],[35200,17.8],[40000,18.3],[50000,19],[60000,24.5],[120000,27]]},
  valencia:    {nombre:() => gl({es:'Comunitat Valenciana', ca:'Comunitat Valenciana', en:'Valencian Community'}), ref:'Normativa de la Comunitat Valenciana (escala 2025)',
    filas:[[0,9],[12000,12],[22000,15],[32000,17.5],[42000,20],[52000,22.5],[62000,25],[72000,26.5],[100000,27.5],[150000,28.5],[200000,29.5]]}
};
// De «desde, tipo» a «hasta, tipo», que es lo que recorre irpfCuotaTramos.
function irpfTramosDesdeInicios(filas){ return filas.map((f, i) => [i + 1 < filas.length ? filas[i + 1][0] : Infinity, f[1]]); }
const IRPF_ESCALAS_AUTONOMICAS_TRAMOS = {};
Object.keys(IRPF_ESCALAS_AUTONOMICAS).forEach(k => { IRPF_ESCALAS_AUTONOMICAS_TRAMOS[k] = irpfTramosDesdeInicios(IRPF_ESCALAS_AUTONOMICAS[k].filas); });

const FISCAL_TERRITORIOS = {
  general:  () => gl({es:'Sin comunidad elegida (escala general de referencia)', ca:'Sense comunitat triada (escala general de referència)', en:'No region chosen (reference general scale)'}),
  cataluna: () => gl({es:'Cataluña', ca:'Catalunya', en:'Catalonia'}),
  ceuta_melilla: () => gl({es:'Ceuta y Melilla', ca:'Ceuta i Melilla', en:'Ceuta and Melilla'}),
  navarra:  () => gl({es:'Navarra (régimen foral)', ca:'Navarra (règim foral)', en:'Navarre (foral regime)'}),
  pais_vasco: () => gl({es:'País Vasco (régimen foral)', ca:'País Basc (règim foral)', en:'Basque Country (foral regime)'})
};
Object.keys(IRPF_ESCALAS_AUTONOMICAS).forEach(k => { FISCAL_TERRITORIOS[k] = IRPF_ESCALAS_AUTONOMICAS[k].nombre; });

const IRPF_ESCALA_ESTATAL = [[12450,9.5],[20200,12],[35200,15],[60000,18.5],[300000,22.5],[Infinity,24.5]];
const IRPF_ESCALA_CATALUNA = [[12500,9.5],[22000,12.5],[33000,16],[53000,19],[90000,21.5],[120000,23.5],[175000,24.5],[Infinity,25.5]];
// Ceuta y Melilla: sin escala propia, rige la supletoria del art. 65 LIRPF (AEAT, «Especialidad de la escala autonómica»).
const IRPF_ESCALA_SUPLETORIA = [[12450,9.5],[20200,12],[35200,15],[60000,18.5],[Infinity,22.5]];
// Régimen FORAL: la hacienda foral aplica UNA sola escala (no hay estatal + autonómica). Escalas de 2025 copiadas de webs de
// terceros (Taxdown para Navarra, Billeo para Gipuzkoa); NO se pudo abrir la fuente oficial (Hacienda de Navarra, BOG, BOB, BOTHA),
// así que las reglas van como «pendiente de verificar». País Vasco usa la de Gipuzkoa: Bizkaia y Álava pueden diferir en pocos euros.
const IRPF_ESCALAS_FORALES = {
  navarra:    [[4458,13],[10030,22],[21175,25],[35663,28],[51266,36.5],[66869,41.5],[89159,44],[139310,47],[195034,49],[334344,50.5],[Infinity,52]],
  pais_vasco: [[17720,23],[35440,28],[53160,35],[75910,40],[105130,45],[140130,46],[204270,47],[Infinity,49]]
};
// Escala general COMBINADA (estatal + autonómica supletoria): la que usaba la app antes de tener territorio.
const IRPF_ESCALA_GENERAL = [[12450,19],[20200,24],[35200,30],[60000,37],[300000,45],[Infinity,47]];
function irpfCuotaTramos(base, tramos){
  let cuota = 0, desde = 0;
  for(const [hasta, pct] of tramos){
    if(base <= desde) break;
    cuota += (Math.min(base, hasta) - desde) * pct / 100;
    desde = hasta;
  }
  return cuota;
}
// Cuota íntegra por la escala del territorio: la estatal MÁS la autonómica de la comunidad (cada una con sus propios tramos).
function motorIrpfCuotaEscala(base, territorio){
  if(!(base > 0)) return 0;
  if(territorio === 'cataluna') return irpfCuotaTramos(base, IRPF_ESCALA_ESTATAL) + irpfCuotaTramos(base, IRPF_ESCALA_CATALUNA);
  if(territorio === 'ceuta_melilla') return irpfCuotaTramos(base, IRPF_ESCALA_ESTATAL) + irpfCuotaTramos(base, IRPF_ESCALA_SUPLETORIA);
  if(IRPF_ESCALAS_FORALES[territorio]) return irpfCuotaTramos(base, IRPF_ESCALAS_FORALES[territorio]);
  if(IRPF_ESCALAS_AUTONOMICAS_TRAMOS[territorio]) return irpfCuotaTramos(base, IRPF_ESCALA_ESTATAL) + irpfCuotaTramos(base, IRPF_ESCALAS_AUTONOMICAS_TRAMOS[territorio]);
  return irpfCuotaTramos(base, IRPF_ESCALA_GENERAL);
}
// Orden para los desplegables: «sin comunidad» primero y el resto por nombre.
function fiscalTerritoriosLista(){
  const ks = Object.keys(FISCAL_TERRITORIOS).filter(k => k !== 'general');
  ks.sort((a, b) => FISCAL_TERRITORIOS[a]().localeCompare(FISCAL_TERRITORIOS[b](), localeActual()));
  return ['general', ...ks];
}
function territorioFiscal(){ const t = (DB && DB.business && DB.business.territorio) || 'general'; return FISCAL_TERRITORIOS[t] ? t : 'general'; }
function fiscalReglaEscalaId(){
  const t = territorioFiscal();
  if(t === 'cataluna') return 'IRPF-ESC-CAT';
  if(t === 'ceuta_melilla') return 'IRPF-ESC-CEUTA-MELILLA';
  if(IRPF_ESCALAS_AUTONOMICAS[t]) return 'IRPF-ESC-' + t.toUpperCase();
  if(IRPF_ESCALAS_FORALES[t]) return 'IRPF-ESC-' + t.toUpperCase();
  return 'IRPF-ESC-GENERAL';
}
// Una regla por comunidad, generada de la tabla de arriba para que descripción y cálculo no se separen nunca.
(function(){
  const num = v => v.toLocaleString('es-ES', {maximumFractionDigits: 2});
  Object.keys(IRPF_ESCALAS_AUTONOMICAS).forEach(k => {
    const e = IRPF_ESCALAS_AUTONOMICAS[k];
    FISCAL_REGLAS.push({id:'IRPF-ESC-' + k.toUpperCase(), concepto:'IRPF',
      descripcion:'Escala autonómica 2025 (' + e.nombre() + '): ' + e.filas.map(f => num(f[1])).join(' / ') + ' % desde ' + e.filas.map(f => num(f[0])).join(' / ') + ' € de base liquidable.',
      fuente:'AEAT · Manual práctico de Renta 2025, «Gravamen autonómico» (' + e.nombre() + ')', referencia:e.ref, desde:'2025-01-01', hasta:null, territorio:k, aplicaA:['autonomo','cb'], estado:'verificada',
      nota:'Verificada para el ejercicio 2025 contra la cuota íntegra de la propia tabla de la AEAT. Para 2026 se aplica la misma hasta confirmar que no cambia. Usa el mínimo personal estatal.'});
  });
  FISCAL_REGLAS.push({id:'IRPF-ESC-CEUTA-MELILLA', concepto:'IRPF', descripcion:'Ceuta y Melilla: sin escala autonómica propia, rige la supletoria del art. 65 LIRPF (9,5 / 12 / 15 / 18,5 / 22,5 %) sumada a la estatal.',
    fuente:'AEAT · Manual práctico de Renta 2025, «Especialidad de la escala autonómica»', referencia:'LIRPF disp. adic. 32.ª y art. 65', desde:'2025-01-01', hasta:null, territorio:'ceuta_melilla', aplicaA:['autonomo','cb'], estado:'verificada',
    nota:'La escala está verificada, pero NO se aplica la deducción por rentas obtenidas en Ceuta y Melilla (LIRPF art. 68.4), que puede reducir mucho la cuota: consúltala con tu gestoría.'});
  [['navarra', 'Navarra', 'Ley Foral 22/1998 (Texto Refundido de la LFIRPF), art. 59', 'Taxdown (resumen de Navarra, escala 2025-2026)', '13 / 22 / 25 / 28 / 36,5 / 41,5 / 44 / 47 / 49 / 50,5 / 52 % hasta 4.458 / 10.030 / 21.175 / 35.663 / 51.266 / 66.869 / 89.159 / 139.310 / 195.034 / 334.344 € y resto.'],
   ['pais_vasco', 'País Vasco', 'Normas Forales del IRPF de Álava, Bizkaia (NF 13/2013 art. 75) y Gipuzkoa (NF 3/2014)', 'Billeo (escala 2025 de Gipuzkoa); Guiafiscal para Bizkaia', '23 / 28 / 35 / 40 / 45 / 46 / 47 / 49 % hasta 17.720 / 35.440 / 53.160 / 75.910 / 105.130 / 140.130 / 204.270 € y resto (la de Gipuzkoa; Bizkaia y Álava pueden diferir en pocos euros).']].forEach(([k, nom, ref, fuente, desc]) => {
    FISCAL_REGLAS.push({id:'IRPF-ESC-' + k.toUpperCase(), concepto:'IRPF', descripcion:'Escala foral 2025 (' + nom + '): ' + desc,
      fuente:fuente + ' · NO se pudo abrir la fuente oficial', referencia:ref, desde:'2025-01-01', hasta:null, territorio:k, aplicaA:['autonomo','cb'], estado:'pendiente',
      nota:'Escala copiada de páginas de terceros: pendiente de contrastar con el texto oficial. En régimen foral las reducciones, el mínimo y las deducciones son las forales; aquí se usan las estatales como aproximación.'});
  });
})();

/* ---------- Obligaciones: presentadas / pagadas (lo marca el usuario) ---------- */
function fiscalObligaciones(){ if(!DB.ge) DB.ge = {}; if(!DB.ge.obligaciones) DB.ge.obligaciones = {}; return DB.ge.obligaciones; }
function fiscalClave(año, q, modelo){ return `${año}-T${q + 1}:${modelo}`; }

/* ---------- Fecha de vencimiento (dd/mm/aaaa) ---------- */
function fiscalPct(v){ return (Math.round((parseFloat(v) || 0) * 10) / 10).toLocaleString(localeActual(), {minimumFractionDigits:0, maximumFractionDigits:1}); }
function fiscalVence(q, año, modelo){
  if(modelo === '303' || modelo === '130' || modelo === '131') return q < 3 ? `20/${String((q+1)*3+1).padStart(2,'0')}/${año}` : `30/01/${año+1}`;
  if(modelo === '111' || modelo === '115' || modelo === '123') return q < 3 ? `20/${String((q+1)*3+1).padStart(2,'0')}/${año}` : `20/01/${año+1}`;
  return '';
}
function fiscalDiasHasta(dmy){
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(dmy || ''); if(!m) return null;
  return Math.ceil((new Date(+m[3], +m[2]-1, +m[1], 23, 59) - new Date()) / 864e5);
}

/* ============================================================
   TRAZABILIDAD: el impuesto del año, paso a paso
   ============================================================ */
function fiscalNivelDe(motivos){ return motivos.some(m => m.nivel === 'baja') ? 'baja' : motivos.some(m => m.nivel === 'media') ? 'media' : 'alta'; }
function fiscalTrazaAnual(año){
  año = año || new Date().getFullYear();
  const p = fiscalPerfil(), b = DB.business || {}, hoy = new Date();
  const enCurso = año === hoy.getFullYear();
  const L = o => gl(o);
  const suma = f => { let s = 0; for(let m = 0; m < 12; m++) s += f(m); return s; };
  const mesesConDatos = [0,1,2,3,4,5,6,7,8,9,10,11].filter(m => geMesConActividad(año, m) && (GE.facturacionNetaMes(m, año) > 0 || GE.totalVariablesNetoMes(m, año) > 0)).length;
  const baseCont = suma(m => GE.resultadoAntesImpMes(m, año));
  const ajuste = suma(m => geAjusteFiscalMes(año, m));
  const baseFiscal = baseCont + ajuste;
  const proyectada = enCurso ? GE.baseAnualEstimada(año) : baseFiscal;
  const perdidas = GE.perdidasCompensables(año);
  const baseImp = Math.max(0, proyectada - perdidas);
  const opts = GE.optsImpuesto(año);
  const T = {año, forma: p.forma || '', regimen: p.modulos ? 'modulos' : (b.regimenFiscal || ''), modalidad: b.modalidadDirecta || 'simplificada', territorio: territorioFiscal(),
    pasos: [], reglas: [], avisos: [], motivos: [], actualizado: new Date().toISOString(), enCurso, mesesConDatos,
    baseCont, ajuste, baseFiscal, proyectada, perdidas, baseImp, impuestoAnual: 0, provisionadoHoy: suma(m => GE.impuestoMes(m, año)), tipoEfectivo: 0, porRevisar: geGastosPorRevisar(año)};
  const paso = (et, v, regla) => { T.pasos.push({et, v, regla: regla || null}); if(regla && !T.reglas.includes(regla)) T.reglas.push(regla); };
  paso(L({es:'Resultado contable antes de impuestos (suma de los 12 meses)', ca:'Resultat comptable abans d\'impostos (suma dels 12 mesos)', en:'Accounting result before tax (sum of 12 months)'}), baseCont);
  if(Math.abs(ajuste) > 0.005) paso(L({es:'Más: parte NO deducible de los gastos', ca:'Més: part NO deduïble de les despeses', en:'Plus: non-deductible part of expenses'}), ajuste, 'DEDUC-USUARIO');
  paso(L({es:'Base fiscal del año', ca:'Base fiscal de l\'any', en:'Tax base for the year'}), baseFiscal);
  if(enCurso) paso(L({es:'Proyectada a 12 meses (lo que llevas, a ritmo de año completo)', ca:'Projectada a 12 mesos (el que portes, a ritme d\'any complet)', en:'Projected to 12 months (year to date, at a full-year pace)'}), proyectada);
  if(perdidas > 0.005) paso(L({es:'Menos: pérdidas de años anteriores que aún se pueden compensar', ca:'Menys: pèrdues d\'anys anteriors que encara es poden compensar', en:'Less: prior-year losses still offsettable'}), -perdidas);
  paso(L({es:'Base sobre la que se calcula el impuesto', ca:'Base sobre la qual es calcula l\'impost', en:'Base the tax is computed on'}), baseImp);
  if(p.modulos){
    const r = GE.calcModulos(año);
    T.impuestoAnual = r ? irpfActividad(r.rendimientoAnual, {sinDificilJustificacion:true}) : 0;
    paso(L({es:'IRPF por módulos (sobre el rendimiento de los módulos, no sobre lo ganado)', ca:'IRPF per mòduls (sobre el rendiment dels mòduls, no sobre el guanyat)', en:'Income tax under modules (on the module yield, not on profit)'}), T.impuestoAnual, 'IVA-MODULOS');
  } else if(p.forma === 'autonomo'){
    const d = irpfActividadDetalle(baseImp);
    d.pasos.slice(1).forEach(x => paso(x.et, x.v, x.regla));
    T.impuestoAnual = d.cuota;
  } else if(p.forma === 'cb'){
    T.impuestoAnual = impuestoAnual(baseImp, opts);
    paso(L({es:'IRPF de cada comunero por su parte (suma)', ca:'IRPF de cada comuner per la seva part (suma)', en:'Each member\'s income tax on their share (sum)'}), T.impuestoAnual, fiscalReglaEscalaId());
  } else if(p.forma === 'sociedad'){
    const cfg = (DB.ge.config || {}).pctImpuestoBeneficio;
    T.impuestoAnual = impuestoAnual(baseImp, opts);
    if(cfg != null) paso(L({es:`Impuesto de Sociedades al ${cfg} % (tipo fijado a mano)`, ca:`Impost de Societats al ${cfg} % (tipus fixat a mà)`, en:`Corporate tax at ${cfg} % (rate set by hand)`}), T.impuestoAnual);
    else {
      const tipo = opts.nuevaCreacion ? L({es:'nueva creación (15 %)', ca:'nova creació (15 %)', en:'new company (15 %)'}) : (opts.incnAnterior != null && opts.incnAnterior < 1e6) ? L({es:'microempresa (por tramos)', ca:'microempresa (per trams)', en:'micro-company (stepped)'}) : (opts.incnAnterior != null && opts.incnAnterior <= 1e7) ? L({es:'reducida dimensión', ca:'reduïda dimensió', en:'small company'}) : L({es:'general (25 %)', ca:'general (25 %)', en:'general (25 %)'});
      paso(L({es:`Impuesto de Sociedades ${año}: tipo ${tipo}`, ca:`Impost de Societats ${año}: tipus ${tipo}`, en:`Corporate tax ${año}: ${tipo} rate`}), T.impuestoAnual, 'IS-TIPOS');
    }
  } else if(p.forma === 'cooperativa'){
    T.impuestoAnual = impuestoAnual(baseImp, opts);
    paso(L({es:'Impuesto de la cooperativa (régimen propio)', ca:'Impost de la cooperativa (règim propi)', en:'Cooperative tax (own regime)'}), T.impuestoAnual, 'IS-COOP');
  }
  T.tipoEfectivo = baseImp > 0 ? T.impuestoAnual / baseImp : 0;
  // Fiabilidad: cada motivo rebaja el nivel, y se dice cuál.
  const M = (nivel, txt) => T.motivos.push({nivel, txt});
  if(!p.forma) M('baja', L({es:'Falta la forma jurídica del negocio: el impuesto no se puede calcular con fiabilidad.', ca:'Falta la forma jurídica del negoci: l\'impost no es pot calcular amb fiabilitat.', en:'The legal form is missing: tax cannot be reliably computed.'}));
  if(p.forma === 'cooperativa') M('media', L({es:'Cooperativa: se supone fiscalmente protegida y todo el excedente como cooperativo. Los resultados extracooperativos (al tipo general) y las cooperativas de crédito o no protegidas los ajusta tu gestoría.', ca:'Cooperativa: se suposa fiscalment protegida i tot l\'excedent com a cooperatiu. Els resultats extracooperatius (al tipus general) i les cooperatives de crèdit o no protegides els ajusta la teva gestoria.', en:'Cooperative: assumed tax-protected with the whole surplus as cooperative. Extra-cooperative results (at the general rate) and credit or non-protected cooperatives are adjusted by your accountant.'}));
  if(año < 2025) M('baja', L({es:'Las reglas cargadas empiezan en 2025: un ejercicio anterior no es fiable.', ca:'Les regles carregades comencen el 2025: un exercici anterior no és fiable.', en:'Loaded rules start in 2025: an earlier year is not reliable.'}));
  if(mesesConDatos === 0) M('baja', L({es:'Todavía no hay ventas ni compras en este ejercicio.', ca:'Encara no hi ha vendes ni compres en aquest exercici.', en:'There are no sales or purchases in this year yet.'}));
  else if(enCurso && mesesConDatos < 3) M('media', L({es:`Solo hay ${mesesConDatos} mes(es) con datos: la proyección a 12 meses es muy poco precisa.`, ca:`Només hi ha ${mesesConDatos} mes(os) amb dades: la projecció a 12 mesos és molt poc precisa.`, en:`Only ${mesesConDatos} month(s) of data: the 12-month projection is very rough.`}));
  if(enCurso && mesesConDatos > 0) M('media', L({es:'El ejercicio sigue abierto: es una estimación y el mes en curso está incompleto.', ca:'L\'exercici continua obert: és una estimació i el mes en curs està incomplet.', en:'The year is still open: this is an estimate and the current month is incomplete.'}));
  if(T.porRevisar > 0) M('media', L({es:`Hay ${T.porRevisar} gasto(s) «pendiente(s) de revisar»: cuentan como deducibles. Si alguno no lo es, el impuesto subirá.`, ca:`Hi ha ${T.porRevisar} despesa(es) «pendent(s) de revisar»: compten com a deduïbles. Si alguna no ho és, l'impost pujarà.`, en:`${T.porRevisar} expense(s) are «pending review»: they count as deductible. If any is not, tax will rise.`}));
  if((p.forma === 'autonomo' || p.forma === 'cb') && !p.modulos){
    if(T.territorio === 'general') M('media', L({es:'No hay comunidad autónoma elegida: se usa una escala general de referencia. Pídele a GastroGoan que fije tu comunidad en el alta.', ca:'No hi ha comunitat autònoma triada: es fa servir una escala general de referència. Demana a GastroGoan que fixi la teva comunitat a l\'alta.', en:'No region is set: a reference general scale is used. Ask GastroGoan to set your region at sign-up.'}));
    else if(IRPF_ESCALAS_FORALES[T.territorio]) M('media', L({es:'Régimen foral: la escala foral no está contrastada con el texto oficial y el mínimo, las reducciones y las deducciones son las forales; aquí se usan las estatales como aproximación. Confírmalo con tu gestoría.', ca:'Règim foral: l\'escala foral no està contrastada amb el text oficial i el mínim, les reduccions i les deduccions són les forals; aquí es fan servir les estatals com a aproximació. Confirma-ho amb la teva gestoria.', en:'Foral regime: the foral scale is not checked against the official text and the allowance, reductions and deductions are the foral ones; the state ones are used here as an approximation. Confirm with your accountant.'}));
    else M('media', L({es:'Se usa el mínimo personal estatal (5.550 €): algunas comunidades fijan otro importe, lo que mueve la cuota unos pocos euros.', ca:'Es fa servir el mínim personal estatal (5.550 €): algunes comunitats en fixen un altre, cosa que mou la quota uns pocs euros.', en:'The state personal allowance (€5,550) is used: some regions set another amount, which moves the tax by a few euros.'}));
    if(T.territorio === 'ceuta_melilla') M('media', L({es:'No se aplica la deducción por rentas obtenidas en Ceuta y Melilla (art. 68.4 LIRPF): puede bajar mucho la cuota.', ca:'No s\'aplica la deducció per rendes obtingudes a Ceuta i Melilla (art. 68.4 LIRPF): pot baixar molt la quota.', en:'The deduction for income earned in Ceuta and Melilla (art. 68.4 LIRPF) is not applied: it can lower the tax a lot.'}));
  }
  if((p.forma === 'autonomo' || p.forma === 'cb') && !p.modulos) M('media', L({es:'El IRPF real depende de TODAS tus rentas y circunstancias personales: esta cifra solo mira la actividad (más las otras rentas e hijos que hayas indicado).', ca:'L\'IRPF real depèn de TOTES les teves rendes i circumstàncies personals: aquesta xifra només mira l\'activitat (més les altres rendes i fills que hagis indicat).', en:'Real income tax depends on ALL your income and circumstances: this figure only covers the activity (plus other income and children you entered).'}));
  if(p.forma && !b.fiscalFijado) M('media', L({es:'La forma jurídica no la ha fijado GastroGoan: confirma que es la que declara tu gestoría.', ca:'La forma jurídica no l\'ha fixat GastroGoan: confirma que és la que declara la teva gestoria.', en:'The legal form was not set by GastroGoan: confirm it is the one your accountant files.'}));
  T.reglas.forEach(id => { const r = fiscalRegla(id); if(r && r.estado === 'pendiente') M('media', L({es:`Regla sin verificar: ${r.id}.`, ca:`Regla sense verificar: ${r.id}.`, en:`Unverified rule: ${r.id}.`})); });
  T.nivel = fiscalNivelDe(T.motivos);
  T.avisos = T.motivos.map(m => m.txt);
  return T;
}

/* ============================================================
   PREVISIÓN DE OBLIGACIONES DEL TRIMESTRE
   ============================================================ */
const FISCAL_ESTADOS = {
  estimado:  {txt: () => gl({es:'Estimado', ca:'Estimat', en:'Estimated'}), cls:''},
  devengado: {txt: () => gl({es:'Devengado · por presentar', ca:'Meritat · per presentar', en:'Accrued · to file'}), cls:'is-amber'},
  vencido:   {txt: () => gl({es:'Plazo pasado · sin marcar', ca:'Termini passat · sense marcar', en:'Past due · not marked'}), cls:'is-aviso'},
  presentado:{txt: () => gl({es:'Presentado', ca:'Presentat', en:'Filed'}), cls:'is-auto'},
  pagado:    {txt: () => gl({es:'Pagado', ca:'Pagat', en:'Paid'}), cls:'is-ok'}
};
function fiscalPrevision(año, q){
  const hoy = new Date();
  const finQ = new Date(año, q*3 + 3, 0, 23, 59);
  const meses = [q*3, q*3+1, q*3+2];
  const suma = f => meses.reduce((s, m) => s + f(m), 0);
  const traza = fiscalTrazaAnual(año);
  const obl = fiscalObligaciones();
  const filas = [];
  const add = (modelo, concepto, importe, datos) => {
    const key = fiscalClave(año, q, modelo), mk = obl[key] || null, vence = fiscalVence(q, año, modelo), dias = fiscalDiasHasta(vence);
    let estado = hoy <= finQ ? 'estimado' : (dias != null && dias >= 0 ? 'devengado' : 'vencido');
    if(mk && mk.pagado) estado = 'pagado'; else if(mk && mk.presentado) estado = 'presentado';
    const nivel = fiscalNivelDe(traza.motivos.filter(m => m.nivel === 'baja').concat(hoy <= finQ ? [{nivel:'media'}] : []));
    filas.push({key, modelo, concepto, periodo:`T${q+1} ${año}`, importe, estado, vence, dias, nivel, datos, marca: mk,
      desviacion: mk && mk.real != null ? mk.real - (mk.estimado != null ? mk.estimado : importe) : null});
  };
  const iva = GE.iva303TrimestreAPagar(q, año);
  add('303', gl({es:'IVA del trimestre', ca:'IVA del trimestre', en:'Quarter VAT'}), iva, gl({es:'IVA repercutido de las ventas, menos el soportado deducible de compras, gastos fijos e inversiones', ca:'IVA repercutit de les vendes, menys el suportat deduïble de compres, despeses fixes i inversions', en:'Output VAT on sales minus deductible input VAT on purchases, fixed costs and investments'}));
  const r111 = suma(m => geModelo111ForMonth(año, m)); if(r111 > 0.005) add('111', gl({es:'Retenciones de nóminas y profesionales', ca:'Retencions de nòmines i professionals', en:'Payroll and professional withholdings'}), r111, gl({es:'IRPF retenido a empleados (nóminas con cálculo automático) y a profesionales', ca:'IRPF retingut a empleats i a professionals', en:'Income tax withheld from employees and professionals'}));
  const r115 = suma(m => geRetencionForMonth(año, m, '115')); if(r115 > 0.005) add('115', gl({es:'Retención del alquiler', ca:'Retenció del lloguer', en:'Rent withholding'}), r115, gl({es:'Retención practicada en los gastos fijos marcados como alquiler', ca:'Retenció practicada a les despeses fixes marcades com a lloguer', en:'Withholding on fixed costs marked as rent'}));
  const r123 = suma(m => GE.retDividendosMes(m, año)); if(r123 > 0.005) add('123', gl({es:'Retención de dividendos', ca:'Retenció de dividends', en:'Dividend withholding'}), r123, gl({es:'19 % retenido en los dividendos anotados', ca:'19 % retingut als dividends anotats', en:'19 % withheld on recorded dividends'}));
  const pc = GE.pagoACuentaTrimestre(q*3 + 2, año);
  if(pc && pc.importe > 0.005) add(pc.modelo, gl({es:'Pago fraccionado a cuenta', ca:'Pagament fraccionat a compte', en:'Instalment payment on account'}), pc.importe, pc.modelo === '202' ? gl({es:'18 % de la cuota del último Impuesto de Sociedades', ca:'18 % de la quota de l\'últim Impost de Societats', en:'18 % of the last Corporate Tax bill'}) : gl({es:'Rendimiento acumulado del año (20 %) menos lo ya pagado', ca:'Rendiment acumulat de l\'any (20 %) menys el ja pagat', en:'Year-to-date income (20 %) minus what was already paid'}));
  return {año, q, filas, traza, nivel: traza.nivel, actualizado: new Date().toISOString()};
}
// Pasar el modelo a otro estado lo hace el usuario: la app no sabe qué ha presentado su gestor.
function fiscalMarcarModal(key, modelo, estimado){
  const mk = fiscalObligaciones()[key] || {};
  const hoyS = new Date().toISOString().slice(0, 10);
  openModal(`<div class="modal-header"><h3><i class="ti ti-circle-check"></i> ${gl({es:'Modelo ' + modelo + ': ¿qué ha pasado?', ca:'Model ' + modelo + ': què ha passat?', en:'Form ' + modelo + ': what happened?'})}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <p class="te-nota" style="padding:0 0 12px">${gl({es:'La app no sabe qué ha presentado o pagado tu gestoría: lo apuntas tú. Así la previsión puede compararse con lo REAL.', ca:'L\'app no sap què ha presentat o pagat la teva gestoria: ho apuntes tu. Així la previsió es pot comparar amb el REAL.', en:'The app does not know what your accountant filed or paid: you record it. That lets the forecast be compared with the REAL figure.'})}</p>
    <div class="field"><label>${gl({es:'Estado', ca:'Estat', en:'Status'})}</label><select id="fm-estado">
      <option value="presentado"${mk.presentado && !mk.pagado ? ' selected' : ''}>${gl({es:'Presentado (aún sin pagar)', ca:'Presentat (encara sense pagar)', en:'Filed (not paid yet)'})}</option>
      <option value="pagado"${mk.pagado ? ' selected' : ''}>${gl({es:'Presentado y pagado', ca:'Presentat i pagat', en:'Filed and paid'})}</option>
      <option value="quitar">${gl({es:'Quitar la marca (volver a estimado)', ca:'Treure la marca (tornar a estimat)', en:'Remove the mark (back to estimated)'})}</option></select></div>
    <div class="field-row"><div class="field"><label>${gl({es:'Fecha', ca:'Data', en:'Date'})}</label><input type="date" id="fm-fecha" value="${mk.pagado || mk.presentado || hoyS}"></div>
      <div class="field"><label>${gl({es:'Importe real (€)', ca:'Import real (€)', en:'Actual amount (€)'})}</label><input type="number" id="fm-real" step="0.01" value="${mk.real != null ? mk.real : ''}" placeholder="${(Math.round(estimado * 100) / 100).toFixed(2)}"></div></div>
    <div class="modal-footer"><button class="btn" onclick="closeModal()">${t('common.cancel')}</button><button class="btn btn-primary" onclick="fiscalMarcarGuardar('${escapeHtml(key)}', ${Number(estimado) || 0})">${t('common.save')}</button></div>`);
}
function fiscalMarcarGuardar(key, estimado){
  const est = document.getElementById('fm-estado').value, obl = fiscalObligaciones();
  if(est === 'quitar') delete obl[key];
  else {
    const fecha = document.getElementById('fm-fecha').value || new Date().toISOString().slice(0, 10), rawReal = document.getElementById('fm-real').value;
    obl[key] = {presentado: fecha, pagado: est === 'pagado' ? fecha : null, real: rawReal === '' ? null : parseFloat(rawReal), estimado, ts: new Date().toISOString()};
  }
  saveDB(); closeModal(); try{ GE.renderTesoreria(); }catch(e){}
}
// Explicación de TODO el cálculo del año: datos, reglas con su fuente y estado, fórmula y advertencias.
function fiscalTrazaModal(año){
  const T = fiscalTrazaAnual(año), L = o => gl(o);
  const fm = v => (v < 0 ? '−' : '') + fmtMoney(Math.abs(v));
  const nivelTxt = {alta: L({es:'Alta', ca:'Alta', en:'High'}), media: L({es:'Media', ca:'Mitjana', en:'Medium'}), baja: L({es:'Baja', ca:'Baixa', en:'Low'})}[T.nivel];
  const reglas = T.reglas.map(fiscalRegla).filter(Boolean);
  openModal(`<div class="modal-header"><h3><i class="ti ti-route"></i> ${L({es:'Cómo se ha calculado el impuesto de ' + año, ca:'Com s\'ha calculat l\'impost de ' + año, en:'How the ' + año + ' tax was computed'})}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div class="cdr-expl">
      <p><span class="gf-chip ${T.nivel === 'alta' ? 'is-ok' : T.nivel === 'media' ? 'is-amber' : 'is-aviso'}">${L({es:'Fiabilidad', ca:'Fiabilitat', en:'Reliability'})}: ${nivelTxt}</span>
        <small style="color:var(--muted)"> · ${L({es:'actualizado', ca:'actualitzat', en:'updated'})} ${new Date(T.actualizado).toLocaleString(localeActual(), {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})} · ${L({es:'Es una ESTIMACIÓN, no una liquidación oficial.', ca:'És una ESTIMACIÓ, no una liquidació oficial.', en:'This is an ESTIMATE, not an official assessment.'})}</small></p>
      <h4>${L({es:'Pasos', ca:'Passos', en:'Steps'})}</h4>
      <table class="mf-pasos"><tbody>${T.pasos.map(x => `<tr><td>${escapeHtml(x.et)}${x.regla ? ` <small class="mf-regla">${escapeHtml(x.regla)}</small>` : ''}</td><td>${fm(x.v)}</td></tr>`).join('')}
        <tr class="mf-total"><td>${L({es:'Impuesto estimado del ejercicio', ca:'Impost estimat de l\'exercici', en:'Estimated tax for the year'})}${T.baseImp > 0 ? ` <small>(${fiscalPct(T.tipoEfectivo * 100)} %)</small>` : ''}</td><td>${fm(T.impuestoAnual)}</td></tr></tbody></table>
      <h4>${L({es:'Datos utilizados', ca:'Dades utilitzades', en:'Data used'})}</h4>
      <p>${L({es:`Ventas, compras, gastos fijos, personal, inversiones e intereses de ${T.mesesConDatos} mes(es) con datos de ${año}. Forma jurídica: ${T.forma || '—'}${T.regimen ? ' · ' + T.regimen : ''}. Territorio: ${FISCAL_TERRITORIOS[T.territorio]()}.`, ca:`Vendes, compres, despeses fixes, personal, inversions i interessos de ${T.mesesConDatos} mes(os) amb dades del ${año}. Forma jurídica: ${T.forma || '—'}${T.regimen ? ' · ' + T.regimen : ''}. Territori: ${FISCAL_TERRITORIOS[T.territorio]()}.`, en:`Sales, purchases, fixed costs, staff, investments and interest from ${T.mesesConDatos} month(s) of ${año} data. Legal form: ${T.forma || '—'}${T.regimen ? ' · ' + T.regimen : ''}. Territory: ${FISCAL_TERRITORIOS[T.territorio]()}.`})}</p>
      ${T.avisos.length ? `<h4>${L({es:'Condiciones que pueden cambiar el resultado', ca:'Condicions que poden canviar el resultat', en:'Conditions that may change the result'})}</h4><ul class="mf-avisos">${T.avisos.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>` : ''}
      <h4>${L({es:'Reglas aplicadas', ca:'Regles aplicades', en:'Rules applied'})}</h4>
      <ul class="mf-reglas">${reglas.map(r => `<li><b>${escapeHtml(r.id)}</b> <span class="gf-chip ${r.estado === 'verificada' ? 'is-ok' : r.estado === 'revisada' ? 'is-auto' : 'is-aviso'}">${FISCAL_ESTADO_TXT[r.estado]()}</span><br>${escapeHtml(r.descripcion)}<br><small>${escapeHtml(r.fuente)} · ${escapeHtml(r.referencia)}${r.nota ? ' · ' + escapeHtml(r.nota) : ''}</small></li>`).join('') || `<li>—</li>`}</ul>
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">${L({es:'Entendido', ca:'Entès', en:'Got it'})}</button></div>`);
}

/* ============================================================
   SIMULADOR («¿y si…?»): NUNCA se mezcla con la previsión sobre datos reales
   ============================================================ */
function fiscalSimular(sc, año){
  año = año || new Date().getFullYear();
  const hoy = new Date(), enCurso = año === hoy.getFullYear();
  const mesesRestantes = enCurso ? 11 - hoy.getMonth() : 12;
  const T = fiscalTrazaAnual(año), p = fiscalPerfil(), opts = GE.optsImpuesto(año);
  // Ritmo anual de ventas y compras con lo que hay (proyección a 12 meses de los meses con datos)
  const nMes = enCurso ? Math.max(1, hoy.getMonth() + 1) : 12;
  const sumM = f => { let s = 0; for(let m = 0; m < nMes; m++) s += f(m); return s * 12 / nMes; };
  const ventas = sumM(m => GE.facturacionNetaMes(m, año)), compras = sumM(m => GE.totalVariablesNetoMes(m, año)), ivaVentas = sumM(m => GE.ivaVentasMes(m, año));
  const ratioVar = ventas > 0 ? compras / ventas : 0, tipoIvaVentas = ventas > 0 ? ivaVentas / ventas : 0.10;
  const dV = ventas * (sc.ventasPct || 0) / 100;
  const dMargen = dV * (1 - ratioVar);                                   // más ventas traen más compras
  const dGastos = -(sc.gastosPct || 0) / 100 * Math.max(0, ventas - T.proyectada - compras);   // los gastos fijos que ya hay (aprox.)
  const dPersonal = -(sc.personalMes || 0) * mesesRestantes;
  const amortInv = (sc.inversion || 0) * 0.10 / 12 * mesesRestantes;       // 10 % anual: orden de magnitud de mobiliario/obras (no es la tabla de la inversión real)
  const dBase = dMargen + dGastos + dPersonal - amortInv;
  const baseSim = Math.max(0, T.baseImp + dBase);
  const impSim = impuestoAnual(baseSim, opts);
  const ivaSim = dV * tipoIvaVentas - dV * ratioVar * 0.10 - (sc.inversion || 0) * 0.21;   // IVA aprox.: repercutido nuevo − soportado de compras nuevas − IVA de la inversión
  return {año, base: T.baseImp, baseSim, dBase, impuesto: T.impuestoAnual, impuestoSim: impSim, dImpuesto: impSim - T.impuestoAnual, dIva: ivaSim, reservaMes: mesesRestantes > 0 ? (impSim - T.impuestoAnual + ivaSim) / mesesRestantes : 0, mesesRestantes, nivel:'simulacion'};
}
function fiscalSimuladorModal(){
  const año = new Date().getFullYear(), L = o => gl(o);
  openModal(`<div class="modal-header"><h3><i class="ti ti-adjustments-horizontal"></i> ${L({es:'Simulador de impuestos', ca:'Simulador d\'impostos', en:'Tax simulator'})}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <p class="mf-sim-aviso"><i class="ti ti-flask"></i> ${L({es:'ES UNA SIMULACIÓN, no una previsión con tus datos reales. Sirve para ver el orden de magnitud de una decisión; los números exactos los da tu gestoría.', ca:'ÉS UNA SIMULACIÓ, no una previsió amb les teves dades reals. Serveix per veure l\'ordre de magnitud d\'una decisió; els números exactes els dóna la teva gestoria.', en:'THIS IS A SIMULATION, not a forecast on your real data. It shows the order of magnitude of a decision; exact numbers come from your accountant.'})}</p>
    <div class="field-row">
      <div class="field"><label>${L({es:'Ventas: variación %', ca:'Vendes: variació %', en:'Sales change %'})}</label><input type="number" id="sim-ventas" step="1" value="10" oninput="fiscalSimularPintar()"></div>
      <div class="field"><label>${L({es:'Gastos fijos: variación %', ca:'Despeses fixes: variació %', en:'Fixed costs change %'})}</label><input type="number" id="sim-gastos" step="1" value="0" oninput="fiscalSimularPintar()"></div></div>
    <div class="field-row">
      <div class="field"><label>${L({es:'Contratar a alguien: coste al mes (€)', ca:'Contractar algú: cost al mes (€)', en:'Hire someone: monthly cost (€)'})}</label><input type="number" id="sim-personal" step="50" value="0" oninput="fiscalSimularPintar()"></div>
      <div class="field"><label>${L({es:'Inversión nueva (€, sin IVA)', ca:'Inversió nova (€, sense IVA)', en:'New investment (€, excl. VAT)'})}</label><input type="number" id="sim-inversion" step="500" value="0" oninput="fiscalSimularPintar()"></div></div>
    <div id="sim-res"></div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">${L({es:'Cerrar', ca:'Tancar', en:'Close'})}</button></div>`);
  fiscalSimularPintar();
}
function fiscalSimularPintar(){
  const n = id => parseFloat(document.getElementById(id).value) || 0, L = o => gl(o);
  const r = fiscalSimular({ventasPct:n('sim-ventas'), gastosPct:n('sim-gastos'), personalMes:n('sim-personal'), inversion:n('sim-inversion')});
  const sg = v => (v >= 0 ? '+' : '−') + fmtMoney(Math.abs(v));
  document.getElementById('sim-res').innerHTML = `<div class="ge-kpi-grid mf-sim-k">
      <div class="ge-kpi"><div class="lbl">${L({es:'Base del impuesto', ca:'Base de l\'impost', en:'Tax base'})}</div><div class="te-valor">${fmtMoney(r.baseSim)}</div><div class="sub">${sg(r.dBase)} ${L({es:'frente a hoy', ca:'respecte a avui', en:'vs today'})}</div></div>
      <div class="ge-kpi"><div class="lbl">${L({es:'Impuesto del año', ca:'Impost de l\'any', en:'Tax for the year'})}</div><div class="te-valor">${fmtMoney(r.impuestoSim)}</div><div class="sub">${sg(r.dImpuesto)}</div></div>
      <div class="ge-kpi"><div class="lbl">${L({es:'IVA del año (aprox.)', ca:'IVA de l\'any (aprox.)', en:'VAT for the year (approx.)'})}</div><div class="te-valor">${sg(r.dIva)}</div><div class="sub">${L({es:'más a ingresar si es +', ca:'més a ingressar si és +', en:'more to pay if +'})}</div></div></div>
    <p class="te-nota" style="padding:8px 0">${L({es:`Para no llevarte sustos, aparta unos <b>${fmtMoney(Math.max(0, r.reservaMes))}</b> más al mes durante los ${r.mesesRestantes} meses que quedan de año.`, ca:`Per no endur-te ensurts, aparta uns <b>${fmtMoney(Math.max(0, r.reservaMes))}</b> més al mes durant els ${r.mesesRestantes} mesos que queden d'any.`, en:`To avoid surprises, set aside about <b>${fmtMoney(Math.max(0, r.reservaMes))}</b> more a month for the ${r.mesesRestantes} months left in the year.`})}</p>`;
}

/* ============================================================
   PINTADO: la tarjeta «Previsión de impuestos» de Tesorería
   ============================================================ */
function fiscalPrevisionHtml(año, q, filasInformativas){
  const L = o => gl(o), P = fiscalPrevision(año, q), T = P.traza;
  const nivelTxt = {alta: L({es:'Fiabilidad alta', ca:'Fiabilitat alta', en:'High reliability'}), media: L({es:'Fiabilidad media', ca:'Fiabilitat mitjana', en:'Medium reliability'}), baja: L({es:'Fiabilidad baja', ca:'Fiabilitat baixa', en:'Low reliability'})};
  const nivCls = n => n === 'alta' ? 'is-ok' : n === 'media' ? 'is-amber' : 'is-aviso';
  const hora = new Date(P.actualizado).toLocaleTimeString(localeActual(), {hour:'2-digit', minute:'2-digit'});
  const filas = P.filas.map(f => {
    const E = FISCAL_ESTADOS[f.estado];
    const chipDias = f.dias == null || f.estado === 'pagado' ? '' : f.dias < 0 ? `<span class="gf-chip is-aviso">${L({es:'vencido', ca:'vençut', en:'overdue'})}</span>` : `<span class="gf-chip${f.dias <= 10 ? ' is-aviso' : ''}">${L({es:'en ' + f.dias + ' d', ca:'en ' + f.dias + ' d', en:'in ' + f.dias + ' d'})}</span>`;
    const real = f.marca && f.marca.real != null ? `<small class="mf-real">${L({es:'Real', ca:'Real', en:'Actual'})}: <b>${fmtMoney(f.marca.real)}</b> ${f.desviacion != null ? `(${f.desviacion >= 0 ? '+' : '−'}${fmtMoney(Math.abs(f.desviacion))} ${L({es:'sobre lo previsto', ca:'sobre el previst', en:'vs forecast'})})` : ''}</small>` : '';
    return `<div class="te-cal-f mf-fila">
      <span class="te-cal-m">${escapeHtml(f.modelo)}</span>
      <span class="te-cal-t">${f.concepto}<small class="mf-datos">${f.datos}</small><span class="mf-chips"><span class="gf-chip ${E.cls}">${E.txt()}</span><span class="gf-chip ${nivCls(f.nivel)}">${nivelTxt[f.nivel]}</span></span>${real}</span>
      <b class="te-cal-i"${f.importe < 0 ? ' style="color:var(--green)"' : ''}>${f.importe < 0 ? fmtMoney(-f.importe) + ' ' + t('hr.lbl.inYourFavor') : fmtMoney(f.importe)}</b>
      <span class="te-cal-v">${t('cal.hasta')} ${f.vence} ${chipDias}<button type="button" class="btn btn-sm" onclick="fiscalMarcarModal('${escapeHtml(f.key)}', '${escapeHtml(f.modelo)}', ${Number(f.importe) || 0})">${f.marca ? L({es:'Cambiar', ca:'Canviar', en:'Change'}) : L({es:'Marcar', ca:'Marcar', en:'Mark'})}</button></span></div>`;
  }).join('');
  const info = (filasInformativas || []).map(f => `<div class="te-cal-f te-info"><span class="te-cal-m">${escapeHtml(f.mod)}</span><span class="te-cal-t">${f.txt}</span><b class="te-cal-i"></b><span class="te-cal-v">${t('cal.hasta')} ${f.vence}</span></div>`).join('');
  return `<div class="ge-section te-cal mf-prev gg-plegable">
    <div class="ge-sec-head"><h4><i class="ti ti-calendar-event"></i> ${t('cal.titulo').replace('${q}', (q+1)+'T '+año)}</h4>
      <span class="gf-acciones"><span class="gf-chip ${nivCls(T.nivel)}" data-tip="${escapeHtml(T.avisos.join(' · '))}" tabindex="0">${nivelTxt[T.nivel]}</span>
      <button type="button" class="btn btn-sm" onclick="fiscalTrazaModal(${año})"><i class="ti ti-route"></i> ${L({es:'Ver cálculo', ca:'Veure càlcul', en:'See calculation'})}</button>
      <button type="button" class="btn btn-sm" onclick="fiscalSimuladorModal()"><i class="ti ti-adjustments-horizontal"></i> ${L({es:'Simular', ca:'Simular', en:'Simulate'})}</button></span></div>
    <p class="te-nota">${t('cal.desc')} ${L({es:'Son ESTIMACIONES con tus datos de hoy (actualizado a las ' + hora + '), no liquidaciones oficiales: las presenta tu gestoría.', ca:'Són ESTIMACIONS amb les teves dades d\'avui (actualitzat a les ' + hora + '), no liquidacions oficials: les presenta la teva gestoria.', en:'These are ESTIMATES with today\'s data (updated at ' + hora + '), not official assessments: your accountant files them.'})}</p>
    ${T.avisos.length ? `<ul class="mf-avisos mf-avisos-top">${T.avisos.slice(0, 3).map(a => `<li>${escapeHtml(a)}</li>`).join('')}${T.avisos.length > 3 ? `<li><button type="button" class="mf-mas" onclick="fiscalTrazaModal(${año})">${L({es:'+' + (T.avisos.length - 3) + ' más…', ca:'+' + (T.avisos.length - 3) + ' més…', en:'+' + (T.avisos.length - 3) + ' more…'})}</button></li>` : ''}</ul>` : ''}
    ${filas}
    <div class="te-cal-f mf-anual"><span class="te-cal-m">${T.forma === 'sociedad' || T.forma === 'cooperativa' ? 'IS' : 'IRPF'}</span><span class="te-cal-t">${L({es:'Impuesto sobre el beneficio de ' + año + ' (estimación del ejercicio entero)', ca:'Impost sobre el benefici del ' + año + ' (estimació de l\'exercici sencer)', en:'Profit tax for ' + año + ' (full-year estimate)'})}<small class="mf-datos">${L({es:'Provisionado hasta hoy: ', ca:'Provisionat fins avui: ', en:'Provisioned so far: '})}${fmtMoney(T.provisionadoHoy)} · ${L({es:'se liquida con la declaración del año siguiente', ca:'es liquida amb la declaració de l\'any següent', en:'settled with next year\'s return'})}</small></span><b class="te-cal-i">${fmtMoney(T.impuestoAnual)}</b><span class="te-cal-v"><span class="gf-chip">${FISCAL_ESTADOS.estimado.txt()}</span></span></div>
    ${info}</div>`;
}
