/* ============================================================
   MICRO-INTERACCIONES — números que cuentan, barras que crecen.
   Se aplica automáticamente tras cada render de vista o pestaña,
   sin tocar la lógica de negocio. Respeta prefers-reduced-motion.
   ============================================================ */
const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function parseDisplayNumber(text){
  if(!text) return null;
  const raw = text.trim();
  if(raw === '—' || raw === '-' || raw === '') return null;
  const isMoney = raw.indexOf('€') !== -1;
  const isPercent = raw.indexOf('%') !== -1;
  let clean = raw.replace(/[€%\s]/g,'');
  const neg = clean.trim().charAt(0) === '-';
  clean = clean.replace(/\./g,'').replace(',', '.');
  const val = parseFloat(clean);
  if(!isFinite(val)) return null;
  return {value: neg && val > 0 ? -val : val, isMoney, isPercent};
}

function animateKpiNumbers(root){
  const scope = root || document;
  const els = scope.querySelectorAll('.kpi .value:not([data-cu]), .ge-kpi .val:not([data-cu]), .kpi-mini .v:not([data-cu])');
  els.forEach(function(el){
    el.setAttribute('data-cu','1');
    const parsed = parseDisplayNumber(el.textContent);
    if(!parsed || REDUCE_MOTION) return;
    const target = parsed.value;
    const startText = el.textContent;
    const start = performance.now();
    const duration = 600;
    function step(now){
      const p = Math.min(1, (now-start)/duration);
      const eased = 1 - Math.pow(1-p, 3);
      const cur = target * eased;
      if(parsed.isMoney && typeof fmtMoney === 'function') el.textContent = fmtMoney(cur);
      else if(parsed.isPercent) el.textContent = (cur<0?'':'')+cur.toFixed(1)+'%';
      else el.textContent = Math.round(cur).toLocaleString(localeActual());
      if(p<1) requestAnimationFrame(step);
      else el.textContent = startText; // asegura el formato exacto original al terminar
    }
    requestAnimationFrame(step);
  });
}

function animateBarFills(root){
  const scope = root || document;
  const els = scope.querySelectorAll('.bar-fill:not([data-cu]), .te-bar-fill:not([data-cu])');
  els.forEach(function(el){
    el.setAttribute('data-cu','1');
    if(REDUCE_MOTION) return;
    const isWidthBar = el.classList.contains('te-bar-fill');
    const prop = isWidthBar ? 'width' : 'height';
    const target = el.style[prop];
    if(!target) return;
    el.style[prop] = '0%';
    void el.offsetHeight; // fuerza reflow
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){ el.style[prop] = target; });
    });
  });
}

function runPolishAnimations(root){
  animateKpiNumbers(root);
  animateBarFills(root);
}

/* ============================================================
   ¿HAY UNA VERSIÓN NUEVA PUBLICADA?
   ============================================================
   El service worker sirve ahora la copia guardada del dispositivo, que es lo
   que hace que la app arranque al instante y no gaste 4 MB de tráfico en cada
   apertura. A cambio, alguien tiene que enterarse de que hay algo nuevo: eso
   se hace aquí, preguntando por `version.json` — un fichero de 50 bytes.

   Y se AVISA, no se actualiza a la fuerza: recargar por su cuenta a media
   comanda, o mientras alguien está escribiendo una ficha, sería peor que la
   propia versión vieja. El hostelero pulsa cuando le va bien. */
const GG_ULTIMA_COMPROBACION_LS = 'gastrogoan_version_comprobada';
const GG_ESPERA_ENTRE_COMPROBACIONES = 6 * 60 * 60 * 1000; // 6 h

async function comprobarVersionPublicada(forzar){
  if(typeof GG_BUILD === 'undefined') return null;
  if(!forzar){
    const ultima = parseInt(localStorage.getItem(GG_ULTIMA_COMPROBACION_LS) || '0', 10);
    if(Date.now() - ultima < GG_ESPERA_ENTRE_COMPROBACIONES) return null;
  }
  try{
    const r = await fetch('version.json?t=' + Date.now(), {cache: 'no-store'});
    if(!r.ok) return null;
    const j = await r.json();
    localStorage.setItem(GG_ULTIMA_COMPROBACION_LS, String(Date.now()));
    if(j && j.build && j.build !== GG_BUILD){
      /* Si es seguro, se actualiza SOLA y ya está: nadie tiene por qué
         pulsar nada para tener la última versión. Solo se pregunta cuando
         interrumpir sería peor que esperar (ver esSeguroActualizarSolo). */
      if(esSeguroActualizarSolo()) aplicarVersionNueva(true);
      else mostrarAvisoVersionNueva(j.build);
      return j.build;
    }
  }catch(e){ /* sin conexión: se mira otro día, no es un error que contar */ }
  return null;
}

/* ¿Se puede recargar sin fastidiar a nadie?

   Recargar por las buenas a media comanda, con un modal abierto o mientras
   alguien escribe una ficha, es peor que la propia versión vieja: se pierde
   lo que estuviera a medias y el cocinero no entiende qué ha pasado. Los
   datos guardados no corren peligro —viven en IndexedDB y en la nube—, pero
   lo que está a medio escribir en pantalla, sí.

   Se considera seguro solo en el momento en que la app se acaba de abrir y
   nadie ha tocado nada todavía: es cuando no hay nada que perder. En
   cualquier otro caso se pregunta con la barra, como hasta ahora. */
// En `window` y no como variable suelta: así se puede consultar y forzar
// desde fuera (las pruebas necesitan simular las dos situaciones).
if(typeof window !== 'undefined'){
  window.ggHuboInteraccion = false;
  ['pointerdown','keydown','touchstart'].forEach(ev =>
    window.addEventListener(ev, () => { window.ggHuboInteraccion = true; }, {once: true, passive: true}));
}
function esSeguroActualizarSolo(){
  if(typeof window !== 'undefined' && window.ggHuboInteraccion) return false;
  const overlay = document.getElementById('modal-overlay');
  if(overlay && overlay.classList.contains('active')) return false;
  /* El alta a medias sí bloquea (selector de negocios, asistentes). La
     pantalla de identificarse NO: es el mejor momento posible para
     actualizar, antes de que nadie empiece a trabajar. Y si alguien está
     tecleando su PIN, ya lo para la comprobación de interacción. */
  const selector = document.getElementById('business-select-screen');
  if(selector && !selector.classList.contains('hide')) return false;
  if(['license-gate','firebase-gate','netlify-gate'].some(id => document.getElementById(id))) return false;
  /* Ni nada escrito sin guardar. Solo cuentan los campos que se están
     VIENDO: la app tiene decenas de formularios en pantallas ocultas con
     valores dentro, y mirarlos todos hacía que nunca fuera "seguro". */
  const escrito = [...document.querySelectorAll('input, textarea')].some(el => {
    if(el.type === 'hidden' || el.readOnly || el.disabled) return false;
    // getClientRects es la comprobación fiable de "se está viendo":
    // offsetParent devuelve null para los elementos de posición fija, que sí
    // se ven, y dejaba pasar como seguro algo escrito a la vista.
    if(!el.getClientRects().length) return false;
    return (el.value || '').trim() !== '';
  });
  if(escrito) return false;
  return true;
}

function mostrarAvisoVersionNueva(build){
  if(document.getElementById('gg-version-nueva')) return;
  const barra = document.createElement('div');
  barra.id = 'gg-version-nueva';
  /* Separada del borde y con hueco por debajo: pegada abajo del todo se
     mezclaba con la barra del navegador de la tablet y quedaba aplastada.
     `env(safe-area-inset-bottom)` es para los móviles con barra de gestos,
     donde el borde inferior no es el borde de la pantalla. */
  barra.style.cssText = [
    'position:fixed', 'left:12px', 'right:12px',
    'bottom:calc(12px + env(safe-area-inset-bottom, 0px))',
    // Por encima de CUALQUIER capa, incluidas las pantallas de bloqueo que
    // ocupan toda la ventana: si el aviso de actualizar queda debajo de una
    // de ellas, ese aparato no se puede actualizar nunca — que es justo lo
    // que pasó con la pantalla de licencia desactivada.
    'z-index:100002', 'background:var(--brand-orange,#D97C3F)', 'color:#fff',
    'padding:14px 18px', 'border-radius:12px',
    'box-shadow:0 6px 24px rgba(0,0,0,.28)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'gap:10px 14px', 'flex-wrap:wrap', 'font-size:14px', 'font-weight:600',
    'max-width:760px', 'margin:0 auto',
  ].join(';');
  barra.innerHTML = `<span style="flex:1 1 240px;min-width:0"><i class="ti ti-download"></i> ${t('app.newVersion').replace('${fecha}', escapeHtml(build))}</span>`
    + `<span style="display:flex;gap:8px;flex-wrap:wrap;flex:0 0 auto">`
    + `<button class="btn" style="background:#fff;color:var(--brand-orange,#D97C3F);border:none;min-height:44px;padding:10px 18px;font-weight:700;white-space:nowrap" onclick="aplicarVersionNueva()">${t('app.newVersionBtn')}</button>`
    + `<button class="btn" style="background:none;border:1px solid rgba(255,255,255,.6);color:#fff;min-height:44px;padding:10px 14px;white-space:nowrap" onclick="document.getElementById('gg-version-nueva').remove()">${t('app.newVersionLater')}</button>`
    + `</span>`;
  document.body.appendChild(barra);
}

// Trae la versión nueva y recarga. Los datos no se tocan: viven en IndexedDB
// y en la nube, no en la copia del programa.
async function aplicarVersionNueva(silencioso){
  const btn = document.querySelector('#gg-version-nueva button');
  if(btn){ btn.disabled = true; btn.textContent = t('app.newVersionWorking'); }
  if(silencioso) console.info('GastroGoan: actualizando a la versión nueva');
  try{
    await fetch('./?gg-actualizar=1', {cache: 'reload'});
  }catch(e){ /* si falla, la recarga de abajo lo intenta igualmente */ }
  location.reload();
}

// Al arrancar, sin prisa: lo primero es que la app esté usable.
if(typeof window !== 'undefined'){
  window.addEventListener('load', () => setTimeout(() => comprobarVersionPublicada(), 4000));
}

/* ────────────────────────────────────────────────────────────────────────
   LA PUESTA A PUNTO

   Un cliente termina de configurar la nube —el único paso obligatorio— y se
   queda mirando la app sin saber qué le toca. La configuración completa son
   veinte minutos bien llevados, pero solo si alguien te va diciendo lo que
   falta; si no, se abandona a medias y el escandallo sale a cero, que es la
   peor primera impresión posible de la herramienta que le has vendido.

   Tres decisiones de diseño, y las tres importan:

   · NO HAY CRUCES. Una cruz roja se lee como "algo ha ido mal", y esto es lo
     primero que ve alguien que acaba de pagar. Lo pendiente es un círculo
     vacío que se convierte en tick.

   · LO IMPRESCINDIBLE VA APARTE DE LO OPCIONAL. El cobro con tarjeta o los
     correos de confirmación no los quiere todo el mundo: si contaran para el
     progreso, un restaurante que no los usa nunca llegaría al 100% y el panel
     se convertiría en ruido que se aprende a ignorar. Solo cuenta lo que hace
     falta para trabajar.

   · SE CALCULA, NO SE GUARDA. Nada de marcar "personal: hecho" en un campo:
     si el cliente borra a todos sus empleados, el panel le estaría mintiendo.
     Se mira el dato de verdad cada vez que se pinta.
   ──────────────────────────────────────────────────────────────────────── */
const PUESTA_OCULTA_LS = 'gastrogoan_puesta_oculta';
// Plegada de entrada: '1' solo si el hostelero la ha desplegado él.
const PUESTA_ABIERTA_LS = 'gastrogoan_puesta_abierta';

/* Ojo: todo negocio NACE con un horario por defecto, así que "tiene horario"
   sale que sí desde el minuto uno y la tarea aparecería hecha sin que nadie
   la haya tocado. Lo que hay que detectar es si lo ha REVISADO — o sea, si
   sigue siendo exactamente el de fábrica. */
function ppHorarioRevisado(b){
  try{
    if(typeof defaultHorario !== 'function') return true;
    return JSON.stringify((b && b.horario) || null) !== JSON.stringify(defaultHorario());
  }catch(e){ return true; }
}
// Los 275 artículos del catálogo se siembran a precio CERO. Así que la tarea
// no es "dar de alta ingredientes" —ya los tiene— sino ponerles el precio al
// que los compra él, que es lo que hace que el escandallo deje de salir a 0.
function ppIngredientesConPrecio(){
  return (DB.ingredients || []).filter(i => parseFloat(i.packPrice) > 0 || parseFloat(i.price) > 0).length;
}
function ppPlatosEnCarta(){
  return (DB.cartas || []).reduce((n, c) =>
    n + (c.secciones || []).reduce((m, s) => m + (s.platos || []).length, 0), 0);
}

function puestaAPuntoTareas(){
  const b = DB.business || {};
  const conPrecio = ppIngredientesConPrecio();
  const platos = ppPlatosEnCarta();
  const empleados = (DB.employees || []).length;
  const mesas = (DB.tables || []).length;
  const recetas = (DB.recipes || []).filter(r => !r.isBase).length;

  const esencial = [
    {id:'negocio', hecho: !!(b.name || '').trim(), icono:'ti-building-store',
     ir: "currentFolder='gestion'; navigate('minegocio')"},
    {id:'horario', hecho: ppHorarioRevisado(b), icono:'ti-clock-hour-4',
     ir: "currentFolder='gestion'; navigate('minegocio')"},
    /* ⚠️ Basta con UNO, como todas las demás. Antes pedía cinco y el dueño lo
       contó como que la tarea "no se iba nunca": pones precio a un ingrediente,
       vuelves al inicio y sigue pendiente igual, sin decirte que faltan cuatro.
       Esto es un asistente que señala por dónde empezar, no un examen: en
       cuanto sabes poner un precio, ya sabes hacerlo con los demás. */
    {id:'precios', hecho: conPrecio > 0, icono:'ti-tag', dato: conPrecio,
     ir: "currentFolder='cocina'; navigate('megalista')"},
    {id:'recetas', hecho: recetas > 0, icono:'ti-calculator', dato: recetas,
     ir: "currentFolder='cocina'; navigate('escandallo')"},
    {id:'carta', hecho: platos > 0, icono:'ti-book-2', dato: platos,
     ir: "currentFolder='cocina'; navigate('carta')"},
    {id:'personal', hecho: empleados > 0, icono:'ti-users', dato: empleados,
     ir: "currentFolder='cocina'; navigate('horarios')"},
    {id:'mesas', hecho: mesas > 0, icono:'ti-layout-grid', dato: mesas,
     ir: "currentFolder='sala'; navigate('tpv')"},
  ];

  /* Lo opcional no lleva tick ni cuenta para el progreso: no es que falte, es
     que puede que este negocio no lo quiera. Se enseña para que sepa que
     existe, con una sola línea de para qué sirve. */
  const opcional = [
    {id:'tarjeta', icono:'ti-credit-card', ir: "currentFolder='gestion'; navigate('minegocio')"},
    {id:'email',   icono:'ti-mail',        ir: "currentFolder='gestion'; navigate('minegocio')"},
    {id:'online',  icono:'ti-world',       ir: "currentFolder='gestion'; navigate('minegocio')"},
    {id:'gastos',  icono:'ti-coin',        ir: "currentFolder='gestion'; navigate('economia')"},
  ];

  const hechas = esencial.filter(x => x.hecho).length;
  return {esencial, opcional, hechas, total: esencial.length,
          completa: hechas === esencial.length};
}

// Solo el propietario, y solo mientras quede algo por hacer. Un empleado no
// tiene que ver la puesta a punto del negocio, y un panel que no se va nunca
// deja de leerse.
function puestaAPuntoVisible(){
  const s = (typeof getAccessSession === 'function') ? getAccessSession() : null;
  if(!s || s.type !== 'owner') return false;
  try{ if(localStorage.getItem(PUESTA_OCULTA_LS) === '1') return false; }catch(e){}
  return !puestaAPuntoTareas().completa;
}

function renderPuestaAPunto(){
  const caja = document.getElementById('home-puesta');
  if(!caja) return;
  if(!puestaAPuntoVisible()){ caja.innerHTML = ''; caja.style.display = 'none'; return; }
  caja.style.display = 'block';

  const {esencial, opcional, hechas, total} = puestaAPuntoTareas();
  const pct = Math.round(hechas / total * 100);

  const linea = tarea => {
    // El contador va DENTRO de la línea de la descripción: en un renglón
    // aparte partía la tarjeta en tiras y se leía peor que sin él.
    const cuantos = (tarea.dato != null && !tarea.hecho)
      ? `<span class="pp-dato">${escapeHtml(t('pp.' + tarea.id + '.dato').replace('${n}', tarea.dato))}</span> · ` : '';
    return `
      <li class="pp-item${tarea.hecho ? ' pp-hecho' : ''}">
        <span class="pp-marca">${tarea.hecho
          ? '<i class="ti ti-circle-check"></i>'
          : '<i class="ti ti-circle"></i>'}</span>
        <span class="pp-texto">
          <strong>${escapeHtml(t('pp.' + tarea.id + '.titulo'))}</strong>
          <small>${cuantos}${escapeHtml(t('pp.' + tarea.id + '.desc'))}</small>
        </span>
        ${tarea.hecho ? '' : `<button class="btn btn-sm" onclick="${tarea.ir}">${escapeHtml(t('pp.go'))}</button>`}
      </li>`;
  };

  const lineaOpcional = tarea => `
      <li class="pp-item pp-opcional">
        <span class="pp-marca"><i class="ti ${tarea.icono}"></i></span>
        <span class="pp-texto">
          <strong>${escapeHtml(t('pp.' + tarea.id + '.titulo'))}</strong>
          <small>${escapeHtml(t('pp.' + tarea.id + '.desc'))}</small>
        </span>
        <button class="btn btn-sm" onclick="${tarea.ir}">${escapeHtml(t('pp.activate'))}</button>
      </li>`;

  /* PLEGADA de entrada, y es lo que pidió el dueño: nada más entrar, lo
     primero que se ve tiene que ser SU negocio, no una lista de deberes.
     Pero se deja la cabecera con la barra de progreso a la vista: un panel
     plegado del todo, sin ninguna señal de qué hay dentro, no lo abre nadie —
     y entonces vuelve a ser lo que era antes de existir, un cliente que no
     sabe qué le falta. Así se ve de un vistazo cuánto lleva, y se despliega
     si quiere el detalle.
     Cada dispositivo recuerda cómo lo dejó. */
  const abierta = (() => { try{ return localStorage.getItem(PUESTA_ABIERTA_LS) === '1'; }catch(e){ return false; } })();
  caja.innerHTML = `
    <div class="pp-card${abierta ? '' : ' pp-plegada'}">
      <div class="pp-cab">
        <div class="pp-cab-txt" onclick="alternarPuestaAPunto()" style="cursor:pointer;flex:1;min-width:0">
          <!-- La flecha tiene que quedarse SIEMPRE junto al texto, nunca caer
               a su propia línea: "Puesta a punto de tu negocio" es largo, y en
               un móvil estrecho el texto solo se envolvía y empujaba la
               flecha abajo, descolgada y sola. -->
          <h2 style="display:flex;align-items:center;gap:6px;flex-wrap:nowrap"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(t('pp.title'))}</span> <i class="ti ti-chevron-${abierta ? 'up' : 'down'}" style="flex:none;font-size:16px;opacity:.6"></i></h2>
          <p>${escapeHtml(abierta ? t('pp.subtitle') : t('pp.progress').replace('${h}', hechas).replace('${t}', total))}</p>
        </div>
        <button class="pp-cerrar" onclick="ocultarPuestaAPunto()" title="${escapeHtml(t('pp.hide'))}">&times;</button>
      </div>
      <div class="pp-barra"><span style="width:${pct}%"></span></div>
      ${abierta ? `
      <div class="pp-progreso">${escapeHtml(t('pp.progress').replace('${h}', hechas).replace('${t}', total))}</div>
      <ul class="pp-lista">${esencial.map(linea).join('')}</ul>
      <details class="pp-mas">
        <summary>${escapeHtml(t('pp.optionalTitle'))}</summary>
        <ul class="pp-lista">${opcional.map(lineaOpcional).join('')}</ul>
      </details>` : ''}
    </div>`;
}

// Plegar y desplegar. Se recuerda por dispositivo, no en DB.business: es una
// preferencia de quien mira esta pantalla, no un dato del negocio.
function alternarPuestaAPunto(){
  try{
    const abierta = localStorage.getItem(PUESTA_ABIERTA_LS) === '1';
    localStorage.setItem(PUESTA_ABIERTA_LS, abierta ? '0' : '1');
  }catch(e){}
  renderPuestaAPunto();
}

/* Esconderla es del cliente, no nuestro: si le estorba, se quita y no vuelve.
   Se avisa de dónde encontrarla, porque un panel que desaparece para siempre
   sin decir dónde estaba es peor que no tenerlo. */
function ocultarPuestaAPunto(){
  try{ localStorage.setItem(PUESTA_OCULTA_LS, '1'); }catch(e){}
  renderPuestaAPunto();
  if(typeof showToast === 'function') showToast(t('pp.hidden'), 6000);
}
function mostrarPuestaAPunto(){
  try{ localStorage.removeItem(PUESTA_OCULTA_LS); }catch(e){}
  if(typeof navigate === 'function') navigate('home');
  renderPuestaAPunto();
}
