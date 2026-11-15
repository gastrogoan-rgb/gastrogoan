"""Página App · Precio. La misma franja oscura (texto a la izquierda, cifra a la derecha), con los
textos al día y sin promesas que la app no cumpla (pedido del dueño, 16/11):
- 240 € + IVA al año, y el primer año 300 € + IVA dicho con claridad (la franja dice «sin letra
  pequeña»: no puede esconderlo).
- «Recibes la app en tu email» no era exacto: se recibe el ACCESO (usuario, PIN y código) y la guía.
- El ahorro es el de la cuenta de arriba: si el visitante cambió sus cifras, aquí sale el suyo.
- Efecto: la cifra «cae» desde lo que paga hoy al año hasta 240, y la raya se dibuja.
- Cierre centrado: «No te lo pienses más.» + «Comprar ahora →» con brillo."""

STRIPE = 'https://buy.stripe.com/bJebJ0cKCfN19Bsc19dwc03'
T = {
 'es': dict(et='Precio', h2='Sin trucos.<br> Sin letra pequeña.',
            p='Un precio al año con todo incluido: todas las herramientas y todas las actualizaciones. Recibes tu acceso y una guía para ponerla en marcha en unos 20 minutos.',
            num='240', pre='', suf=' €', iva='+ IVA / año', linea='Pago anual · Todo incluido · Sin comisiones',
            primer='El primer año: 300 € + IVA.', ahorro='Ahorro con tu cuenta:', ah='3.696 €', ah_s='/año',
            reto='No te lo pienses más.', btn='Comprar ahora', seguro='Pago seguro con Stripe', desde='3.936', sep='.'),
 'ca': dict(et='Preu', h2='Sense trucs.<br> Sense lletra petita.',
            p="Un preu a l'any amb tot inclòs: totes les eines i totes les actualitzacions. Reps el teu accés i una guia per posar-la en marxa en uns 20 minuts.",
            num='240', pre='', suf=' €', iva='+ IVA / any', linea='Pagament anual · Tot inclòs · Sense comissions',
            primer='El primer any: 300 € + IVA.', ahorro='Estalvi amb el teu compte:', ah='3.696 €', ah_s='/any',
            reto="No t'ho pensis més.", btn='Comprar ara', seguro='Pagament segur amb Stripe', desde='3.936', sep='.'),
 'en': dict(et='Price', h2='No tricks.<br> No small print.',
            p='One yearly price with everything included: every tool and every update. You get your login and a guide to set it up in about 20 minutes.',
            num='240', pre='€', suf='', iva='+ VAT / year', linea='Annual payment · Everything included · No commissions',
            primer='First year: €300 + VAT.', ahorro='Your saving:', ah='€3,696', ah_s='/year',
            reto="Don't overthink it.", btn='Buy now', seguro='Secure payment with Stripe', desde='3,936', sep=','),
}


def precio(l):
    x = T[l]
    return f'''<!-- precio -->
  <section class="gg-pc" data-pre="{x['pre']}" data-suf="{x['suf']}" data-sep="{x['sep']}">
    <div class="gg-pc-fila">
      <div class="gg-pc-txt">
        <span class="gg-pc-et gg-app-rev">{x['et']}</span>
        <h2 class="gg-pc-h gg-app-rev" style="--d:.08s">{x['h2']}</h2>
        <p class="gg-pc-p gg-app-rev" style="--d:.16s">{x['p']}</p>
      </div>
      <div class="gg-pc-cifra gg-app-rev" style="--d:.2s">
        <span class="gg-pc-big"><span class="gg-pc-n" data-n="{x['num']}">{x['pre']}{x['num']}{x['suf']}</span></span>
        <span class="gg-pc-iva">{x['iva']}</span>
        <span class="gg-pc-linea">{x['linea']}</span>
        <span class="gg-pc-primer">{x['primer']}</span>
        <span class="gg-pc-ah">{x['ahorro']} <b class="gg-pc-ah-v">{x['ah']}</b>{x['ah_s']}</span>
      </div>
    </div>
    <div class="gg-pc-reto gg-app-rev" style="--d:.1s">
      <span class="gg-pc-reto-t">{x['reto']}</span>
      <a class="gg-pc-btn" href="{STRIPE}" target="_blank" rel="noopener">{x['btn']}<span class="gg-flecha" aria-hidden="true">→</span></a>
    </div>
    <span class="gg-pc-seguro">{x['seguro']}</span>
    <script>
    /* La cifra cae desde lo que paga hoy al año hasta 240; el ahorro copia el de la cuenta de arriba. */
    (function(){{
      if(window.__ggPc) return; window.__ggPc=1;
      var quieto=matchMedia('(prefers-reduced-motion: reduce)').matches;
      function fmt(n,s){{return s.dataset.pre+String(Math.round(n)).replace(/\\B(?=(\\d{{3}})+(?!\\d))/g,s.dataset.sep)+s.dataset.suf}}
      function hoy(){{var a=document.querySelector('.gg-pr-anio');return a?parseInt(a.textContent.replace(/[^0-9]/g,''),10)||0:0}}
      function ahorro(){{
        var s=document.querySelector('.gg-pc'), o=document.querySelector('.gg-pr-ah-v'), d=s&&s.querySelector('.gg-pc-ah-v');
        if(o&&d&&d.textContent!==o.textContent) d.textContent=o.textContent;
      }}
      function cae(){{
        var s=document.querySelector('.gg-pc'); if(!s||s.dataset.hecho) return;
        var el=s.querySelector('.gg-pc-n'); if(el.getBoundingClientRect().top>innerHeight*0.8) return;
        s.dataset.hecho=1; s.classList.add('vivo'); if(quieto) return;
        var fin=+el.dataset.n, ini=Math.max(hoy(),fin*4), t0=performance.now();
        (function p(t){{var q=Math.min(1,(t-t0)/1500),e=1-Math.pow(1-q,4);el.textContent=fmt(ini+(fin-ini)*e,s);
          if(q<1&&document.body.contains(el))requestAnimationFrame(p); else s.classList.add('fin')}})(t0);
      }}
      addEventListener('scroll',cae,{{passive:true}});
      var i=0,iv=setInterval(function(){{ahorro();cae();if(++i>80)clearInterval(iv)}},250);
      document.addEventListener('input',function(){{setTimeout(ahorro,600)}});
      document.addEventListener('change',function(){{setTimeout(ahorro,600)}});
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- Precio ---------- */
.gg-pc{background:#1C1A17;color:#FAF8F4;padding:clamp(44px,6vw,80px) clamp(24px,6vw,64px);border-bottom:1px solid #E7E2D9;display:flex;flex-direction:column;align-items:center;gap:clamp(30px,4vw,44px);overflow:hidden}
.gg-pc-fila{width:100%;max-width:1080px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:clamp(28px,5vw,64px);align-items:center}
.gg-pc-txt{display:flex;flex-direction:column;gap:18px}
.gg-pc-et{display:inline-flex;align-items:center;gap:12px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7E9B84}
.gg-pc-et::before{content:"";width:28px;height:2px;background:#7E9B84}
.gg-pc-h{margin:0;font-size:clamp(30px,4vw,46px);font-weight:700;letter-spacing:-.03em;line-height:1.08}
.gg-pc-p{margin:0;font-size:16px;line-height:1.65;color:#C9C2B6;max-width:460px;text-wrap:pretty}
.gg-pc-cifra{position:relative;display:flex;flex-direction:column;gap:8px;padding-left:clamp(24px,4vw,44px)}
.gg-pc-cifra::before{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:#FAF8F4;transform-origin:top}
.gg-pc-big{font-size:clamp(76px,10vw,124px);font-weight:700;letter-spacing:-.05em;line-height:.9;font-variant-numeric:tabular-nums}
.gg-pc-iva{font-size:clamp(16px,1.8vw,20px);color:#C9C2B6;margin-top:-2px}
.gg-pc-linea{margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8A857C}
.gg-pc-primer{font-size:14.5px;color:#FAF8F4}
.gg-pc-ah{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#7E9B84}
.gg-pc-ah b{color:#C5D6BF;font-weight:600}
/* El reto + el botón, centrados */
.gg-pc-reto{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:14px 22px;padding:22px clamp(18px,3vw,30px);border:1px solid rgba(250,248,244,.16);border-radius:3px;background:rgba(250,248,244,.03)}
.gg-pc-reto-t{font-size:clamp(20px,2.4vw,28px);font-weight:700;letter-spacing:-.025em;text-align:center}
.gg-pc-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:54px;padding:0 30px;border-radius:3px;background:#FAF8F4;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:13px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.gg-pc-btn:hover,.gg-pc-btn:focus-visible{background:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 18px 34px -16px rgba(0,0,0,.9)}
.gg-pc-btn:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.gg-pc-btn:hover .gg-flecha{transform:translateX(5px)}
.gg-pc-seguro{margin-top:-18px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A857C}
@media (max-width:560px){.gg-pc-linea{letter-spacing:.05em;font-size:11px}.gg-pc-big{font-size:clamp(60px,18vw,80px)}.gg-pc-reto{flex-direction:column;width:100%;box-sizing:border-box}.gg-pc-btn{width:100%;box-sizing:border-box}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-pc-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes gg-pc-empuja{0%,80%,100%{transform:none}88%{transform:translateX(6px)}}
  @keyframes gg-pc-late{0%,100%{box-shadow:0 0 0 0 rgba(126,155,132,.0)}50%{box-shadow:0 0 0 5px rgba(126,155,132,.14)}}
  .gg-pc-btn::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.3),transparent);animation:gg-pc-brillo 3.4s ease-in-out infinite;pointer-events:none}
  .gg-pc-btn{animation:gg-pc-late 2.8s ease-in-out infinite}
  .gg-pc-btn .gg-flecha{animation:gg-pc-empuja 3.4s ease-in-out infinite}
  .gg-pc-btn:hover,.gg-pc-btn:hover .gg-flecha{animation:none}
  .gg-js .gg-pc-cifra::before{transform:scaleY(0);transition:transform .9s cubic-bezier(.65,0,.35,1) .2s}
  .gg-js .gg-pc.vivo .gg-pc-cifra::before{transform:scaleY(1)}
  .gg-js .gg-pc-primer,.gg-js .gg-pc-ah,.gg-js .gg-pc-linea{opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s}
  .gg-js .gg-pc.fin .gg-pc-linea{opacity:1;transform:none}
  .gg-js .gg-pc.fin .gg-pc-primer{opacity:1;transform:none;transition-delay:.12s}
  .gg-js .gg-pc.fin .gg-pc-ah{opacity:1;transform:none;transition-delay:.24s}
}
'''
