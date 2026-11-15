"""Cierre de Asesoría: la misma franja oscura de siempre, con el bloque de arriba centrado:
«Tu local puede dar más.» en una línea, «Hablemos.» debajo con el subrayado verde que se pinta al
llegar, la frase de siempre y dos burbujas flotantes (WhatsApp y email) que respiran. El pie
(logo y enlaces a App y Le Petit Comité) no se toca."""
import re
from asesoria_extras import WA

MAIL = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5h17v11h-17z M3.8 7l8.2 6.2L20.2 7"/></svg>')
ETQ_WA = {'es': 'WhatsApp', 'ca': 'WhatsApp', 'en': 'WhatsApp'}
ETQ_MAIL = {'es': 'Email', 'ca': 'Correu', 'en': 'Email'}


def cta(sec, l):
    m = re.search(r'<h2[^>]*>(.*?)<span[^>]*>\.</span></h2>', sec, re.S)
    texto = m.group(1).strip()
    a, b = texto.rsplit('. ', 1)              # «Tu local puede dar más» · «Hablemos»
    h2 = (f'<h2 class="gg-cta-h"><span class="gg-cta-l1 gg-rev">{a}.</span>'
          f'<span class="gg-cta-l2 gg-rev" style="--d:.15s"><span class="gg-cta-hl">{b}</span><span class="gg-cta-pt">.</span></span></h2>')
    sec = sec[:m.start()] + h2 + sec[m.end():]
    sec = re.sub(r'(<p style=")', r'<p class="gg-cta-p gg-rev" style="--d:.3s;', sec, count=1)
    wa = re.search(r'href="(https://wa\.me/[^"]*)"', sec).group(1)
    mail = re.search(r'href="(mailto:[^"]*)"', sec).group(1)
    burbujas = f'''<div class="gg-cta-bur gg-rev" style="--d:.45s">
      <a class="gg-bur" href="{wa}" target="_blank" rel="noopener" aria-label="{ETQ_WA[l]}"><span class="gg-bur-c">{WA}</span><span class="gg-bur-t">{ETQ_WA[l]}</span></a>
      <a class="gg-bur gg-bur-2" href="{mail}" aria-label="{ETQ_MAIL[l]}"><span class="gg-bur-c">{MAIL}</span><span class="gg-bur-t">{ETQ_MAIL[l]}</span></a>
    </div>'''
    i = sec.index('<div style="display:flex;gap:28px;')
    j = sec.index('</div>', i) + len('</div>')
    sec = sec[:i] + burbujas + sec[j:]
    sec = sec.replace('<section style="background:#1C1A17;', '<section class="gg-cta gg-anim" style="background:#1C1A17;', 1)
    return sec


CSS = '''
/* ---------- Cierre ---------- */
.gg-cta>.gg-cta-h,.gg-cta>.gg-cta-p,.gg-cta>.gg-cta-bur{align-self:center;text-align:center}
.gg-cta-h{margin:clamp(10px,2vw,24px) 0 0;display:flex;flex-direction:column;align-items:center;gap:.12em;font-size:clamp(30px,5vw,58px);font-weight:700;letter-spacing:-.03em;line-height:1.08;color:#FAF8F4}
.gg-cta-l1{white-space:nowrap}
.gg-cta-hl{padding:0 .1em;background:linear-gradient(transparent 62%,#4A5D4E 62%,#4A5D4E 94%,transparent 94%) 0 0/100% 100% no-repeat}
.gg-cta-pt{color:#7E9B84}
.gg-cta-p{max-width:520px}
.gg-cta-bur{display:flex;justify-content:center;gap:clamp(28px,5vw,48px);margin-top:10px}
.gg-bur{display:flex;flex-direction:column;align-items:center;gap:10px;color:#FAF8F4;text-decoration:none}
.gg-bur-c{position:relative;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;color:#1C1A17;box-shadow:0 14px 28px -14px rgba(0,0,0,.7);transition:background .25s,color .25s,transform .3s cubic-bezier(.2,.9,.25,1.3)}
.gg-bur-c svg{width:28px;height:28px}
.gg-bur-c::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:1.5px solid rgba(126,155,132,.6);opacity:0}
.gg-bur-t{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#C9C2B6;transition:color .25s}
.gg-bur:hover .gg-bur-c,.gg-bur:focus-visible .gg-bur-c{background:#4A5D4E;color:#FAF8F4;transform:scale(1.1)}
.gg-bur:hover .gg-bur-t{color:#FAF8F4}
.gg-bur:focus-visible{outline:none}
.gg-bur:focus-visible .gg-bur-c{outline:2px solid #7E9B84;outline-offset:4px}
/* En móvil la primera frase se encoge para caber en UNA línea y «Hablemos» crece: queda de titular */
@media (max-width:600px){.gg-cta-h{font-size:5.4vw}.gg-cta-l2{font-size:1.6em}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-bur-flota{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes gg-bur-onda{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.45)}}
  .gg-bur{animation:gg-bur-flota 3.4s ease-in-out infinite}
  .gg-bur-2{animation-delay:-1.7s}
  .gg-bur-c::after{animation:gg-bur-onda 2.4s ease-out infinite}
  .gg-bur-2 .gg-bur-c::after{animation-delay:1.2s}
  .gg-js .gg-cta-hl{background-size:0% 100%;transition:background-size 1s cubic-bezier(.65,0,.35,1) .55s}
  .gg-js .gg-cta-l2.gg-vis .gg-cta-hl{background-size:100% 100%}
}
'''
