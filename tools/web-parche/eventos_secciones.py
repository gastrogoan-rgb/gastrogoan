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


DATOS = {
 'es': [('Zona', 'Cataluña'), ('Dónde', 'En tu casa, tu local o el espacio que elijas'), ('Comensales', 'De 2 a 50 personas'), ('A medida', 'Cada menú se diseña para tu ocasión')],
 'ca': [('Zona', 'Catalunya'), ('On', "A casa teva, al teu local o a l'espai que triïs"), ('Comensals', 'De 2 a 50 persones'), ('A mida', 'Cada menú es dissenya per a la teva ocasió')],
 'en': [('Area', 'Catalonia'), ('Where', 'At your home, your venue or the space you choose'), ('Guests', 'From 2 to 50 people'), ('Bespoke', 'Every menu is designed for your occasion')],
}
FICHA = {'es': 'Tu evento', 'ca': 'El teu esdeveniment', 'en': 'Your event'}
ICON_DATO = ['<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
             '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
             '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.4 5 2.8 5 5.8"/>',
             '<path d="M6 4h11a1 1 0 0 1 1 1v15H8a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h5"/>']
ICON_VIEJO = ['<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.4 5 2.8 5 5.8"/>',
             '<path d="M4 11l8-6 8 6v9H4z"/><path d="M10 20v-5h4v5"/>',
             '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>']


def datos_de(sec):
    """Los tres datos de la franja negra (comensales, dónde, zona): etiqueta, cifra y nota."""
    out = []
    for col in re.findall(r'<div style="display:flex;flex-direction:column;gap:10px;[^"]*">(.*?)</div>', sec, re.S):
        txt = re.findall(r'<span[^>]*>([^<]+)</span>', col)
        out.append((txt[0], txt[1], txt[2] if len(txt) > 2 else ''))
    assert len(out) == 3, out
    return out


def como(sec, l, datos=None):
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
    filas = ''.join(f'''<li class="ev-fi-d" style="--k:{k}">
          <span class="ev-fi-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON_DATO[k]}</svg></span>
          <span class="ev-fi-tx"><span class="ev-fi-k">{a}</span><span class="ev-fi-v">{b}</span></span>
        </li>''' for k, (a, b) in enumerate(DATOS[l]))
    ficha = f'<ul class="ev-fi">{filas}</ul>'
    return f'''<!-- cómo funciona: los tres pasos se recorren solos -->
  <section class="ev-cm" style="border-bottom:1px solid #E7E2D9;">
    <div class="ev-cm-cab ev-rev">
      <span class="ev-cm-et">{tit}</span>
      <h2 class="ev-cm-h">{sub}</h2>
    </div>
    <div class="ev-cm-pista ev-rev" style="--d:.1s">
      <div class="ev-cm-raya" aria-hidden="true"><span></span><i class="ev-cm-punta"></i></div>
      {nodos}
    </div>
    <div class="ev-cm-bloque ev-rev" style="--d:.2s">
      <div class="ev-cm-paneles" aria-live="polite">{paneles}</div>
      {ficha}
    </div>
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
      function cuenta(){{
        var v=document.querySelector('.ev-fi-v[data-cuenta]'); if(!v||v.dataset.hecho) return;
        if(v.getBoundingClientRect().top>innerHeight*0.9) return; v.dataset.hecho=1;
        var p=v.textContent.split('–'), a=+p[0], b=+p[1]; if(quieto||!b) return; var t0=performance.now();
        (function f(t){{var q=Math.min(1,(t-t0)/1200),e=1-Math.pow(1-q,3);v.textContent=a+'–'+Math.round(a+(b-a)*e);if(q<1&&document.body.contains(v))requestAnimationFrame(f)}})(t0);
      }}
      
      /* Corre solo, a ritmo de lectura (pedido del dueño): la raya se va llenando de un paso al siguiente
         de forma continua y, al llegar, el paso se enciende. Al terminar el tercero espera, se vacía y vuelve
         a empezar. Solo mientras la sección se ve; tocar un paso lo elige y se queda ahí un rato. */
      var POR=3200, FIN=4200, p=0, paso=0, ult=performance.now(), espera=0;
      function raya(S,x){{var r=S.querySelector('.ev-cm-raya span'); if(r) r.style.transform='scaleX('+(x/2)+')'; var c=S.querySelector('.ev-cm-raya'); if(c) c.style.setProperty('--p',(x/2).toFixed(4))}}
      function marca(S,n){{
        if(S.dataset.k==String(n)) return; S.dataset.k=n; k=n;
        S.querySelectorAll('.ev-cm-nodo').forEach(function(b,i){{b.classList.toggle('on',i===n);b.classList.toggle('hecho',i<n);b.setAttribute('aria-pressed',i===n)}});
        S.querySelectorAll('.ev-cm-panel').forEach(function(q,i){{q.classList.toggle('on',i===n)}});
      }}
      pon=function(n){{var S=document.querySelector('.ev-cm'); if(!S) return; p=n; paso=n; espera=0; S.dataset.k=''; S.classList.add('a-mano'); raya(S,n); marca(S,n)}};
      function bucle(t){{
        var dt=Math.min(100,t-ult); ult=t; requestAnimationFrame(bucle);
        var S=document.querySelector('.ev-cm'); if(!S) return;
        if(!S.dataset.listo){{S.dataset.listo=1; S.dataset.k=''; marca(S,Math.floor(p)); raya(S,p)}}
        cuenta();
        if(quieto||Date.now()<pausa) return;
        S.classList.remove('a-mano');
        var r=S.getBoundingClientRect(); if(r.top>innerHeight*0.8||r.bottom<innerHeight*0.2) return;
        /* el paso va aparte de la raya: deducirlo de la raya hacía saltar del 1 al 3 */
        var n=paso; espera+=dt;
        if(n>=2){{ if(espera>FIN){{espera=0;p=0;S.classList.add('vacia');setTimeout(function(){{var s=document.querySelector('.ev-cm');if(s)s.classList.remove('vacia')}},450);p=0;paso=0;raya(S,0);marca(S,0)}} return }}
        /* se queda en cada paso lo justo para leerlo y luego la raya corre hasta el siguiente */
        var HOLD=POR*0.55, TRAV=POR*0.45;   /* ~1,8 s leyendo y ~1,4 s de recorrido: se ve avanzar (17/11) */
        if(espera<HOLD) return;
        var q=Math.min(1,(espera-HOLD)/TRAV), e=q<.5?2*q*q:1-Math.pow(-2*q+2,2)/2;
        p=n+e; raya(S,p);
        if(q>=1){{p=paso=n+1;espera=0;marca(S,n+1)}}
      }}
      requestAnimationFrame(bucle);
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
.ev-cm-raya{position:absolute;left:16.66%;right:16.66%;top:37px;height:4px;border-radius:2px;background:#E7E2D9}
.ev-cm-raya span{position:absolute;inset:0;border-radius:2px;background:#4A5D4E;transform-origin:left;transform:scaleX(0)}
/* La punta que viaja de un paso al siguiente: así se ve que va «de la idea a la mesa» */
.ev-cm-punta{position:absolute;top:50%;left:calc(var(--p,0)*100%);width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#4A5D4E;box-shadow:0 0 0 5px rgba(74,93,78,.18)}
@media (prefers-reduced-motion:no-preference){
  @keyframes ev-cm-pop{0%{transform:scale(1)}45%{transform:scale(1.24)}100%{transform:scale(1.12)}}
  @keyframes ev-cm-halo{0%{box-shadow:0 0 0 0 rgba(74,93,78,.35)}100%{box-shadow:0 0 0 16px rgba(74,93,78,0)}}
  .ev-cm-nodo.on .ev-cm-c{animation:ev-cm-pop .5s cubic-bezier(.2,.9,.25,1.3) both,ev-cm-halo 1.2s ease-out .1s}
  .ev-cm-punta{animation:ev-cm-halo 1.4s ease-out infinite}
}
.ev-cm.vacia .ev-cm-raya span,.ev-cm.a-mano .ev-cm-raya span{transition:transform .45s cubic-bezier(.65,0,.35,1)}
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
.ev-cm-bloque{width:100%;max-width:760px;display:flex;flex-direction:column;filter:drop-shadow(0 26px 40px rgba(28,26,23,.12))}
.ev-cm-paneles{display:grid;width:100%}
.ev-fi{list-style:none;margin:0;padding:6px clamp(18px,3vw,34px) 10px;background:#fff;border:1px solid #E7E2D9;border-top:1px dashed #D5CFC4;border-radius:0 0 3px 3px;display:grid;grid-template-columns:1fr}
.ev-fi-d{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;gap:16px;padding:14px 0}
.ev-fi-d+.ev-fi-d{border-top:1px solid #F1EFE9}
.ev-fi-ic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#EEF2EC;color:#4A5D4E;transition:background .3s,color .3s,transform .4s cubic-bezier(.2,.9,.25,1.3)}
.ev-fi-ic svg{width:21px;height:21px}
.ev-fi-d:hover .ev-fi-ic{background:#4A5D4E;color:#FAF8F4;transform:rotate(-8deg) scale(1.06)}
.ev-fi-tx{display:flex;flex-direction:column;gap:2px;min-width:0}
.ev-fi-k{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.ev-fi-v{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:clamp(20px,2.2vw,24px);line-height:1.2;color:#1C1A17;text-wrap:balance}
@media (prefers-reduced-motion:no-preference){
  .ev-js .ev-fi-d{opacity:0;transform:translateX(-14px);transition:opacity .6s calc(.3s + var(--k)*.12s),transform .6s cubic-bezier(.2,.7,.2,1) calc(.3s + var(--k)*.12s)}
  .ev-js .ev-cm-bloque.ev-vis .ev-fi-d{opacity:1;transform:none}
}
.ev-cm-paneles{display:grid;width:100%}
.ev-cm-panel{grid-area:1/1;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:clamp(22px,3vw,32px) clamp(18px,3vw,36px);background:#fff;border:1px solid #E7E2D9;border-bottom:0;border-radius:3px 3px 0 0;opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .5s,transform .5s cubic-bezier(.2,.7,.2,1),visibility 0s .5s}
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
