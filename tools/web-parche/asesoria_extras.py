"""«Extras que suman» como la carta de un restaurante: cada extra es una línea con su nombre,
puntos guía hasta su número (como el precio de un plato), la descripción y un botón para
pedirlo por WhatsApp. Sin fotos (decisión del dueño, 16/11). Las líneas entran una a una y
los puntos se «dibujan» al aparecer."""
import re

SUB = {'es': 'A la carta', 'ca': 'A la carta', 'en': 'À la carte'}
PANEL = {'es': '¿Qué necesitas? Elige un servicio', 'ca': 'Què necessites? Tria un servei', 'en': 'What do you need? Pick a service'}
GENERICO = {'es': 'Hola%20Marcos%2C%20me%20interesa%20uno%20de%20tus%20servicios',
            'ca': 'Hola%20Marcos%2C%20m%27interessa%20un%20dels%20teus%20serveis',
            'en': 'Hi%20Marcos%2C%20I%27m%20interested%20in%20one%20of%20your%20services'}
WA = ('<svg class="gg-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>')


def extras(sec, l):
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    items = re.findall(r'<h3[^>]*>([^<]+)</h3>\s*<p[^>]*>(.*?)</p>\s*<a href="([^"]+)"[^>]*>([^<]+)</a>', sec, re.S)
    assert len(items) == 8, len(items)
    lis = ''; chips = ''
    ln = items[0][3].replace('→', '').strip()
    for k, (ti, tx, href, _ln) in enumerate(items):
        # Tocar un servicio de la carta lo elige en el panel de abajo (data-i)
        lis += f'''<li class="gg-plato gg-rev" data-i="{k}" style="--d:{(k % 4) * 0.08:.2f}s">
          <div class="gg-plato-fila"><h3 class="gg-plato-n">{ti}</h3><span class="gg-puntos" aria-hidden="true"></span><span class="gg-plato-num">{k + 1:02d}</span></div>
          <p class="gg-plato-d">{tx}</p>
        </li>'''
        chips += f'<button type="button" class="gg-pide-chip" data-i="{k}" data-wa="{href}" aria-pressed="false">{ti}</button>'
    generico = 'https://wa.me/34622390245?text=' + GENERICO[l]
    return f'''<!-- extras -->
  <section class="gg-carta gg-anim" style="border-bottom:1px solid #E7E2D9;">
    <header class="gg-carta-cab">
      <span class="gg-met-et gg-rev">{SUB[l]}</span>
      <h2 class="gg-carta-h gg-rev" style="--d:.08s">{h2}</h2>
    </header>
    <div class="gg-carta-hoja gg-rev" style="--d:.12s">
      <ol class="gg-carta-lista">{lis}</ol>
    </div>
    <div class="gg-pide gg-rev" data-generico="{generico}">
      <span class="gg-pide-t">{PANEL[l]}</span>
      <div class="gg-pide-chips">{chips}</div>
      <a class="gg-pide-btn" href="{generico}" target="_blank" rel="noopener">{WA}<span>{ln}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
    </div>
    <script>
    /* Un servicio elegido (en el panel o tocando la carta) cambia el mensaje de WhatsApp del botón.
       Delegación en document: la página se monta dos veces y no se guardan referencias. */
    (function(){{
      if(window.__ggPide) return; window.__ggPide=1;
      function elige(i){{
        var P=document.querySelector('.gg-pide'); if(!P) return;
        var btn=P.querySelector('.gg-pide-btn'), sel=null;
        P.querySelectorAll('.gg-pide-chip').forEach(function(c){{var on=c.dataset.i===String(i)&&c.getAttribute('aria-pressed')!=='true';c.setAttribute('aria-pressed',on?'true':'false');if(on)sel=c}});
        document.querySelectorAll('.gg-plato').forEach(function(li){{li.classList.toggle('elegido',!!sel&&li.dataset.i===sel.dataset.i)}});
        btn.href=sel?sel.dataset.wa:P.dataset.generico;
        btn.classList.remove('late'); void btn.offsetWidth; btn.classList.add('late');
      }}
      document.addEventListener('click',function(ev){{
        var c=ev.target.closest&&ev.target.closest('.gg-pide-chip'); if(c){{elige(c.dataset.i);return}}
        var li=ev.target.closest&&ev.target.closest('.gg-plato[data-i]');
        if(li){{elige(li.dataset.i); var P=document.querySelector('.gg-pide'); if(P&&P.getBoundingClientRect().top>innerHeight-80) P.scrollIntoView({{behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'}})}}
      }});
    }})();
    </script>
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
.gg-plato[data-i]{cursor:pointer}
.gg-plato:hover .gg-plato-n,.gg-plato.elegido .gg-plato-n{color:#4A5D4E}
.gg-plato:hover .gg-puntos,.gg-plato.elegido .gg-puntos{border-color:#4A5D4E}
.gg-plato.elegido .gg-plato-num{background:#4A5D4E;color:#FAF8F4;padding:1px 6px;border-radius:2px}
/* Un solo panel bajo la carta: eliges servicio y el botón abre WhatsApp con su mensaje */
.gg-pide{width:100%;max-width:760px;display:flex;flex-direction:column;align-items:center;gap:16px}
.gg-pide-t{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.gg-pide-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.gg-pide-chip{position:relative;min-height:34px;padding:0 13px;border:1px solid #D5CFC4;border-radius:999px;background:#fff;color:#3D3A34;font:inherit;font-size:13.5px;cursor:pointer;transition:border-color .2s,background .2s,color .2s}
.gg-pide-chip::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;transform:translateY(-50%)}
.gg-pide-chip:hover{border-color:#4A5D4E;color:#4A5D4E}
.gg-pide-chip[aria-pressed="true"]{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}
.gg-pide-chip:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-pide-btn{display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:0 24px;margin-top:4px;border-radius:3px;background:#1C1A17;color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;transition:background .25s,transform .25s,box-shadow .25s}
.gg-pide-btn:hover,.gg-pide-btn:focus-visible{background:#4A5D4E;transform:translateY(-2px);box-shadow:0 14px 26px -16px rgba(28,26,23,.6)}
.gg-pide-btn:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.gg-wa{width:16px;height:16px;flex:none}
.gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.gg-pide-btn:hover .gg-flecha{transform:translateX(5px)}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-late{0%{transform:scale(1)}40%{transform:scale(1.05)}100%{transform:scale(1)}}
  .gg-pide-btn.late{animation:gg-late .45s cubic-bezier(.2,.9,.25,1.2)}
}
@media (min-width:900px){.gg-carta-lista{grid-template-columns:1fr 1fr}}
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-plato .gg-puntos{transform:scaleX(0)}
  .gg-js .gg-plato.gg-vis .gg-puntos{transform:none}
}
'''
