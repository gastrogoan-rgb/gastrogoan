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

function getBusinessSlots(){
  try{
    const list = JSON.parse(localStorage.getItem(SLOTS_LS));
    if(Array.isArray(list) && list.length) return list;
  }catch(e){}
  // Primera vez: si ya había una licencia (instalación anterior), registra
  // el negocio 'default' para que aparezca en el selector.
  const slots = [{ id:'default', name:'Mi negocio' }];
  try{
    const lic = JSON.parse(localStorage.getItem('gastrogoan_license_v1'));
    if(lic && lic.name) slots[0].name = lic.name;
  }catch(e){}
  localStorage.setItem(SLOTS_LS, JSON.stringify(slots));
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

function addNewBusiness(){
  const id = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const slots = getBusinessSlots();
  slots.push({ id, name: 'Nuevo negocio' });
  saveBusinessSlots(slots);
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

/* Crea una nueva sucursal clonando la configuración del slot indicado.
   parentSlotId: slot del que se copian los datos (el negocio "padre").
   Si no se pasa, usa el slot activo. */
async function addSucursal(parentSlotId){
  parentSlotId = parentSlotId || ACTIVE_SLOT;
  const slots = getBusinessSlots();
  const parentSlot = slots.find(s => s.id === parentSlotId);
  const parentName = parentSlot?.name || 'Negocio';
  const sucursalesExistentes = slots.filter(s => s.parentId === parentSlotId).length;
  const nombreSugerido = `${parentName} — Sucursal ${sucursalesExistentes + 2}`;
  const nombre = prompt(`Nueva sucursal de "${parentName}":`, nombreSugerido);
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

  slots.push({ id: newId, name: nombre, parentId: parentSlotId });
  saveBusinessSlots(slots);
  switchToBusiness(newId);
}

function removeBusinessSlot(slotId){
  const slots = getBusinessSlots();
  const slot = slots.find(s => s.id === slotId);
  if(!slot) return;
  if(!confirm(`¿Quitar "${slot.name}" de la lista de negocios de este dispositivo? Esto borrará sus datos guardados en este navegador (no afecta a la licencia ni a la nube; podrás volver a activarla cuando quieras).`)) return;

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
    </div>
  `;
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
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t('bs.mainLocation')}</span>
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
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.name||t('bs.defaultBranchName'))}</span>
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
    else if(!getCloudConfig()) showFirebaseSetupGate();
    else if(!getLicense()) showActivationGate();
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

/* La clave de licencia incluye, además del nombre y la firma, un token de
   tenant de 20 caracteres con alta entropía generado al azar por el
   generador de licencias. Este token (y no el nombre) es el identificador
   real del negocio en la nube compartida: no se puede deducir a partir del
   nombre del restaurante. */
function validateLicenseKey(key){
  if(!key) return null;
  const parts = String(key).trim().toUpperCase().split('-').map(p => p.trim()).filter(Boolean);
  if(parts.length < 9) return null;
  const tenantId = parts.slice(-5).join('');
  const sig = parts.slice(-8, -5).join('-');
  const name = parts.slice(0, -8).join('').replace(/[^A-Z0-9]/g, '');
  if(!name || !/^[A-Z0-9]{20}$/.test(tenantId)) return null;
  return sig === ggLicSig(name) ? { name, tenantId } : null;
}

function getLicense(){
  try{
    const l = JSON.parse(localStorage.getItem(LICENSE_LS));
    if(l && validateLicenseKey(l.key)) return l;
  }catch(e){}
  const dl = (typeof DB !== 'undefined' && DB) ? DB.license : null;
  if(dl && validateLicenseKey(dl.key)){
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
  if(!lic || !lic.key) return null;
  const parsed = validateLicenseKey(lic.key);
  return parsed ? parsed.tenantId : null;
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

function showActivationGate(){
  if(document.getElementById('license-gate')) return;
  const g = document.createElement('div');
  g.id = 'license-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:center;justify-content:center;padding:20px';
  const role = localStorage.getItem(ONBOARDING_ROLE_LS) || 'owner';
  const cardStyle = (active) => `flex:1;border:2px solid ${active?'var(--brand-orange)':'var(--border)'};background:${active?'#F5F0E3':'#fff'};border-radius:10px;padding:12px 8px;cursor:pointer;text-align:center;font-weight:700;font-size:13px;color:#222`;
  const showBackBtn = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:480px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;text-align:center;position:relative">
      ${showBackBtn ? `<button onclick="backToBusinessSelectorFromGate()" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> Negocios</button>` : ''}
      <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">🍽</div>
      <h2 style="margin-bottom:4px">GastroGoan</h2>
      <p style="color:var(--muted);font-size:13.5px;margin-bottom:18px">Paso 3 de 3 — Activa tu licencia</p>
      <div style="text-align:left">
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px">¿Quién eres?</label>
        <div style="display:flex;gap:10px;margin-bottom:18px">
          <div id="role-owner-card" style="${cardStyle(role==='owner')}" onclick="selectOnboardingRole('owner')">👤<br>Soy el/la<br>dueño/a</div>
          <div id="role-employee-card" style="${cardStyle(role==='employee')}" onclick="selectOnboardingRole('employee')">📱<br>Soy<br>empleado/a</div>
        </div>
        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:6px" id="license-label">🔑 Clave de licencia <span style="font-weight:400;color:var(--muted)">(te la dio tu vendedor/jefe/a)</span></label>
        <div id="license-help-box" style="display:none;background:#F1EFE9;border-left:4px solid #4A5D4E;border-radius:8px;padding:10px 12px;font-size:12.5px;line-height:1.5;margin-bottom:8px;text-align:left"></div>
        <input id="license-key-input" type="text" placeholder="MIRESTAURANTE-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" style="width:100%;border:1.5px solid var(--border);border-radius:9px;padding:12px;font-family:monospace;font-size:13px;text-transform:uppercase">
        <div id="license-error" style="display:none;background:#F5EBE7;color:#8A4A3B;padding:10px 14px;border-radius:8px;font-size:13px;margin-top:10px"></div>
        <button onclick="activateLicenseFromGate()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:12px">Activar GastroGoan</button>
        <p id="license-owner-note" style="font-size:12px;color:var(--muted);margin-top:12px;text-align:center">📱 Si eres empleado/a, usa la <strong>misma clave de licencia</strong> que tu jefe/a — tu dispositivo se conectará solo a la nube del restaurante.</p>
      </div>
    </div>`;
  document.body.appendChild(g);
  updateLicenseFieldForRole(role);
}

function updateLicenseFieldForRole(role){
  const label = document.getElementById('license-label');
  const helpBox = document.getElementById('license-help-box');
  const ownerNote = document.getElementById('license-owner-note');
  if(!label || !helpBox || !ownerNote) return;
  if(role === 'employee'){
    label.innerHTML = '🔑 Clave de licencia del restaurante';
    helpBox.style.display = 'block';
    helpBox.innerHTML = t('msg.employeeLicenseHelp');
    ownerNote.style.display = 'none';
  }else{
    label.innerHTML = '🔑 Clave de licencia <span style="font-weight:400;color:var(--muted)">(te la dio quien te vendió GastroGoan)</span>';
    helpBox.style.display = 'none';
    ownerNote.style.display = 'block';
  }
}

function selectOnboardingRole(role){
  localStorage.setItem(ONBOARDING_ROLE_LS, role);
  const ownerCard = document.getElementById('role-owner-card');
  const employeeCard = document.getElementById('role-employee-card');
  if(ownerCard) ownerCard.style.cssText = `flex:1;border:2px solid ${role==='owner'?'var(--brand-orange)':'var(--border)'};background:${role==='owner'?'#F5F0E3':'#fff'};border-radius:10px;padding:12px 8px;cursor:pointer;text-align:center;font-weight:700;font-size:13px;color:#222`;
  if(employeeCard) employeeCard.style.cssText = `flex:1;border:2px solid ${role==='employee'?'var(--brand-orange)':'var(--border)'};background:${role==='employee'?'#F5F0E3':'#fff'};border-radius:10px;padding:12px 8px;cursor:pointer;text-align:center;font-weight:700;font-size:13px;color:#222`;
  updateLicenseFieldForRole(role);
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

  const stepsHtml = `
      ${step(1, 'Crea un proyecto gratis en Firebase', `
        Abre <code>console.firebase.google.com</code> en otra pestaña (puedes volver a esta después) e inicia sesión con una cuenta de Google (la que quieras, puede ser una nueva solo para esto).<br><br>
        Pulsa <strong>"Crear un proyecto"</strong> (o "Agregar proyecto"), escribe un nombre (por ejemplo, el nombre de tu restaurante) y pulsa "Continuar". Cuando te pregunte por Google Analytics, puedes <strong>desactivarlo</strong> y pulsar "Crear proyecto". Espera unos segundos hasta que termine.
      `)}

      ${step(2, 'Activa "Realtime Database"', `
        En el menú de la izquierda, busca el apartado <strong>"Base de datos y almacenamiento"</strong> y dentro pulsa <strong>"Realtime Database"</strong>.<br><br>
        Pulsa el botón <strong>"Crear base de datos"</strong>. En la ubicación, elige <strong>"Bélgica (europe-west1)"</strong> y pulsa "Siguiente".<br><br>
        Cuando te pregunte por las reglas de seguridad, elige la opción <strong>"Modo bloqueado"</strong> y pulsa "Habilitar". (En el paso 4 pegaremos las reglas correctas).
      `)}

      ${step(3, 'Activa el inicio de sesión "Anónimo"', `
        En el menú de la izquierda, dentro de <strong>"Seguridad"</strong>, pulsa <strong>"Authentication"</strong>.<br><br>
        Pulsa <strong>"Comenzar"</strong> (si es la primera vez) y luego abre la pestaña <strong>"Método de acceso"</strong>.<br><br>
        En la lista de proveedores, busca <strong>"Anónimo"</strong>, pulsa sobre él, activa el interruptor y pulsa <strong>"Guardar"</strong>.<br><br>
        <span style="color:var(--muted)">Esto permite que la app se conecte sola, sin pedir usuario ni contraseña a nadie.</span>
      `)}

      ${step(4, 'Pega las reglas de seguridad', `
        Vuelve a <strong>Realtime Database</strong> (menú "Base de datos y almacenamiento") y abre la pestaña <strong>"Reglas"</strong> (Rules), arriba del todo.<br><br>
        Borra todo el contenido del cuadro de texto y pega estas reglas (pulsa el botón para copiarlas):<br><br>
        <div style="background:var(--brand-cream);border:1px solid var(--border);border-radius:8px;padding:10px;font-family:monospace;font-size:11px;max-height:140px;overflow:auto;white-space:pre-wrap;margin-bottom:8px">${FIREBASE_RULES_JSON.replace(/</g,'&lt;')}</div>
        <button class="btn btn-sm" onclick="copyFirebaseRules()" type="button"><i class="ti ti-copy"></i> Copiar reglas</button><br><br>
        Por último, pulsa el botón <strong>"Publicar"</strong> (Publish) arriba a la derecha.
      `)}

      ${step(5, 'Crea una "app web" y copia tus datos', `
        Pulsa el icono de engranaje ⚙️ (arriba a la izquierda, junto al nombre del proyecto) para abrir <strong>"Configuración"</strong> y entra en la pestaña <strong>"General"</strong>.<br><br>
        Baja hasta la sección <strong>"Tus apps"</strong>. Si está vacía, pulsa el icono <strong>"&lt;/&gt;"</strong> (Web), ponle un nombre cualquiera (p.ej. "GastroGoan") y pulsa "Registrar app" (no necesitas configurar Hosting).<br><br>
        Te aparecerá un bloque de código con varios datos. Busca y copia estos dos:
        <ul style="margin:6px 0 0 18px">
          <li><code>apiKey</code> → algo como <code>AIzaSy...</code></li>
          <li><code>databaseURL</code> → algo como <code>https://tu-proyecto-default-rtdb.europe-west1.firebasedatabase.app</code></li>
        </ul>
      `)}

      ${step(6, 'Pégalos aquí abajo y guarda', `
        Pega esos dos valores en los campos siguientes y pulsa "Guardar y conectar". La app se recargará y quedará lista.<br><br>
        <span style="color:var(--muted)">Guarda también estos dos datos en un sitio seguro (notas del móvil, etc.) para poder configurar el resto de dispositivos (camareros, cocina) más adelante — solo tienen que pegar lo mismo, como indica el aviso azul de abajo.</span>
      `)}`;

  const employeeBoxHtml = `
      <div style="background:#F1EFE9;border-left:4px solid #4A5D4E;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:20px;text-align:left">
        📱 <strong>¿Eres empleado/a, no el/la propietario/a?</strong> No hace falta que sigas los pasos: pide a tu jefe/a que te diga la <strong>Clave de API</strong> y la <strong>URL de la base de datos</strong> que él/ella configuró (las puede ver en Nube → "Cambiar la configuración de Firebase"), pégalas en el formulario de abajo y pulsa "Guardar y conectar". Listo.
      </div>`;

  const role = localStorage.getItem(ONBOARDING_ROLE_LS) || 'owner';
  const intro = `
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">
        Cada negocio tiene su <strong>propio espacio en la nube</strong> (gratuito, de Google), separado del resto. Sirve para sincronizar tus dispositivos (camareros, cocina, TPV) y activar las reservas/pedidos online por QR.
      </div>`;

  let bodyHtml;
  if(role === 'employee'){
    bodyHtml = `
      ${intro}
      ${employeeBoxHtml}
      <details style="margin-bottom:6px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">¿No tienes esos datos? Ver guía completa (para el propietario)</summary>
        <div style="margin-top:14px">${stepsHtml}</div>
      </details>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:6px">
        ${renderOwnFirebaseForm()}
      </div>`;
  }else{
    bodyHtml = `
      ${intro}
      <h3 style="font-size:14px;margin-bottom:12px;text-align:left">👤 Sigue estos pasos:</h3>
      ${stepsHtml}
      <details style="margin:14px 0 6px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">📱 ¿Vas a compartir esto con empleados? Lee esto</summary>
        <div style="margin-top:10px">${employeeBoxHtml}</div>
      </details>
      <div style="border-top:1px solid var(--border);padding-top:16px;margin-top:6px">
        ${renderOwnFirebaseForm()}
      </div>`;
  }

  const showBackBtnFb = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:560px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px;position:relative">
      ${showBackBtnFb ? `<button onclick="hideFirebaseSetupGate();showBusinessSelectScreen()" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> Negocios</button>` : ''}
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">☁️</div>
        <h2 style="margin-bottom:4px">Configura tu nube</h2>
        <p style="color:var(--muted);font-size:13.5px;margin-bottom:16px">Paso 2 de 3 — Conecta tu nube (≈10 minutos, una sola vez)</p>
      </div>
      ${bodyHtml}
    </div>`;
  document.body.appendChild(g);
}

function hideFirebaseSetupGate(){
  const g = document.getElementById('firebase-gate');
  if(g) g.remove();
}

/* Paso guiado obligatorio después de configurar la nube: subir la app a un
   hosting público (Netlify) para que el QR de reservas/pedidos funcione.
   Solo se muestra al propietario y hasta que confirma que ya está subida. */
function showNetlifySetupGate(){
  if(document.getElementById('netlify-gate')) return;
  const hosted = (location.protocol === 'http:' || location.protocol === 'https:') &&
                 !/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const g = document.createElement('div');
  g.id = 'netlify-gate';
  g.style.cssText = 'position:fixed;inset:0;z-index:100000;background:var(--brand-cream);overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
  const step = (n, title, body) => `
    <div style="display:flex;gap:12px;margin-bottom:16px">
      <div style="flex:none;width:28px;height:28px;border-radius:50%;background:var(--brand-orange);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${n}</div>
      <div style="flex:1;min-width:0">
        <p style="font-weight:700;font-size:13.5px;margin-bottom:4px">${title}</p>
        <div style="font-size:13px;color:#444;line-height:1.6">${body}</div>
      </div>
    </div>`;
  const stepsHtml = `
    ${step(1, 'Crea una cuenta gratis en Netlify', `Abre <code>www.netlify.com</code> en otra pestaña y pulsa <strong>"Sign up"</strong>. Puedes entrar con tu cuenta de Google. Es gratis y no pide tarjeta.`)}
    ${step(2, 'Ten los dos archivos juntos en una carpeta', `En una carpeta de tu ordenador deja <strong>los dos archivos</strong> de GastroGoan: <code>index.html</code> y <code>reservagastrogoan.html</code>. <strong>No renombres</strong> ninguno de los dos.`)}
    ${step(3, 'Arrastra la carpeta a Netlify', `En Netlify, ve a <strong>"Sites"</strong> y arrastra tu carpeta al recuadro <strong>"Drag and drop your site output folder here"</strong> (o "Deploys" → "Deploy manually").`)}
    ${step(4, 'Copia la dirección que te da', `En unos segundos Netlify publica el sitio y te da una dirección tipo <code>https://tu-sitio.netlify.app</code>. Puedes cambiar el nombre en "Site settings" → "Change site name".`)}
    ${step(5, 'Abre SIEMPRE la app desde esa dirección', `A partir de ahora gestiona la app desde <code>https://tu-sitio.netlify.app</code>. Al llamarse index.html, se abre directamente. Solo así el QR de reservas y pedidos funcionará de verdad para tus clientes.`)}`;

  const hostedBox = hosted
    ? `<div style="background:#EDF1EC;border-left:4px solid #4A5D4E;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:16px;text-align:left">✅ <strong>¡Bien!</strong> Estás abriendo la app desde una dirección pública (<code>${escapeHtml(location.hostname)}</code>). El QR de reservas ya puede funcionar. Si es tu sitio de Netlify, ya está todo listo.</div>`
    : `<div style="background:#F5EBE7;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:16px;text-align:left">⚠️ Ahora mismo estás abriendo la app <strong>desde un archivo local</strong>, no desde internet. Las reservas/pedidos por QR <strong>no funcionarán</strong> hasta que subas la app a Netlify y la abras desde su dirección pública.</div>`;

  const showBackBtnNt = getBusinessSlots().length > 1;
  g.innerHTML = `
    <div style="max-width:560px;width:100%;background:#fff;border-radius:16px;box-shadow:0 14px 40px rgba(0,0,0,.18);padding:28px;margin:10px 0 30px;position:relative">
      ${showBackBtnNt ? `<button onclick="hideNetlifySetupGate();showBusinessSelectScreen()" style="position:absolute;top:16px;left:16px;background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px"><i class="ti ti-arrow-left"></i> Negocios</button>` : ''}
      <div style="text-align:center">
        <div style="width:54px;height:54px;border-radius:14px;background:var(--brand-orange);display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px">🌐</div>
        <h2 style="margin-bottom:4px">Sube tu app a internet</h2>
        <p style="color:var(--muted);font-size:13.5px;margin-bottom:16px">Paso 1 de 3 — Sube tu app a internet (≈5 minutos, una sola vez)</p>
      </div>
      ${hostedBox}
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:18px;text-align:left">
        La app de gestión funciona abierta en tu navegador, pero el <strong>QR de reservas y pedidos online</strong> solo funciona si subes los dos archivos a un hosting público gratuito como <strong>Netlify</strong>. Tienes el tutorial completo en <strong>tutorial-netlify.html</strong> (junto a la app).
      </div>
      <h3 style="font-size:14px;margin-bottom:12px;text-align:left">👤 Sigue estos pasos:</h3>
      ${stepsHtml}
      <button onclick="confirmNetlifyDone()" style="width:100%;background:var(--brand-orange);color:#fff;border:none;border-radius:9px;padding:13px;font-weight:700;font-size:15px;cursor:pointer;font-family:inherit;margin-top:8px">✅ Ya está subida — Continuar</button>
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
  if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!getLicense()) showActivationGate();
  else if(!DB.business.tourSeen) promptAppTour();
}
function postponeNetlify(){
  hideNetlifySetupGate();
  if(!getCloudConfig()) showFirebaseSetupGate();
  else if(!getLicense()) showActivationGate();
  else if(!DB.business.tourSeen) promptAppTour();
}

function activateLicenseFromGate(){
  const key = (document.getElementById('license-key-input').value || '').trim().toUpperCase();
  const parsed = validateLicenseKey(key);
  const err = document.getElementById('license-error');
  if(!parsed){
    err.textContent = 'Clave no válida. Comprueba que la copiaste entera, con los guiones, tal y como te la envió tu vendedor.';
    err.style.display = 'block';
    return;
  }
  const lic = { name: parsed.name, key };
  localStorage.setItem(LICENSE_LS, JSON.stringify(lic));
  DB.license = lic;
  saveDB();
  updateActiveSlotName(parsed.name);
  hideActivationGate();
  showToast(t('msg.licenseActivated') + ': ' + parsed.name);
  initCloud();
  initPublicRequestsListener();
  checkLicenseRevocation();
  if(!DB.business.tourSeen) promptAppTour();
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
  'ingredientCategories','recipeCategories','elaboraciones'
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
  if(state === 'online'){ el.textContent = '☁ Nube conectada'; el.style.background = 'rgba(52,199,89,.2)'; el.style.color = '#7BE495'; }
  else if(state === 'offline'){ el.textContent = '☁ Sin conexión'; el.style.background = 'rgba(255,204,0,.2)'; el.style.color = '#FFD60A'; }
  else { el.textContent = '☁ Error de nube'; el.style.background = 'rgba(255,69,58,.2)'; el.style.color = '#FF6B61'; }
}

function refreshAfterRemoteChange(){
  renderHeader();
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
      if(req.type === 'reserva'){
        DB.reservations.push({
          id: genId(), clientId: null,
          clientName: req.clientName || '', clientPhone: req.clientPhone || '',
          date: req.date, time: req.time, people: req.people || 1,
          tableId: null, notes: req.notes || '', status: 'pendiente'
        });
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
        DB.tpvOrders.push({
          id: genId(), tableId: null, tipo: req.tipo === 'delivery' ? 'delivery' : 'takeaway',
          clienteNombre: req.clienteNombre || '', clienteTelefono: req.clienteTelefono || '',
          clienteDireccion: req.clienteDireccion || '', clienteCodigoPostal: req.codigoPostal || '',
          notas: req.notas || '',
          date: req.date || '', time: req.time || '',
          costeEnvio: req.costeEnvio || 0,
          status: 'pendiente-online', items: onlineItems, tandas: [], createdAt: new Date().toISOString(),
          clientRef: req.clientRef || null
        });
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
      const parsed = validateLicenseKey(lic.key);
      if(!parsed) continue;
      const pid = ggLicHash(parsed.tenantId + '·gastrogoan·public·v1').toString(36).padStart(7, '0');
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
        tables: DB.tables.map(t => ({id: t.id, name: t.name}))
      };
      if(sucursales) data.sucursales = sucursales;
      app.database().ref('gastrogoan/public/' + publicId + '/info').set(data).catch(()=>{});
    }).catch(e => console.error('Error publicando el espejo público', e));
  }catch(e){
    console.error('Error publicando el espejo público', e);
  }
}

function initCloud(){
  cloudConfig = getCloudConfig();
  if(!cloudConfig){ updateSyncBadge('local'); return; }
  if(typeof firebase === 'undefined'){ console.error('Firebase no disponible (¿sin internet?)'); updateSyncBadge('error'); return; }
  const tenantId = getTenantId();
  if(!tenantId){ updateSyncBadge('local'); return; } // aún sin licencia activada
  if(cloudRef) return; // ya conectado
  try{
    if(!firebase.apps || !firebase.apps.length) firebase.initializeApp(cloudConfig);
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
  lastSyncedSnapshot[key] = json;
  DB[key] = merged;
  idbSet(DB_KEY, DB).catch(e => console.error('Error guardando datos', e));
  // Licencia compartida por la nube: los empleados se activan solos
  if(DB.license && validateLicenseKey(DB.license.key)){
    localStorage.setItem(LICENSE_LS, JSON.stringify(DB.license));
    updateActiveSlotName(DB.license.name);
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

function startCloudSync(tenantId){
  if(cloudRef) return; // ya conectado
  try{
    cloudRef = firebase.database().ref('gastrogoan/tenants/' + tenantId + '/db');
    cloudRef.once('value').then(snap => {
      const val = snap.val();
      updateSyncBadge('online');
      if(val === null){
        // Nube vacía: subir los datos locales como punto de partida
        lastSyncedSnapshot = {};
        pushAllToCloud();
        syncPublicMirror();
      }else{
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
          if(DB.license && validateLicenseKey(DB.license.key)){
            localStorage.setItem(LICENSE_LS, JSON.stringify(DB.license));
            updateActiveSlotName(DB.license.name);
            hideActivationGate();
          }
          refreshAfterRemoteChange();
        }
      }
      attachCloudChildListeners();
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
  return base + '?neg=' + publicId;
}

function renderOnlineCard(){
  const b = DB.business || {};
  if(!getTenantId()){
    return `
      <div class="card" style="max-width:720px;border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 Reservas y pedidos online</h3>
        <p style="font-size:13.5px;margin-bottom:12px">Activa tu licencia de GastroGoan para obtener un enlace y un código QR con los que tus clientes podrán reservar mesa o pedir take away/delivery desde su móvil.</p>
      </div>
    `;
  }
  if(!getCloudConfig()){
    return `
      <div class="card" style="max-width:720px;border:2px solid var(--brand-orange);background:var(--brand-cream)">
        <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 Reservas y pedidos online</h3>
        <p style="font-size:13.5px;margin-bottom:12px">Configura la nube de este negocio (botón ☁️ Nube de la cabecera) para obtener un enlace y un código QR con los que tus clientes podrán reservar mesa o pedir take away/delivery desde su móvil.</p>
      </div>
    `;
  }
  const link = getPublicClientLink();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(link);
  return `
    <div class="card" style="max-width:720px;border:2px solid var(--brand-orange);background:var(--brand-cream)">
      <h3 style="color:var(--brand-orange)"><i class="ti ti-device-mobile"></i> 📱 Reservas y pedidos online</h3>
      <p style="font-size:13.5px;margin-bottom:12px">Comparte este código QR o enlace con tus clientes: podrán reservar mesa${ (b.tiposServicio?.takeaway!==false || b.tiposServicio?.delivery!==false) ? ' y pedir take away o delivery' : ''} desde su móvil, sin instalar nada.</p>
      <details style="margin-bottom:12px">
        <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--brand-orange)">⚠️ Importante: ¿dónde tienes que tener guardada esta app para que esto funcione?</summary>
        <div style="margin-top:8px;background:var(--brand-cream);border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.6">
          Este enlace y QR solo funcionan si los dos archivos de GastroGoan — la app de gestión (este archivo) y <strong>reservagastrogoan.html</strong> (la página que ven tus clientes) — están <strong>subidos juntos, dentro de la misma carpeta, en un hosting con dirección (URL) pública en internet</strong>.<br><br>
          Es decir: no basta con tenerlos guardados en el ordenador o el móvil y abrirlos haciendo doble clic. "Hosting con URL pública" significa un servicio que aloja tus archivos en internet y les da una dirección web (algo como <code>https://tu-restaurante.netlify.app/</code>) a la que cualquier cliente puede acceder desde su móvil. Hay opciones gratuitas y sencillas (por ejemplo Netlify: se arrastran los dos archivos a su web y ya tienen dirección pública).<br><br>
          Si abres la app directamente desde tu ordenador (sin subirla a ningún sitio), el QR y el enlace no llevarán a ninguna página real.<br><br>
          📘 <strong>¿No sabes cómo subirlos?</strong> Sigue el tutorial paso a paso <a href="tutorial-netlify.html" target="_blank" rel="noopener"><strong>tutorial-netlify.html</strong></a> (subir a Netlify, gratis, 5 minutos). Debe estar en la misma carpeta que esta app.
        </div>
      </details>
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
        <img src="${qrUrl}" alt="Código QR" style="width:140px;height:140px;border-radius:10px;border:1px solid var(--border);background:#fff;padding:6px">
        <div style="flex:1;min-width:180px">
          <p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">Descarga el QR e imprímelo para tus mesas, escaparate o redes sociales.</p>
          <a class="btn btn-sm" style="width:100%;text-decoration:none;justify-content:center;display:inline-flex;margin-bottom:6px" href="${qrUrl}" download="qr-reservas.png"><i class="ti ti-download"></i> Descargar QR</a>
          <a class="btn btn-sm" style="width:100%;text-decoration:none;justify-content:center;display:inline-flex" href="${link}" target="_blank" rel="noopener"><i class="ti ti-eye"></i> Ver la página</a>
        </div>
      </div>
      <div class="field">
        <textarea id="mn-public-link" rows="2" readonly style="font-family:monospace;font-size:11px" onclick="this.select()">${link}</textarea>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm" style="flex:1" onclick="copyPublicLinkFrom('mn-public-link')"><i class="ti ti-copy"></i> Copiar enlace</button>
        <a class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;border-color:#25D366;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent('Reserva o pide en línea en ' + (b.name || 'nuestro restaurante') + ':\n\n' + link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
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
  if(!getTenantId() || !getCloudConfig()) return '';
  const link = getPublicClientLink();
  if(!link) return '';
  // Un QR por cada mesa configurada en Mi Negocio, agrupados por zona
  // (interior / terraza / barra). Solo hay tantos QR como mesas configuradas.
  const zonas = [['interior','🏠 Interior'], ['terraza','🌤️ Terraza'], ['barra','🍸 Barra'], [null,'Otras mesas']];
  const zonasHtml = zonas.map(([z, label]) => {
    const tables = DB.tables.filter(t => (t.zona||null) === z);
    if(!tables.length) return '';
    return `
      <div style="margin-bottom:10px">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:4px">${label} (${tables.length})</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${tables.map(t => `<button class="btn btn-sm" style="font-size:12px;padding:4px 10px" onclick="showTableQr(${t.id})"><i class="ti ti-qrcode"></i> ${escapeHtml(t.name)}</button>`).join('')}
        </div>
      </div>`;
  }).join('');
  return `
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-qrcode"></i> QR auto pedido</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Hay un QR por cada mesa configurada en Mi Negocio (${DB.tables.length} en total). Pulsa sobre una mesa para ver su QR y descargarlo. Imprímelo y colócalo en esa mesa: tus clientes lo escanean, ven la carta y piden directamente desde su móvil. El pedido aparece automáticamente en esa mesa dentro del TPV, sin pasar por la bandeja de pendientes.</p>
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
      <p style="font-size:13px;color:var(--muted);margin:10px 0">Tus clientes escanean este código para pedir desde <strong>${escapeHtml(tbl.name)}</strong>.</p>
      <a class="btn btn-primary" style="text-decoration:none;display:inline-flex" href="${tQr}" download="qr-${escapeHtml(tbl.name).replace(/\s+/g,'-')}.png"><i class="ti ti-download"></i> Descargar QR</a>
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
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-clock-hour-4"></i> Pedidos para llevar / domicilio</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:6px"><i class="ti ti-info-circle"></i> La antelación mínima se configura en la sección <strong>Operativa</strong> (vale tanto para reservas como para pedidos).</p>
      <div class="field">
        <label>Pedido mínimo (€)</label>
        <input type="number" id="mn-pedidominimo" min="0" step="0.5" value="${escapeHtml(p.pedidoMinimo||0)}" placeholder="10">
        <small style="color:var(--muted)">Importe mínimo del pedido (sin contar el envío) para poder realizarlo online. Pon 0 para no exigir mínimo.</small>
      </div>
      <div class="field">
        <label style="display:flex;align-items:center;gap:8px;font-weight:400">
          <input type="checkbox" id="mn-pagolocal" ${p.permitirPagoLocal!==false?'checked':''} style="width:18px;height:18px"> Permitir "pagar al recoger / al recibir"
        </label>
        <small style="color:var(--muted)">Si lo desmarcas, tus clientes solo podrán pagar online con tarjeta (necesita tener configurado el pago con tarjeta).</small>
      </div>
      ${deliveryEnabled ? `
      <div class="field">
        <label>Coste de envío a domicilio (€)</label>
        <input type="number" id="mn-deliveryfee" min="0" step="0.5" value="${escapeHtml(p.deliveryFee||0)}" placeholder="3.00">
      </div>
      <div class="field">
        <label>Códigos postales donde repartes</label>
        <textarea id="mn-cplist" placeholder="28001, 28002, 28003">${escapeHtml((p.cpList||[]).join(', '))}</textarea>
        <small style="color:var(--muted)">Separados por comas. Déjalo en blanco si no quieres restringir por código postal.</small>
      </div>
      <div class="field">
        <label>Radio de reparto (km desde tu dirección)</label>
        <input type="number" id="mn-radiuskm" min="0" step="0.5" value="${escapeHtml(p.radiusKm||0)}" placeholder="5">
        <small style="color:var(--muted)">0 = sin límite por distancia. Necesita que la "Dirección" de tu negocio (sección Contacto) esté rellena.</small>
      </div>
      ${p.lat!=null ? `<p style="font-size:12px;color:var(--muted)"><i class="ti ti-map-pin"></i> Ubicación calculada: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</p>` : ''}
      <p style="font-size:12px;color:var(--muted)">Un pedido a domicilio se acepta si el código postal del cliente está en tu lista, o si su dirección está dentro del radio configurado (basta con que cumpla una de las dos condiciones).</p>
      ` : ''}
      <button class="btn btn-primary" onclick="savePedidosConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
    </div>
  `;
}

async function savePedidosConfig(){
  const b = DB.business;
  const p = b.pedidos || {};
  p.pedidoMinimo = Math.max(0, parseFloat(document.getElementById('mn-pedidominimo').value) || 0);
  p.permitirPagoLocal = document.getElementById('mn-pagolocal').checked;

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
function renderRedsysCard(){
  if(!getTenantId()) return '';
  return `
    <div class="card" style="max-width:720px">
      <h3><i class="ti ti-credit-card"></i> 💳 Pago online con tarjeta (TPV virtual)</h3>
      <p style="font-size:13px;color:var(--muted);margin-bottom:10px">Permite que tus clientes paguen con tarjeta al hacer un pedido online (take away/delivery). El cobro se realiza a través del TPV virtual de tu propio banco (Redsys): el dinero llega directamente a tu cuenta, sin intermediarios.</p>
      <div id="redsys-status" style="font-size:13px;color:var(--muted);margin-bottom:10px">Comprobando configuración...</div>
      <div class="field">
        <label>Código de comercio (FUC)</label>
        <input type="text" id="rs-fuc" placeholder="999008881" style="font-family:monospace">
      </div>
      <div class="field">
        <label>Terminal</label>
        <input type="text" id="rs-terminal" placeholder="1" style="font-family:monospace;max-width:120px">
      </div>
      <div class="field">
        <label>Clave secreta (Firma)</label>
        <input type="password" id="rs-clave" placeholder="Pégala aquí (no se mostrará de nuevo)" style="font-family:monospace">
        <small style="color:var(--muted)">La obtienes en el módulo de administración de tu TPV virtual, dentro de la web de tu banco.</small>
      </div>
      <div class="field" style="margin-bottom:10px">
        <label style="display:flex;align-items:center;gap:10px;font-weight:600;cursor:pointer">
          <input type="checkbox" id="rs-real" style="width:18px;height:18px"> Entorno real (cobros reales). Desmarcado = modo pruebas.
        </label>
      </div>
      <button class="btn btn-primary" onclick="saveRedsysConfig()"><i class="ti ti-device-floppy"></i> Guardar</button>
    </div>
  `;
}

async function loadRedsysCardStatus(){
  const el = document.getElementById('redsys-status');
  if(!el || !getTenantId()) return;
  try{
    const res = await fetch(`${REDSYS_WORKER_URL}/config?tenantId=${encodeURIComponent(getTenantId())}`);
    const data = await res.json();
    if(data && data.configured){
      el.innerHTML = `<span style="color:var(--brand-orange);font-weight:600"><i class="ti ti-check"></i> Configurado</span> · FUC ${escapeHtml(data.fuc)} · Terminal ${escapeHtml(data.terminal)} · Entorno ${data.ambiente === 'real' ? 'real' : 'pruebas'}`;
      document.getElementById('rs-fuc').value = data.fuc || '';
      document.getElementById('rs-terminal').value = data.terminal || '';
      document.getElementById('rs-real').checked = data.ambiente === 'real';
    }else{
      el.innerHTML = t('msg.cardPaymentNotConfigured');
    }
  }catch(e){
    el.innerHTML = t('msg.cardPaymentCheckFailed');
  }
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
      <label style="font-size:12px">Clave de API (apiKey)</label>
      <input id="own-fb-apikey" type="text" placeholder="AIza..." value="${(DB.business?.ownFirebase?.apiKey)||''}" style="font-family:monospace;font-size:12px">
    </div>
    <div class="field" style="margin-bottom:10px">
      <label style="font-size:12px">URL de la base de datos (databaseURL)</label>
      <input id="own-fb-dburl" type="text" placeholder="https://xxxx-default-rtdb.firebaseio.com" value="${(DB.business?.ownFirebase?.databaseURL)||''}" style="font-family:monospace;font-size:12px">
    </div>
    <button class="btn" style="width:100%;justify-content:center" onclick="saveOwnFirebaseConfig()"><i class="ti ti-cloud-cog"></i> Guardar y conectar</button>
  `;
}

function openCloudWizard(){
  const lic = getLicense();
  if(!lic){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-cloud"></i> Nube — Sincronización entre dispositivos</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="empty"><i class="ti ti-cloud-off"></i>Activa tu licencia de GastroGoan para conectar este dispositivo a la nube.</div>
    `);
    return;
  }
  if(!getCloudConfig()){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-cloud"></i> Configurar la nube</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px">🔑 Licencia activada para: <strong>${lic.name}</strong></p>
      <div style="background:#F5F0E3;border-left:4px solid var(--brand-orange);border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:14px">
        Para sincronizar varios dispositivos (camareros, cocina...) y activar las reservas/pedidos online por QR, este negocio necesita su <strong>propio proyecto Firebase</strong> (gratuito, de Google — cada negocio tiene el suyo, así nunca hay límites compartidos ni costes para nadie).
      </div>
      <p style="font-size:13px;margin-bottom:10px">Tardarás unos 10 minutos, una sola vez. Sigue la guía paso a paso y luego pega aquí los dos datos que te pida al final:</p>
      <ol style="font-size:12.5px;line-height:1.7;margin:0 0 14px 18px;color:#444">
        <li>Crea un proyecto gratis en <code>console.firebase.google.com</code></li>
        <li>Activa <strong>Realtime Database</strong></li>
        <li>Activa el inicio de sesión <strong>Anónimo</strong> en Authentication</li>
        <li>Pega las reglas de seguridad que te indica la guía</li>
        <li>Copia tu <code>apiKey</code> y <code>databaseURL</code> y pégalos abajo</li>
      </ol>
      ${renderOwnFirebaseForm()}
    `);
    return;
  }
  const link = getPublicClientLink();
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(link);
  const otrosServicios = (DB.business?.tiposServicio?.takeaway !== false || DB.business?.tiposServicio?.delivery !== false) ? ' y/o hacer pedidos para llevar / delivery' : '';
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-cloud"></i> Nube — Sincronización entre dispositivos</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:11.5px;color:var(--muted);margin:-6px 0 10px">🔑 Licencia activada para: <strong>${lic.name}</strong></p>
    <div style="background:var(--green-l);color:var(--green);padding:12px 16px;border-radius:10px;font-weight:700;margin-bottom:14px"><i class="ti ti-cloud-check"></i> Este negocio está conectado a su nube Firebase</div>
    <p style="font-size:13.5px;margin-bottom:14px"><strong>Para conectar más dispositivos</strong> (móviles de camareros, tablet de cocina): instala GastroGoan en ese dispositivo y activa la <strong>misma clave de licencia</strong> (<code>${lic.key}</code>). Se sincronizará solo, automáticamente, sin pasos adicionales.</p>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <p style="font-size:13.5px;margin-bottom:8px"><strong>📱 Página de reservas y pedidos online</strong></p>
    <p style="font-size:12.5px;color:var(--muted);margin-bottom:8px">Comparte este enlace o código QR con tus clientes para que puedan reservar mesa${otrosServicios} directamente desde su móvil.</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-bottom:12px">
      <img src="${qrUrl}" alt="Código QR" style="width:120px;height:120px;border-radius:10px;border:1px solid var(--border);background:#fff;padding:6px">
      <div class="field" style="flex:1;min-width:180px;margin-bottom:0">
        <textarea id="cloud-public-link" rows="3" readonly style="font-family:monospace;font-size:11px" onclick="this.select()">${link}</textarea>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn" style="flex:1" onclick="copyPublicLinkFrom('cloud-public-link')"><i class="ti ti-copy"></i> Copiar enlace</button>
      <a class="btn" style="flex:1;background:#25D366;color:#fff;border-color:#25D366;text-decoration:none;justify-content:center;display:inline-flex" href="https://wa.me/?text=${encodeURIComponent('Reserva o pide en línea en ' + (DB.business?.name || 'nuestro restaurante') + ':\n\n')}${encodeURIComponent(link)}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i> WhatsApp</a>
    </div>
    <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
    <details>
      <summary style="font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">⚙️ Cambiar la configuración de Firebase</summary>
      <div style="margin-top:10px">
        <p style="font-size:12px;color:var(--muted);margin-bottom:10px">Deja ambos campos vacíos y guarda para desconectar la nube de este negocio.</p>
        ${renderOwnFirebaseForm()}
      </div>
    </details>
  `);
}

const CATEGORIES = ['Carnes','Pescados','Lácteos','Verduras','Frutas','Cereales y Panadería','Bebidas','Condimentos y Especias','Congelados','Otros'];
const ALLERGENS = ['Gluten','Crustáceos','Huevos','Pescado','Cacahuetes','Soja','Lácteos','Frutos de cáscara','Apio','Mostaza','Sésamo','Sulfitos','Altramuces','Moluscos'];
const UNITS = ['g','ud'];
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
    loyaltyRewards: ['Postre gratis', 'Café o infusión gratis', 'Chupito o bebida gratis', 'Entrante gratis', '10% de descuento en la cuenta'], // catálogo de premios sugeribles al llegar a 10 puntos
    reservations: [],
    business: {
      name:'', address:'', phone:'', email:'', description:'',
      logo:'', tipo:'', anyo:'', web:'', cif:'', prop:'',
      mesasInterior:'', mesasTerraza:'', aforo:'', ig:'', fb:'',
      pin:'1234', pinSet:false,
      horario: defaultHorario(),
      cartaAuto: true,
      tiposServicio: {mesa:true, takeaway:true, delivery:true},
      ownFirebase: null, // {apiKey, databaseURL} si el negocio usa su propio proyecto Firebase
      ticket: {
        pie: '¡Gracias por su visita!',
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
      config: {ticketMedio:15, cubiertosActuales:50, diasApertura:26, foodCostObj:35}
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

function genId(){
  // Id único incluso si varios dispositivos crean datos a la vez
  const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  DB.nextId = Math.max(DB.nextId || 1, id + 1);
  return id;
}

