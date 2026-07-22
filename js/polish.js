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
