/* Creatividad "EL PLATO".
 *
 * Un plato visto desde arriba, con taza y cubiertos: los tres códigos que
 * dicen "esto va contigo" a un dueño de bar, de restaurante Y de cafetería
 * sin tener que explicarlo. En la primera tanda no quedaba claro a quién le
 * hablábamos; aquí se ve en la primera décima de segundo.
 *
 * Por qué el plato va VACÍO, con solo un ticket emplatado en el centro:
 * dibujar comida en CSS sale a caricatura, y una caricatura es exactamente
 * el acabado "hecho con IA" que estamos evitando. Un plato blanco, en
 * cambio, es porcelana: un par de degradados bien puestos y un brillo, y
 * parece fotografiado. Y el chiste se cuenta solo — lo que le sirven cada
 * año no es comida, es la factura.
 *
 * Trucos que lo hacen creíble: el plato es una elipse (no un círculo
 * perfecto: eso es una vista cenital imposible), la luz entra por una sola
 * esquina, la sombra es blanda y desplazada, y nada está centrado del todo.
 */
export const PLATO_CSS = `
  .escena{width:100%;height:100%;position:relative;overflow:hidden;
    background:radial-gradient(120% 85% at 26% 8%, #4A3F33 0%, #2E261E 52%, #191410 100%)}
  /* Veta de la mesa de madera. */
  .escena::before{content:'';position:absolute;inset:-12%;opacity:.3;
    background:repeating-linear-gradient(91deg,
      rgba(255,255,255,.04) 0 3px, rgba(0,0,0,.06) 3px 9px,
      rgba(255,255,255,.02) 9px 17px, rgba(0,0,0,.05) 17px 29px);
    transform:rotate(-.8deg)}
  /* Luz de lámpara, arriba a la izquierda. */
  .escena::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(58% 40% at 34% 22%, rgba(255,236,200,.2), transparent 72%)}

  .ojo{position:absolute;top:var(--pl-ojo);left:0;right:0;z-index:6;text-align:center;
    font-family:'PM',monospace;font-size:var(--pl-fojo);letter-spacing:.26em;
    color:#C8BCA6}
  .ojo b{color:#9DBBA4;font-weight:500}

  .mesa{position:absolute;left:50%;top:var(--pl-top);transform:translateX(-50%);
    width:var(--pl-plato);height:calc(var(--pl-plato)*.97);z-index:3}

  /* Cubiertos: dos formas alargadas con degradado de acero. Muy sencillas a
     propósito — un cubierto detallado dibujado a mano canta más que uno
     insinuado. Van medio fuera del plato, como se dejan de verdad. */
  .cub{position:absolute;top:14%;height:74%;width:var(--pl-cub);z-index:2;
    background:linear-gradient(100deg,#6E7479,#C9CED2 38%,#8C9297 62%,#5C6165);
    box-shadow:0 14px 28px rgba(0,0,0,.55)}
  .cub.izq{left:calc(var(--pl-cub)*-2.1);transform:rotate(-3deg);border-radius:40% 40% 12% 12%}
  /* Las púas del tenedor: tres cortes finos arriba. Sin esto, el tenedor y
     el cuchillo son la misma mancha alargada y no se lee el cubierto. */
  .cub.izq::after{content:'';position:absolute;left:16%;right:16%;top:2%;height:26%;
    background:
      linear-gradient(#0000,#0000) ,
      repeating-linear-gradient(90deg, transparent 0 26%, rgba(25,20,16,.85) 26% 37%);
    border-radius:40% 40% 0 0}
  .cub.der{right:calc(var(--pl-cub)*-2.1);transform:rotate(2.4deg);border-radius:46% 46% 10% 10%}

  .plato{position:absolute;inset:0;border-radius:50%;
    background:
      radial-gradient(circle at 36% 26%, #FFFFFF 0%, #F6F3ED 36%, #E6E1D6 72%, #D2CCBE 100%);
    box-shadow:
      0 3px 6px rgba(0,0,0,.3),
      0 34px 62px rgba(0,0,0,.6),
      0 90px 130px rgba(0,0,0,.45),
      inset 0 -6px 18px rgba(0,0,0,.14)}
  /* El vuelo del plato: el escalón entre el borde y el fondo. Es lo que lo
     convierte en porcelana y no en un círculo gris. */
  .plato::before{content:'';position:absolute;inset:15%;border-radius:50%;
    background:radial-gradient(circle at 40% 30%, #FBF9F4, #EFEBE2 60%, #E2DCD0);
    box-shadow:inset 0 3px 10px rgba(0,0,0,.16), 0 -1px 0 rgba(255,255,255,.9)}
  /* Brillo especular: una sola mancha, arriba a la izquierda. */
  .plato::after{content:'';position:absolute;inset:0;border-radius:50%;
    background:radial-gradient(34% 22% at 30% 17%, rgba(255,255,255,.85), transparent 70%)}

  /* El ticket emplatado, pequeño y torcido, como un bocado de menú de autor. */
  .servido{position:absolute;left:50%;top:50%;z-index:5;
    width:var(--pl-tick);transform:translate(-50%,-50%) rotate(-4.5deg);
    background:linear-gradient(176deg,#FDFBF5,#F2EFE5 70%,#E9E5D9);
    padding:var(--pl-tpad);font-family:'PM',monospace;color:#2A2621;text-align:center;
    box-shadow:0 2px 3px rgba(0,0,0,.22), 0 16px 30px rgba(0,0,0,.3)}
  .servido::before,.servido::after{content:'';position:absolute;left:-1px;right:-1px;height:10px;
    background:
      linear-gradient(-45deg,transparent 0 6px,#FDFBF5 6px) 0 0/11px 100% repeat-x,
      linear-gradient(45deg,transparent 0 6px,#FDFBF5 6px) 0 0/11px 100% repeat-x}
  .servido::before{top:-9px}
  .servido::after{bottom:-9px;transform:scaleY(-1);
    background-image:
      linear-gradient(-45deg,transparent 0 6px,#E9E5D9 6px),
      linear-gradient(45deg,transparent 0 6px,#E9E5D9 6px);
    background-size:11px 100%;background-repeat:repeat-x}
  .servido .t1{font-size:var(--pl-ft1);letter-spacing:.16em;color:#6B6358}
  .servido .t2{font-family:'SG',sans-serif;font-weight:700;font-size:var(--pl-ft2);
    letter-spacing:-.03em;line-height:.96;margin:var(--pl-tgap) 0;color:#1C1A17}
  .servido .t3{font-size:var(--pl-ft3);letter-spacing:.06em;color:#8A4A3B}

  /* La taza: el guiño a las cafeterías. Va medio salida por la esquina,
     como en una foto de verdad. */
  .taza{position:absolute;right:var(--pl-taza-r);bottom:var(--pl-taza-b);
    width:var(--pl-taza);height:var(--pl-taza);z-index:4}
  .plato2{position:absolute;inset:0;border-radius:50%;
    background:radial-gradient(circle at 38% 28%, #FBF9F4, #E7E2D7 70%, #D0CABC);
    box-shadow:0 20px 40px rgba(0,0,0,.55)}
  .taza2{position:absolute;inset:19%;border-radius:50%;
    background:radial-gradient(circle at 36% 26%, #FFFFFF, #EDE9E0 62%, #DAD4C7);
    box-shadow:inset 0 4px 12px rgba(0,0,0,.2)}
  .cafe{position:absolute;inset:31%;border-radius:50%;
    background:radial-gradient(circle at 38% 30%, #6B4A2E, #3A2617 70%, #241609);
    box-shadow:inset 0 3px 10px rgba(0,0,0,.6)}
  .cafe::after{content:'';position:absolute;inset:0;border-radius:50%;
    background:radial-gradient(26% 18% at 34% 24%, rgba(255,228,190,.4), transparent 70%)}

  .pie3{position:absolute;left:0;right:0;bottom:var(--pl-pie);z-index:6;text-align:center}
  .pie3 .g{font-size:var(--pl-fpie);font-weight:700;letter-spacing:-.03em;color:#FBF9F4;
    line-height:1.06;text-shadow:0 3px 20px rgba(0,0,0,.8)}
  .pie3 .g em{font-style:normal;color:#9DBBA4}
  .pie3 .m{margin-top:var(--pl-tgap);font-size:var(--pl-fmarca);font-weight:700;
    letter-spacing:-.02em;color:#FBF9F4;text-shadow:0 2px 14px rgba(0,0,0,.8)}
  .pie3 .m span{color:#9DBBA4}
`;

export const PLATO_HTML = `
<div class="escena">
  <div class="ojo">PARA <b>BARES</b> · <b>RESTAURANTES</b> · <b>CAFETERÍAS</b></div>
  <div class="mesa">
    <span class="cub izq"></span><span class="cub der"></span>
    <div class="plato"></div>
    <div class="servido">
      <div class="t1">CADA AÑO TE SIRVEN</div>
      <div class="t2">3.600 €<br>en programas</div>
      <div class="t3">Y SIGUES SIN SABER TU FOOD COST</div>
    </div>
  </div>
  <div class="taza">
    <div class="plato2"></div><div class="taza2"></div><div class="cafe"></div>
  </div>
  <div class="pie3">
    <div class="g">Todo tu negocio.<br><em>100 € al año.</em></div>
    <div class="m">Gastro<span>Goan</span></div>
  </div>
</div>`;
