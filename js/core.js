/* ============================================================
   GASTROGOAN · KIT DE GESTIÓN HOSTELERA
   App con sincronización en la nube (Firebase) y respaldo local
   ============================================================ */

const DB_KEY = 'gastrogoan_data_v1';

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
// mismo código de la licencia comprada (ver activateBusinessLicense), y se
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
const ACCESS_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos

function getOwnerLogin(){
  try{ return JSON.parse(localStorage.getItem(OWNER_LOGIN_LS)); }catch(e){ return null; }
}
// La contraseña del día a día puede ser distinta de la que vino con la
// licencia (ver confirmOwnerAccessSetup/changeOwnerAccessPassword) — el
// código en cambio es siempre el de la licencia real, no cambia.
function setOwnerLogin(code, passwordPlain){
  localStorage.setItem(OWNER_LOGIN_LS, JSON.stringify({code: code.toUpperCase(), passHash: hashPin(passwordPlain)}));
}
function verifyOwnerLogin(code, passwordPlain){
  const login = getOwnerLogin();
  if(!login) return false;
  return login.code === code.trim().toUpperCase() && login.passHash === hashPin(passwordPlain);
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
}
function clearAccessSession(){
  localStorage.removeItem(ACCESS_SESSION_LS);
  localStorage.removeItem(ACCESS_LAST_ACTIVITY_LS);
}

let accessScreenMode = 'choice'; // 'choice' | 'employee' | 'owner' | 'owner-setup'
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
    ${renderAccessLangSwitcherHtml()}
    <div class="access-wrap">
      <div class="access-brand">
        <div class="access-icon"><i class="ti ti-tools-kitchen-2"></i></div>
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
  if(accessScreenMode === 'owner' || accessScreenMode === 'owner-setup') return renderOwnerAccessFormHtml();
  return `
    <div class="access-card">
      <div class="access-choice-list">
        <button class="access-choice-btn primary" onclick="setAccessScreenMode('employee')">
          <span class="aci"><i class="ti ti-users"></i></span>
          <span class="act"><b>${t('access.employeeBtn')}</b><small>${t('access.employeeHint')}</small></span>
        </button>
        <button class="access-choice-btn secondary" onclick="setAccessScreenMode('${getOwnerLogin()?'owner':'owner-setup'}')">
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
  const isSetup = accessScreenMode === 'owner-setup';
  return `
    <div class="access-card">
      <button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="showAccessSelectScreen()" title="${t('common.back')}"><i class="ti ti-arrow-left"></i></button>
      <div class="access-card-title">${t('access.ownerBtn')}</div>
      <p class="access-card-lead">${isSetup ? t('access.ownerSetupDesc') : t('access.ownerDesc')}</p>
      <div class="field">
        <label>${t('access.businessCode')}</label>
        <input type="text" id="acc-owner-code" maxlength="8" placeholder="XXXXXXXX" style="letter-spacing:2px;font-size:18px;text-align:center;text-transform:uppercase" value="${isSetup ? '' : escapeHtml(getOwnerLogin()?.code||'')}">
      </div>
      <div class="field">
        <label>${t('access.password')}</label>
        <input type="password" id="acc-owner-pass" style="letter-spacing:4px;font-size:18px;text-align:center;text-transform:uppercase" onkeydown="if(event.key==='Enter')${isSetup?'confirmOwnerAccessSetup':'confirmOwnerAccess'}()">
      </div>
      <button class="btn btn-primary" style="width:100%;margin-top:6px" onclick="${isSetup?'confirmOwnerAccessSetup()':'confirmOwnerAccess()'}">${t('common.unlock')}</button>
    </div>
  `;
}

// Primera vez en este dispositivo: se valida el código+contraseña que se
// entregó al comprar la licencia (activateBusinessLicense), y esa misma
// contraseña queda guardada como el acceso de propietario de este
// dispositivo — se puede cambiar después desde el panel de negocios
// (changeOwnerAccessPassword), sin tener que volver a escribir la de compra.
function confirmOwnerAccessSetup(){
  const code = document.getElementById('acc-owner-code').value.trim();
  const password = document.getElementById('acc-owner-pass').value.trim();
  const lic = activateBusinessLicense(code, password);
  if(!lic){ showToast(t('access.badCredentials')); return; }
  localStorage.setItem(LICENSE_LS, JSON.stringify(lic));
  DB.license = lic;
  // "owner-setup" solo se ve cuando este dispositivo aún no tenía ningún
  // login de propietario guardado — es decir, la primera vez de verdad
  // para este negocio en este dispositivo. Por si el slot activo llevaba
  // restos de alguna prueba anterior (nube mal configurada, aviso de
  // hosting ya descartado, tour ya visto...), se limpia todo eso para que
  // la configuración inicial (nube, tour) se pida siempre de cero, sin
  // arrastrar nada de negocios o pruebas anteriores en este mismo navegador.
  delete DB.business.ownFirebase;
  DB.business.netlifySetupDone = false;
  DB.business.extConnPromptSeen = false;
  DB.business.tourSeen = false;
  saveDB();
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === ACTIVE_SLOT);
  if(slot){ slot.code = lic.code; saveBusinessSlots(slots); }
  setOwnerLogin(lic.code, password);
  setAccessSession({type:'owner'});
  applyOwnerSessionEditRights();
  hideAccessSelectScreen();
  initCloud();
  initPublicRequestsListener();
  checkLicenseRevocation();
  linkBusinessToOwnerProfile(lic.tenantId, lic.tenantId, lic.code, DB.business && DB.business.name);
  // Justo después de activar la licencia por primera vez, toca terminar el
  // resto de la configuración inicial (aviso de hosting local si aplica,
  // nube propia, tour) antes de dar por hecho que el negocio ya está listo.
  if(continuePendingOwnerSetup()) return;
  showBusinessSelectScreen();
  syncOwnerBusinessList(lic.code).then(() => { if(getAccessSession() && getAccessSession().type === 'owner') showBusinessSelectScreen(); });
}
// Código maestro oculto de recuperación: si alguien olvida su contraseña
// (propietario) o su PIN (empleado), escribiéndolo en el campo de
// contraseña/PIN se le pide fijar uno nuevo en el momento, sin tener que
// contactar con soporte. No se comunica a los clientes.
const MASTER_RESET_CODE = 'GGGG';
function confirmOwnerAccess(){
  const code = document.getElementById('acc-owner-code').value.trim();
  const password = document.getElementById('acc-owner-pass').value.trim();
  if(password.toUpperCase() === MASTER_RESET_CODE){
    if(!getOwnerLogin() || getOwnerLogin().code !== code.toUpperCase()){ showToast(t('access.badCredentials')); return; }
    const newPassword = prompt(t('access.newPasswordPrompt'));
    if(!newPassword || !newPassword.trim()) return;
    if(!/^\d{4}$/.test(newPassword.trim())){ showToast(t('msg.pin4digits')); return; }
    setOwnerLogin(code, newPassword.trim());
    showToast(t('access.passwordReset'));
  }else if(!verifyOwnerLogin(code, password)){ showToast(t('access.badCredentials')); return; }
  setAccessSession({type:'owner'});
  applyOwnerSessionEditRights();
  hideAccessSelectScreen();
  if(continuePendingOwnerSetup()) return;
  showBusinessSelectScreen();
  syncOwnerBusinessList(code).then(() => { if(getAccessSession() && getAccessSession().type === 'owner') showBusinessSelectScreen(); });
}
// Cambia la contraseña de acceso de propietario de ESTE dispositivo (el
// código de negocio no cambia, sigue siendo el de la licencia).
function changeOwnerAccessPassword(newPassword){
  const login = getOwnerLogin();
  if(!login) return;
  setOwnerLogin(login.code, newPassword);
}

function findEmployeeMatch(employees, name, pin){
  return (employees||[]).find(e => {
    if(e.active === false) return false;
    if(!e.name || e.name.trim().toLowerCase() !== name.toLowerCase()) return false;
    const storedPin = e.pin || '1234';
    return storedPin.startsWith('H:') ? hashPin(pin) === storedPin : pin === storedPin;
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
  slots.push({ id: newId, name: (remoteData.business && remoteData.business.name) || t('bs.defaultBusinessName'), code });
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
      const newPin = prompt(t('access.newPinPrompt'));
      if(!newPin || !newPin.trim()){ return; }
      owner.pin = newPin.trim();
      try{ await writeSlotDB(localSlot.id, slotData); }catch(e){ showToast(t('access.connectFailed')); return; }
      showToast(t('access.pinReset'));
      return;
    }
    const match = findEmployeeMatch(slotData.employees, name, pin);
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
  const match = findEmployeeMatch(remoteData.employees, name, pin);
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
// aparte): pide el código+contraseña que se entrega en esa compra, igual
// que al activar la app por primera vez.
function promptBusinessLicense(){
  const code = prompt(t('gate.newBusinessCodePrompt'));
  if(!code) return null;
  const password = prompt(t('gate.newBusinessPasswordPrompt'));
  if(!password) return null;
  const lic = activateBusinessLicense(code, password);
  if(!lic){ alert(t('access.badCredentials')); return null; }
  return lic;
}
function addNewBusiness(){
  const lic = promptBusinessLicense();
  if(!lic) return;
  const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const slots = getBusinessSlots();
  slots.push({ id, name: 'Nuevo negocio', code: lic.code });
  saveBusinessSlots(slots);
  localStorage.setItem(slotLicenseKey(id), JSON.stringify(lic));
  linkBusinessToOwnerProfile(getPrimaryTenantId(), lic.tenantId, lic.code, 'Nuevo negocio');
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
  const lic = promptBusinessLicense();
  if(!lic) return;
  parentSlotId = parentSlotId || ACTIVE_SLOT;
  const slots = getBusinessSlots();
  const parentSlot = slots.find(s => s.id === parentSlotId);
  const parentName = parentSlot?.name || t('gate.branchDefaultName');
  const sucursalesExistentes = slots.filter(s => s.parentId === parentSlotId).length;
  const nombreSugerido = t('gate.branchSuggestedName').replace('${parent}', parentName).replace('${n}', sucursalesExistentes + 2);
  const nombre = prompt(t('gate.newBranchPrompt').replace('${parent}', parentName), nombreSugerido);
  if(!nombre) return;

  // Leer datos del padre (puede ser el activo u otro slot)
  let src;
  try { src = await readSlotDB(parentSlotId); } catch(e){ src = defaultData(); }

  const def = defaultData();
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
    cartas: JSON.parse(JSON.stringify(src.cartas || [])),
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

  slots.push({ id: newId, name: nombre, parentId: parentSlotId, code: lic.code });
  saveBusinessSlots(slots);
  localStorage.setItem(slotLicenseKey(newId), JSON.stringify(lic));
  linkBusinessToOwnerProfile(getPrimaryTenantId(), lic.tenantId, lic.code, nombre);
  switchToBusiness(newId);
}

function removeBusinessSlot(slotId){
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === slotId);
  if(!slot) return;
  const typed = prompt(t('gate.confirmRemoveBusiness').replace('${name}', slot.name));
  if(typed === null) return;
  if(typed.trim().toLowerCase() !== slot.name.trim().toLowerCase()){
    showToast(t('gate.removeBusinessNameMismatch'));
    return;
  }

  indexedDB.deleteDatabase(slotIdbName(slotId));
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

function renderBusinessSelectScreenHtml(){
  const slots = getBusinessSlots();
  // Pre-abrir el grupo que contiene el slot activo
  const activeSlot = slots.find(s => s.id === ACTIVE_SLOT);
  if(activeSlot?.parentId) _bsOpenGroups.add(activeSlot.parentId);
  else if(slots.some(s => s.parentId === ACTIVE_SLOT)) _bsOpenGroups.add(ACTIVE_SLOT);

  const showSearch = slots.length > 5;
  return `
    <div class="bs-box">
      <button class="modal-close" style="position:absolute;top:16px;right:16px" onclick="hideBusinessSelectScreen()" title="${t('common.close')}">&times;</button>
      <div class="bs-title">
        <div class="splash-icon" style="position:static;background:var(--brand-orange);color:#fff"><i class="ti ti-tools-kitchen-2"></i></div>
        ${t('bs.title')}
      </div>
      ${showSearch ? `<input id="bs-search" type="search" placeholder="${t('bs.searchPh')}" style="width:100%;box-sizing:border-box;padding:9px 12px;border:1px solid var(--border);border-radius:10px;font-size:14px;margin-bottom:2px" oninput="filterBusinessSlots(this.value)" autofocus>` : ''}
      <div class="bs-list" id="bs-list">
        ${renderBsGroups(slots)}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" onclick="addNewBusiness()"><i class="ti ti-plus"></i> ${t('btn.newIndependent')}</button>
        <button class="btn" style="flex:1;border:1px solid var(--brand-orange);color:var(--brand-orange)" onclick="pickParentForSucursal()"><i class="ti ti-copy"></i> ${t('btn.openBranch')}</button>
      </div>
      <a href="https://buy.stripe.com/aFa6oGeSK44jaFw1mvdwc01" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:10px;background:var(--olive);color:#FAF8F4;padding:12px;font-weight:700;font-size:14px;text-decoration:none"><i class="ti ti-shopping-cart"></i> ${t('bs.buyLicense')}</a>
      <button class="btn" style="width:100%;margin-top:4px;background:none;border:none;color:var(--muted);font-size:12.5px" onclick="promptChangeOwnerPassword()"><i class="ti ti-key"></i> ${t('access.changePassword')}</button>
    </div>
  `;
}
// La contraseña de la licencia (6 caracteres, letras y números) es difícil
// de recordar de memoria — por eso, en cuanto el propietario la cambia por
// la suya, se le obliga a que sea un PIN numérico de 4 dígitos, mucho más
// fácil de recordar y de teclear cada vez. El código de negocio no cambia.
function promptChangeOwnerPassword(){
  const login = getOwnerLogin();
  if(!login) return;
  const pinInputAttrs = `maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')"`;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-key"></i> ${t('access.changePassword')}</h3>
      <button class="modal-close" onclick="closeModal();continuePendingOwnerSetup()">&times;</button>
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
      <button class="btn" onclick="closeModal();continuePendingOwnerSetup()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmChangeOwnerPassword()">${t('common.save')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('owner-new-pass-1')?.focus(), 50);
}
function confirmChangeOwnerPassword(){
  const p1 = document.getElementById('owner-new-pass-1').value.trim();
  const p2 = document.getElementById('owner-new-pass-2').value.trim();
  if(!/^\d{4}$/.test(p1)){ showToast(t('msg.pin4digits')); return; }
  if(p1 !== p2){ showToast(t('msg.pinNoMatch')); return; }
  changeOwnerAccessPassword(p1);
  closeModal();
  showToast(t('msg.pinUpdated'));
  continuePendingOwnerSetup();
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
      return `
        <div class="bs-item ${isRootActive?'active':''}" onclick="enterBusiness('${escapeHtml(root.id)}')">
          <div style="display:flex;align-items:center;gap:8px;overflow:hidden">
            <i class="ti ti-building-store" style="flex-shrink:0"></i>
            <span class="bs-item-name">${escapeHtml(root.name||t('bs.defaultBusinessName'))}</span>
            <span style="font-size:11px;color:var(--muted);font-weight:400;flex-shrink:0">(${t('bs.independentTag')})</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
            ${isRootActive ? `<span class="badge badge-amber">${t('bs.current')}</span>` : '<i class="ti ti-chevron-right" style="color:var(--muted)"></i>'}
            ${total>1 ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(root.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>` : ''}
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
            ${total>1 ? `<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(root.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>` : ''}
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
              <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();removeBusinessSlot('${escapeHtml(s.id)}')" title="${t('bs.remove')}"><i class="ti ti-trash"></i></button>
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
  });
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
function ggBizPassword(code){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const secret = _ggBizSecret();
  let h = ggLicHash(code + secret);
  let pass = '', x = h;
  for(let c = 0; c < 6; c++){ pass += A[x % 32]; x = Math.floor(x / 32); }
  return pass;
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
// Valida un par código+contraseña y, si es correcto, devuelve la licencia
// lista para guardar ({code, tenantId}). null si no coincide.
function activateBusinessLicense(code, password){
  code = String(code||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  password = String(password||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!code || !password) return null;
  if(ggBizPassword(code) !== password) return null;
  return {code, tenantId: ggBizTenantId(code)};
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
   enlace/QR de reservas y pedidos online. Se calcula a partir del
   tenantId, pero no permite deducir la clave de licencia ni acceder
   al resto de los datos del negocio. */
function getPublicId(){
  const tenantId = getTenantId();
  if(!tenantId) return null;
  // padStart asegura siempre 7 caracteres (un uint32 en base36 ocupa
  // como máximo 7), para cumplir el mínimo de 4 que exigen las reglas
  // de Firebase ($publicId.length >= 4) sin importar el valor del hash.
  return ggLicHash(tenantId + '·gastrogoan·public·v1').toString(36).padStart(7, '0');
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
      <div style="width:54px;height:54px;border-radius:14px;background:#8A4A3B;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">🔒</div>
      <h2 style="margin-bottom:4px">Licencia desactivada</h2>
      <p style="color:#444;font-size:13.5px;line-height:1.6">Esta clave de licencia ha sido desactivada. Si crees que es un error, ponte en contacto con quien te vendió GastroGoan.</p>
    </div>`;
  document.body.appendChild(g);
}

const ONBOARDING_ROLE_LS = 'gastrogoan_onboarding_role';

// Este gate ya solo lo ve el propietario: activar la licencia de un negocio
// nuevo es siempre algo que hace quien lo compró, así que se quitó el
// selector "¿quién eres? dueño/empleado" — un empleado nunca llega aquí,
// entra siempre por "Acceso Empleados" con nombre+PIN+código, sin licencia
// que pegar. Reutiliza el mismo código+contraseña corto de la compra en vez
// de la antigua clave larga.
function showActivationGate(){
  if(document.getElementById('license-gate')) return;
  const g = document.createElement('div');
  g.id = 'license-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px';
  const showBackBtn = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;text-align:center;position:relative">
      <button onclick="${showBackBtn ? 'backToBusinessSelectorFromGate()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> ${showBackBtn ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">🍽</div>
      <h2 style="margin-bottom:4px">GastroGoan</h2>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:18px">${t('gate.lic.stepLabel')}</p>
      <div style="text-align:left">
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px">🔑 ${t('access.businessCode')} <span style="font-weight:400;color:var(--muted)">(${t('gate.lic.givenByVendor')})</span></label>
        <input id="license-code-input" type="text" placeholder="XXXXXXXX" style="width:100%;border:1.5px solid var(--border);border-radius:9px;padding:12px;font-family:monospace;font-size:16px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px">
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px">${t('access.password')}</label>
        <input id="license-password-input" type="text" placeholder="XXXXXX" style="width:100%;border:1.5px solid var(--border);border-radius:9px;padding:12px;font-family:monospace;font-size:16px;letter-spacing:2px;text-transform:uppercase">
        <div id="license-error" style="display:none;background:#F5EBE7;color:#8A4A3B;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:10px"></div>
        <button onclick="activateLicenseFromGate()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:12px">${t('gate.lic.activateBtn')}</button>
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
    alert(t('msg.copyFailed'));
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
        <span style="color:var(--muted)">Guarda también estos dos datos en un sitio seguro (notas del móvil, etc.) para poder configurar el resto de dispositivos (camareros, cocina) más adelante — solo tienen que pegar lo mismo, como indica el aviso azul de abajo.</span>`,
     ca:`Enganxa aquests dos valors als camps següents i prem "Desar i connectar". L'app es recarregarà i quedarà a punt.<br><br>
        <span style="color:var(--muted)">Desa també aquestes dues dades en un lloc segur (notes del mòbil, etc.) per poder configurar la resta de dispositius (cambrers, cuina) més endavant — només han d'enganxar el mateix, tal com indica l'avís blau de sota.</span>`,
     en:`Paste those two values into the fields below and click "Save and connect". The app will reload and be ready.<br><br>
        <span style="color:var(--muted)">Also save these two values somewhere safe (phone notes, etc.) so you can set up the other devices (waiters, kitchen) later — they just need to paste the same values, as the blue notice below explains.</span>`}},
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
  {icon:'💳', titleKey:'mn.redsys.title', descKey:'mn.redsys.desc', renderCard: () => renderRedsysCard()},
  {icon:'✉️', titleKey:'mn.emailConfirm.title', descKey:'mn.emailConfirm.desc', renderCard: () => renderEmailConfirmCard()},
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
        <div style="width:54px;height:54px;border-radius:14px;background:var(--teal,#2a8f88);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">${step.icon}</div>
        <p style="font-size:11.5px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">${t('gate.extConn.stepLabel').replace('${n}', extConnPromptStep+1).replace('${total}', EXT_CONN_PROMPT_STEPS.length)}</p>
        <h2 style="margin-bottom:4px">${t(step.titleKey)}</h2>
      </div>
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">
        ${t(step.descKey)}<br><br>
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
        📱 <strong>${t('gate.employeeQuestion')}</strong> ${t('gate.employeeBody')}
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
      <h3 style="font-size:14px;margin-bottom:12px;text-align:left">👤 ${t('gate.followSteps')}</h3>
      ${stepsHtml}
      <details style="margin:14px 0 6px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">📱 ${t('gate.shareWithEmployees')}</summary>
        <div style="margin-top:10px">${employeeBoxHtml}</div>
      </details>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:6px">
        ${renderOwnFirebaseForm()}
      </div>`;
  }

  const showBackBtnFb = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:560px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px;position:relative">
      <button onclick="${showBackBtnFb ? 'hideFirebaseSetupGate();showBusinessSelectScreen()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> ${showBackBtnFb ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">☁️</div>
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
      <button onclick="${showBackBtnNt ? 'hideNetlifySetupGate();showBusinessSelectScreen()' : 'exitSetupGateToLogin()'}" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> ${showBackBtnNt ? t('gate.businesses') : t('gate.exitSetup')}</button>
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">🌐</div>
        <h2 style="margin-bottom:4px">${t('gate.nt.title')}</h2>
      </div>
      <div style="background:#F5EBE7;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">⚠️ ${t('gate.nt.notHostedBody')}</div>
      <button onclick="confirmNetlifyDone()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:8px">✅ ${t('gate.nt.doneBtn')}</button>
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
  if(!getLicense()) showActivationGate();
  else if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!DB.business.extConnPromptSeen) showExternalConnectionsPrompt();
    else if(!DB.business.tourSeen) promptAppTour();
}
function postponeNetlify(){
  hideNetlifySetupGate();
  if(!getLicense()) showActivationGate();
  else if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!DB.business.extConnPromptSeen) showExternalConnectionsPrompt();
    else if(!DB.business.tourSeen) promptAppTour();
}

function activateLicenseFromGate(){
  const code = (document.getElementById('license-code-input').value || '').trim();
  const password = (document.getElementById('license-password-input').value || '').trim();
  const lic = activateBusinessLicense(code, password);
  const err = document.getElementById('license-error');
  if(!lic){
    err.textContent = t('gate.invalidLicenseKey');
    err.style.display = 'block';
    return;
  }
  localStorage.setItem(LICENSE_LS, JSON.stringify(lic));
  DB.license = lic;
  saveDB();
  // El código de negocio de este slot es el mismo que el de la licencia —
  // es lo que se usará después para que los empleados entren desde
  // "Acceso Empleados" sin tener que repetir la contraseña de la licencia.
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === ACTIVE_SLOT);
  if(slot){ slot.code = lic.code; saveBusinessSlots(slots); }
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
  // inicial: si acaba de activar la licencia, se le anima a cambiar la
  // contraseña que venía con ella justo al entrar, no al final del todo.
  if(getOwnerLogin() && !localStorage.getItem(OWNER_PASS_PROMPTED_LS)){ promptChangeOwnerPasswordFirstTime(); return true; }
  if(!DB.business.netlifySetupDone){ showNetlifySetupGate(); return true; }
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
      <button class="btn btn-primary" onclick="localStorage.setItem('${OWNER_PASS_PROMPTED_LS}','1');closeModal();promptChangeOwnerPassword()">${t('access.changePassword')}</button>
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
function saveOwnFirebaseConfig(){
  const apiKey = document.getElementById('own-fb-apikey').value.trim();
  const databaseURL = document.getElementById('own-fb-dburl').value.trim();
  if(!apiKey && !databaseURL){
    if(!DB.business.ownFirebase) return;
    if(!confirm(t('msg.confirmRemoveFirebase'))) return;
    delete DB.business.ownFirebase;
    saveDB();
    location.reload();
    return;
  }
  if(!apiKey || !databaseURL){
    alert(t('msg.fillBothFields'));
    return;
  }
  if(!/^https:\/\/[^\s]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(databaseURL)){
    alert(t('msg.invalidDbUrl'));
    return;
  }
  DB.business.ownFirebase = { apiKey, databaseURL };
  saveDB();
  alert(t('msg.firebaseSaved'));
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

const MERGEABLE_ARRAYS = new Set([
  'ingredients','recipes','fichas','menuItems','cartas','menus',
  'purchaseOrders','providers','tables','tpvOrders','sales',
  'cashClosures','employees','turnos','fichajes','promos',
  'cleaningTasks','clients','chatMessages','reservations',
  'ingredientCategories','recipeCategories','elaboraciones',
  'voidLog','discountLog','waitlist','vacationRequests','npsScores','bankReconciliations'
]);

/* Hash simple para PINs (4 dígitos) — no almacenar en texto plano */
function hashPin(pin){
  const salt = 'GG2024$p';
  let h = 0x811c9dc5;
  const s = salt + pin + salt;
  for(let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 'H:' + (h >>> 0).toString(36);
}

function updateSyncBadge(state){
  const el = document.getElementById('sync-badge');
  if(!el) return;
  if(state === 'local'){ el.style.display = 'none'; return; }
  el.style.display = 'inline-block';
  if(state === 'online'){ el.textContent = `☁ ${t('gate.cloudConnectedShort')}`; el.style.background = '#1F8A4C'; el.style.color = '#FFFFFF'; }
  else if(state === 'offline'){ el.textContent = `☁ ${t('gate.offline')}`; el.style.background = '#B8860B'; el.style.color = '#FFFFFF'; }
  else { el.textContent = `☁ ${t('gate.cloudError')}`; el.style.background = '#C0392B'; el.style.color = '#FFFFFF'; }
}

function refreshAfterRemoteChange(){
  renderHeader();
  renderModuleBadges();
  const overlay = document.getElementById('modal-overlay');
  if(overlay && overlay.classList.contains('active')) return; // no interrumpir al usuario mientras edita
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
    if(r.status !== 'pendiente' && r.status !== 'confirmada') return;
    if(!r.date || r.date < today) return;
    const turnoIdx = getTurnoIndexForTime(r.date, r.time);
    if(turnoIdx === null) return;
    if(!resumen[r.date]) resumen[r.date] = {};
    resumen[r.date][turnoIdx] = (resumen[r.date][turnoIdx]||0) + (r.people||0);
  });
  return resumen;
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
        // El aforo del turno ya se comprobó de forma atómica al enviar la
        // solicitud (reserveAforoAtomic, en la web pública) — aquí solo
        // queda intentar asignar mesa automáticamente, igual que haría el
        // personal a mano. Si hay una mesa libre con plazas suficientes, la
        // reserva se confirma sola, sin ningún clic; si no (grupo grande
        // fragmentado entre varias mesas pequeñas, etc.), se deja
        // 'pendiente' para que el personal solo tenga que elegir la mesa.
        const autoTable = (getAvailableTablesForReservation(req.date, req.time, null, req.people || 1) || [])
          .filter(tb => (tb.plazas || 0) >= (req.people || 1))
          .sort((a, b) => (a.plazas || 0) - (b.plazas || 0))[0] || null;
        const newReservation = {
          id: genId(), clientId: matchedClient ? matchedClient.id : null,
          clientName: req.clientName || '', clientPhone: req.clientPhone || '', clientEmail: req.clientEmail || '',
          date: req.date, time: req.time, people: req.people || 1,
          tableId: autoTable ? autoTable.id : null, notes: req.notes || '', status: autoTable ? 'confirmada' : 'pendiente',
          referral: req.referral || '',
          depositRequired: req.depositRequired || false, depositAmount: req.depositAmount || '', depositConfirmed: false,
          origen: 'publico', createdAt: new Date().toISOString(),
          // El teléfono llega tal cual lo escribió el cliente en la web pública,
          // sin pasar por la misma validación que saveClient (que sí bloquea con
          // confirmación un teléfono con menos de 9 dígitos): se marca aquí para
          // que el personal lo vea al gestionar la solicitud, no se descubre a ciegas.
          phoneOdd: !!(req.clientPhone && req.clientPhone.replace(/[^\d]/g,'').length < 9)
        };
        DB.reservations.push(newReservation);
        if(autoTable && typeof sendReservationConfirmationEmail === 'function'){
          sendReservationConfirmationEmail({...newReservation, tableName: autoTable.name}).catch(()=>{});
        }
        notifyNewRequest = true;
      }else if(req.type === 'nps_response'){
        if(!DB.npsScores) DB.npsScores = [];
        DB.npsScores.push({id: genId(), score: req.score, comment: req.comment || '', createdAt: new Date().toISOString()});
      }else if(req.type === 'pedido' && req.tipo === 'mesa'){
        // Auto-pedido desde la mesa: se añade directamente a la comanda de esa
        // mesa (si ya está abierta) o se abre una comanda nueva, sin pasar por
        // la bandeja de "pedidos pendientes".
        const items = (req.items || []).map(l => ({platoId: null, recipeId: null, name: l.name, price: l.price, qty: l.qty, tanda: '', notas: '', nuevo: true}));
        const table = DB.tables.find(t => t.id === req.tableId);
        let order = table ? DB.tpvOrders.find(o => o.tableId === table.id && o.status === 'abierta') : null;
        if(order){
          items.forEach(it => order.items.push(it));
        }else{
          DB.tpvOrders.push({
            id: genId(), tableId: req.tableId || null, tipo:'mesa', pax: req.pax || 1,
            clienteNombre: req.clienteNombre || '', status:'abierta', items, tandas:[], createdAt: new Date().toISOString(),
            clientRef: req.clientRef || null
          });
        }
      }else if(req.type === 'pedido'){
        const onlineItems = (req.items || []).map(l => ({platoId: l.platoId||null, recipeId: l.recipeId||null, name: l.name||l.nombre||'', price: l.price||l.precio||0, qty: l.qty||1, tanda: l.tanda||'', notas: l.notas||''}));
        const newOrderId = genId();
        DB.tpvOrders.push({
          id: newOrderId, tableId: null, tipo: req.tipo === 'delivery' ? 'delivery' : 'takeaway',
          clienteNombre: req.clienteNombre || '', clienteTelefono: req.clienteTelefono || '', clienteEmail: req.clienteEmail || '',
          clienteDireccion: req.clienteDireccion || '', clienteCodigoPostal: req.codigoPostal || '',
          notas: req.notas || '',
          date: req.date || '', time: req.time || '',
          costeEnvio: req.costeEnvio || 0,
          status: 'pendiente-online', items: onlineItems, tandas: [], createdAt: new Date().toISOString(),
          clientRef: req.clientRef || null,
          pendienteVerificarZona: !!req.pendienteVerificarZona,
          phoneOdd: !!(req.clienteTelefono && req.clienteTelefono.replace(/[^\d]/g,'').length < 9),
          // El cliente ya indicó en la web pública con qué billete va a pagar
          // (o si va a pagar con tarjeta en persona) — así el reparto ya
          // sabe cuánto cambio llevar sin tener que preguntarlo aparte.
          metodoPagoLocal: req.metodoPagoLocal || null,
          pagaCon: typeof req.pagaCon === 'number' ? req.pagaCon : null
        });
        // Con el interruptor de "Pedidos online" en ON (por defecto), el
        // pedido se acepta solo, sin pasar por la bandeja de pendientes —
        // salvo que necesite verificación manual de zona de reparto, en
        // cuyo caso siempre se deja pendiente pase lo que pase el interruptor.
        if(DB.business.pedidosOnlineActivos !== false && !req.pendienteVerificarZona && typeof acceptOnlineOrder === 'function'){
          acceptOnlineOrder(newOrderId, true);
        }
        notifyNewRequest = true;
      }else if(req.type === 'pago_confirmado'){
        // Confirmación de pago con tarjeta (TPV virtual / Redsys), recibida
        // automáticamente a través del Worker. Marca el pedido como pagado.
        const order = DB.tpvOrders.find(o => o.clientRef && o.clientRef === req.orderRef);
        if(order){
          order.pagado = true;
          order.pagoImporte = req.amount;
          order.pagoFecha = req.createdAt;
        }
      }
      saveDB();
      refreshAfterRemoteChange();
      if(notifyNewRequest) playNewRequestAlert();
      reqRef.remove();
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
      const pid = ggLicHash(lic.tenantId + '·gastrogoan·public·v1').toString(36).padStart(7, '0');
      list.push({name: s.name, publicId: pid});
    }catch(e){}
  }
  return list.length > 1 ? list : null;
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
        reservasResumen: getReservasResumenForSync(),
        pedidosResumen: getPedidosResumenForSync(),
        cocinaCargaActiva: getActiveKitchenOrdersCount(),
        tables: DB.tables.map(t => ({id: t.id, name: t.name}))
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
      });
      // Mismo motivo y mismo mecanismo que aforoHold, aplicado a pedidosHold
      // (el contador atómico de pedidos por franja): se limpia en cada sync
      // para no arrastrar holds obsoletos de pedidos ya aceptados/rechazados.
      const fechasPedidosATocar = new Set(Object.keys(data.pedidosResumen));
      DB.tpvOrders.forEach(o => { if(o.date && (o.tipo === 'takeaway' || o.tipo === 'delivery')) fechasPedidosATocar.add(o.date); });
      fechasPedidosATocar.forEach(fecha => {
        app.database().ref('gastrogoan/public/' + publicId + '/pedidosHold/' + fecha).remove().catch(() => {});
      });
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
   PERFIL DE PROPIETARIO — ver todos tus negocios en cualquier dispositivo
   Registrar un negocio/sucursal nuevo SIEMPRE exige su propio código+
   contraseña (se demuestra la licencia una vez, al vincularlo). Pero una
   vez vinculado, no hace falta volver a demostrarlo en cada dispositivo:
   basta con entrar como propietario con CUALQUIERA de tus negocios para
   que aparezcan todos, sin tener que "Registrar" cada uno otra vez ahí.
   Se apoya en la misma nube de plataforma que ya usa el login remoto de
   empleados — un pequeño índice, nada de datos operativos del negocio.
   ============================================================ */
// El negocio con el que activaste "Acceso Propietarios" por primera vez EN
// ESTE DISPOSITIVO — sirve de "ancla" para vincular el resto de negocios
// que vayas registrando aquí, da igual con cuál de todos vuelvas a entrar
// luego (todos apuntan al mismo perfil).
function getPrimaryTenantId(){
  const login = getOwnerLogin();
  return login ? ggBizTenantId(login.code) : null;
}
// Vincula (newTenantId, newCode) al perfil de propietario "ancla" en la
// nube de plataforma: ownerLink permite, dado CUALQUIER tenantId del
// propietario, encontrar su perfil; ownerProfiles guarda la lista completa.
function linkBusinessToOwnerProfile(anchorTenantId, tenantId, code, name){
  if(!anchorTenantId || !tenantId) return;
  getPlatformFirebaseApp().then(app => {
    if(!app) return;
    app.database().ref('gastrogoan/ownerLink/' + tenantId).set(anchorTenantId).catch(()=>{});
    app.database().ref('gastrogoan/ownerProfiles/' + anchorTenantId + '/businesses/' + tenantId).set({
      code, name: name || ''
    }).catch(e => console.error('Error vinculando el negocio al perfil de propietario', e));
  }).catch(()=>{});
}
// Tras un login de propietario válido, mira si este negocio pertenece a un
// perfil con más negocios vinculados y, si hay alguno que este dispositivo
// todavía no conozca, lo da de alta aquí como una "ficha" ligera (código +
// licencia) — sin descargar sus datos todavía: eso ya lo hace la
// sincronización normal en cuanto se entra de verdad en ese negocio, igual
// que con cualquier negocio nuevo. No hace falta volver a pedir su
// contraseña: ya quedó demostrada una vez, al vincularlo.
async function syncOwnerBusinessList(code){
  try{
    const tenantId = ggBizTenantId(code);
    const app = await getPlatformFirebaseApp();
    if(!app) return;
    const linkSnap = await app.database().ref('gastrogoan/ownerLink/' + tenantId).once('value');
    const anchorTenantId = linkSnap.val() || tenantId;
    const bizSnap = await app.database().ref('gastrogoan/ownerProfiles/' + anchorTenantId + '/businesses').once('value');
    const businesses = bizSnap.val() || {};
    const slots = getBusinessSlots();
    let changed = false;
    Object.entries(businesses).forEach(([tId, info]) => {
      if(!info || !info.code) return;
      if(slots.some(s => s.code === info.code)) return; // ya lo conoce este dispositivo
      const newId = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6) + tId.slice(0,3);
      slots.push({ id: newId, name: info.name || t('bs.defaultBusinessName'), code: info.code });
      localStorage.setItem(slotLicenseKey(newId), JSON.stringify({code: info.code, tenantId: tId}));
      changed = true;
    });
    if(changed) saveBusinessSlots(slots);
  }catch(e){
    console.error('Error sincronizando la lista de negocios del propietario', e);
  }
}

function initCloud(){
  cloudConfig = getCloudConfig();
  if(!cloudConfig){ updateSyncBadge('local'); return; }
  if(typeof firebase === 'undefined'){ console.error('Firebase no disponible (¿sin internet?)'); updateSyncBadge('error'); return; }
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
      firebase.auth().signInAnonymously().then(() => startCloudSync(tenantId)).catch(err => {
        console.error('Error de autenticación con la nube', err);
        updateSyncBadge('error');
      });
    }
  }catch(e){
    console.error('Error iniciando la nube', e);
    updateSyncBadge('error');
  }
}

/* Aplica al estado local un cambio llegado de la nube en un bloque
   concreto de la DB (p.ej. "tpvOrders" o "clients") y refresca la
   pantalla. Se usa tanto en la primera carga como en cada actualización
   incremental posterior. */
function applyRemoteBlock(key, remoteValue){
  const def = defaultData();
  let merged = def.hasOwnProperty(key) ? withDefaults(def[key], remoteValue) : remoteValue;
  if(MERGEABLE_ARRAYS.has(key) && Array.isArray(DB[key]) && Array.isArray(merged)){
    merged = mergeArraysById(DB[key], merged);
  }
  if(key === 'tpvOrders'){
    (merged||[]).forEach(o => { if(!Array.isArray(o.items)) o.items = []; if(!Array.isArray(o.tandas)) o.tandas = []; });
  }
  const json = JSON.stringify(merged);
  if(lastSyncedSnapshot && lastSyncedSnapshot[key] === json) return;
  // Aviso al navegador de este dispositivo si llega, desde OTRO dispositivo,
  // un mensaje urgente de chat o un cierre de caja con algo raro que
  // revisar — el punto entero de un aviso de este tipo es que llegue a
  // quien no estaba mirando esa pantalla en ese momento.
  if(key === 'chatMessages' && Array.isArray(DB[key]) && Array.isArray(merged)){
    const knownIds = new Set(DB[key].map(m => m.id));
    const me = (typeof getChatAuthor === 'function') ? getChatAuthor() : null;
    merged.filter(m => m.urgent && !knownIds.has(m.id) && String(m.authorId) !== String(me))
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
  lastSyncedSnapshot[key] = json;
  DB[key] = merged;
  idbSet(DB_KEY, DB).catch(e => console.error('Error guardando datos', e));
  // Licencia compartida por la nube: los empleados se activan solos
  if(isStoredLicenseValid(DB.license)){
    localStorage.setItem(LICENSE_LS, JSON.stringify(DB.license));
    hideActivationGate();
  }
  refreshAfterRemoteChange();
}

/* Tras la conexión inicial, en vez de re-descargar TODA la base de datos
   del negocio cada vez que algo cambia (lo que multiplicaba el consumo de
   datos por cada dispositivo conectado), escuchamos solo los bloques
   ("ingredients", "tpvOrders", "clients"...) que realmente cambian. */
function attachCloudChildListeners(){
  const onErr = err => { console.error('Error de sincronización', err); updateSyncBadge('error'); };
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
  const newSnapshot = {};
  Object.keys(merged).forEach(key => {
    const remoteJson = JSON.stringify(merged[key]);
    newSnapshot[key] = remoteJson;
    if(!lastSyncedSnapshot || lastSyncedSnapshot[key] !== remoteJson){
      DB[key] = merged[key];
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
      updateSyncBadge('error');
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
          console.error('Error reclamando la inicialización de la nube', e);
          updateSyncBadge('error');
          attachCloudChildListeners();
        });
      }else{
        mergeRemoteIntoLocal(val);
        attachCloudChildListeners();
      }
    }, err => {
      console.error('Error de sincronización', err);
      updateSyncBadge('error');
    });
    firebase.database().ref('.info/connected').on('value', s => {
      updateSyncBadge(s.val() ? 'online' : 'offline');
    });
  }catch(e){
    console.error('Error iniciando la nube', e);
    updateSyncBadge('error');
  }
}

function getPublicClientLink(){
  const publicId = getPublicId();
  if(!publicId) return '';
  const base = location.href.replace(/[^/]*$/, '') + 'reservagastrogoan.html';
  const slug = DB.business && DB.business.publicSlug;
  return slug ? base + '?n=' + encodeURIComponent(slug) : base + '?neg=' + publicId;
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
  }catch(e){ console.error('Error guardando el enlace personalizado', e); showToast(t('access.connectFailed')); return; }
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
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 ${t('mn.online.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.needLicense')}</p>
      </div>
    `;
  }
  if(!getCloudConfig()){
    return `
      <div class="card mn-grid-full" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 ${t('mn.online.title')}</h3>
        <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.needCloud')}</p>
      </div>
    `;
  }
  const link = getPublicClientLink();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(link);
  const activeCartas = (typeof getActiveCartas === 'function') ? getActiveCartas() : [];
  const activeCartaLine = activeCartas.length
    ? `<p style="font-size:12.5px;margin-bottom:12px"><i class="ti ti-book-2"></i> ${t('mn.online.activeCartaLabel')}<strong>${activeCartas.map(c=>escapeHtml(tItem(c))).join(', ')}</strong></p>`
    : `<p style="font-size:12.5px;margin-bottom:12px;color:var(--brand-orange)"><i class="ti ti-alert-triangle"></i> ${t('mn.online.noActiveCarta')}</p>`;
  return `
    <div class="card mn-grid-full" style="border:2px solid var(--brand-orange);background:var(--brand-cream)">
      <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 ${t('mn.online.title')}</h3>
      <p style="font-size:13.5px;margin-bottom:12px">${t('mn.online.shareDesc')}${ (b.tiposServicio?.takeaway!==false || b.tiposServicio?.delivery!==false) ? ' '+t('mn.online.andOrder') : ''}${t('mn.online.shareDescEnd')}</p>
      ${activeCartaLine}
      <details style="margin-bottom:12px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--brand-orange)">⚠️ ${t('mn.online.hostingSummary')}</summary>
        <div style="margin-top:8px;background:var(--brand-cream);border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.6">
          ${t('mn.online.hostingP1')}<br><br>
          ${t('mn.online.hostingP2')}<br><br>
          ${t('mn.online.hostingP3')}<br><br>
          📘 <strong>${t('mn.online.hostingTutorialLabel')}</strong> ${t('mn.online.hostingTutorialText')} <a href="tutorial-netlify.html" target="_blank" rel="noopener"><strong>tutorial-netlify.html</strong></a> ${t('mn.online.hostingTutorialSuffix')}
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
        <a class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;border-color:#25D366;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent(t('mn.online.whatsappMsg').replace('${name}', b.name || t('mn.online.ourRestaurant')) + link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
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
      <div class="field">
        <label>${t('mn.pedidos.deliveryFee')}</label>
        <input type="number" id="mn-deliveryfee" min="0" step="0.5" value="${escapeHtml(p.deliveryFee||0)}" placeholder="3.00">
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
  const row = (icon, label, connected, onclick) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
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
      ${row('ti-cloud', t('mn.externalConn.firebase'), fbConnected, 'openCloudWizard()')}
      ${row('ti-credit-card', t('mn.externalConn.redsys'), redsysConnected, "scrollToMnCard('mn-card-redsys')")}
      ${row('ti-mail-check', t('mn.externalConn.email'), emailConnected, "scrollToMnCard('mn-card-email')")}
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
      <h3><i class="ti ti-credit-card"></i> 💳 ${t('mn.redsys.title')}</h3>
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
  if(!confirm(t('mn.redsys.confirmDisable'))) return;
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
  updateTpvVirtualCheckboxAvailability();
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

function renderEmailConfirmCard(){
  const cfg = (DB.business && DB.business.emailConfirm) || {};
  return `
    <div class="card" id="mn-card-email">
      <h3><i class="ti ti-mail-check"></i> ✉️ ${t('mn.emailConfirm.title')}</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">${t('mn.emailConfirm.desc')}</p>
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
  const testTo = prompt(t('mn.emailConfirm.testPrompt'));
  if(!testTo) return;
  statusEl.textContent = t('mn.emailConfirm.sending');
  try{
    await sendReservationConfirmationEmail({
      clientName: t('mn.emailConfirm.testClientName'), clientEmail: testTo,
      date: todayStr(), time: '20:00', people: 2, tableName: t('mn.emailConfirm.testTableName')
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
  const testTo = prompt(t('mn.emailConfirm.testPrompt'));
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
      table_name: reservation.tableName || ''
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
      <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px">🔑 ${t('gate.licenseActivatedFor')}: <strong>${lic.name}</strong></p>
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
      </ol>
      ${renderOwnFirebaseForm()}
    `);
    return;
  }
  const link = getPublicClientLink();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(link);
  const otrosServicios = (DB.business?.tiposServicio?.takeaway !== false || DB.business?.tiposServicio?.delivery !== false) ? t('mn.online.andOrder') : '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cloud"></i> ${t('gate.cloudModalTitle')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px">🔑 ${t('gate.licenseActivatedFor')}: <strong>${lic.name}</strong></p>
    <div style="background:var(--green-l);color:var(--green);padding:12px 16px;border-radius:10px;font-weight:700;margin-bottom:14px"><i class="ti ti-cloud-check"></i> ${t('gate.cloudConnected')}</div>
    <p style="font-size:13.5px;margin-bottom:14px"><strong>${t('gate.connectMoreDevices')}</strong> ${t('gate.connectMoreDevicesBody').replace('${key}', `<code>${lic.key}</code>`)}</p>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <p style="font-size:13.5px;margin-bottom:8px"><strong>📱 ${t('mn.online.title')}</strong></p>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">${t('mn.online.shareDesc')}${otrosServicios}${t('mn.online.shareDescEnd')}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
      <img src="${qrUrl}" alt="${t('mn.online.qrAlt')}" style="width:120px;height:120px;border-radius:10px;border:1px solid var(--border);background:#fff;padding:6px">
      <div class="field" style="flex:1;min-width:180px;margin-bottom:0">
        <textarea id="cloud-public-link" rows="3" readonly style="font-family:monospace;font-size:11px" onclick="this.select()">${link}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="copyPublicLinkFrom('cloud-public-link')"><i class="ti ti-copy"></i> ${t('mn.online.copyLink')}</button>
      <a class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent(t('mn.online.whatsappMsg').replace('${name}', DB.business?.name || t('mn.online.ourRestaurant')) + link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <details>
      <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">⚙️ ${t('gate.changeFirebaseConfig')}</summary>
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
const dbReadyPromise = loadDB().then(d => { DB = d; });

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
    if(!data) return defaultData();
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
    (merged.employees||[]).forEach(e => { if(!e.pin){ e.pin = '1234'; e.pinChanged = false; } if(!e.area) e.area = 'cocina'; });
    (merged.tpvOrders||[]).forEach(o => { if(!Array.isArray(o.items)) o.items = []; if(!Array.isArray(o.tandas)) o.tandas = []; });
    return merged;
  }catch(e){
    console.error('Error cargando datos', e);
    return defaultData();
  }
}

function saveDB(){
  idbSet(DB_KEY, DB).catch(e => console.error('Error guardando datos', e));
  scheduleCloudSync();
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
    lastSyncedSnapshot[key] = JSON.stringify(DB[key]);
  });
  cloudRef.set(updates).catch(e => {
    console.error('Error guardando en la nube', e);
    updateSyncBadge('error');
  });
}

function scheduleCloudSync(){
  schedulePublicMirrorSync();
  if(!cloudRef) return;
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

function flushCloudSync(){
  cloudSyncTimer = null;
  if(!cloudRef || !lastSyncedSnapshot) return;
  const updates = {};
  Object.keys(DB).forEach(key => {
    const json = JSON.stringify(DB[key]);
    if(lastSyncedSnapshot[key] !== json){
      updates[key] = DB[key];
      lastSyncedSnapshot[key] = json;
    }
  });
  if(Object.keys(updates).length === 0) return;
  try{
    cloudRef.update(updates).catch(e => {
      console.error('Error guardando en la nube', e);
      updateSyncBadge('error');
    });
  }catch(e){
    console.error('Error guardando en la nube', e);
    updateSyncBadge('error');
  }
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
    if(typeof renderMiNegocio === 'function' && document.querySelector('.view.active')?.id === 'view-minegocio') renderMiNegocio();
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
function notifyDesktop(title, body){
  if(!desktopNotificationsEnabled()) return;
  try{
    if(navigator.serviceWorker && navigator.serviceWorker.ready){
      navigator.serviceWorker.ready.then(reg => {
        if(reg && reg.showNotification) reg.showNotification(title, {body, icon: 'icon-192.png', tag: title});
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
let thermalPrinterCharacteristic = null;
function thermalPrintingSupported(){
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}
async function connectThermalPrinter(){
  if(!thermalPrintingSupported()){ showToast(t('thermal.notSupported')); return false; }
  try{
    const device = await navigator.bluetooth.requestDevice({
      filters: THERMAL_PRINTER_SERVICE_CANDIDATES.map(s => ({services:[s]})),
      optionalServices: THERMAL_PRINTER_SERVICE_CANDIDATES
    });
    const server = await device.gatt.connect();
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
    thermalPrinterCharacteristic = characteristic;
    localStorage.setItem('gg_thermal_printer_name', device.name || '');
    showToast(t('thermal.connectedOk').replace('${name}', device.name || t('thermal.unnamedDevice')));
    return true;
  }catch(e){
    // El usuario cancelando el selector de dispositivos también cae aquí —
    // no es un error real, solo cambió de idea.
    if(e && e.name !== 'NotFoundError') console.error('Error conectando la impresora térmica', e);
    return false;
  }
}
// Convierte texto plano a bytes ESC/POS básicos: inicializar, texto en
// codificación de 1 byte (cp437, suficiente para lo que ya usa el ticket:
// letras, números, acentos comunes), salto de línea final y corte de papel.
function textToEscPos(text){
  const ESC = 0x1B, GS = 0x1D;
  const bytes = [ESC, 0x40]; // ESC @ : inicializar impresora
  for(const ch of text){
    const code = ch.codePointAt(0);
    bytes.push(code < 256 ? code : 0x3F); // fuera de rango de 1 byte -> '?'
  }
  bytes.push(0x0A, 0x0A, 0x0A);
  bytes.push(GS, 0x56, 0x42, 0x00); // GS V B 0 : corte parcial de papel
  return new Uint8Array(bytes);
}
// Las conexiones BLE tienen un tamaño máximo de paquete (MTU) mucho menor
// que el ticket completo — hay que trocear el envío o la impresora corta o
// ignora el resto.
const THERMAL_CHUNK_SIZE = 180;
async function writeThermalChunks(characteristic, bytes){
  for(let i=0; i<bytes.length; i += THERMAL_CHUNK_SIZE){
    const chunk = bytes.slice(i, i + THERMAL_CHUNK_SIZE);
    await characteristic.writeValueWithoutResponse(chunk);
  }
}
async function printToThermalPrinter(text){
  if(!thermalPrintingSupported()){ showToast(t('thermal.notSupported')); return; }
  if(!thermalPrinterCharacteristic){
    const connected = await connectThermalPrinter();
    if(!connected) return;
  }
  try{
    await writeThermalChunks(thermalPrinterCharacteristic, textToEscPos(text));
    showToast(t('thermal.printedOk'));
  }catch(e){
    console.error('Error imprimiendo en la impresora térmica', e);
    thermalPrinterCharacteristic = null; // puede que se haya desconectado; forzar reconectar la próxima vez
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
  DB[key].push(entry.item);
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
function logAudit(action, summary){
  if(!DB.auditLog) DB.auditLog = [];
  DB.auditLog.unshift({id: genId(), ts: new Date().toISOString(), actor: currentActorName(), action, summary});
  if(DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
}
function openAuditLogModal(){
  const items = (DB.auditLog||[]).slice(0, 200);
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-list-details"></i> ${t('audit.title')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">${t('audit.desc')}</p>
    ${items.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>${t('common.date')}</th><th>${t('trash.deletedBy')}</th><th>${t('audit.action')}</th></tr></thead>
        <tbody>${items.map(x => `
          <tr>
            <td style="white-space:nowrap">${escapeHtml(new Date(x.ts).toLocaleString('es-ES'))}</td>
            <td>${escapeHtml(x.actor)}</td>
            <td>${escapeHtml(x.summary)}</td>
          </tr>`).join('')}</tbody>
      </table>
    </div>` : `<div class="empty"><i class="ti ti-list-details"></i>${t('audit.empty')}</div>`}
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.close')}</button>
    </div>
  `);
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

