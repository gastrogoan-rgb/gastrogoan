#!/usr/bin/env python3
"""Página App (es/ca/en), guiada por el dueño sección a sección. Parte siempre de git (a152bda).
 1) Cabecera: titular más pequeño (como Asesoría) con entrada en cascada y la cifra que se «pinta»
    en verde; descripción nueva (suscripción, no «un solo pago»); botones con el mensaje de
    WhatsApp ya escrito y brillo de llamada a la acción en «Comprar».
 2) Precio y enlace de compra al día en TODA la página: 240 € + IVA al año (lo que paga cada año);
    el primer año (300 € + IVA) se dice bajo los botones, que el enlace cobra eso.
 3) «Volver» como botón (volver.py).
Uso: python3 tools/web-parche/app.py
"""
import re, json, os, subprocess, sys
from urllib.parse import quote
sys.path.insert(0, os.path.dirname(__file__))
import volver, app_cuenta, app_incluye
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
PAGS = {'es': 'app', 'ca': 'ca-app', 'en': 'en-app'}
BASE_GIT = 'a152bda'
STRIPE_VIEJO = 'https://buy.stripe.com/aFa6oGeSK44jaFw1mvdwc01'
STRIPE = 'https://buy.stripe.com/bJebJ0cKCfN19Bsc19dwc03'

# Mismo formato que el original (dos frases cortas); solo cambia el final, que hablaba de «un solo pago»
DESC = {
 'es': 'La hostelería se ha vuelto un negocio de suscripciones.<br>GastroGoan App las sustituye todas con una sola.',
 'ca': "L'hostaleria s'ha convertit en un negoci de subscripcions.<br>GastroGoan App les substitueix totes amb una de sola.",
 'en': 'Hospitality has become a subscription business.<br>GastroGoan App replaces them all with just one.',
}
PRECIO = {'es': '240 € + IVA / año', 'ca': "240 € + IVA / any", 'en': '€240 + VAT / year'}
NOTA = {'es': 'El primer año, 300 € + IVA', 'ca': 'El primer any, 300 € + IVA', 'en': 'First year, €300 + VAT'}
DEMO = {'es': 'Hola Marcos, me gustaría ver una demo de la App GastroGoan.',
        'ca': "Hola Marcos, m'agradaria veure una demo de l'App GastroGoan.",
        'en': "Hi Marcos, I'd like to see a demo of the GastroGoan App."}

CSS = '''<style data-gg="app">
.gg-app-h1{margin:0;font-size:clamp(28px,5vw,56px);font-weight:700;letter-spacing:-.035em;line-height:1.2;color:#FAF8F4}
.gg-app-hl{display:inline-block;line-height:1;padding:.05em .16em .03em;border-radius:2px;color:#FAF8F4;background:linear-gradient(#4A5D4E,#4A5D4E) 0 0/100% 100% no-repeat}
.gg-app-desc{margin:0;font-size:clamp(16px,1.9vw,18px);line-height:1.6;color:#C9C2B6;max-width:640px;text-wrap:pretty}
.gg-app-acc{display:flex;gap:12px;flex-wrap:wrap}
.gg-app-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 24px;border-radius:3px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;text-decoration:none;transition:background .25s,color .25s,border-color .25s,transform .25s,box-shadow .25s}
.gg-app-btn svg{width:17px;height:17px;flex:none}
.gg-app-btn.prim{background:#FAF8F4;color:#1C1A17;border:1px solid #FAF8F4}
.gg-app-btn.sec{background:transparent;color:#FAF8F4;border:1px solid rgba(250,248,244,.35)}
.gg-app-btn:hover,.gg-app-btn:focus-visible{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 16px 30px -16px rgba(0,0,0,.8)}
.gg-app-btn:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.gg-app-btn .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.gg-app-btn:hover .gg-flecha{transform:translateX(5px)}
.gg-app-nota{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A857C}
/* Móvil: los dos botones uno al lado del otro (pedido del dueño) */
/* Móvil: los dos botones uno al lado del otro (pedido del dueño). Si no cabe, primero se va el icono
   y, en 320, el texto puede ir en dos líneas (nunca cortado ni partido a media palabra). */
@media (max-width:520px){.gg-app-acc{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gg-app-btn{min-width:0;padding:0 10px;letter-spacing:.05em;font-size:12px;gap:7px;box-sizing:border-box}}
@media (max-width:420px){.gg-app-btn svg{display:none}}
@media (max-width:360px){.gg-app-btn{white-space:normal;text-align:center;line-height:1.25;font-size:11.5px;letter-spacing:.03em}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-app-brillo{0%,72%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes gg-app-empuja{0%,80%,100%{transform:none}88%{transform:translateX(5px)}}
  .gg-app-btn.prim::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.28),transparent);animation:gg-app-brillo 3.6s ease-in-out infinite;pointer-events:none}
  .gg-app-btn.prim .gg-flecha{animation:gg-app-empuja 3.6s ease-in-out infinite}
  .gg-app-btn.prim:hover .gg-flecha{animation:none}
  /* Entrada en cascada y la cifra que se pinta de verde, como en Asesoría */
  .gg-js .gg-app-rev{opacity:0;transform:translateY(14px);transition:opacity .7s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0s)}
  .gg-js .gg-app-rev.gg-vis{opacity:1;transform:none}
  .gg-js .gg-app-hl{background-size:0% 100%;transition:background-size .9s cubic-bezier(.65,0,.35,1) .5s}
  .gg-js .gg-app-rev.gg-vis .gg-app-hl{background-size:100% 100%}
}
</style>'''

JS = '''<script>
/* La página se monta dos veces (bundle): se busca lo vivo en cada vuelta y no se guarda nada */
(function(){
  if(window.__ggApp) return; window.__ggApp=1;
  document.documentElement.classList.add('gg-js');
  /* Cada bloque entra al llegar a la pantalla; a los 15 s se enseña todo pase lo que pase */
  function pinta(todo){ document.documentElement.classList.add('gg-js');
    document.querySelectorAll('.gg-app-rev:not(.gg-vis)').forEach(function(e){
      if(todo||e.getBoundingClientRect().top<innerHeight*0.9) e.classList.add('gg-vis')}); }
  addEventListener('scroll',function(){requestAnimationFrame(function(){pinta()})},{passive:true});
  var n=0, iv=setInterval(function(){ requestAnimationFrame(function(){pinta()}); if(++n>40) clearInterval(iv) },150);
  setTimeout(function(){pinta(1)},15000);
})();
</script>'''


def cabecera(h, l):
    wa = 'https://wa.me/34622390245?text=' + quote(DEMO[l])
    from asesoria_extras import WA
    et = re.search(r'(<span style="font-family:\'IBM Plex Mono\'[^>]*>)([^<]+)</span>', h)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S).group(1)
    h1 = re.sub(r'<span style="background:#4A5D4E;[^"]*">', '<span class="gg-app-hl">', h1, count=1)
    comprar = re.search(r'<a href="https://buy\.stripe[^>]*>([^<]+)</a>', h).group(1).split('—')[0].strip()
    demo = re.search(r'<a href="https://wa\.me[^>]*>([^<]+)</a>', h).group(1).strip()
    return f'''<header style="background:#1C1A17;padding:clamp(28px,4vw,48px) clamp(24px,6vw,64px) clamp(30px,4vw,52px);display:flex;flex-direction:column;gap:22px;">
    <span class="gg-app-rev" style="font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#8A857C;">{et.group(2)}</span>
    <h1 class="app-hero-title gg-app-h1 gg-app-rev" style="--d:.08s">{h1}</h1>
    <p class="gg-app-desc gg-app-rev" style="--d:.2s">{DESC[l]}</p>
    <div class="gg-app-acc gg-app-rev" style="--d:.32s">
      <a class="gg-app-btn prim" href="{STRIPE}" target="_blank" rel="noopener">{comprar}<span class="gg-flecha" aria-hidden="true">→</span></a>
      <a class="gg-app-btn sec" href="{wa}" target="_blank" rel="noopener">{WA}{demo}</a>
    </div>
    {JS}
  </header>'''


def procesar(l):
    arch = PAGS[l] + '.html'; ruta = os.path.join(RAIZ, 'deploy', 'web', 'public', arch)
    s = subprocess.run(['git', 'show', f'{BASE_GIT}:deploy/web/public/{arch}'], capture_output=True, text=True, cwd=RAIZ, check=True).stdout
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    t = json.loads(m.group(2))
    # 1) cabecera
    i = t.index('<header'); j = t.index('</header>', i) + len('</header>')
    t = t[:i] + cabecera(t[i:j], l) + t[j:]
    # 2) precio y enlace en toda la página
    n = t.count(STRIPE_VIEJO); t = t.replace(STRIPE_VIEJO, STRIPE)
    t = t.replace('100 €', '240 €').replace('€100', '€240').replace('100&nbsp;€', '240&nbsp;€')
    assert '100 €' not in t
    # 4) El problema + Tu solución → una sola sección que se toca
    i = t.index('<!-- problema'); j = t.index('<!--', t.index('<!--', i + 5) + 5)
    t = t[:i] + app_cuenta.cuenta(l) + t[j:]
    # 5) Qué incluye → todas las herramientas, filtrables por zona
    i = t.index('<!-- qu'); j = t.index('<!--', i + 5)
    t = t[:i] + app_incluye.incluye(l) + t[j:]
    # 3) volver
    t = volver.aplicar(t)
    t = t.replace('</helmet>', CSS.replace('</style>', app_cuenta.CSS + app_incluye.CSS + '</style>') + '\n</helmet>', 1)
    nuevo = json.dumps(t, ensure_ascii=False).replace('</', '<\\u002F')
    open(ruta, 'w', encoding='utf-8').write(s[:m.start(2)] + nuevo + s[m.end(2):])
    print('OK', arch, '· enlaces de compra cambiados:', n)

for l in PAGS: procesar(l)
