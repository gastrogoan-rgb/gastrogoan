"""Página App · «Qué incluye» (pedido del dueño, 16/11: «que se note por qué GastroGoan App es una
caña; resaltarlo todo, añadir lo que falte, con un efecto que facilite verlo todo»).

- Cifra que cuenta hacia arriba: «21 herramientas. Una sola app.»
- Filtros por zona del local (Todo · Sala · Cocina · Gestión · Clientes · Siempre): la parrilla se
  reordena con un fundido; por defecto se ve TODO.
- Cada herramienta es una tarjeta con su icono, título, frase y la zona; entran en cascada y al
  pasar el ratón se levantan, se rellena el icono y crece la raya verde. Tres destacadas (más anchas).
- Contenido revisado contra lo que la app hace HOY (CLAUDE.md): se quitó «Sin nube obligatoria» (cada
  negocio tiene su propia nube) y se añadió lo que faltaba (pedidos online, QR, comandas, IA, gestor,
  clientes, vales, campañas, sin internet, idiomas…).
"""

ZONAS = ['sala', 'cocina', 'gestion', 'clientes', 'siempre']
ZN = {
 'es': {'todo': 'Todo', 'sala': 'Sala', 'cocina': 'Cocina', 'gestion': 'Gestión', 'clientes': 'Clientes', 'siempre': 'Siempre'},
 'ca': {'todo': 'Tot', 'sala': 'Sala', 'cocina': 'Cuina', 'gestion': 'Gestió', 'clientes': 'Clients', 'siempre': 'Sempre'},
 'en': {'todo': 'All', 'sala': 'Front of house', 'cocina': 'Kitchen', 'gestion': 'Management', 'clientes': 'Customers', 'siempre': 'Always'},
}
CAB = {
 'es': dict(et='Qué incluye', h2='Tu restaurante bajo control', n='herramientas.', una='Una sola app.', filtro='Ver por zona del local'),
 'ca': dict(et='Què inclou', h2='El teu restaurant sota control', n='eines.', una='Una sola app.', filtro='Veure per zona del local'),
 'en': dict(et="What's included", h2='Your restaurant, under control', n='tools.', una='One single app.', filtro='View by area'),
}

I = {  # iconos de trazo (24×24)
 'tpv': '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
 'reserva': '<rect x="4" y="5" width="16" height="15" rx="1"/><path d="M4 9h16M8 3v4M16 3v4M9 14l2 2 4-4"/>',
 'moto': '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h6l3-6h3M9 8h3l3 9"/>',
 'qr': '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2M18 14h2M14 18h2v2h4"/>',
 'comanda': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
 'escandallo': '<path d="M4 11h16v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M8 11V8M12 11V7M16 11V8"/>',
 'carta': '<path d="M6 4h11a1 1 0 0 1 1 1v15H8a2 2 0 0 1-2-2z"/><path d="M9 8h6M9 12h5"/>',
 'stock': '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 'appcc': '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 'ia': '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/>',
 'resultados': '<path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/>',
 'tesoreria': '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
 'gestor': '<path d="M4 4h10l6 6v10H4z"/><path d="M14 4v6h6M8 14h8M8 17h5"/>',
 'personal': '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.4 5 2.8 5 5.8"/>',
 'panel': '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="5"/><rect x="13" y="10" width="8" height="11"/><rect x="3" y="13" width="8" height="8"/>',
 'clientes': '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
 'vale': '<path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z"/><path d="M10 7v12"/>',
 'campana': '<path d="M3 11v2l13 5V6z"/><path d="M16 9a3 3 0 0 1 0 6M7 14v4h3"/>',
 'local': '<path d="M3 21h18M5 21V9l7-5 7 5v12"/><path d="M10 21v-6h4v6"/>',
 'offline': '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/><path d="M3 3l18 18"/>',
 'idiomas': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
}

# (icono, zona, destacada, {es,ca,en: (título, frase)})
H = [
 ('tpv', 'sala', 1, {'es': ('TPV completo', 'Mesas, comandas, cuentas divididas, cobro en efectivo, tarjeta o vale regalo y cierre de caja. Desde el móvil, la tablet o el ordenador.'),
                     'ca': ('TPV complet', "Taules, comandes, comptes dividits, cobrament en efectiu, targeta o val regal i tancament de caixa. Des del mòbil, la tauleta o l'ordinador."),
                     'en': ('Full POS', 'Tables, orders, split bills, cash, card or gift-voucher payments and end-of-day cash-up. From phone, tablet or computer.')}),
 ('reserva', 'sala', 0, {'es': ('Reservas online', 'Tu propia web de reservas. Si hay sitio, se confirma sola. Sin comisiones por reserva.'),
                         'ca': ('Reserves en línia', 'La teva pròpia web de reserves. Si hi ha lloc, es confirma sola. Sense comissions per reserva.'),
                         'en': ('Online bookings', 'Your own booking page. If there is room, it confirms itself. No fees per booking.')}),
 ('moto', 'sala', 0, {'es': ('Para llevar y a domicilio', 'Pedidos desde tu web, zonas por código postal y seguimiento en vivo para el cliente.'),
                      'ca': ('Per emportar i a domicili', 'Comandes des de la teva web, zones per codi postal i seguiment en directe per al client.'),
                      'en': ('Takeaway & delivery', 'Orders from your own website, delivery areas by postcode and live tracking for the customer.')}),
 ('qr', 'sala', 0, {'es': ('Carta QR y autopedido', 'El cliente ve la carta y pide desde la mesa. Cobro en el local o con tarjeta, tú eliges.'),
                    'ca': ('Carta QR i autocomanda', 'El client veu la carta i demana des de la taula. Cobrament al local o amb targeta, tu tries.'),
                    'en': ('QR menu & self-ordering', 'Guests see the menu and order from the table. Pay at the venue or by card, your choice.')}),
 ('comanda', 'cocina', 0, {'es': ('Comandas en pantalla', 'Cocina ve cada pedido por rondas y lo avanza con un toque. Sin papeles perdidos.'),
                           'ca': ('Comandes en pantalla', 'La cuina veu cada comanda per rondes i la fa avançar amb un toc. Sense papers perduts.'),
                           'en': ('Kitchen display', 'The kitchen sees each order by course and moves it on with one tap. No lost tickets.')}),
 ('escandallo', 'cocina', 0, {'es': ('Escandallos y fichas técnicas', 'El coste real de cada plato y su food cost frente a tu objetivo, al céntimo.'),
                              'ca': ('Escandalls i fitxes tècniques', 'El cost real de cada plat i el seu food cost davant el teu objectiu, al cèntim.'),
                              'en': ('Costing & spec sheets', 'The real cost of every dish and its food cost against your target, to the cent.')}),
 ('carta', 'cocina', 0, {'es': ('Carta y menús', 'Alérgenos, platos agotados al momento y menús por pasos, en sala y en la web.'),
                         'ca': ('Carta i menús', "Al·lèrgens, plats esgotats a l'instant i menús per passos, a sala i a la web."),
                         'en': ('Menus & dishes', 'Allergens, sold-out dishes in an instant and set menus by course, in the room and online.')}),
 ('stock', 'cocina', 0, {'es': ('Stock y proveedores', 'Mínimos, pedido sugerido según lo que falta y recepción que comprueba lo que llega.'),
                         'ca': ('Estoc i proveïdors', 'Mínims, comanda suggerida segons el que falta i recepció que comprova el que arriba.'),
                         'en': ('Stock & suppliers', 'Minimum levels, suggested orders for what is missing and deliveries checked on arrival.')}),
 ('appcc', 'cocina', 0, {'es': ('APPCC y limpieza', 'Protocolos, temperaturas, alérgenos y mantenimiento. Sin papel y listo para una inspección.'),
                         'ca': ('APPCC i neteja', 'Protocols, temperatures, al·lèrgens i manteniment. Sense paper i a punt per a una inspecció.'),
                         'en': ('HACCP & cleaning', 'Protocols, temperatures, allergens and maintenance. Paperless and inspection-ready.')}),
 ('ia', 'cocina', 1, {'es': ('I+D con inteligencia artificial', 'Crea platos, menús y cartas con tus ingredientes, tus precios y tu estilo. La app calcula el coste de cada propuesta.'),
                      'ca': ('R+D amb intel·ligència artificial', "Crea plats, menús i cartes amb els teus ingredients, els teus preus i el teu estil. L'app calcula el cost de cada proposta."),
                      'en': ('R&D with artificial intelligence', 'Create dishes, set menus and full menus with your ingredients, prices and style. The app costs every proposal.')}),
 ('resultados', 'gestion', 1, {'es': ('Cuenta de resultados de verdad', 'La del gestor: según tu forma jurídica, con impuestos, amortizaciones y lo que te queda de verdad cada mes.'),
                               'ca': ('Compte de resultats de debò', 'La del gestor: segons la teva forma jurídica, amb impostos, amortitzacions i el que et queda de debò cada mes.'),
                               'en': ('A real profit & loss', 'Your accountant’s version: by legal form, with taxes, depreciation and what you really keep each month.')}),
 ('tesoreria', 'gestion', 0, {'es': ('Tesorería y previsión', 'El dinero que no es tuyo, los pagos a Hacienda y la caja de los próximos 90 días.'),
                              'ca': ('Tresoreria i previsió', "Els diners que no són teus, els pagaments a Hisenda i la caixa dels propers 90 dies."),
                              'en': ('Cash flow & forecast', 'The money that is not yours, tax payments due and your cash for the next 90 days.')}),
 ('gestor', 'gestion', 0, {'es': ('Enviar al gestor', 'Un clic: Excel, libros de ingresos y gastos y las facturas del periodo en un solo archivo.'),
                           'ca': ('Enviar al gestor', "Un clic: Excel, llibres d'ingressos i despeses i les factures del període en un sol arxiu."),
                           'en': ('Send to your accountant', 'One click: Excel, income and expense books and the period’s invoices in a single file.')}),
 ('personal', 'gestion', 0, {'es': ('Personal y horarios', 'Fichajes, turnos, vacaciones, nóminas y lo que toca hacer en cada puesto.'),
                             'ca': ('Personal i horaris', 'Fitxatges, torns, vacances, nòmines i el que toca fer a cada lloc.'),
                             'en': ('Staff & schedules', 'Clock-ins, shifts, holidays, payroll and what each role has to do.')}),
 ('panel', 'gestion', 0, {'es': ('Panel de control', 'Punto de equilibrio, ventas, gastos y lo que necesita tu atención hoy, de un vistazo.'),
                          'ca': ('Tauler de control', "Punt d'equilibri, vendes, despeses i el que necessita la teva atenció avui, d'un cop d'ull."),
                          'en': ('Dashboard', 'Break-even, sales, costs and what needs your attention today, at a glance.')}),
 ('clientes', 'clientes', 0, {'es': ('Ficha de cada cliente', 'Visitas, gasto, alergias y quién hace tiempo que no viene.'),
                              'ca': ('Fitxa de cada client', 'Visites, despesa, al·lèrgies i qui fa temps que no ve.'),
                              'en': ('Customer profiles', 'Visits, spend, allergies and who has not been back for a while.')}),
 ('vale', 'clientes', 0, {'es': ('Vales regalo', 'Los emites, se cobran en el TPV y van solos a la contabilidad.'),
                          'ca': ('Vals regal', "Els emets, es cobren al TPV i van sols a la comptabilitat."),
                          'en': ('Gift vouchers', 'Issue them, redeem them at the POS and they go straight into your books.')}),
 ('campana', 'clientes', 0, {'es': ('Campañas por email y WhatsApp', 'Novedades a tus clientes desde tu correo y tu WhatsApp, sin pagar nada más.'),
                             'ca': ('Campanyes per correu i WhatsApp', 'Novetats als teus clients des del teu correu i el teu WhatsApp, sense pagar res més.'),
                             'en': ('Email & WhatsApp campaigns', 'News for your customers from your own email and WhatsApp, at no extra cost.')}),
 ('local', 'siempre', 0, {'es': ('Varios locales', 'Sucursales que heredan carta y recetas, y todos tus negocios en una sola cuenta.'),
                          'ca': ('Diversos locals', 'Sucursals que hereten carta i receptes, i tots els teus negocis en un sol compte.'),
                          'en': ('Several venues', 'Branches that inherit menus and recipes, and all your businesses in one account.')}),
 ('offline', 'siempre', 0, {'es': ('Sigue sin internet', 'Si se cae la conexión, el servicio no para. Y tus datos viven en tu propia nube.'),
                            'ca': ('Continua sense internet', 'Si cau la connexió, el servei no s’atura. I les teves dades viuen al teu propi núvol.'),
                            'en': ('Works offline', 'If the connection drops, service keeps going. And your data lives in your own cloud.')}),
 ('idiomas', 'siempre', 0, {'es': ('En tres idiomas', 'Castellano, catalán e inglés, para ti, tu equipo y tus clientes.'),
                            'ca': ('En tres idiomes', 'Castellà, català i anglès, per a tu, el teu equip i els teus clients.'),
                            'en': ('In three languages', 'Spanish, Catalan and English, for you, your team and your customers.')}),
]


def svg(k):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{I[k]}</svg>'


def incluye(l):
    c = CAB[l]
    cards = ''
    for n, (ic, zona, dest, tx) in enumerate(H):
        t, d = tx[l]
        cards += f'''<article class="gg-in-card{' dest' if dest else ''} gg-app-rev" style="--d:{(n % 6) * 0.06:.2f}s;--f:{(n * 0.37) % 3:.2f}s">
          <span class="gg-in-ic">{svg(ic)}</span>
          <h3 class="gg-in-t">{t}</h3>
          <p class="gg-in-d">{d}</p>
        </article>'''
    # Cinta que corre con los nombres de todo lo que incluye (dos filas, sentidos contrarios)
    nombres = [tx[l][0] for _, _, _, tx in H]
    def fila(lista):
        return ''.join(f'<span>{x}</span><i aria-hidden="true">✦</i>' for x in lista)
    m1 = fila(nombres[:11]); m2 = fila(nombres[11:] + nombres[:2])
    return f'''<!-- qué incluye: todas las herramientas -->
  <section class="gg-in">
    <div class="gg-in-cab">
      <span class="gg-met-et gg-app-rev">{c['et']}</span>
      <h2 class="gg-in-h gg-app-rev" style="--d:.08s">{c['h2']}</h2>
      <div class="gg-in-num gg-app-rev" style="--d:.16s">
        <b class="gg-in-cuenta" data-n="{len(H)}">{len(H)}</b>
        <span class="gg-in-num-t"><span>{c['n']}</span><strong>{c['una']}</strong></span>
      </div>
    </div>
    <div class="gg-in-cinta" aria-hidden="true">
      <div class="gg-in-fila"><div>{m1}{m1}</div></div>
      <div class="gg-in-fila al-reves"><div>{m2}{m2}</div></div>
    </div>
    <div class="gg-in-grid">{cards}</div>
    <script>
    /* Cifra que cuenta (como un marcador), luz que sigue al ratón por la parrilla y, en móvil,
       un toque abre cada tarjeta. Delegación en document: la página se monta dos veces. */
    (function(){{
      if(window.__ggIn) return; window.__ggIn=1;
      var quieto=matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.addEventListener('click',function(e){{
        var c=e.target.closest&&e.target.closest('.gg-in-card'); if(!c||c.classList.contains('dest')) return;
        if(!matchMedia('(max-width:560px)').matches) return;
        c.classList.toggle('abierta'); c.setAttribute('aria-expanded',c.classList.contains('abierta'));
      }});
      document.addEventListener('pointermove',function(e){{
        var c=e.target.closest&&e.target.closest('.gg-in-card'); if(!c||e.pointerType!=='mouse') return;
        var r=c.getBoundingClientRect(), x=(e.clientX-r.left)/r.width, y=(e.clientY-r.top)/r.height;
        c.style.setProperty('--mx',(x*100)+'%'); c.style.setProperty('--my',(y*100)+'%');
        if(!quieto) c.style.setProperty('--rx',((0.5-y)*6)+'deg'), c.style.setProperty('--ry',((x-0.5)*8)+'deg');
      }});
      document.addEventListener('pointerout',function(e){{
        var c=e.target.closest&&e.target.closest('.gg-in-card'); if(!c||c.contains(e.relatedTarget)) return;
        c.style.removeProperty('--rx'); c.style.removeProperty('--ry');
      }});
      function cuenta(){{
        var el=document.querySelector('.gg-in-cuenta'); if(!el||el.dataset.hecho) return;
        if(el.getBoundingClientRect().top>innerHeight*0.85) return;
        el.dataset.hecho=1; var caja=el.parentNode;
        if(quieto){{caja.classList.add('fin');return}}
        var n=+el.dataset.n,t0=performance.now(),ult=-1;
        (function p(t){{
          var q=Math.min(1,(t-t0)/1600),v=Math.round(n*(1-Math.pow(1-q,4)));
          if(v!==ult){{el.textContent=v;ult=v;el.classList.remove('tic');void el.offsetWidth;el.classList.add('tic')}}
          if(q<1&&document.body.contains(el))requestAnimationFrame(p); else caja.classList.add('fin');
        }})(t0);
      }}
      addEventListener('scroll',cuenta,{{passive:true}});
      var i=0,iv=setInterval(function(){{cuenta();if(++i>60)clearInterval(iv)}},250);
    }})();
    </script>
  </section>

  '''


CSS = '''
/* ---------- Qué incluye ---------- */
.gg-in{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);border-bottom:1px solid #E7E2D9;display:flex;flex-direction:column;align-items:center;gap:clamp(22px,3vw,32px)}
.gg-in-cab{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center}
.gg-in-h{margin:0;font-size:clamp(28px,3.6vw,42px);font-weight:700;letter-spacing:-.03em;line-height:1.12;color:#1C1A17;text-wrap:balance}
.gg-in-num{position:relative;display:flex;align-items:center;gap:clamp(12px,2vw,20px);margin-top:6px}
.gg-in-cuenta{display:inline-block;min-width:1.15em;font-size:clamp(80px,11vw,140px);font-weight:700;line-height:.85;letter-spacing:-.05em;color:#4A5D4E;font-variant-numeric:tabular-nums;text-align:right}
.gg-in-num-t{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;font-size:clamp(18px,2.2vw,24px);color:#3D3A34;line-height:1.2}
.gg-in-num-t strong{position:relative;font-weight:700;color:#1C1A17;padding:0 .08em}
.gg-in-num-t strong::before{content:"";position:absolute;left:0;right:0;bottom:.04em;height:.42em;background:#C5D6BF;z-index:-1;transform-origin:left;transform:scaleX(1)}
.gg-in-num-t strong{z-index:0}
/* La cinta: dos filas de nombres que corren en sentidos contrarios, a todo el ancho */
.gg-in-cinta{width:calc(100% + 2*clamp(20px,6vw,64px));display:flex;flex-direction:column;gap:6px;overflow:hidden;padding:10px 0;border-top:1px solid #E7E2D9;border-bottom:1px solid #E7E2D9;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.gg-in-fila{overflow:hidden;white-space:nowrap}
.gg-in-fila>div{display:inline-flex;align-items:center;gap:22px;padding-right:22px}
.gg-in-fila span{font-size:clamp(20px,2.6vw,32px);font-weight:700;letter-spacing:-.025em;color:#1C1A17}
.gg-in-fila.al-reves span{color:transparent;-webkit-text-stroke:1px #4A5D4E}
.gg-in-fila i{font-style:normal;font-size:14px;color:#4A5D4E}
.gg-in-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:820px}
.gg-in-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid #D5CFC4;border-radius:3px;background:#fff;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;transition:background .25s,color .25s,border-color .25s}
.gg-in-chip span{font-size:11px;color:#716C65;transition:color .25s}
.gg-in-chip:hover{border-color:#4A5D4E}
.gg-in-chip.on{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}
.gg-in-chip.on span{color:#C5D6BF}
.gg-in-chip:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-in-grid{width:100%;max-width:1160px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));grid-auto-flow:dense;gap:14px}
.gg-in-card{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:22px 22px 18px;background:#fff;border:1px solid #E7E2D9;border-radius:3px;overflow:hidden;transition:transform .35s cubic-bezier(.2,.7,.2,1),box-shadow .35s,border-color .35s}
.gg-in-card::before{content:"";position:absolute;left:0;top:0;height:3px;width:0;background:#4A5D4E;transition:width .5s cubic-bezier(.65,0,.35,1)}
.gg-in-grid{perspective:1200px}
.gg-in-card{transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));background-image:radial-gradient(260px circle at var(--mx,-999px) var(--my,-999px),rgba(74,93,78,.10),transparent 60%)}
.gg-in-card.dest{background-image:radial-gradient(300px circle at var(--mx,-999px) var(--my,-999px),rgba(126,155,132,.22),transparent 60%)}
.gg-in-card:hover{transform:translateY(-4px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));border-color:#C9D3CB;box-shadow:0 22px 40px -26px rgba(28,26,23,.45)}
.gg-in-card:hover::before{width:100%}
.gg-in-ic{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#EEF2EC;color:#4A5D4E;transition:background .3s,color .3s,transform .4s cubic-bezier(.2,.9,.25,1.3)}
.gg-in-ic svg{width:23px;height:23px}
.gg-in-card:hover .gg-in-ic{background:#4A5D4E;color:#FAF8F4;transform:rotate(-8deg) scale(1.06)}
.gg-in-t{margin:4px 0 0;font-size:17px;font-weight:700;letter-spacing:-.015em;line-height:1.25;color:#1C1A17}
.gg-in-d{margin:0;flex:1;font-size:14.5px;line-height:1.55;color:#3D3A34;text-wrap:pretty}
/* (sin zona: el dueño quitó las etiquetas) */
.gg-in-z{display:none;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#716C65}
/* Las destacadas: en tinta, más anchas */
.gg-in-card.dest{background-color:#1C1A17;border-color:#1C1A17}
.gg-in-card.dest .gg-in-t{color:#FAF8F4;font-size:clamp(19px,1.9vw,22px)}
.gg-in-card.dest .gg-in-d{color:#C9C2B6;font-size:15px}
.gg-in-card.dest .gg-in-z{color:#7E9B84}
.gg-in-card.dest .gg-in-ic{background:#4A5D4E;color:#FAF8F4}
.gg-in-card.dest::before{background:#7E9B84}
.gg-in-card.dest:hover{border-color:#4A5D4E}
@media (min-width:900px){.gg-in-card.dest{grid-column:span 2}}
.gg-in-card.fuera{display:none}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-in-entra{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
  @keyframes gg-in-corre{to{transform:translateX(-50%)}}
  @keyframes gg-in-flota{0%,100%{translate:0 0}50%{translate:0 -4px}}
  @keyframes gg-in-tic{0%{transform:translateY(-.08em);opacity:.6}100%{transform:none;opacity:1}}
  .gg-in-fila>div{animation:gg-in-corre 48s linear infinite}
  .gg-in-fila.al-reves>div{animation-direction:reverse;animation-duration:56s}
  .gg-in-cinta:hover .gg-in-fila>div{animation-play-state:paused}
  .gg-in-ic svg{animation:gg-in-flota 3.4s ease-in-out var(--f,0s) infinite}
  .gg-in-cuenta.tic{animation:gg-in-tic .14s ease-out}
  .gg-js .gg-in-num-t strong::before{transform:scaleX(0);transition:transform .8s cubic-bezier(.65,0,.35,1) .1s}
  .gg-js .gg-in-num.fin .gg-in-num-t strong::before{transform:scaleX(1)}
  .gg-js .gg-in-num.fin .gg-in-cuenta{animation:gg-in-pop .5s cubic-bezier(.2,.9,.25,1.4)}
  @keyframes gg-in-pop{0%{transform:scale(1)}40%{transform:scale(1.08)}100%{transform:scale(1)}}
  .gg-in-card.entra{animation:gg-in-entra .45s cubic-bezier(.2,.7,.2,1) var(--e,0s) both}
  .gg-js .gg-in-card.gg-app-rev .gg-in-ic{transform:scale(.4) rotate(-30deg);opacity:0;transition:transform .55s cubic-bezier(.2,.9,.25,1.3) calc(var(--d,0s) + .2s),opacity .3s calc(var(--d,0s) + .2s),background .3s,color .3s}
  .gg-js .gg-in-card.gg-app-rev.gg-vis .gg-in-ic{transform:none;opacity:1}
  .gg-js .gg-in-card.gg-app-rev.gg-vis:hover .gg-in-ic{transform:rotate(-8deg) scale(1.06)}
}
/* Móvil (norma «lo denso se pliega»): dos por fila con icono y título; un toque abre la frase.
   Las destacadas van a lo ancho y abiertas. */
@media (max-width:560px){
  .gg-in-grid{grid-template-columns:1fr 1fr;gap:10px}
  .gg-in-chip{padding:0 12px;letter-spacing:.06em}
  .gg-in-card{padding:16px 14px 14px;gap:8px;cursor:pointer}
  .gg-in-card:not(.dest):not(.abierta) .gg-in-d,.gg-in-card:not(.dest):not(.abierta) .gg-in-z{display:none}
  .gg-in-card.dest,.gg-in-card.abierta{grid-column:1/-1}
  .gg-in-card:not(.dest)::after{content:"+";position:absolute;right:12px;top:10px;font-family:'IBM Plex Mono',monospace;font-size:18px;color:#716C65;transition:transform .3s}
  .gg-in-card.abierta::after{transform:rotate(45deg)}
  .gg-in-t{font-size:15px}
  .gg-in-ic{width:40px;height:40px}
  .gg-in-ic svg{width:20px;height:20px}
}
'''
