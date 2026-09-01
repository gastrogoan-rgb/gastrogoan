/* El recorrido completo: todos los rincones de la app, en orden.
 *
 * Reglas del guion, que vienen de lo que falló en el vídeo anterior:
 *  - Las carpetas COMPARTIDAS entre Cocina y Sala (carta, proveedores, mega
 *    lista, escandallo, fichas, stock, pedidos, horarios, distribución,
 *    limpieza) se enseñan UNA sola vez, en Cocina. En Sala solo van las suyas:
 *    TPV, reservas, clientes y promoción. Repetirlas alargaba el vídeo sin
 *    enseñar nada nuevo.
 *  - Los nombres de vista son los ids de FOLDERS (js/ui.js). 'empleados' o
 *    'ingredientes' NO existen: navegar ahí no da error, deja la pantalla en
 *    blanco, y el rótulo sale sobre un fondo vacío.
 *  - Cada pestaña se PULSA por su texto, no se llama a su función: así en el
 *    vídeo se ve el cambio ocurrir.
 */

// Un módulo: se abre, se lee de arriba abajo y, si tiene pestañas, se pasan.
const modulo = (js, rotulo, pestanas = []) => async a => {
  await a.ir(js, {rotulo, tras: 1.1});
  await a.pasear();
  await a.recorrer(1.9);
  for(const p of pestanas){
    await a.pulsar(p.txt, {tras: .5, rotulo: p.rot});
    await a.recorrer(1.5);
  }
};

export const GUION = [

  // ── Entrar ──────────────────────────────────────────────────────────────
  async a => {
    await a.ir(`hideBusinessSelectScreen(); showAccessSelectScreen();`,
      {rotulo: 'Se entra de dos maneras: el dueño, y cada empleado con su PIN', tras: 2});
    await a.pasear();
  },
  async a => {
    await a.ir(`setAccessScreenMode('owner');`,
      {rotulo: 'El dueño entra con su usuario y su PIN — los mismos en cualquier dispositivo', tras: 2.6});
    await a.pasear();
  },
  async a => {
    await a.ir(`setAccessScreenMode('employee');`,
      {rotulo: 'El empleado entra con su nombre y su PIN, y solo ve lo suyo', tras: 2.6});
    await a.pasear();
  },
  async a => {
    await a.ir(`setAccessScreenMode('choice'); hideAccessSelectScreen(); showBusinessSelectScreen();`,
      {rotulo: 'Varios locales en el mismo aparato: cada uno con sus datos, separados', tras: 2.6});
    await a.recorrer(1.4);
  },
  async a => {
    await a.ir(`hideBusinessSelectScreen(); navigate('home');`,
      {rotulo: 'Dentro: tres áreas — Cocina, Sala y Gestión', tras: 2.4});
    await a.pasear();
  },

  // ── COCINA ──────────────────────────────────────────────────────────────
  async a => {
    await a.ir(`currentFolder='cocina'; navigate('folder');`,
      {rotulo: 'COCINA — de la compra al plato', tras: 2});
    await a.recorrer(1.6);
  },
  modulo(`navigate('comandascocina')`, 'Comandas — lo que entra por sala, en la cocina', [
    {txt: 'Activas',  rot: 'Activas: lo que hay que sacar ahora'},
    {txt: 'Cerradas', rot: 'Cerradas: el histórico del servicio'},
  ]),
  modulo(`navigate('carta')`, 'Carta y menús — precios y disponibilidad al momento', [
    {txt: 'Carta',  rot: 'La carta, por secciones'},
    {txt: 'Menús',  rot: 'Menús del día, con sus grupos y opciones'},
  ]),
  modulo(`navigate('idr')`, 'I+D — crea platos, bases, menús y cartas con TUS precios'),
  modulo(`navigate('megalista')`, 'Mega Lista — tus ingredientes, con el precio real de tu proveedor'),
  modulo(`navigate('escandallo')`, 'Escandallo — lo que cuesta cada plato, calculado solo'),
  modulo(`navigate('fichas')`, 'Fichas técnicas — la receta que ejecuta tu equipo'),
  modulo(`navigate('proveedores')`, 'Proveedores — con quién compras y qué te cobra cada uno'),
  modulo(`navigate('pedidos')`, 'Pedidos — se generan solos con lo que falta', [
    {txt: 'Realizar Pedido',     rot: 'Crear el pedido, proveedor a proveedor'},
    {txt: 'Historial de Pedidos', rot: 'Historial: qué pediste, qué llegó y a qué precio'},
  ]),
  modulo(`navigate('stock')`, 'Stock — existencias y mínimos', [
    {txt: 'Elaboraciones', rot: 'También el stock de tus elaboraciones base'},
  ]),
  modulo(`navigate('horarios')`, 'Personal — turnos, fichajes y horas', [
    {txt: 'Día',    rot: 'El día: quién entra, quién sale'},
    {txt: 'Semana', rot: 'La semana entera de un vistazo'},
    {txt: 'Mes',    rot: 'El mes, con las horas acumuladas'},
  ]),
  modulo(`navigate('distribucion')`, 'Distribución del trabajo — quién hace qué en cada turno'),
  modulo(`navigate('limpieza')`, 'Higiene y APPCC — todo lo que te pide sanidad, registrado', [
    {txt: 'Manos',         rot: 'Registro de lavado de manos'},
    {txt: 'Temperaturas',  rot: 'Temperaturas de cámaras, con su histórico'},
    {txt: 'Alérgenos',     rot: 'Los 14 alérgenos, plato a plato'},
    {txt: 'Plagas',        rot: 'Control de plagas'},
    {txt: 'Mantenimiento', rot: 'Mantenimiento de equipos'},
  ]),

  // ── SALA ────────────────────────────────────────────────────────────────
  async a => {
    await a.ir(`currentFolder='sala'; navigate('folder');`,
      {rotulo: 'SALA — el día a día del servicio', tras: 2});
    await a.recorrer(1.6);
  },
  modulo(`navigate('tpv')`, 'TPV — comandas, mesas y cobro'),
  modulo(`navigate('reservas')`, 'Reservas — las que entran por tu web caen aquí solas'),
  modulo(`navigate('clientes')`, 'Clientes — quién repite, cuánto gasta y qué le gusta'),
  modulo(`navigate('promocion')`, 'Promoción — reseñas, encuestas y campañas'),

  // ── GESTIÓN ─────────────────────────────────────────────────────────────
  async a => {
    await a.ir(`currentFolder='gestion'; navigate('folder');`,
      {rotulo: 'GESTIÓN — lo que decide si ganas dinero (solo el dueño)', tras: 2});
    await a.recorrer(1.4);
  },
  modulo(`navigate('dashboard')`, 'Panel — ventas, márgenes y lo que pide atención hoy'),
  /* Gestión económica va a mano y no con modulo(): hay que ELEGIR EL MES
     antes de enseñar nada. Las pestañas abren por el mes en curso y, grabando
     un día 1, salía "Resultado de SEP: −7.348 €" en rojo — un mes entero de
     alquiler y nóminas contra un solo día de ventas. No es un fallo de
     cálculo, es lo que enseña cualquier contabilidad el día 1; pero lo que
     hay que ver en el vídeo es un mes CERRADO. El mes se comparte entre
     pestañas (activeMonth), así que se elige una vez. */
  async a => {
    await a.ir(`navigate('economia')`, {rotulo: 'Gestión económica — de la venta al beneficio', tras: 1.4});
    await a.pasear();
    await a.recorrer(1.8);
  },
  async a => {
    await a.pulsar('Gastos Variables', {tras: .5, rotulo: 'Costes variables: la compra de cada semana'});
    await a.pulsar('Ago', {tras: .8, rotulo: 'Mes a mes, con el mes cerrado delante'});
    await a.recorrer(1.8);
  },
  async a => {
    await a.pulsar('Gastos Fijos', {tras: .5, rotulo: 'Costes fijos: alquiler, nóminas, suministros'});
    await a.recorrer(1.6);
  },
  async a => {
    await a.pulsar('Cuenta de Resultados', {tras: .6, rotulo: 'Cuenta de resultados, trimestre a trimestre'});
    await a.recorrer(2.4);
  },
  async a => {
    await a.pulsar('Resultado', {tras: .6, rotulo: 'El resultado del año, con su impuesto de sociedades'});
    await a.recorrer(2.4);
  },
  async a => {
    await a.pulsar('Tesorería', {tras: .6, rotulo: 'Tesorería: cuándo entra y cuándo sale el dinero'});
    await a.recorrer(2);
  },
  async a => {
    await a.pulsar('Punto de equilibrio', {tras: .6, rotulo: 'Cuánto tienes que vender para no perder'});
    await a.recorrer(2);
  },
  async a => {
    await a.pulsar('CAPEX', {tras: .6, rotulo: 'Inversiones, con su financiación y sus cuotas'});
    await a.recorrer(1.8);
  },
  modulo(`navigate('minegocio')`, 'Mi Negocio — datos, equipo, nube y copias'),
  modulo(`navigate('manual')`, 'Manual — la app explicada dentro de la app'),

  // ── LA WEB PÚBLICA ──────────────────────────────────────────────────────
  async a => {
    await a.rotulo('Y esto es lo que ve el cliente del restaurante');
    await a.quieto(1.6);
    const datos = await a.datosDeLaApp();
    await a.abrir('http://localhost:8950/dist/reservagastrogoan.html', {sinRed: true,
      antes: `window.DB = DB = ${JSON.stringify(datos)}; currentTab='reserva'; renderApp();`});
    await a.rotulo('Tu web de reservas y pedidos — se genera sola con tu carta');
    await a.quieto(2.2);
    await a.recorrer(3);
  },
  async a => {
    await a.rotulo('La carta siempre al día: lo que cambias aquí, lo ve él allí');
    await a.quieto(2.2);
    await a.pasear();
  },
  async a => {
    await a.pulsar('Take Away', {tras: .8, rotulo: 'Pedidos para llevar, con tu carta y tus precios'});
    await a.recorrer(2.2);
  },
  async a => {
    await a.pulsar('Delivery', {tras: .8, rotulo: 'Y a domicilio, si el negocio lo tiene activado'});
    await a.recorrer(2.2);
  },

  // ── Cierre ──────────────────────────────────────────────────────────────
  async a => {
    await a.abrir('http://localhost:8950/dist/kit-gastrogoan-DEMO.html');
    await a.ir(`navigate('home');`, {rotulo: 'Funciona sin internet. Tus datos son tuyos.', tras: 2.6});
    await a.pasear();
  },
  async a => {
    await a.rotulo('GastroGoan · gastrogoan.com');
    await a.quieto(3);
  },
];
