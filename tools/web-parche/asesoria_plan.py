"""Asesoría · lo que gana el hostelero y el Plan 360º con su precio (pedido del dueño, 16/11:
«que cuando lo lea sienta que le pasa eso y tenga que dar al botón»). Va justo después de la ruta 360.

1) «¿Te suena?»: las seis áreas. Cada tarjeta abre con lo que le pasa HOY, dicho como lo diría él;
   al llegar a la pantalla esa frase se tacha y aparece lo que cambia, lo que gana en el bolsillo y lo
   que gana en su vida. «Me pasa» marca las suyas: la cuenta se ve debajo y viaja en el WhatsApp.
2) Lo que ganas tú, en global: en tu bolsillo / en tu vida, línea a línea.
3) El Plan 360º: formato real (2 días presenciales + 4 semanas de seguimiento online y presencial +
   cierre con sus números), lo que se lleva, el precio (950 € + IVA) y el mantenimiento opcional.
⚠️ Nada de cifras inventadas: se promete lo que el programa hace, no un «+30 % de ventas».
El estado de «Me pasa» vive en el script, no en el DOM (la página se monta dos veces)."""
from urllib.parse import quote

WA_NUM = '34622390245'

AREAS = {
 'es': [
  ('Concepto', 'Mi carta intenta gustar a todo el mundo y al final no destaco en nada.',
   'Definimos qué eres, para quién y por qué tienen que elegirte a ti.',
   'Cobras lo que vales, no lo que cobra el de al lado.', 'Dejas de dudar de cada decisión: sabes hacia dónde vas.'),
  ('Marca', 'El logo, la carta, las redes y el local parecen de cuatro negocios distintos.',
   'Una identidad coherente, recogida en el Libro de marca de tu negocio.',
   'Una marca que se recuerda trae clientes sin pagar por cada uno.', 'Orgullo al enseñar tu local, en la puerta y en el móvil.'),
  ('Cocina', 'Vendo platos sin saber cuánto me deja cada uno.',
   'Escandallo de cada plato, food cost bajo control y una carta ordenada por lo que deja.',
   'Cada plato que sale deja el margen que tiene que dejar.', 'Una cocina con orden y fichas que no depende de que estés tú.'),
  ('Sala', 'El servicio sale bien o mal según quién esté ese día.',
   'Un protocolo de servicio y un equipo que sabe vender y cuidar al cliente.',
   'Sube el ticket medio y las mesas vuelven.', 'Puedes salir de sala sin que todo se tambalee.'),
  ('Gestión', 'Miro los números a final de año, cuando ya no hay nada que hacer.',
   'Cuenta de resultados, punto de equilibrio y coste de personal, cada mes.',
   'Ves la fuga antes de que te cueste el mes.', 'Duermes sabiendo cómo está tu negocio. Sin sustos.'),
  ('Captación', 'Espero a que entren por la puerta y cruzo los dedos.',
   'Un plan para atraer clientes nuevos y conseguir que los de siempre repitan.',
   'Ventas más estables, también entre semana.', 'Los días flojos dejan de ser angustia: sabes qué hacer para llenarlos.'),
 ],
 'ca': [
  ('Concepte', 'La meva carta vol agradar a tothom i al final no destaco en res.',
   'Definim què ets, per a qui i per què t’han d’escollir a tu.',
   'Cobres el que vals, no el que cobra el del costat.', 'Deixes de dubtar de cada decisió: saps cap on vas.'),
  ('Marca', 'El logo, la carta, les xarxes i el local semblen de quatre negocis diferents.',
   'Una identitat coherent, recollida al Llibre de marca del teu negoci.',
   'Una marca que es recorda porta clients sense pagar per cadascun.', 'Orgull en ensenyar el teu local, a la porta i al mòbil.'),
  ('Cuina', 'Venc plats sense saber quant em deixa cadascun.',
   'Escandall de cada plat, food cost sota control i una carta ordenada pel que deixa.',
   'Cada plat que surt deixa el marge que ha de deixar.', 'Una cuina amb ordre i fitxes que no depèn que hi siguis tu.'),
  ('Sala', 'El servei surt bé o malament segons qui hi hagi aquell dia.',
   'Un protocol de servei i un equip que sap vendre i cuidar el client.',
   'Puja el tiquet mitjà i les taules tornen.', 'Pots sortir de sala sense que tot trontolli.'),
  ('Gestió', 'Miro els números a final d’any, quan ja no hi ha res a fer.',
   'Compte de resultats, punt d’equilibri i cost de personal, cada mes.',
   'Veus la fuga abans que et costi el mes.', 'Dorms sabent com està el teu negoci. Sense ensurts.'),
  ('Captació', 'Espero que entrin per la porta i creuo els dits.',
   'Un pla per atreure clients nous i aconseguir que els de sempre repeteixin.',
   'Vendes més estables, també entre setmana.', 'Els dies fluixos deixen de ser angoixa: saps què fer per omplir-los.'),
 ],
 'en': [
  ('Concept', 'My menu tries to please everyone, and in the end nothing stands out.',
   'We define what you are, who you are for and why they should choose you.',
   'You charge what you are worth, not what the place next door charges.', 'You stop second-guessing every decision: you know where you are going.'),
  ('Brand', 'The logo, the menu, the socials and the venue look like four different businesses.',
   'A consistent identity, set out in your own Brand book.',
   'A brand people remember brings customers without paying for each one.', 'Pride in showing off your place, at the door and on screen.'),
  ('Kitchen', 'I sell dishes without knowing what each one actually makes me.',
   'Every dish costed, food cost under control and a menu ordered by what it earns.',
   'Every plate that goes out makes the margin it should.', 'A kitchen with order and spec sheets that does not depend on you being there.'),
  ('Front of house', 'Service goes well or badly depending on who is on that day.',
   'A service standard and a team that knows how to sell and look after guests.',
   'Higher average spend and tables that come back.', 'You can step off the floor without everything wobbling.'),
  ('Management', 'I look at the numbers at the end of the year, when it is too late.',
   'Profit and loss, break-even and staff costs, every month.',
   'You spot the leak before it costs you the month.', 'You sleep knowing how your business is doing. No nasty surprises.'),
  ('Customer acquisition', 'I wait for people to walk in and keep my fingers crossed.',
   'A plan to bring in new customers and keep the regulars coming back.',
   'Steadier sales, weekdays included.', 'Quiet days stop being a worry: you know how to fill them.'),
 ],
}

T = {
 'es': dict(et='Lo que cambia', h2='¿Te suena alguna?', sub='Marca las que te pasan. Son las seis áreas del Plan 360º.',
            hoy='Hoy', con='Con el Plan 360º', bolsillo='En tu bolsillo', vida='En tu vida', mepasa='Me pasa', mepasa_on='Me pasa ✓',
            cuenta0='Marca las que te pasan', cuenta='Te reconoces en {n} de 6', cuenta_s='Todo eso se trabaja en un mes.',
            g_et='Lo que ganas tú', g_h='No es un informe para un cajón:<br><span class="gg-hl">es tu negocio funcionando mejor.</span>',
            g_bol=['Sabes cuánto ganas cada mes, no a final de año.', 'Cada plato y cada hora de personal, ajustados a lo que vendes.', 'Ves dónde se te escapa el dinero y lo cierras.', 'Clientes que repiten: ventas que no dependen de la suerte.'],
            g_vid=['Dejas de apagar fuegos y empiezas a dirigir.', 'Un equipo que sabe qué hacer sin preguntarte cada cosa.', 'Vuelves a disfrutar de tu oficio.', 'Recuperas tiempo para los tuyos.'],
            p_et='Cómo funciona', p_h='Un mes. Tu negocio, de arriba abajo.',
            pasos=[('2 días', 'presenciales en tu local', 'En servicio y fuera de él. Lo vemos todo: cocina, sala, números y equipo.'),
                   ('4 semanas', 'de seguimiento', 'Reuniones online y presenciales para poner en marcha cada cambio contigo, no por ti.'),
                   ('El cierre', 'con tus números', 'Comparamos tu Día 1 con hoy y te dejo el plan para seguir.')],
            llevas='Te llevas', items=['El Libro de marca de tu negocio', 'Un plan de acción para cada área', 'El informe de cierre: antes y después, con tus cifras'],
            precio='950', pre='', suf=' €', iva='+ IVA', prog='Programa completo · 2 días + 1 mes de seguimiento',
            mant='Después, si quieres, seguimos: mantenimiento por 75 € + IVA al mes.',
            gancho='Un mes trabajando juntos.', gancho2='Un plan que te queda para siempre.',
            btn='Quiero mi Plan 360º', dudas='Antes, tengo dudas',
            msg='Hola Marcos, quiero el Plan 360º para mi local.', msg_areas=' Me reconozco en: {a}.',
            msg_dudas='Hola Marcos, tengo algunas dudas sobre el Plan 360º.'),
 'ca': dict(et='El que canvia', h2='Te’n sona alguna?', sub='Marca les que et passen. Són les sis àrees del Pla 360º.',
            hoy='Avui', con='Amb el Pla 360º', bolsillo='A la butxaca', vida='A la teva vida', mepasa='Em passa', mepasa_on='Em passa ✓',
            cuenta0='Marca les que et passen', cuenta='T’hi reconeixes en {n} de 6', cuenta_s='Tot això es treballa en un mes.',
            g_et='El que guanyes tu', g_h='No és un informe per a un calaix:<br><span class="gg-hl">és el teu negoci funcionant millor.</span>',
            g_bol=['Saps quant guanyes cada mes, no a final d’any.', 'Cada plat i cada hora de personal, ajustats al que vens.', 'Veus per on se t’escapen els diners i ho tanques.', 'Clients que repeteixen: vendes que no depenen de la sort.'],
            g_vid=['Deixes d’apagar focs i comences a dirigir.', 'Un equip que sap què fer sense preguntar-te cada cosa.', 'Tornes a gaudir del teu ofici.', 'Recuperes temps per als teus.'],
            p_et='Com funciona', p_h='Un mes. El teu negoci, de dalt a baix.',
            pasos=[('2 dies', 'presencials al teu local', 'En servei i fora. Ho veiem tot: cuina, sala, números i equip.'),
                   ('4 setmanes', 'de seguiment', 'Reunions en línia i presencials per posar en marxa cada canvi amb tu, no per tu.'),
                   ('El tancament', 'amb els teus números', 'Comparem el teu Dia 1 amb avui i et deixo el pla per continuar.')],
            llevas='T’endús', items=['El Llibre de marca del teu negoci', 'Un pla d’acció per a cada àrea', 'L’informe de tancament: abans i després, amb les teves xifres'],
            precio='950', pre='', suf=' €', iva='+ IVA', prog='Programa complet · 2 dies + 1 mes de seguiment',
            mant='Després, si vols, continuem: manteniment per 75 € + IVA al mes.',
            gancho='Un mes treballant junts.', gancho2='Un pla que et queda per sempre.',
            btn='Vull el meu Pla 360º', dudas='Abans, tinc dubtes',
            msg='Hola Marcos, vull el Pla 360º per al meu local.', msg_areas=' M’hi reconec en: {a}.',
            msg_dudas='Hola Marcos, tinc alguns dubtes sobre el Pla 360º.'),
 'en': dict(et='What changes', h2='Sound familiar?', sub='Tick the ones that happen to you. They are the six areas of the 360º Plan.',
            hoy='Today', con='With the 360º Plan', bolsillo='In your pocket', vida='In your life', mepasa='That’s me', mepasa_on='That’s me ✓',
            cuenta0='Tick the ones that happen to you', cuenta='You recognise yourself in {n} of 6', cuenta_s='All of it is worked on in one month.',
            g_et='What you gain', g_h='Not a report for a drawer:<br><span class="gg-hl">it is your business working better.</span>',
            g_bol=['You know what you make every month, not at year end.', 'Every dish and every staff hour matched to what you sell.', 'You see where money leaks and you close it.', 'Regulars who come back: sales that do not depend on luck.'],
            g_vid=['You stop firefighting and start running the place.', 'A team that knows what to do without asking you everything.', 'You enjoy your craft again.', 'You get time back for the people you love.'],
            p_et='How it works', p_h='One month. Your business, top to bottom.',
            pasos=[('2 days', 'on site at your venue', 'During service and outside it. We look at everything: kitchen, floor, numbers and team.'),
                   ('4 weeks', 'of follow-up', 'Online and in-person meetings to put every change in place with you, not for you.'),
                   ('The close', 'with your numbers', 'We compare your Day 1 with today and I leave you the plan to keep going.')],
            llevas='You get', items=['Your business’s Brand book', 'An action plan for each area', 'The closing report: before and after, with your figures'],
            precio='950', pre='€', suf='', iva='+ VAT', prog='Full programme · 2 days + 1 month of follow-up',
            mant='Afterwards, if you want, we carry on: maintenance for €75 + VAT a month.',
            gancho='One month working together.', gancho2='A plan you keep for good.',
            btn='I want my 360º Plan', dudas='I have questions first',
            msg='Hi Marcos, I want the 360º Plan for my venue.', msg_areas=' I recognise myself in: {a}.',
            msg_dudas='Hi Marcos, I have a few questions about the 360º Plan.'),
}

IC_BOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2a3.2 3.2 0 1 0 0 5.6M8 11h5M8 13.2h5"/></svg>'
IC_VID = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>'
IC_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>'


def wa(txt):
    return f'https://wa.me/{WA_NUM}?text=' + quote(txt)


def plan(l):
    x = T[l]
    from asesoria_extras import WA as WAICON
    tarjetas = ''
    for k, (nom, dolor, cambio, bol, vid) in enumerate(AREAS[l]):
        tarjetas += f'''<article class="gg-gn-c gg-rev" data-a="{k}" data-nom="{nom}" style="--d:{(k % 2) * .1:.2f}s">
          <header class="gg-gn-cab"><span class="gg-gn-n">{k + 1:02d}</span><span class="gg-gn-area">{nom}</span>
            <button type="button" class="gg-gn-me" aria-pressed="false" data-off="{x['mepasa']}" data-on="{x['mepasa_on']}">{x['mepasa']}</button></header>
          <div class="gg-gn-hoy"><span class="gg-gn-k">{x['hoy']}</span><p class="gg-gn-dolor"><span>«{dolor}»</span></p></div>
          <div class="gg-gn-con"><span class="gg-gn-k">{x['con']}</span><p class="gg-gn-cambio">{cambio}</p>
            <ul class="gg-gn-gana">
              <li><span class="gg-gn-ic">{IC_BOL}</span><span><b>{x['bolsillo']}</b>{bol}</span></li>
              <li><span class="gg-gn-ic vida">{IC_VID}</span><span><b>{x['vida']}</b>{vid}</span></li>
            </ul></div>
        </article>'''
    lineas = lambda arr: ''.join(f'<li style="--k:{i}"><span class="gg-gl-ok">{IC_OK}</span>{t}</li>' for i, t in enumerate(arr))
    pasos = ''.join(f'''<li class="gg-pl-paso" style="--k:{i}"><span class="gg-pl-pn">{i + 1}</span>
          <div><span class="gg-pl-big">{a}</span> <span class="gg-pl-q">{b}</span><p>{c}</p></div></li>''' for i, (a, b, c) in enumerate(x['pasos']))
    items = ''.join(f'<li><span class="gg-gl-ok">{IC_OK}</span>{t}</li>' for t in x['items'])
    return f'''<!-- lo que ganas y el Plan 360º -->
  <section class="gg-gn gg-anim gg-seguido" data-msg="{x['msg']}" data-msga="{x['msg_areas']}" data-c0="{x['cuenta0']}" data-c="{x['cuenta']}">
    <span class="gg-union" aria-hidden="true"></span>
    <header class="gg-gn-tit">
      <span class="gg-met-et gg-rev">{x['et']}</span>
      <h2 class="gg-gn-h gg-rev" style="--d:.08s">{x['h2']}</h2>
      <p class="gg-gn-sub gg-rev" style="--d:.16s">{x['sub']}</p>
    </header>
    <div class="gg-gn-grid">{tarjetas}</div>
    <div class="gg-gn-cuenta gg-rev" aria-live="polite"><b class="gg-gn-cuenta-t">{x['cuenta0']}</b><span class="gg-gn-pts" aria-hidden="true">{'<i></i>' * 6}</span><span class="gg-gn-cuenta-s">{x['cuenta_s']}</span></div>
  </section>

  <section class="gg-gl gg-anim gg-seguido">
    <span class="gg-union" aria-hidden="true"></span>
    <div class="gg-gl-in">
      <span class="gg-met-et gg-gl-et gg-rev">{x['g_et']}</span>
      <h2 class="gg-gl-h gg-rev" style="--d:.08s">{x['g_h']}</h2>
      <div class="gg-gl-cols">
        <div class="gg-gl-col gg-rev" style="--d:.12s"><h3><span class="gg-gn-ic">{IC_BOL}</span>{x['bolsillo']}</h3><ul>{lineas(x['g_bol'])}</ul></div>
        <div class="gg-gl-col vida gg-rev" style="--d:.24s"><h3><span class="gg-gn-ic vida">{IC_VID}</span>{x['vida']}</h3><ul>{lineas(x['g_vid'])}</ul></div>
      </div>
    </div>
  </section>

  <section class="gg-pl gg-anim gg-seguido">
    <span class="gg-union" aria-hidden="true"></span>
    <header class="gg-gn-tit">
      <span class="gg-met-et gg-rev">{x['p_et']}</span>
      <h2 class="gg-gn-h gg-rev" style="--d:.08s">{x['p_h']}</h2>
    </header>
    <div class="gg-pl-fila">
      <div class="gg-pl-izq gg-rev" style="--d:.1s">
        <ol class="gg-pl-pasos"><span class="gg-pl-raya" aria-hidden="true"><span></span></span>{pasos}</ol>
        <div class="gg-pl-llevas"><span class="gg-gn-k">{x['llevas']}</span><ul>{items}</ul></div>
      </div>
      <div class="gg-pl-precio gg-rev" style="--d:.2s">
        <span class="gg-gn-k">{x['prog']}</span>
        <span class="gg-pl-cifra"><b>{x['pre']}{x['precio']}{x['suf']}</b> <small>{x['iva']}</small></span>
        <p class="gg-pl-gancho">{x['gancho']}<br><span class="gg-pl-subr">{x['gancho2']}</span></p>
        <a class="gg-pl-btn" data-wa="1" href="{wa(x['msg'])}" target="_blank" rel="noopener">{WAICON}{x['btn']}<span class="gg-flecha" aria-hidden="true">→</span></a>
        <p class="gg-pl-mant">{x['mant']}</p>
      </div>
    </div>
    <!--aperturas-->
    <script>
    /* «Me pasa»: el estado vive aquí (la página se monta dos veces) y se vuelve a pintar en lo que haya.
       Las áreas marcadas viajan en el mensaje de WhatsApp. La ruta del plan se llena al bajar. */
    (function(){{
      if(window.__ggGn) return; window.__ggGn=1;
      var marcadas={{}};
      function pinta(){{
        var S=document.querySelector('.gg-gn'); if(!S) return;
        var n=0, noms=[];
        S.querySelectorAll('.gg-gn-c').forEach(function(c){{
          var on=!!marcadas[c.dataset.a], b=c.querySelector('.gg-gn-me');
          c.classList.toggle('me',on); b.setAttribute('aria-pressed',on); b.textContent=on?b.dataset.on:b.dataset.off;
          if(on){{n++;noms.push(c.dataset.nom)}}
        }});
        var t=S.querySelector('.gg-gn-cuenta-t'); if(t) t.textContent=n?S.dataset.c.replace('{{n}}',n):S.dataset.c0;
        S.querySelectorAll('.gg-gn-pts i').forEach(function(p,i){{p.classList.toggle('on',i<n)}});
        S.querySelector('.gg-gn-cuenta').classList.toggle('hay',n>0);
        var a=document.querySelector('.gg-pl-btn[data-wa]');
        if(a) a.href='https://wa.me/{WA_NUM}?text='+encodeURIComponent(S.dataset.msg+(n?S.dataset.msga.replace('{{a}}',noms.join(', ')):''));
      }}
      document.addEventListener('click',function(e){{
        var b=e.target.closest&&e.target.closest('.gg-gn-me'); if(!b) return;
        var c=b.closest('.gg-gn-c'); marcadas[c.dataset.a]=!marcadas[c.dataset.a]; pinta();
        if(marcadas[c.dataset.a]&&!matchMedia('(prefers-reduced-motion: reduce)').matches){{c.classList.remove('pum');void c.offsetWidth;c.classList.add('pum')}}
      }});
      function raya(){{
        var L=document.querySelector('.gg-pl-pasos'); if(!L) return;
        var r=L.getBoundingClientRect(), p=Math.max(0,Math.min(1,(innerHeight*0.75-r.top)/r.height));
        L.style.setProperty('--p',p.toFixed(3));
        L.querySelectorAll('.gg-pl-paso').forEach(function(s){{var q=s.getBoundingClientRect();s.classList.toggle('on',q.top+20<innerHeight*0.75)}});
      }}
      addEventListener('scroll',function(){{requestAnimationFrame(raya)}},{{passive:true}});
      setInterval(function(){{pinta();raya()}},400);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- ¿Te suena? Las seis áreas: hoy → con el Plan 360º ---------- */
/* Ruta 360 → ¿Te suena? → Lo que ganas → Plan: UN recorrido. Sin rayas ni grandes huecos entre bloques;
   los une la línea verde con su punto (.gg-union), la misma de la ruta de fases. */
.gg-metodo{border-bottom:0!important;padding-bottom:clamp(8px,1.5vw,16px)}
.gg-gn,.gg-gl,.gg-pl{padding:clamp(6px,1vw,10px) clamp(20px,6vw,64px) clamp(22px,3vw,36px);display:flex;flex-direction:column;align-items:center;gap:clamp(18px,2.4vw,26px)}
.gg-pl{border-bottom:1px solid #E7E2D9;padding-bottom:clamp(40px,5vw,64px)}
.gg-union{display:block;position:relative;width:2px;height:clamp(30px,4vw,46px);margin-bottom:4px;background:linear-gradient(#C9D3CB,#4A5D4E)}
.gg-union::after{content:"";position:absolute;left:50%;bottom:-4px;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:#4A5D4E;box-shadow:0 0 0 4px #FAF8F4}
.gg-gn-tit{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;max-width:760px}
.gg-gn-h{margin:0;font-size:clamp(24px,3vw,36px);line-height:1.12;font-weight:700;letter-spacing:-.03em;color:#1C1A17;text-wrap:balance}
.gg-gn-sub{margin:0;font-size:15.5px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
.gg-gn-grid{width:100%;max-width:1040px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.gg-gn-c{position:relative;display:flex;flex-direction:column;gap:12px;padding:clamp(16px,2vw,22px);background:#fff;border:1px solid #E7E2D9;border-radius:3px;transition:border-color .3s,box-shadow .35s,transform .35s cubic-bezier(.2,.7,.2,1)}
.gg-gn-c:hover{box-shadow:0 24px 44px -30px rgba(28,26,23,.45)}
.gg-gn-c.me{border-color:#4A5D4E;box-shadow:0 0 0 1px #4A5D4E,0 24px 44px -30px rgba(74,93,78,.6)}
.gg-gn-cab{display:flex;align-items:center;gap:12px}
.gg-gn-n{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#4A5D4E}
.gg-gn-area{font-size:17px;font-weight:700;letter-spacing:-.02em;color:#1C1A17;flex:1;min-width:0}
.gg-gn-me{flex:none;min-height:36px;padding:0 14px;border:1px solid #D5CFC4;border-radius:999px;background:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#3D3A34;cursor:pointer;transition:background .25s,color .25s,border-color .25s,transform .2s}
.gg-gn-me:hover{border-color:#4A5D4E;color:#4A5D4E}
.gg-gn-me[aria-pressed="true"]{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}
.gg-gn-me:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-gn-k{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.gg-gn-hoy{display:flex;flex-direction:column;gap:6px}
.gg-gn-dolor{margin:0;font-size:clamp(15.5px,1.5vw,17px);line-height:1.4;font-weight:500;letter-spacing:-.01em;color:#1C1A17;text-wrap:pretty}
/* «Hoy» se SUBRAYA (no se tacha: tachado no se leía, lo pidió el dueño): un trazo ámbar bajo la frase */
.gg-gn-dolor span{background:linear-gradient(#D9A441,#D9A441) 0 100%/0% 3px no-repeat;padding-bottom:2px;-webkit-box-decoration-break:clone;box-decoration-break:clone;transition:background-size .8s cubic-bezier(.65,0,.35,1)}
.gg-gn-con{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px dashed #D5CFC4}
.gg-gn-con .gg-gn-k{color:#4A5D4E}
.gg-gn-cambio{margin:0;font-size:14.5px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
.gg-gn-gana{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.gg-gn-gana li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5;color:#1C1A17}
.gg-gn-gana b{display:block;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:400;letter-spacing:.12em;text-transform:uppercase;color:#4A5D4E;margin-bottom:2px}
.gg-gn-ic{flex:none;width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:#EEF2EC;color:#4A5D4E}
.gg-gn-ic.vida{background:#1C1A17;color:#FAF8F4}
.gg-gn-ic svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
/* La cuenta de las marcadas */
.gg-gn-cuenta{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px;text-align:center}
.gg-gn-cuenta-t{font-size:16px;letter-spacing:-.01em;color:#1C1A17}
.gg-gn-pts{display:inline-flex;gap:6px}
.gg-gn-pts i{width:12px;height:12px;border-radius:50%;border:1.5px solid #C9C2B6;transition:background .3s,border-color .3s,transform .3s cubic-bezier(.2,.9,.25,1.4)}
.gg-gn-pts i.on{background:#4A5D4E;border-color:#4A5D4E;transform:scale(1.15)}
.gg-gn-cuenta-s{display:none;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#4A5D4E}
.gg-gn-cuenta.hay .gg-gn-cuenta-s{display:inline}
/* Con JS y movimiento: al entrar la tarjeta, lo de hoy se tacha y aparece lo que cambia */
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-gn-c .gg-gn-con{opacity:0;transform:translateY(14px);transition:opacity .6s .95s,transform .6s cubic-bezier(.2,.7,.2,1) .95s}
  .gg-js .gg-gn-c.gg-vis .gg-gn-con{opacity:1;transform:none}
  .gg-js .gg-gn-c .gg-gn-gana li{opacity:0;transform:translateX(-10px);transition:opacity .45s,transform .45s cubic-bezier(.2,.7,.2,1)}
  .gg-js .gg-gn-c.gg-vis .gg-gn-gana li{opacity:1;transform:none}
  .gg-js .gg-gn-c.gg-vis .gg-gn-gana li:nth-child(1){transition-delay:1.35s}
  .gg-js .gg-gn-c.gg-vis .gg-gn-gana li:nth-child(2){transition-delay:1.55s}
  .gg-js .gg-gn-c .gg-gn-dolor span{transition-delay:.45s,.45s}
  @keyframes gg-gn-pum{0%{transform:scale(1)}35%{transform:scale(1.015)}100%{transform:scale(1)}}
  .gg-gn-c.pum{animation:gg-gn-pum .45s cubic-bezier(.2,.9,.25,1.3)}
}
.gg-gn-c.gg-vis .gg-gn-dolor span,.gg-gn:not(.gg-js) .gg-gn-dolor span{background-size:100% 3px}
.gg-js .gg-gn-c:not(.gg-vis) .gg-gn-dolor span{background-size:0% 3px}
/* ---------- Lo que ganas tú ---------- */
.gg-gl-in{position:relative;box-sizing:border-box;width:100%;max-width:1040px;display:flex;flex-direction:column;align-items:center;gap:clamp(16px,2.4vw,24px);text-align:center;padding:clamp(24px,3.4vw,40px) clamp(18px,3vw,36px);background:#1C1A17;color:#FAF8F4;border-radius:3px;overflow:hidden}
.gg-gl-in::before{content:"";position:absolute;inset:-40% -10% auto auto;width:60%;aspect-ratio:1;background:radial-gradient(closest-side,rgba(126,155,132,.16),transparent);pointer-events:none}
.gg-gl-in>*{position:relative}
.gg-gl-et{color:#7E9B84}
.gg-gl-et::before,.gg-gl-et::after{background:#7E9B84}
.gg-gl-h{margin:0;font-size:clamp(21px,2.7vw,32px);line-height:1.25;font-weight:700;letter-spacing:-.03em;text-wrap:balance}
.gg-gl-h .gg-hl{color:#FAF8F4}
.gg-gl-cols{width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;text-align:left}
.gg-gl-col{padding:clamp(16px,2.2vw,24px);border:1px solid rgba(250,248,244,.16);border-radius:3px;background:rgba(250,248,244,.03)}
.gg-gl-col.vida{background:#4A5D4E;border-color:#4A5D4E}
.gg-gl-col h3{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:400;letter-spacing:.14em;text-transform:uppercase;color:#C9C2B6}
.gg-gl-col.vida h3{color:#E4EBE2}
.gg-gl-col .gg-gn-ic{background:#4A5D4E;color:#FAF8F4}
.gg-gl-col.vida .gg-gn-ic{background:#FAF8F4;color:#4A5D4E}
.gg-gl-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.gg-gl-col li{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-top:1px solid rgba(250,248,244,.12);font-size:15px;line-height:1.45;color:#FAF8F4}
.gg-gl-ok{flex:none;width:19px;height:19px;margin-top:1px;color:#7E9B84}
.gg-gl-col.vida .gg-gl-ok{color:#C5D6BF}
.gg-gl-ok svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion:no-preference){
  .gg-js .gg-gl-col li{opacity:0;transform:translateY(10px);transition:opacity .5s calc(.35s + var(--k)*.16s),transform .5s cubic-bezier(.2,.7,.2,1) calc(.35s + var(--k)*.16s)}
  .gg-js .gg-gl-col.gg-vis li{opacity:1;transform:none}
  .gg-js .gg-gl-ok svg path{stroke-dasharray:24;stroke-dashoffset:24;transition:stroke-dashoffset .5s calc(.6s + var(--k,0)*.16s)}
  .gg-js .gg-vis .gg-gl-ok svg path{stroke-dashoffset:0}
}
/* ---------- El Plan 360º: formato, lo que te llevas y precio ---------- */
.gg-pl-fila{width:100%;max-width:1040px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:12px;align-items:stretch}
.gg-pl-izq{display:flex;flex-direction:column;gap:16px;padding:clamp(18px,2.4vw,26px);background:#fff;border:1px solid #E7E2D9;border-radius:3px}
.gg-pl-pasos{position:relative;list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.gg-pl-raya{position:absolute;left:18px;top:19px;bottom:19px;width:2px;background:#E7E2D9}
.gg-pl-raya span{position:absolute;inset:0;background:#4A5D4E;transform-origin:top;transform:scaleY(var(--p,0));transition:transform .2s linear}
.gg-pl-paso{position:relative;display:grid;grid-template-columns:38px minmax(0,1fr);gap:14px;align-items:start}
.gg-pl-pn{position:relative;z-index:1;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FAF8F4;border:2px solid #C9D3CB;font-family:'IBM Plex Mono',monospace;font-size:13px;color:#716C65;transition:background .35s,border-color .35s,color .35s,transform .35s cubic-bezier(.2,.9,.25,1.3)}
.gg-pl-paso.on .gg-pl-pn{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:scale(1.06)}
.gg-pl-big{font-size:clamp(18px,1.9vw,21px);font-weight:700;letter-spacing:-.025em;color:#1C1A17}
.gg-pl-q{font-size:15px;color:#3D3A34}
.gg-pl-paso p{margin:4px 0 0;font-size:14px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
.gg-pl-llevas{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:1px dashed #D5CFC4}
.gg-pl-llevas ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.gg-pl-llevas li{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;line-height:1.45;color:#1C1A17}
.gg-pl-llevas .gg-gl-ok{width:20px;height:20px;color:#4A5D4E}
.gg-pl-precio{position:relative;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:10px;padding:clamp(20px,2.6vw,30px);background:#1C1A17;color:#FAF8F4;border-radius:3px;overflow:hidden}
.gg-pl-precio::after{content:"";position:absolute;right:-30%;top:-30%;width:70%;aspect-ratio:1;background:radial-gradient(closest-side,rgba(126,155,132,.22),transparent);pointer-events:none}
.gg-pl-precio .gg-gn-k{color:#7E9B84}
.gg-pl-cifra{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.gg-pl-cifra b{font-size:clamp(46px,5.4vw,66px);font-weight:700;letter-spacing:-.05em;line-height:.9;font-variant-numeric:tabular-nums}
.gg-pl-cifra small{font-size:15px;color:#C9C2B6}
.gg-pl-gancho{margin:4px 0 2px;font-size:clamp(16.5px,1.7vw,19px);line-height:1.35;font-weight:700;letter-spacing:-.02em;text-wrap:balance}
.gg-pl-subr{background:linear-gradient(#7E9B84,#7E9B84) 0 92%/100% 3px no-repeat;padding-bottom:2px}
.gg-pl-btn{position:relative;z-index:1;overflow:hidden;align-self:stretch;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:50px;padding:0 18px;border-radius:3px;background:#FAF8F4;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.gg-pl-btn .gg-wa{width:18px;height:18px;flex:none}
.gg-pl-btn:hover,.gg-pl-btn:focus-visible{background:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 18px 34px -16px rgba(0,0,0,.9)}
.gg-pl-btn:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.gg-pl-btn .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.gg-pl-btn:hover .gg-flecha{transform:translateX(5px)}
.gg-pl-dudas{position:relative;z-index:1;align-self:center;display:inline-flex;align-items:center;min-height:44px;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#C9C2B6;text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(201,194,182,.5)}
.gg-pl-dudas:hover{color:#FAF8F4}
.gg-pl-mant{position:relative;z-index:1;margin:0;font-size:13px;line-height:1.5;color:#8A857C;align-self:center;text-align:center;text-wrap:balance}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-pl-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes gg-pl-late{0%,100%{box-shadow:0 0 0 0 rgba(126,155,132,0)}50%{box-shadow:0 0 0 6px rgba(126,155,132,.18)}}
  .gg-pl-btn{animation:gg-pl-late 2.8s ease-in-out infinite}
  .gg-pl-btn::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.3),transparent);animation:gg-pl-brillo 3.4s ease-in-out infinite;pointer-events:none}
  .gg-pl-btn:hover{animation:none}
  .gg-js .gg-pl-subr{background-size:0% 3px;transition:background-size .9s cubic-bezier(.65,0,.35,1) .6s}
  .gg-js .gg-pl-precio.gg-vis .gg-pl-subr{background-size:100% 3px}
}
@media (max-width:860px){
  .gg-gn-grid,.gg-gl-cols,.gg-pl-fila{grid-template-columns:1fr}
}
/* Aperturas, al final del bloque del plan (pedido del dueño) */
.gg-pl .gg-aperturas{width:100%;max-width:1040px;text-align:left}
@media (max-width:420px){
  .gg-gn-cab{flex-wrap:wrap}
  .gg-gn-area{font-size:18px}
}
'''
