"""Testimonios de Asesoría: el título pasa a etiqueta pequeña («— LO QUE DICEN… —») y las tres
reseñas son tarjetas con comillas grandes en verde, las cifras resaltadas (40 %, 18 %…), un
avatar con iniciales y entrada en cascada. En móvil se deslizan de lado (con la siguiente asomando
y unos puntos que dicen cuál se ve); en tablet y PC, las tres en fila."""
import re

def testimonios(sec, l):
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    items = re.findall(r'<blockquote[^>]*>(.*?)</blockquote>\s*<figcaption[^>]*>\s*<span[^>]*>([^<]+)</span>\s*<span[^>]*>([^<]+)</span>', sec, re.S)
    assert len(items) == 3, len(items)
    figs = ''
    for k, (q, nombre, rol) in enumerate(items):
        q = q.strip().strip('«»“”"')
        # las cifras (40 %, 18 %, del 25 % al 8 %…) se resaltan: es lo que se queda en la cabeza
        q = re.sub(r'(\d+(?:[.,]\d+)?\s?%)', r'<mark class="gg-ts-cifra">\1</mark>', q)
        ini = ''.join(p[0] for p in nombre.split()[:2]).upper()
        figs += f'''<figure class="gg-ts-card gg-rev" style="--d:{k * 0.12:.2f}s">
          <span class="gg-ts-com" aria-hidden="true">“</span>
          <blockquote class="gg-ts-q">{q}</blockquote>
          <figcaption class="gg-ts-pie"><span class="gg-ts-av" aria-hidden="true">{ini}</span><span class="gg-ts-quien"><b>{nombre}</b><small>{rol}</small></span></figcaption>
        </figure>'''
    puntos = ''.join(f'<span class="gg-ts-dot{" on" if k == 0 else ""}"></span>' for k in range(3))
    return f'''<!-- testimonios -->
  <section class="gg-ts gg-anim" style="border-bottom:1px solid #E7E2D9;">
    <span class="gg-met-et gg-rev">{h2}</span>
    <div class="gg-ts-fila">{figs}</div>
    <div class="gg-ts-dots" aria-hidden="true">{puntos}</div>
    <script>
    /* Móvil: el punto activo sigue a la tarjeta que se ve al deslizar */
    (function(){{
      if(window.__ggTs) return; window.__ggTs=1;
      document.addEventListener('scroll',function(ev){{
        var f=ev.target; if(!f.classList||!f.classList.contains('gg-ts-fila')) return;
        var cards=f.querySelectorAll('.gg-ts-card'); if(!cards.length) return;
        var i=Math.round(f.scrollLeft/(cards[0].offsetWidth+14));
        f.parentNode.querySelectorAll('.gg-ts-dot').forEach(function(d,k){{d.classList.toggle('on',k===i)}});
      }},true);
    }})();
    </script>
  </section>

  '''

CSS = '''
/* ---------- Testimonios ---------- */
.gg-ts{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(22px,3vw,34px)}
.gg-ts-fila{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;width:100%;max-width:1080px}
.gg-ts-card{position:relative;margin:0;box-sizing:border-box;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:30px 26px 24px;display:flex;flex-direction:column;gap:18px;overflow:hidden;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s,border-color .35s}
.gg-ts-card::before{content:"";position:absolute;left:0;top:0;height:3px;width:0;background:#4A5D4E;transition:width .6s cubic-bezier(.65,0,.35,1)}
.gg-ts-card:hover{transform:translateY(-4px);border-color:#C9D3CB;box-shadow:0 22px 40px -26px rgba(28,26,23,.45)}
.gg-ts-card:hover::before{width:100%}
.gg-ts-com{position:absolute;right:18px;top:-6px;font-size:96px;line-height:1;font-weight:700;color:#4A5D4E;opacity:.14;pointer-events:none}
.gg-ts-q{margin:0;flex:1;font-size:15.5px;line-height:1.6;color:#1C1A17;text-wrap:pretty}
.gg-ts-cifra{background:linear-gradient(transparent 55%,#C5D6BF 55%,#C5D6BF 92%,transparent 92%);color:inherit;font-weight:700;padding:0 2px;white-space:nowrap}
.gg-ts-pie{display:flex;align-items:center;gap:12px;padding-top:16px;border-top:1px dashed #E7E2D9}
.gg-ts-av{flex:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#4A5D4E;color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.04em}
.gg-ts-quien{display:flex;flex-direction:column;gap:2px;min-width:0}
.gg-ts-quien b{font-size:15px;color:#1C1A17}
.gg-ts-quien small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;color:#716C65}
.gg-ts-dots{display:none}
@media (max-width:720px){
  .gg-ts{padding-left:0;padding-right:0}
  .gg-ts>.gg-met-et{padding:0 20px;text-align:center}
  .gg-ts-fila{box-sizing:border-box;display:flex;gap:14px;overflow-x:auto;scroll-snap-type:x mandatory;padding:6px 20px 14px;scroll-padding:0 20px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .gg-ts-fila::-webkit-scrollbar{display:none}
  .gg-ts-card{flex:0 0 82%;scroll-snap-align:start}
  .gg-ts-dots{display:flex;gap:8px;justify-content:center}
  .gg-ts-dot{width:7px;height:7px;border-radius:50%;background:#D5CFC4;transition:background .25s,width .25s}
  .gg-ts-dot.on{background:#4A5D4E;width:20px;border-radius:4px}
}
'''
