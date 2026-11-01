/* ============================================================
   NOVEDADES (1/11) — Promoción → Novedades
   Mandar una novedad comercial a los clientes por email y por WhatsApp.

   ⚠️ Regla de la casa: a GastroGoan no le puede costar dinero por cliente.
   Por eso aquí NO hay servidor de correo ni API de WhatsApp: el mensaje sale
   del correo y del WhatsApp DEL PROPIO NEGOCIO (de su dirección, de su número),
   que es además lo que mejor llega a la bandeja de entrada. La app se encarga
   de lo difícil: elegir a quién, escribirlo bien, darle diseño de verdad y
   dejar cada envío a un toque.
   · WhatsApp: un enlace wa.me por cliente, con su nombre en el mensaje.
   · Email: el diseño se copia con formato (o se descarga como borrador .eml
     que Outlook/Apple Mail abren ya maquetado) y se abre el correo con los
     destinatarios en copia oculta, por lotes.
   · Solo reciben quienes NO han retirado el consentimiento de marketing, y
     cada email lleva la baja (LSSI art. 21 y 22).
   ============================================================ */

const NV_LOTES = [25, 50, 100];

// ── Datos ────────────────────────────────────────────────────────────────
function nvLista(){
  if(!Array.isArray(DB.novedades)) DB.novedades = [];
  return DB.novedades;
}
let nvVista = 'nueva';         // 'nueva' | 'historial'
let nvCanal = 'email';         // canal abierto en «Enviar»
let nvModoEmail = 'bloque';    // 'bloque' (CCO) | 'uno'
let nvLote = 50;
let nvPrevModo = 'email';      // 'email' | 'movil' | 'whatsapp'
let nvMem = null;              // campaña abierta (en DB o todavía solo en memoria)
let nvGuardarTimer = null;

function nvCampanaVacia(extra){
  const ahora = new Date().toISOString();
  return Object.assign({
    id: genId(), creadaEn: ahora, actualizadaEn: ahora, estado: 'borrador', tema: 'libre',
    asunto: '', titular: '', cuerpo: 'Hola {nombre},\n\n', imagen: '',
    oferta: {on: false, titulo: '', detalle: '', codigo: '', hasta: ''},
    cta: {tipo: 'reservar', texto: '', url: ''},
    logo: true,
    seg: {tipo: 'todos', cp: ''}, incluidos: [], excluidos: [],
    enviados: {}
  }, extra || {});
}
function nvC(){
  if(!nvMem) nvMem = nvCampanaVacia();
  return nvMem;
}
// Una campaña solo entra en el historial cuando alguien escribe algo o envía:
// abrir la pestaña no debe llenar la lista de borradores vacíos.
function nvToca(){
  const c = nvC();
  c.actualizadaEn = new Date().toISOString();
  const lista = nvLista();
  if(!lista.some(x => x.id === c.id)) lista.unshift(c);
  clearTimeout(nvGuardarTimer);
  nvGuardarTimer = setTimeout(() => { try{ saveDB(); }catch(e){} }, 900);
}
function nvGuardarYa(){
  clearTimeout(nvGuardarTimer);
  nvToca();
  clearTimeout(nvGuardarTimer);
  saveDB();
}

// ── Audiencia ────────────────────────────────────────────────────────────
const NV_EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]{2,}$/;
function nvEmailValido(e){ return NV_EMAIL_RE.test(String(e || '').trim()); }
function nvPrimerNombre(c){ return String((c && c.name) || '').trim().split(/\s+/)[0] || ''; }
function nvSegmentosDef(){
  return [
    {id:'todos', ic:'ti-users', et: gl({es:'Todos', ca:'Tots', en:'Everyone'}), ay: gl({es:'Todos los que aceptan novedades', ca:'Tots els que accepten novetats', en:'Everyone who accepts news'})},
    {id:'habituales', ic:'ti-heart', et: gl({es:'Habituales', ca:'Habituals', en:'Regulars'}), ay: gl({es:'Vienen a menudo o ya tienen puntos de fidelidad', ca:'Vénen sovint o ja tenen punts de fidelitat', en:'They come often or already have loyalty points'})},
    {id:'nuevos', ic:'ti-sparkles', et: gl({es:'Nuevos', ca:'Nous', en:'New'}), ay: gl({es:'Su primera visita fue hace menos de 30 días', ca:'La primera visita va ser fa menys de 30 dies', en:'Their first visit was under 30 days ago'})},
    {id:'inactivos', ic:'ti-mood-empty', et: gl({es:'Hace tiempo que no vienen', ca:'Fa temps que no vénen', en:'Haven\'t visited in a while'}), ay: gl({es:'Más de 60 días sin venir', ca:'Més de 60 dies sense venir', en:'More than 60 days away'})},
    {id:'riesgo', ic:'ti-alert-triangle', et: gl({es:'En riesgo', ca:'En risc', en:'At risk'}), ay: gl({es:'Venían con ritmo y han dejado de aparecer', ca:'Venien amb ritme i han deixat d\'aparèixer', en:'They used to come regularly and have stopped'})},
    {id:'cumple', ic:'ti-cake', et: gl({es:'Cumpleaños este mes', ca:'Aniversari aquest mes', en:'Birthday this month'}), ay: gl({es:'Cumplen años en el mes en curso', ca:'Fan anys aquest mes', en:'Their birthday is this month'})},
    {id:'mejores', ic:'ti-trophy', et: gl({es:'Mejores clientes', ca:'Millors clients', en:'Best customers'}), ay: gl({es:'El 20 % que más ha gastado este año', ca:'El 20 % que més ha gastat aquest any', en:'The top 20% by spend this year'})},
    {id:'cp', ic:'ti-map-pin', et: gl({es:'Por código postal', ca:'Per codi postal', en:'By postcode'}), ay: gl({es:'Los de una zona', ca:'Els d\'una zona', en:'Those in one area'})},
    {id:'elegir', ic:'ti-checkbox', et: gl({es:'Elegir uno a uno', ca:'Triar un a un', en:'Pick one by one'}), ay: gl({es:'Marcas tú a quién', ca:'Marques tu a qui', en:'You tick who'})},
  ];
}
// Reparte a los clientes por segmento. Se calcula de una vez (las estadísticas
// recorren las ventas) y se usa tanto para las cifras de cada botón como para
// la lista final.
function nvCalcular(c){
  const getStats = computeClientStatsIndexed();
  const todos = DB.clients.filter(x => x.marketingConsent !== false);
  const sinPermiso = DB.clients.length - todos.length;
  const mesActual = new Date().getMonth() + 1;
  const stats = new Map(todos.map(x => [x.id, getStats(x)]));
  const gastos = todos.map(x => stats.get(x.id).totalYear).filter(v => v > 0).sort((a, b) => b - a);
  const umbralMejores = gastos.length ? gastos[Math.max(0, Math.ceil(gastos.length * 0.2) - 1)] : Infinity;
  const mesDeCumple = x => { const m = String(x.cumpleanos || '').split('-'); return m.length >= 3 ? parseInt(m[1]) : null; };
  const cp = String(c.seg.cp || '').trim();
  const pertenece = {
    todos: () => true,
    habituales: x => { const s = stats.get(x.id); return s.visitas30d >= 2 || s.visitasYear >= 6 || (x.points || 0) >= 7; },
    nuevos: x => stats.get(x.id).isNew,
    inactivos: x => { const r = stats.get(x.id).recency; return r === null || r > 60; },
    riesgo: x => stats.get(x.id).atRisk,
    cumple: x => mesDeCumple(x) === mesActual,
    mejores: x => { const g = stats.get(x.id).totalYear; return g > 0 && g >= umbralMejores; },
    cp: x => !!cp && String(x.cp || '').trim() === cp,
    elegir: x => (c.incluidos || []).includes(x.id),
  };
  const conteos = {};
  Object.keys(pertenece).forEach(k => { conteos[k] = k === 'cp' ? 0 : todos.filter(pertenece[k]).length; });
  // Códigos postales que hay y cuántos clientes tiene cada uno.
  const cps = {};
  todos.forEach(x => { const k = String(x.cp || '').trim(); if(k) cps[k] = (cps[k] || 0) + 1; });
  const elegidos = todos.filter(pertenece[c.seg.tipo] || pertenece.todos);
  const excl = new Set(c.excluidos || []);
  const destinatarios = elegidos.filter(x => !excl.has(x.id));
  const conEmail = destinatarios.filter(x => nvEmailValido(x.email));
  const conWa = destinatarios.filter(x => whatsappDeTelefono(x.phone));
  return {todos, sinPermiso, conteos, cps, elegidos, destinatarios, conEmail, conWa, excluidos: elegidos.length - destinatarios.length};
}

// ── Botón de llamada a la acción ─────────────────────────────────────────
function nvCtaOpciones(){
  const b = DB.business || {};
  const reserva = (typeof getPublicClientLinkPretty === 'function' && getPublicClientLinkPretty()) || getPublicClientLink() || '';
  const tel = String(b.phone || '').replace(/[^\d+]/g, '');
  const web = /^https?:\/\//i.test(b.web || '') ? b.web : (b.web ? 'https://' + b.web : '');
  return [
    {id:'ninguno', et: gl({es:'Sin botón', ca:'Sense botó', en:'No button'}), texto:'', url:''},
    {id:'reservar', et: gl({es:'Reservar mesa', ca:'Reservar taula', en:'Book a table'}), texto: gl({es:'Reservar mesa', ca:'Reservar taula', en:'Book a table'}), url: reserva},
    {id:'pedir', et: gl({es:'Hacer un pedido', ca:'Fer una comanda', en:'Order now'}), texto: gl({es:'Hacer un pedido', ca:'Fer una comanda', en:'Order now'}), url: reserva},
    {id:'carta', et: gl({es:'Ver la carta', ca:'Veure la carta', en:'See the menu'}), texto: gl({es:'Ver la carta', ca:'Veure la carta', en:'See the menu'}), url: web || reserva},
    {id:'llamar', et: gl({es:'Llamar', ca:'Trucar', en:'Call us'}), texto: gl({es:'Llamar ahora', ca:'Trucar ara', en:'Call now'}), url: tel ? 'tel:' + tel : ''},
    {id:'mapa', et: gl({es:'Cómo llegar', ca:'Com arribar', en:'Get directions'}), texto: gl({es:'Cómo llegar', ca:'Com arribar', en:'Get directions'}), url: (b.gmaps || '').trim()},
    {id:'otro', et: gl({es:'Otro enlace', ca:'Un altre enllaç', en:'Other link'}), texto:'', url:''},
  ];
}
function nvCtaResuelto(c){
  const ops = nvCtaOpciones();
  const o = ops.find(x => x.id === c.cta.tipo) || ops[0];
  if(o.id === 'ninguno') return null;
  const texto = (o.id === 'otro' ? c.cta.texto : (c.cta.texto || o.texto)).trim();
  let url = (o.id === 'otro' ? c.cta.url : o.url).trim();
  if(o.id === 'otro' && url && !/^(https?:|tel:|mailto:)/i.test(url)) url = 'https://' + url;
  if(!texto || !url) return null;
  return {texto, url};
}

// ── Plantillas por tema ──────────────────────────────────────────────────
// Lo que va entre [corchetes] hay que rellenarlo: antes de enviar se avisa si
// se ha quedado alguno sin cambiar (que un «[nombre del plato]» llegue a 300
// clientes es el error más tonto y más caro).
const NV_TEMAS = [
  {id:'libre', ic:'ti-pencil', et:{es:'Escribir el mío', ca:'Escriure el meu', en:'Write my own'},
   es:{as:'', ti:'', cu:'Hola {nombre},\n\n'}, ca:{as:'', ti:'', cu:'Hola {nombre},\n\n'}, en:{as:'', ti:'', cu:'Hi {nombre},\n\n'}},
  {id:'plato', ic:'ti-tools-kitchen-2', et:{es:'Plato o bebida nuevo', ca:'Plat o beguda nova', en:'New dish or drink'}, cta:'reservar',
   es:{as:'Novedad en {negocio}: ya puedes probarlo', ti:'Llega algo nuevo a la carta', cu:'Hola {nombre},\n\nEstrenamos [nombre del plato o bebida] y queremos que seas de los primeros en probarlo. [Cuenta en una frase qué lo hace especial: el producto, la receta, de dónde viene.]\n\nTe esperamos para que nos cuentes qué te parece.'},
   ca:{as:'Novetat a {negocio}: ja el pots tastar', ti:'Arriba una novetat a la carta', cu:'Hola {nombre},\n\nEstrenem [nom del plat o beguda] i volem que siguis dels primers a tastar-lo. [Explica en una frase què el fa especial: el producte, la recepta, d\'on ve.]\n\nT\'esperem perquè ens expliquis què et sembla.'},
   en:{as:'New at {negocio}: come and try it', ti:'Something new on the menu', cu:'Hi {nombre},\n\nWe are launching [name of the dish or drink] and we would love you to be among the first to try it. [Say in one sentence what makes it special: the produce, the recipe, where it comes from.]\n\nCome and tell us what you think.'}},
  {id:'promo', ic:'ti-discount-2', et:{es:'Promoción u oferta', ca:'Promoció o oferta', en:'Promotion or offer'}, cta:'reservar',
   oferta:{es:{t:'[2x1 en cócteles]', d:'[De lunes a jueves, de 18 a 20 h]'}, ca:{t:'[2x1 en còctels]', d:'[De dilluns a dijous, de 18 a 20 h]'}, en:{t:'[2-for-1 on cocktails]', d:'[Monday to Thursday, 6 to 8 pm]'}},
   es:{as:'Una oferta para ti en {negocio}', ti:'Esto te va a gustar', cu:'Hola {nombre},\n\nEsta semana tenemos una oferta pensada para quienes ya nos conocéis. Enséñanos este mensaje al pedir y es tuya.\n\nHay existencias limitadas, así que no lo dejes para el último día.'},
   ca:{as:'Una oferta per a tu a {negocio}', ti:'Això t\'agradarà', cu:'Hola {nombre},\n\nAquesta setmana tenim una oferta pensada per als que ja ens coneixeu. Ensenya\'ns aquest missatge en demanar i és teva.\n\nHi ha existències limitades, així que no ho deixis per a l\'últim dia.'},
   en:{as:'An offer for you at {negocio}', ti:'You are going to like this', cu:'Hi {nombre},\n\nThis week we have an offer for those who already know us. Show us this message when you order and it is yours.\n\nStock is limited, so do not leave it until the last day.'}},
  {id:'evento', ic:'ti-confetti', et:{es:'Evento o noche temática', ca:'Esdeveniment o nit temàtica', en:'Event or theme night'}, cta:'reservar',
   es:{as:'Te invitamos: [nombre del evento] en {negocio}', ti:'[Nombre del evento]', cu:'Hola {nombre},\n\nEl [día y hora] celebramos [qué es: música en directo, una cata, una noche temática…] y nos encantaría contar contigo.\n\n[Qué incluye, precio y cómo reservar.] Las plazas son limitadas, así que te recomendamos reservar con tiempo.'},
   ca:{as:'Et convidem: [nom de l\'esdeveniment] a {negocio}', ti:'[Nom de l\'esdeveniment]', cu:'Hola {nombre},\n\nEl [dia i hora] celebrem [què és: música en directe, una tast, una nit temàtica…] i ens encantaria comptar amb tu.\n\n[Què inclou, preu i com reservar.] Les places són limitades, així que et recomanem reservar amb temps.'},
   en:{as:'You are invited: [name of the event] at {negocio}', ti:'[Name of the event]', cu:'Hi {nombre},\n\nOn [day and time] we are holding [what it is: live music, a tasting, a theme night…] and we would love to have you.\n\n[What is included, price and how to book.] Places are limited, so we recommend booking early.'}},
  {id:'menu', ic:'ti-list-details', et:{es:'Menú del día o de temporada', ca:'Menú del dia o de temporada', en:'Daily or seasonal menu'}, cta:'carta',
   es:{as:'El menú de esta semana en {negocio}', ti:'Menú de temporada', cu:'Hola {nombre},\n\nYa tenemos listo el nuevo menú:\n\n[Primeros: …]\n[Segundos: …]\n[Postre: …]\n\n[Precio y días en los que está disponible.]'},
   ca:{as:'El menú d\'aquesta setmana a {negocio}', ti:'Menú de temporada', cu:'Hola {nombre},\n\nJa tenim a punt el nou menú:\n\n[Primers: …]\n[Segons: …]\n[Postres: …]\n\n[Preu i dies en què està disponible.]'},
   en:{as:'This week\'s menu at {negocio}', ti:'Seasonal menu', cu:'Hi {nombre},\n\nThe new menu is ready:\n\n[Starters: …]\n[Mains: …]\n[Dessert: …]\n\n[Price and the days it is available.]'}},
  {id:'horario', ic:'ti-clock', et:{es:'Cambio de horario', ca:'Canvi d\'horari', en:'Opening hours change'}, cta:'llamar',
   es:{as:'Cambios de horario en {negocio}', ti:'Nuestro nuevo horario', cu:'Hola {nombre},\n\nA partir del [fecha] cambiamos nuestro horario para atenderte mejor:\n\n[Días y horas de apertura]\n\nCualquier duda, escríbenos o llámanos.'},
   ca:{as:'Canvis d\'horari a {negocio}', ti:'El nostre nou horari', cu:'Hola {nombre},\n\nA partir del [data] canviem el nostre horari per atendre\'t millor:\n\n[Dies i hores d\'obertura]\n\nQualsevol dubte, escriu-nos o truca\'ns.'},
   en:{as:'Opening hours change at {negocio}', ti:'Our new opening hours', cu:'Hi {nombre},\n\nFrom [date] we are changing our hours to serve you better:\n\n[Opening days and times]\n\nIf you have any questions, write or call us.'}},
  {id:'cierre', ic:'ti-beach', et:{es:'Vacaciones o cierre', ca:'Vacances o tancament', en:'Holidays or closure'}, cta:'reservar',
   es:{as:'{negocio} cierra por vacaciones', ti:'Descansamos unos días', cu:'Hola {nombre},\n\nDel [fecha] al [fecha] estaremos cerrados por vacaciones. Volveremos con las pilas cargadas y muchas ganas de verte.\n\nSi quieres reservar para cuando volvamos, ya puedes hacerlo.'},
   ca:{as:'{negocio} tanca per vacances', ti:'Descansem uns dies', cu:'Hola {nombre},\n\nDel [data] al [data] estarem tancats per vacances. Tornarem amb les piles carregades i moltes ganes de veure\'t.\n\nSi vols reservar per quan tornem, ja ho pots fer.'},
   en:{as:'{negocio} is closing for the holidays', ti:'We are taking a few days off', cu:'Hi {nombre},\n\nFrom [date] to [date] we will be closed for the holidays. We will be back recharged and looking forward to seeing you.\n\nIf you want to book for when we are back, you can do it now.'}},
  {id:'reapertura', ic:'ti-door-enter', et:{es:'Volvemos a abrir', ca:'Tornem a obrir', en:'We are reopening'}, cta:'reservar',
   es:{as:'¡Volvemos a abrir en {negocio}!', ti:'Ya estamos de vuelta', cu:'Hola {nombre},\n\nEl [fecha] reabrimos las puertas y te estamos esperando. [Si hay novedades: carta nueva, reforma, horario…]\n\nReserva tu mesa y celebremos la vuelta juntos.'},
   ca:{as:'Tornem a obrir a {negocio}!', ti:'Ja som de tornada', cu:'Hola {nombre},\n\nEl [data] reobrim les portes i t\'esperem. [Si hi ha novetats: carta nova, reforma, horari…]\n\nReserva la teva taula i celebrem la tornada junts.'},
   en:{as:'We are reopening at {negocio}!', ti:'We are back', cu:'Hi {nombre},\n\nOn [date] we open our doors again and we are waiting for you. [Any news: new menu, refurbishment, hours…]\n\nBook your table and let us celebrate together.'}},
  {id:'fecha', ic:'ti-calendar-star', et:{es:'Fecha señalada', ca:'Data assenyalada', en:'Special date'}, cta:'reservar',
   es:{as:'[Navidad / San Valentín…] en {negocio}: reserva tu mesa', ti:'Una fecha para celebrar', cu:'Hola {nombre},\n\n[La fecha señalada] se acerca y ya tenemos preparado [menú especial, ambiente, detalle]. [Precio o condiciones.]\n\nLas mesas vuelan, así que te aconsejamos reservar cuanto antes.'},
   ca:{as:'[Nadal / Sant Valentí…] a {negocio}: reserva la teva taula', ti:'Una data per celebrar', cu:'Hola {nombre},\n\n[La data assenyalada] s\'acosta i ja tenim a punt [menú especial, ambient, detall]. [Preu o condicions.]\n\nLes taules volen, així que et aconsellem reservar com abans millor.'},
   en:{as:'[Christmas / Valentine\'s…] at {negocio}: book your table', ti:'A date to celebrate', cu:'Hi {nombre},\n\n[The special date] is coming and we have [a special menu, atmosphere, a little extra] ready. [Price or conditions.]\n\nTables go fast, so we advise you to book as soon as you can.'}},
  {id:'grupos', ic:'ti-users-group', et:{es:'Grupos y celebraciones', ca:'Grups i celebracions', en:'Groups and celebrations'}, cta:'llamar',
   es:{as:'Celebra con nosotros: reservas para grupos en {negocio}', ti:'Tu celebración, en buenas manos', cu:'Hola {nombre},\n\n¿Cumpleaños, comida de empresa, despedida? Preparamos [menús para grupos, un espacio reservado…] para que solo tengas que disfrutar.\n\nEscríbenos con la fecha y el número de personas y te enviamos una propuesta sin compromiso.'},
   ca:{as:'Celebra amb nosaltres: reserves per a grups a {negocio}', ti:'La teva celebració, en bones mans', cu:'Hola {nombre},\n\nAniversari, dinar d\'empresa, comiat? Preparem [menús per a grups, un espai reservat…] perquè només hagis de gaudir.\n\nEscriu-nos amb la data i el nombre de persones i t\'enviem una proposta sense compromís.'},
   en:{as:'Celebrate with us: group bookings at {negocio}', ti:'Your celebration, in good hands', cu:'Hi {nombre},\n\nA birthday, a work lunch, a farewell? We prepare [group menus, a reserved area…] so all you have to do is enjoy.\n\nWrite to us with the date and the number of people and we will send you a proposal with no commitment.'}},
  {id:'gracias', ic:'ti-heart', et:{es:'Gracias y fidelización', ca:'Gràcies i fidelització', en:'Thank you'}, cta:'reservar',
   es:{as:'Gracias por ser parte de {negocio}', ti:'Gracias, de corazón', cu:'Hola {nombre},\n\nSolo queríamos darte las gracias por venir y confiar en nosotros. Clientes como tú hacen que merezca la pena abrir cada día.\n\n[Si quieres, añade un detalle: una invitación, un descuento para tu próxima visita…]'},
   ca:{as:'Gràcies per ser part de {negocio}', ti:'Gràcies, de tot cor', cu:'Hola {nombre},\n\nNomés volíem donar-te les gràcies per venir i confiar en nosaltres. Clients com tu fan que valgui la pena obrir cada dia.\n\n[Si vols, afegeix un detall: una invitació, un descompte per a la teva propera visita…]'},
   en:{as:'Thank you for being part of {negocio}', ti:'Thank you, from the heart', cu:'Hi {nombre},\n\nWe just wanted to thank you for coming and trusting us. Customers like you make it worth opening every day.\n\n[If you like, add a little extra: an invitation, a discount for your next visit…]'}},
];
function nvTema(id){ return NV_TEMAS.find(x => x.id === id) || NV_TEMAS[0]; }
function nvAplicarTema(c, id){
  const tm = nvTema(id);
  const lang = getLang();
  const tx = tm[lang] || tm.es;
  c.tema = tm.id;
  c.asunto = tx.as; c.titular = tx.ti; c.cuerpo = tx.cu;
  const of = tm.oferta && (tm.oferta[lang] || tm.oferta.es);
  c.oferta = of ? {on: true, titulo: of.t, detalle: of.d, codigo: '', hasta: ''} : {on: false, titulo: '', detalle: '', codigo: '', hasta: ''};
  c.cta = {tipo: tm.cta || 'ninguno', texto: '', url: ''};
}

// ── Sustituciones y textos ───────────────────────────────────────────────
function nvNegocio(){ return (DB.business && DB.business.name) || ''; }
// {nombre} y {negocio}. En el envío en bloque (copia oculta) no hay forma de
// poner el nombre de cada uno: se quita sin dejar «Hola ,».
function nvSustituir(txt, cli, anonimo){
  const nombre = anonimo ? '' : nvPrimerNombre(cli);
  let r = String(txt || '').replace(/\{negocio\}/gi, nvNegocio()).replace(/\{nombre\}/gi, nombre);
  if(!nombre) r = r.replace(/[ \t]+([,.;:!?¡])/g, '$1').replace(/^[ \t]*[,;]\s*/gm, '').replace(/[ \t]{2,}/g, ' ');
  return r;
}
function nvAcento(){
  const c = (DB.business && DB.business.brandColor) || '#4A5D4E';
  return /^#[0-9a-f]{6}$/i.test(c) ? c : '#4A5D4E';
}
function nvTextoSobre(hex){
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1F2420' : '#FFFFFF';
}
function nvFechaCorta(ds){
  if(!ds) return '';
  return new Date(ds + 'T00:00:00').toLocaleDateString(localeActual(), {day:'numeric', month:'long'});
}
function nvEsUrlHttps(u){ return /^https:\/\/[^\s"'<>]+$/i.test(String(u || '').trim()); }
// Convierte los enlaces sueltos del texto en enlaces de verdad.
function nvLinkificar(escapado, color){
  return escapado.replace(/(https?:\/\/[^\s<]+)/g, u => {
    const limpio = u.replace(/[.,;:!?)]+$/, ''), resto = u.slice(limpio.length);
    return `<a href="${limpio}" style="color:${color};text-decoration:underline">${limpio}</a>${resto}`;
  });
}
function nvLegalPie(){
  const b = DB.business || {};
  const l = b.legalPublico || {};
  const quien = [l.titular, l.nif].filter(Boolean).join(' · ');
  return quien;
}

// Lo que se ve de la oferta destacada, ya resuelto.
function nvOfertaResuelta(c, cli, anonimo){
  const o = c.oferta || {};
  if(!o.on || !(o.titulo || '').trim()) return null;
  return {
    titulo: nvSustituir(o.titulo, cli, anonimo).trim(),
    detalle: nvSustituir(o.detalle || '', cli, anonimo).trim(),
    codigo: (o.codigo || '').trim(),
    hasta: o.hasta ? nvFechaCorta(o.hasta) : ''
  };
}

/* ── El email, con diseño ─────────────────────────────────────────────────
   Tablas y estilos en línea: es lo ÚNICO que respetan Gmail, Outlook y Apple
   Mail a la vez (nada de flex, grid ni hojas de estilo). 600 px de ancho, el
   botón es una tabla con fondo («a prueba de Outlook»), la imagen y el logo
   llevan texto alternativo y hay un texto oculto de previsualización, que es
   lo que se lee en la bandeja antes de abrirlo. */
function nvEmailHtml(c, cli, opts){
  opts = opts || {};
  const esc = escapeHtml;
  const b = DB.business || {};
  const acento = nvAcento(), sobre = nvTextoSobre(acento);
  const anonimo = !!opts.anonimo;
  const tinta = '#1F2420', suave = '#5C625D', fondo = '#F1EFE9', papel = '#FFFFFF', filete = '#DDD9CF';
  const fuente = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const titular = nvSustituir(c.titular, cli, anonimo).trim();
  const parrafos = nvSustituir(c.cuerpo, cli, anonimo).trim().split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const oferta = nvOfertaResuelta(c, cli, anonimo);
  const cta = nvCtaResuelto(c);
  const previa = (parrafos[0] || '').replace(/\s+/g, ' ').slice(0, 110);
  const nombre = nvNegocio();
  const logoSrc = opts.logoSrc || (c.logo && b.logo ? b.logo : '');
  const cabecera = logoSrc
    ? `<img src="${esc(logoSrc)}" alt="${esc(nombre)}" height="44" style="display:block;height:44px;width:auto;max-width:240px;border:0;margin:0 auto">`
    : `<span style="font-family:${fuente};font-size:15px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${tinta}">${esc(nombre)}</span>`;
  const imagen = nvEsUrlHttps(c.imagen)
    ? `<tr><td style="padding:0"><img src="${esc(c.imagen.trim())}" alt="${esc(titular || nombre)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>` : '';
  const cuerpo = parrafos.map(p => `<p style="margin:0 0 16px;font-family:${fuente};font-size:16px;line-height:1.6;color:${tinta}">${nvLinkificar(esc(p), acento).replace(/\n/g, '<br>')}</p>`).join('');
  const bloqueOferta = oferta ? `
    <tr><td style="padding:8px 32px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px solid ${acento};border-radius:6px"><tr><td align="center" style="padding:22px 20px;font-family:${fuente}">
      <div style="font-size:26px;line-height:1.2;font-weight:800;color:${acento};letter-spacing:-.01em">${esc(oferta.titulo)}</div>
      ${oferta.detalle ? `<div style="margin-top:8px;font-size:15px;line-height:1.5;color:${tinta}">${esc(oferta.detalle)}</div>` : ''}
      ${oferta.codigo ? `<div style="margin-top:12px;display:inline-block;padding:6px 14px;border:1px dashed ${acento};border-radius:4px;font-size:15px;font-weight:700;letter-spacing:.12em;color:${tinta}">${esc(oferta.codigo)}</div>` : ''}
      ${oferta.hasta ? `<div style="margin-top:10px;font-size:13px;color:${suave}">${esc(gl({es:'Válido hasta el ', ca:'Vàlid fins al ', en:'Valid until '}))}${esc(oferta.hasta)}</div>` : ''}
    </td></tr></table></td></tr>` : '';
  const boton = cta ? `
    <tr><td align="center" style="padding:6px 32px 28px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" bgcolor="${acento}" style="border-radius:6px;background:${acento}"><a href="${esc(cta.url)}" target="_blank" style="display:inline-block;padding:15px 34px;font-family:${fuente};font-size:16px;font-weight:700;color:${sobre};text-decoration:none;border-radius:6px">${esc(cta.texto)}</a></td>
    </tr></table></td></tr>` : '';
  const redes = [
    [b.ig && instagramProfileUrl(b.ig), 'Instagram'], [b.fb && facebookProfileUrl(b.fb), 'Facebook'],
    [b.tiktok && tiktokProfileUrl(b.tiktok), 'TikTok'], [b.web && (/^https?:\/\//i.test(b.web) ? b.web : 'https://' + b.web), 'Web']
  ].filter(x => x[0]).map(([u, n]) => `<a href="${esc(u)}" target="_blank" style="color:${suave};text-decoration:underline">${n}</a>`).join(' &nbsp;·&nbsp; ');
  const datos = [b.address, b.phone].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  const legal = nvLegalPie();
  const baja = gl({
    es: 'Recibes este correo porque nos diste tu permiso para enviarte novedades. Si prefieres no recibir más, responde a este mensaje con la palabra BAJA y dejaremos de escribirte.',
    ca: 'Reps aquest correu perquè ens vas donar permís per enviar-te novetats. Si prefereixes no rebre\'n més, respon a aquest missatge amb la paraula BAIXA i deixarem d\'escriure\'t.',
    en: 'You are receiving this email because you gave us permission to send you news. If you would rather not receive more, reply to this message with the word UNSUBSCRIBE and we will stop writing to you.'
  });
  const firma = gl({es:'Un abrazo,', ca:'Una abraçada,', en:'Warm regards,'});
  return `<!DOCTYPE html>
<html lang="${getLang()}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(nvSustituir(c.asunto, cli, anonimo) || nombre)}</title></head>
<body style="margin:0;padding:0;background:${fondo};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${esc(previa)}${'&#8199;&#847; '.repeat(30)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${fondo}" style="background:${fondo}"><tr><td align="center" style="padding:24px 12px">
 <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${papel};border-radius:8px;overflow:hidden">
  <tr><td height="6" style="height:6px;line-height:6px;font-size:0;background:${acento}" bgcolor="${acento}">&nbsp;</td></tr>
  <tr><td align="center" style="padding:26px 32px 20px">${cabecera}</td></tr>
  ${imagen}
  ${titular ? `<tr><td style="padding:${imagen ? '28' : '8'}px 32px 14px"><h1 style="margin:0;font-family:${fuente};font-size:28px;line-height:1.2;font-weight:800;letter-spacing:-.015em;color:${tinta}">${esc(titular)}</h1></td></tr>` : ''}
  <tr><td style="padding:6px 32px 8px">${cuerpo}</td></tr>
  ${bloqueOferta}
  ${boton}
  <tr><td style="padding:0 32px 30px"><p style="margin:0;font-family:${fuente};font-size:16px;line-height:1.5;color:${tinta}">${esc(firma)}<br><strong>${esc(nombre)}</strong></p></td></tr>
  <tr><td style="padding:22px 32px 26px;border-top:1px solid ${filete};background:#FAF8F4;font-family:${fuente};font-size:12.5px;line-height:1.6;color:${suave}">
    ${datos ? `<div style="margin-bottom:6px">${datos}</div>` : ''}
    ${redes ? `<div style="margin-bottom:12px">${redes}</div>` : ''}
    <div>${esc(baja)}</div>
    ${legal ? `<div style="margin-top:8px">${esc(gl({es:'Responsable: ', ca:'Responsable: ', en:'Controller: '}))}${esc(legal)}</div>` : ''}
  </td></tr>
 </table>
</td></tr></table>
</body></html>`;
}

// La misma información en texto plano: para el cuerpo alternativo del correo
// y para el envío uno a uno por mailto (que no admite HTML).
function nvEmailTexto(c, cli, opts){
  opts = opts || {};
  const anonimo = !!opts.anonimo;
  const oferta = nvOfertaResuelta(c, cli, anonimo);
  const cta = nvCtaResuelto(c);
  const l = [];
  const titular = nvSustituir(c.titular, cli, anonimo).trim();
  if(titular){ l.push(titular.toUpperCase(), ''); }
  l.push(nvSustituir(c.cuerpo, cli, anonimo).trim());
  if(oferta){
    l.push('', '— ' + oferta.titulo + (oferta.detalle ? ' · ' + oferta.detalle : ''));
    if(oferta.codigo) l.push(gl({es:'Código: ', ca:'Codi: ', en:'Code: '}) + oferta.codigo);
    if(oferta.hasta) l.push(gl({es:'Válido hasta el ', ca:'Vàlid fins al ', en:'Valid until '}) + oferta.hasta);
  }
  if(cta) l.push('', cta.texto + ': ' + cta.url);
  l.push('', gl({es:'Un abrazo,', ca:'Una abraçada,', en:'Warm regards,'}), nvNegocio());
  const b = DB.business || {};
  const pie = [b.address, b.phone].filter(Boolean).join(' · ');
  if(pie) l.push('', pie);
  l.push('', '--', gl({
    es: 'Recibes este correo porque nos diste tu permiso para enviarte novedades. Si prefieres no recibir más, responde con la palabra BAJA.',
    ca: 'Reps aquest correu perquè ens vas donar permís per enviar-te novetats. Si prefereixes no rebre\'n més, respon amb la paraula BAIXA.',
    en: 'You are receiving this email because you gave us permission to send you news. If you would rather not receive more, reply with the word UNSUBSCRIBE.'
  }));
  return l.join('\n');
}

// WhatsApp: negritas con asteriscos, sin adornos. Va por cliente, con su nombre.
function nvWaTexto(c, cli, anonimo){
  const oferta = nvOfertaResuelta(c, cli, !!anonimo);
  const cta = nvCtaResuelto(c);
  const l = [];
  const titular = nvSustituir(c.titular, cli, !!anonimo).trim();
  if(titular) l.push('*' + titular + '*', '');
  l.push(nvSustituir(c.cuerpo, cli, !!anonimo).trim());
  if(oferta){
    l.push('', '*' + oferta.titulo + '*' + (oferta.detalle ? ' · ' + oferta.detalle : ''));
    if(oferta.codigo) l.push(gl({es:'Código: ', ca:'Codi: ', en:'Code: '}) + oferta.codigo);
    if(oferta.hasta) l.push(gl({es:'Hasta el ', ca:'Fins al ', en:'Until '}) + oferta.hasta);
  }
  if(cta) l.push('', cta.texto + ': ' + cta.url);
  l.push('', nvNegocio());
  l.push('_' + gl({es:'Si no quieres recibir más novedades, responde BAJA.', ca:'Si no vols rebre més novetats, respon BAIXA.', en:'If you do not want more news, reply UNSUBSCRIBE.'}) + '_');
  return l.join('\n');
}

// Lo que falta o sobra antes de enviar. Devuelve avisos (no bloquea por sí solo).
function nvRevisar(c){
  const avisos = [];
  const todo = [c.asunto, c.titular, c.cuerpo, (c.oferta || {}).titulo, (c.oferta || {}).detalle].join('\n');
  if(/\[[^\]]+\]/.test(todo)) avisos.push(gl({es:'Todavía hay textos entre [corchetes] sin rellenar.', ca:'Encara hi ha textos entre [claudàtors] sense omplir.', en:'There is still text in [square brackets] to fill in.'}));
  if(!(c.asunto || '').trim()) avisos.push(gl({es:'Falta el asunto del email.', ca:'Falta l\'assumpte de l\'email.', en:'The email subject is missing.'}));
  if(!(c.cuerpo || '').replace(/\{nombre\}|hola|hi|,/gi, '').trim()) avisos.push(gl({es:'El mensaje está vacío.', ca:'El missatge és buit.', en:'The message is empty.'}));
  const ops = nvCtaOpciones().find(x => x.id === c.cta.tipo);
  if(ops && ops.id !== 'ninguno' && !nvCtaResuelto(c)) avisos.push(gl({es:'El botón no tiene enlace (revisa Mi Negocio o escribe uno).', ca:'El botó no té enllaç (revisa Mi Negocio o escriu-ne un).', en:'The button has no link (check My Business or type one).'}));
  if((c.imagen || '').trim() && !nvEsUrlHttps(c.imagen)) avisos.push(gl({es:'La imagen debe ser un enlace que empiece por https://.', ca:'La imatge ha de ser un enllaç que comenci per https://.', en:'The image must be a link starting with https://.'}));
  return avisos;
}

/* ============================================================
   PANTALLA
   ============================================================ */
let nvCalc = null;
let nvPrevTimer = null;

function nvSet(ruta, valor){
  const c = nvC();
  const partes = ruta.split('.');
  let o = c;
  for(let i = 0; i < partes.length - 1; i++) o = o[partes[i]];
  o[partes[partes.length - 1]] = valor;
  nvToca();
  nvRefrescarPrev();
  const av = document.getElementById('nv-avisos'); if(av) av.innerHTML = nvAvisosHtml(c);
  const ct = document.getElementById('nv-asunto-cuenta'); if(ct) nvCuentaAsunto(ct, c.asunto);
}
function nvCuentaAsunto(el, txt){
  const n = String(txt || '').length;
  el.textContent = n + ' / 60';
  el.classList.toggle('es-largo', n > 60);
}
// Cada campo de texto se escribe sin repintar la pantalla (el cursor no salta).
function nvAutoAlto(el){ if(typeof lpAuto === 'function') lpAuto(el); }

function nvIr(vista){ nvVista = vista; renderNovedades(); }

function nvSubnavHtml(){
  const n = nvLista().filter(x => nvTieneContenido(x)).length;
  return `<div class="toolbar pm-barra nv-subnav">
    <div class="left">
      <button type="button" class="btn btn-sm btn-fino${nvVista==='nueva' ? ' is-on' : ''}" aria-pressed="${nvVista==='nueva'}" onclick="nvIr('nueva')"><i class="ti ti-pencil"></i> ${escapeHtml(gl({es:'Nueva novedad', ca:'Nova novetat', en:'New message'}))}</button>
      <button type="button" class="btn btn-sm btn-fino${nvVista==='historial' ? ' is-on' : ''}" aria-pressed="${nvVista==='historial'}" onclick="nvIr('historial')"><i class="ti ti-history"></i> ${escapeHtml(gl({es:'Enviadas y borradores', ca:'Enviades i esborranys', en:'Sent and drafts'}))}${n ? ` <span class="dp-cuenta">${n}</span>` : ''}</button>
    </div>
    <button type="button" class="btn btn-sm btn-fino" onclick="nvBajaModal()"><i class="ti ti-user-minus"></i> ${escapeHtml(gl({es:'Registrar una baja', ca:'Registrar una baixa', en:'Record an opt-out'}))}</button>
  </div>`;
}
function nvTieneContenido(c){
  return !!((c.asunto || '').trim() || (c.titular || '').trim() || (c.cuerpo || '').replace(/\{nombre\}|hola|hi|,|\s/gi, '').trim() || Object.keys(c.enviados || {}).length);
}

function renderNovedades(){
  const box = document.getElementById('promo-tab-content');
  if(!box) return;
  if(!editUnlocked){
    box.innerHTML = `<div class="empty es-vacio"><i class="ti ti-lock"></i>${escapeHtml(gl({es:'Las novedades las envía el propietario o quien tenga permiso para editar: llevan los datos de contacto de los clientes.', ca:'Les novetats les envia el propietari o qui tingui permís per editar: porten les dades de contacte dels clients.', en:'News is sent by the owner or someone with edit permission: it uses your customers\' contact details.'}))}</div>`;
    return;
  }
  box.innerHTML = nvSubnavHtml() + (nvVista === 'historial' ? nvHistorialHtml() : nvEditorHtml(nvC()));
  if(nvVista === 'nueva'){
    box.querySelectorAll('textarea.lp-auto-alto').forEach(nvAutoAlto);
    nvRefrescarPrev(true);
  }
}

function nvAvisosHtml(c){
  const av = nvRevisar(c);
  if(!av.length) return `<div class="pr-aviso"><i class="ti ti-circle-check" style="color:#33523A"></i><div class="pr-aviso-txt">${escapeHtml(gl({es:'Todo listo para enviar.', ca:'Tot a punt per enviar.', en:'Everything is ready to send.'}))}</div></div>`;
  return av.map(a => `<div class="pr-aviso is-rojo"><i class="ti ti-alert-triangle"></i><div class="pr-aviso-txt">${escapeHtml(a)}</div></div>`).join('');
}

function nvEditorHtml(c){
  const calc = nvCalc = nvCalcular(c);
  const segs = nvSegmentosDef();
  const ultima = nvLista().filter(x => x.estado === 'enviada').map(x => x.enviadaEn || x.actualizadaEn).sort().pop();
  const num = n => `<span class="nv-num" aria-hidden="true">${n}</span>`;
  const segBtn = s => `
    <button type="button" class="nv-seg${c.seg.tipo === s.id ? ' is-on' : ''}" aria-pressed="${c.seg.tipo === s.id}" title="${escapeHtml(s.ay)}" onclick="nvSegmento('${s.id}')">
      <i class="ti ${s.ic}"></i><span class="nv-seg-et">${escapeHtml(s.et)}</span>${s.id === 'cp' || s.id === 'elegir' ? '' : `<b class="nv-seg-n">${calc.conteos[s.id]}</b>`}
    </button>`;
  const cpSel = c.seg.tipo === 'cp' ? `
    <div class="field nv-cp"><label for="nv-cp">${escapeHtml(gl({es:'Código postal', ca:'Codi postal', en:'Postcode'}))}</label>
    ${Object.keys(calc.cps).length ? `<select id="nv-cp" onchange="nvSetCp(this.value)"><option value="">${escapeHtml(gl({es:'Elige uno…', ca:'Tria\'n un…', en:'Choose one…'}))}</option>${Object.keys(calc.cps).sort().map(k => `<option value="${escapeHtml(k)}" ${c.seg.cp === k ? 'selected' : ''}>${escapeHtml(k)} (${calc.cps[k]})</option>`).join('')}</select>`
      : `<p class="pr-ayuda">${escapeHtml(gl({es:'Ningún cliente tiene código postal. Se rellena en su ficha, en Clientes.', ca:'Cap client té codi postal. S\'omple a la seva fitxa, a Clients.', en:'No customer has a postcode yet. Add it on their card, in Customers.'}))}</p>`}</div>` : '';
  const elegirBt = c.seg.tipo === 'elegir' ? `<button type="button" class="btn btn-sm btn-fino" onclick="nvElegirModal()"><i class="ti ti-checkbox"></i> ${escapeHtml(gl({es:`Elegir clientes (${(c.incluidos || []).length})`, ca:`Triar clients (${(c.incluidos || []).length})`, en:`Choose customers (${(c.incluidos || []).length})`}))}</button>` : '';

  const temas = NV_TEMAS.map(tm => `
    <button type="button" class="nv-tema${c.tema === tm.id ? ' is-on' : ''}" aria-pressed="${c.tema === tm.id}" onclick="nvElegirTema('${tm.id}')"><i class="ti ${tm.ic}"></i><span>${escapeHtml(gl(tm.et))}</span></button>`).join('');

  const ctaOps = nvCtaOpciones();
  const cta = ctaOps.find(x => x.id === c.cta.tipo) || ctaOps[0];

  return `
  ${pmResumenHtml([
    {et: gl({es:'Aceptan novedades', ca:'Accepten novetats', en:'Accept news'}), v: calc.todos.length, sub: calc.sinPermiso ? escapeHtml(gl({es:`${calc.sinPermiso} no aceptan`, ca:`${calc.sinPermiso} no accepten`, en:`${calc.sinPermiso} do not`})) : ''},
    {et: 'Email', v: calc.todos.filter(x => nvEmailValido(x.email)).length},
    {et: 'WhatsApp', v: calc.todos.filter(x => whatsappDeTelefono(x.phone)).length},
    {et: gl({es:'Última novedad', ca:'Última novetat', en:'Last message'}), v: ultima ? `<small>${escapeHtml(new Date(ultima).toLocaleDateString(localeActual(), {day:'numeric', month:'short'}))}</small>` : '—'},
  ])}
  <div class="nv-grid">
    <section class="lp-card nv-paso" style="grid-area:aud">
      <h3 class="es-tit">${num(1)} ${escapeHtml(gl({es:'A quién se la envías', ca:'A qui l\'envies', en:'Who you send it to'}))}</h3>
      <div class="nv-segs" role="group" aria-label="${escapeHtml(gl({es:'Grupo de clientes', ca:'Grup de clients', en:'Customer group'}))}">${segs.map(segBtn).join('')}</div>
      ${cpSel}
      <div class="nv-alcance" aria-live="polite">
        <div><b class="nv-alcance-n">${calc.destinatarios.length}</b> ${escapeHtml(gl({es:'clientes', ca:'clients', en:'customers'}))} <span class="nv-alcance-det">· ${calc.conEmail.length} email · ${calc.conWa.length} WhatsApp</span></div>
        <div class="nv-alcance-bt">${elegirBt}<button type="button" class="btn btn-sm btn-fino" onclick="nvDestinatariosModal()" ${calc.elegidos.length ? '' : 'disabled'}><i class="ti ti-list-check"></i> ${escapeHtml(gl({es:'Ver destinatarios', ca:'Veure destinataris', en:'See recipients'}))}</button></div>
      </div>
      ${calc.excluidos ? `<p class="pr-ayuda"><i class="ti ti-user-off"></i> ${escapeHtml(gl({es:`${calc.excluidos} desmarcado(s) a mano.`, ca:`${calc.excluidos} desmarcat(s) a mà.`, en:`${calc.excluidos} unticked by hand.`}))}</p>` : ''}
      <p class="pr-ayuda"><i class="ti ti-shield-check"></i> ${escapeHtml(gl({es:'Solo reciben quienes no han retirado su consentimiento de marketing (ficha del cliente).', ca:'Només reben els qui no han retirat el seu consentiment de màrqueting (fitxa del client).', en:'Only customers who have not withdrawn their marketing consent will receive it (customer card).'}))}</p>
    </section>

    <section class="lp-card nv-paso" style="grid-area:tem">
      <h3 class="es-tit">${num(2)} ${escapeHtml(gl({es:'Sobre qué es', ca:'De què va', en:'What it is about'}))}</h3>
      <div class="nv-temas">${temas}</div>
      <p class="pr-ayuda">${escapeHtml(gl({es:'Elige un tema y te dejo el mensaje escrito para que solo cambies lo que va entre [corchetes], o escribe el tuyo desde cero.', ca:'Tria un tema i et deixo el missatge escrit perquè només canviïs el que va entre [claudàtors], o escriu el teu des de zero.', en:'Pick a topic and the message comes written, so you only change what is in [square brackets] — or write your own from scratch.'}))}</p>
    </section>

    <section class="lp-card nv-paso" style="grid-area:men">
      <h3 class="es-tit">${num(3)} ${escapeHtml(gl({es:'El mensaje', ca:'El missatge', en:'The message'}))}</h3>
      <div class="field">
        <label for="nv-asunto">${escapeHtml(gl({es:'Asunto del email', ca:'Assumpte de l\'email', en:'Email subject'}))} <span class="nv-cuenta" id="nv-asunto-cuenta">${String(c.asunto || '').length} / 60</span></label>
        <input type="text" id="nv-asunto" maxlength="140" value="${escapeHtml(c.asunto)}" oninput="nvSet('asunto', this.value)" placeholder="${escapeHtml(gl({es:'Lo que se lee en la bandeja de entrada', ca:'El que es llegeix a la safata d\'entrada', en:'What shows in the inbox'}))}">
      </div>
      <div class="field">
        <label for="nv-titular">${escapeHtml(gl({es:'Titular', ca:'Titular', en:'Headline'}))}</label>
        <input type="text" id="nv-titular" maxlength="120" value="${escapeHtml(c.titular)}" oninput="nvSet('titular', this.value)">
      </div>
      <div class="field">
        <label for="nv-cuerpo">${escapeHtml(gl({es:'Texto', ca:'Text', en:'Text'}))}</label>
        <textarea id="nv-cuerpo" class="lp-auto-alto" rows="6" oninput="nvSet('cuerpo', this.value); nvAutoAlto(this)">${escapeHtml(c.cuerpo)}</textarea>
        <div class="nv-ins"><span class="pr-ayuda">${escapeHtml(gl({es:'Insertar:', ca:'Inserir:', en:'Insert:'}))}</span>
          <button type="button" class="btn btn-sm btn-fino" onclick="nvInsertar('{nombre}')">{nombre}</button>
          <button type="button" class="btn btn-sm btn-fino" onclick="nvInsertar('{negocio}')">{negocio}</button></div>
        <p class="pr-ayuda">${escapeHtml(gl({es:'Una línea en blanco separa los párrafos. {nombre} se cambia por el nombre de cada cliente (en el envío por email en bloque se omite).', ca:'Una línia en blanc separa els paràgrafs. {nombre} es canvia pel nom de cada client (a l\'enviament per email en bloc s\'omet).', en:'A blank line separates paragraphs. {nombre} becomes each customer\'s name (it is left out in bulk email).'}))}</p>
      </div>
      <label class="pm-opcion"><input type="checkbox" ${c.oferta.on ? 'checked' : ''} onchange="nvOfertaOn(this.checked)"><span>${escapeHtml(gl({es:'Destacar una oferta en un recuadro', ca:'Destacar una oferta en un requadre', en:'Highlight an offer in a box'}))}</span></label>
      ${c.oferta.on ? `<div class="nv-oferta">
        <div class="field"><label for="nv-of-t">${escapeHtml(gl({es:'La oferta', ca:'L\'oferta', en:'The offer'}))}</label><input type="text" id="nv-of-t" maxlength="60" value="${escapeHtml(c.oferta.titulo)}" oninput="nvSet('oferta.titulo', this.value)" placeholder="${escapeHtml(gl({es:'2x1 en cócteles', ca:'2x1 en còctels', en:'2-for-1 on cocktails'}))}"></div>
        <div class="field"><label for="nv-of-d">${escapeHtml(gl({es:'Condiciones', ca:'Condicions', en:'Conditions'}))}</label><input type="text" id="nv-of-d" maxlength="120" value="${escapeHtml(c.oferta.detalle)}" oninput="nvSet('oferta.detalle', this.value)" placeholder="${escapeHtml(gl({es:'De lunes a jueves, de 18 a 20 h', ca:'De dilluns a dijous, de 18 a 20 h', en:'Monday to Thursday, 6 to 8 pm'}))}"></div>
        <div class="field-row">
          <div class="field"><label for="nv-of-c">${escapeHtml(gl({es:'Código (opcional)', ca:'Codi (opcional)', en:'Code (optional)'}))}</label><input type="text" id="nv-of-c" maxlength="24" value="${escapeHtml(c.oferta.codigo)}" oninput="nvSet('oferta.codigo', this.value)"></div>
          <div class="field"><label for="nv-of-h">${escapeHtml(gl({es:'Válida hasta (opcional)', ca:'Vàlida fins (opcional)', en:'Valid until (optional)'}))}</label><input type="date" id="nv-of-h" value="${escapeHtml(c.oferta.hasta)}" oninput="nvSet('oferta.hasta', this.value)"></div>
        </div></div>` : ''}
      <div class="field-row nv-cta">
        <div class="field"><label for="nv-cta-tipo">${escapeHtml(gl({es:'Botón', ca:'Botó', en:'Button'}))}</label>
          <select id="nv-cta-tipo" onchange="nvCtaTipo(this.value)">${ctaOps.map(o => `<option value="${o.id}" ${c.cta.tipo === o.id ? 'selected' : ''}>${escapeHtml(o.et)}</option>`).join('')}</select></div>
        ${cta.id !== 'ninguno' ? `<div class="field"><label for="nv-cta-texto">${escapeHtml(gl({es:'Texto del botón', ca:'Text del botó', en:'Button text'}))}</label><input type="text" id="nv-cta-texto" maxlength="40" value="${escapeHtml(c.cta.texto)}" placeholder="${escapeHtml(cta.texto)}" oninput="nvSet('cta.texto', this.value)"></div>` : ''}
      </div>
      ${cta.id === 'otro' ? `<div class="field"><label for="nv-cta-url">${escapeHtml(gl({es:'Enlace del botón', ca:'Enllaç del botó', en:'Button link'}))}</label><input type="text" id="nv-cta-url" value="${escapeHtml(c.cta.url)}" oninput="nvSet('cta.url', this.value)" placeholder="https://"></div>` : ''}
      ${cta.id !== 'ninguno' && cta.id !== 'otro' && !cta.url ? `<p class="pr-ayuda is-aviso"><i class="ti ti-alert-triangle"></i> ${escapeHtml(gl({es:'Este botón necesita un dato en Mi Negocio (teléfono, web o Google Maps) o el enlace público de reservas.', ca:'Aquest botó necessita una dada a Mi Negocio (telèfon, web o Google Maps) o l\'enllaç públic de reserves.', en:'This button needs a detail in My Business (phone, website or Google Maps) or the public booking link.'}))}</p>` : ''}
      <div class="field">
        <label for="nv-imagen">${escapeHtml(gl({es:'Imagen grande arriba (opcional)', ca:'Imatge gran a dalt (opcional)', en:'Large image at the top (optional)'}))}</label>
        <input type="url" id="nv-imagen" value="${escapeHtml(c.imagen)}" oninput="nvSet('imagen', this.value)" placeholder="https://…">
        <p class="pr-ayuda">${escapeHtml(gl({es:'Un enlace público a la foto (por ejemplo, copiada de tu Instagram o tu web). Solo se ve en el email.', ca:'Un enllaç públic a la foto (per exemple, copiada del teu Instagram o la teva web). Només es veu a l\'email.', en:'A public link to the photo (for example copied from your Instagram or website). It only shows in the email.'}))}</p>
      </div>
      ${DB.business && DB.business.logo ? `<label class="pm-opcion"><input type="checkbox" ${c.logo ? 'checked' : ''} onchange="nvSet('logo', this.checked); nvRefrescarPrev()"><span>${escapeHtml(gl({es:'Mostrar mi logo en la cabecera', ca:'Mostrar el meu logo a la capçalera', en:'Show my logo in the header'}))}</span></label>` : ''}
    </section>

    <aside class="lp-card nv-prev" style="grid-area:pre" aria-label="${escapeHtml(gl({es:'Vista previa', ca:'Vista prèvia', en:'Preview'}))}">
      <div class="nv-prev-cab">
        <h3 class="es-tit" style="margin:0">${escapeHtml(gl({es:'Vista previa', ca:'Vista prèvia', en:'Preview'}))}</h3>
        <div class="nv-prev-modos" role="group">
          <button type="button" class="btn btn-sm btn-fino${nvPrevModo==='email' ? ' is-on' : ''}" aria-pressed="${nvPrevModo==='email'}" onclick="nvPrevSet('email')"><i class="ti ti-mail"></i> Email</button>
          <button type="button" class="btn btn-sm btn-fino${nvPrevModo==='movil' ? ' is-on' : ''}" aria-pressed="${nvPrevModo==='movil'}" onclick="nvPrevSet('movil')"><i class="ti ti-device-mobile"></i> ${escapeHtml(gl({es:'Móvil', ca:'Mòbil', en:'Mobile'}))}</button>
          <button type="button" class="btn btn-sm btn-fino${nvPrevModo==='whatsapp' ? ' is-on' : ''}" aria-pressed="${nvPrevModo==='whatsapp'}" onclick="nvPrevSet('whatsapp')"><i class="ti ti-brand-whatsapp"></i> WhatsApp</button>
        </div>
      </div>
      <div class="nv-prev-asunto" id="nv-prev-asunto"></div>
      <div class="nv-prev-marco" id="nv-prev-marco"></div>
    </aside>

    <section class="lp-card nv-paso" style="grid-area:env">
      <h3 class="es-tit">${num(4)} ${escapeHtml(gl({es:'Enviar', ca:'Enviar', en:'Send'}))}</h3>
      <div id="nv-avisos">${nvAvisosHtml(c)}</div>
      <div class="nv-canales" role="group">
        <button type="button" class="btn btn-fino${nvCanal==='email' ? ' is-on' : ''}" aria-pressed="${nvCanal==='email'}" onclick="nvSetCanal('email')"><i class="ti ti-mail"></i> Email <b>${calc.conEmail.length}</b></button>
        <button type="button" class="btn btn-fino${nvCanal==='wa' ? ' is-on' : ''}" aria-pressed="${nvCanal==='wa'}" onclick="nvSetCanal('wa')"><i class="ti ti-brand-whatsapp"></i> WhatsApp <b>${calc.conWa.length}</b></button>
      </div>
      ${nvCanal === 'email' ? nvEnvioEmailHtml(c, calc) : nvEnvioWaHtml(c, calc)}
    </section>
  </div>`;
}

// ── Acciones del editor ──────────────────────────────────────────────────
function nvSegmento(id){
  const c = nvC(); c.seg.tipo = id; c.excluidos = [];
  if(id === 'elegir' && !(c.incluidos || []).length){ nvToca(); renderNovedades(); nvElegirModal(); return; }
  nvToca(); renderNovedades();
}
function nvSetCp(v){ const c = nvC(); c.seg.cp = v; c.excluidos = []; nvToca(); renderNovedades(); }
async function nvElegirTema(id){
  const c = nvC();
  const hayTexto = nvTieneContenido(Object.assign({}, c, {enviados: {}})) && c.tema !== id && (c.titular || c.asunto);
  if(hayTexto && !(await confirmModal(gl({es:'Se cambiará el texto por el de este tema. ¿Continuar?', ca:'Es canviarà el text pel d\'aquest tema. Continuar?', en:'The text will be replaced with this topic\'s. Continue?'})))) return;
  nvAplicarTema(c, id);
  nvToca(); renderNovedades();
}
function nvOfertaOn(on){ const c = nvC(); c.oferta.on = !!on; nvToca(); renderNovedades(); }
function nvCtaTipo(v){ const c = nvC(); c.cta.tipo = v; c.cta.texto = ''; nvToca(); renderNovedades(); }
function nvInsertar(token){
  const ta = document.getElementById('nv-cuerpo'); if(!ta) return;
  const a = ta.selectionStart, b = ta.selectionEnd;
  ta.value = ta.value.slice(0, a) + token + ta.value.slice(b);
  ta.focus(); ta.setSelectionRange(a + token.length, a + token.length);
  nvSet('cuerpo', ta.value); nvAutoAlto(ta);
}
function nvSetCanal(c){ nvCanal = c; renderNovedades(); }
function nvPrevSet(m){ nvPrevModo = m; renderNovedades(); }
function nvSetModoEmail(m){ nvModoEmail = m; renderNovedades(); }
function nvSetLote(n){ nvLote = parseInt(n) || 50; renderNovedades(); }

// ── Vista previa ─────────────────────────────────────────────────────────
function nvClienteMuestra(){
  const calc = nvCalc || nvCalcular(nvC());
  return calc.conEmail[0] || calc.destinatarios[0] || {name: gl({es:'María García', ca:'Maria Garcia', en:'Maria Garcia'})};
}
function nvRefrescarPrev(inmediato){
  clearTimeout(nvPrevTimer);
  const pintar = () => {
    const marco = document.getElementById('nv-prev-marco');
    if(!marco) return;
    const c = nvC(), cli = nvClienteMuestra();
    const anonimo = nvModoEmail === 'bloque';
    const asu = document.getElementById('nv-prev-asunto');
    if(nvPrevModo === 'whatsapp'){
      if(asu) asu.textContent = '';
      const txt = nvWaTexto(c, cli);
      const html = escapeHtml(txt).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>');
      marco.className = 'nv-prev-marco is-wa';
      marco.innerHTML = `<div class="nv-wa"><div class="nv-wa-burbuja">${nvLinkificar(html, '#0B6B58')}<span class="nv-wa-hora">${escapeHtml(new Date().toLocaleTimeString(localeActual(), {hour:'2-digit', minute:'2-digit'}))} ✓✓</span></div></div>`;
      return;
    }
    if(asu) asu.innerHTML = `<b>${escapeHtml(nvNegocio() || 'Negocio')}</b> · ${escapeHtml(nvSustituir(c.asunto, cli, anonimo) || gl({es:'(sin asunto)', ca:'(sense assumpte)', en:'(no subject)'}))}`;
    marco.className = 'nv-prev-marco is-email' + (nvPrevModo === 'movil' ? ' is-movil' : '');
    let f = marco.querySelector('iframe');
    if(!f){
      marco.innerHTML = `<iframe title="${escapeHtml(gl({es:'Vista previa del email', ca:'Vista prèvia de l\'email', en:'Email preview'}))}" sandbox="allow-same-origin" scrolling="no"></iframe>`;
      f = marco.querySelector('iframe');
      f.addEventListener('load', () => { try{ f.style.height = (f.contentDocument.documentElement.scrollHeight + 4) + 'px'; }catch(e){} });
    }
    f.srcdoc = nvEmailHtml(c, cli, {anonimo});
  };
  if(inmediato) pintar(); else nvPrevTimer = setTimeout(pintar, 220);
}

/* ============================================================
   ENVIAR
   ============================================================ */
function nvLotes(lista, tam){
  const r = [];
  for(let i = 0; i < lista.length; i += tam) r.push(lista.slice(i, i + tam));
  return r;
}
function nvMarcar(ids, canal, quitar){
  const c = nvC();
  if(!c.enviados) c.enviados = {};
  const ahora = new Date().toISOString();
  ids.forEach(id => {
    const e = c.enviados[id] || (c.enviados[id] = {});
    if(quitar) delete e[canal]; else e[canal] = ahora;
    if(!Object.keys(e).length) delete c.enviados[id];
  });
  if(!quitar && c.estado !== 'enviada'){ c.estado = 'enviada'; c.enviadaEn = ahora; }
  // Una vez enviada, lo que se mandó queda como está en el historial.
  if(!quitar){ c.audiencia = {tipo: c.seg.tipo, cp: c.seg.cp, n: (nvCalc ? nvCalc.destinatarios.length : ids.length)}; }
  nvGuardarYa();
}
function nvRefrescarEnvio(){
  const el = document.getElementById('nv-envio-cuerpo');
  if(!el) { renderNovedades(); return; }
  const c = nvC(), calc = nvCalc = nvCalcular(c);
  el.innerHTML = nvCanal === 'email' ? nvEnvioEmailInner(c, calc) : nvEnvioWaInner(c, calc);
}
function nvEnvioEmailHtml(c, calc){ return `<div id="nv-envio-cuerpo">${nvEnvioEmailInner(c, calc)}</div>`; }
function nvEnvioWaHtml(c, calc){ return `<div id="nv-envio-cuerpo">${nvEnvioWaInner(c, calc)}</div>`; }

const nvEstadoCh = (ok, txt) => `<span class="pm-et${ok ? ' is-ok' : ''}">${ok ? '<i class="ti ti-check"></i> ' : ''}${escapeHtml(txt)}</span>`;

function nvEnvioEmailInner(c, calc){
  if(!calc.conEmail.length){
    return `<div class="empty es-vacio"><i class="ti ti-mail-off"></i>${escapeHtml(gl({es:'Ninguno de estos clientes tiene un email válido. Se añade en su ficha, en Clientes.', ca:'Cap d\'aquests clients té un email vàlid. S\'afegeix a la seva fitxa, a Clients.', en:'None of these customers has a valid email. Add it on their card, in Customers.'}))}</div>`;
  }
  const modo = (id, ic, tit, sub) => `
    <button type="button" class="nv-modo${nvModoEmail === id ? ' is-on' : ''}" aria-pressed="${nvModoEmail === id}" onclick="nvSetModoEmail('${id}')">
      <i class="ti ${ic}"></i><span><b>${escapeHtml(tit)}</b><small>${escapeHtml(sub)}</small></span></button>`;
  const modos = `<div class="nv-modos">
    ${modo('bloque', 'ti-mail-fast', gl({es:'Con diseño, en bloque', ca:'Amb disseny, en bloc', en:'Designed, in bulk'}), gl({es:'Un solo correo con todos en copia oculta. El mejor aspecto.', ca:'Un sol correu amb tots en còpia oculta. El millor aspecte.', en:'One email with everyone in hidden copy. Best look.'}))}
    ${modo('uno', 'ti-user', gl({es:'Uno a uno, con su nombre', ca:'Un a un, amb el seu nom', en:'One by one, by name'}), gl({es:'Un correo por cliente, en texto sencillo y llamándole por su nombre.', ca:'Un correu per client, en text senzill i anomenant-lo pel seu nom.', en:'One email per customer, in plain text, using their name.'}))}
  </div>`;

  if(nvModoEmail === 'uno'){
    return modos + `
    <ul class="nv-lista">${calc.conEmail.map(x => {
      const e = (c.enviados || {})[x.id] || {};
      return `<li class="nv-fila"><div class="nv-fila-txt"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.email)}</small></div>
        ${e.em ? nvEstadoCh(true, gl({es:'Enviado', ca:'Enviat', en:'Sent'})) : ''}
        <button type="button" class="btn btn-sm btn-fino${e.em ? '' : ' is-on'}" onclick="nvCorreoUno(${x.id})"><i class="ti ti-mail"></i> ${escapeHtml(e.em ? gl({es:'Otra vez', ca:'Un altre cop', en:'Again'}) : gl({es:'Abrir correo', ca:'Obrir correu', en:'Open email'}))}</button></li>`;
    }).join('')}</ul>
    <p class="pr-ayuda">${escapeHtml(gl({es:'Se abre tu programa de correo con el mensaje escrito para esa persona. Este modo no admite diseño: mailto solo lleva texto.', ca:'S\'obre el teu programa de correu amb el missatge escrit per a aquesta persona. Aquest mode no admet disseny: mailto només porta text.', en:'Your mail app opens with the message written for that person. This mode cannot carry the design: mailto is text only.'}))}</p>`;
  }

  const lotes = nvLotes(calc.conEmail, nvLote);
  const filas = lotes.map((lote, i) => {
    const hechos = lote.filter(x => ((c.enviados || {})[x.id] || {}).em).length;
    const todo = hechos === lote.length;
    return `<li class="nv-lote${todo ? ' is-hecho' : ''}">
      <div class="nv-fila-txt"><b>${escapeHtml(gl({es:`Lote ${i + 1} de ${lotes.length}`, ca:`Lot ${i + 1} de ${lotes.length}`, en:`Batch ${i + 1} of ${lotes.length}`}))}</b><small>${escapeHtml(gl({es:`${lote.length} destinatarios`, ca:`${lote.length} destinataris`, en:`${lote.length} recipients`}))}</small></div>
      <div class="nv-lote-bt">
        <button type="button" class="btn btn-sm btn-fino${todo ? '' : ' is-on'}" onclick="nvAbrirCorreo('gmail',${i})"><i class="ti ti-brand-gmail"></i> Gmail</button>
        <button type="button" class="btn btn-sm btn-fino" onclick="nvAbrirCorreo('outlook',${i})"><i class="ti ti-brand-windows"></i> Outlook</button>
        <button type="button" class="btn btn-sm btn-fino" onclick="nvDescargarEml(${i})" title="${escapeHtml(gl({es:'Borrador con diseño para Outlook de escritorio, Apple Mail o Thunderbird', ca:'Esborrany amb disseny per a Outlook d\'escriptori, Apple Mail o Thunderbird', en:'Designed draft for desktop Outlook, Apple Mail or Thunderbird'}))}"><i class="ti ti-download"></i> .eml</button>
        <button type="button" class="btn btn-sm btn-fino${todo ? ' is-on' : ''}" onclick="nvMarcarLote(${i})" aria-pressed="${todo}"><i class="ti ti-${todo ? 'circle-check' : 'circle'}"></i> ${escapeHtml(todo ? gl({es:'Enviado', ca:'Enviat', en:'Sent'}) : gl({es:'Marcar enviado', ca:'Marcar enviat', en:'Mark as sent'}))}</button>
      </div></li>`;
  }).join('');
  return modos + `
    <ol class="nv-pasos">
      <li>${escapeHtml(gl({es:'Pulsa el botón de tu correo: se abre un mensaje nuevo con los destinatarios en copia oculta y el diseño ya copiado.', ca:'Prem el botó del teu correu: s\'obre un missatge nou amb els destinataris en còpia oculta i el disseny ja copiat.', en:'Press your email button: a new message opens with the recipients in hidden copy and the design already copied.'}))}</li>
      <li>${escapeHtml(gl({es:'Pega en el cuerpo del mensaje (Ctrl+V, o ⌘V en Mac) y envía desde tu cuenta.', ca:'Enganxa al cos del missatge (Ctrl+V, o ⌘V a Mac) i envia des del teu compte.', en:'Paste into the body of the message (Ctrl+V, or ⌘V on Mac) and send from your account.'}))}</li>
      <li>${escapeHtml(gl({es:'Vuelve aquí y marca el lote como enviado.', ca:'Torna aquí i marca el lot com a enviat.', en:'Come back here and mark the batch as sent.'}))}</li>
    </ol>
    <div class="nv-lote-cfg"><label for="nv-lote">${escapeHtml(gl({es:'Destinatarios por correo', ca:'Destinataris per correu', en:'Recipients per email'}))}</label>
      <select id="nv-lote" onchange="nvSetLote(this.value)">${NV_LOTES.map(n => `<option value="${n}" ${nvLote === n ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <span class="pr-ayuda">${escapeHtml(gl({es:'Gmail gratuito deja unos 500 envíos al día.', ca:'Gmail gratuït deixa uns 500 enviaments al dia.', en:'Free Gmail allows about 500 sends a day.'}))}</span></div>
    <ul class="nv-lista">${filas}</ul>
    <div class="nv-extras">
      <button type="button" class="btn btn-sm btn-fino" onclick="nvPrueba('email')"><i class="ti ti-flask"></i> ${escapeHtml(gl({es:'Enviarme una prueba', ca:'Enviar-me una prova', en:'Send myself a test'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="nvCopiarDiseno()"><i class="ti ti-copy"></i> ${escapeHtml(gl({es:'Copiar el diseño', ca:'Copiar el disseny', en:'Copy the design'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="nvDescargarHtml()"><i class="ti ti-file-code"></i> ${escapeHtml(gl({es:'Descargar HTML', ca:'Descarregar HTML', en:'Download HTML'}))}</button>
    </div>
    <p class="pr-ayuda"><i class="ti ti-info-circle"></i> ${escapeHtml(gl({es:'El correo sale desde TU dirección (la de tu negocio): así llega mejor a la bandeja de entrada y no te cuesta nada. «.eml» abre un borrador ya maquetado en Outlook de escritorio, Apple Mail o Thunderbird; «HTML» sirve para Mailchimp, Brevo y similares.', ca:'El correu surt des de LA TEVA adreça (la del teu negoci): així arriba millor a la safata d\'entrada i no et costa res. «.eml» obre un esborrany ja maquetat a Outlook d\'escriptori, Apple Mail o Thunderbird; «HTML» serveix per a Mailchimp, Brevo i similars.', en:'The email leaves from YOUR address (your business\'s): it lands better in the inbox and costs nothing. “.eml” opens a ready-designed draft in desktop Outlook, Apple Mail or Thunderbird; “HTML” works for Mailchimp, Brevo and similar.'}))}</p>`;
}

function nvEnvioWaInner(c, calc){
  if(!calc.conWa.length){
    return `<div class="empty es-vacio"><i class="ti ti-brand-whatsapp"></i>${escapeHtml(gl({es:'Ninguno de estos clientes tiene un móvil válido (WhatsApp no abre los fijos). Se añade en su ficha, en Clientes.', ca:'Cap d\'aquests clients té un mòbil vàlid (WhatsApp no obre els fixos). S\'afegeix a la seva fitxa, a Clients.', en:'None of these customers has a valid mobile (WhatsApp cannot open landlines). Add it on their card, in Customers.'}))}</div>`;
  }
  const hechos = calc.conWa.filter(x => ((c.enviados || {})[x.id] || {}).wa).length;
  const pct = Math.round(hechos / calc.conWa.length * 100);
  return `
    <div class="nv-progreso"><div class="nv-progreso-txt"><b>${hechos}</b> ${escapeHtml(gl({es:`de ${calc.conWa.length} enviados`, ca:`de ${calc.conWa.length} enviats`, en:`of ${calc.conWa.length} sent`}))}</div><div class="nv-barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div>
    <div class="nv-extras">
      <button type="button" class="btn btn-sm btn-fino is-on" onclick="nvWaSiguiente()" ${hechos === calc.conWa.length ? 'disabled' : ''}><i class="ti ti-player-track-next"></i> ${escapeHtml(gl({es:'Siguiente pendiente', ca:'Següent pendent', en:'Next pending'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="nvPrueba('wa')"><i class="ti ti-flask"></i> ${escapeHtml(gl({es:'Enviarme una prueba', ca:'Enviar-me una prova', en:'Send myself a test'}))}</button>
      <button type="button" class="btn btn-sm btn-fino" onclick="nvWaCopiar()"><i class="ti ti-copy"></i> ${escapeHtml(gl({es:'Copiar el mensaje', ca:'Copiar el missatge', en:'Copy the message'}))}</button>
      ${hechos ? `<button type="button" class="btn btn-sm btn-fino" onclick="nvWaReiniciar()"><i class="ti ti-refresh"></i> ${escapeHtml(gl({es:'Empezar de nuevo', ca:'Començar de nou', en:'Start over'}))}</button>` : ''}
    </div>
    <ul class="nv-lista">${calc.conWa.map(x => {
      const e = (c.enviados || {})[x.id] || {};
      return `<li class="nv-fila"><div class="nv-fila-txt"><b>${escapeHtml(x.name)}</b><small>${escapeHtml(x.phone)}</small></div>
        ${e.wa ? nvEstadoCh(true, gl({es:'Abierto', ca:'Obert', en:'Opened'})) : ''}
        <button type="button" class="btn btn-sm btn-fino${e.wa ? '' : ' is-on'}" onclick="nvAbrirWa(${x.id})"><i class="ti ti-brand-whatsapp"></i> ${escapeHtml(e.wa ? gl({es:'Otra vez', ca:'Un altre cop', en:'Again'}) : 'WhatsApp')}</button>
        ${e.wa ? `<button type="button" class="btn btn-sm btn-fino mn-btn" data-tip="${escapeHtml(gl({es:'Marcar como pendiente', ca:'Marcar com a pendent', en:'Mark as pending'}))}" aria-label="${escapeHtml(gl({es:'Marcar como pendiente', ca:'Marcar com a pendent', en:'Mark as pending'}))}" onclick="nvWaDesmarcar(${x.id})"><i class="ti ti-arrow-back-up"></i></button>` : ''}</li>`;
    }).join('')}</ul>
    <p class="pr-ayuda"><i class="ti ti-info-circle"></i> ${escapeHtml(gl({es:'Cada botón abre WhatsApp con el mensaje escrito para ese cliente, con su nombre; tú solo pulsas enviar. Si prefieres mandarlo a muchos a la vez, copia el mensaje y pégalo en una lista de difusión de WhatsApp Business (solo lo recibe quien te tenga guardado).', ca:'Cada botó obre WhatsApp amb el missatge escrit per a aquest client, amb el seu nom; tu només prems enviar. Si prefereixes enviar-lo a molts alhora, copia el missatge i enganxa\'l en una llista de difusió de WhatsApp Business (només el rep qui et tingui desat).', en:'Each button opens WhatsApp with the message written for that customer, with their name; you only press send. To reach many at once, copy the message and paste it into a WhatsApp Business broadcast list (only people who saved your number receive it).'}))}</p>`;
}

// ── Antes de enviar ──────────────────────────────────────────────────────
async function nvConfirmarAvisos(){
  const av = nvRevisar(nvC());
  if(!av.length) return true;
  return await confirmModal(av.join('\n') + '\n\n' + gl({es:'¿Enviar de todos modos?', ca:'Enviar de totes maneres?', en:'Send anyway?'}));
}

// ── WhatsApp ─────────────────────────────────────────────────────────────
async function nvAbrirWa(id){
  const cli = DB.clients.find(x => x.id === id);
  if(!cli) return;
  const tel = whatsappDeTelefono(cli.phone);
  if(!tel){ showToast(gl({es:'Este teléfono no parece un móvil.', ca:'Aquest telèfon no sembla un mòbil.', en:'This number does not look like a mobile.'})); return; }
  const c = nvC();
  if(!(await nvConfirmarAvisos())) return;
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(nvWaTexto(c, cli)), '_blank', 'noopener');
  nvMarcar([id], 'wa');
  nvRefrescarEnvio();
}
function nvWaSiguiente(){
  const c = nvC(), calc = nvCalcular(c);
  const sig = calc.conWa.find(x => !((c.enviados || {})[x.id] || {}).wa);
  if(!sig){ showToast(gl({es:'No queda ninguno pendiente.', ca:'No en queda cap de pendent.', en:'None left to send.'})); return; }
  nvAbrirWa(sig.id);
}
function nvWaDesmarcar(id){ nvMarcar([id], 'wa', true); nvRefrescarEnvio(); }
async function nvWaReiniciar(){
  if(!(await confirmModal(gl({es:'Se borra la marca de «enviado» por WhatsApp de todos. ¿Empezar de nuevo?', ca:'S\'esborra la marca d\'«enviat» per WhatsApp de tots. Començar de nou?', en:'This clears the WhatsApp “sent” mark for everyone. Start over?'})))) return;
  const c = nvC(); nvMarcar(Object.keys(c.enviados || {}).map(Number), 'wa', true); nvRefrescarEnvio();
}
function nvWaCopiar(){
  const c = nvC();
  copiarTextoPlano(nvWaTexto(c, null, true)).then(ok => showToast(ok ? gl({es:'Mensaje copiado', ca:'Missatge copiat', en:'Message copied'}) : gl({es:'No se pudo copiar', ca:'No s\'ha pogut copiar', en:'Could not copy'})));
}

// ── Email ────────────────────────────────────────────────────────────────
function nvCopiarHtmlAlPortapapeles(html, texto){
  const respaldo = () => {
    try{
      const d = document.createElement('div');
      d.contentEditable = 'true'; d.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff';
      d.innerHTML = html; document.body.appendChild(d);
      const r = document.createRange(); r.selectNodeContents(d);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      let ok = false; try{ ok = document.execCommand('copy'); }catch(e){}
      s.removeAllRanges(); d.remove();
      return ok;
    }catch(e){ return false; }
  };
  try{
    if(navigator.clipboard && window.ClipboardItem){
      return navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], {type: 'text/html'}),
        'text/plain': new Blob([texto], {type: 'text/plain'})
      })]).then(() => true).catch(() => respaldo());
    }
  }catch(e){}
  return Promise.resolve(respaldo());
}
function nvCopiarDiseno(){
  const c = nvC();
  nvCopiarHtmlAlPortapapeles(nvEmailHtml(c, null, {anonimo: true}), nvEmailTexto(c, null, {anonimo: true}))
    .then(ok => showToast(ok ? gl({es:'Diseño copiado: pégalo en tu correo (Ctrl+V / ⌘V)', ca:'Disseny copiat: enganxa\'l al teu correu (Ctrl+V / ⌘V)', en:'Design copied: paste it into your email (Ctrl+V / ⌘V)'}) : gl({es:'No se pudo copiar. Usa «Descargar HTML».', ca:'No s\'ha pogut copiar. Fes servir «Descarregar HTML».', en:'Could not copy. Use “Download HTML”.'})));
}
function nvUrlCorreo(prov, emails, asunto, para){
  const enc = encodeURIComponent;
  if(prov === 'gmail') return 'https://mail.google.com/mail/?view=cm&fs=1' + (para ? '&to=' + enc(para) : '') + (emails.length ? '&bcc=' + enc(emails.join(',')) : '') + '&su=' + enc(asunto);
  if(prov === 'outlook') return 'https://outlook.office.com/mail/deeplink/compose?' + (para ? 'to=' + enc(para) + '&' : '') + (emails.length ? 'bcc=' + enc(emails.join(';')) + '&' : '') + 'subject=' + enc(asunto);
  return 'mailto:' + (para ? enc(para) : '') + '?' + (emails.length ? 'bcc=' + enc(emails.join(',')) + '&' : '') + 'subject=' + enc(asunto);
}
async function nvAbrirCorreo(prov, idx){
  const c = nvC();
  const calc = nvCalcular(c);
  const lote = nvLotes(calc.conEmail, nvLote)[idx];
  if(!lote) return;
  if(!(await nvConfirmarAvisos())) return;
  const asunto = nvSustituir(c.asunto, null, true).trim();
  // Se empieza a copiar y a abrir en el MISMO gesto: si se esperase a la copia,
  // el navegador consideraría la ventana nueva como un anuncio y la bloquearía.
  nvCopiarHtmlAlPortapapeles(nvEmailHtml(c, null, {anonimo: true}), nvEmailTexto(c, null, {anonimo: true}))
    .then(ok => showToast(ok ? gl({es:'Diseño copiado: pégalo en el mensaje que se ha abierto (Ctrl+V / ⌘V)', ca:'Disseny copiat: enganxa\'l al missatge que s\'ha obert (Ctrl+V / ⌘V)', en:'Design copied: paste it into the message that opened (Ctrl+V / ⌘V)'}) : gl({es:'No se pudo copiar el diseño: usa «Descargar .eml» o «Descargar HTML».', ca:'No s\'ha pogut copiar el disseny: fes servir «Descarregar .eml» o «Descarregar HTML».', en:'Could not copy the design: use “.eml” or “Download HTML”.'})));
  window.open(nvUrlCorreo(prov, lote.map(x => x.email.trim()), asunto), '_blank', 'noopener');
}
function nvMarcarLote(idx){
  const c = nvC(), calc = nvCalcular(c);
  const lote = nvLotes(calc.conEmail, nvLote)[idx];
  if(!lote) return;
  const todo = lote.every(x => ((c.enviados || {})[x.id] || {}).em);
  nvMarcar(lote.map(x => x.id), 'em', todo);
  nvRefrescarEnvio();
}
function nvCorreoUno(id){
  const cli = DB.clients.find(x => x.id === id);
  const c = nvC();
  if(!cli || !nvEmailValido(cli.email)) return;
  nvConfirmarAvisos().then(ok => {
    if(!ok) return;
    window.location.href = 'mailto:' + encodeURIComponent(cli.email.trim()) + '?subject=' + encodeURIComponent(nvSustituir(c.asunto, cli, false).trim()) + '&body=' + encodeURIComponent(nvEmailTexto(c, cli, {anonimo: false}));
    nvMarcar([id], 'em');
    nvRefrescarEnvio();
  });
}
function nvPrueba(canal){
  const c = nvC(), b = DB.business || {};
  if(canal === 'wa'){
    const tel = whatsappDeTelefono(b.phone);
    if(!tel){ showToast(gl({es:'Pon tu móvil en Mi Negocio para recibir la prueba.', ca:'Posa el teu mòbil a Mi Negocio per rebre la prova.', en:'Add your mobile in My Business to get the test.'})); return; }
    window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(nvWaTexto(c, {name: nvNegocio()})), '_blank', 'noopener');
    return;
  }
  if(!nvEmailValido(b.email)){ showToast(gl({es:'Pon tu email en Mi Negocio para recibir la prueba.', ca:'Posa el teu email a Mi Negocio per rebre la prova.', en:'Add your email in My Business to get the test.'})); return; }
  nvCopiarHtmlAlPortapapeles(nvEmailHtml(c, {name: nvNegocio()}, {anonimo: true}), nvEmailTexto(c, null, {anonimo: true}))
    .then(ok => showToast(ok ? gl({es:'Diseño copiado: pégalo en el mensaje (Ctrl+V / ⌘V)', ca:'Disseny copiat: enganxa\'l al missatge (Ctrl+V / ⌘V)', en:'Design copied: paste it into the message (Ctrl+V / ⌘V)'}) : ''));
  window.open(nvUrlCorreo('gmail', [], '[' + gl({es:'PRUEBA', ca:'PROVA', en:'TEST'}) + '] ' + nvSustituir(c.asunto, null, true), b.email.trim()), '_blank', 'noopener');
}

// ── Descargas ────────────────────────────────────────────────────────────
function nvDescargar(nombre, contenido, mime){
  const blob = new Blob([contenido], {type: mime});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function nvNombreArchivo(c){
  const base = (c.asunto || c.titular || 'novedad').replace(/\{[^}]+\}/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'novedad';
  return base.toLowerCase();
}
function nvDescargarHtml(){
  const c = nvC();
  nvDescargar(nvNombreArchivo(c) + '.html', nvEmailHtml(c, null, {anonimo: true}), 'text/html;charset=utf-8');
}
// Base 64 de un texto UTF-8, en líneas de 76 (lo que pide el correo).
function nvB64(txt){
  const bytes = new TextEncoder().encode(txt);
  let bin = ''; bytes.forEach(b => { bin += String.fromCharCode(b); });
  return (btoa(bin).match(/.{1,76}/g) || []).join('\r\n');
}
// Un borrador .eml: Outlook de escritorio, Apple Mail y Thunderbird lo abren
// como mensaje NUEVO sin enviar (X-Unsent), ya maquetado, con el logo dentro
// del propio correo y los destinatarios en copia oculta.
function nvConstruirEml(c, emails){
  const b = DB.business || {};
  const asunto = nvSustituir(c.asunto, null, true).trim();
  const logo = c.logo && b.logo ? /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(b.logo) : null;
  const html = nvEmailHtml(c, null, {anonimo: true, logoSrc: logo ? 'cid:logo@gastrogoan' : ''});
  const texto = nvEmailTexto(c, null, {anonimo: true});
  const L = [];
  L.push('X-Unsent: 1');
  L.push('Subject: =?UTF-8?B?' + btoa(String.fromCharCode(...new TextEncoder().encode(asunto))) + '?=');
  if(nvEmailValido(b.email)) L.push('To: ' + b.email.trim());
  if(emails.length) L.push('Bcc: ' + emails.join(', '));
  L.push('MIME-Version: 1.0');
  L.push('Content-Type: multipart/related; boundary="gg-rel"; type="multipart/alternative"', '');
  L.push('--gg-rel', 'Content-Type: multipart/alternative; boundary="gg-alt"', '');
  L.push('--gg-alt', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64', '', nvB64(texto));
  L.push('--gg-alt', 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64', '', nvB64(html));
  L.push('--gg-alt--');
  if(logo){
    L.push('--gg-rel', 'Content-Type: ' + logo[1] + '; name="logo"', 'Content-Transfer-Encoding: base64', 'Content-ID: <logo@gastrogoan>', 'Content-Disposition: inline; filename="logo"', '', (logo[2].match(/.{1,76}/g) || []).join('\r\n'));
  }
  L.push('--gg-rel--', '');
  return L.join('\r\n');
}
async function nvDescargarEml(idx){
  const c = nvC(), calc = nvCalcular(c);
  const lotes = nvLotes(calc.conEmail, nvLote);
  const lote = lotes[idx];
  if(!lote) return;
  if(!(await nvConfirmarAvisos())) return;
  nvDescargar(nvNombreArchivo(c) + (lotes.length > 1 ? '-lote' + (idx + 1) : '') + '.eml', nvConstruirEml(c, lote.map(x => x.email.trim())), 'message/rfc822');
  showToast(gl({es:'Borrador descargado: ábrelo con tu programa de correo.', ca:'Esborrany descarregat: obre\'l amb el teu programa de correu.', en:'Draft downloaded: open it with your mail app.'}));
}

// ── Ventanas: destinatarios, elegir, bajas ───────────────────────────────
function nvFilaCliente(x, marcado, fn){
  const tags = [nvEmailValido(x.email) ? '<i class="ti ti-mail" title="Email"></i>' : '', whatsappDeTelefono(x.phone) ? '<i class="ti ti-brand-whatsapp" title="WhatsApp"></i>' : ''].join('');
  return `<label class="nv-cli" data-n="${escapeHtml(pmSinTildes(x.name))}">
    <span class="dp-check"><input type="checkbox" ${marcado ? 'checked' : ''} onchange="${fn}(${x.id}, this.checked)"><span class="dp-check-caja"><i class="ti ti-check"></i></span></span>
    <span class="nv-cli-txt"><b>${escapeHtml(x.name)}</b><small>${escapeHtml([x.email, x.phone].filter(Boolean).join(' · ') || '—')}</small></span>
    <span class="nv-cli-tags">${tags}</span></label>`;
}
function nvFiltrarLista(q){
  const n = pmSinTildes(q.trim());
  document.querySelectorAll('#modal-box .nv-cli').forEach(el => { el.hidden = !!n && !el.dataset.n.includes(n); });
}
function nvBuscadorHtml(){
  return `<input type="search" class="search-input" style="max-width:none;margin-bottom:10px" placeholder="${escapeHtml(gl({es:'Buscar por nombre…', ca:'Cercar pel nom…', en:'Search by name…'}))}" aria-label="${escapeHtml(gl({es:'Buscar por nombre', ca:'Cercar pel nom', en:'Search by name'}))}" oninput="nvFiltrarLista(this.value)">`;
}
function nvDestinatariosModal(){
  const c = nvC(), calc = nvCalcular(c);
  const excl = new Set(c.excluidos || []);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-list-check"></i> ${escapeHtml(gl({es:'Destinatarios', ca:'Destinataris', en:'Recipients'}))}</h3><button class="modal-close" onclick="closeModal();renderNovedades()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    <p class="pr-ayuda">${escapeHtml(gl({es:'Desmarca a quien NO quieras que la reciba.', ca:'Desmarca qui NO vulguis que la rebi.', en:'Untick anyone who should NOT get it.'}))}</p>
    ${nvBuscadorHtml()}
    <div class="nv-cli-lista">${calc.elegidos.map(x => nvFilaCliente(x, !excl.has(x.id), 'nvExcluir')).join('')}</div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();renderNovedades()">${escapeHtml(gl({es:'Listo', ca:'Fet', en:'Done'}))}</button></div>`);
}
function nvExcluir(id, marcado){
  const c = nvC(); const s = new Set(c.excluidos || []);
  if(marcado) s.delete(id); else s.add(id);
  c.excluidos = [...s]; nvToca();
}
function nvElegirModal(){
  const c = nvC(), calc = nvCalcular(c);
  const inc = new Set(c.incluidos || []);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-checkbox"></i> ${escapeHtml(gl({es:'Elegir clientes', ca:'Triar clients', en:'Choose customers'}))}</h3><button class="modal-close" onclick="closeModal();renderNovedades()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    ${nvBuscadorHtml()}
    <div class="nv-cli-lista">${calc.todos.map(x => nvFilaCliente(x, inc.has(x.id), 'nvIncluir')).join('')}</div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();renderNovedades()">${escapeHtml(gl({es:'Listo', ca:'Fet', en:'Done'}))}</button></div>`);
}
function nvIncluir(id, marcado){
  const c = nvC(); const s = new Set(c.incluidos || []);
  if(marcado) s.add(id); else s.delete(id);
  c.incluidos = [...s]; nvToca();
}
// «BAJA»: quien responde pidiendo no recibir más. Se retira su consentimiento
// (la misma casilla de su ficha) y desaparece de todas las listas.
function nvBajaModal(){
  const con = DB.clients.filter(x => x.marketingConsent !== false);
  openModal(`
    <div class="modal-header"><h3><i class="ti ti-user-minus"></i> ${escapeHtml(gl({es:'Registrar una baja', ca:'Registrar una baixa', en:'Record an opt-out'}))}</h3><button class="modal-close" onclick="closeModal();renderNovedades()" aria-label="${escapeHtml(t('common.close'))}">&times;</button></div>
    <p class="pr-ayuda">${escapeHtml(gl({es:'Cuando alguien responda BAJA, búscalo aquí: dejará de recibir novedades.', ca:'Quan algú respongui BAIXA, cerca\'l aquí: deixarà de rebre novetats.', en:'When someone replies UNSUBSCRIBE, find them here: they will stop receiving news.'}))}</p>
    ${nvBuscadorHtml()}
    <div class="nv-cli-lista">${con.map(x => `<div class="nv-cli" data-n="${escapeHtml(pmSinTildes(x.name))}"><span class="nv-cli-txt"><b>${escapeHtml(x.name)}</b><small>${escapeHtml([x.email, x.phone].filter(Boolean).join(' · ') || '—')}</small></span><button type="button" class="btn btn-sm btn-fino" onclick="nvDarDeBaja(${x.id}, this)"><i class="ti ti-user-minus"></i> ${escapeHtml(gl({es:'Dar de baja', ca:'Donar de baixa', en:'Opt out'}))}</button></div>`).join('') || `<div class="empty es-vacio">${escapeHtml(t('common.noResults'))}</div>`}</div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();renderNovedades()">${escapeHtml(gl({es:'Listo', ca:'Fet', en:'Done'}))}</button></div>`);
}
function nvDarDeBaja(id, btn){
  const x = DB.clients.find(c => c.id === id);
  if(!x) return;
  x.marketingConsent = false;
  saveDB();
  const fila = btn && btn.closest('.nv-cli'); if(fila) fila.remove();
  showToast(gl({es:`${x.name}: no recibirá más novedades.`, ca:`${x.name}: no rebrà més novetats.`, en:`${x.name} will receive no more news.`}));
}

// ── Historial ────────────────────────────────────────────────────────────
function nvHistorialHtml(){
  const lista = nvLista().filter(nvTieneContenido).sort((a, b) => (b.actualizadaEn || '').localeCompare(a.actualizadaEn || ''));
  if(!lista.length) return `<div class="empty es-vacio"><i class="ti ti-send"></i>${escapeHtml(gl({es:'Todavía no has preparado ninguna novedad.', ca:'Encara no has preparat cap novetat.', en:'You have not prepared any message yet.'}))}<div><button type="button" class="btn btn-fino is-on" onclick="nvIr('nueva')"><i class="ti ti-plus"></i> ${escapeHtml(gl({es:'Escribir la primera', ca:'Escriure la primera', en:'Write the first'}))}</button></div></div>`;
  return `<div class="pr-grid pm-grid">${lista.map(c => {
    const env = Object.values(c.enviados || {});
    const nWa = env.filter(e => e.wa).length, nEm = env.filter(e => e.em).length;
    const seg = nvSegmentosDef().find(s => s.id === ((c.audiencia || c.seg) || {}).tipo);
    const menu = ggMenuAcciones([
      {icono:'ti-copy', texto: gl({es:'Usar como base de una nueva', ca:'Usar com a base d\'una nova', en:'Use as the base of a new one'}), fn:`nvDuplicar(${c.id})`, owner:true},
      {icono:'ti-trash', texto: t('common.delete'), fn:`nvEliminar(${c.id})`, peligro:true, owner:true},
    ]);
    return `<article class="pm-card">
      <div class="pm-card-cab"><button type="button" class="pm-card-tit" onclick="nvAbrir(${c.id})">${escapeHtml(c.asunto || c.titular || gl({es:'(sin título)', ca:'(sense títol)', en:'(untitled)'}))}</button>${menu}</div>
      <div class="pm-ets">
        ${c.estado === 'enviada' ? nvEstadoCh(true, gl({es:'Enviada', ca:'Enviada', en:'Sent'})) : `<span class="pm-et">${escapeHtml(gl({es:'Borrador', ca:'Esborrany', en:'Draft'}))}</span>`}
        <span class="pm-et"><i class="ti ${nvTema(c.tema).ic}"></i> ${escapeHtml(gl(nvTema(c.tema).et))}</span>
        ${seg ? `<span class="pm-et"><i class="ti ${seg.ic}"></i> ${escapeHtml(seg.et)}</span>` : ''}
      </div>
      <div class="pm-card-pie"><span class="pm-hecho">${escapeHtml(new Date(c.enviadaEn || c.actualizadaEn).toLocaleDateString(localeActual(), {day:'numeric', month:'short', year:'numeric'}))}</span>
        <span class="pm-resp">${nEm ? `<i class="ti ti-mail"></i> ${nEm}` : ''} ${nWa ? `<i class="ti ti-brand-whatsapp"></i> ${nWa}` : ''}</span></div>
    </article>`;
  }).join('')}</div>`;
}
function nvAbrir(id){
  const c = nvLista().find(x => x.id === id);
  if(!c) return;
  nvMem = c; nvVista = 'nueva'; renderNovedades();
  window.scrollTo({top: 0});
}
function nvDuplicar(id){
  const o = nvLista().find(x => x.id === id);
  if(!o) return;
  const n = nvCampanaVacia(JSON.parse(JSON.stringify(Object.assign({}, o, {id: undefined, enviados: {}, estado: 'borrador', enviadaEn: undefined, audiencia: undefined, creadaEn: undefined}))));
  nvMem = n; nvToca(); nvVista = 'nueva'; renderNovedades();
}
async function nvEliminar(id){
  if(!(await confirmModal(gl({es:'¿Eliminar esta novedad del historial?', ca:'Eliminar aquesta novetat de l\'historial?', en:'Delete this message from the history?'})))) return;
  DB.novedades = nvLista().filter(x => x.id !== id);
  if(nvMem && nvMem.id === id) nvMem = null;
  saveDB(); renderNovedades();
}

// ── Entradas desde otras pantallas ───────────────────────────────────────
function nvAbrirNueva(prefill){
  nvMem = nvCampanaVacia(prefill);
  nvVista = 'nueva';
  promoTab = 'novedades';
  if(!document.querySelector('#view-promocion.active')) navigate('promocion'); else renderPromocion();
}
function novedadesConSegmento(seg){
  nvAbrirNueva({seg: {tipo: seg, cp: ''}});
}
// Desde una acción con descuento: «Anunciar a clientes».
function promoAnunciar(id){
  const p = DB.promos.find(x => x.id === id);
  if(!p) return;
  const dto = p.menuItemName ? `${p.menuItemName} −${p.discountPct}%` : p.titulo;
  const cond = [];
  if(p.horaInicio && p.horaFin) cond.push(gl({es:`De ${p.horaInicio} a ${p.horaFin} h`, ca:`De ${p.horaInicio} a ${p.horaFin} h`, en:`${p.horaInicio} to ${p.horaFin}`}));
  if(p.recurrence === 'weekly') cond.push(gl({es:'Cada ' + new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-ES', {weekday:'long'}), ca:'Cada ' + new Date(p.fecha + 'T00:00:00').toLocaleDateString('ca-ES', {weekday:'long'}), en:'Every ' + new Date(p.fecha + 'T00:00:00').toLocaleDateString('en-GB', {weekday:'long'})}));
  else cond.push(pmFechaLarga(p.fecha, true));
  const c = nvCampanaVacia();
  nvAplicarTema(c, 'promo');
  c.titular = p.titulo;
  c.asunto = gl({es:'Una oferta para ti en {negocio}: ', ca:'Una oferta per a tu a {negocio}: ', en:'An offer for you at {negocio}: '}) + p.titulo;
  c.cuerpo = 'Hola {nombre},\n\n' + (p.descripcion ? p.descripcion + '\n\n' : '') + gl({es:'Enséñanos este mensaje al pedir y te aplicamos el descuento.', ca:'Ensenya\'ns aquest missatge en demanar i t\'apliquem el descompte.', en:'Show us this message when you order and we will apply the discount.'});
  c.oferta = {on: true, titulo: dto, detalle: cond.join(' · '), codigo: '', hasta: p.recurrence === 'weekly' ? (p.hasta || '') : ''};
  nvMem = c; nvToca();
  nvVista = 'nueva'; promoTab = 'novedades';
  if(!document.querySelector('#view-promocion.active')) navigate('promocion'); else renderPromocion();
}
