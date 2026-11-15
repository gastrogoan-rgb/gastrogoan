"""Le Petit Comité · «¿Qué celebramos?» (pedido del dueño, 16/11: «algo guapo con movimiento e
interacción y un CTA potente; esta parte es importante»). Va ANTES de los menús de ejemplo.

- Siete ocasiones (las seis de siempre + «Otra ocasión») como fichas que se eligen.
- Mientras nadie toca, una luz recorre las fichas y la frase de abajo va cambiando sola:
  «Celebremos tu cumpleaños.» → «… vuestro aniversario.» → …
- Al tocar una, se queda elegida (verde, con su tick), la frase la nombra y el botón grande
  «Pedir propuesta» abre WhatsApp con el mensaje de ESA ocasión (los mensajes de siempre).
Sin JavaScript: fichas y botón funcionan como enlaces normales."""
import re
from urllib.parse import quote, unquote

T = {
 'es': dict(pre='Celebremos', obj=['tu cumpleaños', 'vuestro aniversario', 'la cena de empresa', 'la pedida de mano', 'una cata con amigos', 'una cena íntima'],
            otra=('Otra ocasión', 'lo que tú quieras'), btn='Pedir propuesta', pista='Toca una ocasión', nota='Propuesta en 48 horas · Sin compromiso',
            gen='Hola, quiero organizar un evento con Le Petit Comité.'),
 'ca': dict(pre='Celebrem', obj=['el teu aniversari', 'el vostre aniversari', "el sopar d'empresa", 'la petició de mà', 'un tast amb amics', 'un sopar íntim'],
            otra=('Una altra ocasió', 'el que tu vulguis'), btn='Demanar proposta', pista='Toca una ocasió', nota='Proposta en 48 hores · Sense compromís',
            gen='Hola, vull organitzar un esdeveniment amb Le Petit Comité.'),
 'en': dict(pre="Let's celebrate", obj=['your birthday', 'your anniversary', 'the company dinner', 'the proposal', 'a tasting with friends', 'an intimate dinner'],
            otra=('Another occasion', 'whatever you like'), btn='Request a proposal', pista='Pick an occasion', nota='Proposal in 48 hours · No commitment',
            gen="Hi, I'd like to organise an event with Le Petit Comité."),
}
OTRA_SVG = '<path d="M12 5v14M5 12h14"/>'
WA = ('<svg class="ev-oc-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>')


def ocasiones(sec, l):
    x = T[l]
    et = re.search(r"<span style=\"font-family:'IBM Plex Mono'[^>]*>([^<]+)</span>", sec).group(1)
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    items = re.findall(r'<a href="(https://wa\.me/[^"]+)"[^>]*>\s*<svg[^>]*>(.*?)</svg>\s*<span[^>]*>([^<]+)</span>\s*</a>', sec, re.S)
    assert len(items) == 6, len(items)
    gen = 'https://wa.me/34622390245?text=' + quote(x['gen'])
    fichas = ''
    for k, (href, svg, nombre) in enumerate(items + [(gen, OTRA_SVG, x['otra'][0])]):
        frase = x['obj'][k] if k < 6 else x['otra'][1]
        fichas += f'''<a class="ev-oc-f{' otra' if k == 6 else ''}" href="{href}" target="_blank" rel="noopener" data-k="{k}" data-frase="{frase}" style="--k:{k}">
          <span class="ev-oc-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{svg}</svg></span>
          <span class="ev-oc-n">{nombre}</span>
          <span class="ev-oc-tick" aria-hidden="true"></span>
        </a>'''
    return f'''<!-- ocasiones: elige qué celebramos -->
  <section class="ev-oc">
    <div class="ev-oc-cab ev-rev">
      <span class="ev-cm-et">{et}</span>
      <h2 class="ev-cm-h">{h2}</h2>
      <span class="ev-oc-pista">{x['pista']}</span>
    </div>
    <div class="ev-oc-grid ev-rev" style="--d:.1s" role="group" aria-label="{h2}">{fichas}</div>
    <div class="ev-oc-cta ev-rev" style="--d:.2s">
      <p class="ev-oc-frase" aria-live="polite">{x['pre']} <span class="ev-oc-obj"><em>{x['obj'][0]}</em></span>.</p>
      <a class="ev-oc-btn" href="{gen}" data-gen="{gen}" target="_blank" rel="noopener">{WA}{x['btn']}<span class="gg-flecha" aria-hidden="true">→</span></a>
      <span class="ev-oc-nota">{x['nota']}</span>
    </div>
    <script>
    /* Elegir ocasión: la ficha se marca y el botón grande lleva su mensaje. Mientras nadie toca, una
       luz recorre las fichas y la frase va cambiando. Delegación en document (la página se monta dos veces). */
    (function(){{
      if(window.__evOc) return; window.__evOc=1;
      var quieto=matchMedia('(prefers-reduced-motion: reduce)').matches, k=0, tocado=false;
      function frase(t){{
        var o=document.querySelector('.ev-oc-obj'); if(!o) return;
        var em=o.querySelector('em'); if(em.textContent===t) return;
        if(quieto){{em.textContent=t;return}}
        o.classList.add('sale'); setTimeout(function(){{em.textContent=t;o.classList.remove('sale');o.classList.add('entra');setTimeout(function(){{o.classList.remove('entra')}},350)}},220);
      }}
      document.addEventListener('click',function(e){{
        var f=e.target.closest&&e.target.closest('.ev-oc-f'); if(!f) return;
        var S=f.closest('.ev-oc'), btn=S.querySelector('.ev-oc-btn');
        if(!f.classList.contains('on')){{
          e.preventDefault(); tocado=true;
          S.querySelectorAll('.ev-oc-f').forEach(function(x){{x.classList.toggle('on',x===f);x.classList.remove('luz');x.setAttribute('aria-pressed',x===f)}});
          btn.href=f.getAttribute('href'); frase(f.dataset.frase);
          btn.classList.remove('late'); void btn.offsetWidth; btn.classList.add('late');
        }}
        /* segunda vez sobre la misma ficha: abre WhatsApp directamente (enlace normal) */
      }});
      setInterval(function(){{
        if(tocado||quieto) return; var S=document.querySelector('.ev-oc'); if(!S) return;
        var r=S.getBoundingClientRect(); if(r.top>innerHeight||r.bottom<0) return;
        var fs=S.querySelectorAll('.ev-oc-f'); k=(k+1)%(fs.length-1);
        fs.forEach(function(x,i){{x.classList.toggle('luz',i===k)}}); frase(fs[k].dataset.frase);
      }},1900);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- ¿Qué celebramos? ---------- */
.ev-oc{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);border-bottom:1px solid #E7E2D9;display:flex;flex-direction:column;align-items:center;gap:clamp(24px,3vw,34px);background:radial-gradient(ellipse at 50% 0%,rgba(231,214,180,.35),transparent 60%)}
.ev-oc-cab{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.ev-oc-pista{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.ev-oc-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:1080px}
.ev-oc-f{position:relative;box-sizing:border-box;width:136px;min-height:136px;padding:18px 10px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;background:#fff;border:1px solid #E7E2D9;border-radius:3px;color:#1C1A17;text-decoration:none;cursor:pointer;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s,border-color .35s,background .35s,color .35s}
.ev-oc-f.otra{border-style:dashed;border-color:#C9C2B6;background:transparent}
.ev-oc-ic{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#EEF2EC;color:#4A5D4E;transition:background .35s,color .35s,transform .45s cubic-bezier(.2,.9,.25,1.3)}
.ev-oc-ic svg{width:24px;height:24px}
.ev-oc-n{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:19px;line-height:1.15}
.ev-oc-tick{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;background:#FAF8F4;opacity:0;transform:scale(.4);transition:opacity .25s,transform .35s cubic-bezier(.2,.9,.25,1.4)}
.ev-oc-tick::after{content:"";position:absolute;left:7px;top:5px;width:5px;height:9px;border-right:2px solid #4A5D4E;border-bottom:2px solid #4A5D4E;transform:rotate(45deg)}
.ev-oc-f:hover{transform:translateY(-4px);border-color:#4A5D4E;box-shadow:0 18px 34px -24px rgba(28,26,23,.5)}
.ev-oc-f:hover .ev-oc-ic{transform:rotate(-10deg) scale(1.08)}
.ev-oc-f:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.ev-oc-f.luz{border-color:#4A5D4E;box-shadow:0 0 0 4px rgba(74,93,78,.12)}
.ev-oc-f.luz .ev-oc-ic{background:#4A5D4E;color:#FAF8F4}
.ev-oc-f.on{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:translateY(-4px);box-shadow:0 18px 34px -20px rgba(74,93,78,.7)}
.ev-oc-f.on .ev-oc-ic{background:#FAF8F4;color:#4A5D4E}
.ev-oc-f.on .ev-oc-tick{opacity:1;transform:none}
.ev-oc-cta{display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center}
.ev-oc-frase{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:clamp(28px,3.6vw,44px);line-height:1.15;color:#1C1A17}
.ev-oc-obj{display:inline-block;transition:opacity .22s,transform .22s}
.ev-oc-obj em{font-style:italic;font-weight:600;color:#4A5D4E;background:linear-gradient(transparent 70%,rgba(197,214,191,.7) 70%)}
.ev-oc-obj.sale{opacity:0;transform:translateY(-10px)}
.ev-oc-obj.entra{animation:ev-oc-entra .35s cubic-bezier(.2,.7,.2,1)}
@keyframes ev-oc-entra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.ev-oc-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:60px;min-width:300px;padding:0 34px;box-sizing:border-box;border-radius:3px;background:#1C1A17;color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;transition:background .25s,transform .25s,box-shadow .25s}
.ev-oc-btn .ev-oc-wa{width:19px;height:19px;flex:none}
.ev-oc-btn:hover,.ev-oc-btn:focus-visible{background:#4A5D4E;transform:translateY(-2px);box-shadow:0 20px 36px -18px rgba(28,26,23,.7)}
.ev-oc-btn:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.ev-oc-btn .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ev-oc-btn:hover .gg-flecha{transform:translateX(6px)}
.ev-oc-nota{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#716C65}
@media (max-width:560px){
  .ev-oc-grid{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:10px}
  .ev-oc-f{width:auto;min-height:118px}
  .ev-oc-f.otra{grid-column:1/-1;min-height:0;flex-direction:row;padding:14px}
  .ev-oc-btn{width:100%;min-width:0}
}
@media (prefers-reduced-motion:no-preference){
  @keyframes ev-oc-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes ev-oc-late{0%{transform:scale(1)}40%{transform:scale(1.05)}100%{transform:scale(1)}}
  @keyframes ev-oc-flota{0%,100%{translate:0 0}50%{translate:0 -3px}}
  .ev-oc-btn::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(250,248,244,.2),transparent);animation:ev-oc-brillo 3.4s ease-in-out infinite;pointer-events:none}
  .ev-oc-btn.late{animation:ev-oc-late .45s cubic-bezier(.2,.9,.25,1.2)}
  .ev-oc-ic svg{animation:ev-oc-flota 3s ease-in-out calc(var(--k)*-.4s) infinite}
  .ev-js .ev-oc-grid.ev-rev .ev-oc-f{opacity:0;transform:translateY(16px) scale(.96);transition:opacity .5s calc(var(--k)*.06s + .1s),transform .5s cubic-bezier(.2,.7,.2,1) calc(var(--k)*.06s + .1s),box-shadow .35s,border-color .35s,background .35s,color .35s}
  .ev-js .ev-oc-grid.ev-rev.ev-vis .ev-oc-f{opacity:1;transform:none}
  .ev-js .ev-oc-grid.ev-rev.ev-vis .ev-oc-f:hover,.ev-js .ev-oc-grid.ev-rev.ev-vis .ev-oc-f.on{transform:translateY(-4px)}
}
/* ---------- Menús de ejemplo: retoques (lo elegido en verde, letra ≥ 11 px, cambio con fundido) ---------- */
#ev-menus>div:first-child>span:first-child{display:inline-flex;align-items:center;gap:12px;color:#4A5D4E!important;letter-spacing:.16em!important}
#ev-menus>div:first-child>span:first-child::before,#ev-menus>div:first-child>span:first-child::after{content:"";width:28px;height:2px;background:#4A5D4E}
.menu-tabs label{justify-content:center;min-height:44px;box-sizing:border-box;display:inline-flex;align-items:center;border-radius:3px;background:#fff}
.menu-tabs label:hover{border-color:#4A5D4E!important;color:#4A5D4E!important}
#ev-menus .menu-select:not(:has(input:checked)) .menu-tabs label[for=ggm1],#ev-menus .menu-select #ggm1:checked ~ .menu-tabs label[for=ggm1],#ev-menus .menu-select #ggm2:checked ~ .menu-tabs label[for=ggm2],#ev-menus .menu-select #ggm3:checked ~ .menu-tabs label[for=ggm3],
#ev-menus .menu-select #ggm4:checked ~ .menu-tabs label[for=ggm4],#ev-menus .menu-select #ggm5:checked ~ .menu-tabs label[for=ggm5],#ev-menus .menu-select #ggm6:checked ~ .menu-tabs label[for=ggm6]{background:#4A5D4E!important;border-color:#4A5D4E!important;color:#FAF8F4!important}
.menu-select input:focus-visible + input,.menu-tabs label:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
@media (max-width:560px){.menu-tabs{display:grid!important;grid-template-columns:1fr 1fr}.menu-tabs label{padding:0 8px!important;letter-spacing:.06em!important}}
.menu-panel{border-radius:3px;box-shadow:0 26px 44px -34px rgba(28,26,23,.45)}
.menu-panel span[style*="font-size:9px"],.menu-panel span[style*="font-size:10px"],.menu-panel span[style*="font-size: 9px"],.menu-panel span[style*="font-size: 10px"]{font-size:11px!important}
@media (prefers-reduced-motion:no-preference){
  @keyframes ev-menu-entra{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .menu-panel{animation:ev-menu-entra .45s cubic-bezier(.2,.7,.2,1)}
  .menu-panel>div:last-child>div{animation:ev-menu-entra .5s cubic-bezier(.2,.7,.2,1) both}
  .menu-panel>div:last-child>div:nth-child(2){animation-delay:.06s}
  .menu-panel>div:last-child>div:nth-child(3){animation-delay:.12s}
  .menu-panel>div:last-child>div:nth-child(4){animation-delay:.18s}
}
'''


# ---------- Cierre (como en Asesoría y App, con la letra de Le Petit Comité) ----------
FIN = {
 'es': dict(l1='Tu próxima mesa empieza con un mensaje.', l2='Reserva tu fecha', msg='Hola, quiero reservar una fecha con Le Petit Comité.',
            asunto='Reservar una fecha', wa='WhatsApp', mail='Email', ig='Instagram', pie='Propuesta en 48 horas · Sin compromiso'),
 'ca': dict(l1='La teva propera taula comença amb un missatge.', l2='Reserva la teva data', msg='Hola, vull reservar una data amb Le Petit Comité.',
            asunto='Reservar una data', wa='WhatsApp', mail='Correu', ig='Instagram', pie='Proposta en 48 hores · Sense compromís'),
 'en': dict(l1='Your next table starts with a message.', l2='Book your date', msg="Hi, I'd like to book a date with Le Petit Comité.",
            asunto='Booking a date', wa='WhatsApp', mail='Email', ig='Instagram', pie='Proposal in 48 hours · No commitment'),
}
MAIL_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M3.5 6.5h17v11h-17z M3.8 7l8.2 6.2L20.2 7"/></svg>'
IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>'


def cierre(sec, l):
    x = FIN[l]
    mail = re.search(r'href="mailto:([^"]+)"', sec).group(1)
    ig = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', sec).group(1)
    wa = 'https://wa.me/34622390245?text=' + quote(x['msg'])
    mt = f'mailto:{mail}?subject=' + quote(x['asunto']) + '&body=' + quote(x['msg'])
    bloque = f'''<h2 class="ev-fin-h"><span class="ev-fin-l1 ev-rev">{x['l1']}</span>
      <span class="ev-fin-l2 ev-rev" style="--d:.15s"><span class="ev-fin-hl">{x['l2']}</span><span class="ev-fin-pt">.</span></span></h2>
    <div class="ev-fin-bur ev-rev" style="--d:.3s">
      <a class="ev-fin-b prim" href="{wa}" target="_blank" rel="noopener">{WA}<span>{x['wa']}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
      <a class="ev-fin-b" href="{mt}">{MAIL_SVG}<span>{x['mail']}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
      <a class="ev-fin-b" href="https://ig.me/m/{ig}" target="_blank" rel="noopener">{IG_SVG}<span>{x['ig']}</span><span class="gg-flecha" aria-hidden="true">→</span></a>
    </div>
    <span class="ev-fin-pie ev-rev" style="--d:.4s">{x['pie']}</span>'''
    i = sec.index('<h2'); j = sec.index('<div style="display:flex;justify-content:space-between')
    sec = sec[:i] + bloque + '\n    ' + sec[j:]
    return sec.replace('<section style="background:#1C1A17;', '<section class="ev-fin" style="background:#1C1A17;', 1)


CSS += '''
/* ---------- Cierre ---------- */
.ev-fin>.ev-fin-h,.ev-fin>.ev-fin-bur,.ev-fin>.ev-fin-pie{align-self:center;text-align:center}
.ev-fin{padding-top:clamp(64px,9vw,110px)!important}
.ev-fin-h{margin:0;display:flex;flex-direction:column;align-items:center;gap:.1em;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:500;font-size:clamp(28px,4.2vw,54px);line-height:1.1;color:#FAF8F4}
.ev-fin-l1{white-space:nowrap}
.ev-fin-l2{font-weight:600;font-size:1.25em}
.ev-fin-hl{padding:0 .1em;background:linear-gradient(transparent 60%,#4A5D4E 60%,#4A5D4E 92%,transparent 92%) 0 0/100% 100% no-repeat}
.ev-fin-pt{color:#7E9B84}
.ev-fin-bur{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;width:100%;max-width:640px;margin-top:8px}
.ev-fin-b{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 14px;box-sizing:border-box;border-radius:3px;border:1px solid rgba(250,248,244,.35);color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background .25s,color .25s,border-color .25s,transform .25s,box-shadow .25s}
.ev-fin-b svg{width:18px;height:18px;flex:none}
.ev-fin-b.prim{background:#FAF8F4;color:#1C1A17;border-color:#FAF8F4}
.ev-fin-b:hover,.ev-fin-b:focus-visible{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 16px 30px -16px rgba(0,0,0,.8)}
.ev-fin-b:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.ev-fin-b .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ev-fin-b:hover .gg-flecha{transform:translateX(5px)}
.ev-fin-pie{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A857C}
.ev-fin a[href$=".html"]{display:inline-flex;align-items:center;min-height:44px}
@media (max-width:600px){.ev-fin-h{font-size:5.6vw}.ev-fin-l2{font-size:1.55em}.ev-fin-bur{grid-template-columns:1fr;max-width:340px}}
@media (prefers-reduced-motion:no-preference){
  @keyframes ev-fin-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes ev-fin-empuja{0%,80%,100%{transform:none}88%{transform:translateX(6px)}}
  .ev-fin-b.prim::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.3),transparent);animation:ev-fin-brillo 3.4s ease-in-out infinite;pointer-events:none}
  .ev-fin-b.prim .gg-flecha{animation:ev-fin-empuja 3.4s ease-in-out infinite}
  .ev-fin-b.prim:hover .gg-flecha{animation:none}
  .ev-js .ev-fin-hl{background-size:0% 100%;transition:background-size 1s cubic-bezier(.65,0,.35,1) .55s}
  .ev-js .ev-fin-l2.ev-vis .ev-fin-hl{background-size:100% 100%}
}
'''
