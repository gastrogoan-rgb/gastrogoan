/* ============== Tour virtual de bienvenida ==============
   Cada paso, además del texto, indica a qué pantalla ir (folder/view) y
   qué elemento resaltar (target), para que el tour navegue de verdad por
   la app y muestre en vivo lo que está explicando. Orden: introducción,
   Cocina, Sala y Gestión. */
const TOUR_STEPS = [
  {icon:'ti-confetti', titleKey:'tour.s1.title', descKey:'tour.s1.desc'},
  {icon:'ti-layout-grid', titleKey:'tour.s2.title', descKey:'tour.s2.desc', target:'.folder-grid'},

  // ---- Cocina ----
  {icon:'ti-tools-kitchen-2', titleKey:'tour.s13.title', descKey:'tour.s13.desc', folder:'cocina', view:'carta'},
  {icon:'ti-download', titleKey:'tour.s14.title', descKey:'tour.s14.desc', folder:'cocina', view:'carta'},
  {icon:'ti-list-details', titleKey:'tour.s15.title', descKey:'tour.s15.desc', folder:'cocina', view:'carta'},
  {icon:'ti-building-factory-2', titleKey:'tour.s19.title', descKey:'tour.s19.desc', folder:'cocina', view:'megalista'},
  {icon:'ti-calculator', titleKey:'tour.s20.title', descKey:'tour.s20.desc', folder:'cocina', view:'escandallo'},
  {icon:'ti-package', titleKey:'tour.s21.title', descKey:'tour.s21.desc', folder:'cocina', view:'stock'},
  {icon:'ti-clipboard-list', titleKey:'tour.s22.title', descKey:'tour.s22.desc', folder:'cocina', view:'horarios'},
  {icon:'ti-users', titleKey:'tour.s28.title', descKey:'tour.s28.desc', folder:'cocina', view:'horarios'},
  {icon:'ti-bell-ringing', titleKey:'tour.s8.title', descKey:'tour.s8.desc', folder:'cocina', view:'comandascocina'},

  // ---- Sala ----
  {icon:'ti-device-desktop', titleKey:'tour.s3.title', descKey:'tour.s3.desc', folder:'sala', view:'tpv'},
  {icon:'ti-calendar-event', titleKey:'tour.s4.title', descKey:'tour.s4.desc', folder:'sala', view:'tpv'},
  {icon:'ti-receipt-2', titleKey:'tour.s5.title', descKey:'tour.s5.desc', folder:'sala', view:'tpv'},
  {icon:'ti-adjustments', titleKey:'tour.s6.title', descKey:'tour.s6.desc', folder:'sala', view:'tpv'},
  {icon:'ti-chef-hat', titleKey:'tour.s7.title', descKey:'tour.s7.desc', folder:'sala', view:'tpv'},
  {icon:'ti-cash', titleKey:'tour.s9.title', descKey:'tour.s9.desc', folder:'sala', view:'tpv'},
  {icon:'ti-shopping-bag', titleKey:'tour.s10.title', descKey:'tour.s10.desc', folder:'sala', view:'tpv'},
  {icon:'ti-world', titleKey:'tour.s11.title', descKey:'tour.s11.desc', folder:'sala', view:'tpv'},
  {icon:'ti-cash-register', titleKey:'tour.s12.title', descKey:'tour.s12.desc', folder:'sala', view:'tpv'},
  {icon:'ti-calendar-plus', titleKey:'tour.s16.title', descKey:'tour.s16.desc', folder:'sala', view:'reservas'},
  {icon:'ti-users', titleKey:'tour.s17.title', descKey:'tour.s17.desc', folder:'sala', view:'reservas'},
  {icon:'ti-address-book', titleKey:'tour.s18.title', descKey:'tour.s18.desc', folder:'sala', view:'clientes'},
  {icon:'ti-speakerphone', titleKey:'tour.s23.title', descKey:'tour.s23.desc', folder:'sala', view:'promocion'},

  // ---- Gestión ----
  {icon:'ti-layout-dashboard', titleKey:'tour.s24.title', descKey:'tour.s24.desc', folder:'gestion', view:'dashboard', gestion:true},
  {icon:'ti-coin', titleKey:'tour.s25.title', descKey:'tour.s25.desc', folder:'gestion', view:'economia', gestion:true},
  {icon:'ti-building-store', titleKey:'tour.s26.title', descKey:'tour.s26.desc', folder:'gestion', view:'minegocio', gestion:true},
  {icon:'ti-cloud', titleKey:'tour.s27.title', descKey:'tour.s27.desc', folder:'gestion', view:'minegocio', gestion:true},

  // ---- Otras ayudas ----
  {icon:'ti-messages', titleKey:'tour.s29.title', descKey:'tour.s29.desc', target:'#chat-fab'},
  {icon:'ti-help-hexagon', titleKey:'tour.s30.title', descKey:'tour.s30.desc', target:'#help-fab'},
  {icon:'ti-book', titleKey:'tour.s31.title', descKey:'tour.s31.desc', folder:'gestion', view:'manual', gestion:true, target:'.manual-nav'},
];
let tourStepIndex = 0;

function promptAppTour(){
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-map-2"></i> ${escapeHtml(t('tour.prompt.title'))}</h3>
    </div>
    <p>${escapeHtml(t('tour.prompt.desc'))}</p>
    <div class="modal-footer">
      <button class="btn" onclick="dismissTour()">${escapeHtml(t('tour.prompt.no'))}</button>
      <button class="btn btn-primary" onclick="startAppTour()"><i class="ti ti-player-play"></i> ${escapeHtml(t('tour.prompt.yes'))}</button>
    </div>
  `);
}
function dismissTour(){
  DB.business.tourSeen = true;
  saveDB();
  closeModal();
}
function startAppTour(){
  closeModal();
  tourStepIndex = 0;
  renderTourStep();
}

/* Limpia el resalte (borde animado) de cualquier elemento del paso anterior. */
function tourClearHighlight(){
  document.querySelectorAll('.tour-highlight').forEach(el => el.classList.remove('tour-highlight'));
}

/* Lleva la app a la pantalla del paso actual y resalta el elemento que
   corresponde, igual que si el usuario hubiera navegado a mano. */
function tourGoToStep(step){
  tourClearHighlight();
  if(step.gestion){
    ownerUnlocked = true;
    const lockBtn = document.getElementById('lock-btn');
    if(lockBtn) lockBtn.style.display = '';
  }
  if(step.folder) currentFolder = step.folder;
  if(step.view) navigate(step.view);
  else if(step.folder) navigate('folder');
  else navigate('home');

  const sel = step.target || (step.view ? '#view-' + step.view : (step.folder ? '.folder-card.folder-' + step.folder : null));
  if(!sel) return;
  const els = document.querySelectorAll(sel);
  els.forEach(el => el.classList.add('tour-highlight'));
  if(els[0]) els[0].scrollIntoView({behavior:'smooth', block:'center'});
}

function renderTourStep(){
  const step = TOUR_STEPS[tourStepIndex];
  const isLast = tourStepIndex === TOUR_STEPS.length - 1;
  tourGoToStep(step);
  const dots = TOUR_STEPS.map((_,i)=>`<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 3px;background:${i===tourStepIndex?'var(--brand-orange)':'var(--border)'}"></span>`).join('');
  let b = document.getElementById('tour-bubble');
  if(!b){
    b = document.createElement('div');
    b.id = 'tour-bubble';
    b.className = 'tour-bubble';
    document.body.appendChild(b);
  }
  b.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <h3><i class="ti ${step.icon}"></i> ${escapeHtml(t(step.titleKey))}</h3>
      <button class="modal-close" onclick="finishTour()">&times;</button>
    </div>
    <p>${escapeHtml(t(step.descKey))}</p>
    <div style="text-align:center;margin-bottom:10px">${dots}</div>
    <div class="modal-footer" style="margin-top:0">
      ${tourStepIndex > 0 ? `<button class="btn btn-sm" onclick="tourPrev()"><i class="ti ti-arrow-left"></i> ${escapeHtml(t('common.prev'))}</button>` : `<button class="btn btn-sm" onclick="finishTour()">${escapeHtml(t('common.skip'))}</button>`}
      ${isLast
        ? `<button class="btn btn-primary btn-sm" onclick="finishTour()"><i class="ti ti-check"></i> ${escapeHtml(t('common.finish'))}</button>`
        : `<button class="btn btn-primary btn-sm" onclick="tourNext()">${escapeHtml(t('common.next'))} <i class="ti ti-arrow-right"></i></button>`}
    </div>
  `;
}
function tourNext(){ tourStepIndex = Math.min(tourStepIndex+1, TOUR_STEPS.length-1); renderTourStep(); }
function tourPrev(){ tourStepIndex = Math.max(tourStepIndex-1, 0); renderTourStep(); }
function finishTour(){
  DB.business.tourSeen = true;
  saveDB();
  tourClearHighlight();
  const b = document.getElementById('tour-bubble');
  if(b) b.remove();
  ownerUnlocked = false;
  const lockBtn = document.getElementById('lock-btn');
  if(lockBtn) lockBtn.style.display = 'none';
  goHome();
}

/* ============== Centro de ayuda / Asistente ============== */
const HELP_FAQS = [
  { keywords:{es:['abrir mesa','abrir una mesa','mesa nueva','nueva mesa','tipo de cliente','cliente de paso'],
      ca:['obrir taula','obrir una taula','taula nova','nova taula','tipus de client','client de pas'],
      en:['open table','open a table','new table','customer type','walk-in']},
    answers:{
      es:'Para abrir una mesa, pulsa sobre ella en el <strong>TPV</strong>. Te preguntará si el cliente es <strong>"de paso"</strong> (indicas el número de comensales) o <strong>"tiene reserva"</strong> (eliges una reserva de hoy y se rellena todo automáticamente). Luego pulsa "Aceptar" para crear la comanda.',
      ca:'Per obrir una taula, prem-hi al <strong>TPV</strong>. Et preguntarà si el client és <strong>"de pas"</strong> (indiques el nombre de comensals) o <strong>"té reserva"</strong> (tries una reserva d\'avui i s\'omple tot automàticament). Després prem "Acceptar" per crear la comanda.',
      en:'To open a table, tap it in the <strong>POS</strong>. It will ask whether the customer is a <strong>"walk-in"</strong> (you enter the number of guests) or <strong>"has a reservation"</strong> (you pick today\'s reservation and everything fills in automatically). Then tap "Accept" to create the order.' } },
  { keywords:{es:['tiene reserva','asignar reserva al abrir','vincular reserva con mesa','reserva a la mesa'],
      ca:['te reserva','assignar reserva en obrir','vincular reserva amb taula','reserva a la taula'],
      en:['has a reservation','assign reservation when opening','link reservation to table','reservation to the table']},
    answers:{
      es:'Si al abrir una mesa eliges <strong>"Tiene reserva"</strong>, selecciona la reserva de la lista (solo aparecen las reservas de hoy aún no llegadas). Se rellenan automáticamente el cliente y el número de personas, la reserva se marca como "Llegó" y, si no tenía mesa asignada, se le asigna esta.',
      ca:'Si en obrir una taula tries <strong>"Té reserva"</strong>, selecciona la reserva de la llista (només apareixen les reserves d\'avui encara no arribades). S\'omplen automàticament el client i el nombre de persones, la reserva es marca com "Ha arribat" i, si no tenia taula assignada, se li assigna aquesta.',
      en:'If when opening a table you choose <strong>"Has a reservation"</strong>, select the reservation from the list (only today\'s not-yet-arrived reservations appear). The customer and party size fill in automatically, the reservation is marked as "Arrived" and, if it had no table assigned, this one is assigned.' } },
  { keywords:{es:['añadir plato','agregar plato','añadir un plato','poner un plato','pedir un plato'],
      ca:['afegir plat','agregar plat','afegir un plat','posar un plat','demanar un plat'],
      en:['add dish','add a dish','add an item','order a dish','add item to order']},
    answers:{
      es:'Dentro de la comanda, toca un plato de la carta (organizada por secciones) para añadirlo. Si lo tocas varias veces se suma la cantidad. Usa los botones <strong>+</strong> y <strong>−</strong> para ajustar unidades, y la papelera para eliminar una línea.',
      ca:'Dins de la comanda, toca un plat de la carta (organitzada per seccions) per afegir-lo. Si el toques diverses vegades se suma la quantitat. Usa els botons <strong>+</strong> i <strong>−</strong> per ajustar unitats, i la paperera per eliminar una línia.',
      en:'Inside the order, tap a dish from the menu (organized by sections) to add it. Tapping it again increases the quantity. Use the <strong>+</strong> and <strong>−</strong> buttons to adjust units, and the trash icon to remove a line.' } },
  { keywords:{es:['extra','extra queso','modificador','modificadores','añadir extra','extra al plato'],
      ca:['extra','extra formatge','modificador','modificadors','afegir extra','extra al plat'],
      en:['extra','extra cheese','modifier','modifiers','add extra','extra on a dish']},
    answers:{
      es:'Si un plato tiene extras configurados (ej. "Extra queso"), al añadirlo se abre una ventana donde marcas los extras que quieras y se suman a su precio. Para configurar extras nuevos en un plato, entra en <strong>Carta</strong>, abre el plato y pulsa el botón <strong>"Extras"</strong>.',
      ca:'Si un plat té extres configurats (ex. "Extra formatge"), en afegir-lo s\'obre una finestra on marques els extres que vulguis i se sumen al seu preu. Per configurar extres nous en un plat, entra a <strong>Carta</strong>, obre el plat i prem el botó <strong>"Extres"</strong>.',
      en:'If a dish has extras configured (e.g. "Extra cheese"), adding it opens a window where you check the extras you want and they\'re added to its price. To configure new extras on a dish, go to <strong>Menu</strong>, open the dish and tap the <strong>"Extras"</strong> button.' } },
  { keywords:{es:['nota','notas','sin cebolla','comentario del plato','comentarios'],
      ca:['nota','notes','sense ceba','comentari del plat','comentaris'],
      en:['note','notes','no onion','dish comment','comments']},
    answers:{
      es:'Al añadir un plato con extras se abre una ventana donde puedes escribir una nota libre (ej. "sin cebolla"). Esa nota aparece debajo del plato en la comanda y también se ve en la pantalla de cocina.',
      ca:'En afegir un plat amb extres s\'obre una finestra on pots escriure una nota lliure (ex. "sense ceba"). Aquesta nota apareix sota el plat a la comanda i també es veu a la pantalla de cuina.',
      en:'When adding a dish with extras, a window opens where you can write a free note (e.g. "no onion"). That note appears below the dish in the order and is also shown on the kitchen screen.' } },
  { keywords:{es:['editar nota','cambiar nota','modificar nota','corregir nota'],
      ca:['editar nota','canviar nota','modificar nota','corregir nota'],
      en:['edit note','change note','modify note','update note']},
    answers:{
      es:'En la comanda, cada línea de plato tiene un icono de nota <i class="ti ti-note"></i>. Pulsa ese icono para abrir, editar o borrar la nota de ese plato en cualquier momento.',
      ca:'A la comanda, cada línia de plat té una icona de nota <i class="ti ti-note"></i>. Prem aquesta icona per obrir, editar o esborrar la nota d\'aquest plat en qualsevol moment.',
      en:'In the order, each dish line has a note icon <i class="ti ti-note"></i>. Tap that icon to open, edit or clear the note for that dish at any time.' } },
  { keywords:{es:['tanda','tandas','marchar','marchar a cocina','enviar a cocina','primeros y segundos'],
      ca:['torn','torns','enviar a cuina','enviar la comanda','primers i segons'],
      en:['course','courses','send to kitchen','fire course','starters and mains']},
    answers:{
      es:'Puedes agrupar los platos en <strong>tandas</strong> (primeros, segundos, postres...) para controlar el ritmo del servicio. Cuando una tanda esté lista para prepararse, pulsa <strong>"Marchar a cocina"</strong> y aparecerá al instante en Comandas Cocina.',
      ca:'Pots agrupar els plats en <strong>torns</strong> (primers, segons, postres...) per controlar el ritme del servei. Quan un torn estigui llest per preparar-se, prem <strong>"Enviar a cuina"</strong> i apareixerà a l\'instant a Comandes Cuina.',
      en:'You can group dishes into <strong>courses</strong> (starters, mains, desserts...) to control the pace of service. When a course is ready to be prepared, tap <strong>"Send to kitchen"</strong> and it will instantly appear on the Kitchen Orders screen.' } },
  { keywords:{es:['comandas cocina','pantalla cocina','en preparacion','listo para servir','ver comandas'],
      ca:['comandes cuina','pantalla cuina','en preparacio','llest per servir','veure comandes'],
      en:['kitchen orders','kitchen screen','preparing','ready to serve','view orders']},
    answers:{
      es:'En <strong>Comandas Cocina</strong> se ven en tiempo real todos los platos marchados desde sala, agrupados por mesa y tanda. Cocina puede marcar cada plato como <strong>"En preparación"</strong> y <strong>"Listo"</strong>, y sala lo verá al instante para servirlo.',
      ca:'A <strong>Comandes Cuina</strong> es veuen en temps real tots els plats enviats des de sala, agrupats per taula i torn. Cuina pot marcar cada plat com <strong>"En preparació"</strong> i <strong>"Llest"</strong>, i sala ho veurà a l\'instant per servir-lo.',
      en:'On the <strong>Kitchen Orders</strong> screen you see in real time all dishes sent from the dining room, grouped by table and course. The kitchen can mark each dish as <strong>"Preparing"</strong> and <strong>"Ready"</strong>, and the dining room will see it instantly to serve it.' } },
  { keywords:{es:['cobrar','cobro','dividir cuenta','metodo de pago','cerrar comanda','cerrar mesa','pagar'],
      ca:['cobrar','cobrament','dividir compte','metode de pagament','tancar comanda','tancar taula','pagar'],
      en:['charge','checkout','split the bill','payment method','close order','close table','pay']},
    answers:{
      es:'Cuando el cliente termina, abre la comanda y pulsa <strong>"Cobrar"</strong>. Puedes dividir la cuenta, aplicar descuentos y elegir el método de pago (efectivo, tarjeta...). Al cerrar, la venta se registra automáticamente en Gestión Económica y el Panel de Control.',
      ca:'Quan el client acaba, obre la comanda i prem <strong>"Cobrar"</strong>. Pots dividir el compte, aplicar descomptes i triar el mètode de pagament (efectiu, targeta...). En tancar, la venda es registra automàticament a Gestió Econòmica i al Tauler de Control.',
      en:'When the customer is done, open the order and tap <strong>"Charge"</strong>. You can split the bill, apply discounts and choose the payment method (cash, card...). Once closed, the sale is automatically recorded in Financial Management and the Dashboard.' } },
  { keywords:{es:['take away','para llevar','recogida','recoger pedido'],
      ca:['take away','per emportar','recollida','recollir comanda'],
      en:['take away','takeaway','pickup','collect order']},
    answers:{
      es:'En el TPV pulsa el botón <strong>"Take Away"</strong> para crear un pedido para recoger en el local. Funciona igual que una mesa: añades platos, extras y notas, y cobras al finalizar.',
      ca:'Al TPV prem el botó <strong>"Take Away"</strong> per crear una comanda per recollir al local. Funciona igual que una taula: afegeixes plats, extres i notes, i cobres al final.',
      en:'In the POS tap the <strong>"Take Away"</strong> button to create an order for in-store pickup. It works just like a table: add dishes, extras and notes, and charge at the end.' } },
  { keywords:{es:['delivery','a domicilio','reparto','envio a domicilio'],
      ca:['delivery','a domicili','repartiment','enviament a domicili'],
      en:['delivery','home delivery','order to be delivered']},
    answers:{
      es:'En el TPV pulsa el botón <strong>"Delivery"</strong> para crear un pedido a domicilio. Añade platos, extras y notas igual que en una mesa, y cóbralo cuando corresponda.',
      ca:'Al TPV prem el botó <strong>"Delivery"</strong> per crear una comanda a domicili. Afegeix plats, extres i notes igual que en una taula, i cobra-la quan correspongui.',
      en:'In the POS tap the <strong>"Delivery"</strong> button to create a delivery order. Add dishes, extras and notes just like a table, and charge it when appropriate.' } },
  { keywords:{es:['pedido online','pedidos online','aceptar pedido','rechazar pedido','pedidos pendientes'],
      ca:['comanda en linia','comandes en linia','acceptar comanda','rebutjar comanda','comandes pendents'],
      en:['online order','online orders','accept order','reject order','pending orders']},
    answers:{
      es:'Si tienes pedidos online activados, los nuevos pedidos llegan a una bandeja de <strong>pendientes</strong> dentro del TPV. Desde ahí puedes <strong>aceptarlos</strong> (se convierten en Take Away/Delivery) o <strong>rechazarlos</strong> si no puedes atenderlos.',
      ca:'Si tens comandes en línia activades, les noves comandes arriben a una safata de <strong>pendents</strong> dins del TPV. Des d\'allà les pots <strong>acceptar</strong> (es converteixen en Take Away/Delivery) o <strong>rebutjar</strong> si no les pots atendre.',
      en:'If you have online orders enabled, new orders arrive in a <strong>pending</strong> tray inside the POS. From there you can <strong>accept</strong> them (they become a Take Away/Delivery order) or <strong>reject</strong> them if you can\'t fulfil them.' } },
  { keywords:{es:['cierre de caja','arqueo','cuadre de caja','cerrar caja','efectivo esperado'],
      ca:['tancament de caixa','arqueig','quadre de caixa','tancar caixa','efectiu esperat'],
      en:['cash closure','cash count','close the register','expected cash','cash register closure']},
    answers:{
      es:'Al terminar el turno, abre el <strong>Cierre de caja</strong> (dentro de TPV). La app calcula el efectivo esperado según las ventas en efectivo del día; introduces el efectivo contado y guarda el resultado. Todo el histórico queda guardado.',
      ca:'En acabar el torn, obre el <strong>Tancament de caixa</strong> (dins del TPV). L\'app calcula l\'efectiu esperat segons les vendes en efectiu del dia; introdueixes l\'efectiu comptat i desa el resultat. Tot l\'històric queda desat.',
      en:'At the end of the shift, open the <strong>Cash closure</strong> (inside the POS). The app calculates the expected cash based on the day\'s cash sales; enter the counted cash and save the result. The full history is saved.' } },
  { keywords:{es:['carta','crear carta','seccion de la carta','añadir plato a la carta','varias cartas'],
      ca:['carta','crear carta','seccio de la carta','afegir plat a la carta','diverses cartes'],
      en:['menu','create menu','menu section','add dish to menu','multiple menus']},
    answers:{
      es:'En <strong>Carta</strong> puedes crear varias cartas (comida, bebida, brunch...) organizadas en secciones. Dentro de cada sección añade platos con su nombre y precio. La carta activa es la que se usa en el TPV y en pedidos online.',
      ca:'A <strong>Carta</strong> pots crear diverses cartes (menjar, begudes, brunch...) organitzades en seccions. Dins de cada secció afegeix plats amb el seu nom i preu. La carta activa és la que s\'usa al TPV i en comandes en línia.',
      en:'In <strong>Menu</strong> you can create several menus (food, drinks, brunch...) organized into sections. Inside each section, add dishes with their name and price. The active menu is the one used in the POS and online orders.' } },
  { keywords:{es:['agotado','no disponible','marcar plato','plato sin stock'],
      ca:['esgotat','no disponible','marcar plat','plat sense estoc'],
      en:['sold out','not available','mark dish','out of stock dish']},
    answers:{
      es:'En <strong>Carta</strong>, abre el plato y marca el interruptor de <strong>"Disponible"</strong>. Si lo desmarcas (agotado), ese plato no podrá pedirse desde el TPV ni desde los pedidos online hasta que vuelvas a activarlo.',
      ca:'A <strong>Carta</strong>, obre el plat i marca l\'interruptor de <strong>"Disponible"</strong>. Si el desmarques (esgotat), aquest plat no es podrà demanar des del TPV ni des de les comandes en línia fins que el tornis a activar.',
      en:'In <strong>Menu</strong>, open the dish and toggle the <strong>"Available"</strong> switch. If you turn it off (sold out), that dish can\'t be ordered from the POS or online orders until you enable it again.' } },
  { keywords:{es:['configurar extra','extras en carta','precio extra','añadir extra al plato','doble carne'],
      ca:['configurar extra','extres a la carta','preu extra','afegir extra al plat','doble carn'],
      en:['configure extra','extras in menu','extra price','add extra to dish','double meat']},
    answers:{
      es:'Para configurar extras de un plato, ve a <strong>Carta</strong>, abre ese plato y pulsa el botón <strong>"Extras"</strong>. Ahí puedes añadir opciones con nombre y precio (ej. "Extra queso" +1€, "Doble carne" +2€).',
      ca:'Per configurar extres d\'un plat, vés a <strong>Carta</strong>, obre aquest plat i prem el botó <strong>"Extres"</strong>. Allà pots afegir opcions amb nom i preu (ex. "Extra formatge" +1€, "Doble carn" +2€).',
      en:'To configure extras for a dish, go to <strong>Menu</strong>, open that dish and tap the <strong>"Extras"</strong> button. There you can add options with a name and price (e.g. "Extra cheese" +1€, "Double meat" +2€).' } },
  { keywords:{es:['importar plato','importar del escandallo','escandallo a carta','traer plato del escandallo'],
      ca:['importar plat','importar de l\'escandall','escandall a carta','portar plat de l\'escandall'],
      en:['import dish','import from costing','costing to menu','bring dish from costing']},
    answers:{
      es:'Para no escribir los platos dos veces, en <strong>Carta</strong> puedes importarlos directamente desde el <strong>Escandallo</strong> (ya con su coste calculado). Solo tienes que indicar el precio de venta.',
      ca:'Per no escriure els plats dues vegades, a <strong>Carta</strong> els pots importar directament des de l\'<strong>Escandall</strong> (ja amb el seu cost calculat). Només has d\'indicar el preu de venda.',
      en:'To avoid entering dishes twice, in <strong>Menu</strong> you can import them directly from <strong>Costing</strong> (already with their cost calculated). You just need to set the selling price.' } },
  { keywords:{es:['menu','menus','menu del dia','combo','grupo de opciones','menu de precio fijo'],
      ca:['menu','menus','menu del dia','combo','grup d\'opcions','menu de preu fix'],
      en:['combo menu','combo menus','daily menu','set menu','option group','fixed price menu']},
    answers:{
      es:'En <strong>Menús</strong> puedes crear menús de precio fijo (ej. "Menú del día") agrupando platos en grupos de opciones (ej. "Primero a elegir entre 3"). El cliente elige una opción de cada grupo y se cobra el precio único del menú.',
      ca:'A <strong>Menús</strong> pots crear menús de preu fix (ex. "Menú del dia") agrupant plats en grups d\'opcions (ex. "Primer a triar entre 3"). El client tria una opció de cada grup i es cobra el preu únic del menú.',
      en:'In <strong>Combo Menus</strong> you can create fixed-price menus (e.g. "Daily menu") by grouping dishes into option groups (e.g. "Starter — choose 1 of 3"). The customer picks one option from each group and is charged the menu\'s single price.' } },
  { keywords:{es:['crear reserva','nueva reserva','hacer una reserva','reservar mesa','añadir reserva'],
      ca:['crear reserva','nova reserva','fer una reserva','reservar taula','afegir reserva'],
      en:['create reservation','new reservation','make a reservation','book a table','add reservation']},
    answers:{
      es:'En <strong>Reservas</strong>, pulsa "Nueva reserva" e indica fecha, hora, número de personas y elige un cliente de tu base de datos (o crea uno nuevo ahí mismo). Puedes añadir notas como alergias o peticiones especiales.',
      ca:'A <strong>Reserves</strong>, prem "Nova reserva" i indica data, hora, nombre de persones i tria un client de la teva base de dades (o crea\'n un de nou allà mateix). Pots afegir notes com al·lèrgies o peticions especials.',
      en:'In <strong>Reservations</strong>, tap "New reservation" and enter the date, time, party size and pick a customer from your database (or create a new one right there). You can add notes such as allergies or special requests.' } },
  { keywords:{es:['asignar mesa a reserva','mesa a la reserva','elegir mesa para reserva'],
      ca:['assignar taula a reserva','taula a la reserva','triar taula per a reserva'],
      en:['assign table to reservation','table for reservation','choose table for reservation']},
    answers:{
      es:'Desde la vista de día en <strong>Reservas</strong>, abre la reserva y asigna una mesa con antelación. Si no la asignas, se asignará automáticamente al abrir la mesa correspondiente en el TPV.',
      ca:'Des de la vista de dia a <strong>Reserves</strong>, obre la reserva i assigna una taula amb antelació. Si no l\'assignes, s\'assignarà automàticament en obrir la taula corresponent al TPV.',
      en:'From the day view in <strong>Reservations</strong>, open the reservation and assign a table in advance. If you don\'t assign one, it will be assigned automatically when opening the corresponding table in the POS.' } },
  { keywords:{es:['llegada','ha llegado','marcar llegada','llego el cliente','cliente llego'],
      ca:['arribada','ha arribat','marcar arribada','ha arribat el client','client arribat'],
      en:['arrival','has arrived','mark arrival','customer arrived','guest arrived']},
    answers:{
      es:'En la vista de día de <strong>Reservas</strong> hay una columna "Llegada" con un botón para marcar manualmente si el cliente ha llegado. Normalmente esto se marca solo, automáticamente, al abrir su mesa en el TPV con esa reserva.',
      ca:'A la vista de dia de <strong>Reserves</strong> hi ha una columna "Arribada" amb un botó per marcar manualment si el client ha arribat. Normalment això es marca sol, automàticament, en obrir la seva taula al TPV amb aquesta reserva.',
      en:'In the day view of <strong>Reservations</strong> there\'s an "Arrived" column with a button to manually mark whether the customer has arrived. This is normally marked automatically when opening their table in the POS with that reservation.' } },
  { keywords:{es:['añadir cliente','nuevo cliente','crear cliente','ficha de cliente','dar de alta cliente'],
      ca:['afegir client','nou client','crear client','fitxa de client','donar d\'alta client'],
      en:['add customer','new customer','create customer','customer profile','register customer']},
    answers:{
      es:'En <strong>Clientes</strong>, pulsa "Nuevo cliente" y rellena su nombre, teléfono, email, alergias y notas. También puedes crear un cliente nuevo directamente desde la pantalla de Reservas.',
      ca:'A <strong>Clients</strong>, prem "Nou client" i omple el seu nom, telèfon, email, al·lèrgies i notes. També pots crear un client nou directament des de la pantalla de Reserves.',
      en:'In <strong>Customers</strong>, tap "New customer" and fill in their name, phone, email, allergies and notes. You can also create a new customer directly from the Reservations screen.' } },
  { keywords:{es:['puntos','fidelizacion','puntos de fidelidad','programa de puntos'],
      ca:['punts','fidelitzacio','punts de fidelitat','programa de punts'],
      en:['points','loyalty','loyalty points','points program']},
    answers:{
      es:'Cada cliente tiene una ficha con sus <strong>puntos de fidelización</strong>. Puedes consultarlos y editarlos desde su ficha en <strong>Clientes</strong>.',
      ca:'Cada client té una fitxa amb els seus <strong>punts de fidelització</strong>. Pots consultar-los i editar-los des de la seva fitxa a <strong>Clients</strong>.',
      en:'Each customer has a profile with their <strong>loyalty points</strong>. You can view and edit them from their profile in <strong>Customers</strong>.' } },
  { keywords:{es:['mega lista','ingrediente','proveedor','añadir ingrediente','lista de ingredientes'],
      ca:['mega llista','ingredient','proveidor','afegir ingredient','llista d\'ingredients'],
      en:['master list','ingredient','supplier','add ingredient','ingredients list']},
    answers:{
      es:'La <strong>Mega Lista</strong> centraliza todos tus ingredientes con su unidad y precio de compra, vinculados a tus proveedores. Es la base que usa el Escandallo para calcular el coste real de cada plato.',
      ca:'La <strong>Mega Llista</strong> centralitza tots els teus ingredients amb la seva unitat i preu de compra, vinculats als teus proveïdors. És la base que usa l\'Escandall per calcular el cost real de cada plat.',
      en:'The <strong>Master List</strong> centralizes all your ingredients with their unit and purchase price, linked to your suppliers. It\'s the foundation Costing uses to calculate the real cost of each dish.' } },
  { keywords:{es:['ficha tecnica','escandallo','coste del plato','margen','calcular coste'],
      ca:['fitxa tecnica','escandall','cost del plat','marge','calcular cost'],
      en:['technical sheet','costing','dish cost','margin','calculate cost']},
    answers:{
      es:'En <strong>Escandallo</strong> creas la ficha técnica de cada plato indicando los ingredientes y cantidades de la Mega Lista. La app calcula automáticamente el coste por ración y el margen.',
      ca:'A <strong>Escandall</strong> crees la fitxa tècnica de cada plat indicant els ingredients i quantitats de la Mega Llista. L\'app calcula automàticament el cost per ració i el marge.',
      en:'In <strong>Costing</strong> you create the technical sheet for each dish by specifying the ingredients and quantities from the Master List. The app automatically calculates the cost per portion and margin.' } },
  { keywords:{es:['stock','inventario','pedido a proveedor','stock minimo','existencias'],
      ca:['estoc','inventari','comanda a proveidor','estoc minim','existencies'],
      en:['stock','inventory','purchase order','minimum stock','supplies']},
    answers:{
      es:'En <strong>Stock</strong> controlas el inventario de tu almacén y defines niveles mínimos. En <strong>Pedidos</strong> generas pedidos a proveedores cuando un ingrediente esté por debajo de ese mínimo.',
      ca:'A <strong>Estoc</strong> controles l\'inventari del teu magatzem i defineixes nivells mínims. A <strong>Comandes</strong> generes comandes a proveïdors quan un ingredient estigui per sota d\'aquest mínim.',
      en:'In <strong>Stock</strong> you control your storeroom inventory and set minimum levels. In <strong>Orders</strong> you generate purchase orders to suppliers when an ingredient drops below that minimum.' } },
  { keywords:{es:['horario del personal','turnos','distribucion del trabajo','tareas del equipo','horario de trabajo'],
      ca:['horari del personal','torns','distribucio de la feina','tasques de l\'equip','horari de treball'],
      en:['staff schedule','shifts','work distribution','team tasks','work schedule']},
    answers:{
      es:'En <strong>Horario del Personal</strong> organizas los turnos de tu equipo, y en <strong>Distribución de la Tarea</strong> repartes las tareas diarias entre los empleados de cada turno.',
      ca:'A <strong>Horari del Personal</strong> organitzes els torns del teu equip, i a <strong>Distribució de la Feina</strong> reparteixes les tasques diàries entre els empleats de cada torn.',
      en:'In <strong>Staff Schedule</strong> you organize your team\'s shifts, and in <strong>Work Distribution</strong> you distribute daily tasks among employees in each shift.' } },
  { keywords:{es:['limpieza','plan de limpieza','appcc','protocolo de higiene'],
      ca:['neteja','pla de neteja','appcc','protocol d\'higiene'],
      en:['cleaning','cleaning plan','haccp','hygiene protocol']},
    answers:{
      es:'En <strong>Plan de Limpieza</strong> gestionas los checklists de limpieza e higiene (APPCC) para asegurar que todo queda en orden tras cada turno.',
      ca:'A <strong>Pla de Neteja</strong> gestiones els checklists de neteja i higiene (APPCC) per assegurar que tot queda en ordre després de cada torn.',
      en:'In <strong>Cleaning Plan</strong> you manage cleaning and hygiene checklists (HACCP) to ensure everything is in order after each shift.' } },
  { keywords:{es:['promocion','marketing','redes sociales','promociones'],
      ca:['promocio','marketing','xarxes socials','promocions'],
      en:['promotion','marketing','social media','promotions']},
    answers:{
      es:'En <strong>Promoción</strong> puedes preparar contenido y campañas para promocionar tu negocio: ofertas, novedades de carta o eventos especiales para compartir en tus redes.',
      ca:'A <strong>Promoció</strong> pots preparar contingut i campanyes per promocionar el teu negoci: ofertes, novetats de carta o esdeveniments especials per compartir a les teves xarxes.',
      en:'In <strong>Promotion</strong> you can prepare content and campaigns to promote your business: offers, menu news or special events to share on your social media.' } },
  { keywords:{es:['panel de control','dashboard','kpi','resumen del negocio','indicadores'],
      ca:['tauler de control','dashboard','kpi','resum del negoci','indicadors'],
      en:['dashboard','kpi','business overview','indicators']},
    answers:{
      es:'El <strong>Panel de Control</strong> muestra de un vistazo cómo va tu negocio: ventas del día, comparativas, resultado del mes, punto de equilibrio y alertas automáticas.',
      ca:'El <strong>Tauler de Control</strong> mostra d\'una ullada com va el teu negoci: vendes del dia, comparatives, resultat del mes, punt d\'equilibri i alertes automàtiques.',
      en:'The <strong>Dashboard</strong> shows at a glance how your business is doing: daily sales, comparisons, monthly result, break-even point and automatic alerts.' } },
  { keywords:{es:['gasto','ingreso','gestion economica','punto de equilibrio','resultado del mes','gastos e ingresos'],
      ca:['despesa','ingres','gestio economica','punt d\'equilibri','resultat del mes','despeses i ingressos'],
      en:['expense','income','financial management','break-even point','monthly result','expenses and income']},
    answers:{
      es:'En <strong>Gestión Económica</strong> registras gastos e ingresos. La app calcula automáticamente tu cuenta de resultados y tu punto de equilibrio (cuánto necesitas vender para cubrir costes).',
      ca:'A <strong>Gestió Econòmica</strong> registres despeses i ingressos. L\'app calcula automàticament el teu compte de resultats i el teu punt d\'equilibri (quant necessites vendre per cobrir costos).',
      en:'In <strong>Financial Management</strong> you record expenses and income. The app automatically calculates your profit and loss statement and break-even point (how much you need to sell to cover costs).' } },
  { keywords:{es:['pin','contraseña','bloquear','clave de acceso','cambiar pin'],
      ca:['pin','contrasenya','bloquejar','clau d\'acces','canviar pin'],
      en:['pin','password','lock','access code','change pin']},
    answers:{
      es:'La sección de Gestión está protegida por <strong>PIN</strong> (por defecto 1234, se cambia la primera vez que entras). Puedes cambiarlo desde <strong>Mi Negocio</strong>, y usar el botón "Bloquear" de la cabecera para cerrar el acceso.',
      ca:'La secció de Gestió està protegida per <strong>PIN</strong> (per defecte 1234, es canvia la primera vegada que entres). Pots canviar-lo des de <strong>El Meu Negoci</strong>, i usar el botó "Bloquejar" de la capçalera per tancar l\'accés.',
      en:'The Management section is protected by a <strong>PIN</strong> (default 1234, changed the first time you log in). You can change it from <strong>My Business</strong>, and use the "Lock" button in the header to close access.' } },
  { keywords:{es:['nube','firebase','sincronizar','copia de seguridad','conectar la nube','base de datos propia'],
      ca:['nuvol','firebase','sincronitzar','copia de seguretat','connectar el nuvol','base de dades propia'],
      en:['cloud','firebase','sync','backup','connect cloud','own database']},
    answers:{
      es:'En <strong>Mi Negocio</strong> conectas tu propia nube (Firebase) para sincronizar y respaldar automáticamente todos tus datos entre dispositivos. Es obligatorio configurarla la primera vez que usas la app.',
      ca:'A <strong>El Meu Negoci</strong> connectes el teu propi núvol (Firebase) per sincronitzar i fer còpia de seguretat automàtica de totes les teves dades entre dispositius. És obligatori configurar-lo la primera vegada que uses l\'app.',
      en:'In <strong>My Business</strong> you connect your own cloud (Firebase) to automatically sync and back up all your data across devices. It must be set up the first time you use the app.' } },
  { keywords:{es:['idioma','cambiar idioma','language','catalan','ingles','castellano'],
      ca:['idioma','canviar idioma','llengua','catala','angles','castella'],
      en:['language','change language','spanish','catalan','english']},
    answers:{
      es:'Puedes cambiar el idioma de la app desde el selector de idioma en la cabecera, o desde <strong>Mi Negocio</strong>. Está disponible en castellano, català y English.',
      ca:'Pots canviar l\'idioma de l\'app des del selector d\'idioma a la capçalera, o des de <strong>El Meu Negoci</strong>. Està disponible en castellà, català i English.',
      en:'You can change the app\'s language from the language selector in the header, or from <strong>My Business</strong>. It\'s available in Spanish, Catalan and English.' } },
  { keywords:{es:['licencia','codigo de activacion','activar licencia','clave de licencia'],
      ca:['llicencia','codi d\'activacio','activar llicencia','clau de llicencia'],
      en:['license','activation code','activate license','license key']},
    answers:{
      es:'La primera vez que abres la app debes introducir tu <strong>código de activación</strong> (licencia). Una vez activada, no necesitas volver a introducirla en ese dispositivo.',
      ca:'La primera vegada que obres l\'app has d\'introduir el teu <strong>codi d\'activació</strong> (llicència). Un cop activada, no l\'has de tornar a introduir en aquest dispositiu.',
      en:'The first time you open the app you must enter your <strong>activation code</strong> (license). Once activated, you don\'t need to enter it again on that device.' } },
  { keywords:{es:['tour','ver tour','repetir tour','tutorial','volver a ver el tour'],
      ca:['tour','veure tour','repetir tour','tutorial','tornar a veure el tour'],
      en:['tour','view tour','replay tour','tutorial','watch the tour again']},
    answers:{
      es:'Puedes repetir el tour guiado en cualquier momento desde <strong>Manual de Uso</strong> (en Gestión), pulsando el botón <strong>"Iniciar tour guiado"</strong>.',
      ca:'Pots repetir el tour guiat en qualsevol moment des de <strong>Manual d\'Ús</strong> (a Gestió), prement el botó <strong>"Iniciar tour guiat"</strong>.',
      en:'You can replay the guided tour anytime from the <strong>User Manual</strong> (in Management), by pressing the <strong>"Start guided tour"</strong> button.' } },
  { keywords:{es:['enlace publico','codigo qr','qr','web de reservas','pagina web','web publica'],
      ca:['enllac public','codi qr','qr','web de reserves','pagina web','web publica'],
      en:['public link','qr code','qr','reservations website','website','public website']},
    answers:{
      es:'Con la licencia activada, en <strong>Mi Negocio</strong> tienes tu <strong>enlace público</strong> y un <strong>código QR</strong> para que tus clientes reserven mesa o hagan pedidos online sin que tengas que programar nada.',
      ca:'Amb la llicència activada, a <strong>El Meu Negoci</strong> tens el teu <strong>enllaç públic</strong> i un <strong>codi QR</strong> perquè els teus clients reservin taula o facin comandes en línia sense que hagis de programar res.',
      en:'With the license activated, in <strong>My Business</strong> you have your <strong>public link</strong> and a <strong>QR code</strong> so your customers can book a table or place online orders without you having to program anything.' } },
  { keywords:{es:['aforo','plazas por turno','capacidad','limite de mesas'],
      ca:['aforament','places per torn','capacitat','limit de taules'],
      en:['capacity','seats per shift','venue capacity','table limit']},
    answers:{
      es:'En <strong>Mi Negocio</strong> indicas tu <strong>aforo</strong> (plazas por turno). En Reservas verás cuántas personas hay reservadas frente al aforo de cada turno, y la app avisa si se supera.',
      ca:'A <strong>El Meu Negoci</strong> indiques el teu <strong>aforament</strong> (places per torn). A Reserves veuràs quantes persones hi ha reservades respecte a l\'aforament de cada torn, i l\'app avisa si se supera.',
      en:'In <strong>My Business</strong> you set your <strong>capacity</strong> (seats per shift). In Reservations you\'ll see how many people are booked versus the capacity of each shift, and the app warns if it\'s exceeded.' } },
];
let helpChatStarted = false;
function applyHelpI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
}
function toggleHelpPanel(){
  const panel = document.getElementById('help-panel');
  const opening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if(opening && !helpChatStarted){
    helpChatStarted = true;
    appendHelpMessage(t('help.assistant.welcome'), 'bot');
    renderHelpSuggestions();
  }
}
function switchHelpTab(tab){
  document.getElementById('help-tab-btn-asistente').classList.toggle('active', tab==='asistente');
  document.getElementById('help-tab-btn-contacto').classList.toggle('active', tab==='contacto');
  document.getElementById('help-tab-asistente').classList.toggle('active', tab==='asistente');
  document.getElementById('help-tab-contacto').classList.toggle('active', tab==='contacto');
}
function renderHelpSuggestions(){
  const box = document.getElementById('help-suggestions');
  const sugs = [t('help.suggestion.1'), t('help.suggestion.2'), t('help.suggestion.3'), t('help.suggestion.4')];
  box.innerHTML = sugs.map(s => `<button class="help-suggestion" onclick="askHelpSuggestion(this)">${escapeHtml(s)}</button>`).join('');
}
function askHelpSuggestion(btn){
  const text = btn.textContent;
  document.getElementById('help-suggestions').innerHTML = '';
  appendHelpMessage(escapeHtml(text), 'user');
  respondHelp(text);
}
function sendHelpMessage(){
  const input = document.getElementById('help-chat-input');
  const text = input.value.trim();
  if(!text) return;
  document.getElementById('help-suggestions').innerHTML = '';
  appendHelpMessage(escapeHtml(text), 'user');
  input.value = '';
  respondHelp(text);
}
function respondHelp(text){
  const answer = findFaqAnswer(text);
  appendHelpMessage(answer || t('help.assistant.fallback'), 'bot');
}
function normalizeHelpText(s){
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[¿?¡!.,]/g,'').trim();
}
function helpStems(s){
  return normalizeHelpText(s).split(/\s+/).filter(w=>w.length>=3).map(w=>w.length>=4?w.slice(0,3):w);
}
function findFaqAnswer(text){
  const lang = getLang();
  const norm = normalizeHelpText(text);
  const inputStems = new Set(helpStems(text));
  let best = null, bestScore = 0;
  HELP_FAQS.forEach(faq => {
    let score = 0;
    const faqStems = new Set();
    const kws = (faq.keywords[lang] || faq.keywords.es).concat(faq.keywords.es);
    kws.forEach(k => {
      const kn = normalizeHelpText(k);
      if(norm.includes(kn)) score += kn.split(' ').length * 3;
      helpStems(k).forEach(st => faqStems.add(st));
    });
    faqStems.forEach(st => { if(inputStems.has(st)) score += 1; });
    if(score > bestScore){ bestScore = score; best = faq; }
  });
  return bestScore > 1 ? (best.answers[lang] || best.answers.es) : null;
}
function appendHelpMessage(html, who){
  const box = document.getElementById('help-chat-messages');
  const div = document.createElement('div');
  div.className = 'help-msg ' + who;
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
function openHelpContactEmail(){
  const subject = encodeURIComponent('Soporte GastroGoan' + ((DB.business && DB.business.name) ? ' - ' + DB.business.name : ''));
  window.location.href = 'mailto:gastrogoan@gmail.com?subject=' + subject;
}

/* ===== Chat interno ===== */
const CHAT_CHANNELS = ['general', 'cocina', 'sala'];
const CHAT_CHANNEL_LABEL_KEYS = {general:'label.general', cocina:'folder.cocina.title', sala:'folder.sala.title'};
function chatChannelLabel(ch){ return t(CHAT_CHANNEL_LABEL_KEYS[ch]) || ch; }
let currentChatChannel = 'general';
// Los tres canales están siempre visibles: General (todo el personal),
// Cocina (jefe/a + personal de cocina) y Sala (jefe/a + personal de sala).
function visibleChatChannels(){
  return CHAT_CHANNELS.slice();
}
let chatOwnerVerified = false;
let chatPinPrevValue = '';

function getChatAuthor(){
  return localStorage.getItem('chatAuthor') || '';
}
function setChatAuthor(val){
  localStorage.setItem('chatAuthor', val);
}
function getChatAuthorName(val){
  if(val === 'owner') return t('common.chef');
  const e = DB.employees.find(x => String(x.id) === String(val));
  return e ? e.name : t('common.chef');
}
// Quién puede escribir en cada canal: en General, cualquier empleado (de
// cocina o de sala) + Jefe/a; en Cocina/Sala, solo el personal de esa área + Jefe/a.
function chatEligibleEmployees(channel){
  if(channel === 'general') return DB.employees.slice();
  return DB.employees.filter(e => (e.area||'cocina')===channel);
}
function populateChatAuthorSelect(){
  const sel = document.getElementById('chat-author-sel');
  const current = getChatAuthor();
  const emps = chatEligibleEmployees(currentChatChannel);
  let opts;
  if(currentChatChannel === 'general'){
    const cocina = emps.filter(e => (e.area||'cocina')==='cocina');
    const sala = emps.filter(e => e.area==='sala');
    opts = (cocina.length ? `<optgroup label="Cocina">${cocina.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</optgroup>` : '')
      + (sala.length ? `<optgroup label="Sala">${sala.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</optgroup>` : '');
  } else {
    const label = currentChatChannel==='sala' ? 'Sala' : 'Cocina';
    opts = emps.length ? `<optgroup label="${label}">${emps.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('')}</optgroup>` : '';
  }
  sel.innerHTML = `<option value="owner">${t('common.chef')}</option>` + opts;
  const valid = current==='owner' ? chatOwnerVerified : emps.some(e => String(e.id)===String(current));
  sel.value = valid ? current : 'owner';
  if(sel.value !== current) setChatAuthor(sel.value);
}
// Los tres canales están siempre disponibles; solo se refresca quién puede
// escribir en el canal activo.
function applyChatAreaRestrictions(){
  // no-op: mantenido por compatibilidad con las llamadas existentes.
}
function onChatAuthorChange(sel){
  const val = sel.value;
  if(val === 'owner' && !chatOwnerVerified){
    requestChatOwnerPin(sel);
    return;
  }
  setChatAuthor(val);
}
function requestChatOwnerPin(sel){
  chatPinPrevValue = getChatAuthor();
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${t('title.bossAccess')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">Introduce el PIN de acceso del negocio para escribir en el chat como Jefe/a.</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="chat-owner-pin-input" maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')" onkeydown="if(event.key==='Enter')confirmChatOwnerPin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="confirmChatOwnerPin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('chat-owner-pin-input')?.focus(), 50);
}
function confirmChatOwnerPin(){
  const val = document.getElementById('chat-owner-pin-input').value;
  const sel = document.getElementById('chat-author-sel');
  const bp = DB.business.pin;
  const bMatch = bp.startsWith('H:') ? hashPin(val) === bp : val === bp;
  if(!bMatch){
    showToast(t('msg.pinIncorrect'));
    if(sel) sel.value = chatPinPrevValue || getChatAuthor();
    return;
  }
  chatOwnerVerified = true;
  setChatAuthor('owner');
  closeModal();
  showToast(t('msg.bossAccessGranted'));
  if(sel) sel.value = 'owner';
}
function toggleChatPanel(){
  const panel = document.getElementById('chat-panel');
  const opening = !panel.classList.contains('active');
  panel.classList.toggle('active');
  if(opening){
    applyChatAreaRestrictions();
    populateChatAuthorSelect();
    renderChatMessages();
    markChatRead(currentChatChannel);
    updateChatBadge();
  }
}
function switchChatTab(channel){
  currentChatChannel = channel;
  CHAT_CHANNELS.forEach(c => document.getElementById('chat-tab-btn-'+c).classList.toggle('active', c===channel));
  populateChatAuthorSelect();
  renderChatMessages();
  markChatRead(channel);
  updateChatBadge();
}
function renderChatMessages(){
  const box = document.getElementById('chat-messages');
  const author = getChatAuthor();
  const msgs = (DB.chatMessages||[]).filter(m => m.channel === currentChatChannel);
  box.innerHTML = msgs.map(m => `
    <div class="help-msg ${String(m.authorId)===String(author) ? 'own' : 'other'}">
      <span class="chat-meta">${escapeHtml(m.authorName)} · ${fmtHora(m.ts)}</span>
      ${escapeHtml(m.text)}
    </div>
  `).join('') || `<div class="empty" style="padding:20px"><i class="ti ti-messages-off"></i> ${t('msg.noMessagesInChannelYet').replace('${channel}', escapeHtml(chatChannelLabel(currentChatChannel)))}</div>`;
  box.scrollTop = box.scrollHeight;
}
function sendChatMessage(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text) return;
  const authorId = getChatAuthor();
  DB.chatMessages.push({
    id: genId(),
    channel: currentChatChannel,
    authorId,
    authorName: getChatAuthorName(authorId),
    text,
    ts: new Date().toISOString()
  });
  saveDB();
  input.value = '';
  renderChatMessages();
}
function markChatRead(channel){
  localStorage.setItem('chatLastRead_'+channel, new Date().toISOString());
}
function updateChatBadge(){
  const badge = document.getElementById('chat-badge');
  if(!badge) return;
  let unread = 0;
  // Solo cuenta los canales visibles en el área actual (no avisa del área contraria).
  visibleChatChannels().forEach(c => {
    const lastRead = localStorage.getItem('chatLastRead_'+c);
    const count = (DB.chatMessages||[]).filter(m => m.channel===c && (!lastRead || m.ts > lastRead)).length;
    unread += count;
  });
  if(unread > 0){
    badge.style.display = 'flex';
    badge.textContent = unread > 9 ? '9+' : String(unread);
  } else {
    badge.style.display = 'none';
  }
}

/* ============== Áreas de trabajo ============== */
const FOLDERS = {
  cocina: {
    icon:'ti-tools-kitchen-2', color:'var(--teal)', emoji:'👨‍🍳',
    modules:[
      {id:'comandascocina', icon:'ti-bell-ringing'},
      {id:'carta', icon:'ti-tools-kitchen-2'},
      {id:'proveedores', icon:'ti-building-factory-2'},
      {id:'megalista', icon:'ti-list-details'},
      {id:'escandallo', icon:'ti-calculator'},
      {id:'fichas', icon:'ti-file-description'},
      {id:'pedidos', icon:'ti-shopping-cart'},
      {id:'stock', icon:'ti-package'},
      {id:'horarios', icon:'ti-calendar-time'},
      {id:'distribucion', icon:'ti-clipboard-list'},
      {id:'limpieza', icon:'ti-spray'},
    ]
  },
  sala: {
    icon:'ti-users', color:'var(--brand-yellow)', emoji:'🍽️',
    modules:[
      {id:'tpv', icon:'ti-device-desktop'},
      {id:'reservas', icon:'ti-calendar-event'},
      {id:'clientes', icon:'ti-address-book'},
      {id:'carta', icon:'ti-tools-kitchen-2'},
      {id:'proveedores', icon:'ti-building-factory-2'},
      {id:'megalista', icon:'ti-list-details'},
      {id:'escandallo', icon:'ti-calculator'},
      {id:'fichas', icon:'ti-file-description'},
      {id:'stock', icon:'ti-package'},
      {id:'pedidos', icon:'ti-shopping-cart'},
      {id:'horarios', icon:'ti-calendar-time'},
      {id:'distribucion', icon:'ti-clipboard-list'},
      {id:'limpieza', icon:'ti-spray'},
      {id:'promocion', icon:'ti-speakerphone'},
    ]
  },
  gestion: {
    icon:'ti-coin', color:'var(--teal)', emoji:'📊',
    modules:[
      {id:'manual', icon:'ti-book'},
      {id:'minegocio', icon:'ti-building-store'},
      {id:'dashboard', icon:'ti-layout-dashboard'},
      {id:'economia', icon:'ti-coin'},
    ]
  }
};
const MODULE_FOLDER = {};
Object.entries(FOLDERS).forEach(([key, f]) => f.modules.forEach(m => { if(MODULE_FOLDER[m.id] === undefined) MODULE_FOLDER[m.id] = key; }));

let currentFolder = null;

/* Devuelve el área (Cocina/Sala) según la carpeta de trabajo actual.
   Los módulos compartidos (Mega Lista, Escandallo, Stock, etc.) se
   filtran por esta área para mantener cocina y sala separados. */
function currentArea(){
  return currentFolder === 'sala' ? 'sala' : 'cocina';
}

/* ============== Navigation ============== */
function goHome(){
  lockEditMode();
  if(ownerUnlocked){ ownerUnlocked = false; document.getElementById('lock-btn').style.display = 'none'; }
  navigate('home');
}
function openFolder(key){
  lockEditMode();
  if(ownerUnlocked){ ownerUnlocked = false; document.getElementById('lock-btn').style.display = 'none'; }
  currentFolder = key;
  navigate('folder');
}
let ownerUnlocked = false;
let editUnlocked = false;

function lockEditMode(){
  editUnlocked = false;
  document.body.classList.remove('edit-unlocked');
}

function requestEditPin(){
  const pinInputAttrs = `maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')"`;
  openModal(`
    <div class="modal-header">
      <h3><i class="ti ti-lock"></i> ${t('title.editMode')}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <p style="font-size:13px;color:var(--muted)">${t('title.editModeDesc')}</p>
    <div class="field">
      <label>${t('label.accessPin')}</label>
      <input type="password" id="edit-pin-input" ${pinInputAttrs} onkeydown="if(event.key==='Enter')verifyEditPin()">
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
      <button class="btn btn-primary" onclick="verifyEditPin()">${t('common.unlock')}</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('edit-pin-input')?.focus(), 50);
}

function verifyEditPin(){
  const val = document.getElementById('edit-pin-input').value;
  const bp = DB.business.pin;
  const bMatch = bp.startsWith('H:') ? hashPin(val) === bp : val === bp;
  if(!bMatch){
    showToast(t('msg.pinIncorrect'));
    return;
  }
  editUnlocked = true;
  document.body.classList.add('edit-unlocked');
  closeModal();
  showToast(t('msg.editModeOn'));
  renderFolder();
}

function toggleEditMode(){
  if(editUnlocked){
    lockEditMode();
    showToast(t('msg.editModeLocked'));
    renderFolder();
  } else {
    requestEditPin();
  }
}

function isGestionLocked(view){
  if(ownerUnlocked) return false;
  if(MODULE_FOLDER[view] === 'gestion') return true;
  if(view === 'folder' && currentFolder === 'gestion') return true;
  return false;
}

function lockOwnerArea(){
  ownerUnlocked = false;
  document.getElementById('lock-btn').style.display = 'none';
  goHome();
}

function navigate(view){
  if(isGestionLocked(view)){
    requestOwnerPin(view);
    return;
  }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if(target) target.classList.add('active');

  const inCurrentFolder = currentFolder && FOLDERS[currentFolder] && FOLDERS[currentFolder].modules.some(m => m.id === view);
  if(!inCurrentFolder && MODULE_FOLDER[view]) currentFolder = MODULE_FOLDER[view];

  renderView(view);
  location.hash = view;
}

function requestOwnerPin(targetView){
  const pinInputAttrs = `maxlength="4" inputmode="numeric" placeholder="••••" style="letter-spacing:8px;font-size:22px;text-align:center" oninput="this.value=this.value.replace(/[^0-9]/g,'')"`;
  if(!DB.business.pinSet){
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-lock"></i> ${t('title.configAccess')}</h3>
      </div>
      <p style="font-size:13px;color:var(--muted)">${t('title.configAccessDesc')}</p>
      <div class="field">
        <label>${t('label.currentPin')}</label>
        <input type="password" id="owner-pin-input" ${pinInputAttrs}>
      </div>
      <div class="field">
        <label>${t('label.newPin')}</label>
        <input type="password" id="owner-pin-new" ${pinInputAttrs}>
      </div>
      <div class="field">
        <label>${t('label.repeatPin')}</label>
        <input type="password" id="owner-pin-new2" ${pinInputAttrs} onkeydown="if(event.key==='Enter')verifyOwnerPin('${targetView}')">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="verifyOwnerPin('${targetView}')">${t('common.continue')}</button>
      </div>
    `);
  } else {
    openModal(`
      <div class="modal-header">
        <h3><i class="ti ti-lock"></i> ${t('title.protectedAccess')}</h3>
        <button class="modal-close" onclick="closeModal()">&times;</button>
      </div>
      <div class="field">
        <label>${t('label.accessPin')}</label>
        <input type="password" id="owner-pin-input" ${pinInputAttrs} onkeydown="if(event.key==='Enter')verifyOwnerPin('${targetView}')">
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">${t('common.cancel')}</button>
        <button class="btn btn-primary" onclick="verifyOwnerPin('${targetView}')">${t('common.unlock')}</button>
      </div>
    `);
  }
  setTimeout(()=>document.getElementById('owner-pin-input')?.focus(), 50);
}

function verifyOwnerPin(targetView){
  const val = document.getElementById('owner-pin-input').value;
  const bp = DB.business.pin;
  const bMatch = bp.startsWith('H:') ? hashPin(val) === bp : val === bp;
  if(!bMatch){
    showToast(t('msg.pinIncorrect'));
    return;
  }
  if(!DB.business.pinSet){
    const n1 = document.getElementById('owner-pin-new').value;
    const n2 = document.getElementById('owner-pin-new2').value;
    if(!/^\d{4}$/.test(n1)){ showToast(t('msg.pin4digits')); return; }
    if(n1 !== n2){ showToast(t('msg.pinNoMatch')); return; }
    DB.business.pin = hashPin(n1);
    DB.business.pinSet = true;
    saveDB();
    showToast(t('msg.pinUpdated'));
  }
  ownerUnlocked = true;
  document.getElementById('lock-btn').style.display = '';
  closeModal();
  navigate(targetView);
}
function renderView(view){
  switch(view){
    case 'home': renderHome(); break;
    case 'folder': renderFolder(); break;
    case 'dashboard': renderDashboard(); break;
    case 'megalista': renderMegalista(); break;
    case 'proveedores': renderProveedores(); break;
    case 'escandallo': renderEscandallo(); break;
    case 'fichas': renderFichas(); break;
    case 'carta': renderOferta(); break;
    case 'tpv': renderTPV(); break;
    case 'comandascocina': renderComandasCocina(); break;
    case 'stock': renderStock(); break;
    case 'pedidos': renderPedidos(); break;
    case 'economia': GE.init(); break;
    case 'horarios': renderHorarios(); break;
    case 'limpieza': renderLimpieza(); break;
    case 'clientes': renderClientes(); break;
    case 'reservas': renderReservas(); break;
    case 'promocion': renderPromocion(); break;
    case 'distribucion': renderDistribucion(); break;
    case 'minegocio': renderMiNegocio(); break;
    case 'manual': renderManual(); break;
  }
  requestAnimationFrame(function(){ if(typeof runPolishAnimations==='function') runPolishAnimations(); });
}

function renderHome(){
  document.querySelector('#view-home .hero-badge').innerHTML = `<i class="ti ti-star"></i> ${escapeHtml(t('home.heroBadge'))}`;
  document.querySelector('#view-home .home-hero h1').textContent = t('home.title');
  document.querySelector('#view-home .home-hero p').textContent = t('home.subtitle');
  document.getElementById('home-folders').innerHTML = Object.entries(FOLDERS).map(([key, f]) => `
    <div class="folder-card folder-${key}" style="--folder-color:${f.color}" onclick="openFolder('${key}')">
      <span class="folder-icon"><i class="ti ${f.icon}"></i></span>
      <h2>${escapeHtml(t(`folder.${key}.title`))}</h2>
      <div class="folder-btn"><i class="ti ti-arrow-right"></i> ${escapeHtml(t('common.enter'))}</div>
    </div>
  `).join('');
}

function renderFolder(){
  const f = FOLDERS[currentFolder];
  if(!f){ navigate('home'); return; }
  document.getElementById('folder-title').innerHTML = `<i class="ti ${f.icon}"></i> ${escapeHtml(t(`folder.${currentFolder}.title`))}`;
  document.getElementById('folder-subtitle').textContent = t(`folder.${currentFolder}.subtitle`);
  const editToggle = document.getElementById('folder-edit-toggle');
  if(currentFolder === 'cocina' || currentFolder === 'sala'){
    editToggle.style.display = '';
    if(editUnlocked){
      editToggle.innerHTML = `<i class="ti ti-lock-open"></i> ${escapeHtml(t('common.lockEdit'))}`;
      editToggle.classList.add('btn-primary');
    } else {
      editToggle.innerHTML = `<i class="ti ti-lock"></i> ${escapeHtml(t('common.edit'))}`;
      editToggle.classList.remove('btn-primary');
    }
  } else {
    editToggle.style.display = 'none';
  }
  document.getElementById('folder-modules').innerHTML = f.modules.map(m => `
    <div class="module-card" onclick="navigate('${m.id}')">
      <i class="ti ${m.icon} module-icon"></i>
      <h3>${escapeHtml(t(`module.${currentFolder}.${m.id}.name`))}</h3>
      <p>${escapeHtml(t(`module.${currentFolder}.${m.id}.desc`))}</p>
      <div class="module-open"><i class="ti ti-arrow-right"></i> ${escapeHtml(t('common.open'))}</div>
    </div>
  `).join('');
}

/* ============== Modal helpers ============== */
function openModal(html, opts){
  const box = document.getElementById('modal-box');
  box.innerHTML = html;
  box.classList.toggle('modal-xl', !!(opts && opts.xl));
  box.classList.toggle('modal-order', !!(opts && opts.order));
  document.getElementById('modal-overlay').classList.add('active');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal-box').innerHTML = '';
  document.getElementById('modal-box').classList.remove('modal-xl');
  document.getElementById('modal-box').classList.remove('modal-order');
}
document.getElementById('modal-overlay').addEventListener('click', (e)=>{
  if(e.target.id === 'modal-overlay') closeModal();
});

