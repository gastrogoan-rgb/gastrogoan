/* La música del vídeo de demo, sintetizada aquí mismo.
 *
 * Por qué no una pista descargada: una demo que se le enseña a un cliente es
 * uso comercial, y la música "gratis" de internet casi nunca lo es — un
 * vídeo de venta con una pista ajena es un problema esperando a pasar. Esta
 * se genera con código, así que es nuestra y no depende de nadie.
 *
 * Qué suena: La menor, 96 pulsaciones por minuto, cuatro acordes que giran
 * (Am · F · C · G). Un bajo marcando, un colchón de fondo, un arpegio que
 * da el pulso y una percusión suave. Nada melódico por encima: la música
 * tiene que empujar el vídeo, no competir con lo que se está leyendo.
 *
 *   node video/musica.mjs [segundos] [salida.wav]
 */
import fs from 'node:fs';

const SR = 44100;              // muestras por segundo
const BPM = 96;
const NEGRA = 60 / BPM;        // segundos por pulso
const COMPAS = NEGRA * 4;

// Notas, en hercios. La menor natural.
const N = {
  A1: 55.00, C2: 65.41, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00,
  B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00,
};

/* Los cuatro acordes. Cada uno dura un compás: bajo, las notas del acorde
   para el colchón, y las que recorre el arpegio. */
const VUELTA = [
  {bajo: N.A1, acorde: [N.A2, N.C3, N.E3], arpegio: [N.A3, N.C4, N.E4, N.C4]},
  {bajo: N.F2, acorde: [N.F2, N.A2, N.C3], arpegio: [N.F3, N.A3, N.C4, N.A3]},
  {bajo: N.C2, acorde: [N.C3, N.E3, N.G3], arpegio: [N.C4, N.E4, N.G4, N.E4]},
  {bajo: N.G2, acorde: [N.G2, N.B3, N.D3], arpegio: [N.G3, N.B3, N.D4, N.B3]},
];

const dur = Math.max(10, parseFloat(process.argv[2] || '60'));
const salida = process.argv[3] || '/tmp/musica.wav';
const total = Math.round(dur * SR);
const izq = new Float64Array(total);
const der = new Float64Array(total);

// Envolvente: sube rápido, baja despacio. Sin esto, cada nota es un pitido.
const env = (t, ataque, caida) => {
  if(t < 0) return 0;
  if(t < ataque) return t / ataque;
  return Math.exp(-(t - ataque) / caida);
};
// Un tono con algo de cuerpo: la fundamental y un armónico flojo.
const tono = (f, t, forma) => {
  const fase = 2 * Math.PI * f * t;
  if(forma === 'triangulo') return (2/Math.PI) * Math.asin(Math.sin(fase));
  if(forma === 'suave') return Math.sin(fase) + 0.18 * Math.sin(2*fase);
  return Math.sin(fase);
};

const sumar = (desde, muestras, fn, pan = 0.5) => {
  const i0 = Math.round(desde * SR);
  for(let i = 0; i < muestras; i++){
    const idx = i0 + i;
    if(idx < 0 || idx >= total) continue;
    const v = fn(i / SR);
    izq[idx] += v * (1 - pan);
    der[idx] += v * pan;
  }
};

const compases = Math.ceil(dur / COMPAS);
for(let c = 0; c < compases; c++){
  const t0 = c * COMPAS;
  const a = VUELTA[c % VUELTA.length];
  /* El vídeo dura siete minutos: si los cuatro compases suenan idénticos
     todo el rato, cansa. Cada ocho compases se quita la percusión y baja el
     arpegio — un respiro, y al volver parece que arranca otra vez. */
  const respiro = Math.floor(c / 8) % 4 === 3;

  // Bajo: la raíz, dos veces por compás.
  for(const golpe of [0, 2]){
    sumar(t0 + golpe*NEGRA, Math.round(NEGRA*2*SR), t =>
      0.26 * env(t, 0.012, 0.55) * tono(a.bajo, t, 'suave'), 0.5);
  }

  // Colchón: el acorde sostenido, muy por detrás.
  for(const f of a.acorde){
    sumar(t0, Math.round(COMPAS*SR), t =>
      0.055 * env(t, 0.35, 3.2) * tono(f, t, 'seno'), 0.5);
  }

  // Arpegio en corcheas: es lo que da sensación de que algo avanza.
  const vol = respiro ? 0.055 : 0.095;
  for(let p = 0; p < 8; p++){
    const f = a.arpegio[p % a.arpegio.length] * (p >= 4 ? 2 : 1);
    // Alterna izquierda y derecha: da amplitud sin subir el volumen.
    sumar(t0 + p*(NEGRA/2), Math.round(NEGRA*SR), t =>
      vol * env(t, 0.006, 0.16) * tono(f, t, 'triangulo'), p % 2 ? 0.62 : 0.38);
  }

  if(!respiro){
    // Bombo en 1 y 3: un seno que cae de tono, que es lo que suena a golpe.
    for(const golpe of [0, 2]){
      sumar(t0 + golpe*NEGRA, Math.round(0.35*SR), t =>
        0.30 * env(t, 0.002, 0.09) * Math.sin(2*Math.PI*(105 - 55*Math.min(1, t/0.08))*t), 0.5);
    }
    // Y un repique corto en los contratiempos: ruido filtrado, nada más.
    for(let p = 1; p < 8; p += 2){
      sumar(t0 + p*(NEGRA/2), Math.round(0.05*SR), t =>
        0.035 * env(t, 0.001, 0.018) * (Math.random()*2 - 1), p % 4 === 1 ? 0.42 : 0.58);
    }
  }
}

/* Entra y sale sin dar un respingo. La entrada, larga: el vídeo empieza con
   una pantalla de texto y la música tiene que aparecer, no irrumpir. */
const fundido = (arr) => {
  const ent = Math.round(2.5 * SR), sal = Math.round(4 * SR);
  for(let i = 0; i < ent && i < total; i++) arr[i] *= i / ent;
  for(let i = 0; i < sal && i < total; i++) arr[total-1-i] *= i / sal;
};
fundido(izq); fundido(der);

// Un pelín de suavizado: quita el filo digital de los ataques.
const suavizar = arr => {
  let previo = 0;
  for(let i = 0; i < total; i++){
    previo = previo * 0.22 + arr[i] * 0.78;
    arr[i] = previo;
  }
};
suavizar(izq); suavizar(der);

// Normalizado a -16 dBFS: es música DE FONDO. Si compite con lo que se lee
// en pantalla, sobra.
let pico = 0;
for(let i = 0; i < total; i++) pico = Math.max(pico, Math.abs(izq[i]), Math.abs(der[i]));
const ganancia = pico > 0 ? (Math.pow(10, -16/20) / pico) : 1;

const bytes = Buffer.alloc(44 + total * 4);
bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + total*4, 4); bytes.write('WAVE', 8);
bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(SR, 24); bytes.writeUInt32LE(SR*4, 28);
bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34);
bytes.write('data', 36); bytes.writeUInt32LE(total*4, 40);
for(let i = 0; i < total; i++){
  const l = Math.max(-1, Math.min(1, izq[i] * ganancia));
  const r = Math.max(-1, Math.min(1, der[i] * ganancia));
  bytes.writeInt16LE(Math.round(l * 32767), 44 + i*4);
  bytes.writeInt16LE(Math.round(r * 32767), 46 + i*4);
}
fs.writeFileSync(salida, bytes);
console.log(`✅ ${salida} · ${Math.floor(dur/60)}m${String(Math.round(dur%60)).padStart(2,'0')}s · ${BPM} bpm · La menor`);
