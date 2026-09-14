/* El sistema tipográfico de los anuncios.
 *
 * ── El problema que resuelve ─────────────────────────────────────────────
 * La primera versión estaba TODA en Schibsted Grotesk Bold: el titular, la
 * cifra, el botón. Eso es exactamente lo que delata un diseño hecho a
 * máquina — no hay jerarquía, solo tamaños distintos de la misma letra. Un
 * diseñador no cambia el cuerpo, cambia la VOZ.
 *
 * ── Las cuatro voces, y el trabajo de cada una ───────────────────────────
 *
 *  ANTON            La pregunta. Condensada, de caja alta y muy estrecha:
 *                   es la letra de los carteles y de la rotulación de
 *                   mercado. Cabe muchísimo texto sin encoger el cuerpo.
 *
 *  ARCHIVO BLACK    El ahorro y la cifra. ANCHA y pesada — el esqueleto
 *                   opuesto al de Anton. Ese contraste (estrecha arriba,
 *                   ancha abajo) es lo que hace que el anuncio tenga dos
 *                   zonas claras en vez de una papilla uniforme.
 *
 *  INSTRUMENT SERIF El "al año". Una itálica con gracias metida entre dos
 *                   palos secos: es el detalle que no sale de una plantilla
 *                   y el que hace que el conjunto se lea como compuesto por
 *                   alguien. Un solo sitio, y pequeño; si se repite, deja
 *                   de ser un golpe y se vuelve decoración.
 *
 *  SCHIBSTED        La marca y el botón. Es la tipografía de la app, así
 *                   que mantiene el parentesco con el producto.
 *
 * Todas con licencia SIL Open Font License (ver los .txt de esta carpeta):
 * permite uso comercial y publicidad sin pagar ni pedir permiso.
 *
 * ── Detalles de oficio que van dentro ────────────────────────────────────
 *  · Puntuación colgada: el "¿" sale FUERA de la caja de texto para que la
 *    "B" alinee a plomo con todo lo demás. Sin esto, la primera línea
 *    parece metida hacia dentro. Es el detalle que más distingue una
 *    composición cuidada de una automática.
 *  · Interlineado negativo (0.82) en la pregunta: Anton tiene la caja alta
 *    muy larga y con interlineado normal quedan ríos de aire entre líneas.
 *  · El prefijo "+" de la cifra va a menor cuerpo y alineado arriba, como
 *    en una tabla de resultados, no como una letra más.
 */

export const FUENTES = `
  @font-face{font-family:'Anton';src:url('/anuncios/fuentes/anton-latin-400-normal.woff2') format('woff2');font-weight:400;font-display:block}
  @font-face{font-family:'ArchivoB';src:url('/anuncios/fuentes/archivo-latin-900-normal.woff2') format('woff2');font-weight:900;font-display:block}
  @font-face{font-family:'ArchivoB';src:url('/anuncios/fuentes/archivo-latin-800-normal.woff2') format('woff2');font-weight:800;font-display:block}
  @font-face{font-family:'Instr';src:url('/anuncios/fuentes/instrument-serif-latin-400-italic.woff2') format('woff2');font-style:italic;font-weight:400;font-display:block}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-700-normal.woff2') format('woff2');font-weight:700}
  @font-face{font-family:'SG';src:url('/fonts/schibsted-grotesk-500-normal.woff2') format('woff2');font-weight:500}
  @font-face{font-family:'PM';src:url('/fonts/ibm-plex-mono-500-normal.woff2') format('woff2');font-weight:500}
`;

/* El ruido de foto. Va encima de TODO, tipografía incluida: un texto con el
   filo perfectamente limpio sobre una foto con grano canta a montaje. */
export const RUIDO = `(() => {
  const c=document.createElement('canvas');c.width=c.height=180;
  const x=c.getContext('2d');const d=x.createImageData(180,180);
  for(let i=0;i<d.data.length;i+=4){const v=118+(Math.random()*90-45);
    d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255;}
  x.putImageData(d,0,0);
  document.documentElement.style.setProperty('--ruido','url('+c.toDataURL()+')');
})()`;
