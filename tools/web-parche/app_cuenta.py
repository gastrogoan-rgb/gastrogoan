"""Página App · «El problema» + «Tu solución» en UNA sección que se toca (pedido del dueño, 16/11:
«han de ver cuál es el problema y que GastroGoan App es su solución; interacción y transacción»).

- El problema es un RECIBO de lo que paga hoy: cada suscripción con su casilla (¿la pagas?) y su
  importe editable («pon tus cifras»). El total al mes y al año se recalcula al momento.
- La transacción: el interruptor «Lo que pagas hoy | Con GastroGoan App». Al pasar a GastroGoan,
  las líneas se tachan una a una con un sello «Incluido», el total se tacha y aparece 240 €/año.
  Pasa sola la primera vez que el recibo entra en pantalla; luego la decide quien mira.
- Debajo, la cuenta final con lo que ESA persona ha puesto: antes / con GastroGoan / te ahorras.
Sin JavaScript se ve el recibo típico con su total, y la solución con sus cifras."""

FILAS = {
 'es': [('Software TPV', 99), ('Plataformas de delivery', 99), ('Carta digital / QR', 20), ('Página de reservas', 30), ('Gestión del personal', 40), ('Gestión económica', 40)],
 'ca': [('Software TPV', 99), ('Plataformes de delivery', 99), ('Carta digital / QR', 20), ('Pàgina de reserves', 30), ('Gestió del personal', 40), ('Gestió econòmica', 40)],
 'en': [('POS software', 99), ('Delivery platforms', 99), ('Digital menu / QR', 20), ('Booking page', 30), ('Staff management', 40), ('Financial management', 40)],
}
T = {
 'es': dict(et='El problema', h2='¿Cuántas apps estás pagando ahora?',
            p='Cada mes, sin que casi te des cuenta, las suscripciones se quedan una parte de lo que has ganado. Esta es la cuenta típica de un local. <b>Marca las que pagas y pon tus cifras.</b>',
            hoy='Lo que pagas hoy', gg='Con GastroGoan App', recibo='Tus suscripciones', mes='€/mes', inc='Incluido',
            total='Total', al_mes='al mes', al_anio='al año', todo='Todo lo anterior', pide='Pásalo a GastroGoan App',
            et2='Tu solución', antes='Antes · varias apps', antes_s='Cada mes. Para siempre.', con='Con GastroGoan App',
            con_s='Cada año. Todo incluido.', ahorras='Te ahorras', cada_anio='cada año', loc='es-ES', pre='', suf=' €',
            pista='Toca una cifra para poner la tuya', casilla='¿Pagas {n}?', importe='Importe al mes de {n}'),
 'ca': dict(et='El problema', h2='Quantes apps estàs pagant ara?',
            p="Cada mes, gairebé sense adonar-te'n, les subscripcions es queden una part del que has guanyat. Aquest és el compte típic d'un local. <b>Marca les que pagues i posa-hi les teves xifres.</b>",
            hoy='El que pagues avui', gg='Amb GastroGoan App', recibo='Les teves subscripcions', mes='€/mes', inc='Inclòs',
            total='Total', al_mes='al mes', al_anio="a l'any", todo='Tot això', pide='Passa-ho a GastroGoan App',
            et2='La teva solució', antes='Abans · diverses apps', antes_s='Cada mes. Per sempre.', con='Amb GastroGoan App',
            con_s='Cada any. Tot inclòs.', ahorras="T'estalvies", cada_anio='cada any', loc='ca-ES', pre='', suf=' €',
            pista='Toca una xifra per posar-hi la teva', casilla='Pagues {n}?', importe='Import al mes de {n}'),
 'en': dict(et='The problem', h2='How many apps are you paying for right now?',
            p="Every month, almost without noticing, subscriptions take a cut of what you've earned. This is the typical bill for a venue. <b>Tick the ones you pay and enter your own figures.</b>",
            hoy='What you pay today', gg='With GastroGoan App', recibo='Your subscriptions', mes='€/month', inc='Included',
            total='Total', al_mes='per month', al_anio='per year', todo='All of the above', pide='Switch to GastroGoan App',
            et2='Your solution', antes='Before · several apps', antes_s='Every month. Forever.', con='With GastroGoan App',
            con_s='Every year. Everything included.', ahorras='You save', cada_anio='every year', loc='en-GB', pre='€', suf='',
            pista='Tap a figure to enter your own', casilla='Do you pay for {n}?', importe='Monthly cost of {n}'),
}
PRECIO = 240


def cuenta(l):
    x = T[l]; filas = FILAS[l]
    def din(n):
        s = f'{n:,}'.replace(',', '.' if l != 'en' else ',')
        return f"{x['pre']}{s}{x['suf']}"
    tot = sum(v for _, v in filas)
    lis = ''.join(f'''<li class="gg-pr-fila" style="--k:{k}">
          <label class="gg-pr-chk"><input type="checkbox" data-on="1" aria-label="{x['casilla'].format(n=n)}"><span class="gg-pr-box" aria-hidden="true"></span><span class="gg-pr-n">{n}</span></label>
          <span class="gg-pr-imp"><input type="number" min="0" max="9999" step="1" inputmode="numeric" data-v="{v}" aria-label="{x['importe'].format(n=n)}"><span class="gg-pr-u">{x['mes']}</span></span>
          <span class="gg-pr-inc" aria-hidden="true">{x['inc']}</span>
        </li>''' for k, (n, v) in enumerate(filas))
    return f'''<!-- problema y solución: la cuenta que se toca -->
  <section class="gg-pr gg-anim" data-loc="{x['loc']}" data-pre="{x['pre']}" data-suf="{x['suf']}" data-precio="{PRECIO}">
    <div class="gg-pr-cab">
      <span class="gg-met-et gg-app-rev">{x['et']}</span>
      <h2 class="gg-pr-h gg-app-rev" style="--d:.08s">{x['h2']}</h2>
      <p class="gg-pr-p gg-app-rev" style="--d:.16s">{x['p']}</p>
    </div>

    <div class="gg-pr-recibo gg-app-rev" style="--d:.24s" data-modo="hoy">
      <div class="gg-pr-sw" role="group">
        <button type="button" class="gg-pr-sw-b on" data-modo="hoy" aria-pressed="true">{x['hoy']}</button>
        <button type="button" class="gg-pr-sw-b" data-modo="gg" aria-pressed="false">{x['gg']}</button>
        <span class="gg-pr-sw-p" aria-hidden="true"></span>
      </div>
      <div class="gg-pr-hoja">
        <div class="gg-pr-tit"><span>{x['recibo']}</span><span class="gg-pr-cnt"><b class="gg-pr-num">{len(filas)}</b> / {len(filas)}</span></div>
        <ul class="gg-pr-lista">{lis}</ul>
        <p class="gg-pr-pista"><span aria-hidden="true">✎</span> {x['pista']}</p>
        <div class="gg-pr-total">
          <span class="gg-pr-tl">{x['total']}</span>
          <span class="gg-pr-tv"><b class="gg-pr-mes">{din(tot)}</b> <small>{x['al_mes']}</small></span>
          <span class="gg-pr-ta"><b class="gg-pr-anio">{din(tot * 12)}</b> {x['al_anio']}</span>
        </div>
        <div class="gg-pr-gg" aria-live="polite"><div class="gg-pr-gg-in">
          <span class="gg-pr-gg-l"><span class="gg-pr-logo">gastro<b>goan</b><i>.</i></span> {x['todo']}</span>
          <span class="gg-pr-gg-v"><b>{din(PRECIO)}</b> {x['al_anio']}</span>
          <span class="gg-pr-gg-ah">{x['ahorras']} <b class="gg-pr-ah-v">{din(tot * 12 - PRECIO)}</b> {x['al_anio']}</span>
        </div></div>
      </div>
      <button type="button" class="gg-pr-pide">{x['pide']} <span class="gg-flecha" aria-hidden="true">→</span></button>
    </div>

    <script>
    /* La cuenta: delegación en document y todo se lee del DOM vivo (la página se monta dos veces). */
    (function(){{
      if(window.__ggPr) return; window.__ggPr=1;
      function S(){{return document.querySelector('.gg-pr')}}
      function din(n,s){{return s.dataset.pre+String(Math.round(n)).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g,s.dataset.loc==='en-GB'?',':'.')+s.dataset.suf}}
      var vivo={{}};
      function cuenta(el,hasta,s){{
        var key=el.className, desde=vivo[key]==null?hasta:vivo[key]; vivo[key]=hasta;
        if(matchMedia('(prefers-reduced-motion: reduce)').matches||desde===hasta){{el.textContent=din(hasta,s);return}}
        var t0=performance.now();
        (function paso(t){{var p=Math.min(1,(t-t0)/450),e=1-Math.pow(1-p,3);el.textContent=din(desde+(hasta-desde)*e,s);if(p<1&&document.body.contains(el))requestAnimationFrame(paso)}})(t0);
      }}
      function recalcula(){{
        var s=S(); if(!s) return;
        var tot=0,n=0;
        s.querySelectorAll('.gg-pr-fila').forEach(function(li){{
          var c=li.querySelector('input[type=checkbox]'), v=li.querySelector('input[type=number]');
          /* el empaquetador de la página se come el atributo «checked»: se marca aquí la primera vez */
          if(c.dataset.on){{c.checked=true;delete c.dataset.on}}
          /* ni «value»: el montador de la página lo reponía en cada tecla y no se podía cambiar la cifra */
          if(v.dataset.v!=null){{v.value=v.dataset.v;delete v.dataset.v}}
          var x=Math.max(0,Math.min(9999,parseFloat(v.value)||0));
          li.classList.toggle('off',!c.checked); v.disabled=!c.checked;
          if(c.checked){{tot+=x;n++}}
        }});
        var precio=+s.dataset.precio, ah=Math.max(0,tot*12-precio);
        s.querySelector('.gg-pr-num').textContent=n;
        cuenta(s.querySelector('.gg-pr-mes'),tot,s); cuenta(s.querySelector('.gg-pr-anio'),tot*12,s);
        cuenta(s.querySelector('.gg-pr-ah-v'),ah,s);
        s.classList.toggle('sin-ahorro',ah<=0);
      }}
      function modo(m){{
        var s=S(); if(!s) return; var r=s.querySelector('.gg-pr-recibo');
        r.dataset.modo=m; s.dataset.auto='1';
        r.querySelectorAll('.gg-pr-sw-b').forEach(function(b){{var on=b.dataset.modo===m;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}});
        r.querySelectorAll('.gg-pr-imp input').forEach(function(i){{i.readOnly=(m==='gg')}});
      }}
      document.addEventListener('input',function(e){{if(e.target.closest&&e.target.closest('.gg-pr-fila'))recalcula()}});
      document.addEventListener('change',function(e){{if(e.target.closest&&e.target.closest('.gg-pr-fila'))recalcula()}});
      /* Tocar una fila con la cuenta ya pasada a GastroGoan la devuelve a «Lo que pagas hoy» para poder cambiarla */
      /* Solo un TOQUE de verdad (click), nunca al empezar a arrastrar: en el móvil, bajar la página
         con el dedo sobre la lista devolvía la cuenta a «Lo que pagas hoy» (lo vio el dueño, 17/11). */
      document.addEventListener('click',function(e){{
        var f=e.target.closest&&e.target.closest('.gg-pr-fila'), r=f&&f.closest('.gg-pr-recibo');
        if(r&&r.dataset.modo==='gg'){{ e.preventDefault(); modo('hoy');   /* ese primer toque solo vuelve a «hoy», no desmarca nada */ var i=f.querySelector('.gg-pr-imp input'); if(i&&!e.target.closest('label')) setTimeout(function(){{i.focus()}},50); }}
      }});
      document.addEventListener('click',function(e){{
        var b=e.target.closest&&e.target.closest('.gg-pr-sw-b'); if(b){{modo(b.dataset.modo);return}}
        if(e.target.closest&&e.target.closest('.gg-pr-pide')) modo('gg');
      }});
      /* La primera vez que el recibo se ve entero (y quieto un momento), la cuenta pasa sola a GastroGoan */
      var visto=0;
      function mira(){{
        var s=S(); if(!s||s.dataset.auto) return; var r=s.querySelector('.gg-pr-hoja').getBoundingClientRect();
        if(r.top<innerHeight*0.55&&r.bottom>0){{ if(!visto) visto=setTimeout(function(){{var s2=S(); if(s2&&!s2.dataset.auto) modo('gg')}},1400) }}
      }}
      addEventListener('scroll',mira,{{passive:true}});
      var k=0, iv=setInterval(function(){{recalcula();mira();if(++k>20)clearInterval(iv)}},300);
    }})();
    </script>
  </section>

  '''


CSS = '''
.gg-met-et{display:inline-flex;align-items:center;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#4A5D4E}
.gg-met-et::before,.gg-met-et::after{content:"";width:28px;height:2px;background:#4A5D4E}
/* ---------- El problema + Tu solución: la cuenta que se toca ---------- */
.gg-pr{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);border-bottom:1px solid #E7E2D9;display:grid;grid-template-columns:1fr;gap:clamp(26px,3.4vw,40px);justify-items:center}
.gg-pr-cab{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;max-width:680px}
.gg-pr-h{margin:0;font-size:clamp(28px,3.6vw,42px);font-weight:700;letter-spacing:-.03em;line-height:1.12;color:#1C1A17;text-wrap:balance}
.gg-pr-p{margin:0;font-size:16px;line-height:1.6;color:#3D3A34;text-wrap:pretty}
.gg-pr-p b{color:#1C1A17}
.gg-pr-recibo{width:100%;max-width:560px;display:flex;flex-direction:column;gap:14px}
/* Interruptor */
.gg-pr-sw{position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;background:#F1EFE9;border:1px solid #E7E2D9;border-radius:3px}
.gg-pr-sw-b{position:relative;z-index:1;min-height:44px;border:0;background:none;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:#716C65;cursor:pointer;transition:color .3s}
.gg-pr-sw-b.on{color:#FAF8F4}
.gg-pr-sw-b:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-pr-sw-p{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);background:#1C1A17;border-radius:2px;transition:transform .45s cubic-bezier(.65,0,.35,1),background .45s}
[data-modo="gg"] .gg-pr-sw-p{transform:translateX(100%);background:#4A5D4E}
/* La hoja (recibo) */
.gg-pr-hoja{position:relative;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:clamp(16px,3vw,26px) clamp(16px,3.4vw,30px) clamp(18px,3vw,26px);box-shadow:0 22px 44px -34px rgba(28,26,23,.5)}
.gg-pr-hoja::after{content:"";position:absolute;left:0;right:0;bottom:-7px;height:8px;background:radial-gradient(circle at 6px -1px,transparent 5px,#fff 5.5px) 0 0/12px 8px repeat-x;filter:drop-shadow(0 1px 0 #E7E2D9)}
.gg-pr-tit{display:flex;justify-content:space-between;align-items:baseline;padding-bottom:12px;border-bottom:1px dashed #D5CFC4;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#716C65}
.gg-pr-cnt b{color:#1C1A17}
.gg-pr-lista{list-style:none;margin:0;padding:0}
.gg-pr-fila{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed #E7E2D9;transition:opacity .3s}
.gg-pr-chk{display:flex;align-items:center;gap:12px;min-height:44px;cursor:pointer;min-width:0}
.gg-pr-chk input{position:absolute;opacity:0;width:1px;height:1px}
.gg-pr-box{flex:none;width:20px;height:20px;border:1.5px solid #1C1A17;border-radius:2px;display:flex;align-items:center;justify-content:center;transition:background .2s,border-color .2s}
.gg-pr-box::after{content:"";width:9px;height:5px;border-left:2px solid #FAF8F4;border-bottom:2px solid #FAF8F4;transform:rotate(-45deg) translate(1px,-1px);opacity:0;transition:opacity .2s}
.gg-pr-chk input:checked+.gg-pr-box{background:#1C1A17}
.gg-pr-chk input:checked+.gg-pr-box::after{opacity:1}
.gg-pr-chk input:focus-visible+.gg-pr-box{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-pr-n{font-size:15.5px;color:#1C1A17;overflow-wrap:break-word;position:relative}
.gg-pr-imp{display:flex;align-items:center;gap:6px;font-family:'IBM Plex Mono',monospace}
.gg-pr-imp input{width:68px;min-height:40px;box-sizing:border-box;padding:0 8px;border:1px solid #E7E2D9;border-radius:3px;background:#FAF8F4;font:inherit;font-size:16px;text-align:right;color:#1C1A17;-moz-appearance:textfield;transition:border-color .2s,background .2s}
.gg-pr-imp input::-webkit-inner-spin-button,.gg-pr-imp input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.gg-pr-imp input:hover{border-color:#C9C2B6}
.gg-pr-imp input:focus{outline:none;border-color:#4A5D4E;background:#fff}
.gg-pr-u{font-size:11px;letter-spacing:.06em;color:#716C65;white-space:nowrap}
.gg-pr-fila.off .gg-pr-n,.gg-pr-fila.off .gg-pr-imp{opacity:.4}
.gg-pr-inc{position:absolute;right:0;top:50%;transform:translateY(-50%) rotate(-4deg) scale(.6);opacity:0;padding:4px 10px;border:1.5px solid #4A5D4E;border-radius:2px;color:#4A5D4E;background:#fff;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;pointer-events:none}
.gg-pr-pista{margin:10px 0 0;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#4A5D4E;transition:opacity .3s}
[data-modo="gg"] .gg-pr-pista{opacity:0}
.gg-pr-imp input{border-style:dashed;border-color:#C9C2B6}
.gg-pr-total{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:2px 12px;padding-top:16px}
.gg-pr-tl{font-weight:700;font-size:15px}
.gg-pr-tv{justify-self:end;font-size:clamp(24px,3vw,30px);font-weight:700;letter-spacing:-.02em;color:#1C1A17;position:relative}
.gg-pr-tv small{font-size:13px;font-weight:500;color:#716C65;letter-spacing:0}
.gg-pr-ta{grid-column:1/-1;justify-self:end;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#716C65}
.gg-pr-ta b{color:#1C1A17;font-weight:600}
.gg-pr-gg{display:grid;grid-template-rows:0fr;opacity:0;margin-top:0;transition:grid-template-rows .5s cubic-bezier(.65,0,.35,1),opacity .4s,margin-top .5s}
.gg-pr-gg>*{overflow:hidden;min-height:0}
.gg-pr-gg-in{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0 12px}
.gg-pr-gg{background:#4A5D4E;color:#FAF8F4;border-radius:2px;padding:0 16px}
.gg-pr-gg-l{font-size:14px}
.gg-pr-logo{font-size:15px;letter-spacing:-.02em;margin-right:6px}
.gg-pr-logo b{font-weight:600}
.gg-pr-logo i{font-style:normal;color:#C5D6BF}
.gg-pr-gg-v{font-size:13px;white-space:nowrap}
.gg-pr-gg-ah{grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline;gap:6px 12px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid rgba(250,248,244,.25);font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E4EBE2}
.gg-pr-gg-ah b{font-family:'Schibsted Grotesk',sans-serif;font-size:clamp(24px,3vw,30px);letter-spacing:-.02em;text-transform:none;color:#FAF8F4;margin-left:auto}
.gg-pr.sin-ahorro .gg-pr-gg-ah{display:none}
.gg-pr-gg-v b{font-size:22px;letter-spacing:-.02em}
.gg-pr-pide{align-self:center;display:inline-flex;align-items:center;gap:10px;min-height:46px;padding:0 22px;border:0;border-radius:3px;background:#1C1A17;color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:background .25s,transform .25s,opacity .3s}
.gg-pr-pide:hover,.gg-pr-pide:focus-visible{background:#4A5D4E;transform:translateY(-2px)}
.gg-pr-pide:hover .gg-flecha{transform:translateX(5px)}
.gg-pr-pide:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
/* Modo GastroGoan: cada línea se tacha y se sella, el total se tacha y aparece la franja verde */
.gg-pr-n::after{content:"";position:absolute;left:0;top:52%;height:2px;width:0;background:#4A5D4E;transition:width .35s cubic-bezier(.65,0,.35,1) calc(var(--k)*.12s)}
[data-modo="gg"] .gg-pr-fila:not(.off) .gg-pr-n::after{width:100%}
[data-modo="gg"] .gg-pr-fila:not(.off) .gg-pr-imp{opacity:0;transition:opacity .25s calc(var(--k)*.12s + .15s)}
[data-modo="gg"] .gg-pr-fila:not(.off) .gg-pr-inc{opacity:1;transform:translateY(-50%) rotate(-4deg) scale(1);transition:opacity .25s calc(var(--k)*.12s + .2s),transform .35s cubic-bezier(.2,.9,.25,1.4) calc(var(--k)*.12s + .2s)}
.gg-pr-tv::after{content:"";position:absolute;left:-4px;right:-4px;top:55%;height:3px;background:#C0503A;transform:scaleX(0);transform-origin:left;transition:transform .4s cubic-bezier(.65,0,.35,1) .8s}
[data-modo="gg"] .gg-pr-tv::after{transform:scaleX(1)}
[data-modo="gg"] .gg-pr-tv,[data-modo="gg"] .gg-pr-ta{color:#8A857C}
[data-modo="gg"] .gg-pr-gg{grid-template-rows:1fr;opacity:1;margin-top:14px;padding:12px 16px;transition-delay:1s}
[data-modo="gg"] .gg-pr-pide{opacity:0;pointer-events:none}
/* La solución: la cuenta final con las cifras de quien mira */
.gg-pr-sol{width:100%;max-width:1040px;display:flex;flex-direction:column;align-items:center;gap:18px}
.gg-pr-caja{width:100%;display:grid;grid-template-columns:1fr 1fr;border:1px solid #1C1A17;border-radius:3px;overflow:hidden;background:#fff}
.gg-pr-antes,.gg-pr-con{padding:clamp(24px,4vw,44px);display:flex;flex-direction:column;gap:10px}
.gg-pr-antes{border-right:1px solid #E7E2D9}
.gg-pr-con{background:#1C1A17;color:#FAF8F4}
.gg-pr-k{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.gg-pr-con .gg-pr-k{color:#7E9B84}
.gg-pr-big{font-size:clamp(34px,5.4vw,58px);font-weight:700;letter-spacing:-.03em;line-height:1}
.gg-pr-big small{font-size:clamp(14px,1.6vw,18px);font-weight:500;letter-spacing:0}
.gg-pr-antes .gg-pr-big{color:#8A857C}
.gg-pr-antes s{text-decoration-color:#C0503A;text-decoration-thickness:3px}
.gg-pr-con .gg-pr-big small,.gg-pr-con .gg-pr-s{color:#C9C2B6}
.gg-pr-s{font-size:15px;color:#716C65}
.gg-pr-ahorro{grid-column:1/-1;display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px 16px;padding:16px clamp(20px,4vw,44px);background:#4A5D4E;color:#FAF8F4}
.gg-pr-ahorro .gg-pr-k{color:#FAF8F4}
.gg-pr-ah{font-size:clamp(20px,2.6vw,28px);letter-spacing:-.02em}
.gg-pr-ah b{font-weight:700}
.gg-pr.sin-ahorro .gg-pr-ahorro{background:#716C65}
}
@media (max-width:620px){.gg-pr-caja{grid-template-columns:1fr}.gg-pr-antes{border-right:0;border-bottom:1px solid #E7E2D9}}
@media (max-width:400px){.gg-pr-imp input{width:58px}.gg-pr-u{display:none}.gg-pr-sw-b{font-size:11px;letter-spacing:.04em}}
@media (prefers-reduced-motion:reduce){.gg-pr *,.gg-pr *::after{transition:none!important}}
'''
