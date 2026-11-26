/* ============================================================
   VENTAS POR SEPARADO EN LA NUBE (26/11) — «cobrar con 20.000 ventas se cuelga»

   EL PROBLEMA, MEDIDO (Chromium con CPU x4, 20.000 ventas, test/emulador/ventas-nube.mjs):
   `sales` es el 98 % de los datos y se sincronizaba como UN solo bloque. Cada cobro, en el aparato que cobra:
   convertir las 20.000 ventas a texto para ver «qué ha cambiado» (canonicalStringify), copiarlas enteras
   (sinIndefinidos) y SUBIR las 20.000 (12,7 MB) para añadir UNA. Y en cada OTRO aparato, recibirlas enteras y
   volver a compararlas (applyRemoteBlock: 2,8 s congelado). Por eso «se cuelga unos segundos».

   LA SOLUCIÓN: cada venta es su propio nodo — `tenants/{tenantId}/ventas/{id}` — y solo viaja la que cambia.
   · Es HERMANO de `db`, no hijo: ningún aparato con la versión anterior lo ve, ni lo descarga, ni lo pisa.
   · `DB.sales` sigue siendo UNA lista en memoria y en IndexedDB: nada más en la app se entera.
   · No hacen falta reglas nuevas (`tenants/$tenantId` ya deja leer y escribir todo lo que cuelga de él).

   COMPATIBILIDAD ENTRE VERSIONES — por qué hay una bandera y no es automático:
   un aparato con la versión vieja sigue escribiendo y leyendo `db/sales` entero y NO ve `ventas`. Si dos
   aparatos del mismo negocio usaran formatos distintos, cada uno vería solo las ventas del otro a medias. Así que:
   · `DB.business.ventasPorMes` es una bandera POR NEGOCIO, APAGADA para todo negocio existente. La enciende el
     propietario en Mi Negocio (con el aviso de que todos sus aparatos tienen que haber abierto la app ya
     actualizada) y se enciende SOLA solo en un negocio nuevo (nube recién creada y sin ventas).
   · SIEMPRE se escuchan los dos sitios: con la bandera apagada, lo que llegue de `ventas` se funde en `DB.sales`
     (por si un aparato se adelantó o se hizo marcha atrás); con la bandera encendida, lo que llegue de `db/sales`
     (un aparato viejo que sigue vendiendo) se funde igual. Nunca se pierde una venta por mirar solo un lado.
   · Marcha atrás: apagar la bandera. `DB.sales` local es la unión de todo, así que el bloque antiguo se vuelve
     a subir completo y queda al día. Lo de `ventas` se queda donde está (no se borra nada).
   · `db/sales` NO se borra al migrar: un aparato viejo que sigue vivo lo necesita, y es la red de seguridad.

   LÍMITES CONOCIDOS (a propósito):
   · Un aparato con la versión vieja, ya con la bandera encendida, no ve las ventas nuevas de los demás. La app lo
     detecta (llega una venta suya por el bloque antiguo) y lo dice en Mi Negocio y con un aviso.
   · Si ese aparato viejo MODIFICA una venta que ya estaba en `ventas` (p. ej. la anula), gana la versión de `ventas`.
   · Una venta de hace más de 3 días que se modifica se detecta con un barrido en segundo plano (cada venta se
     revisa como mucho cada minuto), no al instante. Las de hoy y de los últimos días, al instante.
   ============================================================ */

const VN_DIAS_VENTANA = 3;      // ventas de estos días se comprueban en CADA subida; las anteriores, con el barrido lento
const VN_LOTE = 1500;           // ventas por escritura a la nube (≈1 MB)
const VN_TROZO = 1200;          // ventas por trozo al procesar/barrer, para no bloquear la pantalla
const VN_BARRIDO_MS = 60000;    // vuelta completa del barrido lento
const VN_CLAVE_LS_APARATOS = 'aparatos';

let vnRef = null, vnRefRuta = '';
let vnOyentes = [];                  // [{ref, ev, fn}] para soltarlos al reconectar
const vnNube = new Map();            // String(id) → texto canónico de lo que la nube TIENE de esa venta
const vnEnVuelo = new Map();         // String(id) → texto (o null = borrado) de lo que acabamos de mandar y no está confirmado
let vnListo = false;                 // la carga inicial de `ventas` ya llegó y se procesó
let vnListoPendiente = false;
let vnEntrantes = new Map();
let vnQuitadas = new Set();
let vnProcesando = false, vnTimerProcesar = null;
const vnSucias = new Set();          // ventas antiguas que el barrido vio distintas de la nube
let vnUltimoArray = null, vnUltimaLen = 0;
let vnSubiendo = false, vnRepetir = false;
let vnCursorBarrido = 0, vnTimerBarrido = null;
let vnViejoVisto = false;            // llegó una venta por el bloque antiguo: hay un aparato sin actualizar
let vnMigracion = null;              // {hechas, total, fase} mientras el propietario migra

/* ¿Este negocio sube y baja las ventas una a una? */
function vnActivo(){
  return !!(typeof DB !== 'undefined' && DB && DB.business && DB.business.ventasPorMes);
}

/* La clave de Firebase de una venta. Reversible y sin choques (el «%» también se escapa): dos ids distintos nunca
   comparten nodo, que sería PERDER una venta. Firebase no admite . $ # [ ] / ni caracteres de control. */
function vnClave(sid){
  const k = String(sid).replace(/[%.$#\[\]\/\u0000-\u001f\u007f]/g, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'));
  return k || '%00';
}
function vnSidDeClave(k){
  return String(k).replace(/%([0-9a-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

/* Texto canónico de una venta TAL COMO LA GUARDA FIREBASE: sin nulos, sin listas ni objetos vacíos, con las claves
   «seguras» y ordenadas. Sirve para comparar lo local con lo que vuelve de la nube sin falsas diferencias: Firebase
   se come `items: []` o `pagos: null`, y comparar sin quitar eso hacía creer que cada venta había cambiado.
   Devuelve '' si no queda nada. */
function vnCanon(v){
  if(v === undefined || v === null) return '';
  const tp = typeof v;
  if(tp === 'string') return JSON.stringify(v);
  if(tp === 'number') return Number.isFinite(v) ? JSON.stringify(v) : '';
  if(tp === 'boolean') return v ? 'true' : 'false';
  if(tp !== 'object') return '';
  if(Array.isArray(v)){
    const p = [];
    for(let i = 0; i < v.length; i++) p.push(vnCanon(v[i]) || 'null');
    while(p.length && p[p.length - 1] === 'null') p.pop();
    return p.length ? '[' + p.join(',') + ']' : '';
  }
  const pares = [];
  const ks = Object.keys(v);
  for(let i = 0; i < ks.length; i++){
    const c = vnCanon(v[ks[i]]);
    if(c) pares.push([claveSeguraFirebase(ks[i]), c]);
  }
  if(!pares.length) return '';
  pares.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return '{' + pares.map(p => JSON.stringify(p[0]) + ':' + p[1]).join(',') + '}';
}

const vnEspera = ms => new Promise(r => setTimeout(r, ms));

/* ---------------------------------------------------------------- escuchar */
function vnDetener(){
  vnOyentes.forEach(o => { try{ o.ref.off(o.ev, o.fn); }catch(e){} });
  vnOyentes = [];
  clearTimeout(vnTimerProcesar); vnTimerProcesar = null;
  clearInterval(vnTimerBarrido); vnTimerBarrido = null;
  vnNube.clear(); vnEnVuelo.clear(); vnEntrantes = new Map(); vnQuitadas = new Set(); vnSucias.clear();
  vnListo = false; vnListoPendiente = false; vnRef = null; vnRefRuta = '';
}

/* Se llama cada vez que la nube del negocio queda enchufada (attachCloudChildListeners). Idempotente. */
function vnIniciar(){
  if(typeof cloudRef === 'undefined' || !cloudRef) return;
  let ref;
  try{ ref = cloudRef.parent.child('ventas'); }catch(e){ return; }
  const ruta = String(ref);
  if(vnRef && vnRefRuta === ruta && vnOyentes.length) return;
  vnDetener();
  vnRef = ref; vnRefRuta = ruta;
  const onErr = e => { console.warn('ventas: la nube rechazó la lectura', e); if(vnActivo()) recordSyncError(e); };
  const ev = (nombre, fn) => { ref.on(nombre, fn, onErr); vnOyentes.push({ref, ev: nombre, fn}); };
  /* Un evento por VENTA (no por mes ni por bloque): cuando otro aparato cobra, a este llega esa venta y nada más. */
  const alLlegar = snap => {
    const v = snap.val();
    if(!v || typeof v !== 'object') return;
    const sid = v.id != null ? String(v.id) : vnSidDeClave(snap.key);
    if(v.id == null) v.id = sid;
    vnEntrantes.set(sid, v); vnQuitadas.delete(sid);
    vnProgramarProceso();
  };
  ev('child_added', alLlegar);
  ev('child_changed', alLlegar);
  ev('child_removed', snap => {
    const sid = vnSidDeClave(snap.key);
    vnEntrantes.delete(sid); vnQuitadas.add(sid);
    vnProgramarProceso();
  });
  /* «Ya llegó todo lo que había»: once('value') sobre el mismo sitio ya escuchado se sirve de la misma descarga. */
  ref.once('value').then(() => { vnListoPendiente = true; vnProgramarProceso(); }, onErr);
  vnTimerBarrido = setInterval(vnBarridoLento, 1000);
  vnRegistrarAparato();
}

function vnProgramarProceso(){
  if(vnTimerProcesar || vnProcesando) { if(!vnTimerProcesar) vnRepetir = true; return; }
  vnTimerProcesar = setTimeout(vnProcesar, 60);
}

/* Aplica lo que ha llegado. Por trozos: la primera vez son las 20.000 ventas de golpe, y procesarlas de un tirón
   dejaba la pantalla quieta. Cada trozo es atómico (se anota en `vnNube` y se funde en `DB.sales` a la vez). */
async function vnProcesar(){
  vnTimerProcesar = null;
  if(vnProcesando) return;
  vnProcesando = true;
  try{
    const ent = vnEntrantes, qui = vnQuitadas;
    vnEntrantes = new Map(); vnQuitadas = new Set();
    const lista = DB.sales || (DB.sales = []);
    let huboCambio = false, nuevas = 0, conflictos = 0, apartadas = false;
    qui.forEach(sid => {
      // Lo que se borró en la nube se borró allí: solo se olvida que «la nube lo tiene». Si aquí sigue y no hay lápida,
      // el siguiente envío lo vuelve a subir (nunca se pierde una venta por un borrado sin lápida). Un «borrado» que es
      // en realidad el rechazo de una escritura nuestra (aún en vuelo) tampoco cuenta.
      if(vnEnVuelo.has(sid) && vnEnVuelo.get(sid) !== null) return;
      vnNube.delete(sid);
    });
    const entradas = [...ent.entries()];
    for(let i = 0; i < entradas.length; i += VN_TROZO){
      if(DB.sales !== lista) break;     // alguien cambió la lista entera (restaurar copia): vuelve a empezar con lo que quede
      const trozo = entradas.slice(i, i + VN_TROZO);
      const idx = new Map();
      for(let j = 0; j < lista.length; j++){ const s = lista[j]; if(s && s.id != null) idx.set(String(s.id), j); }
      trozo.forEach(([sid, remota]) => {
        const json = vnCanon(remota);
        if(vnEnVuelo.has(sid) && vnEnVuelo.get(sid) === json) return;     // el eco de lo que acabamos de subir: no es de nadie más
        const base = vnNube.get(sid);
        vnNube.set(sid, json);
        const pos = idx.get(sid);
        if(pos === undefined){
          if(hayLapida('sales', sid)) return;      // borrada: queda anotada en vnNube y el siguiente envío la quita de la nube
          lista.push(remota); idx.set(sid, lista.length - 1); nuevas++; huboCambio = true; return;
        }
        if(base === json) return;                   // la nube no ha cambiado desde la última vez: manda lo local, que puede ser más nuevo
        const local = lista[pos];
        if(local === remota || sonIgualesRapido(local, remota)) return;
        const jl = vnCanon(local);
        if(jl === json) return;
        /* Otro COBRO de la misma mesa (mismo id, distinto createdAt y distinto importe o forma de pago): se conservan
           los dos. La más antigua se queda el id y la otra pasa a `id~createdAt`, igual en todos los aparatos (ver
           mergeVentas en core.js). La derivada no está en vnNube, así que el siguiente envío la sube a su propio nodo. */
        if(ventasSonCobrosDistintos(local, remota)){
          const derivada = ventaConservaId(local, remota) === local ? ventaConIdDerivado(remota) : ventaConIdDerivado(local);
          if(ventaConservaId(local, remota) !== local) lista[pos] = remota;
          const dsid = String(derivada.id), dpos = idx.get(dsid);
          if(dpos === undefined){ lista.push(derivada); idx.set(dsid, lista.length - 1); }
          nuevas++; huboCambio = true; apartadas = true; return;
        }
        if(base !== undefined && jl !== base) conflictos++;   // las dos cosas cambiaron: gana la nube, igual que siempre
        lista[pos] = remota; huboCambio = true;
      });
      if(i + VN_TROZO < entradas.length) await vnEspera(0);
    }
    if(conflictos && DB.auditLog){
      DB.auditLog.unshift({id: genId(), ts: new Date().toISOString(), actor: '', action: 'sync_conflict', severity: 'critical',
        summary: t('msg.concurrentEditOverwritten').replace('${count}', conflictos) + ' (sales)'});
      if(DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
    }
    if(vnListoPendiente && !vnListo && !vnEntrantes.size){
      vnListo = true;
      scheduleCloudSync();        // lo local que la nube no tenga, a subir
    }
    if(huboCambio){
      guardarLocalDB().catch(e => console.error('Error guardando datos', e));
      if(nuevas && typeof avisarSiFacturaDuplicada === 'function') avisarSiFacturaDuplicada(DB.sales);
      if(apartadas){ avisarSiCobroDuplicado(DB.sales); scheduleCloudSync(); }
      refreshAfterRemoteChange();
    }
    marcarNubeAlDia({trasProbarNube: true});
  }catch(e){
    console.error('Error aplicando ventas de la nube', e);
  }finally{
    vnProcesando = false;
    if(vnEntrantes.size || vnQuitadas.size || vnRepetir){ vnRepetir = false; vnProgramarProceso(); }
  }
}

/* Lo que llega por el bloque ANTIGUO (`db/sales`) cuando la bandera está encendida: solo se AÑADE lo que aquí no hay
   (una venta de un aparato sin actualizar). Lo que ya existe no se toca: manda `ventas`. */
function vnLegacyEntrante(val){
  const arr = Array.isArray(val) ? val : (val && typeof val === 'object' ? Object.values(val) : []);
  if(!arr.length) return;
  const lista = DB.sales || (DB.sales = []);
  const conocidas = new Map();
  for(let i = 0; i < lista.length; i++){ const s = lista[i]; if(s && s.id != null) conocidas.set(String(s.id), i); }
  const desde = (DB.business && DB.business.ventasPorMesDesde) || '';
  let nuevas = 0, viejo = false, apartadas = false;
  for(let i = 0; i < arr.length; i++){
    const s = arr[i];
    if(!s || typeof s !== 'object' || s.id == null) continue;
    const sid = String(s.id);
    if(hayLapida('sales', sid)) continue;
    if(conocidas.has(sid)){
      /* Mismo id y OTRO cobro (ver mergeVentas): se conserva también, con su id derivado. */
      const pos = conocidas.get(sid), local = lista[pos];
      if(!ventasSonCobrosDistintos(local, s)) continue;
      const remotaGana = ventaConservaId(local, s) !== local;
      const derivada = remotaGana ? ventaConIdDerivado(local) : ventaConIdDerivado(s);
      if(remotaGana) lista[pos] = s;
      const dsid = String(derivada.id);
      if(!conocidas.has(dsid)){ lista.push(derivada); conocidas.set(dsid, lista.length - 1); nuevas++; apartadas = true; }
      continue;
    }
    lista.push(s); conocidas.set(sid, lista.length - 1); nuevas++;
    if(vnListo && !vnNube.has(sid) && desde && String(s.createdAt || '') >= desde) viejo = true;
  }
  if(!nuevas) return;
  guardarLocalDB().catch(e => console.error('Error guardando datos', e));
  if(typeof avisarSiFacturaDuplicada === 'function') avisarSiFacturaDuplicada(DB.sales);
  if(apartadas) avisarSiCobroDuplicado(DB.sales);
  if(viejo && !vnViejoVisto){
    vnViejoVisto = true;
    if(typeof showToast === 'function') showToast(gl({es:'Un aparato con la versión antigua acaba de vender: ábrelo con internet para actualizarlo.', ca:'Un aparell amb la versió antiga acaba de vendre: obre\'l amb internet per actualitzar-lo.', en:'A device on the old version just made a sale: open it online to update it.'}));
  }
  scheduleCloudSync();            // lo recién llegado tiene que pasar al sitio nuevo
  refreshAfterRemoteChange();
}

/* ------------------------------------------------------------------ subir */
/* Se llama desde flushCloudSync. Decide QUÉ ventas hay que mandar (sin convertir a texto las 20.000: solo las de los
   últimos días, las que la nube no tiene y las que marcó el barrido lento) y devuelve cómo mandarlas. */
function vnPrepararSubida(){
  const nada = {hay: false};
  if(!vnRef || !vnListo) return nada;
  if(vnSubiendo){ vnRepetir = true; return nada; }
  const lista = DB.sales || [];
  const plena = vnUltimoArray !== lista || lista.length < vnUltimaLen;   // se cambió la lista entera o se quitaron ventas
  vnUltimoArray = lista; vnUltimaLen = lista.length;
  const d = new Date(); d.setDate(d.getDate() - VN_DIAS_VENTANA);
  const corte = typeof dateStr === 'function' ? dateStr(d) : '';
  const subir = [], vistos = plena ? new Set() : null;
  for(let i = 0; i < lista.length; i++){
    const s = lista[i];
    if(!s || typeof s !== 'object') continue;
    if(s.id == null) s.id = genId();      // una venta sin id no tiene dónde guardarse: se le da uno antes de perderla
    const sid = String(s.id);
    if(vistos) vistos.add(sid);
    const enNube = vnNube.has(sid);
    if(enNube && !vnSucias.has(sid) && s.date && s.date < corte) continue;
    if(hayLapida('sales', sid)) continue;
    const json = vnCanon(s);
    if(!json) continue;
    if(!enNube || vnNube.get(sid) !== json) subir.push({sid, s, json});
    else vnSucias.delete(sid);
  }
  const borrar = [];
  if(vistos){
    vnNube.forEach((json, sid) => { if(!vistos.has(sid) && hayLapida('sales', sid)) borrar.push(sid); });
  }
  if(!subir.length && !borrar.length) return nada;
  return {hay: true, subir: () => vnSubirLotes(subir, borrar), cuantas: subir.length + borrar.length};
}

/* Escribe en lotes y solo da por subido lo que la nube confirmó. Si falla, se lanza el error: flushCloudSync lo
   trata como cualquier otro fallo de subida (indicador rojo y reintento con espera creciente). */
async function vnSubirLotes(subir, borrar, progreso){
  vnSubiendo = true;
  const pendientes = new Set();
  try{
    subir.forEach(x => { vnEnVuelo.set(x.sid, x.json); pendientes.add(x.sid); });
    borrar.forEach(sid => { vnEnVuelo.set(sid, null); pendientes.add(sid); });
    const todos = subir.map(x => ({sid: x.sid, json: x.json, s: x.s})).concat(borrar.map(sid => ({sid, json: null, s: null})));
    for(let i = 0; i < todos.length; i += VN_LOTE){
      const lote = todos.slice(i, i + VN_LOTE), u = {};
      lote.forEach(x => { u[vnClave(x.sid)] = x.s ? sinIndefinidos(x.s) : null; });
      await vnRef.update(u);
      lote.forEach(x => {
        if(x.json === null) vnNube.delete(x.sid); else { vnNube.set(x.sid, x.json); vnSucias.delete(x.sid); }
        pendientes.delete(x.sid);
        if(vnEnVuelo.get(x.sid) === x.json) vnEnVuelo.delete(x.sid);
      });
      if(progreso) progreso(Math.min(todos.length, i + lote.length), todos.length);
      if(i + VN_LOTE < todos.length) await vnEspera(0);
    }
  }finally{
    pendientes.forEach(sid => vnEnVuelo.delete(sid));      // lo no confirmado ya no está «en vuelo»
    vnSubiendo = false;
    if(vnRepetir){ vnRepetir = false; scheduleCloudSync(); }
  }
}

/* El barrido lento: cada venta antigua se vuelve a mirar como mucho una vez por minuto, en trocitos. Así modificar
   una venta de hace un mes (anularla, pedir su factura) acaba en la nube sin que NADA recorra las 20.000 de golpe. */
function vnBarridoLento(){
  if(!vnListo || vnSubiendo || vnProcesando || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) return;
  const lista = DB.sales;
  if(!Array.isArray(lista) || !lista.length) return;
  const n = lista.length;
  const paso = Math.max(300, Math.ceil(n / (VN_BARRIDO_MS / 1000)));
  let sucias = 0;
  for(let k = 0; k < paso; k++){
    if(vnCursorBarrido >= n) vnCursorBarrido = 0;
    const s = lista[vnCursorBarrido++];
    if(!s || s.id == null) continue;
    const sid = String(s.id), base = vnNube.get(sid);
    if(base === undefined || vnSucias.has(sid)) continue;           // sin subir aún: la subida normal ya la recoge
    if(vnCanon(s) !== base){ vnSucias.add(sid); sucias++; }
  }
  if(sucias) scheduleCloudSync();
}

/* Para anotarLapidas: los ids que la nube de ventas tiene. Solo hace falta mirarlos cuando se quitó algo de la lista. */
function vnIdsParaLapidas(){
  const lista = DB.sales || [];
  if(vnUltimoArray === lista && lista.length >= vnUltimaLen) return [];
  return [...vnNube.keys()];
}

/* La bandera cambia por la nube (otro aparato la encendió o hizo marcha atrás). */
function vnAlCambiarBandera(antes, ahora){
  if(antes === ahora) return;
  if(lastSyncedSnapshot) delete lastSyncedSnapshot.sales;       // con la bandera apagada, el bloque antiguo vuelve a subirse entero
  scheduleCloudSync();
}

/* ------------------------------------------------------ activar / desactivar */
async function vnComprobarTodo(){
  const lista = DB.sales || [];
  let faltan = 0;
  for(let i = 0; i < lista.length; i += VN_TROZO){
    for(let j = i; j < Math.min(lista.length, i + VN_TROZO); j++){
      const s = lista[j];
      if(!s || s.id == null) continue;
      const sid = String(s.id);
      if(hayLapida('sales', sid)) continue;
      if(vnNube.get(sid) !== vnCanon(s)) faltan++;
    }
    await vnEspera(0);
  }
  return faltan;
}
async function vnSubirTodo(){
  const lista = DB.sales || [];
  const subir = [];
  for(let i = 0; i < lista.length; i += VN_TROZO){
    for(let j = i; j < Math.min(lista.length, i + VN_TROZO); j++){
      const s = lista[j];
      if(!s || typeof s !== 'object') continue;
      if(s.id == null) s.id = genId();
      const sid = String(s.id);
      if(hayLapida('sales', sid)) continue;
      const json = vnCanon(s);
      if(json && vnNube.get(sid) !== json) subir.push({sid, s, json});
    }
    vnMigracion.fase = 'leer'; vnMigracion.total = lista.length; vnMigracion.hechas = Math.min(lista.length, i + VN_TROZO); vnPintarTarjeta();
    await vnEspera(0);
  }
  vnMigracion.fase = 'subir'; vnMigracion.total = subir.length; vnMigracion.hechas = 0; vnPintarTarjeta();
  let ultimaPintura = 0;
  await vnSubirLotes(subir, [], (h, tot) => { vnMigracion.hechas = h; vnMigracion.total = tot; if(Date.now() - ultimaPintura > 300){ ultimaPintura = Date.now(); vnPintarTarjeta(); } });
}

function vnPuedeActivar(){
  if(!cloudRef || !vnRef) return gl({es:'La nube no está conectada.', ca:'El núvol no està connectat.', en:'The cloud is not connected.'});
  if(!socketConnected) return gl({es:'No hay conexión con la nube ahora mismo.', ca:'Ara no hi ha connexió amb el núvol.', en:'There is no connection to the cloud right now.'});
  if(!vnListo) return gl({es:'La nube aún está cargando; espera unos segundos.', ca:'El núvol encara està carregant; espera uns segons.', en:'The cloud is still loading; wait a few seconds.'});
  if(typeof isOwnerSession === 'function' && !isOwnerSession()) return gl({es:'Solo el propietario puede cambiarlo.', ca:'Només el propietari ho pot canviar.', en:'Only the owner can change this.'});
  return '';
}

async function vnActivar(){
  const motivo = vnPuedeActivar();
  if(motivo){ showToast(motivo); return; }
  if(vnMigracion) return;
  const ok = await confirmModal(gl({
    es: 'Las ventas pasarán a guardarse una a una en la nube: cobrar y sincronizar irá mucho más rápido con muchas ventas.\n\nANTES de seguir: todos tus aparatos (tablets, móviles, TPV) tienen que haber abierto la app con internet DESDE la última actualización. Un aparato sin actualizar dejará de ver las ventas de los demás.\n\nNo se borra ni se pierde nada y puedes volver atrás cuando quieras. ¿Activar ahora?',
    ca: 'Les vendes passaran a guardar-se una a una al núvol: cobrar i sincronitzar anirà molt més ràpid amb moltes vendes.\n\nABANS de continuar: tots els teus aparells (tauletes, mòbils, TPV) han d\'haver obert l\'app amb internet DES de l\'última actualització. Un aparell sense actualitzar deixarà de veure les vendes dels altres.\n\nNo s\'esborra ni es perd res i pots tornar enrere quan vulguis. Activar ara?',
    en: 'Sales will be stored one by one in the cloud: charging and syncing will be much faster with many sales.\n\nBEFORE you go on: all your devices (tablets, phones, POS) must have opened the app online SINCE the latest update. A device that is not updated will stop seeing the others\' sales.\n\nNothing is deleted or lost and you can go back whenever you want. Activate now?'}),
    {title: gl({es:'Ventas una a una', ca:'Vendes una a una', en:'Sales one by one'}), confirmLabel: gl({es:'Activar', ca:'Activar', en:'Activate'}), icon: 'ti-bolt'});
  if(!ok) return;
  vnMigracion = {fase: 'leer', hechas: 0, total: (DB.sales || []).length};
  vnPintarTarjeta();
  try{
    /* 1) Subir TODO lo que la nube de ventas no tenga, con la bandera todavía apagada: si algo falla a medias no se ha
          roto nada (lo subido a medias coincide con lo antiguo y los demás aparatos lo funden sin cambiar nada). */
    await vnSubirTodo();
    /* 2) Comprobar. Entre medias pudo llegar una venta de otro aparato: se repite hasta que no falte ninguna. */
    let faltan = await vnComprobarTodo();
    for(let intento = 0; faltan && intento < 3; intento++){ await vnSubirTodo(); faltan = await vnComprobarTodo(); }
    if(faltan) throw new Error('faltan ' + faltan + ' ventas en la nube');
    /* 3) Solo ahora se enciende. */
    DB.business.ventasPorMes = true;
    DB.business.ventasPorMesDesde = new Date().toISOString();
    vnViejoVisto = false;
    if(lastSyncedSnapshot) delete lastSyncedSnapshot.sales;
    saveDB();
    showToast(gl({es:'Hecho: las ventas ya se guardan una a una.', ca:'Fet: les vendes ja es guarden una a una.', en:'Done: sales are now stored one by one.'}));
  }catch(e){
    console.error('No se pudo activar las ventas por separado', e);
    showToast(gl({es:'No se ha podido completar. Todo sigue como estaba: no se ha perdido nada.', ca:'No s\'ha pogut completar. Tot continua com estava: no s\'ha perdut res.', en:'It could not be completed. Everything stays as it was: nothing was lost.'}));
  }finally{
    vnMigracion = null;
    vnPintarTarjeta();
    if(typeof renderMiNegocio === 'function' && document.getElementById('minegocio-content')) renderMiNegocio();
  }
}

async function vnDesactivar(){
  if(typeof isOwnerSession === 'function' && !isOwnerSession()) return;
  const ok = await confirmModal(gl({
    es: 'Las ventas volverán a guardarse juntas, como antes. Es seguro: tus aparatos conservan todas las ventas y se vuelven a subir completas. ¿Volver al sistema anterior?',
    ca: 'Les vendes tornaran a guardar-se juntes, com abans. És segur: els teus aparells conserven totes les vendes i es tornen a pujar senceres. Tornar al sistema anterior?',
    en: 'Sales will be stored together again, as before. It is safe: your devices keep every sale and they are uploaded in full again. Go back to the previous system?'}),
    {title: gl({es:'Volver al sistema anterior', ca:'Tornar al sistema anterior', en:'Back to the previous system'}), icon: 'ti-arrow-back-up'});
  if(!ok) return;
  DB.business.ventasPorMes = false;
  if(lastSyncedSnapshot) delete lastSyncedSnapshot.sales;
  saveDB();
  if(typeof renderMiNegocio === 'function' && document.getElementById('minegocio-content')) renderMiNegocio();
}

/* --------------------------------------------------------- aparatos y tarjeta */
function vnRegistrarAparato(){
  try{
    if(!vnRef) return;
    const id = getOrCreateDeviceId();
    vnRef.parent.child(VN_CLAVE_LS_APARATOS + '/' + id).set({ts: Date.now(), v: (typeof GG_BUILD !== 'undefined' ? String(GG_BUILD) : '')}).catch(() => {});
  }catch(e){}
}
async function vnLeerAparatos(){
  try{
    if(!vnRef) return null;
    const snap = await vnRef.parent.child(VN_CLAVE_LS_APARATOS).once('value');
    const v = snap.val() || {};
    const hace30 = Date.now() - 30 * 86400000;
    return Object.keys(v).filter(k => v[k] && v[k].ts > hace30).length;
  }catch(e){ return null; }
}
function vnPintarTarjeta(){
  const el = document.getElementById('vn-tarjeta');
  if(el) el.innerHTML = vnTarjetaInterior();
}
function vnTarjetaInterior(){
  const activo = vnActivo();
  const n = (DB.sales || []).length;
  if(vnMigracion){
    const txt = vnMigracion.fase === 'leer'
      ? gl({es:'Preparando ventas…', ca:'Preparant vendes…', en:'Preparing sales…'})
      : gl({es:'Subiendo ventas…', ca:'Pujant vendes…', en:'Uploading sales…'});
    const pct = vnMigracion.total ? Math.round(100 * vnMigracion.hechas / vnMigracion.total) : 0;
    return `<p style="font-size:13px;margin-bottom:8px">${txt} ${vnMigracion.hechas} / ${vnMigracion.total} (${pct} %)</p>
      <div style="height:8px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--olive)"></div></div>
      <p class="txt-xs" style="color:var(--muted);margin-top:8px">${gl({es:'No cierres la app hasta que termine.', ca:'No tanquis l\'app fins que acabi.', en:'Do not close the app until it finishes.'})}</p>`;
  }
  const aviso = (activo && vnViejoVisto) ? `<div class="manual-warning" style="margin:10px 0"><i class="ti ti-alert-triangle"></i>${gl({es:'Hay un aparato con la versión antigua que sigue vendiendo. Ábrelo con internet para actualizarlo: mientras tanto no verá las ventas de los demás.', ca:'Hi ha un aparell amb la versió antiga que continua venent. Obre\'l amb internet per actualitzar-lo: mentrestant no veurà les vendes dels altres.', en:'A device on the old version is still making sales. Open it online to update it: until then it will not see the others\' sales.'})}</div>` : '';
  return `<p style="font-size:13px;color:var(--muted);margin-bottom:10px">${gl({
      es: activo ? 'Activado: cada venta se guarda por separado en la nube y cobrar es rápido aunque tengas muchas ventas.' : 'Con muchas ventas (más de unas 3.000), cobrar y sincronizar puede ir lento. Guardarlas una a una en la nube lo arregla.',
      ca: activo ? 'Activat: cada venda es guarda per separat al núvol i cobrar és ràpid encara que tinguis moltes vendes.' : 'Amb moltes vendes (més d\'unes 3.000), cobrar i sincronitzar pot anar lent. Guardar-les una a una al núvol ho arregla.',
      en: activo ? 'Active: each sale is stored separately in the cloud and charging stays fast even with many sales.' : 'With many sales (over about 3,000), charging and syncing can feel slow. Storing them one by one in the cloud fixes it.'})}
    <span class="txt-xs" style="display:block;margin-top:4px">${gl({es:'Ventas guardadas en este aparato', ca:'Vendes guardades en aquest aparell', en:'Sales stored on this device'})}: ${n}</span></p>
    ${aviso}
    ${activo
      ? `<button class="btn btn-sm" onclick="vnDesactivar()"><i class="ti ti-arrow-back-up"></i> ${gl({es:'Volver al sistema anterior', ca:'Tornar al sistema anterior', en:'Back to the previous system'})}</button>`
      : `<p class="txt-xs" style="color:var(--muted);margin-bottom:8px"><i class="ti ti-device-tablet"></i> ${gl({es:'Aparatos que ya tienen la versión nueva', ca:'Aparells que ja tenen la versió nova', en:'Devices already on the new version'})}: <strong id="vn-aparatos">…</strong> — ${gl({es:'tienen que estar TODOS (tablets, móviles, TPV) antes de activar.', ca:'hi han d\'estar TOTS (tauletes, mòbils, TPV) abans d\'activar.', en:'ALL of them (tablets, phones, POS) must be there before you activate.'})}</p>
         <button class="btn btn-sm btn-primary" onclick="vnActivar()"><i class="ti ti-bolt"></i> ${gl({es:'Guardar las ventas una a una', ca:'Guardar les vendes una a una', en:'Store sales one by one'})}</button>`}`;
}
/* La tarjeta de Mi Negocio → Datos (js/app.js la incluye). Los aparatos se cuentan al abrirla. */
function vnTarjetaHtml(){
  setTimeout(() => {
    vnLeerAparatos().then(c => { const e = document.getElementById('vn-aparatos'); if(e) e.textContent = c === null ? '?' : String(c); });
  }, 50);
  return `<hr style="border:none;border-top:1px solid var(--border);margin:16px 0">
    <p style="font-size:13px;font-weight:700;margin-bottom:6px"><i class="ti ti-bolt"></i> ${gl({es:'Cobros rápidos con muchas ventas', ca:'Cobraments ràpids amb moltes vendes', en:'Fast charging with many sales'})}</p>
    <div id="vn-tarjeta">${vnTarjetaInterior()}</div>`;
}

/* Un aparato que se cierra no debe dejar ventas por subir sin intentarlo. */
if(typeof document !== 'undefined'){
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden' && vnListo && vnActivo() && typeof flushCloudSync === 'function') flushCloudSync(); });
}
