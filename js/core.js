/* ============================================================
   GASTROGOAN · KIT DE GESTIÓN HOSTELERA
   App con sincronización en la nube (Firebase) y respaldo local
   ============================================================ */

const DB_KEY = 'gastrogoan_data_v1';

// Monograma "gg" de GastroGoan, usado como icono por defecto (splash, header,
// pantallas de acceso) cuando el negocio no ha subido su propio logo.
const GASTROGOAN_LOGO_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAABO9UlEQVR42u2dd5xcdbn/3+d76vTZvptNQnohARJiaAIiVVBAEBEBGwLK9arc+7teFbsXRS+Wq14boHixgKKgCARpAgqElgSSAOk92U2279RTf3+cmckmhJCEZM5Mcj6v15pNZHfOPPN9Pk/5PkUyCxmPECFCHJIQoQhChAgJIESIECEBhAgRIiSAECFChAQQIkSIkABChAgREkCIECFCAggRIkRIACFChAgJIESIECEBhAgRIiSAECFChAQQIkSIkABChAgREkCIECFCAggRIkRIACFChAgJIESIECEBhAgRIiSAECFChAQQIkSIkABChAgREkCIECFCAggRIkRIACFChAgJIESIECEBhAgRIiSAECFChAQQIkSIkABChAixl1BCERya8Dxvl9/vlfUQof3YQY57/9NISEiSFBJAiAN7SMtfZciyjCzLvhILeZ9+r20W95k86hGu5+6g5UIIX4aShCRk2Ac9dmwb13VDAgix/5W+fLB0XUeSNUaeULOQYWhoiGw2x/Dw0D4p8mGHHYamaQctCYwkTSEEum6AVCZLCauYI5fPUygWyOVzOHuhyBISrufSlG4kHovjeW5IACH2g5VyXVzXJRKJgNAA6N6ygQ0bNrBq1Sqee+55NmzYwNDQINlslkwmx/DwIK7r7fXrPPLIw0yYNIliPn9QhQOe5+F6LpqiIlS9ouwr16xiw+aNrN+8iY1bNtG9bStFq0gunyebz+E4DtIeugFCCDK5LFdcfDmXvPt9FPPZQGQYEsBBpPiSJKFH4oDExvWrefLJJ/n73x/jueeeY9OmTRSLxcoBHxkCyLK813Go67oHneUvK76qqGhqnMGBHpatXsTj8//J+s0bWbdpA0PDwwgh4Xm+EgshISSBkMUeK3+ZAEzTpGgWA33PIQEcJK6+EY2D5/DQ3+7nzjvv5LnnnmfNmjU+Keg6mqZhGMYOPzfyz5BAXRRFQVPjDA328tA/7+Pehx9g3ab1JWWX0DWdRDz+Gvlv/8uev56QBEKIQBOAIQEcLIfWiPPSiy/wzW98g7///TEKhQLRaJR0Or2DtXYcZ78Sz8FCoAB6JMrQYD+333MbTz7/DBs2b0RVFWLR2GvCq/3yung1IcOQAOpV+R0HzYiQy2b40Y038uMf/4RM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';

/* ============================================================
   MULTI-NEGOCIO — varias licencias desde el mismo PC/navegador
   Cada negocio vive en su propio "slot": su propia base IndexedDB y
   su propia licencia guardada, totalmente independientes entre sí.
   El slot 'default' es el negocio original (las instalaciones ya
   existentes siguen funcionando igual, sin migración).
   ============================================================ */
const ACTIVE_SLOT_LS = 'gastrogoan_active_slot';
const SLOTS_LS = 'gastrogoan_business_slots';

function getActiveSlot(){
  return localStorage.getItem(ACTIVE_SLOT_LS) || 'default';
}

// El código corto de cada negocio (usado tanto para activar la licencia
// como para el login de empleados) ya no se genera aquí al azar: es el
// mismo código de la licencia comprada (ver redeemBusinessCode), y se
// guarda en slot.code en el momento de activarla o de registrar un negocio/
// sucursal nuevo.
function getBusinessSlots(){
  let slots;
  try{
    const list = JSON.parse(localStorage.getItem(SLOTS_LS));
    if(Array.isArray(list) && list.length) slots = list;
  }catch(e){}
  if(!slots){
    slots = [{ id:'default', name:'Mi negocio' }];
    localStorage.setItem(SLOTS_LS, JSON.stringify(slots));
  }
  return slots;
}

function saveBusinessSlots(slots){
  localStorage.setItem(SLOTS_LS, JSON.stringify(slots));
}

/* La lista de negocios se guarda POR DISPOSITIVO. Sin nada más, al entrar
   otro dueño en el mismo aparato le aparecían —y podía abrir— los negocios
   del anterior: un problema de verdad si un cliente presta la tablet, la
   revende, o simplemente si dos socios usan el mismo mostrador.

   Cada negocio lleva ahora el `ownerId` de quien lo canjeó (el id ESTABLE
   del dueño, derivado solo del usuario: no cambia aunque cambie el PIN) y
   el selector solo enseña los suyos. Los datos de los demás siguen en el
   aparato, pero no se listan ni se pueden abrir desde otra cuenta. */
function currentOwnerId(){
  const login = getOwnerLogin();
  return login && login.user ? ggOwnerId(login.user) : null;
}
// Los negocios que ya existían antes de este cambio no llevan ownerId. En
// ese momento solo había una cuenta en el aparato —canjear exige estar
// dentro— así que son de quien tiene la sesión guardada: se le adjudican al
// arrancar, y así ningún cliente ve desaparecer sus negocios al actualizar.
/* Esta adjudicación es para UN caso y solo uno: un cliente que ya tenía sus
   negocios aquí antes de que existiera el `ownerId`, y que al actualizar se
   los encontraría sin dueño y, por tanto, invisibles.

   Pero es peligrosa, porque adjudica al que esté delante. Si el primero en
   entrar tras la actualización es una cuenta RECIÉN CREADA (justo lo que
   pasa cuando se da de alta a un cliente en un aparato que ya se usó), esa
   cuenta se quedaba con el negocio del anterior: sus ventas, sus
   proveedores y sus nóminas, a la vista de otra persona.

   Por eso ocurre UNA sola vez por dispositivo, y solo desde el arranque —
   es decir, para la cuenta que YA estaba usando este aparato. En cuanto
   alguien se identifica, la puerta se cierra para siempre. Un dueño que
   quede fuera por este cierre recupera lo suyo en cuanto entre con
   internet: syncOwnerBusinessList reclama sus negocios por el código. */
const SLOTS_MIGRATED_LS = 'gastrogoan_slots_owner_migrated';
function migrateSlotOwners(){
  if(localStorage.getItem(SLOTS_MIGRATED_LS)) return;
  const me = currentOwnerId();
  if(!me) return;
  const slots = getBusinessSlots();
  let changed = false;
  slots.forEach(s => { if(s.code && !s.ownerId){ s.ownerId = me; changed = true; } });
  if(changed) saveBusinessSlots(slots);
  localStorage.setItem(SLOTS_MIGRATED_LS, me);
}
// Cierra la puerta de la adjudicación: a partir de que alguien se
// identifica en este aparato, ninguna cuenta puede heredar ya nada.
function cerrarAdjudicacionDeNegocios(){
  if(!localStorage.getItem(SLOTS_MIGRATED_LS)) localStorage.setItem(SLOTS_MIGRATED_LS, 'cerrado');
}
function slotsOfCurrentOwner(){
  const me = currentOwnerId();
  const slots = getBusinessSlots();
  if(!me) return slots; // sin sesión de propietario (empleado): no se filtra
  // El hueco vacío (sin `code`) es de quien esté delante: es donde canjea
  // su primer negocio una cuenta recién creada.
  return slots.filter(s => !s.code || s.ownerId === me);
}

function slotIdbName(slotId){
  return slotId === 'default' ? 'gastrogoan_db' : 'gastrogoan_db_' + slotId;
}

function slotLicenseKey(slotId){
  return slotId === 'default' ? 'gastrogoan_license_v1' : 'gastrogoan_license_v1_' + slotId;
}

const ACTIVE_SLOT = getActiveSlot();
getBusinessSlots(); // asegura que el registro exista desde el arranque

/* ============================================================
   PANTALLA DE ACCESO — "Acceso Empleados" / "Acceso Propietarios"
   Login del DISPOSITIVO, independiente de cualquier negocio concreto: se
   comprueba ANTES incluso de saber a qué negocio se quiere entrar. Por eso
   vive en localStorage (no dentro de la base de datos de ningún negocio).
   ============================================================ */
const OWNER_LOGIN_LS = 'gastrogoan_owner_login';
const OWNER_PASS_PROMPTED_LS = 'gastrogoan_owner_pass_prompted';
const ACCESS_SESSION_LS = 'gastrogoan_access_session';
const ACCESS_LAST_ACTIVITY_LS = 'gastrogoan_access_last_activity';
// Si el dispositivo pasa más de esto sin actividad (ni un clic, ni un
// toque), la sesión de acceso (empleado o propietario) caduca sola: hay
// que volver a identificarse. Así, si el móvil o la tablet se pierde o lo
// roban, quien lo encuentre no puede simplemente reabrirlo horas después
// y seguir dentro — pero mientras se está usando con normalidad, nunca
// interrumpe pidiendo login de nuevo.
const ACCESS_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutos

// La cuenta de propietario guardada en ESTE dispositivo:
//   user    — nombre de usuario ya normalizado (ggOwnerUser)
//   authKey — ruta de su nodo en la nube de plataforma, derivada del PIN
//             actual. De ahí cuelga su lista de negocios. Al cambiar el PIN
//             el nodo se muda a la ruta nueva y esto se actualiza con ella
//             (ver changeOwnerAccessPin).
//   pinHash — el mismo PIN, hasheado, para poder validarlo sin internet en
//             el día a día.
function getOwnerLogin(){
  try{ return JSON.parse(localStorage.getItem(OWNER_LOGIN_LS)); }catch(e){ return null; }
}
function setOwnerLogin(user, authKey, pinPlain){
  const u = ggOwnerUser(user);
  // ANTES de pisar la sesión: los negocios de este aparato que todavía no
  // llevan dueño son de quien estaba entrando hasta ahora, no de quien
  // acaba de identificarse. Hacerlo al revés (adjudicar después) le
  // regalaba a la cuenta nueva los negocios de la anterior — que es
  // exactamente lo que se quería evitar.
  migrateSlotOwners();
  cerrarAdjudicacionDeNegocios();
  localStorage.setItem(OWNER_LOGIN_LS, JSON.stringify({user: u, authKey, pinHash: hashPin(pinPlain, u)}));
}
// Comprobación puramente local: una vez la cuenta se validó online al
// entrar la primera vez en este dispositivo, las siguientes veces no hace
// falta internet (un restaurante no puede quedarse sin poder abrir la caja
// porque se le haya caído el wifi).
function verifyOwnerLogin(user, pinPlain){
  const login = getOwnerLogin();
  if(!login) return false;
  return login.user === ggOwnerUser(user) && pinMatchesHash(pinPlain, login.pinHash, login.user);
}

// Si ha pasado más de ACCESS_INACTIVITY_TIMEOUT_MS desde el último toque
///clic registrado, la sesión guardada se considera caducada por
// inactividad (ver recordAccessActivity, llamada desde un listener global
// en app.js). No borra nada del negocio, solo obliga a volver a
// identificarse.
function isAccessSessionExpiredByInactivity(){
  const last = Number(localStorage.getItem(ACCESS_LAST_ACTIVITY_LS));
  if(!last) return false;
  return (Date.now() - last) > ACCESS_INACTIVITY_TIMEOUT_MS;
}
function recordAccessActivity(){
  if(getAccessSession()) localStorage.setItem(ACCESS_LAST_ACTIVITY_LS, String(Date.now()));
}
function getAccessSession(){
  try{ return JSON.parse(localStorage.getItem(ACCESS_SESSION_LS)); }catch(e){ return null; }
}
// Si quien está usando la app ahora mismo entró con su propio PIN de
// empleado, la app ya sabe exactamente quién es — no hace falta volver a
// preguntarlo (quién coge la mesa, quién anula un plato...). Solo cuando
// entra como propietario (sin PIN de un empleado concreto) sigue haciendo
// falta elegirlo a mano, porque el dueño no es "un empleado" identificado.
function loggedInEmployeeId(){
  const session = getAccessSession();
  return (session && session.type === 'employee') ? session.employeeId : null;
}
function setAccessSession(session){
  localStorage.setItem(ACCESS_SESSION_LS, JSON.stringify(session));
  localStorage.setItem(ACCESS_LAST_ACTIVITY_LS, String(Date.now()));
  if(typeof updateLogoutBtn === 'function') updateLogoutBtn();
  // Dónde y cuándo ha entrado cada persona — único punto por el que pasan
  // TODOS los accesos (propietario y empleado, en cualquier dispositivo),
  // así que basta con dejarlo aquí una vez en vez de repetirlo en cada
  // sitio que llama a setAccessSession.
  if(typeof logAudit === 'function' && typeof DB !== 'undefined' && DB){
    if(session.type === 'owner') logAudit('login', t('audit.ownerLoggedIn'));
    else if(session.type === 'employee'){
      const emp = (DB.employees||[]).find(e => e.id === session.employeeId);
      logAudit('login', t('audit.employeeLoggedIn').replace('${name}', emp ? emp.name : '?').replace('${area}', session.area||'?'));
    }
  }
}
function clearAccessSession(){
  if(typeof logAudit === 'function' && typeof DB !== 'undefined' && DB){
    const prev = getAccessSession();
    if(prev) logAudit('logout', t('audit.loggedOut').replace('${name}', currentActorName()));
  }
  localStorage.removeItem(ACCESS_SESSION_LS);
  localStorage.removeItem(ACCESS_LAST_ACTIVITY_LS);
}

let accessScreenMode = 'choice'; // 'choice' | 'employee' | 'owner'
// Selector de idioma visible desde el primer instante, antes incluso de
// identificarse — muy probable que la app se venda también a negocios que
// no hablan español, así que hace falta poder elegir idioma nada más
// abrirla, no solo una vez dentro (en Mi Negocio).
function renderAccessLangSwitcherHtml(){
  const current = getLang();
  const langs = ['es','en','ca'];
  return `
    <div class="access-lang-switch">
      ${langs.map(l => `
        <button class="${l===current?'active':''}" onclick="setLang('${l}')" title="${LANG_NAMES[l]}">${LANG_FLAGS[l]}</button>
      `).join('')}
    </div>`;
}
function renderAccessScreen(){
  const screen = document.getElementById('access-select-screen');
  if(!screen) return;
  screen.innerHTML = `
    <div class="access-wrap">
      ${renderAccessLangSwitcherHtml()}
      <div class="access-brand">
        <div class="access-icon"><img src="${GASTROGOAN_LOGO_URI}" alt="GastroGoan" style="width:100%;height:100%;object-fit:contain"></div>
        <span class="access-kicker">${t('access.kicker')}</span>
        <h1>GastroGoan</h1>
      </div>
      ${renderAccessSelectScreenHtml()}
    </div>`;
  screen.classList.remove('hide');
}
function showAccessSelectScreen(){
  accessScreenMode = 'choice';
  renderAccessScreen();
}
function hideAccessSelectScreen(){
  document.getElementById('access-select-screen')?.classList.add('hide');
}
function setAccessScreenMode(mode){
  accessScreenMode = mode;
  renderAccessScreen();
}
function renderAccessSelectScreenHtml(){
  if(accessScreenMode === 'employee') return renderEmployeeAccessFormHtml();
  if(accessScreenMode === 'owner') return renderOwnerAccessFormHtml();
  return `
    <div class="access-card">
      <div class="access-choice-list">
        <button class="access-choice-btn primary" onclick="setAccessScreenMode('employee')">
          <span class="aci"><i class="ti ti-users"></i></span>
          <span class="act"><b>${t('access.employeeBtn')}</b><small>${t('access.employeeHint')}</small></span>
        </button>
        <button class="access-choice-btn secondary" onclick="setAccessScreenMode('owner')">
          <span class="aci"><i class="ti ti-user-shield"></i></span>
          <span class="act"><b>${t('access.ownerBtn')}</b><small>${t('access.ownerHint')}</small></span>
        </button>
      </div>
    </div>
  `;
}
function renderEmployeeAccessFormHtml(){
  return `
    <div class="access-card">
      <button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="showAccessSelectScreen()" title="${t('common.back')}"><i class="ti ti-arrow-left"></i></button>
      <div class="access-card-title">${t('access.employeeBtn')}</div>
      <p class="access-card-lead">${t('access.employeeDesc')}</p>
      <div class="field">
        <label>${t('common.name')}</label>
        <input type="text" id="acc-emp-name" placeholder="${t('ph.employeeName')}">
      </div>
      <div class="field">
        <label>${t('label.accessPin')}</label>
        <input type="password" id="acc-emp-pin" maxlength="4" placeholder="••••" style="letter-spacing:8px;font-size:20px;text-align:center;text-transform:uppercase" oninput="this.value=this.value.replace(/[^0-9A-Za-z]/g,'')">
      </div>
      <div class="field">
        <label>${t('access.businessCode')}</label>
        <input type="text" id="acc-emp-code" maxlength="8" placeholder="XXXXXXXX" style="letter-spacing:2px;font-size:18px;text-align:center;text-transform:uppercase" onkeydown="if(event.key==='Enter')confirmEmployeeAccess()">
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="confirmEmployeeAccess()">${t('common.unlock')}</button>
    </div>
  `;
}
function renderOwnerAccessFormHtml(){
  // Un solo formulario, sin el antiguo desdoble "primera vez / ya conocido":
  // confirmOwnerAccess ya distingue solo si la cuenta hay que comprobarla
  // online o basta con el PIN guardado aquí. El usuario se rellena con el
  // último que entró en este dispositivo, que en un restaurante es
  // prácticamente siempre el mismo.
  const login = getOwnerLogin();
  return `
    <div class="access-card">
      <button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="showAccessSelectScreen()" title="${t('common.back')}"><i class="ti ti-arrow-left"></i></button>
      <div class="access-card-title">${t('access.ownerBtn')}</div>
      <p class="access-card-lead">${login ? t('access.ownerDesc') : t('access.ownerSetupDesc')}</p>
      <div class="field">
        <label>${t('access.ownerUser')}</label>
        <input type="text" id="acc-owner-user" autocomplete="username" placeholder="${t('ph.ownerUser')}" style="font-size:18px;text-align:center" value="${escapeHtml(login?.user || '')}">
      </div>
      <div class="field">
        <label>${t('access.ownerPin')}</label>
        <input type="password" id="acc-owner-pin" autocomplete="current-password" style="letter-spacing:4px;font-size:18px;text-align:center;text-transform:uppercase" onkeydown="if(event.key==='Enter')confirmOwnerAccess()">
      </div>
      <div id="acc-owner-error" style="display:none;font-size:13px;color:var(--red);margin-top:2px"></div>
      <button class="btn btn-primary" id="acc-owner-btn" style="width:100%;margin-top:6px" onclick="confirmOwnerAccess()">${t('common.unlock')}</button>
    </div>
  `;
}

// Código maestro oculto de recuperación: si alguien olvida su PIN
// (propietario o empleado), escribiéndolo en el campo del PIN se le pide
// fijar uno nuevo en el momento, sin tener que contactar con soporte. Solo
// vale para el PIN LOCAL de un dispositivo donde la cuenta ya entró alguna
// vez — no sirve para colarse en una cuenta ajena. No se comunica a los
// clientes.
const MASTER_RESET_CODE = 'GGGG';

// Entra de verdad como propietario, una vez la cuenta ya está validada
// (online la primera vez en este dispositivo, o contra el PIN guardado las
// siguientes).
function enterAsOwner(){
  setAccessSession({type:'owner'});
  applyOwnerSessionEditRights();
  hideAccessSelectScreen();
  // Si el negocio que se quedó abierto en este aparato es de OTRA cuenta,
  // no se entra en él: al selector, que ya solo enseña los suyos. Sin esto
  // la cuenta nueva aterrizaba directamente dentro del negocio del dueño
  // anterior, que es justo lo que se quiere evitar.
  const mios = slotsOfCurrentOwner();
  if(currentOwnerId() && !mios.some(s => s.id === getActiveSlot())){
    showBusinessSelectScreen();
    syncOwnerBusinessList().then(() => {
      const s2 = getAccessSession();
      if(s2 && s2.type === 'owner') showBusinessSelectScreen();
    });
    return;
  }
  if(continuePendingOwnerSetup()) return;
  showBusinessSelectScreen();
  // La lista de negocios de la cuenta puede tardar en llegar: la pantalla
  // se pinta ya con lo que este dispositivo conoce y se repinta al volver.
  syncOwnerBusinessList().then(() => {
    const s = getAccessSession();
    if(s && s.type === 'owner') showBusinessSelectScreen();
  });
}

async function confirmOwnerAccess(){
  const user = (document.getElementById('acc-owner-user')?.value || '').trim();
  const pin = (document.getElementById('acc-owner-pin')?.value || '').trim();
  const errEl = document.getElementById('acc-owner-error');
  const showErr = key => { if(errEl){ errEl.textContent = t(key); errEl.style.display = 'block'; } else showToast(t(key)); };
  if(!user || !pin){ showErr('access.badCredentials'); return; }

  if(pin.toUpperCase() === MASTER_RESET_CODE){
    const login = getOwnerLogin();
    if(!login || login.user !== ggOwnerUser(user)){ showErr('access.badCredentials'); return; }
    const newPin = await promptText(t('access.newPasswordPrompt'), '', {title: t('access.newPasswordPrompt'), icon: 'ti-lock'});
    if(!newPin || !newPin.trim()) return;
    if(!/^\d{4}$/.test(newPin.trim())){ showToast(t('msg.pin4digits')); return; }
    // Muda la cuenta igual que un cambio normal: quien olvidó su PIN lo
    // recupera desde cualquier aparato donde ya hubiera entrado, y el nuevo
    // le vale también en el resto.
    const res = await changeOwnerAccessPin(newPin.trim());
    if(!res.ok){ showErr(res.reason === 'offline' ? 'access.pinChangeOffline' : 'access.badCredentials'); return; }
    showToast(t('access.passwordReset'));
    enterAsOwner();
    return;
  }

  // Camino rápido y sin internet: esta cuenta ya entró en este dispositivo.
  if(verifyOwnerLogin(user, pin)){ enterAsOwner(); return; }

  // Primera vez aquí (o PIN de la compra en un dispositivo donde ya se
  // cambió por otro): hay que comprobar la cuenta contra la plataforma.
  const btn = document.getElementById('acc-owner-btn');
  if(btn){ btn.disabled = true; btn.textContent = t('gate.newLicenseChecking'); }
  const authKey = ggOwnerAuthKey(user, pin);
  const ok = await verifyOwnerAccountOnPlatform(authKey);
  if(btn){ btn.disabled = false; btn.textContent = t('common.unlock'); }
  if(ok === null){ showErr('access.licenseOffline'); return; }
  if(!ok){ showErr('access.badCredentials'); return; }
  setOwnerLogin(user, authKey, pin);
  initCloud();
  initPublicRequestsListener();
  checkLicenseRevocation();
  enterAsOwner();
}

/* Cambia el PIN de propietario EN TODAS PARTES, no solo en este aparato.
   Como la cuenta vive en una ruta derivada de usuario+PIN, cambiar el PIN
   significa MUDAR el nodo entero a su ruta nueva, llevándose consigo la
   lista de negocios.

   El nodo nuevo se crea ANTES de borrar el viejo, a propósito: si se corta
   la luz o el wifi a mitad, lo que queda es el PIN antiguo todavía
   funcionando (y como mucho un nodo huérfano), nunca un cliente sin ningún
   PIN que le sirva. Por eso el borrado del viejo no aborta la operación si
   falla — a esas alturas el PIN nuevo ya vale.

   Exige internet: es lo que permite que el PIN nuevo funcione también en el
   móvil del socio o en la tablet de la barra. Devuelve {ok, reason}. */
async function changeOwnerAccessPin(newPin){
  const login = getOwnerLogin();
  if(!login || !login.user) return {ok: false, reason: 'nologin'};
  const newAuthKey = ggOwnerAuthKey(login.user, newPin);
  if(!newAuthKey) return {ok: false, reason: 'badpin'};
  // Mismo PIN de siempre: no hay nada que mudar.
  if(newAuthKey === login.authKey){
    setOwnerLogin(login.user, login.authKey, newPin);
    return {ok: true};
  }
  const app = await withTimeout(getPlatformFirebaseApp(), 12000);
  if(!app) return {ok: false, reason: 'offline'};
  try{
    const oldRef = app.database().ref('gastrogoan/ownerAuth/' + login.authKey);
    const snap = await withTimeout(oldRef.once('value'), 12000);
    const payload = (snap && snap.val()) || {createdAt: Date.now()};
    payload.user = login.user; // por si el nodo viniera sin él
    await app.database().ref('gastrogoan/ownerAuth/' + newAuthKey).set(payload);
    setOwnerLogin(login.user, newAuthKey, newPin);
    try{ await oldRef.remove(); }catch(e){ console.error('No se pudo borrar la ruta antigua de la cuenta', e); }
    return {ok: true};
  }catch(e){
    console.error('Error cambiando el PIN de la cuenta', e);
    return {ok: false, reason: 'offline'};
  }
}

// licenseCode es el código del negocio AL QUE PERTENECE el empleado que se
// está comprobando — no tiene por qué coincidir con el negocio activo en
// este dispositivo (ver confirmEmployeeAccess: el empleado puede estar
// entrando a un negocio distinto del que ya tenía cargado, o a uno que este
// dispositivo aún no conocía). El PIN se guardó hasheado con la sal de SU
// propio negocio (hr.js: confirmNewPin/confirmFirstPinChange), así que hay
// que verificarlo con esa misma sal, no con la del negocio activo global.
/* La sal del PIN de un empleado es el CÓDIGO DE SU NEGOCIO. Tiene que
   serlo: el acceso de empleados valida desde un dispositivo que puede no
   haber visto nunca ese negocio, y lo único que aporta quien entra es
   nombre + PIN + código.

   Hasta ahora había un desajuste que dejaba fuera a todo el equipo: al
   GUARDAR un PIN nuevo (js/hr.js) se hasheaba SIN sal, pero al entrar se
   validaba CON ella. Como la app no deja dejarse el 1234 de fábrica, todo
   empleado que se ponía su propio PIN —o sea, todos— no volvía a entrar.
   Y al revés en Personal/Distribución, que validaba sin sal: ahí entraba
   el que se lo había cambiado y no el que tenía el de fábrica.

   Se unifica en el código del negocio. La comprobación sin sal se
   mantiene como respaldo para no dejar fuera a quien ya tuviera el PIN
   guardado de la forma antigua. */
function pinDeEmpleadoCoincide(pin, storedPin, licenseCode){
  if(pinMatchesHash(pin, storedPin, licenseCode)) return true;
  // Respaldo: PIN guardado antes de unificar la sal.
  return licenseCode ? pinMatchesHash(pin, storedPin, undefined) : false;
}
function codigoNegocioParaPin(){
  const lic = (typeof getLicense === 'function') ? getLicense() : null;
  return (lic && lic.code) || (DB && DB.license && DB.license.code) || undefined;
}
// El PIN del negocio se guardaba en TEXTO PLANO en DB.business.pin, y ese
// bloque se sincroniza con Firebase: cualquiera con acceso a la base del
// negocio lo leía tal cual. Ahora se guarda hasheado con la sal del código
// de licencia, igual que el de los empleados. El respaldo sin sal cubre el
// '1234' de fábrica (se siembra plano al crear el negocio) y los que se
// guardaron antes de este cambio.
function pinDeNegocioCoincide(pin, storedPin){
  const bp = (storedPin === undefined) ? (DB.business && DB.business.pin) : storedPin;
  return pinDeEmpleadoCoincide(pin, bp, codigoNegocioParaPin());
}
function findEmployeeMatch(employees, name, pin, licenseCode){
  return (employees||[]).find(e => {
    if(e.active === false) return false;
    if(!e.name || e.name.trim().toLowerCase() !== name.toLowerCase()) return false;
    const storedPin = e.pin || '1234';
    return pinDeEmpleadoCoincide(pin, storedPin, licenseCode);
  });
}

// Da de alta localmente, en ESTE dispositivo, un negocio que ya existe en
// la nube pero que este dispositivo nunca había visto — escribe una copia
// completa de sus datos (no solo los empleados) para que al entrar ya
// tenga carta, mesas, etc. y no una app vacía. remoteData es el snapshot
// completo ya descargado de gastrogoan/tenants/{tenantId}/db.
async function registerRemoteBusinessLocally(tenantId, code, remoteData){
  const newId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  await new Promise((resolve, reject) => {
    const req = indexedDB.open(slotIdbName(newId), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(withDefaults(defaultData(), remoteData), DB_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
  localStorage.setItem(slotLicenseKey(newId), JSON.stringify({code, tenantId}));
  const slots = getBusinessSlots();
  slots.push({ id: newId, name: (remoteData.business && remoteData.business.name) || t('bs.defaultBusinessName'), code, ownerId: currentOwnerId() });
  saveBusinessSlots(slots);
  return newId;
}

// Busca primero en TODOS los negocios que este dispositivo ya conoce (no
// solo el activo) el que tenga este código, y dentro de él un empleado
// activo con ese nombre+PIN — sin tocar la red, instantáneo. Si este
// dispositivo nunca ha visto ese negocio (p.ej. el móvil de un empleado
// nuevo, o el primer día de alguien en otra sucursal), busca el negocio en
// la nube compartida por su código y se trae una copia — así un empleado
// puede entrar con nombre+PIN+código SIN que el propietario tenga que
// "presentar" antes ese dispositivo.
async function confirmEmployeeAccess(){
  const name = document.getElementById('acc-emp-name').value.trim();
  const pin = document.getElementById('acc-emp-pin').value;
  const code = document.getElementById('acc-emp-code').value.trim().toUpperCase();
  if(!name || !pin || !code){ showToast(t('msg.completeAllFields')); return; }

  const localSlot = getBusinessSlots().find(s => s.code === code);
  if(localSlot){
    let slotData;
    try{ slotData = await readSlotDB(localSlot.id); }catch(e){ showToast(t('access.badCredentials')); return; }
    if(pin.toUpperCase() === MASTER_RESET_CODE){
      const owner = (slotData.employees||[]).find(e => e.active !== false && e.name && e.name.trim().toLowerCase() === name.toLowerCase());
      if(!owner){ showToast(t('access.badCredentials')); return; }
      // GGGG resetea el PIN LOCAL del propietario sin más comprobación
      // porque exige que ESTE dispositivo ya tenga guardado el login de ESE
      // propietario (ver confirmOwnerAccess) — pero aquí, para un empleado,
      // solo hacía falta conocer el código del negocio (que ve cualquier
      // empleado a diario en la tablet) y el NOMBRE de un compañero, sin
      // demostrar ser el propietario ni el propio empleado. Cualquiera
      // podía así fijarle un PIN nuevo a otro empleado y suplantarlo. Se
      // exige aquí el PIN del negocio (el mismo que protege anular una
      // venta o borrar un empleado) antes de permitirlo.
      const bizPin = await promptText(t('access.ownerPinRequiredForReset'), '', {title: t('title.enterBusinessPin'), icon: 'ti-lock'});
      if(bizPin === null) return;
      if(!pinDeEmpleadoCoincide(bizPin.trim(), slotData.business && slotData.business.pin, localSlot.code)){ showToast(t('access.badCredentials')); return; }
      const newPin = await promptText(t('access.newPinPrompt'), '', {title: t('access.newPinPrompt'), icon: 'ti-lock'});
      if(!newPin || !newPin.trim()){ return; }
      if(!/^\d{4}$/.test(newPin.trim())){ showToast(t('msg.pin4digits')); return; }
      owner.pin = hashPin(newPin.trim(), localSlot.code);
      owner.pinChanged = true;
      // Deja rastro en el registro de actividad del propio negocio (no del
      // dispositivo que hace el reseteo, que puede no tener sesión ninguna
      // todavía) — antes esto no dejaba ninguna constancia.
      if(!slotData.auditLog) slotData.auditLog = [];
      slotData.auditLog.unshift({id: genId(), ts: new Date().toISOString(), actor: t('label.owner'), action: 'edit', summary: t('audit.employeePinResetByMaster').replace('${name}', owner.name), severity: 'critical'});
      try{ await writeSlotDB(localSlot.id, slotData); }catch(e){ showToast(t('access.connectFailed')); return; }
      showToast(t('access.pinReset'));
      return;
    }
    const match = findEmployeeMatch(slotData.employees, name, pin, localSlot.code);
    if(!match){ showToast(t('access.badCredentials')); return; }
    setAccessSession({type:'employee', employeeId: match.id, area: match.area||'cocina', slotId: localSlot.id});
    if(localSlot.id !== ACTIVE_SLOT){
      switchToBusiness(localSlot.id); // recarga la app ya con la sesión guardada
      return;
    }
    hideAccessSelectScreen();
    resumeEmployeeSession();
    return;
  }

  // No es ningún negocio conocido en este dispositivo: probamos a
  // encontrarlo en la nube por su código antes de rendirnos.
  if(typeof firebase === 'undefined'){ showToast(t('access.badCredentials')); return; }
  showToast(t('access.connectingFirstTime'));
  const tenantId = ggBizTenantId(code);
  const fbConfig = await lookupTenantFirebaseConfig(tenantId);
  if(!fbConfig || !fbConfig.apiKey){ showToast(t('access.badCredentials')); return; }
  let remoteData;
  try{ remoteData = await fetchRemoteTenantDB(tenantId, fbConfig); }
  catch(e){ console.error('Error conectando con el negocio remoto', e); showToast(t('access.connectFailed')); return; }
  if(!remoteData){ showToast(t('access.badCredentials')); return; }
  const match = findEmployeeMatch(remoteData.employees, name, pin, code);
  if(!match){ showToast(t('access.badCredentials')); return; }
  let newSlotId;
  try{ newSlotId = await registerRemoteBusinessLocally(tenantId, code, remoteData); }
  catch(e){ console.error('Error registrando el negocio en este dispositivo', e); showToast(t('access.connectFailed')); return; }
  setAccessSession({type:'employee', employeeId: match.id, area: match.area||'cocina', slotId: newSlotId});
  switchToBusiness(newSlotId);
}

// Al arrancar (o justo tras un login de empleado en el mismo negocio ya
// activo): si hay una sesión de empleado válida guardada, entra directo a
// su área sin pedir ningún PIN más — y si ya no es válida (lo borraron o lo
// desactivaron desde que inició sesión), se cierra la sesión sola.
function resumeEmployeeSession(){
  const session = getAccessSession();
  if(!session || session.type !== 'employee') return false;
  const emp = (DB.employees||[]).find(e => e.id === session.employeeId);
  if(!emp || emp.active === false){
    clearAccessSession();
    return false;
  }
  const area = emp.area || 'cocina';
  areaUnlocked[area] = true;
  currentFolder = area;
  applyEmployeeSessionEditRights(emp.id);
  navigate('folder');
  // Mientras siga con el PIN de fábrica, se le anima (sin bloquear) a
  // elegir uno propio — una vez dentro de su área, no antes.
  if(!emp.pinChanged) promptEmployeeFirstPinChange(emp.id);
  else maybeShowEmployeeOnboarding(emp.id);
  return true;
}

// Actualiza el nombre mostrado del negocio activo en el selector (p.ej.
// al activar una licencia o recibirla sincronizada desde la nube).
function updateActiveSlotName(name){
  if(!name) return;
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === ACTIVE_SLOT);
  if(slot && slot.name !== name){
    slot.name = name;
    saveBusinessSlots(slots);
  }
}

// Cambia de negocio activo (recarga la app apuntando a otro slot, con su
// propia base IndexedDB y su propia licencia, totalmente independientes).
function switchToBusiness(slotId){
  if(slotId === ACTIVE_SLOT) return;
  localStorage.setItem(ACTIVE_SLOT_LS, slotId);
  location.reload();
}

// Registrar un negocio o sucursal nuevo exige una licencia nueva (comprada
// aparte): pide el código que se entrega en esa compra, igual que al dar de
// alta el primer negocio de la cuenta.
// Se pide en un modal propio de la app. Antes eran prompt() del navegador
// seguidos y un alert() si fallaba: justo en el momento en que el cliente
// acaba de pagar otra licencia, se le enseñaban varias ventanas grises del
// sistema, sin el diseño del resto de la app. Devuelve una promesa con la
// licencia válida, o null si se cancela, para no cambiar cómo la usan sus
// llamadores.
function promptBusinessLicense(){
  return new Promise(resolve => {
    pendingLicensePromptResolve = resolve;
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-license"></i> ${t('gate.newLicenseTitle')}</h3>
        <button class="modal-close" onclick="cancelBusinessLicensePrompt()">&times;</button>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px">${t('gate.newLicenseDesc')}</p>
      <div class="field">
        <label>${t('access.businessCode')}</label>
        <input type="text" id="new-lic-code" maxlength="8" placeholder="XXXXXXXX" style="letter-spacing:2px;font-size:18px;text-align:center;text-transform:uppercase" onkeydown="if(event.key==='Enter')confirmBusinessLicensePrompt()">
      </div>
      <div id="new-lic-error" style="display:none;font-size:13px;color:var(--red);margin-top:4px"></div>
      <div class="modal-footer">
        <button class="btn" onclick="cancelBusinessLicensePrompt()">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="new-lic-ok" onclick="confirmBusinessLicensePrompt()">${t('common.continue')}</button>
      </div>
    `);
    setTimeout(()=>document.getElementById('new-lic-code')?.focus(), 50);
  });
}
// Buscador con sugerencias progresivas: reemplaza los <select>/<datalist>
// que volcaban de golpe listas enteras (clientes, proveedores...) — con un
// negocio de años esas listas son largas, y el usuario tiene que poder
// escribir letra a letra y ver solo lo que coincide, no todo de una vez.
// Uso: attachTypeahead('input-id', 'results-id', q => items, item => htmlLabel, item => {...onPick...}, {hiddenId, onClear}).
const __typeaheadRegistry = {};
function attachTypeahead(inputId, resultsId, getItems, renderLabel, onPick, opts){
  opts = opts || {};
  __typeaheadRegistry[inputId] = { resultsId, getItems, renderLabel, onPick, hiddenId: opts.hiddenId, onClear: opts.onClear, items: [] };
}
function runTypeahead(inputId){
  const cfg = __typeaheadRegistry[inputId];
  const input = document.getElementById(inputId);
  const results = cfg && document.getElementById(cfg.resultsId);
  if(!cfg || !input || !results) return;
  const q = input.value.trim().toLowerCase();
  // Cualquier tecleo posterior a elegir una sugerencia invalida el id
  // enlazado (hiddenId), no solo cuando el campo queda totalmente vacío:
  // sin esto, elegir un cliente y luego corregir/cambiar el texto sin
  // volver a pinchar una sugerencia dejaba el campo oculto apuntando al
  // cliente ELEGIDO ANTES, aunque el texto visible ya dijera otra cosa —
  // la reserva podía terminar vinculada a la persona equivocada.
  if(cfg.hiddenId){ const h = document.getElementById(cfg.hiddenId); if(h) h.value = ''; }
  if(!q){
    results.style.display = 'none';
    results.innerHTML = '';
    if(cfg.onClear) cfg.onClear();
    return;
  }
  cfg.items = cfg.getItems(q).slice(0, 30);
  results.innerHTML = cfg.items.length
    ? cfg.items.map((it,i) => `<div class="typeahead-item" onmousedown="pickTypeahead('${inputId}',${i})">${cfg.renderLabel(it)}</div>`).join('')
    : `<div class="typeahead-item" style="cursor:default;color:var(--muted)">${t('common.noResults')}</div>`;
  results.style.display = 'block';
}
function pickTypeahead(inputId, idx){
  const cfg = __typeaheadRegistry[inputId];
  if(!cfg || !cfg.items[idx]) return;
  cfg.onPick(cfg.items[idx]);
  hideTypeahead(inputId);
}
function hideTypeahead(inputId){
  const cfg = __typeaheadRegistry[inputId];
  const results = cfg && document.getElementById(cfg.resultsId);
  if(results) results.style.display = 'none';
}

// Sustituto de prompt() con el diseño de la app, para los sitios donde se
// pide un texto suelto (p.ej. el nombre de una sucursal recién creada).
// Mantiene la misma forma de uso: devuelve el texto, o null si se cancela.
let pendingTextPromptResolve = null;
function promptText(label, defaultValue, opts){
  opts = opts || {};
  return new Promise(resolve => {
    pendingTextPromptResolve = resolve;
    pendingTextPromptAllowEmpty = !!opts.allowEmpty;
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ${escapeHtml(opts.icon || 'ti-pencil')}"></i> ${escapeHtml(opts.title || label)}</h3>
        <button class="modal-close" onclick="cancelTextPrompt()">&times;</button>
      </div>
      ${opts.title ? `<p style="font-size:13px;color:var(--muted);margin-bottom:14px">${escapeHtml(label)}</p>` : ''}
      <div class="field">
        <input type="text" id="generic-text-prompt" value="${escapeHtml(defaultValue || '')}" onkeydown="if(event.key==='Enter')confirmTextPrompt()">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="cancelTextPrompt()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="confirmTextPrompt()">${t('common.confirm')}</button>
      </div>
    `);
    setTimeout(()=>{ const el = document.getElementById('generic-text-prompt'); if(el){ el.focus(); el.select(); } }, 50);
  });
}
function cancelTextPrompt(){
  const resolve = pendingTextPromptResolve;
  pendingTextPromptResolve = null;
  closeModal();
  if(resolve) resolve(null);
}
let pendingTextPromptAllowEmpty = false;
function confirmTextPrompt(){
  const val = (document.getElementById('generic-text-prompt')?.value || '').trim();
  // Por defecto, enviar vacío no cierra el modal: se queda esperando un
  // nombre (la mayoría de usos son "nombra esto", donde vacío no tiene
  // sentido). opts.allowEmpty lo permite para los pocos casos donde un
  // valor vacío es una respuesta válida en sí misma (p.ej. quitar un
  // límite de raciones escribiendo nada).
  if(!val && !pendingTextPromptAllowEmpty) return;
  const resolve = pendingTextPromptResolve;
  pendingTextPromptResolve = null;
  closeModal();
  if(resolve) resolve(val);
}
// Sustituto de confirm() nativo del navegador — mismo cuadro gris feo del
// sistema en todos los sitios que usaban confirm('¿Seguro?'), fuera de
// lugar en una app con su propio diseño. Devuelve una Promise<boolean>,
// así que cada sitio que lo usa pasa a ser `if(!(await confirmModal(...)))
// return;` en vez de `if(!confirm(...)) return;` — la función que lo llama
// tiene que ser `async`.
let pendingConfirmModalResolve = null;
function confirmModal(message, opts){
  opts = opts || {};
  // Si ya había un confirmModal() pendiente de una llamada anterior (dos
  // acciones "borrar"/"confirmar" distintas disparadas casi a la vez, antes
  // de que apareciera el primer diálogo), se resuelve como cancelado en vez
  // de dejarlo colgado para siempre sin que nadie se entere de que esa
  // primera acción nunca llegó a ejecutarse.
  if(pendingConfirmModalResolve){ const prev = pendingConfirmModalResolve; pendingConfirmModalResolve = null; prev(false); }
  return new Promise(resolve => {
    pendingConfirmModalResolve = resolve;
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ${escapeHtml(opts.icon || 'ti-help-circle')}" style="${opts.danger?'color:var(--red)':''}"></i> ${escapeHtml(opts.title || t('common.confirm'))}</h3>
        <button class="modal-close" onclick="cancelConfirmModal()">&times;</button>
      </div>
      <p style="font-size:13.5px;line-height:1.5;white-space:pre-line">${escapeHtml(message)}</p>
      <div class="modal-footer">
        <button class="btn" onclick="cancelConfirmModal()">${t('common.cancel')}</button>
        <button class="btn ${opts.danger?'btn-danger':'btn-primary'}" onclick="acceptConfirmModal()">${escapeHtml(opts.confirmLabel || t('common.confirm'))}</button>
      </div>
    `);
  });
}
function cancelConfirmModal(){
  const resolve = pendingConfirmModalResolve;
  pendingConfirmModalResolve = null;
  closeModal();
  if(resolve) resolve(false);
}
function acceptConfirmModal(){
  const resolve = pendingConfirmModalResolve;
  pendingConfirmModalResolve = null;
  closeModal();
  if(resolve) resolve(true);
}
// Sustituto de alert() nativo — un solo botón "Aceptar", con el mismo
// diseño que confirmModal. Devuelve una Promise que se resuelve al
// cerrarlo, para poder esperar (await alertModal(...)) antes de un
// location.reload() y que el usuario llegue a leer el mensaje.
let pendingAlertModalResolve = null;
function alertModal(message, opts){
  opts = opts || {};
  return new Promise(resolve => {
    pendingAlertModalResolve = resolve;
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ${escapeHtml(opts.icon || 'ti-info-circle')}"></i> ${escapeHtml(opts.title || t('common.notice'))}</h3>
        <button class="modal-close" onclick="acceptAlertModal()">&times;</button>
      </div>
      <p style="font-size:13.5px;line-height:1.5;white-space:pre-line">${escapeHtml(message)}</p>
      <div class="modal-footer">
        <button class="btn btn-primary" onclick="acceptAlertModal()">${t('common.accept')}</button>
      </div>
    `);
  });
}
function acceptAlertModal(){
  const resolve = pendingAlertModalResolve;
  pendingAlertModalResolve = null;
  closeModal();
  if(resolve) resolve();
}
let pendingLicensePromptResolve = null;
function cancelBusinessLicensePrompt(){
  const resolve = pendingLicensePromptResolve;
  pendingLicensePromptResolve = null;
  closeModal();
  if(resolve) resolve(null);
}
// Traduce el porqué de un canje fallido al aviso que ve el cliente. Los
// tres casos se distinguen a propósito: "no existe" y "ya está en uso en
// otra cuenta" llevan a acciones muy distintas por parte de quien lo lee.
function redeemErrorKey(reason){
  if(reason === 'offline') return 'access.licenseOffline';
  if(reason === 'claimed') return 'gate.codeAlreadyClaimed';
  return 'gate.newLicenseBad';
}
// Un negocio nuevo (independiente o sucursal) SIEMPRE necesita un código
// que no esté ya en uso en otro hueco de este dispositivo. El propio
// backend SÍ permite que el mismo dueño reactive un código que ya tiene
// (es lo que hace posible reinstalar en otro aparato) — pero eso es
// distinto de teclearlo aquí sin querer: si se dejaba pasar, los dos
// huecos acababan apuntando al MISMO tenantId, es decir a la MISMA nube.
// Localmente parecían dos negocios distintos en el selector, pero por
// dentro sincronizaban la misma base de datos: el stock, la carta y las
// ventas de uno se veían dentro del otro sin ningún aviso.
function codeUsedByOtherSlot(code, excludeSlotId){
  return getBusinessSlots().some(s => s.id !== excludeSlotId && s.code === code);
}
async function confirmBusinessLicensePrompt(){
  const code = (document.getElementById('new-lic-code')?.value || '').trim();
  const errEl = document.getElementById('new-lic-error');
  const showErr = msg => { if(errEl){ errEl.textContent = msg; errEl.style.display = 'block'; } };
  if(!code){ showErr(t('gate.newLicenseMissing')); return; }
  // Este flujo (addNewBusiness/addSucursal) es SIEMPRE para un negocio
  // nuevo: reutilizar aquí un código que ya es otro hueco es siempre un
  // error de tecleo, nunca una reinstalación legítima (eso ya pasa solo,
  // sin pasar por aquí — ver syncOwnerBusinessList).
  const codigoNormalizado = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(codeUsedByOtherSlot(codigoNormalizado, null)){
    showErr(t('gate.codeAlreadyOtherBusiness'));
    return;
  }
  // La comprobación contra la plataforma tarda: sin deshabilitar el botón se
  // puede pulsar dos veces y lanzar dos canjes a la vez.
  const btn = document.getElementById('new-lic-ok');
  if(btn){ btn.disabled = true; btn.textContent = t('gate.newLicenseChecking'); }
  const {lic, reason} = await redeemBusinessCode(code);
  if(!lic){
    showErr(t(redeemErrorKey(reason)));
    if(btn){ btn.disabled = false; btn.textContent = t('common.continue'); }
    return;
  }
  const resolve = pendingLicensePromptResolve;
  pendingLicensePromptResolve = null;
  closeModal();
  if(resolve) resolve(lic);
}
async function addNewBusiness(){
  const lic = await promptBusinessLicense();
  if(!lic) return;
  // No se pide nombre aquí: el negocio nace con un nombre de relleno y toma
  // el real en cuanto el dueño lo guarda en Mi Negocio (updateActiveSlotName
  // se encarga de eso). Mientras tanto, el código de negocio se muestra en
  // el selector (ver renderBsGroups) para poder distinguir dos negocios
  // nuevos entre sí antes de que ninguno se haya configurado todavía.
  const name = t('gate.newBusinessDefaultName');
  const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const slots = getBusinessSlots();
  slots.push({ id, name, code: lic.code, ownerId: currentOwnerId() });
  saveBusinessSlots(slots);
  localStorage.setItem(slotLicenseKey(id), JSON.stringify(lic));
  linkBusinessToOwnerAccount(lic.tenantId, lic.code, name);
  switchToBusiness(id);
}

/* Abre una sucursal copiando toda la configuración del negocio actual
   (carta, recetas, ingredientes, proveedores, mesas, empleados, gastos fijos,
   CAPEX, configuración) pero sin datos operativos (ventas, reservas, etc.).
   La sucursal arranca lista para operar desde el primer día. */
/* Lee los datos de cualquier slot (activo u otro) desde su IDB */
async function readSlotDB(slotId){
  if(slotId === ACTIVE_SLOT) return DB;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(slotIdbName(slotId), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readonly');
      const gr = tx.objectStore('kv').get(DB_KEY);
      gr.onsuccess = () => { db.close(); resolve(gr.result || defaultData()); };
      gr.onerror = () => { db.close(); reject(gr.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

/* Guarda datos en el IDB de cualquier slot (activo u otro). Se usa para
   el reset de PIN maestro, que puede tocar un negocio que no es el activo. */
async function writeSlotDB(slotId, data){
  if(slotId === ACTIVE_SLOT){ saveDB(); return; }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(slotIdbName(slotId), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(data, DB_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });
}

/* Crea una nueva sucursal clonando la configuración del slot indicado.
   parentSlotId: slot del que se copian los datos (el negocio "padre").
   Si no se pasa, usa el slot activo. */
async function addSucursal(parentSlotId){
  const lic = await promptBusinessLicense();
  if(!lic) return;
  parentSlotId = parentSlotId || ACTIVE_SLOT;
  const slots = getBusinessSlots();
  const parentSlot = slots.find(s => s.id === parentSlotId);
  const parentName = parentSlot?.name || t('gate.branchDefaultName');
  const sucursalesExistentes = slots.filter(s => s.parentId === parentSlotId).length;
  const nombreSugerido = t('gate.branchSuggestedName').replace('${parent}', parentName).replace('${n}', sucursalesExistentes + 2);
  const nombre = await promptText(
    t('gate.newBranchPrompt').replace('${parent}', parentName),
    nombreSugerido,
    {title: t('btn.openBranch'), icon: 'ti-building-store'}
  );
  if(!nombre) return;
  // nombreSugerido evita la colisión solo al SUGERIR un nombre, pero se
  // puede escribir cualquier cosa encima, incluido el de una sucursal
  // hermana ya existente — el selector las mostraría idénticas salvo por
  // cuál está activa, fácil de entrar a la equivocada por error.
  const nombreDuplicado = slots.some(s => s.parentId === parentSlotId && s.name.trim().toLowerCase() === nombre.trim().toLowerCase());
  if(nombreDuplicado && !(await confirmModal(t('gate.confirmDuplicateBranchName').replace('${name}', nombre)))) return;

  // Leer datos del padre (puede ser el activo u otro slot)
  let src;
  try { src = await readSlotDB(parentSlotId); } catch(e){ src = defaultData(); }

  const def = defaultData();
  // Las raciones disponibles ahora mismo (p.stock) de un plato del padre son
  // inventario físico real de SU local, no de la sucursal nueva — clonar la
  // carta tal cual dejaba nacer la sucursal con, p.ej., "quedan 12" de un
  // plato que ahí ni siquiera se ha empezado a cocinar. Se copia el límite
  // de raciones configurado (si el dueño usa esa función) pero puesto a
  // disponible desde cero, no el recuento actual del padre.
  const cartasClonadas = JSON.parse(JSON.stringify(src.cartas || []));
  cartasClonadas.forEach(c => (c.secciones||[]).forEach(sec => (sec.platos||[]).forEach(p => {
    if(p.stock != null) delete p.stock;
    if(p.disponible === false) p.disponible = true;
  })));
  const snap = {
    ...def,
    business: JSON.parse(JSON.stringify(src.business || def.business)),
    license: null,
    ingredients: JSON.parse(JSON.stringify(src.ingredients || [])),
    ingredientCategories: JSON.parse(JSON.stringify(src.ingredientCategories || [])),
    recipes: JSON.parse(JSON.stringify(src.recipes || [])),
    recipeCategories: JSON.parse(JSON.stringify(src.recipeCategories || [])),
    fichas: JSON.parse(JSON.stringify(src.fichas || [])),
    menuItems: JSON.parse(JSON.stringify(src.menuItems || [])),
    cartas: cartasClonadas,
    activeCartaIds: JSON.parse(JSON.stringify(src.activeCartaIds || [])),
    menus: JSON.parse(JSON.stringify(src.menus || [])),
    activeMenuIds: JSON.parse(JSON.stringify(src.activeMenuIds || [])),
    elaboraciones: JSON.parse(JSON.stringify(src.elaboraciones || [])),
    providers: JSON.parse(JSON.stringify(src.providers || [])),
    // Mesas, empleados, gastos fijos y CAPEX son propios de cada local — no se copian
    tables: [],
    employees: [],
    workDistribution: {},
    limpieza: {
      ...def.limpieza,
      manosPasos: JSON.parse(JSON.stringify(src.limpieza?.manosPasos || def.limpieza.manosPasos)),
      tareas: JSON.parse(JSON.stringify(src.limpieza?.tareas || [])),
    },
    ge: {
      fijos: [],
      variables: [],
      capex: [],
      config: JSON.parse(JSON.stringify(src.ge?.config || def.ge.config)),
    },
    loyaltyRewards: JSON.parse(JSON.stringify(src.loyaltyRewards || def.loyaltyRewards)),
    config: JSON.parse(JSON.stringify(src.config || {})),
    stock: {},
    nextId: src.nextId || 1,
  };
  // La nube (Firebase) sí se hereda del negocio padre -copiada dentro de
  // `business` justo arriba- porque de ahí sale el resto del negocio
  // clonado. Pero Redsys NO se hereda (vive en el Worker, ligado al
  // tenantId de la licencia propia de esta sucursal, distinta a la del
  // padre) y el email de confirmación normalmente también conviene
  // revisarlo por local. Por eso el asistente de conexiones opcionales debe
  // volver a aparecer para esta sucursal nueva, aunque el negocio padre ya
  // lo hubiera visto — si no, nunca se le ofrecería configurar su propio
  // Redsys.
  snap.business.extConnPromptSeen = false;

  const newId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);

  await new Promise((resolve, reject) => {
    const req = indexedDB.open(slotIdbName(newId), 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(snap, DB_KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    req.onerror = () => reject(req.error);
  });

  // La licencia se guarda ANTES de hacer visible el slot en el selector
  // (antes era al revés): si la app se cerraba justo entre medias, quedaba
  // un slot ya visible en el selector, con datos clonados, pero sin
  // licencia guardada — al entrar pedía reactivar un código ya comprado,
  // sin explicar por qué, dando la sensación de que la sucursal "perdió"
  // la licencia. Con este orden, si se corta aquí, el slot simplemente no
  // llega a aparecer todavía (se puede reintentar sin arrastrar ningún
  // estado a medias).
  localStorage.setItem(slotLicenseKey(newId), JSON.stringify(lic));
  slots.push({ id: newId, name: nombre, parentId: parentSlotId, code: lic.code, ownerId: currentOwnerId() });
  saveBusinessSlots(slots);
  linkBusinessToOwnerAccount(lic.tenantId, lic.code, nombre);
  switchToBusiness(newId);
}

function removeBusinessSlot(slotId){
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === slotId);
  if(!slot) return;
  // Borrar un negocio "raíz" que tiene sucursales las dejaría huérfanas:
  // renderBsGroups agrupa por padre (roots.filter(s=>!s.parentId)), así que
  // en cuanto el padre desaparece sus sucursales (que siguen en la lista,
  // con un parentId que ya no existe) dejan de listarse en ningún grupo —
  // invisibles en el selector para siempre, aunque sus datos/licencia sigan
  // intactos. Mejor bloquear con un aviso claro que dejar algo así.
  const sucursales = slots.filter(s => s.parentId === slotId);
  if(sucursales.length){
    showToast(t('gate.cannotRemoveBusinessWithBranches').replace('${count}', sucursales.length));
    return;
  }
  openConfirmRemoveBusinessModal(slotId);
}
function openConfirmRemoveBusinessModal(slotId){
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === slotId);
  if(!slot) return;
  // El diálogo nativo prompt() del navegador se sustituye por un modal
  // propio, igual que ya se hizo en su día con promptText/confirmTextPrompt
  // — un cuadro gris del sistema en un momento delicado (vas a borrar datos)
  // desentona con el resto de la app y a veces lo bloquea el gestor de
  // popups del dispositivo.
  const msg = t('gate.confirmRemoveBusiness').replace(/\$\{name\}/g, slot.name);
  const [warning, instruction] = msg.split('\n\n');
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-alert-triangle" style="color:var(--red)"></i> ${t('bs.remove')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="manual-warning" style="margin-bottom:12px"><i class="ti ti-alert-triangle"></i>${escapeHtml(warning||'')}</div>
    <div class="field">
      <label>${escapeHtml(instruction||'')}</label>
      <input type="text" id="remove-business-confirm-name" autocomplete="off">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-danger" onclick="confirmRemoveBusinessSlot('${escapeHtml(slotId)}')"><i class="ti ti-trash"></i> ${t('bs.remove')}</button>
    </div>
  `);
}
function confirmRemoveBusinessSlot(slotId){
  const slot = getBusinessSlots().find(s => s.id === slotId);
  if(!slot) return;
  const typed = (document.getElementById('remove-business-confirm-name').value || '').trim();
  if(typed.toLowerCase() !== slot.name.trim().toLowerCase()){
    showToast(t('gate.removeBusinessNameMismatch'));
    return;
  }
  closeModal();
  reallyRemoveBusinessSlot(slotId);
}
function reallyRemoveBusinessSlot(slotId){
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === slotId);
  if(!slot) return;
  indexedDB.deleteDatabase(slotIdbName(slotId));
  // Sacarlo también de la cuenta en la nube: si solo se borrara de aquí,
  // syncOwnerBusinessList lo volvería a añadir en el siguiente arranque y
  // daría la sensación de que "no se deja borrar".
  try{
    const lic = JSON.parse(localStorage.getItem(slotLicenseKey(slotId)));
    if(lic && lic.tenantId) unlinkBusinessFromOwnerAccount(lic.tenantId);
  }catch(e){}
  localStorage.removeItem(slotLicenseKey(slotId));
  const remaining = slots.filter(s => s.id !== slotId);
  saveBusinessSlots(remaining.length ? remaining : [{id:'default', name:'Mi negocio'}]);

  if(slotId === ACTIVE_SLOT){
    const fallback = remaining.length ? remaining[0].id : 'default';
    localStorage.setItem(ACTIVE_SLOT_LS, fallback);
    location.reload();
  }else{
    showBusinessSelectScreen();
  }
}

/* Pantalla a pantalla completa, mostrada justo después del splash, donde se
   elige con qué negocio se quiere trabajar antes de entrar a la app. */
// El botón "Negocios" de la cabecera solo es visible con sesión de
// propietario (ver updateHeaderAccessButtons) — quien ya entró desde
// "Acceso Propietarios" ya demostró quién es, así que no hace falta
// pedirle el PIN otra vez aquí. El PIN del negocio se mantiene solo como
// red de seguridad para el caso (raro) de llegar aquí sin sesión de
// propietario activa.
function requestSwitchBusinessPin(){
  const session = getAccessSession();
  if(session && session.type === 'owner'){ showBusinessSelectScreen(); return; }
  if(!DB.business || !DB.business.pin){ showBusinessSelectScreen(); return; }
  requestBusinessPinAction(t('title.switchBusiness'), t('msg.confirmSwitchBusiness'), () => showBusinessSelectScreen());
}
function showBusinessSelectScreen(){
  const screen = document.getElementById('business-select-screen');
  if(!screen) return;
  screen.innerHTML = renderBusinessSelectScreenHtml();
  screen.classList.remove('hide');
}

/* IDs de grupos actualmente expandidos en el selector */
let _bsOpenGroups = new Set();

// ¿Esta cuenta tiene ya algún negocio de verdad en este dispositivo? Un
// slot sin `code` es solo el hueco vacío que existe desde el arranque
// (getBusinessSlots siempre devuelve al menos uno), no un negocio canjeado.
function ownerHasAnyBusiness(){
  return slotsOfCurrentOwner().some(s => s.code);
}

// Canjea el primer negocio dentro del hueco que ya existe, en vez de crear
// uno nuevo al lado: si no, el hueco vacío se quedaría para siempre en la
// lista, encima del negocio recién dado de alta.
function redeemFirstBusiness(){
  const me = currentOwnerId();
  const slots = getBusinessSlots();
  const activo = slots.find(s => s.id === getActiveSlot());
  // El hueco donde se canjea tiene que ser MÍO y estar vacío. Si el que
  // está activo es el negocio de otra cuenta (pasa en cuanto dos dueños
  // usan el mismo aparato), la licencia se escribía justo encima: el
  // negocio ajeno se quedaba con el código nuevo y la cuenta recién creada
  // aterrizaba dentro de él. En ese caso se abre un hueco nuevo, propio.
  const sirve = activo && !activo.code && (!me || !activo.ownerId || activo.ownerId === me);
  if(!sirve){
    const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
    slots.push({ id, name: t('bs.defaultBusinessName'), ownerId: me });
    saveBusinessSlots(slots);
    switchToBusiness(id); // recarga: al volver, el hueco activo ya es suyo y está vacío
    return;
  }
  hideBusinessSelectScreen();
  showActivationGate();
}

function renderBusinessSelectScreenHtml(){
  const slots = slotsOfCurrentOwner();
  // Cuenta nueva: todavía no ha canjeado ningún negocio. Sin este caso
  // aparte se vería una lista con un "Mi negocio" fantasma que no lleva a
  // ninguna parte, y los botones de "nuevo" y "sucursal" sin nada de lo que
  // partir.
  if(!ownerHasAnyBusiness()){
    return `
      <div class="bs-box">
        <div class="bs-title">
          <div class="splash-icon" style="position:static"><img src="${GASTROGOAN_LOGO_URI}" alt="GastroGoan" style="width:100%;height:100%;object-fit:contain;border-radius:14px"></div>
          ${t('bs.title')}
        </div>
        <p style="text-align:center;color:var(--muted);font-size:14px;line-height:1.5;margin:4px 0 16px">${t('bs.emptyDesc')}</p>
        <button class="btn btn-primary" style="width:100%" onclick="redeemFirstBusiness()"><i class="ti ti-ticket"></i> ${t('bs.redeemFirst')}</button>
        <a href="https://buy.stripe.com/aFa6oGeSK44jaFw1mvdwc01" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;background:var(--olive);color:#FAF8F4;padding:12px;font-weight:700;font-size:14px;text-decoration:none"><i class="ti ti-shopping-cart"></i> ${t('bs.buyLicense')}</a>
        <!-- Sin esto, una cuenta recién creada se quedaba ATRAPADA aquí: la
             lista de negocios está vacía, así que no hay ninguna a la que ir,
             y la pantalla no tiene aspa ni botón de volver. Quien entraba con
             la cuenta equivocada solo podía salir recargando la página. -->
        <button class="btn" style="width:100%;margin-top:14px;background:none;border:none;color:var(--muted);min-height:44px;padding:12px;flex:0 0 auto" onclick="exitToAccessScreen()"><i class="ti ti-logout"></i> ${t('bs.exitAccount')}</button>
      </div>
    `;
  }
  // Pre-abrir el grupo que contiene el slot activo
  const activeSlot = slots.find(s => s.id === ACTIVE_SLOT);
  if(activeSlot?.parentId) _bsOpenGroups.add(activeSlot.parentId);
  else if(slots.some(s => s.parentId === ACTIVE_SLOT)) _bsOpenGroups.add(ACTIVE_SLOT);

  const showSearch = slots.length > 5;
  // Aviso permanente por si dos huecos de este dispositivo quedaron
  // apuntando al MISMO código antes del guardián de arriba (o por cualquier
  // otro camino que se nos haya escapado): sin esto, dos negocios que
  // comparten nube por dentro seguirían pareciendo dos negocios normales
  // en esta lista, sin ninguna pista de por qué comparten stock y ventas.
  const codigosVistos = {};
  const duplicados = new Set();
  slots.forEach(s => {
    if(!s.code) return;
    if(codigosVistos[s.code]) duplicados.add(s.code);
    codigosVistos[s.code] = true;
  });
  const avisoDuplicado = duplicados.size ? `
    <div style="background:var(--red-l);color:var(--red);border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.5;margin-bottom:10px">
      <i class="ti ti-alert-triangle"></i> ${t('bs.duplicateCodeWarning')}
    </div>` : '';
  return `
    <div class="bs-box">
      ${(() => {
        /* El aspa cierra el selector y te deja DENTRO del negocio que
           estuviera abierto. Si ese negocio es de otra cuenta (dos socios,
           un aparato prestado, un comercial dando de alta a un cliente
           detrás de otro), cerrar era colarse en él. Solo hay aspa si el
           negocio abierto detrás es tuyo. */
        const activoEsMio = slotsOfCurrentOwner().some(x => x.id === ACTIVE_SLOT && x.code);
        return activoEsMio
          ? `<button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="hideBusinessSelectScreen()" title="${t('common.close')}">&times;</button>`
          : `<button class="btn" style="position:absolute;top:10px;left:10px;background:none;border:none;color:var(--muted);min-height:44px;padding:10px;flex:0 0 auto" onclick="exitToAccessScreen()"><i class="ti ti-logout"></i> ${t('bs.exitAccount')}</button>`;
      })()}
      <div class="bs-title">
        <div class="splash-icon" style="position:static"><img src="${GASTROGOAN_LOGO_URI}" alt="GastroGoan" style="width:100%;height:100%;object-fit:contain;border-radius:14px"></div>
        ${t('bs.title')}
      </div>
      ${avisoDuplicado}
      ${showSearch ? `<input id="bs-search" type="search" placeholder="${t('bs.searchPh')}" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:14px;margin-bottom:2px" oninput="filterBusinessSlots(this.value)" autofocus>` : ''}
      <div class="bs-list" id="bs-list">
        ${renderBsGroups(slots)}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="addNewBusiness()"><i class="ti ti-plus"></i> ${t('btn.newIndependent')}</button>
        <button class="btn" style="flex:1;border:1px solid var(--brand-orange);color:var(--brand-orange)" onclick="pickParentForSucursal()"><i class="ti ti-copy"></i> ${t('btn.openBranch')}</button>
      </div>
      <a href="https://buy.stripe.com/aFa6oGeSK44jaFw1mvdwc01" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;background:var(--olive);color:#FAF8F4;padding:12px;font-weight:700;font-size:14px;text-decoration:none"><i class="ti ti-shopping-cart"></i> ${t('bs.buyLicense')}</a>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button class="btn" style="flex:1;min-width:150px;min-height:44px;background:none;border:none;color:var(--muted)" onclick="promptChangeOwnerPassword()"><i class="ti ti-key"></i> ${t('bs.changePassword')}</button>
        <button class="btn" style="flex:1;min-width:150px;min-height:44px;background:none;border:none;color:var(--muted)" onclick="exitToAccessScreen()"><i class="ti ti-logout"></i> ${t('bs.exitAccount')}</button>
      </div>
    </div>
  `;
}
// El PIN que se entrega al crear la cuenta (6 caracteres, letras y números)
// es difícil de recordar de memoria — por eso, en cuanto el propietario lo
// cambia por el suyo, se le obliga a que sea un PIN numérico de 4 dígitos,
// mucho más fácil de recordar y de teclear cada vez. El usuario no cambia.
// duringSetup=true solo cuando se llama desde la configuración inicial: al
// cerrar el modal hay que reanudar los asistentes que falten. Desde Mi
// Negocio (cambio voluntario, con la app ya configurada) NO debe reanudar
// nada, o cerrar este modal podría lanzar el tour o el asistente de
// conexiones externas sin que nadie lo haya pedido.
let ownerPassPromptDuringSetup = false;
function promptChangeOwnerPassword(duringSetup){
  const login = getOwnerLogin();
  if(!login) return;
  ownerPassPromptDuringSetup = !!duringSetup;
  const pinInputAttrs = `maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')"`;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${t('access.changePassword')}</h3>
      <button class="modal-close" onclick="closeOwnerPassPrompt()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('access.newPasswordPrompt')}</p>
    <div class="field">
      <label>${t('label.newPin')}</label>
      <input type="password" id="owner-new-pass-1" ${pinInputAttrs}>
    </div>
    <div class="field">
      <label>${t('label.repeatPin')}</label>
      <input type="password" id="owner-new-pass-2" ${pinInputAttrs} onkeydown="if(event.key==='Enter')confirmChangeOwnerPassword()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeOwnerPassPrompt()">${t('common.cancel')}</button>
      <button class="btn btn-primary" id="owner-pin-save-btn" onclick="confirmChangeOwnerPassword()">${t('common.save')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('owner-new-pass-1')?.focus(), 50);
}
async function confirmChangeOwnerPassword(){
  const p1 = document.getElementById('owner-new-pass-1').value.trim();
  const p2 = document.getElementById('owner-new-pass-2').value.trim();
  if(!/^\d{4}$/.test(p1)){ showToast(t('msg.pin4digits')); return; }
  if(p1 !== p2){ showToast(t('msg.pinNoMatch')); return; }
  // Cambiar el PIN muda la cuenta de sitio en la nube, así que tarda y puede
  // fallar por falta de conexión: sin deshabilitar el botón se puede pulsar
  // dos veces y lanzar dos mudanzas a la vez.
  const btn = document.getElementById('owner-pin-save-btn');
  if(btn){ btn.disabled = true; btn.textContent = t('gate.newLicenseChecking'); }
  const {ok, reason} = await changeOwnerAccessPin(p1);
  if(btn){ btn.disabled = false; btn.textContent = t('common.save'); }
  if(!ok){ showToast(t(reason === 'offline' ? 'access.pinChangeOffline' : 'access.badCredentials')); return; }
  closeModal();
  showToast(t('msg.pinUpdated'));
  if(ownerPassPromptDuringSetup){ ownerPassPromptDuringSetup = false; continuePendingOwnerSetup(); }
}
function closeOwnerPassPrompt(){
  closeModal();
  if(ownerPassPromptDuringSetup){ ownerPassPromptDuringSetup = false; continuePendingOwnerSetup(); }
}

function renderBsGroups(allSlots){
  if(!allSlots.length) return `<div style="text-align:center;padding:16px;color:var(--muted);font-size:14px">${t('common.noResults')}</div>`;
  const total = getBusinessSlots().length;
  const roots = allSlots.filter(s => !s.parentId);
  const allDB = getBusinessSlots();

  return roots.map(root => {
    const sucursales = allDB.filter(s => s.parentId === root.id);
    const isRootActive = root.id === ACTIVE_SLOT;
    const hasSuc = sucursales.length > 0;
    const isOpen = _bsOpenGroups.has(root.id);

    if(!hasSuc){
      // Negocio independiente — muestra "(independiente)" como badge
      // Mientras el negocio siga con el nombre de relleno (aún no se ha
      // guardado nada en Mi Negocio), se muestra su código debajo para
      // poder distinguirlo de otro negocio recién dado de alta igual de
      // "sin nombre" — si no, dos altas seguidas serían indistinguibles
      // en el selector hasta entrar a configurar cada una.
      const showCode = !root.name || root.name === t('gate.newBusinessDefaultName') || root.name === t('bs.defaultBusinessName');
      return `
        <div class="bs-item ${isRootActive?'active':''}" onclick="enterBusiness('${escapeHtml(root.id)}')">
          <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
            <i class="ti ti-building-store" style="flex-shrink:0"></i>
            <div style="overflow:hidden">
              <span class="bs-item-name">${escapeHtml(root.name||t('bs.defaultBusinessName'))}</span>
              ${showCode && root.code ? `<div style="font-size:11px;color:var(--muted);font-family:monospace">${escapeHtml(root.code)}</div>` : ''}
            </div>
            <span style="font-size:11px;color:var(--muted);font-weight:400;flex-shrink:0">(${t('bs.independentTag')})</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            ${isRootActive ? `<span class="badge badge-amber">${t('bs.current')}</span>` : '<i class="ti ti-chevron-right" style="color:var(--muted)"></i>'}
            ${total>1 ? `<button class="btn btn-sm btn-danger" style="min-width:44px;min-height:44px" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(root.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>` : ''}
          </div>
        </div>`;
    }

    // Negocio con sucursales — cabecera expandible
    const childrenHtml = isOpen ? `
      <div class="bs-group-children">
        <div class="bs-sub-item ${isRootActive?'active':''}" onclick="enterBusiness('${escapeHtml(root.id)}')">
          <div style="display:flex;align-items:center;gap:6px;overflow:hidden">
            <i class="ti ti-home" style="color:var(--muted);flex-shrink:0"></i>
            <span style="overflow:visible;text-overflow:clip;white-space:normal">${t('bs.mainLocation')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            ${isRootActive ? `<span class="badge badge-amber">${t('bs.current')}</span>` : '<i class="ti ti-chevron-right" style="color:var(--muted)"></i>'}
            ${total>1 ? `<button class="btn btn-sm btn-danger" style="min-width:44px;min-height:44px" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(root.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>` : ''}
          </div>
        </div>
        ${sucursales.map(s => {
          const sActive = s.id === ACTIVE_SLOT;
          return `
          <div class="bs-sub-item ${sActive?'active':''}" onclick="enterBusiness('${escapeHtml(s.id)}')">
            <div style="display:flex;align-items:center;gap:6px;overflow:hidden">
              <i class="ti ti-building-store" style="color:var(--muted);flex-shrink:0"></i>
              <span style="overflow:visible;text-overflow:clip;white-space:normal">${escapeHtml(s.name||t('bs.defaultBranchName'))}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
              ${sActive ? `<span class="badge badge-amber">${t('bs.current')}</span>` : '<i class="ti ti-chevron-right" style="color:var(--muted)"></i>'}
              <button class="btn btn-sm btn-danger" style="min-width:44px;min-height:44px" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(s.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>
            </div>
          </div>`;
        }).join('')}
      </div>` : '';

    return `
      <div class="bs-group">
        <div class="bs-group-header ${(isRootActive || sucursales.some(s=>s.id===ACTIVE_SLOT))?'active':''} ${isOpen?'open':''}"
             onclick="toggleBsGroup('${escapeHtml(root.id)}')">
          <i class="ti ti-building" style="flex-shrink:0"></i>
          <span class="bs-item-name" style="flex:1">${escapeHtml(root.name||t('bs.defaultBusinessName'))}</span>
          <span style="font-size:12px;color:var(--muted);font-weight:400;flex-shrink:0">${sucursales.length + 1} ${t('bs.locationsSuffix')}</span>
          <i class="ti ${isOpen?'ti-chevron-up':'ti-chevron-down'}" style="color:var(--muted);margin-left:4px"></i>
        </div>
        ${childrenHtml}
      </div>`;
  }).join('');
}

function toggleBsGroup(rootId){
  if(_bsOpenGroups.has(rootId)) _bsOpenGroups.delete(rootId);
  else _bsOpenGroups.add(rootId);
  const list = document.getElementById('bs-list');
  if(list) list.innerHTML = renderBsGroups(getBusinessSlots());
}

function filterBusinessSlots(query){
  const list = document.getElementById('bs-list');
  if(!list) return;
  const allSlots = getBusinessSlots();
  const q = query.trim().toLowerCase();
  if(!q){ list.innerHTML = renderBsGroups(allSlots); return; }
  const matchIds = new Set();
  allSlots.forEach(s => {
    if((s.name||'').toLowerCase().includes(q)){
      matchIds.add(s.id);
      if(s.parentId) matchIds.add(s.parentId); // incluir el padre si coincide una sucursal
    }
  });
  // abrir todos los grupos que tengan coincidencias
  allSlots.filter(s => !s.parentId && matchIds.has(s.id)).forEach(r => _bsOpenGroups.add(r.id));
  list.innerHTML = renderBsGroups(allSlots.filter(s => matchIds.has(s.id)));
}

/* "Abrir sucursal": pide al usuario que elija el negocio padre */
function pickParentForSucursal(){
  const allSlots = getBusinessSlots();
  // Candidatos: negocios raíz (independientes o ya con sucursales)
  const roots = allSlots.filter(s => !s.parentId);
  if(roots.length === 0){ showToast(t('msg.noBranchBase')); return; }
  if(roots.length === 1){ addSucursal(roots[0].id); return; }
  // Mostrar modal de selección
  const optsHtml = roots.map(r => `
    <div class="bs-item" style="cursor:pointer" onclick="addSucursal('${escapeHtml(r.id)}');closeBsPickModal()">
      <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
        <i class="ti ti-building-store"></i>
        <span class="bs-item-name">${escapeHtml(r.name||t('bs.defaultBusinessName'))}</span>
      </div>
      <i class="ti ti-chevron-right" style="color:var(--muted)"></i>
    </div>`).join('');
  const modal = document.createElement('div');
  modal.id = 'bs-pick-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:12px">
      <div style="font-weight:800;font-size:17px">${t('bs.pickParentTitle')}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${optsHtml}</div>
      <button class="btn" onclick="closeBsPickModal()">${t('common.cancel')}</button>
    </div>`;
  document.body.appendChild(modal);
}
function closeBsPickModal(){ document.getElementById('bs-pick-modal')?.remove(); }

function hideBusinessSelectScreen(){
  document.getElementById('business-select-screen').classList.add('hide');
}

function enterBusiness(slotId){
  if(slotId === ACTIVE_SLOT){
    hideBusinessSelectScreen();
    const done = getLicense() && getCloudConfig();
    if(!DB.business.netlifySetupDone && !done) showNetlifySetupGate();
    else if(!getLicense()) showActivationGate();
    else if(!getCloudConfig()) showFirebaseSetupGate();
    return;
  }
  switchToBusiness(slotId);
}

/* ============================================================
   ALMACENAMIENTO LOCAL — IndexedDB
   localStorage limita a ~5MB por negocio, lo que un restaurante con
   bastante actividad puede superar en 1-2 años (histórico de ventas,
   clientes, reservas...). IndexedDB no tiene ese límite práctico, así
   que es donde vive ahora la base de datos completa. La primera vez,
   se migran automáticamente los datos que hubiera en localStorage.
   ============================================================ */
const IDB_NAME = slotIdbName(ACTIVE_SLOT);
const IDB_STORE = 'kv';
let _idbPromise = null;

function idbOpen(){
  if(_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    // Si otra pestaña de la app tiene la base de datos abierta con una
    // versión distinta, la apertura se queda colgada sin onsuccess ni
    // onerror — sin esto, la app entera se congelaba en el splash para
    // siempre esperando dbReadyPromise.
    req.onblocked = () => { if(typeof showToast === 'function') showToast(t('msg.idbBlocked')); };
  // Si la apertura falla, no se deja la Promise rechazada en caché para
  // siempre: la próxima llamada a idbOpen() vuelve a intentarlo, en vez
  // de que TODO guardado/lectura de esta sesión falle en silencio a partir
  // de aquí (ver loadDB()/saveDB()).
  }).catch(err => { _idbPromise = null; throw err; });
  return _idbPromise;
}

async function idbGet(key){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value){
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ============================================================
   NUBE — Configuración de Firebase (proyecto propio de cada negocio)
   Cada negocio configura su propio proyecto Firebase gratuito
   (ver showFirebaseSetupGate / getCloudConfig). Dentro de ese proyecto,
   sus datos viven en "gastrogoan/tenants/{tenantId}/db", identificado
   a partir de su clave de licencia.
   ============================================================ */
let cloudRef = null;
let socketConnected = false; // último valor conocido de .info/connected — ver flushCloudSync
let cloudConfig = null;
let platformAuthPromise = null;
// Proyecto Firebase compartido de la plataforma GastroGoan, usado SOLO para
// publicar el espejo público (gastrogoan/public/{publicId}/info) que lee
// reservagastrogoan.html. Es independiente del Firebase propio de cada
// negocio (cloudConfig), que solo guarda sus datos privados.
const PLATFORM_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDwZDodF6zwN11slvqkZ_yy3IOn2iko_ws",
  authDomain: "plataforma-gastrogoan.firebaseapp.com",
  databaseURL: "https://plataforma-gastrogoan-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "plataforma-gastrogoan",
  storageBucket: "plataforma-gastrogoan.firebasestorage.app",
  messagingSenderId: "894218847556",
  appId: "1:894218847556:web:2fa1f699489790bb5f8311"
};
// Última versión confirmada en la nube, por cada bloque de primer nivel de DB
// (ingredients, recipes, tpvOrders, sales...). Permite subir/aplicar solo los
// bloques que han cambiado en vez de todo el negocio entero en cada guardado.
let lastSyncedSnapshot = null;
let cloudSyncTimer = null;
let publicMirrorSyncTimer = null;
const CLOUD_SYNC_DELAY = 800; // ms — agrupa varios cambios rápidos en un solo envío a la nube

// Firebase Realtime Database NO garantiza el orden de las claves de un
// objeto al devolverlo (las reordena, normalmente por orden alfabético) —
// un JSON.stringify normal de "lo mismo" antes y después de pasar por la
// nube puede salir con las claves en otro orden, aunque el contenido sea
// idéntico. Usado tal cual para comparar "¿ha cambiado de verdad esto?"
// (lastSyncedSnapshot, warnIfConcurrentEditLost...), eso produce falsos
// positivos permanentes: cada ida y vuelta a la nube parece un cambio
// nuevo aunque nadie haya tocado nada, y como cada "cambio" dispara otro
// envío a la nube, entra en un bucle de sincronización que nunca se
// detiene — visible como el aviso de "cambios sobrescritos" reapareciendo
// sin parar, cifras que no dejan de refrescarse solas, y cualquier lista
// que se repinta perdiendo el scroll continuamente. Esta versión ordena
// las claves de cualquier objeto (recursivamente, los arrays mantienen su
// orden) antes de convertir a texto, así la comparación no depende del
// orden con que Firebase decida devolver las claves.
// Se ejecuta en CADA guardado sobre bloques enteros (DB.sales de un negocio
// con un año de historial son decenas de miles de objetos), así que el coste
// importa. Se probaron dos alternativas "más listas" (escribir en un array
// plano con push/join, y concatenar a mano evitando el sort cuando las
// claves ya venían ordenadas) y AMBAS resultaron MÁS LENTAS al medirlas en
// serio, con calentamiento previo y quedándose con la mediana de varias
// pasadas: 105 ms y 95 ms frente a los 59 ms de esta versión directa, con
// 10.000 ventas. V8 optimiza muy bien map()/join() (concatena con "ropes",
// sin copiar cadenas intermedias), así que lo simple gana. Si alguien vuelve
// a intentar optimizarla, que mida primero — y con calentamiento, porque una
// medición de una sola pasada da justo el resultado contrario.
//
// El único detalle no evidente es el 'null' del final: JSON.stringify(undefined)
// devuelve undefined (no una cadena), y concatenarlo produciría un JSON
// inválido tipo {"a":undefined} que revienta el JSON.parse que se hace de
// este valor más abajo (camino de categoryIcons). Se normaliza a 'null'.
//
// OJO: no respeta toJSON(), así que un objeto Date se serializaría como {} y
// dos fechas distintas parecerían iguales. Hoy no aplica (en DB las fechas
// se guardan siempre como texto), pero no metas objetos Date en DB.
function canonicalStringify(value){
  if(Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  if(value && typeof value === 'object'){
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(value[k])).join(',') + '}';
  }
  const s = JSON.stringify(value);
  return s === undefined ? 'null' : s;
}

/* ============================================================
   LICENCIA — Clave de activación
   Cada copia vendida se activa con una clave generada por el
   vendedor (generador-licencias.html, archivo privado).
   ============================================================ */
const LICENSE_LS = slotLicenseKey(ACTIVE_SLOT);

function ggLicHash(str){
  let h = 0x811c9dc5 >>> 0;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function _ggLicSecret(){
  const c = [117,117,197,117,125,111,124,197,64,62,64,68,197,121,69];
  return c.map(x => String.fromCharCode(x - 14)).join('');
}

function ggLicSig(name){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const secret = _ggLicSecret();
  let h = ggLicHash(name + secret);
  const out = [];
  for(let g = 0; g < 3; g++){
    h = ggLicHash(name + secret + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += A[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('-');
}

/* ============================================================
   LICENCIA v2 — Código de negocio + Contraseña
   Sustituye a la clave larga (ggLicSig) por un par corto y fácil de
   compartir: un CÓDIGO (público, se lo das a tus empleados para que
   entren desde "Acceso Empleados") + una CONTRASEÑA (la que se envía al
   comprar la licencia, sirve para activar la app como propietario). Ambos
   se generan con generador-licencias.html — debe usar EXACTAMENTE el mismo
   algoritmo que aquí abajo. El tenantId (identificador real del negocio en
   la nube compartida) se deriva del código de forma determinista: no hace
   falta guardarlo aparte ni transmitirlo, cualquiera que conozca el código
   puede recalcularlo igual que la propia app.
   ============================================================ */
function _ggBizSecret(){
  const c = [117,117,197,112,119,136,197,64,62,64,68,197,127,65];
  return c.map(x => String.fromCharCode(x - 14)).join('');
}
function ggBizTenantId(code){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const secret = _ggBizSecret() + '·tenant';
  const out = [];
  let h = ggLicHash(code + secret);
  for(let g = 0; g < 5; g++){
    h = ggLicHash(code + secret + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += A[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('');
}

/* ============================================================
   CUENTAS DE PROPIETARIO — usuario + PIN
   Debe ser IDÉNTICO al de generador-licencias.html (mismo bloque) — si
   cambias algo aquí, cámbialo también allí.

   Antes, la identidad del dueño era "la primera licencia que compró": el
   par código+contraseña servía a la vez de credencial y de negocio, así que
   comprar un segundo local significaba otra credencial más que recordar, y
   el "perfil de propietario" que agrupaba sus negocios colgaba de un
   tenantId elegido por accidente. Ahora el dueño tiene UNA cuenta
   (usuario + PIN) y los negocios se le van canjeando dentro.

   El PIN no se guarda en ningún sitio, ni siquiera hasheado: lo que se
   guarda en la nube de plataforma es un nodo cuya RUTA se deriva de
   usuario+PIN (ggOwnerAuthKey). Comprobar el acceso es leer esa ruta y ver
   si existe. Quien no sepa el PIN no puede ni construirla, y como las
   reglas solo conceden lectura a nivel de $authKey (nunca del padre),
   tampoco se puede listar el conjunto para ir probando: adivinar a ciegas
   obliga a una petición de red por intento contra 32^6 ≈ mil millones.
   ============================================================ */
const GG_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I, O, 0, 1: ilegibles al dictarlos
// "Casa Paco", "casa paco" y "CASA PACÓ" tienen que ser el mismo usuario:
// si no, un cliente que escriba su nombre con una mayúscula o un acento
// distintos a los del día que lo compró se queda fuera sin entender nada.
function ggOwnerUser(raw){
  return String(raw || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos: pacó → paco
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function _ggOwnerSecret(){
  const c = [117,117,197,125,133,124,115,128,197,64,62,64,68,197,121,69];
  return c.map(x => String.fromCharCode(x - 14)).join('');
}
// Misma construcción que ggBizTenantId (encadenar el hash y sacar grupos de
// 4 caracteres), ya probada en producción para los tenantId.
function ggOwnerDerive(input, groups){
  const out = [];
  let h = ggLicHash(input);
  for(let g = 0; g < groups; g++){
    h = ggLicHash(input + h + g);
    let grp = '', x = h;
    for(let c = 0; c < 4; c++){ grp += GG_ALPHABET[x % 32]; x = Math.floor(x / 32); }
    out.push(grp);
  }
  return out.join('');
}
function ggOwnerAuthKey(user, pin){
  const u = ggOwnerUser(user);
  const p = String(pin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(!u || !p) return null;
  return ggOwnerDerive(u + '·' + p + _ggOwnerSecret() + '·auth', 6);
}
// Identificador ESTABLE del dueño, derivado solo del usuario: no cambia
// nunca, ni siquiera al cambiar el PIN. Es lo que se guarda en codeClaims
// para saber de quién es cada código. Usar el authKey ahí sería un error
// grave: cambia con cada cambio de PIN, así que el dueño se quedaría
// bloqueado de su PROPIO negocio ("ese código ya está en uso en otra
// cuenta") la primera vez que reinstalara tras cambiarlo.
function ggOwnerId(user){
  const u = ggOwnerUser(user);
  if(!u) return null;
  return ggOwnerDerive(u + _ggOwnerSecret() + '·owner', 5);
}
/* ============================================================
   LICENCIA v3 — comprobación contra la lista de códigos emitidos
   Cualquiera con el JS del cliente puede inventarse un código con la pinta
   correcta (es la naturaleza de una app 100% cliente, no hay forma de
   evitarlo del todo sin un backend). Lo que SÍ se puede evitar es que eso
   baste para dar de alta un negocio: además tiene que existir de verdad en
   "gastrogoan/issuedCodes" del proyecto Firebase
   compartido de la plataforma (plataforma-gastrogoan — el mismo
   PLATFORM_FIREBASE_CONFIG/getPlatformFirebaseApp() de más abajo, que ya
   usa la app para el espejo público de reservas). Esa lista solo la
   escribe el generador de licencias (autenticado como el vendedor); el
   cliente solo puede leerla. getPlatformFirebaseApp() se define más abajo
   en este mismo fichero (orden de declaración de función, no de uso —
   está disponible aquí igualmente por hoisting).
   ============================================================ */
// Comprueba que este código de verdad se emitió desde generador-licencias.html
// (existe en gastrogoan/issuedCodes). null si no se pudo comprobar (sin
// conexión) — se distingue de "false" (comprobado y no existe) porque la
// activación en sí decide qué hacer con cada caso de forma distinta.
// Sin límite de tiempo, una conexión lenta o que se cuelga a medias (no un
// error claro, sino sin respuesta) dejaba este paso esperando para siempre
// sin ningún aviso — el botón de activación parecía "colgado" sin más. Con
// este límite, pasados 12s se trata igual que "sin conexión" (redeemBusinessCode
// ya sabe mostrar ese aviso), en vez de quedarse indefinidamente en silencio.
function withTimeout(promise, ms){
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms))
  ]);
}
async function verifyCodeIssuedOnPlatform(code){
  const app = await withTimeout(getPlatformFirebaseApp(), 12000);
  if(!app) return null;
  try{
    const snap = await withTimeout(app.database().ref('gastrogoan/issuedCodes/' + code).once('value'), 12000);
    if(snap === null) return null;
    return snap.exists();
  }catch(e){
    console.error('Error comprobando el código contra la plataforma', e);
    return null;
  }
}
/* Canjea un código de negocio contra la cuenta del propietario que está
   dentro ahora mismo. Sustituye a la antigua activación con código+
   contraseña: la contraseña se calculaba a partir del propio código con un
   algoritmo que viaja en el JS del cliente, así que cualquiera que tuviera
   el código podía deducirla — no demostraba nada y solo era un dato más
   que memorizar. Ahora la barrera real es doble y sí está del lado del
   servidor: el código tiene que existir en issuedCodes (solo lo escribe el
   generador) y no puede estar ya canjeado por OTRA cuenta.

   Devuelve {lic, reason} — lic null si no se pudo canjear, y reason dice
   por qué: 'offline' (no se pudo comprobar), 'unknown' (no existe) o
   'claimed' (ya está en uso en otra cuenta). Aquí SÍ se exige conexión, a
   diferencia de la revocación de licencias ya activas
   (checkLicenseRevocation), que es fail-open a propósito para no dejar
   tirado a un negocio que ya estaba trabajando sin wifi. */
async function redeemBusinessCode(code){
  code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(code.length !== 8) return {lic: null, reason: 'unknown'};
  const issued = await verifyCodeIssuedOnPlatform(code);
  if(issued === null) return {lic: null, reason: 'offline'};
  if(issued === false) return {lic: null, reason: 'unknown'};

  const lic = {code, tenantId: ggBizTenantId(code)};
  const login = getOwnerLogin();
  // Sin cuenta (dispositivo a medio configurar) se canjea igual: la lista
  // de negocios se vinculará en cuanto entre con su cuenta.
  if(!login || !login.user) return {lic, reason: null};
  const ownerId = ggOwnerId(login.user);

  // Un código pertenece a UN dueño. Sin esto, un cliente podría pasarle su
  // código a un conocido y tener los dos el mismo negocio pagando una sola
  // licencia. La reserva es atómica: si dos cuentas lo intentan a la vez,
  // solo una se lo queda. Se guarda el ggOwnerId (estable), NO el authKey:
  // ver el comentario de ggOwnerId.
  try{
    const app = await withTimeout(getPlatformFirebaseApp(), 12000);
    if(!app) return {lic: null, reason: 'offline'};
    const ref = app.database().ref('gastrogoan/codeClaims/' + code);
    const result = await ref.transaction(current => current === null ? ownerId : undefined);
    const owner = result.committed ? ownerId : result.snapshot.val();
    if(owner && owner !== ownerId) return {lic: null, reason: 'claimed'};
  }catch(e){
    console.error('Error reservando el código para esta cuenta', e);
    return {lic: null, reason: 'offline'};
  }
  return {lic, reason: null};
}

// Una licencia guardada es válida si su tenantId es el que de verdad se
// deriva de su código — así no hace falta volver a pedir la contraseña
// cada vez que se lee la licencia, solo al activarla la primera vez.
function isStoredLicenseValid(lic){
  return !!(lic && lic.code && lic.tenantId && ggBizTenantId(lic.code) === lic.tenantId);
}

function getLicense(){
  try{
    const l = JSON.parse(localStorage.getItem(LICENSE_LS));
    if(isStoredLicenseValid(l)) return l;
  }catch(e){}
  const dl = (typeof DB !== 'undefined' && DB) ? DB.license : null;
  if(isStoredLicenseValid(dl)){
    localStorage.setItem(LICENSE_LS, JSON.stringify(dl));
    return dl;
  }
  return null;
}

/* Identificador privado del negocio dentro de la nube compartida.
   Es el token de alta entropía incrustado en la clave de licencia: todos
   los dispositivos que se activen con la misma clave (dueño y empleados)
   caen en el mismo "tenant" y se sincronizan automáticamente entre sí. */
function getTenantId(){
  const lic = getLicense();
  return lic ? lic.tenantId : null;
}

/* Identificador público (de menor privilegio) que se incrusta en el
   enlace/QR de reservas y pedidos online. No permite deducir la clave de
   licencia ni acceder al resto de los datos del negocio.

   ⚠️ ANTES se calculaba a partir del tenantId, y eso lo hacía DEDUCIBLE:
   quien conociera el código del negocio podía derivar su enlace público, y
   eran solo 7 caracteres salidos de un hash de 32 bits. Como las reglas de
   Firebase dejan LEER `public/{publicId}/requests` a cualquiera autenticado
   (una sesión anónima la abre cualquiera), quien acertara el identificador
   se llevaba el nombre, el teléfono, el email y las notas —donde los
   clientes apuntan sus alergias— de todas las reservas del restaurante.

   Ahora se sortea una sola vez, con el generador criptográfico del
   navegador, y se guarda en el negocio (así viaja a los demás dispositivos
   por la sincronización normal). Adivinarlo deja de ser posible.

   Esto NO arregla el fondo del asunto: quien tenga el enlace —que el propio
   restaurante reparte en su QR— sigue pudiendo leer esos datos. Cerrarlo de
   verdad exige una Cloud Function que dé identidad al panel del negocio, y
   con ella el plan Blaze de Firebase. Queda como decisión de negocio
   (ver ANALISIS_GENERAL.md, punto 7). */
function publicIdDerivadoAntiguo(tenantId){
  // padStart asegura siempre 7 caracteres (un uint32 en base36 ocupa
  // como máximo 7), para cumplir el mínimo de 4 que exigen las reglas
  // de Firebase ($publicId.length >= 4) sin importar el valor del hash.
  return ggLicHash(tenantId + '·gastrogoan·public·v1').toString(36).padStart(7, '0');
}
function nuevoPublicIdAleatorio(){
  const abc = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const n = 22; // dentro del 4–30 que exigen las reglas de Firebase
  let out = '';
  const c = (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto : null;
  const bytes = c ? c.getRandomValues(new Uint8Array(n)) : null;
  for(let i=0;i<n;i++){
    // Sin crypto (navegador muy viejo) se degrada a Math.random antes que
    // quedarse sin enlace público: peor que aleatorio de verdad, pero
    // sigue siendo mucho mejor que el derivado del código.
    const v = bytes ? bytes[i] : Math.floor(Math.random()*256);
    out += abc[v % abc.length];
  }
  return out;
}
function getPublicId(){
  const tenantId = getTenantId();
  if(!tenantId) return null;
  if(!DB || !DB.business) return null;
  if(DB.business.publicId) return DB.business.publicId;
  // Un negocio que YA terminó su configuración puede tener carteles y QR
  // impresos con el enlace viejo: se le conserva el identificador derivado
  // para no dejarle el QR muerto de un día para otro. Solo estrenan
  // identificador sorteado los negocios nuevos.
  const pid = DB.business.netlifySetupDone ? publicIdDerivadoAntiguo(tenantId) : nuevoPublicIdAleatorio();
  DB.business.publicId = pid;
  recordarPublicIdEnLicencia(pid);
  if(typeof saveDB === 'function') saveDB();
  return pid;
}
// El selector de locales de la web pública lee los negocios hermanos desde
// localStorage, sin abrir la base de cada uno: por eso el identificador se
// deja también junto a su licencia.
function recordarPublicIdEnLicencia(pid){
  try{
    const lic = getLicense();
    if(!lic || lic.publicId === pid) return;
    lic.publicId = pid;
    localStorage.setItem(LICENSE_LS, JSON.stringify(lic));
  }catch(e){}
}

/* Lista de revocación: un JSON público y gratuito (alojado en GitHub) con
   los tenantId de licencias desactivadas (p.ej. impagos o claves filtradas).
   La comprobación es "best effort": si no hay internet o falla la carga,
   no se bloquea a nadie (fail-open), y se usa la última lista conocida
   guardada en este dispositivo. */
const REVOKED_LIST_URL = 'https://raw.githubusercontent.com/gastrogoan-rgb/gastrogoan/main/revoked-licenses.json';
const REVOKED_CACHE_KEY = 'gastrogoan_revoked_v1';

/* Worker (Cloudflare) que actúa de puente para el TPV virtual (Redsys):
   firma las peticiones de pago con la clave secreta (que nunca llega al
   navegador) y recibe la confirmación de pago de Redsys para avisar
   automáticamente a este negocio. */
const REDSYS_WORKER_URL = 'https://gastro.gastrogoan.workers.dev';

async function checkLicenseRevocation(){
  const tenantId = getTenantId();
  if(!tenantId) return;
  let list = null;
  try{
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(REVOKED_LIST_URL, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(timer);
    if(res.ok){
      const data = await res.json();
      if(Array.isArray(data.revoked)){
        list = data.revoked;
        localStorage.setItem(REVOKED_CACHE_KEY, JSON.stringify(list));
      }
    }
  }catch(e){
    try{ list = JSON.parse(localStorage.getItem(REVOKED_CACHE_KEY)); }catch(e2){}
  }
  if(Array.isArray(list) && list.includes(tenantId)) showRevokedGate();
}

function showRevokedGate(){
  if(document.getElementById('revoked-gate')) return;
  const g = document.createElement('div');
  g.id = 'revoked-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100001;background:var(--brand-cream);overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px';
  g.innerHTML = `
    <div style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;text-align:center">
      <div style="width:54px;height:54px;border-radius:14px;background:#8A4A3B;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px"><i class="ti ti-lock"></i></div>
      <h2 style="margin-bottom:4px">${t('access.revokedTitle')}</h2>
      <p style="color:#444;font-size:13.5px;line-height:1.6">${t('access.revokedDesc')}</p>
    </div>`;
  document.body.appendChild(g);
}

const ONBOARDING_ROLE_LS = 'gastrogoan_onboarding_role';

// Este gate ya solo lo ve el propietario: activar la licencia de un negocio
// nuevo es siempre algo que hace quien lo compró, así que se quitó el
// selector "¿quién eres? dueño/empleado" — un empleado nunca llega aquí,
// entra siempre por "Acceso Empleados" con nombre+PIN+código, sin licencia
// que pegar. Basta con el código corto de la compra: la contraseña que lo
// acompañaba se calculaba a partir del propio código, así que no demostraba
// nada y solo era un dato más que memorizar.
function showActivationGate(){
  if(document.getElementById('license-gate')) return;
  const g = document.createElement('div');
  g.id = 'license-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px';
  const showBackBtn = (typeof slotsOfCurrentOwner === 'function' ? slotsOfCurrentOwner() : getBusinessSlots())
    .filter(x => x.code).length > 0;
  g.innerHTML = `
    <div style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;text-align:center;position:relative">
      <button onclick="${showBackBtn ? 'backToBusinessSelectorFromGate()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:8px;left:8px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;padding:10px;min-height:44px"><i class="ti ti-arrow-left"></i> ${showBackBtn ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px"><i class="ti ti-tools-kitchen-2"></i></div>
      <h2 style="margin-bottom:4px">GastroGoan</h2>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:18px">${t('gate.lic.stepLabel')}</p>
      <div style="text-align:left">
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px"><i class="ti ti-key"></i> ${t('access.businessCode')} <span style="font-weight:400;color:var(--muted)">(${t('gate.lic.givenByVendor')})</span></label>
        <input id="license-code-input" type="text" maxlength="8" placeholder="XXXXXXXX" style="width:100%;border:1.5px solid var(--border);border-radius:9px;padding:12px;font-family:monospace;font-size:16px;letter-spacing:2px;text-transform:uppercase" onkeydown="if(event.key==='Enter')activateLicenseFromGate()">
        <div id="license-error" style="display:none;background:#F5EBE7;color:#8A4A3B;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:10px"></div>
        <button id="license-activate-btn" onclick="activateLicenseFromGate()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:12px">${t('gate.lic.activateBtn')}</button>
      </div>
    </div>`;
  document.body.appendChild(g);
}

function hideActivationGate(){
  const g = document.getElementById('license-gate');
  if(g) g.remove();
}

// Desde la pantalla de activación de un negocio sin licencia, vuelve al
// selector de negocios para poder elegir otro o quitar este de la lista.
function backToBusinessSelectorFromGate(){
  hideActivationGate();
  showBusinessSelectScreen();
}

// Vía de escape genérica para cualquiera de los "gates" de configuración
// inicial (activación, nube, hosting) cuando NO hay más de un negocio dado
// de alta (así que "volver a Negocios" no tiene sentido): antes, en ese
// caso más común -instalación nueva-, no había ninguna forma de salir de
// estas pantallas salvo recargar la página. Cierra la sesión y vuelve a la
// pantalla inicial de "Acceso Empleados / Acceso Propietarios", sin perder
// ningún dato (nada de lo escrito en el gate se había guardado todavía).
function exitSetupGateToLogin(){
  ['license-gate','firebase-gate','netlify-gate'].forEach(id => document.getElementById(id)?.remove());
  exitToAccessScreen();
}

// Volver a la pantalla de "Acceso Empleados / Acceso Propietarios" desde
// cualquier sitio donde el usuario pueda quedarse sin salida. No borra nada:
// lo único que se cierra es la sesión de acceso.
function exitToAccessScreen(){
  hideBusinessSelectScreen();
  clearAccessSession();
  showAccessSelectScreen();
}

/* Reglas de seguridad de Firebase que el propietario debe pegar en
   Realtime Database → Reglas. Cada negocio tiene su propio proyecto, así
   que estas reglas solo aplican a los datos de ese negocio. */
const FIREBASE_RULES_JSON = `{
  "rules": {
    "gastrogoan": {
      ".read": false,
      ".write": false,
      "tenants": {
        "$tenantId": {
          ".read": "auth != null && $tenantId.length >= 4 && $tenantId.length <= 60",
          ".write": "auth != null && $tenantId.length >= 4 && $tenantId.length <= 60"
        }
      },
      "public": {
        "$publicId": {
          "info": {
            ".read": "auth != null",
            ".write": "auth != null && $publicId.length >= 4 && $publicId.length <= 30"
          },
          "requests": {
            ".read": "auth != null && $publicId.length >= 4 && $publicId.length <= 30",
            ".write": "auth != null && $publicId.length >= 4 && $publicId.length <= 30"
          }
        }
      }
    }
  }
}`;

function copyFirebaseRules(){
  navigator.clipboard.writeText(FIREBASE_RULES_JSON).then(() => showToast(t('msg.rulesCopied'))).catch(() => {
    alertModal(t('msg.copyFailed'));
  });
}

/* Paso obligatorio justo después de activar la licencia: cada negocio
   necesita su propio proyecto Firebase (gratuito) para sincronizar
   dispositivos y activar las reservas/pedidos online. Bloquea el acceso
   a la app hasta que se configure (o, en dispositivos de empleados, hasta
   que se peguen los mismos datos que configuró el dueño/a). */
const FIREBASE_GATE_STEPS = [
  {title:{es:'Crea un proyecto gratis en Firebase', ca:'Crea un projecte gratuït a Firebase', en:'Create a free Firebase project'},
   body:{
     es:`Abre <code>console.firebase.google.com</code> en otra pestaña (puedes volver a esta después) e inicia sesión con una cuenta de Google (la que quieras, puede ser una nueva solo para esto).<br><br>
        Pulsa <strong>"Crear un proyecto"</strong> (o "Agregar proyecto"), escribe un nombre (por ejemplo, el nombre de tu restaurante) y pulsa "Continuar". Cuando te pregunte por Google Analytics, puedes <strong>desactivarlo</strong> y pulsar "Crear proyecto". Espera unos segundos hasta que termine.`,
     ca:`Obre <code>console.firebase.google.com</code> en una altra pestanya (pots tornar a aquesta després) i inicia sessió amb un compte de Google (el que vulguis, pot ser un de nou només per a això).<br><br>
        Prem <strong>"Crear un projecte"</strong> (o "Afegir projecte"), escriu un nom (per exemple, el nom del teu restaurant) i prem "Continuar". Quan et pregunti per Google Analytics, pots <strong>desactivar-lo</strong> i prémer "Crear projecte". Espera uns segons fins que acabi.`,
     en:`Open <code>console.firebase.google.com</code> in another tab (you can come back here after) and sign in with a Google account (any one, it can be a new one just for this).<br><br>
        Click <strong>"Create a project"</strong> (or "Add project"), type a name (e.g. your restaurant's name) and click "Continue". When asked about Google Analytics, you can <strong>disable it</strong> and click "Create project". Wait a few seconds until it finishes.`}},
  {title:{es:'Activa "Realtime Database"', ca:'Activa "Realtime Database"', en:'Enable "Realtime Database"'},
   body:{
     es:`En el menú de la izquierda, busca el apartado <strong>"Base de datos y almacenamiento"</strong> y dentro pulsa <strong>"Realtime Database"</strong>.<br><br>
        Pulsa el botón <strong>"Crear base de datos"</strong>. En la ubicación, elige <strong>"Bélgica (europe-west1)"</strong> y pulsa "Siguiente".<br><br>
        Cuando te pregunte por las reglas de seguridad, elige la opción <strong>"Modo bloqueado"</strong> y pulsa "Habilitar". (En el paso 4 pegaremos las reglas correctas).`,
     ca:`Al menú de l'esquerra, busca l'apartat <strong>"Base de dades i emmagatzematge"</strong> i dins prem <strong>"Realtime Database"</strong>.<br><br>
        Prem el botó <strong>"Crear base de dades"</strong>. A la ubicació, tria <strong>"Bèlgica (europe-west1)"</strong> i prem "Següent".<br><br>
        Quan et pregunti per les regles de seguretat, tria l'opció <strong>"Mode bloquejat"</strong> i prem "Habilitar". (Al pas 4 enganxarem les regles correctes).`,
     en:`In the left menu, find <strong>"Build"</strong> and click <strong>"Realtime Database"</strong>.<br><br>
        Click <strong>"Create Database"</strong>. For location, choose <strong>"Belgium (europe-west1)"</strong> and click "Next".<br><br>
        When asked about security rules, choose <strong>"Locked mode"</strong> and click "Enable". (In step 4 we'll paste the correct rules).`}},
  {title:{es:'Activa el inicio de sesión "Anónimo"', ca:'Activa l\'inici de sessió "Anònim"', en:'Enable "Anonymous" sign-in'},
   body:{
     es:`En el menú de la izquierda, dentro de <strong>"Seguridad"</strong>, pulsa <strong>"Authentication"</strong>.<br><br>
        Pulsa <strong>"Comenzar"</strong> (si es la primera vez) y luego abre la pestaña <strong>"Método de acceso"</strong>.<br><br>
        En la lista de proveedores, busca <strong>"Anónimo"</strong>, pulsa sobre él, activa el interruptor y pulsa <strong>"Guardar"</strong>.<br><br>
        <span style="color:var(--muted)">Esto permite que la app se conecte sola, sin pedir usuario ni contraseña a nadie.</span>`,
     ca:`Al menú de l'esquerra, dins de <strong>"Seguretat"</strong>, prem <strong>"Authentication"</strong>.<br><br>
        Prem <strong>"Començar"</strong> (si és el primer cop) i després obre la pestanya <strong>"Mètode d'accés"</strong>.<br><br>
        A la llista de proveïdors, busca <strong>"Anònim"</strong>, prem-hi, activa l'interruptor i prem <strong>"Desar"</strong>.<br><br>
        <span style="color:var(--muted)">Això permet que l'app es connecti sola, sense demanar usuari ni contrasenya a ningú.</span>`,
     en:`In the left menu, under <strong>"Build"</strong>, click <strong>"Authentication"</strong>.<br><br>
        Click <strong>"Get started"</strong> (if it's the first time) and then open the <strong>"Sign-in method"</strong> tab.<br><br>
        In the provider list, find <strong>"Anonymous"</strong>, click it, toggle it on and click <strong>"Save"</strong>.<br><br>
        <span style="color:var(--muted)">This lets the app connect on its own, without asking anyone for a username or password.</span>`}},
  // Firebase solo acepta conexiones desde direcciones apuntadas en esta
  // lista, y de fábrica trae localhost y las suyas propias. Sin este paso,
  // el cliente termina el alta entero y se encuentra un "error de nube" al
  // final, sin manera de saber por qué: la app publicada en gastrogoan.com
  // no está autorizada en SU proyecto. Va justo detrás del paso del inicio
  // anónimo porque es la misma pantalla de Firebase (Authentication).
  {title:{es:'Autoriza la dirección de la app', ca:'Autoritza l\'adreça de l\'app', en:'Authorize the app address'},
   body:{
     es:`Sigue en <strong>"Authentication"</strong>. Abre ahora la pestaña <strong>"Settings"</strong> (Configuración) y baja hasta <strong>"Dominios autorizados"</strong>.<br><br>
        Pulsa <strong>"Añadir dominio"</strong> y añade estas dos, una a una:<br>
        <code>app.gastrogoan.com</code><br>
        <code>reservas.gastrogoan.com</code><br><br>
        <span style="color:var(--muted)">Firebase solo acepta conexiones desde las direcciones de esta lista, y de fábrica no trae las nuestras. Si te saltas este paso, todo lo demás estará bien pero los datos no se sincronizarán.</span>`,
     ca:`Continua a <strong>"Authentication"</strong>. Obre ara la pestanya <strong>"Settings"</strong> (Configuració) i baixa fins a <strong>"Dominis autoritzats"</strong>.<br><br>
        Prem <strong>"Afegir domini"</strong> i afegeix aquestes dues, una a una:<br>
        <code>app.gastrogoan.com</code><br>
        <code>reservas.gastrogoan.com</code><br><br>
        <span style="color:var(--muted)">Firebase només accepta connexions des de les adreces d'aquesta llista, i de fàbrica no porta les nostres. Si et saltes aquest pas, tota la resta estarà bé però les dades no se sincronitzaran.</span>`,
     en:`Stay in <strong>"Authentication"</strong>. Now open the <strong>"Settings"</strong> tab and scroll down to <strong>"Authorized domains"</strong>.<br><br>
        Click <strong>"Add domain"</strong> and add these two, one at a time:<br>
        <code>app.gastrogoan.com</code><br>
        <code>reservas.gastrogoan.com</code><br><br>
        <span style="color:var(--muted)">Firebase only accepts connections from the addresses in this list, and ours are not there out of the box. Skip this step and everything else will be fine, but your data will not sync.</span>`}},
  {title:{es:'Pega las reglas de seguridad', ca:'Enganxa les regles de seguretat', en:'Paste the security rules'},
   body:{
     es:`Vuelve a <strong>Realtime Database</strong> (menú "Base de datos y almacenamiento") y abre la pestaña <strong>"Reglas"</strong> (Rules), arriba del todo.<br><br>
        Borra todo el contenido del cuadro de texto y pega estas reglas (pulsa el botón para copiarlas):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11px;max-height:140px;overflow:auto;white-space:pre-wrap;margin-bottom:8px">${FIREBASE_RULES_JSON.replace(/</g,'&lt;')}</div>
        <button class="btn btn-sm" onclick="copyFirebaseRules()" type="button"><i class="ti ti-copy"></i> Copiar reglas</button><br><br>
        Por último, pulsa el botón <strong>"Publicar"</strong> (Publish) arriba a la derecha.`,
     ca:`Torna a <strong>Realtime Database</strong> (menú "Base de dades i emmagatzematge") i obre la pestanya <strong>"Regles"</strong> (Rules), a dalt de tot.<br><br>
        Esborra tot el contingut del quadre de text i enganxa aquestes regles (prem el botó per copiar-les):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11px;max-height:140px;overflow:auto;white-space:pre-wrap;margin-bottom:8px">${FIREBASE_RULES_JSON.replace(/</g,'&lt;')}</div>
        <button class="btn btn-sm" onclick="copyFirebaseRules()" type="button"><i class="ti ti-copy"></i> Copiar regles</button><br><br>
        Finalment, prem el botó <strong>"Publicar"</strong> (Publish) a dalt a la dreta.`,
     en:`Go back to <strong>Realtime Database</strong> ("Build" menu) and open the <strong>"Rules"</strong> tab, at the top.<br><br>
        Delete all the content in the text box and paste these rules (click the button to copy them):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11px;max-height:140px;overflow:auto;white-space:pre-wrap;margin-bottom:8px">${FIREBASE_RULES_JSON.replace(/</g,'&lt;')}</div>
        <button class="btn btn-sm" onclick="copyFirebaseRules()" type="button"><i class="ti ti-copy"></i> Copy rules</button><br><br>
        Finally, click the <strong>"Publish"</strong> button at the top right.`}},
  {title:{es:'Crea una "app web" y copia tus datos', ca:'Crea una "app web" i copia les teves dades', en:'Create a "web app" and copy your data'},
   body:{
     es:`Pulsa el icono de engranaje ⚙️ (arriba a la izquierda, junto al nombre del proyecto) para abrir <strong>"Configuración"</strong> y entra en la pestaña <strong>"General"</strong>.<br><br>
        Baja hasta la sección <strong>"Tus apps"</strong>. Si está vacía, pulsa el icono <strong>"&lt;/&gt;"</strong> (Web), ponle un nombre cualquiera (p.ej. "GastroGoan") y pulsa "Registrar app" (no necesitas configurar Hosting).<br><br>
        Te aparecerá un bloque de código con varios datos. Busca y copia estos dos:
        <ul style="margin:6px 0 0 18px">
          <li><code>apiKey</code> → algo como <code>AIzaSy...</code></li>
          <li><code>databaseURL</code> → algo como <code>https://tu-proyecto-default-rtdb.europe-west1.firebasedatabase.app</code></li>
        </ul>`,
     ca:`Prem la icona d'engranatge ⚙️ (a dalt a l'esquerra, al costat del nom del projecte) per obrir <strong>"Configuració"</strong> i entra a la pestanya <strong>"General"</strong>.<br><br>
        Baixa fins a la secció <strong>"Les teves apps"</strong>. Si és buida, prem la icona <strong>"&lt;/&gt;"</strong> (Web), posa-li un nom qualsevol (p. ex. "GastroGoan") i prem "Registrar app" (no cal configurar Hosting).<br><br>
        T'apareixerà un bloc de codi amb diverses dades. Busca i copia aquestes dues:
        <ul style="margin:6px 0 0 18px">
          <li><code>apiKey</code> → alguna cosa com <code>AIzaSy...</code></li>
          <li><code>databaseURL</code> → alguna cosa com <code>https://el-teu-projecte-default-rtdb.europe-west1.firebasedatabase.app</code></li>
        </ul>`,
     en:`Click the gear icon ⚙️ (top left, next to the project name) to open <strong>"Project settings"</strong> and go to the <strong>"General"</strong> tab.<br><br>
        Scroll down to the <strong>"Your apps"</strong> section. If it's empty, click the <strong>"&lt;/&gt;"</strong> (Web) icon, give it any name (e.g. "GastroGoan") and click "Register app" (you don't need to set up Hosting).<br><br>
        You'll see a code block with several values. Find and copy these two:
        <ul style="margin:6px 0 0 18px">
          <li><code>apiKey</code> → something like <code>AIzaSy...</code></li>
          <li><code>databaseURL</code> → something like <code>https://your-project-default-rtdb.europe-west1.firebasedatabase.app</code></li>
        </ul>`}},
  {title:{es:'Pégalos aquí abajo y guarda', ca:'Enganxa-les aquí sota i desa', en:'Paste them below and save'},
   body:{
     es:`Pega esos dos valores en los campos siguientes y pulsa "Guardar y conectar". La app se recargará y quedará lista.<br><br>
        <span style="color:var(--muted)">Guárdalos también en un sitio seguro (las notas del móvil, por ejemplo). Tus empleados <strong>no</strong> los necesitan: entran desde "Acceso Empleados" con su nombre, su PIN y el código del negocio, y la app encuentra tu restaurante sola. Estos dos datos son para ti, por si algún día tienes que volver a conectar un dispositivo a mano.</span>`,
     ca:`Enganxa aquests dos valors als camps següents i prem "Desar i connectar". L'app es recarregarà i quedarà a punt.<br><br>
        <span style="color:var(--muted)">Desa'ls també en un lloc segur (les notes del mòbil, per exemple). Els teus empleats <strong>no</strong> els necessiten: entren des d'"Accés Empleats" amb el seu nom, el seu PIN i el codi del negoci, i l'app troba el teu restaurant sola. Aquestes dues dades són per a tu, per si algun dia has de tornar a connectar un dispositiu a mà.</span>`,
     en:`Paste those two values into the fields below and click "Save and connect". The app will reload and be ready.<br><br>
        <span style="color:var(--muted)">Also keep them somewhere safe (your phone notes, for example). Your staff do <strong>not</strong> need them: they sign in from "Staff access" with their name, their PIN and the business code, and the app finds your restaurant on its own. These two values are for you, in case you ever need to reconnect a device by hand.</span>`}},
];

// Tras la nube (obligatoria), se ofrecen las otras dos conexiones externas
// -Redsys y confirmación por email- en dos pantallas, una detrás de otra,
// dejando clarísimo que son OPCIONALES: se puede saltar cada una sin
// configurarla y seguir usando la app con normalidad, porque siempre
// quedan disponibles en Mi Negocio → Conexiones externas para cuando el
// negocio quiera activarlas. No se reutiliza el modal de Mi Negocio para
// esto porque en ese momento (justo tras el alta) el negocio todavía no ha
// visto la app por dentro — este flujo va sobre un lienzo propio, a pantalla
// completa, igual que el resto de "gates" del arranque.
let extConnPromptStep = 0;
const EXT_CONN_PROMPT_STEPS = [
  {icon:'ti-credit-card', titleKey:'mn.redsys.title', descKey:'mn.redsys.desc', renderCard: () => renderRedsysCard()},
  {icon:'ti-mail-check', titleKey:'mn.emailConfirm.title', descKey:'mn.emailConfirm.desc', renderCard: () => renderEmailConfirmCard()},
];
function showExternalConnectionsPrompt(){
  extConnPromptStep = 0;
  renderExternalConnectionsPromptStep();
}
function renderExternalConnectionsPromptStep(){
  let g = document.getElementById('extconn-gate');
  if(!g){
    g = document.createElement('div');
    g.id = 'extconn-gate';
    g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
    document.body.appendChild(g);
  }
  const step = EXT_CONN_PROMPT_STEPS[extConnPromptStep];
  const isLast = extConnPromptStep === EXT_CONN_PROMPT_STEPS.length - 1;
  g.innerHTML = `
    <div style="max-width:520px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px">
      <div style="text-align:center;margin-bottom:18px">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--teal,#2a8f88);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px"><i class="ti ${step.icon}"></i></div>
        <p style="font-size:11.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">${t('gate.extConn.stepLabel').replace('${n}', extConnPromptStep+1).replace('${total}', EXT_CONN_PROMPT_STEPS.length)}</p>
        <h2 style="margin-bottom:4px">${t(step.titleKey)}</h2>
      </div>
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">
        <strong>${t('gate.extConn.optional')}</strong> ${t('gate.extConn.alwaysThere')}
      </div>
      ${step.renderCard()}
      <button onclick="skipExternalConnectionsPromptStep()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit;margin-top:14px">
        ${isLast ? t('gate.extConn.finishBtn') : t('gate.extConn.nextBtn')}
      </button>
      <p style="text-align:center;font-size:11.5px;color:var(--muted);margin-top:8px">${t('gate.extConn.skipHint')}</p>
    </div>`;
  if(extConnPromptStep === 0) loadRedsysCardStatus();
}
// Se llama tanto al pulsar "ahora no" como después de guardar/probar una
// conexión (las propias tarjetas de Redsys/Email no saben que están dentro
// de este asistente, así que el avance de paso siempre lo dispara este
// botón, se haya configurado algo en el paso o no).
function skipExternalConnectionsPromptStep(){
  if(extConnPromptStep < EXT_CONN_PROMPT_STEPS.length - 1){
    extConnPromptStep++;
    renderExternalConnectionsPromptStep();
    return;
  }
  document.getElementById('extconn-gate')?.remove();
  DB.business.extConnPromptSeen = true;
  saveDB();
  if(!DB.business.tourSeen) promptAppTour();
}

function showFirebaseSetupGate(){
  if(document.getElementById('firebase-gate')) return;
  const g = document.createElement('div');
  g.id = 'firebase-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
  const step = (n, title, body) => `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${n}</div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:13.5px;margin-bottom:4px">${title}</p>
        <div style="font-size:13px;color:#444;line-height:1.6">${body}</div>
      </div>
    </div>`;

  const stepsHtml = FIREBASE_GATE_STEPS.map((s,i) => step(i+1, gl(s.title), gl(s.body))).join('\n');

  const employeeBoxHtml = `
      <div style="background:#F1EFE9;border-left:4px solid #4A5D4E;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:20px;text-align:left">
        <i class="ti ti-device-mobile"></i> <strong>${t('gate.employeeQuestion')}</strong> ${t('gate.employeeBody')}
      </div>`;

  const role = localStorage.getItem(ONBOARDING_ROLE_LS) || 'owner';
  const intro = `
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">
        ${t('gate.cloudIntro')}
      </div>
      <div style="background:var(--teal-l,#eef7f6);border-left:4px solid var(--teal,#2a8f88);border-radius:8px;padding:12px 14px;font-size:12.5px;line-height:1.6;margin-bottom:18px;text-align:left">
        <strong><i class="ti ti-plug-connected"></i> ${t('gate.externalConnections.title')}</strong><br>
        ${t('gate.externalConnections.body')}
      </div>`;

  let bodyHtml;
  if(role === 'employee'){
    bodyHtml = `
      ${intro}
      ${employeeBoxHtml}
      <details style="margin-bottom:6px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">${t('gate.seeFullGuide')}</summary>
        <div style="margin-top:14px">${stepsHtml}</div>
      </details>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:6px">
        ${renderOwnFirebaseForm()}
      </div>`;
  }else{
    bodyHtml = `
      ${intro}
      <h3 style="font-size:14px;margin-bottom:12px;text-align:left"><i class="ti ti-user"></i> ${t('gate.followSteps')}</h3>
      ${stepsHtml}
      <details style="margin:14px 0 6px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)"><i class="ti ti-device-mobile"></i> ${t('gate.shareWithEmployees')}</summary>
        <div style="margin-top:10px">${employeeBoxHtml}</div>
      </details>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:6px">
        ${renderOwnFirebaseForm()}
      </div>`;
  }

  const showBackBtnFb = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:560px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px;position:relative">
      <button onclick="${showBackBtnFb ? 'hideFirebaseSetupGate();showBusinessSelectScreen()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:8px;left:8px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;padding:10px;min-height:44px"><i class="ti ti-arrow-left"></i> ${showBackBtnFb ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px"><i class="ti ti-cloud"></i></div>
        <h2 style="margin-bottom:4px">${t('gate.setupCloud')}</h2>
        <p style="color:var(--muted);font-size:13.5px;margin-bottom:16px">${t('gate.cloudStepLabel')}</p>
      </div>
      ${bodyHtml}
    </div>`;
  document.body.appendChild(g);
}

function hideFirebaseSetupGate(){
  const g = document.getElementById('firebase-gate');
  if(g) g.remove();
}

/* Paso guiado: solo hace falta si la app se abre desde un archivo local
   (file://) o localhost, donde el QR de reservas/pedidos no puede
   funcionar. Desde que GastroGoan se sirve desde un hosting centralizado
   (una única dirección que mantenemos nosotros, no una copia que sube
   cada negocio a su propia cuenta), esto ya está resuelto de fábrica para
   cualquiera que abra la app desde esa dirección: se detecta como
   "hosted" automáticamente y el aviso ni se muestra. Solo aparece como
   recordatorio en el caso residual de que alguien abra el archivo local. */
function showNetlifySetupGate(){
  if(document.getElementById('netlify-gate')) return;
  const hosted = (location.protocol === 'http:' || location.protocol === 'https:') &&
                 !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if(hosted){
    // Ya se sirve desde una URL pública real (el hosting centralizado, o
    // en su día la propia cuenta de Netlify de un negocio ya migrado): no
    // hace falta interrumpir con el asistente, se da por resuelto.
    DB.business.netlifySetupDone = true;
    saveDB();
    if(!getLicense()) showActivationGate();
    else if(!getCloudConfig()) showFirebaseSetupGate();
    else if(!DB.business.extConnPromptSeen) showExternalConnectionsPrompt();
    else if(!DB.business.tourSeen) promptAppTour();
    return;
  }
  // A partir de aquí, hosted es siempre false (el caso hosted=true ya
  // volvió arriba): alguien está abriendo la app desde un archivo local,
  // no desde la dirección centralizada. Mensaje simple, sin el antiguo
  // tutorial paso a paso de "crea tu cuenta de Netlify" (ya no aplica).
  const g = document.createElement('div');
  g.id = 'netlify-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
  const showBackBtnNt = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:520px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px;position:relative">
      <button onclick="${showBackBtnNt ? 'hideNetlifySetupGate();showBusinessSelectScreen()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:8px;left:8px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px;padding:10px;min-height:44px"><i class="ti ti-arrow-left"></i> ${showBackBtnNt ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px"><i class="ti ti-world"></i></div>
        <h2 style="margin-bottom:4px">${t('gate.nt.title')}</h2>
      </div>
      <div style="background:#F5EBE7;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left"><i class="ti ti-alert-triangle"></i> ${t('gate.nt.notHostedBody')}</div>
      <button onclick="confirmNetlifyDone()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:8px"><i class="ti ti-check"></i> ${t('gate.nt.doneBtn')}</button>
    </div>`;
  document.body.appendChild(g);
}
function hideNetlifySetupGate(){
  const g = document.getElementById('netlify-gate');
  if(g) g.remove();
}
function confirmNetlifyDone(){
  DB.business.netlifySetupDone = true;
  saveDB();
  hideNetlifySetupGate();
  // Sin ningún negocio canjeado todavía, el siguiente paso es el selector
  // vacío (de donde sale el canje), no el asistente de un negocio que aún
  // no existe.
  if(!ownerHasAnyBusiness()) showBusinessSelectScreen();
  else if(!getLicense()) showActivationGate();
  else if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!DB.business.extConnPromptSeen) showExternalConnectionsPrompt();
    else if(!DB.business.tourSeen) promptAppTour();
}
async function activateLicenseFromGate(){
  const code = (document.getElementById('license-code-input').value || '').trim();
  const btn = document.getElementById('license-activate-btn');
  const err0 = document.getElementById('license-error');
  const codigoNormalizado = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Mismo guardián que confirmBusinessLicensePrompt: al llegar aquí, el
  // hueco activo ya está garantizado nuevo y vacío (ver redeemFirstBusiness),
  // así que un código que ya sea OTRO hueco solo puede ser un error de
  // tecleo, nunca una reinstalación legítima.
  if(codeUsedByOtherSlot(codigoNormalizado, ACTIVE_SLOT)){
    if(err0){ err0.textContent = t('gate.codeAlreadyOtherBusiness'); err0.style.display = 'block'; }
    return;
  }
  if(btn) btn.disabled = true;
  const {lic, reason} = await redeemBusinessCode(code);
  if(btn) btn.disabled = false;
  const err = document.getElementById('license-error');
  if(!lic){
    err.textContent = t(reason === 'offline' ? 'gate.licenseOffline' : redeemErrorKey(reason));
    err.style.display = 'block';
    return;
  }
  localStorage.setItem(LICENSE_LS, JSON.stringify(lic));
  DB.license = lic;
  saveDB();
  // El código de negocio de este slot es el mismo que el de la licencia —
  // es lo que se usará después para que los empleados entren desde
  // "Acceso Empleados".
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === ACTIVE_SLOT);
  if(slot){
    slot.code = lic.code;
    // Que el negocio quede a nombre de quien lo acaba de canjear.
    if(typeof currentOwnerId === 'function'){ const me = currentOwnerId(); if(me) slot.ownerId = me; }
    saveBusinessSlots(slots);
  }
  // Que quede en la cuenta del dueño: así este negocio aparece solo en
  // cualquier otro dispositivo donde entre, sin volver a canjear el código.
  linkBusinessToOwnerAccount(lic.tenantId, lic.code, DB.business && DB.business.name);
  updateActiveSlotName(DB.business && DB.business.name);
  hideActivationGate();
  showToast(t('msg.licenseActivated'));
  initCloud();
  initPublicRequestsListener();
  checkLicenseRevocation();
  // Justo después de activar la licencia, toca configurar la nube (mismas
  // instrucciones para todos los negocios) — antes de esto no tenía mucho
  // sentido pedirla, ya que sin licencia no había negocio real que
  // configurar.
  if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!DB.business.extConnPromptSeen) showExternalConnectionsPrompt();
    else if(!DB.business.tourSeen) promptAppTour();
}

// Retoma, en orden, cualquier paso de la configuración inicial de un
// negocio que quedara pendiente (aviso de hosting local, licencia, nube,
// tour) — se llama tanto justo después de activar la licencia desde
// "Acceso Propietarios" como al arrancar con una sesión de propietario ya
// guardada, por si la sesión anterior se cerró a media configuración.
// Devuelve true si mostró algún paso pendiente (y por tanto no hay que
// continuar con el arranque normal de la app).
function continuePendingOwnerSetup(){
  // Lo primero de todo, antes incluso del resto de la configuración
  // inicial: si acaba de entrar por primera vez, se le anima a cambiar el
  // PIN que venía con su cuenta justo al entrar, no al final del todo.
  if(getOwnerLogin() && !localStorage.getItem(OWNER_PASS_PROMPTED_LS)){ promptChangeOwnerPasswordFirstTime(); return true; }
  if(!DB.business.netlifySetupDone){ showNetlifySetupGate(); return true; }
  // Cuenta recién creada, todavía sin ningún negocio canjeado: lo que toca
  // es el selector de negocios vacío, con su botón de canjear — no el
  // asistente de configuración de un negocio que aún no existe.
  if(!ownerHasAnyBusiness()) return false;
  if(!getLicense()){ showActivationGate(); return true; }
  if(!getCloudConfig()){ showFirebaseSetupGate(); return true; }
  if(!DB.business.extConnPromptSeen){ showExternalConnectionsPrompt(); return true; }
  if(!DB.business.tourSeen){ promptAppTour(); return true; }
  return false;
}

// La contraseña de propietario, la primera vez, es la que vino con la
// licencia (la misma para todo el mundo que compró ese código) — por eso,
// justo tras activarla, se anima a cambiarla por una propia. Se pregunta
// solo una vez por dispositivo (aceptar o no queda guardado igual, para no
// insistir en cada sesión).
function promptChangeOwnerPasswordFirstTime(){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${t('access.changePasswordFirstTitle')}</h3>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('access.changePasswordFirstDesc')}</p>
    <div class="modal-footer">
      <button class="btn" onclick="localStorage.setItem('${OWNER_PASS_PROMPTED_LS}','1');closeModal();continuePendingOwnerSetup()">${t('common.later')}</button>
      <button class="btn btn-primary" onclick="localStorage.setItem('${OWNER_PASS_PROMPTED_LS}','1');closeModal();promptChangeOwnerPassword(true)">${t('access.changePassword')}</button>
    </div>
  `);
}

/* Cada negocio usa su PROPIO proyecto Firebase (gratuito, de Google),
   configurado desde Nube → "Configurar la nube". No existe una nube
   compartida: así el consumo y el coste de cada negocio son siempre suyos,
   sin límites compartidos ni sorpresas al crecer el número de clientes. */
function getCloudConfig(){
  const own = DB.business && DB.business.ownFirebase;
  if(own && own.apiKey && own.databaseURL) return own;
  return null;
}

/* Guarda (o quita) la configuración de Firebase propio del negocio,
   introducida en el asistente de la nube, y recarga la app para
   reconectar con la configuración correcta. */
async function saveOwnFirebaseConfig(){
  const apiKey = document.getElementById('own-fb-apikey').value.trim();
  const databaseURL = document.getElementById('own-fb-dburl').value.trim();
  if(!apiKey && !databaseURL){
    if(!DB.business.ownFirebase) return;
    if(!(await confirmModal(t('msg.confirmRemoveFirebase')))) return;
    delete DB.business.ownFirebase;
    // Se espera al guardado: recargar sin esperarlo cortaba la escritura y
    // la nube seguía puesta al volver, sin ningún aviso.
    await saveDB();
    location.reload();
    return;
  }
  if(!apiKey || !databaseURL){
    await alertModal(t('msg.fillBothFields'));
    return;
  }
  if(!/^https:\/\/[^\s]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(databaseURL)){
    await alertModal(t('msg.invalidDbUrl'));
    return;
  }
  DB.business.ownFirebase = { apiKey, databaseURL };
  await saveDB();
  await alertModal(t('msg.firebaseSaved'));
  location.reload();
}

/* Rellena claves que falten en los datos remotos (Firebase no guarda arrays/objetos vacíos) */
function withDefaults(def, data){
  if(data === undefined || data === null) return def;
  if(Array.isArray(def)) return Array.isArray(data) ? data : def;
  if(typeof def === 'object' && def !== null && typeof data === 'object' && !Array.isArray(data)){
    const out = {...data};
    Object.keys(def).forEach(k => { out[k] = withDefaults(def[k], data[k]); });
    return out;
  }
  return data;
}

function mergeArraysById(local, remote){
  if(!Array.isArray(local) || !Array.isArray(remote)) return remote;
  if(remote.length === 0) return local;
  if(local.length === 0) return remote;
  const hasIds = remote[0] && typeof remote[0] === 'object' && 'id' in remote[0];
  if(!hasIds) return remote;
  const remoteMap = new Map();
  remote.forEach(item => remoteMap.set(item.id, item));
  const merged = [];
  const seen = new Set();
  local.forEach(item => {
    if(item && item.id != null){
      seen.add(item.id);
      merged.push(remoteMap.has(item.id) ? remoteMap.get(item.id) : item);
    } else {
      merged.push(item);
    }
  });
  remote.forEach(item => {
    if(item && item.id != null && !seen.has(item.id)) merged.push(item);
  });
  return merged;
}

// DB.stock no es un array (es un mapa {ingredientId: {qty, min}}), así que
// no lo cubre mergeArraysById/MERGEABLE_ARRAYS: sin esto, dos dispositivos
// offline ajustando stock de DOS ingredientes distintos a la vez (uno
// descuenta por una venta, el otro repone por un pedido recibido) acababan
// con el que sincronizaba último pisando el mapa entero, perdiendo el
// ajuste del otro. Se fusiona campo a campo: se conserva el valor local
// para cada ingrediente que cambió aquí desde el último sync, y se toma el
// remoto para el resto — así ajustes en ingredientes distintos no se pisan.
function mergeStockField(localStock, remoteStock, lastSyncedStockJson){
  if(!localStock || typeof localStock !== 'object') return remoteStock;
  if(!remoteStock || typeof remoteStock !== 'object') return localStock;
  let lastSynced = {};
  if(lastSyncedStockJson){ try{ lastSynced = JSON.parse(lastSyncedStockJson) || {}; }catch(e){ lastSynced = {}; } }
  const merged = {};
  const allIds = new Set([...Object.keys(localStock), ...Object.keys(remoteStock)]);
  allIds.forEach(id => {
    const localJson = canonicalStringify(localStock[id]);
    const lastJson = canonicalStringify(lastSynced[id]);
    const localChanged = localStock[id] !== undefined && localJson !== lastJson;
    const valor = localChanged ? localStock[id] : remoteStock[id];
    // Si la nube ya no tiene esa entrada y aquí tampoco se ha tocado desde
    // la última sincronización, es que se borró de verdad: la clave se
    // QUITA, no se deja puesta valiendo undefined.
    //
    // Dejarla puesta era un desastre silencioso: quien luego recorriera el
    // mapa con Object.keys se encontraba una clave cuyo valor no existe y
    // reventaba al leer dentro. Pasaba en Distribución del Trabajo (al
    // borrar un empleado desde otro dispositivo, la pantalla entera dejaba
    // de dibujarse y los botones parecían muertos), y podía pasar igual en
    // turnos, mensajes fijados del chat y notas de traspaso, que usan esta
    // misma fusión.
    if(valor === undefined) return;
    merged[id] = valor;
  });
  return merged;
}

// Mismo problema que mergeStockField pero para objetos que llevan arrays
// CON id dentro (DB.ge.variables/capex/fijos/fijosLog/cierres, DB.limpieza.
// tareas/temperaturas/alergenos/plagas/mantenimiento): al no ser arrays de
// nivel superior, MERGEABLE_ARRAYS no los toca y el objeto entero se
// sustituye sin más — dos encargados dando de alta un gasto o una lectura
// de temperatura distintos, offline a la vez, podían perder uno de los dos.
function mergeNestedArraysByKey(localObj, remoteObj, arrayKeys){
  if(!localObj || typeof localObj !== 'object') return remoteObj;
  if(!remoteObj || typeof remoteObj !== 'object') return localObj;
  const merged = {...remoteObj};
  arrayKeys.forEach(k => {
    if(Array.isArray(localObj[k]) && Array.isArray(remoteObj[k])){
      merged[k] = mergeArraysById(localObj[k], remoteObj[k]);
    }
  });
  return merged;
}

const MERGEABLE_ARRAYS = new Set([
  'ingredients','recipes','fichas','menuItems','cartas','menus',
  'purchaseOrders','providers','tables','tpvOrders','sales',
  'cashClosures','employees','turnos','fichajes','promos',
  'cleaningTasks','clients','chatMessages','reservations',
  'ingredientCategories','recipeCategories','elaboraciones',
  'voidLog','discountLog','waitlist','vacationRequests','npsScores','bankReconciliations',
  // Arrays con id que se quedaban fuera: dos dispositivos que añaden cada uno
  // una entrada distinta (una anulación aquí, un check-in de ánimo allá, una
  // solicitud de cambio de turno acullá) casi a la vez y en ese hueco sin
  // sincronizar, sin esto uno de los dos arrays completos ganaba entero al
  // fusionar y la entrada del otro dispositivo desaparecía sin aviso.
  'auditLog','moodCheckins','turnoSwapRequests','trash'
]);

// Objetos de nivel superior que son mapas planos {clave: valor} sin id ni
// array dentro (mismo problema que DB.stock, fusionable con mergeStockField
// campo a campo) — ver el comentario junto a su uso en applyRemoteBlock.
const FLAT_MAP_FIELDS = new Set(['shifts', 'workDistribution', 'chatPinned', 'shiftHandoffNotes']);

// Hash simple para PINs (4 dígitos) — no almacenar en texto plano.
// La sal incluye el código de licencia del propio negocio (DB.license.code):
// antes era una constante fija igual para TODAS las instalaciones, lo que
// significa que una única tabla arcoíris de 10.000 hashes (el espacio
// completo de PINs de 4 dígitos) servía para descifrar el PIN de
// cualquier negocio con solo tener el JS del cliente (siempre igual) —
// confirmado con test real en la auditoría del 10/08/2026 (54ms para
// recuperar un PIN). Con la sal por negocio, cada tabla arcoíris solo
// sirve para el negocio para el que se calculó — sigue siendo un espacio
// pequeño (10.000 combinaciones) y por tanto rápido de romper SI se
// conoce el código de ese negocio en concreto, pero ya no hay una única
// tabla universal reutilizable contra cualquier cliente.
// Un solo golpe de FNV-1a de 32 bits (formato antiguo "H:") tarda
// microsegundos en calcularse, así que probar los 10.000 PIN de 4 dígitos
// posibles (o un diccionario de contraseñas del propietario) es cuestión de
// milisegundos si alguien consigue el código de licencia — una auditoría
// externa lo señaló como el hash siendo débil de verdad, no solo "mejorable".
// No podemos cambiar el algoritmo sin más: negocios reales ya tienen PIN y
// contraseñas guardadas en formato "H:", y perderían el acceso de golpe. En
// vez de eso, encarecemos el cálculo miles de veces (como hace PBKDF2:
// muchas rondas del mismo mezclado, no una) con un formato nuevo "H2:" para
// lo que se guarde a partir de ahora, y seguimos verificando "H:" para lo ya
// existente — así ningún PIN/contraseña ya guardado deja de funcionar.
const HASH_PIN_ROUNDS = 8000;
function hashPinRaw(pin, licenseCode){
  const salt = 'GG2024$p:' + (licenseCode !== undefined ? licenseCode : ((DB.license && DB.license.code) || ''));
  let h = 0x811c9dc5;
  const s = salt + pin + salt;
  for(let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
function hashPin(pin, licenseCode){
  let v = pin;
  for(let round = 0; round < HASH_PIN_ROUNDS; round++){
    v = hashPinRaw(v, licenseCode);
  }
  return 'H2:' + v;
}
// Compatibilidad: verifica tanto el formato nuevo (H2:, miles de rondas)
// como el antiguo (H:, una sola ronda) para no invalidar PIN/contraseñas
// que negocios reales ya tienen guardados. Se usa en todas las
// comparaciones; hashPin() en cambio solo se usa para GUARDAR uno nuevo,
// así que cualquier PIN que se cambie a partir de ahora migra solo al
// formato fuerte la próxima vez que se guarde.
function pinMatchesHash(pin, storedHash, licenseCode){
  if(!storedHash) return false;
  if(storedHash.startsWith('H2:')) return hashPin(pin, licenseCode) === storedHash;
  if(storedHash.startsWith('H:')) return 'H:' + hashPinRaw(pin, licenseCode) === storedHash;
  return pin === storedHash;
}

// Recuerda el último estado real de la nube (más allá de si el badge del
// header está pintado en pantalla ahora mismo) para que openCloudWizard()
// pueda avisar de un error de conexión real, en vez de dar por "conectado"
// cualquier negocio que simplemente tenga apiKey/databaseURL rellenados
// (que es lo único que comprueba getCloudConfig()).
let lastSyncBadgeState = null;
// Causa REAL del último fallo de sincronización. Antes solo quedaba en la
// consola del navegador (console.error), sitio al que un hostelero no entra
// nunca: veía "Error de nube" con el consejo genérico de revisar la clave de
// API, aunque el motivo casi siempre fuera otro — falta activar el acceso
// anónimo, el dominio no está autorizado, o no se pegaron las reglas. Se
// guarda el código de Firebase para poder decirle qué paso le falta.
let lastSyncErrorCode = null;
function recordSyncError(err){
  lastSyncErrorCode = (err && (err.code || err.message)) || 'desconocido';
  console.error('Error de sincronización', err);
  updateSyncBadge('error');
}
/* Traduce el código técnico de Firebase al paso concreto de la guía que
   falta. Devuelve null si no lo reconoce, y entonces se enseña el genérico. */
function syncErrorHintKey(){
  const code = String(lastSyncErrorCode || '');
  if(code.includes('operation-not-allowed')) return 'gate.cloudError.anon';
  if(code.includes('unauthorized-domain')) return 'gate.cloudError.domain';
  if(code.includes('api-key') || code.includes('invalid-api-key')) return 'gate.cloudError.apikey';
  if(code.includes('network-request-failed')) return 'gate.cloudError.network';
  if(code.toUpperCase().includes('PERMISSION_DENIED')) return 'gate.cloudError.rules';
  return null;
}
function updateSyncBadge(state){
  lastSyncBadgeState = state;
  const el = document.getElementById('sync-badge');
  if(!el) return;
  if(state === 'local'){ el.style.display = 'none'; return; }
  el.style.display = 'inline-block';
  // El texto va en un <span class="hdr-text"> para que, igual que el resto
  // de botones de la cabecera, se oculte solo en móvil (queda solo el
  // icono ☁) — antes era texto suelto con textContent y no se acortaba
  // nunca, así que era el elemento que más desbordaba la cabecera en
  // pantallas estrechas, obligando a hacer scroll horizontal para llegar a
  // los demás botones.
  if(state === 'online'){ el.innerHTML = `☁<span class="hdr-text"> ${t('gate.cloudConnectedShort')}</span>`; el.style.background = '#1F8A4C'; el.style.color = '#FFFFFF'; }
  // 'pending': antes el badge solo distinguía conectado/desconectado, no si
  // los cambios que se acaban de hacer YA llegaron de verdad a la nube o
  // siguen en camino — con esto queda un estado visible intermedio, en vez
  // de que "conectado" dé a entender (sin garantizarlo) que todo ya está
  // guardado.
  else if(state === 'pending'){ el.innerHTML = `☁<span class="hdr-text"> ${t('gate.cloudPending')}</span>`; el.style.background = '#2E6FBA'; el.style.color = '#FFFFFF'; }
  else if(state === 'offline'){ el.innerHTML = `☁<span class="hdr-text"> ${t('gate.offline')}</span>`; el.style.background = '#B8860B'; el.style.color = '#FFFFFF'; }
  else { el.innerHTML = `☁<span class="hdr-text"> ${t('gate.cloudError')}</span>`; el.style.background = '#C0392B'; el.style.color = '#FFFFFF'; }
}

function refreshAfterRemoteChange(){
  renderHeader();
  renderModuleBadges();
  const overlay = document.getElementById('modal-overlay');
  if(overlay && overlay.classList.contains('active')){
    // Caso especial: el modal de una comanda de mesa es sobre todo una
    // pantalla de ESTADO (qué está listo para recoger), no un formulario
    // que se esté rellenando — si cocina marca un plato listo desde otro
    // dispositivo mientras sala tiene la mesa abierta, antes no se enteraba
    // hasta cerrar y reabrir. Para el resto de modales (formularios en los
    // que sí se puede estar escribiendo) se sigue sin interrumpir.
    const marker = document.getElementById('table-order-modal-marker');
    if(marker && typeof renderTableOrderModal === 'function'){
      renderTableOrderModal(parseInt(marker.dataset.orderId));
    }
    return;
  }
  const active = document.querySelector('.view.active');
  if(active) renderView(active.id.replace('view-',''));
}

// Botón "Actualizar" de la cabecera: vuelve a leer los datos guardados
// (por si otro dispositivo los cambió) y refresca la pantalla actual.
async function manualRefresh(){
  DB = await loadDB();
  refreshAfterRemoteChange();
  const icon = document.getElementById('refresh-icon');
  if(icon){
    icon.classList.remove('spin');
    requestAnimationFrame(() => icon.classList.add('spin'));
  }
  showToast(t('msg.dataUpdated'));
}

/* Sube al espacio público (de solo lectura para los clientes) la
   información necesaria para la página de reservas/pedidos online:
   datos del negocio y las cartas. No incluye nada privado. */
// Resumen de plazas reservadas por fecha y turno (sin datos personales) para
// que la web pública pueda comprobar el aforo disponible.
function getReservasResumenForSync(){
  const resumen = {};
  const today = todayStr();
  DB.reservations.forEach(r => {
    // "Completada" (el cliente ya llegó y está sentado) sigue ocupando sitio
    // en el turno igual que "Confirmada" — si se excluyera aquí, la web
    // pública pensaría que hay más aforo libre del que hay de verdad justo
    // cuando el turno está más lleno, y podría dejar reservar por encima del
    // aforo real. Mismo criterio que getReservedPeopleForTurno (js/menu.js).
    if(r.status !== 'pendiente' && r.status !== 'confirmada' && r.status !== 'completada') return;
    if(!r.date || r.date < today) return;
    const turnoIdx = getTurnoIndexForTime(r.date, r.time);
    if(turnoIdx === null) return;
    if(!resumen[r.date]) resumen[r.date] = {};
    resumen[r.date][turnoIdx] = (resumen[r.date][turnoIdx]||0) + (r.people||0);
  });
  return resumen;
}

// Igual que getReservasResumenForSync pero por mesa concreta en vez de por
// total de personas del turno: la web pública lo usa para saber qué mesas
// ya están ocupadas en cada turno y así poder emparejar el grupo que quiere
// reservar con una mesa real (con su capacidad) en vez de solo un contador
// de aforo. Sin datos del cliente — solo qué mesa y qué turno, nunca quién.
// Por mesa concreta y por franja de 30 min (no por turno completo): la web
// pública lo usa para saber en qué momento exacto está libre cada mesa, y
// así poder volver a ofrecerla en cuanto pase la duración de ocupación
// configurada (reservaDuracionMin), sin esperar a que acabe todo el turno.
// Mismo cálculo de franjas que slotsForReservation() en reservagastrogoan.html
// (archivo aparte, sin acceso a este código, así que lleva su propia copia).
function getMesasOcupadasForSync(){
  const ocupadas = {};
  const today = todayStr();
  const duracionMin = parseInt((DB.business||{}).reservaDuracionMin) || 90;
  DB.reservations.forEach(r => {
    if(r.status !== 'pendiente' && r.status !== 'confirmada' && r.status !== 'completada') return;
    if(!r.date || r.date < today || r.tableId == null || !r.time) return;
    const [h, m] = r.time.split(':').map(Number);
    if(isNaN(h) || isNaN(m)) return;
    if(!ocupadas[r.date]) ocupadas[r.date] = {};
    if(!ocupadas[r.date][r.tableId]) ocupadas[r.date][r.tableId] = {};
    let cur = h * 60 + m;
    const end = cur + duracionMin;
    while(cur < end){
      const slot = String(Math.floor(cur / 60)).padStart(2, '0') + ':' + String(cur % 60).padStart(2, '0');
      ocupadas[r.date][r.tableId][slot] = true;
      cur += 30;
    }
  });
  return ocupadas;
}

// Igual que getReservasResumenForSync pero para pedidos para llevar/domicilio:
// cuenta cuántos pedidos activos hay en cada franja de 30 min, para que la
// web pública pueda avisar/bloquear si el negocio ha puesto un límite de
// pedidos simultáneos por franja (mn-maxporfranja) y así no se acumulen más
// pedidos de los que la cocina puede asumir en una hora punta.
function roundToPedidoSlot(time){
  const parts = (time||'').split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return String(h).padStart(2,'0') + ':' + (m < 30 ? '00' : '30');
}
function getPedidosResumenForSync(){
  const resumen = {};
  const today = todayStr();
  DB.tpvOrders.forEach(o => {
    if(o.tipo !== 'takeaway' && o.tipo !== 'delivery') return;
    if(o.status !== 'pendiente-online' && o.status !== 'abierta') return;
    if(!o.date || o.date < today || !o.time) return;
    const slot = roundToPedidoSlot(o.time);
    if(!resumen[o.date]) resumen[o.date] = {};
    resumen[o.date][slot] = (resumen[o.date][slot]||0) + 1;
  });
  return resumen;
}

// Cuántos pedidos hay ahora mismo en cocina sin terminar de preparar
// (aceptados, con alguna línea todavía sin marcar "entregado" desde el
// punto de vista de cocina) — se usa para dar al cliente de la web pública
// una estimación de cuánto puede tardar su pedido según la carga real de
// ese momento, no un tiempo fijo que no refleje si hay mucho lío o no.
function getActiveKitchenOrdersCount(){
  return DB.tpvOrders.filter(o =>
    o.status === 'abierta' &&
    (o.tipo === 'takeaway' || o.tipo === 'delivery' || o.tipo === 'mesa') &&
    (o.items||[]).some(l => !l.bebida && l.estado !== 'entregado')
  ).length;
}

/* Inicializa (una sola vez) una segunda instancia de Firebase apuntando
   al proyecto compartido de la plataforma, y se autentica de forma anónima
   en ella (sus reglas también exigen auth != null). Devuelve una promesa
   que resuelve con esa instancia ya autenticada, o null si Firebase no
   está disponible. */
function getPlatformFirebaseApp(){
  if(typeof firebase === 'undefined') return Promise.resolve(null);
  try{
    let app;
    try{
      app = firebase.app('platform');
    }catch(e){
      app = firebase.initializeApp(PLATFORM_FIREBASE_CONFIG, 'platform');
    }
    if(!app) return Promise.resolve(null);
    if(!platformAuthPromise){
      platformAuthPromise = app.auth().currentUser
        ? Promise.resolve(app)
        : app.auth().signInAnonymously().then(()=>app).catch(err => { console.error('Error de autenticación con la plataforma', err); platformAuthPromise = null; return null; });
    }
    return platformAuthPromise;
  }catch(e){
    console.error('Error iniciando la plataforma', e);
    return Promise.resolve(null);
  }
}

/* Escucha las reservas/pedidos que el cliente envía desde la página pública
   (reservagastrogoan.html). Esa página siempre escribe en el proyecto
   COMPARTIDO de la plataforma (no en el Firebase propio del negocio), así
   que esta escucha se conecta ahí independientemente de si el negocio tiene
   configurada su propia nube. */
// Pitido corto y discreto (generado con la Web Audio API, sin ficheros de
// audio) para avisar de que ha llegado una reserva o pedido online nuevo,
// independientemente de la vista que el personal tenga abierta en ese momento.
function playNewRequestAlert(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => ctx.close();
  }catch(e){ /* audio no disponible en este navegador/pestaña: no bloquea nada */ }
}

// Cuenta de reservas/pedidos públicos aún no vistos por el personal, para el
// badge en los iconos de módulo de Reservas y TPV. "Visto" se recuerda por
// fecha (DB.business.lastSeenReservasTs / lastSeenTpvTs), actualizada al abrir
// cada vista correspondiente.
function getUnseenReservasCount(){
  const since = (DB.business && DB.business.lastSeenReservasTs) || '';
  return DB.reservations.filter(r => r.origen === 'publico' && r.status === 'pendiente' && (r.createdAt || '') > since).length;
}
function getUnseenTpvRequestsCount(){
  const since = (DB.business && DB.business.lastSeenTpvTs) || '';
  // Debe usar el mismo filtro que renderTpvPendingOnline (isTogoOrderVisibleNow):
  // si no, el badge puede anunciar "1 nuevo" sin que aparezca ninguna tarjeta
  // que aceptar/rechazar (pedidos programados con muchas horas de antelación).
  return DB.tpvOrders.filter(o => o.status === 'pendiente-online' && (o.createdAt || '') > since && isTogoOrderVisibleNow(o)).length;
}
function markReservasSeen(){
  if(!DB.business || !getUnseenReservasCount()) return;
  DB.business.lastSeenReservasTs = new Date().toISOString();
  saveDB();
  renderModuleBadges();
}
function markTpvSeen(){
  if(!DB.business || !getUnseenTpvRequestsCount()) return;
  DB.business.lastSeenTpvTs = new Date().toISOString();
  saveDB();
  renderModuleBadges();
}
// Pinta (o quita) el circulito rojo con el número de solicitudes nuevas sobre
// las tarjetas de módulo "Reservas" y "TPV", estén o no visibles ahora mismo.
function renderModuleBadges(){
  const counts = {reservas: getUnseenReservasCount(), tpv: getUnseenTpvRequestsCount()};
  Object.entries(counts).forEach(([id, count]) => {
    document.querySelectorAll(`.module-card[onclick="navigate('${id}')"]`).forEach(card => {
      let badge = card.querySelector('.module-new-badge');
      if(count > 0){
        if(!badge){
          badge = document.createElement('span');
          badge.className = 'module-new-badge';
          badge.style.cssText = 'position:absolute;top:8px;right:8px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--red,#e5484d);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 2px var(--surface,#fff)';
          card.style.position = card.style.position || 'relative';
          card.appendChild(badge);
        }
        badge.textContent = count > 99 ? '99+' : String(count);
      } else if(badge){
        badge.remove();
      }
    });
  });
}

let publicRequestsListenerAttached = false;
function initPublicRequestsListener(){
  if(publicRequestsListenerAttached) return;
  if(typeof firebase === 'undefined') return;
  if(!getLicense()) return;
  const publicId = getPublicId();
  if(!publicId) return;
  getPlatformFirebaseApp().then(app => {
    if(!app || publicRequestsListenerAttached) return;
    publicRequestsListenerAttached = true;
    app.database().ref('gastrogoan/public/' + publicId + '/requests').on('child_added', snap => {
      const req = snap.val();
      const reqRef = snap.ref;
      if(!req || !req.type){ reqRef.remove(); return; }
      // Reclamación atómica: si el negocio tiene más de un dispositivo con
      // la app abierta a la vez (dos TPV, tablet de cocina + caja...),
      // TODOS reciben este mismo evento child_added de forma independiente.
      // Sin este candado, cada uno crearía su propio pedido/reserva con id
      // distinto — duplicado en cocina, stock descontado dos veces,
      // repartidor asignado dos veces. Mismo patrón que reserveAforoAtomic/
      // reserveTableAtomic: una transacción sobre un hijo de la propia
      // request (_claimedAt, permiso añadido aparte en las reglas de
      // Firebase) para que solo el primer dispositivo en procesarla gane —
      // los demás no hacen nada con ese evento, y es el ganador quien borra
      // la request al terminar.
      reqRef.child('_claimedAt').transaction(current => current === null ? Date.now() : undefined).then(claimResult => {
      if(!claimResult.committed) return; // otro dispositivo ya se está encargando de esta solicitud
      let notifyNewRequest = false;
      if(req.type === 'reserva'){
        // Igual que ya se hacía con los pedidos para llevar/delivery
        // creados desde el TPV: si el teléfono coincide con un cliente ya
        // dado de alta, la reserva queda vinculada a su ficha desde el
        // primer momento — antes esto NO pasaba con las reservas online (el
        // canal con más volumen), así que ni el aviso de alergias al sentar
        // la mesa ni los puntos de fidelidad se disparaban para un cliente
        // recurrente que reservaba por la web en vez de llamar o venir en persona.
        const matchedClient = req.clientPhone ? findClientByPhone(req.clientPhone) : null;
        // La web pública ya emparejó y reservó una mesa concreta de forma
        // atómica (reserveTableAtomic) antes de mandar la solicitud — aquí
        // solo se revalida que siga libre (p.ej. por si alguien la ocupó
        // desde el TPV mientras tanto), no se vuelve a elegir. Si por lo que
        // sea no trae mesa (negocio sin ninguna mesa configurada todavía,
        // caso en el que la web no puede comprobar nada), se cae al mismo
        // reparto automático de siempre — que con cero mesas nunca encuentra
        // ninguna, así que queda 'pendiente' para que el personal la revise.
        const RESERVATION_TABLE_MARGIN = 1;
        let confirmedTableId = null;
        if(req.tableId != null){
          const stillFree = (getAvailableTablesForReservation(req.date, req.time, null, req.people || 1) || [])
            .some(tb => tb.id === req.tableId);
          if(stillFree) confirmedTableId = req.tableId;
        } else {
          const autoTable = (getAvailableTablesForReservation(req.date, req.time, null, req.people || 1) || [])
            .filter(tb => (tb.plazas || 0) + RESERVATION_TABLE_MARGIN >= (req.people || 1))
            .sort((a, b) => (a.plazas || 0) - (b.plazas || 0))[0] || null;
          confirmedTableId = autoTable ? autoTable.id : null;
        }
        // El aforo del turno ya se comprobó de forma atómica al enviar la
        // solicitud (reserveAforoAtomic, en la web pública) — aquí se
        // revalida por si acaso, igual que con la mesa (p.ej. otra reserva
        // aceptada a mano por el personal mientras tanto).
        if(confirmedTableId != null){
          const turnoIdx = getTurnoIndexForTime(req.date, req.time);
          const aforo = parseInt(DB.business.aforo) || 0;
          if(turnoIdx !== null && aforo){
            const yaReservado = getReservedPeopleForTurno(req.date, turnoIdx, null);
            if(yaReservado + (req.people || 0) > aforo) confirmedTableId = null;
          }
        }
        const newReservation = {
          id: genId(), clientId: matchedClient ? matchedClient.id : null,
          clientName: req.clientName || '', clientPhone: req.clientPhone || '', clientEmail: req.clientEmail || '',
          date: req.date, time: req.time, people: req.people || 1,
          // Si la reserva exige señal, NO se autoconfirma solo por tener mesa asignada:
          // se queda "pendiente" hasta que llegue el evento pago_confirmado real del
          // banco (más abajo en esta función). Si no, un cliente que abandona el pago
          // a mitad se quedaría con la mesa/aforo bloqueados como si hubiera pagado.
          tableId: confirmedTableId, notes: req.notes || '', status: (confirmedTableId && !req.depositRequired) ? 'confirmada' : 'pendiente',
          referral: req.referral || '',
          depositRequired: req.depositRequired || false, depositAmount: req.depositAmount || '', depositConfirmed: false,
          origen: 'publico', createdAt: new Date().toISOString(),
          // El teléfono llega tal cual lo escribió el cliente en la web pública,
          // sin pasar por la misma validación que saveClient (que sí bloquea con
          // confirmación un teléfono con menos de 9 dígitos): se marca aquí para
          // que el personal lo vea al gestionar la solicitud, no se descubre a ciegas.
          phoneOdd: !!(req.clientPhone && req.clientPhone.replace(/[^\d]/g,'').length < 9),
          // Token que la propia web pública generó al enviar la reserva —
          // permite que el cliente vuelva más tarde a consultarla/cancelarla
          // sin tener que llamar por teléfono (ver syncReservationStatusForPublic
          // y el tipo 'reserva_cancelar' más abajo en esta misma función).
          publicToken: req.resToken || null
        };
        DB.reservations.push(newReservation);
        if(newReservation.publicToken) syncReservationStatusForPublic(newReservation);
        if(confirmedTableId && typeof sendReservationConfirmationEmail === 'function'){
          const confirmedTable = DB.tables.find(t => t.id === confirmedTableId);
          sendReservationConfirmationEmail({...newReservation, tableName: confirmedTable ? confirmedTable.name : ''}).catch(()=>{});
        }
        notifyNewRequest = true;
      }else if(req.type === 'reserva_cancelar'){
        // Cancelación pedida por el propio cliente desde "Gestionar mi
        // reserva" en la web pública — se busca por el token, NUNCA por id
        // directo (el cliente no conoce ni debería poder usar el id interno),
        // y solo se cancela si de verdad sigue activa (evita reabrir/duplicar
        // efectos si el mismo request llegara dos veces).
        const target = (DB.reservations||[]).find(r => r.publicToken && r.publicToken === req.token);
        // 'completada' (el cliente ya llegó y está sentado) tampoco se debe
        // poder cancelar desde aquí — antes solo se excluía 'cancelada'.
        if(target && target.status !== 'cancelada' && target.status !== 'completada'){
          target.status = 'cancelada';
          if(typeof sendReservationCancellationEmail === 'function') sendReservationCancellationEmail(target).catch(()=>{});
          syncReservationStatusForPublic(target);
          logAudit('edit', t('audit.reservationCancelledByClient').replace('${name}', target.clientName||'?'));
        }
      }else if(req.type === 'reserva_modificar'){
        // Cambio de fecha/hora/personas pedido por el propio cliente desde
        // "Gestionar mi reserva". Igual que con la cancelación, se busca por
        // token, nunca por id. La comprobación de mesa y aforo se hace aquí
        // (nunca en el navegador del cliente) reutilizando el mismo motor que
        // usa el personal al editar una reserva a mano, con excludeId puesto
        // a la propia reserva para no chocar contra sí misma. Si no encaja
        // en ningún hueco, no se rechaza sin más: queda 'pendiente' para que
        // el personal la revise a mano, igual que una reserva nueva sin mesa.
        const target = (DB.reservations||[]).find(r => r.publicToken && r.publicToken === req.token);
        if(target && target.status !== 'cancelada' && target.status !== 'completada'){
          const RESERVATION_TABLE_MARGIN = 1;
          const newDate = req.date || target.date, newTime = req.time || target.time, newPeople = req.people || target.people || 1;
          const available = getAvailableTablesForReservation(newDate, newTime, target.id, newPeople) || [];
          let matchedTableId = available.some(tb => tb.id === target.tableId) ? target.tableId : null;
          if(matchedTableId == null){
            const autoTable = available
              .filter(tb => (tb.plazas || 0) + RESERVATION_TABLE_MARGIN >= newPeople)
              .sort((a, b) => (a.plazas || 0) - (b.plazas || 0))[0] || null;
            matchedTableId = autoTable ? autoTable.id : null;
          }
          if(matchedTableId != null){
            const turnoIdx = getTurnoIndexForTime(newDate, newTime);
            const aforo = parseInt(DB.business.aforo) || 0;
            if(turnoIdx !== null && aforo){
              const yaReservado = getReservedPeopleForTurno(newDate, turnoIdx, target.id);
              if(yaReservado + newPeople > aforo) matchedTableId = null;
            }
          }
          target.date = newDate; target.time = newTime; target.people = newPeople;
          target.tableId = matchedTableId;
          // Igual que al crear la reserva nueva (más arriba en esta misma
          // función): si exige señal y todavía no se ha pagado, NUNCA se
          // autoconfirma solo por tener mesa/aforo disponible — si no, un
          // cliente que no llegó a pagar podía "confirmar" su reserva sin
          // más que tocar Modificar y cambiar la hora un minuto.
          target.status = (matchedTableId != null && !(target.depositRequired && !target.depositConfirmed)) ? 'confirmada' : 'pendiente';
          syncReservationStatusForPublic(target);
          logAudit('edit', t('audit.reservationModifiedByClient').replace('${name}', target.clientName||'?'));
        }
      }else if(req.type === 'nps_response'){
        // req llega de la web pública, sin autenticar de verdad más allá de
        // lo que exige la regla de Firebase (solo type/createdAt) — nada
        // impide que alguien mande un score que no sea un número 0-10 desde
        // la consola del navegador. Sin esta validación, un score con texto
        // (incluido HTML) se guardaba tal cual y se pintaba SIN escapeHtml
        // en el resumen de NPS del panel del negocio (renderNpsSummaryHtml,
        // js/app.js) — XSS real contra el propio dueño.
        const scoreNum = parseFloat(req.score);
        if(Number.isFinite(scoreNum) && scoreNum >= 0 && scoreNum <= 10){
          if(!DB.npsScores) DB.npsScores = [];
          DB.npsScores.push({id: genId(), score: Math.round(scoreNum*10)/10, comment: String(req.comment || '').slice(0, 2000), createdAt: new Date().toISOString()});
        }
      }else if(req.type === 'pedido' && req.tipo === 'mesa'){
        // Auto-pedido desde la mesa: se añade directamente a la comanda de esa
        // mesa (si ya está abierta) o se abre una comanda nueva, sin pasar por
        // la bandeja de "pedidos pendientes".
        // Si se pagó ya con tarjeta desde el móvil (req.pagarAhora, ver
        // payWithCard en reservagastrogoan.html), las líneas se marcan como
        // pagadas por ese cliente concreto — siguen yendo a la MISMA comanda
        // de la mesa (cocina las ve igual, el camarero las marcha igual),
        // pero al cobrar la mesa (finalizeCharge, js/tpv.js) se descuentan
        // del importe pendiente, para que cada comensal solo pague lo suyo
        // sin que el negocio tenga que llevar la cuenta a mano de quién ya
        // pagó qué. La confirmación real del banco llega después por
        // separado (evento pago_confirmado, más abajo en esta función).
        // pagoOnlinePendiente (no pagadoOnline todavía): la firma del pago con
        // el Worker ya tuvo éxito antes de llegar aquí (si no, payWithCard ni
        // habría mandado esta solicitud), pero el banco confirma el cargo de
        // forma asíncrona y aparte (evento pago_confirmado, más abajo). Hasta
        // que llegue esa confirmación, la línea NO cuenta como pagada de cara
        // al cobro de la mesa — así, si el pago fallara o nunca se
        // confirmara, no se le regala la comida a nadie por accidente.
        const items = (req.items || []).map(l => {
          const mods = Array.isArray(l.modificadores) ? l.modificadores.filter(m => m && m.nombre).map(m => ({nombre: m.nombre, precio: m.precio||0})) : [];
          const name = mods.length ? `${l.name} (${mods.map(m=>m.nombre).join(', ')})` : l.name;
          return {
            platoId: null, recipeId: null, name, price: l.price, qty: l.qty, tanda: '', notas: '', nuevo: true, modificadores: mods,
            pagoOnlinePendiente: !!req.pagarAhora, pagadorNombre: req.pagarAhora ? (req.clienteNombre||'') : undefined, pagoRef: req.pagarAhora ? req.clientRef : undefined
          };
        });
        const table = DB.tables.find(t => t.id === req.tableId);
        let order = table ? DB.tpvOrders.find(o => o.tableId === table.id && o.status === 'abierta') : null;
        if(order){
          items.forEach(it => order.items.push(it));
          // Varios autopedidos seguidos desde la misma mesa: la propina de
          // cada uno se suma, igual que ya se hace al unir dos comandas
          // (js/tpv.js, unión de mesas) — no se sustituye, para no perder
          // la propina de un pedido anterior si llega otro después. La
          // propina de un pedido YA pagado va aparte (propinaPagadaOnline):
          // si se sumara a order.propina, se le volvería a cobrar al resto
          // de la mesa al cerrar cuenta.
          if(typeof req.propina === 'number' && req.propina > 0){
            if(req.pagarAhora) order.propinaPagadaOnline = (order.propinaPagadaOnline||0) + req.propina;
            else order.propina = (order.propina||0) + req.propina;
          }
        }else{
          const matchedClientMesa = req.clienteTelefono ? findClientByPhone(req.clienteTelefono) : null;
          DB.tpvOrders.push({
            id: genId(), tableId: req.tableId || null, tipo:'mesa', pax: req.pax || 1,
            clienteNombre: req.clienteNombre || '', status:'abierta', items, tandas:[], createdAt: new Date().toISOString(),
            clientRef: req.clientRef || null, clientId: matchedClientMesa ? matchedClientMesa.id : null,
            propina: (!req.pagarAhora && typeof req.propina === 'number') ? req.propina : 0,
            propinaPagadaOnline: (req.pagarAhora && typeof req.propina === 'number') ? req.propina : 0
          });
        }
      }else if(req.type === 'pedido'){
        // Los extras elegidos en la web (req.items[].modificadores, {nombre,
        // precio} igual que ya guarda confirmAddOrderItem en el TPV) se
        // incorporan al nombre de la línea entre paréntesis — mismo patrón
        // que ya usa el TPV para que cocina los vea sin tener que abrir nada
        // más, y se guardan también aparte por si algún día hace falta la
        // lista estructurada.
        const onlineItems = (req.items || []).map(l => {
          const mods = Array.isArray(l.modificadores) ? l.modificadores.filter(m => m && m.nombre).map(m => ({nombre: m.nombre, precio: m.precio||0})) : [];
          const baseName = l.name||l.nombre||'';
          const name = mods.length ? `${baseName} (${mods.map(m=>m.nombre).join(', ')})` : baseName;
          return {platoId: l.platoId||null, recipeId: l.recipeId||null, name, price: l.price||l.precio||0, qty: l.qty||1, tanda: l.tanda||'', notas: l.notas||'', modificadores: mods};
        });
        const newOrderId = genId();
        const matchedClientPedido = req.clienteTelefono ? findClientByPhone(req.clienteTelefono) : null;
        DB.tpvOrders.push({
          id: newOrderId, tableId: null, tipo: req.tipo === 'delivery' ? 'delivery' : 'takeaway',
          clienteNombre: req.clienteNombre || '', clienteTelefono: req.clienteTelefono || '', clienteEmail: req.clienteEmail || '',
          clienteDireccion: req.clienteDireccion || '', clienteCodigoPostal: req.codigoPostal || '',
          notas: req.notas || '',
          date: req.date || '', time: req.time || '',
          costeEnvio: req.costeEnvio || 0, propina: typeof req.propina === 'number' ? req.propina : 0,
          status: 'pendiente-online', items: onlineItems, tandas: [], createdAt: new Date().toISOString(),
          clientRef: req.clientRef || null, clientId: matchedClientPedido ? matchedClientPedido.id : null,
          pendienteVerificarZona: !!req.pendienteVerificarZona,
          phoneOdd: !!(req.clienteTelefono && req.clienteTelefono.replace(/[^\d]/g,'').length < 9),
          // El cliente ya indicó en la web pública con qué billete va a pagar
          // (o si va a pagar con tarjeta en persona) — así el reparto ya
          // sabe cuánto cambio llevar sin tener que preguntarlo aparte.
          metodoPagoLocal: req.metodoPagoLocal || null,
          pagaCon: typeof req.pagaCon === 'number' ? req.pagaCon : null
        });
        // Un pedido pagado con tarjeta (TPV virtual/Redsys) llega sin
        // metodoPagoLocal (ese campo solo se rellena para efectivo/tarjeta
        // EN PERSONA — ver submitOrder en reservagastrogoan.html). La firma
        // del Worker ya tuvo éxito antes de llegar aquí, pero el banco
        // confirma el cargo de forma asíncrona y aparte (evento
        // pago_confirmado, más abajo en esta función) — hasta que llegue,
        // NO se acepta solo aunque el interruptor esté en ON: si no, un
        // cliente que abandona el pago a mitad de camino se comería stock
        // real, entraría en cocina y hasta se le asignaría repartidor sin
        // que el negocio supiera que no ha cobrado nada (mismo riesgo que
        // ya se corrigió para la señal de reservas y el autopedido de mesa).
        const pagoTarjetaPendiente = !req.metodoPagoLocal;
        if(pagoTarjetaPendiente){
          const newOrder = DB.tpvOrders.find(o => o.id === newOrderId);
          if(newOrder) newOrder.pagado = false;
        } else if(DB.business.pedidosOnlineActivos !== false && !req.pendienteVerificarZona && typeof acceptOnlineOrder === 'function'){
          // Con el interruptor de "Pedidos online" en ON (por defecto), el
          // pedido se acepta solo, sin pasar por la bandeja de pendientes —
          // salvo que necesite verificación manual de zona de reparto, en
          // cuyo caso siempre se deja pendiente pase lo que pase el interruptor.
          acceptOnlineOrder(newOrderId, true);
        }
        notifyNewRequest = true;
      }else if(req.type === 'pago_confirmado'){
        // Confirmación de pago con tarjeta (TPV virtual / Redsys), recibida
        // automáticamente a través del Worker. `orderRef` puede ser el
        // clientRef de un pedido, el resToken de la señal de una reserva, o
        // el pagoRef de una o varias líneas de un autopedido de mesa pagado
        // aparte (payWithCard usa uno distinto según lo que se esté
        // pagando) — se comprueban los tres, nunca coinciden entre sí.
        let pagoConfirmadoMatched = false;
        const order = DB.tpvOrders.find(o => o.clientRef && o.clientRef === req.orderRef);
        if(order){
          pagoConfirmadoMatched = true;
          order.pagado = true;
          order.pagoImporte = req.amount;
          order.pagoFecha = req.createdAt;
          // Si es un pedido de delivery/takeaway que se dejó pendiente
          // precisamente por esperar esta confirmación (ver rama 'pedido'
          // más arriba), ahora sí se acepta solo si el interruptor de
          // pedidos online sigue en ON y no hace falta verificar zona.
          if(order.status === 'pendiente-online' && DB.business.pedidosOnlineActivos !== false && !order.pendienteVerificarZona && typeof acceptOnlineOrder === 'function'){
            acceptOnlineOrder(order.id, true);
          }
        }
        const reservationPaid = (DB.reservations||[]).find(r => r.publicToken && r.publicToken === req.orderRef);
        if(reservationPaid){
          pagoConfirmadoMatched = true;
          reservationPaid.depositConfirmed = true;
          reservationPaid.depositPagoImporte = req.amount;
          reservationPaid.depositPagoFecha = req.createdAt;
          // Pendiente de descontar cuando se abra la mesa de esta reserva
          // (ver confirmOpenTableOrder, js/tpv.js) — así el cliente no paga
          // la señal dos veces. No se registra como venta aparte aquí: no
          // se sabe todavía qué va a pedir ni con qué IVA, así que crear ya
          // una "venta" con datos inventados podría descuadrar el desglose
          // fiscal frente a la cuenta real de la mesa. El dinero cobrado
          // hoy se ve igualmente en Gestión Económica → Ventas, aparte de
          // la facturación oficial (ver ventasDepositosDelDia, js/hr.js).
          reservationPaid.depositSalePending = req.amount;
          // Ahora sí que el pago está confirmado por el banco: si se había quedado
          // "pendiente" solo por exigir señal (ya tenía mesa asignada), se confirma.
          if(reservationPaid.status === 'pendiente' && reservationPaid.tableId) reservationPaid.status = 'confirmada';
          syncReservationStatusForPublic(reservationPaid);
          logAudit('edit', t('audit.depositConfirmed').replace('${name}', reservationPaid.clientName||'?'));
        }
        // Líneas de mesa pagadas por móvil (ver más arriba, rama 'pedido'
        // tipo 'mesa'): pueden estar mezcladas con líneas normales dentro de
        // la misma comanda, así que hay que recorrer TODAS las comandas
        // abiertas buscando líneas con este pagoRef concreto, no solo una.
        (DB.tpvOrders||[]).forEach(o => {
          (o.items||[]).forEach(l => {
            if(l.pagoRef && l.pagoRef === req.orderRef && l.pagoOnlinePendiente){
              pagoConfirmadoMatched = true;
              l.pagoOnlinePendiente = false;
              l.pagadoOnline = true;
            }
          });
        });
        // Ninguno de los tres casos de arriba encontró a qué aplicar este
        // pago: lo más probable es que el pedido se rechazara/cancelara (y
        // se moviera a la papelera) ANTES de que llegara esta confirmación
        // del banco, que es asíncrona y va por su cuenta. Sin este registro,
        // el dinero que el cliente sí pagó no dejaría ningún rastro: ni
        // venta, ni aviso, nada — se queda aquí, visible, para que el
        // negocio pueda localizar y gestionar el reembolso a mano.
        if(!pagoConfirmadoMatched){
          if(!DB.unmatchedOnlinePayments) DB.unmatchedOnlinePayments = [];
          DB.unmatchedOnlinePayments.push({id: genId(), orderRef: req.orderRef, amount: req.amount||0, createdAt: req.createdAt||new Date().toISOString(), detectedAt: new Date().toISOString()});
          if(typeof notifyDesktop === 'function') notifyDesktop(t('notif.unmatchedPaymentTitle'), t('notif.unmatchedPaymentBody').replace('${amount}', fmtMoney(req.amount||0)));
        }
      }
      saveDB();
      refreshAfterRemoteChange();
      if(notifyNewRequest) playNewRequestAlert();
      reqRef.remove();
      }).catch(e => console.error('Error reclamando solicitud pública', e));
    }, err => console.error('Error escuchando pedidos públicos', err));
  }).catch(e => console.error('Error escuchando pedidos públicos', e));
}

function buildSucursalesList(){
  const slots = getBusinessSlots();
  const thisSlot = slots.find(s => s.id === ACTIVE_SLOT);
  if(!thisSlot) return null;
  const parentId = thisSlot.parentId || ACTIVE_SLOT;
  const siblings = slots.filter(s => s.id === parentId || s.parentId === parentId);
  if(siblings.length <= 1) return null;
  const list = [];
  for(const s of siblings){
    try{
      const raw = localStorage.getItem(slotLicenseKey(s.id));
      if(!raw) continue;
      const lic = JSON.parse(raw);
      if(!isStoredLicenseValid(lic)) continue;
      // El sorteado se guarda junto a la licencia (recordarPublicIdEnLicencia).
      // El derivado solo queda para los negocios de antes del cambio.
      const pid = lic.publicId || publicIdDerivadoAntiguo(lic.tenantId);
      list.push({name: s.name, publicId: pid});
    }catch(e){}
  }
  return list.length > 1 ? list : null;
}

// Resume el estado de un pedido para enseñárselo al cliente en la web
// pública (pantalla de seguimiento) — un resumen sencillo de 5 estados a
// partir de campos que ya existen (order.status, estado por línea,
// order.cerrada, entregaEstado), sin añadir ningún estado nuevo a
// DB.tpvOrders: "pendiente" (aún sin aceptar) → "aceptado" (aceptado pero
// nada marchado todavía, caso raro pero posible) → "preparando" (algo en
// cocina/preparando) → "listo" (todo entregado por cocina, falta
// recoger/repartir) → "entregado" (cobrado o marcado como entregado en
// reparto). "rechazado" se pasa aparte, explícitamente, porque en ese
// momento el pedido ya se ha borrado de DB.tpvOrders.
function computePublicOrderStatus(order){
  if(order.status === 'pendiente-online') return 'pendiente';
  if(order.status === 'pagada' || order.entregaEstado === 'entregado') return 'entregado';
  const food = (order.items||[]).filter(l => !l.bebida && !l.isShipping);
  if(food.length && food.every(l => l.estado === 'entregado')) return 'listo';
  if(food.some(l => l.estado === 'preparando' || l.estado === 'cocina')) return 'preparando';
  return 'aceptado';
}
// Publica el estado de UN pedido concreto (identificado por su clientRef,
// el token que la web pública generó al enviarlo) bajo su propia ruta,
// separada del resto del espejo público — así el cliente puede consultarlo
// sin tener que descargarse todo el negocio, y sin que el token identifique
// nada más que ese pedido (no lleva teléfono/dirección/nombre).
function syncOrderStatusForPublic(order, forcedStatus){
  if(!order || !order.clientRef) return;
  if(typeof firebase === 'undefined') return;
  const publicId = getPublicId();
  if(!publicId) return;
  const status = forcedStatus || computePublicOrderStatus(order);
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/public/' + publicId + '/orderStatus/' + order.clientRef).set({
      status, updatedAt: new Date().toISOString()
    }).catch(()=>{});
  }).catch(()=>{});
}

// Publica el estado de UNA reserva concreta (identificada por su
// publicToken) para que el cliente pueda consultarla/cancelarla desde
// "Gestionar mi reserva" en la web pública — mismo patrón exacto que
// syncOrderStatusForPublic, en su propia ruta separada (reservationStatus,
// no orderStatus) para no mezclar los dos seguimientos. Se publican solo
// los datos que hacen falta para esa pantalla, no la reserva entera (nunca
// el teléfono/email/notas de otra reserva, ni el id interno).
function syncReservationStatusForPublic(reservation){
  if(!reservation || !reservation.publicToken) return;
  if(typeof firebase === 'undefined') return;
  const publicId = getPublicId();
  if(!publicId) return;
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/public/' + publicId + '/reservationStatus/' + reservation.publicToken).set({
      status: reservation.status, date: reservation.date, time: reservation.time, people: reservation.people,
      updatedAt: new Date().toISOString()
    }).catch(()=>{});
  }).catch(()=>{});
}

// Alérgenos por plato para la carta pública: {platoId: ['Gluten', ...]},
// derivados en vivo de la receta vinculada (recipeId) con
// recipeComputedAllergens — igual que ya hace la Ficha Técnica interna.
// Antes esto no se sincronizaba en absoluto: aunque el plato tuviera
// recipeId, la web pública no tenía acceso a DB.recipes (y no conviene
// subir DB.recipes entera solo por esto — llevaría escandallos y costes
// internos). Solo se incluyen platos con al menos un alérgeno, para no
// engordar el payload con entradas vacías.
function getPublicAllergensForSync(){
  const out = {};
  (DB.cartas||[]).forEach(c => {
    (c.secciones||[]).forEach(sec => {
      (sec.platos||[]).forEach(p => {
        if(!p.recipeId) return;
        const recipe = getRecipe(p.recipeId);
        if(!recipe) return;
        const allergens = recipeComputedAllergens(recipe);
        if(allergens.length) out[p.id] = allergens;
      });
    });
  });
  return out;
}

// Promos con descuento activas HOY (día/franja horaria), saneadas para la
// web pública: solo lo que un cliente necesita para ver la oferta (plato,
// %, franja) — nunca quién la creó ni la descripción interna de marketing.
// Antes ninguna promo se publicaba, así que un cliente que miraba la carta
// online veía el precio normal aunque hubiera descuento activo en sala.
function getActivePromosForSync(){
  const today = todayStr();
  return (DB.promos||[])
    .filter(p => p.discountPct && p.menuItemPlatoId && promoOccursOn(p, today) && !(p.maxUses && promoUsesToday(p) >= p.maxUses))
    .map(p => ({menuItemPlatoId: p.menuItemPlatoId, discountPct: p.discountPct, horaInicio: p.horaInicio||null, horaFin: p.horaFin||null}));
}

function syncPublicMirror(){
  if(typeof firebase === 'undefined') return;
  if(!getLicense()) return;
  const publicId = getPublicId();
  if(!publicId) return;
  try{
    const sucursales = buildSucursalesList();
    getPlatformFirebaseApp().then(app => {
      if(!app) return;
      const data = {
        business: DB.business,
        cartas: DB.cartas,
        activeCartaIds: DB.activeCartaIds,
        // Los menús combo (Menú del día, etc.) nunca se publicaban al espejo
        // público — la web de reservas/pedidos solo mostraba la carta suelta,
        // así que un cliente jamás podía pedir un menú desde el móvil.
        menus: DB.menus,
        activeMenuIds: DB.activeMenuIds,
        reservasResumen: getReservasResumenForSync(),
        mesasOcupadas: getMesasOcupadasForSync(),
        pedidosResumen: getPedidosResumenForSync(),
        cocinaCargaActiva: getActiveKitchenOrdersCount(),
        tables: DB.tables.map(t => ({id: t.id, name: t.name, plazas: t.plazas || null})),
        promos: getActivePromosForSync(),
        allergens: getPublicAllergensForSync()
      };
      if(sucursales) data.sucursales = sucursales;
      // Antes un fallo aquí se tragaba en silencio (".catch(()=>{})"): la
      // página pública de reservas/pedidos podía quedarse con datos
      // desactualizados (horario, carta, precios...) sin que nadie se
      // enterara. Ahora al menos se loguea y se avisa al usuario.
      app.database().ref('gastrogoan/public/' + publicId + '/info').set(data).catch(e => {
        console.error('Error publicando el espejo público', e);
        if(typeof showToast === 'function') showToast(t('msg.publicSyncFailed'));
      });
      // aforoHold (js/reservagastrogoan.html) es un contador aparte que la
      // web pública usa para reservar de forma atómica sin pasarse del
      // aforo — pero nunca se decrementaba solo, así que cada reserva
      // online quedaba contada DOS VECES para siempre (una en
      // reservasResumen, otra en aforoHold), y cancelar/rechazar una
      // reserva no liberaba ese hueco: el turno podía acabar "lleno" en la
      // web pública sin estarlo de verdad. Como reservasResumen ya es la
      // fuente de verdad (recién recalculada arriba a partir de las
      // reservas reales), se limpia aforoHold de cada fecha que aparezca
      // ahí O que tenga alguna reserva (aunque esté cancelada/pasada, para
      // cubrir el caso de "se cancelaron todas") — así vuelve a arrancar
      // de cero en el próximo sync, sin arrastrar holds obsoletos.
      const fechasATocar = new Set(Object.keys(data.reservasResumen));
      DB.reservations.forEach(r => { if(r.date) fechasATocar.add(r.date); });
      fechasATocar.forEach(fecha => {
        app.database().ref('gastrogoan/public/' + publicId + '/aforoHold/' + fecha).remove().catch(() => {});
        // mesaHold (candado por mesa concreta que usa la web pública para
        // reservar de forma atómica) mismo motivo y mismo mecanismo.
        app.database().ref('gastrogoan/public/' + publicId + '/mesaHold/' + fecha).remove().catch(() => {});
      });
      // Mismo motivo y mismo mecanismo que aforoHold, aplicado a pedidosHold
      // (el contador atómico de pedidos por franja): se limpia en cada sync
      // para no arrastrar holds obsoletos de pedidos ya aceptados/rechazados.
      const fechasPedidosATocar = new Set(Object.keys(data.pedidosResumen));
      DB.tpvOrders.forEach(o => { if(o.date && (o.tipo === 'takeaway' || o.tipo === 'delivery')) fechasPedidosATocar.add(o.date); });
      fechasPedidosATocar.forEach(fecha => {
        app.database().ref('gastrogoan/public/' + publicId + '/pedidosHold/' + fecha).remove().catch(() => {});
      });
      // orderStatus (seguimiento público de pedidos, ver syncOrderStatusForPublic)
      // se limpia de entradas de hace más de 24h en cada sync — best-effort, no
      // bloquea nada si falla. Sin esto, la lista crecería para siempre con
      // pedidos ya entregados/rechazados de hace semanas.
      app.database().ref('gastrogoan/public/' + publicId + '/orderStatus').once('value').then(snap => {
        const val = snap.val() || {};
        const cutoff = Date.now() - 24*60*60*1000;
        Object.keys(val).forEach(token => {
          const updatedAt = Date.parse(val[token] && val[token].updatedAt);
          if(!updatedAt || updatedAt < cutoff){
            app.database().ref('gastrogoan/public/' + publicId + '/orderStatus/' + token).remove().catch(()=>{});
          }
        });
      }).catch(()=>{});
    }).catch(e => console.error('Error publicando el espejo público', e));
  }catch(e){
    console.error('Error publicando el espejo público', e);
  }
}

// Para que un dispositivo que nunca ha visto este negocio (el móvil de un
// empleado nuevo, por ejemplo) pueda encontrarlo solo con el código+PIN sin
// que el propietario tenga que "presentarlo" antes en ese dispositivo, se
// publica una referencia mínima (qué proyecto Firebase usar) en la nube
// compartida de la plataforma, indexada por tenantId. El apiKey/databaseURL
// de Firebase no son secretos (la seguridad la dan las reglas de Firebase,
// no ocultar esto — así funciona cualquier app web con Firebase), así que
// publicarlos aquí no reduce la seguridad real de los datos del negocio.
function publishTenantLookup(tenantId, config){
  if(!tenantId || !config) return;
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/tenantLookup/' + tenantId).set({
      apiKey: config.apiKey, databaseURL: config.databaseURL
    }).catch(e => console.error('Error publicando la referencia del negocio', e));
  }).catch(()=>{});
}
function lookupTenantFirebaseConfig(tenantId){
  return getPlatformFirebaseApp().then(app => {
    if(!app) return null;
    return app.database().ref('gastrogoan/tenantLookup/' + tenantId).once('value').then(snap => snap.val());
  }).catch(() => null);
}
// Se conecta de forma puntual (con una instancia de Firebase aparte, que se
// cierra al terminar) al proyecto de OTRO negocio para traerse una copia de
// sus datos — se usa solo la primera vez que un empleado entra desde un
// dispositivo que nunca ha tenido este negocio localmente.
async function fetchRemoteTenantDB(tenantId, fbConfig){
  const appName = 'peek-' + tenantId;
  let app;
  try{ app = firebase.app(appName); }catch(e){ app = firebase.initializeApp(fbConfig, appName); }
  await app.auth().signInAnonymously();
  const snap = await app.database().ref('gastrogoan/tenants/' + tenantId + '/db').once('value');
  try{ await app.delete(); }catch(e){}
  return snap.val();
}

/* ============================================================
   CUENTA DE PROPIETARIO EN LA NUBE — tus negocios en cualquier dispositivo
   Todo cuelga de un único nodo, gastrogoan/ownerAuth/{authKey}, cuya ruta
   solo se puede construir sabiendo usuario+PIN (ver ggOwnerAuthKey):
     { user, createdAt, businesses: { {tenantId}: {code, name} } }
   Es a la vez la prueba de que la cuenta existe (si la ruta se puede leer,
   el PIN es correcto) y la lista de negocios del dueño. Un negocio se
   canjea UNA vez con su código; a partir de ahí aparece solo en cualquier
   dispositivo donde entre con su cuenta.

   La versión anterior usaba dos nodos, ownerLink y ownerProfiles, colgados
   del tenantId del primer negocio comprado. Nunca llegaron a funcionar:
   no tenían reglas publicadas, así que todas sus escrituras se rechazaban
   en silencio (iban con .catch vacío). Este nodo sí las tiene.
   ============================================================ */
function getOwnerAuthKey(){
  const login = getOwnerLogin();
  return login ? login.authKey : null;
}
// ¿Existe de verdad esta cuenta? Devuelve true/false, o null si no se pudo
// comprobar por falta de conexión — que es un caso distinto de "el PIN está
// mal" y hay que poder avisar de otra forma.
async function verifyOwnerAccountOnPlatform(authKey){
  if(!authKey) return false;
  const app = await withTimeout(getPlatformFirebaseApp(), 12000);
  if(!app) return null;
  try{
    const snap = await withTimeout(app.database().ref('gastrogoan/ownerAuth/' + authKey).once('value'), 12000);
    if(snap === null) return null;
    return snap.exists();
  }catch(e){
    console.error('Error comprobando la cuenta de propietario', e);
    return null;
  }
}
// Añade (o actualiza el nombre de) un negocio en la lista de la cuenta.
function linkBusinessToOwnerAccount(tenantId, code, name){
  const authKey = getOwnerAuthKey();
  if(!authKey || !tenantId) return;
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/ownerAuth/' + authKey + '/businesses/' + tenantId).set({
      code, name: name || ''
    }).catch(e => console.error('Error vinculando el negocio a la cuenta', e));
  }).catch(()=>{});
}
function unlinkBusinessFromOwnerAccount(tenantId){
  const authKey = getOwnerAuthKey();
  if(!authKey || !tenantId) return;
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/ownerAuth/' + authKey + '/businesses/' + tenantId).remove()
      .catch(e => console.error('Error desvinculando el negocio de la cuenta', e));
  }).catch(()=>{});
}
// Tras entrar como propietario, trae los negocios de la cuenta que este
// dispositivo todavía no conozca y los da de alta como "fichas" ligeras
// (código + licencia), sin descargar sus datos: de eso ya se encarga la
// sincronización normal en cuanto se entre de verdad en cada uno.
async function syncOwnerBusinessList(){
  const authKey = getOwnerAuthKey();
  if(!authKey) return;
  try{
    const app = await getPlatformFirebaseApp();
    if(!app) return;
    const bizSnap = await app.database().ref('gastrogoan/ownerAuth/' + authKey + '/businesses').once('value');
    const businesses = bizSnap.val() || {};
    const slots = getBusinessSlots();
    let changed = false;
    const me = currentOwnerId();
    Object.entries(businesses).forEach(([tId, info]) => {
      if(!info || !info.code) return;
      const existente = slots.find(s => s.code === info.code);
      if(existente){
        // Ya está en este aparato. Si figuraba a nombre de otro (marca mal
        // puesta), se corrige: la lista de la cuenta es la que manda.
        if(me && existente.ownerId !== me){ existente.ownerId = me; changed = true; }
        return;
      }
      const newId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6) + tId.slice(0,3);
      slots.push({ id: newId, name: info.name || t('bs.defaultBusinessName'), code: info.code, ownerId: currentOwnerId() });
      localStorage.setItem(slotLicenseKey(newId), JSON.stringify({code: info.code, tenantId: tId}));
      changed = true;
    });
    if(changed) saveBusinessSlots(slots);
  }catch(e){
    console.error('Error sincronizando la lista de negocios del propietario', e);
  }
}

// Un dispositivo puede tener el negocio dado de alta y aun así no saber a
// qué nube conectarse: al entrar como PROPIETARIO en un móvil nuevo, el
// negocio aparece solo (viene de la lista de la cuenta) pero la
// configuración de Firebase vive dentro de los datos del negocio, que
// todavía no se han descargado — y sin ella no hay de dónde descargarlos.
// El acceso de empleado ya resolvía esto consultando tenantLookup; el del
// dueño no, así que su segundo dispositivo se quedaba en local para
// siempre, sin ningún aviso: la tablet sincronizaba y el móvil no.
// Qué negocio se ha intentado buscar ya, no un simple sí/no: si el primer
// intento falla (arranque sin cobertura, que es lo normal en un móvil), hay
// que poder reintentarlo después, y si se cambia de negocio hay que buscar
// el suyo y no darlo por hecho.
let tenantLookupIntentado = null;
function initCloud(){
  cloudConfig = getCloudConfig();
  if(!cloudConfig){
    const tId = getTenantId();
    if(tId && tenantLookupIntentado !== tId && typeof firebase !== 'undefined'){
      tenantLookupIntentado = tId;
      lookupTenantFirebaseConfig(tId).then(cfg => {
        if(!cfg || !cfg.apiKey || !cfg.databaseURL){
          tenantLookupIntentado = null; // negocio recién creado, o sin cobertura: se podrá reintentar
          return;
        }
        DB.business.ownFirebase = {apiKey: cfg.apiKey, databaseURL: cfg.databaseURL};
        saveDB();
        initCloud();
      }).catch(() => { tenantLookupIntentado = null; });
    }
    updateSyncBadge('local');
    return;
  }
  if(typeof firebase === 'undefined'){ recordSyncError(new Error('network-request-failed: Firebase no disponible (¿sin internet?)')); return; }
  const tenantId = getTenantId();
  if(!tenantId){ updateSyncBadge('local'); return; } // aún sin licencia activada
  publishTenantLookup(tenantId, cloudConfig);
  if(cloudRef) return; // ya conectado
  try{
    // OJO: antes esto comprobaba "firebase.apps.length" (el total global de
    // apps ya inicializadas) para decidir si crear la app por defecto — pero
    // la app nombrada 'platform' (usada para las reservas públicas) casi
    // siempre se registra ANTES, así que esa cuenta ya valía >=1 y esta
    // línea nunca llegaba a crear la app por defecto del negocio, dejando
    // la sincronización realmente rota en cualquier activación de licencia
    // que no coincidiera con el primer arranque de la página. Se comprueba
    // ahora específicamente si la app por defecto existe, no el total.
    try{ firebase.app(); }catch(e){ firebase.initializeApp(cloudConfig); }
    // Autenticación anónima: las reglas de la nube exigen auth != null
    // para poder leer/escribir, así evitamos el acceso directo sin pasar
    // por el SDK de Firebase.
    if(firebase.auth().currentUser){
      startCloudSync(tenantId);
    } else {
      firebase.auth().signInAnonymously().then(() => startCloudSync(tenantId)).catch(err => recordSyncError(err));
    }
  }catch(e){
    recordSyncError(e);
  }
}

/* Aplica al estado local un cambio llegado de la nube en un bloque
   concreto de la DB (p.ej. "tpvOrders" o "clients") y refresca la
   pantalla. Se usa tanto en la primera carga como en cada actualización
   incremental posterior. */
// Detecta el caso de colisión real: un registro (misma mesa, mismo
// ingrediente...) que este dispositivo modificó localmente sin haberlo
// subido todavía Y que a la vez llegó cambiado de otro dispositivo. En
// ese caso mergeArraysById se queda con la versión remota entera y
// descarta la local en silencio — no hay forma segura de fusionar ambas
// versiones campo a campo sin arriesgarse a corromper el pedido, así que
// al menos se avisa de que ha pasado, en vez de que el camarero se
// encuentre con datos distintos sin saber por qué. Envuelto en try/catch
// a propósito: es una mejora de aviso, nunca debe poder romper el propio
// guardado de la sincronización si algo de este cálculo falla.
function warnIfConcurrentEditLost(key, localArr, remoteArr){
  try{
    if(!lastSyncedSnapshot || !lastSyncedSnapshot[key]) return;
    let lastSynced;
    try{ lastSynced = JSON.parse(lastSyncedSnapshot[key]); }catch(e){ return; }
    if(!Array.isArray(lastSynced)) return;
    const lastById = new Map(lastSynced.filter(x=>x&&x.id!=null).map(x=>[x.id, canonicalStringify(x)]));
    const localById = new Map((localArr||[]).filter(x=>x&&x.id!=null).map(x=>[x.id, canonicalStringify(x)]));
    const remoteById = new Map((remoteArr||[]).filter(x=>x&&x.id!=null).map(x=>[x.id, canonicalStringify(x)]));
    const collided = [];
    localById.forEach((localJson, id) => {
      if(!remoteById.has(id)) return;
      const lastJson = lastById.get(id);
      const remoteJson = remoteById.get(id);
      // Colisión real: los tres difieren entre sí (local cambió desde el
      // último sync, remoto también cambió, y no son el mismo cambio).
      if(localJson !== lastJson && remoteJson !== lastJson && localJson !== remoteJson) collided.push(id);
    });
    // Antes se avisaba con un toast cada vez que pasaba esto — molestaba
    // en el día a día (salta con cualquier coincidencia de sincronización,
    // no solo con pérdidas graves) y no es información que el personal
    // necesite ver en caliente. Queda igualmente el rastro en el registro
    // de actividad para quien quiera revisarlo con calma.
    if(collided.length && DB.auditLog){
      // Con la MISMA forma que logAudit ({ts, actor, action, summary,
      // severity}) y con unshift, no con push: la entrada se guardaba con
      // {fecha, hora, tipo, desc}, campos que el Registro de actividad ni
      // mira, así que la fila salía como "Invalid Date" con las columnas de
      // quién y qué en blanco. Y al ir al final de la lista (push) mientras
      // el modal muestra solo las primeras, en la práctica no se veía nunca
      // — y era además la primera candidata a caer con el recorte a 500.
      DB.auditLog.unshift({
        id: genId(), ts: new Date().toISOString(),
        actor: (typeof currentActorName === 'function' ? currentActorName() : ''),
        action: 'sync_conflict',
        summary: t('msg.concurrentEditOverwritten').replace('${count}', collided.length) + ` (${key})`,
        severity: 'critical'
      });
      if(DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
    }
  }catch(e){ console.error('Error detectando conflicto de sincronización', e); }
}
/* Dos camareros cobrando la MISMA mesa a la vez acaban creando dos ventas
   del mismo pedido. Es raro, pero pasa: cada dispositivo ve la mesa
   abierta porque la sincronización aún no le ha llegado, y la guarda de
   finalizeCharge ("si ya está pagada, no cobres") solo protege del doble
   toque en el MISMO aparato.

   Cerrarlo del todo exigiría preguntar a la nube antes de cada cobro, y la
   app cobra sin internet a propósito — un restaurante no puede quedarse
   sin caja porque se caiga el wifi. Entre perder una venta y duplicarla,
   se duplica: una venta de más se ve y se anula, una de menos no la
   detecta nadie.

   Lo que sí se puede es que NO pase desapercibida: un cobro duplicado
   infla la facturación y el IVA declarado. Queda anotado en el registro de
   actividad como crítico. Se avisa una sola vez por pedido, no en cada
   sincronización. */
const cobrosDuplicadosAvisados = new Set();
function avisarSiCobroDuplicado(ventas){
  try{
    if(!Array.isArray(ventas) || !DB.auditLog) return;
    const porPedido = new Map();
    ventas.forEach(v => {
      if(!v || v.orderId == null || v.anulada) return;
      if(!porPedido.has(v.orderId)) porPedido.set(v.orderId, []);
      porPedido.get(v.orderId).push(v);
    });
    porPedido.forEach((lista, orderId) => {
      if(lista.length < 2 || cobrosDuplicadosAvisados.has(orderId)) return;
      cobrosDuplicadosAvisados.add(orderId);
      const importe = lista.reduce((s,v) => s + (parseFloat(v.total)||0), 0);
      DB.auditLog.unshift({
        id: genId(), ts: new Date().toISOString(),
        actor: (typeof currentActorName === 'function' ? currentActorName() : ''),
        action: 'cobro_duplicado',
        summary: t('msg.duplicateChargeDetected')
                  .replace('${n}', lista.length)
                  .replace('${total}', (typeof fmtMoney === 'function' ? fmtMoney(importe) : importe)),
        severity: 'critical'
      });
      if(DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
    });
  }catch(e){ console.error('Error detectando cobro duplicado', e); }
}

/* Une las líneas de una misma comanda tomadas en dos dispositivos.
   Cada línea lleva su propio `lineId` desde que se crea; las comandas
   abiertas ANTES de esa versión no lo tienen, y ahí no hay forma fiable de
   saber qué línea es cuál, así que se respeta lo que diga la nube — el
   comportamiento de siempre, nunca peor.

   Si la misma línea existe en los dos lados (los dos camareros sumaron una
   unidad del mismo plato), se queda la de la nube: no se inventan
   cantidades sumando, que sería peor error que perder una unidad. */
function mergeOrderLines(localOrder, remoteOrder){
  const locales = Array.isArray(localOrder.items) ? localOrder.items : [];
  const remotas = Array.isArray(remoteOrder.items) ? remoteOrder.items : [];
  if(!locales.length) return remoteOrder;
  const todasConId = arr => arr.every(l => l && l.lineId != null);
  if(!todasConId(locales) || !todasConId(remotas)) return remoteOrder;
  const remotasPorId = new Map();
  remotas.forEach(l => remotasPorId.set(l.lineId, l));
  const unidas = [];
  const vistas = new Set();
  locales.forEach(l => {
    vistas.add(l.lineId);
    unidas.push(remotasPorId.has(l.lineId) ? remotasPorId.get(l.lineId) : l);
  });
  remotas.forEach(l => { if(!vistas.has(l.lineId)) unidas.push(l); });
  return Object.assign({}, remoteOrder, {items: unidas});
}

function applyRemoteBlock(key, remoteValue){
  const def = defaultData();
  let merged = def.hasOwnProperty(key) ? withDefaults(def[key], remoteValue) : remoteValue;
  // Lo que la nube tiene de verdad ahora mismo, ANTES de fusionar con nada
  // local — se necesita para saber, después, si el resultado fusionado
  // lleva algo que la nube todavía no tiene (ver mergedFromLocal más abajo).
  const remoteOnlyJson = canonicalStringify(merged);
  if(MERGEABLE_ARRAYS.has(key) && Array.isArray(DB[key]) && Array.isArray(merged)){
    warnIfConcurrentEditLost(key, DB[key], merged);
    merged = mergeArraysById(DB[key], merged);
  }
  if(key === 'stock' && DB[key] && typeof merged === 'object'){
    merged = mergeStockField(DB[key], merged, lastSyncedSnapshot && lastSyncedSnapshot[key]);
  }
  if(key === 'ge' && DB[key] && typeof merged === 'object'){
    merged = mergeNestedArraysByKey(DB[key], merged, ['fijos','variables','capex','fijosLog','cierres']);
  }
  if(key === 'limpieza' && DB[key] && typeof merged === 'object'){
    merged = mergeNestedArraysByKey(DB[key], merged, ['tareas','temperaturas','alergenos','plagas','mantenimiento']);
  }
  // El cuaderno de I+D tiene el MISMO problema que ge y limpieza: sus
  // arrays (creaciones y carpetas) cuelgan de un objeto, así que
  // MERGEABLE_ARRAYS no los alcanza y el bloque entero se sustituía. Dos
  // cocineros lanzando pruebas a la vez desde la tablet y el móvil perdían
  // una de las dos. Es la misma familia de fallo que ya se coló dos veces.
  if(key === 'idr' && DB[key] && typeof merged === 'object'){
    merged = mergeNestedArraysByKey(DB[key], merged, ['creaciones','carpetas']);
  }
  // Mismo problema que DB.stock (mapas planos {clave: valor}, sin id ni
  // array): shifts (cuadrante por empleado), workDistribution (reparto de
  // tareas por empleado), chatPinned (mensaje fijado por canal) y
  // shiftHandoffNotes (nota de traspaso por área+fecha) se sustituían
  // enteros al sincronizar — dos encargados editando el turno de DOS
  // empleados distintos, offline a la vez, podían perder el de uno de los
  // dos. Se fusionan campo a campo con el mismo mecanismo que ya usa stock.
  // Los avisos push: cada dispositivo escribe SU entrada, identificada por
  // deviceId. Sustituir el array entero (que es lo que se hacía, porque no
  // llevan campo `id` y mergeArraysById los dejaba pasar de largo) borraba
  // la de los demás: el móvil del camarero se quedaba sin recibir avisos en
  // cuanto la tablet de cocina guardaba la suya, y sin ningún síntoma —
  // simplemente dejaban de llegar. Se fusiona por deviceId, quedándose con
  // la versión más reciente de cada aparato.
  if(key === 'pushSubscriptions' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const porAparato = new Map();
    [...merged, ...DB[key]].forEach(sub => {
      if(!sub || !sub.deviceId) return;
      const previo = porAparato.get(sub.deviceId);
      if(!previo || (sub.updatedAt || 0) > (previo.updatedAt || 0)) porAparato.set(sub.deviceId, sub);
    });
    merged = [...porAparato.values()];
  }
  if(FLAT_MAP_FIELDS.has(key) && DB[key] && typeof merged === 'object'){
    merged = mergeStockField(DB[key], merged, lastSyncedSnapshot && lastSyncedSnapshot[key]);
  }
  if(key === 'categoryIcons' && DB[key] && typeof merged === 'object'){
    merged = {
      recipe: mergeStockField((DB[key]||{}).recipe, (merged||{}).recipe, lastSyncedSnapshot && lastSyncedSnapshot[key] ? canonicalStringify((JSON.parse(lastSyncedSnapshot[key])||{}).recipe) : null),
      ingredient: mergeStockField((DB[key]||{}).ingredient, (merged||{}).ingredient, lastSyncedSnapshot && lastSyncedSnapshot[key] ? canonicalStringify((JSON.parse(lastSyncedSnapshot[key])||{}).ingredient) : null),
    };
  }
  if(key === 'sales' && Array.isArray(merged)) avisarSiCobroDuplicado(merged);
  // Dos camareros en la MISMA mesa: uno toma las bebidas en la barra y otro
  // la comida en el salón. Como tpvOrders se fusiona por id de comanda, la
  // comanda entera de la nube sustituía a la local y las líneas del otro
  // camarero desaparecían sin dejar rastro: un plato servido que no se
  // cobra. Aquí se fusionan también las LÍNEAS de cada comanda.
  if(key === 'tpvOrders' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const localesPorId = new Map();
    DB[key].forEach(o => { if(o && o.id != null) localesPorId.set(o.id, o); });
    merged = merged.map(o => {
      if(!o || o.id == null) return o;
      const local = localesPorId.get(o.id);
      // Si no había versión local, o mergeArraysById ya se quedó con la
      // local (la nube no la tiene), no hay nada que fusionar.
      if(!local || local === o) return o;
      return mergeOrderLines(local, o);
    });
  }
  if(key === 'tpvOrders'){
    (merged||[]).forEach(o => { if(!Array.isArray(o.items)) o.items = []; if(!Array.isArray(o.tandas)) o.tandas = []; });
  }
  const json = canonicalStringify(merged);
  if(lastSyncedSnapshot && lastSyncedSnapshot[key] === json) return;
  // Si la fusión conservó algo local que la nube todavía no tiene (p.ej. un
  // pedido tomado offline en ESTE dispositivo que el otro no llegó a ver
  // antes de sobrescribir el nodo remoto), el resultado fusionado NO está
  // realmente sincronizado todavía — antes se marcaba como "ya sincronizado"
  // igualmente (lastSyncedSnapshot = json del propio merge), lo que le
  // mentía a flushCloudSync y ese dato fusionado se quedaba solo en este
  // dispositivo para siempre, sin volver a subirse nunca a la nube.
  const mergedFromLocal = json !== remoteOnlyJson;
  // Aviso al navegador de este dispositivo si llega, desde OTRO dispositivo,
  // un mensaje urgente de chat o un cierre de caja con algo raro que
  // revisar — el punto entero de un aviso de este tipo es que llegue a
  // quien no estaba mirando esa pantalla en ese momento.
  if(key === 'chatMessages' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const knownIds = new Set(DB[key].map(m => m.id));
    const me = (typeof getChatAuthor === 'function') ? getChatAuthor() : null;
    // Firebase dispara 'child_added' también para los datos YA EXISTENTES la
    // primera vez que un dispositivo nuevo (o una reinstalación) se conecta
    // — con DB.chatMessages local vacío, "desconocido para mí" era cierto
    // para TODO mensaje urgente de la historia del negocio, así que se
    // avisaba de golpe de meses de avisos ya desfasados. Se acota a los
    // mensajes de los últimos 5 minutos, que es lo que de verdad significa
    // "urgente ahora mismo".
    const RECENT_MS = 5*60*1000;
    const now = Date.now();
    merged.filter(m => m.urgent && !knownIds.has(m.id) && String(m.authorId) !== String(me) && m.ts && (now - new Date(m.ts).getTime()) <= RECENT_MS)
      .forEach(m => notifyDesktop('🚨 ' + (m.authorName||''), m.text||''));
  }
  if(key === 'cashClosures' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const knownIds = new Set(DB[key].map(c => c.id));
    merged.filter(c => c.warnings && c.warnings.length && !knownIds.has(c.id))
      .forEach(c => notifyDesktop(t('notif.cashWarningTitle'), c.warnings[0]));
  }
  // Aviso de "nuevo reparto asignado" a quien esté conectado en ESTE
  // dispositivo con su propia sesión de empleado: si el reparto automático
  // (autoAssignRepartidor, js/tpv.js) le acaba de asignar un pedido desde
  // OTRO dispositivo (donde se aceptó el pedido), es aquí — al llegar ese
  // cambio por la nube — donde este dispositivo se entera y puede avisar.
  if(key === 'tpvOrders' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const myId = (typeof loggedInEmployeeId === 'function') ? loggedInEmployeeId() : null;
    if(myId){
      const before = new Map(DB[key].map(o => [o.id, o.repartidorId]));
      merged.filter(o => o.repartidorId === myId && before.get(o.id) !== myId && o.entregaEstado !== 'entregado')
        .forEach(o => {
          notifyDesktop(t('notif.newDeliveryTitle'), (o.clienteNombre||'') + (o.clienteDireccion ? ' — ' + o.clienteDireccion : ''));
          if(typeof playNewRequestAlert === 'function') playNewRequestAlert();
          if(typeof showToast === 'function') showToast(t('msg.newDeliveryAssignedToYou').replace('${name}', o.clienteNombre||'?'));
        });
    }
  }
  // Solo se marca como "sincronizado" lo que de verdad coincide con la
  // nube (remoteOnlyJson). Si se fusionó algo local, el snapshot se deja
  // apuntando a lo que la nube tenía, para que flushCloudSync detecte que
  // DB[key] (el merge) todavía no coincide y lo suba de verdad.
  lastSyncedSnapshot[key] = mergedFromLocal ? remoteOnlyJson : json;
  DB[key] = merged;
  idbSet(DB_KEY, DB).catch(e => console.error('Error guardando datos', e));
  // Licencia compartida por la nube: los empleados se activan solos
  if(isStoredLicenseValid(DB.license)){
    localStorage.setItem(LICENSE_LS, JSON.stringify(DB.license));
    hideActivationGate();
  }
  // Un dispositivo NUEVO que canjea un negocio ya existente recibe su
  // nombre real por la nube (aquí), no editando Mi Negocio — sin esto, el
  // selector de negocios se quedaba con "Mi negocio" de relleno hasta que
  // alguien entrara a Mi Negocio y guardara desde ESE dispositivo en concreto.
  if(key === 'business' && merged && merged.name) updateActiveSlotName(merged.name);
  // Si el propietario da de baja al empleado o le revoca canUnlockEdit
  // desde OTRO dispositivo, antes no tenía ningún efecto hasta que este
  // dispositivo se cerrara y volviera a abrir: editUnlocked es una variable
  // en memoria que solo se fijaba al reanudar sesión. Con esto, el cambio
  // llega en cuanto se sincroniza, no en la próxima vez que alguien abra
  // la app desde cero.
  if(key === 'employees' && Array.isArray(merged)){
    const myId = (typeof loggedInEmployeeId === 'function') ? loggedInEmployeeId() : null;
    if(myId != null){
      const meAfter = merged.find(e => e.id === myId);
      if(!meAfter || meAfter.active === false){
        if(typeof clearAccessSession === 'function') clearAccessSession();
        location.reload();
        return;
      }
      if(typeof applyEmployeeSessionEditRights === 'function') applyEmployeeSessionEditRights(myId);
    }
  }
  if(mergedFromLocal && typeof scheduleCloudSync === 'function') scheduleCloudSync();
  refreshAfterRemoteChange();
}

/* Tras la conexión inicial, en vez de re-descargar TODA la base de datos
   del negocio cada vez que algo cambia (lo que multiplicaba el consumo de
   datos por cada dispositivo conectado), escuchamos solo los bloques
   ("ingredients", "tpvOrders", "clients"...) que realmente cambian. */
function attachCloudChildListeners(){
  const onErr = err => recordSyncError(err);
  cloudRef.on('child_added', snap => applyRemoteBlock(snap.key, snap.val()), onErr);
  cloudRef.on('child_changed', snap => applyRemoteBlock(snap.key, snap.val()), onErr);
  cloudRef.on('child_removed', snap => {
    const def = defaultData();
    if(!def.hasOwnProperty(snap.key)) return;
    applyRemoteBlock(snap.key, def[snap.key]);
  }, onErr);
}

// Fusiona lo que hay en la nube (val) con los datos locales, igual que se
// hacía siempre que la nube YA tenía datos. Factorizado para poder reutilizarlo
// también en el caso "nube vacía" cuando otro dispositivo gana la carrera de
// activación (ver startCloudSync).
function mergeRemoteIntoLocal(val){
  const merged = withDefaults(defaultData(), val);
  let changedLocally = false;
  let needsReupload = false;
  const newSnapshot = {};
  Object.keys(merged).forEach(key => {
    // `lastSyncedSnapshot` vive solo en memoria: en cada recarga de página
    // empieza en null, así que sin esto TODA clave se trataba como "sin
    // sincronizar" y se sustituía entera por lo que hubiera en la nube —
    // incluso si lo local era más nuevo (p.ej. un turno entero trabajado
    // offline que aún no había llegado a subirse cuando se recargó la
    // página). Aplicar aquí la misma fusión por id que ya usa
    // applyRemoteBlock para los listeners incrementales evita perder en
    // silencio comandas/ventas/stock hechos offline en esta misma carga.
    const remoteOnlyJson = canonicalStringify(merged[key]);
    let value = merged[key];
    if(MERGEABLE_ARRAYS.has(key) && Array.isArray(DB[key]) && Array.isArray(value)){
      value = mergeArraysById(DB[key], value);
    }
    if(key === 'stock' && DB[key] && typeof value === 'object'){
      value = mergeStockField(DB[key], value, lastSyncedSnapshot && lastSyncedSnapshot[key]);
    }
    if(key === 'ge' && DB[key] && typeof value === 'object'){
      value = mergeNestedArraysByKey(DB[key], value, ['fijos','variables','capex','fijosLog','cierres']);
    }
    if(key === 'limpieza' && DB[key] && typeof value === 'object'){
      value = mergeNestedArraysByKey(DB[key], value, ['tareas','temperaturas','alergenos','plagas','mantenimiento']);
    }
    if(FLAT_MAP_FIELDS.has(key) && DB[key] && typeof value === 'object'){
      value = mergeStockField(DB[key], value, lastSyncedSnapshot && lastSyncedSnapshot[key]);
    }
    if(key === 'categoryIcons' && DB[key] && typeof value === 'object'){
      value = {
        recipe: mergeStockField((DB[key]||{}).recipe, (value||{}).recipe, lastSyncedSnapshot && lastSyncedSnapshot[key] ? canonicalStringify((JSON.parse(lastSyncedSnapshot[key])||{}).recipe) : null),
        ingredient: mergeStockField((DB[key]||{}).ingredient, (value||{}).ingredient, lastSyncedSnapshot && lastSyncedSnapshot[key] ? canonicalStringify((JSON.parse(lastSyncedSnapshot[key])||{}).ingredient) : null),
      };
    }
    const valueJson = canonicalStringify(value);
    // Igual que en applyRemoteBlock: si la fusión conservó algo local que la
    // nube todavía no tenía (turno entero trabajado offline antes de esta
    // recarga), NO se marca como sincronizado con el resultado fusionado —
    // se marca con lo que la nube tenía de verdad, para que el siguiente
    // flushCloudSync detecte la diferencia y suba el resultado fusionado.
    const mergedFromLocal = valueJson !== remoteOnlyJson;
    if(mergedFromLocal) needsReupload = true;
    newSnapshot[key] = mergedFromLocal ? remoteOnlyJson : valueJson;
    if(!lastSyncedSnapshot || lastSyncedSnapshot[key] !== valueJson || mergedFromLocal){
      DB[key] = value;
      changedLocally = true;
    }
  });
  lastSyncedSnapshot = newSnapshot;
  if(changedLocally){
    idbSet(DB_KEY, DB).catch(e => console.error('Error guardando datos', e));
    if(isStoredLicenseValid(DB.license)){
      localStorage.setItem(LICENSE_LS, JSON.stringify(DB.license));
      hideActivationGate();
    }
    refreshAfterRemoteChange();
  }
  if(needsReupload && typeof scheduleCloudSync === 'function') scheduleCloudSync();
}

// Tras perder la carrera de inicialización (ver startCloudSync), espera y
// relee la nube varias veces con backoff creciente en vez de un solo intento
// de 1500ms — si a la primera el ganador todavía no había terminado de
// subir, un único intento nos llevaba a hacer un pushAllToCloud() de
// emergencia sin ninguna coordinación, reintroduciendo exactamente la
// sobreescritura que esta transacción se creó para evitar. Solo tras agotar
// los reintentos se hace ese pushAllToCloud() como último recurso.
const CLOUD_INIT_RACE_MAX_ATTEMPTS = 5;
function waitForWinnerAfterLostRace(attempt){
  attempt = attempt || 1;
  cloudRef.once('value').then(snap2 => {
    const remoteVal = snap2.val();
    if(remoteVal !== null){
      mergeRemoteIntoLocal(remoteVal);
      attachCloudChildListeners();
    }else if(attempt < CLOUD_INIT_RACE_MAX_ATTEMPTS){
      setTimeout(() => waitForWinnerAfterLostRace(attempt+1), attempt*1000);
    }else{
      // Caso muy improbable tras varios reintentos: el ganador reclamó pero
      // nunca llegó a subir nada (p.ej. se quedó sin conexión a mitad).
      // Subimos nosotros como red de seguridad para no dejar la nube vacía
      // para siempre.
      lastSyncedSnapshot = {};
      pushAllToCloud();
      syncPublicMirror();
      attachCloudChildListeners();
    }
  }).catch(e => {
    console.error('Error releyendo la nube tras perder la carrera de inicialización', e);
    if(attempt < CLOUD_INIT_RACE_MAX_ATTEMPTS){
      setTimeout(() => waitForWinnerAfterLostRace(attempt+1), attempt*1000);
    }else{
      recordSyncError(new Error('No se pudo conectar con la nube tras varios intentos'));
      attachCloudChildListeners();
    }
  });
}

function startCloudSync(tenantId){
  if(cloudRef) return; // ya conectado
  try{
    cloudRef = firebase.database().ref('gastrogoan/tenants/' + tenantId + '/db');
    cloudRef.once('value').then(snap => {
      const val = snap.val();
      updateSyncBadge('online');
      if(val === null){
        // Nube vacía: subir los datos locales como punto de partida. Dos
        // dispositivos activando la misma licencia casi a la vez podían leer
        // AMBOS "nube vacía" aquí y subir sus datos por separado sin ninguna
        // coordinación — el segundo pushAllToCloud() sobrescribía
        // silenciosamente lo que el primero acababa de subir. Se usa una
        // transacción sobre un pequeño nodo aparte (no sobre toda la base de
        // datos, que puede pesar mucho y no conviene meter en una
        // transacción de Firebase) para que solo uno de los dos dispositivos
        // "reclame" de verdad la inicialización; el que pierde la carrera
        // espera un momento y se fusiona con lo que el ganador subió, en vez
        // de pisarlo.
        const initClaimRef = firebase.database().ref('gastrogoan/tenants/' + tenantId + '/initClaim');
        initClaimRef.transaction(current => current === null ? {ts: Date.now()} : undefined).then(result => {
          if(result.committed){
            lastSyncedSnapshot = {};
            pushAllToCloud();
            syncPublicMirror();
            attachCloudChildListeners();
          }else{
            setTimeout(() => waitForWinnerAfterLostRace(1), 1000);
          }
        }).catch(e => {
          recordSyncError(e);
          attachCloudChildListeners();
        });
      }else{
        mergeRemoteIntoLocal(val);
        attachCloudChildListeners();
      }
    }, err => {
      recordSyncError(err);
    });
    firebase.database().ref('.info/connected').on('value', s => {
      socketConnected = !!s.val();
      updateSyncBadge(socketConnected ? 'online' : 'offline');
    });
  }catch(e){
    recordSyncError(e);
  }
}

// Dónde vive la web pública de reservas y pedidos. Se publica en un sitio
// APARTE del panel (el panel en app.gastrogoan.com, la web pública en
// reservas.gastrogoan.com), y por eso hay que decirlo aquí: antes el enlace
// se deducía de dónde estuviera abierta la app, así que con los dos sitios
// separados habría generado app.gastrogoan.com/reservagastrogoan.html —
// que no existe, y el QR de todos los clientes habría dado error.
// Vacío = la web pública está junto al index.html (un solo sitio, y las
// pruebas en local, que es como se ha probado hasta ahora).
const PUBLIC_RESERVAS_BASE = 'https://reservas.gastrogoan.com/';
/* El que se ENSEÑA al hostelero y se convierte en QR: la versión corta,
   reservas.gastrogoan.com/casapaco, que es la que va a repartir a sus
   clientes y pegar en la puerta. Funciona gracias a la regla del archivo
   _redirects del sitio de reservas.

   Distinto de getPublicClientLink() a propósito: ese lleva siempre el
   nombre del archivo y siempre un '?' abierto porque hay cuatro sitios que
   le añaden parámetros detrás (el QR de cada mesa, el enlace de gestionar
   la reserva que va en el email, y la encuesta de satisfacción). Si esos
   partieran del enlace corto, quedaría un '&' colgando de una URL sin
   query y no abriría nada.

   Sin nombre corto elegido todavía, se devuelve el largo: es lo único que
   identifica el negocio. */
function getPublicClientLinkPretty(){
  const publicId = getPublicId();
  if(!publicId) return '';
  const slug = DB.business && DB.business.publicSlug;
  if(PUBLIC_RESERVAS_BASE && slug) return PUBLIC_RESERVAS_BASE + encodeURIComponent(slug);
  return getPublicClientLink();
}
function getPublicClientLink(){
  const publicId = getPublicId();
  if(!publicId) return '';
  // Siempre con el nombre del archivo y siempre con '?': hay sitios que le
  // añaden '&mesa=' (QR de mesa), '&res=' (email de la reserva) o '&nps=1'
  // (encuesta), y todos ellos dan por hecho que ya hay una query abierta.
  const base = (PUBLIC_RESERVAS_BASE || location.href.replace(/[^/]*$/, '')) + 'reservagastrogoan.html';
  const slug = DB.business && DB.business.publicSlug;
  return slug ? base + '?n=' + encodeURIComponent(slug) : base + '?neg=' + publicId;
}

// Enlace a "Gestionar mi reserva" (ver reservagastrogoan.html) para meter
// en el email de confirmación — vacío si la reserva no tiene publicToken
// (p.ej. una creada a mano desde el panel, que nunca pasó por la web
// pública y no tiene nada que gestionar ahí). Mismo dominio/base que
// getPublicClientLink(), con el token añadido aparte.
function getReservationManageLink(reservation){
  if(!reservation || !reservation.publicToken) return '';
  const base = getPublicClientLink();
  if(!base) return '';
  return base + '&res=' + encodeURIComponent(reservation.publicToken);
}

// Convierte lo que escriba el dueño en un slug válido para URL: minúsculas,
// sin acentos ni símbolos, palabras separadas por guiones.
function slugify(str){
  return (str || '')
    .toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Elige (o cambia) el nombre corto del enlace público del negocio
// (reservagastrogoan.html?n=nombre-elegido en vez del código automático).
// Se guarda en la plataforma compartida (gastrogoan/publicSlugs/{slug}) para
// comprobar que nadie más lo esté usando ya, y libera el anterior si había
// uno distinto.
async function savePublicSlug(){
  const input = document.getElementById('mn-public-slug');
  if(!input) return;
  const raw = input.value;
  const slug = slugify(raw);
  if(!slug){ showToast(t('mn.online.slugEmpty')); return; }
  const publicId = getPublicId();
  if(!publicId) return;
  const app = await getPlatformFirebaseApp();
  if(!app){ showToast(t('access.connectFailed')); return; }
  const ref = app.database().ref('gastrogoan/publicSlugs/' + slug);
  let snap;
  try{ snap = await ref.once('value'); }
  catch(e){ console.error('Error comprobando disponibilidad del enlace', e); showToast(t('access.connectFailed')); return; }
  const takenBy = snap.val();
  if(takenBy && takenBy !== publicId){ showToast(t('mn.online.slugTaken')); return; }
  const oldSlug = DB.business.publicSlug;
  try{
    await ref.set(publicId);
    if(oldSlug && oldSlug !== slug){
      app.database().ref('gastrogoan/publicSlugs/' + oldSlug).remove().catch(()=>{});
    }
  }catch(e){
    // La comprobación de arriba y esta escritura son dos pasos: entre medias,
    // otro negocio puede haberse quedado con el mismo nombre. Quien pierda la
    // carrera recibe un rechazo de las reglas, que sin esto se le contaba como
    // "no se pudo conectar" — y se quedaría reintentando sin entender que el
    // problema es que el nombre ya no está libre.
    let ocupado = false;
    try{
      const ahora = await ref.once('value');
      ocupado = !!ahora.val() && ahora.val() !== publicId;
    }catch(_){}
    console.error('Error guardando el enlace personalizado', e);
    showToast(t(ocupado ? 'mn.online.slugTaken' : 'access.connectFailed'));
    return;
  }
  DB.business.publicSlug = slug;
  saveDB();
  showToast(t('mn.online.slugSaved'));
  renderMiNegocio();
}

function renderOnlineCard(){
  const b = DB.business || {};
  if(!getTenantId()){
    return `
      <div class="card mn-grid-full" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> ${t('mn.online.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.needLicense')}</p>
      </div>
    `;
  }
  if(!getCloudConfig()){
    return `
      <div class="card mn-grid-full" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> ${t('mn.online.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.needCloud')}</p>
      </div>
    `;
  }
  const link = getPublicClientLinkPretty();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(link);
  const activeCartas = (typeof getActiveCartas === 'function') ? getActiveCartas() : [];
  const activeCartaLine = activeCartas.length
    ? `<p style="font-size:12.5px;margin-bottom:12px"><i class="ti ti-book-2"></i> ${t('mn.online.activeCartaLabel')}<strong>${activeCartas.map(c=>escapeHtml(tItem(c))).join(', ')}</strong></p>`
    : `<p style="font-size:12.5px;margin-bottom:12px;color:var(--brand-orange)"><i class="ti ti-alert-triangle"></i> ${t('mn.online.noActiveCarta')}</p>`;
  return `
    <div class="card mn-grid-full" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
      <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> ${t('mn.online.title')}</h3>
      <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.shareDesc')}${ (b.tiposServicio?.takeaway!==false || b.tiposServicio?.delivery!==false) ? ' '+t('mn.online.andOrder') : ''}${t('mn.online.shareDescEnd')}</p>
      ${activeCartaLine}
      <details style="margin-bottom:12px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--brand-orange)"><i class="ti ti-alert-triangle"></i> ${t('mn.online.hostingSummary')}</summary>
        <div style="margin-top:8px;background:var(--brand-cream);border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.6">
          ${t('mn.online.hostingP1')}<br><br>
          ${t('mn.online.hostingP2')}<br><br>
          ${t('mn.online.hostingP3')}<br><br>
          <i class="ti ti-book"></i> <strong>${t('mn.online.hostingTutorialLabel')}</strong> ${t('mn.online.hostingTutorialText')} <a href="tutorial-netlify.html" target="_blank" rel="noopener"><strong>tutorial-netlify.html</strong></a> ${t('mn.online.hostingTutorialSuffix')}
        </div>
      </details>
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <img src="${qrUrl}" alt="${t('mn.online.qrAlt')}" style="width:140px;height:140px;border-radius:10px;border:1px solid var(--border);background:#fff;padding:6px">
        <div style="flex:1;min-width:180px">
          <p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">${t('mn.online.printHint')}</p>
          <a class="btn btn-sm" style="width:100%;text-decoration:none;justify-content:center;display:inline-flex;margin-bottom:6px" href="${qrUrl}" download="qr-reservas.png"><i class="ti ti-download"></i> ${t('mn.online.downloadQr')}</a>
          <a class="btn btn-sm" style="width:100%;text-decoration:none;justify-content:center;display:inline-flex" href="${link}" target="_blank" rel="noopener"><i class="ti ti-eye"></i> ${t('mn.online.viewPage')}</a>
        </div>
      </div>
      <div class="field">
        <textarea id="mn-public-link" rows="2" readonly style="font-family:monospace;font-size:11px" onclick="this.select()">${link}</textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" style="flex:1" onclick="copyPublicLinkFrom('mn-public-link')"><i class="ti ti-copy"></i> ${t('mn.online.copyLink')}</button>
        <a class="btn btn-sm" style="flex:1;background:#188842;color:#fff;border-color:#188842;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent(t('mn.online.whatsappMsg').replace('${name}', b.name || t('mn.online.ourRestaurant')) + link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
      </div>
      <div class="field" style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">
        <label>${t('mn.online.slugLabel')}</label>
        <p style="font-size:12px;color:var(--muted);margin:-2px 0 8px">${t('mn.online.slugDesc')}</p>
        <div style="display:flex;gap:8px">
          <input type="text" id="mn-public-slug" placeholder="mi-restaurante" value="${escapeHtml(b.publicSlug||'')}" style="flex:1;font-family:monospace" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')">
          <button class="btn btn-sm btn-primary" onclick="savePublicSlug()">${t('common.save')}</button>
        </div>
      </div>
    </div>
  `;
}

// Genera un QR de auto-pedido por mesa (mismo enlace público + &mesa=ID) para
// que el cliente pida directamente desde su mesa sin esperar al camarero.
// Solo se muestra el nombre/etiqueta de cada mesa con un botón de descarga;
// el QR no se muestra en pantalla (se genera al vuelo solo para la descarga).
function renderTableQrCard(){
  if((DB.business?.tiposServicio?.mesa === false) || !DB.tables.length) return '';
  if(!getTenantId()){
    return `
      <div class="card" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-qrcode"></i> ${t('mn.tableQr.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.tableQr.needLicense')}</p>
      </div>
    `;
  }
  if(!getCloudConfig()){
    return `
      <div class="card" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-qrcode"></i> ${t('mn.tableQr.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.tableQr.needCloud')}</p>
      </div>
    `;
  }
  const link = getPublicClientLink();
  if(!link) return '';
  // Un QR por cada mesa configurada en Mi Negocio, agrupados por zona. Se
  // usan las mismas zonas/orden que el TPV (incluidas las zonas propias que
  // el negocio haya creado en Operativa), en vez de una lista fija de
  // interior/terraza/barra que dejaba las zonas personalizadas en "Otras".
  const zonaKeys = [...getZonaOrder(), null];
  const zonasHtml = [...new Set(zonaKeys)].map(z => {
    const tables = DB.tables.filter(t => (t.zona||null) === z);
    if(!tables.length) return '';
    const label = z===null ? t('label.otherTables') : `<i class="ti ${zonaIconClass(z)}"></i> ${escapeHtml(zonaLabel(z))}`;
    return `
      <div style="margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">${label} (${tables.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${tables.map(t => `<button class="btn btn-sm" style="font-size:12px;padding:4px 10px" onclick="showTableQr(${t.id})"><i class="ti ti-qrcode"></i> ${escapeHtml(t.name)}</button>`).join('')}
        </div>
      </div>`;
  }).join('');
  return `
    <div class="card">
      <h3><i class="ti ti-qrcode"></i> ${t('mn.tableQr.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.tableQr.desc').replace('${count}', DB.tables.length)}</p>
      ${zonasHtml}
    </div>
  `;
}

function showTableQr(tableId){
  const tbl = DB.tables.find(x => x.id === tableId);
  const link = getPublicClientLink();
  if(!tbl || !link) return;
  const tLink = `${link}&mesa=${tbl.id}`;
  const tQr = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(tLink);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-qrcode"></i> ${escapeHtml(tbl.name)}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <div style="text-align:center">
      <img src="${tQr}" alt="QR ${escapeHtml(tbl.name)}" style="width:240px;height:240px;border:1px solid var(--border);border-radius:8px">
      <p style="font-size:13px;color:var(--muted);margin:10px 0">${t('mn.tableQr.scanHint').replace('${table}', `<strong>${escapeHtml(tbl.name)}</strong>`)}</p>
      <a class="btn btn-primary" style="text-decoration:none;display:inline-flex" href="${tQr}" download="qr-${escapeHtml(tbl.name).replace(/\s+/g,'-')}.png"><i class="ti ti-download"></i> ${t('mn.online.downloadQr')}</a>
    </div>
  `);
}

/* ============================================================
   CONFIGURACIÓN DE PEDIDOS PARA LLEVAR / DOMICILIO
   - Tiempo mínimo de antelación para recoger/recibir el pedido.
   - Coste de envío y zona de reparto (códigos postales y/o radio en
     km calculado a partir de la dirección del negocio mediante el
     servicio gratuito de geocodificación de OpenStreetMap/Nominatim).
   ============================================================ */
function renderPedidosConfigCard(){
  const b = DB.business || {};
  if(b.tiposServicio?.takeaway === false && b.tiposServicio?.delivery === false) return '';
  const p = b.pedidos || {};
  const deliveryEnabled = b.tiposServicio?.delivery !== false;
  return `
    <div class="card">
      <h3><i class="ti ti-clock-hour-4"></i> ${t('mn.pedidos.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:6px"><i class="ti ti-info-circle"></i> ${t('mn.pedidos.leadTimeInfo')}</p>
      <div class="field-row">
        <div class="field">
          <label>${t('mn.pedidos.tiempoBase')}</label>
          <input type="number" id="mn-tiempobase" min="0" step="5" value="${escapeHtml(p.tiempoBasePrep!=null?p.tiempoBasePrep:15)}" placeholder="15">
        </div>
        <div class="field">
          <label>${t('mn.pedidos.extraPorPedido')}</label>
          <input type="number" id="mn-extraporpedido" min="0" step="1" value="${escapeHtml(p.extraPorPedidoEnCola!=null?p.extraPorPedidoEnCola:3)}" placeholder="3">
        </div>
        <div class="field">
          <label>${t('mn.pedidos.tiempoMax')}</label>
          <input type="number" id="mn-tiempomax" min="0" step="5" value="${escapeHtml(p.tiempoMaxEstimado!=null?p.tiempoMaxEstimado:60)}" placeholder="60">
        </div>
      </div>
      <p style="font-size:12px;color:var(--muted);margin:-6px 0 6px">${t('mn.pedidos.tiempoEstimadoDesc')}</p>
      <div class="field">
        <label>${t('mn.pedidos.cierreAntes')}</label>
        <input type="number" id="mn-cierreantes" min="0" step="5" value="${escapeHtml(p.cierrePedidosAntesMin||0)}" placeholder="0">
        <small style="color:var(--muted)">${t('mn.pedidos.cierreAntesDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.pedidos.minOrder')}</label>
        <input type="number" id="mn-pedidominimo" min="0" step="0.5" value="${escapeHtml(p.pedidoMinimo||0)}" placeholder="10">
        <small style="color:var(--muted)">${t('mn.pedidos.minOrderDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.pedidos.maxPorFranja')}</label>
        <input type="number" id="mn-maxporfranja" min="0" step="1" value="${escapeHtml(p.maxPorFranja||0)}" placeholder="0">
        <small style="color:var(--muted)">${t('mn.pedidos.maxPorFranjaDesc')}</small>
      </div>
      ${deliveryEnabled ? `
      <div class="field">
        <label>${t('mn.pedidos.maxParadasRuta')}</label>
        <input type="number" id="mn-maxparadasruta" min="0" step="1" value="${escapeHtml(p.maxParadasPorRuta!=null?p.maxParadasPorRuta:4)}" placeholder="4">
        <small style="color:var(--muted)">${t('mn.pedidos.maxParadasRutaDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.pedidos.ventanaRuta')}</label>
        <input type="number" id="mn-ventanaruta" min="0" step="5" value="${escapeHtml(p.ventanaRutaMin!=null?p.ventanaRutaMin:30)}" placeholder="30">
        <small style="color:var(--muted)">${t('mn.pedidos.ventanaRutaDesc')}</small>
      </div>
      ` : ''}
      <div class="field">
        <label>${t('mn.pedidos.metodosLocales')}</label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:4px">
          <input type="checkbox" id="mn-acepta-efectivo" ${p.aceptaEfectivo!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.pedidos.aceptaEfectivo')}
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:400;margin-bottom:4px">
          <input type="checkbox" id="mn-acepta-tarjeta-local" ${p.aceptaTarjetaLocal!==false?'checked':''} style="width:18px;height:18px"> ${t('mn.pedidos.aceptaTarjetaLocal')}
        </label>
        <label style="display:flex;align-items:center;gap:8px;font-weight:400" id="mn-acepta-tpv-virtual-label">
          <input type="checkbox" id="mn-acepta-tpv-virtual" ${(p.aceptaTpvVirtual!==false && redsysIsConfigured)?'checked':''} ${redsysIsConfigured?'':'disabled'} style="width:18px;height:18px"> ${t('mn.pedidos.aceptaTpvVirtual')}
        </label>
        <small style="color:var(--muted)">${t('mn.pedidos.metodosLocalesDesc')}</small>
        <small id="mn-acepta-tpv-virtual-hint" style="display:block;color:${redsysIsConfigured?'var(--muted)':'var(--brand-orange)'}">${redsysIsConfigured ? '' : t('mn.pedidos.aceptaTpvVirtualHint')}</small>
      </div>
      ${deliveryEnabled ? `
      <div class="field-row">
        <div class="field">
          <label>${t('mn.pedidos.deliveryFee')}</label>
          <input type="number" id="mn-deliveryfee" min="0" step="0.5" value="${escapeHtml(p.deliveryFee||0)}" placeholder="3.00">
        </div>
        <div class="field">
          <label>${t('mn.pedidos.freeDeliveryFrom')}</label>
          <input type="number" id="mn-freedeliveryfrom" min="0" step="1" value="${escapeHtml(p.freeDeliveryFrom||'')}" placeholder="${t('mn.pedidos.freeDeliveryFromPh')}">
          <small style="color:var(--muted)">${t('mn.pedidos.freeDeliveryFromDesc')}</small>
        </div>
      </div>
      <div class="field">
        <label>${t('mn.pedidos.cpList')}</label>
        <textarea id="mn-cplist" placeholder="28001, 28002, 28003">${escapeHtml((p.cpList||[]).join(', '))}</textarea>
        <small style="color:var(--muted)">${t('mn.pedidos.cpListDesc')}</small>
      </div>
      <div class="field">
        <label>${t('mn.pedidos.radius')}</label>
        <input type="number" id="mn-radiuskm" min="0" step="0.5" value="${escapeHtml(p.radiusKm||0)}" placeholder="5">
        <small style="color:var(--muted)">${t('mn.pedidos.radiusDesc')}</small>
      </div>
      ${p.lat!=null ? `<p style="font-size:12px;color:var(--muted)"><i class="ti ti-map-pin"></i> ${t('mn.pedidos.locationCalculated')}: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</p>` : ''}
      <p style="font-size:12px;color:var(--muted)">${t('mn.pedidos.matchExplain')}</p>
      ` : ''}
      <button class="btn btn-primary" onclick="savePedidosConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
    </div>
  `;
}

async function savePedidosConfig(){
  const b = DB.business;
  const p = b.pedidos || {};
  p.pedidoMinimo = Math.max(0, parseFloat(document.getElementById('mn-pedidominimo').value) || 0);
  p.tiempoBasePrep = Math.max(0, parseInt(document.getElementById('mn-tiempobase').value) || 0);
  p.extraPorPedidoEnCola = Math.max(0, parseInt(document.getElementById('mn-extraporpedido').value) || 0);
  p.tiempoMaxEstimado = Math.max(0, parseInt(document.getElementById('mn-tiempomax').value) || 0);
  p.cierrePedidosAntesMin = Math.max(0, parseInt(document.getElementById('mn-cierreantes').value) || 0);
  p.maxPorFranja = Math.max(0, parseInt(document.getElementById('mn-maxporfranja').value) || 0);
  const maxParadasEl = document.getElementById('mn-maxparadasruta');
  if(maxParadasEl) p.maxParadasPorRuta = Math.max(0, parseInt(maxParadasEl.value) || 0);
  const ventanaRutaEl = document.getElementById('mn-ventanaruta');
  if(ventanaRutaEl) p.ventanaRutaMin = Math.max(0, parseInt(ventanaRutaEl.value) || 0);
  const aceptaEfectivo = document.getElementById('mn-acepta-efectivo').checked;
  const aceptaTarjetaLocal = document.getElementById('mn-acepta-tarjeta-local').checked;
  // Por mucho que llegara marcado desde el DOM, el TPV virtual solo se
  // guarda como aceptado si de verdad está configurado (evita ofrecerlo a
  // los clientes sin que funcione realmente).
  const aceptaTpvVirtual = redsysIsConfigured && document.getElementById('mn-acepta-tpv-virtual').checked;
  if(!aceptaEfectivo && !aceptaTarjetaLocal && !aceptaTpvVirtual){
    showToast(t('msg.needOnePaymentMethod'));
    return;
  }
  p.aceptaEfectivo = aceptaEfectivo;
  p.aceptaTarjetaLocal = aceptaTarjetaLocal;
  p.aceptaTpvVirtual = aceptaTpvVirtual;
  // Las 3 casillas de arriba son ahora la única fuente de verdad de qué
  // formas de pago se ofrecen — el antiguo interruptor "permitirPagoLocal"
  // (todo o nada: pago en persona sí/no) queda fijado a true para que no
  // siga anulando en silencio lo que el dueño acaba de marcar aquí.
  p.permitirPagoLocal = true;

  const deliveryFeeEl = document.getElementById('mn-deliveryfee');
  if(deliveryFeeEl){
    p.deliveryFee = Math.max(0, parseFloat(document.getElementById('mn-deliveryfee').value) || 0);
    // 0 o vacío = sin umbral de envío gratis, se cobra siempre el envío fijo.
    const freeDeliveryFromEl = document.getElementById('mn-freedeliveryfrom');
    p.freeDeliveryFrom = freeDeliveryFromEl ? (Math.max(0, parseFloat(freeDeliveryFromEl.value) || 0) || null) : null;
    p.cpList = document.getElementById('mn-cplist').value.split(',').map(s=>s.trim()).filter(Boolean);
    const radiusKm = Math.max(0, parseFloat(document.getElementById('mn-radiuskm').value) || 0);
    p.radiusKm = radiusKm;
    if(radiusKm > 0 && b.address){
      showToast(t('msg.calculatingLocation'));
      try{
        const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(b.address));
        const data = await res.json();
        if(data && data[0]){
          p.lat = parseFloat(data[0].lat);
          p.lng = parseFloat(data[0].lon);
        }else{
          showToast(t('msg.locationError'));
        }
      }catch(e){
        showToast(t('msg.locationNetError'));
      }
    }else if(radiusKm === 0){
      p.lat = null; p.lng = null;
    }
  }

  b.pedidos = p;
  saveDB();
  renderMiNegocio();
  showToast(t('msg.orderConfigSaved'));
}

/* ============================================================
   TPV VIRTUAL (Redsys) - cobro online con tarjeta
   El dinero va directo a la cuenta bancaria del negocio (TPV virtual
   de su propio banco). La clave secreta de Redsys nunca se guarda en
   este dispositivo ni en el navegador del cliente: se envía una sola
   vez al Worker, que la guarda en una ruta privada de Firebase y la
   usa para firmar los pagos y validar la confirmación de Redsys.
   ============================================================ */
// Se sabe de forma asíncrona (loadRedsysCardStatus consulta al Worker), así
// que el checkbox "TPV virtual" de renderPedidosConfigCard arranca
// deshabilitado por defecto y se habilita en cuanto se confirma que sí está
// configurado — evita que se pueda marcar como forma de pago aceptada algo
// que en realidad no funcionaría para los clientes.
let redsysIsConfigured = false;
function updateTpvVirtualCheckboxAvailability(){
  const cb = document.getElementById('mn-acepta-tpv-virtual');
  const hint = document.getElementById('mn-acepta-tpv-virtual-hint');
  if(!cb) return;
  cb.disabled = !redsysIsConfigured;
  const p = (DB.business && DB.business.pedidos) || {};
  cb.checked = redsysIsConfigured && p.aceptaTpvVirtual !== false;
  if(hint){
    hint.style.color = redsysIsConfigured ? 'var(--muted)' : 'var(--brand-orange)';
    hint.textContent = redsysIsConfigured ? '' : t('mn.pedidos.aceptaTpvVirtualHint');
  }
}
// Igual que arriba, pero para la casilla "Pedir señal para confirmar
// reservas" (Mi Negocio → Operativa): la señal se cobra a través del TPV
// virtual, así que no tiene sentido poder activarla sin él conectado.
function updateDepositCheckboxAvailability(){
  const cb = document.getElementById('mn-require-deposit');
  const hint = document.getElementById('mn-require-deposit-hint');
  if(!cb) return;
  cb.disabled = !redsysIsConfigured;
  cb.checked = redsysIsConfigured && !!(DB.business && DB.business.requireDeposit);
  if(hint){
    hint.style.color = redsysIsConfigured ? 'var(--muted)' : 'var(--brand-orange)';
    hint.textContent = redsysIsConfigured ? t('mn.ops.requireDepositDesc') : t('mn.ops.requireDepositNeedsRedsys');
  }
}
// Resumen a la vista de las 3 conexiones externas que la app puede usar
// (cada una un servicio de fuera, con su propia cuenta que conecta el
// negocio): nube propia (Firebase, obligatoria para trabajar en equipo),
// cobro con tarjeta online (Redsys, opcional) y confirmación de reservas
// por email (EmailJS, opcional). Antes cada una vivía en su rincón de Mi
// Negocio sin que quedara claro que son la misma "familia" de configuración
// externa — este resumen las agrupa y dice de un vistazo cuáles están
// conectadas.
function renderExternalConnectionsCard(){
  const fbConnected = !!(DB.business && DB.business.ownFirebase);
  const redsysConnected = !!redsysIsConfigured;
  const emailConnected = !!(DB.business && DB.business.emailConfirm && DB.business.emailConfirm.enabled);
  const row = (icon, label, connected, onclick, withBorder) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${withBorder ? 'border-bottom:1px solid var(--border)' : ''}">
      <i class="ti ${icon}" style="font-size:18px;color:var(--muted);flex-shrink:0"></i>
      <span style="flex:1;font-size:13.5px">${label}</span>
      <span class="badge ${connected?'badge-green':'badge-gray'}">${connected ? t('mn.externalConn.connected') : t('mn.externalConn.notConnected')}</span>
      <button class="btn btn-sm" onclick="${onclick}">${connected ? t('common.edit') : t('common.connect')}</button>
    </div>
  `;
  return `
    <div class="card mn-grid-full">
      <h3><i class="ti ti-plug-connected"></i> ${t('mn.externalConn.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:6px">${t('mn.externalConn.desc')}</p>
      ${row('ti-cloud', t('mn.externalConn.firebase'), fbConnected, 'openCloudWizard()', !fbConnected)}
      ${fbConnected ? `<p style="font-size:12px;color:var(--muted);margin:8px 0 8px 28px;padding-bottom:8px;line-height:1.5;border-bottom:1px solid var(--border)"><i class="ti ti-cloud"></i> ${t('mn.externalConn.firebaseBackupNote')}</p>` : ''}
      ${row('ti-credit-card', t('mn.externalConn.redsys'), redsysConnected, "scrollToMnCard('mn-card-redsys')", true)}
      ${row('ti-mail-check', t('mn.externalConn.email'), emailConnected, "scrollToMnCard('mn-card-email')", true)}
    </div>
  `;
}
function scrollToMnCard(id){
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

function renderRedsysCard(){
  if(!getTenantId()) return '';
  return `
    <div class="card" id="mn-card-redsys">
      <h3><i class="ti ti-credit-card"></i> ${t('mn.redsys.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.redsys.desc')}</p>
      <div id="redsys-status" style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.redsys.checking')}</div>
      <div class="field">
        <label>${t('mn.redsys.merchantCode')}</label>
        <input type="text" id="rs-fuc" placeholder="999008881" style="font-family:monospace">
      </div>
      <div class="field">
        <label>${t('mn.redsys.terminal')}</label>
        <input type="text" id="rs-terminal" placeholder="1" style="font-family:monospace;max-width:120px">
      </div>
      <div class="field">
        <label>${t('mn.redsys.secretKey')}</label>
        <input type="password" id="rs-clave" placeholder="${t('mn.redsys.secretKeyPh')}" style="font-family:monospace">
        <small style="color:var(--muted)">${t('mn.redsys.secretKeyHint')}</small>
      </div>
      <div class="field" style="margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="rs-real" style="width:18px;height:18px"> ${t('mn.redsys.realEnv')}
        </label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveRedsysConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
        <button class="btn btn-sm btn-danger" onclick="disableRedsysConfig()"><i class="ti ti-plug-connected-x"></i> ${t('mn.redsys.disable')}</button>
      </div>
    </div>
  `;
}

async function loadRedsysCardStatus(){
  const el = document.getElementById('redsys-status');
  if(!el || !getTenantId()) return;
  try{
    const res = await fetch(`${REDSYS_WORKER_URL}/config?tenantId=${encodeURIComponent(getTenantId())}`);
    const data = await res.json();
    redsysIsConfigured = !!(data && data.configured);
    if(data && data.configured){
      el.innerHTML = `<span style="color:var(--brand-orange);font-weight:600"><i class="ti ti-check"></i> ${t('mn.redsys.configured')}</span> · FUC ${escapeHtml(data.fuc)} · ${t('mn.redsys.terminal')} ${escapeHtml(data.terminal)} · ${t('mn.redsys.environment')} ${data.ambiente === 'real' ? t('mn.redsys.envReal') : t('mn.redsys.envTest')}`;
      document.getElementById('rs-fuc').value = data.fuc || '';
      document.getElementById('rs-terminal').value = data.terminal || '';
      document.getElementById('rs-real').checked = data.ambiente === 'real';
    }else{
      el.innerHTML = t('msg.cardPaymentNotConfigured');
    }
  }catch(e){
    redsysIsConfigured = false;
    el.innerHTML = t('msg.cardPaymentCheckFailed');
  }
  updateTpvVirtualCheckboxAvailability();
  updateDepositCheckboxAvailability();
}

async function saveRedsysConfig(){
  const fuc = document.getElementById('rs-fuc').value.trim();
  const terminal = document.getElementById('rs-terminal').value.trim();
  const claveSecreta = document.getElementById('rs-clave').value.trim();
  const ambiente = document.getElementById('rs-real').checked ? 'real' : 'test';
  if(!fuc || !terminal){ showToast(t('msg.fillMerchantCode')); return; }
  if(!claveSecreta){ showToast(t('msg.fillSecretKey')); return; }
  try{
    const res = await fetch(`${REDSYS_WORKER_URL}/config`, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ tenantId: getTenantId(), fuc, terminal, claveSecreta, ambiente })
    });
    const data = await res.json();
    if(!res.ok || data.error){ showToast(data.error || 'Error al guardar'); return; }
    document.getElementById('rs-clave').value = '';
    showToast(t('msg.payConfigSaved'));
    loadRedsysCardStatus();
  }catch(e){
    showToast(t('msg.payConfigError'));
  }
}

// Desactiva el cobro con tarjeta: no hay un endpoint de borrado dedicado en
// el Worker, así que reenviamos la config marcándola como inactiva (mismo
// endpoint /config) y, pase lo que pase con la llamada, limpiamos los campos
// y el estado en pantalla para que quede claro que ya no está configurado.
async function disableRedsysConfig(){
  if(!(await confirmModal(t('mn.redsys.confirmDisable')))) return;
  try{
    await fetch(`${REDSYS_WORKER_URL}/config`, {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({ tenantId: getTenantId(), fuc:'', terminal:'', claveSecreta:'', ambiente:'test', disabled:true })
    });
  }catch(e){
    showToast(t('mn.redsys.disableError'));
  }
  ['rs-fuc','rs-terminal','rs-clave'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  const realEl = document.getElementById('rs-real'); if(realEl) realEl.checked = false;
  const el = document.getElementById('redsys-status');
  if(el) el.innerHTML = t('msg.cardPaymentNotConfigured');
  redsysIsConfigured = false;
  // Si el TPV virtual estaba marcado como forma de pago aceptada, se
  // desmarca aquí mismo: si no, la web pública seguiría ofreciéndoselo a
  // los clientes aunque ya no funcione de verdad.
  if(DB.business && DB.business.pedidos && DB.business.pedidos.aceptaTpvVirtual !== false){
    DB.business.pedidos.aceptaTpvVirtual = false;
    saveDB();
  }
  // Misma razón que arriba: sin TPV virtual no hay forma de cobrar la señal,
  // así que se desactiva para no dejar una reserva pidiendo un pago que ya
  // no se puede completar.
  if(DB.business && DB.business.requireDeposit){
    DB.business.requireDeposit = false;
    saveDB();
  }
  updateTpvVirtualCheckboxAvailability();
  updateDepositCheckboxAvailability();
  showToast(t('mn.redsys.disabled'));
}

// Confirmación de reservas por email: como el negocio no tiene backend
// propio, se envía directamente desde el navegador vía EmailJS (servicio
// gratuito hasta cierto volumen), cargando su SDK solo si hace falta — así
// el negocio que no lo use no paga el coste de cargarlo en vano. Cada
// negocio usa su propia cuenta (serviceId/templateId/publicKey), igual que
// con Firebase o Redsys: no hay ninguna cuenta compartida de GastroGoan.
let emailjsSdkPromise = null;
function loadEmailjsSdk(){
  if(emailjsSdkPromise) return emailjsSdkPromise;
  emailjsSdkPromise = new Promise((resolve, reject) => {
    if(window.emailjs){ resolve(window.emailjs); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => resolve(window.emailjs);
    s.onerror = () => reject(new Error('No se pudo cargar EmailJS'));
    document.head.appendChild(s);
  });
  return emailjsSdkPromise;
}

/* Guía paso a paso para configurar EmailJS, pensada para alguien sin
   ningún conocimiento técnico: se abre en un modal desde la tarjeta de
   "Confirmación, cancelación y cambios de reserva por email" en Mi Negocio.
   Mismo patrón visual que FIREBASE_GATE_STEPS (círculo numerado + texto). */
const EMAILJS_GUIDE_STEPS = [
  {title:{es:'Crea tu cuenta gratis en EmailJS', ca:'Crea el teu compte gratuït a EmailJS', en:'Create your free EmailJS account'},
   body:{
     es:`Entra en <code>emailjs.com</code> y pulsa <strong>"Sign Up"</strong> (arriba a la derecha). Regístrate con tu email y confírmalo si te lo pide.<br><br>
        <span style="color:var(--muted)">Es gratis hasta 200 emails al mes, de sobra para un restaurante normal.</span>`,
     ca:`Entra a <code>emailjs.com</code> i prem <strong>"Sign Up"</strong> (a dalt a la dreta). Registra't amb el teu email i confirma'l si t'ho demana.<br><br>
        <span style="color:var(--muted)">És gratuït fins a 200 emails al mes, de sobres per a un restaurant normal.</span>`,
     en:`Go to <code>emailjs.com</code> and click <strong>"Sign Up"</strong> (top right). Register with your email and confirm it if asked.<br><br>
        <span style="color:var(--muted)">It's free up to 200 emails a month, plenty for a normal restaurant.</span>`}},
  {title:{es:'Conecta tu email', ca:'Connecta el teu email', en:'Connect your email'},
   body:{
     es:`En el menú de la izquierda, entra en <strong>"Email Services"</strong> y pulsa <strong>"Add New Email Service"</strong>. Elige tu proveedor (Gmail, Outlook…) y sigue los pasos para darle permiso.<br><br>
        Al terminar verás un código como <code>service_xxxxxxx</code>. <strong>Cópialo</strong>: es tu <strong>Service ID</strong>.`,
     ca:`Al menú de l'esquerra, entra a <strong>"Email Services"</strong> i prem <strong>"Add New Email Service"</strong>. Tria el teu proveïdor (Gmail, Outlook…) i segueix els passos per donar-li permís.<br><br>
        En acabar veuràs un codi com <code>service_xxxxxxx</code>. <strong>Copia'l</strong>: és el teu <strong>Service ID</strong>.`,
     en:`In the left menu, open <strong>"Email Services"</strong> and click <strong>"Add New Email Service"</strong>. Choose your provider (Gmail, Outlook…) and follow the steps to grant access.<br><br>
        When it's done you'll see a code like <code>service_xxxxxxx</code>. <strong>Copy it</strong>: it's your <strong>Service ID</strong>.`}},
  {title:{es:'Crea la plantilla de "Reserva confirmada"', ca:'Crea la plantilla de "Reserva confirmada"', en:'Create the "Reservation confirmed" template'},
   body:{
     es:`Ve a <strong>"Email Templates"</strong> → <strong>"Create New Template"</strong>. En "To Email" escribe <code>{{to_email}}</code>. En el asunto y el cuerpo, pega esto (no borres las palabras entre llaves, la app las rellena sola):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hola {{client_name}},

Tu reserva en {{business_name}} está confirmada:
Fecha: {{date}}  Hora: {{time}}  Personas: {{people}}  Mesa: {{table_name}}

Si quieres cambiar la hora o cancelar, hazlo aquí: {{manage_link}}</div>
        Guarda y copia el código <code>template_xxxxxxx</code> que aparece: es tu <strong>Template ID de confirmación</strong>.`,
     ca:`Vés a <strong>"Email Templates"</strong> → <strong>"Create New Template"</strong>. A "To Email" escriu <code>{{to_email}}</code>. A l'assumpte i al cos, enganxa això (no esborris les paraules entre claus, l'app les omple sola):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hola {{client_name}},

La teva reserva a {{business_name}} està confirmada:
Data: {{date}}  Hora: {{time}}  Persones: {{people}}  Taula: {{table_name}}

Si vols canviar l'hora o cancel·lar, fes-ho aquí: {{manage_link}}</div>
        Desa i copia el codi <code>template_xxxxxxx</code> que apareix: és el teu <strong>Template ID de confirmació</strong>.`,
     en:`Go to <strong>"Email Templates"</strong> → <strong>"Create New Template"</strong>. In "To Email" type <code>{{to_email}}</code>. In the subject and body, paste this (don't remove the words in curly braces, the app fills them in automatically):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hi {{client_name}},

Your reservation at {{business_name}} is confirmed:
Date: {{date}}  Time: {{time}}  People: {{people}}  Table: {{table_name}}

To change the time or cancel, do it here: {{manage_link}}</div>
        Save it and copy the <code>template_xxxxxxx</code> code shown: it's your <strong>confirmation Template ID</strong>.`}},
  {title:{es:'Crea la plantilla de "Reserva cancelada"', ca:'Crea la plantilla de "Reserva cancel·lada"', en:'Create the "Reservation cancelled" template'},
   body:{
     es:`Repite lo mismo: <strong>"Create New Template"</strong> otra vez, "To Email" = <code>{{to_email}}</code>, y en el cuerpo algo como:<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hola {{client_name}},

Tu reserva en {{business_name}} ha sido cancelada.</div>
        Guarda y copia su código <code>template_xxxxxxx</code>: es tu <strong>Template ID de cancelación</strong> (distinto del de confirmación).`,
     ca:`Repeteix el mateix: <strong>"Create New Template"</strong> una altra vegada, "To Email" = <code>{{to_email}}</code>, i al cos alguna cosa com:<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hola {{client_name}},

La teva reserva a {{business_name}} ha estat cancel·lada.</div>
        Desa i copia el seu codi <code>template_xxxxxxx</code>: és el teu <strong>Template ID de cancel·lació</strong> (diferent del de confirmació).`,
     en:`Repeat the same thing: <strong>"Create New Template"</strong> again, "To Email" = <code>{{to_email}}</code>, and in the body something like:<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11.5px;white-space:pre-wrap;margin-bottom:8px">Hi {{client_name}},

Your reservation at {{business_name}} has been cancelled.</div>
        Save it and copy its <code>template_xxxxxxx</code> code: it's your <strong>cancellation Template ID</strong> (different from the confirmation one).`}},
  {title:{es:'Copia tu "Public Key"', ca:'Copia la teva "Public Key"', en:'Copy your "Public Key"'},
   body:{
     es:`Pulsa tu icono (arriba a la derecha) → <strong>"Account"</strong>. Ahí verás un código como <code>AbCdEfGhIjK123</code>. Cópialo: es tu <strong>Public Key</strong>.`,
     ca:`Prem la teva icona (a dalt a la dreta) → <strong>"Account"</strong>. Allà veuràs un codi com <code>AbCdEfGhIjK123</code>. Copia'l: és la teva <strong>Public Key</strong>.`,
     en:`Click your icon (top right) → <strong>"Account"</strong>. You'll see a code like <code>AbCdEfGhIjK123</code>. Copy it: it's your <strong>Public Key</strong>.`}},
  {title:{es:'Pégalo todo aquí y prueba', ca:'Enganxa-ho tot aquí i prova-ho', en:'Paste it all here and test it'},
   body:{
     es:`Cierra esta guía, marca <strong>"Activar"</strong> más abajo y pega los 4 códigos, cada uno en su campo. Guarda y pulsa <strong>"Enviar prueba"</strong> (hay uno para confirmación y otro para cancelación) con tu propio email, para comprobar que llega bien.<br><br>
        <span style="color:var(--muted)">Si te llega el email de prueba con los datos rellenados, ya está todo funcionando: cada cliente que reserve recibirá el suyo automáticamente.</span>`,
     ca:`Tanca aquesta guia, marca <strong>"Activar"</strong> més avall i enganxa els 4 codis, cadascun al seu camp. Desa i prem <strong>"Enviar prova"</strong> (n'hi ha un per a confirmació i un altre per a cancel·lació) amb el teu propi email, per comprovar que arriba bé.<br><br>
        <span style="color:var(--muted)">Si et arriba l'email de prova amb les dades emplenades, ja tot funciona: cada client que reservi rebrà el seu automàticament.</span>`,
     en:`Close this guide, check <strong>"Enable"</strong> below and paste the 4 codes, each in its field. Save and click <strong>"Send test"</strong> (there's one for confirmation and one for cancellation) with your own email, to check it arrives fine.<br><br>
        <span style="color:var(--muted)">If the test email arrives with the details filled in, everything is working: every customer who books will get theirs automatically.</span>`}},
];
function showEmailJsGuideModal(){
  const step = (n, title, body) => `
    <div style="display:flex;gap:12px;margin-bottom:18px">
      <div style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${n}</div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:13.5px;margin-bottom:4px">${title}</p>
        <div style="font-size:13px;color:#444;line-height:1.6">${body}</div>
      </div>
    </div>`;
  const stepsHtml = EMAILJS_GUIDE_STEPS.map((s,i) => step(i+1, gl(s.title), gl(s.body))).join('\n');
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-mail-check"></i> ${t('mn.emailConfirm.guideTitle')}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
    <p style="font-size:13px;color:var(--muted);margin-bottom:16px">${t('mn.emailConfirm.guideIntro')}</p>
    ${stepsHtml}
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">${t('mn.emailConfirm.guideDone')}</button></div>
  `);
}

function renderEmailConfirmCard(){
  const cfg = (DB.business && DB.business.emailConfirm) || {};
  return `
    <div class="card" id="mn-card-email">
      <h3><i class="ti ti-mail-check"></i> ${t('mn.emailConfirm.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.emailConfirm.desc')}</p>
      <button class="btn btn-sm" style="margin-bottom:14px" onclick="showEmailJsGuideModal()"><i class="ti ti-help-circle"></i> ${t('mn.emailConfirm.guideBtn')}</button>
      <div class="field">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="ec-enabled" style="width:18px;height:18px" ${cfg.enabled?'checked':''}> ${t('mn.emailConfirm.enable')}
        </label>
      </div>
      <div class="field">
        <label>Service ID</label>
        <input type="text" id="ec-service" placeholder="service_xxxxxxx" value="${escapeHtml(cfg.serviceId||'')}" style="font-family:monospace">
      </div>
      <div class="field">
        <label>Template ID (${t('mn.emailConfirm.confirmationLabel')})</label>
        <input type="text" id="ec-template" placeholder="template_xxxxxxx" value="${escapeHtml(cfg.templateId||'')}" style="font-family:monospace">
        <small style="color:var(--muted)">${t('mn.emailConfirm.templateHint')}</small>
      </div>
      <div class="field">
        <label>Template ID (${t('mn.emailConfirm.cancelLabel')})</label>
        <input type="text" id="ec-cancel-template" placeholder="template_xxxxxxx" value="${escapeHtml(cfg.cancelTemplateId||'')}" style="font-family:monospace">
        <small style="color:var(--muted)">${t('mn.emailConfirm.cancelTemplateHint')}</small>
      </div>
      <div class="field" style="margin-bottom:10px">
        <label>Public Key</label>
        <input type="text" id="ec-pubkey" placeholder="user_xxxxxxxxxxxxxxxx" value="${escapeHtml(cfg.publicKey||'')}" style="font-family:monospace">
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="saveEmailConfirmConfig()"><i class="ti ti-device-floppy"></i> ${t('common.save')}</button>
        <button class="btn btn-sm" onclick="testEmailConfirmConfig()"><i class="ti ti-send"></i> ${t('mn.emailConfirm.sendTest')}</button>
        <button class="btn btn-sm" onclick="testEmailCancelConfig()"><i class="ti ti-send"></i> ${t('mn.emailConfirm.sendCancelTest')}</button>
      </div>
      <div id="ec-test-status" style="font-size:12.5px;color:var(--muted);margin-top:8px"></div>
    </div>
  `;
}

function readEmailConfirmFormConfig(){
  return {
    enabled: document.getElementById('ec-enabled').checked,
    serviceId: document.getElementById('ec-service').value.trim(),
    templateId: document.getElementById('ec-template').value.trim(),
    cancelTemplateId: document.getElementById('ec-cancel-template').value.trim(),
    publicKey: document.getElementById('ec-pubkey').value.trim()
  };
}
function saveEmailConfirmConfig(){
  DB.business.emailConfirm = readEmailConfirmFormConfig();
  saveDB();
  showToast(t('msg.payConfigSaved'));
}

async function testEmailConfirmConfig(){
  const statusEl = document.getElementById('ec-test-status');
  const cfg = readEmailConfirmFormConfig();
  if(!cfg.serviceId || !cfg.templateId || !cfg.publicKey){ showToast(t('mn.emailConfirm.fillAllFields')); return; }
  const testTo = await promptText(t('mn.emailConfirm.testPrompt'), '');
  if(!testTo) return;
  statusEl.textContent = t('mn.emailConfirm.sending');
  try{
    await sendReservationConfirmationEmail({
      clientName: t('mn.emailConfirm.testClientName'), clientEmail: testTo,
      date: todayStr(), time: '20:00', people: 2, tableName: t('mn.emailConfirm.testTableName'),
      // Token de mentira solo para que la prueba muestre cómo queda el
      // enlace {{manage_link}} en la plantilla real — no apunta a ninguna
      // reserva de verdad.
      publicToken: 'prueba'
    }, cfg);
    statusEl.innerHTML = `<span style="color:var(--brand-orange)"><i class="ti ti-check"></i> ${t('mn.emailConfirm.testSent')}</span>`;
  }catch(e){
    statusEl.innerHTML = `<span style="color:var(--red)"><i class="ti ti-x"></i> ${t('mn.emailConfirm.testFailed')}: ${escapeHtml(e.message||'')}</span>`;
  }
}
async function testEmailCancelConfig(){
  const statusEl = document.getElementById('ec-test-status');
  const cfg = readEmailConfirmFormConfig();
  if(!cfg.serviceId || !cfg.cancelTemplateId || !cfg.publicKey){ showToast(t('mn.emailConfirm.fillAllFieldsCancel')); return; }
  const testTo = await promptText(t('mn.emailConfirm.testPrompt'), '');
  if(!testTo) return;
  statusEl.textContent = t('mn.emailConfirm.sending');
  try{
    await sendCancellationEmail(testTo, {
      type: t('mn.emailConfirm.type.reserva'), client_name: t('mn.emailConfirm.testClientName'),
      date: todayStr(), time: '20:00', people: 2
    }, cfg);
    statusEl.innerHTML = `<span style="color:var(--brand-orange)"><i class="ti ti-check"></i> ${t('mn.emailConfirm.testSent')}</span>`;
  }catch(e){
    statusEl.innerHTML = `<span style="color:var(--red)"><i class="ti ti-x"></i> ${t('mn.emailConfirm.testFailed')}: ${escapeHtml(e.message||'')}</span>`;
  }
}

// Dispara el email de confirmación de una reserva concreta. Se llama en dos
// momentos: justo al auto-confirmarse con mesa asignada, y cuando el
// personal confirma a mano una que se había quedado pendiente (mismo aviso
// para el cliente en los dos casos, porque para él es la misma noticia:
// "tu mesa ya está confirmada"). Si el negocio no tiene esto activado, o la
// reserva no trae email, no hace nada — no es un requisito, es un extra.
function sendReservationConfirmationEmail(reservation, overrideCfg){
  const cfg = overrideCfg || (DB.business && DB.business.emailConfirm);
  if(!cfg || (!overrideCfg && !cfg.enabled)) return Promise.resolve();
  if(!cfg.serviceId || !cfg.templateId || !cfg.publicKey) return Promise.resolve();
  if(!reservation || !reservation.clientEmail) return Promise.resolve();
  return loadEmailjsSdk().then(emailjs => {
    const params = {
      to_email: reservation.clientEmail,
      client_name: reservation.clientName || '',
      business_name: (DB.business && DB.business.name) || '',
      date: reservation.date || '',
      time: reservation.time || '',
      people: reservation.people || '',
      table_name: reservation.tableName || '',
      // Enlace a "Gestionar mi reserva" (cancelarla sin llamar) — el
      // negocio decide si lo muestra en su plantilla de EmailJS con
      // {{manage_link}}; viene vacío si la reserva no tiene token público
      // (p.ej. una creada a mano desde el panel).
      manage_link: getReservationManageLink(reservation)
    };
    return emailjs.send(cfg.serviceId, cfg.templateId, params, {publicKey: cfg.publicKey});
  });
}

// Mismo mecanismo que sendReservationConfirmationEmail, pero para avisar de
// una CANCELACIÓN — de una reserva o de un pedido para llevar/delivery, con
// una única plantilla compartida (cancelTemplateId) para no pedirle al
// negocio que configure una plantilla distinta por cada caso. La plantilla
// puede usar {{type}} ("reserva"/"pedido para llevar"/"pedido a domicilio")
// para adaptar el texto a cuál de los dos es.
function sendCancellationEmail(toEmail, params, overrideCfg){
  const cfg = overrideCfg || (DB.business && DB.business.emailConfirm);
  if(!cfg || (!overrideCfg && !cfg.enabled)) return Promise.resolve();
  if(!cfg.serviceId || !cfg.cancelTemplateId || !cfg.publicKey) return Promise.resolve();
  if(!toEmail) return Promise.resolve();
  return loadEmailjsSdk().then(emailjs => emailjs.send(cfg.serviceId, cfg.cancelTemplateId, {to_email: toEmail, business_name: (DB.business && DB.business.name) || '', ...params}, {publicKey: cfg.publicKey}));
}
function sendReservationCancellationEmail(reservation){
  return sendCancellationEmail(reservation && reservation.clientEmail, {
    type: t('mn.emailConfirm.type.reserva'),
    client_name: (reservation && reservation.clientName) || '',
    date: (reservation && reservation.date) || '',
    time: (reservation && reservation.time) || '',
    people: (reservation && reservation.people) || ''
  });
}
function sendOrderCancellationEmail(order){
  return sendCancellationEmail(order && order.clienteEmail, {
    type: order && order.tipo === 'delivery' ? t('mn.emailConfirm.type.delivery') : t('mn.emailConfirm.type.takeaway'),
    client_name: (order && order.clienteNombre) || '',
    date: (order && order.date) || '',
    time: (order && order.time) || '',
    people: ''
  });
}

function copyPublicLinkFrom(elId){
  const el = document.getElementById(elId);
  el.select();
  try{ navigator.clipboard.writeText(el.value); }catch(e){ document.execCommand('copy'); }
  showToast(t('msg.linkCopied'));
}

/* Formulario para introducir los datos del proyecto Firebase propio del
   negocio. Es el mismo formulario tanto si aún no está configurado
   (paso obligatorio para activar la nube) como si se quiere cambiar/quitar
   uno ya configurado. */
function renderOwnFirebaseForm(){
  return `
    <div class="field" style="margin-bottom:8px">
      <label style="font-size:12px">${t('gate.apiKeyLabel')}</label>
      <input id="own-fb-apikey" type="text" placeholder="AIza..." value="${(DB.business?.ownFirebase?.apiKey)||''}" style="font-family:monospace;font-size:12px">
    </div>
    <div class="field" style="margin-bottom:10px">
      <label style="font-size:12px">${t('gate.dbUrlLabel')}</label>
      <input id="own-fb-dburl" type="text" placeholder="https://xxxx-default-rtdb.firebaseio.com" value="${(DB.business?.ownFirebase?.databaseURL)||''}" style="font-family:monospace;font-size:12px">
    </div>
    <button class="btn" style="width:100%;justify-content:center" onclick="saveOwnFirebaseConfig()"><i class="ti ti-cloud-cog"></i> ${t('gate.saveAndConnect')}</button>
  `;
}

function openCloudWizard(){
  const lic = getLicense();
  if(!lic){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-cloud"></i> ${t('gate.cloudModalTitle')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="empty"><i class="ti ti-cloud-off"></i>${t('gate.needLicenseForCloud')}</div>
    `);
    return;
  }
  if(!getCloudConfig()){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-cloud"></i> ${t('gate.setupCloud')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px"><i class="ti ti-key"></i> ${t('gate.licenseActivatedFor')}: <strong>${lic.code}</strong></p>
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:14px">
        ${t('gate.cloudIntro')}
      </div>
      <p style="font-size:13px;margin-bottom:10px">${t('gate.tenMinutesIntro')}</p>
      <ol style="font-size:12.5px;line-height:1.7;margin:0 0 14px 18px;color:#444">
        <li>${t('gate.miniStep1')}</li>
        <li>${t('gate.miniStep2')}</li>
        <li>${t('gate.miniStep3')}</li>
        <li>${t('gate.miniStep4')}</li>
        <li>${t('gate.miniStep5')}</li>
        <li>${t('gate.miniStep6')}</li>
      </ol>
      ${renderOwnFirebaseForm()}
    `);
    return;
  }
  const link = getPublicClientLinkPretty();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(link);
  const otrosServicios = (DB.business?.tiposServicio?.takeaway !== false || DB.business?.tiposServicio?.delivery !== false) ? t('mn.online.andOrder') : '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cloud"></i> ${t('gate.cloudModalTitle')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px"><i class="ti ti-key"></i> ${t('gate.licenseActivatedFor')}: <strong>${lic.code}</strong></p>
    ${lastSyncBadgeState === 'error'
      ? `<div style="background:var(--red-l);color:var(--red);padding:12px 16px;border-radius:10px;font-weight:700;margin-bottom:14px"><i class="ti ti-cloud-off"></i> ${t('gate.cloudErrorLong')}${
          // Si Firebase dijo POR QUÉ falló, se enseña el paso concreto que
          // falta en vez de dejar al usuario adivinando entre seis pasos.
          syncErrorHintKey() ? `<div style="font-weight:400;font-size:13px;margin-top:8px;line-height:1.5">${t(syncErrorHintKey())}</div>` : ''
        }</div>`
      : `<div style="background:var(--green-l);color:var(--green);padding:12px 16px;border-radius:10px;font-weight:700;margin-bottom:14px"><i class="ti ti-cloud-check"></i> ${t('gate.cloudConnected')}</div>`}
    <p style="font-size:13.5px;margin-bottom:14px"><strong>${t('gate.connectMoreDevices')}</strong> ${t('gate.connectMoreDevicesBody').replace('${key}', `<code>${lic.code}</code>`)}</p>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <p style="font-size:13.5px;margin-bottom:8px"><strong><i class="ti ti-device-mobile"></i> ${t('mn.online.title')}</strong></p>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">${t('mn.online.shareDesc')}${otrosServicios}${t('mn.online.shareDescEnd')}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
      <img src="${qrUrl}" alt="${t('mn.online.qrAlt')}" style="width:120px;height:120px;border-radius:10px;border:1px solid var(--border);background:#fff;padding:6px">
      <div class="field" style="flex:1;min-width:180px;margin-bottom:0">
        <textarea id="cloud-public-link" rows="3" readonly style="font-family:monospace;font-size:11px" onclick="this.select()">${link}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="copyPublicLinkFrom('cloud-public-link')"><i class="ti ti-copy"></i> ${t('mn.online.copyLink')}</button>
      <a class="btn" style="flex:1;background:#188842;color:#fff;border-color:#188842;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent(t('mn.online.whatsappMsg').replace('${name}', DB.business?.name || t('mn.online.ourRestaurant')) + link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <details${lastSyncBadgeState === 'error' ? ' open' : ''}>
      <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)"><i class="ti ti-settings"></i> ${t('gate.changeFirebaseConfig')}</summary>
      <div style="margin-top:10px">
        <p style="font-size:12px;color:var(--muted);margin-bottom:10px">${t('gate.emptyToDisconnect')}</p>
        ${renderOwnFirebaseForm()}
      </div>
    </details>
  `);
}

// Categorías de Mega Lista/Stock: distintas según el área, para que Sala
// vea categorías de bar (Cervezas, Licores...) en vez de las de cocina
// (Carnes, Pescados...). "Otros" es común a ambas.
const CATEGORIES_COCINA = ['Carnes','Pescados','Lácteos','Verduras','Frutas','Cereales y Panadería','Bebidas','Condimentos y Especias','Congelados','Otros'];
const CATEGORIES_SALA = ['Cervezas','Vinos y Cavas','Licores y Destilados','Refrescos y Mixers','Café e Infusiones','Hielo y Guarniciones','Otros'];
// Igual que allergenLabel()/businessTypeLabel(): el valor guardado de las
// categorías predefinidas es siempre el nombre en español (clave estable
// usada también para ordenar), pero se muestra traducido. Las categorías
// que el propio negocio crea (DB.ingredientCategories) NO están en este
// diccionario y se muestran tal cual, porque son su propio texto.
function ingredientCategoryLabel(name){
  const dict = t('ingredientCategories.map');
  return (dict && dict[name]) || name;
}
function ingredientCategories(){
  return currentArea()==='sala' ? CATEGORIES_SALA : CATEGORIES_COCINA;
}
const ALLERGENS = ['Gluten','Crustáceos','Huevos','Pescado','Cacahuetes','Soja','Lácteos','Frutos de cáscara','Apio','Mostaza','Sésamo','Sulfitos','Altramuces','Moluscos'];
// Los 14 alérgenos de declaración obligatoria en la UE: el valor guardado
// siempre es el nombre en español (clave estable de datos), pero se muestra
// traducido según el idioma activo.
function allergenLabel(name){
  const dict = t('allergens.map');
  return (dict && dict[name]) || name;
}
// g/kg para sólidos, ml/cl/L para líquidos (esenciales para escandallar
// cócteles con precisión), ud para unidades sueltas (botellas, latas...).
const UNITS = ['g','kg','ud','ml','cl','L'];
const BASE_UNITS = ['L','ml','kg','g','ud'];
const DIAS_SEMANA = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// Horario semanal: un array de 7 días (Lunes..Domingo). Cada día puede ser
// "seguido" (un único tramo horario) o "turnos" (hasta 2 tramos, para horario
// partido). Se usa para reservas y para indicar si el negocio está abierto.
// abierto:false = cerrado ese día.
function defaultHorario(){
  return DIAS_SEMANA.map(() => ({
    modo: 'turnos', abierto: true,
    seguido: {ini:'', fin:''},
    turnos: [
      {ini:'', fin:''},
      {ini:'', fin:''}
    ]
  }));
}

// Convierte un día de horario al nuevo formato {modo,abierto,seguido,turnos}.
// Soporta el formato antiguo {abierto,t1i,t1f,t2i,t2f}.
function migrateHorarioDia(d){
  if(!d) return defaultHorario()[0];
  if(d.modo && d.seguido && d.turnos) return d;
  // formato antiguo: detecta por presencia de t1i y ausencia de modo
  if('t1i' in d){
    return {
      modo: 'turnos', abierto: d.abierto!==false,
      seguido: {ini:'', fin:''},
      turnos: [
        {ini: d.t1i||'', fin: d.t1f||''},
        {ini: d.t2i||'', fin: d.t2f||''}
      ]
    };
  }
  return defaultHorario()[0];
}

function defaultData(){
  return {
    ingredients: [],
    ingredientCategories: [], // user-defined categories for ingredientes (además de las preestablecidas)
    recipes: [],
    recipeCategories: [], // user-defined categories for Escandallo/Carta/Fichas
    fichas: [],
    // I+D: el ADN de la casa, el cuaderno de pruebas y sus carpetas.
    idr: {adn:{}, creaciones:[], carpetas:[]},
    menuItems: [],
    cartas: [],          // {id, nombre, horario:[7x{activo,desde,hasta}], secciones:[{id, nombre, platos:[{id, recipeId, nombre, precio, disponible}]}]}
    activeCartaIds: [],  // cartas activas en TPV a la vez (p.ej. comida + bebidas)
    menus: [],           // {id, nombre, precio, horario:[7x{activo,desde,hasta}], grupos:[{id, nombre, opciones:[{id, recipeId, nombre, suplemento}]}]}
    activeMenuIds: [],   // menús activos en TPV a la vez
    stock: {},          // { ingredientId: { qty, min } }
    elaboraciones: [],   // {id, name, unit, qty, min} — elaboraciones propias (caldos, salsas, etc.)
    purchaseOrders: [],
    providers: [],        // {id, nombre, tel, email, contacto, pago, dir, iban, diaEntrega, horaEntrega, notas}
    tables: [],
    tpvOrders: [],
    sales: [],
    cashClosures: [], // {id, fecha, desde, hasta, totales:{Efectivo,Tarjeta,Otro}, total, ticketCount, fondoInicial, efectivoEsperado, efectivoContado, diferencia, notas, createdAt}
    employees: [],       // {id, name, rol, color, pin, pinChanged}
    shifts: {},          // { employeeId: ['','','','','','',''] }
    turnos: [],          // {id, employeeId, fecha, tipo:'M'|'T'|'P'|'D'|'C', entrada, salida, notas}
    workDistribution: {}, // { employeeId: { platos:[name,...], produccion:{0:[task,...],...,6:[...]} } }
    fichajes: [],        // {id, employeeId, fecha, entrada, salida} — control horario real (entrada/salida)
    promos: [],          // {id, fecha (YYYY-MM-DD), titulo, descripcion} — calendario de promoción/marketing
    cleaningTasks: [],
    limpieza: {
      manosPasos: ['Mójate las manos con agua tibia','Aplica jabón bactericida (mínimo 3ml)','Frota palmas, dorso, dedos y muñecas durante 20 segundos','Aclara con agua','Seca con papel de un solo uso','Cierra el grifo con el papel'],
      tareas: [],          // {id, area, producto}
      checks: {},          // {weekKey: {tareaId: {lun:bool,...}}}
      temperaturas: [],    // {id, fecha, hora, equipo, temp, estado, responsable}
      alergenos: [],       // {id, fecha, plato, alergenos, verificado, notas}
      plagas: [],          // {id, fecha, area, hallazgos, accion, proxima}
      mantenimiento: []    // {id, nombre, ultimo, proximo, responsable, estado, notas}
    },
    clients: [],
    chatMessages: [], // {id, channel:'general'|'cocina'|'sala', authorId, authorName, text, ts}
    chatPinned: {}, // {general:msgId, cocina:msgId, sala:msgId} — mensaje fijado arriba del todo de cada canal
    categoryIcons: {recipe:{}, ingredient:{}}, // iconos elegidos a mano para carpetas: 'recipe' (Escandallo/Fichas), 'ingredient' (Mega Lista/Stock)
    loyaltyRewards: ['Postre gratis', 'Café o infusión gratis', 'Chupito o bebida gratis', 'Entrante gratis', '10% de descuento en la cuenta'], // catálogo de premios sugeribles al llegar a 10 puntos
    reservations: [],
    moodCheckins: [], // {id, employeeId, weekKey, value(1-5), ts} — encuesta de clima semanal, opcional
    trash: [], // {id, type:'employee'|'client'|'recipe'|'ingredient', item, deletedAt, deletedBy} — papelera de reciclaje, 30 días
    auditLog: [], // {id, ts, actor, action, summary} — quién hizo qué, para negocios con varios encargados
    pushSubscriptions: [], // {deviceId, subscription, updatedAt} — dispositivos suscritos a avisos push reales
    waitlist: [], // {id, name, phone, people, notes, status:'esperando'|'sentado'|'cancelada', createdAt} — cola de espera para walk-ins sin mesa libre
    vacationRequests: [], // {id, employeeId, fromDate, toDate, notes, status:'pending'|'approved'|'rejected', createdAt}
    npsScores: [], // {id, score:0-10, comment, createdAt} — respuestas privadas de la encuesta de satisfacción (NPS)
    bankReconciliations: [], // {id, fechaDesde, fechaHasta, expected, bankAmount, difference, notes, createdAt} — conciliación bancaria manual (tarjeta cobrada vs. extracto real)
    shiftHandoffNotes: {}, // {'area_YYYY-MM-DD': texto} — traspaso de turno
    turnoSwapRequests: [], // {id, fromEmployeeId, fromTurnoId, toEmployeeId, status:'pending_peer'|'pending_owner'|'approved'|'rejected', createdAt}
    business: {
      name:'', address:'', phone:'', email:'', description:'',
      logo:'', tipo:'', anyo:'', web:'', cif:'', prop:'',
      mesasInterior:'', mesasTerraza:'', aforo:'', ig:'', fb:'', gmaps:'', tiktok:'',
      pin:'1234', pinSet:false,
      horario: defaultHorario(),
      cartaAuto: true,
      tiposServicio: {mesa:true, takeaway:true, delivery:true},
      ownFirebase: null, // {apiKey, databaseURL} si el negocio usa su propio proyecto Firebase
      requireDeposit: false, depositAmount: '', depositType: 'fixed', depositInstructions: '',
      lastBackupAt: null, // fecha de la última copia de seguridad descargada, para el aviso de "hace tiempo que no descargas una copia"
      // Configuración de envío a un proveedor certificado VeriFactu (cada
      // negocio contrata y paga su propia cuenta con ese proveedor; GastroGoan
      // solo guarda su clave de API y llama a su servicio). Ver VERIFACTU_PROVIDERS
      // en js/tpv.js para la lista de proveedores soportados.
      verifactu: {enabled: false, provider: '', apiKey: ''},
      // Confirmación de reservas por email al cliente (EmailJS: envía desde
      // el propio navegador del negocio, sin backend propio). Cada negocio
      // crea su propia cuenta gratuita y pega aquí sus 3 datos — igual que
      // con ownFirebase, no es una cuenta compartida de GastroGoan.
      emailConfirm: {enabled: false, serviceId: '', templateId: '', cancelTemplateId: '', publicKey: ''},
      ticket: {
        pie: '',
        mostrarDireccion: true,
        mostrarTelefono: true,
        mostrarNif: true,
        mostrarWeb: false,
        ivaPct: 10
      },
      // Cómo se muestran las comandas al marchar: 'pantalla' (pantalla de Cocina/Sala)
      // o 'impresion' (se imprime un vale al marchar). anchoTicket: 58 o 80 mm.
      comandas: { modo: 'pantalla', anchoTicket: 80 },
      facturaCounter: 0,
      deliveryPlatforms: [] // {id, nombre, comisionPct, ivaPct} - apps de delivery (Glovo, Uber Eats...) y su comisión
    },
    ge: {
      fijos: [],     // {id, nombre, importe, diaPago, categoria: 'PERSONAL'|'FIJOS'}
      variables: [], // {id, mes, año, categoria, proveedor, importe, fecha}
      capex: [],     // {id, descripcion, importe, iva, fecha, estadoPago}
      config: {ticketMedio:15, cubiertosActuales:50, diasApertura:26, foodCostObj:35},
      // Histórico de cuánto sumaban los gastos fijos cada vez que se tocó algo
      // (se añade un punto el día que se crea/edita/borra un gasto fijo), para
      // que las tendencias de meses pasados del Panel de Control no apliquen
      // silenciosamente la configuración de HOY a un mes en el que los gastos
      // fijos eran distintos. {fecha, totalNeto}
      fijosLog: [],
      // Meses cerrados/bloqueados para edición ('YYYY-MM'), para que los datos
      // de gastos variables/CAPEX de un periodo ya cerrado y enviado a la
      // gestoría no puedan modificarse sin querer.
      cierres: []
    },
    nextId: 1
  };
}

let DB = defaultData();
let dbLoadFailedFlag = false;
const dbReadyPromise = loadDB().then(d => {
  DB = d;
  if(dbLoadFailedFlag){
    // El aviso se dispara aparte (no bloquea la carga de DB) y esperando a
    // que exista el DOM/las traducciones, porque loadDB() puede terminar
    // antes de que app.js haya montado la pantalla. Con try/catch y
    // comprobando también openModal (del que depende alertModal): en un
    // entorno sin la interfaz completa cargada (p.ej. los tests que cargan
    // core.js aislado, donde indexedDB tampoco existe y este camino se
    // dispara siempre) esto NO debe convertirse en una excepción sin
    // capturar que tire abajo el resto del arranque.
    const warn = () => {
      try{
        if(typeof alertModal === 'function' && typeof openModal === 'function' && typeof t === 'function') alertModal(t('msg.dbLoadFailed'));
      }catch(e){ console.error('No se pudo mostrar el aviso de fallo al cargar datos', e); }
    };
    try{
      if(typeof document !== 'undefined' && document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warn);
      else warn();
    }catch(e){ console.error('No se pudo programar el aviso de fallo al cargar datos', e); }
  }
});

// Adjudicar los negocios antiguos a su dueño tiene que pasar SIEMPRE al
// arrancar, no solo al identificarse por primera vez: quien ya entró alguna
// vez en este aparato entra por el camino rápido (sin internet, validando
// el PIN en local), que no pasa por setOwnerLogin. Sin esto, un cliente que
// actualizaba y entraba con normalidad se encontraba el selector VACÍO: sus
// negocios seguían ahí, pero sin dueño puesto, y el filtro no los enseñaba.
try{ migrateSlotOwners(); }catch(e){ console.error('No se pudieron adjudicar los negocios al dueño', e); }

async function loadDB(){
  try{
    let data = await idbGet(DB_KEY);
    if(data === undefined){
      // Migración única: si había datos en localStorage (versión anterior), pásalos a IndexedDB.
      const legacy = localStorage.getItem(DB_KEY);
      if(legacy){
        data = JSON.parse(legacy);
        await idbSet(DB_KEY, data);
        localStorage.removeItem(DB_KEY);
      }
    }
    // Negocio genuinamente nuevo (nada guardado, ni siquiera del formato
    // antiguo en localStorage): arranca ya con el catálogo básico de materia
    // prima cargado en Mega Lista (ver buildBaseIngredientsSeed, js/finance.js),
    // para no obligar a dar de alta uno a uno decenas de ingredientes
    // habituales. Esta función solo existe una vez cargado finance.js, pero
    // para cuando esto se ejecuta (tras el await de arriba) ya lo está —
    // nunca se llama de forma síncrona al arrancar el script.
    if(!data){
      const fresh = defaultData();
      if(typeof buildBaseIngredientsSeed === 'function'){
        // Un negocio puede tener las dos áreas (cocina Y sala) a la vez, así
        // que se siembran ambos catálogos — cada uno con su propio rango de
        // ids para que no puedan chocar entre sí.
        const seedCocina = buildBaseIngredientsSeed('cocina', Date.now() * 1000);
        const seedSala = buildBaseIngredientsSeed('sala', Date.now() * 1000 + 100000);
        fresh.ingredients = [...seedCocina.ingredients, ...seedSala.ingredients];
        fresh.stock = {...seedCocina.stock, ...seedSala.stock};
        fresh.categoryIcons.ingredient = {...seedCocina.categoryIcons, ...seedSala.categoryIcons};
      }
      return fresh;
    }
    const merged = Object.assign(defaultData(), data);
    merged.business = {...defaultData().business, ...(data.business||{})};
    if(merged.business.pinSet === undefined){
      if(merged.business.pin){ merged.business.pinSet = true; }
      else { merged.business.pin = '1234'; merged.business.pinSet = false; }
    }
    delete merged.business.protectedModules;
    (merged.ingredients||[]).forEach(i => { if(!i.area) i.area = 'cocina'; });
    (merged.recipes||[]).forEach(r => { if(!r.area) r.area = 'cocina'; });
    (merged.providers||[]).forEach(p => { if(!p.area) p.area = 'cocina'; });
    (merged.elaboraciones||[]).forEach(e => { if(!e.area) e.area = 'cocina'; });
    (merged.fichas||[]).forEach(f => { if(!f.area) f.area = 'cocina'; });
    // Desde que la ficha técnica se crea sola con el escandallo, los platos
    // dados de alta antes se quedaban sin ella y seguirían apareciendo como
    // "Sin ficha" para siempre. Se les crea aquí la suya, vacía y ya
    // vinculada, para que el módulo se comporte igual con los platos viejos
    // que con los nuevos.
    if(!Array.isArray(merged.fichas)) merged.fichas = [];
    // Misma fórmula que genId(), que aquí no se puede llamar todavía porque
    // usa DB y DB aún no está asignado. El contador evita que dos fichas
    // creadas en el mismo milisegundo compartan id.
    let nFichaMigrada = 0;
    (merged.recipes||[]).forEach(r => {
      if(merged.fichas.some(f => f.recipeId === r.id)) return;
      merged.fichas.push({
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000) + (nFichaMigrada++),
        name: r.name, recipeId: r.id,
        comensales: r.comensales || 2,
        baseComensales: r.comensales || 2,
        produccion: r.comensales || 2,
        tiempo: '', temp: (r.area||'cocina') === 'sala' ? 'FRÍO' : 'CALIENTE',
        ingredients: [], pasos: [], allergens: [], presentation: '', photo: '',
        area: r.area || 'cocina'
      });
    });
    (merged.purchaseOrders||[]).forEach(o => { if(!o.area) o.area = 'cocina'; });
    if(!Array.isArray(merged.activeCartaIds)){
      merged.activeCartaIds = merged.activeCartaId ? [merged.activeCartaId] : [];
    }
    delete merged.activeCartaId;
    if(!Array.isArray(merged.menus)) merged.menus = [];
    (merged.menus||[]).forEach(m => { if(!m.area) m.area = 'cocina'; });
    if(!Array.isArray(merged.activeMenuIds)) merged.activeMenuIds = [];
    if(!Array.isArray(merged.fichajes)) merged.fichajes = [];
    if(!Array.isArray(merged.promos)) merged.promos = [];
    if(!Array.isArray(merged.loyaltyRewards)) merged.loyaltyRewards = ['Postre gratis', 'Café o infusión gratis', 'Chupito o bebida gratis', 'Entrante gratis', '10% de descuento en la cuenta'];
    if(!Array.isArray(merged.chatMessages)) merged.chatMessages = [];
    if(!merged.categoryIcons || typeof merged.categoryIcons !== 'object' || Array.isArray(merged.categoryIcons)) merged.categoryIcons = {recipe:{}, ingredient:{}};
    if(!merged.categoryIcons.recipe || typeof merged.categoryIcons.recipe !== 'object') merged.categoryIcons.recipe = {};
    if(!merged.categoryIcons.ingredient || typeof merged.categoryIcons.ingredient !== 'object') merged.categoryIcons.ingredient = {};
    (merged.employees||[]).forEach(e => { if(!e.pin){ e.pin = hashPin('1234', merged.license && merged.license.code); e.pinChanged = false; } if(!e.area) e.area = 'cocina'; });
    (merged.tpvOrders||[]).forEach(o => { if(!Array.isArray(o.items)) o.items = []; if(!Array.isArray(o.tandas)) o.tandas = []; });
    return merged;
  }catch(e){
    console.error('Error cargando datos', e);
    // Si IndexedDB falla al leer (cuota agotada, corrupción, modo privado
    // que la bloquea a medias...), antes se arrancaba en silencio con un
    // negocio vacío: parecía una instalación nueva y el dueño podía llegar
    // a rellenar todo de cero sin saber que sus datos reales seguían ahí.
    // Con esta bandera, en cuanto el DOM esté listo se avisa de verdad —
    // ver el aviso al final de este archivo, después de dbReadyPromise.
    dbLoadFailedFlag = true;
    return defaultData();
  }
}

// Devuelve la promesa del guardado local para quien necesite ESPERARLO.
// Casi nadie: guardar y seguir es lo normal. Pero quien recarga la página
// justo después tiene que esperar, o la recarga corta la escritura a medio
// hacer y el cambio se pierde sin decir nada (es lo que le pasaba al
// selector de idioma). Los que no lo esperan siguen funcionando igual.
function saveDB(){
  const guardado = idbSet(DB_KEY, DB).catch(e => {
    console.error('Error guardando datos', e);
    if(typeof showToast === 'function') showToast(t('msg.localSaveFailed'));
    // Reintento único: si el primer guardado falló por algo pasajero (p.ej.
    // el navegador bloqueó IndexedDB un instante), insistir es mejor que
    // dejar ese cambio solo en memoria sin ningún otro aviso.
    setTimeout(() => idbSet(DB_KEY, DB).catch(e2 => console.error('Reintento de guardado local también falló', e2)), 3000);
  });
  scheduleCloudSync();
  return guardado;
}

/* Sube a la nube solo los bloques de DB (ingredients, tpvOrders, sales...)
   que han cambiado desde el último envío, agrupando varios cambios rápidos
   en uno solo. Así dos dispositivos que tocan partes distintas del negocio
   (p.ej. una comanda y un cierre de caja) no se pisan entre sí, y no se
   reenvía todo el histórico del negocio en cada pequeño cambio. */
function pushAllToCloud(){
  if(!cloudRef) return;
  const updates = {};
  Object.keys(DB).forEach(key => {
    updates[key] = DB[key];
    lastSyncedSnapshot[key] = canonicalStringify(DB[key]);
  });
  cloudRef.set(updates).catch(e => {
    recordSyncError(e);
  });
}

function scheduleCloudSync(){
  schedulePublicMirrorSync();
  if(!cloudRef) return;
  // Antes el badge solo decía "conectado/desconectado" del socket, sin
  // distinguir si el cambio que se acaba de hacer ya llegó de verdad o
  // sigue en camino (los 800ms de debounce, más lo que tarde la subida).
  // Si el socket está conectado, se muestra ahora ese estado intermedio
  // en vez de dejar "conectado" dando a entender que ya está guardado.
  if(socketConnected) updateSyncBadge('pending');
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(flushCloudSync, CLOUD_SYNC_DELAY);
}

/* El espejo público (para la página de pedidos/reservas por QR) se sube
   a la plataforma compartida de GastroGoan SIEMPRE, tenga o no el negocio
   configurado su propio Firebase privado: son cosas independientes. */
function schedulePublicMirrorSync(){
  clearTimeout(publicMirrorSyncTimer);
  publicMirrorSyncTimer = setTimeout(syncPublicMirror, CLOUD_SYNC_DELAY);
}

// Antes, lastSyncedSnapshot se actualizaba de forma OPTIMISTA (como si el
// envío ya hubiera llegado) justo al construir el paquete a enviar, no al
// confirmarse de verdad. Si cloudRef.update() fallaba (wifi cayendo a
// media noche, el caso que más preocupa), ese bloque quedaba marcado como
// "ya sincronizado" sin estarlo — y como nada más volvía a intentarlo
// (sin listener de reconexión ni reintento), ese cambio se podía perder
// del todo si nadie volvía a tocar ese mismo bloque de datos antes de
// cerrar la pestaña/dispositivo. Ahora el snapshot solo se actualiza tras
// la confirmación real, y un fallo programa un reintento automático.
let cloudSyncRetryTimer = null;
const CLOUD_SYNC_RETRY_MS = 15000; // reintenta cada 15s mientras haya cambios sin confirmar
function scheduleCloudSyncRetry(){
  clearTimeout(cloudSyncRetryTimer);
  cloudSyncRetryTimer = setTimeout(flushCloudSync, CLOUD_SYNC_RETRY_MS);
}
function flushCloudSync(){
  cloudSyncTimer = null;
  if(!cloudRef || !lastSyncedSnapshot) return;
  const updates = {};
  const pendingJson = {};
  Object.keys(DB).forEach(key => {
    const json = canonicalStringify(DB[key]);
    if(lastSyncedSnapshot[key] !== json){
      updates[key] = DB[key];
      pendingJson[key] = json;
    }
  });
  const keys = Object.keys(updates);
  if(keys.length === 0) return;
  const onFail = (e) => {
    recordSyncError(e);
    scheduleCloudSyncRetry();
  };
  try{
    cloudRef.update(updates).then(() => {
      keys.forEach(key => { lastSyncedSnapshot[key] = pendingJson[key]; });
      // Solo se vuelve a "conectado" si ya no queda ningún bloque distinto
      // del último sincronizado — si mientras tanto se hizo otro cambio
      // local (o el reintento de otro bloque sigue en curso), se queda en
      // "pending" hasta que de verdad no falte nada por confirmar.
      const stillPending = Object.keys(DB).some(key => lastSyncedSnapshot[key] !== canonicalStringify(DB[key]));
      if(!stillPending && socketConnected) updateSyncBadge('online');
    }).catch(onFail);
  }catch(e){
    onFail(e);
  }
}
if(typeof window !== 'undefined'){
  // Reintenta en cuanto vuelve la conexión, sin esperar a los 15s del
  // temporizador de reintento — así los cambios pendientes de un corte de
  // wifi llegan a la nube en cuanto es posible, no cuando toque.
  window.addEventListener('online', () => flushCloudSync());
}

/* ============================================================
   AVISOS DEL NAVEGADOR (Notification API)
   IMPORTANTE — límite real: esto solo llega si el navegador sigue abierto
   (aunque sea en otra pestaña, u otra app con el navegador de fondo). Si
   el móvil está bloqueado o la app/navegador está totalmente cerrado, no
   llega nada — para eso hace falta un push real disparado desde un
   servidor (Firebase Cloud Functions), que no tenemos desplegado. Esto
   cubre el caso intermedio, muy real: "estoy en la cocina con el TPV
   abierto en otra pestaña" o "el dueño tiene la app abierta de fondo".
   ============================================================ */
const DESKTOP_NOTIF_LS = 'gastrogoan_desktop_notifications';
function desktopNotificationsEnabled(){
  return localStorage.getItem(DESKTOP_NOTIF_LS) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted';
}
function requestDesktopNotifications(){
  if(typeof Notification === 'undefined'){ showToast(t('notif.unsupported')); return; }
  Notification.requestPermission().then(perm => {
    if(perm === 'granted'){
      localStorage.setItem(DESKTOP_NOTIF_LS, '1');
      showToast(t('notif.enabledOk'));
      new Notification('GastroGoan', {body: t('notif.testBody')});
      subscribeToPush();
    }else{
      localStorage.setItem(DESKTOP_NOTIF_LS, '0');
      showToast(t('notif.denied'));
    }
    if(typeof renderMiNegocio === 'function' && document.getElementById('minegocio-content')) renderMiNegocio();
  });
}
function disableDesktopNotifications(){
  localStorage.setItem(DESKTOP_NOTIF_LS, '0');
  unsubscribeFromPush();
  if(typeof renderMiNegocio === 'function') renderMiNegocio();
}

/* ============================================================
   PUSH REAL (llega aunque la app/pestaña esté cerrada del todo)
   Usa el estándar Web Push (no hace falta Firebase Cloud Messaging): el
   navegador da una "suscripción" única por dispositivo, que se guarda
   junto al resto de datos del negocio (se sincroniza sola por la nube ya
   existente) — y para AVISAR, cualquier dispositivo que dispare una
   alerta llama a una función serverless (netlify/functions/send-push.js,
   ver el paquete que se sube a Netlify) pasándole a quién avisar y qué
   decir. La función es la única pieza que tiene que estar desplegada de
   verdad para que esto funcione — sin desplegarla, el resto sigue
   funcionando igual que antes (avisos mientras el navegador esté abierto).
   ============================================================ */
const VAPID_PUBLIC_KEY = 'BETZalG9G2YzbCepMPNa23yUm_Dwkr3x2o3zLzCIF66ThpYskhROdtg7fwmygmTWCXgupg5ryVrGJ_WFZGHkazY';
function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for(let i=0; i<raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
async function subscribeToPush(){
  try{
    if(!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    if(!DB.pushSubscriptions) DB.pushSubscriptions = [];
    const deviceId = getOrCreateDeviceId();
    const already = DB.pushSubscriptions.find(s => s.deviceId === deviceId);
    const entry = {deviceId, subscription: sub.toJSON(), updatedAt: new Date().toISOString()};
    if(already) Object.assign(already, entry);
    else DB.pushSubscriptions.push(entry);
    saveDB();
  }catch(e){ console.error('Error activando el push real', e); }
}
async function unsubscribeFromPush(){
  try{
    if(!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if(sub) await sub.unsubscribe();
    const deviceId = getOrCreateDeviceId();
    DB.pushSubscriptions = (DB.pushSubscriptions||[]).filter(s => s.deviceId !== deviceId);
    saveDB();
  }catch(e){ console.error('Error desactivando el push real', e); }
}
function getOrCreateDeviceId(){
  let id = localStorage.getItem('gastrogoan_device_id');
  if(!id){ id = 'dev' + Date.now().toString(36) + Math.random().toString(36).slice(2,8); localStorage.setItem('gastrogoan_device_id', id); }
  return id;
}
// Llama a la función serverless (si está desplegada) para avisar de verdad
// a todos los DEMÁS dispositivos suscritos — falla en silencio si esa
// función no está desplegada todavía, sin romper nada del resto de la app.
function sendPushToAll(title, body){
  try{
    const deviceId = getOrCreateDeviceId();
    const targets = (DB.pushSubscriptions||[]).filter(s => s.deviceId !== deviceId).map(s => s.subscription);
    if(!targets.length) return;
    fetch('/.netlify/functions/send-push', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({subscriptions: targets, title, body})
    }).catch(() => {}); // sin la función desplegada, esto simplemente no hace nada
  }catch(e){}
}
// Se usa el Service Worker si está listo (más fiable, sigue vivo aunque la
// pestaña no tenga el foco); si no, cae en una Notification normal.
// El `tag` de una notificación decide si sustituye a otra visible con el
// mismo tag o si se apila aparte. Antes se usaba siempre el título tal
// cual: dos avisos urgentes seguidos del MISMO autor (mismo "🚨 Nombre")
// se pisaban entre sí en el sistema operativo — el destinatario solo veía
// el último y podía perderse el primero sin enterarse. Por defecto ahora
// cada aviso es único (no se pisa con ningún otro); solo se pasa un `tag`
// explícito cuando de verdad se quiere que un aviso más reciente sustituya
// a uno anterior sobre lo mismo (p. ej. no hay ningún caso así hoy).
function notifyDesktop(title, body, tag){
  if(!desktopNotificationsEnabled()) return;
  const notifTag = tag || (title + '-' + genId());
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(reg => {
        if(reg && reg.showNotification) reg.showNotification(title, {body, icon: 'icon-192.png', tag: notifTag});
        else new Notification(title, {body});
      }).catch(() => { try{ new Notification(title, {body}); }catch(e){} });
    }else{
      new Notification(title, {body});
    }
  }catch(e){ console.error('Error mostrando aviso del navegador', e); }
}

/* ============================================================
   IMPRESIÓN TÉRMICA REAL (ESC/POS por Bluetooth de bajo consumo)
   Alternativa al diálogo de impresión del navegador: envía los bytes
   ESC/POS directamente a una impresora térmica de recibos por Web
   Bluetooth (el mismo perfil GATT que usan la inmensa mayoría de
   impresoras térmicas de 58/80mm baratas — servicio 0xFF00/0x18F0,
   característica de escritura sin respuesta). Solo Chrome/Edge en
   Android o escritorio soportan Web Bluetooth (no Safari/iOS ni
   Firefox) — si no está disponible, se avisa y se recomienda seguir
   usando "Imprimir" normal (diálogo del navegador), que sigue
   funcionando igual que siempre y no depende de esto.
   ============================================================ */
const THERMAL_PRINTER_SERVICE_CANDIDATES = ['000018f0-0000-1000-8000-00805f9b34fb', 0xff00];
const THERMAL_PRINTER_CHAR_CANDIDATES = ['00002af1-0000-1000-8000-00805f9b34fb', 0xff02];
// Antes solo existía UNA impresora térmica posible (la del ticket de
// cliente). Para poder emparejar una impresora Bluetooth distinta por cada
// perfil de comanda (cocina, barra...) además de la del ticket, las
// conexiones se guardan en un mapa por id en vez de en una única variable.
// 'ticket' es el id fijo que usa la impresora de tickets de cliente; cada
// impresora de comandas usa su propio id (el mismo con el que ya se guarda
// en DB.business.comandas.printers).
const thermalPrinterCharacteristics = new Map();
function thermalPrintingSupported(){
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}
function thermalPrinterStorageKey(printerId){
  return 'gg_thermal_printer_name_' + (printerId || 'ticket');
}
// Nombre del último dispositivo emparejado para este id, si lo hay (no
// implica que siga conectado en esta sesión — Web Bluetooth no permite
// reconectar solo tras recargar la página, hace falta un gesto del usuario).
function getThermalPrinterName(printerId){
  try{ return localStorage.getItem(thermalPrinterStorageKey(printerId)) || ''; }catch(e){ return ''; }
}
function forgetThermalPrinter(printerId){
  thermalPrinterCharacteristics.delete(printerId || 'ticket');
  try{ localStorage.removeItem(thermalPrinterStorageKey(printerId)); }catch(e){}
}
async function connectThermalPrinter(printerId){
  const key = printerId || 'ticket';
  if(!thermalPrintingSupported()){ showToast(t('thermal.notSupported')); return false; }
  try{
    const device = await navigator.bluetooth.requestDevice({
      filters: THERMAL_PRINTER_SERVICE_CANDIDATES.map(s => ({services:[s]})),
      optionalServices: THERMAL_PRINTER_SERVICE_CANDIDATES
    });
    showToast(t('thermal.connecting'));
    // Sin límite de tiempo, si el dispositivo elegido está apagado
    // gatt.connect() podía quedarse pendiente mucho rato sin resolver ni
    // rechazar según el stack Bluetooth del sistema — el botón se quedaba
    // "colgado" sin ningún aviso de que algo iba mal.
    const server = await Promise.race([
      device.gatt.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('gatt-timeout')), 8000))
    ]);
    let characteristic = null;
    for(const svcId of THERMAL_PRINTER_SERVICE_CANDIDATES){
      try{
        const service = await server.getPrimaryService(svcId);
        for(const charId of THERMAL_PRINTER_CHAR_CANDIDATES){
          try{ characteristic = await service.getCharacteristic(charId); break; }catch(e){}
        }
        if(characteristic) break;
      }catch(e){}
    }
    if(!characteristic){ showToast(t('thermal.noWritableService')); return false; }
    thermalPrinterCharacteristics.set(key, characteristic);
    localStorage.setItem(thermalPrinterStorageKey(key), device.name || '');
    showToast(t('thermal.connectedOk').replace('${name}', device.name || t('thermal.unnamedDevice')));
    if(typeof renderMiNegocio === 'function' && document.getElementById('minegocio-content')) renderMiNegocio();
    return true;
  }catch(e){
    // El usuario cancelando el selector de dispositivos también cae aquí —
    // no es un error real, solo cambió de idea.
    if(e && e.message === 'gatt-timeout'){ showToast(t('thermal.connectTimeout')); return false; }
    if(e && e.name !== 'NotFoundError') console.error('Error conectando la impresora térmica', e);
    return false;
  }
}
// Convierte texto plano a bytes ESC/POS básicos: inicializar, texto en
// codificación de 1 byte (cp437, suficiente para lo que ya usa el ticket:
// letras, números, acentos comunes), salto de línea final y corte de papel.
// Antes se copiaba el code point Unicode tal cual cuando era < 256 (mapeo
// Latin-1), pero la impresora interpreta esos bytes como CP437 (página de
// códigos estándar de impresoras ESC/POS) — Latin-1 y CP437 NO coinciden
// para las vocales acentuadas ni la ñ, así que salían símbolos corruptos
// (p.ej. "á" llegaba a la impresora como el byte de "ß"). Especialmente
// grave en avisos de alérgenos: un símbolo ilegible ahí es un riesgo de
// seguridad alimentaria, no solo un fallo estético. Se traducen los
// caracteres españoles/catalanes más comunes a su byte REAL en CP437; los
// que esa página no tiene (mayúsculas acentuadas: Á, É, Í, Ó, Ú) se
// degradan a su vocal sin acento en vez de un símbolo erróneo — sigue
// siendo legible, que es lo que importa.
const CP437_MAP = {
  'á':0xA0, 'é':0x82, 'í':0xA1, 'ó':0xA2, 'ú':0xA3, 'ñ':0xA4, 'Ñ':0xA5,
  'ü':0x81, 'Ü':0x9A, 'ç':0x87, 'Ç':0x80, '¿':0xA8, '¡':0xAD,
  'ª':0xA6, 'º':0xA7, '«':0xAE, '»':0xAF,
  // No existen en CP437: se degradan a la letra sin acento (legible, no corrupto)
  'Á':'A', 'É':'E', 'Í':'I', 'Ó':'O', 'Ú':'U',
};
function textToEscPos(text){
  const ESC = 0x1B, GS = 0x1D;
  // ESC @ (inicializar) + ESC t 0 (seleccionar página de códigos CP437,
  // explícita en vez de confiar en el valor por defecto de la impresora).
  const bytes = [ESC, 0x40, ESC, 0x74, 0x00];
  for(const ch of text){
    const mapped = CP437_MAP[ch];
    if(typeof mapped === 'number'){ bytes.push(mapped); continue; }
    if(typeof mapped === 'string'){ bytes.push(mapped.codePointAt(0)); continue; }
    const code = ch.codePointAt(0);
    bytes.push(code < 128 ? code : 0x3F); // fuera de ASCII y sin mapeo conocido -> '?'
  }
  bytes.push(0x0A, 0x0A, 0x0A);
  bytes.push(GS, 0x56, 0x42, 0x00); // GS V B 0 : corte parcial de papel
  return new Uint8Array(bytes);
}
// Las conexiones BLE tienen un tamaño máximo de paquete (MTU) mucho menor
// que el ticket completo — hay que trocear el envío o la impresora corta o
// ignora el resto.
const THERMAL_CHUNK_SIZE = 180;
// writeValueWithoutResponse() se resuelve en cuanto el navegador entrega el
// paquete a la pila BLE, NO cuando la impresora térmica ha terminado de
// procesarlo — su buffer interno suele ser de solo unos pocos cientos de
// bytes. En tickets largos (mesa con muchas líneas), mandar decenas de
// chunks seguidos sin pausa saturaba ese buffer y el ticket se cortaba o
// salía con líneas repetidas/perdidas hacia el final. Una pequeña pausa
// entre chunks le da tiempo a vaciarlo antes del siguiente envío.
const THERMAL_CHUNK_DELAY_MS = 20;
async function writeThermalChunks(characteristic, bytes){
  for(let i=0; i<bytes.length; i += THERMAL_CHUNK_SIZE){
    const chunk = bytes.slice(i, i + THERMAL_CHUNK_SIZE);
    await characteristic.writeValueWithoutResponse(chunk);
    if(i + THERMAL_CHUNK_SIZE < bytes.length) await new Promise(r => setTimeout(r, THERMAL_CHUNK_DELAY_MS));
  }
}
/* ============================================================
   CAJÓN PORTAMONEDAS
   El cajón NO se conecta al ordenador ni a la tablet: va enchufado a la
   IMPRESORA de tickets con un cable RJ11 (parecido al del teléfono fijo),
   y es la impresora la que lo abre mandándole un pulso eléctrico. Ese
   pulso es un comando ESC/POS más, así que se envía por la misma conexión
   Bluetooth que ya usamos para imprimir: no hace falta ningún cable, driver
   ni aparato adicional.
   ============================================================ */
// ESC p m t1 t2 — m=0 es el pin 2 del conector, que es el que usa la
// inmensa mayoría de cajones (algunos modelos raros van por el pin 5, m=1).
// t1/t2 son la duración del pulso en unidades de 2 ms: 25 y 250 son los
// valores que recomienda Epson y que aceptan también los clones.
const CASH_DRAWER_KICK = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);

/* Abre el cajón. opts.silent = true para el cobro automático: en ese caso,
   si no hay impresora ya conectada NO se hace nada y no se avisa de nada —
   abrir el selector de dispositivos Bluetooth en mitad de cada cobro, o
   soltar un aviso de error a un negocio que ni tiene cajón, sería mucho
   peor que no hacer nada. El botón manual sí es interactivo (silent=false):
   ahí el usuario ha pedido explícitamente abrirlo y espera respuesta. */
async function openCashDrawer(opts){
  const o = opts || {};
  const key = o.printerId || 'ticket';
  if(!thermalPrintingSupported()){
    if(!o.silent) showToast(t('thermal.notSupported'));
    return false;
  }
  if(!thermalPrinterCharacteristics.has(key)){
    if(o.silent) return false;
    const connected = await connectThermalPrinter(key);
    if(!connected) return false;
  }
  try{
    await writeThermalChunks(thermalPrinterCharacteristics.get(key), CASH_DRAWER_KICK);
    return true;
  }catch(e){
    console.error('Error abriendo el cajón portamonedas', e);
    // Puede haberse desconectado: forzar reconexión la próxima vez.
    thermalPrinterCharacteristics.delete(key);
    if(!o.silent) showToast(t('drawer.openFailed'));
    return false;
  }
}

/* Apertura automática al cobrar. Solo actúa si el negocio lo tiene activado
   (la mayoría no tiene cajón) y siempre en silencio, para no interrumpir el
   cobro pase lo que pase con la impresora. */
function openCashDrawerOnSale(){
  if(!DB.business || !DB.business.cashDrawerOnSale) return;
  openCashDrawer({silent: true});
}

/* Apertura manual desde el TPV. A diferencia de la automática, esta SÍ deja
   rastro en el registro de actividad: abrir el cajón fuera de un cobro es
   justo el movimiento que un dueño querría poder revisar ante un descuadre. */
async function openCashDrawerManually(){
  const okAbierto = await openCashDrawer({silent: false});
  if(!okAbierto) return;
  if(typeof logAudit === 'function') logAudit('drawer_open', t('audit.cashDrawerOpened'), 'critical');
  saveDB();
  showToast(t('drawer.opened'));
}

async function printToThermalPrinter(text, printerId){
  const key = printerId || 'ticket';
  if(!thermalPrintingSupported()){ showToast(t('thermal.notSupported')); return; }
  if(!thermalPrinterCharacteristics.has(key)){
    const connected = await connectThermalPrinter(key);
    if(!connected) return;
  }
  try{
    await writeThermalChunks(thermalPrinterCharacteristics.get(key), textToEscPos(text));
    showToast(t('thermal.printedOk'));
  }catch(e){
    console.error('Error imprimiendo en la impresora térmica', e);
    thermalPrinterCharacteristics.delete(key); // puede que se haya desconectado; forzar reconectar la próxima vez
    showToast(t('thermal.printFailed'));
  }
}

function genId(){
  // Id único incluso si varios dispositivos crean datos a la vez
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  DB.nextId = Math.max(DB.nextId || 1, id + 1);
  return id;
}

/* ============================================================
   PAPELERA DE RECICLAJE
   Antes de borrar de verdad un empleado, cliente, receta o ingrediente, se
   guarda una copia aquí durante 30 días — así un borrado por error (el
   caso más típico y más doloroso) se puede deshacer. Restaura el registro
   en sí; NO reconstruye automáticamente relaciones ya limpiadas en otros
   sitios al borrar (p. ej. los turnos de un empleado eliminado) — para eso
   sigue haciendo falta rehacerlas a mano, pero al menos la ficha vuelve.
   ============================================================ */
const TRASH_RETENTION_DAYS = 30;
function currentActorName(){
  const session = (typeof getAccessSession === 'function') ? getAccessSession() : null;
  if(session && session.type === 'owner') return t('common.owner');
  if(session && session.type === 'employee'){
    const emp = DB.employees.find(e => e.id === session.employeeId);
    if(emp) return emp.name;
  }
  return t('common.unknown');
}
function moveToTrash(type, item){
  if(!DB.trash) DB.trash = [];
  DB.trash.unshift({
    id: genId(), type, item: JSON.parse(JSON.stringify(item)),
    deletedAt: new Date().toISOString(), deletedBy: currentActorName()
  });
  const cutoff = Date.now() - TRASH_RETENTION_DAYS*86400000;
  DB.trash = DB.trash.filter(x => new Date(x.deletedAt).getTime() >= cutoff);
}
const TRASH_TYPE_ARRAY = {employee:'employees', client:'clients', recipe:'recipes', ingredient:'ingredients', elaboracion:'elaboraciones', reservation:'reservations', order:'tpvOrders'};
function restoreTrashItem(trashId){
  const entry = (DB.trash||[]).find(x => x.id === trashId);
  if(!entry) return;
  const key = TRASH_TYPE_ARRAY[entry.type];
  if(!key) return;
  // La ficha técnica de una receta borrada viaja dentro de la propia entrada
  // de papelera (ver confirmDeleteRecipe, js/recipes.js) en vez de tener su
  // propia papelera aparte — si al restaurar la receta no se restaura
  // también su ficha, el plato vuelve sin pasos de elaboración ni alérgenos
  // manuales, sin ningún aviso de que se han perdido.
  const restoredItem = {...entry.item};
  const trashedFicha = restoredItem._trashedFicha;
  delete restoredItem._trashedFicha;
  // Igual que con la ficha técnica de una receta: las reservas/ventas que
  // quedaron desvinculadas al borrar un cliente (ver deleteClient, js/app.js)
  // se re-vinculan aquí si el cliente se restaura a tiempo, en vez de dejar
  // su historial huérfano para siempre pese a haber "deshecho" el borrado.
  const unlinkedReservationIds = restoredItem._unlinkedReservationIds || [];
  const unlinkedSaleIds = restoredItem._unlinkedSaleIds || [];
  delete restoredItem._unlinkedReservationIds;
  delete restoredItem._unlinkedSaleIds;
  DB[key].push(restoredItem);
  if(trashedFicha){
    if(!DB.fichas) DB.fichas = [];
    DB.fichas.push(trashedFicha);
  }
  if(entry.type === 'client' && (unlinkedReservationIds.length || unlinkedSaleIds.length)){
    (DB.reservations||[]).forEach(r => { if(unlinkedReservationIds.includes(r.id)) r.clientId = restoredItem.id; });
    (DB.sales||[]).forEach(s => { if(unlinkedSaleIds.includes(s.id)) s.clientId = restoredItem.id; });
  }
  DB.trash = DB.trash.filter(x => x.id !== trashId);
  saveDB();
  showToast(t('trash.restoredOk'));
  if(typeof openTrashModal === 'function') openTrashModal();
  // Refresca la vista que corresponda si está activa, para que se vea ya.
  const active = document.querySelector('.view.active');
  if(active) renderView(active.id.replace('view-',''));
}
function purgeTrashItem(trashId){
  DB.trash = (DB.trash||[]).filter(x => x.id !== trashId);
  saveDB();
  if(typeof openTrashModal === 'function') openTrashModal();
}
const TRASH_TYPE_LABEL_KEY = {employee:'label.employee', client:'label.client', recipe:'label.recipe', ingredient:'label.ingredient', elaboracion:'label.elaboration', reservation:'label.reservation', order:'label.order'};
const TRASH_TYPE_NAME_FIELD = {employee:'name', client:'name', recipe:'name', ingredient:'name', elaboracion:'name', reservation:'clientName', order:'clienteNombre'};
function openTrashModal(){
  const items = [...(DB.trash||[])].sort((a,b) => new Date(b.deletedAt) - new Date(a.deletedAt));
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-trash"></i> ${t('trash.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('trash.desc').replace('${n}', TRASH_RETENTION_DAYS)}</p>
    ${items.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.type')}</th><th>${t('common.name')}</th><th>${t('trash.deletedBy')}</th><th>${t('trash.deletedAt')}</th><th></th></tr></thead>
        <tbody>${items.map(x => `
          <tr>
            <td>${t(TRASH_TYPE_LABEL_KEY[x.type]||'common.unknown')}</td>
            <td>${escapeHtml(x.item[TRASH_TYPE_NAME_FIELD[x.type]] || '—')}</td>
            <td>${escapeHtml(x.deletedBy||'—')}</td>
            <td>${escapeHtml(new Date(x.deletedAt).toLocaleString('es-ES'))}</td>
            <td class="actions-cell">
              <button class="btn btn-sm" onclick="restoreTrashItem(${x.id})"><i class="ti ti-arrow-back-up"></i> ${t('trash.restore')}</button>
              <button class="btn btn-sm btn-icon btn-danger" onclick="purgeTrashItem(${x.id})" title="${t('trash.purgeOne')}"><i class="ti ti-x"></i></button>
            </td>
          </tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-trash-off"></i>${t('trash.empty')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
}

/* ============================================================
   REGISTRO DE AUDITORÍA
   Quién hizo qué y cuándo, para negocios con varios encargados/dueños —
   no sustituye a los historiales específicos ya existentes (stock,
   descuentos, anulaciones, cierres de caja), los complementa con los
   cambios que antes no quedaban registrados en ningún sitio.
   ============================================================ */
// severity: 'critical' para decisiones que de verdad duelen si salen mal
// (borrar algo, un precio que cambia, vaciar los datos de un cliente...) —
// se pintan en rojo en el listado, para que salten a la vista entre el
// resto de movimientos normales del día a día (editar, fusionar mesas,
// reasignar camarero...). 'normal' si no se indica, a propósito: así una
// llamada antigua a logAudit() sin este argumento sigue funcionando igual
// que siempre, sin marcarse en rojo por defecto.
// El Registro de actividad es, a propósito, SOLO de empleados: la idea es
// poder ver qué ha hecho cada persona del equipo, no auditar al propio
// dueño (que ya tiene acceso a todo y no tiene sentido que se audite a sí
// mismo). Si quien hace la acción entró como propietario (o no hay sesión
// reconocible), no se registra nada aquí.
function logAudit(action, summary, severity){
  const session = (typeof getAccessSession === 'function') ? getAccessSession() : null;
  if(!session || session.type !== 'employee') return;
  if(!DB.auditLog) DB.auditLog = [];
  DB.auditLog.unshift({id: genId(), ts: new Date().toISOString(), actor: currentActorName(), action, summary, severity: severity||'normal'});
  if(DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
}
let auditLogEmployeeFilter = '';
function setAuditLogEmployeeFilter(val){
  auditLogEmployeeFilter = val;
  renderAuditLogModal();
}
function openAuditLogModal(){
  auditLogEmployeeFilter = '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-list-details"></i> ${t('audit.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('audit.desc')}</p>
    <div class="field" style="margin-bottom:10px">
      <select id="audit-employee-filter" onchange="setAuditLogEmployeeFilter(this.value)">
        <option value="">${t('audit.allActors')}</option>
        ${[...new Set((DB.auditLog||[]).map(x=>x.actor))].sort().map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('')}
      </select>
    </div>
    <div id="audit-log-body"></div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
  renderAuditLogModal();
}
function renderAuditLogModal(){
  const box = document.getElementById('audit-log-body');
  if(!box) return;
  let items = (DB.auditLog||[]);
  if(auditLogEmployeeFilter) items = items.filter(x => x.actor === auditLogEmployeeFilter);
  items = items.slice(0, 200);
  box.innerHTML = items.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('trash.deletedBy')}</th><th>${t('audit.action')}</th></tr></thead>
        <tbody>${items.map(x => `
          <tr ${x.severity==='critical'?'style="background:var(--red-l)"':''}>
            <td style="white-space:nowrap">${escapeHtml(new Date(x.ts).toLocaleString('es-ES'))}</td>
            <td>${escapeHtml(x.actor)}</td>
            <td style="${x.severity==='critical'?'color:var(--red);font-weight:700':''}">${x.severity==='critical'?'<i class="ti ti-alert-triangle"></i> ':''}${escapeHtml(x.summary)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-list-details"></i>${t('audit.empty')}</div>`;
}

// Registra el Service Worker del app-shell offline (ver sw.js). Los datos de
// negocio no dependen de esto en absoluto (ya viven en IndexedDB local); esto
// solo permite que la propia app cargue aunque no haya conexión a mitad de
// servicio. file:// y localhost no soportan/necesitan Service Worker.
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.protocol === 'http:') && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

