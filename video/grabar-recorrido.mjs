// Graba el vídeo de recorrido sobre GG BURGER (no sobre la demo del bistró).
//
//   bash build.sh
//   python3 -m http.server 8950 &
//   node video/grabar-recorrido.mjs
//
// Los datos salen del mismo archivo que se le entrega al cliente para
// restaurar: así lo que se graba es exactamente lo que él va a ver.
import { grabar } from './motor.mjs';
const {GUION} = await import('./guion-recorrido.js');

const SEMBRAR = async () => {
  const datos = await (await fetch('/dist/ggburger.json')).json();
  // El archivo es la copia del negocio de pruebas del dueño: para el vídeo
  // el negocio se llama GG Burger, que es la marca que se está enseñando.
  datos.business.name = 'GG Burger';
  localStorage.setItem('gastrogoan_owner_login','1');
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts:Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));
  if(datos.license) localStorage.setItem('gastrogoan_license_v1', JSON.stringify(datos.license));
  await idbSet(DB_KEY, datos);
};

/* Lo mismo que hace la demo generada (demo/sembrar.js) al final: sin esto
   la grabación sale con "Error de nube" EN ROJO en la cabecera —porque no
   hay red contra ninguna Firebase, y no la va a haber— y con el selector de
   negocios abierto por encima de todo. Es exactamente lo que estropeó el
   vídeo anterior del proyecto. */
const DEJAR_LISTO = () => {
  window.recordSyncError = () => {};
  const verde = () => { try{ updateSyncBadge('online'); }catch(e){} };
  verde(); setInterval(verde, 1200);
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
    .forEach(id => document.getElementById(id)?.remove());
  try{ hideAccessSelectScreen(); }catch(e){}
  try{ hideBusinessSelectScreen(); }catch(e){}
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');
  try{ navigate('home'); }catch(e){}
};

const ok = await grabar({
  guion: GUION,
  salida: 'dist/gastrogoan-recorrido.mp4',
  titulo: 'recorrido GG Burger',
  origen: 'http://localhost:8950/dist/index.html',
  sembrar: SEMBRAR,
  listo: DEJAR_LISTO,
});
process.exitCode = ok === false ? 1 : 0;
