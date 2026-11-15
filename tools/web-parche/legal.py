#!/usr/bin/env python3
"""Páginas legales de la web comercial (16/11): aviso legal (LSSI art. 10), privacidad (RGPD art. 13,
con la parte de cookies) y condiciones de compra de la App (contratación electrónica, art. 23 LSSI:
no hace falta firma; se aceptan con la casilla del pago de Stripe). Tres idiomas.

⚠️ Mientras falte un dato del titular (DATOS), la página sale con un aviso [PENDIENTE] y el script lo
dice: NO publicar así. ⚠️ Es un texto de partida escrito con cuidado, no un dictamen: conviene que lo
lea un abogado antes de vender a escala.
Uso: python3 tools/web-parche/legal.py   (luego seo.py, que pone los enlaces al pie de cada página)
"""
import html, os, sys
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..', 'deploy', 'web', 'public')
BASE = 'https://gastrogoan.com'
e = lambda x: html.escape(x, quote=True)

# ---- Datos del titular: los que faltan salen como [PENDIENTE] ----
PEND = '[PENDIENTE]'
DATOS = dict(
    titular='Marcos González Anguiano',   # autónomo; Le Petit Comité es del mismo titular
    nif='47668150Y',
    domicilio='Plaza Marià Manent, 13, 08720 Vilafranca del Penedès (Barcelona)',
    registro='',           # solo si es sociedad: «Inscrita en el Registro Mercantil de …, tomo …, folio …, hoja …»
    email='gastrogoan@gmail.com',
    tel='+34 622 390 245',
    actualizado={'es': '16 de noviembre de 2026', 'ca': '16 de novembre de 2026', 'en': '16 November 2026'},
)

PAGS = {
 'aviso': {'es': 'aviso-legal', 'ca': 'avis-legal', 'en': 'legal-notice'},
 'privacidad': {'es': 'privacidad', 'ca': 'privacitat', 'en': 'privacy'},
 'condiciones': {'es': 'condiciones', 'ca': 'condicions', 'en': 'terms'},
}
NOMBRES = {
 'aviso': {'es': 'Aviso legal', 'ca': 'Avís legal', 'en': 'Legal notice'},
 'privacidad': {'es': 'Privacidad y cookies', 'ca': 'Privacitat i galetes', 'en': 'Privacy and cookies'},
 'condiciones': {'es': 'Condiciones de compra de la App', 'ca': 'Condicions de compra de l’App', 'en': 'App terms of purchase'},
}
UI = {
 'es': dict(volver='Volver', act='Última actualización', inicio='index.html', indice='En esta página'),
 'ca': dict(volver='Tornar', act='Darrera actualització', inicio='ca-inici.html', indice='En aquesta pàgina'),
 'en': dict(volver='Back', act='Last updated', inicio='en-home.html', indice='On this page'),
}


def d(k):
    v = DATOS[k]
    return f'<span class="pend">{v}</span>' if v == PEND else e(v)


def mail():
    return f'<a href="mailto:{DATOS["email"]}">{DATOS["email"]}</a>'


def link(pag, l, txt=None):
    return f'<a href="{PAGS[pag][l]}">{txt or NOMBRES[pag][l]}</a>'


def textos(l):
    T, NIF, DOM, M, TEL = d('titular'), d('nif'), d('domicilio'), mail(), e(DATOS['tel'])
    REG = f' {e(DATOS["registro"])}.' if DATOS['registro'] else ''
    if l == 'es':
        return {
 'aviso': [
  ('Quién está detrás de esta web', [
   f'Esta web (gastrogoan.com y sus páginas) es de <b>{T}</b>, con NIF <b>{NIF}</b> y domicilio en {DOM}.{REG}',
   f'Contacto: {M} · teléfono y WhatsApp {TEL}.',
   'Bajo la marca GastroGoan se ofrecen tres servicios: la asesoría a negocios de hostelería, la App de gestión GastroGoan y los eventos gastronómicos de Le Petit Comité.']),
  ('Para qué sirve esta web', [
   'Informar de esos servicios y permitir el contacto (WhatsApp, email e Instagram) y la compra de la App. La asesoría y los eventos se contratan con una propuesta y un presupuesto a medida; la App, en línea, con sus ' + link('condiciones', l, 'condiciones de compra') + '.']),
  ('Propiedad intelectual', [
   'Los textos, el diseño, las fotografías, los logotipos y el software de esta web y de la App son de su titular o se usan con permiso. No se pueden copiar, distribuir ni transformar sin autorización por escrito, salvo para el uso personal de consulta.']),
  ('Responsabilidad', [
   'Cuidamos que la información sea correcta y esté al día, pero puede contener errores o cambiar sin previo aviso. Los precios válidos son los que figuran en el momento de la compra o en el presupuesto aceptado.',
   'Los enlaces a otras webs (WhatsApp, Instagram, Stripe…) llevan a servicios de terceros que tienen sus propias condiciones y de los que no somos responsables.']),
  ('Datos personales', ['Cómo tratamos tus datos se explica en ' + link('privacidad', l, 'Privacidad y cookies') + '.']),
  ('Ley aplicable', ['Esta web se rige por la ley española. Para cualquier conflicto, si eres consumidor, serán competentes los juzgados de tu domicilio; en los demás casos, los del domicilio del titular.']),
 ],
 'privacidad': [
  ('Responsable', [f'<b>{T}</b> · NIF {NIF} · {DOM} · {M} · {TEL}.']),
  ('Qué datos tratamos y para qué', [
   '<b>Si nos escribes</b> por WhatsApp, email o Instagram: tu nombre, tu teléfono o email y lo que nos cuentes. Para contestarte y, si lo pides, prepararte una propuesta o un presupuesto.',
   '<b>Si compras la App</b>: los datos de facturación que introduces en la página de pago (nombre o empresa, NIF, dirección, email). Para darte de alta, enviarte tu acceso, emitir la factura y prestarte el servicio. Los datos de la tarjeta los trata Stripe directamente: nunca llegan a nosotros.',
   '<b>Si contratas la asesoría o un evento</b>: los datos necesarios para la propuesta, el servicio y la factura.',
   'No usamos tus datos para publicidad de terceros ni los vendemos. No tomamos decisiones automatizadas sobre ti.']),
  ('Por qué podemos tratarlos (base legal)', [
   'Contestar a tu mensaje y preparar una propuesta: tu petición (medidas precontractuales, art. 6.1.b RGPD). Prestar el servicio que compras: el contrato (art. 6.1.b). Facturar y llevar la contabilidad: la obligación legal (art. 6.1.c).']),
  ('Cuánto tiempo los guardamos', [
   'Los mensajes, mientras dure la conversación y hasta un año después si no llega a haber contrato. Los datos de clientes, mientras dure la relación y, después, el tiempo que obligan las leyes mercantiles y fiscales (hasta 6 años).']),
  ('Quién más los ve (encargados y terceros)', [
   'Solo los proveedores necesarios para funcionar: <b>Cloudflare</b> (alojamiento de esta web), <b>Stripe</b> (pagos), <b>Google</b> (correo y la base de datos de la plataforma de licencias) y <b>Meta</b> (WhatsApp e Instagram, si nos escribes por ahí). Algunos están en Estados Unidos; las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo de la Comisión Europea.',
   'Tu gestoría o la Agencia Tributaria recibirán los datos de facturación cuando la ley lo exija.']),
  ('Tus derechos', [
   f'Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad de tus datos escribiendo a {M}. Si crees que no los tratamos bien, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).']),
  ('Cookies', [
   'Esta web <b>no usa cookies</b> ni guarda nada en tu navegador para medirte o enseñarte publicidad, por eso no te pedimos permiso con un aviso. Las tipografías se sirven desde esta misma web.',
   'Si mides las visitas, lo hacemos con Cloudflare Web Analytics, que no usa cookies ni identifica a nadie. Al pulsar un botón de WhatsApp, Instagram o de pago saltas a esos servicios, que tienen su propia política de cookies.']),
  ('Datos que guardas en la App', [
   'Los datos de tu negocio y de tus clientes (reservas, ventas, personal…) se guardan en <b>tu propio proyecto de Firebase</b>, en tu cuenta de Google. Tú eres el responsable de esos datos. Lo que hacemos con la parte que pasa por nuestra plataforma está en las ' + link('condiciones', l, 'condiciones de compra') + '.']),
 ],
 'condiciones': [
  ('Qué compras', [
   'Una <b>licencia anual de uso de la App GastroGoan</b> para <b>un negocio</b> (un local). Incluye todas las herramientas de la App, todas las actualizaciones que publiquemos mientras la licencia esté en vigor y ayuda por WhatsApp y email. Cada local adicional necesita su propia licencia.',
   'La App la usan negocios: se contrata como empresario o profesional, para la actividad de tu negocio.']),
  ('Precio y pago', [
   'El primer año: <b>300 € + IVA</b>. Cada renovación anual siguiente: <b>240 € + IVA</b>. El IVA aplicable es el vigente en la fecha de la factura.',
   'El pago se hace en línea con tarjeta a través de Stripe, como una suscripción anual. Recibirás la factura en el email que indiques.',
   '<b>No están incluidos</b>: el equipo (tablet, móvil, impresora, cajón), las comisiones de Stripe u otros servicios que el negocio contrate para cobrar a sus clientes, ni los costes de Google si el uso de tu proyecto de Firebase supera su plan gratuito.']),
  ('Cómo se contrata', [
   'El contrato se celebra por medios electrónicos y es válido sin firma (art. 23 de la Ley 34/2002). Al pagar, marcas la casilla de aceptación de estas condiciones; Stripe guarda la fecha y hora de esa aceptación. Estas condiciones quedan publicadas en esta dirección y puedes guardarlas o imprimirlas.',
   'Tras el pago recibirás tu usuario y PIN de propietario, el código de tu negocio y una guía de puesta en marcha.']),
  ('Puesta en marcha y requisitos', [
   'Para usar la App necesitas un navegador actualizado y conexión a internet para sincronizar entre aparatos (sin conexión, la App sigue funcionando y sube los cambios al volver).',
   'Es obligatorio crear un <b>proyecto gratuito de Firebase en tu cuenta de Google</b>: ahí se guardan tus datos. La guía explica cómo, paso a paso.']),
  ('Duración, renovación y baja', [
   'La licencia dura un año y <b>se renueva automáticamente cada año</b> como suscripción de Stripe: en cada aniversario se cobran 240 € + IVA a la tarjeta con la que pagaste. Puedes cancelar la renovación cuando quieras escribiéndonos antes de esa fecha; la licencia seguirá activa hasta el final del año ya pagado.', 'Los pagos <b>no son reembolsables</b>: no se devuelve el importe pagado ni la parte no usada del año en curso.',
   'Tus datos son tuyos y siguen en tu proyecto de Firebase cuando la licencia termina; puedes exportarlos desde la App (por ejemplo, el paquete para el gestor) mientras esté activa.']),
  ('Uso correcto y suspensión', [
   'La licencia es personal del negocio, no exclusiva e intransferible. No se puede copiar, revender, ceder ni intentar sortear los controles de licencia de la App. En caso de impago o de un uso así podremos suspender o revocar la licencia, avisando antes cuando sea posible.']),
  ('Tus datos y los de tus clientes', [
   'Tú eres el <b>responsable del tratamiento</b> de los datos que guardas en la App (clientes, reservas, personal…), y decides para qué los usas. Esos datos viven en tu propio proyecto de Firebase; nosotros no tenemos acceso a ellos.',
   'Una parte pequeña pasa por la plataforma de GastroGoan para que el servicio funcione: tu cuenta (usuario y la lista de tus negocios), el código de licencia, la guía pública que lleva a tu web de reservas y, mientras tu nube no tenga las reglas actualizadas, las solicitudes de reserva y pedido que llegan de tu web. Para esa parte actuamos como <b>encargado del tratamiento</b> (art. 28 RGPD): solo la usamos para prestarte el servicio, con confidencialidad y medidas de seguridad, con Google (Firebase) y Cloudflare como subencargados, y la borramos o te la devolvemos al terminar el contrato.',
   'Las obligaciones fiscales del negocio (presentar modelos, VeriFactu cuando sea exigible) son tuyas y de tu gestor: la App ordena y calcula los datos, pero no es una gestoría ni presenta nada ante Hacienda.']),
  ('Disponibilidad y responsabilidad', [
   'Trabajamos para que la App funcione siempre, pero no podemos garantizar que no haya interrupciones, sobre todo de servicios de terceros (Google, Cloudflare, Stripe, la conexión a internet).',
   'Salvo dolo o culpa grave, nuestra responsabilidad total está limitada al importe que hayas pagado por la licencia en los últimos 12 meses, y no cubre el lucro cesante ni la pérdida de datos que se habría evitado con las copias de seguridad que ofrece la App.']),
  ('Cambios y ley aplicable', [
   'Podemos actualizar estas condiciones; los cambios se aplican desde la siguiente renovación y te los comunicaremos antes. El contrato se rige por la ley española y, para cualquier conflicto, son competentes los juzgados del domicilio del titular.',
   f'¿Dudas? Escríbenos a {M} o al WhatsApp {TEL}.']),
 ]}
    if l == 'ca':
        return {
 'aviso': [
  ('Qui hi ha darrere d’aquest web', [
   f'Aquest web (gastrogoan.com i les seves pàgines) és de <b>{T}</b>, amb NIF <b>{NIF}</b> i domicili a {DOM}.{REG}',
   f'Contacte: {M} · telèfon i WhatsApp {TEL}.',
   'Sota la marca GastroGoan s’ofereixen tres serveis: l’assessoria a negocis d’hostaleria, l’App de gestió GastroGoan i els esdeveniments gastronòmics de Le Petit Comité.']),
  ('Per a què serveix aquest web', [
   'Informar d’aquests serveis i permetre el contacte (WhatsApp, correu i Instagram) i la compra de l’App. L’assessoria i els esdeveniments es contracten amb una proposta i un pressupost a mida; l’App, en línia, amb les seves ' + link('condiciones', l, 'condicions de compra') + '.']),
  ('Propietat intel·lectual', [
   'Els textos, el disseny, les fotografies, els logotips i el programari d’aquest web i de l’App són del seu titular o s’utilitzen amb permís. No es poden copiar, distribuir ni transformar sense autorització per escrit, excepte per a l’ús personal de consulta.']),
  ('Responsabilitat', [
   'Vetllem perquè la informació sigui correcta i estigui al dia, però pot contenir errors o canviar sense avís previ. Els preus vàlids són els que figuren en el moment de la compra o en el pressupost acceptat.',
   'Els enllaços a altres webs (WhatsApp, Instagram, Stripe…) porten a serveis de tercers que tenen les seves pròpies condicions i dels quals no som responsables.']),
  ('Dades personals', ['Com tractem les teves dades s’explica a ' + link('privacidad', l, 'Privacitat i galetes') + '.']),
  ('Llei aplicable', ['Aquest web es regeix per la llei espanyola. Per a qualsevol conflicte, si ets consumidor, seran competents els jutjats del teu domicili; en els altres casos, els del domicili del titular.']),
 ],
 'privacidad': [
  ('Responsable', [f'<b>{T}</b> · NIF {NIF} · {DOM} · {M} · {TEL}.']),
  ('Quines dades tractem i per a què', [
   '<b>Si ens escrius</b> per WhatsApp, correu o Instagram: el teu nom, el teu telèfon o correu i el que ens expliquis. Per respondre’t i, si ho demanes, preparar-te una proposta o un pressupost.',
   '<b>Si compres l’App</b>: les dades de facturació que introdueixes a la pàgina de pagament (nom o empresa, NIF, adreça, correu). Per donar-te d’alta, enviar-te l’accés, emetre la factura i prestar-te el servei. Les dades de la targeta les tracta Stripe directament: mai ens arriben.',
   '<b>Si contractes l’assessoria o un esdeveniment</b>: les dades necessàries per a la proposta, el servei i la factura.',
   'No fem servir les teves dades per a publicitat de tercers ni les venem. No prenem decisions automatitzades sobre tu.']),
  ('Per què les podem tractar (base legal)', [
   'Respondre el teu missatge i preparar una proposta: la teva petició (mesures precontractuals, art. 6.1.b RGPD). Prestar el servei que compres: el contracte (art. 6.1.b). Facturar i portar la comptabilitat: l’obligació legal (art. 6.1.c).']),
  ('Quant de temps les guardem', [
   'Els missatges, mentre duri la conversa i fins a un any després si no arriba a haver-hi contracte. Les dades de clients, mentre duri la relació i, després, el temps que obliguen les lleis mercantils i fiscals (fins a 6 anys).']),
  ('Qui més les veu (encarregats i tercers)', [
   'Només els proveïdors necessaris per funcionar: <b>Cloudflare</b> (allotjament d’aquest web), <b>Stripe</b> (pagaments), <b>Google</b> (correu i la base de dades de la plataforma de llicències) i <b>Meta</b> (WhatsApp i Instagram, si ens escrius per allà). Alguns són als Estats Units; les transferències s’emparen en el Marc de Privadesa de Dades UE-EUA o en clàusules contractuals tipus de la Comissió Europea.',
   'La teva gestoria o l’Agència Tributària rebran les dades de facturació quan la llei ho exigeixi.']),
  ('Els teus drets', [
   f'Pots demanar accés, rectificació, supressió, oposició, limitació i portabilitat de les teves dades escrivint a {M}. Si creus que no les tractem bé, pots reclamar davant l’Agència Espanyola de Protecció de Dades (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).']),
  ('Galetes', [
   'Aquest web <b>no fa servir galetes</b> ni guarda res al teu navegador per mesurar-te o mostrar-te publicitat; per això no et demanem permís amb un avís. Les tipografies se serveixen des d’aquest mateix web.',
   'Si mesurem les visites, ho fem amb Cloudflare Web Analytics, que no fa servir galetes ni identifica ningú. En prémer un botó de WhatsApp, Instagram o de pagament vas a aquests serveis, que tenen la seva pròpia política de galetes.']),
  ('Dades que guardes a l’App', [
   'Les dades del teu negoci i dels teus clients (reserves, vendes, personal…) es guarden al <b>teu propi projecte de Firebase</b>, al teu compte de Google. Tu ets el responsable d’aquestes dades. El que fem amb la part que passa per la nostra plataforma és a les ' + link('condiciones', l, 'condicions de compra') + '.']),
 ],
 'condiciones': [
  ('Què compres', [
   'Una <b>llicència anual d’ús de l’App GastroGoan</b> per a <b>un negoci</b> (un local). Inclou totes les eines de l’App, totes les actualitzacions que publiquem mentre la llicència sigui vigent i ajuda per WhatsApp i correu. Cada local addicional necessita la seva pròpia llicència.',
   'L’App la fan servir negocis: es contracta com a empresari o professional, per a l’activitat del teu negoci.']),
  ('Preu i pagament', [
   'El primer any: <b>300 € + IVA</b>. Cada renovació anual següent: <b>240 € + IVA</b>. L’IVA aplicable és el vigent en la data de la factura.',
   'El pagament es fa en línia amb targeta a través de Stripe, com una subscripció anual. Rebràs la factura al correu que indiquis.',
   '<b>No hi són inclosos</b>: l’equip (tauleta, mòbil, impressora, calaix), les comissions de Stripe o d’altres serveis que el negoci contracti per cobrar als seus clients, ni els costos de Google si l’ús del teu projecte de Firebase supera el pla gratuït.']),
  ('Com es contracta', [
   'El contracte se celebra per mitjans electrònics i és vàlid sense signatura (art. 23 de la Llei 34/2002). En pagar, marques la casella d’acceptació d’aquestes condicions; Stripe guarda la data i l’hora d’aquesta acceptació. Aquestes condicions queden publicades en aquesta adreça i les pots desar o imprimir.',
   'Després del pagament rebràs el teu usuari i PIN de propietari, el codi del teu negoci i una guia de posada en marxa.']),
  ('Posada en marxa i requisits', [
   'Per fer servir l’App necessites un navegador actualitzat i connexió a internet per sincronitzar entre aparells (sense connexió, l’App continua funcionant i puja els canvis en tornar).',
   'És obligatori crear un <b>projecte gratuït de Firebase al teu compte de Google</b>: s’hi guarden les teves dades. La guia explica com fer-ho, pas a pas.']),
  ('Durada, renovació i baixa', [
   'La llicència dura un any i <b>es renova automàticament cada any</b> com a subscripció d’Stripe: a cada aniversari es cobren 240 € + IVA a la targeta amb què vas pagar. Pots cancel·lar la renovació quan vulguis escrivint-nos abans d’aquesta data; la llicència continuarà activa fins al final de l’any ja pagat.', 'Els pagaments <b>no són reemborsables</b>: no es retorna l’import pagat ni la part no utilitzada de l’any en curs.',
   'Les teves dades són teves i continuen al teu projecte de Firebase quan la llicència acaba; les pots exportar des de l’App (per exemple, el paquet per al gestor) mentre estigui activa.']),
  ('Ús correcte i suspensió', [
   'La llicència és personal del negoci, no exclusiva i intransferible. No es pot copiar, revendre, cedir ni intentar eludir els controls de llicència de l’App. En cas d’impagament o d’un ús així podrem suspendre o revocar la llicència, avisant abans quan sigui possible.']),
  ('Les teves dades i les dels teus clients', [
   'Tu ets el <b>responsable del tractament</b> de les dades que guardes a l’App (clients, reserves, personal…), i decideixes per a què les fas servir. Aquestes dades viuen al teu propi projecte de Firebase; nosaltres no hi tenim accés.',
   'Una part petita passa per la plataforma de GastroGoan perquè el servei funcioni: el teu compte (usuari i la llista dels teus negocis), el codi de llicència, la guia pública que porta al teu web de reserves i, mentre el teu núvol no tingui les regles actualitzades, les sol·licituds de reserva i comanda que arriben del teu web. Per a aquesta part actuem com a <b>encarregat del tractament</b> (art. 28 RGPD): només la fem servir per prestar-te el servei, amb confidencialitat i mesures de seguretat, amb Google (Firebase) i Cloudflare com a subencarregats, i l’esborrem o te la retornem en acabar el contracte.',
   'Les obligacions fiscals del negoci (presentar models, VeriFactu quan sigui exigible) són teves i del teu gestor: l’App ordena i calcula les dades, però no és una gestoria ni presenta res davant Hisenda.']),
  ('Disponibilitat i responsabilitat', [
   'Treballem perquè l’App funcioni sempre, però no podem garantir que no hi hagi interrupcions, sobretot de serveis de tercers (Google, Cloudflare, Stripe, la connexió a internet).',
   'Excepte dol o culpa greu, la nostra responsabilitat total està limitada a l’import que hagis pagat per la llicència en els darrers 12 mesos, i no cobreix el lucre cessant ni la pèrdua de dades que s’hauria evitat amb les còpies de seguretat que ofereix l’App.']),
  ('Canvis i llei aplicable', [
   'Podem actualitzar aquestes condicions; els canvis s’apliquen des de la renovació següent i te’ls comunicarem abans. El contracte es regeix per la llei espanyola i, per a qualsevol conflicte, són competents els jutjats del domicili del titular.',
   f'Dubtes? Escriu-nos a {M} o al WhatsApp {TEL}.']),
 ]}
    return {
 'aviso': [
  ('Who is behind this website', [
   f'This website (gastrogoan.com and its pages) belongs to <b>{T}</b>, tax ID (NIF) <b>{NIF}</b>, registered address {DOM}.{REG}',
   f'Contact: {M} · phone and WhatsApp {TEL}.',
   'Under the GastroGoan brand we offer three services: advisory for hospitality businesses, the GastroGoan management App and the gastronomic events of Le Petit Comité.']),
  ('What this website is for', [
   'To present those services and let you get in touch (WhatsApp, email and Instagram) and buy the App. Advisory and events are contracted through a tailored proposal and quote; the App is bought online under its ' + link('condiciones', l, 'terms of purchase') + '.']),
  ('Intellectual property', [
   'The texts, design, photographs, logos and software of this website and the App belong to their owner or are used with permission. They may not be copied, distributed or transformed without written authorisation, except for personal consultation.']),
  ('Liability', [
   'We take care that the information is accurate and up to date, but it may contain errors or change without notice. Valid prices are those shown at the time of purchase or in the accepted quote.',
   'Links to other websites (WhatsApp, Instagram, Stripe…) lead to third-party services with their own terms, for which we are not responsible.']),
  ('Personal data', ['How we handle your data is explained in ' + link('privacidad', l, 'Privacy and cookies') + '.']),
  ('Governing law', ['This website is governed by Spanish law. For any dispute, if you are a consumer, the courts of your place of residence have jurisdiction; otherwise, those of the owner’s registered address.']),
 ],
 'privacidad': [
  ('Data controller', [f'<b>{T}</b> · NIF {NIF} · {DOM} · {M} · {TEL}.']),
  ('What data we process and why', [
   '<b>If you write to us</b> by WhatsApp, email or Instagram: your name, phone or email and whatever you tell us. To reply and, if you ask, to prepare a proposal or quote.',
   '<b>If you buy the App</b>: the billing details you enter on the payment page (name or company, tax ID, address, email). To set you up, send you your login, issue the invoice and provide the service. Card details are handled directly by Stripe and never reach us.',
   '<b>If you book advisory or an event</b>: the data needed for the proposal, the service and the invoice.',
   'We do not use your data for third-party advertising or sell it. We do not make automated decisions about you.']),
  ('Legal basis', [
   'Replying and preparing a proposal: your request (pre-contractual steps, Art. 6.1.b GDPR). Providing the service you buy: the contract (Art. 6.1.b). Invoicing and bookkeeping: legal obligation (Art. 6.1.c).']),
  ('How long we keep it', [
   'Messages, for as long as the conversation lasts and up to one year afterwards if no contract follows. Customer data, for the duration of the relationship and then for as long as commercial and tax law requires (up to 6 years).']),
  ('Who else sees it (processors and third parties)', [
   'Only the providers we need to operate: <b>Cloudflare</b> (hosting of this website), <b>Stripe</b> (payments), <b>Google</b> (email and the licence platform database) and <b>Meta</b> (WhatsApp and Instagram, if you contact us there). Some are based in the United States; transfers rely on the EU-US Data Privacy Framework or the European Commission’s standard contractual clauses.',
   'Your accountant or the Spanish Tax Agency will receive billing data where the law requires it.']),
  ('Your rights', [
   f'You can request access, rectification, erasure, objection, restriction and portability by writing to {M}. If you believe we are not handling your data properly, you can complain to the Spanish Data Protection Agency (<a href="https://www.aepd.es" target="_blank" rel="noopener">aepd.es</a>).']),
  ('Cookies', [
   'This website <b>does not use cookies</b> or store anything in your browser to track you or show you ads, which is why there is no cookie banner. Fonts are served from this same website.',
   'If we measure visits, we use Cloudflare Web Analytics, which uses no cookies and identifies no one. Tapping a WhatsApp, Instagram or payment button takes you to those services, which have their own cookie policies.']),
  ('Data you keep in the App', [
   'Your business and customer data (bookings, sales, staff…) is stored in <b>your own Firebase project</b>, in your Google account. You are the controller of that data. What we do with the part that goes through our platform is set out in the ' + link('condiciones', l, 'terms of purchase') + '.']),
 ],
 'condiciones': [
  ('What you are buying', [
   'An <b>annual licence to use the GastroGoan App</b> for <b>one business</b> (one venue). It includes every tool in the App, every update we release while the licence is active, and help by WhatsApp and email. Each additional venue needs its own licence.',
   'The App is for businesses: it is bought as a business or professional, for your business activity.']),
  ('Price and payment', [
   'First year: <b>€300 + VAT</b>. Each following annual renewal: <b>€240 + VAT</b>. VAT is charged at the rate in force on the invoice date.',
   'Payment is made online by card through Stripe, as an annual subscription. You will receive the invoice at the email address you provide.',
   '<b>Not included</b>: hardware (tablet, phone, printer, cash drawer), Stripe fees or other services the business uses to charge its own customers, or Google charges if your Firebase project goes beyond its free plan.']),
  ('How the contract is made', [
   'The contract is concluded electronically and is valid without a signature (Art. 23, Spanish Law 34/2002). When paying, you tick the box accepting these terms; Stripe records the date and time of that acceptance. These terms remain published at this address and you can save or print them.',
   'After payment you will receive your owner username and PIN, your business code and a setup guide.']),
  ('Setup and requirements', [
   'To use the App you need an up-to-date browser and an internet connection to sync between devices (offline, the App keeps working and uploads changes when the connection returns).',
   'You must create a <b>free Firebase project in your Google account</b>: that is where your data is stored. The guide explains how, step by step.']),
  ('Term, renewal and cancellation', [
   'The licence lasts one year and <b>renews automatically every year</b> as a Stripe subscription: on each anniversary €240 + VAT is charged to the card you paid with. You can cancel the renewal at any time by writing to us before that date; the licence stays active until the end of the year already paid.', 'Payments are <b>non-refundable</b>: neither the amount paid nor the unused part of the current year is refunded.',
   'Your data is yours and remains in your Firebase project when the licence ends; you can export it from the App (for example, the accountant package) while it is active.']),
  ('Proper use and suspension', [
   'The licence belongs to the business and is non-exclusive and non-transferable. It may not be copied, resold, assigned, or used to get around the App’s licence controls. In case of non-payment or such use we may suspend or revoke the licence, giving notice beforehand where possible.']),
  ('Your data and your customers’ data', [
   'You are the <b>controller</b> of the data you keep in the App (customers, bookings, staff…) and decide what it is used for. That data lives in your own Firebase project; we have no access to it.',
   'A small part goes through the GastroGoan platform so the service can work: your account (username and the list of your businesses), the licence code, the public pointer to your booking page and, while your cloud does not have the updated rules, the booking and order requests coming from your website. For that part we act as <b>processor</b> (Art. 28 GDPR): we use it only to provide the service, under confidentiality and security measures, with Google (Firebase) and Cloudflare as sub-processors, and we delete or return it when the contract ends.',
   'The business’s tax obligations (filing returns, VeriFactu when it becomes mandatory) are yours and your accountant’s: the App organises and calculates the data, but it is not an accounting firm and files nothing with the Tax Agency.']),
  ('Availability and liability', [
   'We work to keep the App running at all times, but we cannot guarantee there will be no interruptions, especially in third-party services (Google, Cloudflare, Stripe, your internet connection).',
   'Except in cases of wilful misconduct or gross negligence, our total liability is limited to the amount you paid for the licence in the last 12 months, and does not cover loss of profit or data loss that the App’s backups would have prevented.']),
  ('Changes and governing law', [
   'We may update these terms; changes apply from the next renewal and we will tell you beforehand. The contract is governed by Spanish law and, for any dispute, the courts of the owner’s registered address have jurisdiction.',
   f'Questions? Write to {M} or WhatsApp {TEL}.']),
 ]}


CSS = r'''
@font-face{font-family:"Schibsted Grotesk";font-weight:400;font-display:swap;src:url(fonts/schibsted-grotesk-400-normal.woff2) format("woff2")}
@font-face{font-family:"Schibsted Grotesk";font-weight:600;font-display:swap;src:url(fonts/schibsted-grotesk-600-normal.woff2) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:400;font-display:swap;src:url(fonts/ibm-plex-mono-400-normal.woff2) format("woff2")}
:root{--crema:#FAF8F4;--tinta:#1C1A17;--oliva:#4A5D4E;--linea:#E7E2D9;--muted:#716C65;--cuerpo:#3D3A34;
  --sans:"Schibsted Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--lado:clamp(20px,5vw,64px)}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--crema);color:var(--tinta);font:400 16px/1.65 var(--sans)}
a{color:var(--oliva);text-underline-offset:3px}
.cab{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:18px var(--lado);border-bottom:1px solid var(--linea)}
.izq{display:flex;align-items:center;gap:18px}
.logo{font-size:22px;letter-spacing:-.03em;color:var(--tinta);text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.logo b{font-weight:600}.logo i{font-style:normal;color:var(--oliva)}
.volver{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid #D5CFC4;border-radius:3px;background:#fff;color:var(--tinta);font:400 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;text-decoration:none}
.volver:hover{background:var(--oliva);border-color:var(--oliva);color:var(--crema)}
.idiomas{display:flex;gap:4px}
.idiomas a{display:inline-flex;align-items:center;min-height:44px;padding:0 8px;font:400 12px var(--mono);letter-spacing:.08em;color:var(--muted);text-decoration:none}
.idiomas a[aria-current]{color:var(--tinta);text-decoration:underline}
main{max-width:760px;margin:0 auto;padding:clamp(36px,6vw,72px) var(--lado) clamp(48px,7vw,96px)}
.et{display:inline-flex;align-items:center;gap:12px;font:400 11px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--oliva)}
.et::before{content:"";width:28px;height:2px;background:var(--oliva)}
h1{margin:12px 0 6px;font-size:clamp(30px,4.6vw,48px);line-height:1.1;font-weight:600;letter-spacing:-.03em;text-wrap:balance}
.act{margin:0 0 28px;font:400 12px var(--mono);letter-spacing:.08em;color:var(--muted)}
.otras{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 30px}
.otras a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--linea);border-radius:3px;background:#fff;color:var(--tinta);font:400 12px var(--mono);letter-spacing:.06em;text-decoration:none}
.otras a[aria-current]{background:var(--oliva);border-color:var(--oliva);color:var(--crema)}
section{padding:22px 0;border-top:1px solid var(--linea)}
h2{margin:0 0 10px;font-size:20px;font-weight:600;letter-spacing:-.015em}
p{margin:0 0 10px;color:var(--cuerpo);text-wrap:pretty}
p:last-child{margin-bottom:0}
p b{color:var(--tinta)}
.pend{background:#FCE8B2;color:#7A4B00;padding:0 4px;border-radius:2px;font-weight:600}
.pie{background:var(--tinta);color:#B7AFA0;padding:22px var(--lado) calc(22px + env(safe-area-inset-bottom,0px));font:400 12px/1.6 var(--mono);display:flex;flex-wrap:wrap;gap:6px 18px;justify-content:space-between}
.pie a{color:#B7AFA0;display:inline-flex;align-items:center;min-height:44px}
@media (pointer:coarse){.pie{padding-bottom:calc(22px + env(safe-area-inset-bottom,0px) + 64px)}}
@media print{.cab,.otras,.pie{display:none}body{background:#fff}main{padding:0}}
'''


def pagina(pag, l):
    u = UI[l]
    import re as _re
    _g = lambda x: _re.sub(r'(?<![\w-])(\w+(?:-\w+)+)', r'<span style="white-space:nowrap">\1</span>', x) if '<' not in x else x
    secs = ''.join(f'<section><h2>{h}</h2>' + ''.join(f'<p>{_g(p) if "href" not in p else p}</p>' for p in ps) + '</section>' for h, ps in textos(l)[pag])
    AC, AT = ' aria-current="page"', ' aria-current="true"'
    otras = ''.join(f'<a href="{PAGS[k][l]}"{AC if k == pag else ""}>{NOMBRES[k][l]}</a>' for k in PAGS)
    idiomas = ''.join(f'<a href="{PAGS[pag][k]}" hreflang="{k}"{AT if k == l else ""}>{k.upper()}</a>' for k in ('es', 'ca', 'en'))
    alt = ''.join(f'<link rel="alternate" hreflang="{k}" href="{BASE}/{PAGS[pag][k]}">' for k in ('es', 'ca', 'en'))
    return f'''<!doctype html>
<html lang="{l}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{NOMBRES[pag][l]} · GastroGoan</title>
<meta name="description" content="{NOMBRES[pag][l]} de GastroGoan.">
<link rel="canonical" href="{BASE}/{PAGS[pag][l]}">{alt}
<link rel="icon" type="image/png" href="favicon.png">
<style>{CSS}</style>
</head>
<body>
<header class="cab">
  <div class="izq"><a class="logo" href="{u['inicio']}">gastro<b>goan</b><i>.</i></a><a class="volver" href="{u['inicio']}">← {u['volver']}</a></div>
  <nav class="idiomas" aria-label="Idioma">{idiomas}</nav>
</header>
<main>
  <span class="et">GastroGoan</span>
  <h1>{NOMBRES[pag][l]}</h1>
  <p class="act">{u['act']}: {DATOS['actualizado'][l]}</p>
  <nav class="otras" aria-label="{u['indice']}">{otras}</nav>
  {secs}
</main>
<footer class="pie"><span>© 2026 GastroGoan</span><span>{otras.replace(' aria-current="page"', '').replace('</a><a', '</a> · <a')}</span></footer>
</body>
</html>
'''


def pie_html(l, oscuro=False):
    """Los tres enlaces legales para el pie de cada página de la web."""
    return ' · '.join(f'<a href="{PAGS[k][l]}">{NOMBRES[k][l]}</a>' for k in PAGS)


INFO_ARIA = {'es': 'Información legal', 'ca': 'Informació legal', 'en': 'Legal information'}
INFO_CSS = (".gg-logo-info{position:relative;display:inline-flex;align-items:center;gap:6px}.gg-logo-info>a{color:#FAF8F4!important;text-decoration:none}"
  ".gg-info{position:static;display:inline-block}"
  ".gg-info>summary{list-style:none;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer;color:#8A857C;border-radius:50%}"
  ".gg-info>summary::-webkit-details-marker{display:none}"
  ".gg-info>summary svg{width:20px;height:20px;transition:color .2s}"
  ".gg-info>summary:hover,.gg-info[open]>summary{color:#FAF8F4}"
  ".gg-info>summary:focus-visible{outline:2px solid #7E9B84;outline-offset:-4px}"
  ".gg-info-pop{position:absolute;left:-6px;bottom:calc(100% + 4px);z-index:40;display:flex;flex-direction:column;box-sizing:border-box;width:max-content;max-width:calc(100vw - 28px);padding:6px;background:#FAF8F4;border:1px solid #E7E2D9;border-radius:3px;box-shadow:0 18px 40px -16px rgba(0,0,0,.6)}"
  ".gg-info-pop a{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:2px;color:#1C1A17;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.04em;text-decoration:none}"
  ".gg-info-pop a:hover,.gg-info-pop a:focus-visible{background:#EEF2EC;color:#4A5D4E}"
  ".gg-info-pop span{padding:8px 12px 6px;border-top:1px solid #E7E2D9;margin-top:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:#716C65}")
INFO_JS = ("<script>(function(){if(window.__ggInfo)return;window.__ggInfo=1;"
  "document.addEventListener('click',function(e){document.querySelectorAll('.gg-info[open]').forEach(function(d){if(!d.contains(e.target))d.removeAttribute('open')})});"
  "document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.gg-info[open]').forEach(function(d){d.removeAttribute('open')})})})();</script>")
INFO_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></svg>'


def info_html(l):
    """«i» junto al logo del pie: al tocarla salen aviso legal, privacidad y condiciones (pedido del dueño, 17/11)."""
    enl = ''.join(f'<a href="{PAGS[k][l]}">{NOMBRES[k][l]}</a>' for k in PAGS)
    return f'<details class="gg-info"><summary aria-label="{INFO_ARIA[l]}" title="{INFO_ARIA[l]}">{INFO_SVG}</summary><div class="gg-info-pop">{enl}<span>© 2026 GastroGoan</span></div></details>'


if __name__ == '__main__':
    falta = [k for k, v in DATOS.items() if v == PEND]
    for pag in PAGS:
        for l in ('es', 'ca', 'en'):
            open(os.path.join(RAIZ, PAGS[pag][l] + '.html'), 'w', encoding='utf-8').write(pagina(pag, l))
    print('OK páginas legales (9)')
    if falta:
        print('⚠️  FALTAN DATOS DEL TITULAR:', ', '.join(falta), '— NO publicar así', file=sys.stderr)
