"""«Lo que nos diferencia» como manifiesto: las ocho frases en grande, centradas y en gris; al ir
bajando, cada una se «enciende» (pasa a tinta y se le pinta el resaltado verde de rotulador, el
mismo de la cita de «Sobre mí»). Sin JavaScript o con «reducir movimiento» se ven todas encendidas."""
import re

ET = {'es': 'Manifiesto', 'ca': 'Manifest', 'en': 'Manifesto'}


def dif(sec, l):
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    frases = re.findall(r'<li[^>]*>.*?<span>(.*?)</span></li>', sec, re.S)
    assert len(frases) == 8, len(frases)
    lis = ''.join(f'<li class="gg-mf-l"><span class="gg-mf-n">{k + 1:02d}</span><span class="gg-mf-t">{t}</span></li>' for k, t in enumerate(frases))
    return f'''<!-- lo que nos diferencia -->
  <section class="gg-mf gg-anim" style="border-bottom:1px solid #E7E2D9;">
    <header class="gg-carta-cab">
      <span class="gg-met-et gg-rev">{ET[l]}</span>
      <h2 class="gg-carta-h gg-rev" style="--d:.08s">{h2}</h2>
    </header>
    <ol class="gg-mf-lista">{lis}</ol>
    <script>
    /* Cada frase se enciende al cruzar el 70 % de la pantalla y se queda encendida.
       Delegación por consulta en cada fotograma: la página se monta dos veces. */
    (function(){{
      if(window.__ggMf) return; window.__ggMf=1;
      var quieto=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      function trocea(L){{
        // cada palabra en su caja, para que entren una detrás de otra
        L.querySelectorAll('.gg-mf-t:not([data-w])').forEach(function(t){{
          t.setAttribute('data-w','1');
          t.innerHTML=t.textContent.trim().split(/\s+/).map(function(w,i){{return '<span class="gg-w" style="--i:'+i+'">'+w.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</span>'}}).join(' ');
        }});
      }}
      function pinta(){{
        var L=document.querySelector('.gg-mf-lista'); if(!L) return;
        if(quieto) return;
        if(!L.classList.contains('gg-mf-js')){{trocea(L);L.classList.add('gg-mf-js')}}
        var vh=innerHeight, lim=vh*0.78, centro=vh*0.5, mejor=null, dist=1e9;
        L.querySelectorAll('.gg-mf-l').forEach(function(li){{
          var r=li.getBoundingClientRect(), m=r.top+r.height/2;
          if(m<lim) li.classList.add('on');
          var d=Math.abs(m-centro); if(li.classList.contains('on')&&d<dist){{dist=d;mejor=li}}
        }});
        // la frase más cercana al centro es la «actual»: tinta, resaltado y un punto más grande
        L.querySelectorAll('.gg-mf-l').forEach(function(li){{li.classList.toggle('actual',li===mejor)}});
      }}
      var pend=false; addEventListener('scroll',function(){{if(!pend){{pend=true;requestAnimationFrame(function(){{pend=false;pinta()}})}}}},{{passive:true}});
      var n=0, iv=setInterval(function(){{pinta(); if(++n>40) clearInterval(iv)}},250);
      // red de seguridad: si no hay scroll, a los 15 s se encienden todas
      setTimeout(function(){{var L=document.querySelector('.gg-mf-lista'); if(L) L.querySelectorAll('.gg-mf-l').forEach(function(li){{li.classList.add('on')}})}},15000);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- Manifiesto: lo que nos diferencia ---------- */
.gg-mf{padding:clamp(56px,7vw,96px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(28px,4vw,48px);text-align:center}
.gg-mf-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:clamp(14px,2vw,22px);max-width:900px}
.gg-mf-l{display:flex;flex-direction:column;align-items:center;gap:2px}
.gg-mf-n{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.1em;color:#4A5D4E}
.gg-mf-t{font-size:clamp(21px,3vw,36px);line-height:1.25;font-weight:700;letter-spacing:-.025em;color:#1C1A17;text-wrap:balance;
  padding:0 .12em;-webkit-box-decoration-break:clone;box-decoration-break:clone;
  background:linear-gradient(transparent 58%,#C5D6BF 58%,#C5D6BF 92%,transparent 92%) 0 0/100% 100% no-repeat}
/* Con JS (y sin «reducir movimiento»): las palabras salen de un desenfoque una a una; la frase del
   centro de la pantalla manda (tinta, resaltado, un 4 % más grande) y las ya leídas quedan en gris,
   como un teleprompter. Sin JS o con «reducir movimiento» se ven todas en tinta y resaltadas. */
.gg-mf-js .gg-mf-l{transition:transform .6s cubic-bezier(.2,.7,.2,1);transform-origin:center}
.gg-mf-js .gg-mf-t{color:#A8A196;background-size:0% 100%;transition:color .5s ease,background-size .9s cubic-bezier(.65,0,.35,1) .25s}
.gg-mf-js .gg-mf-n{color:#C9C2B6;transition:color .5s ease}
.gg-mf-js .gg-w{display:inline-block;opacity:0;filter:blur(8px);transform:translateY(.45em);transition:opacity .55s ease calc(var(--i)*55ms),filter .55s ease calc(var(--i)*55ms),transform .6s cubic-bezier(.2,.7,.2,1) calc(var(--i)*55ms)}
.gg-mf-js .gg-mf-l.on .gg-w{opacity:1;filter:none;transform:none}
.gg-mf-js .gg-mf-l.actual{transform:scale(1.04)}
.gg-mf-js .gg-mf-l.actual .gg-mf-t{color:#1C1A17;background-size:100% 100%}
.gg-mf-js .gg-mf-l.actual .gg-mf-n{color:#4A5D4E}
'''
