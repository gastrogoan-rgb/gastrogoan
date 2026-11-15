"""«Extras que suman» como la carta de un restaurante: cada extra es una línea con su nombre,
puntos guía hasta su número (como el precio de un plato), la descripción y un botón para
pedirlo por WhatsApp. Sin fotos (decisión del dueño, 16/11). Las líneas entran una a una y
los puntos se «dibujan» al aparecer."""
import re

SUB = {'es': 'A la carta', 'ca': 'A la carta', 'en': 'À la carte'}
NOTA = {'es': 'Te respondo yo, por WhatsApp', 'ca': 'Et responc jo, per WhatsApp', 'en': "I'll reply myself, on WhatsApp"}
WA = ('<svg class="gg-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>')


def extras(sec, l):
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    items = re.findall(r'<h3[^>]*>([^<]+)</h3>\s*<p[^>]*>(.*?)</p>\s*<a href="([^"]+)"[^>]*>([^<]+)</a>', sec, re.S)
    assert len(items) == 8, len(items)
    lis = ''
    for k, (ti, tx, href, ln) in enumerate(items):
        ln = ln.replace('→', '').strip()
        lis += f'''<li class="gg-plato gg-rev" style="--d:{(k % 4) * 0.08:.2f}s">
          <div class="gg-plato-fila"><h3 class="gg-plato-n">{ti}</h3><span class="gg-puntos" aria-hidden="true"></span><span class="gg-plato-num">{k + 1:02d}</span></div>
          <p class="gg-plato-d">{tx}</p>
          <div class="gg-plato-pie">
            <a class="gg-plato-btn" href="{href}" target="_blank" rel="noopener">{WA}<span>{ln}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
          </div>
        </li>'''
    return f'''<!-- extras -->
  <section class="gg-carta gg-anim" style="border-bottom:1px solid #E7E2D9;">
    <header class="gg-carta-cab">
      <span class="gg-met-et gg-rev">{SUB[l]}</span>
      <h2 class="gg-carta-h gg-rev" style="--d:.08s">{h2}</h2>
    </header>
    <div class="gg-carta-hoja gg-rev" style="--d:.12s">
      <ol class="gg-carta-lista">{lis}</ol>
    </div>
  </section>

  '''

JS = ''

CSS = '''
/* ---------- La carta de extras ---------- */
.gg-carta{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(24px,3vw,36px);text-align:center}
.gg-carta-cab{display:flex;flex-direction:column;align-items:center;gap:14px}
.gg-carta-h{margin:0;font-size:clamp(28px,3.6vw,42px);font-weight:700;letter-spacing:-.03em;color:#1C1A17}
.gg-carta-hoja{box-sizing:border-box;width:100%;max-width:1040px;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:clamp(14px,3vw,40px) clamp(16px,3.4vw,48px);box-shadow:0 1px 0 #E7E2D9,0 22px 44px -34px rgba(28,26,23,.45);position:relative}
.gg-carta-hoja::before{content:"";position:absolute;inset:7px;border:1px solid #F1EFE9;pointer-events:none}
.gg-carta-lista{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr;column-gap:56px;text-align:left}
.gg-plato{position:relative;padding:20px 0 22px;border-bottom:1px dashed #E7E2D9;display:flex;flex-direction:column;gap:8px}
.gg-plato-fila{display:flex;align-items:baseline;gap:10px}
.gg-plato-n{margin:0;font-size:18px;font-weight:700;letter-spacing:-.015em;line-height:1.25;color:#1C1A17;transition:color .25s}
.gg-puntos{flex:1;min-width:20px;height:1px;border-bottom:2px dotted #C9C2B6;transform-origin:left;transition:border-color .25s,transform .9s cubic-bezier(.65,0,.35,1) calc(var(--d,0s) + .25s)}
.gg-plato-num{flex:none;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.08em;color:#4A5D4E}
.gg-plato-d{margin:0;font-size:14.5px;line-height:1.55;color:#3D3A34;max-width:56ch;text-wrap:pretty}
.gg-plato-pie{display:flex;align-items:center;flex-wrap:wrap;gap:6px 14px;margin-top:6px}
/* Botón fino: la caja visible mide ~30 px, pero la zona de toque sigue en 44 (::after invisible) */
.gg-plato-btn{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:0 11px;box-sizing:border-box;border:1px solid #4A5D4E;border-radius:3px;background:#fff;color:#4A5D4E;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;transition:background .25s,color .25s,box-shadow .25s,transform .25s}
.gg-plato-btn::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}
.gg-wa{width:13px;height:13px;flex:none}
.gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.gg-plato-btn:hover,.gg-plato-btn:focus-visible{background:#4A5D4E;color:#FAF8F4;box-shadow:0 10px 22px -14px rgba(28,26,23,.6);transform:translateY(-1px)}
.gg-plato-btn:hover .gg-flecha,.gg-plato-btn:focus-visible .gg-flecha{transform:translateX(5px)}
.gg-plato-btn:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.gg-plato-nota{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;color:#716C65}
.gg-plato:hover .gg-plato-n{color:#4A5D4E}
.gg-plato:hover .gg-puntos{border-color:#4A5D4E}
@media (min-width:900px){.gg-carta-lista{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-plato .gg-puntos{transform:scaleX(0)}
  .gg-js .gg-plato.gg-vis .gg-puntos{transform:none}
}
'''
