/* Los datos de la demo: GG Burger, una hamburguesería de barrio con un año
   de vida, 12 empleados y unos 33.000 € de facturación al mes.
   No son datos de relleno — son coherentes entre sí, porque una demo con
   números imposibles (un plato al 4% de food cost, un empleado sin turnos,
   una carta sin escandallo) se le nota a un hostelero en diez segundos y
   deja de creerse lo demás.

   Las proporciones son las de una hamburguesería que va bien: ~30% de
   materia prima, ~33% de personal, y un resultado alrededor del 18%. Con 12
   personas en plantilla hay que facturar lo que se factura aquí; con menos,
   la demo saldría en pérdidas y eso no vende nada. */
window.GG_DEMO_DATOS = (function(){
  const hoy = new Date();
  const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
  let id = 1000; const nid = () => ++id;

  /* Mega Lista: todo lo que se compra, con su precio real de proveedor, su
     stock y su mínimo. Incluye lo que NO va en ninguna receta (limpieza,
     packaging) porque un almacén de verdad también lo tiene, y la pantalla
     de Stock sin esas líneas se ve corta. */
  const ing = [
    // [nombre, unidad, precio, categoría, proveedor, alérgenos, stock, mínimo, área]
    ['Carne picada vacuno madurado','kg',9.80,'Carnicería','Cárnicas Vallès',[],38,15],
    ['Bacon en lonchas','kg',7.20,'Carnicería','Cárnicas Vallès',[],12,5],
    ['Pechuga de pollo','kg',6.50,'Carnicería','Cárnicas Vallès',[],14,6],
    ['Paletilla de cerdo','kg',6.90,'Carnicería','Cárnicas Vallès',[],9,4],
    ['Pan brioche de burger','ud',0.55,'Panadería','Forn del Barri',['Gluten','Huevos','Lácteos'],320,120],
    ['Pan sin gluten de burger','ud',1.20,'Panadería','Forn del Barri',[],40,15],
    ['Pan de semillas','ud',0.62,'Panadería','Forn del Barri',['Gluten','Sésamo'],90,40],
    ['Queso cheddar en lonchas','kg',8.90,'Lácteos','Làctics Pirineu',['Lácteos'],11,4],
    ['Queso azul','kg',12.50,'Lácteos','Làctics Pirineu',['Lácteos'],3,1],
    ['Mozzarella rallada','kg',7.40,'Lácteos','Làctics Pirineu',['Lácteos'],5,2],
    ['Nata 35%','L',4.10,'Lácteos','Làctics Pirineu',['Lácteos'],9,3],
    ['Mantequilla','kg',8.90,'Lácteos','Làctics Pirineu',['Lácteos'],4,1.5],
    ['Helado de vainilla','L',5.20,'Lácteos','Làctics Pirineu',['Lácteos','Huevos'],10,4],
    ['Lechuga iceberg','ud',0.95,'Verduras','Fruites Martí',[],36,15],
    ['Tomate','kg',1.90,'Verduras','Fruites Martí',[],16,6],
    ['Cebolla','kg',0.95,'Verduras','Fruites Martí',[],28,10],
    ['Cebolla morada','kg',1.30,'Verduras','Fruites Martí',[],9,3],
    ['Pepinillos agridulces','kg',4.20,'Conservas','Distribucions Camp',[],7,3],
    ['Jalapeños en vinagre','kg',6.80,'Conservas','Distribucions Camp',[],3,1],
    ['Aguacate','ud',1.15,'Verduras','Fruites Martí',[],24,10],
    ['Patata para freír','kg',1.10,'Verduras','Fruites Martí',[],75,30],
    ['Champiñón portobello','kg',4.60,'Verduras','Fruites Martí',[],6,2],
    ['Rúcula','kg',7.50,'Verduras','Fruites Martí',[],2.5,1],
    ['Ajo','kg',4.20,'Verduras','Fruites Martí',[],3,1],
    ['Lima','kg',2.90,'Frutas','Fruites Martí',[],6,2],
    ['Limón','kg',1.70,'Frutas','Fruites Martí',[],5,2],
    ['Menta fresca','manojo',0.80,'Frutas','Fruites Martí',[],14,6],
    ['Aceite de girasol','L',1.65,'Aceites','Distribucions Camp',[],60,25],
    ['Aceite de oliva virgen','L',6.20,'Aceites','Distribucions Camp',[],12,4],
    ['Harina','kg',0.85,'Secos','Distribucions Camp',['Gluten'],14,5],
    ['Panko','kg',3.40,'Secos','Distribucions Camp',['Gluten'],6,2],
    ['Nachos de maíz','kg',3.90,'Secos','Distribucions Camp',[],8,3],
    ['Kétchup','kg',2.10,'Salsas','Distribucions Camp',[],14,5],
    ['Mostaza de Dijon','kg',6.80,'Salsas','Distribucions Camp',['Mostaza'],3,1],
    ['Mayonesa','kg',3.60,'Salsas','Distribucions Camp',['Huevos'],18,7],
    ['Salsa barbacoa','kg',4.20,'Salsas','Distribucions Camp',[],11,4],
    ['Pasta de chipotle','kg',7.80,'Salsas','Distribucions Camp',[],2,0.8],
    ['Azúcar moreno','kg',1.40,'Secos','Distribucions Camp',[],7,3],
    ['Miel','kg',9.20,'Secos','Distribucions Camp',[],2,0.8],
    ['Vinagre de manzana','L',2.80,'Vinagres','Distribucions Camp',['Sulfitos'],4,1.5],
    ['Mezcla de especias burger','kg',12.00,'Especias','Distribucions Camp',[],1.8,0.6],
    ['Sal','kg',0.40,'Especias','Distribucions Camp',[],9,3],
    ['Pimienta negra molida','kg',18.00,'Especias','Distribucions Camp',[],1,0.4],
    ['Huevos','ud',0.28,'Huevos','Distribucions Camp',['Huevos'],240,90],
    ['Chocolate 70%','kg',12.00,'Repostería','Distribucions Camp',['Soja'],4,1.5],
    ['Queso crema','kg',5.40,'Lácteos','Làctics Pirineu',['Lácteos'],6,2],
    ['Galleta para base','kg',4.80,'Repostería','Distribucions Camp',['Gluten','Lácteos'],3,1],
    // Bebidas y barra
    ['Refresco de cola (lata)','ud',0.42,'Bebidas','Beguda Distribució',[],260,100],
    ['Refresco de naranja (lata)','ud',0.40,'Bebidas','Beguda Distribució',[],180,70],
    ['Cerveza tercio','ud',0.55,'Bebidas','Beguda Distribució',['Gluten'],300,120],
    ['Cerveza de barril','L',1.80,'Bebidas','Beguda Distribució',['Gluten'],90,35],
    ['Agua mineral 50 cl','ud',0.25,'Bebidas','Beguda Distribució',[],220,90],
    ['Vino tinto DO (botella)','ud',4.80,'Bodega','Beguda Distribució',['Sulfitos'],28,12],
    ['Vino blanco DO (botella)','ud',4.40,'Bodega','Beguda Distribució',['Sulfitos'],22,10],
    // Coctelería
    ['Ron blanco','L',12.50,'Destilados','Beguda Distribució',[],6,2],
    ['Ginebra premium','L',18.00,'Destilados','Beguda Distribució',[],7,3],
    ['Tequila','L',16.50,'Destilados','Beguda Distribució',[],4,1.5],
    ['Vodka','L',11.80,'Destilados','Beguda Distribució',[],5,2],
    ['Bourbon','L',17.00,'Destilados','Beguda Distribució',[],4,1.5],
    ['Triple seco','L',9.40,'Destilados','Beguda Distribució',[],3,1],
    ['Vermut rojo','L',8.20,'Destilados','Beguda Distribució',['Sulfitos'],5,2],
    ['Bitter rojo','L',14.00,'Destilados','Beguda Distribució',[],3,1],
    ['Tónica','ud',0.55,'Bebidas','Beguda Distribució',[],190,80],
    ['Cerveza de jengibre','ud',0.70,'Bebidas','Beguda Distribució',[],90,40],
    ['Soda','L',0.90,'Bebidas','Beguda Distribució',[],20,8],
    ['Zumo de lima','L',3.20,'Bebidas','Beguda Distribució',[],6,2],
    ['Sirope de azúcar','L',2.60,'Bebidas','Beguda Distribució',[],5,2],
    // Packaging y limpieza: no entran en ninguna receta, pero un almacén real
    // los tiene y la pantalla de Stock sin ellos se ve a medias.
    ['Caja de burger para delivery','ud',0.22,'Packaging','Envasos Plana',[],900,350],
    ['Bolsa kraft delivery','ud',0.12,'Packaging','Envasos Plana',[],700,300],
    ['Vaso para llevar','ud',0.14,'Packaging','Envasos Plana',[],550,200],
    ['Desengrasante de cocina','L',3.20,'Limpieza','Neteja Osona',[],14,6],
    ['Bolsas de basura','ud',0.09,'Limpieza','Neteja Osona',[],400,150],
    ['Papel de manos (paquete)','ud',0.85,'Limpieza','Neteja Osona',[],60,25],
  ];
  const ingredients = ing.map((x,i)=>({id:i+1, name:x[0], unit:x[1], price:x[2], category:x[3],
    supplier:x[4], allergens:x[5], area:'cocina'}));
  const stock = {};
  ing.forEach((x,i)=>{ stock[i+1] = {qty:x[6], min:x[7]}; });
  const byName = n => (ingredients.find(i => i.name === n) || {}).id;

  const receta = (name, lineas, opts) => Object.assign({
    id: nid(), name, price:0, priceBase:0, ivaPct:10, comensales:1, consumiblesPct:5,
    category:'', ingredients: lineas.map(([n,q]) => ({type:'ingredient', ingredientId: byName(n), qty:q, merma:0})),
    allergens:[], area:'cocina', isBase:false, baseYield:1, baseUnit:'L', steps:'', presentation:'',
  }, opts||{});

  /* Las cuatro elaboraciones de la casa. Son las que hacen que el escandallo
     no sea una lista de la compra: la salsa GG entra en cinco hamburguesas y
     su coste se encadena solo cuando sube el precio de la mayonesa. */
  const salsaGG = receta('Salsa GG de la casa', [
    ['Mayonesa',1.2], ['Kétchup',0.35], ['Pepinillos agridulces',0.18],
    ['Mostaza de Dijon',0.06], ['Mezcla de especias burger',0.02], ['Vinagre de manzana',0.03],
  ], {isBase:true, baseYield:2, baseUnit:'L', consumiblesPct:0, category:'Salsas',
      steps:'Picar el pepinillo muy fino y escurrirlo bien.\nMezclar la mayonesa con el kétchup y la mostaza.\nAñadir el pepinillo, las especias y el vinagre.\nReposar 12 h en cámara antes de usar.',
      presentation:'La salsa de la casa. Va en casi todas las hamburguesas.'});

  const cebollaCaram = receta('Cebolla caramelizada', [
    ['Cebolla',3], ['Azúcar moreno',0.12], ['Mantequilla',0.08], ['Vinagre de manzana',0.06], ['Sal',0.01],
  ], {isBase:true, baseYield:1.4, baseUnit:'kg', consumiblesPct:0, category:'Bases de cocina',
      steps:'Juliana fina de cebolla.\nPochar a fuego muy suave con la mantequilla, 45 min.\nAñadir el azúcar y dejar caramelizar.\nDesglasar con el vinagre y reducir.',
      presentation:'Cebolla pochada muy despacio, hasta que se deshace.'});

  const baconConfitado = receta('Bacon confitado a la barbacoa', [
    ['Bacon en lonchas',1.5], ['Salsa barbacoa',0.2], ['Azúcar moreno',0.08],
  ], {isBase:true, baseYield:1, baseUnit:'kg', consumiblesPct:0, category:'Bases de cocina',
      steps:'Bacon en bandeja, pincelado con la barbacoa y el azúcar.\nHorno a 160 °C, 25 min, girando a mitad.\nEnfriar sobre rejilla para que quede crujiente.',
      presentation:'Crujiente, con el dulce justo.'});

  const pulledPork = receta('Pulled pork', [
    ['Paletilla de cerdo',4], ['Salsa barbacoa',0.5], ['Mezcla de especias burger',0.06],
    ['Cebolla',0.4], ['Azúcar moreno',0.06],
  ], {isBase:true, baseYield:2.4, baseUnit:'kg', consumiblesPct:0, category:'Bases de cocina',
      steps:'Masajear la paletilla con las especias y reposar 12 h.\nHorno a 130 °C, 8 h, tapado con su jugo.\nDeshilachar en caliente y mezclar con la barbacoa.',
      presentation:'Ocho horas de horno. Se deshace solo.'});

  const bases = [salsaGG, cebollaCaram, baconConfitado, pulledPork];
  const conBase = (base, qty) => ({type:'base', baseRecipeId: base.id, qty, merma:0});
  const conIng = (n, qty) => ({type:'ingredient', ingredientId: byName(n), qty, merma:0});

  /* Las hamburguesas llevan sus líneas a mano porque combinan ingredientes
     sueltos con elaboraciones de la casa, y el escandallo tiene que
     encadenarse (salsa GG → mayonesa → precio del proveedor). */
  const burger = (name, price, lineas, opts) => Object.assign(receta(name, [], {}), {
    price, priceBase: price, category:'Hamburguesas', ingredients: lineas,
  }, opts||{});

  const recipes = [
    ...bases,

    // ---------- PARA PICAR ----------
    receta('Patatas GG con salsa de la casa', [['Patata para freír',0.28],['Aceite de girasol',0.03],['Sal',0.003]],
      {price:5.5, priceBase:5.5, category:'Para picar',
       ingredients:[conIng('Patata para freír',0.28), conIng('Aceite de girasol',0.03), conIng('Sal',0.003), conBase(salsaGG,0.04)],
       steps:'Patata cortada del día, primera fritura a 140 °C.\nSegunda fritura a 180 °C al pase.\nSal en caliente y salsa GG aparte.',
       presentation:'Doble fritura, con la salsa de la casa al lado.'}),
    receta('Aros de cebolla crujientes', [['Cebolla',0.18],['Harina',0.05],['Panko',0.05],['Huevos',1],['Aceite de girasol',0.04]],
      {price:5.9, priceBase:5.9, category:'Para picar',
       steps:'Aros gruesos de cebolla.\nHarina, huevo y panko.\nFreír a 180 °C hasta dorar.',
       presentation:'Rebozado de panko, bien crujiente.'}),
    receta('Nachos con cheddar y jalapeños', [['Nachos de maíz',0.12],['Queso cheddar en lonchas',0.09],['Jalapeños en vinagre',0.03],['Tomate',0.05],['Cebolla morada',0.03]],
      {price:8.5, priceBase:8.5, category:'Para picar',
       steps:'Fundir el cheddar con un poco de nata.\nMontar los nachos, salsear y gratinar 2 min.\nTerminar con el pico de tomate y cebolla.',
       presentation:'Para compartir, con cheddar fundido de verdad.'}),
    receta('Alitas a la barbacoa', [['Pechuga de pollo',0.25],['Salsa barbacoa',0.05],['Mezcla de especias burger',0.005],['Aceite de girasol',0.02]],
      {price:8.9, priceBase:8.9, category:'Para picar',
       steps:'Marinar 6 h con las especias.\nHorno 25 min y terminar a la parrilla.\nGlasear con la barbacoa al pase.',
       presentation:'Marinadas la víspera y glaseadas al pase.'}),
    receta('Bocados de pollo crujiente', [['Pechuga de pollo',0.16],['Panko',0.05],['Harina',0.03],['Huevos',1],['Aceite de girasol',0.035]],
      {price:7.5, priceBase:7.5, category:'Para picar',
       ingredients:[conIng('Pechuga de pollo',0.16), conIng('Panko',0.05), conIng('Harina',0.03), conIng('Huevos',1), conIng('Aceite de girasol',0.035), conBase(salsaGG,0.04)],
       steps:'Pollo en dados, salmuera 2 h.\nHarina, huevo y panko.\nFreír a 175 °C, 4 min.',
       presentation:'Con salsa GG para mojar.'}),

    // ---------- HAMBURGUESAS ----------
    burger('GG Classic', 11.5, [
      conIng('Carne picada vacuno madurado',0.16), conIng('Pan brioche de burger',1),
      conIng('Queso cheddar en lonchas',0.03), conIng('Lechuga iceberg',0.05),
      conIng('Tomate',0.04), conBase(salsaGG,0.03), conBase(cebollaCaram,0.02),
    ], {steps:'Bola de 160 g, a la plancha bien caliente.\nFundir el cheddar sobre la carne.\nPan tostado en la misma plancha.\nMontar: salsa, lechuga, tomate, carne, cebolla.',
        presentation:'La de siempre, como tiene que ser.',
        deliverySupplement:1}),
    burger('Doble Cheese', 14.5, [
      conIng('Carne picada vacuno madurado',0.3), conIng('Pan brioche de burger',1),
      conIng('Queso cheddar en lonchas',0.06), conIng('Pepinillos agridulces',0.02),
      conBase(salsaGG,0.035), conIng('Cebolla',0.02),
    ], {steps:'Dos bolas de 150 g aplastadas en plancha (smash).\nDoble loncha de cheddar entre las dos carnes.\nPepinillo y cebolla picada.',
        presentation:'Doble carne, doble cheddar. Sin adornos.',
        deliverySupplement:1}),
    burger('Bacon & Blue', 14.9, [
      conIng('Carne picada vacuno madurado',0.18), conIng('Pan de semillas',1),
      conIng('Queso azul',0.035), conIng('Rúcula',0.015),
      conBase(baconConfitado,0.04), conBase(cebollaCaram,0.03), conBase(salsaGG,0.02),
    ], {steps:'Carne al punto pedido.\nFundir el azul al final, con campana.\nBacon confitado encima, rúcula al montar.',
        presentation:'Queso azul y bacon confitado, sobre pan de semillas.',
        deliverySupplement:1}),
    burger('Smoky BBQ', 13.9, [
      conIng('Pan brioche de burger',1), conBase(pulledPork,0.13),
      conIng('Queso cheddar en lonchas',0.03), conIng('Cebolla morada',0.02),
      conIng('Salsa barbacoa',0.02), conIng('Lechuga iceberg',0.04),
    ], {steps:'Calentar el pulled pork con un poco más de barbacoa.\nPan tostado con mantequilla.\nMontar con cheddar fundido y cebolla morada en aros finos.',
        presentation:'Nuestro pulled pork de ocho horas.',
        deliverySupplement:1}),
    burger('Crispy Chicken', 12.9, [
      conIng('Pechuga de pollo',0.17), conIng('Pan brioche de burger',1),
      conIng('Panko',0.05), conIng('Harina',0.03), conIng('Huevos',1),
      conIng('Aceite de girasol',0.035), conIng('Lechuga iceberg',0.05), conBase(salsaGG,0.03),
    ], {steps:'Pechuga en salmuera 4 h.\nHarina, huevo y panko; freír a 175 °C, 6 min.\nMontar con lechuga y salsa GG.',
        presentation:'Pollo crujiente de verdad, no empanado industrial.',
        deliverySupplement:1}),
    burger('Green Garden', 11.9, [
      conIng('Champiñón portobello',0.18), conIng('Pan de semillas',1),
      conIng('Mozzarella rallada',0.04), conIng('Aguacate',0.5),
      conIng('Rúcula',0.015), conIng('Tomate',0.04), conBase(salsaGG,0.03),
    ], {steps:'Portobello marcado a la plancha con ajo y aceite.\nFundir la mozzarella encima.\nAguacate laminado al montar.',
        presentation:'Vegetariana, con portobello a la plancha.',
        deliverySupplement:1}),
    burger('Spicy Jalapeño', 13.5, [
      conIng('Carne picada vacuno madurado',0.17), conIng('Pan brioche de burger',1),
      conIng('Queso cheddar en lonchas',0.035), conIng('Jalapeños en vinagre',0.025),
      conIng('Pasta de chipotle',0.01), conIng('Mayonesa',0.025), conIng('Cebolla morada',0.02),
    ], {steps:'Mayonesa de chipotle: mezclar y reposar.\nCarne al punto, cheddar fundido.\nJalapeños al montar, generosos.',
        presentation:'Pica de verdad. Avisar en sala.',
        deliverySupplement:1}),
    burger('La GG Grande', 16.5, [
      conIng('Carne picada vacuno madurado',0.32), conIng('Pan brioche de burger',1),
      conIng('Queso cheddar en lonchas',0.06), conBase(baconConfitado,0.04),
      conBase(cebollaCaram,0.03), conBase(salsaGG,0.04),
      conIng('Lechuga iceberg',0.04), conIng('Tomate',0.04),
    ], {steps:'Dos carnes de 160 g.\nCheddar entre ambas y bacon confitado encima.\nMontaje alto: se sirve con brocheta.',
        presentation:'La grande. Se come con las dos manos.',
        deliverySupplement:1.5}),

    // ---------- POSTRES ----------
    receta('Brownie con helado', [['Chocolate 70%',0.05],['Mantequilla',0.025],['Huevos',1],['Azúcar moreno',0.04],['Harina',0.02],['Helado de vainilla',0.08]],
      {price:6.5, priceBase:6.5, category:'Postres',
       steps:'Brownie del día, horneado por la mañana.\nCalentar la porción 30 s antes de servir.\nBola de vainilla encima.',
       presentation:'Tibio, con helado que se derrite por encima.'}),
    receta('Cheesecake de la casa', [['Queso crema',0.11],['Galleta para base',0.03],['Huevos',1],['Nata 35%',0.05],['Azúcar moreno',0.03],['Mantequilla',0.015]],
      {price:6.0, priceBase:6.0, category:'Postres',
       steps:'Base de galleta con mantequilla, prensada.\nRelleno al horno 45 min a 150 °C.\nReposo de 24 h en cámara.',
       presentation:'Cremoso, con base de galleta.'}),
    receta('Batido de vainilla', [['Helado de vainilla',0.18],['Nata 35%',0.05]],
      {price:5.5, priceBase:5.5, category:'Postres',
       steps:'Batir el helado con la nata bien fría.\nServir en vaso alto.',
       presentation:'Espeso, de cuchara.'}),

    // ---------- BEBIDAS (sala) ----------
    receta('Refresco', [['Refresco de cola (lata)',1]], {price:2.6, priceBase:2.6, category:'Bebidas', area:'sala', consumiblesPct:0, steps:'', presentation:'Cola, naranja o limón.'}),
    receta('Agua mineral', [['Agua mineral 50 cl',1]], {price:1.9, priceBase:1.9, category:'Bebidas', area:'sala', consumiblesPct:0}),
    receta('Cerveza tercio', [['Cerveza tercio',1]], {price:3.2, priceBase:3.2, category:'Bebidas', area:'sala', consumiblesPct:0}),
    receta('Caña de barril', [['Cerveza de barril',0.33]], {price:2.8, priceBase:2.8, category:'Bebidas', area:'sala', consumiblesPct:0}),
    receta('Copa de vino tinto', [['Vino tinto DO (botella)',0.2]], {price:3.5, priceBase:3.5, category:'Bebidas', area:'sala', consumiblesPct:0}),
    receta('Copa de vino blanco', [['Vino blanco DO (botella)',0.2]], {price:3.4, priceBase:3.4, category:'Bebidas', area:'sala', consumiblesPct:0}),

    // ---------- CÓCTELES (sala) ----------
    receta('Mojito', [['Ron blanco',0.05],['Lima',0.06],['Menta fresca',0.25],['Sirope de azúcar',0.02],['Soda',0.1]],
      {price:8.5, priceBase:8.5, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Machacar la lima con el sirope, sin romper la menta.\nHielo picado, ron y remover desde el fondo.\nRematar con soda y menta golpeada.',
       presentation:'En vaso alto, con mucha menta.'}),
    receta('Gin Tonic premium', [['Ginebra premium',0.05],['Tónica',1],['Limón',0.03]],
      {price:9.5, priceBase:9.5, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Copa bien fría con hielo de bola.\nGinebra, y tónica resbalando por la cuchara.\nPiel de limón, sin la parte blanca.',
       presentation:'En copa de balón, con piel de limón.'}),
    receta('Margarita', [['Tequila',0.045],['Triple seco',0.02],['Zumo de lima',0.025],['Sal',0.002]],
      {price:9.0, priceBase:9.0, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Escarchar media copa con sal.\nAgitar con hielo 12 s.\nDoble colado.',
       presentation:'Media copa escarchada, no entera.'}),
    receta('Negroni', [['Ginebra premium',0.03],['Vermut rojo',0.03],['Bitter rojo',0.03],['Naranja',0]],
      {price:9.5, priceBase:9.5, category:'Cócteles', area:'sala', consumiblesPct:3,
       ingredients:[{type:'ingredient', ingredientId: byName('Ginebra premium'), qty:0.03, merma:0},
                    {type:'ingredient', ingredientId: byName('Vermut rojo'), qty:0.03, merma:0},
                    {type:'ingredient', ingredientId: byName('Bitter rojo'), qty:0.03, merma:0}],
       steps:'Partes iguales, removido en vaso mezclador.\nHielo de roca grande.\nPiel de naranja expresada.',
       presentation:'Removido, nunca agitado.'}),
    receta('Moscow Mule', [['Vodka',0.05],['Cerveza de jengibre',1],['Lima',0.04]],
      {price:9.0, priceBase:9.0, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Vaso de cobre con hielo hasta arriba.\nVodka y zumo de lima.\nRematar con la cerveza de jengibre.',
       presentation:'En vaso de cobre, muy frío.'}),
    receta('Old Fashioned', [['Bourbon',0.06],['Sirope de azúcar',0.01],['Limón',0.02]],
      {price:10.0, priceBase:10.0, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Sirope y unas gotas de angostura en el vaso.\nBourbon y hielo grande, remover 20 s.\nPiel de naranja quemada.',
       presentation:'Sobre un solo hielo grande.'}),
    receta('Americano', [['Vermut rojo',0.04],['Bitter rojo',0.04],['Soda',0.08]],
      {price:8.0, priceBase:8.0, category:'Cócteles', area:'sala', consumiblesPct:3,
       steps:'Vermut y bitter sobre hielo.\nRematar con soda.\nMedia rodaja de naranja.',
       presentation:'El aperitivo de siempre.'}),
  ];

  /* Extras de la carta: es lo que más se usa en una hamburguesería y lo que
     hace que la comanda del TPV se vea como una de verdad. */
  const extrasBurger = () => [
    {id: nid(), nombre:'Extra de carne', precio:3.20},
    {id: nid(), nombre:'Extra de cheddar', precio:1.10},
    {id: nid(), nombre:'Extra de bacon', precio:1.60},
    {id: nid(), nombre:'Pan sin gluten', precio:1.00},
    {id: nid(), nombre:'Sin cebolla', precio:0},
    {id: nid(), nombre:'Sin salsa', precio:0},
  ];

  const platosCarta = (cat, extras) => recipes.filter(r => r.category === cat && !r.isBase)
    .map(r => ({id: nid(), recipeId: r.id, nombre: r.name, precio: r.price, precioBase: r.priceBase,
                ivaPct: 10, disponible: true, deliverySupplement: r.deliverySupplement || null,
                modificadores: extras ? extrasBurger() : []}));

  const cartaComida = {id: nid(), nombre:'CARTA GG BURGER', tipo:'GENERAL', desde:'', hasta:'', dias:[0,1,2,3,4,5,6],
    secciones: [
      {id: nid(), nombre:'Para picar', platos: platosCarta('Para picar')},
      {id: nid(), nombre:'Hamburguesas', platos: platosCarta('Hamburguesas', true)},
      {id: nid(), nombre:'Postres', platos: platosCarta('Postres')},
    ]};
  const cartaBarra = {id: nid(), nombre:'BEBIDAS Y CÓCTELES', tipo:'GENERAL', desde:'', hasta:'', dias:[0,1,2,3,4,5,6],
    area:'sala',
    secciones: [
      {id: nid(), nombre:'Bebidas', platos: platosCarta('Bebidas')},
      {id: nid(), nombre:'Cócteles', platos: platosCarta('Cócteles')},
    ]};

  /* El menú promo: es lo que más se vende entre semana al mediodía, y de paso
     enseña la pantalla de Menús, que sin nada dentro se queda vacía. */
  const burgersDelMenu = recipes.filter(r => r.category === 'Hamburguesas' && r.price <= 13.9);
  const menuGG = {
    id: nid(), nombre:'MENÚ GG', precio: 15.9, dias:[1,2,3,4,5],
    horario: Array.from({length:7}, (_,i)=>({activo: i<5, desde:'12:30', hasta:'16:00'})),
    disponible: true,
    grupos: [
      {id: nid(), nombre:'Elige tu hamburguesa', opciones: burgersDelMenu.map(r => ({
        id: nid(), recipeId: r.id, nombre: r.name, suplemento: r.price > 12.9 ? 1 : 0, disponible: true, modificadores: []}))},
      {id: nid(), nombre:'Acompañamiento', opciones: [
        {id: nid(), recipeId: recipes.find(r=>r.name==='Patatas GG con salsa de la casa').id, nombre:'Patatas GG', suplemento:0, disponible:true, modificadores:[]},
        {id: nid(), recipeId: recipes.find(r=>r.name==='Aros de cebolla crujientes').id, nombre:'Aros de cebolla', suplemento:0.5, disponible:true, modificadores:[]},
      ]},
      {id: nid(), nombre:'Bebida', opciones: [
        {id: nid(), recipeId: recipes.find(r=>r.name==='Refresco').id, nombre:'Refresco', suplemento:0, disponible:true, modificadores:[]},
        {id: nid(), recipeId: recipes.find(r=>r.name==='Agua mineral').id, nombre:'Agua', suplemento:0, disponible:true, modificadores:[]},
        {id: nid(), recipeId: recipes.find(r=>r.name==='Caña de barril').id, nombre:'Caña', suplemento:0.4, disponible:true, modificadores:[]},
      ]},
    ],
  };

  return {
    business: {
      nombre: 'GG Burger', nombreComercial: 'GG Burger',
      tipo: 'Hamburguesería', ciudad: 'Sabadell', ivaPct: 10,
      netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true,
    },
    ingredients, stock,
    ingredientCategories: [],
    recipeCategories: ['Para picar','Hamburguesas','Postres','Bebidas','Cócteles','Salsas','Bases de cocina'],
    recipes,
    elaboraciones: bases.map(b => ({id: nid(), recipeId: b.id, name: b.name,
      unit: b.baseUnit, qty: b.baseUnit==='L' ? 3 : 2.2, min: b.baseUnit==='L' ? 1.5 : 1, area:'cocina'})),
    providers: [
      {id: nid(), nombre:'Cárnicas Vallès', tel:'937 220 415', contacto:'Jordi', pago:'15 días', diasEntrega:['Lunes','Miércoles','Viernes'], horaEntrega:'07:00', email:'pedidos@carniquesvalles.cat'},
      {id: nid(), nombre:'Forn del Barri', tel:'937 118 902', contacto:'Rosa', pago:'Contado', diasEntrega:['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'], horaEntrega:'07:30', email:''},
      {id: nid(), nombre:'Fruites Martí', tel:'937 445 330', contacto:'Martí', pago:'30 días', diasEntrega:['Martes','Jueves','Sábado'], horaEntrega:'06:30', email:''},
      {id: nid(), nombre:'Làctics Pirineu', tel:'973 662 118', contacto:'Anna', pago:'30 días', diasEntrega:['Martes','Viernes'], horaEntrega:'08:00', email:''},
      {id: nid(), nombre:'Distribucions Camp', tel:'938 330 774', contacto:'Sergi', pago:'30 días', diasEntrega:['Miércoles'], horaEntrega:'09:00', email:'comandes@distcamp.cat'},
      {id: nid(), nombre:'Beguda Distribució', tel:'937 909 221', contacto:'Laura', pago:'15 días', diasEntrega:['Lunes','Jueves'], horaEntrega:'08:30', email:''},
      {id: nid(), nombre:'Envasos Plana', tel:'937 556 140', contacto:'Pau', pago:'Contado', diasEntrega:['Viernes'], horaEntrega:'10:00', email:''},
      {id: nid(), nombre:'Neteja Osona', tel:'938 887 201', contacto:'Rocío', pago:'30 días', diasEntrega:['Viernes'], horaEntrega:'10:30', email:''},
    ],
    cartas: [cartaComida, cartaBarra],
    menus: [menuGG],
    tables: [
      {id: nid(), name:'1', plazas:2}, {id: nid(), name:'2', plazas:2},
      {id: nid(), name:'3', plazas:4}, {id: nid(), name:'4', plazas:4},
      {id: nid(), name:'5', plazas:4}, {id: nid(), name:'6', plazas:6},
      {id: nid(), name:'7', plazas:6}, {id: nid(), name:'8', plazas:2},
      {id: nid(), name:'Terraza 1', plazas:4}, {id: nid(), name:'Terraza 2', plazas:4},
      {id: nid(), name:'Terraza 3', plazas:6}, {id: nid(), name:'Barra 1', plazas:2},
      {id: nid(), name:'Barra 2', plazas:2}, {id: nid(), name:'Barra 3', plazas:2},
    ],
    /* Doce personas, repartidas como en una hamburguesería de verdad: seis en
       cocina (parrilla y freidora son puestos, no categorías) y seis en sala,
       con un repartidor para los pedidos a domicilio propios. Dos jefes de
       partida con permiso de edición, que es el caso que más cuesta explicar
       y aquí se ve funcionando. */
    employees: [
      {id: nid(), name:'Álex Romero',  rol:'Jefe de cocina',     color:'#D97C3F', area:'cocina', phone:'600 210 114', canUnlockEdit:true,  vacationDaysPerYear:30},
      {id: nid(), name:'Nadia Ferrer', rol:'Segunda de cocina',  color:'#2E6FBA', area:'cocina', phone:'600 210 115', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Iván Costa',   rol:'Parrilla',           color:'#1F8A4C', area:'cocina', phone:'600 210 116', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Youssef El Amrani', rol:'Freidora',      color:'#8A4A3B', area:'cocina', phone:'600 210 117', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Lucía Prats',  rol:'Ayudante de cocina', color:'#6B4FA0', area:'cocina', phone:'600 210 118', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Dani Vega',    rol:'Office',             color:'#B2472F', area:'cocina', phone:'600 210 119', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Clara Ibáñez', rol:'Encargada de sala',  color:'#0E7C86', area:'sala',   phone:'600 210 120', canUnlockEdit:true,  vacationDaysPerYear:30},
      {id: nid(), name:'Marc Solé',    rol:'Camarero',           color:'#A0522D', area:'sala',   phone:'600 210 121', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Rita Nogueira',rol:'Camarera',           color:'#7A3E8F', area:'sala',   phone:'600 210 122', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Toni Bauzá',   rol:'Barra y coctelería', color:'#1D6F5C', area:'sala',   phone:'600 210 123', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Sofía León',   rol:'Camarera',           color:'#C2553D', area:'sala',   phone:'600 210 124', canUnlockEdit:false, vacationDaysPerYear:30},
      {id: nid(), name:'Óscar Marín',  rol:'Reparto a domicilio',color:'#41618C', area:'sala',   phone:'600 210 125', canUnlockEdit:false, esRepartidor:true, vacationDaysPerYear:30},
    ],
    dias: {dia},
    idrAdn: {
      cocina:'Hamburguesas de carne madurada, a la plancha. Cocina americana de barrio, sin florituras',
      nivel:'Hamburguesería de barrio, producto bueno y precio justo',
      publico:'Familias y grupos de amigos el fin de semana; oficinas al mediodía entre semana',
      producto:'Carne madurada de proximidad, pan brioche del horno del barrio, salsas propias',
      equipamiento:'Plancha de doble cara, dos freidoras, horno de convección, abatidor. Sin Roner ni ahumador.',
      equipo:'Jefe de cocina, segunda, parrilla, freidora y dos ayudantes',
      foodCostObjetivo:30,
      lineasRojas:'Nada de carne congelada ni de pan industrial. Nada de esferificaciones ni humos.',
      dietas:'Siempre una opción vegetariana y pan sin gluten disponible',
      idiomaPlatos:'Castellano',
      insignia:'La GG Grande, doble carne con bacon confitado',
    },
  };
})();
