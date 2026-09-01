/* Los datos de la demo: un bistró catalán con tres meses de vida.
   No son datos de relleno — son coherentes entre sí, porque una demo con
   números imposibles (un plato al 4% de food cost, un empleado sin turnos,
   una carta sin escandallo) se le nota a un hostelero en diez segundos y
   deja de creerse lo demás. */
window.GG_DEMO_DATOS = (function(){
  const hoy = new Date();
  const dia = n => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10); };
  let id = 1000; const nid = () => ++id;

  const ing = [
    ['Bacalao desalado','g',0.028,'Pescado','Peix del Port',['Pescado'],4000,1500],
    ['Calabaza','kg',1.40,'Verduras','Hortalisses Vic',[],12,4],
    ['Cebolla','kg',0.95,'Verduras','Hortalisses Vic',[],25,8],
    ['Puerro','kg',1.80,'Verduras','Hortalisses Vic',[],6,2],
    ['Zanahoria','kg',1.10,'Verduras','Hortalisses Vic',[],9,3],
    ['Huesos de ternera','kg',2.20,'Carnicería','Cárnicas Pérez',[],14,5],
    ['Panceta ibérica','kg',9.80,'Carnicería','Cárnicas Pérez',[],6,2],
    ['Solomillo de ternera','kg',24.50,'Carnicería','Cárnicas Pérez',[],5,2],
    ['Aceite de oliva virgen','L',6.20,'Aceites','Oli de Ponent',[],20,6],
    ['Vino tinto','L',3.40,'Bodega','Celler Roure',['Sulfitos'],18,6],
    ['Garbanzos cocidos','kg',2.30,'Legumbres','Llegums SA',[],10,3],
    ['Espinacas','kg',3.60,'Verduras','Hortalisses Vic',[],4,2],
    ['Piñones','kg',28.00,'Frutos secos','Fruits Secs Coll',['Frutos de cáscara'],1.2,0.5],
    ['Pasas','kg',6.40,'Frutos secos','Fruits Secs Coll',[],2,0.5],
    ['Harina','kg',0.85,'Secos','Distribucions Camp',['Gluten'],15,5],
    ['Mantequilla','kg',8.90,'Lácteos','Làctics Pirineu',['Lácteos'],4,1.5],
    ['Nata 35%','L',4.10,'Lácteos','Làctics Pirineu',['Lácteos'],8,3],
    ['Huevos','ud',0.28,'Huevos','Ous del Camp',['Huevos'],180,60],
    ['Azúcar','kg',1.05,'Secos','Distribucions Camp',[],8,3],
    ['Manzana','kg',1.60,'Frutas','Hortalisses Vic',[],7,2],
    ['Vinagre de Jerez','L',7.50,'Vinagres','Oli de Ponent',['Sulfitos'],3,1],
    ['Miel','kg',9.20,'Secos','Distribucions Camp',[],2,0.5],
    ['Mostaza de Dijon','kg',6.80,'Secos','Distribucions Camp',['Mostaza'],1.5,0.5],
    ['Pan de payés','kg',3.20,'Panadería','Forn Vell',['Gluten'],6,2],
    ['Sepia','kg',12.50,'Pescado','Peix del Port',['Moluscos'],5,2],
    ['Arroz bomba','kg',3.80,'Secos','Distribucions Camp',[],12,4],
    ['Tomate maduro','kg',1.90,'Verduras','Hortalisses Vic',[],11,4],
    ['Ajo','kg',4.20,'Verduras','Hortalisses Vic',[],3,1],
    ['Chocolate 70%','kg',12.00,'Repostería','Distribucions Camp',['Soja'],3,1],
    ['Cerveza artesana','ud',0.95,'Bodega','Celler Roure',['Gluten'],120,48],
    ['Pimiento rojo','kg',2.40,'Verduras','Hortalisses Vic',[],8,3],
    ['Berenjena','kg',1.80,'Verduras','Hortalisses Vic',[],7,3],
    ['Anchoa del Cantábrico','kg',45.00,'Conservas','Peix del Port',['Pescado'],1.5,0.5],
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

  const fondo = receta('Fondo oscuro de ternera', [
    ['Huesos de ternera',4], ['Cebolla',0.6], ['Puerro',0.3], ['Zanahoria',0.4],
    ['Tomate maduro',0.2], ['Vino tinto',0.5], ['Aceite de oliva virgen',0.05],
  ], {isBase:true, baseYield:4, baseUnit:'L', consumiblesPct:0,
      steps:'Tostar los huesos en el horno hasta que estén bien dorados.\nSofreír la verdura hasta que coja color.\nDesglasar con el vino y reducir.\nCubrir con agua fría y cocer 6 h sin que hierva.\nColar sin apretar y abatir.',
      presentation:'Base para guisos, salsas de carne y para napar las piezas de brasa.'});

  const recipes = [
    fondo,
    receta('Escalivada tibia con anchoa', [['Pimiento rojo',0.15],['Berenjena',0.15],['Cebolla',0.08],['Anchoa del Cantábrico',0.02],['Pan de payés',0.05],['Aceite de oliva virgen',0.02],['Vinagre de Jerez',0.005]],
      {price:9.5, priceBase:9.5, category:'Entrantes', steps:'Asar las verduras enteras al horno.\nPelar en caliente y guardar el jugo.\nAliñar y servir tibia sobre el pan tostado.', presentation:'Verduras asadas, tibias, con su jugo y pan de payés.'}),
    receta('Espinacas a la catalana', [['Espinacas',0.18],['Piñones',0.012],['Pasas',0.015],['Ajo',0.005],['Aceite de oliva virgen',0.015]],
      {price:9.0, priceBase:9.0, category:'Entrantes', steps:'Hidratar las pasas.\nTostar los piñones.\nSaltear el ajo, añadir las espinacas y terminar con la picada.', presentation:'El salteado de siempre, con su picada.'}),
    receta('Calabaza a la brasa con panceta', [['Calabaza',0.25],['Panceta ibérica',0.04],['Piñones',0.01],['Aceite de oliva virgen',0.02],['Vinagre de Jerez',0.01],['Miel',0.008],['Mostaza de Dijon',0.005]],
      {price:11.5, priceBase:11.5, category:'Entrantes', steps:'Cuñas gruesas de calabaza a la brasa.\nPanceta crujiente en la plancha.\nVinagreta de miel y mostaza al pase.', presentation:'Calabaza a la brasa, panceta ibérica y vinagreta de miel.'}),
    receta('Arroz de sepia', [['Arroz bomba',0.09],['Sepia',0.12],['Tomate maduro',0.04],['Ajo',0.005],['Aceite de oliva virgen',0.015]],
      {price:17.0, priceBase:17.0, category:'Principales',
       ingredients:[{type:'ingredient', ingredientId:byName('Arroz bomba'), qty:0.09, merma:0},
                    {type:'ingredient', ingredientId:byName('Sepia'), qty:0.12, merma:0},
                    {type:'base', baseRecipeId: fondo.id, qty:0.28, merma:0},
                    {type:'ingredient', ingredientId:byName('Tomate maduro'), qty:0.04, merma:0},
                    {type:'ingredient', ingredientId:byName('Ajo'), qty:0.005, merma:0},
                    {type:'ingredient', ingredientId:byName('Aceite de oliva virgen'), qty:0.015, merma:0}],
       steps:'Marcar la sepia.\nSofrito.\nNacarar el arroz y mojar con el fondo caliente.\nTerminar en el horno y reposar.',
       presentation:'Arroz seco de sepia con nuestro fondo.'}),
    receta('Bacalao a la llauna', [['Bacalao desalado',160],['Garbanzos cocidos',0.12],['Cebolla',0.06],['Tomate maduro',0.05],['Ajo',0.005],['Harina',0.01],['Aceite de oliva virgen',0.025]],
      {price:18.5, priceBase:18.5, category:'Principales', steps:'Enharinar y marcar el lomo.\nSofrito con los garbanzos.\nTerminar al horno.', presentation:'El bacalao de la casa, con garbanzos y su sofrito.'}),
    receta('Solomillo con su jugo', [['Solomillo de ternera',0.18],['Cebolla',0.03]],
      {price:23.0, priceBase:23.0, category:'Principales',
       ingredients:[{type:'ingredient', ingredientId:byName('Solomillo de ternera'), qty:0.18, merma:0},
                    {type:'base', baseRecipeId: fondo.id, qty:0.12, merma:0},
                    {type:'ingredient', ingredientId:byName('Cebolla'), qty:0.03, merma:0}],
       steps:'Marcar a la brasa al punto pedido.\nReducir el fondo y napar al pase.',
       presentation:'A la brasa, napado con nuestro fondo oscuro.'}),
    receta('Manzana asada con chocolate', [['Manzana',0.18],['Chocolate 70%',0.03],['Nata 35%',0.04],['Azúcar',0.015],['Mantequilla',0.01]],
      {price:6.5, priceBase:6.5, category:'Postres', steps:'Asar la manzana con azúcar y mantequilla.\nCrema de chocolate con la nata.', presentation:'Manzana del horno, tibia, con crema de chocolate.'}),
  ];

  const platosCarta = (cat) => recipes.filter(r => r.category === cat && !r.isBase)
    .map(r => ({id: nid(), recipeId: r.id, nombre: r.name, precio: r.price, precioBase: r.priceBase,
                ivaPct: 10, disponible: true, modificadores: []}));

  return {
    business: {
      nombre: 'Cal Ramon', nombreComercial: 'Cal Ramon',
      tipo: 'Bistró de mercado', ciudad: 'Vic', ivaPct: 10,
      netlifySetupDone: true, extConnPromptSeen: true, tourSeen: true, categoryIconHintSeen: true,
    },
    ingredients, stock,
    ingredientCategories: [], recipeCategories: ['Entrantes','Principales','Postres'],
    recipes,
    elaboraciones: [{id: nid(), recipeId: fondo.id, name: fondo.name, unit:'L', qty: 6, min: 3, area:'cocina'}],
    providers: [
      {id: nid(), nombre:'Hortalisses Vic', tel:'938 812 233', contacto:'Marta', pago:'30 días', diaEntrega:'Martes y viernes', horaEntrega:'07:00'},
      {id: nid(), nombre:'Peix del Port', tel:'972 340 118', contacto:'Quim', pago:'Contado', diaEntrega:'Martes, jueves y sábado', horaEntrega:'06:30'},
      {id: nid(), nombre:'Cárnicas Pérez', tel:'938 445 907', contacto:'Luis', pago:'15 días', diaEntrega:'Lunes y jueves', horaEntrega:'08:00'},
      {id: nid(), nombre:'Forn Vell', tel:'938 110 442', contacto:'Rosa', pago:'Contado', diaEntrega:'Cada día', horaEntrega:'07:30'},
    ],
    cartas: [{id: nid(), nombre:'CARTA DE OTOÑO', tipo:'GENERAL', desde:'', hasta:'', dias:[0,1,2,3,4,5,6],
      secciones: [
        {id: nid(), nombre:'Entrantes', platos: platosCarta('Entrantes')},
        {id: nid(), nombre:'Principales', platos: platosCarta('Principales')},
        {id: nid(), nombre:'Postres', platos: platosCarta('Postres')},
      ]}],
    tables: [
      {id: nid(), name:'1', plazas:2}, {id: nid(), name:'2', plazas:2},
      {id: nid(), name:'3', plazas:4}, {id: nid(), name:'4', plazas:4},
      {id: nid(), name:'5', plazas:6}, {id: nid(), name:'Terraza 1', plazas:4},
      {id: nid(), name:'Terraza 2', plazas:4}, {id: nid(), name:'Barra', plazas:6},
    ],
    employees: [
      {id: nid(), name:'Ramon', rol:'Jefe de cocina', color:'#D97C3F', area:'cocina'},
      {id: nid(), name:'Nuria', rol:'Cocinera', color:'#2E6FBA', area:'cocina'},
      {id: nid(), name:'Ayoub', rol:'Ayudante', color:'#1F8A4C', area:'cocina'},
      {id: nid(), name:'Laia', rol:'Sala', color:'#8A4A3B', area:'sala'},
      {id: nid(), name:'Marc', rol:'Sala', color:'#6B4FA0', area:'sala'},
    ],
    dias: {dia},
    idrAdn: {
      cocina:'Catalana de mercado, con brasa',
      nivel:'Bistró de barrio, mantel de papel y buen producto',
      publico:'Vecinos y oficinas al mediodía; parejas los fines de semana',
      producto:'Mercado y temporada, proveedor de proximidad',
      equipamiento:'Horno mixto, brasa de carbón, abatidor. Sin Roner ni deshidratador.',
      equipo:'2 cocineros y un ayudante',
      foodCostObjetivo:30,
      lineasRojas:'Nada de espumas ni esferificaciones. Nada de cocina asiática.',
      dietas:'Siempre una opción vegetariana y una sin gluten',
      idiomaPlatos:'Catalán y castellano',
      insignia:'El bacalao a la llauna de la abuela',
    },
  };
})();
