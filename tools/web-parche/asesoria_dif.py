"""«Lo que nos diferencia» como una hoja que se escribe a máquina: al llegar, las ocho frases se
teclean una detrás de otra, letra a letra, con un cursor verde que parpadea; al terminar cada una
aparece su tick. Letra fina (IBM Plex Mono, la de la marca) y todo dentro de una hoja blanca, para
que quede integrado. Sin JavaScript o con «reducir movimiento» se ven todas escritas.
⚠️ Para que la hoja no «salte» mientras se escribe, cada frase lleva una copia invisible que reserva
su sitio (.gg-tw-fant) y el texto tecleado se pinta encima, en la misma celda."""
import re


def dif(sec, l):
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    frases = re.findall(r'<li[^>]*>.*?<span>(.*?)</span></li>', sec, re.S)
    assert len(frases) == 8, len(frases)
    lis = ''.join(
        f'<li class="gg-mf-l" aria-label="{t}"><span class="gg-mf-n">{k + 1:02d}</span>'
        f'<span class="gg-mf-t" aria-hidden="true"><span class="gg-tw-fant">{t}</span><span class="gg-tw">{t}</span></span>'
        f'<span class="gg-mf-ok" aria-hidden="true"></span></li>' for k, t in enumerate(frases))
    return f'''<!-- lo que nos diferencia -->
  <section class="gg-mf gg-anim" style="border-bottom:1px solid #E7E2D9;">
    <span class="gg-met-et gg-rev">{h2}</span>
    <ol class="gg-mf-lista gg-rev" style="--d:.1s">{lis}</ol>
    <script>
    /* Máquina de escribir: arranca cuando la hoja entra en pantalla. Se busca lo vivo en cada paso
       (la página se monta dos veces) y la hoja marcada con data-tw no vuelve a empezar. */
    (function(){{
      if(window.__ggMf) return; window.__ggMf=1;
      /* El estado (frase y letra) vive aquí, no en los elementos: si la página se vuelve a montar a
         mitad, se sigue en la hoja nueva donde iba. Antes se paraba y dejaba la hoja en blanco. */
      var quieto=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      var ini=false, fin=false, k=0, n=0;
      function hoja(){{
        var L=document.querySelector('.gg-mf-lista'); if(!L) return null;
        if(!L.dataset.tw){{
          L.dataset.tw='1'; L.classList.add('gg-tw-js');
          [].forEach.call(L.querySelectorAll('.gg-mf-l'),function(li,i){{
            var t=li.querySelector('.gg-tw'); t.dataset.full=t.textContent;
            if(i<k){{li.classList.add('hecha')}} else t.textContent=(i===k?t.dataset.full.slice(0,n):'');
          }});
          if(fin) L.classList.add('fin');
        }}
        return L;
      }}
      function paso(){{
        var L=hoja(); if(!L) return setTimeout(paso,200);
        var lis=L.querySelectorAll('.gg-mf-l');
        if(k>=lis.length){{fin=true;L.classList.add('fin');return}}
        var li=lis[k], t=li.querySelector('.gg-tw'), full=t.dataset.full;
        li.classList.add('escribiendo'); n=Math.min(full.length,n+1); t.textContent=full.slice(0,n);
        if(n<full.length) setTimeout(paso,10+Math.random()*16);
        else {{li.classList.remove('escribiendo');li.classList.add('hecha');k++;n=0;setTimeout(paso,110)}}
      }}
      function mira(){{
        if(ini) {{ if(!fin) hoja(); return }}
        var L=document.querySelector('.gg-mf-lista'); if(!L) return;
        if(quieto) return;
        if(L.getBoundingClientRect().top<innerHeight*0.85){{ini=true;hoja();paso()}}
      }}
      addEventListener('scroll',mira,{{passive:true}});
      setInterval(mira,250);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- Lo que nos diferencia: hoja escrita a máquina ---------- */
.gg-mf{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(20px,3vw,30px)}
.gg-mf-lista{box-sizing:border-box;list-style:none;margin:0;width:100%;max-width:760px;padding:clamp(10px,2vw,18px) clamp(18px,3.4vw,40px);background:#fff;border:1px solid #E7E2D9;border-radius:3px;box-shadow:0 22px 44px -36px rgba(28,26,23,.45)}
.gg-mf-l{display:grid;grid-template-columns:30px minmax(0,1fr) 18px;align-items:baseline;gap:12px;padding:13px 0;border-bottom:1px dashed #E7E2D9}
.gg-mf-l:last-child{border-bottom:0}
.gg-mf-n{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.06em;color:#4A5D4E;font-weight:600}
.gg-mf-t{display:grid;font-family:'IBM Plex Mono',monospace;font-size:clamp(14px,1.1rem,16px);line-height:1.5;color:#1C1A17}
.gg-mf-t>span{grid-area:1/1}
.gg-tw-fant{visibility:hidden}
.gg-mf-ok{width:14px;height:8px;border-left:2px solid #4A5D4E;border-bottom:2px solid #4A5D4E;transform:rotate(-45deg) translateY(-3px);align-self:center}
/* Con JS: cursor verde que parpadea en la frase que se escribe; el tick aparece al terminarla */
.gg-tw-js .gg-mf-ok{opacity:0;transform:rotate(-45deg) translateY(-3px) scale(.4);transition:opacity .3s,transform .35s cubic-bezier(.2,.9,.25,1.3)}
.gg-tw-js .gg-mf-l.hecha .gg-mf-ok{opacity:1;transform:rotate(-45deg) translateY(-3px)}
.gg-tw-js .gg-mf-n{color:#C9C2B6;transition:color .3s}
.gg-tw-js .gg-mf-l.escribiendo .gg-mf-n,.gg-tw-js .gg-mf-l.hecha .gg-mf-n{color:#4A5D4E}
.gg-tw-js .gg-mf-l.escribiendo .gg-tw::after{content:"";display:inline-block;width:.55em;height:1.05em;margin-left:2px;vertical-align:-.15em;background:#4A5D4E;animation:gg-cursor .8s steps(1) infinite}
@keyframes gg-cursor{50%{opacity:0}}
'''
