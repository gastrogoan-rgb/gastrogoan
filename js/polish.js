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
      else el.textContent = Math.round(cur).toLocaleString('es-ES');
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
    if(j && j.build && j.build !== GG_BUILD){ mostrarAvisoVersionNueva(j.build); return j.build; }
  }catch(e){ /* sin conexión: se mira otro día, no es un error que contar */ }
  return null;
}

function mostrarAvisoVersionNueva(build){
  if(document.getElementById('gg-version-nueva')) return;
  const barra = document.createElement('div');
  barra.id = 'gg-version-nueva';
  barra.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99998;background:var(--brand-orange,#D97C3F);color:#fff;'
    + 'padding:12px 16px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;font-size:14px;font-weight:600';
  barra.innerHTML = `<span><i class="ti ti-download"></i> ${t('app.newVersion').replace('${fecha}', escapeHtml(build))}</span>`
    + `<button class="btn" style="background:#fff;color:var(--brand-orange,#D97C3F);border:none;min-height:44px;padding:10px 18px;font-weight:700" onclick="aplicarVersionNueva()">${t('app.newVersionBtn')}</button>`
    + `<button class="btn" style="background:none;border:1px solid rgba(255,255,255,.6);color:#fff;min-height:44px;padding:10px 14px" onclick="document.getElementById('gg-version-nueva').remove()">${t('app.newVersionLater')}</button>`;
  document.body.appendChild(barra);
}

// Trae la versión nueva y recarga. Los datos no se tocan: viven en IndexedDB
// y en la nube, no en la copia del programa.
async function aplicarVersionNueva(){
  const btn = document.querySelector('#gg-version-nueva button');
  if(btn){ btn.disabled = true; btn.textContent = t('app.newVersionWorking'); }
  try{
    await fetch('./?gg-actualizar=1', {cache: 'reload'});
  }catch(e){ /* si falla, la recarga de abajo lo intenta igualmente */ }
  location.reload();
}

// Al arrancar, sin prisa: lo primero es que la app esté usable.
if(typeof window !== 'undefined'){
  window.addEventListener('load', () => setTimeout(() => comprobarVersionPublicada(), 4000));
}
