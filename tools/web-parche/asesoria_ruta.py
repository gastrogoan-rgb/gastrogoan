"""«Método 360º» de Asesoría: cabecera centrada con gancho, el anillo de las seis áreas y la
ruta de las cinco fases, con movimiento al ir bajando (técnicas de dalavez.com: entradas con
IntersectionObserver, cifra que cuenta, cascadas; todo apagado con «reducir movimiento»).
Sin JavaScript se ve TODO, quieto: lo que se esconde para animarlo solo se esconde si el script
ha arrancado (clase gg-js)."""
import re, math, html as H

T = {
 'es': dict(et='Método 360º', hook='Un método. Seis áreas. <span class="gg-hl">Ningún ángulo muerto.</span>',
            areas='Las seis áreas que evalúo', centro='de tu negocio', fases_sub='Cinco fases, de la primera visita al cambio hecho'),
 'ca': dict(et='Mètode 360º', hook='Un mètode. Sis àrees. <span class="gg-hl">Cap angle mort.</span>',
            areas='Les sis àrees que avaluo', centro='del teu negoci', fases_sub='Cinc fases, de la primera visita al canvi fet'),
 'en': dict(et='The 360º method', hook='One method. Six areas. <span class="gg-hl">No blind spots.</span>',
            areas='The six areas I evaluate', centro='of your business', fases_sub='Five phases, from the first visit to the change done'),
}

def div_equilibrado(s, i):
    """Devuelve el <div …>…</div> completo que empieza en i."""
    n = 0; k = i
    for m in re.finditer(r'<div\b|</div>', s[i:]):
        n += 1 if m.group(0) == '<div' else -1
        if n == 0:
            return s[i:i + m.end()]
    raise ValueError('div sin cerrar')

def ruta(sec, l):
    t = T[l]
    h2 = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    intro = re.search(r'<p[^>]*>(.*?)</p>', sec, re.S).group(1)
    areas = re.findall(r'<span[^>]*>(0\d)</span><span[^>]*>([^<]+)</span>', sec)
    fases = re.findall(r'<span[^>]*>((?:Fase|Phase) \d)</span>\s*<span[^>]*>([^<]+)</span>\s*<p[^>]*>(.*?)</p>', sec, re.S)
    assert len(areas) == 6 and len(fases) == 5, (len(areas), len(fases))
    # bloque «Aperturas» tal cual (es el div oscuro del final)
    k = sec.rfind('<div', 0, sec.index('Pregúnta' if l == 'es' else ('Pregunta' if l == 'ca' else 'Ask me')))
    while 'background:#1C1A17' not in sec[k:k + 400] and 'background: #1C1A17' not in sec[k:k + 400]:
        k = sec.rfind('<div', 0, k)
    aperturas = div_equilibrado(sec, k)

    puntos = ''
    for i, (n, nombre) in enumerate(areas):
        a = math.radians(-90 + i * 60)
        x, y = 50 + 50 * math.cos(a), 50 + 50 * math.sin(a)
        puntos += f'<span class="gg-anillo-p" data-i="{i}" style="left:{x:.2f}%;top:{y:.2f}%;--d:{0.35 + i * 0.18:.2f}s">{n}</span>'
    chips = ''.join(f'<li class="gg-area gg-rev" data-i="{i}" style="--d:{0.35 + i * 0.18:.2f}s"><span class="gg-area-n">{n}</span><span class="gg-area-t">{nombre}</span></li>' for i, (n, nombre) in enumerate(areas))
    filas = ''
    for i, (et, ti, tx) in enumerate(fases):
        lado = 'izq' if i % 2 == 0 else 'der'
        filas += f'''<li class="gg-fase gg-fase-{lado}">
          <span class="gg-fase-nodo">{i + 1:02d}</span>
          <div class="gg-fase-card gg-rev"><span class="gg-fase-et">{et}</span><h4>{ti}</h4><p>{tx}</p></div>
        </li>'''
    return f'''<!-- ruta 360 -->
  <section class="gg-metodo" style="border-bottom:1px solid #E7E2D9;">
    <header class="gg-met-cab">
      <span class="gg-met-et gg-rev">{t['et']}</span>
      <h2 class="gg-met-hook gg-rev" style="--d:.08s">{t['hook']}</h2>
      <p class="gg-met-intro gg-rev" style="--d:.16s">{intro}</p>
    </header>

    <div class="gg-areas-bloque">
      <h3 class="gg-met-sub gg-rev">{t['areas']}</h3>
      <div class="gg-anillo gg-rev" aria-hidden="true">
        <svg viewBox="0 0 200 200"><circle class="gg-anillo-base" cx="100" cy="100" r="96"/><circle class="gg-anillo-trazo" cx="100" cy="100" r="96"/></svg>
        {puntos}
        <div class="gg-anillo-centro"><b><span class="gg-cuenta" data-final="360">360</span>º</b><small>{t['centro']}</small></div>
      </div>
      <ol class="gg-areas">{chips}</ol>
    </div>

    <div class="gg-fases-bloque">
      <h3 class="gg-met-sub gg-rev">{h2}</h3>
      <p class="gg-met-mini gg-rev" style="--d:.08s">{t['fases_sub']}</p>
      <ol class="gg-fases"><span class="gg-fases-linea" aria-hidden="true"><span></span></span>{filas}</ol>
    </div>

    <div class="gg-aperturas gg-rev">{aperturas}</div>
    <script>
    /* La página se monta en dos tiempos (el «bundle» vuelve a crear el contenido después de cargar),
       así que NO se guardan referencias a elementos: en cada fotograma se busca lo que hay en
       pantalla. Sin IntersectionObserver: con ~20 elementos, medirlos al hacer scroll es barato. */
    (function(){{
      if(window.__ggMetodo) return; window.__ggMetodo=1;
      var quieto=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
      var t0=performance.now();
      function q(s,r){{return (r||document).querySelector(s)}}
      function qa(s,r){{return [].slice.call((r||document).querySelectorAll(s))}}
      function pinta(){{
        var S=q('.gg-metodo'); if(!S) return;
        var vh=innerHeight;
        if(!quieto&&!S.classList.contains('gg-js')) S.classList.add('gg-js');
        qa('.gg-rev:not(.gg-vis)',S).forEach(function(e){{
          var r=e.getBoundingClientRect();
          if(quieto||r.top<vh*0.94||performance.now()-t0>15000) e.classList.add('gg-vis');
        }});
        var lista=q('.gg-fases',S), linea=q('.gg-fases-linea',S);
        if(lista&&linea){{
          var r=lista.getBoundingClientRect(), mid=vh*0.6;
          linea.style.setProperty('--p',Math.max(0,Math.min(1,(mid-r.top)/r.height)).toFixed(4));
          qa('.gg-fase-nodo',S).forEach(function(n){{var b=n.getBoundingClientRect();n.classList.toggle('on',b.top+b.height/2<mid)}});
        }}
        var c=q('.gg-cuenta',S), an=q('.gg-anillo',S);
        if(c&&an&&!c.dataset.hecho&&an.classList.contains('gg-vis')){{
          c.dataset.hecho=1; var fin=+c.dataset.final;
          if(quieto){{c.textContent=fin}} else {{var a=performance.now();
            (function paso(t){{var k=Math.min(1,(t-a)/1500);c.textContent=Math.round(fin*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(paso);else c.textContent=fin}})(a);}}
        }}
      }}
      var pend=false; function pide(){{if(!pend){{pend=true;requestAnimationFrame(function(){{pend=false;pinta()}})}}}}
      addEventListener('scroll',pide,{{passive:true}}); addEventListener('resize',pide);
      // mientras la página termina de montarse, y por si no hay scroll
      var n=0, iv=setInterval(function(){{pinta(); if(++n>40) clearInterval(iv)}},250);
      setTimeout(pinta,15200);
      // pasar por un área la resalta en el anillo
      document.addEventListener('mouseover',function(ev){{
        var a=ev.target.closest&&ev.target.closest('.gg-area'); qa('.gg-anillo-p.on').forEach(function(p){{p.classList.remove('on')}});
        if(a){{var p=q('.gg-anillo-p[data-i="'+a.dataset.i+'"]'); p&&p.classList.add('on')}}
      }});
    }})();
    </script>
  </section>

  '''

CSS = '''
/* ---------- Método 360º ---------- */
.gg-metodo{padding:clamp(56px,7vw,104px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(56px,7vw,96px);text-align:center;overflow:hidden}
.gg-met-cab{display:flex;flex-direction:column;align-items:center;gap:18px;max-width:760px}
.gg-met-et{display:inline-flex;align-items:center;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
.gg-met-et::before,.gg-met-et::after{content:"";width:28px;height:2px;background:#4A5D4E}
.gg-met-hook{margin:0;font-size:clamp(28px,4.4vw,52px);line-height:1.12;font-weight:700;letter-spacing:-.03em;color:#1C1A17;text-wrap:balance}
.gg-hl{display:inline;background:#4A5D4E;color:#FAF8F4;padding:0 .14em;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:2px}
.gg-met-intro{margin:0;font-size:17px;line-height:1.6;color:#3D3A34;max-width:620px;text-wrap:pretty}
.gg-met-sub{margin:0;font-size:clamp(22px,2.6vw,30px);font-weight:700;letter-spacing:-.02em;color:#1C1A17}
.gg-met-mini{margin:-6px 0 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
/* anillo de las seis áreas */
.gg-areas-bloque,.gg-fases-bloque{display:flex;flex-direction:column;align-items:center;gap:28px;width:100%;max-width:980px}
.gg-anillo{position:relative;width:clamp(230px,34vw,320px);aspect-ratio:1;margin:22px 0}
.gg-anillo svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.gg-anillo-base{fill:none;stroke:#E7E2D9;stroke-width:2}
.gg-anillo-trazo{fill:none;stroke:#4A5D4E;stroke-width:2.5;stroke-dasharray:603.2;stroke-dashoffset:0;stroke-linecap:round}
.gg-anillo-p{position:absolute;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;border:2px solid #4A5D4E;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#4A5D4E;transition:background .25s,color .25s,transform .25s}
.gg-anillo-p.on{background:#4A5D4E;color:#FAF8F4;transform:scale(1.15)}
.gg-anillo-centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.gg-anillo-centro b{font-size:clamp(40px,6vw,60px);font-weight:700;letter-spacing:-.04em;line-height:1;color:#1C1A17;font-variant-numeric:tabular-nums}
.gg-anillo-centro small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.gg-areas{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:100%;max-width:760px}
.gg-area{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fff;border:1px solid #E7E2D9;border-radius:3px;text-align:left;min-height:56px;transition:border-color .25s,transform .25s,box-shadow .25s}
.gg-area:hover{border-color:#4A5D4E;transform:translateY(-2px);box-shadow:0 10px 22px -16px rgba(28,26,23,.5)}
.gg-area-n{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#4A5D4E}
.gg-area-t{font-size:16px;font-weight:600;letter-spacing:-.01em;color:#1C1A17}
/* ruta de las cinco fases */
.gg-fases{position:relative;list-style:none;margin:8px 0 0;padding:0;width:100%;max-width:900px;display:flex;flex-direction:column;gap:clamp(18px,2.4vw,28px)}
.gg-fases-linea{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:#E7E2D9}
.gg-fases-linea>span{position:absolute;inset:0;background:#4A5D4E;transform-origin:top;transform:scaleY(var(--p,0));transition:transform .15s linear}
.gg-fase{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 64px minmax(0,1fr);align-items:center}
.gg-fase-nodo{grid-column:2;grid-row:1;justify-self:center;position:relative;z-index:1;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;border:2px solid #C9D3CB;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#716C65;transition:background .3s,border-color .3s,color .3s,transform .3s}
.gg-fase-nodo.on{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:scale(1.08)}
.gg-fase-card{grid-row:1;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:20px 22px;text-align:left;display:flex;flex-direction:column;gap:6px;transition:border-color .25s,box-shadow .25s}
.gg-fase-card:hover{border-color:#4A5D4E;box-shadow:0 14px 30px -20px rgba(28,26,23,.45)}
.gg-fase-izq .gg-fase-card{grid-column:1}
.gg-fase-der .gg-fase-card{grid-column:3}
.gg-fase-et{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.gg-fase-card h4{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em;color:#1C1A17}
.gg-fase-card p{margin:0;font-size:15px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
.gg-aperturas{width:100%;max-width:980px;text-align:left}
@media (max-width:720px){
  .gg-areas{grid-template-columns:repeat(2,minmax(0,1fr))}
  .gg-anillo-p{width:38px;height:38px;margin:-19px 0 0 -19px;font-size:11px}
  .gg-fases-linea{left:22px}
  .gg-fase{grid-template-columns:44px minmax(0,1fr);column-gap:14px;align-items:start}
  .gg-fase-nodo{grid-column:1}
  .gg-fase-izq .gg-fase-card,.gg-fase-der .gg-fase-card{grid-column:2}
}
/* movimiento: solo con JS en marcha y sin «reducir movimiento» */
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-rev{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0s)}
  .gg-js .gg-fase-izq .gg-fase-card.gg-rev{transform:translateX(-36px)}
  .gg-js .gg-fase-der .gg-fase-card.gg-rev{transform:translateX(36px)}
  .gg-js .gg-rev.gg-vis,.gg-js .gg-fase .gg-fase-card.gg-rev.gg-vis{opacity:1;transform:none}
  .gg-js .gg-anillo .gg-anillo-trazo{stroke-dashoffset:603.2;transition:stroke-dashoffset 1.6s cubic-bezier(.65,0,.35,1) .2s}
  .gg-js .gg-anillo.gg-vis .gg-anillo-trazo{stroke-dashoffset:0}
  .gg-js .gg-anillo .gg-anillo-p{opacity:0;transform:scale(.4)}
  .gg-js .gg-anillo.gg-vis .gg-anillo-p{animation:gg-pop .5s cubic-bezier(.2,.9,.25,1.25) var(--d) both}
  @keyframes gg-pop{0%{opacity:0;transform:scale(.4)}100%{opacity:1;transform:none}}
  .gg-js .gg-anillo.gg-vis .gg-anillo-p.on{transform:scale(1.15)}
  @media (max-width:720px){.gg-js .gg-fase-izq .gg-fase-card.gg-rev:not(.gg-vis),.gg-js .gg-fase-der .gg-fase-card.gg-rev:not(.gg-vis){transform:translateX(24px)}}
}
'''
