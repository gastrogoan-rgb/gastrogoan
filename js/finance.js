/* ============================================================
   DASHBOARD
   ============================================================ */
// Mismo objetivo unificado que usa Gestión Económica (ver foodCostObjPct en
// js/hr.js, misma fórmula duplicada aquí porque el Dashboard no tiene acceso
// al closure de GE): si ya hay un reparto configurado en Tesorería, manda su
// "% Gastos Variables"; si no, el objetivo de food cost (o 35% por defecto).
function geFoodCostObjPct(){
  const dp = DB.ge.config.distPct;
  if(dp && dp.mp != null) return dp.mp;
  return DB.ge.config.foodCostObj != null ? DB.ge.config.foodCostObj : 35;
}
// g.importe (vía gfMonthlyImporte) es la base mensual sin IVA — el IVA se
// añade encima para el total, nunca se extrae de un total que ya lo llevara.
function geTotalFijosNeto(){
  return (DB.ge.fijos||[]).reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
function geTotalFijos(){
  return (DB.ge.fijos||[]).reduce((s,g)=>{const m=gfMonthlyImporte(g);const p=g.iva!=null?parseFloat(g.iva):0;return s+m*(1+p/100);},0);
}
// Solo la parte de "gastos fijos" que es coste de personal (nóminas), para
// poder mostrar el coste de personal como % de la facturación junto al food
// cost — los dos números de "prime cost" que todo dueño de restaurante mira
// juntos.
function geTotalPersonalNeto(){
  return (DB.ge.fijos||[]).filter(g=>g.categoria==='PERSONAL').reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
// IRPF retenido a los empleados este mes (autocálculo de nómina), a
// ingresar en Hacienda vía Modelo 111 — no es un coste extra del negocio
// (ya va dentro del bruto), solo dinero que el negocio retiene y adelanta
// por el empleado.
function geTotalIrpfMensual(){
  // El «sueldo» del titular autónomo o comunero no es una nómina: no lleva retención ni va al 111.
  const pf = fiscalPerfil().personaFisica;
  return (DB.ge.fijos||[]).filter(g=>g.categoria==='PERSONAL' && g.autoCalc && !(pf && gfEsRetribucionTitular(g))).reduce((s,g)=>s+(parseFloat(g.irpfMensual)||0),0);
}
// Retenciones que el negocio practica en sus gastos fijos y ADELANTA a
// Hacienda (auditoría contable, 5/10): el alquiler del local (19%, Modelo
// 115) y las facturas de profesionales — gestoría, asesor, abogado — (15%,
// o 7% los tres primeros años del profesional; van al Modelo 111 junto a
// las de las nóminas). No son un gasto más: el negocio paga al casero la
// base + IVA − retención, y esa retención la ingresa él cada trimestre.
// El coste del negocio no cambia; lo que cambia es A QUIÉN se paga y CUÁNDO.
const GF_RETENCIONES = {
  '115_19': {pct:19, modelo:'115'},
  '111_15': {pct:15, modelo:'111'},
  '111_7':  {pct:7,  modelo:'111'},
};
function gfRetencionMensual(g){
  const r = GF_RETENCIONES[g && g.retencion];
  if(!r || g.categoria === 'PERSONAL') return 0;
  return gfMonthlyImporte(g) * r.pct / 100;
}
function geTotalRetencionMensual(modelo){
  return (DB.ge.fijos||[]).filter(g => (GF_RETENCIONES[g.retencion]||{}).modelo === modelo).reduce((s,g)=>s+gfRetencionMensual(g),0);
}
// Registra un punto en el histórico de gastos fijos (uno por día como
// máximo: si ya se tocó algo hoy, se sobrescribe con el valor final del
// día en vez de acumular varias entradas). Se llama tras cada alta/edición/
// baja de un gasto fijo. Guarda tanto el total neto como el total con IVA,
// para poder reconstruir después también el IVA soportado histórico (no
// solo el resultado neto) — importante de cara a la liquidación trimestral.
function snapshotGeFijosNeto(){
  if(!DB.ge.fijosLog) DB.ge.fijosLog = [];
  const today = todayStr();
  const totalNeto = geTotalFijosNeto();
  const totalGross = geTotalFijos();
  const personalNeto = geTotalPersonalNeto();
  const gfNeto = totalNeto - personalNeto;
  const irpfMensual = geTotalIrpfMensual();
  const ret115 = geTotalRetencionMensual('115');
  const retProf111 = geTotalRetencionMensual('111');
  const retribTitular = geTotalRetribTitular();
  const items = gfItemsActuales();
  const existing = DB.ge.fijosLog.find(e => e.fecha === today);
  if(existing){ existing.totalNeto = totalNeto; existing.totalGross = totalGross; existing.personalNeto = personalNeto; existing.gfNeto = gfNeto; existing.irpfMensual = irpfMensual; existing.ret115 = ret115; existing.retProf111 = retProf111; existing.retribTitular = retribTitular; existing.items = items; }
  else DB.ge.fijosLog.push({fecha: today, totalNeto, totalGross, personalNeto, gfNeto, irpfMensual, ret115, retProf111, retribTitular, items});
}
// Valor del histórico de gastos fijos "vigente" a fecha de un mes concreto:
// el último punto anterior o igual al último día de ese mes. Si no hay
// ningún punto anterior (el histórico empezó después), se usa el más
// antiguo conocido en vez de la configuración de hoy, por ser una mejor
// estimación de lo que probablemente había entonces. Sin histórico todavía
// (negocio recién empezado a usar la app), se cae en la configuración
// actual, igual que el comportamiento de siempre.
function geFijosLogValueForMonth(year, month, field){
  const log = DB.ge.fijosLog || [];
  if(!log.length) return null;
  const endOfMonth = dateStr(new Date(year, month+1, 0));
  const sorted = [...log].sort((a,b) => a.fecha.localeCompare(b.fecha));
  const upTo = sorted.filter(e => e.fecha <= endOfMonth);
  return upTo.length ? upTo[upTo.length-1][field] : sorted[0][field];
}
// Equivalente global de isDateClosed (privada del closure GE, js/hr.js) para
// que otros módulos (TPV) puedan respetar el cierre de mes de Gestión
// Económica sin poder llamar a la función real. Sin esto, anular una venta
// de un mes ya cerrado y enviado al gestor cambiaba la facturación/IVA de
// ese mes sin ningún aviso ni rastro de que el "cierre" dejó de significar
// nada.
function geIsDateClosed(fechaStr){
  if(!fechaStr || !DB.ge) return false;
  const [y,m] = fechaStr.split('-').map(Number);
  const key = `${y}-${String(m).padStart(2,'0')}`;
  return (DB.ge.cierres||[]).includes(key);
}
// ¿Tiene sentido contar gastos fijos en este mes? No en uno que aún no ha
// llegado, ni en uno anterior al primer dato del negocio en la app (venta,
// compra, inversión o el primer gasto fijo apuntado). Antes, un negocio que
// empezó a usar la app en julio veía de enero a junio meses de pérdidas
// hechos solo de alquiler y nóminas, y también noviembre y diciembre: el
// año entero salía en rojo. La caché vive lo que dura un pintado.
let geInicioCache = null;
function geInicioActividad(){
  if(geInicioCache) return geInicioCache.v;
  let min = null;
  const ver = f => { if(f && /^\d{4}-\d{2}/.test(f) && (!min || f < min)) min = f.slice(0,10); };
  (DB.sales||[]).forEach(v => ver(v.date));
  (DB.ge.variables||[]).forEach(v => ver(v.fecha));
  (DB.ge.capex||[]).forEach(c => ver(c.fecha));
  (DB.ge.fijosLog||[]).forEach(e => ver(e.fecha));
  geInicioCache = {v: min};
  setTimeout(() => { geInicioCache = null; }, 0);
  return min;
}
function geMesConActividad(year, month){
  const hoy = new Date();
  if(year*12 + month > hoy.getFullYear()*12 + hoy.getMonth()) return false;
  const inicio = geInicioActividad();
  if(!inicio) return true;
  return `${year}-${String(month+1).padStart(2,'0')}` >= inicio.slice(0,7);
}
function geTotalFijosNetoForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'totalNeto');
  return v==null ? geTotalFijosNeto() : v;
}
function geTotalFijosGrossForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'totalGross');
  return v==null ? geTotalFijos() : v;
}
// IVA soportado en gastos fijos de un mes concreto, a partir del histórico
// (gross - neto de ese momento), en vez de recalcularlo siempre con la
// configuración actual de gastos fijos.
// El IVA de un gasto fijo se deduce en el mes de SU factura (art. 99
// LIVA): uno mensual, cada mes; un seguro anual, entero el mes en que se
// paga — no 1/12 cada mes, que es como se reparte el GASTO en la Cuenta de
// Resultados. Con la foto de los gastos de ese momento (items del
// histórico). Un punto del histórico de antes de esto no tiene items: se
// mantiene el cálculo antiguo para no mover meses ya cerrados.
function geIvaSoportadoFijosForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const items = geFijosItemsForMonth(year, month);
  if(!items) return geTotalFijosGrossForMonth(year, month) - geTotalFijosNetoForMonth(year, month);
  return items.reduce((s,it) => {
    if(it.c === 'PERSONAL' || !gfPagaEnMes(it, year, month)) return s;
    return s + (parseFloat(it.importe)||0) * (parseFloat(it.iva)||0) / 100 * deducPct(it) / 100;
  }, 0);
}
// Foto compacta de los gastos fijos, para el histórico: así el libro de
// gastos de enero dice el alquiler de ENERO aunque en junio subiera.
// DEDUCIBILIDAD de un gasto (encargo maestro, F-6): el resultado CONTABLE cuenta todo el gasto; para el impuesto
// (IRPF / Sociedades) y para el IVA solo cuenta la parte deducible. `deducPct` = 100 por defecto (totalmente
// deducible); 0 = no deducible; entre medias, parcial. `deducRevisar` marca «pendiente de revisar con mi gestor»
// (cuenta como deducible por ahora, y la previsión lo avisa). ⚠️ La app NO decide qué es deducible: lo decide el
// usuario con su gestoría; un % parcial único se aplica al impuesto sobre el beneficio Y al IVA.
function deducPct(x){ const p = parseFloat(x && x.deducPct); return (p >= 0 && p <= 100) ? p : 100; }
// Parte NO deducible de los gastos de un mes (se SUMA al resultado contable para obtener la base fiscal).
function geAjusteFiscalMes(year, month){
  if(!geMesConActividad(year, month)) return 0;
  let aj = gastosVariablesActivos().filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>s + (parseFloat(v.importe)||0) * (100 - deducPct(v)) / 100, 0);
  const items = geFijosItemsForMonth(year, month);
  if(items) aj += items.reduce((s,it) => (it.c === 'PERSONAL' || !(deducPct(it) < 100)) ? s : s + gfMonthlyImporte(it) * (100 - deducPct(it)) / 100, 0);
  return aj;
}
// Cuántos gastos del año están marcados «pendiente de revisar» (la previsión fiscal lo dice).
function geGastosPorRevisar(year){
  const v = gastosVariablesActivos().filter(x => x.deducRevisar && parseInt(x.año) === year).length;
  const f = (DB.ge.fijos||[]).filter(x => x.deducRevisar && x.categoria !== 'PERSONAL').length;
  return v + f;
}
function gfItemsActuales(){
  return (DB.ge.fijos||[]).map(g => ({
    id: g.id, nombre: g.nombre, importe: parseFloat(g.importe)||0, iva: g.categoria==='PERSONAL' ? 0 : (parseFloat(g.iva)||0),
    periodicidadMeses: parseInt(g.periodicidadMeses)||1, mesPago: g.mesPago || null, c: g.categoria,
    retencion: g.retencion || null, titular: gfEsRetribucionTitular(g) ? 1 : 0,
    proveedor: g.proveedor || '', nifProveedor: g.nifProveedor || '',
    deducPct: deducPct(g),
  }));
}
// null = hay histórico pero ese punto es anterior a las fotos (usar lo viejo).
function geFijosItemsForMonth(year, month){
  if(!geMesConActividad(year, month)) return [];
  const log = DB.ge.fijosLog || [];
  if(!log.length) return gfItemsActuales();
  const v = geFijosLogValueForMonth(year, month, 'items');
  return Array.isArray(v) ? v : null;
}
// ¿Toca pagar (y llega la factura de) este gasto este mes? Mensual, siempre.
// Si no, cada `periodicidadMeses` contando desde su mes de pago; sin mes
// de pago apuntado, desde el mes en que se dio de alta (el id es la fecha).
function gfPagaEnMes(g, year, month){
  const per = parseInt(g.periodicidadMeses)||1;
  if(per <= 1) return true;
  const mp = parseInt(g.mesPago);
  if(mp >= 1 && mp <= 12) return (((month - (mp-1)) % per) + per) % per === 0;
  const anchor = new Date((g.id||0)/1000);
  const diff = (year*12 + month) - (anchor.getFullYear()*12 + anchor.getMonth());
  return diff >= 0 && diff % per === 0;
}
// Igual que geTotalFijosNetoForMonth pero para el desglose PERSONAL vs resto
// de fijos (GF), necesario en Tesorería para no mezclar la configuración de
// hoy con la de un mes pasado. Los puntos del histórico anteriores a este
// desglose (personalNeto/gfNeto) no tienen estos campos: en ese caso se cae
// en la configuración actual, igual que el resto de fallbacks del histórico.
function geTotalPersonalNetoForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'personalNeto');
  return v==null ? geTotalPersonalNeto() : v;
}
function geTotalGFNetoForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'gfNeto');
  return v==null ? (geTotalFijosNeto() - geTotalPersonalNeto()) : v;
}
// IRPF retenido de un mes concreto, a partir del histórico — mismo criterio
// que el resto de geXxxForMonth: no mezclar la nómina de HOY con la de un
// mes pasado (y el mismo fallback a la configuración actual si aún no hay
// histórico para esa fecha).
function geIrpfMensualForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'irpfMensual');
  return v==null ? geTotalIrpfMensual() : v;
}
// Mismo criterio de histórico para las retenciones de los gastos fijos. Un
// punto del histórico anterior a esta función no tiene el campo: entonces
// se usa la configuración actual (igual que el resto de fallbacks).
function geRetencionForMonth(year, month, modelo){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, modelo==='115' ? 'ret115' : 'retProf111');
  return v==null ? geTotalRetencionMensual(modelo) : v;
}
// Todo lo que va al Modelo 111 ese mes: nóminas + profesionales.
function geModelo111ForMonth(year, month){
  return geIrpfMensualForMonth(year, month) + geRetencionForMonth(year, month, '111');
}
// True si TODO el año consultado es anterior al primer punto del histórico
// (es decir, no tenemos ningún dato real de cómo eran los gastos fijos en
// esas fechas y se está usando la estimación más antigua conocida como
// aproximación) — para poder avisar solo en ese caso, no siempre.
function geFijosHistoryPredatesYear(year){
  const log = DB.ge.fijosLog || [];
  if(!log.length) return true;
  const earliestYear = parseInt([...log].sort((a,b)=>a.fecha.localeCompare(b.fecha))[0].fecha.slice(0,4));
  return year < earliestYear;
}
// Importe mensual equivalente de un gasto fijo: si se paga cada X meses (trimestral, anual...),
// se reparte el importe entre esos meses para poder sumarlo junto a los gastos mensuales.
function gfMonthlyImporte(g){
  return parseFloat(g.importe||0) / (parseInt(g.periodicidadMeses)||1);
}
// v.importe es la base sin IVA (como en Ingredientes/Escandallo/Carta/Fijos):
// el IVA se AÑADE encima para el total con IVA, nunca se extrae de un total
// que ya lo llevara incluido.
function geTotalVariablesNetoMes(year, month){
  return gastosVariablesActivos().filter(v=>parseInt(v.mes)===month && parseInt(v.año)===year).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
// Gastos anulados (ver anularGV/hr.js): igual que las ventas anuladas, se
// conservan en los libros con su motivo pero no cuentan en ninguna cifra.
function gastosVariablesActivos(){
  return (DB.ge.variables||[]).filter(v => !v.anulado);
}
// Ventas anuladas (ver requestCancelSale/tpv.js) se excluyen de todas las
// cifras de facturación: siguen en DB.sales por trazabilidad, pero no son
// ingreso real.
/* Mientras se repinta una pantalla (conVentasEnCache) la lista de ventas válidas se calcula UNA vez.
   El Panel y Gestión la pedían cientos de veces (una por día, por mes, por serie), y cada
   petición recorría y copiaba todas las ventas: con 20.000 eran ~150 ms de un repintado de
   casi un segundo en un móvil. Fuera de un repintado NO hay caché, así que quien modifica una
   venta y la vuelve a leer en el mismo gesto sigue viendo el cambio. Se descarta además si
   cambia el array (Visión global carga otro negocio en DB) o su longitud. Ningún llamador
   modifica el resultado: todos hacen filter/forEach/some/reduce. */
let ventasActivasCache = null;
function activeSales(){
  const v = DB.sales || [];
  const c = ventasActivasCache;
  if(c && c.src === v && c.n === v.length) return c.arr;
  const arr = v.filter(s => s.status !== 'anulada');
  if(c){ c.src = v; c.n = v.length; c.arr = arr; }
  return arr;
}
function conVentasEnCache(fn){
  if(ventasActivasCache) return fn();   // ya dentro de un repintado
  ventasActivasCache = {src: null, n: -1, arr: null};
  try{ return fn(); }finally{ ventasActivasCache = null; }
}
function salesTotalForRange(startDate, endDate){
  return activeSales().filter(s=>s.date>=startDate && s.date<=endDate).reduce((sum,s)=>sum+s.total,0);
}
function salesTotalForMonth(year, month){
  const start = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const end = `${year}-${String(month+1).padStart(2,'0')}-31`;
  return salesTotalForRange(start, end);
}
function salesTotalForDate(dateStr){
  return salesTotalForRange(dateStr, dateStr);
}
function daysInMonth(year, month){
  return new Date(year, month+1, 0).getDate();
}
// Gastos variables (compras) registrados con fecha concreta dentro del rango
// (sin IVA) — v.importe ya es la base, no hace falta extraer nada.
function geVariablesTotalForRange(startDate, endDate){
  return gastosVariablesActivos().filter(v=>v.fecha && v.fecha>=startDate && v.fecha<=endDate).reduce((s,v)=>s+parseFloat(v.importe||0),0);
}
// Los gastos fijos son mensuales: se prorratean por día para poder mostrar "gastos de hoy/semana" (sin IVA).
// Usa el histórico de gastos fijos vigente en CADA día (no la configuración de HOY, que
// podía dar un número incorrecto para "ayer"/"hace 7 días" si los gastos fijos cambiaron
// de un día para otro — el mismo tipo de bug ya corregido esta sesión para Gestión Económica).
function geFijosForRange(startDate, endDate){
  // geTotalFijosNetoForMonth() reordena TODO el histórico de gastos fijos en
  // cada llamada (ver geFijosLogValueForMonth) — para no repetir ese trabajo
  // en cada día del rango (y para no repetirlo varias veces dentro del mismo
  // mes, ya que el valor no cambia día a día), se ordena una sola vez aquí y
  // se cachea el resultado por mes.
  const monthCache = {};
  let total = 0;
  let d = new Date(startDate+'T00:00:00');
  const end = new Date(endDate+'T00:00:00');
  while(d <= end){
    const year = d.getFullYear(), month = d.getMonth();
    const cacheKey = `${year}-${month}`;
    if(!(cacheKey in monthCache)) monthCache[cacheKey] = geTotalFijosNetoForMonth(year, month);
    const fijosMonth = monthCache[cacheKey];
    if(fijosMonth) total += fijosMonth / daysInMonth(year, month);
    d.setDate(d.getDate()+1);
  }
  return total;
}
function geGastosTotalForRange(startDate, endDate){
  return geVariablesTotalForRange(startDate, endDate) + geFijosForRange(startDate, endDate);
}
// Facturación NETA (sin IVA) de un mes, a partir del IVA real de cada línea
// de venta (line.ivaPct) — mismo criterio que ventasIvaGroups/
// facturacionNetaMes dentro del módulo Gestión Económica (js/hr.js), pero
// como funciones globales reutilizables desde el Dashboard sin depender de
// los closures internos de GE. Antes el "Resultado del mes" del Dashboard
// se calculaba como facturación CON IVA (salesTotalForMonth) menos gastos
// SIN IVA (netos), lo que inflaba el resultado mostrado en un 10-21% —
// y encima nunca restaba comisiones de plataformas de delivery ni cuotas
// de inversiones CAPEX financiadas, a diferencia de GE → Resultado/CDR
// (resultadoAntesImpMes), que sí lo hacen bien. Con esto el Dashboard usa
// exactamente la misma fórmula que esas dos pestañas.
function geVentasIvaGroupsMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const fallbackRate = (DB.business.ticket && DB.business.ticket.ivaPct!=null) ? parseFloat(DB.business.ticket.ivaPct) : 10;
  const groups = {};
  activeSales().filter(v=>(v.date||'').startsWith(mesStr)).forEach(sale => {
    const descPct = parseFloat(sale.descuentoPct)||0;
    (sale.items||[]).forEach(line => {
      const grossLine = (parseFloat(line.price)||0) * (parseFloat(line.qty)||0) * (1 - descPct/100);
      if(grossLine <= 0) return;
      const rate = line.ivaPct != null ? parseFloat(line.ivaPct) : parseFloat(ivaPorDefectoDe(line));
      const base = grossLine / (1 + rate/100);
      if(!groups[rate]) groups[rate] = {base:0, iva:0};
      groups[rate].base += base;
      groups[rate].iva += grossLine - base;
    });
  });
  geAjustarSenalesIva(groups, mesStr);
  geAjustarAnulaciones(groups, mesStr, fallbackRate);
  return groups;
}
// Una venta anulada con rectificativa (art. 89.Cinco LIVA, art. 15 RD
// 1619/2012): la factura original SIGUE contando en su mes, y la
// rectificativa la resta en el mes en que se emite. Antes la anulación
// sacaba la venta de su mes original: si se anulaba en marzo una venta de
// enero, el IVA de enero (otro trimestre, ya presentado) bajaba solo.
// Las anulaciones de antes de las rectificativas no tienen fecha propia y
// siguen fuera, como siempre.
function geAjustarAnulaciones(groups, mesStr, fallbackRate){
  (DB.sales||[]).forEach(v => {
    if(v.status !== 'anulada' || !v.rectificativa) return;
    const enOrigen = (v.date||'').startsWith(mesStr), enRect = (v.rectificativa.fecha||'').startsWith(mesStr);
    if(enOrigen === enRect) return;   // los dos el mismo mes: se anulan entre sí
    const desc = parseFloat(v.descuentoPct)||0;
    (v.items||[]).forEach(l => {
      const gross = (parseFloat(l.price)||0)*(parseFloat(l.qty)||0)*(1-desc/100) * (enOrigen ? 1 : -1);
      if(!gross) return;
      const rate = l.ivaPct != null ? parseFloat(l.ivaPct) : parseFloat(ivaPorDefectoDe(l));
      if(!groups[rate]) groups[rate] = {base:0, iva:0};
      const net = gross/(1+rate/100);
      groups[rate].base += net; groups[rate].iva += gross - net;
    });
  });
}
// Señales de reserva (auditoría contable, 5/10): un anticipo tributa
// cuando se COBRA (art. 75.Dos LIVA), no el día de la cena. Se suma al 10%
// de la hostelería en el mes del cobro, y la venta final descuenta ese
// mismo importe en el suyo — si no, se pagaba entero el mes de la cena.
// Solo las cobradas desde SENAL_IVA_DESDE: las anteriores ya tributaron en
// su venta final con el criterio viejo y no se tocan. La usan GE (Cuenta
// de Resultados, IVA) y el Panel, para que den la MISMA cifra.
const SENAL_IVA_DESDE = '2026-10-05';
function geAjustarSenalesIva(groups, mesStr){
  const add = (gross, sign) => {
    if(!(gross > 0)) return;
    if(!groups[10]) groups[10] = {base:0, iva:0};
    const net = gross / 1.10;
    groups[10].base += sign*net;
    groups[10].iva += sign*(gross - net);
  };
  (DB.reservations||[]).forEach(r => {
    const f = r.depositPagoFecha ? diaLocalDe(r.depositPagoFecha) : '';
    if(r.depositConfirmed && !r.depositNeedsRefund && f >= SENAL_IVA_DESDE && f.startsWith(mesStr)) add(parseFloat(r.depositPagoImporte)||0, 1);
  });
  activeSales().filter(v => (v.date||'').startsWith(mesStr) && v.senal > 0 && v.senalPagoFecha && diaLocalDe(v.senalPagoFecha) >= SENAL_IVA_DESDE)
    .forEach(v => add(parseFloat(v.senal)||0, -1));
}
function geFacturacionNetaMes(year, month){
  return Object.values(geVentasIvaGroupsMes(year, month)).reduce((s,g)=>s+g.base, 0);
}
// Comisiones de plataformas de delivery (Glovo, Uber Eats...) cobradas en
// ventas del mes, en BASE (sin IVA) — igual que comisionesMes en GE
// (js/hr.js): sale.comisionPlataforma se guarda con el IVA de la plataforma
// ya sumado, hay que descontarlo para no mezclar un bruto con el resto de
// cifras netas de esta fórmula.
function geComisionesMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  return activeSales().filter(v=>(v.date||'').startsWith(mesStr)).reduce((s,v) => {
    const bruto = parseFloat(v.comisionPlataforma||0);
    if(!bruto || (v.plataforma && v.plataforma.facturaReal)) return s;
    const ivaPct = (v.plataforma && v.plataforma.ivaPct!=null) ? parseFloat(v.plataforma.ivaPct) : 0;
    return s + bruto / (1 + ivaPct/100);
  }, 0);
}
// Cuota mensual de inversiones CAPEX financiadas a plazos, mientras dure el pago.
function geCapexCuotaMes(year, month){
  return (DB.ge.capex||[]).filter(c=>c.financiado && c.cuotaMensual && c.fecha).reduce((s,c)=>{
    const [fy,fm] = c.fecha.split('-').map(Number);
    const elapsed = (year*12+month) - (fy*12+(fm-1));
    const cuotas = parseInt(c.cuotas)||0;
    return s + (elapsed>=0 && elapsed<cuotas ? parseFloat(c.cuotaMensual||0) : 0);
  }, 0);
}
/* ============================================================
   MOTOR FISCAL (auditoría contable, 5/10)
   ============================================================
   La Cuenta de Resultados tiene que dar lo que diría el gestor, y eso
   depende de la FORMA del negocio (Mi Negocio → forma jurídica y régimen).
   Aquí vive todo lo que cambia según esa forma, para que la Cuenta de
   Resultados, la Tesorería y el Panel calculen exactamente lo mismo:

   - El sueldo del titular: en un autónomo o una comunidad de bienes NO es
     gasto (el titular tributa por todo el beneficio; lo que se "paga" es
     una retirada). En una sociedad sí, porque es una nómina de verdad. La
     cuota de autónomos sí es gasto en los dos casos.
   - Las inversiones: el gasto es la AMORTIZACIÓN (lo que pierde de valor
     cada año, con los coeficientes oficiales) más los INTERESES del
     préstamo. La parte de la cuota que devuelve lo prestado no es gasto:
     es caja, y va en Tesorería. Antes se restaba la cuota entera, y lo
     pagado al contado no se restaba nunca.
   - El impuesto: se calcula sobre el AÑO, no mes a mes. Un mes con
     pérdidas compensa uno con beneficio, igual que en la declaración.
     Sociedad: su tipo sobre la base del año (menos las pérdidas de años
     anteriores). Autónomo/CB: la escala del IRPF por tramos, con el mínimo
     personal y el 5% de gastos de difícil justificación. */
// La forma jurídica y el régimen los fija quien da de alta al cliente (generador de licencias → issuedCodes → lic.fiscal) y
// en Mi Negocio salen BLOQUEADOS. Esta función los vuelca a DB.business (idempotente, sin guardar): se llama desde fiscalPerfil(),
// que usan todas las cuentas, así ningún cálculo ve nunca un dato distinto del de la licencia. Un negocio antiguo (sin lic.fiscal)
// sigue editando los suyos como siempre.
function aplicarFiscalDeLicencia(){
  const f = DB && DB.license && DB.license.fiscal;
  if(!f || !f.formaJuridica || !DB.business) return false;
  const b = DB.business; let cambio = false;
  const poner = (k, v) => { if(v != null && b[k] !== v){ b[k] = v; cambio = true; } };
  poner('formaJuridica', f.formaJuridica);
  if(f.formaJuridica === 'autonomo'){ poner('regimenFiscal', f.regimenFiscal || 'directa'); poner('modalidadDirecta', f.modalidadDirecta || 'simplificada'); }
  else poner('regimenFiscal', 'directa');
  if(f.territorio) poner('territorio', f.territorio);
  poner('fiscalFijado', true);
  return cambio;
}
function fiscalPerfil(){
  aplicarFiscalDeLicencia();
  const b = DB.business || {};
  const forma = b.formaJuridica || '';
  return {
    forma,
    modulos: forma === 'autonomo' && b.regimenFiscal === 'modulos',
    // Sin forma elegida se trata como sociedad: es lo que hacía la app
    // hasta ahora (un % plano editable) y no inventa un IRPF que nadie ha
    // confirmado.
    personaFisica: forma === 'autonomo' || forma === 'cb',
  };
}

// --- Sueldo del titular ---------------------------------------------------
function gfEsRetribucionTitular(g){
  if(!g || g.categoria !== 'PERSONAL') return false;
  if(g.esTitular != null) return !!g.esTitular;
  return (g.nombre||'').toUpperCase() === 'RETRIBUCIÓN EMPRESARIO';
}
function geTotalRetribTitular(){
  return (DB.ge.fijos||[]).filter(gfEsRetribucionTitular).reduce((s,g)=>s+gfMonthlyImporte(g),0);
}
function geRetribTitularForMonth(year, month){
  if(!geMesConActividad(year, month)) return 0;
  const v = geFijosLogValueForMonth(year, month, 'retribTitular');
  return v==null ? geTotalRetribTitular() : v;
}
// Gastos fijos que SÍ son gasto fiscal ese mes.
function geFijosDeduciblesForMonth(year, month){
  const total = geTotalFijosNetoForMonth(year, month);
  return fiscalPerfil().personaFisica ? total - geRetribTitularForMonth(year, month) : total;
}
function gePersonalDeducibleForMonth(year, month){
  const per = geTotalPersonalNetoForMonth(year, month);
  return fiscalPerfil().personaFisica ? per - geRetribTitularForMonth(year, month) : per;
}

// --- Amortización ---------------------------------------------------------
// Coeficientes máximos: tabla del Impuesto de Sociedades (art. 12.1.a LIS)
// y tabla simplificada de estimación directa para autónomos (Orden de 27
// de marzo de 1998). Las dos se parecen, pero no son iguales.
const AMORT_TIPOS = {
  obras:       {is:10, ed:10},   // obras e instalaciones del local
  mobiliario:  {is:10, ed:10},   // mesas, sillas, barra, decoración
  maquinaria:  {is:12, ed:12},   // cocina, cámaras, cafetera, lavavajillas
  informatica: {is:25, ed:26},   // TPV, ordenador, tablet, impresora
  software:    {is:33, ed:26},
  utiles:      {is:25, ed:30},   // menaje, herramientas
  vehiculo:    {is:16, ed:16},
};
// Una inversión de hasta 300 € se puede llevar entera a gasto el año en
// que se compra (art. 103 LIS para empresas de reducida dimensión; los
// autónomos en estimación directa, por remisión del art. 30 LIRPF).
const AMORT_ESCASO_VALOR = 300;
function capexCoefAmort(c){
  const tipo = AMORT_TIPOS[c.tipoAmort] || AMORT_TIPOS.mobiliario;
  // La tabla de estimación directa SIMPLIFICADA es la de personas físicas; en la
  // normal rige la del Impuesto de Sociedades (art. 30 RIRPF).
  const coef = (fiscalPerfil().personaFisica && (DB.business||{}).modalidadDirecta !== 'normal') ? tipo.ed : tipo.is;
  // Obras en un local ALQUILADO: se amortizan en lo que dure el contrato
  // (prórrogas incluidas) si es menos que su vida útil (PGC, norma de
  // valoración 3ª.h). Un contrato de 5 años = 20% al año, no 10%.
  const años = parseFloat(c.añosContrato);
  if(c.tipoAmort === 'obras' && años > 0) return Math.max(coef, Math.min(100, 100 / años));
  return coef;
}
// Vehículo: Hacienda presume que se usa al 50% para el negocio (art.
// 95.Tres LIVA), así que solo se deduce la mitad de su IVA; la otra mitad
// es más coste del vehículo y se amortiza con él.
function capexIvaDeduciblePct(c){ return c.tipoAmort === 'vehiculo' ? 0.5 : 1; }
function capexBaseAmortizable(c){
  const imp = parseFloat(c.importe)||0;
  return imp + imp * (parseFloat(c.iva)||0)/100 * (1 - capexIvaDeduciblePct(c));
}
// Bienes de hasta 300 €: a gasto entero, pero solo hasta 25.000 € al año
// en total (art. 103 LIS); lo que pase de ahí se amortiza normal.
function capexEsEscasoValor(c){
  const base = capexBaseAmortizable(c);
  if(base > AMORT_ESCASO_VALOR || !c.fecha) return false;
  const año = c.fecha.slice(0,4);
  const previos = (DB.ge.capex||[]).filter(x => x !== c && x.fecha && x.fecha.slice(0,4) === año && capexBaseAmortizable(x) <= AMORT_ESCASO_VALOR
    && (x.fecha < c.fecha || (x.fecha === c.fecha && (x.id||0) < (c.id||0))));
  return previos.reduce((s,x)=>s+capexBaseAmortizable(x), 0) + base <= 25000;
}
function capexMesesDesdeCompra(c, year, month){
  const [fy,fm] = (c.fecha||'').split('-').map(Number);
  if(!fy || !fm) return null;
  return (year*12+month) - (fy*12+(fm-1));
}
function capexAmortizacionMes(c, year, month){
  // Un turismo de uso mixto no es elemento afecto en el IRPF (art. 22.2 RIRPF): ni amortización
  // ni gasto. El IVA al 50 % del vehículo sí se deduce, y eso va por otro lado.
  if(c.turismoMixto && fiscalPerfil().personaFisica) return 0;
  const base = capexBaseAmortizable(c);
  const k = capexMesesDesdeCompra(c, year, month);
  if(!(base > 0) || k == null || k < 0) return 0;
  if(capexEsEscasoValor(c)) return k === 0 ? base : 0;
  const cuota = base * capexCoefAmort(c) / 100 / 12;
  const yaAmortizado = Math.min(base, cuota * k);
  return Math.max(0, Math.min(cuota, base - yaAmortizado));
}
function geAmortizacionMes(year, month){
  if(!geMesConActividad(year, month)) return 0;
  return (DB.ge.capex||[]).reduce((s,c)=>s+capexAmortizacionMes(c, year, month), 0);
}
// --- Préstamos: intereses (gasto) y devolución (caja) ---------------------
// Cuadro francés (cuota constante), que es como amortizan casi todos los
// préstamos y leasings. El tipo de interés se deduce de lo que se financió,
// la cuota y el número de cuotas. Si no se dice cuánto se financió, se da
// por hecho el total de la factura con IVA, que es lo que paga el banco.
function capexImporteFinanciado(c){
  const v = parseFloat(c.importeFinanciado);
  if(v > 0) return v;
  return (parseFloat(c.importe)||0) * (1 + (parseFloat(c.iva)||0)/100);
}
function capexTipoMensual(c){
  const P = capexImporteFinanciado(c), q = parseFloat(c.cuotaMensual)||0, n = parseInt(c.cuotas)||0;
  if(!(P > 0) || !(q > 0) || n < 1 || q*n <= P + 0.005) return 0;
  let lo = 0, hi = 1;
  for(let i=0;i<80;i++){
    const r = (lo+hi)/2;
    const cuota = P * r / (1 - Math.pow(1+r, -n));
    if(cuota > q) hi = r; else lo = r;
  }
  return (lo+hi)/2;
}
// {interes, principal} de la cuota del mes.
function capexCuotaDesglose(c, year, month){
  if(!c.financiado) return {interes:0, principal:0};
  const k = capexMesesDesdeCompra(c, year, month);
  const n = parseInt(c.cuotas)||0, q = parseFloat(c.cuotaMensual)||0;
  if(k == null || k < 0 || k >= n || !(q > 0)) return {interes:0, principal:0};
  const r = capexTipoMensual(c);
  let saldo = capexImporteFinanciado(c);
  for(let i=0;i<k;i++) saldo = saldo*(1+r) - q;
  const interes = Math.max(0, saldo * r);
  return {interes, principal: q - interes};
}
function geInteresesMes(year, month){
  if(!geMesConActividad(year, month)) return 0;
  return (DB.ge.capex||[]).reduce((s,c)=>s+capexCuotaDesglose(c, year, month).interes, 0);
}
function geDevolucionPrestamosMes(year, month){
  return (DB.ge.capex||[]).reduce((s,c)=>s+capexCuotaDesglose(c, year, month).principal, 0);
}

// --- Otros ingresos y autoconsumo ---------------------------------------
// Lo que entra y no es una venta del TPV, cada uno con su IVA:
//  · subvención: no lleva IVA (no es contraprestación de nada), pero SÍ es
//    ingreso del año (PGC, cuenta 74);
//  · comisión de máquinas recreativas o de tabaco: lo que le paga el
//    operador al bar es un servicio al 21%, no una venta al 10%; lo que se
//    queda el operador no es del negocio y no se anota;
//  · alquiler del local o de un espacio para un evento sin servicio: 21%;
//  · otro: con el IVA que diga su factura.
// Y el AUTOCONSUMO del titular (lo que se come o se lleva de su propio
// negocio, anotado como merma "Consumo propio"): Hacienda lo trata como una
// venta a precio de coste (arts. 9.1 y 79.Tres LIVA; art. 28.3 LIRPF).
const OTROS_INGRESOS_TIPOS = {subvencion:0, maquinas:21, alquiler:21, otro:null};
const AUTOCONSUMO_IVA = 10;
// VALES REGALO (art. 75.Dos bis LIVA):
//  · POLIVALENTE (un importe en euros para gastar en lo que quieran): al
//    venderlo NO hay IVA ni ingreso — es dinero cobrado por adelantado. La
//    comida se cobra con el vale en el TPV y ESA venta lleva su IVA normal.
//    Aquí solo se lleva la cuenta de lo pendiente de canjear.
//  · UNIVALENTE (algo concreto con su IVA ya sabido: "menú degustación para
//    dos"): el IVA se devenga AL VENDERLO. Cuando se canjea, la venta del
//    TPV vuelve a contar la comida, así que ese mes se resta lo del vale
//    (igual que la señal de una reserva).
function geValesUnivalentesMes(mesStr){
  let base = 0, iva = 0;
  (DB.ge.vales||[]).forEach(v => {
    if(v.tipo !== 'univalente') return;
    const total = parseFloat(v.importe)||0, pct = parseFloat(v.iva)||0, b = total/(1+pct/100);
    if((v.fecha||'').startsWith(mesStr)){ base += b; iva += total - b; }
    if((v.canjeFecha||'').startsWith(mesStr)){ base -= b; iva -= total - b; }
  });
  return {base, iva};
}
// Un vale «vivo» es el que todavía se puede canjear: ni canjeado del todo ni caducado.
// Lo caducado deja de ser dinero que se deba servir (el gestor decide cómo tratarlo).
function geValeVivo(v){ return !v.canjeFecha && !(v.venceEn && v.venceEn < todayStr()); }
function geValesPendientes(){
  return (DB.ge.vales||[]).filter(geValeVivo).reduce((s,v)=>s+Math.max(0, (parseFloat(v.importe)||0) - (parseFloat(v.canjeParcial)||0)), 0);
}
function geOtrosIngresosMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const vu = geValesUnivalentesMes(mesStr);
  let base = vu.base, iva = vu.iva;
  (DB.ge.otrosIngresos||[]).forEach(o => {
    if(!(o.fecha||'').startsWith(mesStr)) return;
    const b = parseFloat(o.base)||0;
    base += b; iva += b * (parseFloat(o.iva)||0) / 100;
  });
  const auto = (DB.mermas||[]).filter(x => x.motivo === 'consumoPropio' && (x.fecha||'').startsWith(mesStr)).reduce((s,x)=>s+(parseFloat(x.coste)||0), 0);
  return {base, iva, autoconsumo: auto, autoconsumoIva: auto * AUTOCONSUMO_IVA / 100};
}
// Lo que suma al resultado (ingresos sin IVA, autoconsumo incluido).
function geOtrosIngresosNetoMes(year, month){
  const o = geOtrosIngresosMes(year, month);
  return o.base + o.autoconsumo;
}
function geOtrosIngresosIvaMes(year, month){
  const o = geOtrosIngresosMes(year, month);
  return o.iva + o.autoconsumoIva;
}

// --- Existencias (PGC, cuenta 61: variación de existencias) --------------
// Lo comprado no es lo consumido: si acabas el mes con la cámara y la
// bodega más llenas que lo empezaste, parte de las compras sigue en el
// almacén y no es gasto todavía. Consumo = compras + existencias iniciales
// − existencias finales. Sin esto, cerrar el año con la bodega llena
// "costaba" miles de euros que no eran gasto, y con ellos el impuesto.
// El valor de cada mes es la foto del stock de la app a coste
// (stockTotalValueBreakdown), que se va actualizando sola mientras dura el
// mes; si el negocio hace un recuento real, lo escribe a mano y manda.
function existenciasClave(year, month){ return `${year}-${String(month+1).padStart(2,'0')}`; }
function existenciasMes(year, month){
  const e = (DB.ge.existencias || {})[existenciasClave(year, month)];
  return e && e.v != null ? parseFloat(e.v) : null;
}
/* Devuelve true si la foto cambió (para que quien llame guarde). ⚠️ Antes SOLO se tomaba al abrir Gestión Económica, y el texto prometía que
   «se va actualizando sola»: si no se entraba allí los últimos días del mes, el valor de fin de mes era el de la última vez que se entró y la
   variación salía mal. Ahora la repite cada pocos minutos la propia app (ver `existenciasFotoPeriodica`, js/app.js). */
function fotoExistenciasAuto(){
  try{
    if(typeof stockTotalValueBreakdown !== 'function' || !DB.ingredients) return false;
    const d = new Date(), k = existenciasClave(d.getFullYear(), d.getMonth());
    DB.ge.existencias = DB.ge.existencias || {};
    const e = DB.ge.existencias[k];
    if(e && e.manual) return false;
    const v = Math.round(stockTotalValueBreakdown().total * 100) / 100;
    if(!e || Math.abs((parseFloat(e.v)||0) - v) > 0.005){ DB.ge.existencias[k] = {v, ts: new Date().toISOString()}; return true; }
  }catch(err){ console.error('Foto de existencias', err); }
  return false;
}
// Solo el propietario, con la pantalla a la vista y sin leer otro negocio: así no hay varios aparatos reescribiendo lo mismo ni ruido en la nube.
function existenciasFotoPeriodica(){
  try{
    if(typeof document !== 'undefined' && document.hidden) return;
    if(typeof vgLeyendoOtroNegocio !== 'undefined' && vgLeyendoOtroNegocio) return;
    const ses = (typeof getAccessSession === 'function') ? getAccessSession() : null;
    if(!ses || ses.type !== 'owner') return;
    if(fotoExistenciasAuto()) saveDB();
  }catch(e){}
}
// Positivo = el almacén bajó (se consumió más de lo comprado): más gasto.
function geVariacionExistenciasMes(year, month){
  if((DB.ge.config || {}).usarExistencias === false) return 0;
  const fin = existenciasMes(year, month);
  const prev = new Date(year, month - 1, 1);
  const ini = existenciasMes(prev.getFullYear(), prev.getMonth());
  if(fin == null || ini == null) return 0;
  return ini - fin;
}

// --- Punto de equilibrio del mes, con las cifras REALES (12/11) ---------------------------------------------------------
// UNA sola cuenta para el Panel de Control. Separa lo que NO depende de lo que se vende (fijos) de lo que SÍ (variable), con
// la misma contabilidad que la Cuenta de Resultados, de modo que «has superado el equilibrio» ⇔ «el resultado del mes ≥ 0»:
//   resultado = ventas + otros ingresos − variable − fijos        (idéntico a geResultadoAntesImpMes: lo vigila test/panel-equilibrio.mjs)
//   · FIJOS    = personal + gastos fijos (sin la retribución del titular si es persona física) + amortización + intereses − otros ingresos
//   · VARIABLE = compras (gasto variable) + variación de existencias + comisiones de plataformas → %, sobre las ventas netas
// ⚠️ Antes los fijos eran «ventas − variables − resultado», que metía en los fijos las comisiones y la variación de existencias
// (suben y bajan con las ventas y con la foto del almacén) y inflaba el equilibrio. Con pocos datos (menos de 7 días del mes o sin
// ventas) el % variable real es ruido —una factura grande entrada el día 2 lo dispara—: se usa el objetivo del negocio
// (food cost objetivo + «otros costes variables» de Punto de equilibrio) y se dice.
function geEquilibrioMes(year, month, diaDelMes){
  const S = geFacturacionNetaMes(year, month);
  const compras = geTotalVariablesNetoMes(year, month), exis = geVariacionExistenciasMes(year, month), comis = geComisionesMes(year, month);
  const otrosIng = geOtrosIngresosNetoMes(year, month);
  const fijosOp = geFijosDeduciblesForMonth(year, month);
  const personal = Math.min(fijosOp, Math.max(0, gePersonalDeducibleForMonth(year, month)));
  const amort = geAmortizacionMes(year, month), intereses = geInteresesMes(year, month);
  const fijos = Math.max(0, fijosOp + amort + intereses - otrosIng);
  const variable = compras + exis + comis;
  const vReal = S > 0 ? Math.max(0, variable / S) : null;
  const fcObj = geFoodCostObjPct() / 100, otrosPct = ((DB.ge.config || {}).peOtrosPct || 0) / 100;
  const vObjetivo = Math.min(0.95, fcObj + otrosPct);
  const dia = diaDelMes != null ? diaDelMes : 31;
  const suficientes = vReal != null && dia >= 7;
  const v = suficientes ? Math.min(0.95, vReal) : vObjetivo;
  return {S, compras, exis, comis, otrosIng, personal, gastosFijos: fijosOp - personal, amort, intereses, fijos, variable, vReal, vObjetivo, v, suficientes,
    cuotasBanco: geCapexCuotaMes(year, month), resultado: S + otrosIng - variable - fijosOp - amort - intereses};
}

// Resultado antes de impuestos de un mes — misma fórmula que GE → Cuenta
// de Resultados (resultadoAntesImpMes, js/hr.js), para que el Panel diga
// lo mismo.
function geResultadoAntesImpMes(year, month){
  return geFacturacionNetaMes(year,month) + geOtrosIngresosNetoMes(year,month) - geTotalVariablesNetoMes(year,month) - geVariacionExistenciasMes(year,month) - geFijosDeduciblesForMonth(year,month)
    - geComisionesMes(year,month) - geAmortizacionMes(year,month) - geInteresesMes(year,month);
}

// --- Impuesto sobre el beneficio -------------------------------------------
// Escala general del IRPF (estatal + autonómica de referencia), 2026. Cada
// comunidad autónoma ajusta su mitad: Madrid paga algo menos, Cataluña o
// Valencia algo más. Es la que usa la gestoría para provisionar si no se
// sabe nada más.
// La escala (estatal + autonómica, según el territorio fijado) vive en js/motor-fiscal.js: aquí solo se pide la cuota.
const IRPF_MINIMO_PERSONAL = 5550;
function cuotaIrpfEscala(base){ return motorIrpfCuotaEscala(base, territorioFiscal()); }
// IRPF de una persona por el rendimiento de la actividad. Estimación
// directa simplificada: 5% de gastos de difícil justificación, como mucho
// 2.000 € al año (art. 30.2.4ª LIRPF). El mínimo personal se descuenta
// como cuota, que es como lo hace la ley (art. 63 y 74 LIRPF).
// · El 5% de difícil justificación es SOLO de la estimación directa
//   SIMPLIFICADA (la de casi todo autónomo de hostelería). En la normal no.
// · Reducción por rentas no exentas bajas (art. 32.2.3º LIRPF): 1.620 € si
//   la renta no pasa de 8.000 €, y baja en línea recta hasta 0 a los 12.000 €.
// · Además, la de actividades económicas (art. 32.1, ver arriba), que exige
//   que las otras rentas del titular no pasen de 6.500 €.
function reduccionRendimientosBajos(rn){
  if(!(rn > 0) || rn > 12000) return 0;
  return rn <= 8000 ? 1620 : Math.max(0, 1620 - 0.405 * (rn - 8000));
}
// Reducción por rendimientos de actividades económicas (art. 32.1 LIRPF, desde 2023, Ley 31/2022): 6.498 € si el rendimiento neto
// es ≤ 14.047,50 €, y baja 1,14 € por cada euro de más hasta 0 en 19.747,50 €. Solo en estimación DIRECTA y si las demás rentas
// (no de actividades) no pasan de 6.500 €. Fuente: AEAT, «Principales novedades de la Ley de Presupuestos 2023».
// ⚠️ Faltaba (2/11): la app solo conocía la de 1.620 € de abajo y sobreestimaba el IRPF de todo autónomo pequeño.
function reduccionActividadesEconomicas(rn){
  if(!(rn > 0) || rn >= 19747.5) return 0;
  return Math.min(rn, rn <= 14047.5 ? 6498 : Math.max(0, 6498 - 1.14 * (rn - 14047.5)));
}
function irpfActividad(rendimiento, opts={}){ return irpfActividadDetalle(rendimiento, opts).cuota; }
// Lo mismo, pero explicando cada paso (trazabilidad: js/motor-fiscal.js → fiscalTrazaAnual). Una sola implementación:
// irpfActividad() solo se queda con la cuota.
function irpfActividadDetalle(rendimiento, opts={}){
  const d = {rendimiento, cuota:0, pasos:[], reglas:[], territorio: territorioFiscal()};
  if(!(rendimiento > 0)) return d;
  const paso = (et, v, regla) => { d.pasos.push({et, v, regla: regla || null}); if(regla && !d.reglas.includes(regla)) d.reglas.push(regla); };
  const simplificada = !opts.sinDificilJustificacion && (DB.business||{}).modalidadDirecta !== 'normal';
  let neto = rendimiento;
  paso(gl({es:'Rendimiento neto previo de la actividad', ca:'Rendiment net previ de l\'activitat', en:'Net activity income before reductions'}), rendimiento);
  if(simplificada){
    const dif = Math.min(2000, rendimiento*0.05); neto = rendimiento - dif;
    paso(gl({es:'Gastos de difícil justificación (5 %, máx. 2.000 €)', ca:'Despeses de difícil justificació (5 %, màx. 2.000 €)', en:'Hard-to-document expenses (5 %, max 2,000 €)'}), -dif, 'IRPF-DIFICIL-5');
  }
  // ⚠️ Las reducciones de 6.498 € y de 1.620 € son ALTERNATIVAS (AEAT, Manual práctico de Renta 2025, «Reducción para
  // contribuyentes con rentas no exentas inferiores a 12.000 euros»: solo se aplica si NO se cumplen los requisitos de la de
  // 6.498 €). Hasta el 6/11 la app aplicaba las dos una detrás de otra y regalaba hasta 1.620 € de reducción de más.
  //   · 6.498 € (art. 32.2 LIRPF, Ley 31/2022): rendimiento neto ≤ 19.747,50 € y otras rentas ≤ 6.500 €.
  //   · 1.620 € (art. 32.2.3.º): si no se cumple lo anterior, y las rentas no exentas TOTALES (actividad + otras) son < 12.000 €.
  const bzR = DB.business || {};
  const otrasR = Math.max(0, parseFloat(opts.otrasRentas != null ? opts.otrasRentas : bzR.otrasRentasTitular) || 0);
  if(!opts.sinDificilJustificacion){
    if(otrasR <= 6500 && neto < 19747.5){ const r = Math.min(neto, reduccionActividadesEconomicas(neto)); neto = Math.max(0, neto - r); if(r > 0) paso(gl({es:'Reducción por rendimientos de actividades económicas (6.498 €)', ca:'Reducció per rendiments d\'activitats econòmiques (6.498 €)', en:'Reduction for business income (6,498 €)'}), -r, 'IRPF-RED-6498'); }
    else { const r = Math.min(neto, reduccionRendimientosBajos(neto + otrasR)); neto = Math.max(0, neto - r); if(r > 0) paso(gl({es:'Reducción por rentas bajas (1.620 €)', ca:'Reducció per rendes baixes (1.620 €)', en:'Reduction for low income (1,620 €)'}), -r, 'IRPF-RED-1620'); }
  }
  // Inicio de actividad (art. 32.3 LIRPF): -20 % del rendimiento neto positivo (hasta 100.000 €) el primer año con beneficio y el
  // siguiente. Solo si el dueño lo marca: la app no sabe si antes ya ejerció otra actividad.
  if(!opts.sinDificilJustificacion && (DB.business||{}).inicioActividad20){ const r = Math.min(neto, 100000) * 0.20; neto -= r; paso(gl({es:'Reducción por inicio de actividad (20 %)', ca:'Reducció per inici d\'activitat (20 %)', en:'Start-up reduction (20 %)'}), -r, 'IRPF-INICIO-20'); }
  // Otras rentas del titular (p. ej. un sueldo en otra empresa) suben el tramo al que tributa la actividad; los hijos
  // aumentan el mínimo familiar (art. 58 LIRPF: 2.400, 2.700, 4.000 y 4.500 el cuarto y siguientes).
  const bz = DB.business || {};
  const otras = Math.max(0, parseFloat(opts.otrasRentas != null ? opts.otrasRentas : bz.otrasRentasTitular) || 0);
  const hijos = Math.max(0, parseInt(opts.hijos != null ? opts.hijos : bz.hijosTitular) || 0);
  const minimo = IRPF_MINIMO_PERSONAL + [2400, 2700, 4000].slice(0, hijos).reduce((s,v)=>s+v, 0) + Math.max(0, hijos - 3) * 4500;
  const cuotaMin = cuotaIrpfEscala(minimo);
  d.baseGravada = otras + neto; d.minimo = minimo; d.cuotaMinimo = cuotaMin; d.neto = neto; d.otras = otras;
  paso(gl({es:'Rendimiento neto reducido (base sobre la que se aplica la escala)', ca:'Rendiment net reduït (base sobre la qual s\'aplica l\'escala)', en:'Reduced net income (base the scale is applied to)'}), neto);
  paso(gl({es:'Cuota por la escala del IRPF', ca:'Quota per l\'escala de l\'IRPF', en:'Tax by the income-tax scale'}), cuotaIrpfEscala(otras + neto) - cuotaIrpfEscala(otras), fiscalReglaEscalaId());
  paso(gl({es:'Menos la cuota del mínimo personal y familiar', ca:'Menys la quota del mínim personal i familiar', en:'Less the tax on the personal and family allowance'}), -(Math.min(cuotaMin, cuotaIrpfEscala(otras + neto)) - Math.min(cuotaMin, cuotaIrpfEscala(otras))), 'IRPF-MIN-PERSONAL');
  d.cuota = Math.max(0, cuotaIrpfEscala(otras + neto) - cuotaMin) - Math.max(0, cuotaIrpfEscala(otras) - cuotaMin);
  return d;
}
// Impuesto ANUAL según la forma del negocio, sobre una base anual.
// `resultadoFn(m)` da el resultado antes de impuestos de cada mes; se pasa
// desde fuera para que GE use sus propias cifras (con las señales, etc.).
// Tipos del Impuesto de Sociedades por año (Ley 7/2024, calendario 2025-2029):
// los de 2026 no valen para 2027. Fuente: Manual práctico de Sociedades, AEAT.
// 2028 en adelante se trata como 2027 hasta verificarlo. ⚠️ Revisar cada año.
// Verificado con la AEAT (Manual práctico de Sociedades 2025, «Tipos de gravamen»; disp. trans. 44.ª LIS y art. 29 LIS tras la Ley 7/2024):
//   microempresas (INCN < 1 M€): 2025 21 %/22 %, 2026 19 %/21 %, 2027 y siguientes 17 %/20 % (hasta 50.000 € y resto);
//   reducida dimensión: 2025 24 %, 2026 23 %, 2027 22 %, 2028 21 %, 2029 y siguientes 20 %.
// COOPERATIVA fiscalmente protegida, resultados cooperativos (6/11): verificados con la tabla de la AEAT (Manual de Sociedades 2025,
//   «Cuota íntegra previa») para 2025-2028: es el tipo del art. 29.1 LIS menos 3 puntos, con tope del 20 %. 2029 se DERIVA de esa misma
//   regla (ERD 20 − 3 = 17; micro igual que 2027); la AEAT aún no publica el cuadro de ese año. Antes la app llevaba 16/18 en 2025, que era erróneo.
const TIPOS_IS = {
  2025: {micro:[21,22], erd:24, coopMicro:[18,19], coopErd:20, nueva:15, coopNueva:12},
  2026: {micro:[19,21], erd:23, coopMicro:[16,18], coopErd:20, nueva:15, coopNueva:12},
  2027: {micro:[17,20], erd:22, coopMicro:[14,17], coopErd:19, nueva:15, coopNueva:12},
  2028: {micro:[17,20], erd:21, coopMicro:[14,17], coopErd:18, nueva:15, coopNueva:12},
  2029: {micro:[17,20], erd:20, coopMicro:[14,17], coopErd:17, nueva:15, coopNueva:12},
};
function tiposIsAño(a){ return TIPOS_IS[a] || (a >= 2029 ? TIPOS_IS[2029] : TIPOS_IS[2025]); }
// Cooperativa (Ley 20/1990): el excedente se minora con la dotación al FEP y el
// 50 % de la del FRO; sobre esa base, tipo micro (INCN anterior < 1 M€), de
// reducida dimensión o de nueva creación; y si es ESPECIALMENTE protegida,
// bonificación del 50 % de la cuota (art. 34.2 Ley 20/1990). Se supone cooperativa
// FISCALMENTE PROTEGIDA y todo el excedente como cooperativo: los resultados
// extracooperativos (al tipo del art. 29.1, p. ej. 25 %) los separa el gestor.
function impuestoCooperativa(excedente, opts={}){
  const b = DB.business || {};
  if(!(excedente > 0)) return 0;
  const pct = (v, def) => { const n = parseFloat(v); return n >= 0 ? n : def; };
  const fep = excedente * pct(b.coopFep, 5) / 100, fro = excedente * pct(b.coopFro, 20) / 100;
  const base = Math.max(0, excedente - fep - fro / 2);
  const T = tiposIsAño(opts.año || new Date().getFullYear());
  let cuota;
  if(opts.nuevaCreacion) cuota = base * T.coopNueva / 100;
  else if(opts.incnAnterior != null && opts.incnAnterior >= 1000000) cuota = base * T.coopErd / 100;
  else cuota = Math.min(base, 50000) * T.coopMicro[0] / 100 + Math.max(0, base - 50000) * T.coopMicro[1] / 100;
  return b.coopTipo === 'especial' ? cuota / 2 : cuota;
}
// Impuesto sobre Sociedades de una base positiva (Ley 7/2024, calendario por año en TIPOS_IS):
//  · nueva creación (primer ejercicio con base positiva y el siguiente): 15 %;
//  · microempresa (INCN del año anterior < 1 M€): dos tramos, hasta 50.000 € y resto;
//  · empresa de reducida dimensión (INCN < 10 M€): tipo único reducido;
//  · resto: 25 % general.
// ⚠️ «Nueva creación» se aproxima con el año de alta del negocio en la app (ver optsImpuesto); la sociedad puede ser más antigua.
function impuestoSociedades(base, opts={}){
  if(!(base > 0)) return 0;
  const T = tiposIsAño(opts.año || new Date().getFullYear());
  if(opts.nuevaCreacion) return base * T.nueva / 100;
  const incn = opts.incnAnterior;
  if(incn != null && incn < 1000000) return Math.min(base, 50000) * T.micro[0] / 100 + Math.max(0, base - 50000) * T.micro[1] / 100;
  if(incn != null && incn <= 10000000) return base * T.erd / 100;
  return base * 25 / 100;
}
function impuestoAnual(baseAnual, opts={}){
  const p = fiscalPerfil();
  const b = DB.business || {};
  if(p.forma === 'cb'){
    const com = Array.isArray(b.comuneros) ? b.comuneros : [];
    const suma = com.reduce((s,c)=>s+(parseFloat(c.pct)||0), 0);
    if(!(suma > 0)) return 0;
    // Cada comunero tributa por SU parte, con SU escala. Si alguno puso
    // un tipo a mano (porque tiene otros ingresos y su gestor se lo dio),
    // manda ese.
    return com.reduce((s,c) => {
      const parte = baseAnual * (parseFloat(c.pct)||0) / suma;
      const manual = parseFloat(c.tipoIrpf);
      return s + (manual > 0 ? Math.max(0, parte) * manual/100 : irpfActividad(parte, {otrasRentas: parseFloat(c.otrasRentas)||0, hijos: parseInt(c.hijos)||0}));
    }, 0);
  }
  if(p.personaFisica) return irpfActividad(baseAnual, opts);
  // Sin tipo puesto a mano: el que toca por ley, no un 25% plano (lo pasa
  // GE con opts.pctDefecto: 15% nueva creación, 19/21% micro, 23% reducida
  // dimensión; cooperativa fiscalmente protegida, 20%).
  const cfg = (DB.ge.config || {}).pctImpuestoBeneficio;
  if(p.forma === 'cooperativa' && cfg == null) return impuestoCooperativa(baseAnual, opts);
  // Sociedad sin tipo puesto a mano: la cuota EXACTA del año que se calcula (tramos incluidos), no un % sacado del año en curso.
  // Antes se aplicaba a cualquier año el tipo «sugerido» con los números de HOY: un año pasado con otra facturación salía con un tipo equivocado.
  if(cfg == null && p.forma === 'sociedad') return impuestoSociedades(baseAnual, opts);
  const pct = cfg != null ? parseFloat(cfg) : (opts.pctDefecto != null ? opts.pctDefecto : (p.forma === 'cooperativa' ? 20 : 25));
  return Math.max(0, baseAnual) * pct/100;
}
/* ============================================================
   INDICADORES PARA EL COACH (Plan 360 y mantenimiento, 6/10)
   ============================================================
   El coach trabajaba a ciegas: el panel no veía ni ventas, ni food cost,
   ni personal, y el informe del mes y el cierre se escribían a mano. Ahora
   la app calcula un resumen PEQUEÑO por mes (unos cientos de bytes) y lo
   deja en DB.business.plan360Kpis, que viaja con el bloque business a la
   nube del negocio (la del propio negocio: a GastroGoan no le cuesta nada).
   El panel lo lee en «Mi semana», en el informe del mes y en el cierre, y
   el negocio ve su marcador en euros. Las cifras salen de las MISMAS
   funciones que la Cuenta de Resultados: lo que dice el coach cuadra con
   lo que ve el hostelero.
   - meses['AAAA-MM']: los indicadores de cada mes (los últimos 15).
   - dia1: la foto de partida, el mes completo anterior al inicio del Plan
     360. Se guarda UNA vez y no se toca: es contra lo que se mide todo. */
const KPI_MESES_GUARDADOS = 15;
function r2(n){ return Math.round((Number(n)||0)*100)/100; }
function r1(n){ return Math.round((Number(n)||0)*10)/10; }
function plan360KpisMes(year, month){
  const mesStr = `${year}-${String(month+1).padStart(2,'0')}`;
  const ventas = activeSales().filter(v => (v.date||'').startsWith(mesStr));
  const netas = geFacturacionNetaMes(year, month);
  const brutas = ventas.reduce((s,v)=>s+(parseFloat(v.total)||0) - (parseFloat(v.propina)||0), 0);
  const tickets = ventas.length;
  const comensales = ventas.reduce((s,v)=>s+(parseInt(v.pax)||0), 0);
  const compras = geTotalVariablesNetoMes(year, month) + geVariacionExistenciasMes(year, month);
  const personal = geTotalPersonalNetoForMonth(year, month);
  const otrosFijos = geTotalGFNetoForMonth(year, month);
  const comisiones = geComisionesMes(year, month);
  const amortInt = geAmortizacionMes(year, month) + geInteresesMes(year, month);
  const resultado = geResultadoAntesImpMes(year, month);
  // Punto de equilibrio: lo que hay que vender para cubrir los fijos con el
  // margen que deja cada euro vendido (descontadas compras y comisiones).
  const ratioVariable = netas > 0 ? (compras + comisiones) / netas : null;
  const fijos = personal + otrosFijos + amortInt;
  const pe = (ratioVariable != null && ratioVariable < 1) ? fijos / (1 - ratioVariable) : null;
  const canal = {mesa:0, takeaway:0, delivery:0};
  ventas.forEach(v => { const k = v.tipo === 'delivery' ? 'delivery' : v.tipo === 'takeaway' ? 'takeaway' : 'mesa'; canal[k] += (parseFloat(v.total)||0) - (parseFloat(v.propina)||0); });
  const mermas = (DB.mermas||[]).filter(x => (x.fecha||'').startsWith(mesStr) && x.motivo !== 'consumoPropio' && x.motivo !== 'comidaPersonal').reduce((s,x)=>s+(parseFloat(x.coste)||0), 0);
  const nps = (DB.npsScores||[]).filter(x => (x.createdAt||'').startsWith(mesStr) && x.score != null);
  // Día más flojo: media de ventas de cada día de la semana en el mes.
  const porDia = {};
  ventas.forEach(v => { const d = new Date(v.date+'T12:00:00').getDay(); (porDia[d] = porDia[d] || {s:0, dias:new Set()}); porDia[d].s += (parseFloat(v.total)||0); porDia[d].dias.add(v.date); });
  let diaFlojo = null;
  Object.entries(porDia).forEach(([d, x]) => { const media = x.s / x.dias.size; if(!diaFlojo || media < diaFlojo.media) diaFlojo = {dia: parseInt(d), media: r2(media)}; });
  if(Object.keys(porDia).length < 3) diaFlojo = null;   // con 1-2 días abiertos no hay "más flojo"
  // El proveedor que más ha subido este mes (historial de precios).
  let subida = null;
  (DB.preciosHistorial||[]).filter(h => (h.fecha||'').startsWith(mesStr) && Number(h.pct) > 0).forEach(h => { if(!subida || h.pct > subida.pct) subida = {producto: h.nombre, proveedor: h.proveedor||'', pct: h.pct}; });
  // El plato con peor food cost del mes (al menos 5 vendidos).
  const platos = {};
  ventas.forEach(v => (v.items||[]).forEach(l => {
    if(!l || !l.name || l.isShipping) return;
    const coste = (typeof costoUnitarioDeLinea === 'function' && l.recipeId) ? costoUnitarioDeLinea(l) : null;
    if(coste == null || !(l.price > 0)) return;
    const p = platos[l.name] = platos[l.name] || {u:0, ingreso:0, coste:0};
    const neto = (parseFloat(l.price)||0) / (1 + (parseFloat(l.ivaPct)||10)/100);
    p.u += parseFloat(l.qty)||0; p.ingreso += neto*(parseFloat(l.qty)||0); p.coste += coste*(parseFloat(l.qty)||0);
  }));
  let peorPlato = null;
  Object.entries(platos).forEach(([n,p]) => { if(p.u < 5 || !(p.ingreso > 0)) return; const fc = p.coste/p.ingreso*100; if(!peorPlato || fc > peorPlato.fc) peorPlato = {plato: n, fc: r1(fc), unidades: p.u}; });
  return {
    netas: r2(netas), brutas: r2(brutas), tickets, comensales,
    ticketMedio: tickets ? r2(brutas/tickets) : null,
    foodCostPct: netas > 0 ? r1(compras/netas*100) : null,
    personalPct: netas > 0 ? r1(personal/netas*100) : null,
    compras: r2(compras), personal: r2(personal), fijos: r2(otrosFijos), comisiones: r2(comisiones),
    resultado: r2(resultado), resultadoPct: netas > 0 ? r1(resultado/netas*100) : null,
    puntoEquilibrio: pe != null ? r2(pe) : null,
    canal: {mesa: r2(canal.mesa), takeaway: r2(canal.takeaway), delivery: r2(canal.delivery)},
    mermas: r2(mermas), mermasPct: compras > 0 ? r1(mermas/compras*100) : null,
    nps: nps.length ? r1(nps.reduce((s,x)=>s+Number(x.score),0)/nps.length) : null, npsN: nps.length,
    alertas: {subida, peorPlato, diaFlojo},
  };
}
// Se recalcula a lo sumo cada 10 minutos (al pintar el Panel de Control o
// abrir Gestión Económica), solo si el negocio está en el Plan 360 o en
// mantenimiento, y solo se guarda si algo ha cambiado: así no provoca una
// subida a la nube en cada pintado.
let plan360KpisUltimo = 0;
function plan360ActualizarKpis(forzar){
  try{
    const b = DB.business || {};
    if(!b.plan360 && !b.plan360Mant && !b.plan360StartDate) return;
    if(!forzar && Date.now() - plan360KpisUltimo < 10*60*1000) return;
    plan360KpisUltimo = Date.now();
    const prev = JSON.stringify(b.plan360Kpis || null);
    const k = JSON.parse(prev) || {};
    k.meses = k.meses || {};
    const hoy = new Date();
    // El mes en curso y el anterior se recalculan siempre (aún pueden
    // cambiar: una compra que llega tarde); los de antes, solo si faltan y
    // hay ventas — así el informe tiene con qué comparar (mes anterior y
    // mismo mes del año pasado) desde el primer día.
    for(let atras = 0; atras <= 13; atras++){
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - atras, 1);
      const c = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(atras <= 1 || (!k.meses[c] && activeSales().some(v => (v.date||'').startsWith(c)))) k.meses[c] = plan360KpisMes(d.getFullYear(), d.getMonth());
    }
    Object.keys(k.meses).sort().slice(0, -KPI_MESES_GUARDADOS).forEach(c => delete k.meses[c]);
    // Foto del Día 1: el mes completo anterior al inicio del plan (si no hay
    // datos de ese mes, el propio mes del inicio). Una vez y para siempre.
    if(!k.dia1 && b.plan360StartDate){
      const [sy, sm] = b.plan360StartDate.split('-').map(Number);
      const base = new Date(sy, sm-2, 1);
      let kp = plan360KpisMes(base.getFullYear(), base.getMonth()), clave = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}`;
      if(!(kp.netas > 0)){ kp = plan360KpisMes(sy, sm-1); clave = `${sy}-${String(sm).padStart(2,'0')}`; }
      if(kp.netas > 0) k.dia1 = Object.assign({mes: clave}, kp);
    }
    // Lo que el negocio NO ve como "cambio": la hora del cálculo va aparte.
    // Se compara como lo guarda Firebase (sin null, claves ordenadas): si no,
    // lo que vuelve de la nube parece siempre distinto y se sube cada 10 min.
    const comoNube = o => { const lim = x => x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((a, kk) => { const v = lim(x[kk]); if(v !== null && v !== undefined && kk !== 'ts') a[kk] = v; return a; }, {}) : x; return JSON.stringify(lim(o)); };
    if(comoNube(k) === comoNube(JSON.parse(prev) || {})) return;
    k.ts = new Date().toISOString();
    b.plan360Kpis = k;
    saveDB();
  }catch(e){ console.error('Indicadores para el coach', e); }
}
// «Desde que empezamos»: el Día 1 frente al último mes completo, en euros
// al mes cuando se puede (lo que hace que 75 €/mes se lean como inversión).
function plan360MarcadorEuros(){
  const k = (DB.business||{}).plan360Kpis;
  if(!k || !k.dia1) return null;
  const hoy = new Date(), d = new Date(hoy.getFullYear(), hoy.getMonth()-1, 1);
  const ult = (k.meses||{})[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`];
  if(!ult || !(ult.netas > 0) || ult === k.dia1 || k.dia1.mes === `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`) return null;
  const f = [];
  const pp = (clave, mejorSiBaja) => {
    const a = k.dia1[clave], h = ult[clave];
    if(a == null || h == null) return null;
    const mejora = mejorSiBaja ? a - h : h - a;
    return {antes: a, hoy: h, mejora, euros: r2(mejora/100 * ult.netas)};
  };
  const fc = pp('foodCostPct', true); if(fc) f.push(Object.assign({k:'foodCost'}, fc));
  const pe = pp('personalPct', true); if(pe) f.push(Object.assign({k:'personal'}, pe));
  if(k.dia1.ticketMedio && ult.ticketMedio) f.push({k:'ticket', antes: k.dia1.ticketMedio, hoy: ult.ticketMedio, mejora: r2(ult.ticketMedio - k.dia1.ticketMedio), euros: r2((ult.ticketMedio - k.dia1.ticketMedio) * ult.tickets)});
  f.push({k:'ventas', antes: k.dia1.netas, hoy: ult.netas, mejora: r2(ult.netas - k.dia1.netas), euros: null});
  if(k.dia1.resultado != null) f.push({k:'resultado', antes: k.dia1.resultado, hoy: ult.resultado, mejora: r2(ult.resultado - k.dia1.resultado), euros: r2(ult.resultado - k.dia1.resultado)});
  return {desde: k.dia1.mes, mes: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, filas: f};
}
/* ── Gráficos del Panel (2/11): curva con área en vez de barras ─────────────────────────────────────────────
   Una sola función pinta cualquier serie (12 meses, 24 horas…): el trazo y el área son un SVG que se estira (sin
   deformar el grosor: vector-effect), y los puntos, las etiquetas y los meses son HTML encima, así que el texto se ve
   nítido en 320 px y en 1440 px sin scroll lateral. Cada punto es un botón: pulsarlo (o pasar por encima) pone su cifra
   en el titular. */
// Cifra entera con su separador de miles y el €, sin abreviar: «11.340 €», nunca «11,3 k€» (una «k» delante del € se lee mal en español).
function dashCompacto(v){
  return (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString(localeActual()) + ' €';
}
function dashSerieHtml(serie, o){
  o = o || {};
  const n = serie.length;
  if(!n) return '';
  const vals = serie.map(p => p.value);
  const min = Math.min(0, ...vals), max = Math.max(0, ...vals), rango = (max - min) || 1;
  const X = i => n > 1 ? i * 100 / (n - 1) : 50;
  const Y = v => 10 + (1 - (v - min) / rango) * 76;
  const y0 = Y(0);
  const pts = serie.map((p, i) => [X(i), Y(p.value)]);
  let d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
  for(let i = 1; i < n; i++){ const cx = (pts[i - 1][0] + pts[i][0]) / 2; d += ' C' + cx.toFixed(2) + ',' + pts[i - 1][1].toFixed(2) + ' ' + cx.toFixed(2) + ',' + pts[i][1].toFixed(2) + ' ' + pts[i][0].toFixed(2) + ',' + pts[i][1].toFixed(2); }
  const area = d + ' L' + pts[n - 1][0].toFixed(2) + ',' + y0.toFixed(2) + ' L' + pts[0][0].toFixed(2) + ',' + y0.toFixed(2) + ' Z';
  const iMax = vals.indexOf(Math.max(...vals)), iMin = vals.indexOf(Math.min(...vals)), iUlt = n - 1;
  const conTag = new Set([iMax, iUlt]); if(min < 0) conTag.add(iMin);
  if(o.sinTags) conTag.clear();
  const id = o.id || 'ds';
  const grid = [0.25, 0.5, 0.75].map(f => `<line x1="0" x2="100" y1="${(10 + f * 76).toFixed(2)}" y2="${(10 + f * 76).toFixed(2)}" class="dt-grid" vector-effect="non-scaling-stroke"/>`).join('');
  const cada = o.cadaEtiqueta || 1;
  return `
    <div class="dt-wrap${o.clase ? ' ' + o.clase : ''}" id="${id}">
      <div class="dt-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${grid}
          <line x1="0" x2="100" y1="${y0.toFixed(2)}" y2="${y0.toFixed(2)}" class="dt-cero" vector-effect="non-scaling-stroke"/>
          <path d="${area}" class="dt-area"/>
          <path d="${d}" class="dt-linea" vector-effect="non-scaling-stroke"/>
        </svg>
        ${serie.map((p, i) => o.estatico
          ? `<span class="dt-punto${p.value < 0 ? ' neg' : ''}${p.parcial ? ' parcial' : ''}" style="left:${pts[i][0].toFixed(2)}%;top:${pts[i][1].toFixed(2)}%" aria-hidden="true"></span>`
          : `<button type="button" class="dt-punto${p.value < 0 ? ' neg' : ''}${p.parcial ? ' parcial' : ''}${i === iUlt ? ' ult' : ''}" style="left:${pts[i][0].toFixed(2)}%;top:${pts[i][1].toFixed(2)}%" data-i="${i}"${o.tooltip ? ` data-v="${escapeHtml((p.nombre || p.label) + ': ' + (p.txt || fmtMoney(p.value)))}"` : ''} aria-label="${escapeHtml(p.nombre || p.label)}: ${escapeHtml(p.txt || fmtMoney(p.value))}" onmouseenter="dashSerieVer('${id}',${i})" onfocus="dashSerieVer('${id}',${i})" onclick="dashSerieVer('${id}',${i})"></button>`).join('')}
        ${[...conTag].map(i => `<span class="dt-tag${vals[i] < 0 ? ' neg' : ''}${pts[i][1] < 22 ? ' abajo' : ''}${i === 0 ? ' izq' : ''}${i === n - 1 ? ' der' : ''}" style="left:${pts[i][0].toFixed(2)}%;top:${pts[i][1].toFixed(2)}%">${escapeHtml(o.fmtTag ? o.fmtTag(vals[i]) : dashCompacto(vals[i]))}</span>`).join('')}
      </div>
      <div class="dt-ejes">${serie.map((p, i) => `<span class="${i % cada ? 'oculto' : ''}${p.parcial ? ' parcial' : ''}">${escapeHtml(p.label)}</span>`).join('')}</div>
    </div>`;
}
// Guarda los datos de una serie para que dashSerieVer pueda poner su cifra en el titular.
function dashSerieRegistrar(id, serie){ if(!window.dashSeriesPorId) window.dashSeriesPorId = {}; window.dashSeriesPorId[id] = serie; }
// Pone la cifra del punto tocado en el titular de su gráfico (data-dt-titular="<id>").
function dashSerieVer(id, i){
  const wrap = document.getElementById(id);
  if(!wrap) return;
  wrap.querySelectorAll('.dt-punto.sel').forEach(b => b.classList.remove('sel'));
  const b = wrap.querySelector('.dt-punto[data-i="' + i + '"]');
  if(b) b.classList.add('sel');
  const tit = document.querySelector('[data-dt-titular="' + id + '"]');
  const datos = (window.dashSeriesPorId || {})[id];
  if(tit && datos && datos[i]) tit.innerHTML = '<b>' + escapeHtml(datos[i].txt || fmtMoney(datos[i].value)) + '</b> <span>' + escapeHtml(datos[i].nombre || datos[i].label) + (datos[i].parcial ? ' · ' + escapeHtml(gl({es:'mes en curso', ca:'mes en curs', en:'current month'})) : '') + '</span>';
}
let dashTrendTab = 'ventas';
let dashTrendDatos = null;
function setDashTrendTab(k){ dashTrendTab = k; dashTrendPintar(); }
function dashTrendPintar(){
  const caja = document.getElementById('dashboard-trend');
  if(!caja || !dashTrendDatos) return;
  const tit = document.getElementById('dash-trend-tit');
  if(tit) tit.innerHTML = '<i class="ti ti-chart-line"></i> ' + escapeHtml(gl({es:'Evolución del año', ca:'Evolució de l\'any', en:'Year trend'}));
  const D = dashTrendDatos;
  const tabs = [['ventas', gl({es:'Ventas', ca:'Vendes', en:'Sales'}), 'ti-trending-up'], ['gastos', gl({es:'Gastos', ca:'Despeses', en:'Expenses'}), 'ti-receipt-2'], ['resultado', gl({es:'Resultado', ca:'Resultat', en:'Result'}), 'ti-scale']];
  if(!D.hayVentas){ caja.innerHTML = `<div class="empty es-vacio"><i class="ti ti-chart-line"></i>${escapeHtml(t('dash.noSalesYet'))}</div>`; return; }
  const serie = D[dashTrendTab];
  const completos = serie.filter(p => !p.parcial);
  const total = completos.reduce((s, p) => s + p.value, 0);
  const ult = completos[completos.length - 1], prev = completos[completos.length - 2];
  const delta = (ult && prev && prev.value !== 0) ? (ult.value - prev.value) / Math.abs(prev.value) * 100 : null;
  // En gastos, subir es malo; en ventas y resultado, bueno.
  const igual = delta != null && Math.abs(delta) < 0.5;
  const bueno = delta == null ? null : (dashTrendTab === 'gastos' ? delta <= 0 : delta >= 0);
  window.dashSeriesPorId = window.dashSeriesPorId || {};
  window.dashSeriesPorId['dt-anual'] = serie;
  caja.innerHTML = `
    <div class="dt-tabs" role="group" aria-label="${escapeHtml(gl({es:'Qué mostrar', ca:'Què mostrar', en:'What to show'}))}">
      ${tabs.map(([k, et, ic]) => `<button type="button" class="btn btn-sm btn-fino${dashTrendTab === k ? ' is-on' : ''}" aria-pressed="${dashTrendTab === k}" onclick="setDashTrendTab('${k}')"><i class="ti ${ic}"></i> ${escapeHtml(et)}</button>`).join('')}
    </div>
    <div class="dt-cab">
      <div class="dt-titular" data-dt-titular="dt-anual"><b>${escapeHtml(fmtMoney(total))}</b> <span>${escapeHtml(gl({es:'últimos 11 meses completos', ca:'darrers 11 mesos complets', en:'last 11 full months'}))}</span></div>
      ${delta != null ? `<span class="dt-delta ${igual ? 'igual' : (bueno ? 'bien' : 'mal')}"><i class="ti ${igual ? 'ti-minus' : (delta >= 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right')}"></i> ${igual ? '≈ 0' : Math.abs(delta).toFixed(0)} % <small>${escapeHtml(gl({es:'último mes completo frente al anterior', ca:'darrer mes complet respecte a l\'anterior', en:'last full month vs the one before'}))}</small></span>` : ''}
    </div>
    ${dashSerieHtml(serie, {id:'dt-anual', cadaEtiqueta: 1})}`;
}

/* Lista de avisos de la app (la usan el Panel, en «Hoy — Atención», y la campana de la cabecera). */
function avisosDeLaApp(){
  const today = new Date();
  const todayDate = todayStr();
  /* ---------- Hoy — Atención (acciones a un vistazo) ---------- */
  const openOrders = DB.tpvOrders.filter(o => o.status==='abierta').length;
  const clockedIn = DB.employees.filter(e => getOpenFichaje(e.id)).length;
  const pendingReservations = DB.reservations.filter(r => r.date===todayDate && !r.llegada && (r.status==='confirmada'||r.status==='pendiente')).length;
  const tomorrowDate = dateStr(new Date(today.getTime() + 86400000));
  const tomorrowReservations = DB.reservations.filter(r => r.date===tomorrowDate && !r.llegada && (r.status==='confirmada'||r.status==='pendiente')).length;
  // Incluye tanto ingredientes (sin contar los descatalogados, que ya no se
  // reponen y no deberían generar aviso) como elaboraciones (fondos, salsas,
  // caldos) por debajo de mínimo — antes el aviso principal del dashboard
  // solo miraba ingredientes, así que un fondo agotado no se notaba aquí.
  const lowStockIngCount = DB.ingredients.filter(ing => (ing.area||'cocina')===currentArea() && ing.activo !== false && getStockEntry(ing.id).qty < getStockEntry(ing.id).min).length;
  const lowStockElabCount = (DB.elaboraciones||[]).filter(e => (e.area||'cocina')===currentArea() && (e.qty||0) < (e.min||0)).length;
  const lowStockCount = lowStockIngCount + lowStockElabCount;
  // Antes el mantenimiento vencido (control de plagas, revisiones, etc.) solo
  // se veía si entrabas manualmente a la pestaña de Limpieza > Mantenimiento —
  // aquí se avisa igual que con el stock bajo, para que no pase desapercibido.
  const overdueMaintenanceCount = ((DB.limpieza && DB.limpieza.mantenimiento) || []).filter(e => limpiezaMantenimientoDueStatus(e) === 'overdue').length;
  // Misma idea que el mantenimiento, pero para la próxima revisión de
  // control de plagas (pestaña Plagas) — antes no se avisaba de esta en el
  // panel, solo entrando a mano a esa pestaña.
  const overduePestControlCount = ((DB.limpieza && DB.limpieza.plagas) || []).filter(e => limpiezaMantenimientoDueStatus({proximo: e.proxima}) === 'overdue').length;
  // Facturas de proveedor (generadas automáticamente al recibir un pedido)
  // con fecha de pago ya vencida y todavía sin marcar como pagadas — para
  // no acumular sorpresas de tesorería por puro despiste.
  const overdueInvoicesCount = gastosVariablesActivos().filter(v => v.fechaPago && !v.pagada && v.fechaPago < todayDate).length;
  // Repartos propios en curso (aún sin entregar) — antes solo se veían
  // entrando a TPV → Para Llevar/Delivery → Control de repartos; con esto
  // se sabe de un vistazo si hay entregas activas sin salir de Gestión.
  const activeRepartosCount = typeof getActiveRepartosOrders === 'function' ? getActiveRepartosOrders().length : 0;
  // Antes nada avisaba si un turno terminaba sin cerrar caja: quedaba a la
  // memoria de cada uno. Se avisa solo cuando ya pasó la hora de cierre de
  // hoy Y quedan ventas sin cuadrar en el periodo abierto — con el negocio
  // todavía en servicio no tiene sentido pedir un arqueo a medio turno.
  const cashClosurePendingCount = (typeof isPastTodayClosingTime === 'function' && isPastTodayClosingTime() && typeof getSalesForClosure === 'function') ? getSalesForClosure().length : 0;

  // Orden pensado por urgencia/tipo, no por casualidad de cuándo se añadió
  // cada chip: primero lo que de verdad necesita una acción (avisos en
  // rojo — son literalmente lo más "atención" de toda la fila), luego lo
  // que está pasando ahora mismo en el negocio (mesas, repartos, personal),
  // y al final lo que mira hacia adelante (reservas de hoy y mañana).
  // Pagos con tarjeta confirmados por el banco que no se pudieron aplicar a
  // ningún pedido/reserva (normalmente porque el pedido ya se había
  // rechazado/cancelado antes de que llegara la confirmación) — sin este
  // aviso, ese dinero cobrado no dejaría ningún rastro visible en la app.
  const unmatchedPaymentsCount = (DB.unmatchedOnlinePayments||[]).length;
  // Lo que antes NO avisaba y se quedaba esperando sin que nadie lo viera: pedidos de la web por aceptar, solicitudes de reserva por
  // confirmar, incidencias abiertas entre sala y cocina, cambios de turno y vacaciones por aprobar, temperaturas fuera de rango y
  // pedidos a proveedor sin recibir. Y un detalle de hostelería: los cumpleaños de hoy.
  const onlinePorAceptar = DB.tpvOrders.filter(o => o.status === 'pendiente-online').length;
  const reservasPorConfirmar = DB.reservations.filter(r => r.status === 'pendiente' && r.date >= todayDate).length;
  const incidenciasAbiertas = DB.tpvOrders.filter(o => o.status === 'abierta' && typeof incidenciaAbierta === 'function' && incidenciaAbierta(o)).length;
  const turnosPorAprobar = (DB.turnoSwapRequests||[]).filter(r => r.status === 'pending_owner').length + (DB.vacationRequests||[]).filter(r => r.status === 'pending').length;
  const tempsFuera = (DB.limpieza && DB.limpieza.temperaturas || []).filter(e => e.fecha === todayDate && e.estado === 'NOK').length;
  const pedidosPorRecibir = (DB.purchaseOrders||[]).filter(o => o.estado === 'ENVIADO').length;
  const cumplesHoy = (DB.clients||[]).filter(c => c.cumpleanos && typeof nextBirthdayDays === 'function' && nextBirthdayDays(c.cumpleanos) === 0).length;
  const attentionItems = [
    {count: onlinePorAceptar, icon:'ti-world', label: gl({es:'Pedidos de la web por aceptar', ca:'Comandes de la web per acceptar', en:'Web orders to accept'}), onclick: `navigate('tpv')`, warn:true},
    {count: reservasPorConfirmar, icon:'ti-calendar-question', label: gl({es:'Reservas por confirmar', ca:'Reserves per confirmar', en:'Bookings to confirm'}), onclick: `navigate('reservas')`, warn:true},
    {count: incidenciasAbiertas, icon:'ti-message-exclamation', label: gl({es:'Incidencias abiertas en comandas', ca:'Incidències obertes a comandes', en:'Open order issues'}), onclick: `navigate('tpv')`, warn:true},
    {count: tempsFuera, icon:'ti-temperature', label: gl({es:'Temperaturas fuera de rango hoy', ca:'Temperatures fora de rang avui', en:'Out-of-range temperatures today'}), onclick: `navigate('limpieza'); setLimpiezaTab('temperaturas')`, warn:true},
    {count: turnosPorAprobar, icon:'ti-calendar-user', label: gl({es:'Cambios de turno y vacaciones por aprobar', ca:'Canvis de torn i vacances per aprovar', en:'Shift swaps and holidays to approve'}), onclick: `navigate('horarios')`, warn:true},
    {count: pedidosPorRecibir, icon:'ti-truck-delivery', label: gl({es:'Pedidos a proveedor por recibir', ca:'Comandes a proveïdor per rebre', en:'Supplier orders to receive'}), onclick: `navigate('pedidos'); setPedidosTab('historial')`},
    {count: cumplesHoy, icon:'ti-cake', label: gl({es:'Cumpleaños hoy', ca:'Aniversaris avui', en:'Birthdays today'}), onclick: `navigate('promocion'); setPromoTab('clientes')`},
    {count: unmatchedPaymentsCount, icon:'ti-credit-card-off', label: t('dash.att.unmatchedPayments'), onclick: `openUnmatchedPaymentsModal()`, warn:true},
    {count: lowStockCount, icon:'ti-alert-triangle', label: t('dash.att.lowStock'), onclick: `dashboardGoToStockAlerts()`, warn:true},
    {count: subidasDePrecio(14).length, icon:'ti-trending-up', label: t('dash.att.priceRises'), onclick: `abrirCambiosPrecio('suben')`, warn:true},
    {count: bajadasDePrecio(14).length, icon:'ti-trending-down', label: gl({es:'Bajadas de precio', ca:'Baixades de preu', en:'Price drops'}), onclick: `abrirCambiosPrecio('bajan')`},
    // Solo si hay mantenimiento y entra el dueño: las tareas del coach son suyas.
    ...((plan360MantHayAlgo() && plan360EsOwner()) ? [{count: plan360MantPendientesSemana().length, icon:'ti-calendar-repeat', label: t('dash.att.coachTasks'), onclick: `plan360IrAMantenimiento()`, warn:true}] : []),
    {count: overdueMaintenanceCount, icon:'ti-tool', label: t('dash.att.overdueMaintenance'), onclick: `navigate('limpieza'); setLimpiezaTab('mantenimiento')`, warn:true},
    {count: overduePestControlCount, icon:'ti-bug', label: t('dash.att.overduePestControl'), onclick: `navigate('limpieza'); setLimpiezaTab('plagas')`, warn:true},
    {count: overdueInvoicesCount, icon:'ti-file-invoice', label: t('dash.att.overdueInvoices'), onclick: `navigate('economia'); GE.tab('variables'); openPendingInvoicesModal()`, warn:true},
    {count: cashClosurePendingCount, icon:'ti-cash-register', label: t('dash.att.cashClosurePending'), onclick: `navigate('tpv'); openCashClosureModal()`, warn:true},
    {count: openOrders, icon:'ti-tools-kitchen-2', label: t('dash.att.openOrders'), onclick: `navigate('tpv')`},
    {count: activeRepartosCount, icon:'ti-moped', label: t('dash.att.activeDeliveries'), onclick: `navigate('tpv'); openRepartosControlModal()`},
    {count: clockedIn, icon:'ti-clock-check', label: t('dash.att.clockedIn'), onclick: `navigate('horarios')`},
    {count: pendingReservations, icon:'ti-calendar-event', label: t('dash.att.pendingReservations'), onclick: `navigate('reservas')`},
    {count: tomorrowReservations, icon:'ti-calendar-plus', label: t('dash.att.tomorrowReservations'), onclick: `navigate('reservas'); goToReservasDia('${tomorrowDate}')`},
  ];

  /* Qué pasa de cada aviso en la CAMPANA de la cabecera (js/panel.js, «AVISOS»): c = sale en la campana, d = solo el propietario,
     o = se puede marcar como visto (informativo, o que dura días como las subidas de precio). Lo que no está aquí (mesas abiertas, repartos, fichados, reservas de hoy y de
     mañana, y los turnos/vacaciones, que la campana pinta uno a uno con sus botones) es ESTADO del Panel, no una novedad. */
  const META = {
    'ti-world': {id:'web', c:1}, 'ti-calendar-question': {id:'reservas', c:1}, 'ti-message-exclamation': {id:'incidencias', c:1},
    'ti-temperature': {id:'temperaturas', c:1}, 'ti-truck-delivery': {id:'pedidosProv', c:1}, 'ti-alert-triangle': {id:'stock'},   // el stock de la campana se cuenta por ÁREA (js/panel.js), no solo la del Panel
    'ti-tool': {id:'mantenimiento', c:1}, 'ti-bug': {id:'plagas', c:1},
    'ti-cake': {id:'cumples', c:1, d:1, o:1}, 'ti-credit-card-off': {id:'pagosSinCasar', c:1, d:1}, 'ti-trending-up': {id:'subidas', c:1, d:1, o:1},
    'ti-trending-down': {id:'bajadas', c:1, d:1, o:1}, 'ti-calendar-repeat': {id:'coach', c:1, d:1}, 'ti-file-invoice': {id:'facturas', c:1, d:1},
    'ti-cash-register': {id:'caja', c:1, d:1}
  };
  attentionItems.forEach(i => { const m = META[i.icon]; if(m){ i.id = m.id; i.campana = !!m.c; i.soloDueno = !!m.d; i.ocultable = !!m.o; } });
  return attentionItems;
}

function renderDashboard(){
  plan360ActualizarKpis();
  const today = new Date();
  const todayDate = todayStr();
  const hasAnySales = DB.sales.length > 0;
  const year = today.getFullYear();
  const month = today.getMonth();

  const attentionItems = avisosDeLaApp();
  const anyAttention = attentionItems.some(i => i.count > 0);
  // Lo que pide atención va delante, con su cifra; lo que está a cero no se
  // esconde (sigue siendo un acceso directo) pero baja a una línea tranquila.
  // Antes eran 13 píldoras del mismo peso y las dos o tres que importaban se
  // perdían entre las grises.
  const chipAtencion = i => `
        <button type="button" class="att-chip${i.warn ? ' att-warn' : ''}" onclick="${i.onclick}">
          <i class="ti ${i.icon}" aria-hidden="true"></i>
          <strong>${i.count}</strong>
          <span>${i.label}</span>
        </button>`;
  const conAviso = attentionItems.filter(i => i.count > 0);
  const aCero = attentionItems.filter(i => i.count === 0);
  document.getElementById('dashboard-attention').innerHTML = `
    ${conAviso.length ? `<div class="att-list">${conAviso.map(chipAtencion).join('')}</div>` : `<div class="att-quiet-msg">${t('dash.att.allQuiet')}</div>`}
    ${aCero.length ? `<div class="att-zero">${aCero.map(i => `<button type="button" class="att-link" onclick="${i.onclick}"><i class="ti ${i.icon}" aria-hidden="true"></i>${i.label}</button>`).join('')}</div>` : ''}
  `;


  // Comparación de ventas / gastos / resultado del año (12 meses)
  const ventasTrend = [];
  const gastosTrend = [];
  const resultadoTrend = [];
  for(let i=11; i>=0; i--){
    const d = new Date(year, month - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const sales = salesTotalForMonth(y, m);
    const variablesM = geTotalVariablesNetoMes(y, m);
    const fijosM = geTotalFijosNetoForMonth(y, m);
    // El mes en curso (i===0) es parcial — solo lleva los días transcurridos,
    // no el mes completo como los 11 anteriores. Sin distinguirlo, su barra
    // sale visualmente más baja dando una falsa impresión de caída de ventas
    // justo los primeros días de cada mes. Se marca con un asterisco.
    const label = monthFull(m).slice(0,3) + (i===0 ? '*' : '');
    ventasTrend.push({label, value: sales});
    gastosTrend.push({label, value: variablesM + fijosM});
    // Misma fórmula que el KPI "Resultado del mes" de arriba (facturación
    // neta menos todos los gastos netos, incluidas comisiones y CAPEX) —
    // antes aquí se restaban gastos netos de la facturación CON IVA.
    resultadoTrend.push({label, value: geResultadoAntesImpMes(y, m)});
  }
  // El mes en curso va marcado como parcial; el nombre completo (mes y año) sale al tocar un punto.
  const conNombre = (arr) => arr.map((p, i) => { const d = new Date(year, month - (11 - i), 1); return Object.assign({}, p, {label: p.label.replace('*', ''), parcial: i === arr.length - 1, nombre: monthFull(d.getMonth()) + ' ' + d.getFullYear()}); });
  dashTrendDatos = {hayVentas: hasAnySales, ventas: conNombre(ventasTrend), gastos: conNombre(gastosTrend), resultado: conNombre(resultadoTrend)};
  dashTrendPintar();


  // Punto de equilibrio, reservas, ventas, gastos, resultado, análisis de ventas y clientela: js/panel.js.
  panelRender();
  GE.renderPlatos();
}

// Fecha "hoy" en base local (misma convención que dateStr, usada en toda la
// app), para evitar desajustes de un día cerca de medianoche por huso horario.
function todayStr(){
  return dateStr(new Date());
}
// Igual que todayStr() pero para mañana — usado, por ejemplo, para no
// dejar pedir a un proveedor con fecha de entrega de hoy mismo (no le da
// tiempo a prepararlo y traerlo).
function tomorrowStr(){
  const d = new Date();
  d.setDate(d.getDate()+1);
  return dateStr(d);
}
// Navega a Stock y activa el filtro "Solo alertas" (usado desde el panel
// Hoy — Atención del Dashboard).
function dashboardGoToStockAlerts(){
  navigate('stock');
  const cb = document.getElementById('stock-only-alerts');
  if(cb){ cb.checked = true; renderStock(); }
}

/* ============================================================
   MEGA LISTA — Ingredientes y proveedores
   ============================================================ */
// Llena el filtro de proveedores con los proveedores del área actual más
// cualquier proveedor que aparezca en los ingredientes (por si quedó alguno
// de un proveedor ya borrado de la lista).
function populateProviderFilter(){
  const sel = document.getElementById('megalista-filter-prov');
  if(!sel) return;
  const current = sel.value;
  const names = new Set();
  DB.providers.filter(p => (p.area||'cocina') === currentArea())
    .forEach(p => { if(p.nombre) names.add(p.nombre); });
  DB.ingredients.filter(i => (i.area||'cocina') === currentArea())
    .forEach(i => { if(i.supplier) names.add(i.supplier); });
  const sorted = [...names].sort((a,b)=>a.localeCompare(b));
  sel.innerHTML = `<option value="">${t('megalista.allProviders')}</option>` +
    sorted.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
  sel.value = current;
}

// Orden de la lista de Mega Lista: clic en una cabecera ordena por esa
// columna, un segundo clic invierte el sentido. En móvil no hay cabecera y
// lo hace el desplegable «Ordenar».
let megalistaSortKey = 'name';
let megalistaSortDir = 1;
// «Por revisar»: '' (todo) | 'precio' | 'iva' | 'proveedor'. El catálogo base siembra 275 artículos sin precio
// ni IVA, y buscar a ojo cuáles faltan por rellenar es justo lo que nadie hace.
let megalistaRevisar = '';
const MEGALISTA_COLUMNS = [
  {key:'name', label:() => tA('megalista.colIngredient')},
  {key:'supplier', label:() => t('common.supplier')},
  // El precio va SIEMPRE sin IVA (es el que usa el escandallo); el IVA que lleva el producto, justo al lado.
  {key:'price', label:() => gl({es:'Compra (sin IVA)', ca:'Compra (sense IVA)', en:'Purchase (excl. VAT)'})},
  {key:'iva', label:() => t('megalista.colIva')},
  {key:null, label:() => t('label.allergens')},
  {key:null, label:() => ''}
];
function setMegalistaSort(key){
  if(!key) return;
  if(megalistaSortKey === key) megalistaSortDir *= -1;
  else { megalistaSortKey = key; megalistaSortDir = 1; }
  renderMegalista();
}
function setMegalistaSortDesdeLista(key){ megalistaSortKey = key; megalistaSortDir = 1; renderMegalista(); }
function setMegalistaRevisar(clave){ megalistaRevisar = (megalistaRevisar === clave ? '' : clave); renderMegalista(); }
function megalistaSortItems(items){
  return items.slice().sort((a,b) => {
    let av, bv;
    if(megalistaSortKey === 'price'){ av = a.packPrice!=null?a.packPrice:a.price; bv = b.packPrice!=null?b.packPrice:b.price; }
    else if(megalistaSortKey === 'iva'){
      // Los que todavía no tienen IVA elegido (null, no 0%) se agrupan
      // siempre al final, sea cual sea el sentido del orden — así se ven
      // de un vistazo los que faltan por revisar, en vez de intercalarse
      // de forma inconsistente por culpa de comparar null/NaN.
      const aNull = a.iva==null, bNull = b.iva==null;
      if(aNull && bNull) return 0;
      if(aNull) return 1;
      if(bNull) return -1;
      return (a.iva - b.iva) * megalistaSortDir;
    }
    else { av = (a[megalistaSortKey]||''); bv = (b[megalistaSortKey]||''); }
    if(typeof av === 'string') return av.localeCompare(bv) * megalistaSortDir;
    return ((av||0) - (bv||0)) * megalistaSortDir;
  });
}
// Lo que le falta a un ingrediente para que sus números valgan: precio, IVA y proveedor.
function megalistaFaltas(ing){
  const pack = ing.packPrice != null ? ing.packPrice : ing.price;
  return {precio: !(pack > 0), iva: ing.iva == null, proveedor: !String(ing.supplier || '').trim()};
}
function megalistaPuedeEditar(){ return isOwnerSession() || editUnlocked; }

function megalistaFilaHtml(ing){
  const f = megalistaFaltas(ing);
  const pack = ing.packPrice != null ? ing.packPrice : ing.price;
  const puede = megalistaPuedeEditar();
  const compra = f.precio
    ? `<span class="ml-falta">${gl({es:'Sin precio', ca:'Sense preu', en:'No price'})}</span>`
    : `<span class="ml-pack">${fmtNum(ing.packQty||1)} ${escapeHtml(ing.unit)} × ${fmtMoney(pack)}</span><span class="ml-ud">${fmtNum(ing.price, 4)} €/${escapeHtml(ing.unit)}</span>`;
  const ales = (ing.allergens||[]).map(a => `<span class="ml-al">${escapeHtml(allergenLabel(a))}</span>`).join('');
  return `
    <div class="ml-fila plegable${ing.activo===false ? ' is-baja' : ''}${ggPlegableAbierta('ml-' + ing.id) ? ' is-abierta' : ''}" data-pl="ml-${ing.id}" onclick="ggTogglePlegable(event, this)">
      <div class="ml-c ml-nom"><b>${escapeHtml(ing.name)}${(f.iva || f.proveedor) && !f.precio ? `<span class="ml-punto" title="${escapeHtml(gl({es:'Falta el IVA o el proveedor', ca:'Falta l\'IVA o el proveïdor', en:'VAT or supplier missing'}))}"></span>` : ''}</b><span class="ml-cat">${escapeHtml(ing.category ? ingredientCategoryLabel(ing.category) : t('label.noCategory'))}</span></div>
      <button type="button" class="pl-chev" aria-expanded="${ggPlegableAbierta('ml-' + ing.id)}" aria-label="${escapeHtml(gl({es:'Ver el resto', ca:'Veure la resta', en:'Show more'}))}" onclick="event.stopPropagation();ggTogglePlegable(event, this.closest('.plegable'))"><i class="ti ti-chevron-down"></i></button>
      <div class="ml-c ml-prov pl-extra" data-et="${escapeHtml(t('common.supplier'))}">${f.proveedor ? `<span class="ml-falta">${gl({es:'Sin proveedor', ca:'Sense proveïdor', en:'No supplier'})}</span>` : escapeHtml(ing.supplier)}</div>
      <div class="ml-c ml-compra" data-et="${escapeHtml(gl({es:'Compra (sin IVA)', ca:'Compra (sense IVA)', en:'Purchase (excl. VAT)'}))}">${compra}</div>
      <div class="ml-c ml-iva pl-extra" data-et="${escapeHtml(t('megalista.colIva'))}">
        <select class="ml-iva-sel${f.iva ? ' is-falta' : ''}" onchange="updateIngredientIva(${ing.id}, this.value, this)" title="${escapeHtml(t('label.ivaSoportado'))}" aria-label="${escapeHtml(t('megalista.colIva') + ': ' + ing.name)}"${puede ? '' : ' disabled'}>
          <option value="" ${f.iva ? 'selected' : ''} disabled>${gl({es:'Elige', ca:'Tria', en:'Choose'})}</option>
          ${[21,10,4,0].map(pct => `<option value="${pct}" ${ing.iva===pct ? 'selected' : ''}>${pct}%</option>`).join('')}
        </select>
      </div>
      <div class="ml-c ml-ale pl-extra${ales ? '' : ' is-vacio'}" data-et="${escapeHtml(t('label.allergens'))}">${ales || '<span class="ml-nada">—</span>'}</div>
      <div class="ml-c ml-acc pl-extra">
        ${ggMenuAcciones([
          {icono:'ti-pencil', texto:t('common.edit'), fn:`openIngredientModal(${ing.id})`, owner:true},
          {icono:'ti-trash', texto:t('common.delete'), fn:`deleteIngredient(${ing.id})`, peligro:true, owner:true}
        ])}
      </div>
    </div>`;
}
function renderMegalistaTable(items){
  const cab = MEGALISTA_COLUMNS.map(c => {
    if(!c.key) return `<span class="ml-th">${c.label()}</span>`;
    const activa = megalistaSortKey === c.key;
    const flecha = activa ? ` <i class="ti ti-arrow-${megalistaSortDir === 1 ? 'up' : 'down'}"></i>` : '';
    return `<button type="button" class="ml-th is-orden${activa ? ' is-on' : ''}" aria-sort="${activa ? (megalistaSortDir === 1 ? 'ascending' : 'descending') : 'none'}" onclick="setMegalistaSort('${c.key}')">${c.label()}${flecha}</button>`;
  }).join('');
  const filas = !items.length
    ? `<div class="empty"><i class="ti ti-list-details"></i>${t('empty.ingredients')}</div>`
    : items.map(megalistaFilaHtml).join('');
  return `<div class="ml-lista"><div class="ml-cab">${cab}</div>${filas}</div>`;
}

// Carpeta de categoría actualmente abierta en Mega Lista (null = vista de carpetas)
let megalistaFolder = null;
function openMegalistaFolder(cat){ megalistaFolder = cat; renderMegalista(); }
function backToMegalistaFolders(){ megalistaFolder = null; renderMegalista(); }

// Una carpeta sin categoría no es una carpeta de verdad (no se puede renombrar ni borrar): se agrupa aparte.
const MEGALISTA_SIN_CARPETA = '__none__';
// Icono de trazo de las carpetas que trae de fábrica el catálogo base (cocina y sala). Sin esto, "Aceites",
// "Arroces" y "Pastas" caían todos en el mismo cuenco al adivinarlo por el nombre.
const MEGALISTA_ICONOS_BASE = {
  'Verduras':'zanahoria', 'Frutas':'manzana', 'Carnes':'ternera', 'Pescados y Marisco':'pescado', 'Huevos':'huevo',
  'Lácteos':'leche', 'Panes y Bollería':'pan', 'Pastas':'cuenco-palillos', 'Arroces':'grano', 'Legumbres':'judias',
  'Aceites y Vinagres':'frasco', 'Condimentos y Especias':'sal', 'Despensa':'cesta', 'Conservas':'conserva',
  'Embutidos y Fiambres':'jamon', 'Congelados':'nevera',
  'Vinos Blancos':'copa-champagne', 'Vinos Tintos':'copa-vino', 'Vinos Rosados':'copa-vino-2', 'Cavas y Espumosos':'botella-vino',
  'Vermús y Aperitivos':'martini', 'Cervezas':'cerveza', 'Licores y Destilados':'botella', 'Refrescos':'refresco', 'Zumos':'naranja',
  'Aguas':'agua', 'Café e Infusiones':'cafe', 'Leches y Batidos':'batido', 'Hielo y Guarniciones':'nevera', 'Despensa Sala':'bolsa'
};
function megalistaIconoCarpeta(cat){
  if(cat === MEGALISTA_SIN_CARPETA) return '<i class="ti ti-folder"></i>';
  const guardado = (DB.categoryIcons && DB.categoryIcons.ingredient && DB.categoryIcons.ingredient[cat]) || '';
  // Un emoji guardado es el que sembró el catálogo (o uno elegido en la versión antigua): si la carpeta es de fábrica,
  // manda el icono de trazo de arriba; si no lo es, se adivina por el nombre.
  const valor = (guardado && guardado.startsWith('ic:')) ? guardado : (MEGALISTA_ICONOS_BASE[cat] ? 'ic:' + MEGALISTA_ICONOS_BASE[cat] : guardado);
  return iconoSeccionHtml(valor, ingredientCategoryLabel(cat), 26) || '<i class="ti ti-folder"></i>';
}
function megalistaResumenHtml(areaItems){
  const n = {precio:0, iva:0, proveedor:0};
  areaItems.forEach(i => { const f = megalistaFaltas(i); if(f.precio) n.precio++; if(f.iva) n.iva++; if(f.proveedor) n.proveedor++; });
  const chip = (clave, etiqueta) => n[clave] ? `<button type="button" class="btn btn-sm btn-fino${megalistaRevisar === clave ? ' is-on' : ''}" aria-pressed="${megalistaRevisar === clave}" onclick="setMegalistaRevisar('${clave}')">${etiqueta} <span class="ml-n">${n[clave]}</span></button>` : '';
  const chips = chip('precio', gl({es:'Sin precio', ca:'Sense preu', en:'No price'}))
    + chip('iva', gl({es:'Sin IVA', ca:'Sense IVA', en:'No VAT'}))
    + chip('proveedor', gl({es:'Sin proveedor', ca:'Sense proveïdor', en:'No supplier'}));
  if(!chips) return `<div class="ml-resumen is-ok"><i class="ti ti-circle-check"></i> ${gl({es:'Todo con precio, IVA y proveedor', ca:'Tot amb preu, IVA i proveïdor', en:'Everything has a price, VAT and a supplier'})}</div>`;
  return `<div class="ml-resumen"><span class="ml-resumen-et">${gl({es:'Por revisar', ca:'Per revisar', en:'To review'})}</span>${chips}</div>`;
}

function renderMegalista(){
  maybeShowCategoryIconHint();
  populateProviderFilter();
  const search = document.getElementById('megalista-search').value.toLowerCase();
  const prov = document.getElementById('megalista-filter-prov').value;
  const box = document.getElementById('megalista-content');
  const ordenSel = document.getElementById('megalista-orden');
  if(ordenSel) ordenSel.value = megalistaSortKey;

    // Se quitó el filtro "Mostrar descatalogados": ya no existía forma de
    // marcar un ingrediente como descatalogado, así que era un filtro para un
    // estado que no se podía crear. A propósito NO se filtra por i.activo: si
    // algún ingrediente quedó marcado de antes, sin la casilla para mostrarlo
    // se habría vuelto invisible para siempre.
  const areaItems = DB.ingredients.filter(i => (i.area||'cocina') === currentArea());
  const resumen = document.getElementById('megalista-resumen');
  if(resumen) resumen.innerHTML = areaItems.length ? megalistaResumenHtml(areaItems) : '';
  // Si lo que se filtraba ya está todo arreglado, el filtro deja de tener sentido.
  if(megalistaRevisar && !areaItems.some(i => megalistaFaltas(i)[megalistaRevisar])) megalistaRevisar = '';
  const items = areaItems.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search) || (i.supplier||'').toLowerCase().includes(search)
      || (i.category ? ingredientCategoryLabel(i.category) : '').toLowerCase().includes(search);
    const matchProv = !prov || (i.supplier||'') === prov;
    const matchRev = !megalistaRevisar || megalistaFaltas(i)[megalistaRevisar];
    return matchSearch && matchProv && matchRev;
  });

  if(!items.length){
    box.innerHTML = `<div class="empty"><i class="ti ti-list-details"></i>${(search || prov || megalistaRevisar) && areaItems.length ? t('empty.noSearchResults') : t('empty.ingredients')}</div>`;
    return;
  }

  const filtrando = !!(search || prov || megalistaRevisar);
  if(filtrando){
    box.innerHTML = `<div class="ml-cuenta">${items.length === 1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', items.length)}</div>` + renderMegalistaTable(megalistaSortItems(items));
    return;
  }

  const byCat = {};
  items.forEach(i => { const c = i.category || MEGALISTA_SIN_CARPETA; (byCat[c] = byCat[c] || []).push(i); });
  const cats = Object.keys(byCat).sort((a,b) => (a === MEGALISTA_SIN_CARPETA) - (b === MEGALISTA_SIN_CARPETA) || ingredientCategoryLabel(a).localeCompare(ingredientCategoryLabel(b)));
  const nombreDe = c => c === MEGALISTA_SIN_CARPETA ? t('label.noCategory') : ingredientCategoryLabel(c);

  if(megalistaFolder === null){
    box.innerHTML = `<div class="ml-carpetas">${cats.map(cat => {
      const k = escapeJsAttr(cat);
      const pend = byCat[cat].filter(i => { const f = megalistaFaltas(i); return f.precio || f.iva || f.proveedor; }).length;
      const real = cat !== MEGALISTA_SIN_CARPETA;
      return `
      <div class="ml-carpeta" role="button" tabindex="0" onclick="openMegalistaFolder('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMegalistaFolder('${k}')}">
        ${real
          ? `<span class="cat-icon-btn ml-ico" role="button" title="${escapeHtml(t('title.chooseFolderIcon'))}" aria-label="${escapeHtml(t('title.chooseFolderIcon'))}" onclick="event.stopPropagation();openCategoryIconModal('${k}','${k}','renderMegalista','ingredient')">${megalistaIconoCarpeta(cat)}</span>`
          : `<span class="ml-ico">${megalistaIconoCarpeta(cat)}</span>`}
        <div class="ml-carpeta-txt">
          <div class="ml-carpeta-nom">${escapeHtml(nombreDe(cat))}</div>
          <div class="ml-carpeta-meta">${byCat[cat].length === 1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', byCat[cat].length)}</div>
          ${pend ? `<div class="ml-carpeta-pend">${gl({es:'por revisar', ca:'per revisar', en:'to review'})}: ${pend}</div>` : ''}
        </div>
        ${real ? botonesDeCarpeta(cat, 'ingredient') : ''}
      </div>`;
    }).join('')}</div>`;
    return;
  }

  const folderItems = byCat[megalistaFolder];
  if(!folderItems || !folderItems.length){ megalistaFolder = null; renderMegalista(); return; }
  const lote = megalistaPuedeEditar() ? `
    <div class="ml-lote">
      <label for="ml-iva-lote">${gl({es:'IVA de toda la carpeta', ca:'IVA de tota la carpeta', en:'VAT for the whole folder'})}</label>
      <select id="ml-iva-lote">${[10,21,4,0].map(pct => `<option value="${pct}">${pct}%</option>`).join('')}</select>
      <button type="button" class="btn btn-sm btn-fino" onclick="aplicarIvaCarpeta()">${gl({es:'Aplicar', ca:'Aplicar', en:'Apply'})}</button>
    </div>` : '';
  box.innerHTML = `
    <div class="ml-ruta">
      <button type="button" class="btn btn-sm btn-fino" onclick="backToMegalistaFolders()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>
      <div class="ml-ruta-nom">${escapeHtml(nombreDe(megalistaFolder))}<span>${folderItems.length === 1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', folderItems.length)}</span></div>
      ${lote}
    </div>` + renderMegalistaTable(megalistaSortItems(folderItems));
}

// Pone el mismo IVA a todos los ingredientes de la carpeta abierta: el catálogo base llega sin IVA y casi todo
// lo de una misma carpeta lleva el mismo tipo, así que uno a uno son 20 desplegables seguidos.
async function aplicarIvaCarpeta(){
  if(!megalistaPuedeEditar()) return;
  const sel = document.getElementById('ml-iva-lote');
  if(!sel || megalistaFolder === null) return;
  const pct = parseFloat(sel.value);
  const clave = megalistaFolder === MEGALISTA_SIN_CARPETA ? '' : megalistaFolder;
  const dentro = DB.ingredients.filter(i => (i.area||'cocina') === currentArea() && (i.category || '') === clave);
  if(!dentro.length) return;
  const distintos = dentro.filter(i => i.iva != null && i.iva !== pct).length;
  const msg = gl({
    es:`${dentro.length} ingredientes pasarán a IVA ${pct}%.` + (distintos ? ` ${distintos} de ellos tenían otro tipo y se cambiará.` : ''),
    ca:`${dentro.length} ingredients passaran a IVA ${pct}%.` + (distintos ? ` ${distintos} tenien un altre tipus i es canviarà.` : ''),
    en:`${dentro.length} ingredients will be set to ${pct}% VAT.` + (distintos ? ` ${distintos} had a different rate and will change.` : '')
  });
  if(!(await confirmModal(msg))) return;
  dentro.forEach(i => { i.iva = pct; });
  saveDB();
  renderMegalista();
  showToast(gl({es:'IVA actualizado', ca:'IVA actualitzat', en:'VAT updated'}));
}

// Catálogo de materia prima básica de cocina, para no obligar a un negocio
// nuevo a dar de alta uno a uno los ingredientes más habituales de un
// restaurante español. Cada entrada es [nombre, unidad, alérgenos]; la
// categoría la pone el bloque que la contiene. El cliente solo tiene que
// rellenar precio, IVA, proveedor y cantidad de compra de los que de verdad
// usa — el resto los puede borrar o dejar descatalogados.
const BASE_INGREDIENTS_CATALOG = {
  'Verduras': {icon:'🥬', items:[
    ['Tomate','kg',[]], ['Cebolla','kg',[]], ['Ajo','kg',[]], ['Pimiento rojo','kg',[]], ['Pimiento verde','kg',[]],
    ['Calabacín','kg',[]], ['Berenjena','kg',[]], ['Patata','kg',[]], ['Zanahoria','kg',[]], ['Lechuga','ud',[]],
    ['Espinaca','kg',[]], ['Champiñón','kg',[]], ['Puerro','kg',[]], ['Pepino','kg',[]], ['Col','ud',[]],
    ['Brócoli','kg',[]], ['Calabaza','kg',[]], ['Apio','kg',['Apio']], ['Espárrago verde','kg',[]], ['Alcachofa','kg',[]],
  ]},
  'Frutas': {icon:'🍎', items:[
    ['Limón','kg',[]], ['Naranja','kg',[]], ['Manzana','kg',[]], ['Plátano','kg',[]], ['Fresa','kg',[]],
    ['Aguacate','kg',[]], ['Uva','kg',['Sulfitos']], ['Pera','kg',[]], ['Melón','ud',[]], ['Sandía','ud',[]],
    ['Piña','ud',[]], ['Kiwi','kg',[]], ['Mango','kg',[]], ['Melocotón','kg',[]], ['Frutos rojos (mix)','kg',[]],
  ]},
  'Carnes': {icon:'🥩', items:[
    ['Solomillo de ternera','kg',[]], ['Entrecot de ternera','kg',[]], ['Carne picada de ternera','kg',[]],
    ['Pechuga de pollo','kg',[]], ['Muslo de pollo','kg',[]], ['Pollo entero','kg',[]], ['Secreto ibérico','kg',[]],
    ['Solomillo de cerdo','kg',[]], ['Costilla de cerdo','kg',[]], ['Panceta','kg',[]], ['Cordero (paletilla)','kg',[]],
    ['Chuletas de cordero','kg',[]], ['Carne picada mixta','kg',[]], ['Conejo','kg',[]], ['Pato (magret)','kg',[]],
  ]},
  'Pescados y Marisco': {icon:'🐟', items:[
    ['Merluza','kg',['Pescado']], ['Salmón','kg',['Pescado']], ['Atún fresco','kg',['Pescado']], ['Bacalao','kg',['Pescado']],
    ['Lubina','kg',['Pescado']], ['Dorada','kg',['Pescado']], ['Boquerón','kg',['Pescado']], ['Sardina','kg',['Pescado']],
    ['Rape','kg',['Pescado']], ['Pulpo','kg',['Moluscos']], ['Calamar','kg',['Moluscos']], ['Sepia','kg',['Moluscos']],
    ['Gamba','kg',['Crustáceos']], ['Langostino','kg',['Crustáceos']], ['Mejillón','kg',['Moluscos']], ['Almeja','kg',['Moluscos']],
    ['Cigala','kg',['Crustáceos']], ['Marisco mixto (cocido)','kg',['Crustáceos','Moluscos']],
  ]},
  'Huevos': {icon:'🥚', items:[
    ['Huevo de gallina (docena)','ud',['Huevos']], ['Huevo de codorniz (docena)','ud',['Huevos']], ['Clara de huevo pasteurizada','L',['Huevos']],
  ]},
  'Lácteos': {icon:'🧀', items:[
    ['Leche entera','L',['Lácteos']], ['Nata para cocinar','L',['Lácteos']], ['Nata para montar','L',['Lácteos']],
    ['Mantequilla','kg',['Lácteos']], ['Queso mozzarella','kg',['Lácteos']], ['Queso parmesano','kg',['Lácteos']],
    ['Queso manchego','kg',['Lácteos']], ['Queso de cabra','kg',['Lácteos']], ['Queso crema','kg',['Lácteos']],
    ['Yogur natural','ud',['Lácteos']], ['Leche condensada','kg',['Lácteos']], ['Requesón','kg',['Lácteos']],
  ]},
  'Panes y Bollería': {icon:'🍞', items:[
    ['Pan de barra','kg',['Gluten']], ['Pan de hamburguesa','ud',['Gluten']], ['Pan de perrito','ud',['Gluten']],
    ['Pan rallado','kg',['Gluten']], ['Pan de molde','ud',['Gluten']], ['Baguette','ud',['Gluten']],
    ['Masa de pizza','kg',['Gluten']], ['Croissant','ud',['Gluten','Lácteos']], ['Bollería mixta','ud',['Gluten','Lácteos','Huevos']],
    ['Picos / colines','kg',['Gluten']],
  ]},
  'Pastas': {icon:'🍝', items:[
    ['Espagueti','kg',['Gluten']], ['Macarrón','kg',['Gluten']], ['Tallarín','kg',['Gluten']], ['Lasaña (placas)','kg',['Gluten']],
    ['Canelón (placas)','kg',['Gluten']], ['Ravioli fresco','kg',['Gluten','Huevos']], ['Ñoquis','kg',['Gluten']],
    ['Pasta fresca al huevo','kg',['Gluten','Huevos']], ['Fideos','kg',['Gluten']],
  ]},
  'Arroces': {icon:'🍚', items:[
    ['Arroz bomba','kg',[]], ['Arroz redondo','kg',[]], ['Arroz basmati','kg',[]], ['Arroz largo','kg',[]],
    ['Arroz integral','kg',[]], ['Arroz para sushi','kg',[]],
  ]},
  'Legumbres': {icon:'🫘', items:[
    ['Garbanzo seco','kg',[]], ['Lenteja','kg',[]], ['Alubia blanca','kg',[]], ['Alubia roja','kg',[]],
    ['Garbanzo cocido (bote)','kg',[]], ['Lenteja cocida (bote)','kg',[]], ['Guisante congelado','kg',[]],
    ['Haba','kg',[]], ['Soja (grano)','kg',['Soja']],
  ]},
  'Aceites y Vinagres': {icon:'🫒', items:[
    ['Aceite de oliva virgen extra','L',[]], ['Aceite de oliva suave','L',[]], ['Aceite de girasol','L',[]],
    ['Vinagre de vino','L',['Sulfitos']], ['Vinagre de Módena','L',['Sulfitos']], ['Vinagre de manzana','L',[]],
    ['Aceite de sésamo','L',['Sésamo']],
  ]},
  'Condimentos y Especias': {icon:'🧂', items:[
    ['Sal fina','kg',[]], ['Sal gruesa','kg',[]], ['Pimienta negra molida','kg',[]], ['Pimentón dulce','kg',[]],
    ['Pimentón picante','kg',[]], ['Orégano','kg',[]], ['Perejil seco','kg',[]], ['Tomillo','kg',[]], ['Romero','kg',[]],
    ['Laurel','kg',[]], ['Comino','kg',[]], ['Curry','kg',[]], ['Azafrán','g',[]], ['Ajo en polvo','kg',[]],
    ['Canela molida','kg',[]], ['Mostaza','kg',['Mostaza']], ['Salsa de soja','L',['Soja','Gluten']],
    ['Caldo concentrado (bote)','kg',['Apio']], ['Levadura fresca','kg',[]], ['Levadura química','kg',[]],
  ]},
  'Despensa': {icon:'📦', items:[
    ['Harina de trigo','kg',['Gluten']], ['Harina de maíz','kg',[]], ['Harina de repostería','kg',['Gluten']],
    ['Azúcar blanco','kg',[]], ['Azúcar moreno','kg',[]], ['Miel','kg',[]], ['Tomate triturado (bote)','kg',[]],
    ['Tomate frito (bote)','kg',[]], ['Puré de patata (copos)','kg',[]], ['Maicena','kg',[]], ['Chocolate de cobertura','kg',['Lácteos']],
    ['Frutos secos variados','kg',['Frutos de cáscara']], ['Almendra','kg',['Frutos de cáscara']], ['Piñón','kg',['Frutos de cáscara']],
    ['Aceituna (bote)','kg',[]], ['Alcaparra (bote)','kg',[]], ['Pepinillo (bote)','kg',[]],
  ]},
  'Conservas': {icon:'🥫', items:[
    ['Atún en aceite (lata)','kg',['Pescado']], ['Anchoa en aceite (lata)','kg',['Pescado']], ['Mejillón en escabeche (lata)','kg',['Moluscos']],
    ['Berberecho (lata)','kg',['Moluscos']], ['Pimiento del piquillo (bote)','kg',[]], ['Espárrago blanco (bote)','kg',[]],
    ['Maíz dulce (lata)','kg',[]], ['Champiñón en conserva (bote)','kg',[]],
  ]},
  'Embutidos y Fiambres': {icon:'🌭', items:[
    ['Jamón ibérico','kg',[]], ['Jamón serrano','kg',[]], ['Jamón cocido','kg',[]], ['Chorizo','kg',[]],
    ['Salchichón','kg',[]], ['Lomo embuchado','kg',[]], ['Bacon / panceta curada','kg',[]], ['Mortadela','kg',['Frutos de cáscara']],
    ['Salchicha fresca','kg',[]], ['Morcilla','kg',[]],
  ]},
  'Congelados': {icon:'🧊', items:[
    ['Patata prefrita congelada','kg',[]], ['Verdura congelada (mix)','kg',[]], ['Pescado congelado (surtido)','kg',['Pescado']],
    ['Marisco congelado (surtido)','kg',['Crustáceos','Moluscos']], ['Masa de hojaldre congelada','kg',['Gluten','Lácteos']],
    ['Helado (tarrina)','kg',['Lácteos']],
  ]},
};

// Igual que BASE_INGREDIENTS_CATALOG pero para el área de Sala (barra):
// aquí lo que se escandalla no es un plato sino una copa/cóctel, así que
// interesa tener el vino, el licor o el refresco desglosado por tipo, no
// agrupado en un "Bebidas" genérico como en cocina.
const BASE_INGREDIENTS_CATALOG_SALA = {
  'Vinos Blancos': {icon:'🥂', items:[
    ['Vino blanco verdejo','L',['Sulfitos']], ['Vino blanco albariño','L',['Sulfitos']], ['Vino blanco viura','L',['Sulfitos']],
    ['Vino blanco copa (genérico)','L',['Sulfitos']],
  ]},
  'Vinos Tintos': {icon:'🍷', items:[
    ['Vino tinto joven','L',['Sulfitos']], ['Vino tinto crianza','L',['Sulfitos']], ['Vino tinto reserva','L',['Sulfitos']],
    ['Vino tinto copa (genérico)','L',['Sulfitos']],
  ]},
  'Vinos Rosados': {icon:'🌸', items:[
    ['Vino rosado','L',['Sulfitos']], ['Vino rosado copa (genérico)','L',['Sulfitos']],
  ]},
  'Cavas y Espumosos': {icon:'🍾', items:[
    ['Cava brut','L',['Sulfitos']], ['Cava brut nature','L',['Sulfitos']], ['Champagne','L',['Sulfitos']], ['Vino espumoso dulce','L',['Sulfitos']],
  ]},
  'Vermús y Aperitivos': {icon:'🍹', items:[
    ['Vermut rojo','L',['Sulfitos']], ['Vermut blanco','L',['Sulfitos']], ['Jerez fino','L',['Sulfitos']], ['Jerez oloroso','L',['Sulfitos']],
  ]},
  'Cervezas': {icon:'🍺', items:[
    ['Cerveza lager (barril)','L',['Gluten']], ['Cerveza lager (botellín)','ud',['Gluten']], ['Cerveza sin alcohol','ud',['Gluten']],
    ['Cerveza tostada/rubia especial','ud',['Gluten']], ['Sidra','L',['Sulfitos']],
  ]},
  'Licores y Destilados': {icon:'🥃', items:[
    ['Ginebra','L',[]], ['Vodka','L',[]], ['Ron blanco','L',[]], ['Ron añejo','L',[]], ['Whisky','L',[]],
    ['Brandy / Coñac','L',['Sulfitos']], ['Tequila','L',[]], ['Orujo','L',[]], ['Licor de hierbas','L',[]],
    ['Amaretto','L',['Frutos de cáscara']], ['Baileys / licor de crema','L',['Lácteos']], ['Triple seco / Cointreau','L',[]],
    ['Pacharán','L',[]],
  ]},
  'Refrescos': {icon:'🥤', items:[
    ['Cola','L',[]], ['Cola sin cafeína/zero','L',[]], ['Naranja gaseosa','L',[]], ['Limón gaseosa','L',[]], ['Tónica','L',[]],
    ['Ginger ale / Ginger beer','L',[]], ['Bitter (sin alcohol)','L',[]], ['Soda','L',[]], ['Bebida energética','ud',[]],
  ]},
  'Zumos': {icon:'🧃', items:[
    ['Zumo de naranja','L',[]], ['Zumo de piña','L',[]], ['Zumo de tomate','L',[]], ['Zumo de melocotón','L',[]],
    ['Zumo de manzana','L',[]], ['Mosto','L',[]], ['Granadina','L',[]],
  ]},
  'Aguas': {icon:'💧', items:[
    ['Agua mineral con gas','L',[]], ['Agua mineral sin gas','L',[]],
  ]},
  'Café e Infusiones': {icon:'☕', items:[
    ['Café en grano','kg',[]], ['Café molido','kg',[]], ['Café descafeinado','kg',[]], ['Té negro','kg',[]], ['Té verde','kg',[]],
    ['Manzanilla','kg',[]], ['Poleo menta','kg',[]], ['Cacao en polvo','kg',['Lácteos']],
  ]},
  'Leches y Batidos': {icon:'🥛', items:[
    ['Leche entera','L',['Lácteos']], ['Leche desnatada','L',['Lácteos']], ['Leche de avena','L',[]], ['Leche de soja','L',['Soja']],
    ['Leche de almendra','L',['Frutos de cáscara']], ['Nata para café','L',['Lácteos']], ['Horchata','L',['Frutos de cáscara']],
  ]},
  'Hielo y Guarniciones': {icon:'🧊', items:[
    ['Hielo','kg',[]], ['Aceituna para cóctel','kg',[]], ['Guinda para cóctel','kg',[]], ['Sal para rimmer','kg',[]],
    ['Azúcar para rimmer','kg',[]],
  ]},
  'Despensa Sala': {icon:'📦', items:[
    ['Azúcar (sobres)','kg',[]], ['Sacarina/edulcorante (sobres)','kg',[]], ['Sirope de vainilla','L',[]], ['Sirope de caramelo','L',['Lácteos']],
    ['Angostura / bitter de cóctel','L',[]], ['Frutos secos para aperitivo','kg',['Frutos de cáscara']], ['Patatas fritas (bolsa)','kg',[]],
    ['Servilletas de barra','ud',[]], ['Palillos de cóctel','ud',[]], ['Pajitas','ud',[]],
  ]},
};

// Construye la lista de ingredientes + stock + iconos de carpeta del
// catálogo base de materia prima (cocina o sala), sin tocar DB — la llama
// loadDB() (ver js/core.js) para que cualquier negocio recién creado
// arranque ya con Mega Lista poblada, sin que nadie tenga que pulsar nada.
// idStart evita colisiones de id: se llama antes de que DB (y por tanto
// genId()) exista todavía, en el arranque en frío de un negocio nuevo.
function buildBaseIngredientsSeed(area, idStart){
  const catalog = area === 'sala' ? BASE_INGREDIENTS_CATALOG_SALA : BASE_INGREDIENTS_CATALOG;
  const ingredients = [];
  const stock = {};
  const categoryIcons = {};
  let nextId = idStart;
  // Los 275 artículos del catálogo están escritos en castellano. Un negocio
  // catalán o inglés se los encontraba así, y no había forma de traducirlos:
  // no pasan por t(), son datos que se guardan en su base.
  //
  // Se traducen AQUÍ, al nacer el negocio, y no al pintarlos, por dos
  // razones: el nombre del ingrediente es dato editable del negocio (en
  // cuanto lo renombran es suyo, y traducirlo por encima sería mentirle), y
  // así el albarán que le llega al proveedor sale en el mismo idioma en que
  // el hostelero lo lee. La CATEGORÍA sí se queda en castellano a propósito:
  // es la clave estable con la que se agrupa y ordena, y ya se traduce al
  // mostrarla (ingredientCategoryLabel).
  const nombres = t('ingredientNames.map') || {};
  Object.keys(catalog).forEach(cat => {
    const {icon, items} = catalog[cat];
    categoryIcons[cat] = icon;
    items.forEach(([nombreEs, unit, allergens]) => {
      const id = nextId++;
      const name = nombres[nombreEs] || nombreEs;
      ingredients.push({
        id, name, category: cat, unit, supplier: '', price: 0, packQty: 1, packPrice: 0,
        allergens: [...allergens], area, activo: true,
      });
      stock[id] = {qty:0, min:0};
    });
  });
  return {ingredients, stock, categoryIcons};
}

function openIngredientModal(id, overrideState){
  const areaProviders = DB.providers.filter(p => (p.area||'cocina') === currentArea());
  if(!areaProviders.length){
    openModal(`
      <div class="modal-header">
        <h3>${t('msg.needSupplier')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p class="ml-intro">${tA('msg.needSupplierDesc')}</p>
      <div class="modal-footer">
        <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-on" onclick="closeModal();openProviderModal()"><i class="ti ti-building-factory-2"></i> ${t('btn.newSupplier')}</button>
      </div>
    `);
    return;
  }
  const ing = overrideState || (id ? getIngredient(id) : {name:'',category:ingredientCategories()[0],supplier:areaProviders[0].nombre,unit:currentArea()==='sala'?'ml':'g',price:0,packQty:1000,packPrice:0,allergens:[],area:currentArea()});
  const allergenChecks = ALLERGENS.map(a => `
    <label class="ml-alc">
      <input type="checkbox" value="${a}" ${ing.allergens && ing.allergens.includes(a) ? 'checked':''}>
      <span>${escapeHtml(allergenLabel(a))}</span>
    </label>
  `).join('');
  const ivaActual = ing.iva != null && ing.iva !== '' ? Number(ing.iva) : null;

  openModal(`
    <div class="modal-header">
      <h3>${id ? tA('title.editIngredient') : tA('title.newIngredient')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="ing-name" value="${escapeHtml(ing.name)}" placeholder="${currentArea()==='sala' ? t('ph.ingredientNameSala') : t('ph.ingredientName')}">
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.category')}</label>
        <select id="ing-category" onchange="onIngredientCategoryChange(${id||'null'})">
          ${ingredientCategories().map(c=>`<option value="${c}" ${ing.category===c?'selected':''}>${escapeHtml(ingredientCategoryLabel(c))}</option>`).join('')}
          ${[...new Set([...ingredientCategoriesPropias(), ...(ing.category && !ingredientCategories().includes(ing.category) ? [ing.category] : [])])].map(c=>`<option value="${escapeHtml(c)}" ${ing.category===c?'selected':''}>${escapeHtml(ingredientCategoryLabel(c))}</option>`).join('')}
          <option value="__new__">+ ${t('btn.newCategory')}...</option>
        </select>
      </div>
      <div class="field">
        <label>${t('common.supplier')}</label>
        <select id="ing-supplier">
          ${areaProviders.map(p=>`<option value="${escapeHtml(p.nombre)}" ${ing.supplier===p.nombre?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="ml-bloque">
      <div class="ml-bloque-tit">${gl({es:'Cómo lo compras', ca:'Com ho compres', en:'How you buy it'})}</div>
      <div class="field-row">
        <div class="field">
          <label>${t('common.unit')}</label>
          <select id="ing-unit" onchange="updateIngPackPrice()">
            ${UNITS.map(u=>`<option value="${u}" ${ing.unit===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label id="ing-pack-qty-label">${t('megalista.purchaseQtyLabel').replace('${unit}', escapeHtml(ing.unit)).replace('${hint}', ingPackQtyHint(ing.unit))}</label>
          <input type="number" id="ing-pack-qty" value="${ing.packQty!=null?ing.packQty:1000}" step="0.01" min="0.01" oninput="updateIngPackPrice()">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="ing-pack-price">${gl({es:'Precio de compra (sin IVA)', ca:'Preu de compra (sense IVA)', en:'Purchase price (excl. VAT)'})}</label>
          <input type="number" id="ing-pack-price" value="${ing.packPrice!=null?ing.packPrice:ing.price}" step="0.01" min="0" oninput="updateIngPackPrice()">
        </div>
        <div class="field">
          <label for="ing-iva">${t('megalista.colIva')}</label>
          <select id="ing-iva" onchange="updateIngPackPrice()" title="${escapeHtml(t('label.ivaSoportado'))}">
            <option value="" ${ivaActual==null?'selected':''}>${t('label.chooseIva')}</option>
            ${[21,10,4,0].map(pct => `<option value="${pct}" ${ivaActual===pct?'selected':''}>${pct}%</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="ml-calculo" id="ing-calculo" aria-live="polite"></div>
    </div>
    ${(() => {
      // Los últimos cambios de precio de ESTE producto, para ver de un
      // vistazo si el proveedor lo está subiendo.
      const hist = (DB.preciosHistorial || []).filter(h => ing.id && h.ingredientId === ing.id).slice(-5).reverse();
      if(!hist.length) return '';
      return `<div class="field"><label>${escapeHtml(t('precios.historial'))}</label>
        <div class="ml-hist">${hist.map(h => `<div class="ml-hist-fila">
          <span class="ml-hist-f">${escapeHtml(h.fecha)}</span>
          <span class="ml-hist-p">${fmtMoney(h.antes)} → ${fmtMoney(h.despues)}/${escapeHtml(h.unidad || '')}</span>
          <strong class="${h.despues > h.antes ? 'sube' : 'baja'}">${h.despues > h.antes ? '+' : ''}${fmtNum(h.pct, 1)} %</strong>
        </div>`).join('')}</div></div>`;
    })()}
    <div class="field">
      <label>${t('label.allergens')}</label>
      <div class="ml-alergenos">
        ${allergenChecks}
      </div>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
      <button type="button" class="btn btn-fino is-on" onclick="saveIngredient(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
  updateIngPackPrice();
}

// Ejemplo aclaratorio para la cantidad por compra, según la unidad elegida
// (kg/L a partir de la unidad "pequeña" — g/ml —, cl como fracción de litro).
function ingPackQtyHint(unit){
  if(unit === 'g') return t('megalista.hintKg');
  if(unit === 'ml') return t('megalista.hintL');
  if(unit === 'cl') return t('megalista.hintCl');
  return '';
}
function updateIngPackPrice(){
  const unit = document.getElementById('ing-unit').value;
  document.getElementById('ing-pack-qty-label').textContent = t('megalista.purchaseQtyLabel').replace('${unit}', unit).replace('${hint}', ingPackQtyHint(unit));
  // Lo que va a valer de verdad: el coste por unidad (con el que se escandalla) y lo que se paga con IVA.
  const calc = document.getElementById('ing-calculo');
  if(!calc) return;
  const qty = parseFloat(document.getElementById('ing-pack-qty').value) || 0;
  const precio = parseFloat(document.getElementById('ing-pack-price').value) || 0;
  const iva = document.getElementById('ing-iva').value;
  if(!(qty > 0) || !(precio > 0)){ calc.innerHTML = ''; return; }
  const partes = [`${gl({es:'Cuesta', ca:'Costa', en:'Costs'})} <b>${fmtNum(precio / qty, 4)} €/${escapeHtml(unit)}</b>`];
  if(iva !== '') partes.push(`${gl({es:'Con IVA', ca:'Amb IVA', en:'With VAT'})} <b>${fmtMoney(precio * (1 + parseFloat(iva) / 100))}</b>`);
  else partes.push(`<span class="ml-falta">${gl({es:'Falta elegir el IVA', ca:'Falta triar l\'IVA', en:'Choose the VAT rate'})}</span>`);
  calc.innerHTML = partes.join(' · ');
}

let ingredientFormStateBeforeCategory = null;
function currentIngredientFormState(id){
  const ing = id ? getIngredient(id) : {};
  const allergens = Array.from(document.querySelectorAll('#modal-box input[type="checkbox"]:checked')).map(c=>c.value);
  return {
    name: document.getElementById('ing-name').value,
    category: document.getElementById('ing-category').value,
    unit: document.getElementById('ing-unit').value,
    supplier: document.getElementById('ing-supplier').value,
    packQty: document.getElementById('ing-pack-qty').value,
    packPrice: document.getElementById('ing-pack-price').value,
    iva: document.getElementById('ing-iva').value,
    price: ing.price,
    allergens,
    area: ing.area || currentArea()
  };
}
function onIngredientCategoryChange(id){
  const sel = document.getElementById('ing-category');
  if(sel.value === '__new__'){
    ingredientFormStateBeforeCategory = currentIngredientFormState(id);
    openModal(`
      <div class="modal-header">
        <h3>${t('btn.newCategory')}</h3>
        <button class="modal-close" onclick="cancelNewIngredientCategory(${id||'null'})">&times;</button>
      </div>
      <div class="field">
        <label>${currentArea()==='sala' ? t('ph.categoryNameSala') : t('ph.categoryName')}</label>
        <input type="text" id="new-ingredient-category-name" placeholder="${currentArea()==='sala' ? t('ph.categoryNameSala') : t('ph.categoryName')}">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-fino" onclick="cancelNewIngredientCategory(${id||'null'})">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-on" onclick="confirmNewIngredientCategory(${id||'null'})">${t('common.save')}</button>
      </div>
    `);
    setTimeout(()=>document.getElementById('new-ingredient-category-name')?.focus(), 50);
  }
}
// Corrige un nombre de categoría personalizada (ej. un error tipográfico al
// crearla) sin tener que mover uno a uno todos los ingredientes que la
// usan: antes, una vez creada, un nombre mal escrito se quedaba así para
// siempre — no había forma de arreglarlo, solo de crear una categoría
// nueva y reasignar ingredientes a mano.
async function renameIngredientCategory(oldName){
  // El valor guardado de una categoría de fábrica es siempre su clave en
  // español (para poder traducirla), pero mostrarle esa clave tal cual a
  // alguien usando la app en catalán o inglés sería confuso — se precarga
  // con el texto ya traducido que está viendo en pantalla.
  const oldLabel = ingredientCategoryLabel(oldName);
  const nuevo = await promptText(t('msg.renameCategoryPrompt'), oldLabel);
  if(nuevo === null) return;
  const trimmed = nuevo.trim();
  // El nombre acaba siendo una CLAVE de Firebase (iconos y lápidas): con
  // . $ # [ ] / dentro, la sincronización del negocio entero se cae.
  if(!nombreDeCarpetaValido(trimmed)) return;
  // Comparar contra la etiqueta TRADUCIDA (lo que de verdad se precargó y
  // ve quien escribe), no contra la clave interna en español: si no,
  // aceptar sin tocar nada en catalán/inglés sobre una categoría de
  // fábrica (p.ej. "Verduras" mostrada como "Vegetables") no se detectaba
  // como "sin cambios" — trimmed ("Vegetables") nunca es igual a oldName
  // ("Verduras") — y el código renombraba de verdad la categoría al texto
  // traducido, perdiendo para siempre su vínculo con la traducción.
  if(!trimmed || trimmed === oldLabel) return;
  // Solo los ingredientes de ESTA área: Cocina y Sala pueden tener, por
  // coincidencia, una categoría con el mismo nombre, y renombrarla en una
  // no debe tocar la de la otra.
  DB.ingredients.forEach(i => { if(i.category === oldName && (i.area||'cocina') === currentArea()) i.category = trimmed; });
  const idx = DB.ingredientCategories.indexOf(oldName);
  if(idx >= 0) DB.ingredientCategories.splice(idx, 1);
  if(!ingredientCategories().includes(trimmed) && !DB.ingredientCategories.includes(trimmed)) DB.ingredientCategories.push(trimmed);
  // El icono elegido para la categoría antigua se traspasa al nuevo nombre,
  // para no perderlo solo por corregir el texto.
  if(DB.categoryIcons && DB.categoryIcons.ingredient && DB.categoryIcons.ingredient[oldName] != null){
    DB.categoryIcons.ingredient[trimmed] = DB.categoryIcons.ingredient[oldName];
    delete DB.categoryIcons.ingredient[oldName];
  }
  saveDB();
  renderMegalista();
  showToast(t('msg.categoryRenamed'));
}
/* Borrar una carpeta de la Mega Lista / del Stock.
   Una categoría no existe por sí sola: es lo que pone en el campo `category`
   de cada ingrediente. "Borrarla" es, en realidad, dejar a sus ingredientes
   sin ella. Por eso:
     · si está vacía, se quita y ya está;
     · si tiene cosas dentro, NO se borra hasta saber a dónde van. Se elige
       otra carpeta (o "sin categoría") y se mueven ahí.
   Nunca se borra un ingrediente: el hostelero ha metido sus precios uno a uno
   y perderlos por reorganizar carpetas sería imperdonable. */
async function deleteIngredientCategory(cat){
  const dentro = (DB.ingredients || []).filter(i =>
    i.category === cat && (i.area || 'cocina') === currentArea());
  const quitarDeLaLista = () => {
    const idx = DB.ingredientCategories.indexOf(cat);
    if(idx >= 0) DB.ingredientCategories.splice(idx, 1);
    if(DB.categoryIcons && DB.categoryIcons.ingredient) delete DB.categoryIcons.ingredient[cat];
  };

  if(!dentro.length){
    if(!(await confirmModal(t('msg.confirmDeleteCategory').replace('${n}', ingredientCategoryLabel(cat)),
        {icon:'ti-trash', danger:true}))) return;
    quitarDeLaLista();
  } else {
    // Las demás carpetas del área, más "sin categoría".
    const otras = [...new Set((DB.ingredients || [])
      .filter(i => (i.area || 'cocina') === currentArea() && i.category && i.category !== cat)
      .map(i => i.category))].sort();
    const opciones = [...otras.map(c => ({valor: c, texto: ingredientCategoryLabel(c)})),
                      {valor: '', texto: t('label.noCategory')}];
    const destino = await pickOption(
      t('title.deleteCategory'),
      t('msg.categoryHasItems').replace('${n}', ingredientCategoryLabel(cat))
        .replace('${c}', dentro.length),
      opciones, {icon:'ti-trash', ok: t('btn.moveAndDelete')});
    if(destino === null) return;
    dentro.forEach(i => { i.category = destino; });
    quitarDeLaLista();
  }
  saveDB();
  if(typeof megalistaFolder !== 'undefined' && megalistaFolder === cat) megalistaFolder = null;
  if(typeof stockFolder !== 'undefined' && stockFolder === cat) stockFolder = null;
  renderMegalista();
  if(typeof renderStock === 'function') renderStock();
  showToast(t('msg.categoryDeleted'));
}

function cancelNewIngredientCategory(id){
  const state = ingredientFormStateBeforeCategory || currentIngredientFormState(id);
  state.category = ingredientCategories()[0];
  ingredientFormStateBeforeCategory = null;
  openIngredientModal(id, state);
}
function confirmNewIngredientCategory(id){
  const name = document.getElementById('new-ingredient-category-name').value;
  const state = ingredientFormStateBeforeCategory || currentIngredientFormState(id);
  if(name && name.trim()){
    const cat = name.trim();
    // Se avisa aquí, no al sincronizar: el nombre acaba siendo clave de Firebase.
    if(!nombreDeCarpetaValido(cat)) return;
    if(!ingredientCategories().includes(cat) && !DB.ingredientCategories.includes(cat)) DB.ingredientCategories.push(cat);
    state.category = cat;
  } else {
    state.category = ingredientCategories()[0];
  }
  ingredientFormStateBeforeCategory = null;
  saveDB();
  openIngredientModal(id, state);
}

async function saveIngredient(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const name = document.getElementById('ing-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const category = document.getElementById('ing-category').value;
  const unit = document.getElementById('ing-unit').value;
  const supplier = document.getElementById('ing-supplier').value.trim();
  const packQty = parseFloat(document.getElementById('ing-pack-qty').value) || 0;
  const packPrice = parseFloat(document.getElementById('ing-pack-price').value) || 0;
  if(packQty < 0 || packPrice < 0){ showToast(t('msg.invalidPrice')); return; }
  const price = packQty > 0 ? packPrice / packQty : 0;
  const allergens = Array.from(document.querySelectorAll('#modal-box input[type="checkbox"]:checked')).map(c=>c.value);
  // Sin elegir, el IVA se queda como estaba (o sin definir, y la lista lo marca para revisar): nunca se inventa uno.
  const ivaElegido = document.getElementById('ing-iva') ? document.getElementById('ing-iva').value : '';

  // Aviso (no bloqueante) de posible ingrediente duplicado: mismo nombre en
  // la misma área, dado de alta quizás con otro proveedor sin darse cuenta
  // de que ya existía — para no acabar con el coste/IVA de un mismo
  // ingrediente repartido entre dos fichas distintas.
  const dupe = DB.ingredients.find(i => i.id !== id && (i.area||'cocina')===currentArea() && i.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateIngredient').replace('${name}', dupe.name)))) return;

  if(id){
    const ing = getIngredient(id);
    if(!ing) return;
    registrarCambioPrecio(ing, price, 'megalista', supplier);
    Object.assign(ing, {name, category, unit, supplier, price, packQty, packPrice, allergens});
    if(ivaElegido !== '') ing.iva = parseFloat(ivaElegido);
  }else{
    const newId = genId();
    const nuevo = {id:newId, name, category, unit, supplier, price, packQty, packPrice, allergens, area: currentArea()};
    if(ivaElegido !== '') nuevo.iva = parseFloat(ivaElegido);
    DB.ingredients.push(nuevo);
    getStockEntry(newId);
  }
  saveDB();
  closeModal();
  renderMegalista();
  showToast(t('msg.ingredientSaved'));
}

// IVA soportado de este ingrediente (el que se paga al comprarlo) — se
// edita desde Mega Lista, no desde la ficha del proveedor: un mismo
// proveedor puede venderte productos con tipos de IVA distintos (ej. una
// tienda de bebidas que vende agua al 10% y vino al 21%), así que el tipo
// tiene que ir ligado al producto, no a quién te lo vende.
function updateIngredientIva(id, val, selectEl){
  if(!isOwnerSession() && !editUnlocked) return;
  const ing = DB.ingredients.find(i=>i.id===id);
  if(!ing) return;
  ing.iva = parseFloat(val);
  saveDB();
  // Sin repintar la lista (se perdería el foco y la fila saltaría de sitio si se ordena por IVA):
  // solo se quita el rojo del desplegable y se ponen al día los contadores de «por revisar».
  if(selectEl) selectEl.classList.remove('is-falta');
  const resumen = document.getElementById('megalista-resumen');
  if(resumen) resumen.innerHTML = megalistaResumenHtml(DB.ingredients.filter(i => (i.area||'cocina') === currentArea()));
}

// Recetas (Escandallo) que usan un ingrediente, para avisar antes de
// borrarlo y evitar descuadrar el coste de esos platos sin darse cuenta.
function recipesUsingIngredient(id){
  return DB.recipes.filter(r => (r.ingredients||[]).some(line => line.type!=='base' && line.ingredientId===id));
}
function deleteIngredient(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const ing = DB.ingredients.find(i=>i.id===id);
  // Un pedido a proveedor ya en curso (BORRADOR/ENVIADO) que incluya este
  // ingrediente perdía su línea SIN AVISO al borrarlo: pedidoOrderedBase()
  // se salta las líneas cuyo ingrediente ya no existe, así que el
  // subtotal/IVA/total que se comunica al proveedor (WhatsApp/email/
  // impresión) quedaba por debajo de lo realmente pactado, sin que nadie lo
  // notara. Mismo aviso que ya existía para recetas, aquí para pedidos.
  const usedInOrders = (DB.purchaseOrders||[]).filter(o => (o.estado === 'BORRADOR' || o.estado === 'ENVIADO') && (o.items||[]).some(l => l.ingredientId === id));
  const usedIn = recipesUsingIngredient(id);
  if(usedInOrders.length){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-alert-triangle"></i> ${t('title.ingredientInUse')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p class="ml-intro">${t('msg.ingredientInPendingOrderWarning').replace('${name}', escapeHtml(ing?ing.name:'')).replace('${count}', usedInOrders.length)}</p>
      <div class="ml-uso">
        ${usedInOrders.map(o=>`<div class="ml-uso-fila">${escapeHtml(o.supplier)} — ${escapeHtml(o.date||'')}</div>`).join('')}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-off" onclick="confirmDeleteIngredient(${id})">${t('btn.deleteAnyway')}</button>
      </div>
    `);
    return;
  }
  if(usedIn.length){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-alert-triangle"></i> ${t('title.ingredientInUse')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p class="ml-intro">${t('msg.ingredientInUseWarning').replace('${name}', escapeHtml(ing?ing.name:'')).replace('${count}', usedIn.length)}</p>
      <div class="ml-uso">
        ${usedIn.map(r=>`<div class="ml-uso-fila">${escapeHtml(r.name)}</div>`).join('')}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-fino" onclick="closeModal()">${t('common.cancel')}</button>
        <button type="button" class="btn btn-fino is-off" onclick="confirmDeleteIngredient(${id})">${t('btn.deleteAnyway')}</button>
      </div>
    `);
    return;
  }
  confirmDeleteIngredient(id);
}
// Borrar un ingrediente pierde para siempre su historial de stock, igual de
// irreversible que borrar un cliente o una mesa con pedido: se pide el PIN.
function confirmDeleteIngredient(id){
  requestBusinessPinAction(t('title.deleteIngredient'), t('msg.confirmDeleteIngredient'), (pin) => reallyDeleteIngredient(id, pin));
}
function reallyDeleteIngredient(id, pin){
  // Comprobación real del PIN dentro de la función — igual que en
  // reallyCancelSale/reallyDeleteEmployee, para que no se pueda saltar
  // llamándola directamente desde la consola.
  if(!accionSensibleAutorizada(pin)) return;
  const ing0 = DB.ingredients.find(i => i.id === id);
  if(ing0){ moveToTrash('ingredient', ing0); logAudit('delete', t('audit.deletedIngredient').replace('${name}', ing0.name), 'critical'); }
  DB.ingredients = DB.ingredients.filter(i => i.id !== id);
  delete DB.stock[id];
  DB.recipes.forEach(r => {
    r.ingredients = (r.ingredients||[]).filter(line => line.ingredientId !== id);
  });
  saveDB();
  closeModal();
  renderMegalista();
  showToast(t('msg.ingredientDeleted'));
}

/* ============================================================
   STOCK
   ============================================================ */
function stockTab(tab){
  document.getElementById('stock-tab-btn-ing').classList.toggle('is-on', tab === 'ing');
  document.getElementById('stock-tab-btn-elab').classList.toggle('is-on', tab === 'elab');
  document.getElementById('stock-tab-ing').classList.toggle('active', tab === 'ing');
  document.getElementById('stock-tab-elab').classList.toggle('active', tab === 'elab');
  scrollContentToTop();
}

let stockFolder = null;   // categoría abierta en la pestaña de ingredientes
let elabFolder = null;    // categoría abierta en la pestaña de elaboraciones
function openStockFolder(cat){ stockFolder = cat; renderStock(); }
function backToStockFolders(){ stockFolder = null; renderStock(); }
function openElabFolder(cat){ elabFolder = cat; renderStock(); }
function backToElabFolders(){ elabFolder = null; renderStock(); }

// Valor económico total del stock actual (a precio de coste), separado por
// ingredientes y elaboraciones, para las dos áreas si el negocio las tiene.
// Las elaboraciones manuales (sin escandallo detrás) no tienen coste
// conocido y se excluyen del total en vez de contarlas como 0 en silencio.
function stockTotalValueBreakdown(){
  let ingTotal = 0, elabTotal = 0, elabSinCoste = 0;
  DB.ingredients.forEach(ing => {
    if(ing.activo === false) return;
    const entry = getStockEntry(ing.id);
    ingTotal += (entry.qty||0) * (ing.price||0);
  });
  (DB.elaboraciones||[]).forEach(e => {
    if(!e.recipeId){ if(e.qty) elabSinCoste++; return; }
    const recipe = getRecipe(e.recipeId);
    if(!recipe){ if(e.qty) elabSinCoste++; return; }
    const costPerUnit = recipeBaseCostPerUnit(recipe);
    elabTotal += (e.qty||0) * costPerUnit;
  });
  return {ingTotal, elabTotal, total: ingTotal + elabTotal, elabSinCoste};
}

function openStockValueModal(){
  const b = stockTotalValueBreakdown();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-report-money"></i> ${t('title.stockValue')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p class="ml-intro">${t('msg.stockValueHint')}</p>
    <div class="st-resumen st-resumen-modal">
      <div class="st-cel st-cel-gr"><span class="st-cel-et">${t('label.stockValueTotal')}</span><span class="st-cel-v">${fmtMoney(b.total)}</span></div>
      <div class="st-cel"><span class="st-cel-et">${t('label.ingredients')}</span><span class="st-cel-v">${fmtMoney(b.ingTotal)}</span></div>
      <div class="st-cel"><span class="st-cel-et">${tA('label.elaborations')}</span><span class="st-cel-v">${fmtMoney(b.elabTotal)}</span></div>
    </div>
    ${b.elabSinCoste ? `<p class="pe-aviso"><i class="ti ti-info-circle"></i> ${t('msg.stockValueElabSinCoste').replace('${n}', b.elabSinCoste)}</p>` : ''}
  `);
}

/* ============== Stock, diseño nuevo (30/10) ==============
   Una fila = un producto: nombre, estado, cantidad con − / + y, plegado en
   móvil, el mínimo y el menú ⋯. Antes cada fila llevaba dos cajas de número,
   un lápiz y una papelera, y todo teñido de rojo o verde: en una lista larga
   no se distinguía qué pedía atención.
   El − / + NO guarda en cada toque: si se pulsa cinco veces seguidas, el
   Historial anotaría cinco ajustes de uno en uno. Se espera 0,7 s tras el
   último toque y se guarda UNA vez (stPend). */
const stPend = {};   // cantidades tocadas con − / + que aún no se han guardado: {clave: {val, timer}}
const stClave = (tipo, id) => tipo + '-' + id;
const stPasoDe = unit => ['g', 'ml', 'cl'].includes(unit) ? 100 : 1;
function stGuardarPend(k, tipo, id){
  const p = stPend[k];
  if(!p) return;
  delete stPend[k];
  if(tipo === 'elab') updateElaboracionQty(id, p.val); else updateStockQty(id, p.val);
}
function stPaso(tipo, id, dir){
  const k = stClave(tipo, id);
  const e = tipo === 'elab' ? getElaboracion(id) : null;
  const ing = tipo === 'ing' ? getIngredient(id) : null;
  if(!e && !ing) return;
  const actual = stPend[k] ? stPend[k].val : (tipo === 'elab' ? (e.qty || 0) : (getStockEntry(id).qty || 0));
  const nuevo = Math.max(0, Math.round((actual + dir * stPasoDe((e || ing).unit)) * 100) / 100);
  if(stPend[k]) clearTimeout(stPend[k].timer);
  const inp = document.querySelector('[data-st="' + k + '"] .st-qty input');
  if(inp) inp.value = nuevo;
  stPend[k] = {val: nuevo, timer: setTimeout(() => stGuardarPend(k, tipo, id), 700)};
}
// Escribir la cantidad a mano guarda al momento y anula lo que hubiera pendiente de − / +.
function stEscribir(tipo, id, valor){
  const k = stClave(tipo, id);
  if(stPend[k]){ clearTimeout(stPend[k].timer); delete stPend[k]; }
  if(tipo === 'elab') updateElaboracionQty(id, valor); else updateStockQty(id, valor);
}
// El mínimo es una decisión de gestión: la casilla está BLOQUEADA y se abre con el lápiz, para que no se confunda con la cantidad
// actual (antes eran dos cajas iguales una al lado de otra). Al guardar, el repintado la vuelve a bloquear.
function stMinEditar(btn){
  const inp = btn.closest('.st-ctl').querySelector('input');
  if(!inp || inp.disabled) return;
  inp.readOnly = false;
  inp.closest('.st-fila').classList.add('is-editando');
  inp.focus(); inp.select();
}
function stMinBloquear(inp){
  if(inp.disabled) return;
  inp.readOnly = true;
  const f = inp.closest('.st-fila');
  if(f) f.classList.remove('is-editando');
}
function stMinTecla(ev, inp){
  if(ev.key === 'Enter'){ ev.preventDefault(); inp.blur(); }
  else if(ev.key === 'Escape'){ inp.value = inp.defaultValue; inp.blur(); }
}
function stPedirLoQueFalta(){
  navigate('pedidos');
  setPedidosTab(editUnlocked ? 'crear' : 'solicitar');
}
function stSoloAlertas(){
  const c = document.getElementById('stock-only-alerts');
  if(!c) return;
  c.checked = !c.checked;
  renderStock();
}

function stFilaHtml(row){
  /* ⚠️ Bajo mínimo es ESTRICTAMENTE menor, no "menor o igual". Lo pidió el
     dueño y tiene razón: con el mínimo justo todavía TIENES tu mínimo, no
     te falta nada, y pintarlo en rojo enseña a desconfiar del rojo. El mismo
     criterio en el contador de alertas y en el filtro "solo alertas".
     Sin mínimo puesto (min = 0) no se pinta nada: no hay nada que cumplir,
     y teñirlo todo de verde quitaría valor al verde de verdad. */
  const low = row.qty < row.min;
  const ok = !low && row.min > 0;
  const isElab = row.type === 'elab';
  const fromEscandallo = isElab && !!row.recipeId;
  const k = stClave(row.type, row.id);
  const qty = stPend[k] ? stPend[k].val : row.qty;
  const falta = low ? Math.round((row.min - row.qty) * 100) / 100 : 0;
  const sobra = ok ? Math.round((row.qty - row.min) * 100) / 100 : 0;
  const camino = !isElab && typeof pcEnCamino === 'function' ? pcEnCamino(row.id) : 0;
  const abierta = ggPlegableAbierta('st-' + k);
  const u = escapeHtml(row.unit);
  const acciones = [
    {icono:'ti-trash-x', texto:t('merma.btn'), fn:`openMermaModal('${row.type}:${row.id}')`},
    {icono:'ti-history', texto:gl({es:'Historial de este producto', ca:'Historial d\'aquest producte', en:'History of this product'}), fn:`openStockLogModal('${row.type}',${row.id})`, owner:true},
    !isElab ? {icono:'ti-list-details', texto:gl({es:'Ver en Mega Lista', ca:'Veure a Mega Llista', en:'See in Mega List'}), fn:`navigate('megalista');openIngredientModal(${row.id})`, owner:true} : null,
    fromEscandallo ? {icono:currentArea() === 'sala' ? 'ti-glass-cocktail' : 'ti-chef-hat', texto:t('title.editCostingSheet'), fn:`navigate('escandallo');openRecipeModal(${row.recipeId})`, owner:true} : null,
    isElab && !fromEscandallo ? {icono:'ti-pencil', texto:t('common.edit'), fn:`openElaboracionModal(${row.id})`, owner:true} : null,
    isElab && !fromEscandallo ? {icono:'ti-trash', texto:t('common.delete'), fn:`deleteElaboracion(${row.id})`, peligro:true, owner:true} : null
  ];
  const tags = [
    low ? `<em class="st-tag bajo">${gl({es:'Falta', ca:'Falten', en:'Short by'})} ${fmtNum(falta)} ${u}</em>` : '',
    // Con el mínimo cubierto, la tarjeta se pone verde y dice cuánto hay DE MÁS (7/11, pedido del dueño).
    ok ? `<em class="st-tag ok">${sobra > 0 ? `+${fmtNum(sobra)} ${u} ${gl({es:'sobre el mínimo', ca:'sobre el mínim', en:'above minimum'})}` : gl({es:'En el mínimo', ca:'Al mínim', en:'At minimum'})}</em>` : '',
    camino > 0 ? `<em class="st-tag cam"><i class="ti ti-truck-delivery"></i> +${fmtNum(camino)} ${u} ${gl({es:'en camino', ca:'en camí', en:'on the way'})}</em>` : '',
    fromEscandallo ? `<em class="st-tag">${t('label.costingSheet')}</em>` : '',
    !low && !(row.min > 0) ? `<span class="st-nada">${gl({es:'sin mínimo', ca:'sense mínim', en:'no minimum'})}</span>` : ''
  ].filter(Boolean).join('');
  return `
    <div class="st-fila stock-row plegable${low ? ' is-bajo' : ok ? ' is-ok' : ''}${abierta ? ' is-abierta' : ''}" data-st="${k}" data-pl="st-${k}" onclick="ggTogglePlegable(event, this)">
      <div class="st-nom"><b title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</b>${tags ? `<span class="st-sub">${tags}</span>` : ''}</div>
      <button type="button" class="pl-chev" aria-expanded="${abierta}" aria-label="${escapeHtml(gl({es:'Ver el resto', ca:'Veure la resta', en:'Show more'}))}" onclick="event.stopPropagation();ggTogglePlegable(event, this.closest('.plegable'))"><i class="ti ti-chevron-down"></i></button>
      <div class="st-datos">
        <div class="st-campo st-min pl-extra" data-et="${escapeHtml(t('label.minStock'))}">
          <span class="st-lab">${gl({es:'Mínimo', ca:'Mínim', en:'Minimum'})} · ${u}</span>
          <span class="st-ctl">
            <input type="number" class="st-min-in" value="${row.min}" step="0.01" min="0" ${editUnlocked ? 'readonly' : 'disabled'} aria-label="${escapeHtml(t('label.minStock') + ': ' + row.name)}"
              onchange="${isElab ? `updateElaboracionMin(${row.id}, this.value)` : `updateStockMin(${row.id}, this.value)`}" onblur="stMinBloquear(this)" onkeydown="stMinTecla(event, this)">
            ${editUnlocked
              ? `<button type="button" class="btn btn-fino st-lapiz" title="${escapeHtml(gl({es:'Cambiar el mínimo', ca:'Canviar el mínim', en:'Change the minimum'}))}" aria-label="${escapeHtml(gl({es:'Cambiar el mínimo', ca:'Canviar el mínim', en:'Change the minimum'}) + ': ' + row.name)}" onclick="event.stopPropagation();stMinEditar(this)"><i class="ti ti-pencil"></i></button>`
              : `<span class="st-cand" title="${escapeHtml(gl({es:'Solo el encargado cambia el mínimo', ca:'Només l\'encarregat canvia el mínim', en:'Only a manager changes the minimum'}))}"><i class="ti ti-lock"></i></span>`}
          </span>
        </div>
        <div class="st-campo st-qty">
          <span class="st-lab">${gl({es:'Actual', ca:'Actual', en:'Current'})} · ${u}</span>
          <span class="st-ctl">
            <button type="button" class="btn btn-fino" aria-label="−" onclick="stPaso('${row.type}',${row.id},-1)"><i class="ti ti-minus"></i></button>
            <input type="number" value="${qty}" step="0.01" min="0" aria-label="${escapeHtml(t('label.currentAbbrev') + ': ' + row.name)}" onchange="stEscribir('${row.type}',${row.id}, this.value)">
            <button type="button" class="btn btn-fino" aria-label="+" onclick="stPaso('${row.type}',${row.id},1)"><i class="ti ti-plus"></i></button>
          </span>
        </div>
      </div>
      <div class="st-acc pl-extra">${ggMenuAcciones(acciones)}</div>
    </div>`;
}

function stListaHtml(filas){
  // Lo que pide atención, arriba; dentro de cada grupo, por nombre.
  const ordenadas = [...filas].sort((a, b) => ((b.qty < b.min) - (a.qty < a.min)) || a.name.localeCompare(b.name));
  return `<div class="st-lista">${ordenadas.map(stFilaHtml).join('')}</div>`;
}
function stGrupoHtml(titulo, filas){
  const bajos = filas.filter(r => r.qty < r.min).length;
  return `<div class="st-grupo"><span>${escapeHtml(titulo)}</span><em>${filas.length}</em>${bajos ? `<strong>${bajos} ${gl({es:'bajo mínimo', ca:'sota el mínim', en:'below min'})}</strong>` : ''}</div>` + stListaHtml(filas);
}
function stRutaHtml(volverFn, nombre, filas){
  const bajos = filas.filter(r => r.qty < r.min).length;
  return `
    <div class="ml-ruta">
      <button type="button" class="btn btn-sm btn-fino" onclick="${volverFn}()"><i class="ti ti-arrow-left"></i> ${t('label.categories')}</button>
      <div class="ml-ruta-nom">${escapeHtml(nombre)}<span>${filas.length}${bajos ? ` · ${bajos} ${gl({es:'bajo mínimo', ca:'sota el mínim', en:'below min'})}` : ''}</span></div>
    </div>`;
}

function renderStock(){
  maybeShowCategoryIconHint();
  // Mismo caso que las pestañas de Escandallo y Fichas: en Sala, una
  // zanahoria y un plato de sopa presidiendo el stock de la barra.
  if(typeof ajustaIconoPestana === 'function'){
    const sala = currentArea() === 'sala';
    ajustaIconoPestana('stock-tab-btn-ing', sala ? 'ti-bottle' : 'ti-carrot');
    ajustaIconoPestana('stock-tab-btn-elab', sala ? 'ti-glass-cocktail' : 'ti-soup');
  }
  const search = document.getElementById('stock-search').value.toLowerCase();
  const onlyAlerts = document.getElementById('stock-only-alerts').checked;
  const chip = document.getElementById('stock-chip-alertas');
  if(chip) chip.classList.toggle('is-off', onlyAlerts);

  // Un solo getStockEntry() por ingrediente (antes se llamaba una vez para
  // filtrar y otra para pintar la fila, el doble de trabajo en cada
  // render — y esto se repinta en cada cambio de cantidad).
  const items = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea() && (!search || ing.name.toLowerCase().includes(search)))
    .map(ing => ({type:'ing', id: ing.id, name: ing.name, unit: ing.unit, category: ing.category || t('label.noCategory'), ...getStockEntry(ing.id)}))
    .filter(row => onlyAlerts ? row.qty < row.min : true);

  const elabs = (DB.elaboraciones||[]).filter(e => {
    const matchArea = (e.area||'cocina') === currentArea();
    const matchSearch = !search || e.name.toLowerCase().includes(search);
    const matchAlert = !onlyAlerts || (e.qty||0) < (e.min||0);
    return matchArea && matchSearch && matchAlert;
  }).map(e => ({type:'elab', id: e.id, recipeId: e.recipeId||null, name: e.name, unit: e.unit, qty: e.qty||0, min: e.min||0}));

  // Totales de referencia: no cambian con la búsqueda ni con "Solo alertas".
  const activeArea = DB.ingredients.filter(ing => (ing.area||'cocina') === currentArea() && ing.activo !== false);
  const allElabList = (DB.elaboraciones||[]).filter(e => (e.area||'cocina') === currentArea());
  const lowIngCount = activeArea.filter(ing => { const s = getStockEntry(ing.id); return s.qty < s.min; }).length;
  const lowElabCount = allElabList.filter(e => (e.qty||0) < (e.min||0)).length;
  const lowTotal = lowIngCount + lowElabCount;
  const kpisBox = document.getElementById('stock-kpis');
  if(kpisBox){
    kpisBox.innerHTML = `
      <div class="st-cel"><span class="st-cel-et">${t('label.products')}</span><span class="st-cel-v">${activeArea.length}</span></div>
      <div class="st-cel"><span class="st-cel-et">${tA('label.elaborations')}</span><span class="st-cel-v">${allElabList.length}</span></div>
      <button type="button" class="st-cel st-cel-btn${lowTotal ? ' is-bajo' : ''}" aria-pressed="${onlyAlerts}" onclick="stSoloAlertas()" title="${escapeHtml(gl({es:'Ver solo lo que está bajo mínimo', ca:'Veure només el que és sota el mínim', en:'Show only what is below the minimum'}))}">
        <span class="st-cel-et">${gl({es:'Bajo mínimo', ca:'Sota el mínim', en:'Below minimum'})}</span>
        <span class="st-cel-v">${lowTotal}</span>
        <span class="st-cel-s">${lowIngCount} ${lowIngCount === 1 ? gl({es:'producto', ca:'producte', en:'product'}) : gl({es:'productos', ca:'productes', en:'products'})} · ${lowElabCount} ${currentArea()==='sala' ? (lowElabCount === 1 ? gl({es:'preparación', ca:'preparació', en:'preparation'}) : gl({es:'preparaciones', ca:'preparacions', en:'preparations'})) : (lowElabCount === 1 ? gl({es:'elaboración', ca:'elaboració', en:'preparation'}) : gl({es:'elaboraciones', ca:'elaboracions', en:'preparations'}))}</span>
      </button>
      <button type="button" class="st-cel st-cel-btn owner-only" onclick="openStockValueModal()">
        <span class="st-cel-et">${t('btn.stockValue')}</span>
        <span class="st-cel-v">${fmtMoney(stockTotalValueBreakdown().total)}</span>
      </button>`;
  }
  const nIng = document.getElementById('stock-n-ing'), nElab = document.getElementById('stock-n-elab');
  if(nIng){ nIng.textContent = lowIngCount || ''; nIng.hidden = !lowIngCount; }
  if(nElab){ nElab.textContent = lowElabCount || ''; nElab.hidden = !lowElabCount; }
  const pedir = document.getElementById('stock-pedir');
  if(pedir) pedir.style.display = lowTotal ? '' : 'none';
  const menu = document.getElementById('stock-menu');
  if(menu) menu.innerHTML = ggMenuAcciones([
    {icono:'ti-chart-bar', texto:t('merma.reportTitle'), fn:'openMermasInformeModal()', owner:true},
    {icono:'ti-history', texto:t('btn.stockLog'), fn:'openStockLogModal()', owner:true}
  ]);

  /* Ingredientes: carpetas (categoría) → productos */
  const groupsWrap = document.getElementById('stock-ing-groups');
  const searching = !!(search || onlyAlerts);

  const byCat = {};
  items.forEach(it => { (byCat[it.category] = byCat[it.category] || []).push(it); });
  const cats = Object.keys(byCat).sort((a,b) => {
    const ia = ingredientCategories().indexOf(a), ib = ingredientCategories().indexOf(b);
    if(ia === -1 && ib === -1) return a.localeCompare(b);
    if(ia === -1) return 1;
    if(ib === -1) return -1;
    return ia - ib;
  });
  const vacio = (icono, texto, accion) => `<div class="empty es-vacio"><i class="ti ${icono}"></i>${texto}${accion || ''}</div>`;

  if(!items.length){
    const hayProductos = DB.ingredients.some(ing => (ing.area||'cocina') === currentArea());
    groupsWrap.innerHTML = hayProductos
      ? vacio(onlyAlerts && !search ? 'ti-circle-check' : 'ti-search-off', onlyAlerts && !search ? gl({es:'Nada por debajo del mínimo. Todo en orden.', ca:'Res per sota del mínim. Tot en ordre.', en:'Nothing below the minimum. All good.'}) : t('empty.noSearchResults'))
      : vacio('ti-package', t('empty.stock'), `<div><button type="button" class="btn btn-fino is-on owner-only" onclick="navigate('megalista')"><i class="ti ti-list-details"></i> ${t('view.megalista.title')}</button></div>`);
  } else if(searching){
    groupsWrap.innerHTML = cats.map(cat => stGrupoHtml(ingredientCategoryLabel(cat), byCat[cat])).join('');
  } else if(stockFolder === null){
    groupsWrap.innerHTML = `<div class="ml-carpetas">${cats.map(cat => {
      const k = escapeJsAttr(cat);
      const bajos = byCat[cat].filter(r => r.qty < r.min).length;
      return `
      <div class="ml-carpeta" role="button" tabindex="0" onclick="openStockFolder('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openStockFolder('${k}')}">
        <span class="cat-icon-btn ml-ico" role="button" title="${escapeHtml(t('title.chooseFolderIcon'))}" aria-label="${escapeHtml(t('title.chooseFolderIcon'))}" onclick="event.stopPropagation();openCategoryIconModal('${k}','${k}','renderStock','ingredient')">${megalistaIconoCarpeta(cat)}</span>
        <div class="ml-carpeta-txt">
          <div class="ml-carpeta-nom">${escapeHtml(ingredientCategoryLabel(cat))}</div>
          <div class="ml-carpeta-meta">${byCat[cat].length === 1 ? t('label.oneProduct') : t('label.nProducts').replace('${n}', byCat[cat].length)}</div>
          ${bajos ? `<div class="st-carp-baja">${bajos} ${gl({es:'bajo mínimo', ca:'sota el mínim', en:'below min'})}</div>` : ''}
        </div>
        ${botonesDeCarpeta(cat, 'ingredient')}
      </div>`;
    }).join('')}</div>`;
  } else {
    const folderItems = byCat[stockFolder] || [];
    if(!folderItems.length){ stockFolder = null; renderStock(); return; }
    groupsWrap.innerHTML = stRutaHtml('backToStockFolders', ingredientCategoryLabel(stockFolder), folderItems) + stListaHtml(folderItems);
  }

  /* Elaboraciones — mismas carpetas por categoría que Escandallo → Elaboraciones
     (no las que "haya en stock ahora mismo"), para que sea consistente estén o
     no todavía en stock, y siempre mostrando la vista de carpetas primero. */
  const elabGroupsWrap = document.getElementById('stock-elab-groups');
  const baseRecipes = DB.recipes.filter(r => r.isBase && (r.area||'cocina') === currentArea());
  const elabFolders = getEscandalloFolders(baseRecipes); // [[key, label, recipes], ...]
  const elabsByRecipeCat = {};
  elabs.forEach(e => {
    // Las elaboraciones que vienen de una receta base del Escandallo heredan
    // su categoría; las creadas a mano usan la que se les asigne en su ficha.
    const cat = e.recipeId ? ((DB.recipes.find(r=>r.id===e.recipeId)||{}).category || '__none__') : (e.category || '__none__');
    (elabsByRecipeCat[cat] = elabsByRecipeCat[cat] || []).push(e);
  });
  if(!elabFolders.some(([key])=>key==='__none__') && elabsByRecipeCat['__none__']){
    elabFolders.push(['__none__', t('label.noCategory'), []]);
  }
  // Una elaboración manual puede llevar una categoría que ninguna receta
  // base usa todavía: se añade igualmente para que su carpeta no quede invisible.
  Object.keys(elabsByRecipeCat).forEach(cat => {
    if(cat !== '__none__' && !elabFolders.some(([key]) => key === cat)){
      elabFolders.push([cat, cat, []]);
    }
  });

  if(!elabs.length){
    elabGroupsWrap.innerHTML = vacio('ti-package', t('empty.elaborations'), `<div><button type="button" class="btn btn-fino is-on owner-only" onclick="navigate('escandallo')"><i class="ti ti-notebook"></i> ${t('view.escandallo.title')}</button></div>`);
  } else if(searching){
    elabGroupsWrap.innerHTML = elabFolders.filter(([key]) => (elabsByRecipeCat[key]||[]).length).map(([key, label]) => stGrupoHtml(label, elabsByRecipeCat[key])).join('');
  } else if(elabFolder === null){
    elabGroupsWrap.innerHTML = `<div class="ml-carpetas">${elabFolders.map(([key, label]) => {
      const lista = elabsByRecipeCat[key] || [];
      const k = escapeJsAttr(key), real = key !== '__none__';
      const guardado = (DB.categoryIcons && DB.categoryIcons.recipe && DB.categoryIcons.recipe[key]) || '';
      const icono = (real && iconoSeccionHtml(guardado, label, 26)) || '<i class="ti ti-folder"></i>';
      const bajos = lista.filter(r => r.qty < r.min).length;
      return `
      <div class="ml-carpeta" role="button" tabindex="0" onclick="openElabFolder('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openElabFolder('${k}')}">
        ${real
          ? `<span class="cat-icon-btn ml-ico" role="button" title="${escapeHtml(t('title.chooseFolderIcon'))}" aria-label="${escapeHtml(t('title.chooseFolderIcon'))}" onclick="event.stopPropagation();openCategoryIconModal('${k}','${k}','renderStock','recipe')">${icono}</span>`
          : `<span class="ml-ico">${icono}</span>`}
        <div class="ml-carpeta-txt">
          <div class="ml-carpeta-nom">${escapeHtml(label)}</div>
          <div class="ml-carpeta-meta">${lista.length === 1 ? tA('label.oneElaboration') : tA('label.nElaborations').replace('${n}', lista.length)}</div>
          ${bajos ? `<div class="st-carp-baja">${bajos} ${gl({es:'bajo mínimo', ca:'sota el mínim', en:'below min'})}</div>` : ''}
        </div>
        ${real ? botonesDeCarpeta(key, 'recipe') : ''}
      </div>`;
    }).join('')}</div>`;
  } else {
    const folderElabs = elabsByRecipeCat[elabFolder] || [];
    const nombre = (elabFolders.find(([key]) => key === elabFolder) || [])[1] || t('label.noCategory');
    elabGroupsWrap.innerHTML = stRutaHtml('backToElabFolders', nombre, folderElabs)
      + (folderElabs.length ? stListaHtml(folderElabs) : vacio('ti-package', t('empty.elaborations')));
  }
}


function updateStockMin(ingredientId, value){
  // El campo ya sale disabled sin permiso, pero eso es solo un atributo
  // HTML quitable desde devtools — la función en sí no comprobaba nada.
  if(!isOwnerSession() && !editUnlocked) return;
  const s = getStockEntry(ingredientId);
  s.min = parseFloat(value) || 0;
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderStock());
}

// Registro de ajustes de stock (manuales y rápidos), para poder investigar
// mermas/descuadres: qué se tocó, cuándo y de qué cantidad a qué cantidad.
// Facturas de proveedor pendientes de pago (generadas automáticamente al
// recibir un pedido) — vencidas primero, luego las que vencen en los
// próximos 7 días, con un botón para marcarlas pagadas sin salir de aquí.
// Pagos con tarjeta confirmados por el banco que no se pudieron aplicar a
// ningún pedido/reserva (ver initPublicRequestsListener, js/core.js, rama
// pago_confirmado) — normalmente porque el pedido se rechazó/canceló justo
// antes de que llegara esta confirmación asíncrona. No hay forma de que la
// app haga el reembolso sola (eso se hace desde el panel de Stripe/del
// proveedor de pago); esto es solo para que el dinero cobrado no desaparezca
// sin dejar rastro y el negocio sepa que tiene que gestionarlo a mano.
function openUnmatchedPaymentsModal(){
  const list = [...(DB.unmatchedOnlinePayments||[])].sort((a,b)=>(b.detectedAt||'').localeCompare(a.detectedAt||''));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-credit-card-off"></i> ${t('dash.att.unmatchedPayments')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('unmatchedPay.desc')}</p>
    ${list.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('label.amount')}</th><th>${t('label.reference')}</th><th></th></tr></thead>
        <tbody>${list.map(p => `
          <tr>
            <td>${escapeHtml((p.createdAt||p.detectedAt||'').slice(0,16).replace('T',' '))}</td>
            <td style="font-weight:700">${fmtMoney(p.amount||0)}</td>
            <td style="font-family:monospace;font-size:11px">${escapeHtml(p.orderRef||'—')}</td>
            <td><button class="btn btn-sm" onclick="dismissUnmatchedPayment(${p.id})"><i class="ti ti-check"></i> ${t('unmatchedPay.markResolved')}</button></td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>` : `<div class="empty">${t('unmatchedPay.none')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function dismissUnmatchedPayment(id){
  DB.unmatchedOnlinePayments = (DB.unmatchedOnlinePayments||[]).filter(p => p.id !== id);
  saveDB();
  openUnmatchedPaymentsModal();
  if(typeof renderDashboard === 'function') renderDashboard();
}

function openPendingInvoicesModal(){
  const today = todayStr();
  const in7 = dateStr(new Date(Date.now() + 7*86400000));
  const pending = gastosVariablesActivos()
    .filter(v => v.fechaPago && !v.pagada && v.fechaPago <= in7)
    .sort((a,b) => a.fechaPago.localeCompare(b.fechaPago));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-file-invoice"></i> ${t('invoices.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${pending.length ? `
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>${t('invoices.dueDate')}</th><th>${t('common.supplier')}</th><th>${t('label.total')}</th><th></th></tr></thead>
        <tbody>${pending.map(v => `
          <tr>
            <td data-label="${t('invoices.dueDate')}" style="color:${v.fechaPago<today?'var(--red)':''}">${escapeHtml(v.fechaPago)}${v.fechaPago<today?` <span class="badge badge-red txt-xs">${t('invoices.overdue')}</span>`:''}</td>
            <td data-label="${t('common.supplier')}">${escapeHtml(v.proveedor||'—')}</td>
            <td data-label="${t('label.total')}">${fmtMoney((parseFloat(v.importe)||0) * (1 + (parseFloat(v.iva)||0)/100))}</td>
            <td><button class="btn btn-sm" onclick="markInvoicePaid(${v.id})">${t('invoices.markPaid')}</button></td>
          </tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-circle-check"></i>${t('invoices.none')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}
function markInvoicePaid(id){
  const v = (DB.ge.variables||[]).find(x=>x.id===id);
  if(!v) return;
  v.pagada = true;
  saveDB();
  openPendingInvoicesModal();
  if(typeof renderDashboard === 'function') renderDashboard();
}

function logStockAdjustment(type, refId, name, before, after, source){
  if(!DB.stockLog) DB.stockLog = [];
  DB.stockLog.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    type, refId, name, before, after, delta: after - before, area: currentArea(),
    // 'purchase' = recepción de pedido a proveedor (entrada esperada, no es
    // merma); 'manual' = alguien corrigió el stock a mano (típicamente tras
    // un recuento físico) — si esa corrección es a la baja, es la señal más
    // fiable de merma real que tenemos, y es lo que alimenta el informe de
    // mermas en Stock.
    source: source || 'manual',
    // Quién hizo el ajuste — antes el histórico solo decía "qué" y "cuándo",
    // nunca "quién", que es justo lo que hace falta para investigar mermas
    // repetidas de una persona concreta. Mismo criterio que logAudit().
    actor: (typeof currentActorName === 'function') ? currentActorName() : ''
  });
  if(DB.stockLog.length > 500) DB.stockLog = DB.stockLog.slice(-500);
  // Solo se mira aquí una corrección manual del stock (source==='manual'):
  // la de tipo 'purchase' (recibir un pedido) ya se refleja en el Registro
  // de actividad desde changePedidoEstado, con su propio texto — mirarla
  // también aquí la duplicaría dos veces para la misma acción.
  if((source || 'manual') === 'manual' && typeof logAudit === 'function'){
    const bajada = (after - before) < 0;
    logAudit('stock_adjust', t('audit.stockAdjusted').replace('${name}', name||'?').replace('${before}', before).replace('${after}', after), bajada && before > 0 ? 'critical' : 'normal');
  }
}

function openStockLogModal(tipo, id){
  // Desde la fila de un producto solo enseña los ajustes de ESE producto.
  const log = [...(DB.stockLog||[])].filter(e => (e.area||'cocina')===currentArea() && (!tipo || (e.type === tipo && e.refId === id))).reverse().slice(0, 100);
  const sujeto = tipo ? (tipo === 'elab' ? getElaboracion(id) : getIngredient(id)) : null;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-history"></i> ${t('title.stockLog')}${sujeto ? ': ' + escapeHtml(sujeto.name) : ''}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="table-wrap">
      <table class="table-cards">
        <thead><tr><th>${t('common.date')}</th><th>${t('th.time')}</th><th>${t('common.name')}</th><th>${t('megalista.qtyBefore')}</th><th>${t('megalista.qtyAfter')}</th><th>${t('megalista.change')}</th><th>${t('common.responsible')}</th></tr></thead>
        <tbody>${log.length ? log.map(e => `<tr><td data-label="${t('common.date')}">${escapeHtml(e.fecha)}</td><td data-label="${t('th.time')}">${escapeHtml(e.hora)}</td><td data-label="${t('common.name')}">${escapeHtml(e.name)}</td><td data-label="${t('megalista.qtyBefore')}">${fmtNum(e.before)}</td><td data-label="${t('megalista.qtyAfter')}">${fmtNum(e.after)}</td><td data-label="${t('megalista.change')}" style="color:${e.delta>=0?'var(--green)':'var(--red)'}">${e.delta>=0?'+':''}${fmtNum(e.delta)}</td><td data-label="${t('common.responsible')}">${escapeHtml(e.actor||'—')}</td></tr>`).join('') : `<tr><td colspan="7"><div class="empty" style="padding:14px">${t('empty.noStockLog')}</div></td></tr>`}</tbody>
      </table>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

/* ============== Mermas (27/09) ==============
   Lo que se tira, anotado en el momento desde Stock. Antes solo existía la
   hoja de papel de la guía de mermas: alguien tenía que sumarla a mano cada
   semana y se acababa dejando. Aquí cada merma sale ya en euros (con el
   precio de la Mega Lista) y se descuenta del stock, que hasta ahora seguía
   creyendo que lo tirado estaba en la cámara.
   El motivo se guarda como clave estable en castellano y se traduce al
   pintarlo; "otro" guarda además el texto libre que escriba el equipo. */
// consumoPropio = lo que se come o se lleva el titular (autoconsumo, tributa
// como venta a coste); comidaPersonal = la comida del equipo (gasto de
// personal; si es retribución en especie lo decide el convenio/gestor).
// Los motivos son CLAVES estables (el historial las guarda y el informe las
// agrupa), así que cada área solo elige cuáles ofrece: en una barra no hay
// «sobreproducción» pero sí la botella rota y la copa que se invita.
const MERMA_MOTIVOS_TODOS = ['caducado', 'malEstado', 'sobreproduccion', 'rotura', 'invitacion', 'error', 'devolucion', 'consumoPropio', 'comidaPersonal', 'otro'];
function mermaMotivos(){
  const sala = currentArea() === 'sala';
  return MERMA_MOTIVOS_TODOS.filter(m => sala ? m !== 'sobreproduccion' : (m !== 'rotura' && m !== 'invitacion'));
}
function mermaMotivoLabel(m){
  if(!m) return '—';
  if(m.motivo === 'otro') return m.motivoOtro || t('merma.r.otro');
  return t('merma.r.' + m.motivo);
}
function mermaProductos(){
  const area = currentArea();
  const ings = DB.ingredients.filter(i => (i.area||'cocina') === area && i.activo !== false)
    .sort((a,b) => a.name.localeCompare(b.name));
  const elabs = (DB.elaboraciones||[]).filter(e => (e.area||'cocina') === area)
    .sort((a,b) => a.name.localeCompare(b.name));
  return {ings, elabs};
}
function mermaCosteUnidad(tipo, id){
  if(tipo === 'ing'){ const ing = getIngredient(id); return ing ? (parseFloat(ing.price)||0) : 0; }
  const e = getElaboracion(id);
  const r = e && e.recipeId ? getRecipe(e.recipeId) : null;
  return r ? (recipeBaseCostPerUnit(r) || 0) : 0;
}
function openMermaModal(sel){
  const {ings, elabs} = mermaProductos();
  const byCat = {};
  ings.forEach(i => { const c = i.category || t('label.noCategory'); (byCat[c] = byCat[c] || []).push(i); });
  const opts = Object.keys(byCat).sort((a,b) => a.localeCompare(b)).map(c =>
    `<optgroup label="${escapeHtml(ingredientCategoryLabel(c))}">${byCat[c].map(i => `<option value="ing:${i.id}">${escapeHtml(i.name)}</option>`).join('')}</optgroup>`).join('')
    + (elabs.length ? `<optgroup label="${escapeHtml(tA('label.elaborations'))}">${elabs.map(e => `<option value="elab:${e.id}">${escapeHtml(e.name)}</option>`).join('')}</optgroup>` : '');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-trash-x"></i> ${t('merma.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label for="merma-prod">${t('merma.product')}</label>
      <select id="merma-prod" onchange="mermaActualizar()"><option value="">${t('merma.choose')}</option>${opts}</select>
    </div>
    <div class="field">
      <label for="merma-qty" id="merma-qty-l">${t('merma.qty').replace('${u}', '—')}</label>
      <input type="number" id="merma-qty" min="0" step="0.01" inputmode="decimal" oninput="mermaActualizar()">
    </div>
    <div class="field">
      <label>${t('merma.reason')}</label>
      <div class="merma-motivos">${mermaMotivos().map(m => `<label class="merma-motivo"><input type="radio" name="merma-motivo" value="${m}" onchange="mermaActualizar()"> <span>${t('merma.r.' + m)}</span></label>`).join('')}</div>
      <input type="text" id="merma-otro" maxlength="80" placeholder="${escapeHtml(t('merma.otherPh'))}" style="display:none;margin-top:8px">
    </div>
    <div class="txt-xs" id="merma-coste" style="color:var(--muted)">${t('merma.stockNote')}</div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="guardarMerma()"><i class="ti ti-check"></i> ${t('merma.save')}</button>
    </div>
  `);
  // Desde la fila de un producto llega ya elegido: solo falta la cantidad.
  if(sel){
    const p = document.getElementById('merma-prod');
    if(p && [...p.options].some(o => o.value === sel)){ p.value = sel; mermaActualizar(); const q = document.getElementById('merma-qty'); if(q) q.focus(); }
  }
}
function mermaLeer(){
  const v = (document.getElementById('merma-prod')||{}).value || '';
  const [tipo, idStr] = v.split(':');
  const id = idStr ? Number(idStr) : null;
  const qty = parseFloat((document.getElementById('merma-qty')||{}).value);
  const r = document.querySelector('input[name="merma-motivo"]:checked');
  const motivo = r ? r.value : '';
  const otro = ((document.getElementById('merma-otro')||{}).value || '').trim();
  const item = !id ? null : (tipo === 'ing' ? getIngredient(id) : getElaboracion(id));
  return {tipo, id, qty, motivo, otro, item};
}
function mermaActualizar(){
  const d = mermaLeer();
  const otro = document.getElementById('merma-otro');
  if(otro) otro.style.display = d.motivo === 'otro' ? '' : 'none';
  const lab = document.getElementById('merma-qty-l');
  if(lab) lab.textContent = t('merma.qty').replace('${u}', d.item ? (d.item.unit || '—') : '—');
  const box = document.getElementById('merma-coste');
  if(!box) return;
  if(d.item && d.qty > 0){
    const cu = mermaCosteUnidad(d.tipo, d.id);
    box.innerHTML = `<strong style="color:var(--text)">${escapeHtml(t('merma.cost').replace('${v}', cu ? fmtMoney(cu * d.qty) : t('merma.noPrice')))}</strong> · ${escapeHtml(t('merma.stockNote'))}`;
  } else {
    box.textContent = t('merma.stockNote');
  }
}
function guardarMerma(){
  const d = mermaLeer();
  // Nada se rechaza en silencio: cada dato que falta dice cuál es.
  if(!d.item){ showToast(t('merma.needProduct')); return; }
  if(!(d.qty > 0)){ showToast(t('merma.needQty')); return; }
  if(!d.motivo || (d.motivo === 'otro' && !d.otro)){ showToast(t('merma.needReason')); return; }
  const cu = mermaCosteUnidad(d.tipo, d.id);
  const coste = Math.round(cu * d.qty * 100) / 100;
  if(!DB.mermas) DB.mermas = [];
  DB.mermas.push({
    id: genId(), fecha: todayStr(), hora: new Date().toTimeString().slice(0,5), createdAt: new Date().toISOString(),
    area: currentArea(), tipo: d.tipo, refId: d.id, name: d.item.name, unit: d.item.unit || '',
    qty: d.qty, motivo: d.motivo, motivoOtro: d.motivo === 'otro' ? d.otro : '', coste,
    actor: (typeof currentActorName === 'function') ? currentActorName() : ''
  });
  // Lo tirado sale del stock. Nunca por debajo de cero: si el stock ya
  // estaba mal contado, la merma se anota igual y el recuento lo corregirá.
  if(d.tipo === 'ing'){
    const s = getStockEntry(d.id);
    const before = s.qty || 0, after = Math.max(0, Math.round((before - d.qty) * 1000) / 1000);
    if(after !== before){ s.qty = after; logStockAdjustment('ing', d.id, d.item.name, before, after, 'merma'); }
  } else {
    const before = d.item.qty || 0, after = Math.max(0, Math.round((before - d.qty) * 1000) / 1000);
    if(after !== before){ d.item.qty = after; logStockAdjustment('elab', d.id, d.item.name, before, after, 'merma'); }
  }
  saveDB();
  closeModal();
  showToast(t('merma.saved').replace('${v}', coste ? fmtMoney(coste) : d.item.name));
  if(typeof renderStock === 'function') withScrollPreserved(() => renderStock());
}
function mermaLunes(fecha){
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dateStr(d);
}
function openMermasInformeModal(){
  const area = currentArea();
  const lista = (DB.mermas||[]).filter(m => (m.area||'cocina') === area);
  const hoy = todayStr();
  const lunes = mermaLunes(hoy);
  const lunesPasado = dateStr(new Date(new Date(lunes + 'T12:00:00').getTime() - 7*86400000));
  const mes = hoy.slice(0,7);
  const hace28 = dateStr(new Date(Date.now() - 27*86400000));
  const suma = arr => arr.reduce((s,m) => s + (m.coste||0), 0);
  const semana = suma(lista.filter(m => m.fecha >= lunes));
  const pasada = suma(lista.filter(m => m.fecha >= lunesPasado && m.fecha < lunes));
  const delMes = lista.filter(m => (m.fecha||'').slice(0,7) === mes);
  const ritmoAnual = suma(lista.filter(m => m.fecha >= hace28)) * 13;
  const agrupa = (arr, clave, nombre) => {
    const g = {};
    arr.forEach(m => { const k = clave(m); (g[k] = g[k] || {n: nombre(m), coste: 0, qty: 0, unit: m.unit, veces: 0}); g[k].coste += m.coste||0; g[k].qty += m.qty||0; g[k].veces++; });
    return Object.values(g).sort((a,b) => b.coste - a.coste || b.veces - a.veces);
  };
  const top = agrupa(delMes, m => m.tipo + ':' + m.refId, m => m.name).slice(0, 8);
  const porMotivo = agrupa(delMes, m => m.motivo === 'otro' ? 'otro:' + (m.motivoOtro||'').toLowerCase() : m.motivo, mermaMotivoLabel);
  const ultimas = [...lista].sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')).slice(0, 30);
  const flecha = pasada > 0 ? (semana <= pasada ? 'var(--green)' : 'var(--red)') : 'var(--muted)';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-trash-x"></i> ${t('merma.reportTitle')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    ${lista.length ? `
    <div class="st-resumen st-resumen-modal">
      <div class="st-cel"><span class="st-cel-et">${t('merma.thisWeek')}</span><span class="st-cel-v" style="color:${flecha}">${fmtMoney(semana)}</span></div>
      <div class="st-cel"><span class="st-cel-et">${t('merma.lastWeek')}</span><span class="st-cel-v">${fmtMoney(pasada)}</span></div>
      <div class="st-cel"><span class="st-cel-et">${t('merma.thisMonth')}</span><span class="st-cel-v">${fmtMoney(suma(delMes))}</span></div>
      <div class="st-cel"><span class="st-cel-et">${t('merma.yearPace')}</span><span class="st-cel-v">${fmtMoney(ritmoAnual)}</span></div>
    </div>
    <div class="es-tit">${t('merma.topProducts')}</div>
    ${top.length ? `<div class="table-wrap"><table class="table-cards"><thead><tr><th>${t('merma.product')}</th><th>${t('merma.qtyShort')}</th><th>${t('merma.times')}</th><th>${t('label.total')}</th></tr></thead>
      <tbody>${top.map(g => `<tr><td data-label="${t('merma.product')}">${escapeHtml(g.n)}</td><td data-label="${t('merma.qtyShort')}">${fmtNum(g.qty)} ${escapeHtml(g.unit||'')}</td><td data-label="${t('merma.times')}">${g.veces}</td><td data-label="${t('label.total')}" style="font-weight:700">${fmtMoney(g.coste)}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty" style="padding:10px">${t('merma.noneMonth')}</div>`}
    ${porMotivo.length ? `<div class="es-tit es-tit-2">${t('merma.byReason')}</div>
    <div class="table-wrap"><table class="table-cards"><thead><tr><th>${t('merma.reason')}</th><th>${t('merma.times')}</th><th>${t('label.total')}</th></tr></thead>
      <tbody>${porMotivo.map(g => `<tr><td data-label="${t('merma.reason')}">${escapeHtml(g.n)}</td><td data-label="${t('merma.times')}">${g.veces}</td><td data-label="${t('label.total')}" style="font-weight:700">${fmtMoney(g.coste)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <div class="es-tit es-tit-2">${t('merma.recent')}</div>
    <div class="table-wrap"><table class="table-cards"><thead><tr><th>${t('common.date')}</th><th>${t('merma.product')}</th><th>${t('merma.qtyShort')}</th><th>${t('merma.reason')}</th><th>${t('label.total')}</th><th>${t('common.responsible')}</th></tr></thead>
      <tbody>${ultimas.map(m => `<tr><td data-label="${t('common.date')}">${escapeHtml(m.fecha)} ${escapeHtml(m.hora||'')}</td><td data-label="${t('merma.product')}">${escapeHtml(m.name)}</td><td data-label="${t('merma.qtyShort')}">${fmtNum(m.qty)} ${escapeHtml(m.unit||'')}</td><td data-label="${t('merma.reason')}">${escapeHtml(mermaMotivoLabel(m))}</td><td data-label="${t('label.total')}">${m.coste ? fmtMoney(m.coste) : '—'}</td><td data-label="${t('common.responsible')}">${escapeHtml(m.actor||'—')}</td></tr>`).join('')}</tbody></table></div>
    ` : `<div class="empty"><i class="ti ti-trash-x"></i>${t('merma.none')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
      <button class="btn btn-primary" onclick="openMermaModal()"><i class="ti ti-plus"></i> ${t('merma.btn')}</button>
    </div>
  `, {xl: true});
}

// Cantidad "Actual" editable directamente en la propia fila, sin pasar por
// un modal — antes hacía falta abrir un modal aparte solo para escribir un
// número. Sigue quedando registrado en el Historial igual que antes.
// A diferencia de updateStockMin (el mínimo es una decisión de gestión),
// contar y corregir la cantidad REAL es tarea del día a día de cualquier
// empleado — cualquiera con acceso a Stock puede tocar esto, tenga o no
// permiso de edición.
function updateStockQty(ingredientId, value){
  const s = getStockEntry(ingredientId);
  const num = parseFloat(value);
  if(isNaN(num) || num < 0) return;
  const before = s.qty||0;
  if(before === num) return;
  s.qty = num;
  const ing = getIngredient(ingredientId);
  logStockAdjustment('ing', ingredientId, ing?ing.name:'', before, num);
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderStock());
}

/* ============== Elaboraciones propias (caldos, salsas, etc.) ============== */
function getElaboracion(id){ return (DB.elaboraciones||[]).find(e => e.id === id); }

function openElaboracionModal(id){
  const e = id ? getElaboracion(id) : {id:null, name:'', unit:'L', qty:0, min:0, category:''};
  const catOptions = `<option value="">${t('label.noCategory')}</option>` +
    areaRecipeCategories().map(c => { const name = typeof c === 'object' ? c.name : c; return `<option value="${escapeHtml(name)}" ${e.category===name?'selected':''}>${escapeHtml(name)}</option>`; }).join('');
  openModal(`
    <div class="modal-header">
      <h3>${id ? t('title.editElaboration') : t('title.newElaboration')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="field">
      <label>${t('common.name')}</label>
      <input type="text" id="elab-name" value="${escapeHtml(e.name)}" placeholder="${t('ph.elaborationName')}">
    </div>
    <div class="field">
      <label>${t('common.category')}</label>
      <select id="elab-category">${catOptions}</select>
    </div>
    <div class="field-row">
      <div class="field">
        <label>${t('common.unit')}</label>
        <select id="elab-unit">
          ${['L','ml','kg','g','ud'].map(u => `<option value="${u}"${u===e.unit?' selected':''}>${u}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>${t('label.stockQty')}</label>
        <input type="number" id="elab-qty" value="${e.qty||0}" step="0.01" min="0">
      </div>
      <div class="field">
        <label>${t('label.minStock')}</label>
        <input type="number" id="elab-min" value="${e.min||0}" step="0.01" min="0">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="saveElaboracion(${id||'null'})">${t('common.save')}</button>
    </div>
  `);
}

async function saveElaboracion(id){
  if(!isOwnerSession() && !editUnlocked) return;
  const name = document.getElementById('elab-name').value.trim();
  if(!name){ showToast(t('msg.nameRequired')); return; }
  const category = document.getElementById('elab-category').value;
  const unit = document.getElementById('elab-unit').value;
  const qty = parseFloat(document.getElementById('elab-qty').value) || 0;
  const min = parseFloat(document.getElementById('elab-min').value) || 0;
  if(qty < 0 || min < 0){ showToast(t('msg.invalidPrice')); return; }
  // Igual que con ingredientes/recetas/proveedores: avisa de un posible
  // duplicado (mismo nombre, misma área) en vez de dejarlo pasar en
  // silencio — antes no había ningún aviso al crear una elaboración.
  const dupe = (DB.elaboraciones||[]).find(x => x.id !== id && (x.area||'cocina')===currentArea() && x.name.trim().toLowerCase() === name.toLowerCase());
  if(dupe && !(await confirmModal(t('msg.confirmDuplicateElaboration').replace('${name}', dupe.name)))) return;
  if(id){
    Object.assign(getElaboracion(id), {name, category, unit, qty, min});
  } else {
    if(!DB.elaboraciones) DB.elaboraciones = [];
    DB.elaboraciones.push({id: genId(), name, category, unit, qty, min, area: currentArea()});
  }
  saveDB();
  closeModal();
  renderStock();
  showToast(t('msg.elaborationSaved'));
}

// Antes se borraba con un simple confirm() del navegador y sin pasar por la
// papelera — al contrario que un ingrediente, que exige el PIN de negocio y
// se puede recuperar. Una elaboración también tiene su stock y su mínimo
// configurados: perderla de un clic de más era demasiado fácil.
function deleteElaboracion(id){
  requestBusinessPinAction(t('title.deleteElaboration'), t('msg.confirmDeleteElaboration'), (pin) => reallyDeleteElaboracion(id, pin));
}
function reallyDeleteElaboracion(id, pin){
  if(!accionSensibleAutorizada(pin)) return;
  const e = getElaboracion(id);
  if(!e) return;
  moveToTrash('elaboracion', e);
  logAudit('delete', t('audit.deletedElaboration').replace('${name}', e.name), 'critical');
  DB.elaboraciones = (DB.elaboraciones||[]).filter(x => x.id !== id);
  saveDB();
  closeModal();
  renderStock();
  showToast(t('msg.elaborationDeleted'));
}

function updateElaboracionMin(id, value){
  if(!isOwnerSession() && !editUnlocked) return;
  const e = getElaboracion(id); if(!e) return;
  e.min = parseFloat(value) || 0;
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderStock());
}

// Mismo criterio que updateStockQty: contar la cantidad real es tarea de
// cualquier empleado, no solo de quien tiene permiso de editar.
function updateElaboracionQty(id, value){
  const e = getElaboracion(id); if(!e) return;
  const num = parseFloat(value);
  if(isNaN(num) || num < 0) return;
  const before = e.qty||0;
  if(before === num) return;
  e.qty = num;
  logStockAdjustment('elab', id, e.name, before, num);
  saveDB();
  // Conserva la posición de la pantalla: sin esto, escribir un valor en
  // una lista larga repintaba la vista entera y te devolvía arriba del
  // todo, obligando a bajar otra vez tras CADA dato introducido.
  withScrollPreserved(() => renderStock());
}
