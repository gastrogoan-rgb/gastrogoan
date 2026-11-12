/* ═══════════════════════════════════════════════════════════════════════════════════════════════════
   PANEL DE CONTROL v2 (8/11) — lo que ve el dueño para tener los números claros.
   Orden pedido por el dueño: punto de equilibrio destacado arriba → atención → reservas → ventas → gastos → resultado
   (cada uno con la cifra de HOY y una gráfica de la semana o del mes que se puede recorrer) → evolución del año →
   análisis de ventas con sus picos → clientela → análisis de platos.
   Todo se lee de los datos de siempre (ventas, gastos, reservas, clientes) con las MISMAS funciones que usan Gestión
   Económica y la Cuenta de Resultados: aquí no hay una segunda contabilidad, solo otra forma de mirarla.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════ */

const DP = {
  bloques: {},          // reservas | ventas | gastos | resultado → {modo:'semana'|'mes', ref:Date, anio, mes}
  analisis: null,       // {anio, mes}
  clientela: null,      // {anio, mes}
};
const DP_BLOQUES = ['reservas', 'ventas', 'gastos', 'resultado'];

function dpInicializar(){
  const h = new Date();
  DP_BLOQUES.forEach(k => { if(!DP.bloques[k]) DP.bloques[k] = {modo: 'semana', ref: new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12), anio: h.getFullYear(), mes: h.getMonth()}; });
  if(!DP.analisis) DP.analisis = {anio: h.getFullYear(), mes: h.getMonth()};
  if(!DP.clientela) DP.clientela = {anio: h.getFullYear(), mes: h.getMonth()};
}
const dpFecha = d => dateStr(d);
// Decimales con la coma del idioma activo (nunca «58.5 %» con la app en castellano).
const dpNum = (v, dec) => (Math.round((parseFloat(v) || 0) * Math.pow(10, dec == null ? 1 : dec)) / Math.pow(10, dec == null ? 1 : dec)).toLocaleString(localeActual(), {minimumFractionDigits: 0, maximumFractionDigits: dec == null ? 1 : dec});
const dpMes2 = n => String(n + 1).padStart(2, '0');
const dpEstadosReserva = ['confirmada', 'pendiente', 'completada'];

// ── Datos por día ───────────────────────────────────────────────────────────────────────────────────
function dpReservasDia(ds){
  const rs = (DB.reservations || []).filter(r => r.date === ds && dpEstadosReserva.includes(r.status));
  return {n: rs.length, covers: rs.reduce((s, r) => s + (r.people || 0), 0)};
}
function dpVentasDia(ds){ return salesTotalForDate(ds); }
// Ventas SIN IVA de un día: el IVA de cada línea (el suyo, o el de por defecto) y el descuento de la venta ya aplicados.
function dpNetoDia(ds){
  let neto = 0;
  activeSales().filter(s => s.date === ds).forEach(s => {
    const desc = parseFloat(s.descuentoPct) || 0;
    (s.items || []).forEach(l => {
      const bruto = (parseFloat(l.price) || 0) * (parseFloat(l.qty) || 0) * (1 - desc / 100);
      const rate = l.ivaPct != null ? parseFloat(l.ivaPct) : parseFloat(ivaPorDefectoDe(l));
      neto += bruto / (1 + (isFinite(rate) ? rate : 0) / 100);
    });
  });
  return neto;
}
function dpGastosDia(ds){ return geGastosTotalForRange(ds, ds); }
function dpResultadoDia(ds){ return dpNetoDia(ds) - dpGastosDia(ds); }

// ── Periodo de un bloque (semana natural lunes-domingo, o mes) ─────────────────────────────────────
function dpRango(st){
  let desde, hasta, pDesde, pHasta;
  if(st.modo === 'semana'){
    const ref = new Date(st.ref); const dow = (ref.getDay() + 6) % 7;
    desde = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dow, 12);
    hasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 6, 12);
    pDesde = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() - 7, 12);
    pHasta = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() - 1, 12);
  }else{
    desde = new Date(st.anio, st.mes, 1, 12); hasta = new Date(st.anio, st.mes + 1, 0, 12);
    pDesde = new Date(st.anio, st.mes - 1, 1, 12); pHasta = new Date(st.anio, st.mes, 0, 12);
  }
  const lista = (a, b) => { const out = []; for(let d = new Date(a); d <= b; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12)) out.push(new Date(d)); return out; };
  const loc = localeActual();
  const corto = d => d.toLocaleDateString(loc, {day: 'numeric', month: 'short'}).replace('.', '');
  const etiqueta = st.modo === 'semana'
    ? corto(desde) + ' – ' + corto(hasta) + (desde.getFullYear() !== new Date().getFullYear() ? ' ' + desde.getFullYear() : '')
    : monthFull(st.mes) + ' ' + st.anio;
  return {desde, hasta, dias: lista(desde, hasta), prev: lista(pDesde, pHasta), etiqueta};
}
function dpEsHoy(d){ return dpFecha(d) === todayStr(); }

// ── Definición de cada bloque ───────────────────────────────────────────────────────────────────────
const DP_DEF = {
  reservas: {icono: 'ti-calendar-event', futuro: true, subeEsBueno: true,
    tit: () => gl({es: 'Reservas', ca: 'Reserves', en: 'Bookings'}),
    valor: ds => dpReservasDia(ds).covers,
    txt: ds => { const r = dpReservasDia(ds); return r.covers + ' ' + gl({es: 'comensales', ca: 'comensals', en: 'guests'}) + ' · ' + r.n + ' ' + gl({es: 'reservas', ca: 'reserves', en: 'bookings'}); },
    fmt: v => String(Math.round(v)), unidad: () => gl({es: 'comensales', ca: 'comensals', en: 'guests'})},
  ventas: {icono: 'ti-cash', subeEsBueno: true,
    tit: () => gl({es: 'Ventas', ca: 'Vendes', en: 'Sales'}), valor: dpVentasDia, fmt: fmtMoney},
  gastos: {icono: 'ti-receipt-2', subeEsBueno: false,
    tit: () => gl({es: 'Gastos', ca: 'Despeses', en: 'Expenses'}), valor: dpGastosDia, fmt: fmtMoney},
  resultado: {icono: 'ti-scale', subeEsBueno: true,
    tit: () => gl({es: 'Resultado', ca: 'Resultat', en: 'Result'}), valor: dpResultadoDia, fmt: fmtMoney},
};

function dpSerie(k, rango){
  const def = DP_DEF[k], hoy = todayStr(), loc = localeActual();
  const semana = DP.bloques[k].modo === 'semana';
  return rango.dias.filter(d => def.futuro || dpFecha(d) <= hoy).map(d => {
    const ds = dpFecha(d), v = def.valor(ds);
    return {
      label: semana ? weekDayShort((d.getDay() + 6) % 7) + ' ' + d.getDate() : String(d.getDate()),
      nombre: d.toLocaleDateString(loc, {weekday: 'long', day: 'numeric', month: 'long'}),
      value: v, txt: def.txt ? def.txt(ds) : def.fmt(v), parcial: ds === hoy,
    };
  });
}
// Cuántas ventas y reservas hay en cada mes, para el selector (las cifras del desplegable de meses).
function dpDatosMeses(){
  const m = {};
  (DB.sales || []).forEach(s => { const k = (s.date || '').slice(0, 7); if(k) m[k] = (m[k] || 0) + 1; });
  return m;
}
function dpDatosMesesReservas(){
  const m = {};
  (DB.reservations || []).forEach(r => { const k = (r.date || '').slice(0, 7); if(k) m[k] = (m[k] || 0) + 1; });
  return m;
}
function dpDelta(actual, previo, subeEsBueno){
  if(!(previo > 0) && !(previo < 0)) return '';
  const pct = (actual - previo) / Math.abs(previo) * 100;
  if(!isFinite(pct)) return '';
  const igual = Math.abs(pct) < 0.5, bueno = subeEsBueno ? pct >= 0 : pct <= 0;
  return `<span class="dt-delta ${igual ? 'igual' : (bueno ? 'bien' : 'mal')}"><i class="ti ${igual ? 'ti-minus' : (pct >= 0 ? 'ti-arrow-up-right' : 'ti-arrow-down-right')}"></i> ${igual ? '0' : (pct >= 0 ? '+' : '') + dpNum(pct, 1)} %</span>`;
}
function dpBadge(delta, etiqueta){
  if(delta === null || delta === undefined) return `<span class="badge badge-gray">${etiqueta}: —</span>`;
  const cls = delta >= 0 ? 'badge-green' : 'badge-red';
  return `<span class="badge ${cls}"><i class="ti ${delta >= 0 ? 'ti-arrow-up' : 'ti-arrow-down'}"></i> ${delta >= 0 ? '+' : ''}${dpNum(delta, 1)} % ${etiqueta}</span>`;
}

// ── Lo de HOY de cada bloque (la cifra grande y sus acompañantes) ─────────────────────────────────
function dpHoyHtml(k){
  const hoy = todayStr(), ayer = dateStr(new Date(Date.now() - 86400000)), semPas = dateStr(new Date(Date.now() - 7 * 86400000));
  const kpi = (et, val, extra) => `<div class="dp-k"><div class="dp-k-et">${et}</div><div class="dp-k-v">${val}</div>${extra ? `<div class="dp-k-s">${extra}</div>` : ''}</div>`;
  if(k === 'reservas'){
    const rs = (DB.reservations || []).filter(r => r.date === hoy && dpEstadosReserva.includes(r.status));
    const covers = rs.reduce((s, r) => s + (r.people || 0), 0);
    const llegados = rs.filter(r => r.llegada || r.status === 'completada').length;
    const porConfirmar = (DB.reservations || []).filter(r => r.date === hoy && r.status === 'pendiente').length;
    const man = dpReservasDia(dateStr(new Date(Date.now() + 86400000)));
    return `<div class="dp-k-fila">
      ${kpi(gl({es: 'Reservas hoy', ca: 'Reserves avui', en: 'Bookings today'}), rs.length, man.n ? gl({es: 'Mañana: ' + man.n + ' · ' + man.covers + ' comensales', ca: 'Demà: ' + man.n + ' · ' + man.covers + ' comensals', en: 'Tomorrow: ' + man.n + ' · ' + man.covers + ' guests'}) : gl({es: 'Mañana: ninguna', ca: 'Demà: cap', en: 'Tomorrow: none'}))}
      ${kpi(gl({es: 'Comensales', ca: 'Comensals', en: 'Guests'}), covers, '')}
      ${kpi(gl({es: 'Han llegado', ca: 'Han arribat', en: 'Arrived'}), llegados + ' / ' + rs.length, '')}
      ${kpi(gl({es: 'Por confirmar', ca: 'Per confirmar', en: 'To confirm'}), `<span class="${porConfirmar ? 'dp-avis' : ''}">${porConfirmar}</span>`, '')}
    </div>`;
  }
  if(k === 'ventas'){
    const hoyT = salesTotalForDate(hoy), ventas = activeSales().filter(s => s.date === hoy), n = ventas.length;
    const dl = c => { const v = salesTotalForDate(c); return v > 0 ? (hoyT - v) / v * 100 : (hoyT > 0 ? null : 0); };
    return `<div class="dp-k-fila">
      ${kpi(gl({es: 'Ventas de hoy', ca: 'Vendes d\'avui', en: 'Today\'s sales'}), fmtMoney(hoyT), `${dpBadge(dl(ayer), gl({es: 'vs ayer', ca: 'vs ahir', en: 'vs yesterday'}))} ${dpBadge(dl(semPas), gl({es: 'vs sem. pasada', ca: 'vs set. passada', en: 'vs last week'}))}`)}
      ${kpi(gl({es: 'Tickets', ca: 'Tiquets', en: 'Tickets'}), n, '')}
      ${kpi(gl({es: 'Ticket medio', ca: 'Tiquet mitjà', en: 'Average ticket'}), fmtMoney(n ? hoyT / n : 0), '')}
    </div>`;
  }
  if(k === 'gastos'){
    const total = geGastosTotalForRange(hoy, hoy), compras = geVariablesTotalForRange(hoy, hoy), fijos = geFijosForRange(hoy, hoy);
    const ayerT = geGastosTotalForRange(ayer, ayer);
    return `<div class="dp-k-fila">
      ${kpi(gl({es: 'Gastos de hoy', ca: 'Despeses d\'avui', en: 'Today\'s expenses'}), fmtMoney(total), `${dpDelta(total, ayerT, false)} ${gl({es: 'vs ayer', ca: 'vs ahir', en: 'vs yesterday'})}`)}
      ${kpi(gl({es: 'Compras del día', ca: 'Compres del dia', en: 'Purchases today'}), fmtMoney(compras), gl({es: 'sin IVA', ca: 'sense IVA', en: 'excl. VAT'}))}
      ${kpi(gl({es: 'Fijos del día', ca: 'Fixos del dia', en: 'Fixed per day'}), fmtMoney(fijos), gl({es: 'parte diaria de personal y gastos fijos', ca: 'part diària de personal i despeses fixes', en: 'daily share of staff and fixed costs'}))}
    </div>`;
  }
  // resultado
  const neto = dpNetoDia(hoy), gas = dpGastosDia(hoy), res = neto - gas;
  return `<div class="dp-k-fila">
    ${kpi(gl({es: 'Resultado de hoy', ca: 'Resultat d\'avui', en: 'Today\'s result'}), `<span class="${res >= 0 ? 'dp-ok' : 'dp-mal'}">${fmtMoney(res)}</span>`, neto > 0 ? gl({es: 'Margen ', ca: 'Marge ', en: 'Margin '}) + dpNum(res / neto * 100, 1) + ' %' : '')}
    ${kpi(gl({es: 'Ventas sin IVA', ca: 'Vendes sense IVA', en: 'Sales excl. VAT'}), fmtMoney(neto), '')}
    ${kpi(gl({es: 'Gastos del día', ca: 'Despeses del dia', en: 'Day expenses'}), fmtMoney(gas), '')}
  </div>`;
}

// ── Un bloque entero: cabecera con selector, cifras de hoy, resumen del periodo y gráfica ─────────────────────
function dpBloqueHtml(k){
  dpInicializar();
  const def = DP_DEF[k], st = DP.bloques[k], r = dpRango(st);
  const serie = dpSerie(k, r);
  const esCero = !serie.some(p => p.value !== 0);
  const total = serie.reduce((s, p) => s + p.value, 0);
  const previo = r.prev.reduce((s, d) => s + def.valor(dpFecha(d)), 0);
  const conDatos = serie.filter(p => p.value !== 0);
  const mejor = serie.length ? serie.reduce((m, p) => (def.subeEsBueno === false ? p.value > m.value : p.value > m.value) ? p : m, serie[0]) : null;
  const dias = serie.length || 1;
  const modoBtn = (m, et) => `<button type="button" class="btn btn-sm btn-fino${st.modo === m ? ' is-on' : ''}" aria-pressed="${st.modo === m}" onclick="dpModo('${k}','${m}')">${et}</button>`;
  const nav = st.modo === 'semana'
    ? `<div class="pe-sel dp-semnav"><button type="button" class="btn btn-fino pe-flecha" aria-label="${escapeHtml(gl({es: 'Semana anterior', ca: 'Setmana anterior', en: 'Previous week'}))}" onclick="dpSemana('${k}',-1)"><i class="ti ti-chevron-left"></i></button><span class="pe-actual dp-semetq"><i class="ti ti-calendar-week"></i> ${escapeHtml(r.etiqueta)}</span><button type="button" class="btn btn-fino pe-flecha" aria-label="${escapeHtml(gl({es: 'Semana siguiente', ca: 'Setmana següent', en: 'Next week'}))}" onclick="dpSemana('${k}',1)"><i class="ti ti-chevron-right"></i></button></div>`
    : ggPeriodoHtml({anio: st.anio, mes: st.mes, cb: 'panelMesCb_' + k, datos: k === 'reservas' ? dpDatosMesesReservas() : dpDatosMeses(), anual: false});
  const periodoActual = r.dias.some(dpEsHoy);
  const unidad = def.unidad ? def.unidad() : '';
  const fmtV = v => def.fmt(v) + (unidad && k === 'reservas' ? '' : '');
  const gid = 'dp-g-' + k;
  dashSerieRegistrar(gid, serie);
  const etiPeriodo = st.modo === 'semana' ? gl({es: 'de la semana', ca: 'de la setmana', en: 'this week'}) : gl({es: 'del mes', ca: 'del mes', en: 'this month'});
  return `
    <div class="dp-cab">
      <div class="dp-ctl">
        <div class="dp-modo" role="group" aria-label="${escapeHtml(gl({es: 'Periodo', ca: 'Període', en: 'Period'}))}">${modoBtn('semana', gl({es: 'Semana', ca: 'Setmana', en: 'Week'}))}${modoBtn('mes', gl({es: 'Mes', ca: 'Mes', en: 'Month'}))}</div>
        ${nav}
        ${periodoActual ? '' : `<button type="button" class="btn btn-sm btn-fino" onclick="dpHoy('${k}')"><i class="ti ti-calendar-event"></i> ${escapeHtml(gl({es: 'Hoy', ca: 'Avui', en: 'Today'}))}</button>`}
      </div>
    </div>
    ${dpHoyHtml(k)}
    ${esCero ? `<div class="empty es-vacio dp-vacio"><i class="ti ${def.icono}"></i>${escapeHtml(gl({es: 'Nada registrado en este periodo.', ca: 'Res registrat en aquest període.', en: 'Nothing recorded in this period.'}))}</div>` : `
    <div class="dt-cab dp-resumen">
      <div class="dt-titular" data-dt-titular="${gid}"><b>${escapeHtml(k === 'reservas' ? total + ' ' + unidad : fmtV(total))}</b> <span>${escapeHtml(gl({es: 'total ', ca: 'total ', en: 'total '}) + (st.modo === 'semana' ? r.etiqueta : r.etiqueta))}</span></div>
      ${dpDelta(total, previo, def.subeEsBueno)}
    </div>
    <div class="dp-medias">
      <span><i class="ti ti-sum"></i> ${escapeHtml(gl({es: 'Media por día', ca: 'Mitjana per dia', en: 'Daily average'}))}: <b>${escapeHtml(k === 'reservas' ? dpNum(total / dias, 1) + ' ' + unidad : fmtV(total / dias))}</b></span>
      ${mejor && mejor.value !== 0 ? `<span><i class="ti ${def.subeEsBueno === false ? 'ti-flame' : 'ti-trophy'}"></i> ${escapeHtml(def.subeEsBueno === false ? gl({es: 'Día de más gasto', ca: 'Dia de més despesa', en: 'Highest-spend day'}) : gl({es: 'Mejor día', ca: 'Millor dia', en: 'Best day'}))}: <b>${escapeHtml(mejor.nombre)} · ${escapeHtml(mejor.txt)}</b></span>` : ''}
      <span class="dp-pista"><i class="ti ti-pointer"></i> ${escapeHtml(gl({es: 'Pasa el ratón (o toca) un punto para ver ese día', ca: 'Passa el ratolí (o toca) un punt per veure aquell dia', en: 'Hover (or tap) a point to see that day'}))}</span>
    </div>
    ${dashSerieHtml(serie, {id: gid, tooltip: true, cadaEtiqueta: st.modo === 'mes' ? (serie.length > 20 ? 3 : 2) : 1, fmtTag: k === 'reservas' ? (v => String(Math.round(v))) : undefined})}`}
    ${k === 'resultado' ? dpPyLHtml(st, r) : ''}
    <div class="dp-nota txt-xs">${escapeHtml(dpNotaBloque(k, etiPeriodo))}</div>`;
}
function dpNotaBloque(k, etiPeriodo){
  if(k === 'reservas') return gl({es: 'Comensales de reservas confirmadas, pendientes y ya sentadas. Los días que aún no han llegado también cuentan: así ves cómo viene la semana.', ca: 'Comensals de reserves confirmades, pendents i ja assegudes. Els dies que encara no han arribat també compten: així veus com ve la setmana.', en: 'Guests from confirmed, pending and already seated bookings. Future days count too, so you can see how the week is shaping up.'});
  if(k === 'ventas') return gl({es: 'Ventas con IVA, como entran en caja. El día de hoy va punteado: aún no ha acabado.', ca: 'Vendes amb IVA, com entren a caixa. El dia d\'avui va puntejat: encara no ha acabat.', en: 'Sales including VAT, as they hit the till. Today is dashed: it is not over yet.'});
  if(k === 'gastos') return gl({es: 'Compras y gastos del día sin IVA, más la parte diaria de personal y gastos fijos (el mes entero entre sus días).', ca: 'Compres i despeses del dia sense IVA, més la part diària de personal i despeses fixes (el mes sencer entre els seus dies).', en: 'Day purchases and expenses excluding VAT, plus the daily share of staff and fixed costs (the whole month spread over its days).'});
  return gl({es: 'Cada día = ventas sin IVA − gastos del día (compras + la parte diaria de personal y fijos). El resultado oficial del mes es el de la Cuenta de Resultados, que se ve debajo.', ca: 'Cada dia = vendes sense IVA − despeses del dia (compres + la part diària de personal i fixos). El resultat oficial del mes és el del Compte de Resultats, que es veu a sota.', en: 'Each day = sales excl. VAT − day expenses (purchases + the daily share of staff and fixed costs). The official monthly result is the Income Statement\'s, shown below.'});
}
// El resultado del mes tal como lo da la Cuenta de Resultados (única fuente de verdad), con sus ratios.
function dpPyLHtml(st, r){
  const ref = st.modo === 'mes' ? new Date(st.anio, st.mes, 1, 12) : new Date(r.hasta);
  const y = ref.getFullYear(), m = ref.getMonth();
  const fact = salesTotalForMonth(y, m), vars = geTotalVariablesNetoMes(y, m), fij = geTotalFijosNetoForMonth(y, m), res = geResultadoAntesImpMes(y, m);
  const neta = geFacturacionNetaMes(y, m), personal = geTotalPersonalNetoForMonth(y, m);
  const margen = neta > 0 ? res / neta * 100 : null, staff = neta > 0 ? personal / neta * 100 : null;
  const fc = dpFoodCostMes(y, m), objFc = geFoodCostObjPct();
  const pill = (et, val, clase) => `<div class="dp-pyl-i"><span>${et}</span><b class="${clase || ''}">${val}</b></div>`;
  return `<div class="dp-pyl">
    <div class="dp-pyl-tit"><i class="ti ti-chart-bar"></i> ${escapeHtml(gl({es: 'Resultado del mes (cuenta de resultados)', ca: 'Resultat del mes (compte de resultats)', en: 'Monthly result (income statement)'}))} · ${escapeHtml(monthFull(m))} ${y}</div>
    <div class="dp-pyl-fila">
      ${pill(gl({es: 'Facturación', ca: 'Facturació', en: 'Revenue'}), fmtMoney(fact))}
      ${pill(gl({es: 'Compras y variables', ca: 'Compres i variables', en: 'Variable costs'}), fmtMoney(vars))}
      ${pill(gl({es: 'Personal y fijos', ca: 'Personal i fixos', en: 'Staff and fixed'}), fmtMoney(fij))}
      ${pill(gl({es: 'Resultado', ca: 'Resultat', en: 'Result'}), fmtMoney(res), res >= 0 ? 'dp-ok' : 'dp-mal')}
    </div>
    <div class="dp-pyl-fila dp-pyl-ratios">
      ${pill(gl({es: 'Margen', ca: 'Marge', en: 'Margin'}), margen == null ? '—' : dpNum(margen, 1) + ' %', margen != null && margen >= 0 ? 'dp-ok' : 'dp-mal')}
      ${pill(gl({es: 'Food cost', ca: 'Food cost', en: 'Food cost'}) + ' (' + gl({es: 'objetivo', ca: 'objectiu', en: 'target'}) + ' ' + objFc + ' %)', fc == null ? '—' : dpNum(fc, 1) + ' %', fc != null && fc > objFc ? 'dp-mal' : 'dp-ok')}
      ${pill(gl({es: 'Personal', ca: 'Personal', en: 'Staff'}), staff == null || !personal ? '—' : dpNum(staff, 1) + ' %', staff != null && staff > 30 ? 'dp-mal' : 'dp-ok')}
    </div>
  </div>`;
}
// Food cost medio del mes ponderado por unidades vendidas (mismo criterio de siempre); null si no se puede calcular.
function dpFoodCostMes(y, m){
  const mesStr = y + '-' + dpMes2(m);
  const unidades = {};
  activeSales().filter(s => (s.date || '').startsWith(mesStr)).forEach(s => (s.items || []).forEach(it => { if(it.recipeId) unidades[it.recipeId] = (unidades[it.recipeId] || 0) + (it.qty || 1); }));
  const pesos = (DB.recipes || []).map(r => ({pct: recipeFoodCostPct(r), u: unidades[r.id] || 0})).filter(e => isFinite(e.pct) && e.u > 0);
  const tot = pesos.reduce((s, e) => s + e.u, 0);
  return tot > 0 ? pesos.reduce((s, e) => s + e.pct * e.u, 0) / tot : null;
}

// ── Interacción de los bloques ──────────────────────────────────────────────────────────────────────
function dpPintar(k){ const el = document.getElementById('dp-' + k); if(el) el.innerHTML = dpBloqueHtml(k); }
function dpModo(k, modo){
  dpInicializar();
  const st = DP.bloques[k];
  if(modo === 'mes'){ const r = new Date(st.ref); st.anio = r.getFullYear(); st.mes = r.getMonth(); }
  else{ const hoy = new Date(); st.ref = (st.anio === hoy.getFullYear() && st.mes === hoy.getMonth()) ? new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12) : new Date(st.anio, st.mes, 1, 12); }
  st.modo = modo; dpPintar(k);
}
function dpSemana(k, dir){ const st = DP.bloques[k]; st.ref = new Date(st.ref.getFullYear(), st.ref.getMonth(), st.ref.getDate() + 7 * dir, 12); dpPintar(k); }
function dpHoy(k){
  const st = DP.bloques[k], h = new Date();
  st.ref = new Date(h.getFullYear(), h.getMonth(), h.getDate(), 12); st.anio = h.getFullYear(); st.mes = h.getMonth(); dpPintar(k);
}
DP_BLOQUES.forEach(k => { window['panelMesCb_' + k] = (a, m) => { dpInicializar(); const st = DP.bloques[k]; st.modo = 'mes'; st.anio = a; st.mes = m == null ? st.mes : m; dpPintar(k); }; });

/* ── PUNTO DE EQUILIBRIO DEL MES, destacado arriba del todo ─────────────────────────────────────────────
   Con las cifras REALES del mes (no con un ticket y unos cubiertos escritos a mano): los costes que no dependen de lo que
   se vende (personal, gastos fijos, cuotas…) salen de la cuenta de resultados, y lo variable es el % que de verdad se lleva
   cada euro vendido. Ventas netas (sin IVA) necesarias = fijos / (1 − % variable). */
function dpEquilibrioDatos(){
  const hoy = new Date(), y = hoy.getFullYear(), m = hoy.getMonth(), dm = new Date(y, m + 1, 0).getDate(), dt = hoy.getDate();
  const S = geFacturacionNetaMes(y, m), V = geTotalVariablesNetoMes(y, m), R = geResultadoAntesImpMes(y, m);
  const F = Math.max(0, S - V - R);
  const fcObj = geFoodCostObjPct() / 100;
  const v = Math.min(0.95, S > 0 ? V / S : fcObj);
  const objetivo = F / (1 - v);
  const ritmo = S / dt, proyeccion = ritmo * dm;
  const esperado = objetivo * dt / dm;
  const falta = Math.max(0, objetivo - S);
  const diasRest = dm - dt + 1;
  const ritmoNec = falta / diasRest;
  const tickets = activeSales().filter(s => (s.date || '').startsWith(y + '-' + dpMes2(m))).length;
  const ticketNeto = tickets ? S / tickets : 0;
  // Acumulado de ventas netas día a día, para la gráfica.
  const acum = []; let ac = 0;
  for(let d = 1; d <= dt; d++){ ac += dpNetoDia(y + '-' + dpMes2(m) + '-' + String(d).padStart(2, '0')); acum.push(ac); }
  return {y, m, dm, dt, S, V, R, F, v, objetivo, ritmo, proyeccion, esperado, falta, diasRest, ritmoNec, tickets, ticketNeto, acum};
}
function dpEquilibrioHtml(){
  const D = dpEquilibrioDatos();
  const nombreMes = monthFull(D.m);
  const tit = `<div class="dp-eq-cab"><div><div class="dp-eq-sup"><i class="ti ti-scale"></i> ${escapeHtml(gl({es: 'Punto de equilibrio', ca: 'Punt d\'equilibri', en: 'Break-even'}))} · ${escapeHtml(nombreMes)}</div></div><button type="button" class="btn btn-sm btn-fino" onclick="navigate('economia'); GE.tab('pe')"><i class="ti ti-adjustments"></i> ${escapeHtml(gl({es: 'Simulador', ca: 'Simulador', en: 'Simulator'}))}</button></div>`;
  if(!(D.F > 0)){
    return `<div class="dp-eq">${tit}<p class="dp-eq-vacio">${escapeHtml(gl({es: 'Aún no hay gastos fijos, personal ni inversiones apuntados: sin ellos no se puede calcular cuánto tienes que vender para no perder dinero.', ca: 'Encara no hi ha despeses fixes, personal ni inversions apuntats: sense ells no es pot calcular quant has de vendre per no perdre diners.', en: 'There are no fixed costs, staff or investments recorded yet: without them we cannot work out how much you need to sell to avoid losing money.'}))}</p>
      <button type="button" class="btn btn-sm btn-primary" onclick="navigate('economia'); GE.tab('fijos')"><i class="ti ti-receipt-2"></i> ${escapeHtml(gl({es: 'Apuntar gastos fijos', ca: 'Apuntar despeses fixes', en: 'Add fixed costs'}))}</button></div>`;
  }
  const pct = Math.min(100, D.S / D.objetivo * 100), pctReal = D.S / D.objetivo * 100, pctEsp = Math.min(100, D.esperado / D.objetivo * 100);
  const superado = D.S >= D.objetivo, llegaras = D.proyeccion >= D.objetivo;
  const estado = superado ? 'ok' : (llegaras ? 'bien' : (D.proyeccion >= D.objetivo * 0.85 ? 'aviso' : 'mal'));
  const frase = superado
    ? gl({es: `Ya estás en beneficio: has superado el equilibrio en ${fmtMoney(D.S - D.objetivo)}.`, ca: `Ja estàs en benefici: has superat l'equilibri en ${fmtMoney(D.S - D.objetivo)}.`, en: `You are already in profit: you are ${fmtMoney(D.S - D.objetivo)} past break-even.`})
    : llegaras
      ? gl({es: `Vas a buen ritmo: a este paso cerrarás el mes en ${fmtMoney(D.proyeccion)} y el equilibrio está en ${fmtMoney(D.objetivo)}.`, ca: `Vas a bon ritme: a aquest pas tancaràs el mes en ${fmtMoney(D.proyeccion)} i l'equilibri és a ${fmtMoney(D.objetivo)}.`, en: `You are on pace: at this rate you will close the month at ${fmtMoney(D.proyeccion)} against a break-even of ${fmtMoney(D.objetivo)}.`})
      : gl({es: `Vas por debajo del ritmo: a este paso cerrarás en ${fmtMoney(D.proyeccion)} y necesitas ${fmtMoney(D.objetivo)} para no perder dinero.`, ca: `Vas per sota del ritme: a aquest pas tancaràs en ${fmtMoney(D.proyeccion)} i necessites ${fmtMoney(D.objetivo)} per no perdre diners.`, en: `You are behind pace: at this rate you will close at ${fmtMoney(D.proyeccion)} and you need ${fmtMoney(D.objetivo)} to avoid losing money.`});
  const diaEq = (D.S > 0 && !superado) ? Math.ceil(D.dt * D.objetivo / D.S) : null;
  const ticketsDia = D.ticketNeto > 0 ? Math.ceil(D.ritmoNec / D.ticketNeto) : null;
  const ticketsHoy = D.tickets && D.dt ? (D.tickets / D.dt) : 0;
  const stat = (et, val, sub, clase) => `<div class="dp-eq-st${clase ? ' ' + clase : ''}"><div class="dp-eq-st-et">${et}</div><div class="dp-eq-st-v">${val}</div>${sub ? `<div class="dp-eq-st-s">${sub}</div>` : ''}</div>`;
  return `<div class="dp-eq dp-eq-${estado}">
    ${tit}
    <div class="dp-eq-grande">
      <div class="dp-eq-num"><b>${escapeHtml(fmtMoney(D.S))}</b><span>${escapeHtml(gl({es: 'vendido sin IVA', ca: 'venut sense IVA', en: 'sold excl. VAT'}))} <i>/ ${escapeHtml(fmtMoney(D.objetivo))}</i></span></div>
      <div class="dp-eq-pct">${Math.round(pctReal)} %</div>
    </div>
    <div class="dp-eq-barra" role="img" aria-label="${escapeHtml(frase)}">
      <div class="dp-eq-rell" style="width:${pct.toFixed(1)}%"></div>
      <div class="dp-eq-marca" style="left:${pctEsp.toFixed(1)}%"><span>${escapeHtml(gl({es: 'tu ritmo ideal hoy', ca: 'el teu ritme ideal avui', en: 'ideal pace today'}))}</span></div>
    </div>
    <p class="dp-eq-frase"><i class="ti ${superado ? 'ti-circle-check' : (llegaras ? 'ti-trending-up' : 'ti-alert-triangle')}"></i> ${escapeHtml(frase)}</p>
    <div class="dp-eq-stats">
      ${stat(gl({es: 'Te faltan', ca: 'Et falten', en: 'Still needed'}), superado ? '—' : fmtMoney(D.falta), superado ? '' : gl({es: 'en ' + D.diasRest + ' días', ca: 'en ' + D.diasRest + ' dies', en: 'in ' + D.diasRest + ' days'}))}
      ${stat(gl({es: 'Ritmo necesario', ca: 'Ritme necessari', en: 'Pace needed'}), superado ? '—' : fmtMoney(D.ritmoNec) + gl({es: ' /día', ca: ' /dia', en: ' /day'}), gl({es: 'llevas ', ca: 'portes ', en: 'you do '}) + fmtMoney(D.ritmo) + gl({es: ' /día', ca: ' /dia', en: ' /day'}), (!superado && D.ritmo < D.ritmoNec) ? 'mal' : 'bien')}
      ${stat(gl({es: 'Previsión fin de mes', ca: 'Previsió fi de mes', en: 'End-of-month forecast'}), fmtMoney(D.proyeccion), gl({es: 'resultado estimado ', ca: 'resultat estimat ', en: 'estimated result '}) + fmtMoney(D.proyeccion * (1 - D.v) - D.F), llegaras ? 'bien' : 'mal')}
      ${stat(gl({es: 'Tickets al día', ca: 'Tiquets al dia', en: 'Tickets per day'}), ticketsDia != null && !superado ? ticketsDia : '—', ticketsHoy ? gl({es: 'llevas ', ca: 'portes ', en: 'you do '}) + dpNum(ticketsHoy, 1) + gl({es: ' de media', ca: ' de mitjana', en: ' on average'}) : '')}
    </div>
    ${diaEq != null ? `<p class="dp-eq-nota txt-xs"><i class="ti ti-calendar-event"></i> ${escapeHtml(diaEq <= D.dm ? gl({es: 'A este ritmo llegarás al equilibrio hacia el día ' + diaEq + '.', ca: 'A aquest ritme arribaràs a l\'equilibri cap al dia ' + diaEq + '.', en: 'At this pace you will reach break-even around day ' + diaEq + '.'}) : gl({es: 'A este ritmo no llegarás al equilibrio este mes.', ca: 'A aquest ritme no arribaràs a l\'equilibri aquest mes.', en: 'At this pace you will not reach break-even this month.'}))}</p>` : ''}
    ${dpEquilibrioGrafica(D)}
    <p class="dp-eq-nota txt-xs">${escapeHtml(gl({es: `Costes que no dependen de lo que vendes: ${fmtMoney(D.F)} al mes (personal, gastos fijos, cuotas). De cada euro vendido, ${Math.round(D.v * 100)} céntimos se van en compras y costes variables.`, ca: `Costos que no depenen del que vens: ${fmtMoney(D.F)} al mes (personal, despeses fixes, quotes). De cada euro venut, ${Math.round(D.v * 100)} cèntims se'n van en compres i costos variables.`, en: `Costs that don't depend on sales: ${fmtMoney(D.F)} a month (staff, fixed costs, instalments). Of every euro sold, ${Math.round(D.v * 100)} cents go on purchases and variable costs.`}))}</p>
  </div>`;
}
// Ventas netas acumuladas del mes frente a la recta que lleva al equilibrio (y la previsión a ritmo actual).
function dpEquilibrioGrafica(D){
  if(D.dt < 2 && D.S <= 0) return '';
  const max = Math.max(D.objetivo, D.proyeccion, D.S, 1) * 1.06;
  const X = d => (d - 1) / Math.max(1, D.dm - 1) * 100, Y = v => 100 - v / max * 92 - 4;
  const real = D.acum.map((v, i) => (i === 0 ? 'M' : 'L') + X(i + 1).toFixed(2) + ',' + Y(v).toFixed(2)).join(' ');
  const proy = `M${X(D.dt).toFixed(2)},${Y(D.acum[D.dt - 1] || 0).toFixed(2)} L${X(D.dm).toFixed(2)},${Y(D.proyeccion).toFixed(2)}`;
  const meta = `M${X(1).toFixed(2)},${Y(0).toFixed(2)} L${X(D.dm).toFixed(2)},${Y(D.objetivo).toFixed(2)}`;
  return `<div class="dp-eq-graf" role="img" aria-label="${escapeHtml(gl({es: 'Ventas acumuladas del mes frente al equilibrio', ca: 'Vendes acumulades del mes davant de l\'equilibri', en: 'Month-to-date sales against break-even'}))}">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="100" y1="${Y(D.objetivo).toFixed(2)}" y2="${Y(D.objetivo).toFixed(2)}" class="dp-eq-g-meta" vector-effect="non-scaling-stroke"/>
      <path d="${meta}" class="dp-eq-g-ideal" vector-effect="non-scaling-stroke"/>
      <path d="${proy}" class="dp-eq-g-proy" vector-effect="non-scaling-stroke"/>
      <path d="${real}" class="dp-eq-g-real" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="dp-eq-g-leyenda"><span class="r"><i></i>${escapeHtml(gl({es: 'Lo vendido', ca: 'El venut', en: 'Sold'}))}</span><span class="i"><i></i>${escapeHtml(gl({es: 'Camino al equilibrio', ca: 'Camí a l\'equilibri', en: 'Path to break-even'}))}</span><span class="p"><i></i>${escapeHtml(gl({es: 'Previsión', ca: 'Previsió', en: 'Forecast'}))}</span></div>
  </div>`;
}

/* ── ANÁLISIS DE VENTAS (mes elegido) + PICOS DE VENTA ────────────────────────────────────────────────────
   Antes eran dos tarjetas: «este mes» y «picos de las últimas 8 semanas». Ahora van juntas y siguen el selector de año y mes,
   así el mapa de calor y el ranking hablan del MISMO periodo. */
function dpVentasDelMes(y, m){ const k = y + '-' + dpMes2(m); return activeSales().filter(s => (s.date || '').startsWith(k)); }
function dpAnalisisPintar(){
  const el = document.getElementById('dp-analisis'); if(!el) return;
  dpInicializar();
  const {anio: y, mes: m} = DP.analisis;
  const ventas = dpVentasDelMes(y, m), total = ventas.reduce((s, x) => s + x.total, 0), n = ventas.length;
  const ant = new Date(y, m - 1, 1), prevT = dpVentasDelMes(ant.getFullYear(), ant.getMonth()).reduce((s, x) => s + x.total, 0);
  const dishKey = it => it.recipeId ? ('r' + it.recipeId) : ('m' + (it.name || ''));
  const prod = {}, marg = {};
  ventas.forEach(s => (s.items || []).forEach(it => {
    const key = dishKey(it), q = it.qty || 1;
    if(!prod[key]) prod[key] = {name: it.name || '—', units: 0, revenue: 0};
    prod[key].units += q; prod[key].revenue += (it.price || 0) * q;
    const unitCost = it.recipeId ? costoUnitarioDeLinea(it) : 0;
    const rate = it.ivaPct != null ? parseFloat(it.ivaPct) : parseFloat(ivaPorDefectoDe(it));
    if(!marg[key]) marg[key] = {name: it.name || '—', margin: 0, hasCost: false};
    marg[key].margin += ((it.price || 0) / (1 + rate / 100) - unitCost) * q;
    if(it.recipeId) marg[key].hasCost = true;
  }));
  const top = Object.values(prod).sort((a, b) => b.units - a.units).slice(0, 5);
  const topM = Object.values(marg).filter(v => v.hasCost).sort((a, b) => b.margin - a.margin).slice(0, 5);
  const porHora = new Array(24).fill(0);
  ventas.forEach(s => { if(s.createdAt) porHora[new Date(s.createdAt).getHours()] += s.total; });
  const iPico = porHora.indexOf(Math.max(...porHora));
  // Por día de la semana: total y media por día abierto (un lunes con ventas cuenta como un lunes).
  const dow = [0, 0, 0, 0, 0, 0, 0], diasDow = [new Set(), new Set(), new Set(), new Set(), new Set(), new Set(), new Set()];
  ventas.forEach(s => { const d = new Date(s.date + 'T12:00:00'), i = (d.getDay() + 6) % 7; dow[i] += s.total; diasDow[i].add(s.date); });
  const media = dow.map((v, i) => diasDow[i].size ? v / diasDow[i].size : 0), maxMedia = Math.max(...media, 1), iMejor = media.indexOf(Math.max(...media));
  const filaTop = (v, valor) => `<tr class="dp-fila-click" onclick="goToEscandalloForDish('${escapeJsAttr(v.name)}')" title="${escapeHtml(t('title.viewTechSpec'))}"><td>${escapeHtml(v.name)}</td><td class="num"><b>${valor}</b></td></tr>`;
  const kpi = (et, v, ex) => `<div class="dp-k"><div class="dp-k-et">${et}</div><div class="dp-k-v">${v}</div>${ex ? `<div class="dp-k-s">${ex}</div>` : ''}</div>`;
  el.innerHTML = `
    <div class="dp-cab">
      <div class="dp-ctl">${ggPeriodoHtml({anio: y, mes: m, cb: 'panelAnalisisCb', datos: dpDatosMeses(), anual: false})}</div>
    </div>
    ${!n ? `<div class="empty es-vacio dp-vacio"><i class="ti ti-chart-pie"></i>${escapeHtml(t('dash.noSalesRegistered'))}</div>` : `
    <div class="dp-k-fila">
      ${kpi(escapeHtml(t('dash.periodTotal')), fmtMoney(total), dpDelta(total, prevT, true) + ' ' + escapeHtml(gl({es: 'vs mes anterior', ca: 'vs mes anterior', en: 'vs previous month'})))}
      ${kpi(escapeHtml(t('dash.numSales')), n, '')}
      ${kpi(escapeHtml(t('dash.avgTicket')), fmtMoney(total / n), '')}
      ${kpi(escapeHtml(gl({es: 'Mejor día de la semana', ca: 'Millor dia de la setmana', en: 'Best weekday'})), escapeHtml(weekDayShort(iMejor)), escapeHtml(fmtMoney(media[iMejor])) + ' ' + escapeHtml(gl({es: 'de media', ca: 'de mitjana', en: 'on average'})))}
    </div>
    <div class="dp-3col">
      <div class="dp-sub"><h4>${escapeHtml(t('dash.topSellingDishes'))}</h4>${top.length ? `<table class="dp-tabla"><tbody>${top.map(v => filaTop(v, v.units + ' ' + escapeHtml(gl({es: 'uds', ca: 'uds', en: 'pcs'})))).join('')}</tbody></table>` : `<div class="empty">${escapeHtml(t('dash.noSalesRegistered'))}</div>`}</div>
      <div class="dp-sub"><h4>${escapeHtml(t('dash.topGrossMargin'))}</h4>${topM.length ? `<table class="dp-tabla"><tbody>${topM.map(v => filaTop(v, fmtMoney(v.margin))).join('')}</tbody></table>` : `<div class="empty">${escapeHtml(t('dash.noCostDataEnough'))}</div>`}</div>
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Ventas por día de la semana', ca: 'Vendes per dia de la setmana', en: 'Sales by weekday'}))}</h4>
        <div class="dp-dow">${media.map((v, i) => `<div class="dp-dow-c${i === iMejor ? ' mejor' : ''}" title="${escapeHtml(weekDayShort(i) + ' · ' + fmtMoney(v) + ' ' + gl({es: 'de media', ca: 'de mitjana', en: 'on average'}))}"><span class="dp-dow-v">${v ? dashCompacto(v) : ''}</span><i style="height:${Math.max(3, v / maxMedia * 100)}%"></i><span class="dp-dow-d">${escapeHtml(weekDayShort(i))}</span></div>`).join('')}</div>
      </div>
    </div>
    <div class="dp-sub dp-horas"><h4>${escapeHtml(t('dash.salesByHour'))}${porHora.some(v => v > 0) ? ` <span class="dt-pico"><i class="ti ti-flame"></i> ${escapeHtml(gl({es: 'Hora punta', ca: 'Hora punta', en: 'Peak hour'}))}: <b>${iPico}:00–${iPico + 1}:00</b> · ${escapeHtml(fmtMoney(porHora[iPico]))}</span>` : ''}</h4>
      ${dashSerieHtml(porHora.map((v, h) => ({label: h + 'h', nombre: h + ':00', value: v})), {id: 'dt-horas', cadaEtiqueta: 3, sinTags: true, clase: 'dt-corto', estatico: true})}
    </div>
    <div class="dp-sub"><h4><i class="ti ti-flame"></i> ${escapeHtml(gl({es: 'Picos de venta', ca: 'Pics de venda', en: 'Sales peaks'}))} · ${escapeHtml(monthFull(m))} ${y}</h4>
      <p class="txt-xs dp-pista-fija">${escapeHtml(t('dash.heatmapHint'))}</p>
      ${dpHeatmapHtml(ventas)}
    </div>`}`;
}
window.panelAnalisisCb = (a, m) => { dpInicializar(); DP.analisis = {anio: a, mes: m == null ? DP.analisis.mes : m}; dpAnalisisPintar(); };
// Mapa de calor día de la semana × hora, hora a hora y solo con las horas en las que ese negocio vende de verdad.
function dpHeatmapHtml(ventas){
  const conHora = ventas.filter(s => s.createdAt);
  if(!conHora.length) return `<div class="empty">${escapeHtml(t('dash.noSalesYet'))}</div>`;
  const dias = t('days.short'), porHora = dias.map(() => new Array(24).fill(0));
  conHora.forEach(s => { const d = new Date(s.createdAt); porHora[(d.getDay() + 6) % 7][d.getHours()] += s.total; });
  const horas = []; for(let h = 0; h < 24; h++) if(porHora.some(f => f[h] > 0)) horas.push(h);
  const et = h => new Date(2000, 0, 1, h).toLocaleTimeString(localeActual(), {hour: 'numeric'});
  const grid = porHora.map(f => horas.map(h => f[h])), max = Math.max(...grid.flat(), 1);
  return `<div class="dp-heat-w"><table class="dp-heat" style="min-width:${Math.max(420, 90 + horas.length * 54)}px;max-width:${90 + horas.length * 130}px">
    <thead><tr><th></th>${horas.map(h => `<th>${escapeHtml(et(h))}</th>`).join('')}</tr></thead>
    <tbody>${dias.map((dl, di) => `<tr><td class="d">${escapeHtml(dl)}</td>${grid[di].map((v, hi) => {
      const i = v / max, bg = v > 0 ? `rgba(255,138,0,${(0.12 + i * 0.78).toFixed(2)})` : 'transparent';
      return `<td><div class="c" style="background:${bg}" title="${escapeHtml(dl + ' ' + et(horas[hi]) + ' · ' + fmtMoney(v))}">${v > 0 ? dashCompacto(v) : ''}</div></td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ── CLIENTELA DEL MES: quién viene, con qué frecuencia, cuánto gasta y cómo consume ───────────────────────────── */
function dpEdad(cumple){
  if(!cumple) return null;
  const d = new Date(cumple + 'T12:00:00'); if(isNaN(d)) return null;
  const hoy = new Date(); let e = hoy.getFullYear() - d.getFullYear();
  if(hoy.getMonth() < d.getMonth() || (hoy.getMonth() === d.getMonth() && hoy.getDate() < d.getDate())) e--;
  return (e >= 5 && e <= 105) ? e : null;
}
function dpClientelaDatos(y, m){
  const ventas = dpVentasDelMes(y, m), total = ventas.reduce((s, x) => s + x.total, 0);
  const conFicha = ventas.filter(s => s.clientId != null), sinFicha = ventas.filter(s => s.clientId == null);
  const suma = a => a.reduce((s, x) => s + x.total, 0), pax = a => a.reduce((s, x) => s + (x.pax || 0), 0);
  const stats = computeClientStatsIndexed();
  const ids = [...new Set(conFicha.map(s => s.clientId))];
  const clientes = ids.map(id => (DB.clients || []).find(c => c.id === id)).filter(Boolean);
  const porCliente = {};
  conFicha.forEach(s => { porCliente[s.clientId] = (porCliente[s.clientId] || 0) + s.total; });
  const ticketGlobal = ventas.length ? total / ventas.length : 0;
  const mk = '' + y + '-' + dpMes2(m);
  const info = clientes.map(c => {
    const st = stats(c), gastoMes = porCliente[c.id] || 0;
    const visMes = conFicha.filter(s => s.clientId === c.id).length;
    return {c, st, gastoMes, visMes, ticket: visMes ? gastoMes / visMes : 0, recurrente: clEsRecurrente(c, st), nuevo: !!(st.firstDate && st.firstDate.startsWith(mk)), edad: dpEdad(c.cumpleanos), alergias: !!(c.allergies && String(c.allergies).trim())};
  });
  const edades = info.map(x => x.edad).filter(e => e != null);
  const tramos = [['< 25', 0, 24], ['25–34', 25, 34], ['35–44', 35, 44], ['45–54', 45, 54], ['55+', 55, 200]].map(([et, a, b]) => ({et, n: edades.filter(e => e >= a && e <= b).length}));
  const canal = {mesa: {n: 0, t: 0}, takeaway: {n: 0, t: 0}, delivery: {n: 0, t: 0}};
  ventas.forEach(s => { const k = canal[s.tipo || 'mesa'] ? (s.tipo || 'mesa') : 'mesa'; canal[k].n++; canal[k].t += s.total; });
  const franja = {comida: {n: 0, t: 0}, cena: {n: 0, t: 0}}, tipoDia = {semana: {n: 0, t: 0}, finde: {n: 0, t: 0}};
  ventas.forEach(s => {
    if(s.createdAt){ const f = new Date(s.createdAt).getHours() < 17 ? 'comida' : 'cena'; franja[f].n++; franja[f].t += s.total; }
    const dw = new Date(s.date + 'T12:00:00').getDay(), f2 = (dw === 0 || dw === 6 || dw === 5) ? 'finde' : 'semana';
    tipoDia[f2].n++; tipoDia[f2].t += s.total;
  });
  const cuad = {embajadores: [], fieles: [], valor: [], ocasionales: []};
  info.forEach(x => { const alto = x.ticket >= ticketGlobal; (x.recurrente ? (alto ? cuad.embajadores : cuad.fieles) : (alto ? cuad.valor : cuad.ocasionales)).push(x); });
  return {ventas, total, conFicha, sinFicha, suma, pax, info, edades, tramos, canal, franja, tipoDia, cuad, ticketGlobal};
}
function dpClientelaPintar(){
  const el = document.getElementById('dp-clientela'); if(!el) return;
  dpInicializar();
  const {anio: y, mes: m} = DP.clientela, D = dpClientelaDatos(y, m);
  const n = D.ventas.length;
  const kpi = (et, v, ex, cl) => `<div class="dp-k${cl ? ' ' + cl : ''}"><div class="dp-k-et">${et}</div><div class="dp-k-v">${v}</div>${ex ? `<div class="dp-k-s">${ex}</div>` : ''}</div>`;
  const pc = (a, b) => b > 0 ? Math.round(a / b * 100) + ' %' : '—';
  const barra = (partes) => { const tot = partes.reduce((s, p) => s + p.v, 0) || 1; return `<div class="dp-stack">${partes.filter(p => p.v > 0).map(p => `<i class="${p.c}" style="width:${(p.v / tot * 100).toFixed(1)}%" title="${escapeHtml(p.et + ' · ' + p.txt)}"></i>`).join('')}</div><div class="dp-stack-ley">${partes.map(p => `<span><i class="${p.c}"></i>${escapeHtml(p.et)} <b>${escapeHtml(p.txt)}</b></span>`).join('')}</div>`; };
  const edadMedia = D.edades.length ? D.edades.reduce((s, e) => s + e, 0) / D.edades.length : null;
  const maxTr = Math.max(...D.tramos.map(t2 => t2.n), 1);
  const cuadCelda = (k, tit, sub, lista) => {
    const gasto = lista.reduce((s, x) => s + x.gastoMes, 0);
    return `<div class="dp-q dp-q-${k}"><div class="dp-q-t">${escapeHtml(tit)}</div><div class="dp-q-n">${lista.length}</div><div class="dp-q-s">${escapeHtml(sub)}</div><div class="dp-q-g">${escapeHtml(fmtMoney(gasto))} · ${pc(gasto, D.total)}</div></div>`;
  };
  const canalNom = {mesa: gl({es: 'En mesa', ca: 'A taula', en: 'Dine-in'}), takeaway: gl({es: 'Para llevar', ca: 'Per emportar', en: 'Take away'}), delivery: gl({es: 'A domicilio', ca: 'A domicili', en: 'Delivery'})};
  const fila = (nom, o) => `<tr><td>${escapeHtml(nom)}</td><td class="num">${o.n}</td><td class="num">${escapeHtml(fmtMoney(o.t))}</td><td class="num">${escapeHtml(fmtMoney(o.n ? o.t / o.n : 0))}</td></tr>`;
  const cabT = `<thead><tr><th></th><th class="num">${escapeHtml(gl({es: 'Tickets', ca: 'Tiquets', en: 'Tickets'}))}</th><th class="num">${escapeHtml(gl({es: 'Ventas', ca: 'Vendes', en: 'Sales'}))}</th><th class="num">${escapeHtml(gl({es: 'Ticket', ca: 'Tiquet', en: 'Ticket'}))}</th></tr></thead>`;
  const nuevos = D.info.filter(x => x.nuevo).length, recurrentes = D.info.filter(x => x.recurrente).length, ocasionales = D.info.length - recurrentes;
  const alergias = D.info.filter(x => x.alergias).length;
  el.innerHTML = `
    <div class="dp-cab">
      <div class="dp-ctl">${ggPeriodoHtml({anio: y, mes: m, cb: 'panelClientelaCb', datos: dpDatosMeses(), anual: false})}</div>
    </div>
    ${!n ? `<div class="empty es-vacio dp-vacio"><i class="ti ti-users"></i>${escapeHtml(gl({es: 'No hay ventas en este mes: aquí verás quién viene y cómo consume.', ca: 'No hi ha vendes en aquest mes: aquí veuràs qui ve i com consumeix.', en: 'There are no sales this month: here you will see who comes and how they spend.'}))}</div>` : `
    <div class="dp-k-fila">
      ${kpi(escapeHtml(gl({es: 'Clientes con ficha', ca: 'Clients amb fitxa', en: 'Customers with profile'})), D.info.length, escapeHtml(pc(D.conFicha.length, n) + ' ' + gl({es: 'de los tickets', ca: 'dels tiquets', en: 'of tickets'})))}
      ${kpi(escapeHtml(gl({es: 'Tickets sin ficha', ca: 'Tiquets sense fitxa', en: 'Tickets without profile'})), D.sinFicha.length, escapeHtml(pc(D.sinFicha.length, n) + ' · ' + (D.pax(D.sinFicha) ? D.pax(D.sinFicha) + ' ' + gl({es: 'comensales', ca: 'comensals', en: 'guests'}) : gl({es: 'sin comensales anotados', ca: 'sense comensals anotats', en: 'no guests recorded'}))))}
      ${kpi(escapeHtml(gl({es: 'Clientes nuevos', ca: 'Clients nous', en: 'New customers'})), nuevos, escapeHtml(gl({es: 'primera visita este mes', ca: 'primera visita aquest mes', en: 'first visit this month'})))}
      ${kpi(escapeHtml(gl({es: 'Edad media', ca: 'Edat mitjana', en: 'Average age'})), edadMedia != null ? Math.round(edadMedia) : '—', escapeHtml(D.edades.length ? D.edades.length + ' ' + gl({es: 'con fecha de nacimiento', ca: 'amb data de naixement', en: 'with a birth date'}) : gl({es: 'ninguno tiene fecha de nacimiento', ca: 'cap té data de naixement', en: 'none has a birth date'})))}
    </div>
    ${D.conFicha.length < n * 0.4 ? `<p class="dp-aviso txt-xs"><i class="ti ti-info-circle"></i> ${escapeHtml(gl({es: 'Solo el ' + pc(D.conFicha.length, n) + ' de los tickets lleva una ficha de cliente: cuantos más vincules al cobrar (por teléfono o nombre), más fiable es todo esto.', ca: 'Només el ' + pc(D.conFicha.length, n) + ' dels tiquets porta una fitxa de client: com més en vinculis en cobrar (per telèfon o nom), més fiable és tot això.', en: 'Only ' + pc(D.conFicha.length, n) + ' of tickets carry a customer profile: the more you link when charging (by phone or name), the more reliable all this is.'}))}</p>` : ''}
    <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Con ficha frente a sin ficha', ca: 'Amb fitxa davant de sense fitxa', en: 'With vs without profile'}))}</h4>
      <div class="dp-tabla-w"><table class="dp-tabla">${cabT}<tbody>${fila(gl({es: 'Con ficha', ca: 'Amb fitxa', en: 'With profile'}), {n: D.conFicha.length, t: D.suma(D.conFicha)})}${fila(gl({es: 'Sin ficha', ca: 'Sense fitxa', en: 'Without profile'}), {n: D.sinFicha.length, t: D.suma(D.sinFicha)})}</tbody></table></div>
    </div>
    <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Matriz de clientela', ca: 'Matriu de clientela', en: 'Customer matrix'}))} <span class="dp-h-s">${escapeHtml(gl({es: 'frecuencia × gasto por visita (clientes con ficha)', ca: 'freqüència × despesa per visita (clients amb fitxa)', en: 'frequency × spend per visit (customers with a profile)'}))}</span></h4>
      <div class="dp-matriz">
        <div class="dp-m-eje dp-m-y1">${escapeHtml(gl({es: 'Gasta más del ticket medio', ca: 'Gasta més del tiquet mitjà', en: 'Spends above average'}))}</div>
        <div class="dp-m-eje dp-m-y2">${escapeHtml(gl({es: 'Gasta menos', ca: 'Gasta menys', en: 'Spends less'}))}</div>
        <div class="dp-m-eje dp-m-x1">${escapeHtml(gl({es: 'Ocasionales', ca: 'Ocasionals', en: 'Occasional'}))}</div>
        <div class="dp-m-eje dp-m-x2">${escapeHtml(gl({es: 'Recurrentes', ca: 'Recurrents', en: 'Regulars'}))}</div>
        ${cuadCelda('valor', gl({es: 'Alto valor ocasional', ca: 'Alt valor ocasional', en: 'High-value occasional'}), gl({es: 'Gastan bien pero vienen poco: invítalos a volver', ca: 'Gasten bé però vénen poc: convida\'ls a tornar', en: 'They spend well but rarely come: invite them back'}), D.cuad.valor)}
        ${cuadCelda('embajadores', gl({es: 'Embajadores', ca: 'Ambaixadors', en: 'Ambassadors'}), gl({es: 'Vienen mucho y gastan bien: cuídalos', ca: 'Vénen molt i gasten bé: cuida\'ls', en: 'They come often and spend well: look after them'}), D.cuad.embajadores)}
        ${cuadCelda('ocasionales', gl({es: 'Ocasionales', ca: 'Ocasionals', en: 'Occasional'}), gl({es: 'Vienen poco y gastan poco', ca: 'Vénen poc i gasten poc', en: 'Rare visits, small spend'}), D.cuad.ocasionales)}
        ${cuadCelda('fieles', gl({es: 'Fieles', ca: 'Fidels', en: 'Loyal'}), gl({es: 'Vienen mucho, ticket pequeño: sube el ticket', ca: 'Vénen molt, tiquet petit: puja el tiquet', en: 'Frequent, small ticket: grow the ticket'}), D.cuad.fieles)}
      </div>
    </div>
    <div class="dp-3col">
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Edades', ca: 'Edats', en: 'Ages'}))}</h4>
        ${D.edades.length ? `<div class="dp-edades">${D.tramos.map(tr => `<div class="dp-ed"><span>${escapeHtml(tr.et)}</span><div><i style="width:${(tr.n / maxTr * 100).toFixed(1)}%"></i></div><b>${tr.n}</b></div>`).join('')}</div>` : `<div class="dp-sin">${escapeHtml(gl({es: 'Añade la fecha de nacimiento en la ficha del cliente para ver las edades.', ca: 'Afegeix la data de naixement a la fitxa del client per veure les edats.', en: 'Add the birth date on the customer profile to see ages.'}))}</div>`}
      </div>
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Frecuencia', ca: 'Freqüència', en: 'Frequency'}))}</h4>
        ${D.info.length ? barra([{et: gl({es: 'Recurrentes', ca: 'Recurrents', en: 'Regulars'}), v: recurrentes, c: 'c1', txt: String(recurrentes)}, {et: gl({es: 'Ocasionales', ca: 'Ocasionals', en: 'Occasional'}), v: ocasionales, c: 'c2', txt: String(ocasionales)}]) : `<div class="empty">${escapeHtml(gl({es: 'Sin clientes con ficha este mes.', ca: 'Sense clients amb fitxa aquest mes.', en: 'No customers with a profile this month.'}))}</div>`}
        ${alergias ? `<p class="txt-xs dp-pista-fija"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es: alergias + ' con alergias o intolerancias anotadas: cocina debe saberlo.', ca: alergias + ' amb al·lèrgies o intoleràncies anotades: cuina ho ha de saber.', en: alergias + ' with allergies or intolerances noted: the kitchen should know.'}))}</p>` : ''}
      </div>
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Tipo de consumo', ca: 'Tipus de consum', en: 'How they dine'}))}</h4>
        ${barra(['mesa', 'takeaway', 'delivery'].map((k, i) => ({et: canalNom[k], v: D.canal[k].t, c: 'c' + (i + 1), txt: pc(D.canal[k].t, D.total)})))}
      </div>
    </div>
    <div class="dp-3col">
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Por canal', ca: 'Per canal', en: 'By channel'}))}</h4><div class="dp-tabla-w"><table class="dp-tabla">${cabT}<tbody>${['mesa', 'takeaway', 'delivery'].map(k => fila(canalNom[k], D.canal[k])).join('')}</tbody></table></div></div>
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Comida o cena', ca: 'Dinar o sopar', en: 'Lunch or dinner'}))}</h4><div class="dp-tabla-w"><table class="dp-tabla">${cabT}<tbody>${fila(gl({es: 'Comida (antes de las 17 h)', ca: 'Dinar (abans de les 17 h)', en: 'Lunch (before 5 pm)'}), D.franja.comida)}${fila(gl({es: 'Cena', ca: 'Sopar', en: 'Dinner'}), D.franja.cena)}</tbody></table></div></div>
      <div class="dp-sub"><h4>${escapeHtml(gl({es: 'Entre semana o fin de semana', ca: 'Entre setmana o cap de setmana', en: 'Weekday or weekend'}))}</h4><div class="dp-tabla-w"><table class="dp-tabla">${cabT}<tbody>${fila(gl({es: 'Lunes a jueves', ca: 'Dilluns a dijous', en: 'Monday to Thursday'}), D.tipoDia.semana)}${fila(gl({es: 'Viernes a domingo', ca: 'Divendres a diumenge', en: 'Friday to Sunday'}), D.tipoDia.finde)}</tbody></table></div></div>
    </div>`}`;
}
window.panelClientelaCb = (a, m) => { dpInicializar(); DP.clientela = {anio: a, mes: m == null ? DP.clientela.mes : m}; dpClientelaPintar(); };

// Las tarjetas (con su título como cabecera, para que en móvil se plieguen) las pinta este módulo; su contenido, cada bloque.
function dpTarjeta(id, icono, titulo, abierta){
  return `<div class="card dp-card gg-plegable"${abierta ? ' data-acc-abierto="1"' : ''}><h3><i class="ti ${icono}"></i> ${escapeHtml(titulo)}</h3><div id="${id}"></div></div>`;
}
// Punto de entrada: lo llama renderDashboard.
function panelRender(){
  dpInicializar();
  const eq = document.getElementById('dp-equilibrio'); if(eq) eq.innerHTML = dpEquilibrioHtml();
  const a = document.getElementById('dp-root-a');
  if(a) a.innerHTML = DP_BLOQUES.map((k, i) => dpTarjeta('dp-' + k, DP_DEF[k].icono, DP_DEF[k].tit(), i < 2)).join('');
  const b = document.getElementById('dp-root-b');
  if(b) b.innerHTML = dpTarjeta('dp-analisis', 'ti-chart-pie', gl({es: 'Análisis de ventas y picos de venta', ca: 'Anàlisi de vendes i pics de venda', en: 'Sales analysis and peaks'}), false)
    + dpTarjeta('dp-clientela', 'ti-users', gl({es: 'Clientela', ca: 'Clientela', en: 'Customers'}), false);
  DP_BLOQUES.forEach(dpPintar);
  dpAnalisisPintar();
  dpClientelaPintar();
}


/* ═══ AVISOS: la campana de la cabecera (12/11, pedido del dueño) ═══
   Todo lo que pide atención sale aquí SIN entrar al Panel: vacaciones y cambios de turno (con sus botones de Aceptar /
   Rechazar), pedidos de la web y reservas por confirmar, subidas de precio, temperaturas fuera de rango, stock bajo,
   mantenimiento vencido, facturas sin pagar… La lista sale de `avisosDeLaApp()` (js/finance.js), la MISMA que pinta el
   Panel en «Hoy — Atención», así que nunca se contradicen.
   Los avisos NO se guardan: se calculan de lo que hay, y desaparecen solos cuando se resuelven. Solo los informativos
   (cumpleaños, bajadas de precio) se pueden «marcar como visto», y se recuerda en ESTE aparato hasta que cambie la cifra.
   El propietario ve todo; el empleado, solo lo operativo (no las aprobaciones, el dinero ni los precios). */
const AVISOS_VISTOS_LS = 'gastrogoan_avisos_vistos';
function avisosVistosLeer(){ try{ return JSON.parse(localStorage.getItem(AVISOS_VISTOS_LS) || '{}') || {}; }catch(e){ return {}; } }
function avisosLista(){
  const dueno = typeof isOwnerSession === 'function' && isOwnerSession();
  const vistos = avisosVistosLeer();
  const filas = [];
  if(dueno){
    (DB.vacationRequests || []).filter(r => r.status === 'pending').forEach(r => {
      const emp = (DB.employees || []).find(e => e.id === r.employeeId);
      filas.push({id: 'vac' + r.id, icon: 'ti-beach', warn: true,
        html: t('vacation.ownerPendingLine').replace('${name}', escapeHtml(emp ? emp.name : '?')).replace('${from}', escapeHtml(r.fromDate)).replace('${to}', escapeHtml(r.toDate)),
        acciones: [[t('common.accept'), `ownerRespondVacationRequest(${r.id}, true)`, true], [t('common.reject'), `ownerRespondVacationRequest(${r.id}, false)`]]});
    });
    (DB.turnoSwapRequests || []).filter(r => r.status === 'pending_owner').forEach(r => {
      const de = (DB.employees || []).find(e => e.id === r.fromEmployeeId), a = (DB.employees || []).find(e => e.id === r.toEmployeeId);
      const turno = (DB.turnos || []).find(x => x.id === r.fromTurnoId);
      filas.push({id: 'swap' + r.id, icon: 'ti-replace', warn: true,
        html: t('swap.ownerPendingLine').replace('${from}', escapeHtml(de ? de.name : '?')).replace('${to}', escapeHtml(a ? a.name : '?')).replace('${date}', escapeHtml(turno ? turno.fecha : '?')),
        acciones: [[t('common.accept'), `ownerApproveTurnoSwap(${r.id}, true)`, true], [t('common.reject'), `ownerApproveTurnoSwap(${r.id}, false)`]]});
    });
  }
  avisosDeLaApp().filter(i => i.campana && i.count > 0 && (dueno || !i.soloDueno)).forEach(i => {
    if(i.ocultable && vistos[i.id] === i.count) return;
    filas.push({id: i.id, icon: i.icon, warn: !!i.warn, html: '<strong>' + i.count + '</strong> · ' + i.label, ir: i.onclick, ocultable: i.ocultable, count: i.count});
  });
  // Lo que pide una decisión, delante; lo informativo, detrás.
  return filas.sort((a, b) => (b.warn ? 1 : 0) - (a.warn ? 1 : 0));
}
let avisosTimer = null, avisosUltimoN = 0, avisosVence = 0;
function avisosProgramar(ms){
  // Gana SIEMPRE el plazo más corto: un refresco «tranquilo» (1,2 s, al pintar una pantalla) no puede retrasar uno pendiente de 0,4 s (tras guardar).
  const vence = Date.now() + (ms == null ? 400 : ms);
  if(avisosTimer && avisosVence <= vence) return;
  clearTimeout(avisosTimer);
  avisosVence = vence;
  avisosTimer = setTimeout(() => { avisosTimer = null; avisosPintar(); }, vence - Date.now());
}
function avisosPanelAbierto(){ const p = document.getElementById('avisos-panel'); return !!(p && p.classList.contains('active')); }
function avisosPintar(){
  const fab = document.getElementById('avisos-fab'), badge = document.getElementById('avisos-badge');
  if(!fab || !badge || typeof DB === 'undefined' || !DB || !DB.business) return;
  let filas = [];
  try{ filas = avisosLista(); }catch(e){ console.error('Error calculando los avisos', e); }
  const n = filas.length, urgentes = filas.filter(f => f.warn).length;
  badge.style.display = n ? 'flex' : 'none';
  badge.textContent = n > 9 ? '9+' : String(n);
  fab.classList.toggle('avisos-con', urgentes > 0);
  const tit = gl({es: 'Avisos', ca: 'Avisos', en: 'Notifications'});
  fab.title = tit; fab.setAttribute('aria-label', n ? tit + ' (' + n + ')' : tit);
  // Si hay MÁS que antes, la campana se sacude una vez (una novedad, no el estado de siempre).
  if(n > avisosUltimoN && avisosUltimoN >= 0 && fab.dataset.listo){ fab.classList.remove('avisos-nuevo'); void fab.offsetWidth; fab.classList.add('avisos-nuevo'); }
  fab.dataset.listo = '1'; avisosUltimoN = n;
  if(avisosPanelAbierto()) avisosRenderPanel(filas);
}
function avisosRenderPanel(filas){
  const cuerpo = document.getElementById('avisos-cuerpo'); if(!cuerpo) return;
  filas = filas || avisosLista();
  const fila = f => `
    <div class="av-fila${f.warn ? ' av-warn' : ''}">
      <i class="ti ${f.icon}" aria-hidden="true"></i>
      <div class="av-txt">${f.html}</div>
      <div class="av-bt">
        ${(f.acciones || []).map(a => `<button type="button" class="btn btn-sm btn-fino${a[2] ? ' is-on' : ''}" onclick="${a[1]}">${a[0]}</button>`).join('')}
        ${f.ir ? `<button type="button" class="btn btn-sm btn-fino" onclick="avisosIr(&quot;${f.ir.replace(/"/g, '&quot;')}&quot;)">${gl({es: 'Ver', ca: 'Veure', en: 'View'})}</button>` : ''}
        ${f.ocultable ? `<button type="button" class="btn btn-sm btn-fino" onclick="avisosMarcarVisto('${f.id}', ${f.count})">${gl({es: 'Visto', ca: 'Vist', en: 'Seen'})}</button>` : ''}
      </div>
    </div>`;
  cuerpo.innerHTML = filas.length
    ? filas.map(fila).join('')
    : `<div class="av-vacio"><i class="ti ti-circle-check" aria-hidden="true"></i><strong>${gl({es: 'Todo al día', ca: 'Tot al dia', en: 'All caught up'})}</strong><span>${gl({es: 'No hay nada que requiera tu atención.', ca: 'No hi ha res que requereixi la teva atenció.', en: 'Nothing needs your attention.'})}</span></div>`;
}
function avisosAsegurarPanel(){
  let p = document.getElementById('avisos-panel');
  if(p) return p;
  p = document.createElement('div');
  p.id = 'avisos-panel'; p.className = 'avisos-panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', gl({es: 'Avisos', ca: 'Avisos', en: 'Notifications'}));
  p.innerHTML = `<div class="av-cab"><h4><i class="ti ti-bell" aria-hidden="true"></i> ${gl({es: 'Avisos', ca: 'Avisos', en: 'Notifications'})}</h4><button type="button" class="btn btn-sm btn-icon" onclick="cerrarAvisos()" aria-label="${gl({es: 'Cerrar', ca: 'Tancar', en: 'Close'})}"><i class="ti ti-x"></i></button></div><div class="av-cuerpo" id="avisos-cuerpo"></div>`;
  document.body.appendChild(p);
  return p;
}
function toggleAvisosPanel(){
  const p = avisosAsegurarPanel();
  if(p.classList.contains('active')){ cerrarAvisos(); return; }
  const chat = document.getElementById('chat-panel'); if(chat) chat.classList.remove('active');
  p.classList.add('active');
  avisosRenderPanel();
}
function cerrarAvisos(){ const p = document.getElementById('avisos-panel'); if(p) p.classList.remove('active'); }
function avisosIr(accion){ cerrarAvisos(); try{ (new Function(accion))(); }catch(e){ console.error('No se pudo abrir el aviso', e); } }
function avisosMarcarVisto(id, count){
  const v = avisosVistosLeer(); v[id] = count;
  try{ localStorage.setItem(AVISOS_VISTOS_LS, JSON.stringify(v)); }catch(e){}
  avisosPintar();
}
if(typeof document !== 'undefined'){
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && avisosPanelAbierto()) cerrarAvisos(); });
  document.addEventListener('click', e => {
    if(!avisosPanelAbierto()) return;
    if(e.target.closest && (e.target.closest('#avisos-panel') || e.target.closest('#avisos-fab'))) return;
    cerrarAvisos();
  });
}
