// Semilla compartida de las pruebas de la web pública (reservagastrogoan.html): un negocio completo
// con logo OSCURO (el caso que se perdía sobre la franja negra), dos cartas con carpetas, dos menús,
// mesas, horario de siete días y delivery con código postal. Se inyecta en DB como haría loadBusinessInfo().
export const LOGO_OSCURO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect width="160" height="60" fill="none"/><text x="80" y="40" font-family="Georgia,serif" font-size="30" font-weight="700" text-anchor="middle" fill="#000">Casa Paco</text></svg>');
export const LOGO_CLARO = LOGO_OSCURO.replace('fill%3D%22%23000%22', 'fill%3D%22%23fff%22');
export function semilla(opts = {}){
  const plato = (id, nombre, precio, extra = {}) => Object.assign({id, nombre, precio, disponible:true, modificadores:[]}, extra);
  const dia = {abierto:true, modo:'turnos', turnos:[{ini:'13:00', fin:'16:00'}, {ini:'20:00', fin:'23:30'}]};
  return {
    business: {
      name:'Casa Paco', phone:'611222333', email:'hola@casapaco.es', address:'Calle Mayor 12, Madrid', schedule:'Lun-Dom 13:00-16:00 · 20:00-23:30',
      logo: opts.logo === undefined ? LOGO_OSCURO : opts.logo,
      tiposServicio:{mesa:true, takeaway:true, delivery:true},
      horario:[dia, dia, dia, dia, dia, dia, dia],
      pedidos:{deliveryFee:2.5, freeDeliveryFrom:30, pedidoMinimo:12, cpList:['28001','28002','28003'], tiempoBasePrep:20, aceptaEfectivo:true, aceptaTarjetaLocal:true},
    },
    cartas: [
      {id:1, nombre:'Carta', area:'cocina', secciones:[
        {id:1, nombre:'Entrantes', platos:[plato(11,'Croquetas de jamón',9.5,{descripcion:'Seis unidades, bechamel de la casa'}), plato(12,'Ensaladilla rusa',8), plato(13,'Pulpo a la brasa',16.5)]},
        {id:2, nombre:'Hamburguesas', platos:[plato(21,'Hamburguesa Paco',13.5,{modificadores:[{id:1,nombre:'Extra de queso',precio:1},{id:2,nombre:'Bacon',precio:1.5}]}), plato(22,'Hamburguesa vegana',12.5)]},
        {id:3, nombre:'Postres', platos:[plato(31,'Tarta de queso',6), plato(32,'Brownie con helado',6.5)]},
      ]},
      {id:2, nombre:'Bebidas', area:'sala', secciones:[
        {id:4, nombre:'Refrescos', platos:[plato(41,'Agua',2), plato(42,'Cola',2.5)]},
        {id:5, nombre:'Vinos', platos:[plato(51,'Copa de tinto',3.5), plato(52,'Copa de blanco',3.5)]},
      ]},
    ],
    activeCartaIds:[1, 2],
    menus: [
      {id:1, nombre:'Menú del día', precio:14.9, disponible:true, grupos:[
        {id:1, nombre:'Primero', opciones:[{id:101,nombre:'Ensalada mixta',disponible:true},{id:102,nombre:'Lentejas',disponible:true}]},
        {id:2, nombre:'Segundo', opciones:[{id:103,nombre:'Merluza a la plancha',disponible:true},{id:104,nombre:'Entrecot',suplemento:3,disponible:true}]},
        {id:3, nombre:'Postre', opciones:[{id:105,nombre:'Flan',disponible:true},{id:106,nombre:'Fruta',disponible:true}]},
      ]},
      {id:2, nombre:'Menú degustación', precio:34, disponible:true, grupos:[{id:4, nombre:'Entrante', opciones:[{id:107,nombre:'Croquetas',disponible:true}]}]},
    ],
    activeMenuIds:[1, 2],
    reservasResumen:{}, mesasOcupadas:{}, pedidosResumen:{}, cocinaCargaActiva:0,
    tables:[{id:1, name:'Mesa 1', seats:2, zone:'Sala'}, {id:2, name:'Mesa 2', seats:4, zone:'Sala'}, {id:3, name:'Mesa 3', seats:6, zone:'Terraza'}],
    promos:[], allergens:{},
  };
}
