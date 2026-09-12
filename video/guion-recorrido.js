/* El vídeo de recorrido: la app entera, rápido y seguido.
 *
 * No es el completo recortado ni el de venta ampliado: es el que pidió el
 * dueño el 12/09 — enseñar que la app lo tiene TODO, a ritmo alto, con
 * interacción de verdad y sin quedarse en ninguna pantalla más de lo justo.
 *
 * El orden es el de la app, no el de una lista de funciones: se entra
 * eligiendo el negocio, se ve la barra de arriba, y de ahí a las tres
 * carpetas (Cocina entera, los cuatro módulos que SALA añade, y Gestión con
 * todas sus pestañas), la web pública de reservas y el cierre.
 *
 * Ritmo: ninguna parada pasa de dos segundos salvo las cuatro pantallas que
 * de verdad venden (escandallo, resultado del mes, TPV y la web pública).
 * Los rótulos son de una línea: si hay que leerlos dos veces, sobran.
 */

// Parada rápida: va a una vista, suelta el rótulo y da un vistazo.
const ver = (js, rotulo, {leer = 1.5, mirar = false, bajar = 0} = {}) => async a => {
  await a.ir(js, {rotulo, tras: leer});
  if(bajar) await a.recorrer(bajar);
  else if(mirar) await a.pasear();
};

/* Pestaña dentro de una vista. El rótulo va JUNTO al cambio, nunca después:
   si se pone en la parada siguiente, durante segundo y pico se ve la pestaña
   nueva con el rótulo de la anterior. */
const pestana = (js, rotulo, {leer = 1.3} = {}) => async a => { await a.ir(js, {rotulo, tras: leer}); };

export const GUION = [
  // ---------- ENTRAR ----------
  async a => {
    await a.ir(`navigate('home');`, {rotulo: '', tras: .6});
    await a.rotulo('GG Burger · todo el restaurante en una sola app');
    await a.quieto(1.8);
  },
  async a => {
    await a.rotulo('Cocina, Sala y Gestión. Cada uno ve lo suyo');
    await a.quieto(1.6);
    await a.pasear();
  },

  // ---------- COCINA ----------
  async a => { await a.pulsar('Cocina', {tras: 1.2, rotulo: 'COCINA'}); },

  ver(`navigate('megalista')`, 'Todo lo que compras, con su precio real', {bajar: 1.6}),
  ver(`navigate('proveedores')`, 'Tus proveedores y sus días de reparto', {leer: 1.3}),

  ver(`navigate('escandallo'); openEscandalloFolder('Hamburguesas')`,
      '¿Sabes lo que te cuesta cada plato?', {leer: 1.4}),
  async a => {
    await a.pulsar('GG Classic', {tras: 1.6, rotulo: 'Sale solo: coste, margen y food cost'});
    await a.recorrer(1.8);
  },
  pestana(`setEscandalloTab('elaboraciones')`, 'Y tus salsas y bases, encadenadas al coste', {leer: 1.5}),

  ver(`navigate('fichas')`, 'Ficha técnica y alérgenos de cada plato', {leer: 1.3}),
  ver(`navigate('carta')`, 'Tu carta, con extras y menú del día', {leer: 1.4, bajar: 1.4}),
  ver(`navigate('stock')`, 'Stock que se descuenta solo al vender', {leer: 1.4}),
  ver(`navigate('pedidos')`, 'Pedidos a proveedor en dos toques', {leer: 1.3}),
  ver(`navigate('comandascocina')`, 'Las comandas entran aquí, en directo', {leer: 1.6}),

  ver(`navigate('horarios')`, 'Turnos, fichajes y vacaciones', {leer: 1.3}),
  pestana(`setHorariosTab('calendario')`, 'El cuadrante de la semana', {leer: 1.2}),
  ver(`navigate('distribucion')`, 'Quién hace qué, cada día', {leer: 1.3}),

  ver(`navigate('limpieza')`, 'APPCC al día, sin papeles', {leer: 1.4}),
  pestana(`setLimpiezaTab('temperaturas')`, 'Temperaturas de cámara, registradas', {leer: 1.2}),
  pestana(`setLimpiezaTab('alergenos')`, 'Control de alérgenos', {leer: 1.1}),
  pestana(`setLimpiezaTab('plagas')`, 'Y el control de plagas', {leer: 1.1}),

  ver(`navigate('idr')`, 'Y un asistente que crea platos con TUS costes', {leer: 1.6}),

  // ---------- SALA ----------
  async a => {
    await a.ir(`navigate('folder'); currentFolder='sala'; renderFolder();`, {tras: .8});
    await a.rotulo('SALA');
    await a.quieto(1.2);
  },
  ver(`navigate('tpv')`, 'El TPV: mesas, barra y terraza', {leer: 1.8, mirar: true}),
  ver(`navigate('reservas')`, 'Reservas, con el plano de mesas', {leer: 1.5}),
  ver(`navigate('clientes')`, 'Ficha de cliente y fidelización', {leer: 1.4}),
  ver(`navigate('promocion')`, 'Calendario de promoción del negocio', {leer: 1.4}),

  // ---------- GESTIÓN ----------
  async a => {
    await a.ir(`navigate('folder'); currentFolder='gestion'; renderFolder();`, {tras: .8});
    await a.rotulo('GESTIÓN');
    await a.quieto(1.2);
  },
  ver(`navigate('dashboard')`, 'El panel: cómo va el negocio hoy', {leer: 1.6, bajar: 2.4}),

  ver(`navigate('economia'); GE.tab('ventas')`, 'Ventas del mes, por tipo de servicio', {leer: 1.5}),
  pestana(`GE.tab('fijos')`, 'Gastos fijos, con nóminas e IRPF'),
  pestana(`GE.tab('variables')`, 'Compras del mes y food cost real', {leer: 1.5}),
  async a => { await a.ir(`GE.tab('cdr')`, {rotulo: 'Cuenta de resultados: lo que de verdad ganas', tras: 1.8}); await a.recorrer(1.6); },
  pestana(`GE.tab('tesoreria')`, 'Tesorería: cuánto apartar para Hacienda', {leer: 1.7}),
  pestana(`GE.tab('pe')`, 'Tu punto de equilibrio, al día'),
  pestana(`GE.tab('capex')`, 'Y las inversiones, con sus cuotas'),

  ver(`navigate('minegocio')`, 'Tu negocio: horarios, ticket, pagos, VeriFactu', {leer: 1.4, bajar: 2.0}),
  ver(`navigate('manual')`, 'Con manual y tour dentro de la app', {leer: 1.3}),

  // ---------- LA WEB PÚBLICA ----------
  async a => {
    const datos = await a.datosDeLaApp();
    await a.abrir('http://localhost:8950/reservagastrogoan.html', {
      sinRed: true,
      antes: `window.DB = Object.assign(window.DB||{}, ${JSON.stringify(datos)});
              if(typeof renderApp === 'function') renderApp();`,
    });
    await a.rotulo('Y tu propia web de reservas y pedidos');
    await a.quieto(1.8);
    await a.recorrer(2.2);
  },
  async a => { await a.rotulo('Sin comisiones. Los pedidos entran en tu cocina'); await a.quieto(2.0); },

  // ---------- CIERRE ----------
  async a => {
    await a.abrir('http://localhost:8950/dist/index.html', {sinRed: true});
    await a.ir(`navigate('home');`, {tras: .5});
    await a.rotulo('Todo esto, por 100 € al año');
    await a.quieto(2.4);
    await a.rotulo('GastroGoan · gastrogoan.com');
    await a.quieto(2.6);
  },
];
