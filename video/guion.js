/* El guion del tour. Cada parada es: a dónde va, qué rótulo sale abajo y
   cuánto se queda. Está separado del motor a propósito: cambiar el recorrido
   o los textos no debería obligar a tocar nada más. */
/* ⚠️ Los nombres de vista son los ids de index.html, no los de la etiqueta
   del menú. 'empleados' o 'ingredientes' no existen: navegar ahí no da error
   —deja la pantalla en blanco—, y el vídeo salía con el rótulo sobre un fondo
   vacío. Se comprueban con:
     grep -o 'id="view-[a-z-]*"' index.html   */
export const GUION = [
  {ir: () => navigate('home'), titulo: 'GastroGoan — todo tu restaurante, en una sola app', seg: 5},
  {ir: () => navigate('home'), titulo: 'Tres áreas: Cocina, Sala y Gestión', seg: 4},

  {ir: () => { currentFolder='cocina'; navigate('folder'); }, titulo: 'Cocina — de la compra al plato', seg: 4},
  {ir: () => navigate('megalista'), titulo: 'Tus ingredientes, con el precio real de tu proveedor', seg: 5},
  {ir: () => navigate('escandallo'), titulo: 'Escandallo — lo que cuesta cada plato, calculado solo', seg: 6},
  {ir: () => navigate('fichas'), titulo: 'Fichas técnicas — la receta que ejecuta tu equipo', seg: 5},
  {ir: () => navigate('idr'), titulo: 'I+D — un asistente que crea platos con TUS precios', seg: 6},
  {ir: () => navigate('stock'), titulo: 'Stock y elaboraciones, con sus mínimos', seg: 4},
  {ir: () => navigate('proveedores'), titulo: 'Proveedores y pedidos', seg: 4},

  {ir: () => { currentFolder='sala'; navigate('folder'); }, titulo: 'Sala — el día a día del servicio', seg: 4},
  {ir: () => navigate('tpv'), titulo: 'TPV — comandas, mesas y cobro', seg: 6},
  {ir: () => navigate('carta'), titulo: 'Carta — precios y disponibilidad al momento', seg: 5},
  {ir: () => navigate('reservas'), titulo: 'Reservas, también desde el QR de tus mesas', seg: 5},
  {ir: () => navigate('clientes'), titulo: 'Clientes y fidelización', seg: 4},

  {ir: () => { currentFolder='gestion'; navigate('folder'); }, titulo: 'Gestión — lo que decide si ganas dinero', seg: 4},
  {ir: () => navigate('dashboard'), titulo: 'Panel — ventas, márgenes y lo que pide atención hoy', seg: 6},
  {ir: () => navigate('horarios'), titulo: 'Personal — turnos, fichajes y nóminas', seg: 5},
  {ir: () => navigate('economia'), titulo: 'Gestión económica — costes fijos y rentabilidad', seg: 5},

  {ir: () => navigate('home'), titulo: 'Funciona sin internet. Tus datos son tuyos.', seg: 5},
  {ir: () => navigate('home'), titulo: 'GastroGoan · gastrogoan.com', seg: 5},
];
