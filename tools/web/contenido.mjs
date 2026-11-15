// Contenido de la web comercial en los tres idiomas. Los textos se han revisado uno a uno (15/11):
//  · el precio es el real (300 € + IVA el primer año, 240 € + IVA después) y el flujo es el real (pago → reunión de configuración);
//  · cada afirmación sobre la app se ha contrastado con lo que la app hace de verdad (por ejemplo, la nube: cada negocio usa SU proyecto gratuito de Firebase);
//  · los testimonios de la antigua página de Asesoría se han QUITADO: no consta que fueran de clientes reales y un testimonio inventado es un riesgo legal. Se vuelven a poner cuando haya uno verificable.

export const STRIPE = 'https://buy.stripe.com/bJebJ0cKCfN19Bsc19dwc03';
export const WA = 'https://wa.me/34622390245';
export const MAIL = 'gastrogoan@gmail.com';
export const IG = 'https://instagram.com/gastrogoan';
export const MAIL_PC = 'lepetitcomite.gastro@gmail.com';
export const IG_PC = 'https://instagram.com/lepetitcomite_gastro';
export const BASE = 'https://gastrogoan.com/';

export const RUTAS = {
  es: {home: 'index.html', app: 'app.html', asesoria: 'asesoria.html', eventos: 'eventos.html'},
  ca: {home: 'ca-inici.html', app: 'ca-app.html', asesoria: 'ca-assessoria.html', eventos: 'ca-esdeveniments.html'},
  en: {home: 'en-home.html', app: 'en-app.html', asesoria: 'en-advisory.html', eventos: 'en-events.html'},
};

const wa = (txt) => WA + '?text=' + encodeURIComponent(txt);
export {wa};

export const C = {};

/* ══════════════════════════════ CASTELLANO ══════════════════════════════ */
C.es = {
  lang: 'es', ogLocale: 'es_ES', idioma: 'Idioma',
  skip: 'Saltar al contenido',
  nav: {asesoria: 'Asesoría', app: 'App', eventos: 'Le Petit Comité'},
  comprar: 'Contratar la app',
  pie: {lema: 'Hecho para hosteleros, por hosteleros.', secciones: 'Secciones', contacto: 'Contacto', fin: 'GastroGoan · Cataluña', home: 'Inicio'},
  wasaludo: 'Hola Marcos, me gustaría hablar contigo.',

  home: {
    title: 'GastroGoan · Asesoría, app de gestión y eventos para hostelería',
    desc: 'Asesoramos, gestionamos y creamos experiencias gastronómicas. Asesoría 360º para tu local, la app de gestión para restaurantes y eventos privados con Le Petit Comité.',
    eyebrow: 'Hostelería · Asesoría · App · Eventos',
    h1: 'Que tu local funcione como debería.',
    lead: 'Asesoramos, gestionamos y creamos experiencias gastronómicas. Tres formas de trabajar contigo y una sola idea: que el negocio se note en la caja y en la mesa.',
    cta1: 'Ver la app', cta2: 'Hablar por WhatsApp',
    kpis: [
      {k: 'Experiencia', v: '8 años', d: 'en cocina, sala y gestión de restaurantes'},
      {k: 'La app', v: 'Sin internet', d: 'funciona aunque se caiga la conexión'},
      {k: 'Idiomas', v: 'ES · CA · EN', d: 'la app y la web, en tres idiomas'},
    ],
    cab: {eyebrow: 'Por dónde empezamos', h2: 'Elige cómo quieres que te ayude.'},
    caminos: [
      {n: '01', h: 'Asesoría', p: 'Un diagnóstico sin adornos y un plan de cuatro semanas para bares, restaurantes y cafeterías que necesitan un cambio real.', k: 'asesoria'},
      {n: '02', h: 'La app', p: 'TPV, cocina, reservas, personal y números en un solo sitio. Una licencia al año, configurada contigo.', k: 'app'},
      {n: '03', h: 'Le Petit Comité', p: 'Eventos privados, catas guiadas y chef a domicilio. Nos encargamos de todo; tú solo te sientas a la mesa.', k: 'eventos'},
    ],
    cierre: {h2: '¿Hablamos de tu local?', p: 'La primera conversación no te cuesta nada. Me cuentas tu situación y te digo por dónde empezaría.', cta: 'Escríbeme por WhatsApp'},
  },

  app: {
    title: 'GastroGoan App · TPV, cocina, reservas y números para tu restaurante',
    desc: 'Una sola app para tu restaurante: TPV, comandas, escandallos, stock, reservas y pedidos online, personal y gestión económica. 300 € + IVA el primer año, con la puesta a punto incluida.',
    eyebrow: '02 · App GastroGoan',
    h1: 'Una app para todo tu restaurante.',
    lead: 'TPV, cocina, reservas, personal y números en un único sitio, que funciona incluso sin internet. Pagas una licencia al año y la dejamos configurada contigo.',
    comprar: 'Contratar · 300 € + IVA', ver: 'Ver qué incluye', hablar: 'Hablar con Marcos',
    mini: '20 € al mes en pago anual · el primer año incluye la puesta a punto',
    escaparate: {
      eyebrow: 'La app por dentro', h2: 'Esto es lo que vas a usar cada día.',
      lead: 'Capturas reales de la app, con los datos de un restaurante de ejemplo.',
      tabs: [
        {id: 'tpv', label: 'TPV', cap: 'Mesas con su estado, el tiempo que llevan abiertas y el total, de un vistazo. Pensado para el servicio, con una mano.'},
        {id: 'comandas', label: 'Cocina', cap: 'Las comandas llegan a cocina en tiempo real, con las alergias en rojo y lo que se prepara en cada momento.'},
        {id: 'reservas', label: 'Reservas', cap: 'Reservas del día, solicitudes de la web y recordatorios por WhatsApp, vinculadas a las mesas del TPV.'},
        {id: 'panel', label: 'Panel', cap: 'Tu punto de equilibrio del mes y si vas por delante o por detrás, con las cifras reales de tus ventas.'},
        {id: 'resultados', label: 'Resultados', cap: 'Cuenta de resultados con la estructura que espera tu gestor: ventas, aprovisionamientos, personal, EBITDA.'},
      ],
    },
    problema: {
      eyebrow: 'El problema', h2: '¿Cuántas suscripciones pagas hoy?',
      lead: 'La hostelería se ha llenado de cuotas: una para el TPV, otra para la carta digital, otra para las reservas… Cada una sube de precio cada año y ninguna habla con las demás.',
      filas: [['Software de TPV', '99 €/mes'], ['Plataformas de delivery', '99 €/mes'], ['Carta digital y QR', '20 €/mes'], ['Página de reservas', '30 €/mes'], ['Gestión del personal', '40 €/mes'], ['Gestión económica', '40 €/mes']],
      total: ['Un local medio, en suscripciones', '≈ 300 €/mes'],
      nota: 'Ejemplo orientativo de un local medio. Los importes varían según el proveedor y el tamaño del negocio.',
      vs: [
        {k: 'Varias apps', gran: '≈ 3.600 €', p: 'al año, para siempre, en seis cuotas que no se hablan entre sí.'},
        {k: 'GastroGoan', gran: '240 €', p: 'al año a partir del segundo, con todo dentro. El primer año, 300 € con la puesta a punto.', bueno: true},
      ],
      ahorro: 'Ahorro estimado: más de 3.000 € al año.',
    },
    incluye: {
      eyebrow: 'Qué incluye', h2: 'Sala, cocina y gestión, en una sola licencia.',
      lead: 'Todo lo que aparece aquí está en la app hoy, sin módulos de pago aparte.',
      zonas: [
        {t: 'Sala', items: [
          ['TPV completo', 'Mesas, comandas, cuentas divididas, propinas, cobro con tarjeta, efectivo o vale regalo, y cierre de caja.'],
          ['Reservas y pedidos online', 'Una web propia para que tus clientes reserven, pidan para llevar o a domicilio y sigan su pedido.'],
          ['Clientes y promociones', 'Ficha de cliente, fidelidad, vales regalo y novedades por email y WhatsApp.'],
        ]},
        {t: 'Cocina', items: [
          ['Pantalla de comandas', 'Lo que se pide en sala sale en cocina al instante, con alergias y notas.'],
          ['Escandallos y fichas técnicas', 'El coste real de cada plato, el food cost y la receta paso a paso.'],
          ['Stock, mermas y pedidos', 'Inventario al día, avisos de mínimo, pedidos a proveedor y recepción de albaranes.'],
          ['APPCC sin papel', 'Limpieza, temperaturas y alérgenos con su registro, listo para una inspección.'],
        ]},
        {t: 'Gestión', items: [
          ['Gestión económica', 'Gastos, tesorería, cuenta de resultados, punto de equilibrio y previsión de impuestos.'],
          ['Panel de control', 'Ventas, gastos y resultado del día, de la semana y del mes, con alertas de lo que pide atención.'],
          ['Personal', 'Horarios, fichajes, tareas y turnos de cada empleado, con su propio PIN.'],
          ['Envío al gestor', 'Un paquete con tus libros en Excel y las facturas del periodo, listo para tu gestoría.'],
        ]},
      ],
    },
    pasos: {
      eyebrow: 'Cómo empezar', h2: 'De la compra a tu primer servicio, en tres pasos.',
      items: [
        {t: 'Contratas la licencia', p: 'Pago seguro con Stripe. La factura te llega por correo, y la renovación anual se cobra sola.'},
        {t: 'Reservas tu reunión', p: 'Tras pagar eliges día y hora para una videollamada de una hora. En ella damos de alta tu negocio y cargamos tu carta, tu horario y tus mesas.'},
        {t: 'Empiezas a trabajar', p: 'Te enseño a usarla con tu propio equipo. Sales de la reunión con la app funcionando, no con un manual.'},
      ],
    },
    garantias: {
      eyebrow: 'Pensada para el servicio', h2: 'No se para cuando se para todo lo demás.',
      items: [
        {icon: 'offline', t: 'Funciona sin internet', p: 'Una vez instalada, abre y trabaja sin conexión. Cuando vuelve la red, se sincroniza sola.'},
        {icon: 'nube', t: 'Tus datos son tuyos', p: 'Se guardan en tu aparato y en tu propia nube gratuita de Google, que configuramos juntos. GastroGoan no cobra por ella.'},
        {icon: 'equipo', t: 'Todo tu equipo, sin cuotas por usuario', p: 'Cocina, barra y sala. Cada empleado entra con su PIN y ve solo lo que le toca.'},
        {icon: 'actualiza', t: 'Siempre al día', p: 'Las mejoras llegan solas y sin coste. Si estás en pleno servicio, no te interrumpe: te avisa y eliges cuándo actualizar.'},
      ],
    },
    precio: {
      eyebrow: 'Precio', h2: 'Un precio claro. Sin letra pequeña.',
      p: 'Una licencia por local y año, con todas las funciones. La primera vez incluye la reunión de puesta a punto, para que salgas funcionando desde el primer día.',
      rot: 'Primer año', cifra: '300 €', peque: '+ IVA',
      sub: 'Después, 240 € + IVA al año: 20 € al mes.',
      lin: [['Licencia anual', '240 €'], ['Puesta a punto inicial (una sola vez)', '60 €'], ['Primer año', '300 € + IVA'], ['Desde el segundo año', '240 € + IVA']],
      incluye: ['Todas las funciones de la app', 'Reunión de configuración de una hora', 'Actualizaciones incluidas', 'Sin coste por usuario ni por dispositivo', 'Factura automática por correo'],
      cta: 'Contratar la app',
      peq: 'Pago seguro con Stripe. Se renueva cada año y te avisamos antes de cobrar.',
    },
    faq: {
      eyebrow: 'Preguntas frecuentes', mas: '¿Otra duda? Escríbeme y te contesto yo.', masCta: 'Hablar con Marcos', h2: 'Lo que suelen preguntarme antes de empezar.',
      items: [
        ['¿Qué pasa después de pagar?', 'Te llega la factura por correo y, al terminar el pago, ves una página para reservar tu reunión de configuración. En esa hora de videollamada dejamos tu negocio funcionando.'],
        ['¿Funciona sin conexión a internet?', 'Sí. Una vez instalada en tu tablet, móvil u ordenador, la app abre y trabaja sin conexión: tomar notas, cobrar, sacar comandas. Cuando vuelve la red, sincroniza. Internet solo hace falta para sincronizar entre aparatos y para las reservas y pedidos que llegan por la web.'],
        ['¿Dónde se guardan mis datos?', 'En tu aparato y en tu propio proyecto gratuito de Firebase (Google). Lo creamos juntos en la reunión. Así los datos son tuyos y GastroGoan no paga ni cobra nada por almacenarlos.'],
        ['¿Cuántas personas pueden usarla?', 'Todo tu equipo, sin coste por usuario ni por dispositivo. Cada empleado entra con su PIN y ve solo su área.'],
        ['¿Y si tengo más de un local?', 'Cada local lleva su propia licencia. Puedes abrir sucursales que heredan tu carta, recetas, ingredientes y protocolos, y verlas todas desde tu misma cuenta.'],
        ['¿Necesito conocimientos técnicos?', 'No. Está pensada para el día a día de un local. En la reunión inicial la configuramos contigo y la usas con tu equipo antes de colgar.'],
        ['¿Qué pasa si se cae internet en pleno servicio?', 'Sigues trabajando. La app funciona en local y sincroniza cuando vuelve la conexión. Los pedidos y reservas que lleguen por la web esperan a que la recuperes.'],
        ['¿Cómo paso mi carta y mis productos?', 'En la reunión inicial cargamos contigo tu carta, tus productos y tus proveedores. Si los tienes en hojas de cálculo, te ayudamos a pasarlos.'],
        ['¿Se actualiza?', 'Sí, sola y sin coste. Si estás trabajando no te interrumpe: te avisa y eliges cuándo actualizar.'],
        ['¿Es seguro el pago?', 'Cobra Stripe, uno de los procesadores de pago más usados del mundo. GastroGoan nunca ve ni guarda los datos de tu tarjeta.'],
      ],
    },
    cierre: {h2: 'Tu local trabaja cada día. Que la app trabaje con él.', p: 'Una licencia, una reunión y todo tu restaurante en un solo sitio.', cta: 'Contratar la app · 300 € + IVA', cta2: 'Hablar con Marcos'},
  },

  asesoria: {
    title: 'Asesoría 360º para restaurantes, bares y cafeterías · GastroGoan',
    desc: 'Asesoría gastronómica 360º: cliente misterioso, diagnóstico, plan de acción de cuatro semanas y acompañamiento. Para dueños de bares, restaurantes y cafeterías que quieren datos, no ánimos.',
    eyebrow: '01 · Asesoría 360º',
    h1: 'Estrategias con sabor a éxito.',
    lead: 'Un diagnóstico sin adornos, un plan de cuatro semanas y acompañamiento hasta que el cambio está hecho.',
    cta: 'Empezar por WhatsApp', cta2: 'Ver cómo trabajo',
    sobre: {
      eyebrow: 'Sobre mí', h2: 'Datos, no ánimos.',
      q: 'Ocho años de formación y trayectoria en restaurantes de renombre. Hoy trabajo con dueños de bares, restaurantes y cafeterías que quieren datos, no ánimos. Si buscas a alguien que te diga que todo va bien, no soy tu asesor.',
      firma: 'Marcos González · Fundador de GastroGoan',
      p: 'Mi método es simple: veo tu local como lo ve tu cliente, te digo la verdad y me quedo contigo hasta que el cambio está hecho.',
    },
    ruta: {
      eyebrow: 'La ruta 360º', h2: 'Cinco fases, seis áreas del negocio.',
      lead: 'Trabajo mano a mano con cada proyecto mediante un proceso orientado a resolver problemas y generar resultados reales. Evalúo seis áreas y las ordeno por prioridad.',
      areas: ['Concepto', 'Marca', 'Cocina', 'Sala', 'Gestión', 'Captación'],
      fases: [
        ['Fase 1', 'Cliente misterioso', 'Voy a tu local sin avisar y vivo tu comida y tu servicio como un cliente más. Es la única forma de ver la realidad tal cual es.'],
        ['Fase 2', 'Reunión inicial', 'Me cuentas qué está pasando y lo cruzamos con lo que he visto. Salimos con la foto real de tus números y tus objetivos.'],
        ['Fase 3', 'Evaluación', 'Analizo cada área y le pongo una nota objetiva a tu local, con datos y no con impresiones.'],
        ['Fase 4', 'Plan de acción', 'Cada cambio clasificado por prioridad —urgente, importante, complementario— en un calendario de cuatro semanas.'],
        ['Fase 5', 'Acompañamiento', 'WhatsApp, videollamada semanal y visitas presenciales durante cuatro semanas, para que el plan no se quede en buenas intenciones.'],
      ],
      aperturas: '¿Local nuevo? Existe una versión del programa de 30 días para aperturas.', aperturasCta: 'Pregúntame',
    },
    extras: {
      eyebrow: 'Extras que suman', h2: 'Cuando necesitas algo concreto.',
      cta: 'Cuéntame tu caso',
      items: [
        ['Asesoramiento puntual', 'Una duda concreta, una decisión importante o una segunda opinión profesional, con conclusiones por escrito.'],
        ['Apertura de locales', 'Concepto, carta, escandallos, equipo y puesta en marcha. Programa de 30 días para abrir con criterio.'],
        ['Gestión de eventos', 'Planificación y ejecución de eventos en tu local: del menú al servicio, con control de costes y tiempos.'],
        ['Selección de personal', 'Definición del perfil, criba, entrevistas y pruebas prácticas. Personal que encaja con tu local.'],
        ['Formación de equipos', 'Protocolos de servicio, venta sugerida y organización de partidas. En tu local, con tu equipo real.'],
        ['Team building', 'Jornadas gastronómicas para cohesionar equipos: cocinar juntos, catar juntos y entender el oficio.'],
        ['Redes sociales', 'Estrategia de contenido para tu local: qué publicar, cuándo y para qué. Redes que traen mesas.'],
        ['Fotografía gastronómica', 'Sesión de fotos profesional de tus platos y tu espacio, lista para carta, web y redes.'],
      ],
    },
    dif: {
      eyebrow: 'Lo que nos diferencia', h2: 'Cómo trabajo contigo.',
      items: ['Pasión auténtica por la gastronomía en cada estrategia', 'Enfoque 100 % personalizado', 'Compromiso total con cada cliente', 'Estrategias prácticas con resultados reales y medibles', 'Acompañamiento constante y cercano', 'Atención meticulosa durante todo el proceso'],
    },
    cierre: {h2: 'Tu local puede dar más. Hablemos.', p: 'Primera conversación sin coste. Me cuentas tu situación y te digo si puedo ayudarte, o no.', cta: 'Empezar ahora · WhatsApp'},
  },

  eventos: {
    title: 'Le Petit Comité · Eventos gastronómicos privados, catas y chef a domicilio',
    desc: 'Eventos gastronómicos privados, catas guiadas y chef a domicilio en Cataluña. Nos encargamos de menú, compra, montaje, servicio y limpieza. Propuesta en 48 horas.',
    eyebrow: '03 · Eventos gastronómicos · por GastroGoan',
    h1: 'Le Petit Comité. Una mesa, muchas historias.',
    lead: 'Eventos gastronómicos privados, catas guiadas y chef a domicilio. Nos encargamos de todo —menú, compra, montaje, servicio y limpieza— para que tú solo estés en la mesa.',
    cta: 'Pedir propuesta',
    serv: {
      eyebrow: 'Qué hacemos', h2: 'Tres maneras de sentarse a la mesa.',
      items: [
        ['Servicio 01', 'Eventos gastronómicos', 'Diseño y ejecución de celebraciones privadas, pop-ups y cenas temáticas: menú a medida, compra y logística, montaje y servicio profesional. Adaptable a cualquier formato y aforo, con coordinación integral.'],
        ['Servicio 02', 'Catas y maridajes', 'Sesiones guiadas para descubrir productos y combinaciones —vinos, cervezas, aceites, quesos—, con selección de muestras, guion de cata y material de apoyo. Para grupos reducidos y acciones de fidelización.'],
        ['Servicio 03', 'Chef privado', 'No es un evento puntual: cocino en tu propia casa cada semana o cada mes, con la compra hecha y comidas listas, para que comas bien sin pensar en ello. También disponible para un día concreto si lo prefieres.'],
      ],
    },
    como: {
      eyebrow: 'Cómo funciona', h2: 'De tu idea a la mesa, en tres pasos.',
      items: [
        {t: 'Me cuentas la ocasión', p: 'Fecha, número de personas, lugar y qué quieres celebrar. Por WhatsApp o email.'},
        {t: 'Propuesta en 48 horas', p: 'Menú, formato y presupuesto cerrado. Sin sorpresas ni extras ocultos.'},
        {t: 'Nos encargamos de todo', p: 'Compra, montaje, servicio y limpieza. Tú solo te sientas a la mesa.'},
      ],
    },
    datos: [
      {k: 'Comensales', v: '2–50', d: 'personas por evento'},
      {k: 'Dónde', v: 'Donde tú quieras', d: 'tu casa, tu local o el espacio que elijas'},
      {k: 'Zona', v: 'Cataluña', d: 'con base en el Penedès'},
    ],
    menus: {
      eyebrow: 'Menús de ejemplo', h2: 'Seis maneras de sentarse a la mesa.',
      nota: 'Cada menú se diseña desde cero para tu ocasión. Estos son solo ejemplos del nivel.',
      lista: [
        {tab: 'Arrocero', k: '01 · Arrocero', t: 'Alrededor de la paella', filas: [['Para picar', 'Pan de cristal con tomate, jamón y anchoas'], ['Entrante', 'Gamba roja y calamar a la plancha'], ['El arroz', 'Arroz meloso de galeras y sepia · a elegir'], ['Postre', 'Crema catalana quemada al momento']], cierre: 'Arroz terminado delante de tus invitados'},
        {tab: 'Barbacoa', k: '02 · A la brasa', t: 'Barbacoa de autor', filas: [['Del fuego', 'Verduras de temporada a la llama con romesco'], ['Para compartir', 'Butifarra artesana y costillas glaseadas'], ['Principal', 'Chuletón madurado a la brasa de encina'], ['Postre', 'Piña a la brasa con helado de coco']], cierre: 'Brasa en directo en tu jardín o terraza'},
        {tab: 'Cata de vinos', k: '03 · Cata guiada', t: 'Cinco vinos del Penedès', filas: [['Blancos', 'Dos blancos de variedad autóctona'], ['Cava', 'Un cava de crianza como transición'], ['Tintos', 'Dos tintos de bodegas pequeñas de la zona'], ['Acompaña', 'Tabla de embutido y queso curado']], cierre: 'Guiada en directo, explicando cada copa'},
        {tab: 'Maridaje de quesos', k: '04 · Maridaje', t: 'Quesos y vino, paso a paso', filas: [['Frescos', 'Quesos frescos con blanco joven'], ['Semicurados', 'Semicurados de oveja con cava'], ['Curados', 'Curados intensos con tinto de crianza'], ['Azules', 'Azul con vino dulce, para cerrar']], cierre: 'Ocho quesos, cuatro vinos, una conversación'},
        {tab: 'Chef semanal', k: '05 · Chef privado', t: 'Tu semana, resuelta', filas: [['Lunes', 'Compra y planificación del menú semanal'], ['Cocina', 'Cocinado en tu propia cocina, en casa'], ['Raciones', 'Comidas y cenas listas, etiquetadas por día'], ['Ritmo', 'Repetición semanal o mensual, a tu medida']], cierre: 'Sin pensar en la compra ni en fregar'},
        {tab: 'Chef puntual', k: '06 · Chef privado', t: 'Un día concreto, en tu casa', filas: [['Antes', 'Menú acordado y compra hecha por mí'], ['Durante', 'Cocino en tu cocina, sin salir de casa'], ['Después', 'Cocina recogida, sin rastro de trabajo'], ['Ideal para', 'Una ocasión puntual, sin compromiso semanal']], cierre: 'Igual de cuidado, sin repetición'},
      ],
    },
    oca: {
      eyebrow: 'Para cada ocasión', h2: '¿Qué celebramos?',
      items: ['Cumpleaños', 'Aniversario', 'Cena de empresa', 'Pedida de mano', 'Cata con amigos', 'Cena íntima'],
      msg: (o) => `Hola, quiero organizar: ${o}, con Le Petit Comité`,
      otra: '¿Otra ocasión? Escríbeme y la montamos.',
    },
    cierre: {h2: 'Escríbeme.', p: 'Fecha, tipo de evento y personas. Propuesta en 48 horas.', cta: 'Escribir por WhatsApp'},
  },

  gracias: {
    title: 'Reserva tu reunión de configuración · GastroGoan',
    pasos: [['Hecho', 'Pago recibido'], ['Ahora', 'Reserva tu hora'], ['Después', 'Reunión de configuración']],
    h1: 'Tu pago está hecho. Falta reservar la hora de configuración.',
    lead: 'Sin esta reunión no podemos dar de alta tu negocio ni dejar la app lista. Elige el día y la hora que mejor te vengan.',
    rot: 'Reunión inicial · 1 hora · videollamada',
    caja: 'Reserva ahora tu hora de configuración',
    cajaP: 'En esa hora damos de alta tu restaurante, lo configuramos contigo y te enseñamos a usar la app.',
    cta: 'Elegir día y hora', nota: 'Recibirás la confirmación por correo, con el enlace de la videollamada.',
    hacemos: 'Qué hacemos en la reunión',
    hacemosL: ['Damos de alta tu negocio en GastroGoan.', 'Cargamos tu carta, tu horario y tus mesas.', 'Te enseñamos cómo se usa, para que salgas sabiendo manejarla.'],
    mano: 'Ten a mano',
    manoL: ['Tu carta con los precios.', 'El horario del local y el plano de mesas.', 'El nombre de las personas que usarán la app.', 'Un ordenador, una tablet o un móvil con internet.'],
    factura: 'Tu factura', facturaP: 'Te llega por correo desde Stripe. La renovación anual se cobra sola y recibirás la factura cada año.',
    pie: '¿No puedes elegir hora o algo no funciona? Responde al correo de la factura, o escríbeme por WhatsApp.',
  },
};

/* ══════════════════════════════ CATALÀ ══════════════════════════════ */
C.ca = {
  lang: 'ca', ogLocale: 'ca_ES', idioma: 'Idioma',
  skip: 'Saltar al contingut',
  nav: {asesoria: 'Assessoria', app: 'App', eventos: 'Le Petit Comité'},
  comprar: 'Contractar l\'app',
  pie: {lema: 'Fet per a hostalers, per hostalers.', secciones: 'Seccions', contacto: 'Contacte', fin: 'GastroGoan · Catalunya', home: 'Inici'},
  wasaludo: 'Hola Marcos, m\'agradaria parlar amb tu.',

  home: {
    title: 'GastroGoan · Assessoria, app de gestió i esdeveniments per a l\'hostaleria',
    desc: 'Assessorem, gestionem i creem experiències gastronòmiques. Assessoria 360º per al teu local, l\'app de gestió per a restaurants i esdeveniments privats amb Le Petit Comité.',
    eyebrow: 'Hostaleria · Assessoria · App · Esdeveniments',
    h1: 'Que el teu local funcioni com ha de funcionar.',
    lead: 'Assessorem, gestionem i creem experiències gastronòmiques. Tres maneres de treballar amb tu i una sola idea: que el negoci es noti a la caixa i a la taula.',
    cta1: 'Veure l\'app', cta2: 'Parlar per WhatsApp',
    kpis: [
      {k: 'Experiència', v: '8 anys', d: 'en cuina, sala i gestió de restaurants'},
      {k: 'L\'app', v: 'Sense internet', d: 'funciona encara que es talli la connexió'},
      {k: 'Idiomes', v: 'ES · CA · EN', d: 'l\'app i el web, en tres idiomes'},
    ],
    cab: {eyebrow: 'Per on comencem', h2: 'Tria com vols que t\'ajudi.'},
    caminos: [
      {n: '01', h: 'Assessoria', p: 'Un diagnòstic sense adorns i un pla de quatre setmanes per a bars, restaurants i cafeteries que necessiten un canvi real.', k: 'asesoria'},
      {n: '02', h: 'L\'app', p: 'TPV, cuina, reserves, personal i números en un sol lloc. Una llicència a l\'any, configurada amb tu.', k: 'app'},
      {n: '03', h: 'Le Petit Comité', p: 'Esdeveniments privats, tastos guiats i xef a domicili. Ens ocupem de tot; tu només t\'asseus a taula.', k: 'eventos'},
    ],
    cierre: {h2: 'Parlem del teu local?', p: 'La primera conversa no et costa res. M\'expliques la teva situació i et dic per on començaria.', cta: 'Escriu-me per WhatsApp'},
  },

  app: {
    title: 'GastroGoan App · TPV, cuina, reserves i números per al teu restaurant',
    desc: 'Una sola app per al teu restaurant: TPV, comandes, escandalls, estoc, reserves i comandes en línia, personal i gestió econòmica. 300 € + IVA el primer any, amb la posada a punt inclosa.',
    eyebrow: '02 · App GastroGoan',
    h1: 'Una app per a tot el teu restaurant.',
    lead: 'TPV, cuina, reserves, personal i números en un únic lloc, que funciona fins i tot sense internet. Pagues una llicència a l\'any i la deixem configurada amb tu.',
    comprar: 'Contractar · 300 € + IVA', ver: 'Veure què inclou', hablar: 'Parlar amb Marcos',
    mini: '20 € al mes en pagament anual · el primer any inclou la posada a punt',
    escaparate: {
      eyebrow: 'L\'app per dins', h2: 'Això és el que faràs servir cada dia.',
      lead: 'Captures reals de l\'app, amb les dades d\'un restaurant d\'exemple.',
      tabs: [
        {id: 'tpv', label: 'TPV', cap: 'Taules amb el seu estat, el temps que porten obertes i el total, d\'un cop d\'ull. Pensat per al servei, amb una sola mà.'},
        {id: 'comandas', label: 'Cuina', cap: 'Les comandes arriben a cuina en temps real, amb les al·lèrgies en vermell i el que es prepara a cada moment.'},
        {id: 'reservas', label: 'Reserves', cap: 'Reserves del dia, sol·licituds del web i recordatoris per WhatsApp, vinculades a les taules del TPV.'},
        {id: 'panel', label: 'Tauler', cap: 'El teu punt d\'equilibri del mes i si vas per davant o per darrere, amb les xifres reals de les teves vendes.'},
        {id: 'resultados', label: 'Resultats', cap: 'Compte de resultats amb l\'estructura que espera el teu gestor: vendes, aprovisionaments, personal, EBITDA.'},
      ],
    },
    problema: {
      eyebrow: 'El problema', h2: 'Quantes subscripcions pagues avui?',
      lead: 'L\'hostaleria s\'ha omplert de quotes: una per al TPV, una altra per a la carta digital, una altra per a les reserves… Cadascuna puja de preu cada any i cap parla amb les altres.',
      filas: [['Programari de TPV', '99 €/mes'], ['Plataformes de delivery', '99 €/mes'], ['Carta digital i QR', '20 €/mes'], ['Pàgina de reserves', '30 €/mes'], ['Gestió del personal', '40 €/mes'], ['Gestió econòmica', '40 €/mes']],
      total: ['Un local mitjà, en subscripcions', '≈ 300 €/mes'],
      nota: 'Exemple orientatiu d\'un local mitjà. Els imports varien segons el proveïdor i la mida del negoci.',
      vs: [
        {k: 'Diverses apps', gran: '≈ 3.600 €', p: 'a l\'any, per sempre, en sis quotes que no es parlen entre elles.'},
        {k: 'GastroGoan', gran: '240 €', p: 'a l\'any a partir del segon, amb tot dins. El primer any, 300 € amb la posada a punt.', bueno: true},
      ],
      ahorro: 'Estalvi estimat: més de 3.000 € l\'any.',
    },
    incluye: {
      eyebrow: 'Què inclou', h2: 'Sala, cuina i gestió, en una sola llicència.',
      lead: 'Tot el que apareix aquí és a l\'app avui, sense mòduls de pagament a part.',
      zonas: [
        {t: 'Sala', items: [
          ['TPV complet', 'Taules, comandes, comptes dividits, propines, cobrament amb targeta, efectiu o val regal, i tancament de caixa.'],
          ['Reserves i comandes en línia', 'Un web propi perquè els teus clients reservin, demanin per emportar o a domicili i segueixin la comanda.'],
          ['Clients i promocions', 'Fitxa de client, fidelitat, vals regal i novetats per email i WhatsApp.'],
        ]},
        {t: 'Cuina', items: [
          ['Pantalla de comandes', 'El que es demana a sala surt a cuina a l\'instant, amb al·lèrgies i notes.'],
          ['Escandalls i fitxes tècniques', 'El cost real de cada plat, el food cost i la recepta pas a pas.'],
          ['Estoc, minves i comandes', 'Inventari al dia, avisos de mínim, comandes a proveïdor i recepció d\'albarans.'],
          ['APPCC sense paper', 'Neteja, temperatures i al·lèrgens amb el seu registre, a punt per a una inspecció.'],
        ]},
        {t: 'Gestió', items: [
          ['Gestió econòmica', 'Despeses, tresoreria, compte de resultats, punt d\'equilibri i previsió d\'impostos.'],
          ['Tauler de control', 'Vendes, despeses i resultat del dia, de la setmana i del mes, amb alertes del que demana atenció.'],
          ['Personal', 'Horaris, fitxatges, tasques i torns de cada empleat, amb el seu propi PIN.'],
          ['Enviament al gestor', 'Un paquet amb els teus llibres en Excel i les factures del període, a punt per a la teva gestoria.'],
        ]},
      ],
    },
    pasos: {
      eyebrow: 'Com començar', h2: 'De la compra al teu primer servei, en tres passos.',
      items: [
        {t: 'Contractes la llicència', p: 'Pagament segur amb Stripe. La factura t\'arriba per correu, i la renovació anual es cobra sola.'},
        {t: 'Reserves la reunió', p: 'Després de pagar tries dia i hora per a una videotrucada d\'una hora. Hi donem d\'alta el teu negoci i carreguem la teva carta, el teu horari i les teves taules.'},
        {t: 'Comences a treballar', p: 'T\'ensenyo a fer-la servir amb el teu propi equip. Surts de la reunió amb l\'app funcionant, no amb un manual.'},
      ],
    },
    garantias: {
      eyebrow: 'Pensada per al servei', h2: 'No s\'atura quan s\'atura tota la resta.',
      items: [
        {icon: 'offline', t: 'Funciona sense internet', p: 'Un cop instal·lada, obre i treballa sense connexió. Quan torna la xarxa, se sincronitza sola.'},
        {icon: 'nube', t: 'Les teves dades són teves', p: 'Es guarden al teu aparell i al teu propi núvol gratuït de Google, que configurem junts. GastroGoan no en cobra res.'},
        {icon: 'equipo', t: 'Tot el teu equip, sense quotes per usuari', p: 'Cuina, barra i sala. Cada empleat entra amb el seu PIN i només veu el que li toca.'},
        {icon: 'actualiza', t: 'Sempre al dia', p: 'Les millores arriben soles i sense cost. Si ets en ple servei, no t\'interromp: t\'avisa i tries quan actualitzar.'},
      ],
    },
    precio: {
      eyebrow: 'Preu', h2: 'Un preu clar. Sense lletra petita.',
      p: 'Una llicència per local i any, amb totes les funcions. La primera vegada inclou la reunió de posada a punt, perquè surtis funcionant des del primer dia.',
      rot: 'Primer any', cifra: '300 €', peque: '+ IVA',
      sub: 'Després, 240 € + IVA a l\'any: 20 € al mes.',
      lin: [['Llicència anual', '240 €'], ['Posada a punt inicial (una sola vegada)', '60 €'], ['Primer any', '300 € + IVA'], ['A partir del segon any', '240 € + IVA']],
      incluye: ['Totes les funcions de l\'app', 'Reunió de configuració d\'una hora', 'Actualitzacions incloses', 'Sense cost per usuari ni per dispositiu', 'Factura automàtica per correu'],
      cta: 'Contractar l\'app',
      peq: 'Pagament segur amb Stripe. Es renova cada any i t\'avisem abans de cobrar.',
    },
    faq: {
      eyebrow: 'Preguntes freqüents', mas: 'Un altre dubte? Escriu-me i et responc jo.', masCta: 'Parlar amb Marcos', h2: 'El que sovint em pregunten abans de començar.',
      items: [
        ['Què passa després de pagar?', 'T\'arriba la factura per correu i, en acabar el pagament, veus una pàgina per reservar la teva reunió de configuració. En aquella hora de videotrucada deixem el teu negoci funcionant.'],
        ['Funciona sense connexió a internet?', 'Sí. Un cop instal·lada a la teva tauleta, mòbil o ordinador, l\'app obre i treballa sense connexió: prendre notes, cobrar, treure comandes. Quan torna la xarxa, sincronitza. Internet només cal per sincronitzar entre aparells i per a les reserves i comandes que arriben pel web.'],
        ['On es guarden les meves dades?', 'Al teu aparell i al teu propi projecte gratuït de Firebase (Google). El creem junts a la reunió. Així les dades són teves i GastroGoan no paga ni cobra res per emmagatzemar-les.'],
        ['Quantes persones la poden fer servir?', 'Tot el teu equip, sense cost per usuari ni per dispositiu. Cada empleat entra amb el seu PIN i només veu la seva àrea.'],
        ['I si tinc més d\'un local?', 'Cada local porta la seva pròpia llicència. Pots obrir sucursals que hereten la teva carta, receptes, ingredients i protocols, i veure-les totes des del mateix compte.'],
        ['Necessito coneixements tècnics?', 'No. Està pensada per al dia a dia d\'un local. A la reunió inicial la configurem amb tu i la fas servir amb el teu equip abans de penjar.'],
        ['Què passa si cau internet en ple servei?', 'Continues treballant. L\'app funciona en local i sincronitza quan torna la connexió. Les comandes i reserves que arribin pel web esperen que la recuperis.'],
        ['Com passo la meva carta i els meus productes?', 'A la reunió inicial carreguem amb tu la teva carta, els teus productes i els teus proveïdors. Si els tens en fulls de càlcul, t\'ajudem a passar-los.'],
        ['S\'actualitza?', 'Sí, sola i sense cost. Si estàs treballant no t\'interromp: t\'avisa i tries quan actualitzar.'],
        ['És segur el pagament?', 'Cobra Stripe, un dels processadors de pagament més usats del món. GastroGoan mai veu ni guarda les dades de la teva targeta.'],
      ],
    },
    cierre: {h2: 'El teu local treballa cada dia. Que l\'app hi treballi.', p: 'Una llicència, una reunió i tot el teu restaurant en un sol lloc.', cta: 'Contractar l\'app · 300 € + IVA', cta2: 'Parlar amb Marcos'},
  },

  asesoria: {
    title: 'Assessoria 360º per a restaurants, bars i cafeteries · GastroGoan',
    desc: 'Assessoria gastronòmica 360º: client misteriós, diagnòstic, pla d\'acció de quatre setmanes i acompanyament. Per a propietaris de bars, restaurants i cafeteries que volen dades, no ànims.',
    eyebrow: '01 · Assessoria 360º',
    h1: 'Estratègies amb gust d\'èxit.',
    lead: 'Un diagnòstic sense adorns, un pla de quatre setmanes i acompanyament fins que el canvi està fet.',
    cta: 'Començar per WhatsApp', cta2: 'Veure com treballo',
    sobre: {
      eyebrow: 'Sobre mi', h2: 'Dades, no ànims.',
      q: 'Vuit anys de formació i trajectòria en restaurants de renom. Avui treballo amb propietaris de bars, restaurants i cafeteries que volen dades, no ànims. Si busques algú que et digui que tot va bé, no sóc el teu assessor.',
      firma: 'Marcos González · Fundador de GastroGoan',
      p: 'El meu mètode és simple: veig el teu local com el veu el teu client, et dic la veritat i em quedo amb tu fins que el canvi està fet.',
    },
    ruta: {
      eyebrow: 'La ruta 360º', h2: 'Cinc fases, sis àrees del negoci.',
      lead: 'Treballo colze a colze amb cada projecte mitjançant un procés orientat a resoldre problemes i generar resultats reals. Avaluo sis àrees i les ordeno per prioritat.',
      areas: ['Concepte', 'Marca', 'Cuina', 'Sala', 'Gestió', 'Captació'],
      fases: [
        ['Fase 1', 'Client misteriós', 'Vaig al teu local sense avisar i visc el teu menjar i el teu servei com un client més. És l\'única manera de veure la realitat tal com és.'],
        ['Fase 2', 'Reunió inicial', 'M\'expliques què passa i ho creuem amb el que he vist. Sortim amb la foto real dels teus números i els teus objectius.'],
        ['Fase 3', 'Avaluació', 'Analitzo cada àrea i poso una nota objectiva al teu local, amb dades i no amb impressions.'],
        ['Fase 4', 'Pla d\'acció', 'Cada canvi classificat per prioritat —urgent, important, complementari— en un calendari de quatre setmanes.'],
        ['Fase 5', 'Acompanyament', 'WhatsApp, videotrucada setmanal i visites presencials durant quatre setmanes, perquè el pla no es quedi en bones intencions.'],
      ],
      aperturas: 'Local nou? Existeix una versió del programa de 30 dies per a obertures.', aperturasCta: 'Pregunta\'m',
    },
    extras: {
      eyebrow: 'Extres que sumen', h2: 'Quan necessites alguna cosa concreta.',
      cta: 'Explica\'m el teu cas',
      items: [
        ['Assessorament puntual', 'Un dubte concret, una decisió important o una segona opinió professional, amb conclusions per escrit.'],
        ['Obertura de locals', 'Concepte, carta, escandalls, equip i posada en marxa. Programa de 30 dies per obrir amb criteri.'],
        ['Gestió d\'esdeveniments', 'Planificació i execució d\'esdeveniments al teu local: del menú al servei, amb control de costos i temps.'],
        ['Selecció de personal', 'Definició del perfil, garbell, entrevistes i proves pràctiques. Personal que encaixa amb el teu local.'],
        ['Formació d\'equips', 'Protocols de servei, venda suggerida i organització de partides. Al teu local, amb el teu equip real.'],
        ['Team building', 'Jornades gastronòmiques per cohesionar equips: cuinar junts, tastar junts i entendre l\'ofici.'],
        ['Xarxes socials', 'Estratègia de contingut per al teu local: què publicar, quan i per a què. Xarxes que porten taules.'],
        ['Fotografia gastronòmica', 'Sessió de fotos professional dels teus plats i el teu espai, a punt per a carta, web i xarxes.'],
      ],
    },
    dif: {
      eyebrow: 'El que ens diferencia', h2: 'Com treballo amb tu.',
      items: ['Passió autèntica per la gastronomia a cada estratègia', 'Enfocament 100 % personalitzat', 'Compromís total amb cada client', 'Estratègies pràctiques amb resultats reals i mesurables', 'Acompanyament constant i proper', 'Atenció meticulosa durant tot el procés'],
    },
    cierre: {h2: 'El teu local pot donar més. Parlem.', p: 'Primera conversa sense cost. M\'expliques la teva situació i et dic si puc ajudar-te, o no.', cta: 'Començar ara · WhatsApp'},
  },

  eventos: {
    title: 'Le Petit Comité · Esdeveniments gastronòmics privats, tastos i xef a domicili',
    desc: 'Esdeveniments gastronòmics privats, tastos guiats i xef a domicili a Catalunya. Ens ocupem de menú, compra, muntatge, servei i neteja. Proposta en 48 hores.',
    eyebrow: '03 · Esdeveniments gastronòmics · per GastroGoan',
    h1: 'Le Petit Comité. Una taula, moltes històries.',
    lead: 'Esdeveniments gastronòmics privats, tastos guiats i xef a domicili. Ens ocupem de tot —menú, compra, muntatge, servei i neteja— perquè tu només siguis a taula.',
    cta: 'Demanar proposta',
    serv: {
      eyebrow: 'Què fem', h2: 'Tres maneres d\'asseure\'s a taula.',
      items: [
        ['Servei 01', 'Esdeveniments gastronòmics', 'Disseny i execució de celebracions privades, pop-ups i sopars temàtics: menú a mida, compra i logística, muntatge i servei professional. Adaptable a qualsevol format i aforament, amb coordinació integral.'],
        ['Servei 02', 'Tastos i maridatges', 'Sessions guiades per descobrir productes i combinacions —vins, cerveses, olis, formatges—, amb selecció de mostres, guió de tast i material de suport. Per a grups reduïts i accions de fidelització.'],
        ['Servei 03', 'Xef privat', 'No és un esdeveniment puntual: cuino a casa teva cada setmana o cada mes, amb la compra feta i àpats a punt, perquè mengis bé sense pensar-hi. També disponible per a un dia concret si ho prefereixes.'],
      ],
    },
    como: {
      eyebrow: 'Com funciona', h2: 'De la teva idea a la taula, en tres passos.',
      items: [
        {t: 'M\'expliques l\'ocasió', p: 'Data, nombre de persones, lloc i què vols celebrar. Per WhatsApp o email.'},
        {t: 'Proposta en 48 hores', p: 'Menú, format i pressupost tancat. Sense sorpreses ni extres amagats.'},
        {t: 'Ens ocupem de tot', p: 'Compra, muntatge, servei i neteja. Tu només t\'asseus a taula.'},
      ],
    },
    datos: [
      {k: 'Comensals', v: '2–50', d: 'persones per esdeveniment'},
      {k: 'On', v: 'On vulguis', d: 'casa teva, el teu local o l\'espai que triïs'},
      {k: 'Zona', v: 'Catalunya', d: 'amb base al Penedès'},
    ],
    menus: {
      eyebrow: 'Menús d\'exemple', h2: 'Sis maneres d\'asseure\'s a taula.',
      nota: 'Cada menú es dissenya des de zero per a la teva ocasió. Aquests són només exemples del nivell.',
      lista: [
        {tab: 'Arrosser', k: '01 · Arrosser', t: 'Al voltant de la paella', filas: [['Per picar', 'Pa de vidre amb tomàquet, pernil i anxoves'], ['Entrant', 'Gamba vermella i calamar a la planxa'], ['L\'arròs', 'Arròs melós de galeres i sípia · a escollir'], ['Postres', 'Crema catalana cremada al moment']], cierre: 'Arròs acabat davant dels teus convidats'},
        {tab: 'Barbacoa', k: '02 · A la brasa', t: 'Barbacoa d\'autor', filas: [['Del foc', 'Verdures de temporada a la flama amb romesco'], ['Per compartir', 'Botifarra artesana i costelles glaçades'], ['Principal', 'Xuletó madurat a la brasa d\'alzina'], ['Postres', 'Pinya a la brasa amb gelat de coco']], cierre: 'Brasa en directe al teu jardí o terrassa'},
        {tab: 'Tast de vins', k: '03 · Tast guiat', t: 'Cinc vins del Penedès', filas: [['Blancs', 'Dos blancs de varietat autòctona'], ['Cava', 'Un cava de criança com a transició'], ['Negres', 'Dos negres de cellers petits de la zona'], ['Acompanya', 'Taula d\'embotit i formatge curat']], cierre: 'Guiat en directe, explicant cada copa'},
        {tab: 'Maridatge de formatges', k: '04 · Maridatge', t: 'Formatges i vi, pas a pas', filas: [['Tendres', 'Formatges tendres amb blanc jove'], ['Semicurats', 'Semicurats d\'ovella amb cava'], ['Curats', 'Curats intensos amb negre de criança'], ['Blaus', 'Blau amb vi dolç, per tancar']], cierre: 'Vuit formatges, quatre vins, una conversa'},
        {tab: 'Xef setmanal', k: '05 · Xef privat', t: 'La teva setmana, resolta', filas: [['Dilluns', 'Compra i planificació del menú setmanal'], ['Cuina', 'Cuinat a la teva pròpia cuina, a casa'], ['Racions', 'Àpats i sopars a punt, etiquetats per dia'], ['Ritme', 'Repetició setmanal o mensual, a la teva mida']], cierre: 'Sense pensar en la compra ni en rentar plats'},
        {tab: 'Xef puntual', k: '06 · Xef privat', t: 'Un dia concret, a casa teva', filas: [['Abans', 'Menú acordat i compra feta per mi'], ['Durant', 'Cuino a la teva cuina, sense sortir de casa'], ['Després', 'Cuina recollida, sense rastre de feina'], ['Ideal per a', 'Una ocasió puntual, sense compromís setmanal']], cierre: 'Igual de cuidat, sense repetició'},
      ],
    },
    oca: {
      eyebrow: 'Per a cada ocasió', h2: 'Què celebrem?',
      items: ['Aniversari', 'Aniversari de parella', 'Sopar d\'empresa', 'Demanada de mà', 'Tast amb amics', 'Sopar íntim'],
      msg: (o) => `Hola, vull organitzar: ${o}, amb Le Petit Comité`,
      otra: 'Una altra ocasió? Escriu-me i la muntem.',
    },
    cierre: {h2: 'Escriu-me.', p: 'Data, tipus d\'esdeveniment i persones. Proposta en 48 hores.', cta: 'Escriure per WhatsApp'},
  },
};

/* ══════════════════════════════ ENGLISH ══════════════════════════════ */
C.en = {
  lang: 'en', ogLocale: 'en_GB', idioma: 'Language',
  skip: 'Skip to content',
  nav: {asesoria: 'Advisory', app: 'App', eventos: 'Le Petit Comité'},
  comprar: 'Get the app',
  pie: {lema: 'Made for restaurateurs, by restaurateurs.', secciones: 'Sections', contacto: 'Contact', fin: 'GastroGoan · Catalonia', home: 'Home'},
  wasaludo: 'Hi Marcos, I would like to talk to you.',

  home: {
    title: 'GastroGoan · Advisory, management app and events for hospitality',
    desc: 'We advise, manage and create gastronomic experiences. 360º advisory for your venue, the management app for restaurants and private events with Le Petit Comité.',
    eyebrow: 'Hospitality · Advisory · App · Events',
    h1: 'Make your venue work the way it should.',
    lead: 'We advise, manage and create gastronomic experiences. Three ways of working with you and one idea: that the business shows in the till and at the table.',
    cta1: 'See the app', cta2: 'Talk on WhatsApp',
    kpis: [
      {k: 'Experience', v: '8 years', d: 'in kitchens, dining rooms and restaurant management'},
      {k: 'The app', v: 'No internet needed', d: 'keeps working when the connection drops'},
      {k: 'Languages', v: 'ES · CA · EN', d: 'the app and the website, in three languages'},
    ],
    cab: {eyebrow: 'Where to start', h2: 'Choose how you want me to help.'},
    caminos: [
      {n: '01', h: 'Advisory', p: 'A no-frills diagnosis and a four-week plan for bars, restaurants and cafés that need real change.', k: 'asesoria'},
      {n: '02', h: 'The app', p: 'POS, kitchen, bookings, staff and numbers in one place. One licence a year, set up with you.', k: 'app'},
      {n: '03', h: 'Le Petit Comité', p: 'Private events, guided tastings and chef at home. We take care of everything; you just sit at the table.', k: 'eventos'},
    ],
    cierre: {h2: 'Shall we talk about your venue?', p: 'The first conversation is free. You tell me where you are and I tell you where I would start.', cta: 'Message me on WhatsApp'},
  },

  app: {
    title: 'GastroGoan App · POS, kitchen, bookings and numbers for your restaurant',
    desc: 'One app for your restaurant: POS, kitchen tickets, recipe costing, stock, online bookings and orders, staff and financial management. €300 + VAT the first year, set-up included.',
    eyebrow: '02 · GastroGoan App',
    h1: 'One app for your whole restaurant.',
    lead: 'POS, kitchen, bookings, staff and numbers in a single place that keeps working even without internet. You pay one licence a year and we set it up with you.',
    comprar: 'Get the app · €300 + VAT', ver: 'See what is included', hablar: 'Talk to Marcos',
    mini: '€20 a month paid yearly · the first year includes the set-up session',
    escaparate: {
      eyebrow: 'The app, inside', h2: 'This is what you will use every day.',
      lead: 'Real screenshots of the app, with the data of a sample restaurant.',
      tabs: [
        {id: 'tpv', label: 'POS', cap: 'Tables with their status, how long they have been open and the total, at a glance. Built for service, one-handed.'},
        {id: 'comandas', label: 'Kitchen', cap: 'Orders reach the kitchen in real time, with allergies in red and what is being prepared at each moment.'},
        {id: 'reservas', label: 'Bookings', cap: 'Today\'s bookings, requests from your website and WhatsApp reminders, linked to the POS tables.'},
        {id: 'panel', label: 'Dashboard', cap: 'Your break-even point for the month and whether you are ahead or behind, with the real figures of your sales.'},
        {id: 'resultados', label: 'Results', cap: 'Profit and loss in the structure your accountant expects: sales, cost of goods, staff, EBITDA.'},
      ],
    },
    problema: {
      eyebrow: 'The problem', h2: 'How many subscriptions do you pay today?',
      lead: 'Hospitality has filled up with fees: one for the POS, another for the digital menu, another for bookings… Each one goes up in price every year and none of them talk to each other.',
      filas: [['POS software', '€99/month'], ['Delivery platforms', '€99/month'], ['Digital menu and QR', '€20/month'], ['Booking page', '€30/month'], ['Staff management', '€40/month'], ['Financial management', '€40/month']],
      total: ['An average venue, in subscriptions', '≈ €300/month'],
      nota: 'Indicative example of an average venue. Amounts vary by provider and business size.',
      vs: [
        {k: 'Several apps', gran: '≈ €3,600', p: 'a year, forever, in six fees that do not talk to each other.'},
        {k: 'GastroGoan', gran: '€240', p: 'a year from the second year, everything included. The first year, €300 with the set-up.', bueno: true},
      ],
      ahorro: 'Estimated saving: over €3,000 a year.',
    },
    incluye: {
      eyebrow: 'What is included', h2: 'Dining room, kitchen and management, in one licence.',
      lead: 'Everything listed here is in the app today, with no paid modules on the side.',
      zonas: [
        {t: 'Dining room', items: [
          ['Full POS', 'Tables, orders, split bills, tips, payment by card, cash or gift voucher, and end-of-day cash-up.'],
          ['Online bookings and orders', 'Your own website so customers can book, order for collection or delivery and follow their order.'],
          ['Customers and promotions', 'Customer records, loyalty, gift vouchers and news by email and WhatsApp.'],
        ]},
        {t: 'Kitchen', items: [
          ['Kitchen order screen', 'What is ordered in the dining room appears in the kitchen instantly, with allergies and notes.'],
          ['Recipe costing and technical sheets', 'The real cost of each dish, food cost and the recipe step by step.'],
          ['Stock, waste and purchasing', 'Up-to-date inventory, minimum alerts, supplier orders and delivery note checking.'],
          ['Paperless HACCP', 'Cleaning, temperatures and allergens with their log, ready for an inspection.'],
        ]},
        {t: 'Management', items: [
          ['Financial management', 'Expenses, cash flow, profit and loss, break-even point and tax forecast.'],
          ['Control dashboard', 'Sales, expenses and result for the day, week and month, with alerts for whatever needs attention.'],
          ['Staff', 'Rotas, clock-ins, tasks and shifts for each employee, with their own PIN.'],
          ['Send to your accountant', 'A package with your ledgers in Excel and the period\'s invoices, ready for your accountancy firm.'],
        ]},
      ],
    },
    pasos: {
      eyebrow: 'How to start', h2: 'From purchase to your first service, in three steps.',
      items: [
        {t: 'You get the licence', p: 'Secure payment with Stripe. The invoice arrives by email and the yearly renewal is charged automatically.'},
        {t: 'You book your session', p: 'After paying you pick a day and time for a one-hour video call. In it we register your business and load your menu, opening hours and tables.'},
        {t: 'You start working', p: 'I show you how to use it with your own team. You leave the session with the app running, not with a manual.'},
      ],
    },
    garantias: {
      eyebrow: 'Built for service', h2: 'It does not stop when everything else does.',
      items: [
        {icon: 'offline', t: 'Works without internet', p: 'Once installed, it opens and works offline. When the network comes back, it syncs on its own.'},
        {icon: 'nube', t: 'Your data is yours', p: 'It is kept on your device and in your own free Google cloud project, which we set up together. GastroGoan charges nothing for it.'},
        {icon: 'equipo', t: 'Your whole team, no per-user fees', p: 'Kitchen, bar and dining room. Each employee logs in with their PIN and sees only what concerns them.'},
        {icon: 'actualiza', t: 'Always up to date', p: 'Improvements arrive on their own at no cost. If you are in the middle of service it will not interrupt you: it tells you and you choose when to update.'},
      ],
    },
    precio: {
      eyebrow: 'Price', h2: 'A clear price. No small print.',
      p: 'One licence per venue per year, with every feature. The first time includes the set-up session, so you start working from day one.',
      rot: 'First year', cifra: '€300', peque: '+ VAT',
      sub: 'Then €240 + VAT a year: €20 a month.',
      lin: [['Annual licence', '€240'], ['Initial set-up (one time only)', '€60'], ['First year', '€300 + VAT'], ['From the second year', '€240 + VAT']],
      incluye: ['Every feature of the app', 'One-hour set-up session', 'Updates included', 'No cost per user or per device', 'Automatic invoice by email'],
      cta: 'Get the app',
      peq: 'Secure payment with Stripe. It renews every year and we let you know before charging.',
    },
    faq: {
      eyebrow: 'Frequently asked questions', mas: 'Another question? Write to me and I will answer myself.', masCta: 'Talk to Marcos', h2: 'What people usually ask before starting.',
      items: [
        ['What happens after I pay?', 'The invoice arrives by email and, once the payment is done, you see a page to book your set-up session. In that hour of video call we get your business running.'],
        ['Does it work without an internet connection?', 'Yes. Once installed on your tablet, phone or computer, the app opens and works offline: taking orders, charging, sending kitchen tickets. When the network returns, it syncs. Internet is only needed to sync between devices and for bookings and orders coming from the web.'],
        ['Where is my data stored?', 'On your device and in your own free Firebase project (Google). We create it together in the session. That way the data is yours and GastroGoan neither pays nor charges anything for storing it.'],
        ['How many people can use it?', 'Your whole team, at no cost per user or per device. Each employee logs in with their PIN and sees only their area.'],
        ['What if I have more than one venue?', 'Each venue has its own licence. You can open branches that inherit your menu, recipes, ingredients and protocols, and see them all from your same account.'],
        ['Do I need technical knowledge?', 'No. It is designed for the day-to-day of a venue. In the first session we set it up with you and you use it with your team before hanging up.'],
        ['What if the internet drops in the middle of service?', 'You keep working. The app runs locally and syncs when the connection is back. Orders and bookings that come through the web wait until you recover it.'],
        ['How do I get my menu and products in?', 'In the first session we load your menu, products and suppliers with you. If you have them in spreadsheets, we help you transfer them.'],
        ['Does it update?', 'Yes, on its own and at no cost. If you are working it does not interrupt you: it tells you and you choose when to update.'],
        ['Is the payment secure?', 'Stripe takes the payment, one of the most widely used payment processors in the world. GastroGoan never sees or stores your card details.'],
      ],
    },
    cierre: {h2: 'Your venue works every day. Let the app work with it.', p: 'One licence, one session and your whole restaurant in one place.', cta: 'Get the app · €300 + VAT', cta2: 'Talk to Marcos'},
  },

  asesoria: {
    title: '360º advisory for restaurants, bars and cafés · GastroGoan',
    desc: '360º gastronomic advisory: mystery diner, diagnosis, four-week action plan and follow-up. For bar, restaurant and café owners who want data, not pep talks.',
    eyebrow: '01 · 360º Advisory',
    h1: 'Strategies that taste of success.',
    lead: 'A no-frills diagnosis, a four-week plan and support until the change is done.',
    cta: 'Start on WhatsApp', cta2: 'See how I work',
    sobre: {
      eyebrow: 'About me', h2: 'Data, not pep talks.',
      q: 'Eight years of training and experience in renowned restaurants. Today I work with owners of bars, restaurants and cafés who want data, not pep talks. If you are looking for someone to tell you everything is fine, I am not your advisor.',
      firma: 'Marcos González · Founder of GastroGoan',
      p: 'My method is simple: I see your venue the way your customer does, I tell you the truth and I stay with you until the change is done.',
    },
    ruta: {
      eyebrow: 'The 360º route', h2: 'Five phases, six areas of the business.',
      lead: 'I work hand in hand with each project through a process aimed at solving problems and producing real results. I assess six areas and rank them by priority.',
      areas: ['Concept', 'Brand', 'Kitchen', 'Dining room', 'Management', 'Customer acquisition'],
      fases: [
        ['Phase 1', 'Mystery diner', 'I visit your venue unannounced and experience your food and service like any other customer. It is the only way to see reality as it is.'],
        ['Phase 2', 'Kick-off meeting', 'You tell me what is happening and we cross it with what I have seen. We come out with the real picture of your numbers and your goals.'],
        ['Phase 3', 'Assessment', 'I analyse each area and give your venue an objective score, based on data and not impressions.'],
        ['Phase 4', 'Action plan', 'Every change ranked by priority —urgent, important, complementary— in a four-week calendar.'],
        ['Phase 5', 'Support', 'WhatsApp, a weekly video call and on-site visits for four weeks, so the plan does not stay in good intentions.'],
      ],
      aperturas: 'A new venue? There is a 30-day version of the programme for openings.', aperturasCta: 'Ask me',
    },
    extras: {
      eyebrow: 'Extras that add up', h2: 'When you need something specific.',
      cta: 'Tell me your case',
      items: [
        ['One-off advice', 'A specific question, an important decision or a professional second opinion, with written conclusions.'],
        ['Venue openings', 'Concept, menu, recipe costing, team and launch. A 30-day programme to open with judgement.'],
        ['Event management', 'Planning and running events at your venue: from menu to service, with cost and timing control.'],
        ['Staff recruitment', 'Profile definition, screening, interviews and practical tests. Staff who fit your venue.'],
        ['Team training', 'Service protocols, suggestive selling and station organisation. At your venue, with your real team.'],
        ['Team building', 'Gastronomic days to bring teams together: cooking together, tasting together and understanding the craft.'],
        ['Social media', 'Content strategy for your venue: what to post, when and why. Social media that brings tables.'],
        ['Food photography', 'A professional photo session of your dishes and your space, ready for menu, web and social media.'],
      ],
    },
    dif: {
      eyebrow: 'What sets us apart', h2: 'How I work with you.',
      items: ['Genuine passion for gastronomy in every strategy', '100% tailored approach', 'Total commitment to every client', 'Practical strategies with real, measurable results', 'Constant, close support', 'Meticulous attention throughout the process'],
    },
    cierre: {h2: 'Your venue can give more. Let\'s talk.', p: 'First conversation free. You tell me your situation and I tell you whether I can help, or not.', cta: 'Start now · WhatsApp'},
  },

  eventos: {
    title: 'Le Petit Comité · Private gastronomic events, tastings and chef at home',
    desc: 'Private gastronomic events, guided tastings and chef at home in Catalonia. We take care of menu, shopping, set-up, service and clean-up. Proposal within 48 hours.',
    eyebrow: '03 · Gastronomic events · by GastroGoan',
    h1: 'Le Petit Comité. One table, many stories.',
    lead: 'Private gastronomic events, guided tastings and chef at home. We take care of everything —menu, shopping, set-up, service and clean-up— so that you only have to be at the table.',
    cta: 'Request a proposal',
    serv: {
      eyebrow: 'What we do', h2: 'Three ways to sit at the table.',
      items: [
        ['Service 01', 'Gastronomic events', 'Design and delivery of private celebrations, pop-ups and themed dinners: tailored menu, shopping and logistics, set-up and professional service. Adaptable to any format and capacity, with full coordination.'],
        ['Service 02', 'Tastings and pairings', 'Guided sessions to discover products and combinations —wines, beers, oils, cheeses—, with sample selection, tasting script and support material. For small groups and loyalty activities.'],
        ['Service 03', 'Private chef', 'Not a one-off event: I cook in your own home every week or every month, with the shopping done and meals ready, so you eat well without thinking about it. Also available for a specific day if you prefer.'],
      ],
    },
    como: {
      eyebrow: 'How it works', h2: 'From your idea to the table, in three steps.',
      items: [
        {t: 'You tell me the occasion', p: 'Date, number of people, place and what you want to celebrate. By WhatsApp or email.'},
        {t: 'Proposal within 48 hours', p: 'Menu, format and a fixed quote. No surprises or hidden extras.'},
        {t: 'We take care of everything', p: 'Shopping, set-up, service and clean-up. You just sit at the table.'},
      ],
    },
    datos: [
      {k: 'Guests', v: '2–50', d: 'people per event'},
      {k: 'Where', v: 'Wherever you like', d: 'your home, your venue or the space you choose'},
      {k: 'Area', v: 'Catalonia', d: 'based in the Penedès'},
    ],
    menus: {
      eyebrow: 'Sample menus', h2: 'Six ways to sit at the table.',
      nota: 'Every menu is designed from scratch for your occasion. These are only examples of the standard.',
      lista: [
        {tab: 'Rice', k: '01 · Rice', t: 'Around the paella', filas: [['To nibble', 'Glass bread with tomato, ham and anchovies'], ['Starter', 'Red prawn and griddled squid'], ['The rice', 'Soupy rice with squat lobster and cuttlefish · your pick'], ['Dessert', 'Crema catalana caramelised at the table']], cierre: 'Rice finished in front of your guests'},
        {tab: 'Barbecue', k: '02 · Over the coals', t: 'Signature barbecue', filas: [['From the fire', 'Seasonal vegetables on the flame with romesco'], ['To share', 'Artisan butifarra and glazed ribs'], ['Main', 'Aged rib-eye over holm-oak embers'], ['Dessert', 'Grilled pineapple with coconut ice cream']], cierre: 'Live fire in your garden or terrace'},
        {tab: 'Wine tasting', k: '03 · Guided tasting', t: 'Five wines from the Penedès', filas: [['Whites', 'Two whites from native grape varieties'], ['Cava', 'An aged cava as a transition'], ['Reds', 'Two reds from small local wineries'], ['On the side', 'Cured meats and aged cheese board']], cierre: 'Guided live, explaining every glass'},
        {tab: 'Cheese pairing', k: '04 · Pairing', t: 'Cheese and wine, step by step', filas: [['Fresh', 'Fresh cheeses with a young white'], ['Semi-cured', 'Semi-cured sheep cheeses with cava'], ['Cured', 'Intense cured cheeses with an aged red'], ['Blues', 'Blue cheese with sweet wine, to finish']], cierre: 'Eight cheeses, four wines, one conversation'},
        {tab: 'Weekly chef', k: '05 · Private chef', t: 'Your week, sorted', filas: [['Monday', 'Shopping and weekly menu planning'], ['Cooking', 'Cooked in your own kitchen, at home'], ['Portions', 'Lunches and dinners ready, labelled by day'], ['Rhythm', 'Weekly or monthly repeat, to suit you']], cierre: 'No thinking about shopping or washing up'},
        {tab: 'One-day chef', k: '06 · Private chef', t: 'A specific day, at your home', filas: [['Before', 'Agreed menu and shopping done by me'], ['During', 'I cook in your kitchen, without you leaving home'], ['After', 'Kitchen cleared, no trace of work'], ['Ideal for', 'A one-off occasion, with no weekly commitment']], cierre: 'Just as careful, without the repetition'},
      ],
    },
    oca: {
      eyebrow: 'For every occasion', h2: 'What are we celebrating?',
      items: ['Birthday', 'Anniversary', 'Company dinner', 'Proposal', 'Tasting with friends', 'Intimate dinner'],
      msg: (o) => `Hi, I would like to organise: ${o}, with Le Petit Comité`,
      otra: 'Another occasion? Write to me and we will put it together.',
    },
    cierre: {h2: 'Write to me.', p: 'Date, type of event and number of guests. Proposal within 48 hours.', cta: 'Write on WhatsApp'},
  },
};
