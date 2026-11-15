"""Le Petit Comité · los tres servicios y «Cómo funciona» (pedido del dueño, 16/11).

Servicios: misma composición (foto y texto alternos), con más juego en el texto: el número grande en
la letra de la marca, una frase corta en cursiva, las variantes en fichas y un «Pedir propuesta» para
ESE servicio (WhatsApp con el mensaje ya escrito). La foto entra con un zoom lento y crece al pasar.

Cómo funciona: los tres pasos se recorren solos, 1 → 2 → 3: la raya avanza de un círculo al
siguiente, el paso activo se enciende y su explicación aparece en grande debajo. Empieza al llegar a
la sección, da la vuelta y se puede tocar cualquier paso (entonces se queda quieto un rato)."""
import re
from urllib.parse import quote

SERV = {
 'es': [('Tú pones la ocasión; nosotros, todo lo demás.', ['Celebraciones privadas', 'Pop-ups', 'Cenas temáticas'], 'un evento gastronómico'),
        ('Cada copa, una historia.', ['Vinos', 'Cervezas', 'Aceites', 'Quesos'], 'una cata o un maridaje'),
        ('Tu cocina, nuestro oficio.', ['Cada semana', 'Cada mes', 'Un día concreto'], 'chef privado')],
 'ca': [("Tu poses l'ocasió; nosaltres, tota la resta.", ['Celebracions privades', 'Pop-ups', 'Sopars temàtics'], 'un esdeveniment gastronòmic'),
        ('Cada copa, una història.', ['Vins', 'Cerveses', 'Olis', 'Formatges'], 'un tast o un maridatge'),
        ('La teva cuina, el nostre ofici.', ['Cada setmana', 'Cada mes', 'Un dia concret'], 'xef privat')],
 'en': [('You bring the occasion; we handle the rest.', ['Private celebrations', 'Pop-ups', 'Themed dinners'], 'a gastronomic event'),
        ('Every glass, a story.', ['Wines', 'Beers', 'Oils', 'Cheeses'], 'a tasting or a pairing'),
        ('Your kitchen, our craft.', ['Every week', 'Every month', 'A single day'], 'a private chef')],
}
PEDIR = {'es': 'Pedir propuesta', 'ca': 'Demanar proposta', 'en': 'Request a proposal'}
MSG = {'es': 'Hola, me gustaría pedir una propuesta para {s} con Le Petit Comité.',
       'ca': "Hola, m'agradaria demanar una proposta per a {s} amb Le Petit Comité.",
       'en': "Hi, I'd like to request a proposal for {s} with Le Petit Comité."}

ICON = [
 '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
 '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 16h5"/>',
 '<path d="M3 17h18M5 17a7 7 0 0 1 14 0"/><path d="M12 10V8M10.5 8h3M2 20h20"/>',
]
COMO = {'es': ('Cómo funciona', 'De la idea a la mesa', 'Paso'),
        'ca': ('Com funciona', 'De la idea a la taula', 'Pas'),
        'en': ('How it works', 'From idea to table', 'Step')}


def servicios(sec, l):
    bloques = list(re.finditer(r'(<div style="padding:clamp\(26px,3\.5vw,44px\);display:flex;flex-direction:column;gap:14px;justify-content:center;[^"]*">)(.*?)(</div>)', sec, re.S))
    assert len(bloques) == 3, len(bloques)
    out = sec
    for k, m in reversed(list(enumerate(bloques))):
        frase, fichas, que = SERV[l][k]
        inner = m.group(2)
        et = re.search(r'<span[^>]*>([^<]+)</span>', inner).group(1)
        h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', inner).group(1)
        p = re.search(r'<p[^>]*>(.*?)</p>', inner, re.S).group(1)
        wa = 'https://wa.me/34622390245?text=' + quote(MSG[l].format(s=que))
        num = et.split()[-1]
        nuevo = (m.group(1).replace('style="', 'class="ev-sv-txt ev-rev" style="', 1) + f'''
        <span class="ev-sv-num" aria-hidden="true">{num}</span>
        <span class="ev-sv-et">{et}</span>
        <h2 class="ev-sv-h">{h2}</h2>
        <p class="ev-sv-frase">{frase}</p>
        <p class="ev-sv-p">{p}</p>
        <div class="ev-sv-fichas">{''.join(f'<span>{f}</span>' for f in fichas)}</div>
        <a class="ev-sv-link" href="{wa}" target="_blank" rel="noopener">{PEDIR[l]}<span class="gg-flecha" aria-hidden="true">→</span></a>
      ''' + m.group(3))
        out = out[:m.start()] + nuevo + out[m.end():]
    out = out.replace('class="lpc-photo"', 'class="lpc-photo ev-sv-foto ev-rev"').replace('class="lpc-alt-img lpc-photo"', 'class="lpc-alt-img lpc-photo ev-sv-foto ev-rev"')
    return out


def como(sec, l):
    tit, sub, paso = COMO[l]
    pasos = re.findall(r'<span[^>]*>(\d\d)</span>\s*<div class="lpc-line"[^>]*></div>\s*<span[^>]*>([^<]+)</span>\s*<p[^>]*>([^<]+)</p>', sec)
    assert len(pasos) == 3, len(pasos)
    # «te sientas a la mesa» → «disfrutas» (como en la cabecera, pedido del dueño)
    pasos[2] = (pasos[2][0], pasos[2][1], pasos[2][2].replace('Tú solo te sientas a la mesa.', 'Tú solo disfrutas.')
                .replace("Tu només t'asseus a taula.", 'Tu només gaudeixes.').replace('You just sit at the table.', 'You just enjoy it.'))
    nodos = ''.join(f'''<button type="button" class="ev-cm-nodo{' on' if k == 0 else ''}" data-k="{k}" aria-label="{paso} {n}: {t}">
          <span class="ev-cm-c"><span class="ev-cm-n">{n}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[k]}</svg></span>
          <span class="ev-cm-t">{t}</span>
        </button>''' for k, (n, t, d) in enumerate(pasos))
    paneles = ''.join(f'''<div class="ev-cm-panel{' on' if k == 0 else ''}" data-k="{k}">
          <span class="ev-cm-pn">{paso} {n}</span>
          <h3>{t}</h3>
          <p>{d}</p>
        </div>''' for k, (n, t, d) in enumerate(pasos))
    return f'''<!-- cómo funciona: los tres pasos se recorren solos -->
  <section class="ev-cm" style="border-bottom:1px solid #E7E2D9;">
    <div class="ev-cm-cab ev-rev">
      <span class="ev-cm-et">{tit}</span>
      <h2 class="ev-cm-h">{sub}</h2>
    </div>
    <div class="ev-cm-pista ev-rev" style="--d:.1s">
      <div class="ev-cm-raya" aria-hidden="true"><span></span></div>
      {nodos}
    </div>
    <div class="ev-cm-paneles ev-rev" style="--d:.2s" aria-live="polite">{paneles}</div>
    <script>
    /* Paso a paso: avanza solo cada pocos segundos mientras la sección está a la vista; tocar un
       paso lo elige y para el avance un rato. Todo se busca en el DOM vivo (la página se monta dos veces). */
    (function(){{
      if(window.__evCm) return; window.__evCm=1;
      var quieto=matchMedia('(prefers-reduced-motion: reduce)').matches, k=0, pausa=0;
      function pon(n){{
        var S=document.querySelector('.ev-cm'); if(!S) return; k=n;
        S.querySelectorAll('.ev-cm-nodo').forEach(function(b,i){{b.classList.toggle('on',i===n);b.classList.toggle('hecho',i<n);b.setAttribute('aria-pressed',i===n)}});
        S.querySelectorAll('.ev-cm-panel').forEach(function(p,i){{p.classList.toggle('on',i===n)}});
        S.querySelector('.ev-cm-raya span').style.transform='scaleX('+(n/2)+')';
      }}
      document.addEventListener('click',function(e){{var b=e.target.closest&&e.target.closest('.ev-cm-nodo'); if(!b) return; pausa=Date.now()+9000; pon(+b.dataset.k)}});
      setInterval(function(){{
        var S=document.querySelector('.ev-cm'); if(!S||quieto||Date.now()<pausa) return;
        var r=S.getBoundingClientRect(); if(r.top>innerHeight*0.6||r.bottom<innerHeight*0.3) return;
        if(!S.dataset.va){{S.dataset.va=1;pon(0);return}}
        pon((k+1)%3);
      }},2800);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- Revelado al bajar (toda la página) ---------- */
@media (prefers-reduced-motion:no-preference){
  .ev-js .ev-rev{opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform .8s cubic-bezier(.2,.7,.2,1) var(--d,0s)}
  .ev-js .ev-rev.ev-vis{opacity:1;transform:none}
}
/* ---------- Servicios ---------- */
.ev-sv-txt{position:relative;overflow:hidden}
.ev-sv-num{position:absolute;right:clamp(14px,3vw,36px);top:clamp(6px,1.5vw,18px);font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:clamp(96px,12vw,170px);line-height:1;color:#4A5D4E;opacity:.09;pointer-events:none}
.ev-sv-et{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
.ev-sv-h{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(32px,3.8vw,46px);font-weight:600;letter-spacing:-.01em;line-height:1.05;color:#1C1A17}
.ev-sv-frase{margin:-4px 0 0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(19px,2vw,23px);color:#4A5D4E}
.ev-sv-p{margin:0;font-size:15px;line-height:1.65;color:#3D3A34;max-width:480px;text-wrap:pretty}
.ev-sv-fichas{display:flex;flex-wrap:wrap;gap:8px}
.ev-sv-fichas span{padding:6px 12px;border:1px solid #D5CFC4;border-radius:999px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#3D3A34;background:#fff}
.ev-sv-link{align-self:flex-start;display:inline-flex;align-items:center;gap:10px;min-height:44px;padding:0 2px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#1C1A17;text-decoration:none;background:linear-gradient(#4A5D4E,#4A5D4E) 0 calc(100% - 10px)/100% 1.5px no-repeat;transition:color .25s,background-size .35s}
.ev-sv-link:hover,.ev-sv-link:focus-visible{color:#4A5D4E}
.ev-sv-link:hover .gg-flecha{transform:translateX(5px)}
.ev-sv-link .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ev-sv-link:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.ev-sv-foto>*{display:block;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.ev-sv-foto:hover>*{transform:scale(1.05)}
@media (prefers-reduced-motion:no-preference){
  .ev-js .ev-sv-foto.ev-rev{opacity:1;transform:none;clip-path:inset(0 0 100% 0);transition:clip-path 1.1s cubic-bezier(.65,0,.35,1)}
  .ev-js .ev-sv-foto.ev-rev.ev-vis{clip-path:inset(0 0 0 0)}
  .ev-js .ev-sv-foto.ev-rev>*{transform:scale(1.15)}
  .ev-js .ev-sv-foto.ev-rev.ev-vis>*{transform:scale(1)}
  .ev-js .ev-sv-foto.ev-rev.ev-vis:hover>*{transform:scale(1.05)}
}
/* ---------- Cómo funciona ---------- */
.ev-cm{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(26px,3.4vw,40px)}
.ev-cm-cab{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.ev-cm-et{display:inline-flex;align-items:center;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
.ev-cm-et::before,.ev-cm-et::after{content:"";width:28px;height:2px;background:#4A5D4E}
.ev-cm-h{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:clamp(36px,4.6vw,58px);line-height:1.05;color:#1C1A17}
.ev-cm-pista{position:relative;width:100%;max-width:860px;display:grid;grid-template-columns:repeat(3,1fr)}
.ev-cm-raya{position:absolute;left:16.66%;right:16.66%;top:38px;height:2px;background:#E7E2D9}
.ev-cm-raya span{position:absolute;inset:0;background:#4A5D4E;transform-origin:left;transform:scaleX(0);transition:transform .9s cubic-bezier(.65,0,.35,1)}
.ev-cm-nodo{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 6px;border:0;background:none;cursor:pointer;font:inherit;color:inherit}
.ev-cm-c{position:relative;width:78px;height:78px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;border:1.5px solid #D5CFC4;color:#716C65;transition:background .45s,border-color .45s,color .45s,transform .45s cubic-bezier(.2,.9,.25,1.3),box-shadow .45s}
.ev-cm-n{position:absolute;top:-10px;right:-6px;min-width:26px;height:26px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #D5CFC4;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#3D3A34;transition:background .45s,color .45s,border-color .45s}
.ev-cm-c svg{width:30px;height:30px}
.ev-cm-t{font-size:clamp(13px,1.5vw,16px);font-weight:700;line-height:1.3;color:#716C65;text-align:center;max-width:200px;transition:color .45s}
.ev-cm-nodo.hecho .ev-cm-c{border-color:#4A5D4E;color:#4A5D4E}
.ev-cm-nodo.on .ev-cm-c{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:scale(1.12);box-shadow:0 0 0 8px rgba(74,93,78,.12)}
.ev-cm-nodo.on .ev-cm-n,.ev-cm-nodo.hecho .ev-cm-n{background:#1C1A17;border-color:#1C1A17;color:#FAF8F4}
.ev-cm-nodo.on .ev-cm-t,.ev-cm-nodo.hecho .ev-cm-t{color:#1C1A17}
.ev-cm-nodo:hover .ev-cm-c{border-color:#4A5D4E}
.ev-cm-nodo:focus-visible{outline:none}
.ev-cm-nodo:focus-visible .ev-cm-c{outline:2px solid #4A5D4E;outline-offset:4px}
.ev-cm-paneles{display:grid;width:100%;max-width:680px}
.ev-cm-panel{grid-area:1/1;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:clamp(22px,3vw,32px) clamp(18px,3vw,36px);background:#fff;border:1px solid #E7E2D9;border-radius:3px;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .5s,transform .5s cubic-bezier(.2,.7,.2,1),visibility 0s .5s}
.ev-cm-panel.on{opacity:1;visibility:visible;transform:none;transition:opacity .5s .1s,transform .5s cubic-bezier(.2,.7,.2,1) .1s,visibility 0s}
.ev-cm-pn{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.ev-cm-panel h3{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:clamp(26px,3vw,34px);line-height:1.1;color:#1C1A17}
.ev-cm-panel p{margin:0;font-size:16px;line-height:1.6;color:#3D3A34;text-wrap:pretty}
@media (max-width:480px){.ev-cm-c{width:62px;height:62px}.ev-cm-c svg{width:24px;height:24px}.ev-cm-raya{top:31px}}
@media (prefers-reduced-motion:reduce){.ev-cm *{transition:none!important}}
'''

JS = '''<script>
/* Revelado al bajar de Le Petit Comité: se busca lo vivo en cada vuelta (la página se monta dos veces). */
(function(){
  if(window.__evRev) return; window.__evRev=1;
  function pinta(todo){ document.documentElement.classList.add('ev-js');
    document.querySelectorAll('.ev-rev:not(.ev-vis)').forEach(function(e){ if(todo||e.getBoundingClientRect().top<innerHeight*0.88) e.classList.add('ev-vis') }); }
  addEventListener('scroll',function(){requestAnimationFrame(function(){pinta()})},{passive:true});
  var n=0, iv=setInterval(function(){ requestAnimationFrame(function(){pinta()}); if(++n>40) clearInterval(iv) },150);
  setTimeout(function(){pinta(1)},15000);
})();
</script>'''
