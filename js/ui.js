// Ventana de impresión con un diseño consistente compartido por todos los
// informes "de oficina" de la app (cierre de caja, pedidos a proveedor,
// protocolos de limpieza, distribución del trabajo...) — antes cada
// función montaba su propio HTML suelto, casi siempre texto monoespaciado
// sin tabla ni cabecera, con un aspecto distinto en cada sitio. Un mismo
// bloque de estilos para todos da un aspecto consistente y más cuidado sin
// tener que repetirlo función por función.
function printReportWindow(title, bodyHtml, opts={}){
  const win = window.open('', '_blank', opts.winSize || 'width=680,height=760');
  if(!win){ showToast(t('msg.allowPopupsPrint')); return; }
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(title)}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:28px;max-width:720px;margin:0 auto;font-size:13px;line-height:1.45}
      h1{font-size:19px;margin:0 0 2px;font-weight:700}
      .pr-subtitle{font-size:12px;color:#666;margin-bottom:4px}
      .pr-meta{font-size:12px;color:#555;margin:2px 0}
      h2{font-size:13px;text-transform:uppercase;letter-spacing:.4px;color:#444;border-bottom:1px solid #ddd;padding-bottom:4px;margin:22px 0 8px}
      table{width:100%;border-collapse:collapse;margin-bottom:6px}
      th,td{padding:5px 6px;text-align:left;font-size:12.5px;vertical-align:top}
      th{background:#f5f5f3;font-weight:600;border-bottom:1px solid #ddd;text-transform:uppercase;font-size:10.5px;color:#666;letter-spacing:.3px}
      td{border-bottom:1px solid #eee}
      .pr-num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
      .pr-total-row td{font-weight:700;border-top:2px solid #111;border-bottom:none;padding-top:8px}
      .pr-note{font-size:12px;color:#666;font-style:italic;margin-top:4px}
      .pr-empty{font-size:12px;color:#999;font-style:italic;padding:6px 0}
      .pr-divider{border-top:1px dashed #bbb;margin:14px 0}
      ul.pr-steps{padding-left:20px;margin:0}
      ul.pr-steps li{margin-bottom:6px}
      @media print{body{padding:10mm}}
    </style>
    </head><body>${bodyHtml}</body></html>`);
  win.document.close();
  win.print();
}
// Cabecera común (nombre del negocio + título del informe + subtítulo
// opcional) para reutilizar en todos los printX() que usan printReportWindow.
function printReportHeaderHtml(title, subtitle){
  return `
    <div class="pr-meta" style="font-size:11.5px;color:#888;text-transform:uppercase;letter-spacing:.5px">${escapeHtml((DB.business&&DB.business.name)||'GastroGoan')}</div>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<div class="pr-subtitle">${subtitle}</div>` : ''}
  `;
}

/* ============== Tour virtual de bienvenida ==============
   Cada paso, además del texto, indica a qué pantalla ir (folder/view) y
   qué elemento resaltar (target), para que el tour navegue de verdad por
   la app y muestre en vivo lo que está explicando — no son diapositivas
   sueltas, es la app real usándose sola delante del usuario. "phase"
   agrupa los pasos en Introducción/Cocina/Sala/Gestión/Ayuda para la
   mini-navegación por fases de la burbuja (ver TOUR_PHASES). */
const TOUR_PHASES = [
  {key:'intro',   labelKey:'tour.phase.intro',   icon:'ti-confetti'},
  {key:'cocina',  labelKey:'tour.phase.cocina',  icon:'ti-tools-kitchen-2'},
  {key:'sala',    labelKey:'tour.phase.sala',    icon:'ti-device-desktop'},
  {key:'gestion', labelKey:'tour.phase.gestion', icon:'ti-layout-dashboard'},
  {key:'ayuda',   labelKey:'tour.phase.ayuda',   icon:'ti-lifebuoy'},
];
const TOUR_STEPS = [
  {icon:'ti-confetti', titleKey:'tour.s1.title', descKey:'tour.s1.desc', phase:'intro'},

  // ---- Cómo entra cada persona (pantallas de login, en modo demo) ----
  {icon:'ti-fingerprint', titleKey:'tour.s34.title', descKey:'tour.s34.desc', screen:'access-choice', target:'.access-choice-list', phase:'intro'},
  {icon:'ti-users', titleKey:'tour.s35.title', descKey:'tour.s35.desc', screen:'access-employee', target:'.access-card', phase:'intro'},
  {icon:'ti-user-shield', titleKey:'tour.s36.title', descKey:'tour.s36.desc', screen:'access-owner', target:'.access-card', phase:'intro'},
  {icon:'ti-building-store', titleKey:'tour.s37.title', descKey:'tour.s37.desc', screen:'business-select', target:'.bs-box', phase:'intro'},

  {icon:'ti-layout-grid', titleKey:'tour.s2.title', descKey:'tour.s2.desc', target:'.folder-grid', phase:'intro'},

  // ---- Cocina ----
  {icon:'ti-tools-kitchen-2', titleKey:'tour.s13.title', descKey:'tour.s13.desc', folder:'cocina', view:'carta', phase:'cocina'},
  {icon:'ti-download', titleKey:'tour.s14.title', descKey:'tour.s14.desc', folder:'cocina', view:'carta', phase:'cocina'},
  {icon:'ti-list-details', titleKey:'tour.s15.title', descKey:'tour.s15.desc', folder:'cocina', view:'carta', phase:'cocina'},
  {icon:'ti-building-factory-2', titleKey:'tour.s19.title', descKey:'tour.s19.desc', folder:'cocina', view:'megalista', phase:'cocina'},
  {icon:'ti-calculator', titleKey:'tour.s20.title', descKey:'tour.s20.desc', folder:'cocina', view:'escandallo', phase:'cocina'},
  {icon:'ti-clipboard-text', titleKey:'tour.s42.title', descKey:'tour.s42.desc', folder:'cocina', view:'fichas', phase:'cocina'},
  {icon:'ti-package', titleKey:'tour.s21.title', descKey:'tour.s21.desc', folder:'cocina', view:'stock', phase:'cocina'},
  {icon:'ti-truck-delivery', titleKey:'tour.s43.title', descKey:'tour.s43.desc', folder:'cocina', view:'pedidos', phase:'cocina'},
  {icon:'ti-clipboard-list', titleKey:'tour.s22.title', descKey:'tour.s22.desc', folder:'cocina', view:'horarios', phase:'cocina'},
  {icon:'ti-users', titleKey:'tour.s28.title', descKey:'tour.s28.desc', folder:'cocina', view:'horarios', phase:'cocina'},
  {icon:'ti-list-check', titleKey:'tour.s44.title', descKey:'tour.s44.desc', folder:'cocina', view:'distribucion', phase:'cocina'},
  {icon:'ti-spray', titleKey:'tour.s45.title', descKey:'tour.s45.desc', folder:'cocina', view:'limpieza', phase:'cocina'},
  {icon:'ti-bell-ringing', titleKey:'tour.s8.title', descKey:'tour.s8.desc', folder:'cocina', view:'comandascocina', phase:'cocina'},

  // ---- Sala ----
  {icon:'ti-device-desktop', titleKey:'tour.s46.title', descKey:'tour.s46.desc', folder:'sala', target:'#folder-modules', phase:'sala'},
  {icon:'ti-device-desktop', titleKey:'tour.s3.title', descKey:'tour.s3.desc', folder:'sala', view:'tpv', target:'#tpv-mesas-section', phase:'sala'},
  {icon:'ti-calendar-event', titleKey:'tour.s4.title', descKey:'tour.s4.desc', folder:'sala', view:'tpv', target:'.mesa-card', phase:'sala'},
  {icon:'ti-receipt-2', titleKey:'tour.s5.title', descKey:'tour.s5.desc', folder:'sala', view:'tpv', target:'.mesa-card', phase:'sala'},
  {icon:'ti-adjustments', titleKey:'tour.s6.title', descKey:'tour.s6.desc', folder:'sala', view:'tpv', target:'.mesa-card', phase:'sala'},
  {icon:'ti-chef-hat', titleKey:'tour.s7.title', descKey:'tour.s7.desc', folder:'sala', view:'tpv', target:'.mesa-card', phase:'sala'},
  {icon:'ti-cash', titleKey:'tour.s9.title', descKey:'tour.s9.desc', folder:'sala', view:'tpv', target:'.mesa-card', phase:'sala'},
  {icon:'ti-shopping-bag', titleKey:'tour.s10.title', descKey:'tour.s10.desc', folder:'sala', view:'tpv', target:'#tpv-togo-section', phase:'sala'},
  {icon:'ti-world', titleKey:'tour.s11.title', descKey:'tour.s11.desc', folder:'sala', view:'tpv', target:'#tpv-online-toggle-btn', phase:'sala'},
  {icon:'ti-cash-register', titleKey:'tour.s12.title', descKey:'tour.s12.desc', folder:'sala', view:'tpv', target:'#tpv-close-cash-btn', phase:'sala'},
  {icon:'ti-calendar-plus', titleKey:'tour.s16.title', descKey:'tour.s16.desc', folder:'sala', view:'reservas', phase:'sala'},
  {icon:'ti-users', titleKey:'tour.s17.title', descKey:'tour.s17.desc', folder:'sala', view:'reservas', phase:'sala'},
  {icon:'ti-address-book', titleKey:'tour.s18.title', descKey:'tour.s18.desc', folder:'sala', view:'clientes', phase:'sala'},
  {icon:'ti-speakerphone', titleKey:'tour.s23.title', descKey:'tour.s23.desc', folder:'sala', view:'promocion', phase:'sala'},

  // ---- Gestión ----
  {icon:'ti-layout-dashboard', titleKey:'tour.s24.title', descKey:'tour.s24.desc', folder:'gestion', view:'dashboard', gestion:true, phase:'gestion'},
  {icon:'ti-coin', titleKey:'tour.s25.title', descKey:'tour.s25.desc', folder:'gestion', view:'economia', gestion:true, phase:'gestion'},
  {icon:'ti-building-store', titleKey:'tour.s26.title', descKey:'tour.s26.desc', folder:'gestion', view:'minegocio', gestion:true, phase:'gestion'},
  {icon:'ti-cloud', titleKey:'tour.s27.title', descKey:'tour.s27.desc', folder:'gestion', view:'minegocio', gestion:true, phase:'gestion'},

  // ---- Cabecera (siempre visible, en cualquier pantalla) ----
  {icon:'ti-home', titleKey:'tour.s38.title', descKey:'tour.s38.desc', target:'#app-logo-icon', phase:'ayuda'},
  {icon:'ti-language', titleKey:'tour.s39.title', descKey:'tour.s39.desc', target:'#lang-btn', phase:'ayuda'},
  {icon:'ti-building-store', titleKey:'tour.s40.title', descKey:'tour.s40.desc', target:'#business-switch-btn', phase:'ayuda'},
  {icon:'ti-logout', titleKey:'tour.s41.title', descKey:'tour.s41.desc', target:'#logout-btn', phase:'ayuda'},
  {icon:'ti-messages', titleKey:'tour.s29.title', descKey:'tour.s29.desc', target:'#chat-fab', phase:'ayuda'},
  {icon:'ti-help-hexagon', titleKey:'tour.s30.title', descKey:'tour.s30.desc', target:'#help-fab', phase:'ayuda'},
  {icon:'ti-book', titleKey:'tour.s31.title', descKey:'tour.s31.desc', folder:'gestion', view:'manual', gestion:true, target:'.manual-nav', phase:'ayuda'},

  // ---- Cierre ----
  {icon:'ti-rocket', titleKey:'tour.s33.title', descKey:'tour.s33.desc', phase:'ayuda', finale:true},
];
let tourStepIndex = 0;
let tourCurrentTargetEl = null;
let tourReflowHandler = null;

function promptAppTour(){
  // El recorrido señala elementos concretos de la pantalla con una burbuja
  // encima — en un móvil, por pequeña que se haga, sigue tapando bastante
  // de lo que se está explicando. Se avisa antes de empezar, no se bloquea
  // (quien quiera verlo en el móvil igualmente puede).
  const mobileHint = window.innerWidth < 640
    ? `<p style="font-size:12.5px;color:var(--muted);margin-top:8px"><i class="ti ti-device-tablet"></i> ${escapeHtml(t('tour.prompt.mobileHint'))}</p>`
    : '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-map-2"></i> ${escapeHtml(t('tour.prompt.title'))}</h3>
    </div>
    <p>${escapeHtml(t('tour.prompt.desc'))}</p>
    ${mobileHint}
    <div class="modal-footer">
      <button class="btn" onclick="dismissTour()">${escapeHtml(t('tour.prompt.no'))}</button>
      <button class="btn btn-primary" onclick="startAppTour()"><i class="ti ti-player-play"></i> ${escapeHtml(t('tour.prompt.yes'))}</button>
    </div>
  `);
}
function dismissTour(){
  DB.business.tourSeen = true;
  saveDB();
  closeModal();
}
function startAppTour(){
  closeModal();
  tourStepIndex = 0;
  tourLastStepSignature = null;
  tourBuildChrome();
  renderTourStep();
}

/* Crea (una sola vez) los elementos fijos del tour: el velo que oscurece el
   resto de la pantalla y bloquea los clics, el "foco" recortado sobre el
   elemento que se está explicando, la flecha que lo conecta con la burbuja,
   y la propia burbuja. Antes solo existía la burbuja flotando siempre abajo
   del todo, sin nada que dirigiera la vista hacia lo que se estaba
   explicando de verdad. */
function tourBuildChrome(){
  if(!document.getElementById('tour-curtain')){
    const curtain = document.createElement('div');
    curtain.id = 'tour-curtain';
    curtain.className = 'tour-curtain';
    document.body.appendChild(curtain);
  }
  if(!document.getElementById('tour-overlay')){
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    overlay.className = 'tour-overlay';
    document.body.appendChild(overlay);
  }
  if(!document.getElementById('tour-spotlight')){
    const spot = document.createElement('div');
    spot.id = 'tour-spotlight';
    spot.className = 'tour-spotlight';
    document.body.appendChild(spot);
  }
  if(!document.getElementById('tour-arrow')){
    const arrow = document.createElement('div');
    arrow.id = 'tour-arrow';
    arrow.className = 'tour-arrow';
    document.body.appendChild(arrow);
  }
  if(!document.getElementById('tour-bubble')){
    const b = document.createElement('div');
    b.id = 'tour-bubble';
    b.className = 'tour-bubble';
    document.body.appendChild(b);
  }
  requestAnimationFrame(() => document.getElementById('tour-overlay').classList.add('active'));
  if(!tourReflowHandler){
    tourReflowHandler = () => tourPositionUI();
    window.addEventListener('resize', tourReflowHandler);
    window.addEventListener('scroll', tourReflowHandler, true);
  }
}
function tourDestroyChrome(){
  // Por si el tour termina justo en un paso de pantalla de login/selector de
  // negocio: hay que devolver esas pantallas a su estado oculto normal, no
  // dejarlas visibles tapando la app real.
  hideAccessSelectScreen();
  hideBusinessSelectScreen();
  ['tour-curtain','tour-overlay','tour-spotlight','tour-arrow','tour-bubble'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.remove();
  });
  if(tourReflowHandler){
    window.removeEventListener('resize', tourReflowHandler);
    window.removeEventListener('scroll', tourReflowHandler, true);
    tourReflowHandler = null;
  }
}

/* Lleva la app a la pantalla del paso actual — de verdad, navegando como lo
   haría el usuario — y recuerda cuál es el elemento a enfocar para que
   tourPositionUI() pueda recortar el foco sobre él en cuanto termine de
   moverse/renderizarse. */
// Pantallas de login/selector de negocio (fuera del sistema de vistas de
// navigate()) que el tour puede mostrar como "demo" sin tocar la sesión
// real: solo cambian qué HTML se pinta dentro de su contenedor y si tiene
// la clase .hide, igual que ya hacen showAccessSelectScreen()/
// showBusinessSelectScreen() en el flujo normal de la app.
function tourShowScreen(screenKey){
  hideAccessSelectScreen();
  hideBusinessSelectScreen();
  if(screenKey === 'access-choice'){ accessScreenMode = 'choice'; renderAccessScreen(); }
  else if(screenKey === 'access-employee'){ accessScreenMode = 'employee'; renderAccessScreen(); }
  else if(screenKey === 'access-owner'){ accessScreenMode = 'owner'; renderAccessScreen(); }
  else if(screenKey === 'business-select'){ showBusinessSelectScreen(); }
}

/* Segunda mitad de tourGoToStep: hace el cambio de pantalla de verdad
   (screen/view/folder/home), resuelve el elemento a enfocar y arranca el
   posicionamiento — separado en su propia función para poder retrasarlo
   hasta que la cortina de transición ya esté cubriendo la pantalla. */
function tourApplyStep(step){
  if(step.gestion){
    if(!ownerUnlocked) tourOwnerUnlockedByTour = true;
    ownerUnlocked = true;
    const lockBtn = document.getElementById('lock-btn');
    if(lockBtn) lockBtn.style.display = '';
  }else if(tourOwnerUnlockedByTour){
    // Solo volvemos a bloquear Gestión al salir del paso si fue el propio
    // tour quien la desbloqueó — antes se quedaba desbloqueada sin PIN
    // durante el resto del tour aunque ya no se estuviera en un paso de
    // gestión, y solo se relockeaba al terminar el tour del todo.
    ownerUnlocked = false;
    tourOwnerUnlockedByTour = false;
    const lockBtn = document.getElementById('lock-btn');
    if(lockBtn) lockBtn.style.display = 'none';
  }
  if(step.screen){
    tourShowScreen(step.screen);
  }else{
    hideAccessSelectScreen();
    hideBusinessSelectScreen();
    if(step.folder) currentFolder = step.folder;
    if(step.view) navigate(step.view);
    else if(step.folder) navigate('folder');
    else navigate('home');
  }

  // Si el paso no trae un target explícito, se intenta primero la primera
  // ".card" real de la vista (más concreta y vistosa para el foco) y solo
  // si no hay ninguna se cae a la vista entera. OJO: esto tiene que ser un
  // fallback en JS, no un selector con coma — "A .card, A" con querySelector
  // no prioriza lo específico, devuelve el primero en orden del documento,
  // y como el contenedor A aparece ANTES que sus propios hijos, siempre
  // "ganaba" la vista entera y el foco acababa siendo gigante (tapando la
  // pantalla casi entera, sin recorte real que se notara).
  let el = null;
  if(step.target){
    el = document.querySelector(step.target);
  }else if(step.view){
    el = document.querySelector('#view-' + step.view + ' .card') || document.querySelector('#view-' + step.view);
  }else if(step.folder){
    el = document.querySelector('#folder-modules .module-card') || document.querySelector('.folder-card.folder-' + step.folder);
  }
  tourCurrentTargetEl = el || null;
  if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
  return el;
}

function tourGoToStep(step){
  tourCurrentTargetEl = null;
  const curtain = document.getElementById('tour-curtain');
  const changesScreen = tourLastStepSignature !== tourStepSignature(step);
  tourLastStepSignature = tourStepSignature(step);
  if(!changesScreen){
    // Mismo destino que el paso anterior (p.ej. varios pasos seguidos
    // dentro del TPV): no hace falta cortina ni reflow, solo reposicionar
    // sobre el nuevo target dentro de la misma pantalla ya visible.
    const el = tourApplyStep(step);
    setTimeout(tourPositionUI, el ? 380 : 0);
    return;
  }
  // Cambia de pantalla de verdad: cortina de transición — la mostramos
  // primero, esperamos a que la animación de opacidad termine, hacemos el
  // cambio real (navigate()/screen) con la pantalla ya tapada, y solo
  // entonces la retiramos mientras se posiciona el foco sobre lo nuevo.
  if(curtain) curtain.classList.add('active');
  setTimeout(() => {
    const el = tourApplyStep(step);
    setTimeout(() => {
      if(curtain) curtain.classList.remove('active');
      tourPositionUI();
    }, el ? 380 : 120);
  }, curtain ? 180 : 0);
}
// Identifica "a qué pantalla lleva este paso" (no el paso exacto) para
// saber si hace falta cortina de transición o el paso anterior ya estaba
// en la misma pantalla y solo cambia el elemento resaltado.
function tourStepSignature(step){
  return step.screen ? ('screen:'+step.screen) : (step.view ? ('view:'+step.view) : (step.folder ? ('folder:'+step.folder) : 'home'));
}
let tourLastStepSignature = null;

/* Coloca el foco (spotlight), la flecha y la burbuja según dónde esté AHORA
   MISMO tourCurrentTargetEl — se llama tanto al cambiar de paso como en
   cada resize/scroll mientras el tour está activo, para que el foco no se
   quede descolgado del elemento real si la pantalla se mueve. */
function tourPositionUI(){
  const spot = document.getElementById('tour-spotlight');
  const arrow = document.getElementById('tour-arrow');
  const bubble = document.getElementById('tour-bubble');
  if(!spot || !bubble) return;
  const rect = tourCurrentTargetEl ? tourCurrentTargetEl.getBoundingClientRect() : null;
  const hasRect = rect && rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
  const vw = window.innerWidth, vh = window.innerHeight;

  if(!hasRect){
    spot.classList.add('no-target');
    spot.classList.add('active');
    spot.style.top = '50%'; spot.style.left = '50%'; spot.style.width = '0px'; spot.style.height = '0px';
    if(arrow) arrow.style.display = 'none';
    bubble.classList.add('tour-bubble-centered');
    return;
  }
  const pad = 10;
  spot.classList.remove('no-target');
  spot.classList.add('active');
  spot.style.top = (rect.top - pad) + 'px';
  spot.style.left = (rect.left - pad) + 'px';
  spot.style.width = (rect.width + pad*2) + 'px';
  spot.style.height = (rect.height + pad*2) + 'px';

  bubble.classList.remove('tour-bubble-centered');
  const bw = bubble.offsetWidth, bh = bubble.offsetHeight;

  // En pantallas estrechas, perseguir la posición exacta del elemento deja
  // muy poco margen y la burbuja puede acabar recortada o tapando el propio
  // foco — más fiable y "pro" es una hoja fija abajo del todo (con el foco
  // igualmente animándose sobre el elemento real detrás), sin flecha.
  if(vw < 640){
    bubble.style.left = '16px';
    bubble.style.top = (vh - bh - 16 - (window.visualViewport ? (vh - window.visualViewport.height) : 0)) + 'px';
    if(arrow) arrow.style.display = 'none';
    return;
  }

  const spaceBelow = vh - (rect.bottom + pad);
  const spaceAbove = rect.top - pad;
  let top, placement;
  if(spaceBelow >= bh + 26 || spaceBelow >= spaceAbove){
    top = Math.min(rect.bottom + pad + 16, vh - bh - 12);
    placement = 'bottom';
  }else{
    top = Math.max(rect.top - pad - 16 - bh, 12);
    placement = 'top';
  }
  let left = rect.left + rect.width/2 - bw/2;
  left = Math.max(12, Math.min(left, vw - bw - 12));
  bubble.style.top = top + 'px';
  bubble.style.left = left + 'px';

  if(arrow){
    const showArrow = placement === 'top' ? (top + bh) < vh - 4 : top > 4;
    arrow.style.display = showArrow ? '' : 'none';
    arrow.className = 'tour-arrow tour-arrow-' + placement;
    const arrowLeft = Math.max(18, Math.min(rect.left + rect.width/2 - 9, vw - 26));
    arrow.style.left = arrowLeft + 'px';
    arrow.style.top = placement === 'bottom' ? (top - 9) + 'px' : (top + bh + 1) + 'px';
  }
}

// Fase a la que pertenece el paso actual, y su índice dentro de TOUR_PHASES
// (para pintar la mini-navegación de fases arriba de la burbuja).
function tourPhaseIndex(phaseKey){ return TOUR_PHASES.findIndex(p => p.key === phaseKey); }
// Salta directamente al primer paso de una fase — permite repasar solo
// "Sala" o solo "Gestión" sin tener que darle a Siguiente 20 veces.
function tourJumpToPhase(phaseKey){
  const idx = TOUR_STEPS.findIndex(s => s.phase === phaseKey);
  if(idx === -1) return;
  tourStepIndex = idx;
  renderTourStep();
}

function renderTourStep(){
  const step = TOUR_STEPS[tourStepIndex];
  tourGoToStep(step);

  const bubble = document.getElementById('tour-bubble');
  if(!bubble) return;
  const pct = Math.round(((tourStepIndex+1) / TOUR_STEPS.length) * 100);
  const curPhaseIdx = tourPhaseIndex(step.phase);
  const phasePills = TOUR_PHASES.map((p,i) => {
    const state = i === curPhaseIdx ? 'current' : (i < curPhaseIdx ? 'done' : '');
    return `<button class="tour-phase-pill ${state}" onclick="tourJumpToPhase('${p.key}')" title="${escapeHtml(t(p.labelKey))}"><i class="ti ${p.icon}"></i><span>${escapeHtml(t(p.labelKey))}</span></button>`;
  }).join('');

  bubble.classList.remove('tour-bubble-anim');
  bubble.classList.toggle('tour-bubble-finale', !!step.finale);
  void bubble.offsetWidth; // fuerza reflow para poder relanzar la animación de entrada en cada paso
  bubble.classList.add('tour-bubble-anim');

  bubble.innerHTML = `
    ${step.finale ? '' : `<div class="tour-phase-nav">${phasePills}</div>`}
    <div class="tour-bubble-head">
      <div class="tour-icon-badge ${step.finale?'tour-icon-badge-finale':''}"><i class="ti ${step.icon}"></i></div>
      <div style="flex:1;min-width:0">
        <h3>${escapeHtml(t(step.titleKey))}</h3>
        ${step.finale ? '' : `<div class="tour-step-count">${t('tour.stepCount').replace('${n}', tourStepIndex+1).replace('${total}', TOUR_STEPS.length)}</div>`}
      </div>
      <button class="modal-close" onclick="finishTour()" aria-label="${escapeHtml(t('common.close'))}">&times;</button>
    </div>
    <p class="tour-bubble-desc">${escapeHtml(t(step.descKey))}</p>
    ${step.finale ? '' : `<div class="tour-progress"><div class="tour-progress-fill" style="width:${pct}%"></div></div>`}
    <div class="modal-footer tour-bubble-footer">
      ${step.finale
        ? `<button class="btn btn-primary" style="width:100%" onclick="finishTour()"><i class="ti ti-rocket"></i> ${escapeHtml(t('tour.finale.cta'))}</button>`
        : `
          ${tourStepIndex > 0 ? `<button class="btn btn-sm" onclick="tourPrev()"><i class="ti ti-arrow-left"></i> ${escapeHtml(t('common.prev'))}</button>` : `<button class="btn btn-sm" onclick="finishTour()">${escapeHtml(t('common.skip'))}</button>`}
          <button class="btn btn-primary btn-sm" onclick="tourNext()">${escapeHtml(t('common.next'))} <i class="ti ti-arrow-right"></i></button>
        `}
    </div>
  `;
}
function tourNext(){ tourStepIndex = Math.min(tourStepIndex+1, TOUR_STEPS.length-1); renderTourStep(); }
function tourPrev(){ tourStepIndex = Math.max(tourStepIndex-1, 0); renderTourStep(); }
function finishTour(){
  DB.business.tourSeen = true;
  saveDB();
  tourDestroyChrome();
  tourCurrentTargetEl = null;
  // Solo bloqueamos Gestión aquí si fue el propio tour quien la desbloqueó.
  // Si el usuario ya la había desbloqueado de verdad con su PIN antes de
  // empezar el tour, terminar el tour no debe deshacer ese desbloqueo real.
  if(tourOwnerUnlockedByTour){
    ownerUnlocked = false;
    tourOwnerUnlockedByTour = false;
    const lockBtn = document.getElementById('lock-btn');
    if(lockBtn) lockBtn.style.display = 'none';
  }
  goHome();
}

/* ============== Centro de ayuda / Asistente ============== */
const HELP_FAQS = [
  { keywords:{es:['abrir mesa','abrir una mesa','mesa nueva','nueva mesa','tipo de cliente','cliente de paso'],
      ca:['obrir taula','obrir una taula','taula nova','nova taula','tipus de client','client de pas'],
      en:['open table','open a table','new table','customer type','walk-in']},
    answers:{
      es:'Para abrir una mesa, pulsa sobre ella en el <strong>TPV</strong>. Te preguntará si el cliente es <strong>"de paso"</strong> (indicas el número de comensales) o <strong>"tiene reserva"</strong> (eliges una reserva de hoy y se rellena todo automáticamente). Luego pulsa "Aceptar" para crear la comanda.',
      ca:'Per obrir una taula, prem-hi al <strong>TPV</strong>. Et preguntarà si el client és <strong>"de pas"</strong> (indiques el nombre de comensals) o <strong>"té reserva"</strong> (tries una reserva d\'avui i s\'omple tot automàticament). Després prem "Acceptar" per crear la comanda.',
      en:'To open a table, tap it in the <strong>POS</strong>. It will ask whether the customer is a <strong>"walk-in"</strong> (you enter the number of guests) or <strong>"has a reservation"</strong> (you pick today\'s reservation and everything fills in automatically). Then tap "Accept" to create the order.' } },
  { keywords:{es:['tiene reserva','asignar reserva al abrir','vincular reserva con mesa','reserva a la mesa'],
      ca:['te reserva','assignar reserva en obrir','vincular reserva amb taula','reserva a la taula'],
      en:['has a reservation','assign reservation when opening','link reservation to table','reservation to the table']},
    answers:{
      es:'Si al abrir una mesa eliges <strong>"Tiene reserva"</strong>, selecciona la reserva de la lista (solo aparecen las reservas de hoy aún no llegadas). Se rellenan automáticamente el cliente y el número de personas, la reserva se marca como "Llegó" y, si no tenía mesa asignada, se le asigna esta.',
      ca:'Si en obrir una taula tries <strong>"Té reserva"</strong>, selecciona la reserva de la llista (només apareixen les reserves d\'avui encara no arribades). S\'omplen automàticament el client i el nombre de persones, la reserva es marca com "Ha arribat" i, si no tenia taula assignada, se li assigna aquesta.',
      en:'If when opening a table you choose <strong>"Has a reservation"</strong>, select the reservation from the list (only today\'s not-yet-arrived reservations appear). The customer and party size fill in automatically, the reservation is marked as "Arrived" and, if it had no table assigned, this one is assigned.' } },
  { keywords:{es:['añadir plato','agregar plato','añadir un plato','poner un plato','pedir un plato'],
      ca:['afegir plat','agregar plat','afegir un plat','posar un plat','demanar un plat'],
      en:['add dish','add a dish','add an item','order a dish','add item to order']},
    answers:{
      es:'Dentro de la comanda, toca un plato de la carta (organizada por secciones) para añadirlo. Si lo tocas varias veces se suma la cantidad. Usa los botones <strong>+</strong> y <strong>−</strong> para ajustar unidades, y la papelera para eliminar una línea.',
      ca:'Dins de la comanda, toca un plat de la carta (organitzada per seccions) per afegir-lo. Si el toques diverses vegades se suma la quantitat. Usa els botons <strong>+</strong> i <strong>−</strong> per ajustar unitats, i la paperera per eliminar una línia.',
      en:'Inside the order, tap a dish from the menu (organized by sections) to add it. Tapping it again increases the quantity. Use the <strong>+</strong> and <strong>−</strong> buttons to adjust units, and the trash icon to remove a line.' } },
  { keywords:{es:['extra','extra queso','modificador','modificadores','añadir extra','extra al plato'],
      ca:['extra','extra formatge','modificador','modificadors','afegir extra','extra al plat'],
      en:['extra','extra cheese','modifier','modifiers','add extra','extra on a dish']},
    answers:{
      es:'Si un plato tiene extras configurados (ej. "Extra queso"), al añadirlo se abre una ventana donde marcas los extras que quieras y se suman a su precio. Para configurar extras nuevos en un plato, entra en <strong>Carta</strong>, abre el plato y pulsa el botón <strong>"Extras"</strong>.',
      ca:'Si un plat té extres configurats (ex. "Extra formatge"), en afegir-lo s\'obre una finestra on marques els extres que vulguis i se sumen al seu preu. Per configurar extres nous en un plat, entra a <strong>Carta</strong>, obre el plat i prem el botó <strong>"Extres"</strong>.',
      en:'If a dish has extras configured (e.g. "Extra cheese"), adding it opens a window where you check the extras you want and they\'re added to its price. To configure new extras on a dish, go to <strong>Menu</strong>, open the dish and tap the <strong>"Extras"</strong> button.' } },
  { keywords:{es:['nota','notas','sin cebolla','comentario del plato','comentarios'],
      ca:['nota','notes','sense ceba','comentari del plat','comentaris'],
      en:['note','notes','no onion','dish comment','comments']},
    answers:{
      es:'Al añadir un plato con extras se abre una ventana donde puedes escribir una nota libre (ej. "sin cebolla"). Esa nota aparece debajo del plato en la comanda y también se ve en la pantalla de cocina.',
      ca:'En afegir un plat amb extres s\'obre una finestra on pots escriure una nota lliure (ex. "sense ceba"). Aquesta nota apareix sota el plat a la comanda i també es veu a la pantalla de cuina.',
      en:'When adding a dish with extras, a window opens where you can write a free note (e.g. "no onion"). That note appears below the dish in the order and is also shown on the kitchen screen.' } },
  { keywords:{es:['editar nota','cambiar nota','modificar nota','corregir nota'],
      ca:['editar nota','canviar nota','modificar nota','corregir nota'],
      en:['edit note','change note','modify note','update note']},
    answers:{
      es:'En la comanda, cada línea de plato tiene un icono de nota <i class="ti ti-note"></i>. Pulsa ese icono para abrir, editar o borrar la nota de ese plato en cualquier momento.',
      ca:'A la comanda, cada línia de plat té una icona de nota <i class="ti ti-note"></i>. Prem aquesta icona per obrir, editar o esborrar la nota d\'aquest plat en qualsevol moment.',
      en:'In the order, each dish line has a note icon <i class="ti ti-note"></i>. Tap that icon to open, edit or clear the note for that dish at any time.' } },
  { keywords:{es:['tanda','tandas','marchar','marchar a cocina','enviar a cocina','primeros y segundos'],
      ca:['torn','torns','enviar a cuina','enviar la comanda','primers i segons'],
      en:['course','courses','send to kitchen','fire course','starters and mains']},
    answers:{
      es:'Puedes agrupar los platos en <strong>tandas</strong> (primeros, segundos, postres...) para controlar el ritmo del servicio. Cuando una tanda esté lista para prepararse, pulsa <strong>"Marchar a cocina"</strong> y aparecerá al instante en Comandas Cocina.',
      ca:'Pots agrupar els plats en <strong>torns</strong> (primers, segons, postres...) per controlar el ritme del servei. Quan un torn estigui llest per preparar-se, prem <strong>"Enviar a cuina"</strong> i apareixerà a l\'instant a Comandes Cuina.',
      en:'You can group dishes into <strong>courses</strong> (starters, mains, desserts...) to control the pace of service. When a course is ready to be prepared, tap <strong>"Send to kitchen"</strong> and it will instantly appear on the Kitchen Orders screen.' } },
  { keywords:{es:['comandas cocina','pantalla cocina','en preparacion','listo para servir','ver comandas'],
      ca:['comandes cuina','pantalla cuina','en preparacio','llest per servir','veure comandes'],
      en:['kitchen orders','kitchen screen','preparing','ready to serve','view orders']},
    answers:{
      es:'En <strong>Comandas Cocina</strong> se ven en tiempo real todos los platos marchados desde sala, agrupados por mesa y tanda. Cocina puede marcar cada plato como <strong>"En preparación"</strong> y <strong>"Listo"</strong>, y sala lo verá al instante para servirlo.',
      ca:'A <strong>Comandes Cuina</strong> es veuen en temps real tots els plats enviats des de sala, agrupats per taula i torn. Cuina pot marcar cada plat com <strong>"En preparació"</strong> i <strong>"Llest"</strong>, i sala ho veurà a l\'instant per servir-lo.',
      en:'On the <strong>Kitchen Orders</strong> screen you see in real time all dishes sent from the dining room, grouped by table and course. The kitchen can mark each dish as <strong>"Preparing"</strong> and <strong>"Ready"</strong>, and the dining room will see it instantly to serve it.' } },
  { keywords:{es:['cobrar','cobro','dividir cuenta','metodo de pago','cerrar comanda','cerrar mesa','pagar'],
      ca:['cobrar','cobrament','dividir compte','metode de pagament','tancar comanda','tancar taula','pagar'],
      en:['charge','checkout','split the bill','payment method','close order','close table','pay']},
    answers:{
      es:'Cuando el cliente termina, abre la comanda y pulsa <strong>"Cobrar"</strong>. Puedes dividir la cuenta, aplicar descuentos y elegir el método de pago (efectivo, tarjeta...). Al cerrar, la venta se registra automáticamente en Gestión Económica y el Panel de Control.',
      ca:'Quan el client acaba, obre la comanda i prem <strong>"Cobrar"</strong>. Pots dividir el compte, aplicar descomptes i triar el mètode de pagament (efectiu, targeta...). En tancar, la venda es registra automàticament a Gestió Econòmica i al Tauler de Control.',
      en:'When the customer is done, open the order and tap <strong>"Charge"</strong>. You can split the bill, apply discounts and choose the payment method (cash, card...). Once closed, the sale is automatically recorded in Financial Management and the Dashboard.' } },
  { keywords:{es:['take away','para llevar','recogida','recoger pedido'],
      ca:['take away','per emportar','recollida','recollir comanda'],
      en:['take away','takeaway','pickup','collect order']},
    answers:{
      es:'En el TPV pulsa <strong>"Pedido Express"</strong> y elige <strong>"Para recoger"</strong>. Funciona igual que una mesa: añades platos, extras y notas, y cobras al finalizar. Si el cliente da su teléfono y ya es cliente registrado, el pedido queda vinculado a su ficha (suma puntos de fidelidad).',
      ca:'Al TPV prem <strong>"Comanda Express"</strong> i tria <strong>"Per recollir"</strong>. Funciona igual que una taula: afegeixes plats, extres i notes, i cobres al final. Si el client dona el seu telèfon i ja és client registrat, la comanda queda vinculada a la seva fitxa (suma punts de fidelitat).',
      en:'In the POS tap <strong>"Express Order"</strong> and choose <strong>"Pickup"</strong>. It works just like a table: add dishes, extras and notes, and charge at the end. If the customer gives their phone and is already a registered client, the order gets linked to their record (earns loyalty points).' } },
  { keywords:{es:['delivery','a domicilio','reparto','envio a domicilio','reparto propio','repartidor'],
      ca:['delivery','a domicili','repartiment','enviament a domicili','repartiment propi','repartidor'],
      en:['delivery','home delivery','order to be delivered','own delivery','delivery rider']},
    answers:{
      es:'En el TPV pulsa <strong>"Pedido Express"</strong> y elige <strong>"A domicilio"</strong>. Indica dirección y si lo reparte una plataforma externa (Glovo, Uber Eats...) o tu propio negocio ("Reparto propio", pudiendo asignar qué repartidor lo lleva). El coste de envío de Mi Negocio solo se cobra si es reparto propio. Si programas una hora de entrega, el pedido no aparece en el TPV hasta una hora antes.',
      ca:'Al TPV prem <strong>"Comanda Express"</strong> i tria <strong>"A domicili"</strong>. Indica l\'adreça i si ho reparteix una plataforma externa (Glovo, Uber Eats...) o el teu propi negoci ("Repartiment propi", podent assignar quin repartidor ho porta). El cost d\'enviament d\'El Meu Negoci només es cobra si és repartiment propi. Si programes una hora d\'entrega, la comanda no apareix al TPV fins una hora abans.',
      en:'In the POS tap <strong>"Express Order"</strong> and choose <strong>"Delivery"</strong>. Enter the address and whether it\'s delivered by an external platform (Glovo, Uber Eats...) or your own business ("Own delivery", letting you assign which rider does it). The delivery fee from My Business only applies for own delivery. If you schedule a delivery time, the order won\'t show up in the POS until one hour before.' } },
  { keywords:{es:['pedido online','pedidos online','aceptar pedido','rechazar pedido','pedidos pendientes'],
      ca:['comanda en linia','comandes en linia','acceptar comanda','rebutjar comanda','comandes pendents'],
      en:['online order','online orders','accept order','reject order','pending orders']},
    answers:{
      es:'Si tienes pedidos online activados, los nuevos pedidos llegan a una bandeja de <strong>pendientes</strong> dentro del TPV. Desde ahí puedes <strong>aceptarlos</strong> (se convierten en Take Away/Delivery) o <strong>rechazarlos</strong> si no puedes atenderlos.',
      ca:'Si tens comandes en línia activades, les noves comandes arriben a una safata de <strong>pendents</strong> dins del TPV. Des d\'allà les pots <strong>acceptar</strong> (es converteixen en Take Away/Delivery) o <strong>rebutjar</strong> si no les pots atendre.',
      en:'If you have online orders enabled, new orders arrive in a <strong>pending</strong> tray inside the POS. From there you can <strong>accept</strong> them (they become a Take Away/Delivery order) or <strong>reject</strong> them if you can\'t fulfil them.' } },
  { keywords:{es:['cierre de caja','arqueo','cuadre de caja','cerrar caja','efectivo esperado'],
      ca:['tancament de caixa','arqueig','quadre de caixa','tancar caixa','efectiu esperat'],
      en:['cash closure','cash count','close the register','expected cash','cash register closure']},
    answers:{
      es:'Al terminar el turno, abre el <strong>Cierre de caja</strong> (dentro de TPV). La app calcula el efectivo esperado según las ventas en efectivo del día; introduces el efectivo contado y guarda el resultado. Todo el histórico queda guardado.',
      ca:'En acabar el torn, obre el <strong>Tancament de caixa</strong> (dins del TPV). L\'app calcula l\'efectiu esperat segons les vendes en efectiu del dia; introdueixes l\'efectiu comptat i desa el resultat. Tot l\'històric queda desat.',
      en:'At the end of the shift, open the <strong>Cash closure</strong> (inside the POS). The app calculates the expected cash based on the day\'s cash sales; enter the counted cash and save the result. The full history is saved.' } },
  { keywords:{es:['carta','crear carta','seccion de la carta','añadir plato a la carta','varias cartas'],
      ca:['carta','crear carta','seccio de la carta','afegir plat a la carta','diverses cartes'],
      en:['menu','create menu','menu section','add dish to menu','multiple menus']},
    answers:{
      es:'En <strong>Carta</strong> puedes crear varias cartas (comida, bebida, brunch...) organizadas en secciones. Dentro de cada sección añade platos con su nombre y precio. La carta activa es la que se usa en el TPV y en pedidos online.',
      ca:'A <strong>Carta</strong> pots crear diverses cartes (menjar, begudes, brunch...) organitzades en seccions. Dins de cada secció afegeix plats amb el seu nom i preu. La carta activa és la que s\'usa al TPV i en comandes en línia.',
      en:'In <strong>Menu</strong> you can create several menus (food, drinks, brunch...) organized into sections. Inside each section, add dishes with their name and price. The active menu is the one used in the POS and online orders.' } },
  { keywords:{es:['agotado','no disponible','marcar plato','plato sin stock'],
      ca:['esgotat','no disponible','marcar plat','plat sense estoc'],
      en:['sold out','not available','mark dish','out of stock dish']},
    answers:{
      es:'En <strong>Carta</strong>, abre el plato y marca el interruptor de <strong>"Disponible"</strong>. Si lo desmarcas (agotado), ese plato no podrá pedirse desde el TPV ni desde los pedidos online hasta que vuelvas a activarlo.',
      ca:'A <strong>Carta</strong>, obre el plat i marca l\'interruptor de <strong>"Disponible"</strong>. Si el desmarques (esgotat), aquest plat no es podrà demanar des del TPV ni des de les comandes en línia fins que el tornis a activar.',
      en:'In <strong>Menu</strong>, open the dish and toggle the <strong>"Available"</strong> switch. If you turn it off (sold out), that dish can\'t be ordered from the POS or online orders until you enable it again.' } },
  { keywords:{es:['configurar extra','extras en carta','precio extra','añadir extra al plato','doble carne'],
      ca:['configurar extra','extres a la carta','preu extra','afegir extra al plat','doble carn'],
      en:['configure extra','extras in menu','extra price','add extra to dish','double meat']},
    answers:{
      es:'Para configurar extras de un plato, ve a <strong>Carta</strong>, abre ese plato y pulsa el botón <strong>"Extras"</strong>. Ahí puedes añadir opciones con nombre y precio (ej. "Extra queso" +1€, "Doble carne" +2€).',
      ca:'Per configurar extres d\'un plat, vés a <strong>Carta</strong>, obre aquest plat i prem el botó <strong>"Extres"</strong>. Allà pots afegir opcions amb nom i preu (ex. "Extra formatge" +1€, "Doble carn" +2€).',
      en:'To configure extras for a dish, go to <strong>Menu</strong>, open that dish and tap the <strong>"Extras"</strong> button. There you can add options with a name and price (e.g. "Extra cheese" +1€, "Double meat" +2€).' } },
  { keywords:{es:['importar plato','importar del escandallo','escandallo a carta','traer plato del escandallo'],
      ca:['importar plat','importar de l\'escandall','escandall a carta','portar plat de l\'escandall'],
      en:['import dish','import from costing','costing to menu','bring dish from costing']},
    answers:{
      es:'Para no escribir los platos dos veces, en <strong>Carta</strong> puedes importarlos directamente desde el <strong>Escandallo</strong> (ya con su coste calculado). Solo tienes que indicar el precio de venta.',
      ca:'Per no escriure els plats dues vegades, a <strong>Carta</strong> els pots importar directament des de l\'<strong>Escandall</strong> (ja amb el seu cost calculat). Només has d\'indicar el preu de venda.',
      en:'To avoid entering dishes twice, in <strong>Menu</strong> you can import them directly from <strong>Costing</strong> (already with their cost calculated). You just need to set the selling price.' } },
  { keywords:{es:['menu','menus','menu del dia','combo','grupo de opciones','menu de precio fijo'],
      ca:['menu','menus','menu del dia','combo','grup d\'opcions','menu de preu fix'],
      en:['combo menu','combo menus','daily menu','set menu','option group','fixed price menu']},
    answers:{
      es:'En <strong>Menús</strong> puedes crear menús de precio fijo (ej. "Menú del día") agrupando platos en grupos de opciones (ej. "Primero a elegir entre 3"). El cliente elige una opción de cada grupo y se cobra el precio único del menú.',
      ca:'A <strong>Menús</strong> pots crear menús de preu fix (ex. "Menú del dia") agrupant plats en grups d\'opcions (ex. "Primer a triar entre 3"). El client tria una opció de cada grup i es cobra el preu únic del menú.',
      en:'In <strong>Combo Menus</strong> you can create fixed-price menus (e.g. "Daily menu") by grouping dishes into option groups (e.g. "Starter — choose 1 of 3"). The customer picks one option from each group and is charged the menu\'s single price.' } },
  { keywords:{es:['crear reserva','nueva reserva','hacer una reserva','reservar mesa','añadir reserva'],
      ca:['crear reserva','nova reserva','fer una reserva','reservar taula','afegir reserva'],
      en:['create reservation','new reservation','make a reservation','book a table','add reservation']},
    answers:{
      es:'En <strong>Reservas</strong>, pulsa "Nueva reserva" e indica fecha, hora, número de personas y elige un cliente de tu base de datos (o crea uno nuevo ahí mismo). Puedes añadir notas como alergias o peticiones especiales.',
      ca:'A <strong>Reserves</strong>, prem "Nova reserva" i indica data, hora, nombre de persones i tria un client de la teva base de dades (o crea\'n un de nou allà mateix). Pots afegir notes com al·lèrgies o peticions especials.',
      en:'In <strong>Reservations</strong>, tap "New reservation" and enter the date, time, party size and pick a customer from your database (or create a new one right there). You can add notes such as allergies or special requests.' } },
  { keywords:{es:['asignar mesa a reserva','mesa a la reserva','elegir mesa para reserva'],
      ca:['assignar taula a reserva','taula a la reserva','triar taula per a reserva'],
      en:['assign table to reservation','table for reservation','choose table for reservation']},
    answers:{
      es:'Desde la vista de día en <strong>Reservas</strong>, abre la reserva y asigna una mesa con antelación. Si no la asignas, se asignará automáticamente al abrir la mesa correspondiente en el TPV.',
      ca:'Des de la vista de dia a <strong>Reserves</strong>, obre la reserva i assigna una taula amb antelació. Si no l\'assignes, s\'assignarà automàticament en obrir la taula corresponent al TPV.',
      en:'From the day view in <strong>Reservations</strong>, open the reservation and assign a table in advance. If you don\'t assign one, it will be assigned automatically when opening the corresponding table in the POS.' } },
  { keywords:{es:['llegada','ha llegado','marcar llegada','llego el cliente','cliente llego'],
      ca:['arribada','ha arribat','marcar arribada','ha arribat el client','client arribat'],
      en:['arrival','has arrived','mark arrival','customer arrived','guest arrived']},
    answers:{
      es:'En la vista de día de <strong>Reservas</strong> hay una columna "Llegada" con un botón para marcar manualmente si el cliente ha llegado. Normalmente esto se marca solo, automáticamente, al abrir su mesa en el TPV con esa reserva.',
      ca:'A la vista de dia de <strong>Reserves</strong> hi ha una columna "Arribada" amb un botó per marcar manualment si el client ha arribat. Normalment això es marca sol, automàticament, en obrir la seva taula al TPV amb aquesta reserva.',
      en:'In the day view of <strong>Reservations</strong> there\'s an "Arrived" column with a button to manually mark whether the customer has arrived. This is normally marked automatically when opening their table in the POS with that reservation.' } },
  { keywords:{es:['añadir cliente','nuevo cliente','crear cliente','ficha de cliente','dar de alta cliente'],
      ca:['afegir client','nou client','crear client','fitxa de client','donar d\'alta client'],
      en:['add customer','new customer','create customer','customer profile','register customer']},
    answers:{
      es:'En <strong>Clientes</strong>, pulsa "Nuevo cliente" y rellena su nombre, teléfono, email, alergias y notas. También puedes crear un cliente nuevo directamente desde la pantalla de Reservas.',
      ca:'A <strong>Clients</strong>, prem "Nou client" i omple el seu nom, telèfon, email, al·lèrgies i notes. També pots crear un client nou directament des de la pantalla de Reserves.',
      en:'In <strong>Customers</strong>, tap "New customer" and fill in their name, phone, email, allergies and notes. You can also create a new customer directly from the Reservations screen.' } },
  { keywords:{es:['puntos','fidelizacion','puntos de fidelidad','programa de puntos'],
      ca:['punts','fidelitzacio','punts de fidelitat','programa de punts'],
      en:['points','loyalty','loyalty points','points program']},
    answers:{
      es:'Cada cliente tiene una ficha con sus <strong>puntos de fidelización</strong>. Puedes consultarlos y editarlos desde su ficha en <strong>Clientes</strong>.',
      ca:'Cada client té una fitxa amb els seus <strong>punts de fidelització</strong>. Pots consultar-los i editar-los des de la seva fitxa a <strong>Clients</strong>.',
      en:'Each customer has a profile with their <strong>loyalty points</strong>. You can view and edit them from their profile in <strong>Customers</strong>.' } },
  { keywords:{es:['mega lista','ingrediente','proveedor','añadir ingrediente','lista de ingredientes'],
      ca:['mega llista','ingredient','proveidor','afegir ingredient','llista d\'ingredients'],
      en:['master list','ingredient','supplier','add ingredient','ingredients list']},
    answers:{
      es:'La <strong>Mega Lista</strong> centraliza todos tus ingredientes con su unidad y precio de compra, vinculados a tus proveedores. Es la base que usa el Escandallo para calcular el coste real de cada plato.',
      ca:'La <strong>Mega Llista</strong> centralitza tots els teus ingredients amb la seva unitat i preu de compra, vinculats als teus proveïdors. És la base que usa l\'Escandall per calcular el cost real de cada plat.',
      en:'The <strong>Master List</strong> centralizes all your ingredients with their unit and purchase price, linked to your suppliers. It\'s the foundation Costing uses to calculate the real cost of each dish.' } },
  { keywords:{es:['ficha tecnica','escandallo','coste del plato','margen','calcular coste'],
      ca:['fitxa tecnica','escandall','cost del plat','marge','calcular cost'],
      en:['technical sheet','costing','dish cost','margin','calculate cost']},
    answers:{
      es:'En <strong>Escandallo</strong> creas la ficha técnica de cada plato indicando los ingredientes y cantidades de la Mega Lista. La app calcula automáticamente el coste por ración y el margen.',
      ca:'A <strong>Escandall</strong> crees la fitxa tècnica de cada plat indicant els ingredients i quantitats de la Mega Llista. L\'app calcula automàticament el cost per ració i el marge.',
      en:'In <strong>Costing</strong> you create the technical sheet for each dish by specifying the ingredients and quantities from the Master List. The app automatically calculates the cost per portion and margin.' } },
  { keywords:{es:['stock','inventario','pedido a proveedor','stock minimo','existencias'],
      ca:['estoc','inventari','comanda a proveidor','estoc minim','existencies'],
      en:['stock','inventory','purchase order','minimum stock','supplies']},
    answers:{
      es:'En <strong>Stock</strong> controlas el inventario de tu almacén y defines niveles mínimos. En <strong>Pedidos</strong> generas pedidos a proveedores cuando un ingrediente esté por debajo de ese mínimo.',
      ca:'A <strong>Estoc</strong> controles l\'inventari del teu magatzem i defineixes nivells mínims. A <strong>Comandes</strong> generes comandes a proveïdors quan un ingredient estigui per sota d\'aquest mínim.',
      en:'In <strong>Stock</strong> you control your storeroom inventory and set minimum levels. In <strong>Orders</strong> you generate purchase orders to suppliers when an ingredient drops below that minimum.' } },
  { keywords:{es:['horario del personal','turnos','distribucion del trabajo','tareas del equipo','horario de trabajo'],
      ca:['horari del personal','torns','distribucio de la feina','tasques de l\'equip','horari de treball'],
      en:['staff schedule','shifts','work distribution','team tasks','work schedule']},
    answers:{
      es:'En <strong>Horario del Personal</strong> organizas los turnos de tu equipo, y en <strong>Distribución del Trabajo</strong> repartes las tareas diarias entre los empleados de cada turno.',
      ca:'A <strong>Horari del Personal</strong> organitzes els torns del teu equip, i a <strong>Distribució de la Feina</strong> reparteixes les tasques diàries entre els empleats de cada torn.',
      en:'In <strong>Staff Schedule</strong> you organize your team\'s shifts, and in <strong>Work Distribution</strong> you distribute daily tasks among employees in each shift.' } },
  { keywords:{es:['limpieza','plan de limpieza','appcc','protocolo de higiene'],
      ca:['neteja','pla de neteja','appcc','protocol d\'higiene'],
      en:['cleaning','cleaning plan','haccp','hygiene protocol']},
    answers:{
      es:'En <strong>Plan de Limpieza</strong> gestionas los checklists de limpieza e higiene (APPCC) para asegurar que todo queda en orden tras cada turno.',
      ca:'A <strong>Pla de Neteja</strong> gestiones els checklists de neteja i higiene (APPCC) per assegurar que tot queda en ordre després de cada torn.',
      en:'In <strong>Cleaning Plan</strong> you manage cleaning and hygiene checklists (HACCP) to ensure everything is in order after each shift.' } },
  { keywords:{es:['promocion','marketing','redes sociales','promociones','descuento en promocion'],
      ca:['promocio','marketing','xarxes socials','promocions','descompte a promocio'],
      en:['promotion','marketing','social media','promotions','discount in promotion']},
    answers:{
      es:'En <strong>Promoción</strong> puedes preparar contenido y campañas de marketing, y también crear promociones con <strong>efecto real en el TPV</strong>: marca "Aplica un descuento real", elige un plato/bebida y un %, y ese descuento se aplicará solo al pedirlo ese día (durante todo el día, no por franja horaria). Puedes marcar "Se repite cada semana" para que no haga falta recrearla. Si dos promociones con descuento coinciden en el mismo plato y fecha, la app avisa al guardar para que no compitan sin que te enteres. (Este módulo solo lo puede abrir el propietario, con el PIN de Gestión.)',
      ca:'A <strong>Promoció</strong> pots preparar contingut i campanyes de màrqueting, i també crear promocions amb <strong>efecte real al TPV</strong>: marca "Aplica un descompte real", tria un plat/beguda i un %, i aquest descompte s\'aplicarà sol en demanar-lo aquell dia (tot el dia, no per franja horària). Pots marcar "Es repeteix cada setmana" perquè no calgui recrear-la. Si dues promocions amb descompte coincideixen en el mateix plat i data, l\'app avisa en desar perquè no competeixin sense que te n\'adonis. (Aquest mòdul només el pot obrir el propietari, amb el PIN de Gestió.)',
      en:'In <strong>Promotion</strong> you can prepare marketing content and campaigns, and also create promotions with a <strong>real effect at the till</strong>: tick "Applies a real discount", pick a dish/drink and a %, and that discount is applied automatically when it\'s ordered that day (all day long, not a specific time slot). You can tick "Repeats every week" so you don\'t have to recreate it. If two discounted promotions target the same dish on the same date, the app warns you when saving so they don\'t silently compete. (Only the owner can open this module, using the Management PIN.)' } },
  { keywords:{es:['panel de control','dashboard','kpi','resumen del negocio','indicadores'],
      ca:['tauler de control','dashboard','kpi','resum del negoci','indicadors'],
      en:['dashboard','kpi','business overview','indicators']},
    answers:{
      es:'El <strong>Panel de Control</strong> muestra de un vistazo cómo va tu negocio: ventas del día, comparativas, resultado del mes, punto de equilibrio y alertas automáticas. (Este módulo solo lo puede abrir el propietario, con el PIN de Gestión.)',
      ca:'El <strong>Tauler de Control</strong> mostra d\'una ullada com va el teu negoci: vendes del dia, comparatives, resultat del mes, punt d\'equilibri i alertes automàtiques. (Aquest mòdul només el pot obrir el propietari, amb el PIN de Gestió.)',
      en:'The <strong>Dashboard</strong> shows at a glance how your business is doing: daily sales, comparisons, monthly result, break-even point and automatic alerts. (Only the owner can open this module, using the Management PIN.)' } },
  { keywords:{es:['gasto','ingreso','gestion economica','punto de equilibrio','resultado del mes','gastos e ingresos'],
      ca:['despesa','ingres','gestio economica','punt d\'equilibri','resultat del mes','despeses i ingressos'],
      en:['expense','income','financial management','break-even point','monthly result','expenses and income']},
    answers:{
      es:'En <strong>Gestión Económica</strong> registras gastos e ingresos. La app calcula automáticamente tu cuenta de resultados y tu punto de equilibrio (cuánto necesitas vender para cubrir costes). (Este módulo solo lo puede abrir el propietario, con el PIN de Gestión.)',
      ca:'A <strong>Gestió Econòmica</strong> registres despeses i ingressos. L\'app calcula automàticament el teu compte de resultats i el teu punt d\'equilibri (quant necessites vendre per cobrir costos). (Aquest mòdul només el pot obrir el propietari, amb el PIN de Gestió.)',
      en:'In <strong>Financial Management</strong> you record expenses and income. The app automatically calculates your profit and loss statement and break-even point (how much you need to sell to cover costs). (Only the owner can open this module, using the Management PIN.)' } },
  { keywords:{es:['pin','contraseña','bloquear','clave de acceso','cambiar pin','modo edicion','tipos de pin','cuantos pin'],
      ca:['pin','contrasenya','bloquejar','clau d\'acces','canviar pin','mode edicio','tipus de pin'],
      en:['pin','password','lock','access code','change pin','edit mode','types of pin']},
    answers:{
      es:'GastroGoan usa <strong>tres PINs distintos</strong>, cada uno para una cosa: 1) el <strong>PIN de Gestión</strong> (Mi Negocio), el único que da acceso a la parte económica y de configuración; 2) el <strong>PIN de fichaje</strong> de cada empleado, para fichar entrada/salida en Personal; y 3) el <strong>PIN de "modo edición"</strong> de Cocina/Sala, que por defecto es el mismo PIN de Gestión pero que el dueño puede delegar a un empleado concreto marcando "Puede entrar en modo edición" en su ficha — así ese empleado desbloquea la edición de <strong>su propia área</strong> con su propio PIN, sin poder entrar nunca a Gestión.',
      ca:'GastroGoan fa servir <strong>tres PINs diferents</strong>, cadascun per a una cosa: 1) el <strong>PIN de Gestió</strong> (El Meu Negoci), l\'únic que dona accés a la part econòmica i de configuració; 2) el <strong>PIN de fitxatge</strong> de cada empleat, per fitxar entrada/sortida a Personal; i 3) el <strong>PIN de "mode edició"</strong> de Cuina/Sala, que per defecte és el mateix PIN de Gestió però que el propietari pot delegar a un empleat concret marcant "Pot entrar en mode edició" a la seva fitxa — així aquest empleat desbloqueja l\'edició de <strong>la seva pròpia àrea</strong> amb el seu propi PIN, sense poder entrar mai a Gestió.',
      en:'GastroGoan uses <strong>three different PINs</strong>, each for a different thing: 1) the <strong>Management PIN</strong> (My Business), the only one granting access to the economic/configuration area; 2) each employee\'s <strong>clock-in PIN</strong>, for clocking in/out in Staff; and 3) the Kitchen/Floor <strong>"edit mode" PIN</strong>, which defaults to the same Management PIN but which the owner can delegate to a specific employee by ticking "Can unlock edit mode" on their record — that employee then unlocks editing for <strong>their own area only</strong> with their own PIN, never able to access Management.' } },
  { keywords:{es:['nube','firebase','sincronizar','copia de seguridad','conectar la nube','base de datos propia'],
      ca:['nuvol','firebase','sincronitzar','copia de seguretat','connectar el nuvol','base de dades propia'],
      en:['cloud','firebase','sync','backup','connect cloud','own database']},
    answers:{
      es:'En <strong>Mi Negocio</strong> conectas tu propia nube (Firebase) para sincronizar y respaldar automáticamente todos tus datos entre dispositivos. Es obligatorio configurarla la primera vez que usas la app. (Mi Negocio solo lo puede abrir el propietario, con el PIN de Gestión — salvo esta configuración inicial, que se pide antes de tener PIN.)',
      ca:'A <strong>El Meu Negoci</strong> connectes el teu propi núvol (Firebase) per sincronitzar i fer còpia de seguretat automàtica de totes les teves dades entre dispositius. És obligatori configurar-lo la primera vegada que uses l\'app. (El Meu Negoci només el pot obrir el propietari, amb el PIN de Gestió — excepte aquesta configuració inicial, que es demana abans de tenir PIN.)',
      en:'In <strong>My Business</strong> you connect your own cloud (Firebase) to automatically sync and back up all your data across devices. It must be set up the first time you use the app. (Only the owner can open My Business, using the Management PIN — except this initial setup, which is requested before any PIN exists.)' } },
  { keywords:{es:['idioma','cambiar idioma','language','catalan','ingles','castellano'],
      ca:['idioma','canviar idioma','llengua','catala','angles','castella'],
      en:['language','change language','spanish','catalan','english']},
    answers:{
      es:'Puedes cambiar el idioma de la app desde el selector de idioma en la cabecera, o desde <strong>Mi Negocio</strong>. Está disponible en castellano, català y English.',
      ca:'Pots canviar l\'idioma de l\'app des del selector d\'idioma a la capçalera, o des de <strong>El Meu Negoci</strong>. Està disponible en castellà, català i English.',
      en:'You can change the app\'s language from the language selector in the header, or from <strong>My Business</strong>. It\'s available in Spanish, Catalan and English.' } },
  { keywords:{es:['licencia','codigo de activacion','activar licencia','clave de licencia'],
      ca:['llicencia','codi d\'activacio','activar llicencia','clau de llicencia'],
      en:['license','activation code','activate license','license key']},
    answers:{
      es:'La primera vez que abres la app debes introducir tu <strong>código de activación</strong> (licencia). Una vez activada, no necesitas volver a introducirla en ese dispositivo. (Esto se pide al principio, antes de tener PIN de Gestión; una vez dentro, solo el propietario puede volver a verla en Mi Negocio.)',
      ca:'La primera vegada que obres l\'app has d\'introduir el teu <strong>codi d\'activació</strong> (llicència). Un cop activada, no l\'has de tornar a introduir en aquest dispositiu. (Això es demana al principi, abans de tenir PIN de Gestió; un cop dins, només el propietari la pot tornar a veure a El Meu Negoci.)',
      en:'The first time you open the app you must enter your <strong>activation code</strong> (license). Once activated, you don\'t need to enter it again on that device. (This is requested at the start, before any Management PIN exists; once inside, only the owner can view it again in My Business.)' } },
  { keywords:{es:['tour','ver tour','repetir tour','tutorial','volver a ver el tour'],
      ca:['tour','veure tour','repetir tour','tutorial','tornar a veure el tour'],
      en:['tour','view tour','replay tour','tutorial','watch the tour again']},
    answers:{
      es:'Puedes repetir el tour guiado en cualquier momento desde <strong>Manual de Uso</strong> (en Gestión), pulsando el botón <strong>"Iniciar tour guiado"</strong>.',
      ca:'Pots repetir el tour guiat en qualsevol moment des de <strong>Manual d\'Ús</strong> (a Gestió), prement el botó <strong>"Iniciar tour guiat"</strong>.',
      en:'You can replay the guided tour anytime from the <strong>User Manual</strong> (in Management), by pressing the <strong>"Start guided tour"</strong> button.' } },
  { keywords:{es:['enlace publico','codigo qr','qr','web de reservas','pagina web','web publica'],
      ca:['enllac public','codi qr','qr','web de reserves','pagina web','web publica'],
      en:['public link','qr code','qr','reservations website','website','public website']},
    answers:{
      es:'Con la licencia activada, en <strong>Mi Negocio</strong> tienes tu <strong>enlace público</strong> y un <strong>código QR</strong> para que tus clientes reserven mesa o hagan pedidos online sin que tengas que programar nada. (Mi Negocio solo lo puede abrir el propietario, con el PIN de Gestión.)',
      ca:'Amb la llicència activada, a <strong>El Meu Negoci</strong> tens el teu <strong>enllaç públic</strong> i un <strong>codi QR</strong> perquè els teus clients reservin taula o facin comandes en línia sense que hagis de programar res. (El Meu Negoci només el pot obrir el propietari, amb el PIN de Gestió.)',
      en:'With the license activated, in <strong>My Business</strong> you have your <strong>public link</strong> and a <strong>QR code</strong> so your customers can book a table or place online orders without you having to program anything. (Only the owner can open My Business, using the Management PIN.)' } },
  { keywords:{es:['aforo','plazas por turno','capacidad','limite de mesas','lista de espera','turno lleno','cancelar reserva'],
      ca:['aforament','places per torn','capacitat','limit de taules','llista d\'espera','torn ple','cancel·lar reserva'],
      en:['capacity','seats per shift','venue capacity','table limit','waitlist','full shift','cancel reservation']},
    answers:{
      es:'En <strong>Mi Negocio</strong> indicas tu <strong>aforo</strong> (plazas por turno) — eso solo lo puede configurar el propietario, con el PIN de Gestión. En Reservas (accesible también al personal de Sala) verás cuántas personas hay reservadas frente al aforo de cada turno, y si al confirmar una reserva se supera el aforo, puedes elegir entre <strong>confirmarla igualmente</strong>, ponerla en <strong>lista de espera</strong> (no cuenta para el aforo, con su propio botón para confirmarla cuando haya sitio) o cancelarla. Una reserva confirmada se puede <strong>cancelar</strong> sin más (queda registrada, no se borra), y si eliges un cliente con no-shows anteriores, te avisará.',
      ca:'A <strong>El Meu Negoci</strong> indiques el teu <strong>aforament</strong> (places per torn) — això només ho pot configurar el propietari, amb el PIN de Gestió. A Reserves (accessible també al personal de Sala) veuràs quantes persones hi ha reservades respecte a l\'aforament de cada torn, i si en confirmar una reserva se supera l\'aforament, pots triar entre <strong>confirmar-la igualment</strong>, posar-la en <strong>llista d\'espera</strong> (no compta per a l\'aforament, amb el seu propi botó per confirmar-la quan hi hagi lloc) o cancel·lar-la. Una reserva confirmada es pot <strong>cancel·lar</strong> sense més (queda registrada, no s\'esborra), i si tries un client amb no-shows anteriors, t\'avisarà.',
      en:'In <strong>My Business</strong> you set your <strong>capacity</strong> (seats per shift) — only the owner can configure that, using the Management PIN. In Reservations (also accessible to Floor staff) you\'ll see how many people are booked versus the capacity of each shift, and if confirming a reservation would exceed capacity, you can choose to <strong>confirm it anyway</strong>, put it on the <strong>waitlist</strong> (doesn\'t count towards capacity, with its own button to confirm once there\'s room) or cancel it. A confirmed reservation can simply be <strong>cancelled</strong> (it stays on record, it\'s not deleted), and picking a client with previous no-shows will warn you.' } },
  { keywords:{es:['verifactu','factura electronica','ticket bre','declaracion responsable','facturacion certificada'],
      ca:['verifactu','factura electronica','declaracio responsable','facturacio certificada'],
      en:['verifactu','electronic invoice','responsible declaration','certified invoicing']},
    answers:{
      es:'VeriFactu es la nueva normativa española de facturación electrónica. En <strong>Mi Negocio</strong> aparece marcada como <strong>"Vista previa"</strong>: GastroGoan ya tiene el envío a un proveedor certificado implementado y probado, pero no lo activamos todavía porque no es obligatorio para todos los negocios ni tenemos aún nuestra Declaración Responsable como fabricantes lista (eso depende de un trámite legal, no técnico). Cuando actives el envío, ten en cuenta que <strong>no se puede desactivar después</strong> (el sistema queda "exclusivamente VeriFactu"), así que actívalo solo cuando estés seguro. (Mi Negocio solo lo puede abrir el propietario, con el PIN de Gestión.)',
      ca:'VeriFactu és la nova normativa espanyola de facturació electrònica. A <strong>El Meu Negoci</strong> apareix marcada com a <strong>"Vista prèvia"</strong>: GastroGoan ja té l\'enviament a un proveïdor certificat implementat i provat, però no l\'activem encara perquè no és obligatori per a tots els negocis ni tenim encara la nostra Declaració Responsable com a fabricants a punt (això depèn d\'un tràmit legal, no tècnic). Quan activis l\'enviament, tingues en compte que <strong>no es pot desactivar després</strong> (el sistema queda "exclusivament VeriFactu"), així que activa\'l només quan n\'estiguis segur. (El Meu Negoci només el pot obrir el propietari, amb el PIN de Gestió.)',
      en:'VeriFactu is the new Spanish electronic invoicing regulation. In <strong>My Business</strong> it\'s shown as <strong>"Preview"</strong>: GastroGoan already has the submission to a certified provider implemented and tested, but it\'s not turned on yet because it isn\'t mandatory for every business and our own manufacturer\'s Responsible Declaration isn\'t ready yet (that\'s a legal step, not a technical one). When you do enable submission, keep in mind it <strong>can\'t be turned off afterwards</strong> (the system becomes "exclusively VeriFactu"), so only enable it once you\'re sure. (Only the owner can open My Business, using the Management PIN.)' } },
  { keywords:{es:['dar de alta empleado','nuevo empleado','crear empleado','alta trabajador','añadir camarero','añadir cocinero'],
      ca:['donar d\'alta empleat','nou empleat','crear empleat','alta treballador','afegir cambrer','afegir cuiner'],
      en:['add employee','new employee','create employee','hire staff','add waiter','add cook']},
    answers:{
      es:'En <strong>Horario del Personal</strong> → pestaña Personal, pulsa <strong>"+ Nuevo empleado"</strong>: nombre, rol (solo descriptivo), color identificativo para el calendario y, si quieres, teléfono/email. Se asigna automáticamente al área (Cocina o Sala) desde la que lo creas. Al final le pones un <strong>PIN de 4 dígitos</strong> — con su nombre y el código de negocio, es lo que usa para entrar desde "Acceso Empleados" en la pantalla inicial, sin que nadie tenga que "darlo de alta" antes en ese dispositivo en concreto. Si se va temporalmente, desmarca su casilla <strong>Activo</strong> (conserva su histórico); si se va del todo, elimina su ficha.',
      ca:'A <strong>Horari del Personal</strong> → pestanya Personal, prem <strong>"+ Nou empleat"</strong>: nom, rol (només descriptiu), color identificatiu per al calendari i, si vols, telèfon/email. S\'assigna automàticament a l\'àrea (Cuina o Sala) des de la qual el crees. Al final li poses un <strong>PIN de 4 dígits</strong> — amb el seu nom i el codi de negoci, és el que fa servir per entrar des de "Accés Empleats" a la pantalla inicial, sense que ningú l\'hagi de "donar d\'alta" abans en aquest dispositiu en concret. Si marxa temporalment, desmarca la casella <strong>Actiu</strong> (conserva el seu històric); si marxa del tot, elimina la seva fitxa.',
      en:'In <strong>Staff Schedule</strong> → Staff tab, click <strong>"+ New employee"</strong>: name, role (just descriptive), an identifying color for the calendar and, if you want, phone/email. It\'s automatically assigned to the area (Kitchen or Floor) you create it from. At the end you set a <strong>4-digit PIN</strong> — together with their name and the business code, that\'s what they use to log in from "Staff Access" on the start screen, without anyone needing to "register" them first on that particular device. If they leave temporarily, untick their <strong>Active</strong> checkbox (keeps their history); if they leave for good, delete their record.' } },
];
// Índice de temas navegables del centro de ayuda: agrupa las preguntas de
// HELP_FAQS (por posición) en categorías, para poder consultarlas sin tener
// que adivinar cómo escribirlas en el buscador del asistente.
const HELP_TOPIC_GROUPS = [
  { cat:{es:'TPV y Comandas', ca:'TPV i Comandes', en:'POS and Orders'}, items:[
    {idx:0, label:{es:'Abrir una mesa', ca:'Obrir una taula', en:'Open a table'}},
    {idx:1, label:{es:'Vincular una reserva al abrir mesa', ca:'Vincular una reserva en obrir taula', en:'Link a reservation when opening a table'}},
    {idx:2, label:{es:'Añadir un plato a la comanda', ca:'Afegir un plat a la comanda', en:'Add a dish to the order'}},
    {idx:3, label:{es:'Extras y modificadores', ca:'Extres i modificadors', en:'Extras and modifiers'}},
    {idx:4, label:{es:'Añadir una nota al plato', ca:'Afegir una nota al plat', en:'Add a note to a dish'}},
    {idx:5, label:{es:'Editar o borrar una nota', ca:'Editar o esborrar una nota', en:'Edit or remove a note'}},
    {idx:6, label:{es:'Tandas y marchar a cocina', ca:'Torns i enviar a cuina', en:'Courses and firing to the kitchen'}},
    {idx:7, label:{es:'Pantalla de Comandas Cocina', ca:'Pantalla de Comandes Cuina', en:'Kitchen Orders screen'}},
    {idx:8, label:{es:'Cobrar y dividir la cuenta', ca:'Cobrar i dividir el compte', en:'Charging and splitting the bill'}},
    {idx:9, label:{es:'Pedidos Take Away', ca:'Comandes Take Away', en:'Take Away orders'}},
    {idx:10, label:{es:'Pedidos Delivery', ca:'Comandes Delivery', en:'Delivery orders'}},
    {idx:11, label:{es:'Aceptar o rechazar pedidos online', ca:'Acceptar o rebutjar comandes en línia', en:'Accept or reject online orders'}},
    {idx:12, label:{es:'Cierre de caja', ca:'Tancament de caixa', en:'Cash closure'}}
  ]},
  { cat:{es:'Carta y Menús', ca:'Carta i Menús', en:'Menu'}, items:[
    {idx:13, label:{es:'Crear y organizar tu carta', ca:'Crear i organitzar la teva carta', en:'Create and organize your menu'}},
    {idx:14, label:{es:'Marcar un plato agotado', ca:'Marcar un plat esgotat', en:'Mark a dish as sold out'}},
    {idx:15, label:{es:'Configurar extras en un plato', ca:'Configurar extres en un plat', en:'Configure extras on a dish'}},
    {idx:16, label:{es:'Importar plato desde Escandallo', ca:'Importar plat des de l’Escandall', en:'Import a dish from Costing'}},
    {idx:17, label:{es:'Crear menús de precio fijo', ca:'Crear menús de preu fix', en:'Create combo menus'}}
  ]},
  { cat:{es:'Reservas y Clientes', ca:'Reserves i Clients', en:'Reservations and Customers'}, items:[
    {idx:18, label:{es:'Crear una reserva', ca:'Crear una reserva', en:'Create a reservation'}},
    {idx:19, label:{es:'Asignar mesa a una reserva', ca:'Assignar taula a una reserva', en:'Assign a table to a reservation'}},
    {idx:20, label:{es:'Marcar la llegada del cliente', ca:'Marcar l’arribada del client', en:'Mark customer arrival'}},
    {idx:21, label:{es:'Añadir un cliente nuevo', ca:'Afegir un client nou', en:'Add a new customer'}},
    {idx:22, label:{es:'Puntos de fidelización', ca:'Punts de fidelització', en:'Loyalty points'}}
  ]},
  { cat:{es:'Cocina y Costes', ca:'Cuina i Costos', en:'Kitchen and Costing'}, items:[
    {idx:23, label:{es:'Mega Lista de ingredientes', ca:'Mega Llista d’ingredients', en:'Master ingredient list'}},
    {idx:24, label:{es:'Ficha técnica y coste del plato', ca:'Fitxa tècnica i cost del plat', en:'Technical sheet and dish cost'}},
    {idx:25, label:{es:'Control de stock y pedidos a proveedor', ca:'Control d’estoc i comandes a proveïdor', en:'Stock control and purchase orders'}}
  ]},
  { cat:{es:'Personal y Limpieza', ca:'Personal i Neteja', en:'Staff and Cleaning'}, items:[
    {idx:26, label:{es:'Horario del personal y tareas', ca:'Horari del personal i tasques', en:'Staff schedule and tasks'}},
    {idx:27, label:{es:'Plan de limpieza (APPCC)', ca:'Pla de neteja (APPCC)', en:'Cleaning plan (HACCP)'}},
    {idx:39, label:{es:'Dar de alta a un empleado', ca:'Donar d’alta un empleat', en:'Add a new employee'}}
  ]},
  { cat:{es:'Gestión y Marketing', ca:'Gestió i Marketing', en:'Management and Marketing'}, items:[
    {idx:28, label:{es:'Promoción y marketing', ca:'Promoció i marketing', en:'Promotion and marketing'}},
    {idx:29, label:{es:'Panel de Control (Dashboard)', ca:'Tauler de Control (Dashboard)', en:'Dashboard'}},
    {idx:30, label:{es:'Gestión Económica y punto de equilibrio', ca:'Gestió Econòmica i punt d’equilibri', en:'Financial management and break-even'}}
  ]},
  { cat:{es:'Configuración y Cuenta', ca:'Configuració i Compte', en:'Settings and Account'}, items:[
    {idx:31, label:{es:'PIN y bloqueo de acceso', ca:'PIN i bloqueig d’accés', en:'PIN and access lock'}},
    {idx:32, label:{es:'Conectar tu nube (Firebase)', ca:'Connectar el teu núvol (Firebase)', en:'Connect your cloud (Firebase)'}},
    {idx:33, label:{es:'Cambiar el idioma', ca:'Canviar l’idioma', en:'Change the language'}},
    {idx:34, label:{es:'Activar tu licencia', ca:'Activar la teva llicència', en:'Activate your license'}},
    {idx:35, label:{es:'Repetir el tour guiado', ca:'Repetir el tour guiat', en:'Replay the guided tour'}},
    {idx:36, label:{es:'Enlace público y código QR', ca:'Enllaç públic i codi QR', en:'Public link and QR code'}},
    {idx:37, label:{es:'Configurar el aforo', ca:'Configurar l’aforament', en:'Set your venue capacity'}},
    {idx:38, label:{es:'VeriFactu (facturación electrónica)', ca:'VeriFactu (facturació electrònica)', en:'VeriFactu (electronic invoicing)'}}
  ]}
];
function renderHelpTopics(){
  const box = document.getElementById('help-topics-list');
  if(!box) return;
  const lang = getLang();
  box.innerHTML = HELP_TOPIC_GROUPS.map(g => `
    <div class="help-topic-group">
      <div class="help-topic-group-title">${escapeHtml(g.cat[lang] || g.cat.es)}</div>
      ${g.items.map(it => `<button class="help-topic-item" onclick="askHelpTopic(${it.idx})">${escapeHtml(it.label[lang] || it.label.es)}</button>`).join('')}
    </div>
  `).join('');
}
function askHelpTopic(idx){
  const faq = HELP_FAQS[idx];
  if(!faq) return;
  const lang = getLang();
  const group = HELP_TOPIC_GROUPS.flatMap(g => g.items).find(it => it.idx === idx);
  const label = group ? (group.label[lang] || group.label.es) : '';
  switchHelpTab('asistente');
  document.getElementById('help-suggestions').innerHTML = '';
  if(label) appendHelpMessage(escapeHtml(label), 'user');
  // Entrar por un tema también fija el contexto: a partir de aquí un "¿y
  // cómo?" se resuelve contra este tema, igual que si se hubiera preguntado.
  helpConvo.lastIdx = idx;
  helpConvo.misses = 0;
  appendHelpMessage((faq.answers[lang] || faq.answers.es) + helpButtonsHtml(helpRelatedIdxs(idx, 2)), 'bot');
}
let helpChatStarted = false;
function applyHelpI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
}
function toggleHelpPanel(){
  const panel = document.getElementById('help-panel');
  const opening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if(opening){
    if(!helpChatStarted){
      helpChatStarted = true;
      appendHelpMessage(t('help.assistant.welcome'), 'bot');
      renderHelpSuggestions();
    }
    renderHelpTopics();
  }
}
const HELP_TABS = ['asistente', 'temas', 'contacto'];
function switchHelpTab(tab){
  HELP_TABS.forEach(tb => {
    document.getElementById('help-tab-btn-'+tb).classList.toggle('active', tb===tab);
    document.getElementById('help-tab-'+tb).classList.toggle('active', tb===tab);
  });
}
function renderHelpSuggestions(){
  const box = document.getElementById('help-suggestions');
  const sugs = [t('help.suggestion.1'), t('help.suggestion.2'), t('help.suggestion.3'), t('help.suggestion.4')];
  box.innerHTML = sugs.map(s => `<button class="help-suggestion" onclick="askHelpSuggestion(this)">${escapeHtml(s)}</button>`).join('');
}
function askHelpSuggestion(btn){
  const text = btn.textContent;
  document.getElementById('help-suggestions').innerHTML = '';
  appendHelpMessage(escapeHtml(text), 'user');
  respondHelp(text);
}
function sendHelpMessage(){
  const input = document.getElementById('help-chat-input');
  const text = input.value.trim();
  if(!text) return;
  document.getElementById('help-suggestions').innerHTML = '';
  appendHelpMessage(escapeHtml(text), 'user');
  input.value = '';
  respondHelp(text);
}
/* ============================================================
   ASISTENTE DEL CENTRO DE AYUDA
   Antes era una búsqueda por palabras clave sin memoria: cada mensaje se
   comparaba contra HELP_FAQS y, si no llegaba a la puntuación mínima, se
   contestaba siempre lo mismo. No entendía "¿y cómo?" ni "eso no me
   funciona", no sabía nada del negocio de quien preguntaba, y ante una
   pregunta ambigua elegía una respuesta a ciegas en vez de preguntar.

   Sigue sin haber ninguna IA detrás -a propósito: cuesta dinero por
   consulta, necesita internet y mandaría fuera datos del negocio-, pero
   ahora hace cuatro cosas que antes no:
     1. Mira el estado real de la app antes de responder (helpDynamicAnswer).
        Es lo que ningún asistente externo podría hacer: sabe si quien
        pregunta es el dueño o un empleado, si la nube está configurada, si
        hay mesas dadas de alta...
     2. Recuerda de qué se estaba hablando, así que resuelve los "¿y cómo?"
        y los "no me funciona" contra la última respuesta.
     3. Si duda entre dos temas parecidos, pregunta cuál en vez de acertar
        por casualidad.
     4. Cuando falla dos veces seguidas, ofrece contactar en vez de repetir
        el mismo "no lo he encontrado".
   ============================================================ */

// De qué se está hablando ahora mismo. Es lo que convierte una lista de
// preguntas sueltas en algo que se parece a una conversación.
let helpConvo = { lastIdx: null, candidates: [], misses: 0 };

// Palabras que aparecen en casi cualquier pregunta y solo añaden ruido al
// comparar ("como", "puedo", "quiero"...).
const HELP_STOPWORDS = new Set([
  'como','com','how','que','qué','quin','what','donde','on','where','cual','quina','which',
  'para','per','for','con','amb','with','del','de','la','el','los','las','un','una','uns','unes',
  'the','and','and','por','pel','puedo','puc','can','quiero','vull','want','hacer','fer','make',
  'tengo','tinc','have','hay','hi','there','mi','meu','my','me','em','se','es','en','al','als',
  'si','yes','no','y','i','o','or','a','sobre','about','desde','des','from','esto','aixo','this'
]);

// Un hostelero no escribe "comanda", escribe "pedido", "orden" o "ticket".
// Cada fila agrupa formas de decir lo mismo: si el usuario usa cualquiera,
// cuentan todas al buscar.
const HELP_SYNONYMS = [
  ['mesa','mesas','taula','taules','table','tables'],
  ['comanda','comandas','pedido','pedidos','orden','ordenes','ticket','tickets','order','orders'],
  ['cobrar','cobro','pagar','pago','cuenta','factura','charge','pay','bill','invoice'],
  ['carta','menu','menus','menú','menús','platos','plats','dishes','dish'],
  ['empleado','empleados','camarero','camareros','personal','trabajador','treballador','staff','employee','waiter'],
  ['nube','núvol','cloud','firebase','sincronizar','sincronizacion','sync','sincronitzar'],
  ['reserva','reservas','reservar','reserves','booking','bookings'],
  ['qr','enlace','link','url','web','online'],
  ['pin','contrasena','contraseña','clave','password','acceso','access','entrar','login'],
  ['licencia','llicencia','license','codigo','codi','code','activar','activate'],
  ['stock','inventario','existencias','inventari','inventory'],
  ['escandallo','escandall','coste','cost','costo','ficha','fitxa','costing'],
  ['caja','caixa','cierre','tancament','arqueo','closure'],
  ['cocina','cuina','kitchen','kds'],
  ['sala','floor','comedor'],
  ['borrar','eliminar','quitar','esborrar','delete','remove'],
  ['cambiar','modificar','editar','canviar','change','edit'],
  ['crear','anadir','añadir','nuevo','afegir','nou','add','new','create'],
  ['agotado','agotados','agotar','acabado','acabar','acabo','terminado','esgotat','esgotar','acabat','soldout','sold','out'],
  ['nota','notas','comentario','observacion','anotacion','nota','notes','comment'],
  ['dividir','separar','partir','dividir','split','separate'],
  ['tanda','tandas','marchar','torn','torns','course','courses','fire'],
];
// Índice inverso: palabra -> grupo al que pertenece, para no recorrer la
// tabla entera en cada comparación.
const HELP_SYNONYM_INDEX = (() => {
  const idx = {};
  HELP_SYNONYMS.forEach((grupo, i) => grupo.forEach(w => { idx[w] = i; }));
  return idx;
})();

function normalizeHelpText(s){
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// Reduce una palabra a su raíz aproximada quitando los finales más comunes
// del castellano y el catalán, para que "abriendo", "abrir" y "abro" cuenten
// como la misma. No es un lematizador de verdad, pero acierta mucho más que
// cortar a 3 letras como se hacía antes: "mesa" y "menu" ya no colisionan.
function helpStem(w){
  if(w.length <= 3) return w;
  // Se quitan terminaciones de más a menos larga, incluida la vocal final:
  // sin eso "abro" (4 letras) se quedaba entero mientras "abrir" pasaba a
  // "abr", y no casaban. Cortar la vocal junta también singular y plural
  // ("mesa"/"mesas" → "mes") sin necesidad de reglas aparte.
  const raiz = w
    .replace(/(ciones|cions|mientos|ments|iendo|endo|ando|ados|idos|adas|idas)$/, '')
    .replace(/(cion|cio|miento|ment|ado|ido|ada|ida|ar|er|ir|an|en|as|os|es|a|o|e|s)$/, '');
  return raiz.length >= 3 ? raiz : w;
}
function helpTokens(s){
  const out = new Set();
  normalizeHelpText(s).split(' ').forEach(w => {
    if(!w || w.length < 2 || HELP_STOPWORDS.has(w)) return;
    out.add(helpStem(w));
    // Si la palabra pertenece a un grupo de sinónimos, se añade el grupo
    // entero como una marca común, de modo que "pedido" case con "comanda".
    const g = HELP_SYNONYM_INDEX[w];
    if(g !== undefined) out.add('§' + g);
  });
  return out;
}

// Etiquetas de la pestaña Temas indexadas por pregunta: son formas naturales
// de nombrar cada tema ("Marcar un plato agotado") y funcionan como palabras
// clave extra sin tener que duplicarlas a mano.
const HELP_LABELS_BY_IDX = (() => {
  const m = {};
  HELP_TOPIC_GROUPS.forEach(g => g.items.forEach(it => { m[it.idx] = it.label; }));
  return m;
})();

/* Puntúa cada pregunta frecuente contra lo que ha escrito el usuario y
   devuelve la lista ordenada. Se separa de "responder" para poder decidir
   fuera si hay una ganadora clara, si hay empate (y toca preguntar) o si no
   hay nada. */
function scoreHelpFaqs(text){
  const lang = getLang();
  const norm = normalizeHelpText(text);
  const tokens = helpTokens(text);
  if(!tokens.size) return [];
  // Se puntúa cada frase clave POR SEPARADO y se queda la mejor, en vez de
  // juntar las palabras de todas. Sumándolas, un tema con muchas frases
  // acumulaba coincidencias sueltas y empataba con el que trata justo de lo
  // preguntado: "cómo abro una mesa" puntuaba igual en "Abrir una mesa" que
  // en "Vincular una reserva al abrir mesa", porque su etiqueta también
  // contiene "abrir" y "mesa".
  return HELP_FAQS.map((faq, idx) => {
    const label = HELP_LABELS_BY_IDX[idx];
    const frases = (faq.keywords[lang] || faq.keywords.es)
      .concat(faq.keywords.es)
      .concat(label ? [label[lang] || label.es] : []);
    let mejorFrase = 0, frasesQueTocan = 0;
    frases.forEach(k => {
      const kn = normalizeHelpText(k);
      if(!kn) return;
      const kTokens = helpTokens(k);
      if(!kTokens.size) return;
      let comunes = 0;
      kTokens.forEach(tk => { if(tokens.has(tk)) comunes++; });
      if(!comunes) return;
      frasesQueTocan++;
      // cobertura = qué parte de la frase clave cubre la pregunta. Es el
      // factor que más pesa: una frase corta cubierta del todo ("abrir mesa")
      // describe la intención mucho mejor que media etiqueta larga.
      const cobertura = comunes / kTokens.size;
      const cuantoUsa = comunes / tokens.size;
      let puntos = comunes * 2 + cobertura * 8 + cuantoUsa * 4;
      if(norm.includes(kn)) puntos += kn.split(' ').length * 6; // frase literal
      if(puntos > mejorFrase) mejorFrase = puntos;
    });
    // Que varias frases del mismo tema toquen algo es señal débil pero real.
    const score = mejorFrase ? mejorFrase + Math.min(frasesQueTocan - 1, 3) * 0.5 : 0;
    return {idx, faq, score};
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
}

function helpAnswerOf(idx){
  const lang = getLang();
  const faq = HELP_FAQS[idx];
  return faq ? (faq.answers[lang] || faq.answers.es) : '';
}
function helpLabelOf(idx){
  const lang = getLang();
  const l = HELP_LABELS_BY_IDX[idx];
  return l ? (l[lang] || l.es) : '';
}

/* ------------------------------------------------------------
   Respuestas que dependen del estado real de este negocio.
   Se comprueban ANTES que las preguntas frecuentes: si alguien pregunta por
   qué no puede entrar en Gestión Económica, la respuesta correcta depende de
   si ha entrado como dueño o como empleado, y ninguna respuesta enlatada
   puede acertar siempre.
   ------------------------------------------------------------ */
function helpDynamicAnswer(text, idxDetectado){
  const tokens = helpTokens(text);
  const tiene = (...ws) => ws.some(w => tokens.has(helpStem(normalizeHelpText(w))));
  const session = (typeof getAccessSession === 'function') ? getAccessSession() : null;
  const esEmpleado = session && session.type === 'employee';

  // "No puedo entrar en Gestión Económica / Mi Negocio"
  if(tiene('gestion','economica','economia','minegocio') || /mi negocio|gestion economica/.test(normalizeHelpText(text))){
    if(esEmpleado) return t('help.dyn.gestionEmployee');
    return t('help.dyn.gestionOwner');
  }
  // Nube: la respuesta útil depende de si ya está configurada
  if(tiene('nube','cloud','firebase','sincronizar')){
    const cfg = (typeof getCloudConfig === 'function') ? getCloudConfig() : null;
    return cfg ? t('help.dyn.cloudOk') : t('help.dyn.cloudMissing');
  }
  // Reservas y pedidos online: sin nube no funcionan, y conviene decirlo antes
  if(tiene('reserva','qr','enlace','online')){
    const cfg = (typeof getCloudConfig === 'function') ? getCloudConfig() : null;
    if(!cfg) return t('help.dyn.onlineNeedsCloud');
  }
  // Empleados: si no hay ninguno dado de alta, eso es lo que hay que decir
  if(tiene('empleado','personal','camarero')){
    const emps = (typeof DB !== 'undefined' && DB && DB.employees) ? DB.employees.filter(e => e.active !== false) : [];
    if(!emps.length) return t('help.dyn.noEmployees');
  }
  // Mesas: igual — sin mesas configuradas, el TPV no puede abrir ninguna.
  // El tema 0 es "Abrir una mesa": si el buscador ya ha llegado ahí, da igual
  // cómo lo haya escrito el usuario.
  if(idxDetectado === 0 || idxDetectado === 1 || (tiene('mesa') && tiene('abrir','crear','anadir'))){
    const mesas = (typeof DB !== 'undefined' && DB && DB.tables) ? DB.tables : [];
    if(!mesas.length) return t('help.dyn.noTables');
  }
  return null;
}

/* ------------------------------------------------------------
   Continuaciones: mensajes que no se entienden por sí solos y solo tienen
   sentido respecto a lo último que se dijo.
   ------------------------------------------------------------ */
const HELP_FOLLOWUP_RE = /^(y |i |and )?(como|com|how|que|qué|cual|quina|y eso|i aixo|mas|més|mes|more|otra|una altra|another|no entiendo|no ho entenc|i don'?t understand|explicame|explica'm|explain|no funciona|no va|no em funciona|doesn'?t work|not working|no me sirve|no serveix|sigue igual|segueix igual|still)\b/i;
const HELP_NEGATIVE_RE = /(no funciona|no va|no me sirve|no sirve|no serveix|no em funciona|doesn'?t work|not working|no era eso|no es eso|no es aixo|sigue igual|segueix igual|still)/i;

// Temas de la misma categoría que el último respondido: es lo más parecido a
// "cuéntame más" que se puede ofrecer sin inventarse contenido nuevo.
function helpRelatedIdxs(idx, max){
  const grupo = HELP_TOPIC_GROUPS.find(g => g.items.some(it => it.idx === idx));
  if(!grupo) return [];
  return grupo.items.map(it => it.idx).filter(i => i !== idx).slice(0, max || 3);
}
function helpButtonsHtml(idxs){
  if(!idxs.length) return '';
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">' +
    idxs.map(i => `<button class="help-suggestion" onclick="askHelpTopic(${i})">${escapeHtml(helpLabelOf(i))}</button>`).join('') +
    '</div>';
}

function respondHelp(text){
  // 1. ¿Es una continuación de lo anterior? ("¿y cómo?", "no me funciona")
  const esContinuacion = HELP_FOLLOWUP_RE.test(normalizeHelpText(text)) && helpTokens(text).size <= 3;
  // Si venimos de una desambiguación todavía no hay respuesta dada, pero sí
  // sabemos entre qué temas dudábamos: sirven igual para continuar.
  const contexto = helpConvo.lastIdx !== null ? helpConvo.lastIdx
                 : (helpConvo.candidates.length ? helpConvo.candidates[0] : null);
  if(esContinuacion && contexto !== null){
    const relacionados = helpConvo.lastIdx !== null
      ? helpRelatedIdxs(helpConvo.lastIdx, 3)
      : helpConvo.candidates.slice(0, 3);
    if(HELP_NEGATIVE_RE.test(text)){
      appendHelpMessage(t('help.assistant.notWorking') + helpButtonsHtml(relacionados), 'bot');
    }else{
      appendHelpMessage(t('help.assistant.related') + helpButtonsHtml(relacionados), 'bot');
    }
    return;
  }

  // 2. Buscar entre las preguntas frecuentes (hace falta antes que el paso 3:
  //    saber de qué tema se habla es lo que permite responder con el estado
  //    real sin tener que adivinar el verbo que ha usado el usuario).
  const res = scoreHelpFaqs(text);
  const mejor = res[0];

  // 3. ¿La respuesta depende del estado real del negocio?
  const dinamica = helpDynamicAnswer(text, mejor ? mejor.idx : null);
  if(dinamica){
    helpConvo.misses = 0;
    if(mejor) helpConvo.lastIdx = mejor.idx;
    appendHelpMessage(dinamica, 'bot');
    return;
  }

  if(!mejor || mejor.score < 4){
    helpConvo.misses++;
    // Al segundo fallo seguido no tiene sentido repetir "no lo encuentro":
    // se ofrece hablar con una persona.
    appendHelpMessage(helpConvo.misses >= 2 ? t('help.assistant.escalate') : t('help.assistant.fallback'), 'bot');
    return;
  }

  // 4. Empate: dos temas casi igual de probables. Preguntar en vez de acertar
  //    por casualidad — equivocarse aquí manda al usuario a otra pantalla.
  const segundo = res[1];
  if(segundo && segundo.score >= mejor.score * 0.9 && mejor.score < 10){
    helpConvo.candidates = [mejor.idx, segundo.idx];
    const tercero = res[2] && res[2].score >= mejor.score * 0.9 ? [res[2].idx] : [];
    appendHelpMessage(
      t('help.assistant.disambiguate') + helpButtonsHtml(helpConvo.candidates.concat(tercero)),
      'bot');
    return;
  }

  // 5. Respuesta clara
  helpConvo.misses = 0;
  helpConvo.lastIdx = mejor.idx;
  appendHelpMessage(helpAnswerOf(mejor.idx) + helpButtonsHtml(helpRelatedIdxs(mejor.idx, 2)), 'bot');
}
function appendHelpMessage(html, who){
  const box = document.getElementById('help-chat-messages');
  const div = document.createElement('div');
  div.className = 'help-msg ' + who;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function openHelpContactEmail(){
  const subject = encodeURIComponent(t('help.contact.subject') + ((DB.business && DB.business.name) ? ' - ' + DB.business.name : ''));
  const body = encodeURIComponent(t('help.contact.bodyIntro') + ((DB.business && DB.business.name) ? ' ' + t('help.contact.businessSuffix').replace('${name}', DB.business.name) : '') + ':\n\n');
  window.location.href = 'mailto:gastrogoan@gmail.com?subject=' + subject + '&body=' + body;
}
// Copia el email de soporte al portapapeles, por si el cliente de correo
// del dispositivo no se abre automáticamente con el enlace mailto.
function copyHelpContactEmail(){
  const email = 'gastrogoan@gmail.com';
  const done = () => showToast(t('help.contact.copied'));
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(email).then(done).catch(done);
  } else {
    const ta = document.createElement('textarea');
    ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
    done();
  }
}

/* ===== Chat interno ===== */
const CHAT_CHANNELS = ['general', 'cocina', 'sala'];
const CHAT_CHANNEL_LABEL_KEYS = {general:'label.general', cocina:'folder.cocina.title', sala:'folder.sala.title'};
function chatChannelLabel(ch){ return t(CHAT_CHANNEL_LABEL_KEYS[ch]) || ch; }
let currentChatChannel = 'general';
// Qué canales puede VER cada uno depende del área en la que esté el
// dispositivo/persona en ese momento (currentFolder), igual que el resto de
// la app separa Cocina de Sala: en Cocina solo se ve General+Cocina, en
// Sala solo General+Sala, para que un camarero no pueda leer el chat de
// cocina ni un cocinero el de sala. El dueño/a, al entrar en Gestión (o en
// cualquier otro punto sin un área de sala/cocina concreta, como el inicio),
// ve los tres para poder supervisar ambos.
function visibleChatChannels(){
  if(currentFolder === 'cocina') return ['general', 'cocina'];
  if(currentFolder === 'sala') return ['general', 'sala'];
  return CHAT_CHANNELS.slice();
}
// Quién escribe en el chat lo determina siempre la sesión con la que se ha
// entrado — empleado con su propio PIN, o propietario con el PIN del
// negocio — igual que loggedInEmployeeId() ya usa en el resto de la app
// (mesa asignada, autorización de descuentos...) para no preguntar dos
// veces algo que ya se sabe. No hace falta ningún selector ni volver a
// verificar con PIN solo para mandar un mensaje: quien ha entrado como
// propietario ya se sabe que es el propietario, y quien ha entrado como
// empleado ya se sabe quién es.
function getChatAuthor(){
  const empId = loggedInEmployeeId();
  return empId != null ? String(empId) : 'owner';
}
function getChatAuthorName(val){
  if(val === 'owner') return t('common.chef');
  const e = DB.employees.find(x => String(x.id) === String(val));
  return e ? e.name : t('common.chef');
}
function populateChatAuthorSelect(){
  const label = document.getElementById('chat-author-row-label');
  if(label) label.textContent = t('label.writingAsName').replace('${name}', getChatAuthorName(getChatAuthor()));
}
// Oculta las pestañas de canal que no le corresponden ver a esta área
// (ver visibleChatChannels), y si el canal activo ya no es visible, cambia
// al primero que sí lo sea.
function applyChatAreaRestrictions(){
  const visible = visibleChatChannels();
  CHAT_CHANNELS.forEach(c => {
    const btn = document.getElementById('chat-tab-btn-'+c);
    if(btn) btn.style.display = visible.includes(c) ? '' : 'none';
  });
  if(!visible.includes(currentChatChannel)){
    currentChatChannel = visible[0];
  }
  CHAT_CHANNELS.forEach(c => document.getElementById('chat-tab-btn-'+c)?.classList.toggle('active', c===currentChatChannel));
}
function toggleChatPanel(){
  const panel = document.getElementById('chat-panel');
  const opening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if(opening){
    applyChatAreaRestrictions();
    populateChatAuthorSelect();
    renderChatMessages();
    markChatRead(currentChatChannel);
    updateChatBadge();
  }
}
function switchChatTab(channel){
  currentChatChannel = channel;
  CHAT_CHANNELS.forEach(c => document.getElementById('chat-tab-btn-'+c).classList.toggle('active', c===channel));
  populateChatAuthorSelect();
  renderChatMessages();
  markChatRead(channel);
  updateChatBadge();
}
function renderChatMessages(){
  const box = document.getElementById('chat-messages');
  const author = getChatAuthor();
  const msgs = (DB.chatMessages||[]).filter(m => m.channel === currentChatChannel);
  box.innerHTML = msgs.map(m => `
    <div class="help-msg ${String(m.authorId)===String(author) ? 'own' : 'other'}${m.urgent?' chat-msg-urgent':''}">
      <span class="chat-meta">${m.urgent?'<i class="ti ti-alert-triangle"></i> ':''}${escapeHtml(m.authorName)} · ${fmtHora(m.ts)}</span>
      ${escapeHtml(m.text)}
      <button class="btn btn-sm" style="margin-top:4px;font-size:10px;padding:2px 6px" onclick="pinChatMessage(${m.id})" title="${t('chat.pinMessage')}"><i class="ti ti-pin"></i></button>
    </div>
  `).join('') || `<div class="empty" style="padding:20px"><i class="ti ti-messages-off"></i> ${t('msg.noMessagesInChannelYet').replace('${channel}', escapeHtml(chatChannelLabel(currentChatChannel)))}</div>`;
  box.scrollTop = box.scrollHeight;
  renderChatPinned();
}
function sendChatMessage(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;
  const authorId = getChatAuthor();
  DB.chatMessages.push({
    id: genId(),
    channel: currentChatChannel,
    authorId,
    authorName: getChatAuthorName(authorId),
    text,
    ts: new Date().toISOString()
  });
  saveDB();
  input.value = '';
  renderChatMessages();
}

// Mensaje fijado por canal: queda arriba del todo hasta que alguien lo
// quite, para avisos del día ("hoy no hay salmón") que no deben perderse
// entre los mensajes sueltos del chat.
function renderChatPinned(){
  const box = document.getElementById('chat-pinned');
  if(!box) return;
  if(!DB.chatPinned) DB.chatPinned = {};
  const pinnedId = DB.chatPinned[currentChatChannel];
  const msg = pinnedId ? (DB.chatMessages||[]).find(m => m.id === pinnedId) : null;
  box.innerHTML = msg ? `
    <div class="chat-pinned-bar">
      <i class="ti ti-pin"></i>
      <span style="flex:1"><strong>${escapeHtml(msg.authorName)}:</strong> ${escapeHtml(msg.text)}</span>
      <button class="btn btn-sm btn-icon" onclick="unpinChatMessage()"><i class="ti ti-x"></i></button>
    </div>` : '';
}
function pinChatMessage(msgId){
  if(!DB.chatPinned) DB.chatPinned = {};
  DB.chatPinned[currentChatChannel] = msgId;
  saveDB();
  renderChatPinned();
  showToast(t('chat.pinnedOk'));
}
function unpinChatMessage(){
  if(!DB.chatPinned) return;
  delete DB.chatPinned[currentChatChannel];
  saveDB();
  renderChatPinned();
}

// Botón de "necesito ayuda ya": manda un mensaje marcado como urgente al
// canal General (lo ven todos, no solo el área actual) con un pitido, para
// pedir ayuda al encargado/dueño sin tener que ir a buscarlo físicamente.
function sendUrgentHelpAlert(){
  const authorId = getChatAuthor();
  const authorName = getChatAuthorName(authorId);
  DB.chatMessages.push({
    id: genId(), channel: 'general', authorId, authorName,
    text: t('chat.urgentDefaultText').replace('${name}', authorName),
    ts: new Date().toISOString(), urgent: true
  });
  saveDB();
  if(typeof playNewRequestAlert === 'function') playNewRequestAlert();
  if(typeof sendPushToAll === 'function') sendPushToAll('🚨 ' + authorName, t('chat.urgentDefaultText').replace('${name}', authorName));
  showToast(t('chat.urgentSent'));
  if(currentChatChannel !== 'general'){ switchChatTab('general'); } else { renderChatMessages(); }
}
function markChatRead(channel){
  localStorage.setItem('chatLastRead_'+channel, new Date().toISOString());
}
function updateChatBadge(){
  const badge = document.getElementById('chat-badge');
  if(!badge) return;
  let unread = 0;
  // Solo cuenta los canales visibles en el área actual (no avisa del área contraria).
  visibleChatChannels().forEach(c => {
    const lastRead = localStorage.getItem('chatLastRead_'+c);
    const count = (DB.chatMessages||[]).filter(m => m.channel===c && (!lastRead || m.ts > lastRead)).length;
    unread += count;
  });
  if(unread > 0){
    badge.style.display = 'flex';
    badge.textContent = unread > 9 ? '9+' : String(unread);
  } else {
    badge.style.display = 'none';
  }
}

/* ===== Chat directo dueño-empleado =====
   Reutiliza DB.chatMessages (ya en MERGEABLE_ARRAYS, ya sincroniza solo)
   con un canal 'dm:<employeeId>' por empleado — solo dos participantes,
   dueño y ese empleado. Funciones aparte de las del chat de equipo
   (renderChatMessages/sendChatMessage) porque esas usan los ids fijos
   #chat-messages/#chat-input del panel de chat interno, que está SIEMPRE
   en el DOM (aunque oculto): reusar esos mismos ids en un modal aparte
   pisaría uno de los dos con un id duplicado.
   El autor NO se decide con getChatAuthor() (la sesión general del
   dispositivo) sino con el parámetro asOwner, que refleja con qué se
   desbloqueó ESTA tarjeta en concreto: sesión de propietario, o el PIN
   del propio empleado — es más fiable en un dispositivo compartido donde
   la sesión general no tiene por qué coincidir con quién está mirando
   la ficha en ese momento. */
function directChatChannel(employeeId){ return 'dm:' + employeeId; }
let dmChatEmployeeId = null;
let dmChatAsOwner = false;
function directChatUnreadCount(employeeId, asOwner){
  const channel = directChatChannel(employeeId);
  const lastRead = localStorage.getItem('chatLastRead_'+channel);
  const otherAuthor = asOwner ? String(employeeId) : 'owner';
  return (DB.chatMessages||[]).filter(m => m.channel===channel && String(m.authorId)===otherAuthor && (!lastRead || m.ts > lastRead)).length;
}
function openEmployeeDirectChat(employeeId, asOwner){
  const e = DB.employees.find(x=>x.id===employeeId);
  if(!e) return;
  dmChatEmployeeId = employeeId;
  dmChatAsOwner = asOwner;
  const otherName = asOwner ? e.name : t('common.chef');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-message"></i> ${escapeHtml(otherName)}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="help-chat-messages" id="dm-chat-messages" style="max-height:50vh"></div>
    <div class="help-chat-input-row">
      <input type="text" id="dm-chat-input" placeholder="${t('ph.writeMessage')}" onkeydown="if(event.key==='Enter') sendDirectChatMessage()">
      <button onclick="sendDirectChatMessage()"><i class="ti ti-send"></i></button>
    </div>
  `);
  renderDirectChatMessages();
  markChatRead(directChatChannel(employeeId));
}
function renderDirectChatMessages(){
  const box = document.getElementById('dm-chat-messages');
  if(!box || dmChatEmployeeId == null) return;
  const author = dmChatAsOwner ? 'owner' : String(dmChatEmployeeId);
  const msgs = (DB.chatMessages||[]).filter(m => m.channel === directChatChannel(dmChatEmployeeId));
  box.innerHTML = msgs.map(m => `
    <div class="help-msg ${String(m.authorId)===author ? 'own' : 'other'}">
      <span class="chat-meta">${escapeHtml(m.authorName)} · ${fmtHora(m.ts)}</span>
      ${escapeHtml(m.text)}
    </div>
  `).join('') || `<div class="empty" style="padding:20px"><i class="ti ti-messages-off"></i> ${t('chat.dmEmpty')}</div>`;
  box.scrollTop = box.scrollHeight;
}
function sendDirectChatMessage(){
  const input = document.getElementById('dm-chat-input');
  const text = input.value.trim();
  if(!text || dmChatEmployeeId == null) return;
  const authorId = dmChatAsOwner ? 'owner' : dmChatEmployeeId;
  DB.chatMessages.push({
    id: genId(),
    channel: directChatChannel(dmChatEmployeeId),
    authorId,
    authorName: getChatAuthorName(authorId),
    text,
    ts: new Date().toISOString()
  });
  saveDB();
  input.value = '';
  renderDirectChatMessages();
}

/* ============== Áreas de trabajo ============== */
const FOLDERS = {
  cocina: {
    icon:'ti-tools-kitchen-2', color:'var(--teal)',
    modules:[
      {id:'comandascocina', icon:'ti-bell-ringing'},
      {id:'carta', icon:'ti-tools-kitchen-2'},
      {id:'idr', icon:'ti-flask'},
      {id:'proveedores', icon:'ti-building-factory-2'},
      {id:'megalista', icon:'ti-list-details'},
      {id:'escandallo', icon:'ti-calculator'},
      {id:'fichas', icon:'ti-file-description'},
      {id:'pedidos', icon:'ti-shopping-cart'},
      {id:'stock', icon:'ti-package'},
      {id:'horarios', icon:'ti-calendar-time'},
      {id:'distribucion', icon:'ti-clipboard-list'},
      {id:'limpieza', icon:'ti-spray'},
    ]
  },
  sala: {
    icon:'ti-users', color:'var(--brand-yellow)',
    modules:[
      {id:'tpv', icon:'ti-device-desktop'},
      {id:'reservas', icon:'ti-calendar-event'},
      {id:'clientes', icon:'ti-address-book'},
      {id:'carta', icon:'ti-glass-cocktail'},
      {id:'proveedores', icon:'ti-building-factory-2'},
      {id:'megalista', icon:'ti-list-details'},
      {id:'escandallo', icon:'ti-calculator'},
      {id:'fichas', icon:'ti-file-description'},
      {id:'stock', icon:'ti-package'},
      {id:'pedidos', icon:'ti-shopping-cart'},
      {id:'horarios', icon:'ti-calendar-time'},
      {id:'distribucion', icon:'ti-clipboard-list'},
      {id:'limpieza', icon:'ti-spray'},
      {id:'promocion', icon:'ti-speakerphone'},
    ]
  },
  gestion: {
    icon:'ti-coin', color:'var(--teal)',
    modules:[
      {id:'manual', icon:'ti-book'},
      {id:'minegocio', icon:'ti-building-store'},
      {id:'dashboard', icon:'ti-layout-dashboard'},
      {id:'economia', icon:'ti-coin'},
    ]
  }
};
// Módulos que solo aportan valor si se pueden editar de verdad (costes,
// márgenes, gestión de proveedores...): a un empleado sin permiso de
// edición no le sirve de nada verlos en modo solo-lectura, así que
// directamente no aparecen en su carpeta — menos ruido, y no ve datos de
// coste/margen que no le corresponden. El propietario y quien SÍ tiene
// permiso de editar (canUnlockEdit) los siguen viendo todos.
const HIDDEN_MODULES_WHEN_LOCKED = {
  cocina: ['carta', 'proveedores', 'megalista', 'escandallo'],
  sala: ['carta', 'proveedores', 'megalista', 'escandallo']
};
const MODULE_FOLDER = {};
Object.entries(FOLDERS).forEach(([key, f]) => f.modules.forEach(m => { if(MODULE_FOLDER[m.id] === undefined) MODULE_FOLDER[m.id] = key; }));

let currentFolder = null;

/* Devuelve el área (Cocina/Sala) según la carpeta de trabajo actual.
   Los módulos compartidos (Mega Lista, Escandallo, Stock, etc.) se
   filtran por esta área para mantener cocina y sala separados. */
function currentArea(){
  return currentFolder === 'sala' ? 'sala' : 'cocina';
}

// Última área (Cocina/Sala) en la que el usuario estuvo trabajando de
// verdad, para que las pantallas de Gestión (Manual, etc.) que no
// pertenecen a ninguna de las dos áreas puedan mostrar contenido area-aware
// con criterio, en vez de asumir siempre Cocina por defecto.
let lastArea = localStorage.getItem('gg_last_area') || 'cocina';
function rememberLastArea(key){
  if(key === 'cocina' || key === 'sala'){
    lastArea = key;
    localStorage.setItem('gg_last_area', key);
  }
}

/* ============== Navigation ============== */
function goHome(){
  const session = getAccessSession();
  if(session && session.type === 'employee'){
    // Un empleado no tiene "Inicio": su única carpeta es su área de
    // trabajo, así que "ir a inicio" simplemente se queda en ella.
    openFolder(session.area);
    return;
  }
  if(!(session && session.type === 'owner')) lockEditMode();
  if(ownerUnlocked){ ownerUnlocked = false; const lockBtn = document.getElementById('lock-btn'); if(lockBtn) lockBtn.style.display = 'none'; }
  areaUnlocked = {cocina:false, sala:false};
  navigate('home');
}
function openFolder(key){
  const session = getAccessSession();
  // Un empleado solo puede estar en su propia área — nunca en la otra.
  if(session && session.type === 'employee' && session.area) key = session.area;
  if(!(session && session.type === 'owner')) lockEditMode();
  if(ownerUnlocked){ ownerUnlocked = false; const lockBtn = document.getElementById('lock-btn'); if(lockBtn) lockBtn.style.display = 'none'; }
  // Igual que Gestión: salir de Cocina/Sala (o simplemente volver a entrar)
  // vuelve a pedir el PIN del área la próxima vez.
  areaUnlocked = {cocina:false, sala:false};
  currentFolder = key;
  rememberLastArea(key);
  navigate('folder');
  // Si el chat quedó abierto de antes, actualiza qué pestañas puede ver
  // ahora que ha cambiado de área (Cocina/Sala/Gestión).
  if(document.getElementById('chat-panel')?.classList.contains('active')){
    applyChatAreaRestrictions();
    renderChatMessages();
  }
}
let ownerUnlocked = false;
let tourOwnerUnlockedByTour = false;
let editUnlocked = false;

// Sesión de propietario real, a diferencia de editUnlocked (que también
// tiene un empleado con "puede editar" activo). Úsalo en cualquier acción
// que toque datos de OTRO empleado (asignar/quitar tareas o platos suyos,
// gestionar su ficha, etc.) — editUnlocked por sí solo no basta para eso.
function isOwnerSession(){
  return document.body.classList.contains('owner-session');
}

function lockEditMode(){
  editUnlocked = false;
  document.body.classList.remove('edit-unlocked');
}

// Quien entró por "Acceso Propietarios" ya se identificó a nivel de
// dispositivo: no tiene sentido pedirle otro PIN más para poder editar
// Cocina/Sala (antes hacía falta aunque ya fueras el dueño). Se llama al
// iniciar sesión como propietario y al reanudar una sesión de propietario
// guardada en el arranque.
//
// "owner-session" es distinto de "edit-unlocked": edit-unlocked (.owner-only)
// se concede también a un empleado con canUnlockEdit, pensado solo para que
// no tenga que pedir PIN para tocar turnos/inventario de SU área. Pero eso
// dejaba a la vista (y accionables) botones pensados solo para el
// propietario real — editar la ficha de otro compañero, resetearle el PIN,
// aprobar sus vacaciones o cambios de turno — a cualquier empleado con ese
// permiso, aunque nunca se le quiso dar gestión de personal de todo el
// equipo. .owner-strict (gobernado por esta clase) solo se muestra en una
// sesión de propietario de verdad.
function applyOwnerSessionEditRights(){
  editUnlocked = true;
  document.body.classList.add('edit-unlocked', 'owner-session');
}

// Un empleado ya se identificó con su propio PIN al entrar por "Acceso
// Empleados" — no tiene sentido pedirle un PIN otra vez para editar. Ya no
// hay botón que pulsar: si el propietario marcó su ficha como "puede
// editar" (canUnlockEdit), entra directamente en modo edición de su área;
// si no, se queda en vista de solo consulta, sin ningún control para
// cambiarlo. Se llama al iniciar sesión de empleado y al reanudarla.
function applyEmployeeSessionEditRights(employeeId){
  document.body.classList.remove('owner-session');
  const emp = (DB.employees||[]).find(e => e.id === employeeId);
  if(emp && emp.canUnlockEdit){
    editUnlocked = true;
    document.body.classList.add('edit-unlocked');
  }else{
    lockEditMode();
  }
}

// Los 4 módulos de HIDDEN_MODULES_WHEN_LOCKED (más arriba) solo se ocultaban
// en el listado de la carpeta — un empleado sin canUnlockEdit podía seguir
// entrando a navigate('carta')/renderView('escandallo') directamente (URL a
// mano, o simplemente llamando la función desde la consola), viendo costes y
// márgenes que por diseño no le corresponden, y en varias de sus funciones
// de creación/edición podía además guardar cambios reales (el borrado ya
// comprobaba permiso, pero crear/editar no). Este guard es la protección de
// verdad, no solo la de ocultarlos en el listado.
function isReadonlyLockedModule(view){
  if(isOwnerSession() || editUnlocked) return false;
  return ['carta', 'proveedores', 'megalista', 'escandallo'].includes(view);
}
function isGestionLocked(view){
  if(ownerUnlocked) return false;
  // Quien ya entró por "Acceso Propietarios" no tiene que volver a meter el
  // PIN del negocio para entrar en Gestión — ya se identificó como
  // propietario a nivel de dispositivo/sesión, igual que ya pasa con Cocina
  // y Sala (ver isOperationalAreaLocked). Antes esto solo miraba
  // "ownerUnlocked" (que solo se pone a true metiendo el PIN aquí mismo),
  // así que una sesión de propietario de verdad tenía que desbloquear
  // Gestión con PIN de todos modos — justo lo contrario de "solo puede
  // verlo él".
  const session = getAccessSession();
  if(session && session.type === 'owner') return false;
  if(MODULE_FOLDER[view] === 'gestion') return true;
  if(view === 'folder' && currentFolder === 'gestion') return true;
  return false;
}

// A qué carpeta pertenece de verdad esta vista, dando prioridad a la carpeta
// en la que ya se está trabajando (algunos módulos como Stock/Escandallo
// existen tanto en Cocina como en Sala; MODULE_FOLDER solo recuerda la
// primera que los declaró, así que por sí solo no basta para saber en cuál
// de las dos está realmente el usuario ahora mismo).
function resolveTargetFolder(view){
  const inCurrentFolder = currentFolder && FOLDERS[currentFolder] && FOLDERS[currentFolder].modules.some(m => m.id === view);
  return inCurrentFolder ? currentFolder : MODULE_FOLDER[view];
}

// Antes cualquiera con el dispositivo delante podía usar TPV/Cocina/Sala sin
// identificarse en absoluto — el único PIN real era para Gestión. Esto hace
// imposible revocar de verdad a un empleado que se marcha: si nadie tiene
// que identificarse para entrar, borrarlo no impide a nadie más seguir
// usando el dispositivo con normalidad. Ahora, para entrar en Cocina o Sala
// hace falta el PIN de alguien de esa área (activo), o el PIN del negocio
// ("Soy el propietario") — igual de simple que el desbloqueo de Gestión,
// sin fichar ni elegir nombre de una lista: solo un PIN. areaUnlocked dura
// mientras se está "dentro" de esa carpeta, igual que ownerUnlocked para
// Gestión, y se resetea cada vez que se abre una carpeta (ver openFolder).
// Si esa área no tiene ningún empleado registrado, no se pide PIN (no hay
// a quién pedírselo — típico de un negocio muy pequeño donde el propio
// dueño lo hace todo sin dar de alta "empleados").
let areaUnlocked = {cocina:false, sala:false};
function isOperationalAreaLocked(view){
  if(ownerUnlocked) return false;
  // Quien ya entró por "Acceso Propietarios" en la pantalla de arranque no
  // tiene que volver a identificarse para Cocina/Sala — ya se autenticó a
  // nivel de dispositivo. Este candado por área queda como red de seguridad
  // para accesos que se salten esa pantalla (enlaces directos, etc.).
  const session = getAccessSession();
  if(session && session.type === 'owner') return false;
  const targetFolder = view === 'folder' ? currentFolder : resolveTargetFolder(view);
  if(targetFolder !== 'cocina' && targetFolder !== 'sala') return false;
  if(session && session.type === 'employee' && session.area === targetFolder) return false;
  if(areaUnlocked[targetFolder]) return false;
  const areaEmps = (DB.employees||[]).filter(e => (e.area||'cocina') === targetFolder);
  if(!areaEmps.length) return false;
  return true;
}

let areaGatePendingView = null;
function requestFichaGate(view){
  areaGatePendingView = view;
  const area = view === 'folder' ? currentFolder : resolveTargetFolder(view);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${area === 'sala' ? t('folder.sala.title') : t('folder.cocina.title')}</h3>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('msg.areaPinDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="area-gate-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmAreaGatePin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal();goHome()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmAreaGatePin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('area-gate-pin-input')?.focus(), 50);
}
function confirmAreaGatePin(){
  const view = areaGatePendingView;
  const area = view === 'folder' ? currentFolder : resolveTargetFolder(view);
  const val = document.getElementById('area-gate-pin-input').value;
  const areaEmps = (DB.employees||[]).filter(e => (e.area||'cocina') === area && e.active !== false);
  const matches = areaEmps.some(e => pinMatchesEmployeeOrBusiness(val, e));
  if(!matches){ showToast(t('msg.pinIncorrect')); return; }
  areaUnlocked[area] = true;
  closeModal();
  areaGatePendingView = null;
  navigate(view);
}

// Al cambiar de sub-pestaña dentro de una vista (Gestión Económica, Stock,
// Reservas, Promoción, APPCC...) la pestaña nueva casi nunca mide lo mismo
// que la anterior — si era más corta, el navegador recorta el scroll solo
// porque ya no hay tanto que desplazar, y eso se sentía como "cada vez que
// toco una pestaña vuelve al inicio" de forma impredecible según cuál
// tocaras. Forzar el scroll arriba SIEMPRE, a propósito, hace que cambiar
// de pestaña se comporte igual de previsible en todas partes: siempre
// empiezas a ver la pestaña nueva desde su principio.
function scrollContentToTop(){
  const c = document.querySelector('.content');
  if(c) c.scrollTop = 0;
}

// Las filas de pestañas (.ge-tab-row) hacen scroll horizontal cuando no
// caben todas en la pantalla del móvil. Sin esto, al tocar una pestaña que
// queda fuera de la vista (p.ej. "CAPEX" al final de Gestión Económica) la
// fila no se movía sola: parecía que el toque no había hecho nada porque
// la pestaña que se marcaba como activa quedaba fuera de pantalla.
function scrollActiveTabIntoView(rowEl){
  if(!rowEl) return;
  const active = rowEl.querySelector('.ge-tab.active');
  if(active) active.scrollIntoView({block:'nearest', inline:'nearest', behavior:'smooth'});
}

function navigate(view){
  if(view === 'home'){
    const session = getAccessSession();
    if(session && session.type === 'employee'){ goHome(); return; }
  }
  if(isGestionLocked(view)){
    denyGestionAccess();
    return;
  }
  if(isReadonlyLockedModule(view)){
    showToast(t('msg.needsEditPermission'));
    goHome();
    return;
  }
  if(isOperationalAreaLocked(view)){
    requestFichaGate(view);
    return;
  }

  const prevActive = document.querySelector('.view.active');
  const wasAlreadyInPedidos = prevActive && prevActive.id === 'view-pedidos';
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if(target) target.classList.add('active');

  // Entrar en Pedidos desde otro módulo siempre aterriza en la lista del
  // historial, nunca directo en el detalle del último pedido que se hubiera
  // abierto — si no, parecía que "saltaba" a un pedido al azar en vez de
  // dejar elegir cuál mirar.
  if(view === 'pedidos' && !wasAlreadyInPedidos) pedidoDetailId = null;

  const inCurrentFolder = currentFolder && FOLDERS[currentFolder] && FOLDERS[currentFolder].modules.some(m => m.id === view);
  if(!inCurrentFolder && MODULE_FOLDER[view]) currentFolder = MODULE_FOLDER[view];

  renderView(view);
  location.hash = view;
}

// Gestión (Gestión Económica, Mi Negocio) es exclusiva del propietario: una
// sesión de propietario ya pasa de largo en isGestionLocked() (ver esa
// función), así que si se llega aquí es siempre una sesión de empleado —
// antes se ofrecía un PIN compartido para entrar igualmente, pero ese PIN
// quedaba en su valor por defecto hasta que alguien lo cambiara, así que
// cualquier empleado que lo supiera (o lo adivinara) podía entrar y
// quedarse con acceso exclusivo. Ahora Gestión simplemente no es
// accesible fuera de una sesión de propietario, sin PIN de por medio.
function denyGestionAccess(){
  showToast(t('msg.gestionOwnerOnly'));
  goHome();
}
// isGestionLocked() ya se comprueba en navigate() antes de llegar aquí,
// pero eso no protege una llamada directa a renderView('economia') o
// renderView('minegocio') desde la consola del navegador saltándose
// navigate() por completo — por eso se repite aquí, como último punto de
// paso real antes de pintar cualquier vista.
function renderView(view){
  if(isGestionLocked(view)){ denyGestionAccess(); return; }
  // Última barrera antes de pintar, por si se llega aquí saltándose
  // navigate() (p.ej. renderView('escandallo') a mano desde la consola de
  // un empleado sin permiso de edición).
  if(isReadonlyLockedModule(view)){ showToast(t('msg.needsEditPermission')); goHome(); return; }
  switch(view){
    case 'home': renderHome(); break;
    case 'folder': renderFolder(); break;
    case 'dashboard': renderDashboard(); break;
    case 'idr': renderIdr(); break;
    case 'megalista': renderMegalista(); break;
    case 'proveedores': renderProveedores(); break;
    case 'escandallo': renderEscandallo(); break;
    case 'fichas': renderFichas(); break;
    case 'carta': renderOferta(); break;
    case 'tpv': renderTPV(); break;
    case 'comandascocina': renderComandasCocina(); break;
    case 'stock': renderStock(); break;
    case 'pedidos': renderPedidos(); break;
    case 'economia': GE.init(); break;
    case 'horarios': renderHorarios(); break;
    case 'limpieza': renderLimpieza(); break;
    case 'clientes': renderClientes(); break;
    case 'reservas': renderReservas(); break;
    case 'promocion': renderPromocion(); break;
    case 'distribucion': renderDistribucion(); break;
    case 'minegocio': renderMiNegocio(); break;
    case 'manual': renderManual(); break;
  }
  requestAnimationFrame(function(){ if(typeof runPolishAnimations==='function') runPolishAnimations(); });
}

function renderHome(){
  document.querySelector('#view-home .hero-badge').innerHTML = `<i class="ti ti-star"></i> ${escapeHtml(t('home.heroBadge'))}`;
  document.querySelector('#view-home .home-hero h1').textContent = t('home.title');
  document.querySelector('#view-home .home-hero p').textContent = t('home.subtitle');
  document.getElementById('home-folders').innerHTML = Object.entries(FOLDERS).map(([key, f]) => `
    <div class="folder-card folder-${key}" style="--folder-color:${f.color}" onclick="openFolder('${key}')">
      <span class="folder-icon"><i class="ti ${f.icon}"></i></span>
      <h2>${escapeHtml(t(`folder.${key}.title`))}</h2>
      <div class="folder-btn"><i class="ti ti-arrow-right"></i> ${escapeHtml(t('common.enter'))}</div>
    </div>
  `).join('');
}

function renderFolder(){
  const f = FOLDERS[currentFolder];
  if(!f){ navigate('home'); return; }
  document.getElementById('folder-title').innerHTML = `<i class="ti ${f.icon}"></i> ${escapeHtml(t(`folder.${currentFolder}.title`))}`;
  document.getElementById('folder-subtitle').textContent = t(`folder.${currentFolder}.subtitle`);
  // Ya no hay botón de editar que pulsar: el propietario siempre edita, y
  // un empleado edita automáticamente si su ficha lo autoriza (ver
  // applyEmployeeSessionEditRights) — nada que desbloquear a mano.
  const session = getAccessSession();
  const homeBtn = document.getElementById('folder-home-btn');
  // Un empleado no tiene "Inicio": solo existe su propia área de trabajo.
  if(homeBtn) homeBtn.style.display = (session && session.type === 'employee') ? 'none' : '';
  const hiddenIds = editUnlocked ? [] : (HIDDEN_MODULES_WHEN_LOCKED[currentFolder] || []);
  const visibleModules = f.modules.filter(m => !hiddenIds.includes(m.id));
  document.getElementById('folder-modules').innerHTML = visibleModules.map(m => `
    <div class="module-card" onclick="navigate('${m.id}')">
      <i class="ti ${m.icon} module-icon"></i>
      <h3>${escapeHtml(t(`module.${currentFolder}.${m.id}.name`))}</h3>
      <p>${escapeHtml(t(`module.${currentFolder}.${m.id}.desc`))}</p>
      <div class="module-open"><i class="ti ti-arrow-right"></i> ${escapeHtml(t('common.open'))}</div>
    </div>
  `).join('');
  if(typeof renderModuleBadges === 'function') renderModuleBadges();
}

/* ============== Modal helpers ============== */
function openModal(html, opts){
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  box.classList.toggle('modal-xl', !!(opts && opts.xl));
  box.classList.toggle('modal-order', !!(opts && opts.order));
  wrapModalBody(box);
  document.getElementById('modal-overlay').classList.add('active');
}

// Envuelve automáticamente todo lo que no sea el header ni el pie de un
// modal en un contenedor ".modal-body" con su propio scroll independiente.
// Sin esto, con el pie "sticky" (para que nunca quede inalcanzable) y todo
// dentro del mismo scroll que el resto del contenido, el pie se queda
// pegado al fondo visible desde el principio del scroll (por ser el último
// elemento) y tapa las últimas filas de campos/casillas hasta llegar al
// final del todo — en formularios largos (p.ej. Nuevo Ingrediente con la
// rejilla de alérgenos) se veía como si el contenido "desapareciera" detrás
// del pie. Con el header y el pie fuera del área que hace scroll, nunca
// puede haber solape: el cuerpo se detiene justo donde empieza el pie.
// Se aplica en el propio openModal() para que beneficie a todos los
// modales de la app sin tener que tocar cada uno por separado.
function wrapModalBody(box){
  const header = box.querySelector(':scope > .modal-header');
  const footer = box.querySelector(':scope > .modal-footer');
  const body = document.createElement('div');
  body.className = 'modal-body';
  [...box.childNodes].forEach(node => {
    if(node === header || node === footer) return;
    body.appendChild(node);
  });
  if(header) header.after(body);
  else box.prepend(body);
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-box').innerHTML = '';
  document.getElementById('modal-box').classList.remove('modal-xl');
  document.getElementById('modal-box').classList.remove('modal-order');
}
document.getElementById('modal-overlay').addEventListener('click', (e)=>{
  if(e.target.id !== 'modal-overlay') return;
  // Tocar fuera del cuadro (gesto habitual, sobre todo en móvil) antes
  // cerraba el modal sin más — si había un confirmModal()/alertModal()/
  // promptText() pendiente, su Promise se quedaba colgada para siempre y
  // el código que la esperaba (p.ej. un location.reload() tras guardar)
  // no llegaba a ejecutarse nunca, sin ningún aviso. Ahora se resuelve
  // igual que si se hubiera pulsado el botón correspondiente.
  if(typeof pendingConfirmModalResolve !== 'undefined' && pendingConfirmModalResolve) return cancelConfirmModal();
  if(typeof pendingAlertModalResolve !== 'undefined' && pendingAlertModalResolve) return acceptAlertModal();
  if(typeof pendingTextPromptResolve !== 'undefined' && pendingTextPromptResolve) return cancelTextPrompt();
  closeModal();
});

