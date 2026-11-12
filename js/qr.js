/* ═══ GENERADOR DE QR PROPIO (12/11, pedido del dueño: «el QR para dejar reseña tiene que funcionar y ser viable para siempre») ═══
   Hasta ahora TODOS los QR de la app (reseña de Google y VeriFactu del ticket, QR de las mesas, enlace de reservas…) eran una
   imagen pedida a api.qrserver.com. Si ese servicio caía, estaba bloqueado por la red del local o no había internet, el QR salía
   ROTO en el ticket, sin ningún aviso: un papel impreso que ya no se puede arreglar. Ahora el QR se dibuja aquí mismo, como una
   imagen incrustada (data:), sin depender de nadie: sale igual con o sin internet, hoy y dentro de diez años.

   Implementa el estándar ISO/IEC 18004 en modo BYTE (cualquier texto en UTF-8), nivel de corrección M (se recuperan hasta el 15 %
   de daños, bien para un ticket arrugado o una impresora térmica floja), versiones 1 a 40 (hasta unos 2.300 caracteres), las ocho
   máscaras con su penalización. La estructura sigue la implementación de referencia de Project Nayuki (dominio público en lo
   esencial: la idea y las tablas son del estándar). Lo vigila test/qr-local.mjs, que DECODIFICA los QR generados con un lector real
   (jsQR): un QR que se ve bien pero no se lee es el peor fallo posible, y no se detecta mirándolo.

   Uso:  GGQR.png(texto, px)  → data:image/png listo para <img src>  (px = tamaño aproximado en píxeles)
         GGQR.svg(texto)      → cadena SVG (vectorial)
         GGQR.matriz(texto)   → {size, modules[y][x]} por si se quiere dibujar de otra forma. */
const GGQR = (function(){
  // Código de corrección por bloque y nº de bloques, por versión (índice 0 de relleno) y nivel (L, M, Q, H). Tablas del estándar.
  const ECC_POR_BLOQUE = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  ];
  const NUM_BLOQUES = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
  ];
  const NIVEL = 1;                    // 0 = L, 1 = M, 2 = Q, 3 = H
  const BITS_FORMATO = [1, 0, 3, 2];  // L, M, Q, H

  const bit = (x, i) => ((x >>> i) & 1) !== 0;

  function modulosBrutos(ver){
    let r = (16 * ver + 128) * ver + 64;
    if(ver >= 2){
      const nAlin = Math.floor(ver / 7) + 2;
      r -= (25 * nAlin - 10) * nAlin - 55;
      if(ver >= 7) r -= 36;
    }
    return r;
  }
  function palabrasDeDatos(ver){
    return Math.floor(modulosBrutos(ver) / 8) - ECC_POR_BLOQUE[NIVEL][ver] * NUM_BLOQUES[NIVEL][ver];
  }

  // Reed-Solomon sobre GF(256)
  function rsMultiplicar(x, y){
    let z = 0;
    for(let i = 7; i >= 0; i--){
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  function rsDivisor(grado){
    const r = new Array(grado).fill(0);
    r[grado - 1] = 1;
    let raiz = 1;
    for(let i = 0; i < grado; i++){
      for(let j = 0; j < r.length; j++){
        r[j] = rsMultiplicar(r[j], raiz);
        if(j + 1 < r.length) r[j] ^= r[j + 1];
      }
      raiz = rsMultiplicar(raiz, 0x02);
    }
    return r;
  }
  function rsResto(datos, divisor){
    const r = divisor.map(() => 0);
    datos.forEach(b => {
      const factor = b ^ r.shift();
      r.push(0);
      divisor.forEach((coef, i) => { r[i] ^= rsMultiplicar(coef, factor); });
    });
    return r;
  }

  function utf8(texto){
    if(typeof TextEncoder !== 'undefined') return Array.from(new TextEncoder().encode(texto));
    const s = unescape(encodeURIComponent(texto));
    return Array.from(s, c => c.charCodeAt(0));
  }

  // Datos + relleno → palabras de código de datos
  function codificarDatos(bytes, ver){
    const bits = [];
    const poner = (v, n) => { for(let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    poner(0x4, 4);                                   // modo byte
    poner(bytes.length, ver <= 9 ? 8 : 16);          // nº de caracteres
    bytes.forEach(b => poner(b, 8));
    const capacidad = palabrasDeDatos(ver) * 8;
    poner(0, Math.min(4, capacidad - bits.length));  // terminador
    poner(0, (8 - bits.length % 8) % 8);             // a byte entero
    for(let pad = 0xEC; bits.length < capacidad; pad ^= 0xEC ^ 0x11) poner(pad, 8);
    const palabras = new Array(bits.length / 8).fill(0);
    bits.forEach((b, i) => { palabras[i >>> 3] |= b << (7 - (i & 7)); });
    return palabras;
  }

  function entrelazar(datos, ver){
    const nBloques = NUM_BLOQUES[NIVEL][ver];
    const eccLen = ECC_POR_BLOQUE[NIVEL][ver];
    const crudas = Math.floor(modulosBrutos(ver) / 8);
    const nCortos = nBloques - crudas % nBloques;
    const largoCorto = Math.floor(crudas / nBloques);
    const bloques = [];
    const div = rsDivisor(eccLen);
    for(let i = 0, k = 0; i < nBloques; i++){
      const dat = datos.slice(k, k + largoCorto - eccLen + (i < nCortos ? 0 : 1));
      k += dat.length;
      const ecc = rsResto(dat, div);
      if(i < nCortos) dat.push(0);
      bloques.push(dat.concat(ecc));
    }
    const r = [];
    for(let i = 0; i < bloques[0].length; i++){
      bloques.forEach((b, j) => { if(i !== largoCorto - eccLen || j >= nCortos) r.push(b[i]); });
    }
    return r;
  }

  function posicionesAlineacion(ver, size){
    if(ver === 1) return [];
    const n = Math.floor(ver / 7) + 2;
    const paso = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    const r = [6];
    for(let pos = size - 7; r.length < n; pos -= paso) r.splice(1, 0, pos);
    return r;
  }

  function construir(bytes){
    let ver = 1;
    while(ver <= 40){
      const bitsNecesarios = 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8;
      if(bitsNecesarios <= palabrasDeDatos(ver) * 8) break;
      ver++;
    }
    if(ver > 40) return null;
    const size = ver * 4 + 17;
    const mod = Array.from({length: size}, () => new Array(size).fill(false));
    const fun = Array.from({length: size}, () => new Array(size).fill(false));
    const poner = (x, y, v) => { mod[y][x] = v; fun[y][x] = true; };

    // Patrones de función
    for(let i = 0; i < size; i++){ poner(6, i, i % 2 === 0); poner(i, 6, i % 2 === 0); }
    const buscador = (x, y) => {
      for(let dy = -4; dy <= 4; dy++) for(let dx = -4; dx <= 4; dx++){
        const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if(xx >= 0 && xx < size && yy >= 0 && yy < size) poner(xx, yy, d !== 2 && d !== 4);
      }
    };
    buscador(3, 3); buscador(size - 4, 3); buscador(3, size - 4);
    const al = posicionesAlineacion(ver, size), nA = al.length;
    for(let i = 0; i < nA; i++) for(let j = 0; j < nA; j++){
      if((i === 0 && j === 0) || (i === 0 && j === nA - 1) || (i === nA - 1 && j === 0)) continue;
      for(let dy = -2; dy <= 2; dy++) for(let dx = -2; dx <= 2; dx++) poner(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    const formato = mascara => {
      const datosF = BITS_FORMATO[NIVEL] << 3 | mascara;
      let resto = datosF;
      for(let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
      const bits = (datosF << 10 | resto) ^ 0x5412;
      for(let i = 0; i <= 5; i++) poner(8, i, bit(bits, i));
      poner(8, 7, bit(bits, 6)); poner(8, 8, bit(bits, 7)); poner(7, 8, bit(bits, 8));
      for(let i = 9; i < 15; i++) poner(14 - i, 8, bit(bits, i));
      for(let i = 0; i < 8; i++) poner(size - 1 - i, 8, bit(bits, i));
      for(let i = 8; i < 15; i++) poner(8, size - 15 + i, bit(bits, i));
      poner(8, size - 8, true);
    };
    formato(0);   // reserva el sitio; se vuelve a dibujar con la máscara elegida
    if(ver >= 7){
      let resto = ver;
      for(let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1F25);
      const bits = ver << 12 | resto;
      for(let i = 0; i < 18; i++){
        const c = bit(bits, i), a = size - 11 + i % 3, b = Math.floor(i / 3);
        poner(a, b, c); poner(b, a, c);
      }
    }

    // Datos
    const palabras = entrelazar(codificarDatos(bytes, ver), ver);
    let k = 0;
    for(let derecha = size - 1; derecha >= 1; derecha -= 2){
      if(derecha === 6) derecha = 5;
      for(let vert = 0; vert < size; vert++){
        for(let j = 0; j < 2; j++){
          const x = derecha - j;
          const arriba = ((derecha + 1) & 2) === 0;
          const y = arriba ? size - 1 - vert : vert;
          if(!fun[y][x] && k < palabras.length * 8){ mod[y][x] = bit(palabras[k >>> 3], 7 - (k & 7)); k++; }
        }
      }
    }

    // Máscara: se prueba cada una y se queda la de menor penalización
    const aplicar = m => {
      for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){
        let inv;
        switch(m){
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = x * y % 2 + x * y % 3 === 0; break;
          case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break;
          default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
        }
        if(!fun[y][x] && inv) mod[y][x] = !mod[y][x];
      }
    };
    const penalizacion = () => {
      let p = 0;
      const linea = get => {      // tiras largas del mismo color y patrón tipo buscador
        for(let a = 0; a < size; a++){
          let run = 1;
          for(let b = 1; b < size; b++){
            if(get(a, b) === get(a, b - 1)){ run++; if(run === 5) p += 3; else if(run > 5) p++; } else run = 1;
          }
          for(let b = 0; b + 10 < size; b++){
            const s = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], t = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
            let m1 = true, m2 = true;
            for(let q = 0; q < 11; q++){ const v = get(a, b + q) ? 1 : 0; if(v !== s[q]) m1 = false; if(v !== t[q]) m2 = false; }
            if(m1 || m2) p += 40;
          }
        }
      };
      linea((a, b) => mod[a][b]);
      linea((a, b) => mod[b][a]);
      for(let y = 0; y < size - 1; y++) for(let x = 0; x < size - 1; x++){
        const c = mod[y][x];
        if(c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
      }
      let negros = 0;
      mod.forEach(f => f.forEach(c => { if(c) negros++; }));
      const total = size * size;
      p += (Math.ceil(Math.abs(negros * 20 - total * 10) / total) - 1) * 10;
      return p;
    };
    let mejor = 0, mejorP = Infinity;
    for(let m = 0; m < 8; m++){
      aplicar(m); formato(m);
      const p = penalizacion();
      if(p < mejorP){ mejor = m; mejorP = p; }
      aplicar(m);          // deshacer (la máscara es su propia inversa)
    }
    aplicar(mejor); formato(mejor);
    return {size, modules: mod, version: ver};
  }

  function matriz(texto){ return construir(utf8(String(texto == null ? '' : texto))); }

  // PNG incrustado (data:). Zona de silencio de 4 módulos, y el tamaño de cada módulo es un ENTERO de píxeles: bordes nítidos al
  // imprimir (un escalado con decimales emborrona y baja la fiabilidad de lectura).
  function png(texto, px){
    const q = matriz(texto);
    if(!q || typeof document === 'undefined') return '';
    const total = q.size + 8;
    const escala = Math.max(2, Math.floor((px || 240) / total));
    const c = document.createElement('canvas');
    c.width = c.height = total * escala;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#000';
    for(let y = 0; y < q.size; y++) for(let x = 0; x < q.size; x++){
      if(q.modules[y][x]) g.fillRect((x + 4) * escala, (y + 4) * escala, escala, escala);
    }
    return c.toDataURL('image/png');
  }

  function svg(texto){
    const q = matriz(texto);
    if(!q) return '';
    const total = q.size + 8;
    let d = '';
    for(let y = 0; y < q.size; y++) for(let x = 0; x < q.size; x++) if(q.modules[y][x]) d += `M${x + 4},${y + 4}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  return {matriz, png, svg};
})();
if(typeof window !== 'undefined') window.GGQR = GGQR;
