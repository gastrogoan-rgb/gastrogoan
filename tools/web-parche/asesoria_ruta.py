"""«Método 360º» de Asesoría: cabecera centrada con gancho, el anillo de las seis áreas y la
ruta de las cinco fases, con movimiento al ir bajando (técnicas de dalavez.com: entradas con
IntersectionObserver, cifra que cuenta, cascadas; todo apagado con «reducir movimiento»).
Sin JavaScript se ve TODO, quieto: lo que se esconde para animarlo solo se esconde si el script
ha arrancado (clase gg-js)."""
import re, math, html as H

T = {
 'es': dict(et='Método 360º', hook='Miro tu negocio <span class="gg-hl">entero</span>, no solo lo que se ve.',
            areas='Las seis áreas que evalúo', centro='de tu negocio', fases_sub='Cinco fases, de la primera visita al cambio hecho'),
 'ca': dict(et='Mètode 360º', hook='Miro el teu negoci <span class="gg-hl">sencer</span>, no només el que es veu.',
            areas='Les sis àrees que avaluo', centro='del teu negoci', fases_sub='Cinc fases, de la primera visita al canvi fet'),
 'en': dict(et='The 360º method', hook='I look at your <span class="gg-hl">whole</span> business, not just what shows.',
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
    import asesoria_extras
    extras_js = asesoria_extras.JS.replace('{{', '{').replace('}}', '}')
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
        puntos += f'<span class="gg-anillo-p" data-i="{i}" style="left:{x:.2f}%;top:{y:.2f}%;--d:{0.35 + i * 0.18:.2f}s"><span class="gg-anillo-in"><em>{n}</em>{nombre}</span></span>'
    filas = ''
    for i, (et, ti, tx) in enumerate(fases):
        lado = 'izq' if i % 2 == 0 else 'der'
        filas += f'''<li class="gg-fase gg-fase-{lado}">
          <span class="gg-fase-nodo">{i + 1:02d}</span>
          <div class="gg-fase-card gg-rev" style="--d:{0.1 + i * 0.12:.2f}s"><span class="gg-fase-et">{et}</span><h4>{ti}</h4><p>{tx}</p></div>
        </li>'''
    return f'''<!-- ruta 360 -->
  <section class="gg-metodo gg-anim">
    <div class="gg-met-fila">
    <header class="gg-met-cab">
      <span class="gg-met-et gg-rev">{t['et']}</span>
      <h2 class="gg-met-hook gg-rev" style="--d:.08s">{t['hook']}</h2>
      <p class="gg-met-intro gg-rev" style="--d:.16s">{intro}</p>
    </header>

    <div class="gg-areas-bloque">
      <h3 class="gg-met-sub gg-rev">{t['areas']}</h3>
      <div class="gg-anillo gg-rev">
        <div class="gg-anillo-centro"><b>360º</b><small>{t['centro']}</small></div>
        <div class="gg-anillo-giro"><svg viewBox="0 0 200 200"><circle class="gg-anillo-base" cx="100" cy="100" r="96"/><circle class="gg-anillo-trazo" cx="100" cy="100" r="96"/></svg>
        {puntos}</div>
      </div>
    </div>
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
        var vh=innerHeight;
        qa('.gg-anim').forEach(function(S){{
          if(!quieto&&!S.classList.contains('gg-js')) S.classList.add('gg-js');
          qa('.gg-rev:not(.gg-vis)',S).forEach(function(e){{
            var r=e.getBoundingClientRect();
            if(quieto||r.top<vh*0.92||performance.now()-t0>15000) e.classList.add('gg-vis');
          }});
        }});
        var S=q('.gg-metodo'); if(!S) return;
        var lista=q('.gg-fases',S), linea=q('.gg-fases-linea',S);
        if(lista&&linea){{
          var r=lista.getBoundingClientRect(), nodos=qa('.gg-fase-nodo',S), p;
          var horiz=getComputedStyle(lista).flexDirection==='row';
          if(horiz){{
            // en PC la ruta es horizontal: se llena de izquierda a derecha mientras la sección sube
            p=Math.max(0,Math.min(1,(vh*0.9-r.top)/(vh*0.5)));
            nodos.forEach(function(n,k){{n.classList.toggle('on',p>=k/(nodos.length-1)-0.001&&p>0)}});
          }} else {{
            var mid=vh*0.6; p=Math.max(0,Math.min(1,(mid-r.top)/r.height));
            nodos.forEach(function(n){{var b=n.getBoundingClientRect();n.classList.toggle('on',b.top+b.height/2<mid)}});
          }}
          linea.style.setProperty('--p',p.toFixed(4));
        }}
      }}
{extras_js}      var pend=false; function pide(){{if(!pend){{pend=true;requestAnimationFrame(function(){{pend=false;pinta()}})}}}}
      addEventListener('scroll',pide,{{passive:true}}); addEventListener('resize',pide);
      // mientras la página termina de montarse, y por si no hay scroll
      var n=0, iv=setInterval(function(){{pinta(); if(++n>40) clearInterval(iv)}},250);
      setTimeout(pinta,15200);
    }})();
    </script>
  </section>

  '''

CSS = '''
/* ---------- Método 360º ---------- */
.gg-metodo{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);display:flex;flex-direction:column;align-items:center;gap:clamp(44px,5vw,68px);text-align:center;overflow:hidden}
.gg-met-cab{display:flex;flex-direction:column;align-items:center;gap:16px;max-width:760px}
.gg-met-et{display:inline-flex;align-items:center;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
.gg-met-et::before,.gg-met-et::after{content:"";width:28px;height:2px;background:#4A5D4E}
.gg-met-hook{margin:0;font-size:clamp(28px,4.4vw,52px);line-height:1.12;font-weight:700;letter-spacing:-.03em;color:#1C1A17;text-wrap:balance}
.gg-hl{display:inline;background:#4A5D4E;color:#FAF8F4;padding:0 .14em;-webkit-box-decoration-break:clone;box-decoration-break:clone;border-radius:2px}
.gg-met-intro{margin:0;font-size:17px;line-height:1.6;color:#3D3A34;max-width:620px;text-wrap:pretty}
.gg-met-sub{margin:0;font-size:clamp(22px,2.6vw,30px);font-weight:700;letter-spacing:-.02em;color:#1C1A17}
.gg-met-mini{margin:-8px 0 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.gg-areas-bloque,.gg-fases-bloque{display:flex;flex-direction:column;align-items:center;gap:22px;width:100%;max-width:1080px}
/* anillo de las seis áreas: cada punto lleva el número y el nombre del área */
.gg-anillo{position:relative;width:clamp(260px,38vw,320px);aspect-ratio:1;margin:30px 0 34px}
.gg-anillo svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);overflow:visible}
.gg-anillo-base{fill:none;stroke:#E7E2D9;stroke-width:2}
.gg-anillo-trazo{fill:none;stroke:#4A5D4E;stroke-width:2.5;stroke-dasharray:603.2;stroke-dashoffset:0;stroke-linecap:round}
/* El centro va DEBAJO y no recibe el ratón: antes tapaba media pastilla y solo se marcaban
   en verde las que se tocaban por el borde de fuera. */
.gg-anillo-giro{position:absolute;inset:0;z-index:1}
.gg-anillo-centro{z-index:0;pointer-events:none}
.gg-anillo-p{position:absolute;transform:translate(-50%,-50%);display:block;cursor:default}
/* la pastilla se dibuja en el interior, que gira al revés: así queda siempre derecha */
.gg-anillo-in{display:inline-flex;align-items:center;gap:7px;max-width:124px;padding:7px 13px;border-radius:999px;background:#FAF8F4;border:2px solid #4A5D4E;font-size:14px;font-weight:600;letter-spacing:-.01em;color:#1C1A17;line-height:1.15;text-align:left;white-space:normal;transition:background .25s,color .25s,box-shadow .25s}
.gg-anillo-p em{font-style:normal;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:400;color:#4A5D4E;transition:color .25s}
.gg-anillo-p:hover .gg-anillo-in{background:#4A5D4E;color:#FAF8F4;box-shadow:0 10px 22px -14px rgba(28,26,23,.6)}
.gg-anillo-p:hover em{color:#C9D3CB}
.gg-anillo-centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.gg-anillo-centro b{font-size:clamp(38px,5.4vw,58px);font-weight:700;letter-spacing:-.04em;line-height:1;color:#1C1A17;font-variant-numeric:tabular-nums}
.gg-anillo-centro small{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65;max-width:104px;text-align:center;line-height:1.35}
/* ruta de las cinco fases: vertical en móvil y tablet, horizontal en PC (sin huecos en blanco) */
.gg-fases{position:relative;list-style:none;margin:6px 0 0;padding:0;width:100%;max-width:720px;display:flex;flex-direction:column;gap:18px}
.gg-fases-linea{position:absolute;left:22px;top:0;bottom:0;width:2px;margin-left:-1px;background:#E7E2D9}
.gg-fases-linea>span{position:absolute;inset:0;background:#4A5D4E;transform-origin:top;transform:scaleY(var(--p,0));transition:transform .15s linear}
.gg-fase{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);column-gap:16px;align-items:start}
.gg-fase-nodo{grid-column:1;grid-row:1;position:relative;z-index:1;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;border:2px solid #C9D3CB;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#716C65;transition:background .3s,border-color .3s,color .3s,transform .3s}
.gg-fase-nodo.on{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:scale(1.08)}
.gg-fase-card{grid-column:2;grid-row:1;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:18px 20px;text-align:left;display:flex;flex-direction:column;gap:6px;transition:border-color .25s,box-shadow .25s,transform .25s}
.gg-fase-card:hover{border-color:#4A5D4E;box-shadow:0 14px 30px -20px rgba(28,26,23,.45)}
.gg-fase-et{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.gg-fase-card h4{margin:0;font-size:18px;font-weight:700;letter-spacing:-.01em;color:#1C1A17}
.gg-fase-card p{margin:0;font-size:15px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
@media (min-width:1100px){
  .gg-fases{flex-direction:row;max-width:1080px;gap:14px;align-items:stretch}
  .gg-fases-linea{left:0;right:0;top:22px;bottom:auto;width:auto;height:2px;margin:0}
  .gg-fases-linea>span{transform-origin:left;transform:scaleX(var(--p,0))}
  .gg-fase{flex:1;grid-template-columns:1fr;grid-template-rows:44px 1fr;row-gap:16px;justify-items:center}
  .gg-fase-nodo{grid-column:1;grid-row:1}
  .gg-fase-card{grid-column:1;grid-row:2;width:100%;height:100%;box-sizing:border-box}
  .gg-fase-card:hover{transform:translateY(-4px)}
}
.gg-aperturas{width:100%;max-width:1080px;text-align:left}
/* PC y tablet ancha: título y texto a la izquierda, la rueda de las seis áreas a la derecha (pedido del dueño, 17/11) */
.gg-met-fila{width:100%;max-width:1080px;display:flex;flex-direction:column;align-items:center;gap:clamp(30px,4vw,48px)}
@media (min-width:900px){
  .gg-met-fila{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center;gap:clamp(32px,5vw,72px)}
  .gg-met-fila .gg-met-cab{align-items:flex-start;text-align:left;max-width:none}
  .gg-met-fila .gg-met-cab .gg-met-et::after{display:none}
  .gg-met-fila .gg-met-hook{text-wrap:pretty;font-size:clamp(28px,3.3vw,44px)}
  .gg-met-fila .gg-areas-bloque{gap:8px}
  .gg-met-fila .gg-areas-bloque>.gg-met-sub{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:400;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
}
@media (max-width:720px){
  .gg-anillo{width:min(250px,66vw);margin:40px 0 46px}
  .gg-anillo-in{max-width:92px;padding:5px 9px;font-size:12px;gap:5px;border-radius:16px}
  .gg-anillo-p em{font-size:11px}
}
/* Móvil estrecho: sin el número (ya va en orden) y centro más pequeño, para que al girar ninguna
   pastilla pise a la de al lado ni al 360º. */
@media (max-width:420px){
  .gg-anillo-p em{display:none}
  .gg-anillo-in{text-align:center;justify-content:center}
  .gg-anillo-centro b{font-size:32px}
  .gg-anillo-centro small{letter-spacing:.06em;max-width:96px;text-align:center;line-height:1.35}
}
/* movimiento: solo con JS en marcha y sin «reducir movimiento» */
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-rev{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1) var(--d,0s),transform .7s cubic-bezier(.2,.7,.2,1) var(--d,0s)}
  .gg-js .gg-rev.gg-vis{opacity:1;transform:none}
  .gg-js .gg-anillo .gg-anillo-trazo{stroke-dashoffset:603.2;transition:stroke-dashoffset 1.6s cubic-bezier(.65,0,.35,1) .2s}
  .gg-js .gg-anillo.gg-vis .gg-anillo-trazo{stroke-dashoffset:0}
  .gg-js .gg-anillo .gg-anillo-p{opacity:0}
  .gg-js .gg-anillo.gg-vis .gg-anillo-p{animation:gg-pop .55s cubic-bezier(.2,.9,.25,1.25) var(--d) both}
  /* La rueda gira despacio todo el rato; los nombres giran al revés para leerse siempre de pie.
     Al pasar el ratón se para, para poder señalar cada área. */
  @keyframes gg-gira{to{transform:rotate(360deg)}}
  @keyframes gg-gira-inv{to{transform:rotate(-360deg)}}
  .gg-anillo-giro{animation:gg-gira 60s linear infinite}
  .gg-anillo-in{animation:gg-gira-inv 60s linear infinite}
  .gg-anillo:hover .gg-anillo-giro,.gg-anillo:hover .gg-anillo-in{animation-play-state:paused}
  @keyframes gg-pop{0%{opacity:0;transform:translate(-50%,-50%) scale(.4)}100%{opacity:1;transform:translate(-50%,-50%)}}
}
'''
