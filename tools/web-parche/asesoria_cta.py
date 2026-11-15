"""Cierre de Asesoría: la misma franja oscura de siempre, con el bloque de arriba centrado:
«Tu local puede dar más.» en una línea, «Hablemos.» debajo con el subrayado verde que se pinta al
llegar, la frase de siempre y dos burbujas flotantes (WhatsApp y email) que respiran. El pie
(logo y enlaces a App y Le Petit Comité) no se toca."""
import re
from urllib.parse import quote
from asesoria_extras import WA

MAIL = ('<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5h17v11h-17z M3.8 7l8.2 6.2L20.2 7"/></svg>')
ETQ_WA = {'es': 'WhatsApp', 'ca': 'WhatsApp', 'en': 'WhatsApp'}
ETQ_MAIL = {'es': 'Email', 'ca': 'Correu', 'en': 'Email'}
# Mensaje ya escrito al pulsar (pedido del dueño): el cliente solo tiene que enviarlo
MSG = {'es': 'Hola Marcos, me gustaría hablar de mi local.',
       'ca': "Hola Marcos, m'agradaria parlar del meu local.",
       'en': "Hi Marcos, I'd like to talk about my venue."}
ASUNTO = {'es': 'Quiero hablar de mi local', 'ca': 'Vull parlar del meu local', 'en': "I'd like to talk about my venue"}


def cta(sec, l):
    m = re.search(r'<h2[^>]*>(.*?)<span[^>]*>\.</span></h2>', sec, re.S)
    texto = m.group(1).strip()
    a, b = texto.rsplit('. ', 1)              # «Tu local puede dar más» · «Hablemos»
    h2 = (f'<h2 class="gg-cta-h"><span class="gg-cta-l1 gg-rev">{a}.</span>'
          f'<span class="gg-cta-l2 gg-rev" style="--d:.15s"><span class="gg-cta-hl">{b}</span><span class="gg-cta-pt">.</span></span></h2>')
    sec = sec[:m.start()] + h2 + sec[m.end():]
    sec = re.sub(r'<p style="[^"]*">.*?</p>', '', sec, count=1, flags=re.S)   # fuera la frase: titular y botones
    wa = re.search(r'href="(https://wa\.me/[^"?]*)', sec).group(1) + '?text=' + quote(MSG[l])
    mail = re.search(r'href="(mailto:[^"?]*)', sec).group(1) + '?subject=' + quote(ASUNTO[l]) + '&body=' + quote(MSG[l])
    burbujas = f'''<div class="gg-cta-bur gg-rev" style="--d:.35s">
      <a class="gg-bur gg-bur-1" href="{wa}" target="_blank" rel="noopener">{WA}<span>{ETQ_WA[l]}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
      <a class="gg-bur gg-bur-2" href="{mail}">{MAIL}<span>{ETQ_MAIL[l]}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
    </div>'''
    i = sec.index('<div style="display:flex;gap:28px;')
    j = sec.index('</div>', i) + len('</div>')
    sec = sec[:i] + burbujas + sec[j:]
    sec = sec.replace('<section style="background:#1C1A17;', '<section class="gg-cta gg-anim" style="background:#1C1A17;', 1)
    return sec


CSS = '''
/* ---------- Cierre ---------- */
.gg-cta>.gg-cta-h,.gg-cta>.gg-cta-bur{align-self:center;text-align:center}
.gg-cta-h{margin:clamp(10px,2vw,24px) 0 0;display:flex;flex-direction:column;align-items:center;gap:.12em;font-size:clamp(30px,5vw,58px);font-weight:700;letter-spacing:-.03em;line-height:1.08;color:#FAF8F4}
.gg-cta-l1{white-space:nowrap}
.gg-cta-hl{padding:0 .1em;background:linear-gradient(transparent 62%,#4A5D4E 62%,#4A5D4E 94%,transparent 94%) 0 0/100% 100% no-repeat}
.gg-cta-pt{color:#7E9B84}
/* Botones como los de la página (rectos, 3 px, mono en mayúsculas); el de WhatsApp es el principal */
.gg-cta-bur{display:flex;justify-content:center;flex-wrap:wrap;gap:12px;margin-top:clamp(8px,2vw,18px)}
.gg-bur{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;min-width:190px;padding:0 24px;border-radius:3px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;transition:background .25s,color .25s,border-color .25s,transform .25s,box-shadow .25s}
.gg-bur svg{width:18px;height:18px;flex:none}
.gg-bur-1{background:#FAF8F4;color:#1C1A17;border:1px solid #FAF8F4}
.gg-bur-2{background:transparent;color:#FAF8F4;border:1px solid rgba(250,248,244,.35)}
.gg-bur:hover,.gg-bur:focus-visible{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 16px 30px -16px rgba(0,0,0,.8)}
.gg-bur:hover .gg-flecha{transform:translateX(5px)}
.gg-bur:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
@media (max-width:600px){.gg-cta-h{font-size:5.4vw}.gg-cta-l2{font-size:1.6em}.gg-cta-bur{flex-direction:column;align-items:stretch;width:100%;max-width:340px;box-sizing:border-box}.gg-bur{width:100%;min-width:0;box-sizing:border-box}}
@media (prefers-reduced-motion:no-preference){
  /* Llamada a la acción: un brillo cruza el botón principal cada pocos segundos y la flecha empuja */
  @keyframes gg-brillo{0%,72%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes gg-empuja{0%,80%,100%{transform:none}88%{transform:translateX(5px)}}
  .gg-bur-1::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.28),transparent);animation:gg-brillo 3.6s ease-in-out infinite;pointer-events:none}
  .gg-bur-1 .gg-flecha{animation:gg-empuja 3.6s ease-in-out infinite}
  .gg-bur-1:hover .gg-flecha{animation:none}
  .gg-js .gg-cta-hl{background-size:0% 100%;transition:background-size 1s cubic-bezier(.65,0,.35,1) .55s}
  .gg-js .gg-cta-l2.gg-vis .gg-cta-hl{background-size:100% 100%}
}
'''
