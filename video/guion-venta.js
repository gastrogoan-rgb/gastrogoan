/* El vídeo corto, el de vender. Dos minutos.
 *
 * No es el completo recortado: es otro montaje. El completo enseña que la
 * app lo tiene todo; este tiene que contestar en dos minutos a la única
 * pregunta que se hace un hostelero — "¿esto qué me soluciona a mí?".
 *
 * Por eso va por problemas, no por menús: no sé lo que me cuesta un plato,
 * no sé si gano dinero, las reservas me entran por WhatsApp, sanidad me pide
 * papeles. Cada parada enseña la pantalla que resuelve uno.
 */
const parada = (js, rotulo, {leer = 2.6, mirar = true} = {}) => async a => {
  await a.ir(js, {rotulo, tras: leer});
  if(mirar) await a.pasear();
};

export const GUION = [
  async a => {
    await a.ir(`navigate('home');`, {rotulo: 'GastroGoan — todo tu restaurante, en una sola app', tras: 2.4});
    await a.pasear();
  },

  parada(`navigate('escandallo')`,
    '¿Sabes lo que te cuesta cada plato? Aquí sale solo, con tus precios.', {leer: 2.6}),
  async a => { await a.recorrer(2.6); },

  parada(`navigate('dashboard')`,
    'Y si ganas dinero este mes. Sin esperar al asesor.', {leer: 2.6}),
  async a => { await a.recorrer(2.6); },

  parada(`GE.tab && (currentFolder='gestion'), navigate('economia')`,
    'Costes fijos, variables y punto de equilibrio, al día', {leer: 2.2}),
  async a => {
    await a.pulsar('Punto', {tras: .6, rotulo: 'Cuánto tienes que vender para no perder'});
    await a.quieto(2.2);
  },

  parada(`navigate('tpv')`,
    'El TPV que ya usas para cobrar — y que alimenta todo lo anterior', {leer: 2.6}),
  async a => { await a.recorrer(2.2); },

  parada(`navigate('reservas')`,
    'Las reservas dejan de entrar por WhatsApp', {leer: 2.4}),

  async a => {
    const datos = await a.datosDeLaApp();
    await a.abrir('http://localhost:8950/dist/reservagastrogoan.html', {sinRed: true,
      antes: `window.DB = DB = ${JSON.stringify(datos)}; currentTab='reserva'; renderApp();`});
    await a.rotulo('Tu cliente reserva y pide desde tu web, con tu carta al día');
    await a.quieto(2.6);
    await a.recorrer(3.2);
  },
  async a => {
    await a.pulsar('Take Away', {tras: .9, rotulo: 'Y pide para llevar, con tu carta y tus precios'});
    await a.recorrer(3.4);
  },

  async a => {
    await a.abrir('http://localhost:8950/dist/kit-gastrogoan-DEMO.html');
    await a.ir(`currentFolder='cocina'; navigate('limpieza');`,
      {rotulo: 'Y los papeles de sanidad, hechos', tras: 2.4});
    await a.recorrer(2.4);
  },

  parada(`navigate('idr')`,
    'Con un asistente que te crea platos y menús con TUS ingredientes', {leer: 3}),

  async a => {
    await a.ir(`navigate('home');`, {rotulo: 'Sin cuotas mensuales. Sin internet obligatorio. Tus datos, tuyos.', tras: 3});
    await a.pasear();
  },
  async a => {
    await a.rotulo('GastroGoan · gastrogoan.com');
    await a.quieto(3);
  },
];
