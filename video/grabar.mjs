// Graba los dos vídeos del tour.
//
//   bash build.sh && bash demo/generar.sh
//   python3 -m http.server 8950 &
//   node video/grabar.mjs            # los dos
//   node video/grabar.mjs venta      # solo el corto
//   node video/grabar.mjs completo   # solo el largo
//
// Son dos montajes distintos a propósito, no uno recortado: el completo
// enseña que la app lo tiene todo (sirve para formar a un cliente y para
// comprobar que no falta nada); el corto contesta en dos minutos a "¿esto
// qué me soluciona?". Ver la cabecera de cada guion.
import { grabar } from './motor.mjs';

const cual = process.argv[2];
const trabajos = [];

if(!cual || cual === 'completo'){
  const {GUION} = await import('./guion-completo.js');
  trabajos.push({guion: GUION, salida: 'dist/gastrogoan-tour-completo.mp4',
                 titulo: 'recorrido completo'});
}
if(!cual || cual === 'venta'){
  const {GUION} = await import('./guion-venta.js');
  trabajos.push({guion: GUION, salida: 'dist/gastrogoan-venta.mp4',
                 titulo: 'vídeo de venta'});
}

let fallos = 0;
for(const t of trabajos){
  const r = await grabar(t);
  fallos += r.perdidos.length;
}
// Salir con error si alguna pulsación se quedó sin destino: si no, un vídeo
// al que le faltan pantallas se da por bueno y se manda al cliente.
process.exit(fallos ? 1 : 0);
