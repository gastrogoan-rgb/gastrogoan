"""Página App · Preguntas frecuentes y cierre (pedido del dueño, 16/11).

FAQ revisada contra lo que la app hace HOY (CLAUDE.md). Lo que decía y no era verdad:
- «recibirás un email con el archivo de la app»: no hay archivo; se recibe el ACCESO y se entra en
  app.gastrogoan.com.
- «la conexión solo hace falta para sincronizar con la nube, si decides activarla»: la nube propia
  de cada negocio es obligatoria (y gratuita).
- «¿Y si abro más locales?» no decía que cada local nuevo es otra licencia.
- «importar desde hojas de cálculo»: no está comprobado; se queda la ayuda en persona.
Se añaden: qué cuesta de verdad, de quién son los datos y qué aparatos hacen falta.

Cierre igual que el de Asesoría: franja oscura, la frase de siempre con la segunda línea subrayada
en verde (se pinta al llegar), el botón grande de compra y, debajo, WhatsApp y email con el
mensaje ya escrito."""
from urllib.parse import quote
from asesoria_extras import WA
from asesoria_cta import MAIL

STRIPE = 'https://buy.stripe.com/bJebJ0cKCfN19Bsc19dwc03'

FAQ = {
 'es': ('Preguntas frecuentes', [
  ('¿Cómo recibo la app tras el pago?', 'En menos de 24 horas recibes tu acceso: usuario, PIN y el código de tu negocio. Entras en app.gastrogoan.com desde cualquier aparato y una guía te lleva paso a paso. No hay nada que descargar.'),
  ('¿Cuánto cuesta de verdad?', '240 € + IVA al año; el primer año, 300 € + IVA. Sin comisiones por reserva ni por pedido. Si cobras online con tarjeta, la comisión es la de tu propia cuenta de Stripe.'),
  ('¿Funciona sin conexión a internet?', 'Sí. La app guarda una copia en cada aparato y sigue funcionando si se cae la conexión. Cuando vuelve, se sincroniza sola con la nube de tu negocio.'),
  ('¿De quién son mis datos?', 'Tuyos. Cada negocio guarda sus datos en su propia nube, un proyecto gratuito a su nombre. GastroGoan no los guarda ni los vende.'),
  ('¿Cuántos usuarios pueden usarla?', 'Sin límite de aparatos ni de empleados. Cada persona entra con su PIN y ve lo de su área: cocina, sala o gestión.'),
  ('¿Necesito comprar algo más?', 'No. Funciona en el móvil, la tablet o el ordenador que ya tienes. La impresora de tickets es opcional: vale una Bluetooth o la que ya uses con el ordenador.'),
  ('¿Y si abro más locales?', 'Cada local nuevo es una licencia más. Lo abres como sucursal (hereda carta, recetas, proveedores y protocolos) o como negocio independiente, y los ves todos desde la misma cuenta.'),
  ('¿Qué pasa con las actualizaciones?', 'Incluidas y automáticas: la app se actualiza sola, sin instalar nada y sin coste adicional.'),
  ('¿Necesito conocimientos técnicos?', 'No. Está pensada para el día a día de un local, no para informáticos. La puesta en marcha, nube incluida, se hace con una guía en unos 20 minutos.'),
  ('¿Me ayudas a empezar?', 'Sí. Si necesitas ayuda para pasar tu carta, tus productos o tus proveedores, te acompaño yo mismo.'),
  ('¿Es seguro el pago?', 'El pago se procesa con Stripe. GastroGoan nunca toca ni guarda los datos de tu tarjeta.'),
 ]),
 'ca': ('Preguntes freqüents', [
  ("Com rebo l'app després del pagament?", "En menys de 24 hores reps el teu accés: usuari, PIN i el codi del teu negoci. Entres a app.gastrogoan.com des de qualsevol aparell i una guia et porta pas a pas. No cal descarregar res."),
  ('Quant costa de debò?', "240 € + IVA l'any; el primer any, 300 € + IVA. Sense comissions per reserva ni per comanda. Si cobres en línia amb targeta, la comissió és la del teu propi compte d'Stripe."),
  ('Funciona sense connexió a internet?', "Sí. L'app guarda una còpia a cada aparell i continua funcionant si cau la connexió. Quan torna, se sincronitza sola amb el núvol del teu negoci."),
  ('De qui són les meves dades?', 'Teves. Cada negoci guarda les seves dades al seu propi núvol, un projecte gratuït al seu nom. GastroGoan no les guarda ni les ven.'),
  ('Quants usuaris la poden fer servir?', "Sense límit d'aparells ni d'empleats. Cada persona entra amb el seu PIN i veu el de la seva àrea: cuina, sala o gestió."),
  ('Necessito comprar res més?', "No. Funciona al mòbil, la tauleta o l'ordinador que ja tens. La impressora de tiquets és opcional: serveix una Bluetooth o la que ja facis servir amb l'ordinador."),
  ('I si obro més locals?', 'Cada local nou és una llicència més. L\'obres com a sucursal (hereta carta, receptes, proveïdors i protocols) o com a negoci independent, i els veus tots des del mateix compte.'),
  ('Què passa amb les actualitzacions?', "Incloses i automàtiques: l'app s'actualitza sola, sense instal·lar res i sense cost addicional."),
  ('Necessito coneixements tècnics?', "No. Està pensada per al dia a dia d'un local, no per a informàtics. La posada en marxa, núvol inclòs, es fa amb una guia en uns 20 minuts."),
  ("M'ajudes a començar?", "Sí. Si necessites ajuda per passar la teva carta, els teus productes o els teus proveïdors, t'acompanyo jo mateix."),
  ('És segur el pagament?', 'El pagament es processa amb Stripe. GastroGoan mai toca ni guarda les dades de la teva targeta.'),
 ]),
 'en': ('Frequently asked questions', [
  ('How do I get the app after paying?', 'Within 24 hours you receive your login: username, PIN and your business code. You sign in at app.gastrogoan.com from any device and a guide takes you step by step. Nothing to download.'),
  ('What does it really cost?', '€240 + VAT per year; the first year, €300 + VAT. No fees per booking or order. If you take card payments online, the fee is your own Stripe account’s.'),
  ('Does it work without internet?', 'Yes. The app keeps a copy on every device and keeps working if the connection drops. When it comes back, it syncs with your business’s cloud on its own.'),
  ('Who owns my data?', 'You do. Each business keeps its data in its own cloud, a free project in its own name. GastroGoan does not store or sell it.'),
  ('How many users can use it?', 'No limit on devices or staff. Each person signs in with their PIN and sees their own area: kitchen, floor or management.'),
  ('Do I need to buy anything else?', 'No. It runs on the phone, tablet or computer you already have. A receipt printer is optional: a Bluetooth one works, or the one you already use with your computer.'),
  ('What if I open more venues?', 'Each new venue is one more licence. Open it as a branch (it inherits menus, recipes, suppliers and protocols) or as a separate business, and see them all from the same account.'),
  ('What about updates?', 'Included and automatic: the app updates itself, nothing to install and no extra cost.'),
  ('Do I need technical knowledge?', 'No. It is built for the day-to-day of a venue, not for IT people. Setup, cloud included, takes about 20 minutes with a guide.'),
  ('Will you help me get started?', 'Yes. If you need help bringing over your menu, products or suppliers, I’ll guide you myself.'),
  ('Is payment secure?', 'Payment is processed by Stripe. GastroGoan never touches or stores your card details.'),
 ]),
}

CTA = {
 'es': dict(l1='Tu local trabaja cada día.', l2='Que tu dinero se quede en él', btn='Comprar la app', wa='WhatsApp', mail='Email',
            msg='Hola Marcos, tengo una duda sobre la App GastroGoan.', asunto='Duda sobre la App GastroGoan',
            pie='240 € + IVA / año · Pago seguro con Stripe'),
 'ca': dict(l1='El teu local treballa cada dia.', l2='Que els teus diners s\'hi quedin', btn="Comprar l'app", wa='WhatsApp', mail='Correu',
            msg="Hola Marcos, tinc un dubte sobre l'App GastroGoan.", asunto="Dubte sobre l'App GastroGoan",
            pie="240 € + IVA / any · Pagament segur amb Stripe"),
 'en': dict(l1='Your venue works every day.', l2='Let your money stay in it', btn='Buy the app', wa='WhatsApp', mail='Email',
            msg='Hi Marcos, I have a question about the GastroGoan App.', asunto='Question about the GastroGoan App',
            pie='€240 + VAT / year · Secure payment with Stripe'),
}


def faq(l):
    tit, items = FAQ[l]
    lis = ''.join(f'''<details class="gg-fq-i">
        <summary><span class="gg-fq-n">{k + 1:02d}</span><span class="gg-fq-q">{q}</span><span class="gg-fq-mas" aria-hidden="true"></span></summary>
        <p>{a}</p>
      </details>''' for k, (q, a) in enumerate(items))
    return f'''<!-- faq -->
  <section class="gg-fq">
    <span class="gg-met-et gg-app-rev">FAQ</span>
    <h2 class="gg-fq-h gg-app-rev" style="--d:.08s">{tit}</h2>
    <div class="gg-fq-lista gg-app-rev" style="--d:.16s">{lis}</div>
  </section>

  '''


def cta(l):
    x = CTA[l]
    wa = 'https://wa.me/34622390245?text=' + quote(x['msg'])
    mail = 'mailto:gastrogoan@gmail.com?subject=' + quote(x['asunto']) + '&body=' + quote(x['msg'])
    return f'''<!-- cta final -->
  <section class="gg-fin">
    <h2 class="gg-fin-h"><span class="gg-fin-l1 gg-app-rev">{x['l1']}</span>
      <span class="gg-fin-l2 gg-app-rev" style="--d:.15s"><span class="gg-fin-hl">{x['l2']}</span><span class="gg-fin-pt">.</span></span></h2>
    <a class="gg-fin-btn gg-app-rev" style="--d:.3s" href="{STRIPE}" target="_blank" rel="noopener">{x['btn']}<span class="gg-flecha" aria-hidden="true">→</span></a>
    <div class="gg-fin-cont gg-app-rev" style="--d:.42s">
      <a class="gg-fin-c" href="{wa}" target="_blank" rel="noopener">{WA}<span>{x['wa']}</span></a>
      <a class="gg-fin-c" href="{mail}">{MAIL}<span>{x['mail']}</span></a>
    </div>
    <span class="gg-fin-pie gg-app-rev" style="--d:.5s">{x['pie']}</span>
  </section>

  '''


CSS = '''
/* ---------- Preguntas frecuentes ---------- */
.gg-fq{padding:clamp(48px,6vw,84px) clamp(20px,6vw,64px);border-bottom:1px solid #E7E2D9;display:flex;flex-direction:column;align-items:center;gap:clamp(16px,2.4vw,24px)}
.gg-fq-h{margin:0;font-size:clamp(28px,3.6vw,42px);font-weight:700;letter-spacing:-.03em;line-height:1.12;color:#1C1A17;text-align:center}
.gg-fq-lista{box-sizing:border-box;width:100%;max-width:820px;margin-top:6px;background:#fff;border:1px solid #E7E2D9;border-radius:3px;padding:6px clamp(16px,3vw,32px);box-shadow:0 22px 44px -36px rgba(28,26,23,.45)}
.gg-fq-i{border-bottom:1px dashed #E7E2D9}
.gg-fq-i:last-child{border-bottom:0}
.gg-fq-i summary{list-style:none;display:grid;grid-template-columns:30px minmax(0,1fr) 22px;align-items:center;gap:12px;min-height:56px;padding:8px 0;cursor:pointer}
.gg-fq-i summary::-webkit-details-marker{display:none}
.gg-fq-n{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.06em;color:#4A5D4E;font-weight:600}
.gg-fq-q{font-size:16px;font-weight:600;line-height:1.35;color:#1C1A17;transition:color .25s}
.gg-fq-mas{position:relative;width:22px;height:22px;border-radius:50%;border:1.5px solid #C9C2B6;transition:background .25s,border-color .25s,transform .35s cubic-bezier(.2,.9,.25,1.3)}
.gg-fq-mas::before,.gg-fq-mas::after{content:"";position:absolute;left:50%;top:50%;width:9px;height:1.5px;background:#1C1A17;transform:translate(-50%,-50%);transition:background .25s}
.gg-fq-mas::after{transform:translate(-50%,-50%) rotate(90deg)}
.gg-fq-i summary:hover .gg-fq-q{color:#4A5D4E}
.gg-fq-i summary:hover .gg-fq-mas{border-color:#4A5D4E}
.gg-fq-i summary:focus-visible{outline:2px solid #4A5D4E;outline-offset:2px}
.gg-fq-i[open] .gg-fq-mas{background:#4A5D4E;border-color:#4A5D4E;transform:rotate(45deg)}
.gg-fq-i[open] .gg-fq-mas::before,.gg-fq-i[open] .gg-fq-mas::after{background:#FAF8F4}
.gg-fq-i[open] .gg-fq-q{color:#4A5D4E}
.gg-fq-i p{margin:0;padding:0 34px 18px 42px;font-size:15px;line-height:1.65;color:#3D3A34;text-wrap:pretty}
@media (max-width:480px){.gg-fq-i p{padding:0 0 16px 42px}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-fq-abre{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .gg-fq-i[open] p{animation:gg-fq-abre .35s cubic-bezier(.2,.7,.2,1)}
}
/* Pie oscuro, seguido del cierre, como en Asesoría; enlaces con zona de toque de 44 px */
footer{background:#1C1A17;color:#FAF8F4;border-top:1px solid rgba(250,248,244,.12)}
footer{align-items:center!important}
footer a{display:inline-flex;align-items:center;min-height:44px}
footer>a{color:#FAF8F4}
footer>div{align-items:center;row-gap:0}
/* ---------- Cierre (igual que en Asesoría) ---------- */
.gg-fin{background:#1C1A17;color:#FAF8F4;padding:clamp(64px,9vw,110px) clamp(24px,6vw,64px) clamp(26px,3vw,40px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:clamp(22px,3vw,30px);overflow:hidden}
.gg-fin-h{margin:0;display:flex;flex-direction:column;align-items:center;gap:.14em;font-size:clamp(30px,5vw,58px);font-weight:700;letter-spacing:-.03em;line-height:1.08}
.gg-fin-l1{white-space:nowrap}
.gg-fin-hl{padding:0 .1em;background:linear-gradient(transparent 62%,#4A5D4E 62%,#4A5D4E 94%,transparent 94%) 0 0/100% 100% no-repeat;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.gg-fin-pt{color:#7E9B84}
.gg-fin-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:58px;min-width:280px;padding:0 34px;box-sizing:border-box;border-radius:3px;background:#FAF8F4;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:14px;letter-spacing:.14em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background .25s,color .25s,transform .25s,box-shadow .25s}
.gg-fin-btn:hover,.gg-fin-btn:focus-visible{background:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 18px 34px -16px rgba(0,0,0,.9)}
.gg-fin-btn:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.gg-fin-btn:hover .gg-flecha{transform:translateX(5px)}
.gg-fin-cont{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:280px}
.gg-fin-c{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:0 12px;border:1px solid rgba(250,248,244,.35);border-radius:3px;color:#FAF8F4;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;transition:background .25s,border-color .25s,transform .25s}
.gg-fin-c svg{width:16px;height:16px;flex:none}
.gg-fin-c:hover,.gg-fin-c:focus-visible{background:#4A5D4E;border-color:#4A5D4E;transform:translateY(-2px)}
.gg-fin-c:focus-visible{outline:2px solid #7E9B84;outline-offset:3px}
.gg-fin-pie{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A857C}
@media (max-width:600px){.gg-fin-h{font-size:7.2vw}.gg-fin-l2{font-size:1.2em}.gg-fin-btn{width:100%;max-width:340px;min-width:0}.gg-fin-cont{max-width:340px}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-fin-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  @keyframes gg-fin-empuja{0%,80%,100%{transform:none}88%{transform:translateX(6px)}}
  .gg-fin-btn::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(74,93,78,.3),transparent);animation:gg-fin-brillo 3.4s ease-in-out infinite;pointer-events:none}
  .gg-fin-btn .gg-flecha{animation:gg-fin-empuja 3.4s ease-in-out infinite}
  .gg-fin-btn:hover .gg-flecha{animation:none}
  .gg-js .gg-fin-hl{background-size:0% 100%;transition:background-size 1s cubic-bezier(.65,0,.35,1) .55s}
  .gg-js .gg-fin-l2.gg-vis .gg-fin-hl{background-size:100% 100%}
}
'''
