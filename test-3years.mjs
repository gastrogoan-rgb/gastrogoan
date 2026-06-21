import puppeteer from 'puppeteer-core';

const URL = 'http://localhost:8080/index.html';

function buildTestData() {
  const now = Date.now();
  let nextId = 1;
  const id = () => nextId++;

  const ingredients = [];
  const ingNames = [
    ['Tomate','Verdura'],['Cebolla','Verdura'],['Ajo','Verdura'],['Pimiento rojo','Verdura'],
    ['Patata','Verdura'],['Zanahoria','Verdura'],['Lechuga','Verdura'],['Pepino','Verdura'],
    ['Aceite de oliva','Aceite'],['Sal','Condimento'],['Pimienta','Condimento'],['Azúcar','Condimento'],
    ['Harina','Seco'],['Arroz','Seco'],['Pasta','Seco'],['Pan rallado','Seco'],
    ['Pollo','Carne'],['Ternera','Carne'],['Cerdo','Carne'],['Cordero','Carne'],
    ['Salmón','Pescado'],['Merluza','Pescado'],['Gambas','Pescado'],['Mejillones','Pescado'],
    ['Leche','Lácteo'],['Nata','Lácteo'],['Queso','Lácteo'],['Mantequilla','Lácteo'],
    ['Huevos','Lácteo'],['Vino blanco','Bebida'],['Vino tinto','Bebida'],['Cerveza','Bebida'],
    ['Limón','Fruta'],['Naranja','Fruta'],['Manzana','Fruta'],['Fresa','Fruta'],
    ['Chocolate','Repostería'],['Canela','Condimento'],['Orégano','Condimento'],['Perejil','Verdura'],
    ['Pimentón','Condimento'],['Comino','Condimento'],['Laurel','Condimento'],['Tomillo','Condimento'],
    ['Champiñones','Verdura'],['Espárragos','Verdura'],['Calabacín','Verdura'],['Berenjena','Verdura'],
    ['Mozzarella','Lácteo'],['Jamón serrano','Carne']
  ];
  ingNames.forEach(([name, cat]) => {
    ingredients.push({
      id: id(), name, category: cat, unit: 'kg', packSize: 1, packPrice: +(2 + Math.random() * 18).toFixed(2),
      provider: '', allergens: name === 'Leche' || name === 'Nata' || name === 'Queso' || name === 'Mantequilla' ? ['lacteos'] :
        name === 'Harina' || name === 'Pan rallado' || name === 'Pasta' ? ['gluten'] :
        name === 'Huevos' ? ['huevos'] :
        name === 'Gambas' || name === 'Mejillones' ? ['crustaceos','moluscos'] : []
    });
  });

  const recipes = [];
  const dishNames = [
    'Ensalada César','Gazpacho andaluz','Croquetas de jamón','Tortilla española',
    'Paella valenciana','Arroz negro','Risotto de setas','Pasta carbonara',
    'Solomillo al whisky','Entrecot a la parrilla','Pollo al ajillo','Chuletas de cordero',
    'Merluza a la vasca','Salmón a la plancha','Gambas al ajillo','Pulpo a la gallega',
    'Crema de calabacín','Sopa de cebolla','Pimientos rellenos','Lasaña boloñesa',
    'Hamburguesa gourmet','Pizza casera','Tacos de pollo','Ceviche de corvina',
    'Tarta de queso','Brownie chocolate','Crème brûlée','Flan casero',
    'Tiramisú','Helado artesanal','Mousse de chocolate','Panna cotta',
    'Caldo de pollo','Sofrito base','Bechamel','Salsa de tomate'
  ];
  dishNames.forEach((name, i) => {
    const isBase = i >= 32;
    const lines = [];
    const numLines = 2 + Math.floor(Math.random() * 5);
    for (let j = 0; j < numLines; j++) {
      const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
      lines.push({ ingredientId: ing.id, qty: +(0.05 + Math.random() * 0.5).toFixed(3), merma: Math.floor(Math.random() * 15) });
    }
    recipes.push({
      id: id(), name, category: isBase ? 'Elaboraciones' : (i < 4 ? 'Entrantes' : i < 16 ? 'Principales' : i < 20 ? 'Sopas' : i < 24 ? 'Especiales' : 'Postres'),
      comensales: isBase ? 10 : 4, pvp: isBase ? 0 : +(8 + Math.random() * 22).toFixed(2),
      lines, isBase
    });
  });

  const providers = [
    { id: id(), nombre: 'MakroCash', tel: '911234567', email: 'pedidos@makro.es', contacto: 'Luis', pago: 'transferencia', dir: 'Pol. Ind. Norte', notas: '' },
    { id: id(), nombre: 'Frutas García', tel: '622345678', email: 'garcia@frutas.com', contacto: 'Ana', pago: 'efectivo', dir: 'Mercado Central', notas: 'Entrega lunes y jueves' },
    { id: id(), nombre: 'Pescadería Costa', tel: '633456789', email: 'costa@pesca.com', contacto: 'Pedro', pago: 'transferencia', dir: 'Puerto pesquero', notas: '' },
    { id: id(), nombre: 'Carnes Premium', tel: '644567890', email: 'info@carnespremium.es', contacto: 'Miguel', pago: '30 días', dir: 'Av. Industrial 23', notas: '' },
    { id: id(), nombre: 'Distribuciones Levante', tel: '655678901', email: 'levante@dist.com', contacto: 'Carmen', pago: 'transferencia', dir: 'Ctra. Nacional 340', notas: 'Pedido mínimo 200€' }
  ];

  const tables = [];
  for (let i = 1; i <= 12; i++) tables.push({ id: id(), name: `Mesa ${i}`, zona: i <= 8 ? 'Interior' : 'Terraza' });

  const employees = [
    { id: id(), name: 'Carlos Martínez', rol: 'Jefe de cocina', color: '#E74C3C', area: 'cocina', pin: 'H:abc123', pinChanged: true },
    { id: id(), name: 'Laura García', rol: 'Cocinera', color: '#3498DB', area: 'cocina', pin: 'H:def456', pinChanged: true },
    { id: id(), name: 'Miguel López', rol: 'Ayudante cocina', color: '#2ECC71', area: 'cocina', pin: 'H:ghi789', pinChanged: true },
    { id: id(), name: 'Ana Fernández', rol: 'Jefa de sala', color: '#9B59B6', area: 'sala', pin: 'H:jkl012', pinChanged: true },
    { id: id(), name: 'Pablo Ruiz', rol: 'Camarero', color: '#F39C12', area: 'sala', pin: 'H:mno345', pinChanged: true },
    { id: id(), name: 'Sara Torres', rol: 'Camarera', color: '#1ABC9C', area: 'sala', pin: '1234', pinChanged: false },
    { id: id(), name: 'Diego Sánchez', rol: 'Camarero fines de semana', color: '#E67E22', area: 'sala', pin: '1234', pinChanged: false }
  ];

  const cartas = [{
    id: id(), nombre: 'Carta Principal',
    horario: Array(7).fill({ activo: true, desde: '', hasta: '' }),
    secciones: [
      { id: id(), nombre: 'Entrantes', platos: recipes.filter(r => r.category === 'Entrantes' && !r.isBase).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, precio: r.pvp, disponible: true })) },
      { id: id(), nombre: 'Principales', platos: recipes.filter(r => r.category === 'Principales' && !r.isBase).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, precio: r.pvp, disponible: true })) },
      { id: id(), nombre: 'Postres', platos: recipes.filter(r => r.category === 'Postres' && !r.isBase).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, precio: r.pvp, disponible: true })) }
    ]
  }];

  const menus = [{
    id: id(), nombre: 'Menú del día', precio: 14.50,
    horario: [{ activo: true, desde: '12:00', hasta: '16:00' }, { activo: true, desde: '12:00', hasta: '16:00' },
      { activo: true, desde: '12:00', hasta: '16:00' }, { activo: true, desde: '12:00', hasta: '16:00' },
      { activo: true, desde: '12:00', hasta: '16:00' }, { activo: false }, { activo: false }],
    grupos: [
      { id: id(), nombre: 'Primeros', bebida: false, opciones: recipes.slice(0, 4).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, suplemento: 0 })) },
      { id: id(), nombre: 'Segundos', bebida: false, opciones: recipes.slice(4, 8).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, suplemento: 0 })) },
      { id: id(), nombre: 'Postres', bebida: false, opciones: recipes.slice(24, 28).map(r => ({ id: id(), recipeId: r.id, nombre: r.name, suplemento: 0 })) },
      { id: id(), nombre: 'Bebidas', bebida: true, opciones: [
        { id: id(), nombre: 'Agua', suplemento: 0 }, { id: id(), nombre: 'Refresco', suplemento: 0 }, { id: id(), nombre: 'Copa de vino', suplemento: 2 }
      ]}
    ]
  }];

  // 3 years of sales (~40/day, ~250 days/year open = ~30,000 sales)
  const sales = [];
  const payMethods = ['Efectivo', 'Tarjeta', 'Tarjeta', 'Tarjeta']; // 75% card
  const startDate = new Date('2023-06-01');
  const endDate = new Date('2026-06-20');
  let d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow === 1) { d.setDate(d.getDate() + 1); continue; } // closed Mondays
    const numSales = 25 + Math.floor(Math.random() * 25); // 25-50 sales/day
    for (let s = 0; s < numSales; s++) {
      const numItems = 1 + Math.floor(Math.random() * 5);
      const items = [];
      for (let it = 0; it < numItems; it++) {
        const r = recipes[Math.floor(Math.random() * (recipes.length - 4))]; // exclude base recipes
        items.push({ name: r.name, qty: 1, price: r.pvp, recipeId: r.id });
      }
      const total = items.reduce((s, i) => s + i.price * i.qty, 0);
      const hour = 12 + Math.floor(Math.random() * 10);
      const min = Math.floor(Math.random() * 60);
      sales.push({
        id: id(),
        date: d.toISOString().slice(0, 10),
        time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        items,
        total: +total.toFixed(2),
        payment: payMethods[Math.floor(Math.random() * payMethods.length)],
        table: tables[Math.floor(Math.random() * tables.length)].name,
        pax: 1 + Math.floor(Math.random() * 4),
        createdAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, min).toISOString(),
        tipo: Math.random() > 0.85 ? 'takeaway' : 'mesa',
        camarero: employees.filter(e => e.area === 'sala')[Math.floor(Math.random() * 4)]?.name || ''
      });
    }
    d.setDate(d.getDate() + 1);
  }

  // Clients with loyalty
  const clients = [];
  const clientNames = [
    'Juan Pérez', 'María López', 'Antonio García', 'Isabel Martín', 'Francisco Rodríguez',
    'Carmen Hernández', 'José Díaz', 'Dolores Moreno', 'Manuel Álvarez', 'Pilar Romero',
    'David Navarro', 'Elena Torres', 'Alberto Domínguez', 'Lucía Vázquez', 'Sergio Ramos',
    'Marta Jiménez', 'Raúl Gutiérrez', 'Patricia Molina', 'Alejandro Suárez', 'Cristina Ortega',
    'Roberto Castillo', 'Natalia Iglesias', 'Fernando Santos', 'Beatriz Rubio', 'Andrés Medina',
    'Silvia Garrido', 'Daniel Morales', 'Rosa Delgado', 'Hugo Guerrero', 'Inés Blanco',
    'Óscar Peña', 'Clara Herrera', 'Víctor Calvo', 'Alicia Vargas', 'Jorge Cano',
    'Eva Prieto', 'Marcos Cruz', 'Teresa Reyes', 'Adrián Gil', 'Nuria León',
    'Gonzalo Méndez', 'Irene Flores', 'Iván Aguilar', 'Paula Campos', 'Santiago Vega'
  ];
  clientNames.forEach(name => {
    const visits = 3 + Math.floor(Math.random() * 80);
    clients.push({
      id: id(), name, phone: `6${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      email: name.toLowerCase().replace(/ /g, '.').replace(/[áéíóú]/g, c => 'aeiou'['áéíóú'.indexOf(c)]) + '@email.com',
      visits, points: visits % 10, totalSpent: +(visits * (15 + Math.random() * 35)).toFixed(2),
      lastVisit: new Date(2026, 5, Math.floor(Math.random() * 20) + 1).toISOString().slice(0, 10),
      notes: Math.random() > 0.7 ? 'Cliente habitual, prefiere mesa terraza' : '',
      rewards: Math.floor(visits / 10)
    });
  });

  // Reservations (last 6 months + next 2 weeks)
  const reservations = [];
  const rStart = new Date('2026-01-01');
  const rEnd = new Date('2026-07-05');
  let rd = new Date(rStart);
  while (rd <= rEnd) {
    const numRes = Math.floor(Math.random() * 8);
    for (let r = 0; r < numRes; r++) {
      const hour = 13 + Math.floor(Math.random() * 8);
      const client = clients[Math.floor(Math.random() * clients.length)];
      reservations.push({
        id: id(),
        date: rd.toISOString().slice(0, 10),
        time: `${hour}:${Math.random() > 0.5 ? '00' : '30'}`,
        people: 2 + Math.floor(Math.random() * 6),
        name: client.name, phone: client.phone, email: client.email,
        table: tables[Math.floor(Math.random() * tables.length)].id,
        status: rd < new Date('2026-06-21') ? (Math.random() > 0.1 ? 'confirmada' : 'cancelada') : 'pendiente',
        notes: Math.random() > 0.8 ? 'Cumpleaños' : '',
        clientId: client.id,
        createdAt: new Date(rd - 86400000 * (1 + Math.floor(Math.random() * 7))).toISOString()
      });
    }
    rd.setDate(rd.getDate() + 1);
  }

  // Cash closures (every working day for 3 years)
  const cashClosures = [];
  d = new Date(startDate);
  while (d <= endDate) {
    const dow = d.getDay();
    if (dow === 1) { d.setDate(d.getDate() + 1); continue; }
    const dateStr = d.toISOString().slice(0, 10);
    const daySales = sales.filter(s => s.date === dateStr);
    const totEf = daySales.filter(s => s.payment === 'Efectivo').reduce((a, s) => a + s.total, 0);
    const totTar = daySales.filter(s => s.payment === 'Tarjeta').reduce((a, s) => a + s.total, 0);
    cashClosures.push({
      id: id(), fecha: dateStr, desde: '11:00', hasta: '23:30',
      totales: { Efectivo: +totEf.toFixed(2), Tarjeta: +totTar.toFixed(2), Otro: 0 },
      total: +(totEf + totTar).toFixed(2), ticketCount: daySales.length,
      fondoInicial: 200, efectivoEsperado: +(200 + totEf).toFixed(2),
      efectivoContado: +(200 + totEf + (Math.random() * 4 - 2)).toFixed(2),
      diferencia: +(Math.random() * 4 - 2).toFixed(2),
      notas: '', createdAt: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 30).toISOString()
    });
    d.setDate(d.getDate() + 1);
  }

  // Fichajes (clock in/out for 3 years)
  const fichajes = [];
  d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() === 1) { d.setDate(d.getDate() + 1); continue; }
    const dateStr = d.toISOString().slice(0, 10);
    employees.forEach(emp => {
      if (emp.rol === 'Camarero fines de semana' && d.getDay() > 0 && d.getDay() < 6) return;
      if (Math.random() < 0.05) return; // occasional absence
      const entrada = emp.area === 'cocina' ? '09:00' : '11:00';
      const salida = emp.area === 'cocina' ? '17:00' : '23:30';
      fichajes.push({ id: id(), employeeId: emp.id, fecha: dateStr, entrada, salida });
    });
    d.setDate(d.getDate() + 1);
  }

  // Purchase orders
  const purchaseOrders = [];
  d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() !== 1 && d.getDay() !== 4) { d.setDate(d.getDate() + 1); continue; } // orders on Mon & Thu
    const prov = providers[Math.floor(Math.random() * providers.length)];
    const numItems = 3 + Math.floor(Math.random() * 8);
    const items = [];
    for (let j = 0; j < numItems; j++) {
      const ing = ingredients[Math.floor(Math.random() * ingredients.length)];
      items.push({ ingredientId: ing.id, name: ing.name, qty: +(1 + Math.random() * 10).toFixed(1), unit: ing.unit, price: ing.packPrice });
    }
    purchaseOrders.push({
      id: id(), provider: prov.nombre, date: d.toISOString().slice(0, 10),
      items, status: d < new Date('2026-06-15') ? 'recibido' : 'pendiente',
      total: +items.reduce((a, i) => a + i.qty * i.price, 0).toFixed(2),
      createdAt: d.toISOString()
    });
    d.setDate(d.getDate() + 1);
  }

  // Chat messages
  const chatMessages = [];
  for (let i = 0; i < 500; i++) {
    const emp = employees[Math.floor(Math.random() * employees.length)];
    const channels = ['general', 'cocina', 'sala'];
    chatMessages.push({
      id: id(), channel: channels[Math.floor(Math.random() * 3)],
      authorId: emp.id, authorName: emp.name,
      text: ['Hoy tenemos 3 reservas grandes', 'Falta tomate, lo pido?', 'Mesa 7 pide postre', 'Cambio de turno a las 16h', 'Llego 10 min tarde', 'OK perfecto', 'Hecho!', 'Necesitamos más pan'][Math.floor(Math.random() * 8)],
      ts: new Date(2026, 4 + Math.floor(Math.random() * 2), 1 + Math.floor(Math.random() * 28), 8 + Math.floor(Math.random() * 14), Math.floor(Math.random() * 60)).toISOString()
    });
  }

  // Cleaning tasks
  const cleaningTasks = [
    { id: id(), area: 'Cocina', producto: 'Desengrasante industrial' },
    { id: id(), area: 'Baños', producto: 'Lejía diluida' },
    { id: id(), area: 'Sala', producto: 'Multiusos' },
    { id: id(), area: 'Almacén', producto: 'Escoba + fregona' },
    { id: id(), area: 'Terraza', producto: 'Agua a presión' }
  ];

  // Promos
  const promos = [];
  for (let m = 0; m < 36; m++) {
    const pDate = new Date(2023, 6 + m, 15);
    promos.push({
      id: id(), fecha: pDate.toISOString().slice(0, 10),
      titulo: ['Noche de tapas', 'Happy hour', '2x1 en postres', 'Menú especial', 'Maridaje de vinos'][m % 5],
      descripcion: 'Promoción mensual del restaurante'
    });
  }

  // Gastos fijos
  const gastosFijos = [
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Carlos', importe: 2200, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Laura', importe: 1800, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Miguel', importe: 1400, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Ana', importe: 1900, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Pablo', importe: 1500, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'Nómina Sara', importe: 1500, periodicidad: 'mensual' },
    { id: id(), tipo: 'PERSONAL', concepto: 'SS empresa', importe: 3200, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Alquiler local', importe: 2500, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Luz', importe: 450, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Gas', importe: 280, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Agua', importe: 120, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Internet + teléfono', importe: 89, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Seguro RC', importe: 1200, periodicidad: 'anual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Gestoría', importe: 250, periodicidad: 'mensual' },
    { id: id(), tipo: 'FIJOS', concepto: 'Software TPV', importe: 100, periodicidad: 'mensual' }
  ];

  // Gastos variables
  const gastosVariables = [];
  d = new Date(startDate);
  while (d <= endDate) {
    const monthKey = d.toISOString().slice(0, 7);
    if (!gastosVariables.find(g => g.mes === monthKey)) {
      gastosVariables.push({
        mes: monthKey,
        items: [
          { id: id(), concepto: 'Compra material limpieza', importe: 120 + Math.floor(Math.random() * 80), categoria: 'LIMPIEZA', fecha: `${monthKey}-05` },
          { id: id(), concepto: 'Reparación horno', importe: Math.random() > 0.7 ? 350 : 0, categoria: 'MANTENIMIENTO', fecha: `${monthKey}-15` }
        ].filter(i => i.importe > 0)
      });
    }
    d.setDate(d.getDate() + 30);
  }

  // CAPEX
  const capex = [
    { id: id(), descripcion: 'Horno industrial', fecha: '2023-07-15', importe: 8500, iva: 1785, estado: 'pagado', financiado: false },
    { id: id(), descripcion: 'Reforma terraza', fecha: '2024-03-01', importe: 12000, iva: 2520, estado: 'pagado', financiado: true },
    { id: id(), descripcion: 'Cámara frigorífica', fecha: '2025-01-10', importe: 5500, iva: 1155, estado: 'pagado', financiado: false },
    { id: id(), descripcion: 'Vajilla nueva', fecha: '2025-09-20', importe: 2200, iva: 462, estado: 'pagado', financiado: false },
    { id: id(), descripcion: 'Sistema de climatización', fecha: '2026-02-15', importe: 15000, iva: 3150, estado: 'pendiente', financiado: true }
  ];

  const stock = {};
  ingredients.forEach(ing => {
    stock[ing.id] = { qty: +(5 + Math.random() * 20).toFixed(1), min: +(2 + Math.random() * 5).toFixed(1) };
  });

  return {
    ingredients,
    ingredientCategories: [],
    recipes,
    recipeCategories: [],
    fichas: recipes.filter(r => !r.isBase).map(r => ({
      id: id(), recipeId: r.id, name: r.name,
      produccion: 4, comensales: 4,
      steps: ['Preparar ingredientes', 'Cocinar a fuego medio', 'Emplatar y servir'],
      allergens: r.lines ? [...new Set(r.lines.flatMap(l => (ingredients.find(i => i.id === l.ingredientId) || {}).allergens || []))] : []
    })),
    menuItems: [],
    cartas,
    activeCartaIds: [cartas[0].id],
    menus,
    activeMenuIds: [menus[0].id],
    stock,
    elaboraciones: [],
    purchaseOrders,
    providers,
    tables,
    tpvOrders: [],
    sales,
    cashClosures,
    employees,
    shifts: {},
    turnos: [],
    workDistribution: {},
    fichajes,
    promos,
    cleaningTasks,
    limpieza: {
      manosPasos: ['Mójate las manos con agua tibia', 'Aplica jabón bactericida', 'Frota 20 segundos', 'Aclara', 'Seca con papel'],
      tareas: cleaningTasks,
      checks: {},
      temperaturas: [],
      alergenos: [],
      plagas: [],
      mantenimiento: [
        { id: id(), nombre: 'Horno industrial', ultimo: '2026-05-01', proximo: '2026-08-01', responsable: 'Carlos', estado: 'ok', notas: '' },
        { id: id(), nombre: 'Cámara frigorífica', ultimo: '2026-04-15', proximo: '2026-07-15', responsable: 'Miguel', estado: 'ok', notas: '' }
      ]
    },
    clients,
    chatMessages,
    loyaltyRewards: ['Postre gratis', 'Café o infusión gratis', 'Chupito gratis', 'Entrante gratis', '10% descuento'],
    reservations,
    business: {
      name: 'Restaurante El Buen Sabor', address: 'Calle Mayor 15, Valencia', phone: '961234567',
      email: 'info@elbuensabor.es', description: 'Cocina mediterránea de mercado desde 2023',
      logo: '', tipo: 'Restaurante', anyo: '2023', web: 'www.elbuensabor.es',
      cif: 'B12345678', prop: 'Antonio García', mesasInterior: '8', mesasTerraza: '4', aforo: '48',
      ig: '@elbuensabor', fb: 'elbuensabor',
      pin: 'H:testpin', pinSet: true,
      horario: Array(7).fill(null).map((_, i) => i === 1
        ? { activo: false, modo: 'partido', tramos: [{ desde: '', hasta: '' }] }
        : { activo: true, modo: 'partido', tramos: [{ desde: '12:00', hasta: '16:00' }, { desde: '20:00', hasta: '23:30' }] }),
      cartaAuto: true,
      tiposServicio: { mesa: true, takeaway: true, delivery: true },
      ownFirebase: null,
      ticket: { showLogo: true, header: 'Restaurante El Buen Sabor\nCalle Mayor 15, Valencia\nCIF: B12345678', footer: 'Gracias por su visita', showIva: true, ivaPercent: 10, ancho: 48 },
      gastosFijos, gastosVariables, capex,
      pctImpuesto: 25, pctIvaCompras: 10,
      tesoreria: { pctPer: 30, pctGF: 20, pctMP: 35, pctOG: 5, pctBen: 10 }
    },
    nextId: nextId,
    license: { key: 'TEST-LICENSE-KEY', name: 'Restaurante El Buen Sabor' }
  };
}

(async () => {
  console.log('🔧 Generando datos de 3 años...');
  const testData = buildTestData();
  console.log(`   📊 ${testData.sales.length} ventas`);
  console.log(`   👥 ${testData.clients.length} clientes`);
  console.log(`   📋 ${testData.reservations.length} reservas`);
  console.log(`   💰 ${testData.cashClosures.length} arqueos de caja`);
  console.log(`   ⏱  ${testData.fichajes.length} fichajes`);
  console.log(`   📦 ${testData.purchaseOrders.length} pedidos a proveedores`);
  console.log(`   🍳 ${testData.recipes.length} recetas`);
  console.log(`   🧾 ${testData.ingredients.length} ingredientes`);
  console.log(`   💬 ${testData.chatMessages.length} mensajes de chat`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const jsErrors = [];
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => jsErrors.push(err.message));

  console.log('\n🌐 Cargando la app...');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  // Inject data into DB via the app's own mechanism
  console.log('💾 Inyectando datos en IndexedDB...');
  await page.evaluate(async (data) => {
    Object.assign(DB, data);
    await idbSet('gastrogoan_data_v1', DB);
  }, testData);

  // Give time for any async operations
  await new Promise(r=>setTimeout(r,1000));

  // Now test each view/module
  const views = [
    'home', 'dashboard', 'megalista', 'proveedores', 'escandallo', 'fichas',
    'carta', 'tpv', 'comandascocina', 'stock', 'pedidos', 'economia',
    'horarios', 'limpieza', 'distribucion', 'clientes', 'reservas',
    'promocion', 'minegocio', 'manual'
  ];

  console.log('\n🧪 Probando cada vista con datos cargados...\n');

  const results = [];
  for (const view of views) {
    const errorsBefore = jsErrors.length;
    const consErrorsBefore = consoleErrors.length;

    try {
      await page.evaluate((v) => {
        try { renderView(v); } catch (e) { throw new Error(`renderView('${v}'): ${e.message}`); }
      }, view);
      await new Promise(r=>setTimeout(r,300));

      const newErrors = jsErrors.slice(errorsBefore);
      const newConsErrors = consoleErrors.slice(consErrorsBefore);

      if (newErrors.length > 0 || newConsErrors.length > 0) {
        results.push({ view, status: '⚠️', errors: [...newErrors, ...newConsErrors] });
      } else {
        results.push({ view, status: '✅', errors: [] });
      }
    } catch (e) {
      results.push({ view, status: '❌', errors: [e.message] });
    }
  }

  // Test specific heavy operations
  console.log('🔄 Probando operaciones pesadas...\n');

  const heavyOps = [
    { name: 'Dashboard con 3 años de ventas', fn: 'renderDashboard()' },
    { name: 'Escandallo food cost', fn: 'renderEscandallo()' },
    { name: 'Fichas técnicas', fn: 'renderFichas()' },
    { name: 'Stock con alertas', fn: 'renderStock()' },
    { name: 'Clientes con fidelización', fn: 'renderClientes()' },
    { name: 'Reservas vista mes', fn: "setReservasTab('mes')" },
    { name: 'Reservas vista semana', fn: "setReservasTab('semana')" },
    { name: 'Reservas vista día', fn: "setReservasTab('dia')" },
    { name: 'Gestión económica init', fn: 'GE.init()' },
    { name: 'GE Gastos Variables', fn: "GE.tab('variables')" },
    { name: 'GE Cuenta Resultados', fn: "GE.tab('cdr')" },
    { name: 'GE Resultado', fn: "GE.tab('resultado')" },
    { name: 'GE Tesorería', fn: "GE.tab('tesoreria')" },
    { name: 'GE Punto Equilibrio', fn: "GE.tab('pe')" },
    { name: 'GE CAPEX', fn: "GE.tab('capex')" },
    { name: 'Horarios render', fn: 'renderHorarios()' },
    { name: 'Limpieza render', fn: 'renderLimpieza()' },
    { name: 'Distribución render', fn: 'renderDistribucion()' },
    { name: 'Promoción render', fn: 'renderPromocion()' },
    { name: 'TPV render', fn: 'renderTPV()' },
    { name: 'Comandas cocina', fn: 'renderComandasCocina()' },
    { name: 'Pedidos render', fn: 'renderPedidos()' },
    { name: 'Mi negocio render', fn: 'renderMiNegocio()' },
    { name: 'Manual render', fn: 'renderManual()' },
    { name: 'Header render', fn: 'renderHeader()' },
    { name: 'Carta render', fn: 'renderOferta()' },
    { name: 'Platos análisis', fn: 'GE.renderPlatos()' },
    { name: 'Escandallo tab platos', fn: "setEscandalloTab('platos')" },
    { name: 'Escandallo tab elaboraciones', fn: "setEscandalloTab('elaboraciones')" },
    { name: 'Fichas tab platos', fn: "setFichasTab('platos')" },
    { name: 'Fichas tab elaboraciones', fn: "setFichasTab('elaboraciones')" },
  ];

  for (const op of heavyOps) {
    const errorsBefore = jsErrors.length;
    const consErrorsBefore = consoleErrors.length;
    try {
      const startTime = Date.now();
      await page.evaluate((code) => {
        eval(code);
      }, op.fn);
      await new Promise(r=>setTimeout(r,200));
      const elapsed = Date.now() - startTime;

      const newErrors = jsErrors.slice(errorsBefore);
      const newConsErrors = consoleErrors.slice(consErrorsBefore);

      if (newErrors.length > 0) {
        results.push({ view: op.name, status: '❌', errors: newErrors });
      } else if (elapsed > 3000) {
        results.push({ view: op.name, status: '🐢', errors: [`Lento: ${elapsed}ms`] });
      } else {
        results.push({ view: `${op.name} (${elapsed}ms)`, status: '✅', errors: [] });
      }
    } catch (e) {
      results.push({ view: op.name, status: '❌', errors: [e.message] });
    }
  }

  // Print results
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RESULTADOS DEL TEST - RESTAURANTE 3 AÑOS');
  console.log('═══════════════════════════════════════════════════════\n');

  let passed = 0, failed = 0, warned = 0;
  for (const r of results) {
    if (r.status === '✅') { passed++; console.log(`  ${r.status} ${r.view}`); }
    else if (r.status === '⚠️') { warned++; console.log(`  ${r.status} ${r.view}: ${r.errors.join(' | ')}`); }
    else if (r.status === '🐢') { warned++; console.log(`  ${r.status} ${r.view}: ${r.errors.join(' | ')}`); }
    else { failed++; console.log(`  ${r.status} ${r.view}: ${r.errors.join(' | ')}`); }
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  ✅ ${passed} OK  |  ⚠️ ${warned} Avisos  |  ❌ ${failed} Errores`);
  console.log('═══════════════════════════════════════════════════════');

  if (jsErrors.length > 0) {
    console.log('\n📛 Errores JS globales detectados:');
    [...new Set(jsErrors)].forEach(e => console.log(`   • ${e}`));
  }

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
