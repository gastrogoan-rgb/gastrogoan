/* Creatividad "EL TICKET" — la más fuerte de la tanda.
 *
 * La idea: facturarle su propio software como si fuera una cuenta de
 * restaurante, impresa en papel térmico. Un hostelero reconoce ese papel
 * antes de leer una sola palabra — lo tiene en las manos cuarenta veces al
 * día. Eso es lo que para el scroll, no una frase sobre fondo oscuro.
 *
 * Por qué esto y no una captura de la app: los 59 anuncios de TPV que
 * corren ahora en España son todos el mismo folleto limpio con un camarero
 * sonriendo. Para cortar ahí no hay que hacerlo más bonito, hay que hacer
 * algo que NO parezca un anuncio.
 *
 * Lo que lo hace creíble (y no "hecho con IA"):
 *  - el papel no está recto, ni centrado, ni limpio;
 *  - la tinta térmica se come letras y se aclara por zonas;
 *  - el borde está rasgado de verdad, no recortado;
 *  - hay grano y una sombra blanda, como una foto de móvil sobre la barra.
 */
export const TICKET_CSS = `
  .escena{width:100%;height:100%;position:relative;overflow:hidden;
    background:
      radial-gradient(120% 90% at 30% 10%, #3A332C 0%, #241F1A 55%, #17130F 100%);
  }
  /* La veta de la barra de madera. Muy sutil: se nota, no se mira. */
  .escena::before{content:'';position:absolute;inset:-10%;opacity:.28;
    background:repeating-linear-gradient(94deg,
      rgba(255,255,255,.035) 0 2px, rgba(0,0,0,.05) 2px 7px,
      rgba(255,255,255,.02) 7px 13px, rgba(0,0,0,.04) 13px 22px);
    transform:rotate(-1.2deg)}
  /* Luz cenital: el papel tiene que parecer iluminado por la lámpara del bar. */
  .escena::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(65% 45% at 50% 34%, rgba(255,241,214,.16), transparent 70%)}

  .papel{position:absolute;left:50%;top:50%;
    width:var(--ancho);
    transform:translate(-50%,-50%) rotate(var(--giro));
    background:linear-gradient(176deg,#FBF9F3 0%,#F4F1E8 42%,#EDE9DE 78%,#F2EEE4 100%);
    /* El hueco de abajo es para el sello: en la primera versión iba encima
       del TOTAL y no se leía ni una cosa ni la otra. */
    padding:var(--tpad) var(--tlado) var(--tbajo);
    font-family:'PM',ui-monospace,monospace;color:#2A2621;
    box-shadow:
      0 2px 3px rgba(0,0,0,.35),
      0 26px 50px rgba(0,0,0,.55),
      0 70px 120px rgba(0,0,0,.42);
    z-index:2}
  /* Borde rasgado: dos triángulos repetidos, arriba y abajo. Un rectángulo
     con las esquinas rectas se lee como "hecho en Canva". */
  .papel::before,.papel::after{content:'';position:absolute;left:-1px;right:-1px;height:16px;
    background:
      linear-gradient(-45deg, transparent 0 9px, #FBF9F3 9px) 0 0/17px 100% repeat-x,
      linear-gradient(45deg, transparent 0 9px, #FBF9F3 9px) 0 0/17px 100% repeat-x}
  .papel::before{top:-15px}
  .papel::after{bottom:-15px;transform:scaleY(-1);background-color:#F2EEE4;
    background-image:
      linear-gradient(-45deg, transparent 0 9px, #F2EEE4 9px),
      linear-gradient(45deg, transparent 0 9px, #F2EEE4 9px);
    background-size:17px 100%;background-repeat:repeat-x}

  .cab{text-align:center;line-height:1.5}
  .cab .neg{font-size:var(--f-cab);font-weight:500;letter-spacing:.16em}
  .cab .peq{font-size:var(--f-peq);color:#6B6358;letter-spacing:.08em;margin-top:4px}
  .raya{border-top:2px dashed #B9B0A2;margin:var(--sep) 0}

  .lin{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
    font-size:var(--f-lin);line-height:1.9;letter-spacing:.01em}
  .lin .q{white-space:nowrap}
  .lin .e{flex:1;border-bottom:1px dotted #C6BCAC;transform:translateY(-.3em)}
  .lin .v{white-space:nowrap;font-weight:500}

  .tot{display:flex;justify-content:space-between;align-items:baseline;
    font-size:var(--f-tot);font-weight:500;letter-spacing:.02em;margin-top:var(--sep)}
  .nota{font-size:var(--f-peq);color:#6B6358;text-align:center;
    line-height:1.6;margin-top:calc(var(--sep)*1.1);letter-spacing:.04em}

  /* El sello: lo único en color, y va torcido y a medio entintar, como los
     sellos de goma de verdad. Es donde queremos que caiga el ojo al final. */
  .sello{position:absolute;right:var(--sello-r);bottom:var(--sello-b);
    transform:rotate(-11deg);
    border:5px solid #9A3B2A;color:#9A3B2A;
    padding:var(--sello-p);text-align:center;opacity:.88;
    mix-blend-mode:multiply;z-index:3}
  .sello .g{font-size:var(--f-sello);font-weight:500;letter-spacing:.06em;line-height:1}
  .sello .p{font-size:var(--f-sellop);letter-spacing:.24em;margin-top:6px}

  /* Tinta térmica gastada: unas bandas casi transparentes por encima. */
  .gastado{position:absolute;inset:0;pointer-events:none;z-index:4;
    background:
      linear-gradient(97deg, rgba(251,249,243,.55) 0 6%, transparent 6% 14%),
      linear-gradient(-93deg, rgba(251,249,243,.4) 0 4%, transparent 4% 11%),
      linear-gradient(180deg, transparent 60%, rgba(251,249,243,.25) 88%)}

  /* Grano de foto por encima de TODO. Es el detalle que más hace: sin grano,
     los degradados se ven digitales y limpios. */
  .grano{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:.16;
    background-image:var(--ruido);background-size:180px 180px}
`;

export const ticketHtml = ({lineas, total, sello, nota, cabecera}) => `
<div class="escena">
  <div class="papel">
    <div class="cab">
      <div class="neg">${cabecera.titulo}</div>
      <div class="peq">${cabecera.sub}</div>
    </div>
    <div class="raya"></div>
    ${lineas.map(l => `<div class="lin"><span class="q">${l[0]}</span><span class="e"></span><span class="v">${l[1]}</span></div>`).join('')}
    <div class="raya"></div>
    <div class="tot"><span>${total[0]}</span><span>${total[1]}</span></div>
    <div class="nota">${nota}</div>
    <div class="gastado"></div>
    <div class="sello"><div class="g">${sello.grande}</div><div class="p">${sello.peque}</div></div>
  </div>
  <div class="grano"></div>
</div>`;
