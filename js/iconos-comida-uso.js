/* ═══ USO DEL CATÁLOGO DE ICONOS DE COMIDA ═══
   Va junto a js/iconos-comida.js (el catálogo generado) y, igual que él, se copia dentro de
   reservagastrogoan.html (lo hace tools/generar-iconos-comida.mjs): la app y la web pública pintan SIEMPRE con
   el mismo código, así que lo que el dueño ve al montar su carta es exactamente lo que ve su cliente.

   Lo que guarda una sección en `icono`:
     «ic:<clave>»  un icono del catálogo      ·  «ic:none»  sin icono (elección expresa)
     (vacío)       automático: se adivina por el nombre de la sección
     un emoji      secciones antiguas: se ven con el icono equivalente, sin tocar el dato guardado */
const EMOJI_A_ICONO = { '☕':'cafe', '⚗️':'botella', '❄️':'nevera', '🌶️':'pimiento', '🌽':'trigo-2', '🌾':'trigo', '🌿':'hoja', '🍄':'seta', '🍅':'ensalada', '🍆':'planta', '🍇':'uvas', '🍈':'melon', '🍊':'citricos', '🍋':'limon', '🍍':'carambola', '🍎':'manzana', '🍏':'manzana-2', '🍐':'manzana-2', '🍑':'cerezas', '🍓':'cerezas-2', '🍖':'carne', '🍗':'muslo', '🍚':'cuenco-palillos', '🍛':'cuenco-cuchara', '🍝':'cuenco-palillos', '🍞':'pan', '🍫':'chocolate', '🍮':'porcion', '🍯':'caramelo-2', '🍰':'porcion', '🍲':'cazuela', '🍳':'huevo-frito', '🍴':'cubiertos', '🍵':'tetera', '🍶':'botella', '🍷':'copa-vino', '🍸':'coctel', '🍹':'ginebra', '🍺':'cerveza', '🍻':'cerveza-2', '🍼':'leche', '🍽️':'cubiertos-cruz', '🍾':'botella-vino', '🏺':'anfora', '🐚':'concha', '🐟':'pescado', '📖':'cubiertos-cruz', '🛢️':'barrica', '🥂':'copa-champagne', '🥃':'botella', '🥄':'cazo', '🥑':'aguacate', '🥒':'hojas', '🥓':'carne', '🥔':'planta', '🥕':'zanahoria', '🥖':'baguette', '🥗':'ensalada', '🥘':'cazuela', '🥚':'huevo', '🥛':'leche-2', '🥤':'refresco', '🥥':'carambola', '🥧':'tarta', '🥩':'ternera', '🥬':'hojas', '🥭':'carambola', '🥯':'pan', '🦐':'gamba', '🦑':'pescado-3', '🦞':'gamba', '🦪':'concha', '🧀':'queso', '🧂':'sal', '🧃':'licuadora', '🧄':'brote', '🧅':'ensalada-2', '🧈':'queso', '🧉':'martini', '🧊':'agua', '🧋':'bubble-tea', '🫐':'cerezas', '🫑':'pimiento', '🫒':'tapas', '🫓':'pan', '🫕':'cazuela', '🫖':'tetera', '🫗':'copa-llena', '🫘':'trigo', '🫙':'botella', '🥣':'cuenco-cuchara', '🍕':'pizza', '🌭':'salchicha', '🍤':'gamba', '🍢':'espatula', '🥝':'citricos', '🍉':'melon', '🍌':'platano', '🍒':'cerezas', '🥦':'hojas', '🍠':'zanahoria', '🥜':'frutos-secos', '🌰':'frutos-secos', '🍣':'pescado-2', '🐠':'pescado-2', '🐡':'pescado-2', '🦀':'gamba', '🐙':'pescado-3', '🧁':'cupcake', '🍩':'donut', '🍪':'galleta', '🍦':'helado-cono', '🍨':'helado-copa', '🍧':'polo', '🍡':'caramelo', '🍬':'caramelo-2', '🍭':'piruleta', '🎂':'tarta', '🍔':'hamburguesa', '🥪':'bocadillo', '🌮':'bocadillo', '🌯':'bocadillo', '🥙':'bocadillo', '🥟':'empanadilla', '🍜':'cuenco-palillos', '🍙':'cuenco-palillos', '🍘':'galleta', '🧆':'empanadilla', '🥫':'botella', '🍿':'palomitas', '🥞':'brazo', '🧇':'brazo', '🥐':'croissant', '🥨':'pan' };
const ICONOS_PALABRAS = [
  [['hamburguesa','burger','hamburger'],'hamburguesa'],
  [['pizza','pizzeria','pizzeria'],'pizza'],
  [['bocadillo','sandwich','montadito','bocata','entrepa','bocadill'],'bocadillo'],
  [['helado','gelat','ice cream','gelato'],'helado'],
  [['cafe','cafes','coffee','cafeteria','cortado','capuchino'],'cafe'],
  [['infantil','nino','ninos','kids','menu infantil'],'galleta-muneco'],
  [['sushi','japones','oriental','wok','asiatic','noodle','ramen'],'cuenco-palillos'],
  [['jamon','ibérico','iberico','pernil','cecina'],'jamon'],
  [['tosta','tostada','bruschetta'],'pan'],
  [['croqueta','frito','fritura','empanad','rebozado'],'empanadilla'],
  [['pulpo','calamar','sepia'],'pescado-3'],
  [['gamba','langostino','marisc','marisco','cigala','bogavante','mejillon'],'gamba'],
  [['asado','horno','al horno','roast'],'llama'],
  [['plancha','a la plancha','griddle'],'espatula'],
  [['salsa','sauce'],'cazo'],
  [['para compartir','compartir','to share','sharing'],'bandeja'],
  [['sugerencia','sugerencias','especial','especiales','del chef','chef','suggest'],'gorro'],
  [['menu','menus','carta'],'cubiertos-cruz'],
  [['terraza','terrassa','terrace'],'picnic'],
  [['llevar','para llevar','takeaway','take away','delivery'],'bolsa'],
  [['cremoso','cremas'],'cuenco-cuchara'],
  [['huerto','temporada','seasonal'],'planta'],
  [['entrante','entrant','starter','aperitivo','aperitiu','tapa','pica','appetizer'],'tapas'],
  [['ensalada','amanida','salad','verdura','vegetal','hortaliza','huerta','veggie'],'ensalada'],
  [['sopa','crema','caldo','soup','brou','potaje','guiso','cuchara','estofado'],'cazuela'],
  [['arroz','arroces','arros','paella','risotto','rice','fideua'],'cuenco-palillos'],
  [['pasta','macarron','espagueti','spaghetti','lasan'],'cuenco-palillos'],
  [['carne','carn','meat','ternera','vedella','cordero','xai','cerdo','porc','pollo','pollastre','chicken','beef','pork','lamb','brasa','parrilla','graella','grill'],'ternera'],
  [['pescado','peix','fish','marisco','marisc','seafood','bacalao','bacalla','pulpo','gamba','calamar'],'pescado'],
  [['huevo','egg','tortilla','truita','revuelto','ou'],'huevo-frito'],
  [['queso','formatge','cheese','embutido','embotit','curado','charcuter'],'queso'],
  [['pan','bread','coca','tosta','torrada','pa'],'baguette'],
  [['postre','dessert','dolc','dulce','sweet','tarta','pastel','pastis','cake'],'porcion'],
  [['fruta','fruita','fruit'],'uvas'],
  [['tinto','negre','red wine','crianza','reserva','rioja','ribera'],'copa-vino'],
  [['blanco','blanc','white wine','albarino','verdejo','godello'],'copa-champagne'],
  [['rosado','rosat','rose'],'copa-vino'],
  [['cava','champ','espumos','escumos','sparkling','prosecco','burbuja'],'botella-vino'],
  [['ginebra','gin','tonic'],'coctel'],
  [['ron','rum','whisky','whiskey','bourbon','vodka','tequila','mezcal','brandy','conyac','cognac','aguardiente','orujo','destilado','destil'],'botella'],
  [['vermut','vermouth','aperitiu','aperitivo','spritz'],'martini'],
  [['sidra','cider'],'cerveza'],
  [['te ','tes','the','tea','infusio','infusion','tisana','rooibos','manzanilla','poleo'],'tetera'],
  [['zumo','suc','juice','smoothie','batido','batut'],'licuadora'],
  [['agua','aigua','water','mineral'],'refresco'],
  [['sin alcohol','sense alcohol','alcohol free','mocktail','0.0','0,0'],'ginebra'],
  [['hielo','gel','ice','granizado'],'agua'],
  [['licor','crema','chupito','xopet','shot'],'botella'],
  [['carta de vinos','bodega','celler','vinoteca'],'uvas'],
  [['vino','wine','bodega','celler','cava','champ','espumoso','vi'],'copa-vino'],
  [['cerveza','cervesa','beer','birra','caña'],'cerveza'],
  [['cocktail','coctel','copa','combinado','licor','destilado','gin','whisky','vermut','vermouth','spirit'],'coctel'],
  [['cafe','cafeteria','coffee','infusion','infusio','tea','te'],'cafe'],
  [['refresco','refresc','zumo','suc','juice','agua','aigua','water','bebida','beguda','drink','batido','batut','smoothie'],'refresco'],
  [['desayuno','esmorzar','breakfast','brunch'],'pan']
];
function iconoNombreNormal(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
// Las palabras de tres letras o menos ('ou', 'pa', 'vi', 'te') solo valen si son la palabra entera: buscadas por
// dentro, «Pasta» y «Paella» salían con un pan, y «Mousses» con un huevo.
function iconoPalabraCoincide(n, w){
  const k = iconoNombreNormal(w);
  if(k.length > 3) return n.includes(k);
  return new RegExp('(^|[^a-z0-9])' + k + '([^a-z0-9]|$)').test(n);
}
function iconoComidaPorNombre(nombre){
  const n = iconoNombreNormal(nombre);
  for(const [palabras, clave] of ICONOS_PALABRAS){ if(palabras.some(w => iconoPalabraCoincide(n, w))) return clave; }
  return 'cubiertos-cruz';   // un nombre que no reconocemos: cubiertos, neutro y siempre correcto
}
// Qué icono (clave del catálogo, o '' si ninguno) corresponde a lo guardado en una sección.
function iconoComidaClave(valor, nombre){
  if(valor === 'ic:none') return '';
  if(typeof valor === 'string' && valor.startsWith('ic:') && ICONOS_COMIDA[valor.slice(3)]) return valor.slice(3);
  if(valor && EMOJI_A_ICONO[valor] && ICONOS_COMIDA[EMOJI_A_ICONO[valor]]) return EMOJI_A_ICONO[valor];
  return iconoComidaPorNombre(nombre);
}
function iconoComidaSvg(clave, tam){
  const ic = ICONOS_COMIDA[clave];
  if(!ic) return '';
  return `<svg class="ic-comida" viewBox="0 0 24 24" width="${tam||24}" height="${tam||24}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic[0]}</svg>`;
}
// HTML del icono de una sección, listo para meter en una página (nada que escapar: sale del catálogo).
function iconoSeccionHtml(valor, nombre, tam){
  return iconoComidaSvg(iconoComidaClave(valor, nombre), tam);
}
function iconoComidaNombre(clave, lang){
  const ic = ICONOS_COMIDA[clave]; if(!ic) return '';
  return ic[lang === 'ca' ? 2 : lang === 'en' ? 3 : 1];
}
