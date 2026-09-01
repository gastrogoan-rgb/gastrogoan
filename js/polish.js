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
    'z-index:99998', 'background:var(--brand-orange,#D97C3F)', 'color:#fff',
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
