/* Arranca la app en modo demostración.

   No toca NADA de la app: espera a que cargue, rellena la base de datos con
   los datos de ejemplo y quita los asistentes del alta. Por eso la demo
   siempre enseña exactamente la app que se vende, sin una versión aparte que
   mantener — que es lo que pasó con la anterior y acabó tres meses desfasada. */
(async function(){
  const D = window.GG_DEMO_DATOS;
  const dia = D.dias.dia;

  // Licencia y sesión de propietario, sin pasar por el alta.
  const code = 'DEMO2026';
  localStorage.setItem('gastrogoan_license_v1', JSON.stringify({code, tenantId: ggBizTenantId(code)}));
  localStorage.setItem('gastrogoan_owner_login', JSON.stringify({user:'demo', authKey:'demo', pinHash:'H2:demo'}));
  localStorage.setItem('gastrogoan_access_session', JSON.stringify({type:'owner', ts: Date.now()}));
  localStorage.setItem('gastrogoan_owner_pass_prompted','1');
  localStorage.setItem('gastrogoan_slots_owner_migrated','demo');
  localStorage.setItem('gastrogoan_backup_reminder_day', new Date().toISOString().slice(0,10));

  await (typeof dbReadyPromise !== 'undefined' ? dbReadyPromise : Promise.resolve());

  Object.assign(DB.business, D.business);
  // Nube "puesta" para que no salga el asistente. Es falsa a propósito: una
  // demo no debe escribir en ninguna nube de verdad.
  DB.business.ownFirebase = {apiKey:'demo', databaseURL:'https://demo-default-rtdb.firebaseio.com'};
  DB.ingredients = D.ingredients;
  DB.stock = D.stock;
  DB.ingredientCategories = D.ingredientCategories;
  DB.recipeCategories = D.recipeCategories;
  DB.recipes = D.recipes;
  DB.elaboraciones = D.elaboraciones;
  DB.providers = D.providers;
  DB.cartas = D.cartas;
  DB.activeCartaIds = [D.cartas[0].id];
  DB.tables = D.tables;
  DB.employees = D.employees;
  DB.idr = {adn: D.idrAdn, creaciones: [], carpetas: []};

  /* ⚠️ Los nombres de los campos son los REALES de la app, comprobados uno a
     uno con grep. Inventárselos —"nombre" en vez de "name", "fecha" en vez de
     "date"— es la trampa que ya está documentada: la app no revienta, pero
     pinta la pantalla vacía y la demo enseña una tabla de guiones. */
  const clientes = [
    {id: 9001, name:'Marta Puig', phone:'600 111 222', email:'', points: 7, notes:'Mesa junto a la ventana', allergies:''},
    {id: 9002, name:'Jordi Sala', phone:'600 333 444', email:'', points: 10, notes:'Cliente de toda la vida', allergies:'Frutos de cáscara'},
    {id: 9003, name:'Anna Roca', phone:'600 555 666', email:'', points: 3, notes:'', allergies:''},
    {id: 9004, name:'Oficina Vic', phone:'600 777 888', email:'', points: 5, notes:'Comidas de empresa', allergies:''},
  ];
  DB.clients = clientes;

  // Un trimestre de ventas, para que los paneles tengan de dónde tirar.
  const platos = DB.recipes.filter(r => !r.isBase);
  const ventas = [];
  for(let d = -90; d <= 0; d++){
    const date = dia(d);
    const finde = [0,6].includes(new Date(date).getDay());
    // El día de hoy va a medias, como estaría un servicio de verdad en curso.
    const llenos = finde ? 22 + Math.floor(Math.random()*10) : 11 + Math.floor(Math.random()*8);
    const tickets = d === 0 ? Math.max(4, Math.round(llenos * 0.45)) : llenos;
    for(let t = 0; t < tickets; t++){
      const items = [];
      const cuantos = 1 + Math.floor(Math.random()*3);
      for(let k = 0; k < cuantos; k++){
        const p = platos[Math.floor(Math.random()*platos.length)];
        items.push({name: p.name, qty: 1, price: p.price, recipeId: p.id, ivaPct: 10,
                    bebida: false, costeUnitario: recipeCost(p)});
      }
      const total = items.reduce((s,i) => s + i.price*i.qty, 0);
      const hora = (finde ? 21 : 14) + ':' + String(10 + (t % 45)).padStart(2,'0');
      // Uno de cada tres tickets va a nombre de un cliente: así la ficha de
      // fidelidad tiene visitas, ticket medio y gasto de verdad.
      const cli = (t % 3 === 0) ? clientes[t % clientes.length] : null;
      const metodoPago = Math.random() < 0.65 ? 'Tarjeta' : 'Efectivo';
      ventas.push({
        id: 'v' + d + '_' + t, date, createdAt: date + 'T' + hora + ':00.000Z',
        total, subtotal: total, descuentoPct: 0, descuentoImporte: 0, propina: 0,
        tableId: DB.tables[t % DB.tables.length].id, pax: 2, tipo: 'mesa', express: false,
        clienteNombre: cli ? cli.name : '', clientId: cli ? cli.id : null,
        camareroId: null, metodoPago, pagos: [{label: metodoPago, amount: total, metodoPago}],
        items,
      });
    }
  }
  DB.sales = ventas;

  DB.reservations = [
    {id: 9101, clientId: 9001, clientName:'Marta Puig', date: dia(0), time:'21:00', people: 4, tableId: DB.tables[2].id, notes:'Aniversario', status:'confirmada'},
    {id: 9102, clientId: 9002, clientName:'Jordi Sala', date: dia(0), time:'21:30', people: 2, tableId: DB.tables[0].id, notes:'', status:'confirmada'},
    {id: 9103, clientId: 9004, clientName:'Oficina Vic', date: dia(1), time:'14:00', people: 8, tableId: DB.tables[4].id, notes:'Menú cerrado', status:'pendiente'},
  ];
  const turnos = [];
  DB.employees.forEach((e, i) => {
    for(let d = 0; d < 7; d++){
      if((d + i) % 7 === 0) continue; // su día libre
      turnos.push({id: 9200 + i*10 + d, employeeId: e.id, fecha: dia(d),
        tipo: i % 2 ? 'T' : 'M', entrada: i % 2 ? '18:00' : '09:00', salida: i % 2 ? '00:00' : '16:00'});
    }
  });
  DB.turnos = turnos;
  /* Gastos: sin ellos, el resultado del mes salía igual que la facturación —
     un P&L con costes a cero es lo primero que delata una demo. Los fijos son
     mensuales; los variables, las compras a proveedores de cada mes. */
  const hoyD = new Date();
  DB.ge = DB.ge || {};
  /* Las proporciones son las de un bistró que va bien, no las de un ejemplo
     cualquiera: sobre ~15.900 € de facturación, un 31% de materia prima, un
     39% de personal y un resto de estructura, para un resultado alrededor del
     15%. Con las cifras infladas el mes pasado salía en PÉRDIDAS, y una demo
     que enseña un restaurante que pierde dinero no vende nada. */
  DB.ge.fijos = [
    {id: 9401, nombre:'Alquiler del local', importe: 1500, periodicidadMeses: 1, iva: 21, categoria:'LOCAL'},
    {id: 9402, nombre:'Nóminas y seguros sociales', importe: 6200, periodicidadMeses: 1, iva: 0, categoria:'PERSONAL'},
    {id: 9403, nombre:'Luz, agua y gas', importe: 600, periodicidadMeses: 1, iva: 21, categoria:'SUMINISTROS'},
    {id: 9404, nombre:'Gestoría', importe: 180, periodicidadMeses: 1, iva: 21, categoria:'SERVICIOS'},
    {id: 9405, nombre:'Seguro del negocio', importe: 780, periodicidadMeses: 12, iva: 0, categoria:'SEGUROS'},
    {id: 9406, nombre:'Internet y telefonía', importe: 65, periodicidadMeses: 1, iva: 21, categoria:'SUMINISTROS'},
  ];
  DB.ge.variables = [];
  for(let m = 0; m < 3; m++){
    const f = new Date(hoyD); f.setMonth(f.getMonth() - m);
    const año = f.getFullYear(), mes = f.getMonth() + 1;
    const compras = [
      ['Hortalisses Vic', 970], ['Peix del Port', 1450],
      ['Cárnicas Pérez', 1680], ['Forn Vell', 300], ['Distribucions Camp', 500],
    ];
    compras.forEach(([prov, base], i) => {
      const diaCompra = 5 + i*4;
      /* Del mes en curso solo entran las compras que ya habrían ocurrido. Si
         no, el día 1 el resultado del mes salía con un mes entero de compras
         contra un día de ventas: una pérdida enorme que no es real. */
      if(m === 0 && diaCompra > hoyD.getDate()) return;
      const fecha = `${año}-${String(mes).padStart(2,'0')}-${String(diaCompra).padStart(2,'0')}`;
      DB.ge.variables.push({id: 9500 + m*10 + i, concepto: 'Compras ' + prov, proveedor: prov,
        importe: Math.round(base * (0.9 + Math.random()*0.2)), iva: 10,
        fecha, mes, 'año': año, pagada: m > 0, fechaPago: fecha});
    });
  }

  DB.promos = [
    {id: 9301, fecha: dia(3), titulo:'Menú de setas', descripcion:'Semana de la seta: tres platos fuera de carta.'},
    {id: 9302, fecha: dia(12), titulo:'Cena de bodega', descripcion:'Maridaje con el Celler Roure, 24 plazas.'},
  ];

  /* El indicador de nube, en verde. La demo no se conecta a ninguna nube de
     verdad —sería inaceptable que escribiera en la de alguien—, pero el
     indicador leía ese fallo y pintaba "Error de nube" en rojo en la cabecera:
     lo peor que puede salir en un vídeo de venta, y encima contando algo que
     no es cierto de la app real. */
  if(typeof recordSyncError === 'function') window.recordSyncError = () => {};
  const verde = () => { try{ updateSyncBadge('online'); }catch(e){} };
  verde(); setInterval(verde, 1500);

  await saveDB();

  // Fuera los asistentes del alta y a la pantalla de inicio.
  ['netlify-gate','license-gate','extconn-gate','firebase-gate','revoked-gate']
    .forEach(id => document.getElementById(id)?.remove());
  hideAccessSelectScreen();
  hideBusinessSelectScreen();
  editUnlocked = true;
  document.body.classList.add('owner-session','edit-unlocked');
  if(typeof refreshAfterRemoteChange === 'function') refreshAfterRemoteChange();
  navigate('home');

  // Marca visible: que nadie confunda la demo con la app real de un negocio.
  const sello = document.createElement('div');
  sello.textContent = 'DEMO';
  // Abajo a la izquierda: arriba se comía el logo. Y en el vídeo queda
  // justo detrás del rótulo, así que no estorba en la grabación.
  sello.style.cssText = 'position:fixed;bottom:0;left:0;z-index:99999;background:#8A4A3B;color:#fff;'
    + 'font:700 10px/1 system-ui;padding:5px 9px;border-top-right-radius:8px;letter-spacing:1px;opacity:.8';
  document.body.appendChild(sello);
  console.info('GastroGoan DEMO · datos de ejemplo cargados');
})();
