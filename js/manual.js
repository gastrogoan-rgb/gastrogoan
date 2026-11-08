/* ============================================================
   MANUAL DE USO (1/11, reescrito entero)
   Un capítulo por pantalla, agrupados por áreas. Cada capítulo es {id, area, title:{es,ca,en}, content:{es,ca,en}} con HTML.
   Clases que entiende el diseño: h3, h4, p, ul, .manual-step (con .sn y .st), .manual-tip, .manual-warning y tablas.
   Al cambiar una pantalla, se cambia aquí su capítulo EN LOS TRES IDIOMAS y con los nombres de botones tal cual los ve el usuario.
   ============================================================ */
const MANUAL_CHAPTERS = [
  {id:'empezar', area:'empezar',
    title:{es:`<i class="ti ti-rocket"></i> Cómo empezar`, ca:`<i class="ti ti-rocket"></i> Com començar`, en:`<i class="ti ti-rocket"></i> Getting Started`},
    content:{es:`<h3>Qué es GastroGoan y cómo está organizado</h3>
<p>GastroGoan es un kit de gestión para bares y restaurantes. Su idea central: <strong>cada dato se escribe una sola vez</strong> y la app lo reutiliza en todas partes. El precio de un ingrediente recalcula el coste de las recetas, las recetas alimentan las fichas técnicas y la oferta, la oferta se vende en el TPV, y las ventas del TPV mueven el stock, la economía y el Panel de Control sin que copies nada a mano.</p>
<p>Desde el Inicio eliges una de las tres áreas:</p>
<table><thead><tr><th>Área</th><th>Qué hay dentro</th></tr></thead><tbody>
<tr><td><strong>Cocina</strong></td><td>Comandas Cocina, Oferta Gastronómica, I+D, Proveedores, Mega Lista, Escandallo, Fichas Técnicas, Pedidos, Stock, Personal, Distribución del Trabajo y APPCC e Higiene.</td></tr>
<tr><td><strong>Sala</strong></td><td>TPV, Reservas, Clientes, Promoción y la versión de sala de los módulos compartidos (Oferta de Bebidas, Escandallo, Fichas, Mega Lista, Proveedores, Stock, Pedidos, Personal, Distribución, APPCC e Higiene, I+D).</td></tr>
<tr><td><strong>Gestión</strong></td><td>Panel de Control, Gestión Económica, Mi Negocio, Plan 360° y este Manual de Uso. Solo el propietario entra aquí.</td></tr>
</tbody></table>
<div class="manual-tip"><i class="ti ti-bulb"></i>Los módulos compartidos existen en Cocina y en Sala con <strong>sus propios datos y su propio vocabulario</strong>: en Cocina hablan de platos, raciones e ingredientes; en Sala, de bebidas, copas y productos. Lo que das de alta en un área no se mezcla con la otra.</div>

<h4>Ruta recomendada para dejar el negocio listo</h4>
<p>No hace falta completarlo todo antes de empezar a vender: con lo básico ya puedes usar el TPV y ampliar poco a poco. Este orden te ahorra repetir trabajo:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Conecta tu nube</strong> — Es el único paso obligatorio del alta: un proyecto gratuito de Firebase que es solo tuyo. Sin él los datos no se sincronizan entre dispositivos y tus empleados no pueden entrar desde otro aparato. La app te guía paso a paso (unos 10 minutos).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Mi Negocio</strong> (Gestión) — Nombre y datos, <strong>forma jurídica y régimen fiscal</strong>, horario de apertura, tipos de servicio y el plano de sala (zonas y mesas, con las plazas de cada mesa). De aquí salen los tickets, la web de reservas y el cálculo de impuestos.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Mega Lista</strong> — Ya viene con un catálogo de unos 275 productos a precio cero. Lo que te toca es ponerles <strong>lo que pagas tú, sin IVA</strong>. Sin precios, el escandallo sale a cero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Proveedores</strong> — Tus proveedores con sus datos de contacto; después enlazas cada producto con el suyo para poder hacer pedidos por proveedor.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Escandallo</strong> — Cada plato (o bebida) como una receta con ingredientes de la Mega Lista. La app calcula el coste por ración, el food cost y el margen.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Fichas Técnicas</strong> — El paso a paso de cada plato, con sus alérgenos. Es la receta que sigue el equipo y lo que enseñas en una inspección.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Oferta Gastronómica</strong> (en Sala, <strong>Oferta de Bebidas</strong>) — Tus cartas y menús con sus secciones y precios de venta, y el horario en el que se activa cada una. Es lo que verá el TPV y la web de pedidos.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Stock y Pedidos</strong> — Pon el mínimo de cada producto. Cada cobro del TPV descuenta existencias y recibir un pedido a proveedor las repone.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Personal</strong>, <strong>Distribución del Trabajo</strong> y <strong>APPCC e Higiene</strong> — Alta del equipo (con su PIN), turnos, tareas de cada puesto y plan de limpieza y temperaturas.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>TPV</strong> (Sala) — Donde se trabaja cada servicio: mesas, comandas, cobros, para llevar y delivery. Y <strong>Comandas Cocina</strong> en la pantalla de cocina.</div></div>
<div class="manual-step"><div class="sn">11</div><div class="st"><strong>Reservas y pedidos online</strong> — Cuando tengas mesas con plazas y una carta activa, comparte el enlace o el QR desde Mi Negocio. Si quieres cobrar con tarjeta, conecta Stripe.</div></div>
<div class="manual-step"><div class="sn">12</div><div class="st"><strong>Gestión Económica</strong> y <strong>Panel de Control</strong> — Añade tus gastos fijos una vez; la Cuenta de Resultados, la Tesorería y el Panel se calculan solos con las ventas reales.</div></div>
<p>Cuando domines lo anterior, <strong>I+D</strong> (crear platos, menús y cartas con asistente de IA), <strong>Clientes</strong>, <strong>Promoción</strong> y el resto de extras te esperan.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Al empezar verás en el Inicio la tarjeta <strong>Puesta a punto de tu negocio</strong>, con lo que falta para que la app trabaje con tus datos (datos del negocio, horario, precios, recetas, carta, personal, mesas). Cada tarea se marca sola al hacerla; puedes ocultarla y recuperarla con <strong>Ver lo que falta</strong> en Mi Negocio → Conexiones externas.</div>

<h4>Cómo se guardan tus datos</h4>
<p>Todo se guarda solo, en el momento, en el aparato que usas. No hay botón de guardar general (solo en los formularios que lo indican). Si tienes la nube conectada, además <strong>sube a tu Firebase en menos de un segundo</strong> y se reparte a tus otros dispositivos: el móvil del camarero, la tablet de cocina y el ordenador de la oficina ven lo mismo.</p>
<p>La nube es <strong>tuya</strong>: la creas con tu cuenta de Google, es gratuita y GastroGoan no ve tus datos. Su estado se ve siempre arriba, en la etiqueta de la cabecera:</p>
<ul>
<li><strong>Nube conectada · hace N s</strong> — todo subido; el tiempo es de la última subida confirmada.</li>
<li><strong>Guardando...</strong> — hay cambios en camino.</li>
<li><strong>Sin conexión</strong> — trabajas igual; se sincroniza solo al volver internet.</li>
<li><strong>Error de nube</strong> — algo falla en tu Firebase; púlsala para ver el motivo (más abajo, en «Si algo no funciona»).</li>
</ul>
<p>Pulsa esa etiqueta cuando quieras: se abre <strong>Nube — Sincronización entre dispositivos</strong>, con el botón <strong>Probar mi nube ahora</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La nube sincroniza, no sustituye a una copia de seguridad: lo que borras en un dispositivo se borra en todos. Descarga una copia de vez en cuando desde Mi Negocio → Mantenimiento de datos (la app te lo recuerda cada 30 días).</div>

<h4>Instalar GastroGoan como app</h4>
<p>No hay que instalar nada de ninguna tienda. Si quieres un icono propio y pantalla completa, ánclala a la pantalla de inicio:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Android (Chrome):</strong> abre la app, menú ⋮ → <strong>Añadir a pantalla de inicio</strong> o <strong>Instalar app</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone y iPad (Safari):</strong> botón de compartir <i class="ti ti-share-2"></i> → <strong>Añadir a pantalla de inicio</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Ordenador (Chrome o Edge):</strong> icono de instalar al final de la barra de direcciones, o menú ⋮ → <strong>Instalar aplicación</strong>.</div></div>
<p>Instálala en cada dispositivo que vaya a usarse a diario (TPV de barra, tablet de cocina, móvil del encargado).</p>

<h4>Cómo entra cada persona</h4>
<p>La pantalla de entrada ofrece dos puertas. Para cambiar el idioma usa el selector <strong>ES / CA / EN</strong> de la esquina.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Acceso Propietarios</strong> — Una <strong>cuenta</strong> (usuario + PIN) que recibes al comprar, separada de cada local. El usuario da igual en mayúsculas o con acentos (Casa Paco = casapaco). El PIN del propietario tiene de 6 a 12 letras o números. La primera vez la app te anima a cambiarlo por uno tuyo; el nuevo vale en todos tus dispositivos. En un dispositivo nuevo hace falta internet la primera vez; después entras también sin conexión.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Acceso Empleados</strong> — Cada empleado escribe su <strong>nombre</strong> (el de su ficha de Personal), su <strong>PIN de acceso</strong> (4 dígitos; el de fábrica es 1234 y al entrar se le pide elegir uno propio) y el <strong>código de negocio</strong> de 8 caracteres que le da el propietario. Entra directo a su área, Cocina o Sala. Funciona en un dispositivo que nunca había visto el negocio: la app lo localiza en la nube (esa primera vez necesita internet). El campo del código recuerda los últimos usados en ese aparato.</div></div>
<p>Tras entrar como propietario aparece <strong>Selecciona tu negocio</strong>:</p>
<ul>
<li><strong>Cuenta nueva sin negocios:</strong> pulsa <strong>Canjear negocio</strong> y escribe el código de 8 caracteres de tu licencia. Hace falta internet. Un código pertenece a una sola cuenta: si lo usas con otra distinta, la app avisará de que ya está en uso.</li>
<li><strong>Más negocios:</strong> cada local es independiente (sus datos, su nube, su código). Con <strong>Nuevo independiente</strong> añades un negocio vacío y con <strong>Abrir sucursal</strong> creas uno que copia del que elijas la oferta, recetas, ingredientes, proveedores, fichas y tareas de limpieza. La sucursal <strong>no</strong> copia mesas, empleados, gastos ni ventas, y comparte la nube del negocio original. Ambos botones piden otro código de negocio (otra licencia).</li>
<li>Con dos o más negocios aparece <strong>Visión global de mis negocios</strong>: ventas, tickets y resultado de cada uno, en solo lectura. Desde la cabecera, el botón <strong>Negocios</strong> te devuelve a este selector.</li>
<li>Al pie: <strong>Cambiar mi contraseña</strong> (tu PIN de propietario) y <strong>Salir y entrar con otra cuenta</strong>. Con <strong>Quitar</strong> sacas un negocio de este dispositivo: te pide escribir su nombre, no afecta a la licencia ni a la nube y puedes volver a activarlo (no se puede si tiene sucursales).</li>
</ul>

<h4>Los seis modos de estar dentro</h4>
<p>Según quién entre, la app enseña y permite cosas distintas. Hay seis modos: el propietario y, en cada área, el empleado normal y el empleado con permiso de edición.</p>
<table><thead><tr><th>Modo</th><th>Qué ve y qué puede hacer</th></tr></thead><tbody>
<tr><td><strong>Propietario</strong></td><td>Todo: las tres áreas, Gestión (Panel, Economía, Mi Negocio), fichas del personal, el botón Negocios y el Centro de Ayuda.</td></tr>
<tr><td><strong>Empleado de Cocina o de Sala</strong></td><td>Solo su área. Trabaja (TPV, comandas, stock, limpieza, su panel de tareas), pero no ve los módulos de edición de costes (Oferta, Proveedores, Mega Lista, Escandallo, I+D) ni nada de Gestión.</td></tr>
<tr><td><strong>Empleado con permiso de edición</strong></td><td>Lo mismo, pero entra ya en modo edición de su área y ve esos módulos: puede editar oferta, recetas, stock y turnos de su área. En Personal gestiona <strong>turnos</strong>, no personal: ve solo su propia tarjeta (los datos y PIN de los compañeros son del propietario). Puede cancelar y anular.</td></tr>
</tbody></table>
<ul>
<li><strong>Gestión Económica y Mi Negocio son exclusivas del propietario.</strong> No existe un PIN alternativo para entrar. Un empleado que lo intenta ve un aviso.</li>
<li>Marcar a un empleado como <strong>repartidor</strong> no es un séptimo modo: solo lo mete en el reparto de pedidos a domicilio; ve lo mismo que cualquier otro de Sala.</li>
<li>Cada empleado ve <strong>solo su panel</strong> en Distribución del Trabajo, aunque conozca el PIN de un compañero.</li>
<li>Cancelar o anular (reservas, pedidos, ventas) es del propietario o de un empleado con permiso de edición.</li>
<li>El <strong>PIN del negocio</strong> (Mi Negocio) es otra cosa: 4 dígitos que se le piden a un empleado para confirmar acciones delicadas, como anular una venta cobrada o borrar un empleado (el propietario solo confirma con un aviso). Viene como 1234 hasta que lo cambies. No da acceso a Gestión.</li>
<li>La casilla <strong>Activo</strong> de la ficha corta el acceso al instante sin borrar nada, útil en bajas temporales.</li>
</ul>

<h4>Actualizaciones de la app</h4>
<p>El programa se guarda en tu dispositivo (por eso abre al instante) y los datos viajan aparte, así que actualizar <strong>nunca toca tus datos</strong>. La app mira si hay versión nueva cada pocas horas:</p>
<ul>
<li>Si acabas de abrirla y no has tocado nada, <strong>se actualiza sola</strong>.</li>
<li>Si estás trabajando (hay una ventana abierta o algo escrito), sale una barra naranja: <strong>Hay una versión nueva de GastroGoan</strong>, con <strong>Actualizar ahora</strong> y <strong>Más tarde</strong>. Elige tú el momento.</li>
<li>El botón <strong>Actualizar</strong> de la cabecera vuelve a leer los datos guardados (por si otro dispositivo los cambió) y fuerza la comprobación de versión. Avisa con «Datos actualizados».</li>
</ul>

<h4>Trabajar sin internet</h4>
<p>La app carga igual sin conexión y todo lo que hagas se guarda en el aparato; al volver internet, sube solo. Para evitar sorpresas, ten en cuenta lo que <strong>sí necesita conexión</strong>: entrar como propietario por primera vez en un dispositivo, canjear un código, cambiar el PIN del propietario, el primer acceso de un empleado en un aparato nuevo, la web pública de reservas, el cobro con Stripe, el asistente de IA y dibujar los códigos QR.</p>

<h4>El tour guiado y la ayuda</h4>
<ul>
<li>Al terminar el alta la app pregunta <strong>¿Quieres hacer un tour guiado?</strong>. Puedes repetirlo cuando quieras en Gestión → <strong>Manual de Uso</strong> → <strong>Iniciar tour guiado</strong>. En móvil se ve mejor en tablet u ordenador.</li>
<li>Este manual tiene buscador y el botón <strong>Imprimir capítulo</strong>.</li>
<li>El botón <strong>Ayuda</strong> de la cabecera (solo propietario) abre un panel con un <strong>Asistente</strong> al que le escribes tu duda, la lista de <strong>Temas</strong> y <strong>Contacto</strong> para escribir a soporte.</li>
<li>El <strong>Chat interno</strong> permite hablar entre el equipo.</li>
</ul>

<h4>Si algo no funciona</h4>
<p>Mira el capítulo <strong>Preguntas frecuentes y problemas</strong>: está ordenado por síntomas (no puedo entrar, la nube no sincroniza, no imprime, no baja el stock...).</p>`,
    ca:`<h3>Què és GastroGoan i com està organitzat</h3>
<p>GastroGoan és un kit de gestió per a bars i restaurants. La idea central: <strong>cada dada s'escriu una sola vegada</strong> i l'app la reutilitza arreu. El preu d'un ingredient recalcula el cost de les receptes, les receptes alimenten les fitxes tècniques i l'oferta, l'oferta es ven al TPV, i les vendes del TPV mouen l'estoc, l'economia i el Tauler de Control sense que hagis de copiar res a mà.</p>
<p>Des de l'Inici tries una de les tres àrees:</p>
<table><thead><tr><th>Àrea</th><th>Què hi ha a dins</th></tr></thead><tbody>
<tr><td><strong>Cuina</strong></td><td>Comandes Cuina, Oferta Gastronòmica, R+D, Proveïdors, Mega Llista, Escandall, Fitxes Tècniques, Comandes, Estoc, Personal, Distribució de la Feina i APPCC i Higiene.</td></tr>
<tr><td><strong>Sala</strong></td><td>TPV, Reserves, Clients, Promoció i la versió de sala dels mòduls compartits (Oferta de Begudes, Escandall, Fitxes, Mega Llista, Proveïdors, Estoc, Comandes, Personal, Distribució, APPCC i Higiene, R+D).</td></tr>
<tr><td><strong>Gestió</strong></td><td>Tauler de Control, Gestió Econòmica, El Meu Negoci, Pla 360° i aquest Manual d'Ús. Només hi entra el propietari.</td></tr>
</tbody></table>
<div class="manual-tip"><i class="ti ti-bulb"></i>Els mòduls compartits existeixen a Cuina i a Sala amb <strong>les seves pròpies dades i el seu propi vocabulari</strong>: a Cuina parlen de plats, racions i ingredients; a Sala, de begudes, copes i productes. El que dones d'alta en una àrea no es barreja amb l'altra.</div>

<h4>Ruta recomanada per deixar el negoci a punt</h4>
<p>No cal completar-ho tot abans de començar a vendre: amb el bàsic ja pots fer servir el TPV i anar ampliant. Aquest ordre t'estalvia repetir feina:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Connecta el teu núvol</strong> — És l'únic pas obligatori de l'alta: un projecte gratuït de Firebase que és només teu. Sense ell les dades no se sincronitzen entre dispositius i els teus empleats no poden entrar des d'un altre aparell. L'app et guia pas a pas (uns 10 minuts).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>El Meu Negoci</strong> (Gestió) — Nom i dades, <strong>forma jurídica i règim fiscal</strong>, horari d'obertura, tipus de servei i el plànol de sala (zones i taules, amb les places de cada taula). D'aquí surten els tiquets, la web de reserves i el càlcul d'impostos.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Mega Llista</strong> — Ja ve amb un catàleg d'uns 275 productes a preu zero. El que et toca és posar-los <strong>el que pagues tu, sense IVA</strong>. Sense preus, l'escandall surt a zero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Proveïdors</strong> — Els teus proveïdors amb les dades de contacte; després enllaces cada producte amb el seu per poder fer comandes per proveïdor.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Escandall</strong> — Cada plat (o beguda) com una recepta amb ingredients de la Mega Llista. L'app calcula el cost per ració, el food cost i el marge.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Fitxes Tècniques</strong> — El pas a pas de cada plat, amb els seus al·lèrgens. És la recepta que segueix l'equip i el que ensenyes en una inspecció.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Oferta Gastronòmica</strong> (a Sala, <strong>Oferta de Begudes</strong>) — Les teves cartes i menús amb les seccions i els preus de venda, i l'horari en què s'activa cadascuna. És el que veurà el TPV i la web de comandes.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Estoc i Comandes</strong> — Posa el mínim de cada producte. Cada cobrament del TPV descompta existències i rebre una comanda a proveïdor les repon.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Personal</strong>, <strong>Distribució de la Feina</strong> i <strong>APPCC i Higiene</strong> — Alta de l'equip (amb el seu PIN), torns, tasques de cada lloc i pla de neteja i temperatures.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>TPV</strong> (Sala) — On es treballa cada servei: taules, comandes, cobraments, per emportar i delivery. I <strong>Comandes Cuina</strong> a la pantalla de cuina.</div></div>
<div class="manual-step"><div class="sn">11</div><div class="st"><strong>Reserves i comandes en línia</strong> — Quan tinguis taules amb places i una carta activa, comparteix l'enllaç o el QR des d'El Meu Negoci. Si vols cobrar amb targeta, connecta Stripe.</div></div>
<div class="manual-step"><div class="sn">12</div><div class="st"><strong>Gestió Econòmica</strong> i <strong>Tauler de Control</strong> — Afegeix les teves despeses fixes una vegada; el Compte de Resultats, la Tresoreria i el Tauler es calculen sols amb les vendes reals.</div></div>
<p>Quan domminis l'anterior, <strong>R+D</strong> (crear plats, menús i cartes amb assistent d'IA), <strong>Clients</strong>, <strong>Promoció</strong> i la resta d'extres t'esperen.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>En començar veuràs a l'Inici la targeta <strong>Posada a punt del teu negoci</strong>, amb el que falta perquè l'app treballi amb les teves dades (dades del negoci, horari, preus, receptes, carta, personal, taules). Cada tasca es marca sola en fer-la; pots amagar-la i recuperar-la amb <strong>Veure què falta</strong> a El Meu Negoci → Connexions externes.</div>

<h4>Com es guarden les teves dades</h4>
<p>Tot es guarda sol, a l'instant, a l'aparell que fas servir. No hi ha botó de desar general (només als formularis que ho indiquen). Si tens el núvol connectat, a més <strong>puja al teu Firebase en menys d'un segon</strong> i es reparteix als altres dispositius: el mòbil del cambrer, la tauleta de cuina i l'ordinador de l'oficina veuen el mateix.</p>
<p>El núvol és <strong>teu</strong>: el crees amb el teu compte de Google, és gratuït i GastroGoan no veu les teves dades. L'estat es veu sempre a dalt, a l'etiqueta de la capçalera:</p>
<ul>
<li><strong>Núvol connectat · fa N s</strong> — tot pujat; el temps és de l'última pujada confirmada.</li>
<li><strong>Desant...</strong> — hi ha canvis en camí.</li>
<li><strong>Sense connexió</strong> — treballes igual; se sincronitza sol quan torna internet.</li>
<li><strong>Error de núvol</strong> — alguna cosa falla al teu Firebase; prem-la per veure el motiu (més avall, a «Si alguna cosa no funciona»).</li>
</ul>
<p>Prem aquesta etiqueta quan vulguis: s'obre <strong>Núvol — Sincronització entre dispositius</strong>, amb el botó <strong>Provar el meu núvol ara</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El núvol sincronitza, no substitueix una còpia de seguretat: el que esborres en un dispositiu s'esborra en tots. Descarrega una còpia de tant en tant des d'El Meu Negoci → Manteniment de dades (l'app te ho recorda cada 30 dies).</div>

<h4>Instal·lar GastroGoan com a app</h4>
<p>No cal instal·lar res de cap botiga. Si vols una icona pròpia i pantalla completa, ancora-la a la pantalla d'inici:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Android (Chrome):</strong> obre l'app, menú ⋮ → <strong>Afegeix a la pantalla d'inici</strong> o <strong>Instal·la l'app</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone i iPad (Safari):</strong> botó de compartir <i class="ti ti-share-2"></i> → <strong>Afegeix a la pantalla d'inici</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Ordinador (Chrome o Edge):</strong> icona d'instal·lar al final de la barra d'adreces, o menú ⋮ → <strong>Instal·la l'aplicació</strong>.</div></div>
<p>Instal·la-la a cada dispositiu que s'hagi de fer servir cada dia (TPV de barra, tauleta de cuina, mòbil de l'encarregat).</p>

<h4>Com hi entra cada persona</h4>
<p>La pantalla d'entrada ofereix dues portes. Per canviar l'idioma fes servir el selector <strong>ES / CA / EN</strong> de la cantonada.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Accés Propietaris</strong> — Un <strong>compte</strong> (usuari + PIN) que reps en comprar, separat de cada local. L'usuari és igual amb majúscules o accents (Casa Paco = casapaco). El PIN del propietari té de 6 a 12 lletres o números. La primera vegada l'app t'anima a canviar-lo per un de teu; el nou val a tots els teus dispositius. En un dispositiu nou cal internet la primera vegada; després també hi entres sense connexió.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Accés Empleats</strong> — Cada empleat escriu el seu <strong>nom</strong> (el de la seva fitxa de Personal), el seu <strong>PIN d'accés</strong> (4 dígits; el de fàbrica és 1234 i en entrar se li demana triar-ne un de propi) i el <strong>codi de negoci</strong> de 8 caràcters que li dona el propietari. Entra directe a la seva àrea, Cuina o Sala. Funciona en un dispositiu que mai havia vist el negoci: l'app el localitza al núvol (aquesta primera vegada cal internet). El camp del codi recorda els últims fets servir en aquell aparell.</div></div>
<p>Després d'entrar com a propietari apareix <strong>Selecciona el teu negoci</strong>:</p>
<ul>
<li><strong>Compte nou sense negocis:</strong> prem <strong>Bescanviar negoci</strong> i escriu el codi de 8 caràcters de la teva llicència. Cal internet. Un codi pertany a un sol compte: si l'uses amb un altre, l'app avisarà que ja està en ús.</li>
<li><strong>Més negocis:</strong> cada local és independent (les seves dades, el seu núvol, el seu codi). Amb <strong>Nou independent</strong> afegeixes un negoci buit i amb <strong>Obrir sucursal</strong> en crees un que copia del que triïs l'oferta, receptes, ingredients, proveïdors, fitxes i tasques de neteja. La sucursal <strong>no</strong> copia taules, empleats, despeses ni vendes, i comparteix el núvol del negoci original. Tots dos botons demanen un altre codi de negoci (una altra llicència).</li>
<li>Amb dos o més negocis apareix <strong>Visió global dels meus negocis</strong>: vendes, tiquets i resultat de cadascun, només lectura. Des de la capçalera, el botó <strong>Negocis</strong> et torna a aquest selector.</li>
<li>Al peu: <strong>Canviar la meva contrasenya</strong> (el teu PIN de propietari) i <strong>Sortir i entrar amb un altre compte</strong>. Amb <strong>Treure</strong> treus un negoci d'aquest dispositiu: et demana escriure'n el nom, no afecta la llicència ni el núvol i el pots tornar a activar (no es pot si té sucursals).</li>
</ul>

<h4>Els sis modes d'estar a dins</h4>
<p>Segons qui entri, l'app ensenya i permet coses diferents. Hi ha sis modes: el propietari i, a cada àrea, l'empleat normal i l'empleat amb permís d'edició.</p>
<table><thead><tr><th>Mode</th><th>Què veu i què pot fer</th></tr></thead><tbody>
<tr><td><strong>Propietari</strong></td><td>Tot: les tres àrees, Gestió (Tauler, Economia, El Meu Negoci), fitxes del personal, el botó Negocis i el Centre d'Ajuda.</td></tr>
<tr><td><strong>Empleat de Cuina o de Sala</strong></td><td>Només la seva àrea. Treballa (TPV, comandes, estoc, neteja, el seu panell de tasques), però no veu els mòduls d'edició de costos (Oferta, Proveïdors, Mega Llista, Escandall, R+D) ni res de Gestió.</td></tr>
<tr><td><strong>Empleat amb permís d'edició</strong></td><td>El mateix, però entra ja en mode edició de la seva àrea i veu aquests mòduls: pot editar oferta, receptes, estoc i torns de la seva àrea. A Personal gestiona <strong>torns</strong>, no personal: només veu la seva pròpia targeta (les dades i el PIN dels companys són del propietari). Pot cancel·lar i anul·lar.</td></tr>
</tbody></table>
<ul>
<li><strong>Gestió Econòmica i El Meu Negoci són exclusives del propietari.</strong> No existeix cap PIN alternatiu per entrar-hi. Un empleat que ho prova veu un avís.</li>
<li>Marcar un empleat com a <strong>repartidor</strong> no és un setè mode: només el posa al repartiment de comandes a domicili; veu el mateix que qualsevol altre de Sala.</li>
<li>Cada empleat veu <strong>només el seu panell</strong> a Distribució de la Feina, encara que conegui el PIN d'un company.</li>
<li>Cancel·lar o anul·lar (reserves, comandes, vendes) és del propietari o d'un empleat amb permís d'edició.</li>
<li>El <strong>PIN del negoci</strong> (El Meu Negoci) és una altra cosa: 4 dígits que es demanen a un empleat per confirmar accions delicades, com anul·lar una venda cobrada o esborrar un empleat (el propietari només confirma amb un avís). Ve com 1234 fins que el canviïs. No dona accés a Gestió.</li>
<li>La casella <strong>Actiu</strong> de la fitxa talla l'accés a l'instant sense esborrar res, útil en baixes temporals.</li>
</ul>

<h4>Actualitzacions de l'app</h4>
<p>El programa es guarda al teu dispositiu (per això obre a l'instant) i les dades viatgen a part, així que actualitzar <strong>mai toca les teves dades</strong>. L'app mira si hi ha versió nova cada poques hores:</p>
<ul>
<li>Si acabes d'obrir-la i no has tocat res, <strong>s'actualitza sola</strong>.</li>
<li>Si estàs treballant (hi ha una finestra oberta o alguna cosa escrita), surt una barra taronja: <strong>Hi ha una versió nova de GastroGoan</strong>, amb <strong>Actualitzar ara</strong> i <strong>Més tard</strong>. Tries tu el moment.</li>
<li>El botó <strong>Actualitzar</strong> de la capçalera torna a llegir les dades desades (per si un altre dispositiu les ha canviat) i força la comprovació de versió. Avisa amb «Dades actualitzades».</li>
</ul>

<h4>Treballar sense internet</h4>
<p>L'app carrega igual sense connexió i tot el que facis es guarda a l'aparell; quan torna internet, puja sol. Per evitar sorpreses, tingues en compte el que <strong>sí que necessita connexió</strong>: entrar com a propietari per primera vegada en un dispositiu, bescanviar un codi, canviar el PIN del propietari, el primer accés d'un empleat en un aparell nou, la web pública de reserves, el cobrament amb Stripe, l'assistent d'IA i dibuixar els codis QR.</p>

<h4>El tour guiat i l'ajuda</h4>
<ul>
<li>En acabar l'alta l'app pregunta <strong>Vols fer un tour guiat?</strong>. Pots repetir-lo quan vulguis a Gestió → <strong>Manual d'Ús</strong> → <strong>Iniciar tour guiat</strong>. En mòbil es veu millor a tauleta o ordinador.</li>
<li>Aquest manual té cercador i el botó <strong>Imprimir capítol</strong>.</li>
<li>El botó <strong>Ajuda</strong> de la capçalera (només propietari) obre un panell amb un <strong>Assistent</strong> al qual li escrius el teu dubte, la llista de <strong>Temes</strong> i <strong>Contacte</strong> per escriure a suport.</li>
<li>El <strong>Xat intern</strong> permet parlar entre l'equip.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<p>Mira el capítol <strong>Preguntes freqüents i problemes</strong>: està ordenat per símptomes (no puc entrar, el núvol no sincronitza, no imprimeix, no baixa l'estoc...).</p>`,
    en:`<h3>What GastroGoan is and how it is organised</h3>
<p>GastroGoan is a management kit for bars and restaurants. Its core idea: <strong>every piece of data is typed once</strong> and the app reuses it everywhere. An ingredient's price recalculates the cost of your recipes, recipes feed technical sheets and your menu, the menu is sold in the POS, and POS sales move stock, finances and the Dashboard without you copying anything by hand.</p>
<p>From the Home screen you pick one of three areas:</p>
<table><thead><tr><th>Area</th><th>What is inside</th></tr></thead><tbody>
<tr><td><strong>Kitchen</strong></td><td>Kitchen Orders, Menu Offering, R&amp;D, Suppliers, Master List, Costing, Technical Sheets, Orders, Stock, Staff, Work Distribution and HACCP &amp; Hygiene.</td></tr>
<tr><td><strong>Dining Room</strong></td><td>POS, Reservations, Customers, Promotion and the floor version of the shared modules (Beverage Offering, Costing, Technical Sheets, Master List, Suppliers, Stock, Orders, Staff, Work Distribution, HACCP &amp; Hygiene, R&amp;D).</td></tr>
<tr><td><strong>Management</strong></td><td>Dashboard, Financial Management, My Business, Plan 360° and this User Manual. Only the owner gets in here.</td></tr>
</tbody></table>
<div class="manual-tip"><i class="ti ti-bulb"></i>The shared modules exist in Kitchen and in the Dining Room with <strong>their own data and their own vocabulary</strong>: Kitchen talks about dishes, portions and ingredients; the Dining Room talks about drinks, glasses and products. What you add in one area does not mix with the other.</div>

<h4>Recommended route to get your business ready</h4>
<p>You do not need to finish everything before you start selling: with the basics you can already use the POS and grow from there. This order saves you from repeating work:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Connect your cloud</strong> — The only mandatory step of the sign-up: a free Firebase project that belongs to you alone. Without it your data does not sync between devices and your staff cannot sign in from another device. The app walks you through it (about 10 minutes).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>My Business</strong> (Management) — Name and details, <strong>legal form and tax regime</strong>, opening hours, service types and your floor plan (zones and tables, with the seats of each table). Receipts, the booking website and tax calculations all come from here.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Master List</strong> — It already comes with a catalogue of about 275 products at zero price. Your job is to enter <strong>what you pay, excluding VAT</strong>. With no prices, costing comes out at zero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Suppliers</strong> — Your suppliers with their contact details; then link each product to its supplier so you can place orders per supplier.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Costing</strong> — Each dish (or drink) as a recipe with ingredients from the Master List. The app calculates cost per portion, food cost and margin.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Technical Sheets</strong> — The step-by-step of each dish, with its allergens. It is the recipe your team follows and what you show in an inspection.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Menu Offering</strong> (in the Dining Room, <strong>Beverage Offering</strong>) — Your menus and set menus with their sections and selling prices, and the schedule when each one switches on. This is what the POS and the online ordering page show.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Stock and Orders</strong> — Set the minimum for each product. Every POS charge deducts stock and receiving a supplier order tops it up.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Staff</strong>, <strong>Work Distribution</strong> and <strong>HACCP &amp; Hygiene</strong> — Add your team (with their PIN), shifts, the tasks of each position, and the cleaning and temperature plan.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>POS</strong> (Dining Room) — Where every service is run: tables, orders, payments, takeaway and delivery. And <strong>Kitchen Orders</strong> on the kitchen screen.</div></div>
<div class="manual-step"><div class="sn">11</div><div class="st"><strong>Online reservations and orders</strong> — Once you have tables with seats and an active menu, share the link or QR from My Business. If you want to take card payments, connect Stripe.</div></div>
<div class="manual-step"><div class="sn">12</div><div class="st"><strong>Financial Management</strong> and <strong>Dashboard</strong> — Add your fixed costs once; the Income Statement, Cash Flow and Dashboard work themselves out from real sales.</div></div>
<p>Once you have the above under control, <strong>R&amp;D</strong> (create dishes, set menus and menus with an AI assistant), <strong>Customers</strong>, <strong>Promotion</strong> and the other extras are waiting.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>At the beginning you will see the <strong>Setting up your business</strong> card on the Home screen, listing what is still missing for the app to work with your data (business details, hours, prices, recipes, menu, staff, tables). Each task ticks itself when you do it; you can hide the card and bring it back with <strong>See what is left</strong> in My Business → External connections.</div>

<h4>How your data is saved</h4>
<p>Everything saves itself, instantly, on the device you are using. There is no general save button (only in the forms that say so). If your cloud is connected, the data also <strong>uploads to your Firebase in under a second</strong> and spreads to your other devices: the waiter's phone, the kitchen tablet and the office computer all see the same thing.</p>
<p>The cloud is <strong>yours</strong>: you create it with your Google account, it is free, and GastroGoan cannot see your data. Its status is always visible at the top, on the header badge:</p>
<ul>
<li><strong>Cloud connected · N s ago</strong> — everything is uploaded; the time is that of the last confirmed upload.</li>
<li><strong>Saving...</strong> — changes are on their way.</li>
<li><strong>Offline</strong> — you keep working; it syncs on its own when the internet returns.</li>
<li><strong>Cloud error</strong> — something is wrong with your Firebase; tap it to see why (below, in "If something doesn't work").</li>
</ul>
<p>Tap that badge any time: it opens <strong>Cloud — Sync between devices</strong>, with the <strong>Test my cloud now</strong> button.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The cloud syncs; it does not replace a backup: what you delete on one device is deleted on all of them. Download a copy now and then from My Business → Data maintenance (the app reminds you every 30 days).</div>

<h4>Installing GastroGoan as an app</h4>
<p>There is nothing to install from any store. If you want your own icon and full screen, pin it to the home screen:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Android (Chrome):</strong> open the app, ⋮ menu → <strong>Add to Home screen</strong> or <strong>Install app</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>iPhone and iPad (Safari):</strong> share button <i class="ti ti-share-2"></i> → <strong>Add to Home Screen</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Computer (Chrome or Edge):</strong> install icon at the end of the address bar, or ⋮ menu → <strong>Install app</strong>.</div></div>
<p>Install it on every device that will be used daily (the bar POS, the kitchen tablet, the manager's phone).</p>

<h4>How each person signs in</h4>
<p>The sign-in screen offers two doors. To change the language use the <strong>ES / CA / EN</strong> selector in the corner.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Owner access</strong> — An <strong>account</strong> (username + PIN) you receive when you buy, separate from each location. The username works with any capitals or accents (Casa Paco = casapaco). The owner PIN is 6 to 12 letters or numbers. The first time, the app encourages you to swap it for one of your own; the new one works on all your devices. On a new device you need internet the first time; afterwards you can also sign in offline.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Employee access</strong> — Each employee types their <strong>name</strong> (as on their Staff record), their <strong>Access PIN</strong> (4 digits; the factory one is 1234 and on first sign-in they are asked to choose their own) and the 8-character <strong>business code</strong> the owner gives them. They go straight to their area, Kitchen or Dining Room. It works on a device that has never seen the business: the app finds it in the cloud (that first time needs internet). The code field remembers the last ones used on that device.</div></div>
<p>After signing in as owner you get <strong>Select your business</strong>:</p>
<ul>
<li><strong>New account with no businesses:</strong> tap <strong>Redeem business</strong> and type the 8-character code of your licence. Internet needed. A code belongs to one account only: if you use it with a different one, the app will say it is already in use.</li>
<li><strong>More businesses:</strong> each location is independent (its own data, cloud and code). <strong>New independent</strong> adds an empty business, and <strong>Open branch</strong> creates one that copies from the one you choose its menu, recipes, ingredients, suppliers, technical sheets and cleaning tasks. A branch does <strong>not</strong> copy tables, employees, expenses or sales, and it shares the original business's cloud. Both buttons ask for another business code (another licence).</li>
<li>With two or more businesses, <strong>Overview of my businesses</strong> appears: sales, tickets and result of each one, read-only. From the header, the <strong>Businesses</strong> button takes you back to this selector.</li>
<li>At the bottom: <strong>Change my password</strong> (your owner PIN) and <strong>Log out and use another account</strong>. <strong>Remove</strong> takes a business off this device: it asks you to type its name, does not affect the licence or the cloud, and you can reactivate it (not possible if it has branches).</li>
</ul>

<h4>The six ways of being signed in</h4>
<p>Depending on who signs in, the app shows and allows different things. There are six modes: the owner and, in each area, the regular employee and the employee with edit permission.</p>
<table><thead><tr><th>Mode</th><th>What they see and can do</th></tr></thead><tbody>
<tr><td><strong>Owner</strong></td><td>Everything: the three areas, Management (Dashboard, Finances, My Business), staff records, the Businesses button and the Help Centre.</td></tr>
<tr><td><strong>Kitchen or Dining Room employee</strong></td><td>Their area only. They work (POS, tickets, stock, cleaning, their task panel) but do not see the cost-editing modules (Menu Offering, Suppliers, Master List, Costing, R&amp;D) or anything in Management.</td></tr>
<tr><td><strong>Employee with edit permission</strong></td><td>The same, but they enter their area already in edit mode and see those modules: they can edit menu, recipes, stock and shifts of their area. In Staff they manage <strong>shifts</strong>, not people: they only see their own card (colleagues' details and PINs belong to the owner). They can cancel and void.</td></tr>
</tbody></table>
<ul>
<li><strong>Financial Management and My Business are owner-only.</strong> There is no alternative PIN to get in. An employee who tries sees a notice.</li>
<li>Ticking an employee as a <strong>rider</strong> is not a seventh mode: it only adds them to the delivery-order rota; they see what any other Dining Room employee sees.</li>
<li>Each employee sees <strong>only their own panel</strong> in Work Distribution, even if they know a colleague's PIN.</li>
<li>Cancelling or voiding (reservations, orders, sales) belongs to the owner or an employee with edit permission.</li>
<li>The <strong>Business PIN</strong> (My Business) is something else: 4 digits asked from an employee to confirm delicate actions, such as voiding a charged sale or deleting an employee (the owner just confirms with a prompt). It is 1234 until you change it. It does not give access to Management.</li>
<li>The <strong>Active</strong> checkbox on a staff record cuts access instantly without deleting anything, handy for temporary leave.</li>
</ul>

<h4>App updates</h4>
<p>The program is stored on your device (that is why it opens instantly) and data travels separately, so updating <strong>never touches your data</strong>. The app checks for a new version every few hours:</p>
<ul>
<li>If you have just opened it and touched nothing, it <strong>updates itself</strong>.</li>
<li>If you are working (a window is open or something is typed), an orange bar appears: <strong>There is a new version of GastroGoan</strong>, with <strong>Update now</strong> and <strong>Later</strong>. You choose the moment.</li>
<li>The <strong>Refresh</strong> button in the header re-reads the saved data (in case another device changed it) and forces the version check. It confirms with "Data updated".</li>
</ul>

<h4>Working without internet</h4>
<p>The app loads just the same offline and everything you do is saved on the device; when the internet returns, it uploads by itself. To avoid surprises, remember what <strong>does need a connection</strong>: signing in as owner for the first time on a device, redeeming a code, changing the owner PIN, an employee's first sign-in on a new device, the public booking website, Stripe payments, the AI assistant and drawing QR codes.</p>

<h4>The guided tour and help</h4>
<ul>
<li>When the sign-up ends the app asks <strong>Want a guided tour?</strong>. You can repeat it any time in Management → <strong>User Manual</strong> → <strong>Start guided tour</strong>. On a phone it is better on a tablet or computer.</li>
<li>This manual has a search box and the <strong>Print chapter</strong> button.</li>
<li>The <strong>Help</strong> button in the header (owner only) opens a panel with an <strong>Assistant</strong> you can type your question to, the list of <strong>Topics</strong> and <strong>Contact</strong> to write to support.</li>
<li>The <strong>Internal chat</strong> lets the team talk to each other.</li>
</ul>

<h4>If something doesn't work</h4>
<p>See the <strong>Frequently asked questions and problems</strong> chapter: it is organised by symptom (I can't sign in, the cloud isn't syncing, it won't print, stock doesn't go down...).</p>`}
  },
  {id:'megalista', area:'cocina',
    title:{es:`<i class="ti ti-list-details"></i> Mega Lista`, ca:`<i class="ti ti-list-details"></i> Mega Llista`, en:`<i class="ti ti-list-details"></i> Master List`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>La Mega Lista es el <strong>catálogo de todo lo que compras</strong>: los ingredientes en Cocina y los productos en Sala (vinos, refrescos, hielo, guarniciones…). Es la primera pieza que conviene dejar bien, porque <strong>todo lo demás se calcula con los precios que pongas aquí</strong>: el coste de cada plato en el Escandallo, el food cost, el valor del stock, los pedidos y el IVA de tus compras.</p>
<p>Cocina y Sala tienen cada una <strong>su propia Mega Lista</strong>: lo que das de alta en una no aparece en la otra. Se abre desde la carpeta <strong>Cocina</strong> o <strong>Sala</strong>. En Sala la pantalla habla de «productos» en lugar de «ingredientes», pero funciona igual.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Un negocio nuevo ya trae un <strong>catálogo de unos 275 artículos</strong> (materia prima de cocina y productos de bebida de sala) repartidos en carpetas, sin precio, sin IVA y sin proveedor. No tienes que escribirlos: rellena los que usas de verdad y borra los que no.</div>

<h4>Cómo se enlazan Mega Lista, Escandallo, Ficha técnica y Oferta</h4>
<p>Cada dato se escribe <strong>una sola vez</strong> y viaja hacia delante. Si cambias un precio aquí, todo lo que viene después se actualiza solo.</p>
<table>
<thead><tr><th>Pantalla</th><th>Qué guardas ahí</th><th>Qué recibe de la anterior</th></tr></thead>
<tbody>
<tr><td><strong>Mega Lista</strong></td><td>Cada producto: precio de compra sin IVA, IVA, proveedor, alérgenos</td><td>Nada: aquí empieza todo</td></tr>
<tr><td><strong>Escandallo</strong></td><td>Cuánto cuesta cada plato o bebida y qué margen deja</td><td>El precio y los alérgenos de cada producto</td></tr>
<tr><td><strong>Fichas Técnicas</strong></td><td>La receta para cocinar: pasos, tiempos, emplatado</td><td>Ingredientes, cantidades y alérgenos del Escandallo</td></tr>
<tr><td><strong>Oferta Gastronómica</strong></td><td>Lo que vendes y a qué precio</td><td>Nombre y precio de venta del Escandallo</td></tr>
</tbody></table>
<p>Y al final del camino: cuando cobras un plato en el TPV, la app <strong>descuenta del Stock</strong> lo que lleva su Escandallo, y en <strong>Pedidos</strong> se compra cada producto a su proveedor.</p>

<h4>Antes de empezar: da de alta un proveedor</h4>
<p>Para crear un producto hace falta que exista <strong>al menos un proveedor</strong>. Si todavía no tienes ninguno, la app te avisa («Necesitas un proveedor») y te ofrece <strong>Nuevo Proveedor</strong>. Está explicado en el capítulo Proveedores.</p>

<h4>Cómo añadir un ingrediente, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra en <strong>Cocina → Mega Lista</strong> y pulsa <strong>Nuevo Ingrediente</strong> (en Sala, <strong>Nuevo Producto</strong>). Solo lo ve el propietario y los empleados con permiso de edición.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escribe el <strong>Nombre</strong> como lo reconoces tú («Solomillo de ternera», «Coca-Cola lata 33 cl»). Es el que verás luego al montar los escandallos.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige la <strong>Categoría</strong>: es la carpeta donde se guarda. Si no existe la que quieres, usa <strong>+ Nueva categoría...</strong> en el propio desplegable.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Elige el <strong>Proveedor</strong> al que se lo compras habitualmente.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">En el bloque <strong>Cómo lo compras</strong> rellena cuatro cosas: la <strong>Unidad</strong> (g, kg, ud, ml, cl o L), la <strong>Cantidad por compra</strong> (lo que trae el formato en que lo compras, en esa unidad), el <strong>Precio de compra (sin IVA)</strong> de ese formato completo, y el <strong>IVA</strong> que lleva (21 %, 10 %, 4 % o 0 %).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Mira la línea de cálculo que aparece debajo, en vivo: «Cuesta 0,0044 €/ml · Con IVA 24,20 €». Si ves «Falta elegir el IVA», aún no lo has puesto.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Marca los <strong>Alérgenos</strong> que lleva (los 14 de la normativa europea). Pasarán solos al Escandallo y a la Ficha técnica de todo plato que lo use.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st">Pulsa <strong>Guardar</strong>. Si ya tienes otro producto con ese nombre, la app te lo avisa por si es un duplicado.</div></div>
<p><strong>Ejemplo.</strong> Compras una garrafa de aceite de 5 litros a 22 € más IVA. Pones: Unidad <strong>ml</strong>, Cantidad por compra <strong>5000</strong>, Precio <strong>22</strong>, IVA <strong>10 %</strong>. La app calcula 22 ÷ 5000 = <strong>0,0044 €/ml</strong>, y que pagas 24,20 € con IVA. Si una receta usa 30 ml, el Escandallo le sumará 0,132 € sin que hagas ninguna cuenta.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>El precio va siempre SIN IVA.</strong> En tu factura busca la base imponible, no el total. Si metes el precio con IVA, todos los costes saldrán un 10 % o un 21 % más caros de lo que son. El IVA va aparte, en su propia casilla, porque lo necesita la contabilidad (IVA soportado de tus compras).</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Ojo con la unidad.</strong> En el Escandallo escribirás las cantidades en la <strong>misma unidad</strong> del producto. Los artículos del catálogo vienen en kg, L o unidades con «cantidad por compra 1»: en una receta, 0,2 significa 200 g. Si prefieres escribir gramos, cambia la unidad a <strong>g</strong> y la cantidad por compra a <strong>1000</strong> (poniendo el precio de ese kilo) <em>antes</em> de usarlo en recetas. Cambiar la unidad de un producto que ya usas <strong>no convierte</strong> las cantidades escritas en recetas ni en el Stock.</div>

<h4>Revisar lo que falta: «Por revisar»</h4>
<p>Encima de la lista aparece la franja <strong>Por revisar</strong> con tres botones y su número: <strong>Sin precio</strong>, <strong>Sin IVA</strong> y <strong>Sin proveedor</strong>. Pulsa uno y la lista solo enseña los productos que tienen ese hueco; vuelve a pulsarlo para quitar el filtro. Cuando no falta nada verás «Todo con precio, IVA y proveedor».</p>
<p>Conviene vaciar «Sin precio» primero: <strong>un producto sin precio cuenta como 0 €</strong> en el Escandallo y hace que el plato parezca más barato de lo que es. En la vista de carpetas, cada tarjeta te dice cuántos productos tiene «por revisar».</p>

<h4>Carpetas, búsqueda y orden</h4>
<ul>
<li><strong>Carpetas.</strong> La lista se abre por carpetas (Verduras, Carnes, Lácteos…) con su icono y el número de productos. Pulsa una para entrar y <strong>Categorías</strong> para volver. Toca el <strong>icono</strong> de una carpeta para elegir otro.</li>
<li><strong>Menú ⋯ de la carpeta.</strong> <strong>Renombrar categoría</strong> y <strong>Borrar carpeta</strong>. Si la carpeta tiene productos dentro, la app te pregunta a qué otra carpeta quieres moverlos: <strong>nunca se borra ningún producto</strong> por borrar una carpeta. «Sin categoría» no es una carpeta de verdad y no tiene menú.</li>
<li><strong>Buscador</strong> (por nombre, proveedor o categoría) y filtro <strong>Todos los proveedores</strong>. Al buscar o filtrar, ves una lista plana con todos los resultados.</li>
<li><strong>Orden.</strong> En ordenador, pulsa la cabecera de una columna (Ingrediente, Proveedor, Compra (sin IVA), IVA); una segunda pulsación invierte el orden. En móvil hay un desplegable de orden junto al buscador.</li>
<li><strong>IVA de toda la carpeta.</strong> Dentro de una carpeta, elige un tipo y pulsa <strong>Aplicar</strong>: la app te dice cuántos productos cambian antes de hacerlo. Es la forma rápida de dar el IVA al catálogo (casi todo lo de una carpeta lleva el mismo). También puedes cambiarlo producto a producto en el desplegable de la propia fila.</li>
</ul>

<h4>La lista en el móvil</h4>
<p>En el móvil cada fila enseña solo el <strong>nombre</strong> y la <strong>compra</strong> (cantidad × precio y coste por unidad). Pulsa la fila o la flecha <i class="ti ti-chevron-down"></i> para ver el resto: proveedor, IVA, alérgenos y el menú ⋯. Un punto ámbar junto al nombre avisa de que falta el IVA o el proveedor. En ordenador y tablet grande todo está a la vista.</p>

<h4>Editar, eliminar y ver el historial de precios</h4>
<ul>
<li>El menú <strong>⋯</strong> de cada fila tiene <strong>Editar</strong> y <strong>Eliminar</strong>.</li>
<li>Al <strong>eliminar</strong> un producto que se usa en recetas o en pedidos pendientes, sale la ventana «Ingrediente en uso» con la lista de dónde está. Si lo eliminas igual, se quita de esas recetas (que pasarán a costar menos) y del Stock, y los pedidos en curso dejan de contarlo. El propietario solo confirma; un empleado con edición debe teclear el PIN del negocio. Queda 30 días en la <strong>Papelera</strong> (Gestión → Mi Negocio → Mantenimiento de datos) por si te arrepientes.</li>
<li>Al <strong>editar</strong> un producto, si cambias el precio, la app lo anota. Verás los últimos cambios en la ficha del producto, en <strong>Historial de precios</strong>: fecha, precio de antes y de ahora, y el % de subida o bajada.</li>
</ul>

<h4>Cuando un proveedor te sube (o te baja) el precio</h4>
<p>Cuando llegue una factura con otro precio, edita el producto y cambia el <strong>Precio de compra (sin IVA)</strong>. Nada más: todos los escandallos que lo usan se recalculan al instante. También se actualiza solo si cambias el precio al recibir un pedido (campo «Precio albarán» de Pedidos).</p>
<p>La app vigila esos cambios por ti. En el <strong>Panel de Control</strong>, en el bloque de avisos, verás <strong>Subidas de precio (14 días)</strong> y <strong>Bajadas de precio</strong>. Al pulsarlas se abre <strong>Cambios de precio</strong>, con dos pestañas, <strong>Suben</strong> y <strong>Bajan</strong>:</p>
<ul>
<li>Cada producto muestra de qué precio a cuál pasó, con qué proveedor y cuánto te supone <strong>al mes</strong>, según lo que sueles comprar («Unos 29 € más al mes»).</li>
<li>Debajo, <strong>Platos afectados</strong>: cómo cambia el food cost de cada plato que lo lleva (también si llega por una elaboración base).</li>
<li>Si un plato se pasa de tu objetivo de food cost, te propone <strong>el precio de venta</strong> que lo recupera («Para mantener el 35 %: 12,50 € → 13,40 €») y un botón <strong>Aplicar</strong>. Nunca cambia solo: te pide confirmación y, si aceptas, cambia también el precio en las cartas donde está el plato. El objetivo de food cost se fija en Gestión Económica (por defecto, el 35 %).</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
<li><strong>Quién puede usarla.</strong> La Mega Lista (igual que Proveedores y Escandallo) solo aparece para el <strong>propietario</strong> y para los <strong>empleados con permiso de edición</strong>. Un empleado sin ese permiso ni la ve en su carpeta: son datos de costes.</li>
<li><strong>Todo se guarda y se sincroniza</strong> entre tus dispositivos; un producto borrado en uno desaparece en los demás.</li>
<li>La <strong>Cantidad por compra</strong> también es el «envase» que usa Pedidos cuando te sugiere cuánto pedir: redondea hacia arriba a envases completos.</li>
<li>Si renombras un proveedor en Proveedores, sus productos se actualizan solos.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>Un plato sale con coste 0 o ridículo.</strong> Mira en la Mega Lista el producto: suele faltar el precio, o la <em>Cantidad por compra</em> está en otra unidad (5 de «kg» en vez de 5000 de «g»).</li>
<li><strong>Un plato sale muy caro.</strong> Casi siempre es una unidad cruzada: el producto está en kg y en la receta pusiste 200 pensando en gramos.</li>
<li><strong>No me deja crear el producto.</strong> Falta dar de alta un proveedor, o tu sesión no tiene permiso de edición.</li>
<li><strong>Al editar un producto del catálogo, el proveedor aparece ya puesto.</strong> Es el primero de tu lista: los del catálogo no traen proveedor. Compruébalo antes de guardar y elige el correcto.</li>
<li><strong>No encuentro una carpeta.</strong> Está filtrada: borra el buscador, el filtro de proveedor o el botón «Por revisar» que tengas activo.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>La Mega Llista és el <strong>catàleg de tot el que compres</strong>: els ingredients a Cuina i els productes a Sala (vins, refrescos, gel, guarnicions…). És la primera peça que convé deixar ben feta, perquè <strong>tota la resta es calcula amb els preus que posis aquí</strong>: el cost de cada plat a l'Escandall, el food cost, el valor de l'estoc, les comandes i l'IVA de les teves compres.</p>
<p>Cuina i Sala tenen cadascuna <strong>la seva pròpia Mega Llista</strong>: el que dones d'alta en una no apareix a l'altra. S'obre des de la carpeta <strong>Cuina</strong> o <strong>Sala</strong>. A Sala la pantalla parla de «productes» en lloc d'«ingredients», però funciona igual.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Un negoci nou ja porta un <strong>catàleg d'unes 275 referències</strong> (matèria primera de cuina i productes de beguda de sala) repartides en carpetes, sense preu, sense IVA i sense proveïdor. No cal que les escriguis: omple les que fas servir de veritat i esborra les que no.</div>

<h4>Com s'enllacen Mega Llista, Escandall, Fitxa tècnica i Oferta</h4>
<p>Cada dada s'escriu <strong>una sola vegada</strong> i viatja cap endavant. Si canvies un preu aquí, tot el que ve després s'actualitza sol.</p>
<table>
<thead><tr><th>Pantalla</th><th>Què hi deses</th><th>Què rep de l'anterior</th></tr></thead>
<tbody>
<tr><td><strong>Mega Llista</strong></td><td>Cada producte: preu de compra sense IVA, IVA, proveïdor, al·lèrgens</td><td>Res: aquí comença tot</td></tr>
<tr><td><strong>Escandall</strong></td><td>Quant costa cada plat o beguda i quin marge deixa</td><td>El preu i els al·lèrgens de cada producte</td></tr>
<tr><td><strong>Fitxes Tècniques</strong></td><td>La recepta per cuinar: passos, temps, emplatat</td><td>Ingredients, quantitats i al·lèrgens de l'Escandall</td></tr>
<tr><td><strong>Oferta Gastronòmica</strong></td><td>El que vens i a quin preu</td><td>Nom i preu de venda de l'Escandall</td></tr>
</tbody></table>
<p>I al final del camí: quan cobres un plat al TPV, l'app <strong>descompta de l'Estoc</strong> el que porta el seu Escandall, i a <strong>Comandes</strong> es compra cada producte al seu proveïdor.</p>

<h4>Abans de començar: dona d'alta un proveïdor</h4>
<p>Per crear un producte cal que existeixi <strong>almenys un proveïdor</strong>. Si encara no en tens cap, l'app t'ho avisa («Necessites un proveïdor») i t'ofereix <strong>Nou Proveïdor</strong>. Ho trobaràs explicat al capítol Proveïdors.</p>

<h4>Com afegir un ingredient, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra a <strong>Cuina → Mega Llista</strong> i prem <strong>Nou Ingredient</strong> (a Sala, <strong>Nou Producte</strong>). Només el veuen el propietari i els empleats amb permís d'edició.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escriu el <strong>Nom</strong> tal com el reconeixes («Filet de vedella», «Coca-Cola llauna 33 cl»). És el que veuràs després en muntar els escandalls.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria la <strong>Categoria</strong>: és la carpeta on es desa. Si no existeix la que vols, fes servir <strong>+ Nova categoria...</strong> al mateix desplegable.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Tria el <strong>Proveïdor</strong> al qual el compres habitualment.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Al bloc <strong>Com ho compres</strong> omple quatre coses: la <strong>Unitat</strong> (g, kg, ud, ml, cl o L), la <strong>Quantitat per compra</strong> (el que porta el format en què ho compres, en aquesta unitat), el <strong>Preu de compra (sense IVA)</strong> d'aquest format sencer, i l'<strong>IVA</strong> que porta (21 %, 10 %, 4 % o 0 %).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Mira la línia de càlcul que apareix a sota, en viu: «Costa 0,0044 €/ml · Amb IVA 24,20 €». Si veus «Falta triar l'IVA», encara no l'has posat.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Marca els <strong>Al·lèrgens</strong> que porta (els 14 de la normativa europea). Passaran sols a l'Escandall i a la Fitxa tècnica de tot plat que el faci servir.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st">Prem <strong>Desar</strong>. Si ja tens un altre producte amb aquest nom, l'app t'ho avisa per si és un duplicat.</div></div>
<p><strong>Exemple.</strong> Compres una garrafa d'oli de 5 litres a 22 € més IVA. Hi poses: Unitat <strong>ml</strong>, Quantitat per compra <strong>5000</strong>, Preu <strong>22</strong>, IVA <strong>10 %</strong>. L'app calcula 22 ÷ 5000 = <strong>0,0044 €/ml</strong>, i que pagues 24,20 € amb IVA. Si una recepta fa servir 30 ml, l'Escandall hi sumarà 0,132 € sense que facis cap compte.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>El preu va sempre SENSE IVA.</strong> A la teva factura busca la base imposable, no el total. Si poses el preu amb IVA, tots els costos sortiran un 10 % o un 21 % més cars del que són. L'IVA va a part, a la seva pròpia casella, perquè el necessita la comptabilitat (IVA suportat de les teves compres).</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Compte amb la unitat.</strong> A l'Escandall escriuràs les quantitats a la <strong>mateixa unitat</strong> del producte. Els articles del catàleg vénen en kg, L o unitats amb «quantitat per compra 1»: en una recepta, 0,2 vol dir 200 g. Si prefereixes escriure grams, canvia la unitat a <strong>g</strong> i la quantitat per compra a <strong>1000</strong> (posant el preu d'aquell quilo) <em>abans</em> de fer-lo servir en receptes. Canviar la unitat d'un producte que ja uses <strong>no converteix</strong> les quantitats escrites en receptes ni a l'Estoc.</div>

<h4>Revisar el que falta: «Per revisar»</h4>
<p>A sobre de la llista apareix la franja <strong>Per revisar</strong> amb tres botons i el seu nombre: <strong>Sense preu</strong>, <strong>Sense IVA</strong> i <strong>Sense proveïdor</strong>. Prem-ne un i la llista només ensenya els productes que tenen aquell buit; torna a prémer-lo per treure el filtre. Quan no falta res veuràs «Tot amb preu, IVA i proveïdor».</p>
<p>Convé buidar primer «Sense preu»: <strong>un producte sense preu compta com 0 €</strong> a l'Escandall i fa que el plat sembli més barat del que és. A la vista de carpetes, cada targeta et diu quants productes té «per revisar».</p>

<h4>Carpetes, cerca i ordre</h4>
<ul>
<li><strong>Carpetes.</strong> La llista s'obre per carpetes (Verdures, Carns, Làctics…) amb la seva icona i el nombre de productes. Prem-ne una per entrar i <strong>Categories</strong> per tornar. Toca la <strong>icona</strong> d'una carpeta per triar-ne una altra.</li>
<li><strong>Menú ⋯ de la carpeta.</strong> <strong>Reanomenar categoria</strong> i <strong>Esborrar carpeta</strong>. Si la carpeta té productes a dins, l'app et pregunta a quina altra carpeta els vols moure: <strong>mai no s'esborra cap producte</strong> per esborrar una carpeta. «Sense categoria» no és una carpeta de veritat i no té menú.</li>
<li><strong>Cercador</strong> (per nom, proveïdor o categoria) i filtre <strong>Tots els proveïdors</strong>. En cercar o filtrar, veus una llista plana amb tots els resultats.</li>
<li><strong>Ordre.</strong> A l'ordinador, prem la capçalera d'una columna (Ingredient, Proveïdor, Compra (sense IVA), IVA); una segona pulsació inverteix l'ordre. Al mòbil hi ha un desplegable d'ordre al costat del cercador.</li>
<li><strong>IVA de tota la carpeta.</strong> Dins d'una carpeta, tria un tipus i prem <strong>Aplicar</strong>: l'app et diu quants productes canvien abans de fer-ho. És la manera ràpida de donar l'IVA al catàleg (quasi tot el d'una carpeta porta el mateix). També pots canviar-lo producte a producte al desplegable de la mateixa fila.</li>
</ul>

<h4>La llista al mòbil</h4>
<p>Al mòbil cada fila només ensenya el <strong>nom</strong> i la <strong>compra</strong> (quantitat × preu i cost per unitat). Prem la fila o la fletxa <i class="ti ti-chevron-down"></i> per veure la resta: proveïdor, IVA, al·lèrgens i el menú ⋯. Un punt ambre al costat del nom avisa que falta l'IVA o el proveïdor. A l'ordinador i a la tauleta gran tot és a la vista.</p>

<h4>Editar, eliminar i veure l'historial de preus</h4>
<ul>
<li>El menú <strong>⋯</strong> de cada fila té <strong>Editar</strong> i <strong>Eliminar</strong>.</li>
<li>En <strong>eliminar</strong> un producte que es fa servir en receptes o en comandes pendents, surt la finestra «Ingredient en ús» amb la llista d'on és. Si l'elimines igualment, es treu d'aquestes receptes (que passaran a costar menys) i de l'Estoc, i les comandes en curs deixen de comptar-lo. El propietari només confirma; un empleat amb edició ha de teclejar el PIN del negoci. Queda 30 dies a la <strong>Paperera</strong> (Gestió → El Meu Negoci → Manteniment de dades) per si te'n penedeixes.</li>
<li>En <strong>editar</strong> un producte, si canvies el preu, l'app ho anota. Veuràs els últims canvis a la fitxa del producte, a <strong>Historial de preus</strong>: data, preu d'abans i d'ara, i el % de pujada o baixada.</li>
</ul>

<h4>Quan un proveïdor et puja (o et baixa) el preu</h4>
<p>Quan arribi una factura amb un altre preu, edita el producte i canvia el <strong>Preu de compra (sense IVA)</strong>. Res més: tots els escandalls que el fan servir es recalculen a l'instant. També s'actualitza sol si canvies el preu en rebre una comanda (camp «Preu albarà» de Comandes).</p>
<p>L'app vigila aquests canvis per tu. Al <strong>Tauler de Control</strong>, al bloc d'avisos, veuràs <strong>Pujades de preu (14 dies)</strong> i <strong>Baixades de preu</strong>. En prémer-les s'obre <strong>Canvis de preu</strong>, amb dues pestanyes, <strong>Pugen</strong> i <strong>Baixen</strong>:</p>
<ul>
<li>Cada producte mostra de quin preu a quin va passar, amb quin proveïdor i quant et suposa <strong>al mes</strong>, segons el que sols comprar («Uns 29 € més al mes»).</li>
<li>A sota, <strong>Plats afectats</strong>: com canvia el food cost de cada plat que el porta (també si hi arriba per una elaboració base).</li>
<li>Si un plat se'n va del teu objectiu de food cost, et proposa <strong>el preu de venda</strong> que el recupera («Per mantenir el 35 %: 12,50 € → 13,40 €») i un botó <strong>Aplicar</strong>. Mai no canvia sol: et demana confirmació i, si acceptes, canvia també el preu a les cartes on és el plat. L'objectiu de food cost es fixa a Gestió Econòmica (per defecte, el 35 %).</li>
</ul>

<h4>El que convé saber</h4>
<ul>
<li><strong>Qui la pot fer servir.</strong> La Mega Llista (com Proveïdors i Escandall) només apareix per al <strong>propietari</strong> i per als <strong>empleats amb permís d'edició</strong>. Un empleat sense aquest permís ni la veu a la seva carpeta: són dades de costos.</li>
<li><strong>Tot es desa i se sincronitza</strong> entre els teus dispositius; un producte esborrat en un desapareix als altres.</li>
<li>La <strong>Quantitat per compra</strong> també és l'«envàs» que fa servir Comandes quan et suggereix quant demanar: arrodoneix cap amunt a envasos complets.</li>
<li>Si reanomenes un proveïdor a Proveïdors, els seus productes s'actualitzen sols.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>Un plat surt amb cost 0 o ridícul.</strong> Mira a la Mega Llista el producte: sol faltar el preu, o la <em>Quantitat per compra</em> és en una altra unitat (5 de «kg» en comptes de 5000 de «g»).</li>
<li><strong>Un plat surt molt car.</strong> Quasi sempre és una unitat creuada: el producte és en kg i a la recepta vas posar 200 pensant en grams.</li>
<li><strong>No em deixa crear el producte.</strong> Falta donar d'alta un proveïdor, o la teva sessió no té permís d'edició.</li>
<li><strong>En editar un producte del catàleg, el proveïdor ja hi surt posat.</strong> És el primer de la teva llista: els del catàleg no porten proveïdor. Comprova-ho abans de desar i tria el correcte.</li>
<li><strong>No trobo una carpeta.</strong> Està filtrada: esborra el cercador, el filtre de proveïdor o el botó «Per revisar» que tinguis actiu.</li>
</ul>`,
    en:`<h3>What it is and what it is for</h3>
<p>The Master List is the <strong>catalogue of everything you buy</strong>: ingredients in Kitchen and products in the Dining Room (wines, soft drinks, ice, garnishes…). It is the first piece worth getting right, because <strong>everything else is calculated from the prices you enter here</strong>: the cost of each dish in Costing, food cost, the value of your stock, orders and the VAT on your purchases.</p>
<p>Kitchen and Dining Room each have <strong>their own Master List</strong>: what you add in one does not show up in the other. Open it from the <strong>Kitchen</strong> or <strong>Dining Room</strong> folder. In the Dining Room the screen says «products» instead of «ingredients», but it works the same way.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>A new business already comes with a <strong>catalogue of about 275 items</strong> (kitchen raw materials and dining room drink products) sorted into folders, with no price, no VAT and no supplier. You do not have to type them in: fill in the ones you really use and delete the rest.</div>

<h4>How Master List, Costing, Technical Sheet and Menu fit together</h4>
<p>Every piece of data is entered <strong>once</strong> and travels forward. If you change a price here, everything that follows updates by itself.</p>
<table>
<thead><tr><th>Screen</th><th>What you keep there</th><th>What it takes from the previous one</th></tr></thead>
<tbody>
<tr><td><strong>Master List</strong></td><td>Each product: purchase price excl. VAT, VAT, supplier, allergens</td><td>Nothing: this is where it all starts</td></tr>
<tr><td><strong>Costing</strong></td><td>How much each dish or drink costs and what margin it leaves</td><td>The price and allergens of each product</td></tr>
<tr><td><strong>Technical Sheets</strong></td><td>The recipe to cook from: steps, times, plating</td><td>Ingredients, quantities and allergens from Costing</td></tr>
<tr><td><strong>Menu Offering</strong></td><td>What you sell and at what price</td><td>Name and sale price from Costing</td></tr>
</tbody></table>
<p>And at the end of the road: when you charge a dish at the POS, the app <strong>deducts from Stock</strong> what its Costing sheet contains, and in <strong>Orders</strong> each product is bought from its supplier.</p>

<h4>Before you start: add a supplier</h4>
<p>To create a product there must be <strong>at least one supplier</strong>. If you have none yet, the app tells you («You need a supplier») and offers <strong>New Supplier</strong>. It is explained in the Suppliers chapter.</p>

<h4>How to add an ingredient, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>Kitchen → Master List</strong> and press <strong>New Ingredient</strong> (in the Dining Room, <strong>New Product</strong>). Only the owner and employees with edit permission see it.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Type the <strong>Name</strong> the way you know it («Beef tenderloin», «Coca-Cola can 33 cl»). It is the name you will pick later when building costing sheets.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Choose the <strong>Category</strong>: it is the folder where it is stored. If the one you want does not exist, use <strong>+ New category...</strong> in the same drop-down.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Choose the <strong>Supplier</strong> you usually buy it from.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">In the <strong>How you buy it</strong> block fill in four things: the <strong>Unit</strong> (g, kg, ud, ml, cl or L), the <strong>Quantity per purchase</strong> (what the pack you buy contains, in that unit), the <strong>Purchase price (excl. VAT)</strong> of that whole pack, and the <strong>VAT</strong> it carries (21 %, 10 %, 4 % or 0 %).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Check the live calculation line underneath: «Costs 0.0044 €/ml · With VAT 24.20 €». If you see «Choose the VAT rate», you have not picked one yet.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Tick the <strong>Allergens</strong> it contains (the 14 in EU rules). They flow on their own into Costing and into the Technical Sheet of every dish that uses it.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st">Press <strong>Save</strong>. If you already have a product with that name, the app warns you in case it is a duplicate.</div></div>
<p><strong>Example.</strong> You buy a 5-litre drum of oil at €22 plus VAT. Enter: Unit <strong>ml</strong>, Quantity per purchase <strong>5000</strong>, Price <strong>22</strong>, VAT <strong>10 %</strong>. The app works out 22 ÷ 5000 = <strong>€0.0044/ml</strong>, and that you pay €24.20 including VAT. If a recipe uses 30 ml, Costing adds €0.132 without you doing any maths.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>The price is always EXCLUDING VAT.</strong> On your invoice look for the taxable base, not the total. If you enter the price with VAT, every cost will come out 10 % or 21 % higher than it really is. VAT goes in its own box because accounting needs it (input VAT on your purchases).</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Watch the unit.</strong> In Costing you will write quantities in the <strong>same unit</strong> as the product. Catalogue items come in kg, L or units with «quantity per purchase 1»: in a recipe, 0.2 means 200 g. If you would rather type grams, change the unit to <strong>g</strong> and the quantity per purchase to <strong>1000</strong> (entering the price of that kilo) <em>before</em> using it in recipes. Changing the unit of a product you already use <strong>does not convert</strong> the quantities already written in recipes or in Stock.</div>

<h4>Checking what is missing: «To review»</h4>
<p>Above the list there is a <strong>To review</strong> strip with three buttons and their count: <strong>No price</strong>, <strong>No VAT</strong> and <strong>No supplier</strong>. Press one and the list shows only the products with that gap; press it again to remove the filter. When nothing is missing you will see «Everything has a price, VAT and a supplier».</p>
<p>It pays to clear «No price» first: <strong>a product with no price counts as €0</strong> in Costing and makes the dish look cheaper than it is. In the folders view, each card tells you how many products are «to review».</p>

<h4>Folders, search and sorting</h4>
<ul>
<li><strong>Folders.</strong> The list opens by folders (Vegetables, Meat, Dairy…) with their icon and number of products. Press one to go in and <strong>Categories</strong> to come back. Tap a folder's <strong>icon</strong> to choose a different one.</li>
<li><strong>Folder ⋯ menu.</strong> <strong>Rename category</strong> and <strong>Delete folder</strong>. If the folder has products inside, the app asks which other folder to move them to: <strong>no product is ever deleted</strong> by deleting a folder. «No category» is not a real folder and has no menu.</li>
<li><strong>Search box</strong> (by name, supplier or category) and the <strong>All suppliers</strong> filter. When you search or filter you get a flat list of all the results.</li>
<li><strong>Sorting.</strong> On a computer, click a column header (Ingredient, Supplier, Purchase (excl. VAT), VAT); a second click reverses the order. On mobile there is a sort drop-down next to the search box.</li>
<li><strong>VAT for the whole folder.</strong> Inside a folder, pick a rate and press <strong>Apply</strong>: the app tells you how many products will change before doing it. It is the fast way to give the catalogue its VAT (nearly everything in a folder carries the same rate). You can also change it product by product in the drop-down on the row itself.</li>
</ul>

<h4>The list on a phone</h4>
<p>On a phone each row shows only the <strong>name</strong> and the <strong>purchase</strong> (quantity × price and cost per unit). Tap the row or the arrow <i class="ti ti-chevron-down"></i> to see the rest: supplier, VAT, allergens and the ⋯ menu. An amber dot next to the name warns that the VAT or supplier is missing. On a computer or large tablet everything is in view.</p>

<h4>Editing, deleting and the price history</h4>
<ul>
<li>The <strong>⋯</strong> menu on each row has <strong>Edit</strong> and <strong>Delete</strong>.</li>
<li>When you <strong>delete</strong> a product used in recipes or pending orders, an «Ingredient in use» window lists where it is. If you delete it anyway it is removed from those recipes (which will cost less) and from Stock, and orders in progress stop counting it. The owner just confirms; an employee with edit permission must type the business PIN. It stays 30 days in the <strong>Recycle bin</strong> (Management → My Business → Data maintenance) in case you change your mind.</li>
<li>When you <strong>edit</strong> a product and change its price, the app records it. You will see the latest changes in the product form, under <strong>Price history</strong>: date, old and new price, and the % rise or fall.</li>
</ul>

<h4>When a supplier raises (or lowers) a price</h4>
<p>When an invoice arrives with a different price, edit the product and change the <strong>Purchase price (excl. VAT)</strong>. That is all: every costing sheet that uses it recalculates instantly. It also updates by itself if you change the price when receiving an order («Delivery note price» field in Orders).</p>
<p>The app watches these changes for you. On the <strong>Dashboard</strong>, in the alerts block, you will see <strong>Price rises (14 days)</strong> and <strong>Price drops</strong>. Pressing them opens <strong>Price changes</strong>, with two tabs, <strong>Rising</strong> and <strong>Falling</strong>:</p>
<ul>
<li>Each product shows what price it went from and to, with which supplier, and what it means for you <strong>per month</strong> at your usual volume («About €29 more per month»).</li>
<li>Below it, <strong>Dishes affected</strong>: how the food cost changes for each dish that contains it (also when it arrives through a base elaboration).</li>
<li>If a dish goes over your food cost target, it suggests <strong>the sale price</strong> that brings it back («To keep 35 %: €12.50 → €13.40») with an <strong>Apply</strong> button. It never changes by itself: it asks for confirmation and, if you accept, also changes the price in the menus where the dish appears. The food cost target is set in Financial Management (35 % by default).</li>
</ul>

<h4>Good to know</h4>
<ul>
<li><strong>Who can use it.</strong> The Master List (like Suppliers and Costing) only appears for the <strong>owner</strong> and for <strong>employees with edit permission</strong>. An employee without that permission does not even see it in their folder: it is cost data.</li>
<li><strong>Everything is saved and synced</strong> between your devices; a product deleted on one disappears on the others.</li>
<li>The <strong>Quantity per purchase</strong> is also the «pack» Orders uses when it suggests how much to order: it rounds up to whole packs.</li>
<li>If you rename a supplier in Suppliers, its products are updated automatically.</li>
</ul>

<h4>If something is not working</h4>
<ul>
<li><strong>A dish shows a cost of 0 or a silly figure.</strong> Check the product in the Master List: usually the price is missing, or the <em>Quantity per purchase</em> is in another unit (5 in «kg» instead of 5000 in «g»).</li>
<li><strong>A dish looks far too expensive.</strong> Almost always a mixed-up unit: the product is in kg and in the recipe you typed 200 thinking of grams.</li>
<li><strong>It will not let me create the product.</strong> You still need to add a supplier, or your session has no edit permission.</li>
<li><strong>When I edit a catalogue product the supplier is already filled in.</strong> It is the first one on your list: catalogue products come with no supplier. Check it before saving and choose the right one.</li>
<li><strong>I cannot find a folder.</strong> It is being filtered: clear the search box, the supplier filter or the «To review» button that is active.</li>
</ul>`}
  },
  {id:'proveedores', area:'cocina',
    title:{es:`<i class="ti ti-building-factory-2"></i> Proveedores`, ca:`<i class="ti ti-building-factory-2"></i> Proveïdors`, en:`<i class="ti ti-building-factory-2"></i> Suppliers`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Proveedores es la <strong>agenda de las empresas a las que compras</strong>: el mayorista de carne, el de bebidas, el de limpieza. Guarda cómo contactarlos, cuándo reparten, cuánto cobran por el envío y cómo les pagas. Con esos datos, hacer un pedido es cuestión de unos toques en lugar de buscar el teléfono en una libreta.</p>
<p>Cocina y Sala tienen <strong>cada una su lista de proveedores</strong>: el de verduras vive en Cocina y el de vinos en Sala. Se abre desde la carpeta <strong>Cocina</strong> o <strong>Sala</strong>, y solo la ven el propietario y los empleados con permiso de edición.</p>

<h4>Cómo se relaciona con el resto</h4>
<ul>
<li><strong>Mega Lista.</strong> Cada producto tiene un proveedor. Es el vínculo que permite que Pedidos te proponga los productos de cada proveedor. Para crear un producto hace falta que exista al menos un proveedor.</li>
<li><strong>Pedidos.</strong> Aquí se usan su teléfono (WhatsApp), su correo, el día de reparto y el coste de envío. El historial de pedidos de cada proveedor se ve también desde su ficha.</li>
<li><strong>Stock y Escandallo</strong> no usan al proveedor: el Escandallo solo usa el precio del producto.</li>
</ul>

<h4>Cómo dar de alta un proveedor, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra en <strong>Cocina → Proveedores</strong> (o en Sala) y pulsa <strong>Nuevo Proveedor</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escribe el <strong>Nombre</strong> con el que lo reconoces («Makro», «Mariscos Hermanos López»). Es el que se enlaza con los productos y los pedidos; si ya hay otro igual, la app te pregunta antes de guardar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige el <strong>Tipo de proveedor</strong> (Lácteos, Carnes, Pescados y Marisco…). Salen de las mismas carpetas de la Mega Lista; si el tuyo no está, <strong>Otro tipo…</strong> te deja escribir uno nuevo. Sirve para filtrar la lista, no es obligatorio.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Rellena <strong>Persona de contacto</strong>, <strong>Forma de pago</strong> (Contado, Transferencia, Recibo domiciliado u Otro), <strong>Teléfono</strong> y <strong>Email</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Marca los <strong>Días de entrega habituales</strong> (los días de la semana en que reparte) y la <strong>Hora de entrega aprox.</strong>. Pedidos los usa para proponerte la fecha del pedido.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">En <strong>Coste de envío</strong> elige una de tres opciones: <strong>Sin coste de envío</strong>, <strong>Fijo, siempre</strong> (cobra siempre lo mismo) o <strong>Gratis a partir de un mínimo</strong> (rellena entonces <strong>Pedido mínimo para envío gratis</strong> e <strong>Importe del envío</strong>). El importe va <strong>sin IVA</strong>; elige el <strong>IVA del envío</strong> (21 % por defecto). El envío se suma al total del pedido con su IVA cuando corresponde y, al recibir el pedido, entra en <strong>Gastos Variables</strong> (categoría Otros) con ese IVA.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Añade la <strong>Dirección</strong>, el <strong>IBAN</strong> y las <strong>Notas</strong> (mínimos de pedido, descuentos por volumen, incidencias habituales…) y pulsa <strong>Guardar</strong>.</div></div>

<h4>Qué ves en la lista</h4>
<p>Cada proveedor es una <strong>tarjeta</strong> con su nombre y su tipo. A la derecha hay dos botones: la <strong><i class="ti ti-info-circle"></i> i</strong> («Ver ficha del proveedor») y el menú <strong>⋯</strong> con <strong>Editar</strong> y <strong>Eliminar</strong>. Arriba tienes el buscador (por nombre, contacto, dirección, teléfono o tipo) y, si has puesto tipos, unos botones para filtrar por tipo con el número de proveedores de cada uno; vuelve a pulsar el tipo para quitar el filtro.</p>

<h4>La ficha del proveedor</h4>
<p>Al pulsar la <strong>i</strong> se abre la ficha con <strong>solo los datos que has rellenado</strong>: tipo, persona de contacto, teléfono, email, entrega, envío, dirección, IBAN, forma de pago y notas. Si no hay ninguno, te lo dice y te invita a pulsar Editar.</p>
<ul>
<li>El <strong>teléfono</strong> es un enlace para llamar. Junto a él aparece <strong>WhatsApp</strong> solo si es un <strong>móvil</strong>: los fijos no tienen WhatsApp y la app no abre un chat que no llegaría a nadie. Lo mismo vale al enviar un pedido por WhatsApp desde Pedidos.</li>
<li>El <strong>email</strong> es un enlace que abre tu correo.</li>
<li><strong>Artículos de este proveedor (N)</strong> abre la lista de productos de la Mega Lista que le compras, con su unidad y precio.</li>
<li><strong>Historial de Pedidos (N)</strong> abre sus pedidos, de más nuevo a más viejo, con estado, artículos e importe con IVA; cada uno se despliega para ver sus líneas. <strong>Abrir en Pedidos</strong> te lleva a gestionarlos.</li>
<li>El botón <strong>Editar</strong> de abajo lo ve solo quien puede editar.</li>
</ul>

<h4>Cambiar el nombre, eliminar y cambiar de proveedor</h4>
<ul>
<li><strong>Renombrar</strong> un proveedor es seguro: la app actualiza sus productos y sus pedidos para que sigan siendo suyos.</li>
<li><strong>Eliminar</strong> no se puede mientras tenga productos vinculados: la app te dice cuántos y te pide que antes los pases a otro proveedor (desde la Mega Lista). Si no tiene ninguno, te pide confirmar.</li>
<li><strong>Cambiar de proveedor un producto</strong>: edítalo en la Mega Lista y elige el nuevo. Los escandallos no se tocan, porque solo dependen del precio.</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
<li>Quien no tiene permiso de edición no ve esta pantalla. El propietario y los empleados con permiso de edición pueden crear, editar y eliminar.</li>
<li>Todo se guarda y se sincroniza entre tus dispositivos.</li>
<li>Cuantos más productos tengas vinculados a su proveedor, más útil será Pedidos: el botón <strong>Sugerir por déficit de stock</strong> reparte lo que falta entre tus proveedores.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Pon el <strong>móvil</strong> del repartidor o del comercial, no el fijo de la oficina: así podrás mandarle el pedido por WhatsApp con un toque.</div>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>«No se puede eliminar: tiene N ingrediente(s) vinculado(s)».</strong> Cambia esos productos a otro proveedor en la Mega Lista y vuelve a probar.</li>
<li><strong>El botón de WhatsApp no aparece o avisa de que es un fijo.</strong> El teléfono guardado no es un móvil (en España, empieza por 6 o 7). Edita el proveedor y pon un móvil.</li>
<li><strong>En Pedidos el botón de enviar está desactivado.</strong> Al proveedor le falta el teléfono (móvil) o el email.</li>
<li><strong>Un proveedor aparece repetido.</strong> La app avisa cuando guardas uno con el mismo nombre; si ya lo tienes duplicado, pasa sus productos a uno y elimina el otro.</li>
<li><strong>No veo Proveedores en mi carpeta.</strong> Tu sesión no tiene permiso de edición: pídeselo al propietario.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Proveïdors és l'<strong>agenda de les empreses a les quals compres</strong>: el majorista de carn, el de begudes, el de neteja. Hi desa com contactar-los, quan reparteixen, quant cobren per l'enviament i com els pagues. Amb aquestes dades, fer una comanda és qüestió d'uns quants tocs en lloc de buscar el telèfon en una llibreta.</p>
<p>Cuina i Sala tenen <strong>cadascuna la seva llista de proveïdors</strong>: el de verdures viu a Cuina i el de vins a Sala. S'obre des de la carpeta <strong>Cuina</strong> o <strong>Sala</strong>, i només la veuen el propietari i els empleats amb permís d'edició.</p>

<h4>Com es relaciona amb la resta</h4>
<ul>
<li><strong>Mega Llista.</strong> Cada producte té un proveïdor. És el vincle que permet que Comandes et proposi els productes de cada proveïdor. Per crear un producte cal que existeixi almenys un proveïdor.</li>
<li><strong>Comandes.</strong> Aquí es fan servir el seu telèfon (WhatsApp), el seu correu, el dia de repartiment i el cost d'enviament. L'historial de comandes de cada proveïdor també es veu des de la seva fitxa.</li>
<li><strong>Estoc i Escandall</strong> no fan servir el proveïdor: l'Escandall només fa servir el preu del producte.</li>
</ul>

<h4>Com donar d'alta un proveïdor, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra a <strong>Cuina → Proveïdors</strong> (o a Sala) i prem <strong>Nou Proveïdor</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escriu el <strong>Nom</strong> amb què el reconeixes («Makro», «Mariscos Hermanos López»). És el que s'enllaça amb els productes i les comandes; si ja n'hi ha un d'igual, l'app et pregunta abans de desar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria el <strong>Tipus de proveïdor</strong> (Làctics, Carns, Peixos i Marisc…). Surten de les mateixes carpetes de la Mega Llista; si el teu no hi és, <strong>Un altre tipus…</strong> et deixa escriure'n un de nou. Serveix per filtrar la llista, no és obligatori.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Omple <strong>Persona de contacte</strong>, <strong>Forma de pagament</strong> (Al comptat, Transferència, Rebut domiciliat o Altre), <strong>Telèfon</strong> i <strong>Email</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Marca els <strong>Dies d'entrega habituals</strong> (els dies de la setmana que reparteix) i l'<strong>Hora d'entrega aprox.</strong>. Comandes els fa servir per proposar-te la data de la comanda.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">A <strong>Cost d'enviament</strong> tria una de tres opcions: <strong>Sense cost d'enviament</strong>, <strong>Fix, sempre</strong> (cobra sempre el mateix) o <strong>Gratis a partir d'un mínim</strong> (omple llavors <strong>Comanda mínima per a enviament gratis</strong> i <strong>Import de l'enviament</strong>). L'import va <strong>sense IVA</strong>; tria l'<strong>IVA de l'enviament</strong> (21 % per defecte). L'enviament se suma al total de la comanda amb el seu IVA quan toca i, en rebre la comanda, entra a <strong>Despeses Variables</strong> (categoria Altres) amb aquest IVA.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Afegeix l'<strong>Adreça</strong>, l'<strong>IBAN</strong> i les <strong>Notes</strong> (mínims de comanda, descomptes per volum, incidències habituals…) i prem <strong>Desar</strong>.</div></div>

<h4>El que veus a la llista</h4>
<p>Cada proveïdor és una <strong>targeta</strong> amb el seu nom i el seu tipus. A la dreta hi ha dos botons: la <strong><i class="ti ti-info-circle"></i> i</strong> («Veure la fitxa del proveïdor») i el menú <strong>⋯</strong> amb <strong>Editar</strong> i <strong>Eliminar</strong>. A dalt tens el cercador (per nom, contacte, adreça, telèfon o tipus) i, si has posat tipus, uns botons per filtrar per tipus amb el nombre de proveïdors de cadascun; torna a prémer el tipus per treure el filtre.</p>

<h4>La fitxa del proveïdor</h4>
<p>En prémer la <strong>i</strong> s'obre la fitxa amb <strong>només les dades que has omplert</strong>: tipus, persona de contacte, telèfon, email, entrega, enviament, adreça, IBAN, forma de pagament i notes. Si no n'hi ha cap, t'ho diu i t'invita a prémer Editar.</p>
<ul>
<li>El <strong>telèfon</strong> és un enllaç per trucar. Al costat apareix <strong>WhatsApp</strong> només si és un <strong>mòbil</strong>: els fixos no tenen WhatsApp i l'app no obre un xat que no arribaria a ningú. El mateix val en enviar una comanda per WhatsApp des de Comandes.</li>
<li>L'<strong>email</strong> és un enllaç que obre el teu correu.</li>
<li><strong>Articles d'aquest proveïdor (N)</strong> obre la llista de productes de la Mega Llista que li compres, amb la seva unitat i preu.</li>
<li><strong>Historial de Comandes (N)</strong> obre les seves comandes, de més noves a més velles, amb estat, articles i import amb IVA; cadascuna es desplega per veure'n les línies. <strong>Obrir a Comandes</strong> et porta a gestionar-les.</li>
<li>El botó <strong>Editar</strong> de baix només el veu qui pot editar.</li>
</ul>

<h4>Canviar el nom, eliminar i canviar de proveïdor</h4>
<ul>
<li><strong>Reanomenar</strong> un proveïdor és segur: l'app actualitza els seus productes i les seves comandes perquè continuïn sent seus.</li>
<li><strong>Eliminar</strong> no es pot mentre tingui productes vinculats: l'app et diu quants i et demana que abans els passis a un altre proveïdor (des de la Mega Llista). Si no en té cap, et demana confirmar.</li>
<li><strong>Canviar de proveïdor un producte</strong>: edita'l a la Mega Llista i tria el nou. Els escandalls no es toquen, perquè només depenen del preu.</li>
</ul>

<h4>El que convé saber</h4>
<ul>
<li>Qui no té permís d'edició no veu aquesta pantalla. El propietari i els empleats amb permís d'edició poden crear, editar i eliminar.</li>
<li>Tot es desa i se sincronitza entre els teus dispositius.</li>
<li>Com més productes tinguis vinculats al seu proveïdor, més útil serà Comandes: el botó <strong>Suggerir per dèficit d'estoc</strong> reparteix el que falta entre els teus proveïdors.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Posa el <strong>mòbil</strong> del repartidor o del comercial, no el fix de l'oficina: així li podràs enviar la comanda per WhatsApp amb un toc.</div>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>«No es pot eliminar: té N ingredient(s) vinculat(s)».</strong> Canvia aquests productes a un altre proveïdor a la Mega Llista i torna-ho a provar.</li>
<li><strong>El botó de WhatsApp no apareix o avisa que és un fix.</strong> El telèfon desat no és un mòbil (a Espanya, comença per 6 o 7). Edita el proveïdor i posa-hi un mòbil.</li>
<li><strong>A Comandes el botó d'enviar està desactivat.</strong> Al proveïdor li falta el telèfon (mòbil) o l'email.</li>
<li><strong>Un proveïdor apareix repetit.</strong> L'app avisa quan en deses un amb el mateix nom; si ja el tens duplicat, passa els seus productes a un i elimina l'altre.</li>
<li><strong>No veig Proveïdors a la meva carpeta.</strong> La teva sessió no té permís d'edició: demana-l'hi al propietari.</li>
</ul>`,
    en:`<h3>What it is and what it is for</h3>
<p>Suppliers is the <strong>address book of the companies you buy from</strong>: the meat wholesaler, the drinks distributor, the cleaning supplier. It keeps how to reach them, when they deliver, how much they charge for shipping and how you pay them. With that data, placing an order takes a few taps instead of hunting for a phone number in a notebook.</p>
<p>Kitchen and Dining Room each have <strong>their own supplier list</strong>: the vegetable supplier lives in Kitchen and the wine supplier in the Dining Room. Open it from the <strong>Kitchen</strong> or <strong>Dining Room</strong> folder; only the owner and employees with edit permission can see it.</p>

<h4>How it connects to the rest</h4>
<ul>
<li><strong>Master List.</strong> Every product has a supplier. That link is what lets Orders suggest each supplier's products. To create a product there must be at least one supplier.</li>
<li><strong>Orders.</strong> It uses their phone (WhatsApp), email, delivery day and shipping cost. Each supplier's order history is also available from their details.</li>
<li><strong>Stock and Costing</strong> do not use the supplier: Costing only uses the product price.</li>
</ul>

<h4>How to add a supplier, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>Kitchen → Suppliers</strong> (or Dining Room) and press <strong>New Supplier</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Type the <strong>Name</strong> you know them by («Makro», «Lopez Brothers Seafood»). It is what links them to products and orders; if there is already one with the same name, the app asks before saving.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Choose the <strong>Supplier type</strong> (Dairy, Meat, Fish and Seafood…). The options come from the same folders as the Master List; if yours is not there, <strong>Another type…</strong> lets you type a new one. It is used to filter the list and is optional.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Fill in <strong>Contact person</strong>, <strong>Payment method</strong> (Cash, Bank transfer, Direct debit or Other), <strong>Phone</strong> and <strong>Email</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Tick the <strong>Usual delivery days</strong> (the weekdays they deliver) and the <strong>Approx. delivery time</strong>. Orders uses them to suggest the date of the order.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Under <strong>Shipping cost</strong> pick one of three options: <strong>No shipping cost</strong>, <strong>Fixed, always</strong> (they always charge the same) or <strong>Free above a minimum</strong> (then fill in <strong>Minimum order for free shipping</strong> and <strong>Shipping fee</strong>). The amount is <strong>excluding VAT</strong>; choose the <strong>Shipping VAT</strong> (21% by default). Shipping is added to the order total with its VAT when it applies and, when the order is received, it goes into <strong>Variable Expenses</strong> (Other category) with that VAT.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Add the <strong>Address</strong>, <strong>IBAN</strong> and <strong>Notes</strong> (order minimums, volume discounts, recurring issues…) and press <strong>Save</strong>.</div></div>

<h4>What you see in the list</h4>
<p>Each supplier is a <strong>card</strong> with its name and type. On the right there are two buttons: the <strong><i class="ti ti-info-circle"></i> i</strong> («View supplier details») and the <strong>⋯</strong> menu with <strong>Edit</strong> and <strong>Delete</strong>. At the top you have the search box (by name, contact, address, phone or type) and, if you have set types, buttons to filter by type with the number of suppliers in each; press the type again to remove the filter.</p>

<h4>The supplier's details</h4>
<p>Pressing the <strong>i</strong> opens the details showing <strong>only the data you filled in</strong>: type, contact person, phone, email, delivery, shipping, address, IBAN, payment method and notes. If there is none, it says so and invites you to press Edit.</p>
<ul>
<li>The <strong>phone</strong> is a link to call. Next to it, <strong>WhatsApp</strong> appears only if it is a <strong>mobile</strong>: landlines have no WhatsApp and the app will not open a chat that would reach nobody. The same applies when sending an order by WhatsApp from Orders.</li>
<li>The <strong>email</strong> is a link that opens your mail app.</li>
<li><strong>Items from this supplier (N)</strong> opens the list of Master List products you buy from them, with unit and price.</li>
<li><strong>Order History (N)</strong> opens their orders, newest first, with status, items and amount including VAT; each one unfolds to show its lines. <strong>Open in Orders</strong> takes you to manage them.</li>
<li>The <strong>Edit</strong> button at the bottom is only visible to people who can edit.</li>
</ul>

<h4>Renaming, deleting and switching supplier</h4>
<ul>
<li><strong>Renaming</strong> a supplier is safe: the app updates its products and orders so they stay theirs.</li>
<li><strong>Deleting</strong> is not possible while it has linked products: the app tells you how many and asks you to move them to another supplier first (from the Master List). If it has none, it asks you to confirm.</li>
<li><strong>Switching a product's supplier</strong>: edit it in the Master List and choose the new one. Costing sheets are untouched, because they only depend on the price.</li>
</ul>

<h4>Good to know</h4>
<ul>
<li>Anyone without edit permission does not see this screen. The owner and employees with edit permission can create, edit and delete.</li>
<li>Everything is saved and synced between your devices.</li>
<li>The more products you link to their supplier, the more useful Orders becomes: the <strong>Suggest by stock deficit</strong> button spreads what is missing across your suppliers.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Enter the <strong>mobile</strong> number of the delivery driver or sales rep, not the office landline: that way you can send the order by WhatsApp with one tap.</div>

<h4>If something is not working</h4>
<ul>
<li><strong>«Cannot delete: it has N linked ingredient(s)».</strong> Change those products to another supplier in the Master List and try again.</li>
<li><strong>The WhatsApp button does not appear or warns that it is a landline.</strong> The saved phone is not a mobile (in Spain, mobiles start with 6 or 7). Edit the supplier and enter a mobile number.</li>
<li><strong>In Orders the send button is disabled.</strong> The supplier is missing a (mobile) phone or an email.</li>
<li><strong>A supplier appears twice.</strong> The app warns you when you save one with the same name; if you already have a duplicate, move its products to one and delete the other.</li>
<li><strong>I do not see Suppliers in my folder.</strong> Your session has no edit permission: ask the owner for it.</li>
</ul>`}
  },
  {id:'escandallo', area:'cocina',
    title:{es:`<i class="ti ti-calculator"></i> Escandallo`, ca:`<i class="ti ti-calculator"></i> Escandall`, en:`<i class="ti ti-calculator"></i> Costing`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>El Escandallo es la <strong>hoja de coste de cada plato o bebida</strong>: qué ingredientes lleva, cuánto de cada uno y cuánto cuesta, con los precios de tu Mega Lista. Comparándolo con el precio de venta sabes si ese plato te deja margen o te lo quita. Es la forma de poner precios a la carta con números y no «a ojo».</p>
<p>Crear, ver y editar un plato es <strong>la misma pantalla</strong>: una hoja con todo a la vista. Cocina y Sala tienen cada una su Escandallo; en Sala se habla de <strong>bebidas, copas y «coste de bebida»</strong> en lugar de platos y food cost, pero el cálculo es idéntico. Solo lo ven el propietario y los empleados con permiso de edición.</p>

<h4>Cómo encaja con el resto</h4>
<ul>
<li><strong>Viene de la Mega Lista:</strong> los ingredientes que eliges y sus precios. Si el producto no existe, créalo allí primero.</li>
<li><strong>Alimenta a la Ficha técnica:</strong> al guardar un plato por primera vez, la app le crea su ficha automáticamente (ingredientes, cantidades y alérgenos salen de aquí).</li>
<li><strong>Alimenta a la Oferta:</strong> al montar una carta o un menú, <strong>Escandallo</strong> (botón «Importar del Escandallo») trae el nombre y el precio de venta del plato.</li>
<li><strong>Alimenta al Stock y al TPV:</strong> cada plato cobrado descuenta del Stock las cantidades de esta hoja, con su merma.</li>
</ul>

<h4>Cómo crear un plato, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">En <strong>Escandallo</strong> pulsa <strong>Nuevo Plato</strong> (en Sala, <strong>Nueva Bebida</strong>). Para una base que se usa dentro de otros platos (un caldo, una salsa, un almíbar) ve antes a la pestaña <strong>Elaboraciones</strong> y pulsa <strong>Nueva Elaboración</strong> (en Sala: pestaña <strong>Preparaciones</strong>, <strong>Nueva Preparación</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escribe el <strong>nombre</strong> (el mismo que verás en la Oferta) y elige la <strong>Categoría</strong>, que es la carpeta donde se guarda. <strong>+ Nueva categoría...</strong> crea una.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En <strong>Ingredientes</strong>, escribe en el buscador («Buscar ingrediente...»), elige el producto, pon la <strong>Cantidad</strong> y pulsa <strong>Añadir</strong>. Salen primero tus elaboraciones y después los ingredientes de la Mega Lista. Si añades uno que ya estaba, se suman las cantidades.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En cada línea ajusta la <strong>Cantidad neta</strong> (lo que queda en el plato servido, en la unidad que ves junto al número) y la <strong>Merma %</strong> (lo que se pierde al limpiar, pelar o cocinar). Cada línea muestra su <strong>Coste</strong> y su <strong>% del total</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">En <strong>Precio de venta</strong> pon el <strong>Precio base (sin IVA)</strong> y elige el <strong>Tipo de IVA (repercutido)</strong>. La app te enseña el <strong>Precio final (IVA incluido)</strong>, que es el que verá el cliente. <strong>Suplemento delivery</strong> (solo si tu negocio hace reparto) es un importe fijo con IVA que se suma en pedidos a domicilio propios.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Mira el bloque <strong>Números</strong>, que se recalcula mientras escribes: <strong>Coste total</strong>, <strong>PVP</strong>, <strong>Margen</strong> y <strong>Food Cost</strong> (en Sala, <strong>Coste de bebida</strong>).</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Pulsa <strong>Guardar</strong>. Te quedas en la hoja. Para volver a la lista usa <strong>Volver</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Siempre para UNA ración</strong> (una copa o bebida en Sala). Cada venta descuenta del Stock exactamente estas cantidades; si las pones pensando en varias raciones, cada cobro restará de más y el coste saldrá mal. Para elaborar para varias personas usa la Ficha técnica, que escala las cantidades.</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>La cantidad va en la unidad del producto</strong> (la que ves al lado, «kg», «ml», «ud»). Si en la Mega Lista el producto está en kg, 0,2 son 200 gramos. Revisa esta unidad si un coste sale disparatado.</div>

<h4>La merma, con un ejemplo</h4>
<p>La cantidad que escribes es la <strong>neta</strong> (la que llega al plato). La app calcula cuánto hay que comprar: <strong>bruto = neto ÷ (1 − merma)</strong>, y el coste se calcula sobre el bruto.</p>
<p>Ejemplo: el plato lleva 100 g netos de merluza limpia y pierdes un 20 % al limpiarla. Hay que comprar 100 ÷ 0,80 = <strong>125 g</strong>, y el coste es el de 125 g, porque esos 25 g también los pagaste. Esa misma cuenta (125 g) es la que se descuenta del Stock al vender.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Una merma a 0 % en un producto con desperdicio (pescado entero, alcachofas, carne con hueso) da un food cost más bajo del real. Con el 30 % o el 40 %, la diferencia es grande.</div>

<h4>Consumibles</h4>
<p>En el bloque Números, <strong>Consumibles %</strong> suma un porcentaje al coste de los ingredientes para lo que no mides línea a línea: aceite para saltear, sal, especias, gas, papel de horno. Viene a <strong>5 %</strong>; ajústalo si tu plato lo pide.</p>

<h4>Food cost y colores</h4>
<p>El <strong>food cost</strong> es el coste del plato dividido entre el precio <strong>sin IVA</strong>, que es lo que de verdad ingresas. Se colorea:</p>
<table>
<thead><tr><th>Color</th><th>Food cost</th><th>Qué hacer</th></tr></thead>
<tbody>
<tr><td>Verde</td><td>hasta el 28 %</td><td>Margen sano</td></tr>
<tr><td>Ámbar</td><td>del 28 % al 35 %</td><td>Vigílalo</td></tr>
<tr><td>Rojo</td><td>más del 35 %</td><td>Revisa precio, ración o proveedor</td></tr>
</tbody></table>
<p>Si un plato está en rojo: sube el precio, ajusta la ración, busca otro proveedor o formato para lo que más pesa, revisa la merma real, o valora si debe seguir en la carta. Tu <strong>objetivo de food cost</strong> (por defecto 35 %) se fija en Gestión Económica y es el que usa la app para proponerte precios cuando un proveedor sube.</p>

<h4>La lista de platos</h4>
<ul>
<li>Pestañas <strong>Platos</strong> (en Sala, <strong>Bebidas</strong>) y <strong>Elaboraciones</strong> (<strong>Preparaciones</strong>). Entras por carpetas; con el buscador o el filtro de categoría ves los resultados agrupados.</li>
<li>Cada <strong>tarjeta</strong> muestra el nombre, el food cost en su color (o «Sin PVP»), avisos («sin ingredientes», «sin IVA», «referencia circular») y las cifras de coste total y PVP. Tócala para abrir su hoja.</li>
<li>El menú <strong>⋯</strong> de la tarjeta tiene <strong>Editar</strong>, <strong>Duplicar</strong> (sirve de base para una variante: «Ensalada César» → «con pollo») y <strong>Eliminar</strong>.</li>
<li>Las carpetas se renombran y borran desde su ⋯ (nunca se borra un plato: la app pregunta a qué carpeta se mueven) y su icono se cambia tocándolo.</li>
</ul>

<h4>Elaboraciones base</h4>
<p>Una <strong>elaboración</strong> (caldo, sofrito, masa; en Sala, jarabe o infusión) se calcula igual, pero en vez de precio de venta lleva su <strong>Rendimiento</strong> (cuánto produce la receta, p. ej. 5 L) y su <strong>Unidad</strong> (L, ml, kg, g, ud). La app te da el coste por unidad. Después la añades como un ingrediente más en otros platos, y su coste se encadena solo. Aparece también en <strong>Stock → Elaboraciones</strong>.</p>
<p>Si dos elaboraciones se usan la una a la otra, la hoja avisa de <strong>Referencia circular</strong> y ese tramo cuenta 0 €: rompe el ciclo.</p>

<h4>Alérgenos y «Dónde se usa»</h4>
<p>Debajo de los precios, la hoja lista los <strong>alérgenos</strong> que traen los ingredientes (se detectan solos) y, en un plato ya guardado, <strong>Dónde se usa</strong>: las cartas donde está puesto o los platos que usan esa elaboración.</p>

<h4>Guardar, descartar y duplicar</h4>
<ul>
<li>Un punto <strong>Cambios sin guardar</strong> aparece arriba mientras haya algo sin guardar. Si sales de la hoja (otro menú, otra pestaña, Volver), la app pregunta: <strong>Seguir editando</strong>, <strong>Descartar</strong> o <strong>Guardar y salir</strong>.</li>
<li>Para guardar hace falta un nombre y haber elegido el <strong>IVA</strong> del plato. Si ya hay uno con el mismo nombre, te pregunta.</li>
<li>Al <strong>eliminar</strong> un plato puesto en cartas o usado por otras elaboraciones, la app lo avisa («Plato en uso»); si insistes, desaparece de ellas. Su ficha técnica se va con él. Queda 30 días en la Papelera (Mi Negocio → Mantenimiento de datos).</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
<li>Cuando cambia un precio en la Mega Lista, <strong>todos los platos se recalculan al instante</strong>. Revisa el Escandallo tras una subida de proveedores.</li>
<li>El precio de un plato en la Oferta es una copia al importarlo; si cambias el PVP aquí, ajústalo también allí (salvo si usas «Aplicar» desde Cambios de precio, que lo actualiza en las cartas).</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>No me deja guardar.</strong> Falta el nombre o el tipo de IVA.</li>
<li><strong>No encuentro un ingrediente al añadirlo.</strong> Aún no está en la Mega Lista (de esa misma carpeta, Cocina o Sala).</li>
<li><strong>El coste sale 0 o enorme.</strong> Mira el precio y la unidad del producto en la Mega Lista.</li>
<li><strong>No veo Escandallo en mi carpeta.</strong> Tu sesión no tiene permiso de edición.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>L'Escandall és el <strong>full de cost de cada plat o beguda</strong>: quins ingredients porta, quant de cadascun i quant costa, amb els preus de la teva Mega Llista. Comparant-lo amb el preu de venda saps si aquest plat et deixa marge o te'l treu. És la manera de posar preus a la carta amb números i no «a ull».</p>
<p>Crear, veure i editar un plat és <strong>la mateixa pantalla</strong>: un full amb tot a la vista. Cuina i Sala tenen cadascuna el seu Escandall; a Sala es parla de <strong>begudes, copes i «cost de beguda»</strong> en lloc de plats i food cost, però el càlcul és idèntic. Només el veuen el propietari i els empleats amb permís d'edició.</p>

<h4>Com encaixa amb la resta</h4>
<ul>
<li><strong>Ve de la Mega Llista:</strong> els ingredients que tries i els seus preus. Si el producte no existeix, crea'l primer allà.</li>
<li><strong>Alimenta la Fitxa tècnica:</strong> en desar un plat per primera vegada, l'app li crea la fitxa automàticament (ingredients, quantitats i al·lèrgens surten d'aquí).</li>
<li><strong>Alimenta l'Oferta:</strong> en muntar una carta o un menú, el botó <strong>Escandall</strong> («Importar de l'Escandall») porta el nom i el preu de venda del plat.</li>
<li><strong>Alimenta l'Estoc i el TPV:</strong> cada plat cobrat descompta de l'Estoc les quantitats d'aquest full, amb la seva minva.</li>
</ul>

<h4>Com crear un plat, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">A <strong>Escandall</strong> prem <strong>Nou Plat</strong> (a Sala, <strong>Nova Beguda</strong>). Per a una base que es fa servir dins d'altres plats (un brou, una salsa, un almívar) ves abans a la pestanya <strong>Elaboracions</strong> i prem <strong>Nova Elaboració</strong> (a Sala: pestanya <strong>Preparacions</strong>, <strong>Nova Preparació</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escriu el <strong>nom</strong> (el mateix que veuràs a l'Oferta) i tria la <strong>Categoria</strong>, que és la carpeta on es desa. <strong>+ Nova categoria...</strong> en crea una.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A <strong>Ingredients</strong>, escriu al cercador («Cercar ingredient...»), tria el producte, posa la <strong>Quantitat</strong> i prem <strong>Afegir</strong>. Surten primer les teves elaboracions i després els ingredients de la Mega Llista. Si n'afegeixes un que ja hi era, se sumen les quantitats.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A cada línia ajusta la <strong>Quantitat neta</strong> (el que queda al plat servit, en la unitat que veus al costat del número) i la <strong>Merma %</strong> (el que es perd en netejar, pelar o cuinar). Cada línia mostra el seu <strong>Cost</strong> i el seu <strong>% del total</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">A <strong>Preu de venda</strong> posa el <strong>Preu base (sense IVA)</strong> i tria el <strong>Tipus d'IVA (repercutit)</strong>. L'app t'ensenya el <strong>Preu final (IVA inclòs)</strong>, que és el que veurà el client. <strong>Suplement delivery</strong> (només si el teu negoci fa repartiment) és un import fix amb IVA que se suma en comandes a domicili pròpies.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Mira el bloc <strong>Números</strong>, que es recalcula mentre escrius: <strong>Cost total</strong>, <strong>PVP</strong>, <strong>Marge</strong> i <strong>Food Cost</strong> (a Sala, <strong>Cost de beguda</strong>).</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Prem <strong>Desar</strong>. Et quedes al full. Per tornar a la llista fes servir <strong>Tornar</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Sempre per a UNA ració</strong> (una copa o beguda a Sala). Cada venda descompta de l'Estoc exactament aquestes quantitats; si les poses pensant en diverses racions, cada cobrament restarà de més i el cost sortirà malament. Per elaborar per a diverses persones fes servir la Fitxa tècnica, que escala les quantitats.</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>La quantitat va en la unitat del producte</strong> (la que veus al costat, «kg», «ml», «ud»). Si a la Mega Llista el producte és en kg, 0,2 són 200 grams. Revisa aquesta unitat si un cost surt disparatat.</div>

<h4>La merma, amb un exemple</h4>
<p>La quantitat que escrius és la <strong>neta</strong> (la que arriba al plat). L'app calcula quant cal comprar: <strong>brut = net ÷ (1 − merma)</strong>, i el cost es calcula sobre el brut.</p>
<p>Exemple: el plat porta 100 g nets de lluç net i perds un 20 % en netejar-lo. Cal comprar 100 ÷ 0,80 = <strong>125 g</strong>, i el cost és el de 125 g, perquè aquells 25 g també els vas pagar. Aquest mateix compte (125 g) és el que es descompta de l'Estoc en vendre.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Una merma a 0 % en un producte amb desaprofitament (peix sencer, carxofes, carn amb os) dóna un food cost més baix del real. Amb el 30 % o el 40 %, la diferència és gran.</div>

<h4>Consumibles</h4>
<p>Al bloc Números, <strong>Consumibles %</strong> suma un percentatge al cost dels ingredients per al que no mesures línia a línia: oli per saltar, sal, espècies, gas, paper de forn. Ve al <strong>5 %</strong>; ajusta'l si el teu plat ho demana.</p>

<h4>Food cost i colors</h4>
<p>El <strong>food cost</strong> és el cost del plat dividit pel preu <strong>sense IVA</strong>, que és el que realment ingresses. Es colora:</p>
<table>
<thead><tr><th>Color</th><th>Food cost</th><th>Què fer</th></tr></thead>
<tbody>
<tr><td>Verd</td><td>fins al 28 %</td><td>Marge sa</td></tr>
<tr><td>Ambre</td><td>del 28 % al 35 %</td><td>Vigila'l</td></tr>
<tr><td>Vermell</td><td>més del 35 %</td><td>Revisa preu, ració o proveïdor</td></tr>
</tbody></table>
<p>Si un plat és en vermell: puja el preu, ajusta la ració, busca un altre proveïdor o format per al que més pesa, revisa la merma real, o valora si ha de continuar a la carta. El teu <strong>objectiu de food cost</strong> (per defecte 35 %) es fixa a Gestió Econòmica i és el que fa servir l'app per proposar-te preus quan un proveïdor puja.</p>

<h4>La llista de plats</h4>
<ul>
<li>Pestanyes <strong>Plats</strong> (a Sala, <strong>Begudes</strong>) i <strong>Elaboracions</strong> (<strong>Preparacions</strong>). Hi entres per carpetes; amb el cercador o el filtre de categoria veus els resultats agrupats.</li>
<li>Cada <strong>targeta</strong> mostra el nom, el food cost en el seu color (o «Sense PVP»), avisos («sense ingredients», «sense IVA», «referència circular») i les xifres de cost total i PVP. Toca-la per obrir-ne el full.</li>
<li>El menú <strong>⋯</strong> de la targeta té <strong>Editar</strong>, <strong>Duplicar</strong> (serveix de base per a una variant: «Amanida César» → «amb pollastre») i <strong>Eliminar</strong>.</li>
<li>Les carpetes es reanomenen i s'esborren des del seu ⋯ (mai no s'esborra un plat: l'app pregunta a quina carpeta es mouen) i la seva icona es canvia tocant-la.</li>
</ul>

<h4>Elaboracions base</h4>
<p>Una <strong>elaboració</strong> (brou, sofregit, massa; a Sala, xarop o infusió) es calcula igual, però en lloc de preu de venda porta el seu <strong>Rendiment</strong> (quant produeix la recepta, p. ex. 5 L) i la seva <strong>Unitat</strong> (L, ml, kg, g, ud). L'app et dóna el cost per unitat. Després l'afegeixes com un ingredient més a altres plats, i el seu cost s'encadena sol. Apareix també a <strong>Estoc → Elaboracions</strong>.</p>
<p>Si dues elaboracions es fan servir l'una a l'altra, el full avisa de <strong>Referència circular</strong> i aquell tram compta 0 €: trenca el cicle.</p>

<h4>Al·lèrgens i «On s'usa»</h4>
<p>Sota els preus, el full llista els <strong>al·lèrgens</strong> que porten els ingredients (es detecten sols) i, en un plat ja desat, <strong>On s'usa</strong>: les cartes on és posat o els plats que fan servir aquella elaboració.</p>

<h4>Desar, descartar i duplicar</h4>
<ul>
<li>Un punt <strong>Canvis sense desar</strong> apareix a dalt mentre hi hagi alguna cosa sense desar. Si surts del full (un altre menú, una altra pestanya, Tornar), l'app pregunta: <strong>Seguir editant</strong>, <strong>Descartar</strong> o <strong>Desar i sortir</strong>.</li>
<li>Per desar cal un nom i haver triat l'<strong>IVA</strong> del plat. Si ja n'hi ha un amb el mateix nom, et pregunta.</li>
<li>En <strong>eliminar</strong> un plat posat a cartes o usat per altres elaboracions, l'app ho avisa («Plat en ús»); si insisteixes, desapareix d'elles. La seva fitxa tècnica se'n va amb ell. Queda 30 dies a la Paperera (El Meu Negoci → Manteniment de dades).</li>
</ul>

<h4>El que convé saber</h4>
<ul>
<li>Quan canvia un preu a la Mega Llista, <strong>tots els plats es recalculen a l'instant</strong>. Revisa l'Escandall després d'una pujada de proveïdors.</li>
<li>El preu d'un plat a l'Oferta és una còpia en importar-lo; si canvies el PVP aquí, ajusta'l també allà (tret que facis servir «Aplicar» des de Canvis de preu, que l'actualitza a les cartes).</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No em deixa desar.</strong> Falta el nom o el tipus d'IVA.</li>
<li><strong>No trobo un ingredient en afegir-lo.</strong> Encara no és a la Mega Llista (d'aquesta mateixa carpeta, Cuina o Sala).</li>
<li><strong>El cost surt 0 o enorme.</strong> Mira el preu i la unitat del producte a la Mega Llista.</li>
<li><strong>No veig Escandall a la meva carpeta.</strong> La teva sessió no té permís d'edició.</li>
</ul>`,
    en:`<h3>What it is and what it is for</h3>
<p>Costing is the <strong>cost sheet of each dish or drink</strong>: which ingredients it contains, how much of each and what it costs, using the prices in your Master List. Compared with the sale price, you know whether that dish earns you margin or takes it away. It is how you price a menu with numbers instead of by guesswork.</p>
<p>Creating, viewing and editing a dish is <strong>the same screen</strong>: one sheet with everything in view. Kitchen and Dining Room each have their own Costing; in the Dining Room it talks about <strong>drinks, glasses and «drink cost»</strong> instead of dishes and food cost, but the calculation is identical. Only the owner and employees with edit permission see it.</p>

<h4>How it fits with the rest</h4>
<ul>
<li><strong>It comes from the Master List:</strong> the ingredients you choose and their prices. If a product does not exist, create it there first.</li>
<li><strong>It feeds the Technical Sheet:</strong> when you save a dish for the first time the app creates its sheet automatically (ingredients, quantities and allergens come from here).</li>
<li><strong>It feeds the Menu:</strong> when building a menu, the <strong>Costing</strong> button («Import from Costing») brings in the dish name and sale price.</li>
<li><strong>It feeds Stock and the POS:</strong> every dish charged deducts the quantities on this sheet from Stock, waste included.</li>
</ul>

<h4>How to create a dish, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">In <strong>Costing</strong> press <strong>New Dish</strong> (in the Dining Room, <strong>New Drink</strong>). For a base used inside other dishes (a stock, a sauce, a syrup) first go to the <strong>Elaborations</strong> tab and press <strong>New Elaboration</strong> (in the Dining Room: <strong>Preparations</strong> tab, <strong>New Preparation</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Type the <strong>name</strong> (the same one you will see in the Menu) and choose the <strong>Category</strong>, which is the folder it is stored in. <strong>+ New category...</strong> creates one.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Under <strong>Ingredients</strong>, type in the search box («Search ingredient...»), pick the product, enter the <strong>Quantity</strong> and press <strong>Add</strong>. Your elaborations come first, then the Master List ingredients. If you add one that is already there, the quantities are added together.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">On each line adjust the <strong>Net quantity</strong> (what ends up on the served plate, in the unit next to the number) and the <strong>Waste %</strong> (what is lost when cleaning, peeling or cooking). Each line shows its <strong>Cost</strong> and its <strong>% of total</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Under <strong>Sale price</strong> enter the <strong>Base price (no VAT)</strong> and choose the <strong>VAT type (output)</strong>. The app shows the <strong>Final price (VAT included)</strong>, which is what the customer sees. <strong>Delivery supplement</strong> (only if your business delivers) is a fixed amount including VAT added on your own home-delivery orders.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Watch the <strong>Numbers</strong> block, which recalculates as you type: <strong>Total cost</strong>, <strong>Sale price</strong>, <strong>Margin</strong> and <strong>Food Cost</strong> (in the Dining Room, <strong>Drink cost</strong>).</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st">Press <strong>Save</strong>. You stay on the sheet. To go back to the list use <strong>Back</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>Always for ONE serving</strong> (one glass or drink in the Dining Room). Each sale deducts exactly these quantities from Stock; if you enter them thinking of several servings, every sale will deduct too much and the cost will be wrong. To prepare for several people use the Technical Sheet, which scales the quantities.</div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>The quantity is in the product's unit</strong> (the one you see next to it: «kg», «ml», «ud»). If the product is in kg in the Master List, 0.2 is 200 grams. Check this unit if a cost looks absurd.</div>

<h4>Waste, with an example</h4>
<p>The quantity you type is the <strong>net</strong> one (what reaches the plate). The app works out how much to buy: <strong>gross = net ÷ (1 − waste)</strong>, and the cost is calculated on the gross.</p>
<p>Example: the dish contains 100 g net of cleaned hake and you lose 20 % cleaning it. You must buy 100 ÷ 0.80 = <strong>125 g</strong>, and the cost is that of 125 g, because you paid for those 25 g too. That same figure (125 g) is what is deducted from Stock when you sell.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Waste at 0 % on a product with trimmings (whole fish, artichokes, bone-in meat) gives a food cost lower than the real one. At 30 % or 40 % the difference is big.</div>

<h4>Consumables</h4>
<p>In the Numbers block, <strong>Consumables %</strong> adds a percentage to the ingredient cost for what you do not measure line by line: frying oil, salt, spices, gas, baking paper. It starts at <strong>5 %</strong>; adjust it if your dish needs it.</p>

<h4>Food cost and colours</h4>
<p><strong>Food cost</strong> is the dish cost divided by the price <strong>excluding VAT</strong>, which is what you actually take in. It is coloured:</p>
<table>
<thead><tr><th>Colour</th><th>Food cost</th><th>What to do</th></tr></thead>
<tbody>
<tr><td>Green</td><td>up to 28 %</td><td>Healthy margin</td></tr>
<tr><td>Amber</td><td>28 % to 35 %</td><td>Keep an eye on it</td></tr>
<tr><td>Red</td><td>over 35 %</td><td>Review price, portion or supplier</td></tr>
</tbody></table>
<p>If a dish is red: raise the price, adjust the portion, find another supplier or pack for what weighs most, check the real waste, or consider taking it off the menu. Your <strong>food cost target</strong> (35 % by default) is set in Financial Management and is what the app uses to suggest prices when a supplier raises theirs.</p>

<h4>The list of dishes</h4>
<ul>
<li>Tabs <strong>Dishes</strong> (in the Dining Room, <strong>Drinks</strong>) and <strong>Elaborations</strong> (<strong>Preparations</strong>). You enter by folders; with the search box or category filter you see results grouped.</li>
<li>Each <strong>card</strong> shows the name, the food cost in its colour (or «No sale price»), warnings («no ingredients», «no VAT», «circular reference») and the total cost and sale price. Tap it to open its sheet.</li>
<li>The card's <strong>⋯</strong> menu has <strong>Edit</strong>, <strong>Duplicate</strong> (a starting point for a variant: «Caesar salad» → «with chicken») and <strong>Delete</strong>.</li>
<li>Folders are renamed and deleted from their ⋯ (a dish is never deleted: the app asks which folder to move them to) and their icon is changed by tapping it.</li>
</ul>

<h4>Base elaborations</h4>
<p>An <strong>elaboration</strong> (stock, sofrito, dough; in the Dining Room, syrup or infusion) is calculated the same way, but instead of a sale price it has a <strong>Yield</strong> (how much the recipe produces, e.g. 5 L) and a <strong>Unit</strong> (L, ml, kg, g, ud). The app gives you the cost per unit. Then you add it as one more ingredient in other dishes and its cost chains through automatically. It also appears in <strong>Stock → Elaborations</strong>.</p>
<p>If two elaborations use each other, the sheet warns of a <strong>Circular reference</strong> and that part counts as €0: break the loop.</p>

<h4>Allergens and «Where it is used»</h4>
<p>Below the prices the sheet lists the <strong>allergens</strong> the ingredients carry (detected automatically) and, on a saved dish, <strong>Where it is used</strong>: the menus where it appears or the dishes that use that elaboration.</p>

<h4>Saving, discarding and duplicating</h4>
<ul>
<li>An <strong>Unsaved changes</strong> dot appears at the top while anything is unsaved. If you leave the sheet (another menu, another tab, Back), the app asks: <strong>Keep editing</strong>, <strong>Discard</strong> or <strong>Save and leave</strong>.</li>
<li>To save you need a name and the dish's <strong>VAT</strong> chosen. If one with the same name exists, it asks.</li>
<li>When you <strong>delete</strong> a dish that is on menus or used by other elaborations, the app warns you («Dish in use»); if you insist, it disappears from them. Its technical sheet goes with it. It stays 30 days in the Recycle bin (My Business → Data maintenance).</li>
</ul>

<h4>Good to know</h4>
<ul>
<li>When a price changes in the Master List, <strong>every dish recalculates instantly</strong>. Review Costing after supplier price rises.</li>
<li>A dish's price in the Menu is a copy taken when imported; if you change the sale price here, adjust it there as well (unless you use «Apply» from Price changes, which updates it in the menus).</li>
</ul>

<h4>If something is not working</h4>
<ul>
<li><strong>It will not let me save.</strong> The name or the VAT type is missing.</li>
<li><strong>I cannot find an ingredient when adding it.</strong> It is not in the Master List yet (of that same folder, Kitchen or Dining Room).</li>
<li><strong>The cost is 0 or huge.</strong> Check the product's price and unit in the Master List.</li>
<li><strong>I do not see Costing in my folder.</strong> Your session has no edit permission.</li>
</ul>`}
  },
  {id:'fichas', area:'cocina',
    title:{es:`<i class="ti ti-file-description"></i> Fichas Técnicas`, ca:`<i class="ti ti-file-description"></i> Fitxes Tècniques`, en:`<i class="ti ti-file-description"></i> Technical Sheets`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Mientras el Escandallo mira el <strong>coste</strong> de un plato, la Ficha Técnica mira su <strong>elaboración</strong>: qué sacar, en qué cantidad, qué pasos seguir, cuánto tarda, cómo se emplata y qué alérgenos lleva. Es el documento que hace que el plato salga igual lo prepare quien lo prepare, y el que necesitas a mano para responder a un cliente con alergias o a una inspección.</p>
<p>La ficha es <strong>un documento para cocinar</strong>: ingredientes a la izquierda, paso a paso a la derecha. Es la misma pantalla para crearla, leerla y editarla. Cocina y Sala tienen cada una las suyas; en Sala son fichas de <strong>bebidas</strong>, con datos propios (copa, temperatura, cata…).</p>

<h4>Cómo encaja con el resto</h4>
<ul>
<li><strong>Mega Lista → Escandallo → Ficha.</strong> La ficha de un plato <strong>se crea sola</strong> la primera vez que guardas ese plato en el Escandallo. Sus ingredientes, cantidades y alérgenos <strong>salen del Escandallo</strong> y se mantienen al día: si cambias una cantidad allí, la ficha lo refleja.</li>
<li><strong>Ficha → equipo.</strong> Es lo que lee el cocinero (o camarero) en su puesto, y lo que se imprime para colgar en la partida.</li>
<li>La ficha <strong>no lleva precios</strong>: el dinero está en Escandallo, y lo que se vende, en la Oferta.</li>
</ul>

<h4>La lista de fichas</h4>
<ul>
<li>Pestañas <strong>Platos</strong> (en Sala, <strong>Bebidas</strong>) y <strong>Elaboraciones</strong> (<strong>Preparaciones</strong>). Entras por las mismas carpetas del Escandallo; el buscador («Buscar ficha técnica...») y el filtro de categoría muestran los resultados agrupados.</li>
<li>Cada <strong>tarjeta</strong> tiene el nombre, la etiqueta <strong>Vinculada</strong> (viene de un plato del Escandallo) o <strong>Sin ficha</strong>, y tres cifras: pasos, tiempo y alérgenos. Tócala para abrirla. Si un plato antiguo aún no tiene ficha, al tocarlo se abre una nueva ya rellena.</li>
<li>El menú <strong>⋯</strong> de la tarjeta ofrece <strong>Abrir</strong> e <strong>Imprimir</strong> a todos, y <strong>Duplicar</strong> y <strong>Eliminar</strong> a quien puede editar.</li>
<li><strong>Nueva ficha técnica</strong> crea una ficha <strong>suelta</strong> (sin vincular a ningún plato), útil para plantillas o preparaciones que no cuestan en el Escandallo. Aparecen aparte, bajo «Fichas sin vincular a un plato» (o «a una bebida»).</li>
</ul>

<h4>Cómo completar una ficha, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Abre la ficha del plato. Arriba verás el nombre, una línea que dice <strong>Plato del escandallo</strong> con un botón <strong>Ver escandallo</strong> (solo propietario y edición), y los datos: <strong>Raciones/Dosis</strong> (o Comensales), <strong>Producción</strong>, <strong>Tiempo de elaboración (min)</strong> y <strong>Temperatura de servicio</strong> (Caliente, Frío, Ambiente). En una ficha vinculada, el nombre y los comensales no se editan aquí: vienen del Escandallo.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Sube una <strong>foto de emplatado</strong> si quieres («Subir foto de emplatado», hasta 2 MB). Al tocarla se amplía. Las elaboraciones base no llevan foto ni emplatado, porque no se sirven tal cual.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Escribe el <strong>Modo de elaboración</strong>: pulsa <strong>Añadir paso</strong> y describe cada uno, en el orden real de trabajo. Los pasos se <strong>leen</strong> por defecto, para que no se cambie nada sin querer: pulsa el <strong>lápiz</strong> de un paso para editarlo y el <strong>tic</strong> para cerrarlo (un paso nuevo se abre solo). Cada paso admite dos extras: los <strong>minutos</strong> y un <strong>«Ojo»</strong> para el punto crítico («no pasar de 65 °C»). Con el menú ⋯ del paso lo subes, lo bajas o lo quitas.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Rellena <strong>Presentación / emplatado</strong> (en Sala, <strong>Cómo se sirve</strong>): recipiente, colocación, guarnición, temperatura.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Revisa los <strong>Alérgenos</strong> (abajo, en una cuadrícula). Los que traen los ingredientes salen marcados solos y no se pueden quitar; marca a mano los que añada la manipulación o un cambio de receta.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Pulsa <strong>Guardar</strong>. Te quedas en la ficha; <strong>Volver</strong> te lleva a la lista.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Sé concreto: «Sellar el solomillo 1 minuto por lado en plancha muy caliente» vale más que «cocinar la carne». Empieza por las fichas de los platos que más vendes.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>Descripción en carta</strong>: una frase (hasta 140 letras) de qué lleva o cómo es el plato. Es la que ve tu cliente bajo el plato en la web de pedidos y la que lee el camarero en el TPV al tocar el botón ⓘ del plato. Los platos que añades a mano en Oferta Gastronómica (sin receta) tienen su propio botón <strong>Descripción</strong>.</div>

<h4>La «Producción»: cuántas raciones vas a hacer</h4>
<p>Los ingredientes de la ficha se muestran <strong>para la producción que pongas</strong>, con el título «Ingredientes para N raciones». El Escandallo está siempre para una ración; si hoy vas a preparar 12, pon <strong>12</strong> en Producción y todas las cantidades se multiplican. En una <strong>elaboración base</strong>, las cantidades del Escandallo son las de una tanda entera (su rendimiento), así que producción 3 es el triple de tanda.</p>
<p>La producción se guarda sola al instante y <strong>no cuenta como un cambio sin guardar</strong>. Las cantidades son las <strong>netas</strong> (lo que lleva el plato); la merma está en el Escandallo.</p>

<h4>Fichas de bebida (Sala)</h4>
<p>En Sala, además de lo anterior, aparece el bloque <strong>Datos de la bebida</strong> con el <strong>Tipo de bebida</strong>: Vino, Espumoso, Cerveza, Destilado y licor, Coctelería, Café, Té e infusiones, Sin alcohol u Otra. Según el tipo se piden los datos que le tocan: de un vino, D.O., bodega, añada, uvas, crianza, decantación, cata y maridaje; de un café, método, tueste, gramaje, tiempo de extracción y temperaturas; de una cerveza, estilo y cómo tirarla. Todos comparten copa, ración servida y temperatura de servicio (menos las bebidas que no la usan, como el café). «Sin especificar» deja la ficha sin esos datos.</p>

<h4>Imprimir</h4>
<p>El botón <strong>Imprimir</strong> (en la ficha o desde el menú ⋯ de la tarjeta) genera una hoja a dos columnas: a la izquierda los ingredientes de la producción con una casilla para marcar la mise en place; a la derecha los pasos numerados con sus minutos y «Ojo»; debajo, el emplatado y los <strong>alérgenos bien visibles</strong>. Si hay cambios sin guardar, se guardan antes de imprimir. Imprímela, plastifícala y cuélgala en la partida o la barra.</p>

<h4>Quién puede qué</h4>
<ul>
<li><strong>Cualquier empleado</strong> de la zona puede abrir e imprimir las fichas. Sin permiso de edición se ven como un documento de lectura: sin campos para escribir, y solo con los alérgenos que aplican.</li>
<li>Crear, editar, duplicar y eliminar es del <strong>propietario</strong> y de los <strong>empleados con permiso de edición</strong>.</li>
<li>Si el propietario asigna un plato a un empleado en <strong>Distribución del Trabajo</strong>, ese empleado puede leer su receta desde su panel.</li>
</ul>

<h4>Editar, duplicar y eliminar</h4>
<ul>
<li>Al salir con cambios sin guardar, la app pregunta: <strong>Seguir editando</strong>, <strong>Descartar</strong> o <strong>Guardar y salir</strong>. Un punto «Cambios sin guardar» te avisa mientras tanto.</li>
<li><strong>Duplicar</strong> crea una ficha suelta (sin vincular) con copia en el nombre, para variantes.</li>
<li><strong>Eliminar</strong> pide confirmación. Si borras el plato en el Escandallo, su ficha se borra con él (y vuelve si lo restauras desde la Papelera de Mi Negocio).</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>Los ingredientes de la ficha no se pueden editar.</strong> Es normal en una ficha vinculada: se cambian en el Escandallo (botón <strong>Ver escandallo</strong>).</li>
<li><strong>Las cantidades no son las del Escandallo.</strong> Se multiplican por la Producción. Pon 1 para ver las de una ración.</li>
<li><strong>Un alérgeno no se deja desmarcar.</strong> Lo trae un ingrediente: quítalo o cámbialo en la Mega Lista o en el Escandallo.</li>
<li><strong>«Esa receta ya tiene una ficha técnica vinculada».</strong> Cada plato tiene una sola ficha: ábrela desde la lista.</li>
<li><strong>La foto no se sube.</strong> Debe ser una imagen de menos de 2 MB.</li>
<li><strong>No puedo escribir en la ficha.</strong> Tu sesión es de solo lectura: pide el permiso de edición al propietario.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Mentre l'Escandall mira el <strong>cost</strong> d'un plat, la Fitxa Tècnica mira la seva <strong>elaboració</strong>: què treure, en quina quantitat, quins passos seguir, quant triga, com s'emplata i quins al·lèrgens porta. És el document que fa que el plat surti igual l'elabori qui l'elabori, i el que necessites a mà per respondre a un client amb al·lèrgies o a una inspecció.</p>
<p>La fitxa és <strong>un document per cuinar</strong>: ingredients a l'esquerra, pas a pas a la dreta. És la mateixa pantalla per crear-la, llegir-la i editar-la. Cuina i Sala tenen cadascuna les seves; a Sala són fitxes de <strong>begudes</strong>, amb dades pròpies (copa, temperatura, tast…).</p>

<h4>Com encaixa amb la resta</h4>
<ul>
<li><strong>Mega Llista → Escandall → Fitxa.</strong> La fitxa d'un plat <strong>es crea sola</strong> la primera vegada que deses aquell plat a l'Escandall. Els seus ingredients, quantitats i al·lèrgens <strong>surten de l'Escandall</strong> i es mantenen al dia: si canvies una quantitat allà, la fitxa ho reflecteix.</li>
<li><strong>Fitxa → equip.</strong> És el que llegeix el cuiner (o cambrer) al seu lloc, i el que s'imprimeix per penjar a la partida.</li>
<li>La fitxa <strong>no porta preus</strong>: els diners són a l'Escandall, i el que es ven, a l'Oferta.</li>
</ul>

<h4>La llista de fitxes</h4>
<ul>
<li>Pestanyes <strong>Plats</strong> (a Sala, <strong>Begudes</strong>) i <strong>Elaboracions</strong> (<strong>Preparacions</strong>). Hi entres per les mateixes carpetes de l'Escandall; el cercador («Cercar fitxa tècnica...») i el filtre de categoria mostren els resultats agrupats.</li>
<li>Cada <strong>targeta</strong> té el nom, l'etiqueta <strong>Vinculada</strong> (ve d'un plat de l'Escandall) o <strong>Sense fitxa</strong>, i tres xifres: passos, temps i al·lèrgens. Toca-la per obrir-la. Si un plat antic encara no té fitxa, en tocar-lo s'obre una de nova ja omplerta.</li>
<li>El menú <strong>⋯</strong> de la targeta ofereix <strong>Obrir</strong> i <strong>Imprimir</strong> a tothom, i <strong>Duplicar</strong> i <strong>Eliminar</strong> a qui pot editar.</li>
<li><strong>Nova Fitxa Tècnica</strong> crea una fitxa <strong>solta</strong> (sense vincular a cap plat), útil per a plantilles o preparacions que no costegen a l'Escandall. Apareixen a part, sota «Fitxes sense vincular a un plat» (o «a una beguda»).</li>
</ul>

<h4>Com completar una fitxa, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Obre la fitxa del plat. A dalt veuràs el nom, una línia que diu <strong>Plat de l'escandall</strong> amb un botó <strong>Veure escandall</strong> (només propietari i edició), i les dades: <strong>Racions/Dosis</strong> (o Comensals), <strong>Producció</strong>, <strong>Temps d'elaboració (min)</strong> i <strong>Temperatura de servei</strong> (Calent, Fred, Ambient). En una fitxa vinculada, el nom i els comensals no s'editen aquí: venen de l'Escandall.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Puja una <strong>foto d'emplatat</strong> si vols («Pujar foto d'emplatat», fins a 2 MB). En tocar-la s'amplia. Les elaboracions base no porten foto ni emplatat, perquè no se serveixen tal qual.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Escriu el <strong>Mode d'elaboració</strong>: prem <strong>Afegir pas</strong> i descriu cadascun, en l'ordre real de treball. Els passos es <strong>llegeixen</strong> per defecte, perquè no es canviï res sense voler: prem el <strong>llapis</strong> d'un pas per editar-lo i el <strong>tic</strong> per tancar-lo (un pas nou s'obre sol). Cada pas admet dos extres: els <strong>minuts</strong> i un <strong>«Ull»</strong> per al punt crític («no passar de 65 °C»). Amb el menú ⋯ del pas el puges, el baixes o el treus.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Omple <strong>Presentació / emplatat</strong> (a Sala, <strong>Com se serveix</strong>): recipient, col·locació, guarnició, temperatura.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Revisa els <strong>Al·lèrgens</strong> (a baix, en una quadrícula). Els que porten els ingredients surten marcats sols i no es poden treure; marca a mà els que afegeixi la manipulació o un canvi de recepta.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Prem <strong>Desar</strong>. Et quedes a la fitxa; <strong>Tornar</strong> et porta a la llista.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Sigues concret: «Segellar el filet 1 minut per costat a la planxa ben calenta» val més que «cuinar la carn». Comença per les fitxes dels plats que més vens.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>Descripció a la carta</strong>: una frase (fins a 140 lletres) de què porta o com és el plat. És la que veu el teu client sota el plat a la web de comandes i la que llegeix el cambrer al TPV en tocar el botó ⓘ del plat. Els plats que afegeixes a mà a Oferta Gastronòmica (sense recepta) tenen el seu propi botó <strong>Descripció</strong>.</div>

<h4>La «Producció»: quantes racions faràs</h4>
<p>Els ingredients de la fitxa es mostren <strong>per a la producció que posis</strong>, amb el títol «Ingredients per a N racions». L'Escandall és sempre per a una ració; si avui n'elaboraràs 12, posa <strong>12</strong> a Producció i totes les quantitats es multipliquen. En una <strong>elaboració base</strong>, les quantitats de l'Escandall són les d'una tanda sencera (el seu rendiment), així que producció 3 és el triple de tanda.</p>
<p>La producció es desa sola a l'instant i <strong>no compta com un canvi sense desar</strong>. Les quantitats són les <strong>netes</strong> (el que porta el plat); la merma és a l'Escandall.</p>

<h4>Fitxes de beguda (Sala)</h4>
<p>A Sala, a més del que s'ha dit, apareix el bloc <strong>Dades de la beguda</strong> amb el <strong>Tipus de beguda</strong>: Vi, Escumós, Cervesa, Destil·lat i licor, Cocteleria, Cafè, Te i infusions, Sense alcohol o Altra. Segons el tipus es demanen les dades que li toquen: d'un vi, D.O., celler, anyada, raïms, criança, decantació, tast i maridatge; d'un cafè, mètode, torrat, gramatge, temps d'extracció i temperatures; d'una cervesa, estil i com tirar-la. Tots comparteixen copa, ració servida i temperatura de servei (llevat de les begudes que no la fan servir, com el cafè). «Sense especificar» deixa la fitxa sense aquestes dades.</p>

<h4>Imprimir</h4>
<p>El botó <strong>Imprimir</strong> (a la fitxa o des del menú ⋯ de la targeta) genera un full a dues columnes: a l'esquerra els ingredients de la producció amb una casella per marcar el mise en place; a la dreta els passos numerats amb els seus minuts i «Ull»; a sota, l'emplatat i els <strong>al·lèrgens ben visibles</strong>. Si hi ha canvis sense desar, es desen abans d'imprimir. Imprimeix-la, plastifica-la i penja-la a la partida o la barra.</p>

<h4>Qui pot què</h4>
<ul>
<li><strong>Qualsevol empleat</strong> de la zona pot obrir i imprimir les fitxes. Sense permís d'edició es veuen com un document de lectura: sense camps per escriure, i només amb els al·lèrgens que apliquen.</li>
<li>Crear, editar, duplicar i eliminar és del <strong>propietari</strong> i dels <strong>empleats amb permís d'edició</strong>.</li>
<li>Si el propietari assigna un plat a un empleat a <strong>Distribució del Treball</strong>, aquest empleat pot llegir-ne la recepta des del seu panell.</li>
</ul>

<h4>Editar, duplicar i eliminar</h4>
<ul>
<li>En sortir amb canvis sense desar, l'app pregunta: <strong>Seguir editant</strong>, <strong>Descartar</strong> o <strong>Desar i sortir</strong>. Un punt «Canvis sense desar» t'avisa mentrestant.</li>
<li><strong>Duplicar</strong> crea una fitxa solta (sense vincular) amb còpia al nom, per a variants.</li>
<li><strong>Eliminar</strong> demana confirmació. Si esborres el plat a l'Escandall, la seva fitxa s'esborra amb ell (i torna si el restaures des de la Paperera d'El Meu Negoci).</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>Els ingredients de la fitxa no es poden editar.</strong> És normal en una fitxa vinculada: es canvien a l'Escandall (botó <strong>Veure escandall</strong>).</li>
<li><strong>Les quantitats no són les de l'Escandall.</strong> Es multipliquen per la Producció. Posa 1 per veure les d'una ració.</li>
<li><strong>Un al·lèrgen no es deixa desmarcar.</strong> El porta un ingredient: treu-lo o canvia'l a la Mega Llista o a l'Escandall.</li>
<li><strong>«Aquesta recepta ja té una fitxa tècnica vinculada».</strong> Cada plat té una sola fitxa: obre-la des de la llista.</li>
<li><strong>La foto no es puja.</strong> Ha de ser una imatge de menys de 2 MB.</li>
<li><strong>No puc escriure a la fitxa.</strong> La teva sessió és de només lectura: demana el permís d'edició al propietari.</li>
</ul>`,
    en:`<h3>What it is and what it is for</h3>
<p>While Costing looks at a dish's <strong>cost</strong>, the Technical Sheet looks at its <strong>preparation</strong>: what to take out, how much, which steps to follow, how long it takes, how it is plated and which allergens it contains. It is the document that makes the dish come out the same whoever prepares it, and the one you need at hand to answer a customer with allergies or an inspector.</p>
<p>The sheet is <strong>a document to cook from</strong>: ingredients on the left, step by step on the right. It is the same screen to create, read and edit it. Kitchen and Dining Room each have their own; in the Dining Room they are <strong>drink</strong> sheets, with their own details (glass, temperature, tasting notes…).</p>

<h4>How it fits with the rest</h4>
<ul>
<li><strong>Master List → Costing → Sheet.</strong> A dish's sheet <strong>is created automatically</strong> the first time you save that dish in Costing. Its ingredients, quantities and allergens <strong>come from Costing</strong> and stay up to date: if you change a quantity there, the sheet reflects it.</li>
<li><strong>Sheet → team.</strong> It is what the cook (or bartender) reads at their station, and what gets printed to hang at the workstation.</li>
<li>The sheet <strong>has no prices</strong>: the money is in Costing, and what you sell is in the Menu.</li>
</ul>

<h4>The list of sheets</h4>
<ul>
<li>Tabs <strong>Dishes</strong> (in the Dining Room, <strong>Drinks</strong>) and <strong>Elaborations</strong> (<strong>Preparations</strong>). You enter through the same folders as Costing; the search box («Search technical sheet...») and the category filter show results grouped.</li>
<li>Each <strong>card</strong> has the name, the tag <strong>Linked</strong> (it comes from a Costing dish) or <strong>No sheet</strong>, and three figures: steps, time and allergens. Tap it to open it. If an older dish has no sheet yet, tapping it opens a new one already filled in.</li>
<li>The card's <strong>⋯</strong> menu offers <strong>Open</strong> and <strong>Print</strong> to everyone, and <strong>Duplicate</strong> and <strong>Delete</strong> to those who can edit.</li>
<li><strong>New Technical Sheet</strong> creates a <strong>standalone</strong> sheet (not linked to any dish), useful for templates or preparations that are not costed. They appear separately under «Sheets not linked to a dish» (or «to a drink»).</li>
</ul>

<h4>How to complete a sheet, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Open the dish's sheet. At the top you will see the name, a line saying <strong>Costing dish</strong> with an <strong>Open costing</strong> button (owner and edit only), and the details: <strong>Servings/Doses</strong> (or Diners), <strong>Production</strong>, <strong>Prep time (min)</strong> and <strong>Serving temperature</strong> (Hot, Cold, Room temp). On a linked sheet, the name and diners are not edited here: they come from Costing.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Upload a <strong>plating photo</strong> if you wish («Upload plating photo», up to 2 MB). Tapping it enlarges it. Base elaborations have no photo or plating, because they are not served as they are.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Write the <strong>Preparation method</strong>: press <strong>Add step</strong> and describe each one, in real working order. Steps are <strong>read-only</strong> by default so nothing changes by accident: press a step's <strong>pencil</strong> to edit it and the <strong>tick</strong> to close it (a new step opens on its own). Each step takes two extras: the <strong>minutes</strong> and a <strong>«Watch out»</strong> for the critical point («do not exceed 65 °C»). The step's ⋯ menu moves it up, down or removes it.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Fill in <strong>Plating / presentation</strong> (in the Dining Room, <strong>How it is served</strong>): dish, arrangement, garnish, temperature.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Check the <strong>Allergens</strong> (at the bottom, in a grid). Those carried by the ingredients are ticked automatically and cannot be removed; tick by hand any added by handling or a recipe change.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Press <strong>Save</strong>. You stay on the sheet; <strong>Back</strong> takes you to the list.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Be specific: «Sear the tenderloin 1 minute per side on a very hot griddle» is worth more than «cook the meat». Start with the sheets for your best sellers.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>Menu description</strong>: one line (up to 140 characters) about what the dish contains or what it is like. It is the one your customer sees under the dish on the ordering website and the one the waiter reads on the POS when tapping the dish's ⓘ button. Dishes you add by hand in Menu Offer (without a recipe) have their own <strong>Description</strong> button.</div>

<h4>«Production»: how many servings you are making</h4>
<p>The sheet's ingredients are shown <strong>for the production you enter</strong>, with the heading «Ingredients for N servings». Costing is always for one serving; if today you are preparing 12, enter <strong>12</strong> in Production and all quantities are multiplied. For a <strong>base elaboration</strong>, the Costing quantities are those of one whole batch (its yield), so production 3 means triple the batch.</p>
<p>Production is saved instantly by itself and <strong>does not count as an unsaved change</strong>. The quantities are the <strong>net</strong> ones (what the dish contains); waste lives in Costing.</p>

<h4>Drink sheets (Dining Room)</h4>
<p>In the Dining Room, besides the above, a <strong>Drink details</strong> block appears with the <strong>Drink type</strong>: Wine, Sparkling, Beer, Spirit &amp; liqueur, Cocktail, Coffee, Tea &amp; infusions, Non-alcoholic or Other. Depending on the type it asks for the relevant details: for a wine, appellation, winery, vintage, grapes, ageing, decanting, tasting notes and food pairing; for coffee, method, roast, dose, extraction time and temperatures; for beer, style and how to pour it. All share glass, serving size and serving temperature (except drinks that do not use it, like coffee). «Not specified» leaves the sheet without those details.</p>

<h4>Printing</h4>
<p>The <strong>Print</strong> button (on the sheet or from the card's ⋯ menu) produces a two-column page: on the left the ingredients for the production with a box to tick off the mise en place; on the right the numbered steps with their minutes and «Watch out»; below, the plating and the <strong>allergens, clearly visible</strong>. If there are unsaved changes, they are saved before printing. Print it, laminate it and hang it at the workstation or bar.</p>

<h4>Who can do what</h4>
<ul>
<li><strong>Any employee</strong> in the area can open and print sheets. Without edit permission they appear as a read-only document: no input fields, and only the allergens that apply.</li>
<li>Creating, editing, duplicating and deleting belong to the <strong>owner</strong> and to <strong>employees with edit permission</strong>.</li>
<li>If the owner assigns a dish to an employee in <strong>Work Distribution</strong>, that employee can read its recipe from their panel.</li>
</ul>

<h4>Editing, duplicating and deleting</h4>
<ul>
<li>When leaving with unsaved changes, the app asks: <strong>Keep editing</strong>, <strong>Discard</strong> or <strong>Save and leave</strong>. An «Unsaved changes» dot warns you meanwhile.</li>
<li><strong>Duplicate</strong> creates a standalone (unlinked) sheet with a copy tag in the name, for variants.</li>
<li><strong>Delete</strong> asks for confirmation. If you delete the dish in Costing, its sheet goes with it (and comes back if you restore it from the My Business Recycle bin).</li>
</ul>

<h4>If something is not working</h4>
<ul>
<li><strong>The sheet's ingredients cannot be edited.</strong> That is normal on a linked sheet: change them in Costing (<strong>Open costing</strong> button).</li>
<li><strong>The quantities are not those in Costing.</strong> They are multiplied by Production. Enter 1 to see those for one serving.</li>
<li><strong>An allergen will not untick.</strong> An ingredient carries it: remove or change it in the Master List or in Costing.</li>
<li><strong>«That recipe already has a linked technical sheet».</strong> Each dish has a single sheet: open it from the list.</li>
<li><strong>The photo will not upload.</strong> It must be an image under 2 MB.</li>
<li><strong>I cannot type in the sheet.</strong> Your session is read-only: ask the owner for edit permission.</li>
</ul>`}
  },
  {id:'oferta', area:'cocina',
    title:{es:`<i class="ti ti-tools-kitchen-2"></i> Oferta Gastronómica / Oferta de Bebidas`, ca:`<i class="ti ti-tools-kitchen-2"></i> Oferta Gastronòmica / Oferta de Begudes`, en:`<i class="ti ti-tools-kitchen-2"></i> Menu Offering / Beverage Offering`},
    content:{es:`<h3>Lo que vendes y cuándo lo vendes</h3>
<p>Aquí montas tus <strong>cartas</strong> (platos con su precio, ordenados por secciones) y tus <strong>menús</strong> de precio cerrado, decides a qué días y horas se activa cada uno y marcas lo que se agota en pleno servicio. Lo que montes aquí es lo que sale en el TPV, en la web de reservas y pedidos y en el QR de la mesa. En Cocina la pantalla se llama <strong>Oferta Gastronómica</strong>; en Sala, <strong>Oferta de Bebidas</strong>.</p>
<h4>Cocina y Sala: dos ofertas separadas</h4>
<p>Lo que creas desde Cocina es comida y lo que creas desde Sala es bebida. No tienes que marcar nada: depende de la carpeta en la que estés. Las bebidas no salen en Comandas Cocina. En las dos carpetas la pantalla tiene dos pestañas:</p>
<table><thead><tr><th></th><th>Cocina</th><th>Sala</th></tr></thead><tbody><tr><td>Pestañas</td><td><strong>Carta</strong> y <strong>Menús</strong></td><td><strong>Carta</strong> y <strong>Maridajes</strong></td></tr><tr><td>Crear carta</td><td><strong>Nueva Carta</strong></td><td><strong>Nueva Carta de Bebidas</strong></td></tr><tr><td>Crear menú</td><td><strong>Nuevo Menú</strong></td><td><strong>Nuevo Maridaje</strong></td></tr><tr><td>Añadir sin receta</td><td><strong>Plato manual</strong></td><td><strong>Bebida manual</strong></td></tr></tbody></table>
<p>Un maridaje de Sala es un paquete de precio cerrado con grupos de bebidas a elegir (por ejemplo vino tinto, vino blanco o cava). No lo confundas con los maridajes del I+D, que son sugerencias de qué beber con cada plato.</p>
<h4>Crear una carta, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra en <strong>Oferta Gastronómica</strong> (o <strong>Oferta de Bebidas</strong>), pestaña <strong>Carta</strong>, y pulsa <strong>Nueva Carta</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Ponle nombre arriba (se guarda en mayúsculas). Por ejemplo «Carta Mediodía» o «Carta Fin de Semana».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Abre el bloque <strong>Días y horario en que está activa esta carta</strong>. Activa los días en que se ofrece y, si quieres, pon hora de apertura y de cierre. Para un horario partido añade una segunda franja con <strong>Otra franja</strong>. Vacío significa todo el día. Los atajos <strong>Mismo horario que el lunes</strong> y <strong>Sin horas: todo el día</strong> ahorran tiempo. Una franja puede cruzar la medianoche (20:00–02:00).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Pulsa <strong>Nueva Sección</strong> (Entrantes, Arroces, Postres, Cócteles…). El icono de cada sección es el que verá el cliente en la web: púlsalo para elegir otro, dejarla sin icono o dejar que se elija solo según el nombre.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">En cada sección, pulsa <strong>Escandallo</strong> para importar platos que ya tienes calculados (elige una <strong>carpeta</strong> del Escandallo, marca los platos que quieras —puedes cambiar de carpeta y se recuerdan— o usa el buscador, y pulsa <strong>Importar</strong>), o <strong>Plato manual</strong> / <strong>Bebida manual</strong> para algo sin receta, como una lata o un postre comprado: nombre, precio base sin IVA y tipo de IVA.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Pulsa <strong>Guardar</strong>. Hasta que no guardes, los cambios no se aplican (menos agotado y raciones, que ves más abajo).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>El precio de un plato importado del Escandallo se cambia en el Escandallo: aquí se actualiza solo y no se puede tocar. En un plato manual, toca su nombre o su precio para cambiarlos.</div>
<h4>Cada plato de la carta</h4>
<table><thead><tr><th>Elemento</th><th>Para qué sirve</th></tr></thead><tbody><tr><td>Nombre</td><td>Púlsalo para cambiar cómo se llama en la carta. No toca la receta del Escandallo.</td></tr><tr><td>Etiqueta «NN % FC»</td><td>Food cost del plato: verde hasta el 28 %, ámbar hasta el 35 %, rojo por encima. Solo en platos del Escandallo.</td></tr><tr><td><strong>Disponible</strong> / <strong>No disponible</strong></td><td>Lo apaga o lo enciende al instante en el TPV y en la web.</td></tr><tr><td><strong>Sin límite</strong> / raciones / <strong>Agotado</strong></td><td>Limita cuántos se pueden vender hoy.</td></tr><tr><td><strong>Extras y opciones</strong></td><td>Extras con suplemento (+1 € de queso) u opciones gratis (sin cebolla).</td></tr><tr><td>Triángulo de alérgenos</td><td>Solo en platos manuales. Los del Escandallo calculan sus alérgenos solos.</td></tr><tr><td>⋯</td><td><strong>Editar</strong> y <strong>Eliminar</strong>. Las flechas suben y bajan el orden.</td></tr></tbody></table>
<h4>Agotado y raciones: lo que cambia en pleno servicio</h4>
<p>Cuando se acaba el rape, pulsa <strong>Disponible</strong> y pasa a <strong>No disponible</strong>: desaparece del TPV y de la web de pedidos. Si prefieres controlarlo por número, pulsa el botón de raciones, escribe cuántas quedan (o usa 5, 10, 15, 20, 30, 50) y <strong>Guardar</strong>. El TPV las va restando y al llegar a 0 lo marca como agotado solo. <strong>No se reinician solas</strong>: mañana hay que volver a ponerlas.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Agotado y raciones se aplican al momento, sin pulsar Guardar, y no cuentan como cambios sin guardar. Si guardas una carta que tenías abierta mientras se vendía, manda siempre lo que hay vivo. Desde el TPV, el botón <strong>Marcar agotado</strong> hace lo mismo sin entrar aquí.</div>
<h4>Crear un menú de precio cerrado</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pestaña <strong>Menús</strong> (en Sala, <strong>Maridajes</strong>) y botón <strong>Nuevo Menú</strong> (<strong>Nuevo Maridaje</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pon el nombre («Menú del día»), el <strong>Precio base (sin IVA)</strong> y el <strong>Tipo de IVA (repercutido)</strong>. Abajo ves el <strong>Precio final (IVA incluido)</strong>. El horario funciona igual que en la carta.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Nuevo grupo</strong> por cada pase a elegir: «Primero», «Segundo», «Postre», «Bebida». En Sala, «Aperitivo», «Con la comida», «Copa».</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En cada grupo pulsa <strong>Opción</strong>: elige «Plato del Escandallo» o «Escribir nombre manualmente» y, si quieres, un <strong>Suplemento (€)</strong> (+2 € por el solomillo). Cada opción tiene su propio Disponible, raciones y Extras: si se agota una, el menú se sigue vendiendo con las demás.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Pulsa <strong>Guardar</strong>. El menú necesita nombre, precio, IVA, al menos un grupo y al menos una opción en cada grupo.</div></div>
<p>La casilla <strong>Sala</strong> de un grupo indica que son bebidas: sus opciones se eligen de tu carta de bebidas (solo se copia el nombre, no el precio). Al marcarla o desmarcarla el grupo se vacía. En la lista, el menú entero también tiene <strong>Disponible</strong> y raciones («hoy solo 20 menús»).</p>
<h4>Qué carta está activa en cada momento</h4>
<p>Es automático y no se puede apagar: cada minuto la app mira el día y la hora y activa las cartas y menús cuyo horario coincide. Puede haber varias a la vez (la de comida y la de bebidas). Las activas llevan la insignia <strong>Activa en TPV</strong> (los menús, <strong>Activo en TPV</strong>). En el TPV, el botón <strong>Cartas</strong> cuenta cuántas hay y abre <strong>Cartas activas</strong>, con «Activa» o «Fuera de horario» en cada una. Para tener otra carta ahora, cambia su horario.</p>
<h4>Cambios sin guardar</h4>
<p>Mientras editas aparece <strong>Cambios sin guardar</strong> junto a <strong>Guardar</strong>. Si intentas salir (otra pantalla, volver a la lista, otra pestaña, cerrar sesión, cambiar de negocio o recargar), la app pregunta: <strong>Seguir editando</strong>, <strong>Descartar</strong> o <strong>Guardar y salir</strong>.</p>
<h4>Lo que conviene saber</h4>
<ul>
<li>Solo el <strong>propietario</strong> y los empleados con <strong>permiso de edición</strong> ven esta pantalla. A un empleado sin edición ni le aparece en su carpeta; para marcar un agotado en servicio usa <strong>Marcar agotado</strong> en el TPV.</li>
<li>Los nombres de secciones, platos y menús se traducen solos al castellano, catalán e inglés al guardar. Es un traductor automático en segundo plano: necesita internet y, si falla, el nombre se queda como lo escribiste.</li>
<li>Eliminar una sección elimina sus platos (pide confirmación). Eliminar una carta no toca las recetas.</li>
<li>Cartas y menús se sincronizan con la nube del negocio, y la web pública los muestra en pocos segundos.</li>
<li>En móvil, cada plato u opción se ve plegada con nombre, precio y estado (<strong>Agotado</strong> o raciones). Toca la fila o la flecha para ver el resto de botones.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li>Un plato no sale en el TPV: comprueba que esté en <strong>Disponible</strong> y que su carta esté activa ahora (revisa días y horas).</li>
<li>En el TPV, <strong>Cartas</strong> sale a 0 con un aviso: ninguna carta coincide con el día y la hora. Revisa los horarios.</li>
<li>Al guardar sale «con este horario nunca se activará sola»: no hay ningún día marcado.</li>
<li>No te deja guardar el horario: una franja tiene solo apertura o solo cierre. Pon las dos horas o déjala vacía.</li>
<li>No te deja guardar el menú: falta IVA, o hay un grupo sin opciones.</li>
<li>No puedes cambiar el precio de un plato: viene del Escandallo y se cambia allí.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si tus clientes ven «La carta no está disponible» en la web de pedidos, comprueba que haya una carta activa ahora y que tenga al menos un plato <strong>Disponible</strong>.</div>`,
    ca:`<h3>El que vens i quan ho vens</h3>
<p>Aquí muntes les teves <strong>cartes</strong> (plats amb el seu preu, ordenats per seccions) i els teus <strong>menús</strong> de preu tancat, decideixes quins dies i hores s'activa cadascun i marques el que s'acaba en ple servei. El que muntis aquí és el que surt al TPV, a la web de reserves i comandes i al QR de la taula. A Cuina la pantalla es diu <strong>Oferta Gastronòmica</strong>; a Sala, <strong>Oferta de Begudes</strong>.</p>
<h4>Cuina i Sala: dues ofertes separades</h4>
<p>El que crees des de Cuina és menjar i el que crees des de Sala és beguda. No cal marcar res: depèn de la carpeta on siguis. Les begudes no surten a Comandes Cuina. A les dues carpetes la pantalla té dues pestanyes:</p>
<table><thead><tr><th></th><th>Cuina</th><th>Sala</th></tr></thead><tbody><tr><td>Pestanyes</td><td><strong>Carta</strong> i <strong>Menús</strong></td><td><strong>Carta</strong> i <strong>Maridatges</strong></td></tr><tr><td>Crear carta</td><td><strong>Nova Carta</strong></td><td><strong>Nova Carta de Begudes</strong></td></tr><tr><td>Crear menú</td><td><strong>Nou Menú</strong></td><td><strong>Nou Maridatge</strong></td></tr><tr><td>Afegir sense recepta</td><td><strong>Plat manual</strong></td><td><strong>Beguda manual</strong></td></tr></tbody></table>
<p>Un maridatge de Sala és un paquet de preu tancat amb grups de begudes a triar (per exemple vi negre, vi blanc o cava). No el confonguis amb els maridatges de R+D, que són suggeriments de què beure amb cada plat.</p>
<h4>Crear una carta, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra a <strong>Oferta Gastronòmica</strong> (o <strong>Oferta de Begudes</strong>), pestanya <strong>Carta</strong>, i prem <strong>Nova Carta</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Posa-li nom a dalt (es desa en majúscules). Per exemple «Carta Migdia» o «Carta Cap de Setmana».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Obre el bloc <strong>Dies i horari en què està activa aquesta carta</strong>. Activa els dies en què s'ofereix i, si vols, posa hora d'obertura i de tancament. Per a un horari partit afegeix una segona franja amb <strong>Una altra franja</strong>. Buit vol dir tot el dia. Les dreceres <strong>Mateix horari que el dilluns</strong> i <strong>Sense hores: tot el dia</strong> estalvien temps. Una franja pot creuar la mitjanit (20:00–02:00).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Prem <strong>Nova Secció</strong> (Entrants, Arrossos, Postres, Còctels…). La icona de cada secció és la que veurà el client a la web: prem-la per triar-ne una altra, deixar la secció sense icona o deixar que s'esculli sola segons el nom.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">A cada secció, prem <strong>Escandall</strong> per importar plats que ja tens calculats (tria una <strong>carpeta</strong> de l'Escandall, marca els plats que vulguis —pots canviar de carpeta i es recorden— o fes servir el cercador, i prem <strong>Importar</strong>), o <strong>Plat manual</strong> / <strong>Beguda manual</strong> per a alguna cosa sense recepta, com una llauna o unes postres comprades: nom, preu base sense IVA i tipus d'IVA.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Prem <strong>Desar</strong>. Fins que no desis, els canvis no s'apliquen (excepte esgotat i racions, que veus més avall).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>El preu d'un plat importat de l'Escandall es canvia a l'Escandall: aquí s'actualitza sol i no es pot tocar. En un plat manual, toca el seu nom o el seu preu per canviar-los.</div>
<h4>Cada plat de la carta</h4>
<table><thead><tr><th>Element</th><th>Per a què serveix</th></tr></thead><tbody><tr><td>Nom</td><td>Prem-lo per canviar com es diu a la carta. No toca la recepta de l'Escandall.</td></tr><tr><td>Etiqueta «NN % FC»</td><td>Food cost del plat: verd fins al 28 %, ambre fins al 35 %, vermell per sobre. Només en plats de l'Escandall.</td></tr><tr><td><strong>Disponible</strong> / <strong>No disponible</strong></td><td>L'apaga o l'encén a l'instant al TPV i a la web.</td></tr><tr><td><strong>Sense límit</strong> / racions / <strong>Esgotat</strong></td><td>Limita quants se'n poden vendre avui.</td></tr><tr><td><strong>Extres i opcions</strong></td><td>Extres amb suplement (+1 € de formatge) o opcions gratis (sense ceba).</td></tr><tr><td>Triangle d'al·lèrgens</td><td>Només en plats manuals. Els de l'Escandall calculen els seus al·lèrgens sols.</td></tr><tr><td>⋯</td><td><strong>Editar</strong> i <strong>Eliminar</strong>. Les fletxes pugen i baixen l'ordre.</td></tr></tbody></table>
<h4>Esgotat i racions: el que canvia en ple servei</h4>
<p>Quan s'acaba el rap, prem <strong>Disponible</strong> i passa a <strong>No disponible</strong>: desapareix del TPV i de la web de comandes. Si prefereixes controlar-ho per nombre, prem el botó de racions, escriu quantes en queden (o fes servir 5, 10, 15, 20, 30, 50) i <strong>Desar</strong>. El TPV les va restant i en arribar a 0 ho marca com a esgotat tot sol. <strong>No es reinicien soles</strong>: demà cal tornar-les a posar.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Esgotat i racions s'apliquen al moment, sense prémer Desar, i no compten com a canvis sense desar. Si deses una carta que tenies oberta mentre es venia, mana sempre el que hi ha viu. Des del TPV, el botó <strong>Marcar esgotat</strong> fa el mateix sense entrar aquí.</div>
<h4>Crear un menú de preu tancat</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pestanya <strong>Menús</strong> (a Sala, <strong>Maridatges</strong>) i botó <strong>Nou Menú</strong> (<strong>Nou Maridatge</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Posa el nom («Menú del dia»), el <strong>Preu base (sense IVA)</strong> i el <strong>Tipus d'IVA (repercutit)</strong>. A sota veus el <strong>Preu final (IVA inclòs)</strong>. L'horari funciona igual que a la carta.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Nou grup</strong> per cada pas a triar: «Primer», «Segon», «Postres», «Beguda». A Sala, «Aperitiu», «Amb el menjar», «Copa».</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A cada grup prem <strong>Opció</strong>: tria «Plat de l'Escandall» o «Escriure el nom manualment» i, si vols, un <strong>Suplement (€)</strong> (+2 € pel filet). Cada opció té el seu propi Disponible, racions i Extres: si se n'acaba una, el menú es continua venent amb les altres.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Prem <strong>Desar</strong>. El menú necessita nom, preu, IVA, almenys un grup i almenys una opció a cada grup.</div></div>
<p>La casella <strong>Sala</strong> d'un grup indica que són begudes: les seves opcions es trien de la teva carta de begudes (només es copia el nom, no el preu). En marcar-la o desmarcar-la el grup es buida. A la llista, el menú sencer també té <strong>Disponible</strong> i racions («avui només 20 menús»).</p>
<h4>Quina carta està activa a cada moment</h4>
<p>És automàtic i no es pot apagar: cada minut l'app mira el dia i l'hora i activa les cartes i menús l'horari dels quals coincideix. Pot haver-n'hi diverses alhora (la de menjar i la de begudes). Les actives porten la insígnia <strong>Activa al TPV</strong> (els menús, <strong>Actiu al TPV</strong>). Al TPV, el botó <strong>Cartes</strong> compta quantes n'hi ha i obre <strong>Cartes actives</strong>, amb «Activa» o «Fora d'horari» a cadascuna. Per tenir una altra carta ara, canvia'n l'horari.</p>
<h4>Canvis sense desar</h4>
<p>Mentre edites apareix <strong>Canvis sense desar</strong> al costat de <strong>Desar</strong>. Si intentes sortir (una altra pantalla, tornar a la llista, una altra pestanya, tancar sessió, canviar de negoci o recarregar), l'app pregunta: <strong>Seguir editant</strong>, <strong>Descartar</strong> o <strong>Desar i sortir</strong>.</p>
<h4>El que convé saber</h4>
<ul>
<li>Només el <strong>propietari</strong> i els empleats amb <strong>permís d'edició</strong> veuen aquesta pantalla. A un empleat sense edició ni li apareix a la seva carpeta; per marcar un esgotat en servei fa servir <strong>Marcar esgotat</strong> al TPV.</li>
<li>Els noms de seccions, plats i menús es tradueixen sols al castellà, català i anglès en desar. És un traductor automàtic en segon pla: necessita internet i, si falla, el nom es queda com el vas escriure.</li>
<li>Eliminar una secció elimina els seus plats (demana confirmació). Eliminar una carta no toca les receptes.</li>
<li>Cartes i menús se sincronitzen amb el núvol del negoci, i la web pública els mostra en pocs segons.</li>
<li>En mòbil, cada plat o opció es veu plegat amb nom, preu i estat (<strong>Esgotat</strong> o racions). Toca la fila o la fletxa per veure la resta de botons.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li>Un plat no surt al TPV: comprova que sigui a <strong>Disponible</strong> i que la seva carta estigui activa ara (revisa dies i hores).</li>
<li>Al TPV, <strong>Cartes</strong> surt a 0 amb un avís: cap carta coincideix amb el dia i l'hora. Revisa els horaris.</li>
<li>En desar surt «amb aquest horari mai s'activarà sola»: no hi ha cap dia marcat.</li>
<li>No et deixa desar l'horari: una franja té només obertura o només tancament. Posa les dues hores o deixa-la buida.</li>
<li>No et deixa desar el menú: falta l'IVA, o hi ha un grup sense opcions.</li>
<li>No pots canviar el preu d'un plat: ve de l'Escandall i es canvia allà.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si els teus clients veuen «La carta no està disponible» a la web de comandes, comprova que hi hagi una carta activa ara i que tingui almenys un plat <strong>Disponible</strong>.</div>`,
    en:`<h3>What you sell and when you sell it</h3>
<p>This is where you build your <strong>menus</strong> (dishes with their price, sorted into sections) and your fixed-price <strong>set menus</strong>, decide which days and hours each one switches on, and mark what runs out mid-service. What you build here is what appears in the POS, on the online booking and ordering site and on the table QR. In Kitchen the screen is called <strong>Menu Offering</strong>; in Floor, <strong>Beverage Offering</strong>.</p>
<h4>Kitchen and Floor: two separate offerings</h4>
<p>Whatever you create from Kitchen is food and whatever you create from Floor is drinks. You do not have to flag anything: it depends on the area you are in. Drinks do not appear on the Kitchen Orders screen. In both areas the screen has two tabs:</p>
<table><thead><tr><th></th><th>Kitchen</th><th>Floor</th></tr></thead><tbody><tr><td>Tabs</td><td><strong>Menu</strong> and <strong>Set Menus</strong></td><td><strong>Menu</strong> and <strong>Pairings</strong></td></tr><tr><td>Create a menu</td><td><strong>New Menu</strong></td><td><strong>New Beverage Menu</strong></td></tr><tr><td>Create a set menu</td><td><strong>New Menu</strong></td><td><strong>New Pairing</strong></td></tr><tr><td>Add without a recipe</td><td><strong>Manual dish</strong></td><td><strong>Manual drink</strong></td></tr></tbody></table>
<p>A Floor pairing is a fixed-price package with groups of drinks to choose from (for example red wine, white wine or cava). Do not confuse it with the R&amp;D pairings, which are suggestions of what to drink with each dish.</p>
<h4>Creating a menu, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Open <strong>Menu Offering</strong> (or <strong>Beverage Offering</strong>), tab <strong>Menu</strong>, and press <strong>New Menu</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Name it at the top (it is saved in capitals). For example «Lunch Menu» or «Weekend Menu».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Open the block <strong>Days and hours this menu is active</strong>. Turn on the days it is offered and, if you want, set an opening and closing time. For split hours add a second slot with <strong>Add slot</strong>. Empty means all day. The shortcuts <strong>Same hours as Monday</strong> and <strong>No hours: all day</strong> save time. A slot can cross midnight (20:00–02:00).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Press <strong>New Section</strong> (Starters, Rice, Desserts, Cocktails…). The icon of each section is the one customers will see on the website: press it to pick another, leave the section without an icon or let it be chosen from the name.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">In each section press <strong>Costing</strong> to import dishes you have already costed (pick a <strong>folder</strong> from Costing, tick the dishes you want —you can switch folders and your picks are kept— or use the search, and press <strong>Import</strong>), or <strong>Manual dish</strong> / <strong>Manual drink</strong> for something with no recipe, like a can or a bought-in dessert: name, base price excl. VAT and VAT type.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st">Press <strong>Save</strong>. Until you save, changes are not applied (except sold out and portions, below).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>The price of a dish imported from Costing is changed in Costing: here it updates by itself and cannot be edited. For a manual dish, tap its name or price to change them.</div>
<h4>Every dish on the menu</h4>
<table><thead><tr><th>Element</th><th>What it is for</th></tr></thead><tbody><tr><td>Name</td><td>Tap it to change what it is called on the menu. It does not touch the Costing recipe.</td></tr><tr><td>«NN % FC» tag</td><td>Dish food cost: green up to 28 %, amber up to 35 %, red above. Only on dishes from Costing.</td></tr><tr><td><strong>Available</strong> / <strong>Unavailable</strong></td><td>Switches it off or on instantly in the POS and on the website.</td></tr><tr><td><strong>No limit</strong> / portions / <strong>Sold out</strong></td><td>Limits how many can be sold today.</td></tr><tr><td><strong>Extras and options</strong></td><td>Extras with a surcharge (+€1 for cheese) or free options (no onion).</td></tr><tr><td>Allergen triangle</td><td>Manual dishes only. Dishes from Costing work out their own allergens.</td></tr><tr><td>⋯</td><td><strong>Edit</strong> and <strong>Delete</strong>. The arrows move the order up and down.</td></tr></tbody></table>
<h4>Sold out and portions: what changes mid-service</h4>
<p>When the monkfish runs out, press <strong>Available</strong> and it becomes <strong>Unavailable</strong>: it disappears from the POS and the online ordering site. If you prefer to control it by number, press the portions button, type how many are left (or use 5, 10, 15, 20, 30, 50) and <strong>Save</strong>. The POS subtracts them and marks the dish sold out at 0. <strong>They do not reset by themselves</strong>: set them again tomorrow.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Sold out and portions apply immediately, without pressing Save, and do not count as unsaved changes. If you save a menu you had open while sales were going on, the live values always win. From the POS, the <strong>Mark as out</strong> button does the same without coming here.</div>
<h4>Creating a fixed-price set menu</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Tab <strong>Set Menus</strong> (in Floor, <strong>Pairings</strong>) and button <strong>New Menu</strong> (<strong>New Pairing</strong>).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Enter the name («Daily menu»), the <strong>Base price (no VAT)</strong> and the <strong>VAT type (output)</strong>. Below you see the <strong>Final price (VAT included)</strong>. The schedule works as on a menu.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>New group</strong> for each course to choose from: «Starter», «Main», «Dessert», «Drink». In Floor, «Aperitif», «With the meal», «Digestif».</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">In each group press <strong>Option</strong>: choose «Dish from Costing» or «Type the name manually» and, if you want, a <strong>Supplement (€)</strong> (+€2 for the steak). Each option has its own Available, portions and Extras: if one runs out, the set menu keeps selling with the others.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Press <strong>Save</strong>. A set menu needs a name, a price, a VAT type, at least one group and at least one option in every group.</div></div>
<p>The <strong>Floor</strong> tick box on a group means it holds drinks: its options are picked from your drinks menu (only the name is copied, not the price). Ticking or unticking it empties the group. In the list, the whole set menu also has <strong>Available</strong> and portions («only 20 today»).</p>
<h4>Which menu is active at any moment</h4>
<p>It is automatic and cannot be switched off: every minute the app checks the day and time and activates the menus and set menus whose schedule matches. Several can be active at once (food and drinks). The active ones carry the badge <strong>Active in POS</strong>. In the POS, the <strong>Menus</strong> button counts how many there are and opens <strong>Active menus</strong>, showing «Active» or «Off schedule» for each. To have a different menu now, change its schedule.</p>
<h4>Unsaved changes</h4>
<p>While you edit, <strong>Unsaved changes</strong> appears next to <strong>Save</strong>. If you try to leave (another screen, back to the list, another tab, log out, switch business or reload), the app asks: <strong>Keep editing</strong>, <strong>Discard</strong> or <strong>Save and leave</strong>.</p>
<h4>Good to know</h4>
<ul>
<li>Only the <strong>owner</strong> and employees with <strong>edit permission</strong> see this screen. An employee without edit permission does not even see it in their folder; to mark something sold out during service they use <strong>Mark as out</strong> in the POS.</li>
<li>Names of sections, dishes and set menus are translated by themselves into Spanish, Catalan and English when you save. It is an automatic translator working in the background: it needs internet and, if it fails, the name stays as you wrote it.</li>
<li>Deleting a section deletes its dishes (it asks to confirm). Deleting a menu does not touch the recipes.</li>
<li>Menus and set menus sync with the business cloud, and the public site shows them within seconds.</li>
<li>On a phone, each dish or option shows folded with name, price and status (<strong>Sold out</strong> or portions). Tap the row or the arrow to see the other buttons.</li>
</ul>
<h4>If something does not work</h4>
<ul>
<li>A dish does not show in the POS: check it is <strong>Available</strong> and that its menu is active now (check days and hours).</li>
<li>In the POS, <strong>Menus</strong> shows 0 with a warning: no menu matches the day and time. Check the schedules.</li>
<li>On saving you see «it will never turn on by itself»: no day is ticked.</li>
<li>It will not let you save the schedule: a slot has only an opening or only a closing time. Set both or leave it empty.</li>
<li>It will not let you save the set menu: VAT is missing, or a group has no options.</li>
<li>You cannot change a dish price: it comes from Costing and is changed there.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>If your customers see «The menu isn't available» on the online ordering site, check that a menu is active now and that it has at least one <strong>Available</strong> dish.</div>`}
  },
  {id:'idr', area:'cocina',
    title:{es:`<i class="ti ti-flask"></i> I+D`, ca:`<i class="ti ti-flask"></i> R+D`, en:`<i class="ti ti-flask"></i> R&amp;D`},
    content:{es:`<h3>Un jefe de cocina (o de barra) con quien pensar, que sabe lo que te cuesta cada cosa</h3>
<p>I+D es un asistente de IA para crear: <strong>elaboraciones base</strong>, <strong>platos</strong>, <strong>menús</strong> y <strong>cartas</strong>. En Sala crea cócteles y bebidas, preparaciones de barra, maridajes y cartas de bebidas. Conversa contigo como lo haría un jefe de cocina y te propone caminos con su porqué. Cuando decidís, la app escribe la ficha y calcula el coste con TUS ingredientes y TUS precios. La IA pone las ideas; los números los pone la app. Y no se crea nada hasta que tú lo pides.</p>
<p>Solo lo ven el propietario y los empleados con permiso de edición.</p>
<h4>Antes de empezar: dos cosas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Activa el asistente.</strong> Es cosa del propietario: <strong>Gestión → Mi Negocio → Asistente de IA</strong> (en I+D, el botón <strong>Asistente</strong> te lleva allí). Elige proveedor (<strong>Google (Gemini)</strong>, <strong>Anthropic (Claude)</strong> u <strong>OpenAI (ChatGPT)</strong>), pega tu clave, pulsa <strong>Guardar</strong> y luego <strong>Probar la conexión</strong>. La de Google es gratuita y se saca en dos minutos; cada proveedor explica los pasos bajo el campo de la clave. Si el modelo deja de existir, <strong>Ver modelos disponibles</strong> te deja elegir otro.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Rellena el ADN gastronómico.</strong> Pulsa <strong>Definir el ADN</strong> (después, <strong>Editar</strong>). Es obligatorio: sin él, no se empieza nada. Lo mínimo es <strong>Cocina y tradición</strong>, <strong>Nivel</strong> y <strong>Público</strong> (en Sala, <strong>Tipo de local y estilo</strong>, <strong>Nivel</strong> y <strong>Público</strong>). Cuanto más rellenes, mejor: <strong>Producto insignia</strong>, <strong>Líneas rojas</strong> (lo que nunca debe proponerte), <strong>Food cost objetivo</strong>, <strong>Equipamiento</strong>, <strong>Equipo en partida</strong>, <strong>Producto</strong>, <strong>Dietas obligatorias</strong> e <strong>Idioma de los platos</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La clave es tuya. Se guarda solo en este dispositivo (no en la nube, y tu personal no puede leerla) y el consumo va a tu cuenta del proveedor, no pasa por GastroGoan. Si usas la app en tablet y móvil, ponla en cada uno. La API de Claude y la de ChatGPT se pagan por uso y no vienen incluidas en las suscripciones Claude Pro ni ChatGPT Plus. Hay un tope de 500 consultas al día por dispositivo.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Sé concreto en el ADN: «catalana de mercado con toques de brasa» dice mucho más que «mediterránea». Y en Equipamiento escribe «sin» delante de lo que NO tienes («Sin Roner ni deshidratador»): así no te propondrá esas técnicas.</div>
<h4>Qué puedes crear</h4>
<table><thead><tr><th>Botón</th><th>Qué hace y dónde acaba</th></tr></thead><tbody><tr><td><strong>Nueva elaboración base</strong> (Sala: <strong>Preparación de barra</strong>)</td><td>Un fondo, una salsa madre, un jarabe. Queda en Escandallo y Fichas Técnicas, pestaña Elaboraciones, y en el Stock.</td></tr><tr><td><strong>Nuevo plato</strong> (Sala: <strong>Cóctel o bebida</strong>)</td><td>Un plato o bebida entero, con ficha y escandallo.</td></tr><tr><td><strong>Nuevo menú</strong> (solo Cocina)</td><td>Crea los platos con su ficha. El menú lo montas tú después en Oferta → Menús.</td></tr><tr><td><strong>Nueva carta</strong> (Sala: <strong>Carta de bebidas</strong>)</td><td>Crea los platos y una carta real en Oferta, con sus secciones.</td></tr><tr><td><strong>Maridajes</strong> (solo Sala)</td><td>Qué beber con cada plato de la cocina. No cambia nada, es una consulta.</td></tr></tbody></table>
<h4>Cómo se crea algo, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa el tipo que quieras. Primero va <strong>El encargo</strong>: el <strong>precio de venta sin IVA</strong> y el <strong>food cost objetivo (%)</strong> (si ya lo pusiste en el ADN, sale puesto). En menú y carta, además, cuántos pases o bloques quieres (de 2 a 8), cómo se llama cada uno y cuántos platos lleva. Pulsa <strong>Empezar</strong>. Esto lo decides tú y el asistente no lo puede cambiar: solo lo rellena. Las recetas se escriben siempre para UNA ración (en Sala, una copa).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>La conversación.</strong> Cuéntale con tus palabras lo que buscas («un entrante de otoño con calabaza»). Te da dos o tres caminos distintos con su porqué y cantidades aproximadas, te dice cuál elegiría y qué puede salir mal, y acaba con una pregunta. Contesta, pide cambios, y envía con <strong>Enviar</strong> (Enter envía; Mayúsculas + Enter hace un salto de línea). Cuando tiene lo que necesita, lo dice: «Ya tengo lo que necesito».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Crear el plato con su escandallo</strong> (según el caso: <strong>Crear la elaboración</strong>, <strong>Crear la bebida</strong> o <strong>Crear la preparación</strong>). La app casa cada ingrediente con los tuyos, convierte las unidades (el asistente piensa en gramos y tú compras en kilos), calcula el coste con tus precios y escribe la ficha. El precio de venta es el del encargo. Si el plato lleva partes que se hacen aparte (una salsa, un jarabe), crea también esas elaboraciones y te cuenta si van al stock o se montan al momento.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Pulsa <strong>Ver la ficha</strong> para abrirla en el Escandallo. Si sale cara, <strong>Hablar del coste</strong> retoma la conversación con los números reales. <strong>Hacer una variante</strong> (sin gluten, para el menú del día…) crea una prueba nueva a partir de la ficha sin pisar la original. Puedes volver a pedir «Crear» y se reescribe la misma ficha, sin duplicarla.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>En una elaboración base, di cuánto sale («salen 3 L»). Si no lo dices en la conversación, la app apunta 1 L y tendrás que corregirlo en la ficha, y con él se descuadra el coste de todos los platos que la usen.</div>
<h4>Cómo juzga la app lo que propone</h4>
<p>Antes de que lo veas, la app comprueba la propuesta contra los datos de tu negocio. Si algo falla, se lo devuelve una vez al asistente para que lo corrija. Lo que siga sin cuadrar sale en rojo bajo <strong>Comprobado con tus datos: esto no cuadra</strong>; si todo está bien, ves <strong>Comprobado con tus datos: todo cuadra</strong>. Mide:</p>
<ul>
<li>El food cost contra tu objetivo, tanto si se pasa como si queda muy por debajo (suele ser una ración corta o media receta que falta).</li>
<li>Un coste de 0 €: significa que ningún ingrediente se ha podido casar con los tuyos.</li>
<li>Técnicas que tu equipamiento niega expresamente.</li>
<li>Tus dietas obligatorias (sin gluten, vegetariana) y los alérgenos, calculados desde tus ingredientes.</li>
<li>La temporada del mes, si en Producto dices que trabajas de temporada o de mercado.</li>
<li>En menús y cartas: el coste del menú ENTERO por comensal, platos repetidos, bases repetidas, la carga de trabajo al momento frente a tu equipo y que salgan los platos que pediste.</li>
</ul>
<p>Los ingredientes que no tienes dados de alta salen en <strong>Ingredientes que no tienes todavía</strong> y no cuentan en el coste. Dalos de alta en la Mega Lista y el escandallo se recalcula solo.</p>
<h4>Menús y cartas: dos caminos</h4>
<p>Tras el encargo eliges: <strong>Usar platos que ya tengo</strong> (eliges de tus platos escandallados los de cada bloque, hasta el número que fijaste, y pulsas <strong>Montar con estos</strong>) o <strong>Crear platos nuevos</strong>. En este segundo caso el asistente propone solo el nombre y una línea de cada plato y SE PARA. No crea nada hasta que pulses <strong>Me vale: crea las fichas</strong>; si no te convence, <strong>Que proponga otros</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La carta que crea I+D nace activa todos los días y todo el día. Entra en Oferta y ponle su horario antes de dejarla así. Un menú no se activa solo: lo montas tú en Oferta → Menús cuando quieras.</div>
<h4>Sala: lo suyo</h4>
<p>I+D de Sala tiene su propio ADN, sus reglas de barra (equilibrio, técnicas, hielo y copa, sin alcohol) y sus propias carpetas. Los <strong>Maridajes</strong> funcionan así: marcas los platos de la carta de la cocina (solo se leen, no se toca nada de Cocina), eliges <strong>Qué quieres que proponga</strong> (<strong>Vino, cóctel y sin alcohol</strong>, <strong>Solo vino</strong>, <strong>Solo cócteles</strong> o <strong>Solo sin alcohol</strong>), si quieres una nota, y pulsas <strong>Pedir los maridajes</strong>. Para cada plato propone hasta dos bebidas con su porqué y una alternativa sin alcohol, y te dice si ya la tienes (<strong>En tu carta</strong>, <strong>La tienes</strong>) o <strong>No la tienes</strong>. De un cóctel que no tienes, <strong>Crearla con I+D</strong> abre una bebida nueva con la idea ya escrita. Con <strong>Retocar</strong> pides cambios y con <strong>Imprimir</strong> sacas la hoja.</p>
<h4>Mi cuaderno y carpetas</h4>
<p>Todo lo que empiezas queda en <strong>Mi cuaderno</strong>, el último movido primero, con su estado: <strong>Sin empezar</strong>, <strong>En conversación</strong>, <strong>Listo para crear</strong> o <strong>Creado</strong>. Se sincroniza con la nube y sobrevive a cerrar la tablet a medias. Púlsalo y sigue donde lo dejaste (<strong>Seguir</strong>). Filtra por tipo con <strong>Todo tipo</strong>. Para ordenarlo, <strong>Nueva carpeta</strong>; cada trabajo tiene un selector para moverlo (<strong>Sin clasificar</strong> es donde caen los nuevos) y el menú ⋯ permite <strong>Renombrar carpeta</strong> y <strong>Eliminar</strong>. Borrar una carpeta no borra los trabajos: pasan a Sin clasificar. Cocina y Sala tienen cada una sus carpetas y sus trabajos. Cada trabajo se puede imprimir.</p>
<h4>Lo que conviene saber</h4>
<ul>
<li>Sin clave el módulo se abre y ves lo ya creado, pero no puedes conversar. Aparece un aviso con <strong>Activar el asistente</strong>.</li>
<li>Lo que se manda a tu proveedor de IA son tus datos de negocio (ADN, ingredientes con precio, carta, ventas): es lo que le permite hablar de TU cocina.</li>
<li>Quedan <strong>N consultas</strong> hoy: el contador está junto al botón de enviar. Se reinicia cada día.</li>
<li>El asistente puede equivocarse. Revisa siempre la receta y los alérgenos antes de usar una ficha en servicio.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li>«El asistente no está activado en este dispositivo»: falta la clave en este aparato (se pone en cada uno).</li>
<li>«La clave no es válida»: revísala en <strong>Mi Negocio → Asistente de IA</strong>.</li>
<li>«Ese modelo ya no existe»: pulsa <strong>Ver modelos disponibles</strong> y elige otro.</li>
<li>«Tu proveedor ha cortado por consumo» o «Sin conexión»: espera un rato o comprueba internet.</li>
<li>«El asistente ha tardado demasiado» o «se ha quedado sin espacio para contestar»: inténtalo otra vez con algo más corto.</li>
<li>Primero rellena el ADN gastronómico: el aviso te dice qué campos faltan.</li>
<li>El coste sale a 0 €: ningún ingrediente se ha casado. Mira <strong>Ingredientes que no tienes todavía</strong>.</li>
<li>Para el detalle técnico de un fallo, abre <strong>Ver el detalle técnico del último fallo</strong> y pásaselo a quien te dé soporte.</li>
</ul>`,
    ca:`<h3>Un cap de cuina (o de barra) amb qui pensar, que sap el que et costa cada cosa</h3>
<p>R+D és un assistent d'IA per crear: <strong>elaboracions base</strong>, <strong>plats</strong>, <strong>menús</strong> i <strong>cartes</strong>. A Sala crea còctels i begudes, preparacions de barra, maridatges i cartes de begudes. Conversa amb tu com ho faria un cap de cuina i et proposa camins amb el seu perquè. Quan decidiu, l'app escriu la fitxa i calcula el cost amb ELS TEUS ingredients i ELS TEUS preus. La IA posa les idees; els números els posa l'app. I no es crea res fins que tu ho demanes.</p>
<p>Només el veuen el propietari i els empleats amb permís d'edició.</p>
<h4>Abans de començar: dues coses</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Activa l'assistent.</strong> És cosa del propietari: <strong>Gestió → El Meu Negoci → Assistent d'IA</strong> (a R+D, el botó <strong>Assistent</strong> t'hi porta). Tria proveïdor (<strong>Google (Gemini)</strong>, <strong>Anthropic (Claude)</strong> o <strong>OpenAI (ChatGPT)</strong>), enganxa la teva clau, prem <strong>Desar</strong> i després <strong>Provar la connexió</strong>. La de Google és gratuïta i es treu en dos minuts; cada proveïdor explica els passos sota el camp de la clau. Si el model deixa d'existir, <strong>Veure models disponibles</strong> et deixa triar-ne un altre.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Omple l'ADN gastronòmic.</strong> Prem <strong>Definir l'ADN</strong> (després, <strong>Editar</strong>). És obligatori: sense ell, no es comença res. El mínim és <strong>Cuina i tradició</strong>, <strong>Nivell</strong> i <strong>Públic</strong> (a Sala, <strong>Tipus de local i estil</strong>, <strong>Nivell</strong> i <strong>Públic</strong>). Com més omplis, millor: <strong>Producte insígnia</strong>, <strong>Línies vermelles</strong> (el que mai t'ha de proposar), <strong>Food cost objectiu</strong>, <strong>Equipament</strong>, <strong>Equip a partida</strong>, <strong>Producte</strong>, <strong>Dietes obligatòries</strong> i <strong>Idioma dels plats</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La clau és teva. Es desa només en aquest dispositiu (no al núvol, i el teu personal no la pot llegir) i el consum va al teu compte del proveïdor, no passa per GastroGoan. Si fas servir l'app a tauleta i mòbil, posa-la a cadascun. L'API de Claude i la de ChatGPT es paguen per ús i no vénen incloses a les subscripcions Claude Pro ni ChatGPT Plus. Hi ha un límit de 500 consultes al dia per dispositiu.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Sigues concret a l'ADN: «catalana de mercat amb tocs de brasa» diu molt més que «mediterrània». I a Equipament escriu «sense» davant del que NO tens («Sense Roner ni deshidratador»): així no et proposarà aquestes tècniques.</div>
<h4>Què pots crear</h4>
<table><thead><tr><th>Botó</th><th>Què fa i on acaba</th></tr></thead><tbody><tr><td><strong>Nova elaboració base</strong> (Sala: <strong>Preparació de barra</strong>)</td><td>Un fons, una salsa mare, un xarop. Queda a Escandall i Fitxes Tècniques, pestanya Elaboracions, i a l'Estoc.</td></tr><tr><td><strong>Nou plat</strong> (Sala: <strong>Còctel o beguda</strong>)</td><td>Un plat o beguda sencer, amb fitxa i escandall.</td></tr><tr><td><strong>Nou menú</strong> (només Cuina)</td><td>Crea els plats amb la seva fitxa. El menú el muntes tu després a Oferta → Menús.</td></tr><tr><td><strong>Nova carta</strong> (Sala: <strong>Carta de begudes</strong>)</td><td>Crea els plats i una carta real a Oferta, amb les seves seccions.</td></tr><tr><td><strong>Maridatges</strong> (només Sala)</td><td>Què beure amb cada plat de la cuina. No canvia res, és una consulta.</td></tr></tbody></table>
<h4>Com es crea alguna cosa, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem el tipus que vulguis. Primer va <strong>L'encàrrec</strong>: el <strong>preu de venda sense IVA</strong> i el <strong>food cost objectiu (%)</strong> (si ja el vas posar a l'ADN, surt posat). A menú i carta, a més, quants passis o blocs vols (de 2 a 8), com es diu cadascun i quants plats porta. Prem <strong>Començar</strong>. Això ho decideixes tu i l'assistent no ho pot canviar: només ho omple. Les receptes s'escriuen sempre per a UNA ració (a Sala, una copa).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>La conversa.</strong> Explica-li amb les teves paraules el que busques («un entrant de tardor amb carbassa»). Et dona dos o tres camins diferents amb el seu perquè i quantitats aproximades, et diu quin triaria i què pot sortir malament, i acaba amb una pregunta. Contesta, demana canvis, i envia amb <strong>Enviar</strong> (Enter envia; Majúscules + Enter fa un salt de línia). Quan té el que necessita, ho diu: «Ja tinc el que necessito».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Crear el plat amb el seu escandall</strong> (segons el cas: <strong>Crear l'elaboració</strong>, <strong>Crear la beguda</strong> o <strong>Crear la preparació</strong>). L'app casa cada ingredient amb els teus, converteix les unitats (l'assistent pensa en grams i tu compres en quilos), calcula el cost amb els teus preus i escriu la fitxa. El preu de venda és el de l'encàrrec. Si el plat porta parts que es fan a part (una salsa, un xarop), crea també aquestes elaboracions i t'explica si van a l'estoc o es munten al moment.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Prem <strong>Veure la fitxa</strong> per obrir-la a l'Escandall. Si surt cara, <strong>Parlar del cost</strong> reprèn la conversa amb els números reals. <strong>Fer una variant</strong> (sense gluten, per al menú del dia…) crea una prova nova a partir de la fitxa sense trepitjar l'original. Pots tornar a demanar «Crear» i es reescriu la mateixa fitxa, sense duplicar-la.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>En una elaboració base, digues quant en surt («en surten 3 L»). Si no ho dius a la conversa, l'app apunta 1 L i l'hauràs de corregir a la fitxa, i amb això es descuadra el cost de tots els plats que la facin servir.</div>
<h4>Com jutja l'app el que proposa</h4>
<p>Abans que ho vegis, l'app comprova la proposta amb les dades del teu negoci. Si alguna cosa falla, la hi torna una vegada a l'assistent perquè la corregeixi. El que continuï sense quadrar surt en vermell sota <strong>Comprovat amb les teves dades: això no quadra</strong>; si tot és correcte, veus <strong>Comprovat amb les teves dades: tot quadra</strong>. Mesura:</p>
<ul>
<li>El food cost contra el teu objectiu, tant si se'n passa com si queda molt per sota (sol ser una ració curta o mitja recepta que falta).</li>
<li>Un cost de 0 €: vol dir que cap ingredient s'ha pogut casar amb els teus.</li>
<li>Tècniques que el teu equipament nega expressament.</li>
<li>Les teves dietes obligatòries (sense gluten, vegetariana) i els al·lèrgens, calculats des dels teus ingredients.</li>
<li>La temporada del mes, si a Producte dius que treballes de temporada o de mercat.</li>
<li>A menús i cartes: el cost del menú SENCER per comensal, plats repetits, bases repetides, la càrrega de feina al moment davant del teu equip i que surtin els plats que vas demanar.</li>
</ul>
<p>Els ingredients que no tens donats d'alta surten a <strong>Ingredients que encara no tens</strong> i no compten al cost. Dona'ls d'alta a la Mega Llista i l'escandall es recalcula sol.</p>
<h4>Menús i cartes: dos camins</h4>
<p>Després de l'encàrrec tries: <strong>Fer servir plats que ja tinc</strong> (tries dels teus plats escandallats els de cada bloc, fins al nombre que vas fixar, i prems <strong>Muntar amb aquests</strong>) o <strong>Crear plats nous</strong>. En aquest segon cas l'assistent proposa només el nom i una línia de cada plat i S'ATURA. No crea res fins que premis <strong>Em va bé: crea les fitxes</strong>; si no et convenç, <strong>Que en proposi d'altres</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La carta que crea R+D neix activa tots els dies i tot el dia. Entra a Oferta i posa-li el seu horari abans de deixar-la així. Un menú no s'activa sol: el muntes tu a Oferta → Menús quan vulguis.</div>
<h4>Sala: el que és seu</h4>
<p>R+D de Sala té el seu propi ADN, les seves regles de barra (equilibri, tècniques, gel i copa, sense alcohol) i les seves pròpies carpetes. Els <strong>Maridatges</strong> funcionen així: marques els plats de la carta de la cuina (només es llegeixen, no es toca res de Cuina), tries <strong>Què vols que proposi</strong> (<strong>Vi, còctel i sense alcohol</strong>, <strong>Només vi</strong>, <strong>Només còctels</strong> o <strong>Només sense alcohol</strong>), si vols una nota, i prems <strong>Demanar els maridatges</strong>. Per a cada plat proposa fins a dues begudes amb el seu perquè i una alternativa sense alcohol, i et diu si ja la tens (<strong>A la teva carta</strong>, <strong>La tens</strong>) o <strong>No la tens</strong>. D'un còctel que no tens, <strong>Crear-la amb R+D</strong> obre una beguda nova amb la idea ja escrita. Amb <strong>Retocar</strong> demanes canvis i amb <strong>Imprimir</strong> treus el full.</p>
<h4>La meva llibreta i carpetes</h4>
<p>Tot el que comences queda a <strong>La meva llibreta</strong>, l'últim mogut primer, amb el seu estat: <strong>Sense començar</strong>, <strong>En conversa</strong>, <strong>A punt per crear</strong> o <strong>Creat</strong>. Se sincronitza amb el núvol i sobreviu a tancar la tauleta a mitges. Prem-lo i continua on ho vas deixar (<strong>Continuar</strong>). Filtra per tipus amb <strong>Tot tipus</strong>. Per ordenar-ho, <strong>Nova carpeta</strong>; cada treball té un selector per moure'l (<strong>Sense classificar</strong> és on cauen els nous) i el menú ⋯ permet <strong>Reanomenar carpeta</strong> i <strong>Eliminar</strong>. Esborrar una carpeta no esborra els treballs: passen a Sense classificar. Cuina i Sala tenen cadascuna les seves carpetes i els seus treballs. Cada treball es pot imprimir.</p>
<h4>El que convé saber</h4>
<ul>
<li>Sense clau el mòdul s'obre i veus el que ja has creat, però no pots conversar. Apareix un avís amb <strong>Activar l'assistent</strong>.</li>
<li>El que s'envia al teu proveïdor d'IA són dades del teu negoci (ADN, ingredients amb preu, carta, vendes): és el que li permet parlar de LA TEVA cuina.</li>
<li>Et queden <strong>N consultes</strong> avui: el comptador és al costat del botó d'enviar. Es reinicia cada dia.</li>
<li>L'assistent es pot equivocar. Revisa sempre la recepta i els al·lèrgens abans de fer servir una fitxa en servei.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li>«L'assistent no està activat en aquest dispositiu»: falta la clau en aquest aparell (es posa a cadascun).</li>
<li>«La clau no és vàlida»: revisa-la a <strong>El Meu Negoci → Assistent d'IA</strong>.</li>
<li>«Aquest model ja no existeix»: prem <strong>Veure models disponibles</strong> i tria'n un altre.</li>
<li>«El teu proveïdor ha tallat per consum» o «Sense connexió»: espera una estona o comprova internet.</li>
<li>«L'assistent ha trigat massa» o «s'ha quedat sense espai per contestar»: torna-ho a provar amb alguna cosa més curta.</li>
<li>Primer omple l'ADN gastronòmic: l'avís et diu quins camps falten.</li>
<li>El cost surt a 0 €: cap ingredient s'ha casat. Mira <strong>Ingredients que encara no tens</strong>.</li>
<li>Per al detall tècnic d'un error, obre <strong>Veure el detall tècnic de l'últim error</strong> i passa'l a qui et doni suport.</li>
</ul>`,
    en:`<h3>A head chef (or head bartender) to think with, who knows what everything costs you</h3>
<p>R&amp;D is an AI assistant for creating <strong>base preps</strong>, <strong>dishes</strong>, <strong>set menus</strong> and <strong>menus</strong>. In Floor it creates cocktails and drinks, bar preparations, pairings and drinks menus. It talks to you the way a head chef would and suggests routes with the reasoning behind each. Once you decide, the app writes the sheet and works out the cost with YOUR ingredients and YOUR prices. The AI supplies the ideas; the app supplies the numbers. And nothing is created until you ask for it.</p>
<p>Only the owner and employees with edit permission can see it.</p>
<h4>Before you start: two things</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Switch the assistant on.</strong> This is for the owner: <strong>Management → My Business → AI assistant</strong> (in R&amp;D, the <strong>Assistant</strong> button takes you there). Choose a provider (<strong>Google (Gemini)</strong>, <strong>Anthropic (Claude)</strong> or <strong>OpenAI (ChatGPT)</strong>), paste your key, press <strong>Save</strong> and then <strong>Test the connection</strong>. Google's is free and takes two minutes; each provider explains the steps under the key field. If the model stops existing, <strong>See available models</strong> lets you pick another.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Fill in the Culinary DNA.</strong> Press <strong>Define the DNA</strong> (later, <strong>Edit</strong>). It is required: without it, nothing can be started. The minimum is <strong>Cuisine and tradition</strong>, <strong>Level</strong> and <strong>Clientele</strong> (in Floor, <strong>Venue type and style</strong>, <strong>Level</strong> and <strong>Clientele</strong>). The more you fill in, the better: <strong>Signature product</strong>, <strong>Red lines</strong> (what it must never suggest), <strong>Target food cost</strong>, <strong>Equipment</strong>, <strong>Kitchen brigade</strong>, <strong>Produce</strong>, <strong>Required diets</strong> and <strong>Language of dish names</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The key is yours. It is stored only on this device (not in the cloud, and your staff cannot read it) and the usage goes to your own account with the provider, not through GastroGoan. If you use the app on a tablet and a phone, enter it on each. The Claude and ChatGPT APIs are pay-as-you-go and are not included in Claude Pro or ChatGPT Plus subscriptions. There is a limit of 500 queries a day per device.</div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Be specific in the DNA: «Catalan market cooking with grill accents» says far more than «Mediterranean». And in Equipment write «no» before what you do NOT have («No sous-vide or dehydrator»): then it will not suggest those techniques.</div>
<h4>What you can create</h4>
<table><thead><tr><th>Button</th><th>What it does and where it ends up</th></tr></thead><tbody><tr><td><strong>New base prep</strong> (Floor: <strong>Bar preparation</strong>)</td><td>A stock, a mother sauce, a syrup. It goes to Costing and Technical Sheets, Preparations tab, and to Stock.</td></tr><tr><td><strong>New dish</strong> (Floor: <strong>Cocktail or drink</strong>)</td><td>A whole dish or drink, with sheet and costing.</td></tr><tr><td><strong>New set menu</strong> (Kitchen only)</td><td>Creates the dishes with their sheets. You assemble the set menu yourself later in Menu Offering → Set Menus.</td></tr><tr><td><strong>New menu</strong> (Floor: <strong>Drinks menu</strong>)</td><td>Creates the dishes and a real menu in Offering, with its sections.</td></tr><tr><td><strong>Pairings</strong> (Floor only)</td><td>What to drink with each kitchen dish. It changes nothing; it is a consultation.</td></tr></tbody></table>
<h4>How to create something, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Press the type you want. First comes <strong>The brief</strong>: the <strong>selling price excl. VAT</strong> and the <strong>target food cost (%)</strong> (if you already set it in the DNA, it is filled in). For set menus and menus you also say how many courses or sections you want (2 to 8), what each is called and how many dishes it holds. Press <strong>Start</strong>. You decide this and the assistant cannot change it: it only fills it in. Recipes are always written for ONE portion (in Floor, one drink).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>The conversation.</strong> Tell it in your own words what you are after («an autumn starter with pumpkin»). It gives you two or three different routes with the reasoning and approximate quantities, tells you which one it would pick and what could go wrong, and ends with a question. Answer, ask for changes, and send with <strong>Send</strong> (Enter sends; Shift + Enter makes a new line). When it has what it needs, it says so: «I have what I need».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>Create the dish with its costing</strong> (depending on the case: <strong>Create the prep</strong>, <strong>Create the drink</strong> or <strong>Create the preparation</strong>). The app matches each ingredient to yours, converts the units (the assistant thinks in grams and you buy in kilos), works out the cost with your prices and writes the sheet. The selling price is the one from the brief. If the dish has parts made separately (a sauce, a syrup), it creates those preps too and tells you whether they go into stock or are made to order.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Press <strong>Open the sheet</strong> to see it in Costing. If it comes out expensive, <strong>Talk about the cost</strong> picks the conversation up with the real numbers. <strong>Make a variant</strong> (gluten free, for the set lunch…) creates a new experiment from the sheet without overwriting the original. You can press «Create» again and the same sheet is rewritten, not duplicated.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>For a base prep, say how much it makes («it makes 3 L»). If you do not say it in the conversation, the app records 1 L and you will have to fix it in the sheet, which throws off the cost of every dish that uses it.</div>
<h4>How the app judges what it suggests</h4>
<p>Before you see it, the app checks the proposal against your business data. If something fails, it sends it back to the assistant once to be corrected. Whatever still does not add up shows in red under <strong>Checked against your data: this does not add up</strong>; if all is well you see <strong>Checked against your data: it all adds up</strong>. It measures:</p>
<ul>
<li>Food cost against your target, both when it goes over and when it comes in far under (usually a small portion or half a recipe missing).</li>
<li>A cost of €0: it means no ingredient could be matched to yours.</li>
<li>Techniques your equipment expressly rules out.</li>
<li>Your required diets (gluten free, vegetarian) and allergens, worked out from your ingredients.</li>
<li>The month's seasonality, if under Produce you say you work seasonally or from the market.</li>
<li>For set menus and menus: the cost of the WHOLE set menu per cover, repeated dishes, repeated bases, à la minute workload against your team, and that the dishes you asked for all came out.</li>
</ul>
<p>Ingredients you have not registered show under <strong>Ingredients you do not have yet</strong> and do not count towards the cost. Add them to the Mega List and the costing updates itself.</p>
<h4>Set menus and menus: two routes</h4>
<p>After the brief you choose: <strong>Use dishes I already have</strong> (from your costed dishes you pick those for each section, up to the number you set, and press <strong>Build with these</strong>) or <strong>Create new dishes</strong>. In the second case the assistant proposes only the name and one line per dish and STOPS. It creates nothing until you press <strong>Good: write the sheets</strong>; if you are not convinced, <strong>Propose others</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The menu R&amp;D creates is active every day, all day. Go to Offering and set its schedule before leaving it like that. A set menu does not switch on by itself: you assemble it yourself in Offering → Set Menus when you want.</div>
<h4>Floor: its own thing</h4>
<p>Floor R&amp;D has its own DNA, its own bar rules (balance, techniques, ice and glass, alcohol-free) and its own folders. <strong>Pairings</strong> work like this: you tick the dishes on the kitchen menu (they are only read; nothing in Kitchen is touched), choose <strong>What should it suggest</strong> (<strong>Wine, cocktail and alcohol-free</strong>, <strong>Wine only</strong>, <strong>Cocktails only</strong> or <strong>Alcohol-free only</strong>), add a note if you like, and press <strong>Ask for the pairings</strong>. For each dish it suggests up to two drinks with the reasoning and an alcohol-free alternative, and tells you whether you already have it (<strong>On your menu</strong>, <strong>You stock it</strong>) or <strong>Not in stock</strong>. For a cocktail you do not have, <strong>Create it with R&amp;D</strong> opens a new drink with the idea already written. <strong>Adjust</strong> asks for changes and <strong>Print</strong> gives you the sheet.</p>
<h4>My notebook and folders</h4>
<p>Everything you start stays in <strong>My notebook</strong>, most recent first, with its status: <strong>Not started</strong>, <strong>In conversation</strong>, <strong>Ready to create</strong> or <strong>Created</strong>. It syncs with the cloud and survives closing the tablet halfway. Tap one and carry on where you left off (<strong>Continue</strong>). Filter by type with <strong>All types</strong>. To keep order, <strong>New folder</strong>; each piece of work has a selector to move it (<strong>Unfiled</strong> is where new ones land) and the ⋯ menu offers <strong>Rename folder</strong> and <strong>Delete</strong>. Deleting a folder does not delete the work: it moves to Unfiled. Kitchen and Floor each have their own folders and work. Each piece can be printed.</p>
<h4>Good to know</h4>
<ul>
<li>Without a key the module opens and you can see what has been created, but you cannot chat. A notice with <strong>Switch the assistant on</strong> appears.</li>
<li>What is sent to your AI provider is your business data (DNA, ingredients with prices, menu, sales): that is what lets it talk about YOUR kitchen.</li>
<li>It shows <strong>N queries left today</strong> next to the send button. It resets every day.</li>
<li>The assistant can make mistakes. Always check the recipe and the allergens before using a sheet in service.</li>
</ul>
<h4>If something does not work</h4>
<ul>
<li>«The assistant is not switched on on this device»: the key is missing on this device (enter it on each one).</li>
<li>«The key is not valid»: check it in <strong>My Business → AI assistant</strong>.</li>
<li>«That model no longer exists»: press <strong>See available models</strong> and pick another.</li>
<li>«Your provider has cut you off for usage» or «No connection»: wait a while or check the internet.</li>
<li>«The assistant took too long» or «ran out of room to answer»: try again with something shorter.</li>
<li>Fill in the culinary DNA first: the notice tells you which fields are missing.</li>
<li>The cost comes to €0: no ingredient was matched. Look at <strong>Ingredients you do not have yet</strong>.</li>
<li>For the technical detail of a failure, open <strong>See the technical detail of the last error</strong> and pass it to whoever gives you support.</li>
</ul>`}
  },
  {id:'stock', area:'cocina',
    title:{es:`<i class="ti ti-package"></i> Stock`, ca:`<i class="ti ti-package"></i> Estoc`, en:`<i class="ti ti-package"></i> Stock`},
    content:{es:`<h3>Saber qué tienes y cuándo se te va a acabar</h3>
<p>Stock lleva las existencias de cada producto de tu Mega Lista y de tus elaboraciones, y te avisa de lo que está por debajo del mínimo que tú fijas. No tienes que actualizarlo a mano cada vez que vendes o recibes algo: se mueve solo con el TPV y con Pedidos. Cocina y Sala llevan cada una su stock.</p>
<h4>Lo que ves al entrar</h4>
<ul>
<li>Arriba, un resumen: <strong>Productos</strong>, <strong>Elaboraciones</strong> (en Sala, <strong>Preparaciones</strong>), <strong>Bajo mínimo</strong> y <strong>Valor del stock</strong>. Pulsa <strong>Bajo mínimo</strong> para ver solo lo que falta; <strong>Valor del stock</strong> (propietario y empleados con permiso de edición) abre el desglose en euros.</li>
<li>Dos pestañas: <strong>Ingredientes</strong> y <strong>Elaboraciones</strong> (en Sala, <strong>Productos</strong> y <strong>Preparaciones</strong>). Un número rojo en la pestaña indica cuántos están bajo mínimo.</li>
<li>Los productos están en carpetas por categoría; cada carpeta dice cuántos hay y cuántos están bajo mínimo. Dentro, lo que pide atención sale primero. Cada producto es una tarjeta: en <strong>rojo</strong> si está por debajo del mínimo («Falta 3 kg») y en <strong>verde</strong> cuando llega al mínimo o lo supera, con cuánto tienes de más («+2 kg sobre el mínimo» o «En el mínimo»). Sin mínimo puesto no se pinta nada.</li>
<li>El buscador y la casilla <strong>Solo alertas</strong> saltan las carpetas y te dan una lista directa.</li>
</ul>
<h4>Cada fila</h4>
<table><thead><tr><th>Elemento</th><th>Qué hace</th></tr></thead><tbody><tr><td>Nombre y estado</td><td>«Falta 3 L» (rojo) cuando hay menos que el mínimo; «+N en camino» si hay un pedido enviado sin recibir; «sin mínimo» si no has puesto ninguno.</td></tr><tr><td><strong>Actual</strong> con − y +</td><td>Cuenta existencias. Sube o baja de 1 en 1 (de 100 en 100 en g y ml). Espera un momento tras el último toque y guarda UNA vez. Si escribes la cantidad a mano, guarda al instante.</td></tr><tr><td><strong>Mínimo</strong></td><td>Está bloqueado (en gris). Pulsa el lápiz, escribe y Enter para guardar (Esc cancela). Sin permiso verás un candado.</td></tr><tr><td>⋯</td><td><strong>Anotar merma</strong> de ese producto, <strong>Historial de este producto</strong>, <strong>Ver en Mega Lista</strong> y, en una elaboración, ir a su ficha del Escandallo.</td></tr></tbody></table>
<p>En PC y tablet las filas van de dos en dos; en móvil, una a una con el mínimo y el ⋯ plegados (toca la fila o la flecha para verlos).</p>
<h4>Ponerlo en marcha, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Cuenta lo que hay y escribe la cantidad en <strong>Actual</strong> de cada producto, o ajústala con − y +.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pulsa el lápiz de <strong>Mínimo</strong> y pon la cantidad por debajo de la cual quieres el aviso. Piensa en cuánto gastas y en cuántos días tarda en llegar ese proveedor. Sin mínimo no hay alertas ni sugerencias de pedido.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Antes de pedir, mira <strong>Bajo mínimo</strong>. Si hay alertas aparece <strong>Pedir lo que falta</strong>, que te lleva a Pedidos.</div></div>
<h4>Cómo se mueve solo</h4>
<ul>
<li><strong>Baja</strong> al cobrar una venta en el TPV: se descuenta de cada ingrediente la cantidad bruta del escandallo (con su merma) por las unidades vendidas. Si el plato lleva una elaboración base, baja el stock de la elaboración. El TPV avisa si no hay stock suficiente para algo que vas a comandar.</li>
<li><strong>Sube</strong> al marcar un pedido como <strong>Recibido</strong> (solo lo que marcaste como llegado) o al guardar una factura leída con la opción de entrar en el stock.</li>
<li>Las elaboraciones aparecen solas cuando guardas una elaboración base en el Escandallo (o la crea I+D).</li>
</ul>
<p>El stock es una estimación: lo que se rompe, se tira o se come el personal no baja solo. Para eso están las mermas y los recuentos.</p>
<h4>Mermas e historial</h4>
<p><strong>Anotar merma</strong> está siempre a la vista. Elige el producto, la cantidad tirada y el motivo; ves el coste aproximado con el precio de la Mega Lista y se descuenta del stock. Motivos en Cocina: <strong>Caducado</strong>, <strong>En mal estado</strong>, <strong>Sobreproducción</strong>, <strong>Error</strong>, <strong>Devolución</strong>, <strong>Consumo propio del titular</strong>, <strong>Comida del personal</strong> y <strong>Otro</strong> (escribes el tuyo). En Sala, en vez de sobreproducción: <strong>Rotura de botella o cristalería</strong> e <strong>Invitación a un cliente</strong>.</p>
<p>En el ⋯ de arriba tienes <strong>Mermas</strong> (el informe: lo que más se tira, por motivo, al ritmo del año) e <strong>Historial</strong>: cada ajuste con fecha, hora, cantidad antes y después, cambio y quién lo hizo. Sirve para investigar descuadres.</p>
<h4>Lo que conviene saber</h4>
<table><thead><tr><th>Quién</th><th>Qué puede hacer</th></tr></thead><tbody><tr><td>Propietario y empleado con permiso de edición</td><td>Todo: cambiar mínimos, historial, informe de mermas, valor del stock.</td></tr><tr><td>Empleado sin permiso de edición</td><td>Contar existencias (− y +), anotar mermas, ver alertas y usar <strong>Pedir lo que falta</strong>. No cambia mínimos (ve un candado).</td></tr></tbody></table>
<ul>
<li>El stock nunca baja de cero.</li>
<li>Solo aparecen los productos activos de la Mega Lista del área en la que estás.</li>
<li>Si no hay nada, el aviso te lleva a la Mega Lista o al Escandallo para dar de alta productos o elaboraciones.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li>No baja con las ventas: el plato vendido no tiene escandallo (un plato manual de la carta no descuenta nada) o sus ingredientes no están vinculados.</li>
<li>No puedo cambiar el mínimo: tienes un candado porque no tienes permiso de edición. Pídeselo al propietario.</li>
<li>Una cantidad cambió sola: mira el <strong>Historial</strong>; habrá sido una venta, una recepción de pedido o una merma.</li>
<li>No encuentro un producto: puede estar en otra carpeta, en el otro área (Cocina o Sala) o dado de baja en la Mega Lista.</li>
<li>No aparece la pestaña de elaboraciones llena: guarda la elaboración base en el Escandallo y saldrá aquí.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Haz un recuento corto cada semana de lo más caro y ajusta con − y +. Cada ajuste queda en el Historial, así sabrás cuánto se te escapa.</div>`,
    ca:`<h3>Saber què tens i quan se t'acabarà</h3>
<p>Estoc porta les existències de cada producte de la teva Mega Llista i de les teves elaboracions, i t'avisa del que és per sota del mínim que fixes tu. No l'has d'actualitzar a mà cada cop que vens o reps alguna cosa: es mou sol amb el TPV i amb Comandes. Cuina i Sala porten cadascuna el seu estoc.</p>
<h4>El que veus en entrar</h4>
<ul>
<li>A dalt, un resum: <strong>Productes</strong>, <strong>Elaboracions</strong> (a Sala, <strong>Preparacions</strong>), <strong>Sota el mínim</strong> i <strong>Valor de l'estoc</strong>. Prem <strong>Sota el mínim</strong> per veure només el que falta; <strong>Valor de l'estoc</strong> (propietari i empleats amb permís d'edició) obre el desglossament en euros.</li>
<li>Dues pestanyes: <strong>Ingredients</strong> i <strong>Elaboracions</strong> (a Sala, <strong>Productes</strong> i <strong>Preparacions</strong>). Un número vermell a la pestanya indica quants són sota el mínim.</li>
<li>Els productes són en carpetes per categoria; cada carpeta diu quants n'hi ha i quants són sota el mínim. A dins, el que demana atenció surt primer. Cada producte és una targeta: en <strong>vermell</strong> si és per sota del mínim («Falten 3 kg») i en <strong>verd</strong> quan arriba al mínim o el supera, amb quant en tens de més («+2 kg sobre el mínim» o «Al mínim»). Sense mínim posat no es pinta res.</li>
<li>El cercador i la casella <strong>Només alertes</strong> salten les carpetes i et donen una llista directa.</li>
</ul>
<h4>Cada fila</h4>
<table><thead><tr><th>Element</th><th>Què fa</th></tr></thead><tbody><tr><td>Nom i estat</td><td>«Falten 3 L» (vermell) quan n'hi ha menys que el mínim; «+N en camí» si hi ha una comanda enviada sense rebre; «sense mínim» si no n'has posat cap.</td></tr><tr><td><strong>Actual</strong> amb − i +</td><td>Compta existències. Puja o baixa d'1 en 1 (de 100 en 100 en g i ml). Espera un moment després de l'últim toc i desa UNA vegada. Si escrius la quantitat a mà, desa a l'instant.</td></tr><tr><td><strong>Mínim</strong></td><td>Està bloquejat (en gris). Prem el llapis, escriu i Enter per desar (Esc cancel·la). Sense permís veuràs un cadenat.</td></tr><tr><td>⋯</td><td><strong>Anotar merma</strong> d'aquest producte, <strong>Historial d'aquest producte</strong>, <strong>Veure a Mega Llista</strong> i, en una elaboració, anar a la seva fitxa de l'Escandall.</td></tr></tbody></table>
<p>A PC i tauleta les files van de dues en dues; en mòbil, una a una amb el mínim i el ⋯ plegats (toca la fila o la fletxa per veure'ls).</p>
<h4>Posar-ho en marxa, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Compta el que hi ha i escriu la quantitat a <strong>Actual</strong> de cada producte, o ajusta-la amb − i +.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Prem el llapis de <strong>Mínim</strong> i posa la quantitat per sota de la qual vols l'avís. Pensa en quant gastes i en quants dies triga aquell proveïdor. Sense mínim no hi ha alertes ni suggeriments de comanda.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Abans de demanar, mira <strong>Sota el mínim</strong>. Si hi ha alertes apareix <strong>Demanar el que falta</strong>, que et porta a Comandes.</div></div>
<h4>Com es mou sol</h4>
<ul>
<li><strong>Baixa</strong> en cobrar una venda al TPV: es descompta de cada ingredient la quantitat bruta de l'escandall (amb la seva merma) per les unitats venudes. Si el plat porta una elaboració base, baixa l'estoc de l'elaboració. El TPV avisa si no hi ha prou estoc per a una cosa que vas a comandar.</li>
<li><strong>Puja</strong> en marcar una comanda com a <strong>Rebuda</strong> (només el que vas marcar com a arribat) o en desar una factura llegida amb l'opció d'entrar a l'estoc.</li>
<li>Les elaboracions apareixen soles quan deses una elaboració base a l'Escandall (o la crea R+D).</li>
</ul>
<p>L'estoc és una estimació: el que es trenca, es llença o menja el personal no baixa sol. Per a això hi ha les mermes i els recomptes.</p>
<h4>Mermes i historial</h4>
<p><strong>Anotar merma</strong> és sempre a la vista. Tria el producte, la quantitat llençada i el motiu; veus el cost aproximat amb el preu de la Mega Llista i es descompta de l'estoc. Motius a Cuina: <strong>Caducat</strong>, <strong>En mal estat</strong>, <strong>Sobreproducció</strong>, <strong>Error</strong>, <strong>Devolució</strong>, <strong>Consum propi del titular</strong>, <strong>Àpat del personal</strong> i <strong>Altre</strong> (escrius el teu). A Sala, en lloc de sobreproducció: <strong>Trencament d'ampolla o cristalleria</strong> i <strong>Invitació a un client</strong>.</p>
<p>Al ⋯ de dalt tens <strong>Mermes</strong> (l'informe: el que més es llença, per motiu, al ritme de l'any) i <strong>Historial</strong>: cada ajust amb data, hora, quantitat abans i després, canvi i qui el va fer. Serveix per investigar descaptaments.</p>
<h4>El que convé saber</h4>
<table><thead><tr><th>Qui</th><th>Què pot fer</th></tr></thead><tbody><tr><td>Propietari i empleat amb permís d'edició</td><td>Tot: canviar mínims, historial, informe de mermes, valor de l'estoc.</td></tr><tr><td>Empleat sense permís d'edició</td><td>Comptar existències (− i +), anotar mermes, veure alertes i fer servir <strong>Demanar el que falta</strong>. No canvia mínims (veu un cadenat).</td></tr></tbody></table>
<ul>
<li>L'estoc mai baixa de zero.</li>
<li>Només apareixen els productes actius de la Mega Llista de l'àrea on ets.</li>
<li>Si no hi ha res, l'avís et porta a la Mega Llista o a l'Escandall per donar d'alta productes o elaboracions.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li>No baixa amb les vendes: el plat venut no té escandall (un plat manual de la carta no descompta res) o els seus ingredients no estan vinculats.</li>
<li>No puc canviar el mínim: tens un cadenat perquè no tens permís d'edició. Demana'l al propietari.</li>
<li>Una quantitat ha canviat sola: mira l'<strong>Historial</strong>; haurà estat una venda, una recepció de comanda o una merma.</li>
<li>No trobo un producte: pot ser en una altra carpeta, a l'altra àrea (Cuina o Sala) o donat de baixa a la Mega Llista.</li>
<li>La pestanya d'elaboracions és buida: desa l'elaboració base a l'Escandall i sortirà aquí.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Fes un recompte curt cada setmana del més car i ajusta amb − i +. Cada ajust queda a l'Historial, així sabràs quant se't escapa.</div>`,
    en:`<h3>Knowing what you have and when it will run out</h3>
<p>Stock keeps the quantities of every product in your Mega List and of your preparations, and warns you about anything below the minimum you set. You do not have to update it by hand every time you sell or receive something: it moves by itself with the POS and with Orders. Kitchen and Floor each keep their own stock.</p>
<h4>What you see when you open it</h4>
<ul>
<li>At the top, a summary: <strong>Products</strong>, <strong>Elaborations</strong> (in Floor, <strong>Preparations</strong>), <strong>Below minimum</strong> and <strong>Stock value</strong>. Press <strong>Below minimum</strong> to see only what is short; <strong>Stock value</strong> (owner and employees with edit permission) opens the breakdown in euros.</li>
<li>Two tabs: <strong>Ingredients</strong> and <strong>Elaborations</strong> (in Floor, <strong>Products</strong> and <strong>Preparations</strong>). A red number on the tab shows how many are below minimum.</li>
<li>Products are in folders by category; each folder says how many there are and how many are below minimum. Inside, whatever needs attention comes first. Each product is a card: <strong>red</strong> when it is below the minimum («Short by 3 kg») and <strong>green</strong> once it reaches or exceeds it, saying how much extra you have («+2 kg above minimum» or «At minimum»). With no minimum set, nothing is coloured.</li>
<li>The search box and the <strong>Alerts only</strong> box skip the folders and give you a direct list.</li>
</ul>
<h4>Each row</h4>
<table><thead><tr><th>Element</th><th>What it does</th></tr></thead><tbody><tr><td>Name and status</td><td>«Short by 3 L» (red) when there is less than the minimum; «on the way» if a sent order has not arrived; «no minimum» if you have not set one.</td></tr><tr><td><strong>Current</strong> with − and +</td><td>Count stock. Goes up or down by 1 (by 100 for g and ml). It waits a moment after the last tap and saves ONCE. If you type the quantity by hand, it saves immediately.</td></tr><tr><td><strong>Minimum</strong></td><td>It is locked (grey). Press the pencil, type and Enter to save (Esc cancels). Without permission you will see a padlock.</td></tr><tr><td>⋯</td><td><strong>Log waste</strong> for that product, <strong>History of this product</strong>, <strong>See in Mega List</strong> and, for a preparation, go to its Costing sheet.</td></tr></tbody></table>
<p>On PC and tablet rows go two at a time; on a phone, one by one with the minimum and the ⋯ folded away (tap the row or the arrow to see them).</p>
<h4>Getting started, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Count what you have and type the quantity in <strong>Current</strong> for each product, or adjust it with − and +.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Press the <strong>Minimum</strong> pencil and enter the quantity below which you want a warning. Think about how much you use and how many days that supplier takes. With no minimum there are no alerts or order suggestions.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Before ordering, look at <strong>Below minimum</strong>. If there are alerts, <strong>Request what's needed</strong> appears and takes you to Orders.</div></div>
<h4>How it moves by itself</h4>
<ul>
<li><strong>It goes down</strong> when a sale is paid in the POS: each ingredient loses the gross quantity in the costing (including its waste) times the units sold. If the dish uses a base preparation, the preparation's stock goes down. The POS warns you if there is not enough stock for something you are about to order.</li>
<li><strong>It goes up</strong> when you mark an order as <strong>Received</strong> (only what you marked as arrived) or when you save a read invoice with the option to add it to stock.</li>
<li>Preparations appear by themselves when you save a base preparation in Costing (or R&amp;D creates it).</li>
</ul>
<p>Stock is an estimate: what breaks, gets thrown away or is eaten by staff does not go down by itself. That is what waste logs and counts are for.</p>
<h4>Waste and history</h4>
<p><strong>Log waste</strong> is always in view. Choose the product, the quantity thrown away and the reason; you see the approximate cost at the Mega List price and it is taken off stock. Reasons in Kitchen: <strong>Expired</strong>, <strong>Spoiled</strong>, <strong>Overproduction</strong>, <strong>Mistake</strong>, <strong>Sent back</strong>, <strong>Owner's own consumption</strong>, <strong>Staff meal</strong> and <strong>Other</strong> (you write your own). In Floor, instead of overproduction: <strong>Broken bottle or glassware</strong> and <strong>Comp for a customer</strong>.</p>
<p>In the ⋯ at the top you have <strong>Waste</strong> (the report: what is thrown away most, by reason, at the yearly rate) and <strong>History</strong>: every adjustment with date, time, quantity before and after, change and who did it. It helps investigate mismatches.</p>
<h4>Good to know</h4>
<table><thead><tr><th>Who</th><th>What they can do</th></tr></thead><tbody><tr><td>Owner and employee with edit permission</td><td>Everything: change minimums, history, waste report, stock value.</td></tr><tr><td>Employee without edit permission</td><td>Count stock (− and +), log waste, see alerts and use <strong>Request what's needed</strong>. They cannot change minimums (they see a padlock).</td></tr></tbody></table>
<ul>
<li>Stock never goes below zero.</li>
<li>Only the active Mega List products of the area you are in appear.</li>
<li>If there is nothing, the notice takes you to the Mega List or Costing to add products or preparations.</li>
</ul>
<h4>If something does not work</h4>
<ul>
<li>It does not go down with sales: the dish sold has no costing (a manual menu dish deducts nothing) or its ingredients are not linked.</li>
<li>I cannot change the minimum: you see a padlock because you do not have edit permission. Ask the owner.</li>
<li>A quantity changed by itself: look at the <strong>History</strong>; it will have been a sale, an order reception or waste.</li>
<li>I cannot find a product: it may be in another folder, in the other area (Kitchen or Floor) or discontinued in the Mega List.</li>
<li>The preparations tab is empty: save the base preparation in Costing and it will show up here.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Do a short count every week of the most expensive items and adjust with − and +. Every adjustment stays in the History, so you will know how much slips away.</div>`}
  },
  {id:'pedidos', area:'cocina',
    title:{es:`<i class="ti ti-shopping-cart"></i> Pedidos`, ca:`<i class="ti ti-shopping-cart"></i> Comandes (compres a proveïdors)`, en:`<i class="ti ti-shopping-cart"></i> Orders (supplier purchases)`},
    content:{es:`<h3>Del «se me acaba» al «ya ha llegado»</h3>
<p>Pedidos es donde compras a tus proveedores: preparas el pedido con lo que falta en el Stock, lo envías por WhatsApp o email, y cuando llega la mercancía la compruebas. Al recibirlo se actualizan solos el Stock, los precios y el gasto en Gestión Económica. Cocina y Sala llevan sus pedidos por separado.</p>
<p>Tiene tres pestañas:</p>
<table><thead><tr><th>Pestaña</th><th>Quién la ve</th><th>Para qué</th></tr></thead><tbody><tr><td><strong>Realizar Pedido</strong></td><td>Propietario y empleados con permiso de edición</td><td>Preparar y enviar un pedido real.</td></tr><tr><td><strong>Pedir lo que falta</strong></td><td>Empleados sin permiso de edición</td><td>Avisar de lo que falta (no es un pedido real).</td></tr><tr><td><strong>Historial de Pedidos</strong></td><td>Todos</td><td>Ver, recibir y revisar los pedidos.</td></tr></tbody></table>
<h4>Realizar un pedido, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">En <strong>Realizar Pedido</strong>, elige el <strong>Proveedor</strong> y la <strong>Fecha de entrega</strong>. No se puede pedir para hoy, y si el proveedor no reparte ese día la app pasa la fecha al siguiente día de reparto y te avisa. Verás sus días de reparto, la hora, el envío y si tiene WhatsApp (móvil) y email. Mientras no elijas ninguno, la pantalla te enseña una <strong>tarjeta por proveedor</strong> con cuántos artículos tiene y cuántos están bajo el mínimo (los que más faltan, primero): un toque y lo eliges.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Aparece su lista de la compra: cada artículo con el stock actual, el mínimo, bajo mínimo o +N en camino si procede, el precio y la cantidad con − y +. Filtra con <strong>Todos</strong>, <strong>Bajo mínimo</strong> o <strong>Con cantidad</strong>, o busca por nombre.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Sugerir por déficit de stock</strong>: pone lo que falta para llegar al mínimo, descuenta lo que ya viene de camino (pedidos enviados sin recibir) y redondea hacia arriba al envase. Te dice cuántos sugiere, cuántos ya vienen y cuántos no tienen mínimo en Stock. Si ya habías escrito cantidades, pregunta antes de pisarlas. <strong>Vaciar</strong> pone todo a cero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A la derecha ves el <strong>Resumen del pedido</strong> con cada línea, el subtotal, el IVA, el envío y el total, y avisos: artículos sin precio, cuánto te falta para el envío gratis, o que ya hay un pedido pendiente a ese proveedor. Añade una nota si quieres.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Envíalo: <strong>Enviar por WhatsApp</strong> (solo si el proveedor tiene móvil; con un fijo no funciona), <strong>Enviar por Email</strong>, <strong>Guardar borrador</strong> o <strong>Imprimir</strong>. Si al proveedor le falta móvil o correo, el botón se apaga y te dice que lo añadas en su ficha.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Al enviar, el pedido queda como Enviado y se abre WhatsApp o tu correo con el mensaje ya escrito (artículos y cantidades, sin precios). El envío lo confirmas tú desde allí.</div>
<h4>Los tres estados de un pedido</h4>
<table><thead><tr><th>Estado</th><th>Qué significa</th></tr></thead><tbody><tr><td><strong>Borrador</strong></td><td>Lo estás preparando. Aún no se ha comunicado.</td></tr><tr><td><strong>Enviado</strong></td><td>Ya se pidió al proveedor. Pulsa <strong>Marcar enviado</strong> si lo hiciste por teléfono. Si lleva días sin llegar, aparece un aviso ámbar y, desde los 3 días, rojo.</td></tr><tr><td><strong>Recibido</strong></td><td>La mercancía ha llegado y se ha comprobado.</td></tr></tbody></table>
<h4>Recibir la mercancía</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Abre el pedido desde el <strong>Historial de Pedidos</strong>. Revisa cada artículo: marca verde (<strong>Ha llegado</strong>) o cruz roja (<strong>No ha llegado</strong>). Lo que no marques cuenta como no llegado. Si algo no cuadra, explícalo en la nota de la línea (falta cantidad, caducado, mal estado…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si el albarán trae otro precio, cámbialo en <strong>Precio albarán</strong>. Al recibir, y solo en las líneas con marca verde, el precio pasa a la Mega Lista y queda en el historial de precios (en el Panel de Control verás los avisos de subidas).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Rellena <strong>Recepción / APPCC</strong>: <strong>Fecha</strong>, <strong>Hora</strong>, <strong>Tª (°C)</strong>, <strong>Condición del producto</strong>, <strong>Caducidad / fecha consumo</strong>, <strong>Cuadre con albarán</strong> (OK o NO CONFORME), <strong>Responsable</strong> y <strong>Observaciones</strong>, y pulsa <strong>Guardar recepción</strong>. Corregirlo después exige permiso de edición.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si quieres, adjunta una foto o PDF del albarán (máximo 1,5 MB).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Pulsa <strong>Marcar recibido</strong>. La app suma al Stock lo marcado en verde, registra la compra en Gestión Económica → Gastos Variables (por categoría e IVA, con el envío si lo hay), apunta quién lo recibió y calcula la comprobación: <strong>Todo correcto</strong>, <strong>Ha faltado algo</strong> o <strong>Algo en mal estado</strong>.</div></div>
<p>Cualquier empleado puede marcar un pedido como enviado o recibido y hacer la comprobación. Un pedido recibido no se borra: es la compra que justifica el gasto y el stock. Si lo marcaste por error, ⋯ → <strong>Deshacer recepción</strong> (pide confirmar con el PIN) lo devuelve a Enviado y deshace el stock y el gasto.</p>
<h4>La factura del proveedor</h4>
<p>Dentro de un pedido enviado o recibido, la tarjeta <strong>Factura del proveedor</strong> tiene el botón <strong>Adjuntar factura</strong> (solo el propietario). Sube la foto o el PDF. Si el asistente de IA está activado (<strong>Mi Negocio → Asistente de IA</strong>), la lee y la app la <strong>cuadra línea a línea</strong> con lo pedido, o con lo recibido si ya lo recibiste. Cada artículo sale marcado como <strong>Igual</strong>, <strong>Cantidad distinta</strong>, <strong>Falta en la factura</strong>, <strong>No estaba en el pedido</strong>, <strong>Sube</strong> o <strong>Baja</strong>, y ves el total del pedido frente al de la factura. Pulsa <strong>Confirmar factura</strong>.</p>
<ul>
<li>Lo recibido no se cambia: las diferencias quedan anotadas en el pedido, útiles para reclamar al proveedor. El stock solo se corrige si marcas la casilla de corregirlo con lo facturado.</li>
<li>Los precios que cambian se actualizan en la Mega Lista solo si dejas marcada <strong>Actualizar el precio en la Mega Lista</strong>.</li>
<li>El gasto no se duplica: el que ya generó el pedido se ajusta a la factura y queda con su número y NIF.</li>
<li>Sin asistente puedes adjuntarla igual y apuntar número, fecha y NIF a mano (<strong>Guardar factura en el pedido</strong>).</li>
</ul>
<p>Para una factura que no va con un pedido, usa <strong>Gestión → Gestión Económica → Gastos Variables → Leer factura con foto</strong> (solo propietario): <strong>Elegir foto o PDF</strong>, espera unos segundos y revisa. Corrige proveedor, NIF, número, fecha y líneas, comprueba qué producto de la Mega Lista corresponde a cada una (la app recuerda cómo lo casaste con ese proveedor) y fíjate en los avisos en rojo de lo que no cuadra. Marca si quieres actualizar precios y si debe <strong>Entrar también en el stock</strong>, y pulsa <strong>Guardar compra</strong>. No se apunta nada sin tu visto bueno.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Haz la foto de frente, con buena luz y sin sombras: es lo que más ayuda a que la lectura salga limpia.</div>
<h4>Pedir lo que falta (sin permiso de edición)</h4>
<p>Si tu ficha no tiene permiso de edición, no ves proveedores ni precios. Busca los artículos, pon la cantidad, añade una nota y pulsa <strong>Enviar solicitud</strong>. No es un pedido real: la verá quien puede editar, arriba de <strong>Realizar Pedido</strong>, y la quitará con <strong>Marcar atendida</strong>. Debajo ves tus últimas solicitudes y si siguen pendientes.</p>
<h4>Historial de Pedidos</h4>
<ul>
<li>Arriba, el selector de periodo: flechas para ir de mes en mes y, al abrirlo, el año con cuántos pedidos hay en cada mes, y la opción de todo el año.</li>
<li>Botones <strong>Borradores</strong>, <strong>Enviados</strong> y <strong>Recibidos</strong> con su cuenta, buscador y filtro por proveedor. Abajo ves cuántos pedidos y el total de lo filtrado.</li>
<li>La lista tiene <strong>dos bloques</strong>: arriba, <strong>Pendientes de recibir</strong> (borradores y enviados), que salen siempre sea cual sea el mes; debajo, <strong>Recibidos</strong> del periodo elegido, con su cuenta y su total. Si el periodo no tiene ninguno, lo dice.</li>
<li>Cada tarjeta muestra proveedor, estado, entrega, nº de artículos y total. Púlsala para abrirla. En el ⋯: <strong>Abrir</strong>, <strong>Duplicar pedido</strong> (crea un borrador igual, útil para pedidos de siempre) y <strong>Eliminar</strong> (no en los recibidos).</li>
<li><strong>Imprimir</strong> saca una hoja para el muelle con una casilla de «Recibido» por artículo y sin precios.</li>
</ul>
<h4>Lo que conviene saber</h4>
<ul>
<li>Solo los pedidos Recibidos mueven el stock y el gasto. Un Borrador o un Enviado no cambian ningún número.</li>
<li>Cambiar la cantidad pedida de un pedido ya recibido exige permiso de edición.</li>
<li>Duplicar, deshacer una recepción y eliminar están en el ⋯ y son del propietario y de quien tiene permiso de edición.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li>No me deja pedir para hoy: elige una fecha posterior para que le dé tiempo al proveedor.</li>
<li>Me cambia la fecha: ese proveedor solo reparte ciertos días; la app te pasa al siguiente.</li>
<li>El botón de WhatsApp está apagado: el proveedor no tiene móvil guardado o su número es un fijo. Usa email o llámale.</li>
<li><strong>Sugerir por déficit de stock</strong> no sugiere nada: los productos no tienen mínimo en Stock, o ya está todo por encima.</li>
<li>Recibí el pedido y el stock no subió: esa línea no tenía marca verde.</li>
<li>No veo <strong>Realizar Pedido</strong>: tu ficha no tiene permiso de edición. Usa <strong>Pedir lo que falta</strong>.</li>
<li>La factura no se lee: prueba con una foto más nítida o comprueba que el asistente está activado.</li>
</ul>`,
    ca:`<h3>Del «se m'acaba» al «ja ha arribat»</h3>
<p>Comandes és on compres als teus proveïdors: prepares la comanda amb el que falta a l'Estoc, l'envies per WhatsApp o email, i quan arriba la mercaderia la comproves. En rebre-la s'actualitzen sols l'Estoc, els preus i la despesa a Gestió Econòmica. Cuina i Sala porten les seves comandes per separat.</p>
<p>Té tres pestanyes:</p>
<table><thead><tr><th>Pestanya</th><th>Qui la veu</th><th>Per a què</th></tr></thead><tbody><tr><td><strong>Fer Comanda</strong></td><td>Propietari i empleats amb permís d'edició</td><td>Preparar i enviar una comanda real.</td></tr><tr><td><strong>Demanar el que falta</strong></td><td>Empleats sense permís d'edició</td><td>Avisar del que falta (no és una comanda real).</td></tr><tr><td><strong>Historial de Comandes</strong></td><td>Tothom</td><td>Veure, rebre i revisar les comandes.</td></tr></tbody></table>
<h4>Fer una comanda, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">A <strong>Fer Comanda</strong>, tria el <strong>Proveïdor</strong> i la <strong>Data de lliurament</strong>. No es pot demanar per avui, i si el proveïdor no reparteix aquell dia l'app passa la data al següent dia de repartiment i t'avisa. Veuràs els seus dies de repartiment, l'hora, l'enviament i si té WhatsApp (mòbil) i email. Mentre no en triïs cap, la pantalla t'ensenya una <strong>targeta per proveïdor</strong> amb quants articles té i quants són sota el mínim (els que més falten, primer): un toc i el tries.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Apareix la seva llista de la compra: cada article amb l'estoc actual, el mínim, sota el mínim o +N en camí si escau, el preu i la quantitat amb − i +. Filtra amb <strong>Tots</strong>, <strong>Sota el mínim</strong> o <strong>Amb quantitat</strong>, o cerca per nom.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Suggerir per dèficit d'estoc</strong>: posa el que falta per arribar al mínim, descompta el que ja ve de camí (comandes enviades sense rebre) i arrodoneix cap amunt al envàs. Et diu quants suggereix, quants ja vénen i quants no tenen mínim a l'Estoc. Si ja havies escrit quantitats, pregunta abans de trepitjar-les. <strong>Buidar</strong> posa tot a zero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A la dreta veus el <strong>Resum de la comanda</strong> amb cada línia, el subtotal, l'IVA, l'enviament i el total, i avisos: articles sense preu, quant et falta per a l'enviament gratis, o que ja hi ha una comanda pendent a aquell proveïdor. Afegeix una nota si vols.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Envia-la: <strong>Enviar per WhatsApp</strong> (només si el proveïdor té mòbil; amb un fix no funciona), <strong>Enviar per Email</strong>, <strong>Desar esborrany</strong> o <strong>Imprimir</strong>. Si al proveïdor li falta mòbil o correu, el botó s'apaga i et diu que ho afegeixis a la seva fitxa.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>En enviar, la comanda queda com a Enviada i s'obre WhatsApp o el teu correu amb el missatge ja escrit (articles i quantitats, sense preus). L'enviament el confirmes tu des d'allà.</div>
<h4>Els tres estats d'una comanda</h4>
<table><thead><tr><th>Estat</th><th>Què significa</th></tr></thead><tbody><tr><td><strong>Esborrany</strong></td><td>La estàs preparant. Encara no s'ha comunicat.</td></tr><tr><td><strong>Enviat</strong></td><td>Ja s'ha demanat al proveïdor. Prem <strong>Marcar enviada</strong> si ho vas fer per telèfon. Si triga dies a arribar, apareix un avís ambre i, des dels 3 dies, vermell.</td></tr><tr><td><strong>Rebut</strong></td><td>La mercaderia ha arribat i s'ha comprovat.</td></tr></tbody></table>
<h4>Rebre la mercaderia</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Obre la comanda des de l'<strong>Historial de Comandes</strong>. Revisa cada article: marca verda (<strong>Ha arribat</strong>) o creu vermella (<strong>No ha arribat</strong>). El que no marquis compta com a no arribat. Si alguna cosa no quadra, explica-ho a la nota de la línia (falta quantitat, caducat, mal estat…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si l'albarà porta un altre preu, canvia'l a <strong>Preu albarà</strong>. En rebre, i només a les línies amb marca verda, el preu passa a la Mega Llista i queda a l'historial de preus (al Panell de Control veuràs els avisos de pujades).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Omple <strong>Recepció / APPCC</strong>: <strong>Data</strong>, <strong>Hora</strong>, <strong>Tª (°C)</strong>, <strong>Condició del producte</strong>, <strong>Caducitat / data de consum</strong>, <strong>Quadra amb l'albarà</strong> (OK o NO CONFORME), <strong>Responsable</strong> i <strong>Observacions</strong>, i prem <strong>Desar recepció</strong>. Corregir-ho després exigeix permís d'edició.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si vols, adjunta una foto o PDF de l'albarà (màxim 1,5 MB).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Prem <strong>Marcar rebuda</strong>. L'app suma a l'Estoc el que has marcat en verd, registra la compra a Gestió Econòmica → Despeses Variables (per categoria i IVA, amb l'enviament si n'hi ha), apunta qui l'ha rebut i calcula la comprovació: <strong>Tot correcte</strong>, <strong>Ha faltat alguna cosa</strong> o <strong>Alguna cosa en mal estat</strong>.</div></div>
<p>Qualsevol empleat pot marcar una comanda com a enviada o rebuda i fer la comprovació. Una comanda rebuda no s'esborra: és la compra que justifica la despesa i l'estoc. Si la vas marcar per error, ⋯ → <strong>Desfer recepció</strong> (demana confirmar amb el PIN) la torna a Enviada i desfà l'estoc i la despesa.</p>
<h4>La factura del proveïdor</h4>
<p>Dins d'una comanda enviada o rebuda, la targeta <strong>Factura del proveïdor</strong> té el botó <strong>Adjuntar factura</strong> (només el propietari). Puja la foto o el PDF. Si l'assistent d'IA està activat (<strong>El Meu Negoci → Assistent d'IA</strong>), la llegeix i l'app la <strong>quadra línia a línia</strong> amb el que s'ha demanat, o amb el que s'ha rebut si ja l'has rebuda. Cada article surt marcat com a <strong>Igual</strong>, <strong>Quantitat diferent</strong>, <strong>Falta a la factura</strong>, <strong>No era a la comanda</strong>, <strong>Puja</strong> o <strong>Baixa</strong>, i veus el total de la comanda davant del de la factura. Prem <strong>Confirmar factura</strong>.</p>
<ul>
<li>El que s'ha rebut no es canvia: les diferències queden anotades a la comanda, útils per reclamar al proveïdor. L'estoc només es corregeix si marques la casella de corregir-lo amb el facturat.</li>
<li>Els preus que canvien s'actualitzen a la Mega Llista només si deixes marcada <strong>Actualitzar el preu a la Mega Llista</strong>.</li>
<li>La despesa no es duplica: la que ja va generar la comanda s'ajusta a la factura i queda amb el seu número i NIF.</li>
<li>Sense assistent la pots adjuntar igualment i apuntar número, data i NIF a mà (<strong>Desar la factura a la comanda</strong>).</li>
</ul>
<p>Per a una factura que no va amb una comanda, fes servir <strong>Gestió → Gestió Econòmica → Despeses Variables → Llegir factura amb foto</strong> (només propietari): <strong>Triar foto o PDF</strong>, espera uns segons i revisa. Corregeix proveïdor, NIF, número, data i línies, comprova quin producte de la Mega Llista correspon a cadascuna (l'app recorda com la vas casar amb aquell proveïdor) i fixa't en els avisos en vermell del que no quadra. Marca si vols actualitzar preus i si ha d'<strong>Entrar també a l'estoc</strong>, i prem <strong>Desar compra</strong>. No s'apunta res sense el teu vistiplau.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Fes la foto de cara, amb bona llum i sense ombres: és el que més ajuda que la lectura surti neta.</div>
<h4>Demanar el que falta (sense permís d'edició)</h4>
<p>Si la teva fitxa no té permís d'edició, no veus proveïdors ni preus. Cerca els articles, posa la quantitat, afegeix una nota i prem <strong>Enviar sol·licitud</strong>. No és una comanda real: la veurà qui pot editar, a dalt de <strong>Fer Comanda</strong>, i la treurà amb <strong>Marcar atesa</strong>. A sota veus les teves últimes sol·licituds i si continuen pendents.</p>
<h4>Historial de Comandes</h4>
<ul>
<li>A dalt, el selector de període: fletxes per anar de mes en mes i, en obrir-lo, l'any amb quantes comandes hi ha cada mes, i l'opció de tot l'any.</li>
<li>Botons <strong>Esborranys</strong>, <strong>Enviades</strong> i <strong>Rebudes</strong> amb el seu compte, cercador i filtre per proveïdor. A sota veus quantes comandes i el total del filtrat.</li>
<li>La llista té <strong>dos blocs</strong>: a dalt, <strong>Pendents de rebre</strong> (esborranys i enviades), que surten sempre sigui quin sigui el mes; a sota, <strong>Rebudes</strong> del període triat, amb el seu compte i el seu total. Si el període no en té cap, ho diu.</li>
<li>Cada targeta mostra proveïdor, estat, lliurament, nre. d'articles i total. Prem-la per obrir-la. Al ⋯: <strong>Obrir</strong>, <strong>Duplicar comanda</strong> (crea un esborrany igual, útil per a comandes de sempre) i <strong>Eliminar</strong> (no a les rebudes).</li>
<li><strong>Imprimir</strong> treu un full per al moll amb una casella de «Rebut» per article i sense preus.</li>
</ul>
<h4>El que convé saber</h4>
<ul>
<li>Només les comandes Rebudes mouen l'estoc i la despesa. Un Esborrany o un Enviat no canvien cap número.</li>
<li>Canviar la quantitat demanada d'una comanda ja rebuda exigeix permís d'edició.</li>
<li>Duplicar, desfer una recepció i eliminar són al ⋯ i són del propietari i de qui té permís d'edició.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li>No em deixa demanar per avui: tria una data posterior perquè el proveïdor tingui temps.</li>
<li>Em canvia la data: aquell proveïdor només reparteix certs dies; l'app et passa al següent.</li>
<li>El botó de WhatsApp és apagat: el proveïdor no té mòbil desat o el seu número és un fix. Fes servir email o truca'l.</li>
<li><strong>Suggerir per dèficit d'estoc</strong> no suggereix res: els productes no tenen mínim a l'Estoc, o ja és tot per sobre.</li>
<li>Vaig rebre la comanda i l'estoc no va pujar: aquella línia no tenia marca verda.</li>
<li>No veig <strong>Fer Comanda</strong>: la teva fitxa no té permís d'edició. Fes servir <strong>Demanar el que falta</strong>.</li>
<li>La factura no es llegeix: prova amb una foto més nítida o comprova que l'assistent està activat.</li>
</ul>`,
    en:`<h3>From «we are running out» to «it has arrived»</h3>
<p>Orders is where you buy from your suppliers: you prepare the order from what is short in Stock, send it by WhatsApp or email, and check the goods when they arrive. On receipt, Stock, prices and the expense in Financial Management update by themselves. Kitchen and Floor keep their orders separate.</p>
<p>It has three tabs:</p>
<table><thead><tr><th>Tab</th><th>Who sees it</th><th>What for</th></tr></thead><tbody><tr><td><strong>Place Order</strong></td><td>Owner and employees with edit permission</td><td>Prepare and send a real order.</td></tr><tr><td><strong>Request what's needed</strong></td><td>Employees without edit permission</td><td>Flag what is short (it is not a real order).</td></tr><tr><td><strong>Order History</strong></td><td>Everyone</td><td>View, receive and review orders.</td></tr></tbody></table>
<h4>Placing an order, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">In <strong>Place Order</strong>, choose the <strong>Supplier</strong> and the <strong>Delivery date</strong>. You cannot order for today, and if the supplier does not deliver that day the app moves the date to the next delivery day and tells you. You will see their delivery days, time, shipping and whether they have WhatsApp (mobile) and email. Until you pick one, the screen shows a <strong>card per supplier</strong> with how many items it has and how many are below minimum (most short first): one tap picks it.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Their shopping list appears: each item with current stock, minimum, below min or +N on the way where relevant, the price and the quantity with − and +. Filter with <strong>All</strong>, <strong>Below minimum</strong> or <strong>With quantity</strong>, or search by name.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>Suggest by stock deficit</strong>: it fills in what is missing to reach the minimum, subtracts what is already on its way (sent orders not yet received) and rounds up to the pack size. It tells you how many it suggested, how many are already coming and how many have no minimum in Stock. If you had already typed quantities, it asks before overwriting them. <strong>Clear</strong> sets everything to zero.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">On the right you see the <strong>Order summary</strong> with each line, subtotal, VAT, shipping and total, plus warnings: items without a price, how much you need for free shipping, or that there is already a pending order to that supplier. Add a note if you like.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Send it: <strong>Send via WhatsApp</strong> (only if the supplier has a mobile; a landline will not work), <strong>Send via Email</strong>, <strong>Save draft</strong> or <strong>Print</strong>. If the supplier has no mobile or email, the button is greyed out and tells you to add it to their profile.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>When you send, the order is left as Sent and WhatsApp or your email opens with the message already written (items and quantities, no prices). You confirm the sending from there.</div>
<h4>The three states of an order</h4>
<table><thead><tr><th>State</th><th>What it means</th></tr></thead><tbody><tr><td><strong>Draft</strong></td><td>You are preparing it. Not yet communicated.</td></tr><tr><td><strong>Sent</strong></td><td>Already ordered from the supplier. Press <strong>Mark sent</strong> if you did it by phone. If it takes days to arrive, an amber notice appears and, from 3 days, a red one.</td></tr><tr><td><strong>Received</strong></td><td>The goods have arrived and been checked.</td></tr></tbody></table>
<h4>Receiving the goods</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Open the order from the <strong>Order History</strong>. Check each item: green tick (<strong>Arrived</strong>) or red cross (<strong>Not arrived</strong>). Anything you leave unmarked counts as not arrived. If something is off, explain it in the line note (short quantity, expired, bad condition…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">If the delivery note shows a different price, change it in <strong>Delivery note price</strong>. On receipt, and only on lines with a green tick, the price goes to the Mega List and is kept in the price history (the Dashboard shows price-rise alerts).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Fill in <strong>Reception / HACCP</strong>: <strong>Date</strong>, <strong>Time</strong>, <strong>Temp. (°C)</strong>, <strong>Product condition</strong>, <strong>Expiry / use-by date</strong>, <strong>Matches delivery note</strong> (OK or NON-CONFORMING), <strong>Responsible</strong> and <strong>Observations</strong>, and press <strong>Save reception</strong>. Correcting it afterwards needs edit permission.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">If you like, attach a photo or PDF of the delivery note (maximum 1.5 MB).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Press <strong>Mark received</strong>. The app adds to Stock what you ticked green, records the purchase in Financial Management → Variable Expenses (by category and VAT, with shipping if any), notes who received it and works out the check: <strong>All correct</strong>, <strong>Something was missing</strong> or <strong>Something in bad condition</strong>.</div></div>
<p>Any employee can mark an order as sent or received and do the check. A received order is never deleted: it is the purchase that backs up the expense and the stock. If you marked it by mistake, ⋯ → <strong>Revert reception</strong> (it asks you to confirm with the PIN) takes it back to Sent and undoes the stock and the expense.</p>
<h4>The supplier invoice</h4>
<p>Inside a sent or received order, the <strong>Supplier invoice</strong> card has the <strong>Attach invoice</strong> button (owner only). Upload the photo or PDF. If the AI assistant is switched on (<strong>My Business → AI assistant</strong>), it reads it and the app <strong>checks it line by line</strong> against what was ordered, or against what was received if you already received it. Each item is tagged <strong>Same</strong>, <strong>Different quantity</strong>, <strong>Missing from invoice</strong>, <strong>Not in the order</strong>, <strong>Up</strong> or <strong>Down</strong>, and you see the order total against the invoice total. Press <strong>Confirm invoice</strong>.</p>
<ul>
<li>What was received is not changed: differences are noted on the order, useful to claim from the supplier. Stock is only corrected if you tick the box to correct it with the invoiced quantities.</li>
<li>Prices that change are updated in the Mega List only if you leave <strong>Update the price in the Mega List</strong> ticked.</li>
<li>The expense is not duplicated: the one the order already created is adjusted to the invoice and gets its number and tax ID.</li>
<li>Without the assistant you can still attach it and enter number, date and tax ID by hand (<strong>Save invoice in the order</strong>).</li>
</ul>
<p>For an invoice that does not go with an order, use <strong>Management → Financial Management → Variable Expenses → Read invoice from photo</strong> (owner only): <strong>Choose photo or PDF</strong>, wait a few seconds and review. Correct supplier, tax ID, number, date and lines, check which Mega List product each line matches (the app remembers how you matched it for that supplier) and look at the red warnings for anything that does not add up. Tick whether to update prices and whether it should <strong>Also add to stock</strong>, and press <strong>Save purchase</strong>. Nothing is recorded without your approval.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Take the photo straight on, in good light and without shadows: it helps the reading come out clean more than anything.</div>
<h4>Request what's needed (without edit permission)</h4>
<p>If your profile has no edit permission, you do not see suppliers or prices. Search for the items, enter the quantity, add a note and press <strong>Send request</strong>. It is not a real order: whoever can edit will see it at the top of <strong>Place Order</strong> and remove it with <strong>Mark as handled</strong>. Below you see your latest requests and whether they are still pending.</p>
<h4>Order History</h4>
<ul>
<li>At the top, the period selector: arrows to go month by month and, when opened, the year with how many orders there are in each month, plus the whole-year option.</li>
<li>Buttons <strong>Drafts</strong>, <strong>Sent</strong> and <strong>Received</strong> with their counts, a search box and a supplier filter. Below you see how many orders and the total of the filtered results.</li>
<li>The list has <strong>two blocks</strong>: at the top, <strong>Waiting to be received</strong> (drafts and sent orders), always shown whatever the month; below, <strong>Received</strong> in the chosen period, with its count and total. If the period has none, it says so.</li>
<li>Each card shows supplier, state, delivery, number of items and total. Tap it to open it. In the ⋯: <strong>Open</strong>, <strong>Duplicate order</strong> (creates an identical draft, handy for regular orders) and <strong>Delete</strong> (not on received orders).</li>
<li><strong>Print</strong> gives a sheet for the loading bay with a «Received» tick box per item and no prices.</li>
</ul>
<h4>Good to know</h4>
<ul>
<li>Only Received orders move stock and expenses. A Draft or a Sent order changes no figure.</li>
<li>Changing the ordered quantity on an order already received needs edit permission.</li>
<li>Duplicate, revert reception and delete are in the ⋯ and belong to the owner and anyone with edit permission.</li>
</ul>
<h4>If something does not work</h4>
<ul>
<li>It will not let me order for today: choose a later date so the supplier has time.</li>
<li>It changes my date: that supplier only delivers on certain days; the app moves you to the next one.</li>
<li>The WhatsApp button is greyed out: the supplier has no mobile saved or the number is a landline. Use email or call them.</li>
<li><strong>Suggest by stock deficit</strong> suggests nothing: the products have no minimum in Stock, or everything is already above it.</li>
<li>I received the order and stock did not go up: that line did not have a green tick.</li>
<li>I cannot see <strong>Place Order</strong>: your profile has no edit permission. Use <strong>Request what's needed</strong>.</li>
<li>The invoice will not read: try a sharper photo or check the assistant is switched on.</li>
</ul>`}
  },
  {id:'horarios', area:'cocina',
    title:{es:`<i class="ti ti-calendar-time"></i> Horario del Personal`, ca:`<i class="ti ti-calendar-time"></i> Horari del Personal`, en:`<i class="ti ti-calendar-time"></i> Staff Schedule`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Aquí das de alta a tu equipo, organizas sus turnos, ves quién está trabajando ahora mismo y resuelves lo que te piden (cambios de turno y vacaciones). Es también el sitio donde cada empleado ficha su entrada y su salida, y de ahí sale el registro de jornada que tu negocio tiene que guardar. Se abre desde la tarjeta <strong>Personal</strong> de Cocina o de Sala: cada área tiene su propio equipo y su propio horario.</p>
<p>Tiene dos pestañas:</p>
<table><thead><tr><th>Pestaña</th><th>Para qué sirve</th></tr></thead><tbody><tr><td><strong>Personal</strong></td><td>Una tarjeta por empleado: quién está fichado, su ficha, sus mensajes y sus turnos. Arriba, el resumen del equipo y lo que espera tu respuesta.</td></tr><tr><td><strong>Calendario</strong></td><td>Los turnos en tres vistas: <strong>Día</strong>, <strong>Semana</strong> y <strong>Mes</strong>. Es para mirar y corregir, no para repartir.</td></tr></tbody></table>

<h4>Dar de alta a un empleado (solo el propietario)</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">En <strong>Personal</strong> pulsa <strong>Añadir Empleado</strong>. El empleado se crea en el área desde la que has entrado: si estás en Cocina, es de cocina; si estás en Sala, es de sala.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En <strong>Quién es</strong> escribe el <strong>Nombre</strong>, el <strong>Rol</strong> (texto libre: «Jefe de cocina», «Camarera») y elige su <strong>Color identificativo</strong>. Ese color es el aro de su avatar en todas las pantallas. Si no te gusta ninguno, usa <strong>Otro color</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En <strong>Cómo localizarle</strong> pon <strong>Teléfono</strong> y <strong>Email</strong>. En su tarjeta aparecerán los botones de WhatsApp y de email (solo los ves tú). Cada icono de la tarjeta lleva su rótulo: pasa el ratón por encima o, en tablet y móvil, <strong>mantén el dedo medio segundo</strong> y te dice qué hace (sin ejecutarlo).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En <strong>Vacaciones</strong> escribe los <strong>Días de vacaciones al año</strong>. Si lo dejas vacío, la app no controla cuántos le quedan.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">En <strong>Acceso y permisos</strong> revisa las casillas (abajo te explico cada una) y pulsa <strong>Guardar</strong>.</div></div>

<h4>Las casillas de «Acceso y permisos»</h4>
<ul>
<li><strong>Activo (puede entrar en Cocina con su PIN)</strong>: desmárcala si alguien deja de trabajar contigo. Su PIN deja de servir, pero su ficha y sus fichajes se conservan. Puedes volver a marcarla cuando quieras. Solo sale al editar a un empleado ya creado.</li>
<li><strong>Puede entrar en modo edición de Cocina con su PIN</strong>: pensada para un jefe de cocina o de sala. Podrá tocar los turnos y el stock de su área, pero no gestiona personal (más abajo, en «Quién ve qué»).</li>
<li><strong>Es repartidor</strong> (solo en Sala): lo mete en el reparto automático de pedidos a domicilio mientras esté de turno. No cambia nada de lo que ve en la app.</li>
<li><strong>PIN de fichaje</strong>: todo empleado nuevo empieza con el PIN <strong>1234</strong>. La primera vez que ficha o que entra por Acceso Empleados, la app le pide crear el suyo (4 dígitos, y no puede ser 1234). Si lo olvida, entra en su ficha y pulsa <strong>Restablecer PIN a 1234</strong> (te pide confirmación y queda anotado).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Para entrar, el empleado usa <strong>Acceso Empleados</strong> en la pantalla inicial: su nombre, su PIN y el código del negocio. No hay que darlo de alta en cada aparato.</div>

<h4>Darle turnos a un empleado</h4>
<p>El calendario no sirve para crear turnos nuevos: los turnos se reparten desde la tarjeta del empleado, con el icono de calendario (<strong>Turnos de este empleado</strong>, solo propietario). Se abre una ventana con tres opciones:</p>
<ul>
<li><strong>Horario fijo</strong>: un patrón de lunes a domingo que se repite solo, para siempre. Para cada día eliges el tipo de turno y las horas. La app crea sola los turnos de las próximas 4 semanas y sigue creándolos. Si más adelante cambias el patrón, se rehacen los turnos futuros automáticos; los que hayas tocado a mano se quedan como están. <strong>Quitar horario fijo</strong> deja de generar turnos nuevos, pero no borra los que ya existen.</li>
<li><strong>Asignar turnos por periodo</strong>: eliges fechas (<strong>Desde</strong> y <strong>Hasta</strong>, hasta unos dos meses) y la app te enseña una tarjeta por día para poner el tipo y las horas. Marca <strong>Turno partido (2 tramos)</strong> si trabaja en dos tandas, o <strong>Festivo</strong> si ese día descansa. Pulsa <strong>Aplicar</strong>: si ya había un turno ese día, se sustituye.</li>
<li><strong>Sin turnos asignados</strong>: no hace falta elegir nada ahora; cierra la ventana.</li>
</ul>
<p>Los tipos de turno son <strong>Mañana</strong>, <strong>Tarde</strong>, <strong>Partido</strong>, <strong>Descanso</strong>, <strong>Vacaciones</strong>, <strong>Baja</strong> y <strong>Otro</strong>. Vacaciones y Baja no entran en el horario fijo (nadie está de vacaciones todos los lunes): las vacaciones se crean solas al aprobar una solicitud, y una baja se pone editando el turno de ese día.</p>

<h4>El Calendario: Día, Semana y Mes</h4>
<ul>
<li><strong>Día</strong>: usa las flechas para cambiar de día, pulsa la fecha para elegir otra y <strong>Hoy</strong> para volver. Arriba ves cuántos <strong>Trabajan</strong>, las <strong>Horas planificadas</strong>, cuántos descansan o están ausentes y cuántos no tienen turno. Debajo, una línea de horas con una barra por empleado (el turno partido sale en dos tramos) y <strong>Personal por hora</strong>: cuántas personas hay en cada hora, para ver si el turno de comidas va corto.</li>
<li><strong>Semana</strong>: una tabla con los siete días, las horas de cada empleado y cuántos trabajan cada día. En el móvil se convierte en una tarjeta por empleado. Pulsar el día de la cabecera te lleva a la vista Día. <strong>Imprimir horario</strong> saca una hoja apaisada para colgar en cocina o barra.</li>
<li><strong>Mes</strong>: la rejilla del mes con cuántas personas trabajan cada día. El selector de arriba (‹ mes ▾ ›) te dice cuántos turnos hay en cada mes. «Días sin nadie» cuenta, de hoy en adelante, los días sin ningún turno de trabajo. Pulsa un día para abrirlo en la vista Día.</li>
</ul>
<p>Para <strong>corregir un turno que ya existe</strong>: en Día, el menú «⋯» de su fila (<strong>Editar</strong> o <strong>Eliminar</strong>); en Semana, pulsa el turno. Solo pueden hacerlo el propietario y un empleado con permiso de edición. Si el turno venía del horario fijo, la app pregunta <strong>Solo este día</strong> o <strong>Para siempre</strong>. Si ese empleado ya tenía otro turno esa fecha, pregunta antes de sustituirlo.</p>

<h4>Fichar: entrada, salida y horas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">El empleado pulsa su tarjeta (el botón dice <strong>Fichar</strong>). Si entró con Acceso Empleados, se abre su ficha directamente. En un aparato compartido, la app le pide su PIN (vale el suyo o el del negocio).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pulsa <strong>Entrada</strong> al empezar y <strong>Salida</strong> al terminar. Al fichar la entrada, la app le enseña el resumen del turno: su turno de hoy, las reservas del día (en Sala), la limpieza que le toca y la <strong>Nota para el siguiente turno</strong> que dejó el compañero anterior.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En su ficha ve <strong>Horas esta semana</strong> y <strong>Horas este mes</strong>, y <strong>Ver últimos fichajes</strong>: los 20 últimos, con las horas previstas del turno y un aviso en rojo si lo fichado se aparta más de un cuarto de hora de lo planificado.</div></div>
<p>La app avisa, sin bloquear nada, si alguien ficha con menos de 12 horas de descanso desde su última salida, y al propietario le avisa de quien lleva 9 horas o más seguidas fichado.</p>
<p>Como propietario, <strong>Ver ficha</strong> te enseña las horas y los fichajes de cada persona, pero no puedes fichar por ellos. Si alguien ficha con el PIN del negocio en lugar del suyo, queda anotado en el <strong>Historial de Personal</strong>.</p>
<p><strong>Corregir un fichaje</strong>: en <strong>Ver últimos fichajes</strong>, pulsa el candado de la fila y escribe el PIN del negocio. La app guarda la hora original y marca el fichaje como editado, para que el registro siga siendo fiable.</p>

<h4>El registro de jornada</h4>
<p>Todos los fichajes quedan guardados. Aunque elimines a un empleado, <strong>sus fichajes no se borran</strong>: la ley obliga a conservarlos 4 años. Para dárselo a tu gestor: <strong>Gestión → Gestión Económica → Enviar al gestor</strong>, marca <strong>Registro de jornada</strong> y elige el mes. Sale una hoja con día, empleado, entrada, salida y horas, y si un fichaje se corrigió, cuál era la hora original.</p>

<h4>Cambios de turno y vacaciones</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">El empleado, desde su ficha, pulsa <strong>Pedir cambio de turno</strong>, elige el turno (tiene que faltar al menos 24 horas) y el compañero de su área que lo cubriría.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">El compañero ve en su ficha <strong>Te han pedido cubrir un turno</strong> y pulsa <strong>Aceptar</strong> o <strong>Rechazar</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si acepta, la petición llega al propietario, en <strong>Requiere tu atención</strong> (arriba de Personal). Solo cuando él pulsa <strong>Aceptar</strong> el turno cambia de manos. No se puede aprobar si quien cubre ya tiene otro turno ese día.</div></div>
<p>Las vacaciones funcionan igual de simple: el empleado pulsa <strong>Pedir vacaciones</strong>, elige <strong>Desde</strong> y <strong>Hasta</strong> y, si quiere, deja una nota. La app le dice cuántos días le quedan y no le deja pedir más. El propietario ve la solicitud en <strong>Requiere tu atención</strong> con los días que le restan; al <strong>Aceptar</strong>, la app pone un turno de Vacaciones en cada día del rango. Mientras esté <strong>Pendiente</strong>, el empleado puede <strong>Retirar solicitud</strong>.</p>

<h4>Lo que ves como propietario en Personal</h4>
<ul>
<li>Arriba, cuatro cifras: <strong>En plantilla</strong>, <strong>Trabajando ahora</strong> (con el fichaje abierto), <strong>Esperan respuesta</strong> (cambios de turno y vacaciones; púlsala y baja a la lista) y <strong>Clima del equipo esta semana</strong>.</li>
<li><strong>Requiere tu atención</strong>: cada cambio de turno, vacaciones o jornada larga, con sus botones. Si no hay nada, no aparece.</li>
<li>El clima sale de una pregunta opcional de un toque (una carita del 1 al 5) que cada empleado puede contestar una vez por semana al abrir su ficha. Es anónima para el resto del equipo.</li>
<li>En Sala, las tres personas con más ventas del mes llevan una medalla y la tarjeta muestra sus ventas y el ticket medio.</li>
<li>Cada tarjeta tiene iconos con rótulo (al pasar el ratón): <strong>Mensajes</strong> (chat con esa persona), <strong>Distribución del Trabajo</strong>, WhatsApp, email y <strong>Turnos de este empleado</strong>. Editar la ficha y eliminar están en el menú «⋯».</li>
<li><strong>Historial de Personal</strong> guarda quién cambió qué: turnos creados, editados o borrados, PIN restablecidos, fichajes hechos por otra persona.</li>
<li>Para eliminar a un empleado hace falta el PIN del negocio. Se borran sus turnos y su horario fijo, pero no sus fichajes.</li>
</ul>

<h4>Quién ve qué</h4>
<table><thead><tr><th>Quién</th><th>Qué puede hacer</th></tr></thead><tbody><tr><td>Propietario</td><td>Todo lo de este capítulo.</td></tr><tr><td>Empleado sin edición</td><td>En Personal solo ve su propia tarjeta (fichar, sus horas, pedir cambios). En el Calendario ve a todo el equipo, sin poder tocar nada.</td></tr><tr><td>Jefe con edición (cocina o sala)</td><td>En Personal también solo ve su tarjeta: los teléfonos, emails y PIN de sus compañeros son cosa del propietario. En Día y Semana ve a todo el equipo y puede editar o eliminar turnos que ya existen. No da de alta empleados, no edita fichas ni reparte horarios fijos.</td></tr><tr><td>Repartidor</td><td>Igual que cualquier otro empleado de Sala.</td></tr></tbody></table>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si un jefe con edición intenta guardar una ficha, la app le avisa de que las fichas las lleva solo el propietario y le recuerda que sí puede organizar turnos desde Día y Semana.</div>
<p>En el móvil las tarjetas van en una columna y la vista Semana se convierte en una tarjeta por empleado.</p>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>No veo «Añadir Empleado» ni puedo guardar fichas</strong>: solo el propietario da de alta y edita al personal.</li>
<li><strong>No puedo crear un turno desde el Calendario</strong>: es una vista. Los turnos nuevos se ponen desde la tarjeta del empleado, con <strong>Turnos de este empleado</strong>.</li>
<li><strong>Un empleado no consigue entrar</strong>: mira que su casilla <strong>Activo</strong> esté marcada. Si olvidó el PIN, <strong>Restablecer PIN a 1234</strong> en su ficha.</li>
<li><strong>Cambié el horario fijo y un día no cambió</strong>: ese día lo habías editado a mano antes y ya no sigue el patrón.</li>
<li><strong>«Pedir cambio de turno» dice que no hay turnos</strong>: solo se puede cambiar un turno con 24 horas de antelación, y hace falta que haya compañeros de su misma área.</li>
<li><strong>Una vacación sale rechazada por días</strong>: el empleado pide más de los que le quedan; revisa <strong>Días de vacaciones al año</strong> en su ficha.</li>
<li><strong>Alguien fichó mal</strong>: corrige el fichaje desde <strong>Ver últimos fichajes</strong> con el PIN del negocio.</li>
<li><strong>Un empleado de cocina no sale en Sala</strong>: cada área tiene su equipo. Entra por la carpeta que le corresponde.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Aquí dones d'alta el teu equip, organitzes els seus torns, veus qui està treballant ara mateix i resols el que et demanen (canvis de torn i vacances). És també el lloc on cada empleat fitxa l'entrada i la sortida, i d'aquí surt el registre de jornada que el teu negoci ha de guardar. S'obre des de la targeta <strong>Personal</strong> de Cuina o de Sala: cada àrea té el seu propi equip i el seu propi horari.</p>
<p>Té dues pestanyes:</p>
<table><thead><tr><th>Pestanya</th><th>Per a què serveix</th></tr></thead><tbody><tr><td><strong>Personal</strong></td><td>Una targeta per empleat: qui està fitxat, la seva fitxa, els seus missatges i els seus torns. A dalt, el resum de l'equip i el que espera la teva resposta.</td></tr><tr><td><strong>Calendari</strong></td><td>Els torns en tres vistes: <strong>Dia</strong>, <strong>Setmana</strong> i <strong>Mes</strong>. És per mirar i corregir, no per repartir.</td></tr></tbody></table>

<h4>Donar d'alta un empleat (només el propietari)</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">A <strong>Personal</strong> prem <strong>Afegir Empleat</strong>. L'empleat es crea a l'àrea des de la qual has entrat: si ets a Cuina, és de cuina; si ets a Sala, és de sala.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A <strong>Qui és</strong> escriu el <strong>Nom</strong>, el <strong>Rol</strong> (text lliure: «Cap de cuina», «Cambrera») i tria el seu <strong>Color identificatiu</strong>. Aquest color és l'aro del seu avatar a totes les pantalles. Si no t'agrada cap, fes servir <strong>Un altre color</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A <strong>Com localitzar-lo</strong> posa el <strong>Telèfon</strong> i l'<strong>Email</strong>. A la seva targeta apareixeran els botons de WhatsApp i d'email (només els veus tu). Cada icona de la targeta porta el seu rètol: passa-hi el ratolí o, en tauleta i mòbil, <strong>mantén el dit mig segon</strong> i et diu què fa (sense executar-ho).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A <strong>Vacances</strong> escriu els <strong>Dies de vacances a l'any</strong>. Si ho deixes buit, l'app no controla quants li queden.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">A <strong>Accés i permisos</strong> revisa les caselles (a sota t'explico cadascuna) i prem <strong>Desar</strong>.</div></div>

<h4>Les caselles d'«Accés i permisos»</h4>
<ul>
<li><strong>Actiu (pot entrar a Cuina amb el seu PIN)</strong>: desmarca-la si algú deixa de treballar amb tu. El seu PIN deixa de servir, però la seva fitxa i els seus fitxatges es conserven. Pots tornar-la a marcar quan vulguis. Només surt en editar un empleat ja creat.</li>
<li><strong>Pot entrar en mode edició de Cuina amb el seu PIN</strong>: pensada per a un cap de cuina o de sala. Podrà tocar els torns i l'estoc de la seva àrea, però no gestiona personal (més avall, a «Qui veu què»).</li>
<li><strong>És repartidor</strong> (només a Sala): el posa al repartiment automàtic de comandes a domicili mentre estigui de torn. No canvia res del que veu a l'app.</li>
<li><strong>PIN de fitxatge</strong>: tot empleat nou comença amb el PIN <strong>1234</strong>. La primera vegada que fitxa o que entra per Accés Empleats, l'app li demana crear el seu (4 dígits, i no pot ser 1234). Si l'oblida, entra a la seva fitxa i prem <strong>Restablir PIN a 1234</strong> (et demana confirmació i queda anotat).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Per entrar, l'empleat fa servir <strong>Accés Empleats</strong> a la pantalla inicial: el seu nom, el seu PIN i el codi del negoci. No cal donar-lo d'alta a cada aparell.</div>

<h4>Donar torns a un empleat</h4>
<p>El calendari no serveix per crear torns nous: els torns es reparteixen des de la targeta de l'empleat, amb la icona de calendari (<strong>Torns d'aquest empleat</strong>, només propietari). S'obre una finestra amb tres opcions:</p>
<ul>
<li><strong>Horari fix</strong>: un patró de dilluns a diumenge que es repeteix sol, per sempre. Per a cada dia tries el tipus de torn i les hores. L'app crea soleta els torns de les properes 4 setmanes i continua creant-los. Si més endavant canvies el patró, es refan els torns futurs automàtics; els que hagis tocat a mà es queden tal com estan. <strong>Treure horari fix</strong> deixa de generar torns nous, però no esborra els que ja existeixen.</li>
<li><strong>Assignar torns per període</strong>: tries dates (<strong>Des de</strong> i <strong>Fins a</strong>, fins a uns dos mesos) i l'app et mostra una targeta per dia per posar el tipus i les hores. Marca <strong>Torn partit (2 trams)</strong> si treballa en dues tandes, o <strong>Festiu</strong> si aquell dia descansa. Prem <strong>Aplicar</strong>: si ja hi havia un torn aquell dia, se substitueix.</li>
<li><strong>Sense torns assignats</strong>: no cal triar res ara; tanca la finestra.</li>
</ul>
<p>Els tipus de torn són <strong>Matí</strong>, <strong>Tarda</strong>, <strong>Partit</strong>, <strong>Descans</strong>, <strong>Vacances</strong>, <strong>Baixa</strong> i <strong>Altre</strong>. Vacances i Baixa no entren a l'horari fix (ningú és de vacances tots els dilluns): les vacances es creen soles en aprovar una sol·licitud, i una baixa es posa editant el torn d'aquell dia.</p>

<h4>El Calendari: Dia, Setmana i Mes</h4>
<ul>
<li><strong>Dia</strong>: fes servir les fletxes per canviar de dia, prem la data per triar-ne una altra i <strong>Avui</strong> per tornar. A dalt veus quants <strong>Treballen</strong>, les <strong>Hores planificades</strong>, quants descansen o són absents i quants no tenen torn. A sota, una línia d'hores amb una barra per empleat (el torn partit surt en dos trams) i <strong>Personal per hora</strong>: quantes persones hi ha a cada hora, per veure si el torn de dinars va curt.</li>
<li><strong>Setmana</strong>: una taula amb els set dies, les hores de cada empleat i quants treballen cada dia. Al mòbil es converteix en una targeta per empleat. Prémer el dia de la capçalera et porta a la vista Dia. <strong>Imprimir horari</strong> treu un full apaïsat per penjar a cuina o a la barra.</li>
<li><strong>Mes</strong>: la graella del mes amb quantes persones treballen cada dia. El selector de dalt (‹ mes ▾ ›) et diu quants torns hi ha a cada mes. «Dies sense ningú» compta, d'avui endavant, els dies sense cap torn de treball. Prem un dia per obrir-lo a la vista Dia.</li>
</ul>
<p>Per <strong>corregir un torn que ja existeix</strong>: a Dia, el menú «⋯» de la seva fila (<strong>Editar</strong> o <strong>Eliminar</strong>); a Setmana, prem el torn. Només ho poden fer el propietari i un empleat amb permís d'edició. Si el torn venia de l'horari fix, l'app pregunta <strong>Només aquest dia</strong> o <strong>Per sempre</strong>. Si aquell empleat ja tenia un altre torn aquella data, pregunta abans de substituir-lo.</p>

<h4>Fitxar: entrada, sortida i hores</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">L'empleat prem la seva targeta (el botó diu <strong>Fitxar</strong>). Si ha entrat amb Accés Empleats, s'obre directament la seva fitxa. En un aparell compartit, l'app li demana el seu PIN (val el seu o el del negoci).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Prem <strong>Entrada</strong> en començar i <strong>Sortida</strong> en acabar. En fitxar l'entrada, l'app li ensenya el resum del torn: el seu torn d'avui, les reserves del dia (a Sala), la neteja que li toca i la <strong>Nota per al següent torn</strong> que va deixar el company anterior.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A la seva fitxa veu <strong>Hores aquesta setmana</strong> i <strong>Hores aquest mes</strong>, i <strong>Veure últims fitxatges</strong>: els 20 últims, amb les hores previstes del torn i un avís en vermell si el fitxat s'aparta més d'un quart d'hora del planificat.</div></div>
<p>L'app avisa, sense bloquejar res, si algú fitxa amb menys de 12 hores de descans des de la seva última sortida, i al propietari l'avisa de qui porta 9 hores o més seguides fitxat.</p>
<p>Com a propietari, <strong>Veure fitxa</strong> et mostra les hores i els fitxatges de cada persona, però no pots fitxar per ells. Si algú fitxa amb el PIN del negoci en lloc del seu, queda anotat a l'<strong>Historial de Personal</strong>.</p>
<p><strong>Corregir un fitxatge</strong>: a <strong>Veure últims fitxatges</strong>, prem el cadenat de la fila i escriu el PIN del negoci. L'app guarda l'hora original i marca el fitxatge com a editat, perquè el registre continuï sent fiable.</p>

<h4>El registre de jornada</h4>
<p>Tots els fitxatges queden guardats. Encara que eliminis un empleat, <strong>els seus fitxatges no s'esborren</strong>: la llei obliga a conservar-los 4 anys. Per donar-ho al teu gestor: <strong>Gestió → Gestió Econòmica → Enviar al gestor</strong>, marca <strong>Registre de jornada</strong> i tria el mes. Surt un full amb dia, empleat, entrada, sortida i hores, i si un fitxatge es va corregir, quina era l'hora original.</p>

<h4>Canvis de torn i vacances</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">L'empleat, des de la seva fitxa, prem <strong>Demanar canvi de torn</strong>, tria el torn (ha de faltar com a mínim 24 hores) i el company de la seva àrea que el cobriria.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">El company veu a la seva fitxa <strong>T'han demanat cobrir un torn</strong> i prem <strong>Acceptar</strong> o <strong>Rebutjar</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si accepta, la petició arriba al propietari, a <strong>Requereix la teva atenció</strong> (a dalt de Personal). Només quan ell prem <strong>Acceptar</strong> el torn canvia de mans. No es pot aprovar si qui cobreix ja té un altre torn aquell dia.</div></div>
<p>Les vacances funcionen igual de simple: l'empleat prem <strong>Demanar vacances</strong>, tria <strong>Des de</strong> i <strong>Fins a</strong> i, si vol, deixa una nota. L'app li diu quants dies li queden i no el deixa demanar-ne més. El propietari veu la sol·licitud a <strong>Requereix la teva atenció</strong> amb els dies que li resten; en <strong>Acceptar</strong>, l'app posa un torn de Vacances a cada dia del rang. Mentre sigui <strong>Pendent</strong>, l'empleat pot <strong>Retirar sol·licitud</strong>.</p>

<h4>El que veus com a propietari a Personal</h4>
<ul>
<li>A dalt, quatre xifres: <strong>A la plantilla</strong>, <strong>Treballant ara</strong> (amb el fitxatge obert), <strong>Esperen resposta</strong> (canvis de torn i vacances; prem-la i baixa a la llista) i <strong>Clima de l'equip aquesta setmana</strong>.</li>
<li><strong>Requereix la teva atenció</strong>: cada canvi de torn, vacances o jornada llarga, amb els seus botons. Si no hi ha res, no apareix.</li>
<li>El clima surt d'una pregunta opcional d'un toc (una carona de l'1 al 5) que cada empleat pot contestar un cop per setmana en obrir la seva fitxa. És anònima per a la resta de l'equip.</li>
<li>A Sala, les tres persones amb més vendes del mes porten una medalla i la targeta mostra les seves vendes i el tiquet mitjà.</li>
<li>Cada targeta té icones amb rètol (en passar el ratolí): <strong>Missatges</strong> (xat amb aquella persona), <strong>Distribució de la Feina</strong>, WhatsApp, email i <strong>Torns d'aquest empleat</strong>. Editar la fitxa i eliminar són al menú «⋯».</li>
<li><strong>Historial de Personal</strong> guarda qui ha canviat què: torns creats, editats o esborrats, PIN restablerts, fitxatges fets per una altra persona.</li>
<li>Per eliminar un empleat cal el PIN del negoci. S'esborren els seus torns i el seu horari fix, però no els seus fitxatges.</li>
</ul>

<h4>Qui veu què</h4>
<table><thead><tr><th>Qui</th><th>Què pot fer</th></tr></thead><tbody><tr><td>Propietari</td><td>Tot el d'aquest capítol.</td></tr><tr><td>Empleat sense edició</td><td>A Personal només veu la seva pròpia targeta (fitxar, les seves hores, demanar canvis). Al Calendari veu tot l'equip, sense poder tocar res.</td></tr><tr><td>Cap amb edició (cuina o sala)</td><td>A Personal també només veu la seva targeta: els telèfons, emails i PIN dels companys són cosa del propietari. A Dia i Setmana veu tot l'equip i pot editar o eliminar torns que ja existeixen. No dona d'alta empleats, no edita fitxes ni reparteix horaris fixos.</td></tr><tr><td>Repartidor</td><td>Igual que qualsevol altre empleat de Sala.</td></tr></tbody></table>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si un cap amb edició intenta desar una fitxa, l'app l'avisa que les fitxes les porta només el propietari i li recorda que sí que pot organitzar torns des de Dia i Setmana.</div>
<p>Al mòbil les targetes van en una columna i la vista Setmana es converteix en una targeta per empleat.</p>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No veig «Afegir Empleat» ni puc desar fitxes</strong>: només el propietari dona d'alta i edita el personal.</li>
<li><strong>No puc crear un torn des del Calendari</strong>: és una vista. Els torns nous es posen des de la targeta de l'empleat, amb <strong>Torns d'aquest empleat</strong>.</li>
<li><strong>Un empleat no aconsegueix entrar</strong>: mira que la seva casella <strong>Actiu</strong> estigui marcada. Si ha oblidat el PIN, <strong>Restablir PIN a 1234</strong> a la seva fitxa.</li>
<li><strong>He canviat l'horari fix i un dia no ha canviat</strong>: aquell dia l'havies editat a mà abans i ja no segueix el patró.</li>
<li><strong>«Demanar canvi de torn» diu que no hi ha torns</strong>: només es pot canviar un torn amb 24 hores d'antelació, i cal que hi hagi companys de la seva mateixa àrea.</li>
<li><strong>Una vacança surt rebutjada per dies</strong>: l'empleat en demana més dels que li queden; revisa <strong>Dies de vacances a l'any</strong> a la seva fitxa.</li>
<li><strong>Algú ha fitxat malament</strong>: corregeix el fitxatge des de <strong>Veure últims fitxatges</strong> amb el PIN del negoci.</li>
<li><strong>Un empleat de cuina no surt a Sala</strong>: cada àrea té el seu equip. Entra per la carpeta que li correspon.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>This is where you add your team, organise their shifts, see who is working right now and deal with what they ask you for (shift swaps and time off). It is also where each employee clocks in and out, and where the working-time record your business has to keep comes from. You open it from the <strong>Staff</strong> card in Kitchen or in the Dining Room: each area has its own team and its own schedule.</p>
<p>It has two tabs:</p>
<table><thead><tr><th>Tab</th><th>What it is for</th></tr></thead><tbody><tr><td><strong>Staff</strong></td><td>One card per employee: who is clocked in, their profile, their messages and their shifts. At the top, the team summary and whatever is waiting for your answer.</td></tr><tr><td><strong>Calendar</strong></td><td>Shifts in three views: <strong>Day</strong>, <strong>Week</strong> and <strong>Month</strong>. It is for looking and correcting, not for assigning.</td></tr></tbody></table>

<h4>Adding an employee (owner only)</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">In <strong>Staff</strong> press <strong>Add Employee</strong>. The employee is created in the area you came in from: in Kitchen they are kitchen staff, in the Dining Room they are floor staff.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Under <strong>Who they are</strong> type the <strong>Name</strong>, the <strong>Role</strong> (free text: "Head chef", "Waitress") and pick an <strong>Identifying color</strong>. That colour is the ring around their avatar on every screen. If you don't like any, use <strong>Another colour</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Under <strong>How to reach them</strong> enter <strong>Phone</strong> and <strong>Email</strong>. Their card will show WhatsApp and email buttons (only you see them). Every icon on the card has a label: hover over it or, on a tablet or phone, <strong>hold your finger on it for half a second</strong> and it tells you what it does (without running it).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Under <strong>Time off</strong> type the <strong>Vacation days per year</strong>. If you leave it empty, the app doesn't track how many they have left.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Under <strong>Access and permissions</strong> check the boxes (each one is explained below) and press <strong>Save</strong>.</div></div>

<h4>The "Access and permissions" boxes</h4>
<ul>
<li><strong>Active (can enter Kitchen with their PIN)</strong>: untick it when someone stops working with you. Their PIN stops working, but their profile and clock-ins are kept. You can tick it again whenever you want. It only appears when editing an employee who already exists.</li>
<li><strong>Can unlock Kitchen edit mode with their PIN</strong>: meant for a head chef or floor manager. They can change shifts and stock in their own area, but they don't manage staff (see "Who sees what" below).</li>
<li><strong>Is a delivery rider</strong> (Dining Room only): puts them into the automatic assignment of home-delivery orders while they are on shift. It changes nothing about what they see in the app.</li>
<li><strong>Clock-in PIN</strong>: every new employee starts with PIN <strong>1234</strong>. The first time they clock in or sign in through Staff Access, the app asks them to create their own (4 digits, and it can't be 1234). If they forget it, open their profile and press <strong>Reset PIN to 1234</strong> (it asks for confirmation and is logged).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>To sign in, employees use <strong>Staff Access</strong> on the start screen: their name, their PIN and the business code. They don't need to be registered on each device.</div>

<h4>Giving an employee shifts</h4>
<p>The calendar can't create new shifts: shifts are assigned from the employee's card, with the calendar icon (<strong>This employee's shifts</strong>, owner only). A window opens with three options:</p>
<ul>
<li><strong>Fixed schedule</strong>: a Monday-to-Sunday pattern that repeats on its own, forever. For each day you choose the shift type and the hours. The app creates the shifts for the next 4 weeks by itself and keeps creating them. If you change the pattern later, the future automatic shifts are rebuilt; the ones you edited by hand stay as they are. <strong>Remove fixed schedule</strong> stops creating new shifts but doesn't delete the existing ones.</li>
<li><strong>Assign shifts by period</strong>: you pick dates (<strong>From</strong> and <strong>To</strong>, up to about two months) and the app shows one card per day to set the type and hours. Tick <strong>Split shift (2 segments)</strong> if they work in two stretches, or <strong>Holiday</strong> if they rest that day. Press <strong>Apply</strong>: if a shift already existed that day, it is replaced.</li>
<li><strong>No shifts assigned</strong>: nothing to choose right now; just close the window.</li>
</ul>
<p>The shift types are <strong>Morning</strong>, <strong>Afternoon</strong>, <strong>Split</strong>, <strong>Rest</strong>, <strong>Vacation</strong>, <strong>Leave</strong> and <strong>Other</strong>. Vacation and Leave are not part of the fixed schedule (nobody is on holiday every Monday): vacations are created automatically when you approve a request, and a leave is set by editing that day's shift.</p>

<h4>The Calendar: Day, Week and Month</h4>
<ul>
<li><strong>Day</strong>: use the arrows to change day, press the date to pick another one and <strong>Today</strong> to come back. At the top you see how many are <strong>Working</strong>, the <strong>Planned hours</strong>, how many are off or away and how many have no shift. Below, an hour line with one bar per employee (a split shift shows as two segments) and <strong>Staff per hour</strong>: how many people there are in each hour, to see whether the lunch shift is short-handed.</li>
<li><strong>Week</strong>: a table with the seven days, each employee's hours and how many work each day. On a phone it becomes one card per employee. Pressing a day in the header takes you to the Day view. <strong>Print schedule</strong> produces a landscape sheet to pin up in the kitchen or at the bar.</li>
<li><strong>Month</strong>: the month grid with how many people work each day. The selector at the top (‹ month ▾ ›) tells you how many shifts there are in each month. "Days with nobody" counts, from today on, the days with no working shift. Press a day to open it in the Day view.</li>
</ul>
<p>To <strong>correct a shift that already exists</strong>: in Day, the "⋯" menu on its row (<strong>Edit</strong> or <strong>Delete</strong>); in Week, press the shift. Only the owner and an employee with edit permission can do this. If the shift came from the fixed schedule, the app asks <strong>Only this day</strong> or <strong>Forever</strong>. If that employee already had another shift that date, it asks before replacing it.</p>

<h4>Clocking in: entry, exit and hours</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">The employee presses their card (the button says <strong>Clock in</strong>). If they signed in through Staff Access, their profile opens straight away. On a shared device, the app asks for their PIN (theirs or the business PIN both work).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">They press <strong>Clock in</strong> when they start and <strong>Clock out</strong> when they finish. When clocking in, the app shows the shift summary: today's shift, the day's reservations (in the Dining Room), the cleaning that falls to them and the <strong>Note for the next shift</strong> left by the previous colleague.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">In their profile they see <strong>Hours this week</strong> and <strong>Hours this month</strong>, and <strong>View last clock-ins</strong>: the latest 20, with the shift's planned hours and a red warning if what was clocked differs from the plan by more than a quarter of an hour.</div></div>
<p>The app warns, without blocking anything, if someone clocks in with less than 12 hours of rest since their last exit, and it warns the owner about anyone who has been clocked in for 9 hours or more in a row.</p>
<p>As owner, <strong>Open profile</strong> shows you each person's hours and clock-ins, but you can't clock in for them. If someone clocks in with the business PIN instead of their own, it is logged in the <strong>Staff history</strong>.</p>
<p><strong>Correcting a clock-in</strong>: in <strong>View last clock-ins</strong>, press the padlock on the row and type the business PIN. The app keeps the original time and marks the record as edited, so the log stays reliable.</p>

<h4>The working-time record</h4>
<p>All clock-ins are stored. Even if you delete an employee, <strong>their clock-ins are not deleted</strong>: the law requires keeping them for 4 years. To give it to your accountant: <strong>Management → Financial Management → Send to accountant</strong>, tick <strong>Working-time record</strong> and choose the month. You get a sheet with day, employee, entry, exit and hours, and, if a clock-in was corrected, what the original time was.</p>

<h4>Shift swaps and time off</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">From their profile, the employee presses <strong>Request shift swap</strong>, chooses the shift (it must be at least 24 hours away) and the colleague from their area who would cover it.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">The colleague sees <strong>You've been asked to cover a shift</strong> in their profile and presses <strong>Accept</strong> or <strong>Reject</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">If they accept, the request reaches the owner, under <strong>Needs your attention</strong> (at the top of Staff). Only when the owner presses <strong>Accept</strong> does the shift change hands. It can't be approved if the person covering already has another shift that day.</div></div>
<p>Time off works just as simply: the employee presses <strong>Request time off</strong>, picks <strong>From</strong> and <strong>To</strong> and, if they want, leaves a note. The app tells them how many days they have left and won't let them ask for more. The owner sees the request under <strong>Needs your attention</strong> with the days remaining; on <strong>Accept</strong>, the app puts a Vacation shift on every day of the range. While it is <strong>Pending</strong>, the employee can <strong>Withdraw request</strong>.</p>

<h4>What you see as owner in Staff</h4>
<ul>
<li>At the top, four figures: <strong>On the team</strong>, <strong>Working now</strong> (with an open clock-in), <strong>Waiting for you</strong> (shift swaps and time off; press it and it scrolls to the list) and <strong>Team mood this week</strong>.</li>
<li><strong>Needs your attention</strong>: each shift swap, time-off request or long shift, with its buttons. If there's nothing, it doesn't show.</li>
<li>The mood comes from an optional one-tap question (a face from 1 to 5) that each employee can answer once a week when opening their profile. It is anonymous to the rest of the team.</li>
<li>In the Dining Room, the three people with the highest sales of the month wear a medal and the card shows their sales and average ticket.</li>
<li>Each card has labelled icons (shown on hover): <strong>Messages</strong> (chat with that person), <strong>Work Distribution</strong>, WhatsApp, email and <strong>This employee's shifts</strong>. Editing the profile and deleting are in the "⋯" menu.</li>
<li><strong>Staff history</strong> records who changed what: shifts created, edited or deleted, PINs reset, clock-ins made by someone else.</li>
<li>Deleting an employee needs the business PIN. Their shifts and fixed schedule are deleted, but their clock-ins are not.</li>
</ul>

<h4>Who sees what</h4>
<table><thead><tr><th>Who</th><th>What they can do</th></tr></thead><tbody><tr><td>Owner</td><td>Everything in this chapter.</td></tr><tr><td>Employee without edit permission</td><td>In Staff they only see their own card (clock in, their hours, request changes). In the Calendar they see the whole team, but can't change anything.</td></tr><tr><td>Manager with edit permission (kitchen or floor)</td><td>In Staff they also see only their own card: colleagues' phones, emails and PINs are the owner's business. In Day and Week they see the whole team and can edit or delete shifts that already exist. They can't add employees, edit profiles or assign fixed schedules.</td></tr><tr><td>Delivery rider</td><td>The same as any other Dining Room employee.</td></tr></tbody></table>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>If a manager with edit permission tries to save a profile, the app tells them profiles are handled by the owner only and reminds them they can still organise shifts from Day and Week.</div>
<p>On a phone the cards go in one column and the Week view becomes one card per employee.</p>

<h4>If something doesn't work</h4>
<ul>
<li><strong>I can't see "Add Employee" or can't save profiles</strong>: only the owner adds and edits staff.</li>
<li><strong>I can't create a shift from the Calendar</strong>: it's a view. New shifts are set from the employee's card, with <strong>This employee's shifts</strong>.</li>
<li><strong>An employee can't sign in</strong>: check that their <strong>Active</strong> box is ticked. If they forgot their PIN, use <strong>Reset PIN to 1234</strong> in their profile.</li>
<li><strong>I changed the fixed schedule and one day didn't change</strong>: you had edited that day by hand earlier and it no longer follows the pattern.</li>
<li><strong>"Request shift swap" says there are no shifts</strong>: only shifts at least 24 hours away can be swapped, and there must be colleagues in the same area.</li>
<li><strong>A time-off request is refused for days</strong>: the employee is asking for more than they have left; check <strong>Vacation days per year</strong> in their profile.</li>
<li><strong>Someone clocked in wrong</strong>: correct the clock-in from <strong>View last clock-ins</strong> with the business PIN.</li>
<li><strong>A kitchen employee doesn't show in the Dining Room</strong>: each area has its own team. Enter through the folder they belong to.</li>
</ul>`}
  },
  {id:'distribucion', area:'cocina',
    title:{es:`<i class="ti ti-clipboard-list"></i> Distribución del Trabajo`, ca:`<i class="ti ti-clipboard-list"></i> Distribució de la Feina`, en:`<i class="ti ti-clipboard-list"></i> Work Distribution`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>El <strong>Horario del Personal</strong> dice <strong>cuándo</strong> trabaja cada uno; la <strong>Distribución del Trabajo</strong> dice <strong>qué tiene que hacer</strong>. Cada empleado tiene su propio panel con su día, su semana, las tareas que le tocan, los platos (o zonas) que lleva y el manual de su puesto. Cuando el empleado lo abre, la pantalla se llama <strong>Mi puesto</strong>; tú, como propietario, la ves como Distribución del Trabajo y desde ella repartes el trabajo de todo el equipo. Está en Cocina y en Sala, cada una con su equipo.</p>

<h4>Si eres el propietario: la lista del equipo</h4>
<p>Al entrar ves primero a tu equipo:</p>
<ul>
<li>Arriba, tres cifras: <strong>Hoy hecho</strong> (tareas hechas de todo el equipo), <strong>Atrasadas</strong> (de días anteriores de esta semana) y <strong>Manual sin leer</strong>.</li>
<li>Un buscador y <strong>Imprimir todo</strong>: una hoja por empleado con lo que lleva a su cargo y sus tareas de cada día de la semana.</li>
<li>Una tarjeta por empleado: cuántas tareas lleva hechas hoy (con barra), su turno de hoy o <strong>Sin turno hoy</strong>, las atrasadas, si su manual está <strong>Leído</strong>, <strong>Por leer</strong> o <strong>Sin manual</strong>, y cuántos platos o rangos tiene. Pulsa la tarjeta (<strong>Abrir su puesto</strong>) para entrar. El icono de la esquina abre su ficha de fichaje.</li>
</ul>

<h4>El panel de un empleado, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Hoy</strong>. Arriba ves la fecha, su turno y si está fichado («Fichado desde las 09:02» o «Fuera de servicio»), y una barra con «3 de 7 tareas de hoy hechas». Si lo tiene todo hecho aparece «Todo hecho por hoy. Buen trabajo.». El botón principal es <strong>Mi ficha y fichaje</strong> (para ti, <strong>Ver ficha</strong>) y también puedes <strong>Imprimir</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Mi semana</strong>. Una tira con los siete días: la letra de su turno (M, T, P…) y las tareas hechas sobre el total. Pulsa un día para ver sus tareas debajo. Las flechas cambian de semana y <strong>Hoy</strong> vuelve. Si hay tareas atrasadas, un aviso rojo («2 tareas atrasadas») con el botón <strong>Verlas</strong> te lleva al primer día con algo sin hacer.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>La lista del día</strong>. Cada tarea tiene una casilla. Marcar es directo; <strong>desmarcar pregunta</strong> antes («¿Seguro que quieres desmarcar esta tarea?»), para que un dedo de más en la tablet no borre lo hecho.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Añadir una tarea</strong>: escribe en el campo y elige <strong>Cada lunes</strong> (se repite todas las semanas ese día) o <strong>Solo este día</strong>, y pulsa <strong>Añadir</strong>. Al propietario le sale marcado «Cada…» y al empleado, «Solo este día».</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Para cambiar o quitar una tarea, usa el menú «⋯» de su fila (<strong>Editar</strong> o <strong>Eliminar</strong>). El propietario puede con todas; un empleado, solo con las que se puso él mismo.</div></div>
<p>Las tareas del día vienen de cuatro sitios y se ven juntas:</p>
<table><thead><tr><th>Etiqueta</th><th>De dónde viene</th></tr></thead><tbody><tr><td><strong>Cada lunes</strong> (o el día que sea)</td><td>Tareas semanales fijas que pones tú.</td></tr><tr><td><strong>Solo este día</strong></td><td>Tareas puntuales de una fecha.</td></tr><tr><td><strong>Limpieza</strong></td><td>Tareas de <strong>APPCC e Higiene</strong> (Limpieza Mensual) que tienen a esa persona de responsable ese día. No hay que duplicarlas.</td></tr><tr><td><strong>Promo</strong></td><td>Acciones de <strong>Promoción</strong> asignadas a esa persona para esa fecha.</td></tr></tbody></table>
<p>Cada tarea de a mano dice quién la puso: <strong>Puesta por el jefe</strong> (así la ven todos, también tú; las del empleado dicen «Puesta por Ana») o <strong>Puesta por mí</strong>, en verde y con la fila más clara. Los contadores «hechas / total» salen en <strong>verde</strong> si está todo hecho y en <strong>rojo</strong> si queda algo de un día que ya pasó.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Reparte las tareas poco agradecidas (limpieza a fondo, control de caducidades) como «Cada martes» a personas distintas cada semana: queda constancia de a quién le tocaba.</div>

<h4>Lo que lleva a su cargo</h4>
<p>En Cocina, el botón <strong>Platos y elaboraciones a su cargo</strong> abre una ventana con todos los platos y las elaboraciones de esa persona. Al tocar uno se <strong>lee su receta ahí mismo</strong>, sin salir: alérgenos, ingredientes (para las raciones de la ficha técnica), paso a paso con minutos, temperatura y el aviso <strong>Ojo</strong> del punto crítico. Sirve para formar a alguien nuevo: nada más entrar sabe qué platos tiene que dominar.</p>
<ul>
<li>El propietario asigna con el desplegable <strong>— Selecciona plato —</strong> (platos con ficha técnica y elaboraciones base) y <strong>Asignar</strong>. Para quitar uno, el menú «⋯» → <strong>Quitar de su cargo</strong>.</li>
<li>Si un plato se borró del Escandallo o de la ficha, sale con el icono roto y el aviso «Ya no existe su ficha ni su escandallo»: quítalo o vuelve a crearlo.</li>
</ul>
<p>En Sala el botón se llama <strong>Rangos a su cargo</strong>: escribe zonas o mesas («Mesas 1-8», «Barra», «Terraza») y pulsa <strong>Asignar</strong>. Cada rango es una etiqueta; el menú «⋯» la quita.</p>

<h4>El manual del puesto</h4>
<p>Es lo que se espera de cada persona, por escrito. Solo lo escribe el propietario, con cuatro apartados: <strong>Obligaciones</strong>, <strong>Responsabilidades</strong>, <strong>Normas y límites</strong> y <strong>Consejos y contactos</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">En la tarjeta <strong>Manual del puesto</strong> pulsa el lápiz. Si está vacío, <strong>Empezar con una plantilla</strong> te da frases de partida para Cocina o para Sala.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En cada apartado escribe una frase corta y, si quieres, un detalle, y pulsa <strong>Añadir</strong>. El menú «⋯» de cada frase permite editarla, subirla, bajarla o eliminarla. Cuando acabes, <strong>Listo</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Cada cambio que haces obliga a la persona a volver a confirmar que lo ha leído.</strong> Pasa de <strong>Leído</strong> a «Ha cambiado: por leer».</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">El empleado abre el manual, lo lee y pulsa <strong>He leído mi manual</strong>. Queda guardada la fecha, y tú ves «Ana lo leyó el 3 nov».</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Imprimir</strong> saca el manual con una casilla de firma («Recibí y entiendo este manual»).</div></div>

<h4>El resto del panel</h4>
<ul>
<li><strong>Mis próximos turnos</strong>: los cuatro siguientes, más sus horas de la semana, las tareas de la semana y, en Sala, sus ventas.</li>
<li><strong>Nota para el siguiente turno</strong>: un cuadro de texto («no queda salmón, la mesa 5 pidió tarta sin gluten…»). Se guarda solo y lo lee quien ficha después, en su resumen del turno.</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
<li><strong>Un empleado solo ve su propio panel.</strong> No puede abrir el de un compañero, ni siquiera con su PIN. Imprimir también se limita a lo suyo. Si lo intenta, la app le dice «Solo puedes ver tu propio puesto de trabajo».</li>
<li>Un jefe con permiso de edición entra igual: ve el suyo y no reparte trabajo ajeno. <strong>Asignar platos, rangos y manuales es solo del propietario.</strong></li>
<li>Todo se guarda en la nube del negocio y se ve en el resto de aparatos.</li>
<li>Cocina y Sala tienen su propio equipo y su propia distribución.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>No me deja abrir el panel de un compañero</strong>: es lo normal; cada empleado solo ve el suyo.</li>
<li><strong>No encuentro un plato para asignar</strong>: solo salen los que tienen <strong>ficha técnica</strong>, y las elaboraciones base. Créala en Fichas Técnicas.</li>
<li><strong>La casilla de una tarea de limpieza sale gris</strong>: está asignada a otra persona. Solo el propietario o su responsable puede marcarla.</li>
<li><strong>No puedo editar una tarea</strong>: la puso el jefe. Un empleado solo cambia las suyas («Puesta por mí»).</li>
<li><strong>El manual dice «Tu encargado aún no lo ha escrito»</strong>: el propietario todavía no ha escrito nada para ese puesto.</li>
<li><strong>No sale ningún empleado</strong>: primero hay que dar de alta al equipo en <strong>Horario del Personal</strong> (o con <strong>Añadir Empleado</strong>, aquí mismo).</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>L'<strong>Horari del Personal</strong> diu <strong>quan</strong> treballa cadascú; la <strong>Distribució de la Feina</strong> diu <strong>què ha de fer</strong>. Cada empleat té el seu propi panell amb el seu dia, la seva setmana, les tasques que li toquen, els plats (o zones) que porta i el manual del seu lloc. Quan l'empleat l'obre, la pantalla es diu <strong>El meu lloc</strong>; tu, com a propietari, la veus com a Distribució de la Feina i des d'allà reparteixes la feina de tot l'equip. Hi és a Cuina i a Sala, cadascuna amb el seu equip.</p>

<h4>Si ets el propietari: la llista de l'equip</h4>
<p>En entrar veus primer el teu equip:</p>
<ul>
<li>A dalt, tres xifres: <strong>Avui fet</strong> (tasques fetes de tot l'equip), <strong>Endarrerides</strong> (de dies anteriors d'aquesta setmana) i <strong>Manual sense llegir</strong>.</li>
<li>Un cercador i <strong>Imprimir tot</strong>: un full per empleat amb el que porta al seu càrrec i les seves tasques de cada dia de la setmana.</li>
<li>Una targeta per empleat: quantes tasques porta fetes avui (amb barra), el seu torn d'avui o <strong>Sense torn avui</strong>, les endarrerides, si el seu manual és <strong>Llegit</strong>, <strong>Per llegir</strong> o <strong>Sense manual</strong>, i quants plats o rangs té. Prem la targeta (<strong>Obrir el seu lloc</strong>) per entrar. La icona de la cantonada obre la seva fitxa de fitxatge.</li>
</ul>

<h4>El panell d'un empleat, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Avui</strong>. A dalt veus la data, el seu torn i si està fitxat («Fitxat des de les 09:02» o «Fora de servei»), i una barra amb «3 de 7 tasques d'avui fetes». Si ho té tot fet apareix «Tot fet per avui. Bona feina.». El botó principal és <strong>La meva fitxa i fitxatge</strong> (per a tu, <strong>Veure fitxa</strong>) i també pots <strong>Imprimir</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>La meva setmana</strong>. Una tira amb els set dies: la lletra del seu torn (M, T, P…) i les tasques fetes sobre el total. Prem un dia per veure'n les tasques a sota. Les fletxes canvien de setmana i <strong>Avui</strong> torna. Si hi ha tasques endarrerides, un avís vermell («2 tasques endarrerides») amb el botó <strong>Veure-les</strong> et porta al primer dia amb alguna cosa sense fer.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>La llista del dia</strong>. Cada tasca té una casella. Marcar és directe; <strong>desmarcar pregunta</strong> abans («Segur que vols desmarcar aquesta tasca?»), perquè un dit de més a la tauleta no esborri el que s'ha fet.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Afegir una tasca</strong>: escriu al camp i tria <strong>Cada dilluns</strong> (es repeteix totes les setmanes aquell dia) o <strong>Només aquest dia</strong>, i prem <strong>Afegir</strong>. Al propietari li surt marcat «Cada…» i a l'empleat, «Només aquest dia».</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Per canviar o treure una tasca, fes servir el menú «⋯» de la seva fila (<strong>Editar</strong> o <strong>Eliminar</strong>). El propietari pot amb totes; un empleat, només amb les que s'ha posat ell mateix.</div></div>
<p>Les tasques del dia vénen de quatre llocs i es veuen juntes:</p>
<table><thead><tr><th>Etiqueta</th><th>D'on ve</th></tr></thead><tbody><tr><td><strong>Cada dilluns</strong> (o el dia que sigui)</td><td>Tasques setmanals fixes que poses tu.</td></tr><tr><td><strong>Només aquest dia</strong></td><td>Tasques puntuals d'una data.</td></tr><tr><td><strong>Neteja</strong></td><td>Tasques d'<strong>APPCC i Higiene</strong> (Neteja Mensual) que tenen aquella persona de responsable aquell dia. No cal duplicar-les.</td></tr><tr><td><strong>Promo</strong></td><td>Accions de <strong>Promoció</strong> assignades a aquella persona per a aquella data.</td></tr></tbody></table>
<p>Cada tasca posada a mà diu qui la va posar: <strong>Posada pel cap</strong> (així la veuen tots, també tu; les de l'empleat diuen «Posada per Ana») o <strong>Posada per mi</strong>, en verd i amb la fila més clara. Els comptadors «fetes / total» surten en <strong>verd</strong> si tot està fet i en <strong>vermell</strong> si queda alguna cosa d'un dia que ja ha passat.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Reparteix les tasques poc agraïdes (neteja a fons, control de caducitats) com a «Cada dimarts» a persones diferents cada setmana: queda constància de a qui li tocava.</div>

<h4>El que porta al seu càrrec</h4>
<p>A Cuina, el botó <strong>Plats i elaboracions al seu càrrec</strong> obre una finestra amb tots els plats i les elaboracions d'aquella persona. En tocar-ne un se'n <strong>llegeix la recepta allà mateix</strong>, sense sortir: al·lèrgens, ingredients (per a les racions de la fitxa tècnica), pas a pas amb minuts, temperatura i l'avís <strong>Ull</strong> del punt crític. Serveix per formar algú nou: just en entrar ja sap quins plats ha de dominar.</p>
<ul>
<li>El propietari assigna amb el desplegable <strong>— Selecciona plat —</strong> (plats amb fitxa tècnica i elaboracions base) i <strong>Assignar</strong>. Per treure'n un, el menú «⋯» → <strong>Treure del seu càrrec</strong>.</li>
<li>Si un plat s'ha esborrat de l'Escandall o de la fitxa, surt amb la icona trencada i l'avís «Ja no existeix la seva fitxa ni el seu escandall»: treu-lo o torna a crear-lo.</li>
</ul>
<p>A Sala el botó es diu <strong>Rangs al seu càrrec</strong>: escriu zones o taules («Taules 1-8», «Barra», «Terrassa») i prem <strong>Assignar</strong>. Cada rang és una etiqueta; el menú «⋯» la treu.</p>

<h4>El manual del lloc</h4>
<p>És el que s'espera de cada persona, per escrit. Només el redacta el propietari, amb quatre apartats: <strong>Obligacions</strong>, <strong>Responsabilitats</strong>, <strong>Normes i límits</strong> i <strong>Consells i contactes</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">A la targeta <strong>Manual del lloc</strong> prem el llapis. Si és buit, <strong>Començar amb una plantilla</strong> et dona frases de partida per a Cuina o per a Sala.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A cada apartat escriu una frase curta i, si vols, un detall, i prem <strong>Afegir</strong>. El menú «⋯» de cada frase permet editar-la, pujar-la, baixar-la o eliminar-la. Quan acabis, <strong>Llest</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Cada canvi que fas obliga la persona a tornar a confirmar que l'ha llegit.</strong> Passa de <strong>Llegit</strong> a «Ha canviat: per llegir».</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">L'empleat obre el manual, el llegeix i prem <strong>He llegit el meu manual</strong>. Queda guardada la data, i tu veus «Ana el va llegir el 3 nov».</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Imprimir</strong> treu el manual amb una casella de signatura («He rebut i entenc aquest manual»).</div></div>

<h4>La resta del panell</h4>
<ul>
<li><strong>Els meus propers torns</strong>: els quatre següents, més les seves hores de la setmana, les tasques de la setmana i, a Sala, les seves vendes.</li>
<li><strong>Nota per al següent torn</strong>: un quadre de text («no queda salmó, la taula 5 va demanar pastís sense gluten…»). Es desa sol i el llegeix qui fitxa després, al seu resum del torn.</li>
</ul>

<h4>El que convé saber</h4>
<ul>
<li><strong>Un empleat només veu el seu propi panell.</strong> No pot obrir el d'un company, ni tan sols amb el seu PIN. Imprimir també es limita al que és seu. Si ho intenta, l'app li diu «Només pots veure el teu propi lloc de treball».</li>
<li>Un cap amb permís d'edició entra igual: veu el seu i no reparteix feina aliena. <strong>Assignar plats, rangs i manuals és només del propietari.</strong></li>
<li>Tot es desa al núvol del negoci i es veu a la resta d'aparells.</li>
<li>Cuina i Sala tenen el seu propi equip i la seva pròpia distribució.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No em deixa obrir el panell d'un company</strong>: és el normal; cada empleat només veu el seu.</li>
<li><strong>No trobo un plat per assignar</strong>: només surten els que tenen <strong>fitxa tècnica</strong>, i les elaboracions base. Crea-la a Fitxes Tècniques.</li>
<li><strong>La casella d'una tasca de neteja surt grisa</strong>: està assignada a una altra persona. Només el propietari o el seu responsable la pot marcar.</li>
<li><strong>No puc editar una tasca</strong>: la va posar el cap. Un empleat només canvia les seves («Posada per mi»).</li>
<li><strong>El manual diu «El teu encarregat encara no l'ha escrit»</strong>: el propietari encara no ha escrit res per a aquell lloc.</li>
<li><strong>No surt cap empleat</strong>: primer cal donar d'alta l'equip a <strong>Horari del Personal</strong> (o amb <strong>Afegir Empleat</strong>, aquí mateix).</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>The <strong>Staff Schedule</strong> says <strong>when</strong> each person works; <strong>Work Distribution</strong> says <strong>what they have to do</strong>. Every employee has their own panel with their day, their week, the tasks that fall to them, the dishes (or sections) they are in charge of and their job manual. When the employee opens it, the screen is called <strong>My workspace</strong>; as owner you see it as Work Distribution and use it to assign work to the whole team. It exists in Kitchen and in the Dining Room, each with its own team.</p>

<h4>If you are the owner: the team list</h4>
<p>When you enter you first see your team:</p>
<ul>
<li>At the top, three figures: <strong>Done today</strong> (tasks done across the team), <strong>Overdue</strong> (from earlier days this week) and <strong>Manual unread</strong>.</li>
<li>A search box and <strong>Print all</strong>: one sheet per employee with what they are in charge of and their tasks for each day of the week.</li>
<li>One card per employee: how many tasks they have done today (with a bar), today's shift or <strong>No shift today</strong>, their overdue tasks, whether their manual is <strong>Manual read</strong>, <strong>Manual unread</strong> or <strong>No manual</strong>, and how many dishes or sections they have. Press the card (<strong>Open workspace</strong>) to go in. The icon in the corner opens their clock-in profile.</li>
</ul>

<h4>An employee's panel, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Today</strong>. At the top you see the date, their shift and whether they are clocked in ("Checked in since 09:02" or "Off duty"), and a bar with "3 of 7 of today's tasks done". When everything is done it says "All done for today. Nice work.". The main button is <strong>My profile & clock-in</strong> (for you, <strong>Open profile</strong>) and you can also <strong>Print</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>My week</strong>. A strip with the seven days: the letter of their shift (M, T, P…) and the tasks done out of the total. Press a day to see its tasks below. The arrows change week and <strong>Today</strong> brings you back. If there are overdue tasks, a red notice ("2 overdue tasks") with a <strong>Show me</strong> button takes you to the first day with something left undone.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>The day's list</strong>. Each task has a checkbox. Ticking is immediate; <strong>unticking asks first</strong> ("Are you sure you want to untick this task?"), so a stray finger on the tablet doesn't wipe out what's done.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Adding a task</strong>: type in the field and choose <strong>Every Monday</strong> (repeats every week on that day) or <strong>This day only</strong>, then press <strong>Add</strong>. For the owner "Every…" comes preselected and for the employee "This day only".</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">To change or remove a task, use the "⋯" menu on its row (<strong>Edit</strong> or <strong>Delete</strong>). The owner can do it on all of them; an employee only on the ones they set themselves.</div></div>
<p>The day's tasks come from four places and appear together:</p>
<table><thead><tr><th>Label</th><th>Where it comes from</th></tr></thead><tbody><tr><td><strong>Every Monday</strong> (or whichever day)</td><td>Fixed weekly tasks that you set.</td></tr><tr><td><strong>This day only</strong></td><td>One-off tasks for a date.</td></tr><tr><td><strong>Cleaning</strong></td><td>Tasks from <strong>HACCP & Hygiene</strong> (Monthly Cleaning) that name that person as responsible that day. No need to duplicate them.</td></tr><tr><td><strong>Promo</strong></td><td><strong>Promotion</strong> actions assigned to that person for that date.</td></tr></tbody></table>
<p>Every hand-made task says who set it: <strong>Set by the boss</strong> (everyone sees it that way, you included; the employee's own say "Set by Ana") or <strong>Set by me</strong>, in green with a lighter row. The "done / total" counters turn <strong>green</strong> when everything is done and <strong>red</strong> if something is left over from a day that has passed.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Hand out the unpopular tasks (deep cleaning, checking expiry dates) as "Every Tuesday" to different people each week: there's a record of whose turn it was.</div>

<h4>What they are in charge of</h4>
<p>In Kitchen, the <strong>Dishes and preparations in their charge</strong> button opens a window with all of that person's dishes and preparations. Tap one and its <strong>recipe is read right there</strong>, without leaving: allergens, ingredients (for the servings of the recipe sheet), step by step with minutes, temperature and the <strong>Watch out</strong> warning for the critical point. It is useful for training someone new: from day one they know which dishes they need to master.</p>
<ul>
<li>The owner assigns with the <strong>— Select dish —</strong> dropdown (dishes with a recipe sheet and base preparations) and <strong>Assign</strong>. To remove one, the "⋯" menu → <strong>Remove from their charge</strong>.</li>
<li>If a dish was deleted from Costing or from the sheet, it shows with a broken-link icon and the notice "Its recipe sheet and costing no longer exist": remove it or create it again.</li>
</ul>
<p>In the Dining Room the button is called <strong>Sections in charge of</strong>: type areas or tables ("Tables 1-8", "Bar", "Terrace") and press <strong>Assign</strong>. Each section is a tag; the "⋯" menu removes it.</p>

<h4>The job manual</h4>
<p>It is what is expected of each person, in writing. Only the owner writes it, with four sections: <strong>Duties</strong>, <strong>Responsibilities</strong>, <strong>Rules and limits</strong> and <strong>Tips and contacts</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">On the <strong>Job manual</strong> card press the pencil. If it's empty, <strong>Start from a template</strong> gives you starter sentences for Kitchen or the Dining Room.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">In each section write a short sentence and, if you want, a detail, then press <strong>Add</strong>. The "⋯" menu on each sentence lets you edit, move up, move down or delete it. When you finish, <strong>Done</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Every change you make requires the person to confirm again that they have read it.</strong> It goes from <strong>Read</strong> to "Changed: unread".</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">The employee opens the manual, reads it and presses <strong>I have read my manual</strong>. The date is saved, and you see "Ana read it on 3 Nov".</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Print</strong> produces the manual with a signature box ("I have received and understand this manual").</div></div>

<h4>The rest of the panel</h4>
<ul>
<li><strong>My next shifts</strong>: the next four, plus their hours this week, the week's tasks and, in the Dining Room, their sales.</li>
<li><strong>Note for the next shift</strong>: a text box ("no salmon left, table 5 asked for gluten-free cake…"). It saves itself and whoever clocks in afterwards reads it in their shift summary.</li>
</ul>

<h4>What's good to know</h4>
<ul>
<li><strong>An employee only sees their own panel.</strong> They can't open a colleague's, not even with their PIN. Printing is also limited to their own. If they try, the app says "You can only see your own workspace".</li>
<li>A manager with edit permission comes in the same way: they see their own and don't assign other people's work. <strong>Assigning dishes, sections and manuals is the owner's job only.</strong></li>
<li>Everything is saved in the business cloud and shows up on your other devices.</li>
<li>Kitchen and Dining Room have their own team and their own distribution.</li>
</ul>

<h4>If something doesn't work</h4>
<ul>
<li><strong>It won't let me open a colleague's panel</strong>: that's by design; each employee only sees their own.</li>
<li><strong>I can't find a dish to assign</strong>: only dishes with a <strong>recipe sheet</strong> appear, plus base preparations. Create it in Technical Sheets.</li>
<li><strong>A cleaning task's checkbox is grey</strong>: it's assigned to someone else. Only the owner or the person responsible can tick it.</li>
<li><strong>I can't edit a task</strong>: the boss set it. An employee only changes their own ("Set by me").</li>
<li><strong>The manual says "Your manager has not written it yet"</strong>: the owner hasn't written anything for that role yet.</li>
<li><strong>No employees appear</strong>: first add the team in <strong>Staff Schedule</strong> (or with <strong>Add Employee</strong>, right here).</li>
</ul>`}
  },
  {id:'limpieza', area:'cocina',
    title:{es:`<i class="ti ti-spray"></i> APPCC e Higiene`, ca:`<i class="ti ti-spray"></i> APPCC i Higiene`, en:`<i class="ti ti-spray"></i> HACCP &amp; Hygiene`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Todo restaurante tiene que tener un sistema de <strong>APPCC</strong> (higiene alimentaria) y poder demostrar con registros fechados que lo cumple. Esta pantalla, que también verás llamada Plan de Limpieza, reúne en siete pestañas los registros que más pide Sanidad, listos para rellenar desde el móvil o la tablet de cocina (o de barra, en Sala) y sin papeles que se manchan. Si viene un inspector, aquí tienes el historial.</p>
<p>Arriba de todo, siempre, está <strong>el estado de hoy</strong>, en cinco cifras. Cada una te lleva a su pestaña:</p>
<table><thead><tr><th>Cifra</th><th>Qué te dice</th></tr></thead><tbody><tr><td><strong>Protocolo de Apertura</strong> y <strong>Protocolo de Cierre</strong></td><td>Si hoy ya están registrados (con la hora) o siguen pendientes.</td></tr><tr><td><strong>Limpieza Mensual</strong></td><td>Tareas de hoy hechas sobre el total.</td></tr><tr><td><strong>Temperaturas</strong></td><td>Lecturas de hoy y cuántas salen fuera de rango.</td></tr><tr><td><strong>Mantenimiento</strong></td><td>Equipos con revisión vencida o que vencen pronto.</td></tr></tbody></table>
<p>Las siete pestañas son <strong>Apertura / Cierre</strong>, <strong>Higiene de Manos</strong>, <strong>Limpieza Mensual</strong>, <strong>Temperaturas</strong>, <strong>Alérgenos</strong>, <strong>Plagas</strong> y <strong>Mantenimiento</strong>. En Sala todo está adaptado a la barra (grifos, cafetera, cristalería, cámara de cerveza…) y es independiente de Cocina: lo que cambies en una carpeta no cambia la otra.</p>

<h4>Apertura / Cierre: la lista de comprobación</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada paso se contesta con <strong>Sí</strong> o <strong>No</strong>. Si pulsas <strong>No</strong> aparece un cuadro «¿Qué ha pasado? (opcional)»: en una inspección importa saber qué no estaba bien, no solo que «se hizo».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Una barra te dice cuántos pasos llevas contestados. Hasta que estén <strong>todos</strong> contestados no se puede guardar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Guardar registro de hoy</strong>. Queda guardado con fecha, hora, quién lo hizo y cuántos Sí y No hubo. Solo se puede registrar <strong>una vez al día</strong>: después la lista se queda en solo lectura con lo que se contestó.</div></div>
<p>Debajo, <strong>Cumplimiento diario</strong> muestra los últimos tres días (un tic por cada día registrado) y los cinco últimos registros; ese historial corto es lo que se conserva. Mientras rellenas, tus respuestas se quedan en ese aparato; no se sincronizan hasta que guardas.</p>
<ul>
<li>Para cambiar los pasos: el lápiz <strong>Editar los pasos</strong> (propietario o empleado con edición); escribes sobre el propio texto y pulsas <strong>Listo</strong>. <strong>Añadir paso</strong> y el menú «⋯» de cada paso (subir, bajar, eliminar) son solo del propietario.</li>
<li>El icono de la impresora saca la lista en papel. En el menú «⋯» de la tarjeta, <strong>Restablecer</strong> (solo propietario) devuelve los pasos de fábrica.</li>
</ul>

<h4>Higiene de Manos</h4>
<p>Aquí no se registra nada: es la guía que se cuelga junto al lavamanos. Tiene el <strong>Protocolo de lavado de manos</strong> paso a paso (se edita igual que los de apertura y cierre, con <strong>Añadir paso</strong> y <strong>Restablecer por defecto</strong>), <strong>Cuándo lavarse las manos</strong> (al incorporarse al trabajo, tras manipular residuos, tras usar los aseos…) y la <strong>Duración mínima</strong>: 20 segundos. Imprímelo con el icono de la impresora.</p>

<h4>Limpieza Mensual</h4>
<p>Es el calendario de tareas de limpieza (campana extractora, cámara frigorífica; en Sala, grifos de cerveza, cafetera…). Se ve en <strong>Día</strong>, <strong>Semana</strong> o <strong>Mes</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">El propietario pulsa <strong>Añadir tarea</strong>: escribe el <strong>Área o tarea de limpieza</strong>, el <strong>Producto limpiador</strong> si quieres, la <strong>Repetición</strong> (<strong>Cada mes</strong>, con el <strong>Día del mes</strong>, o <strong>Solo un día concreto</strong>, con su <strong>Fecha</strong>) y el <strong>Responsable</strong>. Sin responsable, la tarea es de cualquiera del área.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En la vista <strong>Día</strong> o <strong>Semana</strong> marca la casilla cuando esté hecha. Queda guardado quién y cuándo («Hecho el 3/11 10:15 · Ana»).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En <strong>Mes</strong> cada casilla del calendario muestra cuántas tareas hay hechas sobre el total; un día pasado con tareas sin hacer se marca como pendiente. El selector de arriba cuenta cuántas tareas tiene cada mes.</div></div>
<p>Solo el propietario o la persona asignada puede marcar una tarea; <strong>desmarcar pregunta antes</strong>. Las tareas con responsable salen también en su panel de Distribución del Trabajo, con la etiqueta <strong>Limpieza</strong>. El propietario las edita o elimina desde el menú «⋯».</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si pones el <strong>Día del mes</strong> 29, 30 o 31, esa tarea no tocará en los meses más cortos. Para que salga todos los meses, usa un día del 1 al 28.</div>

<h4>Temperaturas</h4>
<p>Arriba verás <strong>una tarjeta por equipo</strong> (cámara, congelador, vitrina…) con su última lectura, si está dentro de rango y si hoy ya se ha mirado («Sin lectura hoy»). Pulsar la tarjeta prepara el formulario para anotar la siguiente lectura de ese equipo.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">En <strong>Nuevo registro</strong> rellena <strong>Fecha</strong>, <strong>Hora</strong>, <strong>Equipo</strong>, <strong>Tipo de equipo</strong> y <strong>Tª (°C)</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">El tipo decide el rango: <strong>Refrigeración (0–5°C)</strong>, <strong>Congelación (-25 a -18°C)</strong>, <strong>Mantenimiento en caliente (>65°C)</strong> u <strong>Otro (sin rango)</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Registrar</strong>. El <strong>Estado</strong> (OK o No OK) lo calcula la app sola; con «Otro» queda como «Sin evaluar». Quién lo anotó lo pone la sesión.</div></div>
<p>Una lectura fuera de rango sale en rojo y cuenta en la cifra de arriba. Si escribes una temperatura imposible (por debajo de -60 o por encima de 300), la app te pregunta si estás seguro.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La app no tiene un campo para anotar la acción correctiva de una lectura fuera de rango. Apunta lo que hiciste (avisar al técnico, trasladar el género) en las <strong>Notas</strong> del equipo en la pestaña Mantenimiento o en tu libro de incidencias.</div>
<p>Cualquier empleado puede anotar temperaturas, sin permiso de edición. Se ven las 10 últimas; <strong>Ver los N registros</strong> abre el resto.</p>

<h4>Alérgenos</h4>
<p>No hay nada que escribir: la tabla <strong>Alérgenos por plato</strong> se calcula sola a partir de los ingredientes de cada ficha técnica o escandallo (y de los alérgenos marcados a mano en platos manuales de la carta). En Sala se llama «por bebida». Para corregir un plato, corrige los alérgenos de sus ingredientes en la Mega Lista.</p>
<ul>
<li>Pulsa uno o varios alérgenos para <strong>ver los platos que llevan</strong> alguno de ellos; el buscador filtra por nombre; <strong>Quitar filtros</strong> limpia.</li>
<li><strong>Imprimir</strong> saca la lista (con el filtro aplicado) para dejarla a mano en cocina o sala.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>La información de alérgenos tiene que estar disponible para cualquier cliente que la pida. Mantenla actualizada, no solo registrada.</div>

<h4>Plagas</h4>
<p>Para las visitas de tu empresa de control de plagas y cualquier indicio que veas entre visita y visita.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Rellena <strong>Fecha</strong>, <strong>Área</strong>, <strong>Hallazgos</strong>, <strong>Acción tomada</strong> y <strong>Próxima revisión</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pulsa <strong>Registrar</strong>. Si pasa la fecha de la próxima revisión sale <strong>Vencido</strong>; si faltan 7 días o menos, <strong>Próximo a vencer</strong>.</div></div>
<p>Añadir registros pide permiso de edición (propietario o empleado con edición).</p>

<h4>Mantenimiento</h4>
<p>Una tarjeta por equipo (horno, extractor, lavavajillas…) con <strong>Último mantenimiento</strong>, <strong>Próximo</strong>, <strong>Responsable</strong> (texto libre: suele ser una empresa externa), <strong>Estado</strong> (<strong>OK</strong>, <strong>Pendiente</strong> o <strong>Urgente</strong>) y <strong>Notas</strong>.</p>
<ul>
<li>El propietario añade equipos con <strong>Añadir equipo</strong> y los elimina desde «⋯».</li>
<li>El lápiz edita la tarjeta (propietario o empleado con edición); acaba con <strong>Guardar</strong>.</li>
<li>Un equipo con la fecha de «Próximo» pasada sale <strong>Vencido</strong>; si faltan 7 días o menos, <strong>Próximo a vencer</strong>. Las dos cosas suben a la cifra de arriba.</li>
</ul>

<h4>Lo que conviene saber</h4>
<table><thead><tr><th>Quién</th><th>Qué puede hacer</th></tr></thead><tbody><tr><td>Cualquier empleado</td><td>Ver todo, contestar y guardar Apertura y Cierre, marcar sus tareas de limpieza y anotar Temperaturas.</td></tr><tr><td>Empleado con edición (jefe)</td><td>Además, editar el texto de los pasos, registrar Plagas y editar tarjetas de Mantenimiento.</td></tr><tr><td>Propietario</td><td>Además, añadir y quitar pasos, restablecer, añadir tareas y equipos, y borrar registros.</td></tr></tbody></table>
<ul>
<li><strong>Borrar un registro de Apertura/Cierre, Temperaturas o Plagas</strong> es solo del propietario y pide el <strong>PIN del negocio</strong>; queda auditado. Son la prueba ante una inspección.</li>
<li><strong>Cuánto se conserva</strong>: de Apertura y Cierre, los últimos 3 días; de Temperaturas y Plagas, el último año (cuatro trimestres). La primera vez que la app borra algo antiguo te avisa: si necesitas conservarlo más tiempo, guarda una copia tuya antes.</li>
<li>Mantener estos registros al día no es opcional: es un requisito legal y lo primero que se revisa. Un registro vacío puede suponer una sanción aunque tu cocina esté impecable.</li>
<li>En el móvil las tablas se convierten en tarjetas, y cada paso o registro lleva su menú «⋯».</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>La rutina que funciona: 5 minutos al abrir y 5 al cerrar. Contestas el protocolo, anotas las temperaturas y marcas la limpieza del día. En un mes tienes un historial completo.</div>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>«Guardar registro de hoy» está apagado</strong>: faltan pasos por contestar (Sí o No). Se ve en la barra de progreso.</li>
<li><strong>Dice que ya está registrado hoy</strong>: alguien lo guardó antes; solo se registra una vez al día, y se ve quién fue.</li>
<li><strong>No me deja marcar una tarea de limpieza</strong>: está asignada a otra persona. Solo ella o el propietario pueden marcarla.</li>
<li><strong>No puedo añadir un registro de Plagas</strong>: hace falta permiso de edición.</li>
<li><strong>No encuentro «Añadir tarea» o «Añadir equipo»</strong>: son del propietario.</li>
<li><strong>Una tarea mensual no sale este mes</strong>: tiene el día 29, 30 o 31 y el mes es más corto.</li>
<li><strong>Faltan alérgenos en un plato</strong>: se calculan de sus ingredientes; revisa los alérgenos de cada uno en la Mega Lista.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Tot restaurant ha de tenir un sistema d'<strong>APPCC</strong> (higiene alimentària) i poder demostrar amb registres datats que el compleix. Aquesta pantalla, que també veuràs anomenada Pla de Neteja, reuneix en set pestanyes els registres que més demana Sanitat, a punt per emplenar des del mòbil o la tauleta de cuina (o de barra, a Sala) i sense papers que es taquen. Si ve un inspector, aquí tens l'historial.</p>
<p>A dalt de tot, sempre, hi ha <strong>l'estat d'avui</strong>, en cinc xifres. Cadascuna et porta a la seva pestanya:</p>
<table><thead><tr><th>Xifra</th><th>Què et diu</th></tr></thead><tbody><tr><td><strong>Protocol d'Obertura</strong> i <strong>Protocol de Tancament</strong></td><td>Si avui ja estan registrats (amb l'hora) o continuen pendents.</td></tr><tr><td><strong>Neteja Mensual</strong></td><td>Tasques d'avui fetes sobre el total.</td></tr><tr><td><strong>Temperatures</strong></td><td>Lectures d'avui i quantes surten fora de rang.</td></tr><tr><td><strong>Manteniment</strong></td><td>Equips amb revisió vençuda o que vencen aviat.</td></tr></tbody></table>
<p>Les set pestanyes són <strong>Obertura / Tancament</strong>, <strong>Higiene de Mans</strong>, <strong>Neteja Mensual</strong>, <strong>Temperatures</strong>, <strong>Al·lèrgens</strong>, <strong>Plagues</strong> i <strong>Manteniment</strong>. A Sala tot està adaptat a la barra (aixetes, cafetera, cristalleria, cambra de cervesa…) i és independent de Cuina: el que canviïs en una carpeta no canvia l'altra.</p>

<h4>Obertura / Tancament: la llista de comprovació</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada pas es contesta amb <strong>Sí</strong> o <strong>No</strong>. Si prems <strong>No</strong> apareix un quadre «Què ha passat? (opcional)»: en una inspecció importa saber què no estava bé, no només que «es va fer».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Una barra et diu quants passos portes contestats. Fins que no estiguin <strong>tots</strong> contestats no es pot desar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Desar el registre d'avui</strong>. Queda desat amb data, hora, qui ho va fer i quants Sí i No hi va haver. Només es pot registrar <strong>un cop al dia</strong>: després la llista es queda en només lectura amb el que es va contestar.</div></div>
<p>A sota, <strong>Compliment diari</strong> mostra els últims tres dies (un tic per cada dia registrat) i els cinc últims registres; aquest historial curt és el que es conserva. Mentre emplenes, les teves respostes es queden en aquell aparell; no se sincronitzen fins que deses.</p>
<ul>
<li>Per canviar els passos: el llapis <strong>Editar els passos</strong> (propietari o empleat amb edició); escrius sobre el mateix text i prems <strong>Llest</strong>. <strong>Afegir pas</strong> i el menú «⋯» de cada pas (pujar, baixar, eliminar) són només del propietari.</li>
<li>La icona de la impressora treu la llista en paper. Al menú «⋯» de la targeta, <strong>Restablir</strong> (només propietari) retorna els passos de fàbrica.</li>
</ul>

<h4>Higiene de Mans</h4>
<p>Aquí no es registra res: és la guia que es penja al costat del lavabo. Té el <strong>Protocol de rentat de mans</strong> pas a pas (s'edita igual que els d'obertura i tancament, amb <strong>Afegir pas</strong> i <strong>Restablir per defecte</strong>), <strong>Quan rentar-se les mans</strong> (en incorporar-se a la feina, després de manipular residus, després d'utilitzar els lavabos…) i la <strong>Durada mínima</strong>: 20 segons. Imprimeix-lo amb la icona de la impressora.</p>

<h4>Neteja Mensual</h4>
<p>És el calendari de tasques de neteja (campana extractora, cambra frigorífica; a Sala, aixetes de cervesa, cafetera…). Es veu en <strong>Dia</strong>, <strong>Setmana</strong> o <strong>Mes</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">El propietari prem <strong>Afegir tasca</strong>: escriu l'<strong>Àrea o tasca de neteja</strong>, el <strong>Producte netejador</strong> si vols, la <strong>Repetició</strong> (<strong>Cada mes</strong>, amb el <strong>Dia del mes</strong>, o <strong>Només un dia concret</strong>, amb la seva <strong>Data</strong>) i el <strong>Responsable</strong>. Sense responsable, la tasca és de qualsevol de l'àrea.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A la vista <strong>Dia</strong> o <strong>Setmana</strong> marca la casella quan estigui feta. Queda desat qui i quan («Fet el 3/11 10:15 · Ana»).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A <strong>Mes</strong> cada casella del calendari mostra quantes tasques hi ha fetes sobre el total; un dia passat amb tasques sense fer es marca com a pendent. El selector de dalt compta quantes tasques té cada mes.</div></div>
<p>Només el propietari o la persona assignada pot marcar una tasca; <strong>desmarcar pregunta abans</strong>. Les tasques amb responsable surten també al seu panell de Distribució de la Feina, amb l'etiqueta <strong>Neteja</strong>. El propietari les edita o elimina des del menú «⋯».</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si poses el <strong>Dia del mes</strong> 29, 30 o 31, aquesta tasca no tocarà als mesos més curts. Perquè surti tots els mesos, fes servir un dia de l'1 al 28.</div>

<h4>Temperatures</h4>
<p>A dalt veuràs <strong>una targeta per equip</strong> (cambra, congelador, vitrina…) amb la seva última lectura, si és dins de rang i si avui ja s'ha mirat («Sense lectura avui»). Prémer la targeta prepara el formulari per anotar la següent lectura d'aquell equip.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">A <strong>Nou registre</strong> emplena <strong>Data</strong>, <strong>Hora</strong>, <strong>Equip</strong>, <strong>Tipus d'equip</strong> i <strong>Tª (°C)</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">El tipus decideix el rang: <strong>Refrigeració (0–5°C)</strong>, <strong>Congelació (-25 a -18°C)</strong>, <strong>Manteniment en calent (>65°C)</strong> o <strong>Altre (sense rang)</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Registrar</strong>. L'<strong>Estat</strong> (OK o No OK) el calcula l'app sola; amb «Altre» queda com a «Sense avaluar». Qui ho ha anotat ho posa la sessió.</div></div>
<p>Una lectura fora de rang surt en vermell i compta a la xifra de dalt. Si escrius una temperatura impossible (per sota de -60 o per sobre de 300), l'app et pregunta si n'estàs segur.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>L'app no té cap camp per anotar l'acció correctiva d'una lectura fora de rang. Apunta el que has fet (avisar el tècnic, traslladar el gènere) a les <strong>Notes</strong> de l'equip a la pestanya Manteniment o al teu llibre d'incidències.</div>
<p>Qualsevol empleat pot anotar temperatures, sense permís d'edició. Es veuen les 10 últimes; <strong>Veure els N registres</strong> obre la resta.</p>

<h4>Al·lèrgens</h4>
<p>No hi ha res per escriure: la taula <strong>Al·lèrgens per plat</strong> es calcula sola a partir dels ingredients de cada fitxa tècnica o escandall (i dels al·lèrgens marcats a mà en plats manuals de la carta). A Sala es diu «per beguda». Per corregir un plat, corregeix els al·lèrgens dels seus ingredients a la Mega Llista.</p>
<ul>
<li>Prem un o diversos al·lèrgens per <strong>veure els plats que en porten</strong> algun; el cercador filtra per nom; <strong>Treure filtres</strong> neteja.</li>
<li><strong>Imprimir</strong> treu la llista (amb el filtre aplicat) per deixar-la a mà a cuina o sala.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>La informació d'al·lèrgens ha d'estar disponible per a qualsevol client que la demani. Mantén-la actualitzada, no només registrada.</div>

<h4>Plagues</h4>
<p>Per a les visites de la teva empresa de control de plagues i qualsevol indici que vegis entre visita i visita.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Emplena <strong>Data</strong>, <strong>Àrea</strong>, <strong>Troballes</strong>, <strong>Acció presa</strong> i <strong>Propera revisió</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Prem <strong>Registrar</strong>. Si passa la data de la propera revisió surt <strong>Vençut</strong>; si falten 7 dies o menys, <strong>Proper a vèncer</strong>.</div></div>
<p>Afegir registres demana permís d'edició (propietari o empleat amb edició).</p>

<h4>Manteniment</h4>
<p>Una targeta per equip (forn, extractor, rentavaixelles…) amb <strong>Últim manteniment</strong>, <strong>Proper</strong>, <strong>Responsable</strong> (text lliure: sol ser una empresa externa), <strong>Estat</strong> (<strong>OK</strong>, <strong>Pendent</strong> o <strong>Urgent</strong>) i <strong>Notes</strong>.</p>
<ul>
<li>El propietari afegeix equips amb <strong>Afegir equip</strong> i els elimina des de «⋯».</li>
<li>El llapis edita la targeta (propietari o empleat amb edició); acaba amb <strong>Desar</strong>.</li>
<li>Un equip amb la data de «Proper» passada surt <strong>Vençut</strong>; si falten 7 dies o menys, <strong>Proper a vèncer</strong>. Les dues coses pugen a la xifra de dalt.</li>
</ul>

<h4>El que convé saber</h4>
<table><thead><tr><th>Qui</th><th>Què pot fer</th></tr></thead><tbody><tr><td>Qualsevol empleat</td><td>Veure-ho tot, contestar i desar Obertura i Tancament, marcar les seves tasques de neteja i anotar Temperatures.</td></tr><tr><td>Empleat amb edició (cap)</td><td>A més, editar el text dels passos, registrar Plagues i editar targetes de Manteniment.</td></tr><tr><td>Propietari</td><td>A més, afegir i treure passos, restablir, afegir tasques i equips, i esborrar registres.</td></tr></tbody></table>
<ul>
<li><strong>Esborrar un registre d'Obertura/Tancament, Temperatures o Plagues</strong> és només del propietari i demana el <strong>PIN del negoci</strong>; queda auditat. Són la prova davant d'una inspecció.</li>
<li><strong>Quant es conserva</strong>: d'Obertura i Tancament, els últims 3 dies; de Temperatures i Plagues, l'últim any (quatre trimestres). La primera vegada que l'app esborra alguna cosa antiga t'avisa: si ho necessites conservar més temps, desa'n una còpia teva abans.</li>
<li>Mantenir aquests registres al dia no és opcional: és un requisit legal i el primer que es revisa. Un registre buit pot comportar una sanció encara que la teva cuina estigui impecable.</li>
<li>Al mòbil les taules es converteixen en targetes, i cada pas o registre porta el seu menú «⋯».</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>La rutina que funciona: 5 minuts en obrir i 5 en tancar. Contestes el protocol, anotes les temperatures i marques la neteja del dia. En un mes tens un historial complet.</div>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>«Desar el registre d'avui» està apagat</strong>: falten passos per contestar (Sí o No). Es veu a la barra de progrés.</li>
<li><strong>Diu que ja està registrat avui</strong>: algú l'ha desat abans; només es registra un cop al dia, i es veu qui va ser.</li>
<li><strong>No em deixa marcar una tasca de neteja</strong>: està assignada a una altra persona. Només ella o el propietari la poden marcar.</li>
<li><strong>No puc afegir un registre de Plagues</strong>: cal permís d'edició.</li>
<li><strong>No trobo «Afegir tasca» o «Afegir equip»</strong>: són del propietari.</li>
<li><strong>Una tasca mensual no surt aquest mes</strong>: té el dia 29, 30 o 31 i el mes és més curt.</li>
<li><strong>Falten al·lèrgens en un plat</strong>: es calculen dels seus ingredients; revisa els al·lèrgens de cadascun a la Mega Llista.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>Every restaurant must have a <strong>HACCP</strong> system (food hygiene) and be able to prove with dated records that it follows it. This screen, which you may also hear called the Cleaning Plan, gathers in seven tabs the records Health Authorities ask for most, ready to fill in from the kitchen phone or tablet (or at the bar, in the Dining Room), with no paper that gets dirty. If an inspector visits, you have the history right here.</p>
<p>At the very top, always, is <strong>today's status</strong>, in five figures. Each one takes you to its tab:</p>
<table><thead><tr><th>Figure</th><th>What it tells you</th></tr></thead><tbody><tr><td><strong>Opening Protocol</strong> and <strong>Closing Protocol</strong></td><td>Whether today's are already logged (with the time) or still pending.</td></tr><tr><td><strong>Monthly Cleaning</strong></td><td>Today's tasks done out of the total.</td></tr><tr><td><strong>Temperatures</strong></td><td>Today's readings and how many are out of range.</td></tr><tr><td><strong>Maintenance</strong></td><td>Equipment with an overdue check or one due soon.</td></tr></tbody></table>
<p>The seven tabs are <strong>Opening / Closing</strong>, <strong>Hand Hygiene</strong>, <strong>Monthly Cleaning</strong>, <strong>Temperatures</strong>, <strong>Allergens</strong>, <strong>Pests</strong> and <strong>Maintenance</strong>. In the Dining Room everything is adapted to the bar (taps, coffee machine, glassware, beer cooler…) and is independent from Kitchen: what you change in one folder doesn't change the other.</p>

<h4>Opening / Closing: the checklist</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Each step is answered with <strong>Yes</strong> or <strong>No</strong>. If you press <strong>No</strong>, a box appears: "What happened? (optional)". In an inspection it matters to know what wasn't right, not just that it "was done".</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A bar tells you how many steps you have answered. Until <strong>all</strong> are answered you can't save.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>Save today's log</strong>. It is saved with date, time, who did it and how many Yes and No there were. It can only be logged <strong>once a day</strong>: afterwards the list stays read-only with what was answered.</div></div>
<p>Below, <strong>Daily compliance</strong> shows the last three days (a tick for each day logged) and the last five records; that short history is what is kept. While you fill it in, your answers stay on that device; they aren't synced until you save.</p>
<ul>
<li>To change the steps: the <strong>Edit the steps</strong> pencil (owner or employee with edit permission); type over the text itself and press <strong>Done</strong>. <strong>Add step</strong> and each step's "⋯" menu (move up, move down, delete) are the owner's only.</li>
<li>The printer icon prints the list. In the card's "⋯" menu, <strong>Reset</strong> (owner only) restores the default steps.</li>
</ul>

<h4>Hand Hygiene</h4>
<p>Nothing is logged here: it is the guide you hang by the sink. It has the <strong>Hand-washing protocol</strong> step by step (edited just like the opening and closing ones, with <strong>Add step</strong> and <strong>Reset to default</strong>), <strong>When to wash your hands</strong> (when starting work, after handling waste, after using the restroom…) and the <strong>Minimum duration</strong>: 20 seconds. Print it with the printer icon.</p>

<h4>Monthly Cleaning</h4>
<p>This is the calendar of cleaning tasks (extractor hood, cold room; in the Dining Room, beer taps, coffee machine…). You can see it in <strong>Day</strong>, <strong>Week</strong> or <strong>Month</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">The owner presses <strong>Add task</strong>: type the <strong>Area or cleaning task</strong>, the <strong>Cleaning product</strong> if you like, the <strong>Recurrence</strong> (<strong>Every month</strong>, with the <strong>Day of month</strong>, or <strong>Just one specific day</strong>, with its <strong>Date</strong>) and the <strong>Responsible</strong>. With no responsible person, the task belongs to anyone in the area.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">In the <strong>Day</strong> or <strong>Week</strong> view tick the box when it's done. Who and when is saved ("Done on 3/11 10:15 · Ana").</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">In <strong>Month</strong>, each calendar cell shows how many tasks are done out of the total; a past day with tasks left undone is marked as pending. The selector at the top counts how many tasks each month has.</div></div>
<p>Only the owner or the assigned person can tick a task; <strong>unticking asks first</strong>. Tasks with a responsible person also appear in their Work Distribution panel, tagged <strong>Cleaning</strong>. The owner edits or deletes them from the "⋯" menu.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>If you set the <strong>Day of month</strong> to 29, 30 or 31, that task won't come up in shorter months. To have it every month, use a day from 1 to 28.</div>

<h4>Temperatures</h4>
<p>At the top you'll see <strong>one card per piece of equipment</strong> (cold room, freezer, display…) with its latest reading, whether it is in range and whether it has been checked today ("No reading today"). Pressing the card prepares the form to log the next reading for that equipment.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Under <strong>New entry</strong> fill in <strong>Date</strong>, <strong>Time</strong>, <strong>Equipment</strong>, <strong>Equipment type</strong> and <strong>Temp. (°C)</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">The type decides the range: <strong>Refrigeration (0–5°C)</strong>, <strong>Freezing (-25 to -18°C)</strong>, <strong>Hot holding (>65°C)</strong> or <strong>Other (no range)</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>Register</strong>. The <strong>Status</strong> (OK or No OK) is calculated by the app; with "Other" it stays "Not evaluated". Who logged it is set by the session.</div></div>
<p>A reading out of range shows in red and counts in the figure at the top. If you type an impossible temperature (below -60 or above 300), the app asks if you're sure.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The app has no field to record the corrective action for an out-of-range reading. Write down what you did (called the technician, moved the stock) in the equipment's <strong>Notes</strong> in the Maintenance tab or in your own incident book.</div>
<p>Any employee can log temperatures, without edit permission. The last 10 are shown; <strong>Show all N entries</strong> opens the rest.</p>

<h4>Allergens</h4>
<p>There is nothing to type: the <strong>Allergens by dish</strong> table is calculated automatically from the ingredients of each recipe sheet or costing (and from allergens ticked by hand on manual menu items). In the Dining Room it is "by drink". To correct a dish, correct the allergens of its ingredients in the Master List.</p>
<ul>
<li>Press one or more allergens to <strong>show the dishes that contain</strong> any of them; the search box filters by name; <strong>Clear filters</strong> resets.</li>
<li><strong>Print</strong> produces the list (with the filter applied) to keep at hand in the kitchen or on the floor.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Allergen information must be available to any customer who asks for it. Keep it up to date, not just logged.</div>

<h4>Pests</h4>
<p>For your pest-control company's visits and any sign you notice between visits.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Fill in <strong>Date</strong>, <strong>Area</strong>, <strong>Findings</strong>, <strong>Action taken</strong> and <strong>Next review</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Press <strong>Register</strong>. If the next-review date passes it shows <strong>Overdue</strong>; if 7 days or fewer remain, <strong>Due soon</strong>.</div></div>
<p>Adding entries needs edit permission (owner or employee with edit permission).</p>

<h4>Maintenance</h4>
<p>One card per piece of equipment (oven, extractor, dishwasher…) with <strong>Last maintenance</strong>, <strong>Next</strong>, <strong>Responsible</strong> (free text: usually an outside company), <strong>Status</strong> (<strong>OK</strong>, <strong>Pending</strong> or <strong>Urgent</strong>) and <strong>Notes</strong>.</p>
<ul>
<li>The owner adds equipment with <strong>Add equipment</strong> and deletes it from "⋯".</li>
<li>The pencil edits the card (owner or employee with edit permission); finish with <strong>Save</strong>.</li>
<li>Equipment whose "Next" date has passed shows <strong>Overdue</strong>; if 7 days or fewer remain, <strong>Due soon</strong>. Both feed the figure at the top.</li>
</ul>

<h4>What's good to know</h4>
<table><thead><tr><th>Who</th><th>What they can do</th></tr></thead><tbody><tr><td>Any employee</td><td>See everything, answer and save Opening and Closing, tick their cleaning tasks and log Temperatures.</td></tr><tr><td>Employee with edit permission (manager)</td><td>Also edit the step text, log Pests and edit Maintenance cards.</td></tr><tr><td>Owner</td><td>Also add and remove steps, reset, add tasks and equipment, and delete records.</td></tr></tbody></table>
<ul>
<li><strong>Deleting an Opening/Closing, Temperatures or Pests record</strong> is the owner's only and asks for the <strong>business PIN</strong>; it is audited. These records are your proof in an inspection.</li>
<li><strong>How long things are kept</strong>: Opening and Closing, the last 3 days; Temperatures and Pests, the last year (four quarters). The first time the app deletes something old it warns you: if you need to keep it longer, save a copy of your own first.</li>
<li>Keeping these records up to date isn't optional: it is a legal requirement and the first thing checked. An empty record can mean a penalty even if your kitchen is spotless.</li>
<li>On a phone the tables turn into cards, and each step or record has its "⋯" menu.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>The routine that works: 5 minutes at opening and 5 at closing. You answer the protocol, log the temperatures and tick the day's cleaning. In a month you have a full history.</div>

<h4>If something doesn't work</h4>
<ul>
<li><strong>"Save today's log" is greyed out</strong>: there are steps left to answer (Yes or No). The progress bar shows it.</li>
<li><strong>It says it's already logged today</strong>: someone saved it earlier; it is only logged once a day, and you can see who did it.</li>
<li><strong>It won't let me tick a cleaning task</strong>: it's assigned to someone else. Only they or the owner can tick it.</li>
<li><strong>I can't add a Pests record</strong>: edit permission is needed.</li>
<li><strong>I can't find "Add task" or "Add equipment"</strong>: they're the owner's.</li>
<li><strong>A monthly task doesn't show this month</strong>: it is set to day 29, 30 or 31 and the month is shorter.</li>
<li><strong>A dish is missing allergens</strong>: they are calculated from its ingredients; check each one's allergens in the Master List.</li>
</ul>`}
  },
  {id:'comandascocina', area:'cocina',
    title:{es:`<i class="ti ti-bell-ringing"></i> Comandas Cocina`, ca:`<i class="ti ti-bell-ringing"></i> Comandes Cuina`, en:`<i class="ti ti-bell-ringing"></i> Kitchen Orders`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p><strong>Comandas Cocina</strong> es la pantalla que cocina deja abierta durante el servicio. Cuando sala marcha un pedido, aparece aquí al instante como un ticket, con la mesa, los platos, las alergias y el tiempo que lleva esperando. Cocina lo va avanzando (empezar, listo en el pase) y sala ve cada cambio en la mesa. Sirve para no gritar comandas, no perder papeles y saber qué sale primero. La pantalla se repinta sola cada pocos segundos, así que los minutos corren sin que toques nada.</p>
<p>Está solo en la carpeta <strong>Cocina</strong>. <strong>En Sala no existe una pantalla equivalente</strong>: el camarero sigue cada mesa desde el <strong>TPV</strong> (ve si cada plato está marchado, en preparación o listo para entregar), y las bebidas no pasan por cocina, se gestionan desde la propia comanda de la mesa.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Para que sala y cocina se vean entre sí en dos aparatos distintos, la nube del negocio tiene que estar conectada (el indicador de la cabecera, en verde).</div>

<h4>Cómo llega un pedido</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Sala toma nota en el TPV. Mientras los platos no están <strong>marchados</strong>, cocina no los ve.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Sala marcha un grupo o un plato suelto y el ticket aparece aquí. En la mesa, sala ve <strong>En cocina</strong> en cuanto la pantalla de cocina lo ha recibido (antes pone «Enviando…»).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Los pedidos online y para llevar que el negocio acepta también llegan aquí. Un pedido programado para dentro de días no aparece hasta que toca.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Las <strong>bebidas nunca salen</strong> en esta pantalla: no son de cocina.</div></div>

<h4>Cómo es un ticket</h4>
<ul>
<li><strong>Cabecera</strong>: la mesa (o «para llevar»/«Online» con el nombre del cliente y la hora), los comensales y el camarero. A la derecha, los <strong>minutos esperando</strong>, con una barra de color: gris al principio, ámbar desde los 5 minutos y roja desde los 15.</li>
<li><strong>Alergias</strong>: una franja roja con las alergias del cliente, los alérgenos que se anotaron para la mesa y los de los platos pedidos. Léela antes de cocinar.</li>
<li><strong>Carta y Menú</strong>: los platos van separados en bloques. Cada <strong>curso</strong> (entrantes, segundos…) tiene su estado: <strong>Esperando marchar</strong>, <strong>Nuevo</strong>, <strong>En preparación</strong>, <strong>Listo en el pase</strong> o <strong>Recogido</strong>. Bajo cada plato ves su familia (la sección de la carta) y las notas del camarero.</li>
<li><strong>Un ticket por vale.</strong> Cada vez que la mesa vuelve a pedir, entra un <strong>Vale 2</strong>, <strong>Vale 3</strong>… como ticket aparte. Se abre un vale nuevo cuando la mesa pide otra vez, ya había algo marchado y han pasado más de 8 minutos desde lo último que se apuntó. Lo que se anota en la misma toma de comanda sigue en el mismo vale.</li>
</ul>

<h4>Cómo se trabaja un pedido</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Toca el <strong>nombre del bloque</strong> (por ejemplo <strong>Entrantes</strong>, con las dos flechas al lado). Todos los platos del bloque pasan a <strong>En preparación</strong> y marcan una llama.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Cuando salen, vuelve a tocar el nombre del bloque. El bloque pasa a <strong>Listo en el pase</strong>. Ya no hay un botón grande aparte.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si quieres avanzar <strong>un solo plato</strong>, tócalo a él: pasa al siguiente estado sin mover el resto del bloque.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Cuando el bloque está <strong>Listo en el pase</strong>, sala lo ve en su pantalla. Cuando el camarero se lo lleva, <strong>cocina toca el nombre del bloque</strong> (o el plato) y queda <strong>Recogido</strong>. Hasta entonces el ticket sigue en <strong>Activas</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Si no hay nada que cocinar todavía, el ticket dice «Esperando que sala marche…». Cuando todo está en el pase, «Todo listo en el pase».</div></div>
<p><strong>Si te equivocas</strong>: pulsa <strong>Deshacer</strong> (arriba, o la flecha del propio ticket). Deshace la última acción —de un plato o de un curso entero—, hasta 10 veces seguidas. Solo funciona mientras no recargues la página.</p>

<h4>Los botones de arriba</h4>
<table><thead><tr><th>Botón</th><th>Para qué sirve</th></tr></thead><tbody><tr><td><strong>Activas</strong></td><td>Los tickets en marcha.</td></tr><tr><td><strong>Cerradas</strong></td><td>Los pedidos de hoy que cocina ya ha terminado: «Todo listo» si sala aún no los ha recogido, «Entregado» si ya.</td></tr><tr><td><strong>Avisar a sala</strong></td><td>Mensaje urgente para todo el equipo de sala.</td></tr><tr><td><strong>Modo caos</strong></td><td>Cambia los tickets por una sola lista por orden de espera.</td></tr><tr><td><strong>Marcar agotado</strong></td><td>Quita un plato o bebida de la venta al instante.</td></tr><tr><td><strong>Deshacer</strong></td><td>Vuelve atrás la última acción.</td></tr></tbody></table>

<h4>Modo caos</h4>
<p>En hora punta ordenar por pedido deja de ayudar: lo que importa es <strong>qué sale ahora</strong>. <strong>Modo caos</strong> (vuelve a pulsarlo para salir) sustituye los tickets por una lista <strong>Por orden de espera</strong>, con dos formas de mirarla:</p>
<ul>
<li><strong>Por mesas</strong>: una tarjeta por mesa, ordenadas por la que más espera. Dentro, lo pendiente va en «rondas» (lo que se marchó junto), con su hora; tocando su nombre avanza toda la ronda. Sale lo mismo que en la vista normal; solo cambia la forma de verlo.</li>
<li><strong>Por plato</strong>: suma lo pendiente por plato (6 croquetas entre cuatro mesas), con las mesas y los minutos en etiquetas. Es solo para mirar y cocinar por tandas.</li>
</ul>
<p>Arriba aparece <strong>En el pase</strong>: los platos que cocina ya dejó listos y sala aún no ha recogido, por mesa, con los minutos (ámbar a los 3, rojo a los 6). El botón <strong>Avisar</strong> manda un mensaje urgente al chat de sala («listo en el pase, venid a recoger») y pasa a <strong>Avisado</strong> durante 3 minutos.</p>

<h4>Hablar con sala</h4>
<ul>
<li><strong>Avisar a sala</strong>: elige un aviso rápido («Pase lleno: venid a recoger ya», «Cocina saturada: id más despacio con las comandas», «Se está acabando un producto: mirad Marcar agotado», «Necesito ayuda en el pase») o escribe el tuyo y pulsa <strong>Enviar</strong>. Llega a todo sala como aviso urgente.</li>
<li><strong>Incidencia en esta comanda</strong>: para hablar de <strong>una mesa concreta</strong>. Elige el tipo (<strong>Falta un producto</strong>, <strong>Retraso</strong>, <strong>Duda sobre el plato</strong>, <strong>Error en la comanda</strong> u <strong>Otra cosa</strong>), escribe si quieres y <strong>Enviar a sala</strong>. Sala la ve marcada en su mesa y puede <strong>Responder</strong>; cualquiera de los dos puede <strong>Marcar resuelta</strong>. Mientras hay una abierta, el ticket muestra una franja y el botón <strong>Ver incidencia</strong> en rojo; <strong>Nuevo</strong> avisa de que hay un mensaje sin leer.</li>
</ul>

<h4>Marcar agotado</h4>
<p>Cuando algo se acaba a media comanda, deja de poder pedirse al momento, sin entrar en Oferta Gastronómica. Se hace en pasos: primero eliges la carta o el menú, luego la categoría y, dentro, cada plato tiene su botón <strong>Disponible</strong> / <strong>No disponible</strong>. En un menú puedes marcar una opción concreta o el <strong>Menú entero</strong>. Se guarda al instante y queda anotado.</p>

<h4>Lo que conviene saber</h4>
<ul>
<li><strong>Cualquiera con acceso a Cocina</strong> puede mover los tickets, avisar a sala y marcar agotado. No hace falta permiso de edición.</li>
<li><strong>Imprimir en vez de mirar la pantalla</strong>: en <strong>Gestión → Mi Negocio → Comandas de cocina y sala</strong> eliges <strong>Mostrar en pantalla</strong> o <strong>Imprimir</strong>. Con Imprimir, cada vez que sala marcha se imprime un vale en las impresoras que configures (cocina, barra…), y esta pantalla sigue funcionando.</li>
<li>Los botones de esta pantalla son compactos a propósito, para que no ocupen media pantalla en hora punta; lo que más se usa es el nombre de cada bloque, dentro del ticket.</li>
<li>Un pedido deja de estar en <strong>Activas</strong> cuando todos sus platos están entregados <strong>y recogidos por sala</strong>.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>Sala marchó un pedido y no aparece</strong>: en la mesa de sala mira si pone <strong>En cocina</strong> o «Enviando…». Si se queda en «Enviando…», revisa que el indicador de nube esté en verde en los dos aparatos.</li>
<li><strong>No sale un plato</strong>: puede ser una bebida (no pasa por cocina), no estar marchado aún o ser un pedido programado para otro día.</li>
<li><strong>El ticket no desaparece aunque ya salió</strong>: falta marcarlo como <strong>Recogido</strong> (toca el nombre del bloque cuando sala se lo lleva); hasta entonces sigue en Activas. Mira <strong>En el pase</strong> en Modo caos: ahí tienes <strong>Recogido</strong> y <strong>Avisar</strong>.</li>
<li><strong>Pulsé un plato sin querer</strong>: <strong>Deshacer</strong>, antes de recargar la página.</li>
<li><strong>«No hay comandas pendientes»</strong>: no hay nada marchado ahora mismo; aparecerán solas.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p><strong>Comandes Cuina</strong> és la pantalla que cuina deixa oberta durant el servei. Quan la sala marxa una comanda, apareix aquí a l'instant com un tiquet, amb la taula, els plats, les al·lèrgies i el temps que porta esperant. Cuina l'anirà avançant (començar, llest al pas) i la sala veu cada canvi a la taula. Serveix per no cridar comandes, no perdre papers i saber què surt primer. La pantalla es repinta sola cada pocs segons, així que els minuts corren sense que toquis res.</p>
<p>Només és a la carpeta <strong>Cuina</strong>. <strong>A Sala no existeix una pantalla equivalent</strong>: el cambrer segueix cada taula des del <strong>TPV</strong> (veu si cada plat està marxat, en preparació o llest per lliurar), i les begudes no passen per cuina, es gestionen des de la mateixa comanda de la taula.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Perquè sala i cuina es vegin entre elles en dos aparells diferents, el núvol del negoci ha d'estar connectat (l'indicador de la capçalera, en verd).</div>

<h4>Com arriba una comanda</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">La sala pren nota al TPV. Mentre els plats no estan <strong>marxats</strong>, cuina no els veu.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">La sala marxa un grup o un plat solt i el tiquet apareix aquí. A la taula, la sala veu <strong>A cuina</strong> així que la pantalla de cuina l'ha rebut (abans posa «Enviant…»).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Les comandes en línia i per emportar que el negoci accepta també arriben aquí. Una comanda programada per d'aquí a dies no apareix fins que toca.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Les <strong>begudes mai surten</strong> en aquesta pantalla: no són de cuina.</div></div>

<h4>Com és un tiquet</h4>
<ul>
<li><strong>Capçalera</strong>: la taula (o «per emportar»/«Online» amb el nom del client i l'hora), els comensals i el cambrer. A la dreta, els <strong>minuts esperant</strong>, amb una barra de color: grisa al principi, ambre des dels 5 minuts i vermella des dels 15.</li>
<li><strong>Al·lèrgies</strong>: una franja vermella amb les al·lèrgies del client, els al·lèrgens que s'han anotat per a la taula i els dels plats demanats. Llegeix-la abans de cuinar.</li>
<li><strong>Carta i Menú</strong>: els plats van separats en blocs. Cada <strong>curs</strong> (entrants, segons…) té el seu estat: <strong>Esperant marxar</strong>, <strong>Nou</strong>, <strong>En preparació</strong>, <strong>Llest al pas</strong> o <strong>Recollit</strong>. Sota cada plat veus la seva família (la secció de la carta) i les notes del cambrer.</li>
<li><strong>Un tiquet per val.</strong> Cada cop que la taula torna a demanar, entra un <strong>Val 2</strong>, <strong>Val 3</strong>… com a tiquet apart. S'obre un val nou quan la taula demana un altre cop, ja hi havia alguna cosa marxada i han passat més de 8 minuts des de l'últim que es va apuntar. El que s'anota a la mateixa presa de comanda continua al mateix val.</li>
</ul>

<h4>Com es treballa una comanda</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Toca el <strong>nom del bloc</strong> (per exemple <strong>Entrants</strong>, amb les dues fletxes al costat). Tots els plats del bloc passen a <strong>En preparació</strong> i marquen una flama.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Quan surten, torna a tocar el nom del bloc. El bloc passa a <strong>Llest al pas</strong>. Ja no hi ha un botó gran a part.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si vols avançar <strong>un sol plat</strong>, toca'l a ell: passa al següent estat sense moure la resta del bloc.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Quan el bloc és <strong>Llest al pas</strong>, la sala el veu a la seva pantalla. Quan el cambrer se l'emporta, <strong>cuina toca el nom del bloc</strong> (o el plat) i queda <strong>Recollit</strong>. Fins llavors el tiquet continua a <strong>Actives</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Si encara no hi ha res per cuinar, el tiquet diu «Esperant que la sala marxi…». Quan tot és al pas, «Tot llest al pas».</div></div>
<p><strong>Si t'equivoques</strong>: prem <strong>Desfer</strong> (a dalt, o la fletxa del mateix tiquet). Desfà l'última acció —d'un plat o d'un curs sencer—, fins a 10 vegades seguides. Només funciona mentre no recarreguis la pàgina.</p>

<h4>Els botons de dalt</h4>
<table><thead><tr><th>Botó</th><th>Per a què serveix</th></tr></thead><tbody><tr><td><strong>Actives</strong></td><td>Els tiquets en marxa.</td></tr><tr><td><strong>Tancades</strong></td><td>Les comandes d'avui que cuina ja ha acabat: «Tot llest» si la sala encara no les ha recollit, «Lliurat» si ja.</td></tr><tr><td><strong>Avisar la sala</strong></td><td>Missatge urgent per a tot l'equip de sala.</td></tr><tr><td><strong>Mode caos</strong></td><td>Canvia els tiquets per una sola llista per ordre d'espera.</td></tr><tr><td><strong>Marcar esgotat</strong></td><td>Treu un plat o beguda de la venda a l'instant.</td></tr><tr><td><strong>Desfer</strong></td><td>Torna enrere l'última acció.</td></tr></tbody></table>

<h4>Mode caos</h4>
<p>A l'hora punta ordenar per comanda deixa d'ajudar: el que importa és <strong>què surt ara</strong>. <strong>Mode caos</strong> (torna a prémer-lo per sortir) substitueix els tiquets per una llista <strong>Per ordre d'espera</strong>, amb dues maneres de mirar-la:</p>
<ul>
<li><strong>Per taules</strong>: una targeta per taula, ordenades per la que més espera. A dins, el pendent va en «rondes» (el que es va marxar junt), amb la seva hora; tocant el seu nom avança tota la ronda. Surt el mateix que a la vista normal; només canvia la manera de veure-ho.</li>
<li><strong>Per plat</strong>: suma el pendent per plat (6 croquetes entre quatre taules), amb les taules i els minuts en etiquetes. És només per mirar i cuinar per tandes.</li>
</ul>
<p>A dalt apareix <strong>Al pas</strong>: els plats que cuina ja ha deixat llestos i la sala encara no ha recollit, per taula, amb els minuts (ambre als 3, vermell als 6). El botó <strong>Avisar</strong> envia un missatge urgent al xat de sala («llest al pas, veniu a recollir-ho») i passa a <strong>Avisat</strong> durant 3 minuts.</p>

<h4>Parlar amb la sala</h4>
<ul>
<li><strong>Avisar la sala</strong>: tria un avís ràpid («Pas ple: veniu a recollir ja», «Cuina saturada: aneu més a poc a poc amb les comandes», «S'està acabant un producte: mireu Marcar esgotat», «Necessito ajuda al pas») o escriu el teu i prem <strong>Enviar</strong>. Arriba a tota la sala com a avís urgent.</li>
<li><strong>Incidència en aquesta comanda</strong>: per parlar d'<strong>una taula concreta</strong>. Tria el tipus (<strong>Falta un producte</strong>, <strong>Retard</strong>, <strong>Dubte sobre el plat</strong>, <strong>Error a la comanda</strong> o <strong>Una altra cosa</strong>), escriu si vols i <strong>Enviar a sala</strong>. La sala la veu marcada a la seva taula i pot <strong>Respondre</strong>; qualsevol dels dos pot <strong>Marcar resolta</strong>. Mentre n'hi ha una d'oberta, el tiquet mostra una franja i el botó <strong>Veure incidència</strong> en vermell; <strong>Nou</strong> avisa que hi ha un missatge sense llegir.</li>
</ul>

<h4>Marcar esgotat</h4>
<p>Quan alguna cosa s'acaba a mitja comanda, deixa de poder-se demanar al moment, sense entrar a Oferta Gastronòmica. Es fa en passos: primer tries la carta o el menú, després la categoria i, a dins, cada plat té el seu botó <strong>Disponible</strong> / <strong>No disponible</strong>. En un menú pots marcar una opció concreta o el <strong>Menú sencer</strong>. Es desa a l'instant i queda anotat.</p>

<h4>El que convé saber</h4>
<ul>
<li><strong>Qualsevol persona amb accés a Cuina</strong> pot moure els tiquets, avisar la sala i marcar esgotat. No cal permís d'edició.</li>
<li><strong>Imprimir en lloc de mirar la pantalla</strong>: a <strong>Gestió → El Meu Negoci → Comandes de cuina i sala</strong> tries <strong>Mostrar en pantalla</strong> o <strong>Imprimir</strong>. Amb Imprimir, cada cop que la sala marxa s'imprimeix un val a les impressores que configuris (cuina, barra…), i aquesta pantalla continua funcionant.</li>
<li>Els botons d'aquesta pantalla són compactes a propòsit, perquè no ocupin mitja pantalla a l'hora punta; el que més es fa servir és el nom de cada bloc, dins del tiquet.</li>
<li>Una comanda deixa de ser a <strong>Actives</strong> quan tots els seus plats estan lliurats <strong>i recollits per la sala</strong>.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>La sala ha marxat una comanda i no apareix</strong>: a la taula de sala mira si posa <strong>A cuina</strong> o «Enviant…». Si es queda a «Enviant…», revisa que l'indicador de núvol sigui verd als dos aparells.</li>
<li><strong>No surt un plat</strong>: pot ser una beguda (no passa per cuina), no estar marxat encara o ser una comanda programada per a un altre dia.</li>
<li><strong>El tiquet no desapareix tot i que ja ha sortit</strong>: falta marcar-lo com a <strong>Recollit</strong> (toca el nom del bloc quan la sala se l'emporta); fins llavors continua a Actives. Mira <strong>Al pas</strong> al Mode caos: allà tens <strong>Recollit</strong> i <strong>Avisar</strong>.</li>
<li><strong>He premut un plat sense voler</strong>: <strong>Desfer</strong>, abans de recarregar la pàgina.</li>
<li><strong>«No hi ha comandes pendents»</strong>: no hi ha res marxat ara mateix; apareixeran soles.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p><strong>Kitchen Orders</strong> is the screen the kitchen keeps open during service. When the dining room fires an order, it appears here instantly as a ticket, with the table, the dishes, the allergies and how long it has been waiting. The kitchen moves it along (start, ready at the pass) and the floor sees every change on the table. It saves you from shouting orders, losing paper and not knowing what goes out first. The screen refreshes itself every few seconds, so the minutes keep running without you touching anything.</p>
<p>It is only in the <strong>Kitchen</strong> folder. <strong>The Dining Room has no equivalent screen</strong>: the waiter follows each table from the <strong>POS</strong> (they see whether each dish is fired, preparing or ready to hand over), and drinks don't go through the kitchen, they are managed from the table's own order.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>For the floor and the kitchen to see each other on two different devices, the business cloud must be connected (the indicator in the header, in green).</div>

<h4>How an order arrives</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">The floor takes the order in the POS. While dishes are not <strong>fired</strong>, the kitchen can't see them.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">The floor fires a group or a single dish and the ticket appears here. On the table, the floor sees <strong>In kitchen</strong> as soon as the kitchen screen has received it (before that it says "Sending...").</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Online and takeaway orders the business accepts also arrive here. An order scheduled for days ahead doesn't appear until it's time.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Drinks never show</strong> on this screen: they aren't kitchen items.</div></div>

<h4>What a ticket looks like</h4>
<ul>
<li><strong>Header</strong>: the table (or "takeaway"/"Online" with the customer's name and time), the guests and the waiter. On the right, the <strong>minutes waiting</strong>, with a colour bar: grey at first, amber from 5 minutes and red from 15.</li>
<li><strong>Allergies</strong>: a red strip with the customer's allergies, the allergens noted for the table and those of the dishes ordered. Read it before you cook.</li>
<li><strong>A la carte and Set menu</strong>: dishes are split into blocks. Each <strong>course</strong> (starters, mains…) has its status: <strong>Waiting to fire</strong>, <strong>New</strong>, <strong>Preparing</strong>, <strong>Ready at the pass</strong> or <strong>Picked up</strong>. Under each dish you see its family (the menu section) and the waiter's notes.</li>
<li><strong>One ticket per slip.</strong> Each time the table orders again, a <strong>Slip 2</strong>, <strong>Slip 3</strong>… comes in as a separate ticket. A new slip opens when the table orders again, something had already been fired and more than 8 minutes have passed since the last thing added. What is added in the same ordering round stays on the same slip.</li>
</ul>

<h4>How to work an order</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Tap the <strong>block name</strong> (for example <strong>Starters</strong>, with the two arrows beside it). All the dishes in the block go to <strong>Preparing</strong> and show a flame.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">When they go out, tap the block name again. The block becomes <strong>Ready at the pass</strong>. There is no separate big button any more.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">If you want to advance <strong>a single dish</strong>, tap that dish: it moves to the next status without moving the rest of the block.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">When the block is <strong>Ready at the pass</strong>, the floor sees it on its screen. When the waiter takes it away, <strong>the kitchen taps the block name</strong> (or the dish) and it becomes <strong>Picked up</strong>. Until then the ticket stays in <strong>Active</strong>.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">If there's nothing to cook yet, the ticket says "Waiting for the floor to fire…". When everything is at the pass, "Everything ready at the pass".</div></div>
<p><strong>If you make a mistake</strong>: press <strong>Undo</strong> (at the top, or the arrow on the ticket itself). It undoes the last action —of one dish or a whole course—, up to 10 times in a row. It only works as long as you haven't reloaded the page.</p>

<h4>The buttons at the top</h4>
<table><thead><tr><th>Button</th><th>What it is for</th></tr></thead><tbody><tr><td><strong>Active</strong></td><td>Tickets in progress.</td></tr><tr><td><strong>Closed</strong></td><td>Today's orders the kitchen has finished: "All ready" if the floor hasn't collected them yet, "Delivered" if it has.</td></tr><tr><td><strong>Alert dining room</strong></td><td>An urgent message for the whole floor team.</td></tr><tr><td><strong>Chaos mode</strong></td><td>Swaps the tickets for a single list by waiting order.</td></tr><tr><td><strong>Mark as out</strong></td><td>Takes a dish or drink off sale instantly.</td></tr><tr><td><strong>Undo</strong></td><td>Reverses the last action.</td></tr></tbody></table>

<h4>Chaos mode</h4>
<p>At peak time sorting by order stops helping: what matters is <strong>what goes out now</strong>. <strong>Chaos mode</strong> (press it again to leave) replaces the tickets with a list <strong>By waiting order</strong>, with two ways of looking at it:</p>
<ul>
<li><strong>By table</strong>: one card per table, ordered by the one waiting longest. Inside, what's pending goes in "rounds" (what was fired together), with its time; tapping its name advances the whole round. It's the same as in the normal view; only the way of seeing it changes.</li>
<li><strong>By dish</strong>: adds up what's pending per dish (6 croquettes across four tables), with the tables and minutes as tags. It is only for looking and cooking in batches.</li>
</ul>
<p>At the top you'll see <strong>At the pass</strong>: dishes the kitchen has finished and the floor hasn't collected yet, by table, with minutes (amber at 3, red at 6). The <strong>Alert</strong> button sends an urgent message to the floor chat ("ready at the pass, come and collect") and changes to <strong>Alerted</strong> for 3 minutes.</p>

<h4>Talking to the floor</h4>
<ul>
<li><strong>Alert dining room</strong>: pick a quick alert ("Pass is full: come and collect now", "Kitchen is slammed: slow down the orders", "Running out of something: check Mark as out", "I need help at the pass") or write your own and press <strong>Send</strong>. It reaches the whole floor as an urgent alert.</li>
<li><strong>Incident on this order</strong>: to talk about <strong>one specific table</strong>. Choose the type (<strong>Missing product</strong>, <strong>Delay</strong>, <strong>Question about a dish</strong>, <strong>Order mistake</strong> or <strong>Something else</strong>), write something if you like and <strong>Send to the floor</strong>. The floor sees it flagged on their table and can <strong>Reply</strong>; either side can <strong>Mark resolved</strong>. While one is open, the ticket shows a strip and a red <strong>View incident</strong> button; <strong>New</strong> means there's an unread message.</li>
</ul>

<h4>Mark as out</h4>
<p>When something runs out mid-service, it stops being orderable instantly, without going into Menu Offering. It is done in steps: first you choose the menu or set menu, then the category and, inside, each dish has its <strong>Available</strong> / <strong>Unavailable</strong> button. In a set menu you can mark a specific option or the <strong>Whole menu</strong>. It saves instantly and is logged.</p>

<h4>What's good to know</h4>
<ul>
<li><strong>Anyone with access to Kitchen</strong> can move tickets, alert the floor and mark items as out. No edit permission is needed.</li>
<li><strong>Printing instead of watching the screen</strong>: in <strong>Management → My Business → Kitchen and floor tickets</strong> you choose <strong>Show on screen</strong> or <strong>Print</strong>. With Print, each time the floor fires, a slip is printed on the printers you set up (kitchen, bar…), and this screen keeps working.</li>
<li>The buttons on this screen are compact on purpose, so they don't take up half the screen at peak time; what's used most is the block name inside each ticket.</li>
<li>An order leaves <strong>Active</strong> when all its dishes are delivered <strong>and picked up by the floor</strong>.</li>
</ul>

<h4>If something doesn't work</h4>
<ul>
<li><strong>The floor fired an order and it doesn't show</strong>: on the floor's table check whether it says <strong>In kitchen</strong> or "Sending...". If it stays on "Sending...", check that the cloud indicator is green on both devices.</li>
<li><strong>A dish doesn't show</strong>: it may be a drink (doesn't go through the kitchen), not fired yet, or an order scheduled for another day.</li>
<li><strong>The ticket doesn't disappear although it went out</strong>: it still has to be marked <strong>Picked up</strong> (tap the block name once the floor takes it); until then it stays in Active. Check <strong>At the pass</strong> in Chaos mode: it has <strong>Picked up</strong> and <strong>Alert</strong> there.</li>
<li><strong>I pressed a dish by mistake</strong>: <strong>Undo</strong>, before reloading the page.</li>
<li><strong>"No pending orders"</strong>: nothing is fired right now; they'll appear on their own.</li>
</ul>`}
  },
  {id:'tpv', area:'sala',
    title:{es:`<i class="ti ti-device-desktop"></i> TPV`, ca:`<i class="ti ti-device-desktop"></i> TPV`, en:`<i class="ti ti-device-desktop"></i> POS`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>El TPV es la pantalla de <strong>servicio de Sala</strong>: desde aquí abres mesas, apuntas lo que piden, mandas los platos a cocina, cobras, cierras la caja al final del turno y gestionas los pedidos para llevar y a domicilio. Todo lo que cobras aquí alimenta solo la Gestión Económica, el Stock y el Panel de Control.</p>
<p>Lo encuentras en <strong>Sala → TPV</strong>. Está pensado para móvil y tablet: lo más usado está siempre a un toque.</p>

<h4>La pantalla principal</h4>
<p>Arriba hay una franja con las cifras de hoy: <strong>Ventas hoy</strong> (pulsa para ver el detalle y reimprimir tickets), <strong>Tickets</strong>, <strong>Ticket medio</strong> y <strong>En cocina</strong> (mesas con platos pendientes). En el móvil solo se ven <em>Ventas hoy</em> y <em>En cocina</em>; las otras dos están dentro de la ventana de ventas.</p>
<p>Debajo, los botones de servicio:</p>
<ul>
  <li><strong>Cartas</strong> — dice cuántas cartas y menús están activos ahora. Se activan solos según el horario que pusiste en <strong>Oferta Gastronómica</strong> (en Sala, <strong>Oferta de Bebidas</strong>); desde aquí solo los consultas. En rojo, con un aviso, significa que ahora mismo no hay ninguna carta activa.</li>
  <li><strong>Lista de espera</strong> — los grupos que esperan mesa (ver más abajo).</li>
  <li><strong>Cerrar caja</strong> — el arqueo de caja del turno.</li>
  <li><strong>Anulaciones</strong> — el registro de platos anulados.</li>
  <li><strong>Marcar agotado</strong> — avisa de que un plato o bebida se ha terminado.</li>
  <li><strong>Historial de arqueos</strong> — los cierres de caja anteriores.</li>
  <li><strong>Abrir cajón</strong> — solo aparece si tienes cajón portamonedas y una impresora Bluetooth (se configura en Mi Negocio).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>En el móvil los nombres de los botones se acortan (<strong>Espera</strong>, <strong>Caja</strong>, <strong>Agotado</strong>, <strong>Arqueos</strong>, <strong>Cajón</strong>) para que quepan, pero hacen lo mismo.</div>

<h4>Las mesas</h4>
<p>Las mesas son las que creaste en <strong>Mi Negocio → Operativa</strong>, agrupadas por zonas (Interior, Terraza, Barra…). Cada mesa es una ficha con su color:</p>
<table>
  <thead><tr><th>Aspecto</th><th>Qué significa</th></tr></thead>
  <tbody>
    <tr><td>Blanca, borde discontinuo</td><td><strong>Libre</strong> (con las plazas que tiene)</td></tr>
    <tr><td>Gris</td><td><strong>Tomando nota</strong> u <strong>Ocupada</strong> (por ejemplo, solo bebidas)</td></tr>
    <tr><td>Ámbar</td><td><strong>Marchado</strong> o <strong>En cocina</strong>: hay platos en camino</td></tr>
    <tr><td>Verde</td><td><strong>Servido</strong>: toda la comida está entregada, lista para cobrar</td></tr>
  </tbody>
</table>
<p>Una ficha ocupada enseña el tiempo que lleva abierta (se marca a la hora y más aún a las dos), el total, las personas, el camarero y pequeños avisos: pedido nuevo del cliente, incidencia de cocina, pedido por QR, <em>mesa fría</em> (servida hace un rato sin cobrar: suele ser un olvido) y <em>pagado online</em>. Una mesa libre con una reserva en la próxima hora lo indica con la hora y el nombre, para que no sientes ahí a nadie justo antes de que llegue quien reservó.</p>
<p>Para moverte rápido:</p>
<ul>
  <li><strong>Todas / Libres / Ocupadas / Servidas / Mis mesas</strong> — filtros que te dicen cuántas hay de cada tipo. <strong>Mis mesas</strong> enseña solo las que llevas tú.</li>
  <li>Los botones de zona filtran por zona; si tocas la zona activa, se quita el filtro (<strong>Todas las zonas</strong>).</li>
  <li><strong>Ir a mesa…</strong> — escribe el nombre o número y salen solo las que coinciden.</li>
  <li><strong>Modo caos</strong> — deja una sola lista con las mesas ocupadas, la que más lleva esperando la primera. Útil en hora punta. Se vuelve a pulsar para salir.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si el negocio solo ofrece Para llevar o A domicilio (<strong>Mi Negocio → Tipos de servicio</strong>), la sección de mesas no aparece.</div>

<h4>Abrir una mesa y tomar nota, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Toca una mesa libre. En <strong>Abrir mesa</strong> elige si el cliente es <strong>Cliente de paso</strong> (indica cuántos son y, si quieres, su nombre; si coincide con un cliente de tu base, se enlaza con su ficha y salen sus alergias) o <strong>Tiene reserva</strong> (eliges la reserva de hoy y se rellena sola; la reserva pasa a <em>Ha llegado</em>). Si hay una reserva próxima en esa mesa, la app te avisa antes de sentar a alguien.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Se abre la pantalla de la mesa. Arriba tienes <strong>Cambiar de mesa</strong>, el nombre de la mesa y, si todavía no has pedido nada, <strong>Liberar mesa</strong> (para deshacer una mesa abierta por error).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige la carta en las pestañas de arriba (las bebidas salen primero, para que no se olvide pedirlas). Abre una carpeta y toca los platos: cada toque suma una unidad. Cada plato te dice <strong>cuántos lleva ya la mesa (×2)</strong> y tiene un <strong>−</strong> para quitar uno. También puedes escribir en el buscador <strong>Buscar un plato o bebida…</strong> para no abrir carpeta por carpeta.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si el plato tiene extras u opciones, se abre una ventana (<strong>Extras y opciones</strong>) para marcarlos y añadir una nota. Si es un menú, la pestaña del menú tiene un botón para añadirlo y elegir sus platos.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">La <strong>comanda</strong> se va formando al lado (en PC y tablet) con − / cantidad / + en cada línea. En el móvil, carta y comanda se alternan a pantalla completa: abajo hay una barra <strong>Comanda</strong> con el total, y arriba de la comanda un botón para volver a la carta.</div></div>
<p>En cada línea de la comanda hay tres botones pequeños: <strong>Notas</strong> (cocina las verá destacadas), <strong>Marchar este plato a cocina</strong> y <strong>Eliminar</strong>. En <strong>Notas</strong> puedes también cambiar el <em>momento de servicio</em> (primeros, segundos, postres…) y pulsar una <strong>nota rápida</strong> (Sin cebolla, Sin gluten, Sin lactosa, Poco hecho, Al punto, Muy hecho, Sin sal, Sin picante, Para compartir, Con prisa): un toque la añade y otro la quita.</p>
<p>Bajo el nombre de la mesa tienes dos etiquetas pulsables: el <strong>camarero</strong> (se asigna solo a quien abre la mesa; para cambiarlo después hay que ser el propietario) y <strong>Alérgenos</strong>, donde apuntas lo que el cliente te ha avisado y sale en el vale de cocina. Con la <strong>i</strong> de cada plato ves sus ingredientes y alérgenos.</p>

<h4>Marchar a cocina y seguir el servicio</h4>
<ul>
  <li>Lo primero que apuntas en una mesa nueva (la primera sección) <strong>se marcha solo</strong>. Las <strong>bebidas</strong> no pasan por cocina: van directas a barra.</li>
  <li>Cada tanda (Entrantes, Segundos, Postres…) tiene su botón <strong>Marchar a cocina</strong> para lanzarla cuando el cliente esté listo.</li>
  <li>Se marcha <strong>por grupo</strong> (el botón de la cabecera de cada tanda) o <strong>plato a plato</strong> (con el ⋯ de la línea). Ya no hay un «Marchar vale» general: así cada cosa sale cuando toca.</li>
  <li>El estado de cada tanda se actualiza solo con lo que hace Cocina: <strong>Marchado → En preparación → Listo para recoger → Recogido</strong>. Cuando algo está listo lo ves como <strong>Listo en el pase</strong>; el «Recogido» lo marca Cocina cuando te lo llevas.</li>
  <li>Si una mesa vuelve a pedir pasados unos 8 minutos de que cocina ya tuviera platos en marcha, entra como <strong>un vale nuevo</strong> en la pantalla de Cocina.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Puedes elegir si los vales se ven en la pantalla de Cocina o se imprimen, en <strong>Mi Negocio → Comandas de cocina y sala</strong>.</div>

<h4>Cambiar de mesa y juntar mesas</h4>
<p><strong>Cambiar de mesa</strong> abre una ventana con dos opciones: <strong>Mover comanda</strong> a una mesa libre, o <strong>Fusionar mesas</strong> con otra mesa ocupada (los platos pasan a la otra y esta queda libre; se ve como «Mesa 3 + Mesa 4»). No se pueden fusionar mesas que ya tengan partes de una cuenta dividida cobradas.</p>

<h4>Cobrar</h4>
<p>Pulsa <strong>Cobrar</strong> en el pie de la mesa (se resalta cuando todo está servido, pero puedes cobrar en cualquier momento). Se abre la ventana <strong>Cobrar</strong> con tres pestañas:</p>
<ul>
  <li><strong>Cuenta completa</strong> — eliges la forma de pago: <strong>Efectivo</strong> (escribes el <em>Importe entregado</em> y ves el <em>Cambio</em>), <strong>Tarjeta</strong> o <strong>Pago mixto (efectivo + tarjeta)</strong>. Antes puedes poner una <strong>Propina</strong> y un <strong>Descuento (%)</strong>. Termina con <strong>Confirmar cobro</strong>.</li>
  <li><strong>Dividir a partes iguales</strong> — indicas entre cuántos se divide (por defecto, los comensales de la mesa), pulsas <strong>Dividir cuenta</strong> y cobras cada parte por separado (cada una en efectivo o tarjeta).</li>
  <li><strong>Por comensal (platos)</strong> — asignas cada unidad a un comensal (3 ensaladas pueden ir a personas distintas), pulsas <strong>Calcular división</strong> y cobras a cada uno lo suyo. El descuento y la propina se reparten a partes iguales.</li>
</ul>
<p>En las dos divisiones, cuando están todas las partes cobradas aparece <strong>Finalizar cobro</strong>; <strong>Cancelar división</strong> solo funciona mientras no se haya cobrado ninguna parte.</p>
<p><strong>Descuento:</strong> escribes el porcentaje y pulsas <strong>Aplicar</strong>; la app pide quién lo autoriza y el <strong>motivo</strong>, y queda registrado para el cierre de caja. Hasta que no pulsas Aplicar, el total no cambia. Si hay una promoción activa hoy para un plato (la creaste en Promoción), su descuento ya se aplica solo al añadirlo.</p>
<p>Si el cliente ya pagó parte desde el móvil (carta por QR) o dejó una señal de reserva, se resta de lo que queda por cobrar y se ve claro en el desglose. Si no queda nada por cobrar, el botón dice <strong>Cerrar pedido (ya pagado)</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El <strong>vale regalo todavía no se acepta como forma de pago</strong> en el cobro. Si un cliente trae uno, se canjea a mano desde <strong>Sala → Clientes</strong> y cobras el resto con efectivo o tarjeta.</div>

<h4>Tras cobrar: ticket y factura</h4>
<p>Al registrar el cobro aparece <strong>Cobro registrado</strong> con lo que puedes hacer con el ticket: <strong>No imprimir</strong>, <strong>Enviar por email</strong>, <strong>Factura</strong>, <strong>Imprimir ticket</strong>, <strong>Ticket</strong> (a la térmica de este aparato) y <strong>Anular venta</strong>.</p>
<ul>
  <li>Todo ticket es una <strong>factura simplificada con número correlativo</strong>. Cada aparato lleva su propia serie, así que dos tablets sin conexión nunca repiten número.</li>
  <li><strong>Factura</strong> emite la <strong>factura completa</strong> para un cliente empresa o autónomo: pide nombre o razón social, NIF y domicilio, y sustituye al ticket entregado. Se recuerda en su ficha de cliente para la próxima vez.</li>
  <li>Para reimprimir o sacar una factura más tarde: <strong>Ventas hoy</strong> (ventana <strong>Ventas de hoy</strong>), con el icono de impresora, de factura o de la térmica en cada venta. El propietario ve también el <strong>Margen</strong> de cada venta.</li>
  <li>La impresión puede ser por Bluetooth (térmica emparejada) o por el navegador/AirPrint/impresora del sistema; se elige por aparato en Mi Negocio.</li>
  <li><strong>Pagar con un vale regalo</strong>: en la ventana de cobro, pestaña <strong>Cuenta completa</strong>, escribe el código en <strong>Vale regalo (código)</strong> y pulsa <strong>Aplicar</strong>. El importe del vale se resta de la cuenta (hasta lo que quede por pagar) y el resto se cobra en efectivo o tarjeta. Si el vale es más grande que la cuenta, le queda saldo. Solo vale con los vales de importe vigentes; uno caducado, anulado o de experiencia se rechaza. Si anulas la venta, el vale recupera su saldo. En el cierre de caja el vale no cuenta como efectivo ni tarjeta.</li>
  <li><strong>La cuenta antes de cobrar</strong>: en la pestaña <strong>Pedido</strong>, el botón de la impresora (<strong>Cuenta</strong>) saca la cuenta para el cliente, con lo consumido y el total. Pone «Esta cuenta no es una factura»: no lleva número ni cierra la mesa. El ticket de venta sale por el rollo de la impresora de este aparato (58 u 80 mm), sin abrir ventanas.</li>
  <li><strong>Con «Imprimir» activado en Mi Negocio</strong>, los vales salen también cuando no pulsas «Marchar»: el primer grupo de la mesa, lo de para llevar, las bebidas y los pedidos de la web que aceptas. Se espera unos segundos para sacar <strong>un solo vale</strong> con todo lo que entró junto. Si anulas algo que ya estaba marchado, cocina o barra reciben un vale <strong>ANULADO</strong>.</li>
</ul>

<h4>Anulaciones</h4>
<ul>
  <li><strong>Quitar un plato que aún no se ha marchado</strong> se hace libremente.</li>
  <li><strong>Quitar o reducir un plato ya marchado</strong> (aunque esté servido) abre <strong>Anular plato</strong>: eliges el motivo (error al tomar la comanda, el cliente cambió de opinión, error en cocina, producto agotado u otro) y queda en <strong>Anulaciones</strong> con fecha, mesa, plato y quién lo hizo. Si entras como propietario sin identificarte como empleado, te deja elegir el responsable. Las raciones limitadas se devuelven al stock.</li>
  <li><strong>Anular una venta ya cobrada</strong> (cobro duplicado, mesa equivocada): el botón <strong>Anular venta</strong> está en la ventana <strong>Cobro registrado</strong>, justo después de cobrar. Solo el <strong>propietario o un empleado con permiso de edición</strong> puede hacerlo; pide confirmación (o el PIN del negocio si no eres el propietario), devuelve el stock y <strong>no borra la venta</strong>: emite una <strong>factura rectificativa</strong> con su propio número y deja constancia. No se puede anular en un mes ya cerrado.</li>
</ul>

<h4>Cierre de caja y arqueo</h4>
<p>Al acabar el turno o el día, pulsa <strong>Cerrar caja</strong>. La ventana <strong>Cierre de caja / Arqueo</strong> te enseña:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Las ventas desde el último cierre, por forma de pago (Efectivo, Tarjeta, Otro), más los <strong>descuentos</strong> y <strong>anulaciones</strong> del periodo, con quién los hizo.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si trabajas con Glovo, Uber Eats u otras, apunta el total que te ha dado cada plataforma si no diste de alta sus pedidos uno a uno: se suma a la facturación y se descuenta su comisión.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Escribe el <strong>Fondo de caja inicial</strong> (si lo hay) y cuenta el <strong>Efectivo contado en caja</strong> poniendo cuántas monedas y billetes hay de cada valor: el total sale solo.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">La app calcula el <strong>efectivo esperado</strong> y la <strong>diferencia</strong> (sobra o falta). Añade una nota si quieres y pulsa <strong>Confirmar cierre</strong>: se imprime el resumen.</div></div>
<p>Si algo no cuadra (cualquier descuadre, muchos descuentos de una misma persona o muchas anulaciones), la app te lo señala al cerrar. Puedes hacer varios cierres al día. En <strong>Historial de arqueos</strong> reimprimes cualquier cierre y, con el icono de dinero, ves el <strong>reparto de propinas</strong> entre quienes estuvieron fichados en ese turno. Una venta que llega tarde por sincronización entra en el siguiente cierre; nunca se pierde.</p>

<h4>Lista de espera</h4>
<p>Es la cola de grupos sin reserva. En <strong>Lista de espera</strong> apuntas nombre, personas, teléfono y notas; ves cuántos minutos llevan esperando. Con el icono de la silla eliges una <strong>mesa libre</strong> y se abre ya con su nombre y comensales (te avisa si la mesa es pequeña); con el teléfono llamas; y el aspa quita al grupo que se ha ido (solo propietario o empleado con edición).</p>

<h4>Marcar agotado</h4>
<p><strong>Marcar agotado</strong> te lleva por cartas y menús → categorías → platos, con un interruptor <strong>Disponible / No disponible</strong> en cada uno. Un plato agotado desaparece al instante del TPV y de la web de pedidos. Un menú puede agotarse entero o solo una opción. Lo puede hacer cualquier empleado, sin permiso de edición.</p>

<h4>Para llevar y a domicilio</h4>
<p>Estos pedidos <strong>no se apuntan a mano</strong>: los hace el cliente en tu web (ver el capítulo «Reservas y Pedidos Online»). Aparecen en la sección <strong>Para Llevar / Delivery</strong>, debajo de las mesas, como una ficha por pedido: tipo (<em>Para recoger</em> o <em>Delivery</em>), hora, cliente, dirección, total y si está pagado.</p>
<ul>
  <li><strong>Pedidos online: ON/OFF</strong> — el interruptor de emergencia. En ON los pedidos entran y se aceptan solos; en OFF la web deja de admitirlos y avisa al cliente. Úsalo cuando la cocina se desborda.</li>
  <li>Pestaña <strong>Pendientes</strong> — lo que espera una decisión: pedidos pagados con tarjeta cuyo pago aún no ha confirmado el banco, zonas de reparto sin verificar, o todo si tienes el interruptor en OFF. Cada uno tiene <strong>Aceptar</strong> y <strong>Rechazar</strong>. También se listan aquí los pedidos <strong>Programados para más tarde hoy</strong>.</li>
  <li>Pestaña <strong>En curso</strong> — los pedidos ya aceptados. Un pedido programado para otro día no sale hasta una hora antes de su hora.</li>
  <li>Al <strong>aceptar</strong> pasa a cocina y, si es reparto propio, se asigna solo al repartidor con menos repartos (un empleado de Sala con la casilla «Es repartidor»). Si lo programaron para dentro de más de una hora, se acepta pero no se marcha hasta que toque.</li>
  <li><strong>Rechazar</strong> y <strong>Cancelar pedido</strong> (un pedido ya aceptado) solo los hace el propietario o un empleado con edición. Después te ofrece avisar al cliente por WhatsApp o email. Si estaba pagado con tarjeta, la venta se anula y tienes que devolver el dinero desde tu panel de Stripe.</li>
  <li>Un pedido hecho por la web es <strong>solo de consulta</strong>: no se le pueden añadir ni quitar platos, para que el total siga cuadrando con lo que el cliente ya pagó. Si quiere algo más, que haga otro pedido.</li>
  <li><strong>Control de repartos</strong> — los repartos en curso y los entregados hoy. Cada pedido de reparto propio tiene dirección con botón a Google Maps, teléfono, importe a cobrar y el <strong>cambio a preparar</strong> si pagan en efectivo, repartidor, <strong>Observaciones de reparto</strong> y los botones <strong>Salió a repartir</strong> y <strong>Marcar entregado</strong>. Si un repartidor lleva varios pedidos, se agrupan en una ruta.</li>
  <li><strong>Calendario</strong> — los pedidos programados por día, semana o mes.</li>
</ul>

<h4>Pedidos desde el QR de la mesa</h4>
<p>Si activas la carta por QR (ver el capítulo «Reservas y Pedidos Online»), los pedidos que hacen los comensales desde su móvil salen arriba del TPV en <strong>Pedidos desde el QR de la mesa</strong>. Con <strong>Aceptar y marchar</strong> pasan a la comanda de esa mesa y a cocina; <strong>Rechazar</strong> lo descarta (solo propietario o edición). Si prefieres que entren directos a cocina, se cambia en Mi Negocio.</p>

<h4>Lo que conviene saber</h4>
<ul>
  <li><strong>Permisos:</strong> cualquier empleado abre mesas, apunta, marcha, cobra, cierra caja y marca agotados. <strong>Cancelar, anular una venta, rechazar pedidos, quitar de la lista de espera</strong> es del propietario o de un empleado con permiso de edición. Reasignar el camarero de una mesa y ver el margen es solo del propietario. Si intentas algo sin permiso, la app te lo explica.</li>
  <li><strong>Se sincroniza:</strong> varias tablets y móviles ven las mismas mesas en tiempo real. Si dos cobran la misma mesa a la vez, solo queda una venta.</li>
  <li><strong>Sala y Cocina:</strong> el TPV solo existe en Sala. Cocina ve los platos en <strong>Comandas Cocina</strong>.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
  <li><strong>Un plato no aparece en el TPV:</strong> comprueba que su carta esté activa en <strong>Cartas</strong> (según horario) y que el plato no esté marcado como no disponible.</li>
  <li><strong>No puedo añadir platos a un pedido:</strong> es un pedido de la web; se consulta, no se modifica.</li>
  <li><strong>No puedo cancelar o anular:</strong> hace falta ser propietario o tener permiso de edición.</li>
  <li><strong>Un pedido online no entra:</strong> mira si <strong>Pedidos online</strong> está en OFF o si hay pedidos en <strong>Pendientes</strong>.</li>
  <li><strong>No sale el botón Abrir cajón:</strong> hay que activar el cajón en Mi Negocio y usar una impresora Bluetooth.</li>
  <li><strong>No imprime:</strong> en Mi Negocio revisa cómo imprime este aparato (Bluetooth o navegador); si el Bluetooth falla, la app lo avisa y puedes usar el navegador.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>El TPV és la pantalla de <strong>servei de Sala</strong>: des d'aquí obres taules, apuntes el que demanen, envies els plats a cuina, cobres, tanques la caixa al final del torn i gestiones les comandes per emportar i a domicili. Tot el que cobres aquí alimenta sol la Gestió Econòmica, l'Estoc i el Tauler de Control.</p>
<p>El trobaràs a <strong>Sala → TPV</strong>. Està pensat per a mòbil i tauleta: el que més fas servir és sempre a un toc.</p>

<h4>La pantalla principal</h4>
<p>A dalt hi ha una franja amb les xifres d'avui: <strong>Vendes avui</strong> (prem per veure'n el detall i reimprimir tiquets), <strong>Tiquets</strong>, <strong>Tiquet mitjà</strong> i <strong>A cuina</strong> (taules amb plats pendents). Al mòbil només es veuen <em>Vendes avui</em> i <em>A cuina</em>; les altres dues són dins la finestra de vendes.</p>
<p>A sota, els botons de servei:</p>
<ul>
  <li><strong>Cartes</strong> — diu quantes cartes i menús estan actius ara. S'activen sols segons l'horari que vas posar a <strong>Oferta Gastronòmica</strong> (a Sala, <strong>Oferta de Begudes</strong>); des d'aquí només els consultes. En vermell, amb un avís, vol dir que ara mateix no hi ha cap carta activa.</li>
  <li><strong>Llista d'espera</strong> — els grups que esperen taula (més avall).</li>
  <li><strong>Tancar caixa</strong> — l'arqueig de caixa del torn.</li>
  <li><strong>Anul·lacions</strong> — el registre de plats anul·lats.</li>
  <li><strong>Marcar esgotat</strong> — avisa que un plat o beguda s'ha acabat.</li>
  <li><strong>Historial d'arqueigs</strong> — els tancaments de caixa anteriors.</li>
  <li><strong>Obrir calaix</strong> — només apareix si tens calaix portamonedes i una impressora Bluetooth (es configura a El Meu Negoci).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Al mòbil els noms dels botons s'abreugen (<strong>Espera</strong>, <strong>Caixa</strong>, <strong>Esgotat</strong>, <strong>Arqueigs</strong>, <strong>Calaix</strong>) perquè hi càpiguen, però fan el mateix.</div>

<h4>Les taules</h4>
<p>Les taules són les que vas crear a <strong>El Meu Negoci → Operativa</strong>, agrupades per zones (Interior, Terrassa, Barra…). Cada taula és una fitxa amb el seu color:</p>
<table>
  <thead><tr><th>Aspecte</th><th>Què significa</th></tr></thead>
  <tbody>
    <tr><td>Blanca, vora discontínua</td><td><strong>Lliure</strong> (amb les places que té)</td></tr>
    <tr><td>Grisa</td><td><strong>Prenent nota</strong> o <strong>Ocupada</strong> (per exemple, només begudes)</td></tr>
    <tr><td>Ambre</td><td><strong>Marxat</strong> o <strong>A cuina</strong>: hi ha plats en camí</td></tr>
    <tr><td>Verda</td><td><strong>Servit</strong>: tot el menjar està lliurat, a punt per cobrar</td></tr>
  </tbody>
</table>
<p>Una fitxa ocupada mostra el temps que porta oberta (es marca a l'hora i encara més a les dues), el total, les persones, el cambrer i petits avisos: comanda nova del client, incidència de cuina, comanda per QR, <em>taula freda</em> (servida fa estona sense cobrar: sol ser un oblit) i <em>pagat en línia</em>. Una taula lliure amb una reserva en la propera hora ho indica amb l'hora i el nom, perquè no hi asseguis ningú just abans que arribi qui va reservar.</p>
<p>Per moure't ràpid:</p>
<ul>
  <li><strong>Totes / Lliures / Ocupades / Servides / Les meves taules</strong> — filtres que et diuen quantes n'hi ha de cada tipus. <strong>Les meves taules</strong> mostra només les que portes tu.</li>
  <li>Els botons de zona filtren per zona; si toques la zona activa, el filtre es treu (<strong>Totes les zones</strong>).</li>
  <li><strong>Anar a taula…</strong> — escriu el nom o número i només surten les que coincideixen.</li>
  <li><strong>Mode caos</strong> — deixa una sola llista amb les taules ocupades, la que fa més temps que espera la primera. Útil en hora punta. Es torna a prémer per sortir-ne.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si el negoci només ofereix Per emportar o A domicili (<strong>El Meu Negoci → Tipus de servei</strong>), la secció de taules no apareix.</div>

<h4>Obrir una taula i prendre nota, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Toca una taula lliure. A <strong>Obrir taula</strong> tria si el client és <strong>Client de pas</strong> (indica quants són i, si vols, el seu nom; si coincideix amb un client de la teva base, s'enllaça amb la seva fitxa i surten les seves al·lèrgies) o <strong>Té reserva</strong> (tries la reserva d'avui i s'omple sola; la reserva passa a <em>Ha arribat</em>). Si hi ha una reserva propera en aquella taula, l'app t'avisa abans d'asseure-hi algú.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">S'obre la pantalla de la taula. A dalt tens <strong>Canviar de taula</strong>, el nom de la taula i, si encara no has demanat res, <strong>Alliberar taula</strong> (per desfer una taula oberta per error).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria la carta a les pestanyes de dalt (les begudes surten primer, perquè no s'oblidi de demanar-les). Obre una carpeta i toca els plats: cada toc suma una unitat. Cada plat et diu <strong>quants en porta ja la taula (×2)</strong> i té un <strong>−</strong> per treure'n un. També pots escriure al cercador <strong>Cercar un plat o beguda…</strong> per no obrir carpeta per carpeta.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si el plat té extres o opcions, s'obre una finestra (<strong>Extres i opcions</strong>) per marcar-los i afegir una nota. Si és un menú, la pestanya del menú té un botó per afegir-lo i triar-ne els plats.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">La <strong>comanda</strong> es va formant al costat (a PC i tauleta) amb − / quantitat / + a cada línia. Al mòbil, carta i comanda s'alternen a pantalla completa: a baix hi ha una barra <strong>Comanda</strong> amb el total, i a dalt de la comanda un botó per tornar a la carta.</div></div>
<p>A cada línia de la comanda hi ha tres botons petits: <strong>Notes</strong> (cuina les veurà destacades), <strong>Marxar aquest plat a cuina</strong> i <strong>Eliminar</strong>. A <strong>Notes</strong> també pots canviar el <em>moment de servei</em> (primers, segons, postres…) i prémer una <strong>nota ràpida</strong> (Sense ceba, Sense gluten, Sense lactosa, Poc fet, Al punt, Molt fet, Sense sal, Sense picant, Per compartir, Amb pressa): un toc l'afegeix i un altre la treu.</p>
<p>Sota el nom de la taula tens dues etiquetes que es poden prémer: el <strong>cambrer</strong> (s'assigna sol a qui obre la taula; per canviar-lo després cal ser el propietari) i <strong>Al·lèrgens</strong>, on apuntes el que el client t'ha avisat i surt al val de cuina. Amb la <strong>i</strong> de cada plat veus els seus ingredients i al·lèrgens.</p>

<h4>Marxar a cuina i seguir el servei</h4>
<ul>
  <li>El primer que apuntes en una taula nova (la primera secció) <strong>marxa sol</strong>. Les <strong>begudes</strong> no passen per cuina: van directes a barra.</li>
  <li>Cada tanda (Entrants, Segons, Postres…) té el seu botó <strong>Enviar a cuina</strong> per llançar-la quan el client estigui llest.</li>
  <li>Es marxa <strong>per grup</strong> (el botó de la capçalera de cada tanda) o <strong>plat a plat</strong> (amb el ⋯ de la línia). Ja no hi ha un «Marxar val» general: així cada cosa surt quan toca.</li>
  <li>L'estat de cada tanda s'actualitza sol amb el que fa Cuina: <strong>Marxat → En preparació → Llest per recollir → Recollit</strong>. Quan alguna cosa és a punt la veus com a <strong>Llest al pas</strong>; el «Recollit» el marca Cuina quan te l'emportes.</li>
  <li>Si una taula torna a demanar passats uns 8 minuts d'haver ja plats en marxa a cuina, entra com <strong>un val nou</strong> a la pantalla de Cuina.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Pots triar si els vals es veuen a la pantalla de Cuina o s'imprimeixen, a <strong>El Meu Negoci → Comandes de cuina i sala</strong>.</div>

<h4>Canviar de taula i ajuntar taules</h4>
<p><strong>Canviar de taula</strong> obre una finestra amb dues opcions: <strong>Moure comanda</strong> a una taula lliure, o <strong>Fusionar taules</strong> amb una altra taula ocupada (els plats passen a l'altra i aquesta queda lliure; es veu com «Taula 3 + Taula 4»). No es poden fusionar taules que ja tinguin parts d'un compte dividit cobrades.</p>

<h4>Cobrar</h4>
<p>Prem <strong>Cobrar</strong> al peu de la taula (es ressalta quan tot està servit, però pots cobrar en qualsevol moment). S'obre la finestra <strong>Cobrar</strong> amb tres pestanyes:</p>
<ul>
  <li><strong>Compte complet</strong> — tries la forma de pagament: <strong>Efectiu</strong> (escrius l'<em>Import entregat</em> i veus el <em>Canvi</em>), <strong>Targeta</strong> o <strong>Pagament mixt (efectiu + targeta)</strong>. Abans pots posar una <strong>Propina</strong> i un <strong>Descompte (%)</strong>. Acaba amb <strong>Confirmar cobrament</strong>.</li>
  <li><strong>Dividir a parts iguals</strong> — indiques entre quants es divideix (per defecte, els comensals de la taula), prems <strong>Dividir compte</strong> i cobres cada part per separat (cadascuna en efectiu o targeta).</li>
  <li><strong>Per comensal (plats)</strong> — assignes cada unitat a un comensal (3 amanides poden anar a persones diferents), prems <strong>Calcular divisió</strong> i cobres a cadascú el seu. El descompte i la propina es reparteixen a parts iguals.</li>
</ul>
<p>En les dues divisions, quan totes les parts són cobrades apareix <strong>Finalitzar cobrament</strong>; <strong>Cancel·lar divisió</strong> només funciona mentre no s'hagi cobrat cap part.</p>
<p><strong>Descompte:</strong> escrius el percentatge i prems <strong>Aplicar</strong>; l'app demana qui l'autoritza i el <strong>motiu</strong>, i queda registrat per al tancament de caixa. Fins que no prems Aplicar, el total no canvia. Si avui hi ha una promoció activa per a un plat (la vas crear a Promoció), el seu descompte ja s'aplica sol en afegir-lo.</p>
<p>Si el client ja ha pagat una part des del mòbil (carta per QR) o va deixar una senyal de reserva, es resta del que queda per cobrar i es veu clar al desglossament. Si no queda res per cobrar, el botó diu <strong>Tancar comanda (ja pagada)</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El <strong>val regal encara no s'accepta com a forma de pagament</strong> al cobrament. Si un client en porta un, es canvia a mà des de <strong>Sala → Clients</strong> i cobres la resta amb efectiu o targeta.</div>

<h4>Després de cobrar: tiquet i factura</h4>
<p>En registrar el cobrament apareix <strong>Cobrament registrat</strong> amb el que pots fer amb el tiquet: <strong>No imprimir</strong>, <strong>Enviar per email</strong>, <strong>Factura</strong>, <strong>Imprimir tiquet</strong>, <strong>Tiquet</strong> (a la tèrmica d'aquest aparell) i <strong>Anul·lar venda</strong>.</p>
<ul>
  <li>Tot tiquet és una <strong>factura simplificada amb número correlatiu</strong>. Cada aparell porta la seva pròpia sèrie, així que dues tauletes sense connexió mai repeteixen número.</li>
  <li><strong>Factura</strong> emet la <strong>factura completa</strong> per a un client empresa o autònom: demana nom o raó social, NIF i domicili, i substitueix el tiquet lliurat. Es recorda a la seva fitxa de client per a la propera vegada.</li>
  <li>Per reimprimir o treure una factura més tard: <strong>Vendes avui</strong> (finestra <strong>Vendes d'avui</strong>), amb la icona d'impressora, de factura o de la tèrmica a cada venda. El propietari veu també el <strong>Marge</strong> de cada venda.</li>
  <li>La impressió pot ser per Bluetooth (tèrmica emparellada) o pel navegador/AirPrint/impressora del sistema; es tria per aparell a El Meu Negoci.</li>
  <li><strong>Pagar amb un val regal</strong>: a la finestra de cobrament, pestanya <strong>Compte complet</strong>, escriu el codi a <strong>Val regal (codi)</strong> i prem <strong>Aplicar</strong>. L'import del val es resta del compte (fins al que quedi per pagar) i la resta es cobra en efectiu o targeta. Si el val és més gran que el compte, li queda saldo. Només val amb els vals d'import vigents; un de caducat, anul·lat o d'experiència es rebutja. Si anul·les la venda, el val recupera el saldo. Al tancament de caixa el val no compta com a efectiu ni targeta.</li>
  <li><strong>El compte abans de cobrar</strong>: a la pestanya <strong>Comanda</strong>, el botó de la impressora (<strong>Compte</strong>) treu el compte per al client, amb el consumit i el total. Diu «Aquest compte no és una factura»: no porta número ni tanca la taula. El tiquet de venda surt pel rotllo de la impressora d'aquest aparell (58 o 80 mm), sense obrir finestres.</li>
  <li><strong>Amb «Imprimir» activat a El Meu Negoci</strong>, els vals surten també quan no prems «Marxar»: el primer grup de la taula, el de per emportar, les begudes i les comandes de la web que acceptes. S'espera uns segons per treure <strong>un sol val</strong> amb tot el que ha entrat junt. Si anul·les alguna cosa que ja estava marxada, cuina o barra reben un val <strong>ANUL·LAT</strong>.</li>
</ul>

<h4>Anul·lacions</h4>
<ul>
  <li><strong>Treure un plat que encara no s'ha marxat</strong> es fa lliurement.</li>
  <li><strong>Treure o reduir un plat ja marxat</strong> (encara que estigui servit) obre <strong>Anul·lar plat</strong>: tries el motiu (error en prendre la comanda, el client va canviar d'opinió, error a cuina, producte esgotat o altre) i queda a <strong>Anul·lacions</strong> amb data, taula, plat i qui ho ha fet. Si entres com a propietari sense identificar-te com a empleat, et deixa triar el responsable. Les racions limitades tornen a l'estoc.</li>
  <li><strong>Anul·lar una venda ja cobrada</strong> (cobrament duplicat, taula equivocada): el botó <strong>Anul·lar venda</strong> és a la finestra <strong>Cobrament registrat</strong>, just després de cobrar. Només el <strong>propietari o un empleat amb permís d'edició</strong> pot fer-ho; demana confirmació (o el PIN del negoci si no ets el propietari), torna l'estoc i <strong>no esborra la venda</strong>: emet una <strong>factura rectificativa</strong> amb el seu propi número i en deixa constància. No es pot anul·lar en un mes ja tancat.</li>
</ul>

<h4>Tancament de caixa i arqueig</h4>
<p>En acabar el torn o el dia, prem <strong>Tancar caixa</strong>. La finestra <strong>Tancament de caixa / Arqueig</strong> et mostra:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Les vendes des de l'últim tancament, per forma de pagament (Efectiu, Targeta, Altre), més els <strong>descomptes</strong> i <strong>anul·lacions</strong> del període, amb qui els ha fet.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si treballes amb Glovo, Uber Eats o altres, apunta el total que t'ha donat cada plataforma si no vas donar d'alta les seves comandes una a una: se suma a la facturació i es descompta la seva comissió.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Escriu el <strong>Fons de caixa inicial</strong> (si n'hi ha) i compta l'<strong>Efectiu comptat a caixa</strong> posant quantes monedes i bitllets hi ha de cada valor: el total surt sol.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">L'app calcula l'<strong>efectiu esperat</strong> i la <strong>diferència</strong> (sobra o falta). Afegeix una nota si vols i prem <strong>Confirmar tancament</strong>: s'imprimeix el resum.</div></div>
<p>Si alguna cosa no quadra (qualsevol descuadrament, molts descomptes d'una mateixa persona o moltes anul·lacions), l'app t'ho assenyala en tancar. Pots fer diversos tancaments al dia. A <strong>Historial d'arqueigs</strong> reimprimeixes qualsevol tancament i, amb la icona de diners, veus el <strong>repartiment de propines</strong> entre qui va estar fitxat en aquell torn. Una venda que arriba tard per sincronització entra al tancament següent; mai es perd.</p>

<h4>Llista d'espera</h4>
<p>És la cua de grups sense reserva. A <strong>Llista d'espera</strong> apuntes nom, persones, telèfon i notes; veus quants minuts porten esperant. Amb la icona de la cadira tries una <strong>taula lliure</strong> i s'obre ja amb el seu nom i comensals (t'avisa si la taula és petita); amb el telèfon truques; i l'aspa treu el grup que se n'ha anat (només propietari o empleat amb edició).</p>

<h4>Marcar esgotat</h4>
<p><strong>Marcar esgotat</strong> et porta per cartes i menús → categories → plats, amb un interruptor <strong>Disponible / No disponible</strong> a cadascun. Un plat esgotat desapareix a l'instant del TPV i de la web de comandes. Un menú pot esgotar-se sencer o només una opció. Ho pot fer qualsevol empleat, sense permís d'edició.</p>

<h4>Per emportar i a domicili</h4>
<p>Aquestes comandes <strong>no s'apunten a mà</strong>: les fa el client a la teva web (vegeu el capítol «Reserves i Comandes en Línia»). Apareixen a la secció <strong>Per Emportar / Delivery</strong>, sota les taules, com una fitxa per comanda: tipus (<em>Per recollir</em> o <em>Delivery</em>), hora, client, adreça, total i si està pagada.</p>
<ul>
  <li><strong>Comandes online: ON/OFF</strong> — l'interruptor d'emergència. En ON les comandes entren i s'accepten soles; en OFF la web deixa d'admetre-les i n'avisa el client. Fes-lo servir quan la cuina es desborda.</li>
  <li>Pestanya <strong>Pendents</strong> — el que espera una decisió: comandes pagades amb targeta el pagament de les quals encara no ha confirmat el banc, zones de repartiment sense verificar, o tot si tens l'interruptor en OFF. Cadascuna té <strong>Acceptar</strong> i <strong>Rebutjar</strong>. També s'hi llisten les comandes <strong>Programades per més tard avui</strong>.</li>
  <li>Pestanya <strong>En curs</strong> — les comandes ja acceptades. Una comanda programada per a un altre dia no surt fins una hora abans de la seva hora.</li>
  <li>En <strong>acceptar</strong> passa a cuina i, si és repartiment propi, s'assigna sola al repartidor amb menys repartiments (un empleat de Sala amb la casella «És repartidor»). Si la van programar per a d'aquí a més d'una hora, s'accepta però no es marxa fins que toqui.</li>
  <li><strong>Rebutjar</strong> i <strong>Cancel·lar comanda</strong> (una comanda ja acceptada) només els fa el propietari o un empleat amb edició. Després t'ofereix avisar el client per WhatsApp o email. Si estava pagada amb targeta, la venda s'anul·la i has de tornar els diners des del teu tauler de Stripe.</li>
  <li>Una comanda feta per la web és <strong>només de consulta</strong>: no se li poden afegir ni treure plats, perquè el total segueixi quadrant amb el que el client ja va pagar. Si vol alguna cosa més, que faci una altra comanda.</li>
  <li><strong>Control de repartiments</strong> — els repartiments en curs i els entregats avui. Cada comanda de repartiment propi té adreça amb botó a Google Maps, telèfon, import a cobrar i el <strong>canvi a preparar</strong> si paguen en efectiu, repartidor, <strong>Observacions de repartiment</strong> i els botons <strong>Ha sortit a repartir</strong> i <strong>Marcar entregat</strong>. Si un repartidor porta diverses comandes, s'agrupen en una ruta.</li>
  <li><strong>Calendari</strong> — les comandes programades per dia, setmana o mes.</li>
</ul>

<h4>Comandes des del QR de la taula</h4>
<p>Si actives la carta per QR (vegeu el capítol «Reserves i Comandes en Línia»), les comandes que fan els comensals des del seu mòbil surten a dalt del TPV a <strong>Comandes des del QR de la taula</strong>. Amb <strong>Acceptar i marxar</strong> passen a la comanda d'aquella taula i a cuina; <strong>Rebutjar</strong> la descarta (només propietari o edició). Si prefereixes que entrin directes a cuina, es canvia a El Meu Negoci.</p>

<h4>El que convé saber</h4>
<ul>
  <li><strong>Permisos:</strong> qualsevol empleat obre taules, apunta, marxa, cobra, tanca caixa i marca esgotats. <strong>Cancel·lar, anul·lar una venda, rebutjar comandes, treure de la llista d'espera</strong> és del propietari o d'un empleat amb permís d'edició. Reassignar el cambrer d'una taula i veure el marge és només del propietari. Si intentes alguna cosa sense permís, l'app t'ho explica.</li>
  <li><strong>Se sincronitza:</strong> diverses tauletes i mòbils veuen les mateixes taules en temps real. Si dos cobren la mateixa taula alhora, només queda una venda.</li>
  <li><strong>Sala i Cuina:</strong> el TPV només existeix a Sala. Cuina veu els plats a <strong>Comandes Cuina</strong>.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
  <li><strong>Un plat no apareix al TPV:</strong> comprova que la seva carta estigui activa a <strong>Cartes</strong> (segons horari) i que el plat no estigui marcat com a no disponible.</li>
  <li><strong>No puc afegir plats a una comanda:</strong> és una comanda de la web; es consulta, no es modifica.</li>
  <li><strong>No puc cancel·lar o anul·lar:</strong> cal ser propietari o tenir permís d'edició.</li>
  <li><strong>Una comanda online no entra:</strong> mira si <strong>Comandes online</strong> és en OFF o si hi ha comandes a <strong>Pendents</strong>.</li>
  <li><strong>No surt el botó Obrir calaix:</strong> cal activar el calaix a El Meu Negoci i fer servir una impressora Bluetooth.</li>
  <li><strong>No imprimeix:</strong> a El Meu Negoci revisa com imprimeix aquest aparell (Bluetooth o navegador); si el Bluetooth falla, l'app ho avisa i pots fer servir el navegador.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>The POS is the <strong>Dining Room service screen</strong>: from here you open tables, take orders, send dishes to the kitchen, take payment, close the till at the end of a shift and handle takeaway and delivery orders. Everything you charge here feeds Financial Management, Stock and the Dashboard automatically.</p>
<p>You'll find it under <strong>Dining Room → POS</strong>. It's designed for phones and tablets: whatever you use most is always one tap away.</p>

<h4>The main screen</h4>
<p>At the top there's a strip with today's figures: <strong>Sales today</strong> (tap it for the detail and to reprint receipts), <strong>Tickets</strong>, <strong>Avg ticket</strong> and <strong>In kitchen</strong> (tables with dishes pending). On a phone only <em>Sales today</em> and <em>In kitchen</em> show; the other two are inside the sales window.</p>
<p>Below, the service buttons:</p>
<ul>
  <li><strong>Menus</strong> — tells you how many menus and set menus are active right now. They switch on by themselves following the schedule you set in <strong>Menu Offering</strong> (in the Dining Room, <strong>Beverage Offering</strong>); from here you only check them. Red, with a warning, means no menu is active at the moment.</li>
  <li><strong>Waitlist</strong> — groups waiting for a table (see below).</li>
  <li><strong>Close register</strong> — the shift's cash count.</li>
  <li><strong>Voids</strong> — the log of voided dishes.</li>
  <li><strong>Mark as out</strong> — flags that a dish or drink has run out.</li>
  <li><strong>Closure history</strong> — previous till closings.</li>
  <li><strong>Open drawer</strong> — only shown if you have a cash drawer and a Bluetooth printer (set up in My Business).</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>On a phone the button names get shorter (<strong>Waitlist</strong>, <strong>Cash</strong>, <strong>Sold out</strong>, <strong>Closures</strong>, <strong>Drawer</strong>) so they fit, but they do the same thing.</div>

<h4>The tables</h4>
<p>The tables are the ones you created in <strong>My Business → Operations</strong>, grouped by zone (Indoor, Terrace, Bar…). Each table is a card with its own colour:</p>
<table>
  <thead><tr><th>Look</th><th>What it means</th></tr></thead>
  <tbody>
    <tr><td>White, dashed border</td><td><strong>Free</strong> (with the seats it has)</td></tr>
    <tr><td>Grey</td><td><strong>Taking order</strong> or <strong>Occupied</strong> (for example, drinks only)</td></tr>
    <tr><td>Amber</td><td><strong>Sent to kitchen</strong> or <strong>In kitchen</strong>: dishes on their way</td></tr>
    <tr><td>Green</td><td><strong>Served</strong>: all the food has been delivered, ready to charge</td></tr>
  </tbody>
</table>
<p>An occupied card shows how long it's been open (flagged at one hour and more strongly at two), the total, the guests, the waiter and small alerts: new order from the customer, kitchen incident, QR order, <em>cold table</em> (served a while ago and not charged: usually forgotten) and <em>paid online</em>. A free table with a reservation in the next hour shows the time and name, so you don't seat someone there just before the booked party arrives.</p>
<p>To move around quickly:</p>
<ul>
  <li><strong>All / Free / Occupied / Served / My tables</strong> — filters that tell you how many there are of each kind. <strong>My tables</strong> shows only the ones you're looking after.</li>
  <li>The zone buttons filter by zone; tapping the active zone removes the filter (<strong>All zones</strong>).</li>
  <li><strong>Go to table…</strong> — type a name or number and only the matches remain.</li>
  <li><strong>Chaos mode</strong> — leaves a single list of occupied tables, the one that's waited longest first. Handy at peak time. Press it again to leave.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>If the business only offers Takeaway or Delivery (<strong>My Business → Service types</strong>), the tables section doesn't appear.</div>

<h4>Opening a table and taking the order, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Tap a free table. In <strong>Open table</strong> choose whether the customer is a <strong>Walk-in customer</strong> (enter how many people and, if you like, their name; if it matches a customer in your database it links to their record and their allergies show) or <strong>Has a reservation</strong> (pick today's reservation and it fills in by itself; the reservation changes to <em>Arrived</em>). If there's an upcoming reservation at that table, the app warns you before you seat someone.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">The table screen opens. At the top you have <strong>Change table</strong>, the table name and, if you haven't ordered anything yet, <strong>Release table</strong> (to undo a table opened by mistake).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pick the menu in the tabs at the top (drinks come first, so nobody forgets to order them). Open a folder and tap dishes: each tap adds one unit. Each dish tells you <strong>how many the table already has (×2)</strong> and has a <strong>−</strong> to remove one. You can also type in the <strong>Find a dish or drink…</strong> search to avoid opening folder after folder.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">If the dish has extras or options, a window (<strong>Extras and options</strong>) opens to tick them and add a note. If it's a set menu, the menu's tab has a button to add it and pick its dishes.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">The <strong>order</strong> builds up alongside (on PC and tablet) with − / quantity / + on each line. On a phone, menu and order alternate full screen: there's an <strong>Order</strong> bar at the bottom with the total, and a button above the order to go back to the menu.</div></div>
<p>Each order line has three small buttons: <strong>Notes</strong> (the kitchen sees them highlighted), <strong>Send this dish to the kitchen</strong> and <strong>Delete</strong>. In <strong>Notes</strong> you can also change the <em>service course</em> (starters, mains, desserts…) and tap a <strong>quick note</strong> (No onion, Gluten free, Lactose free, Rare, Medium, Well done, No salt, Not spicy, To share, In a hurry): one tap adds it and another removes it.</p>
<p>Under the table name there are two tappable labels: the <strong>waiter</strong> (assigned automatically to whoever opens the table; changing it later takes the owner) and <strong>Allergens</strong>, where you note what the customer told you and it appears on the kitchen ticket. The <strong>i</strong> on each dish shows its ingredients and allergens.</p>

<h4>Sending to the kitchen and following service</h4>
<ul>
  <li>The first thing you add to a new table (the first section) <strong>is sent automatically</strong>. <strong>Drinks</strong> don't go through the kitchen: they go straight to the bar.</li>
  <li>Each course (Starters, Mains, Desserts…) has its own <strong>Send to kitchen</strong> button to fire it when the customer is ready.</li>
  <li>You fire <strong>by group</strong> (the button in each course header) or <strong>dish by dish</strong> (the line's ⋯). There is no general «Send full ticket» any more: each thing goes out when it should.</li>
  <li>Each course's status updates by itself with what the Kitchen does: <strong>Fired → Preparing → Ready to pick up → Picked up</strong>. When something is ready you see <strong>Ready at the pass</strong>; the Kitchen marks «Picked up» when you take it away.</li>
  <li>If a table orders again about 8 minutes after the kitchen already had dishes going, it comes in as <strong>a new ticket</strong> on the Kitchen screen.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>You can choose whether tickets show on the Kitchen screen or get printed in <strong>My Business → Kitchen and floor tickets</strong>.</div>

<h4>Changing tables and merging tables</h4>
<p><strong>Change table</strong> opens a window with two options: <strong>Move order</strong> to a free table, or <strong>Merge tables</strong> with another occupied table (the dishes move over and this one becomes free; it shows as "Table 3 + Table 4"). You can't merge tables that already have paid parts of a split bill.</p>

<h4>Taking payment</h4>
<p>Press <strong>Charge</strong> at the foot of the table (it's highlighted when everything is served, but you can charge at any time). The <strong>Charge</strong> window opens with three tabs:</p>
<ul>
  <li><strong>Full bill</strong> — pick the payment method: <strong>Cash</strong> (type the <em>Amount given</em> and see the <em>Change</em>), <strong>Card</strong> or <strong>Mixed payment (cash + card)</strong>. Before that you can enter a <strong>Tip</strong> and a <strong>Discount (%)</strong>. Finish with <strong>Confirm charge</strong>.</li>
  <li><strong>Split equally</strong> — say how many people share it (by default, the table's guests), press <strong>Split bill</strong> and take each share separately (each in cash or card).</li>
  <li><strong>By diner (dishes)</strong> — assign each unit to a diner (3 salads can go to different people), press <strong>Calculate split</strong> and charge each their own. Discount and tip are shared equally.</li>
</ul>
<p>In both splits, once every share is paid <strong>Finalize charge</strong> appears; <strong>Cancel split</strong> only works while no share has been paid.</p>
<p><strong>Discount:</strong> type the percentage and press <strong>Apply</strong>; the app asks who authorises it and the <strong>reason</strong>, and it's recorded for the till closing. The total doesn't change until you press Apply. If there's an active promotion today on a dish (you created it in Promotion), its discount is already applied when you add it.</p>
<p>If the customer already paid part from their phone (QR menu) or left a reservation deposit, it's subtracted from what's left to charge and shown clearly in the breakdown. If nothing is left to charge, the button reads <strong>Close order (already paid)</strong>.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The <strong>gift voucher is not yet accepted as a payment method</strong> at checkout. If a customer brings one, redeem it by hand from <strong>Dining Room → Customers</strong> and charge the rest in cash or card.</div>

<h4>After charging: receipt and invoice</h4>
<p>When the charge is registered, <strong>Charge registered</strong> appears with what you can do with the receipt: <strong>Don't print</strong>, <strong>Send by email</strong>, <strong>Invoice</strong>, <strong>Print receipt</strong>, <strong>Receipt</strong> (to this device's thermal printer) and <strong>Void sale</strong>.</p>
<ul>
  <li>Every receipt is a <strong>simplified invoice with a sequential number</strong>. Each device has its own series, so two tablets working offline never repeat a number.</li>
  <li><strong>Invoice</strong> issues the <strong>full invoice</strong> for a company or freelancer: it asks for the name or company name, tax ID and address, and replaces the receipt already handed over. It's remembered on their customer record for next time.</li>
  <li>To reprint or get an invoice later: <strong>Sales today</strong> (the <strong>Today's sales</strong> window), with the printer, invoice or thermal icon on each sale. The owner also sees each sale's <strong>Margin</strong>.</li>
  <li>Printing can go over Bluetooth (paired thermal printer) or through the browser/AirPrint/system printer; it's chosen per device in My Business.</li>
  <li><strong>Paying with a gift voucher</strong>: in the payment window, <strong>Full bill</strong> tab, type the code in <strong>Gift voucher (code)</strong> and press <strong>Apply</strong>. The voucher amount is taken off the bill (up to what is left to pay) and the rest is paid in cash or by card. If the voucher is larger than the bill, it keeps its balance. Only amount vouchers that are still valid work; an expired, voided or experience voucher is rejected. If you void the sale, the voucher gets its balance back. In the cash-up the voucher does not count as cash or card.</li>
  <li><strong>The bill before charging</strong>: in the <strong>Order</strong> tab, the printer button (<strong>Bill</strong>) prints the bill for the customer, with what they had and the total. It says “This bill is not an invoice”: it has no number and does not close the table. The sales ticket comes out on this device's roll printer (58 or 80 mm), without opening any window.</li>
  <li><strong>With “Print” switched on in My Business</strong>, tickets also print when you don't press “Fire”: the table's first course, takeaway, drinks and web orders you accept. It waits a few seconds so that <strong>one single ticket</strong> comes out with everything that was added together. If you cancel something already fired, the kitchen or bar gets a <strong>CANCELLED</strong> ticket.</li>
</ul>

<h4>Voids</h4>
<ul>
  <li><strong>Removing a dish that hasn't been sent yet</strong> is free.</li>
  <li><strong>Removing or reducing a dish already sent</strong> (even if served) opens <strong>Void dish</strong>: pick the reason (order-taking error, customer changed their mind, kitchen error, out of stock or other) and it goes into <strong>Voids</strong> with date, table, dish and who did it. If you're in as the owner without identifying as an employee, it lets you pick the person responsible. Limited portions go back to stock.</li>
  <li><strong>Voiding an already-charged sale</strong> (duplicate charge, wrong table): the <strong>Void sale</strong> button is in the <strong>Charge registered</strong> window, right after charging. Only the <strong>owner or an employee with edit permission</strong> can do it; it asks for confirmation (or the business PIN if you're not the owner), returns the stock and <strong>doesn't delete the sale</strong>: it issues a <strong>corrective invoice</strong> with its own number and leaves a record. It can't be done in a month that's already closed.</li>
</ul>

<h4>Till closing and cash count</h4>
<p>At the end of the shift or the day, press <strong>Close register</strong>. The <strong>Cash closure / Till count</strong> window shows you:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Sales since the last closing, by payment method (Cash, Card, Other), plus the period's <strong>discounts</strong> and <strong>voids</strong>, with who did them.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">If you work with Glovo, Uber Eats or similar, enter the total each platform gave you if you didn't register their orders one by one: it's added to turnover and their commission is deducted.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Enter the <strong>Initial cash fund</strong> (if any) and count the <strong>Cash counted in till</strong> by entering how many coins and bills of each value there are: the total works itself out.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">The app calculates the <strong>expected cash</strong> and the <strong>difference</strong> (over or short). Add a note if you like and press <strong>Confirm closure</strong>: the summary is printed.</div></div>
<p>If something doesn't add up (any discrepancy, many discounts from one person or many voids), the app flags it when you close. You can do several closings a day. In <strong>Closure history</strong> you reprint any closing and, with the money icon, see the <strong>tip split</strong> among those who were clocked in during that shift. A sale that arrives late because of syncing goes into the next closing; it's never lost.</p>

<h4>Waitlist</h4>
<p>It's the queue of groups without a reservation. In <strong>Waitlist</strong> you note name, people, phone and notes; you see how many minutes they've waited. The chair icon lets you pick a <strong>free table</strong> and it opens already with their name and party size (it warns you if the table is small); the phone icon calls them; and the cross removes a group that has left (owner or employee with edit permission only).</p>

<h4>Mark as out</h4>
<p><strong>Mark as out</strong> takes you through menus and set menus → categories → dishes, with an <strong>Available / Unavailable</strong> switch on each. A sold-out dish disappears instantly from the POS and from the ordering website. A set menu can run out entirely or just one option. Any employee can do it, with no edit permission needed.</p>

<h4>Takeaway and delivery</h4>
<p>These orders <strong>aren't entered by hand</strong>: the customer places them on your website (see the "Online Reservations and Ordering" chapter). They appear in the <strong>Takeaway / Delivery</strong> section, below the tables, as one card per order: type (<em>For pickup</em> or <em>Delivery</em>), time, customer, address, total and whether it's paid.</p>
<ul>
  <li><strong>Online orders: ON/OFF</strong> — the emergency switch. ON: orders come in and are accepted by themselves; OFF: the website stops accepting them and tells the customer. Use it when the kitchen is swamped.</li>
  <li><strong>Pending</strong> tab — what is waiting for a decision: card-paid orders whose payment the bank hasn't confirmed yet, delivery zones that couldn't be verified, or everything if the switch is OFF. Each has <strong>Accept</strong> and <strong>Reject</strong>. It also lists the orders <strong>Scheduled for later today</strong>.</li>
  <li><strong>Active</strong> tab — orders already accepted. An order scheduled for another day doesn't show until an hour before its time.</li>
  <li>On <strong>accepting</strong> it goes to the kitchen and, for own delivery, it's assigned automatically to the rider with the fewest deliveries (a Floor employee with the "Is a delivery rider" box ticked). If it was scheduled for more than an hour away, it's accepted but not sent until it's time.</li>
  <li><strong>Reject</strong> and <strong>Cancel order</strong> (an order already accepted) can only be done by the owner or an employee with edit permission. Afterwards it offers to notify the customer by WhatsApp or email. If it was paid by card, the sale is voided and you must refund the money from your Stripe dashboard.</li>
  <li>An order placed through the website is <strong>view-only</strong>: dishes can't be added or removed, so the total keeps matching what the customer already paid. If they want something more, they place another order.</li>
  <li><strong>Delivery control</strong> — deliveries in progress and those delivered today. Each own-delivery order has the address with a Google Maps button, phone, amount to collect and the <strong>change to prepare</strong> if they pay in cash, rider, <strong>Delivery notes</strong> and the <strong>Out for delivery</strong> and <strong>Mark delivered</strong> buttons. If a rider has several orders, they're grouped into a route.</li>
  <li><strong>Calendar</strong> — scheduled orders by day, week or month.</li>
</ul>

<h4>Orders from the table QR</h4>
<p>If you turn on the QR menu (see the "Online Reservations and Ordering" chapter), orders diners place from their phone appear at the top of the POS under <strong>Orders from table QR codes</strong>. <strong>Accept and send</strong> moves them onto that table's order and to the kitchen; <strong>Reject</strong> discards them (owner or edit permission only). If you'd rather they go straight to the kitchen, change it in My Business.</p>

<h4>Good to know</h4>
<ul>
  <li><strong>Permissions:</strong> any employee opens tables, takes orders, fires, charges, closes the till and marks items out. <strong>Cancelling, voiding a sale, rejecting orders and removing from the waitlist</strong> belongs to the owner or an employee with edit permission. Reassigning a table's waiter and seeing margin is owner-only. If you try something without permission, the app explains why.</li>
  <li><strong>It syncs:</strong> several tablets and phones see the same tables in real time. If two people charge the same table at once, only one sale remains.</li>
  <li><strong>Dining Room and Kitchen:</strong> the POS only exists in the Dining Room. The Kitchen sees dishes in <strong>Kitchen Orders</strong>.</li>
</ul>

<h4>If something isn't working</h4>
<ul>
  <li><strong>A dish doesn't show in the POS:</strong> check its menu is active under <strong>Menus</strong> (by schedule) and the dish isn't marked unavailable.</li>
  <li><strong>I can't add dishes to an order:</strong> it's a website order; it can be viewed, not changed.</li>
  <li><strong>I can't cancel or void:</strong> you need to be the owner or have edit permission.</li>
  <li><strong>An online order doesn't come in:</strong> check whether <strong>Online orders</strong> is OFF or whether there are orders under <strong>Pending</strong>.</li>
  <li><strong>The Open drawer button isn't there:</strong> turn the drawer on in My Business and use a Bluetooth printer.</li>
  <li><strong>It doesn't print:</strong> in My Business check how this device prints (Bluetooth or browser); if Bluetooth fails, the app says so and you can use the browser.</li>
</ul>`}
  },
  {id:'reservas', area:'sala',
    title:{es:`<i class="ti ti-calendar-event"></i> Reservas`, ca:`<i class="ti ti-calendar-event"></i> Reserves`, en:`<i class="ti ti-calendar-event"></i> Reservations`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Reservas es tu libro de reservas digital: ves quién viene, a qué hora y en qué mesa, controlas que no te pases de aforo y atiendes las reservas que los clientes hacen solos desde tu web. Lo encuentras en <strong>Sala → Reservas</strong> y está enlazado con el TPV: cuando sientas a un cliente con reserva, la reserva se marca sola como llegada.</p>

<h4>La pantalla del día</h4>
<p>Arriba hay un buscador, <strong>Buscar cliente (todas las fechas)…</strong>: encuentra por nombre, teléfono o por el <strong>número que le dio la web</strong> al cliente (por ejemplo, el que te dicta por teléfono). Debajo, las pestañas <strong>Día</strong>, <strong>Semana</strong> y <strong>Mes</strong>.</p>
<p>En <strong>Día</strong> ves cuatro cifras: <strong>Reservas</strong> (con cuántas están sin mesa), <strong>Comensales</strong>, <strong>Han llegado</strong> (por ejemplo, 4 / 9) y <strong>Por confirmar</strong>. Con las flechas pasas de día en día, tocando la fecha eliges cualquier día y <strong>Hoy</strong> te devuelve al presente. A la derecha: <strong>Imprimir el día</strong> (una hoja de sala con hora, cliente, personas, mesa, teléfono, notas y casilla de llegada) y <strong>Nueva Reserva</strong>.</p>
<p>Si tienes más de una reserva ese día, salen filtros con su cuenta: <strong>Todas</strong>, <strong>Por confirmar</strong>, <strong>Confirmadas</strong>, <strong>Han llegado</strong>, <strong>Lista de espera</strong> y <strong>Canceladas / no-show</strong>.</p>

<h4>Cada reserva, de un vistazo</h4>
<p>Cada fila enseña la hora, el nombre, el estado y unas etiquetas: personas, mesa (o <em>Sin asignar</em> en ámbar), el número de la web, la señal (pagada o pendiente) y las <strong>alergias</strong> del cliente si las tiene guardadas. Si hay teléfono móvil, un botón de WhatsApp abre el chat.</p>
<p>A la derecha está <strong>la acción que toca</strong>, a un toque, y el resto en el menú <strong>⋯</strong>:</p>
<table>
  <thead><tr><th>Si la reserva está…</th><th>El botón principal es…</th></tr></thead>
  <tbody>
    <tr><td>Pendiente</td><td><strong>Confirmar</strong></td></tr>
    <tr><td>En lista de espera</td><td><strong>Confirmar igualmente</strong></td></tr>
    <tr><td>Confirmada</td><td><strong>Ha llegado</strong></td></tr>
    <tr><td>No presentado</td><td><strong>Deshacer no presentado</strong></td></tr>
  </tbody>
</table>
<p>El menú <strong>⋯</strong> tiene <strong>Editar</strong>, <strong>Enviar recordatorio</strong> (si es confirmada y hay teléfono), <strong>Marcar señal como recibida</strong> (si pide señal y aún no está), <strong>No presentado</strong> y <strong>Cancelar</strong>.</p>

<h4>Crear una reserva a mano, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Nueva Reserva</strong> (en el día, la semana o el mes; con el <strong>+</strong> de un día de la semana, ya con esa fecha).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escribe el cliente en el buscador para elegir uno de tu base de <strong>Clientes</strong> (si ha fallado antes, la app te avisa de cuántos no-shows lleva). Si no tiene ficha, escribe solo el nombre.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige <strong>fecha</strong>, <strong>hora</strong> y <strong>personas</strong>. Las horas son tramos de media hora dentro de tu <strong>Horario de apertura</strong> y cada una indica cuánto aforo lleva ya ese turno. Si el día está cerrado, lo dice.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Elige la <strong>mesa</strong> (obligatoria si tienes mesas dadas de alta). Solo salen las libres a esa hora. Si la mesa tiene menos plazas que el grupo, te avisa y decides tú.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Añade <strong>notas</strong> (alergias, cumpleaños, trona…) y <strong>Guarda</strong>. Si ya hay una reserva casi igual para ese cliente, te pregunta antes de duplicarla.</div></div>
<p>Una mesa <strong>no se puede reservar dos veces</strong> dentro de su duración de mesa (90 minutos por defecto). Se cambia en <strong>Mi Negocio → Operativa → Duración de mesa (min)</strong>.</p>

<h4>Aforo por turno</h4>
<p>Si pones el <strong>Aforo</strong> en <strong>Mi Negocio → Operativa</strong> (máximo de comensales por servicio), el día muestra una barra por turno (<strong>Turno 1</strong>, <strong>Turno 2</strong>…, según tu horario) con cuántas personas llevas frente al máximo. La barra cambia de color cuando el turno está casi lleno (80 %) y cuando se completa.</p>
<p>Si una reserva haría pasarte, sale <strong>Turno completo</strong> con los números exactos y tres opciones: <strong>Cancelar</strong>, <strong>Poner en lista de espera</strong> (no cuenta para el aforo hasta que la confirmes) o <strong>Confirmar igualmente</strong> (por si puedes habilitar mesas extra).</p>

<h4>Reservas que llegan desde tu web</h4>
<p>El cliente reserva solo en tu página pública. La app intenta <strong>confirmarla sin que hagas nada</strong>: si hay una mesa libre con plazas suficientes a esa hora, cabe en el aforo, no piden señal pendiente y el grupo no supera el tamaño que reservaste para gestión manual (<strong>Mi Negocio → Operativa → Reservas de grupo por teléfono o email</strong>), queda <strong>Confirmada</strong> con su mesa. Si no, aparece arriba en <strong>Solicitudes online pendientes</strong>, con la hora, las personas, el teléfono, cuánto lleva esperando y si el turno se pasaría.</p>
<ul>
  <li><strong>Confirmar</strong> — si no tiene mesa, se abre la reserva para que elijas una (confirmar exige mesa).</li>
  <li><strong>Rechazar</strong> — la cancela; solo propietario o empleado con edición.</li>
  <li><strong>Señal recibida</strong> — si cobras señal fuera de la app y ya te llegó.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Las mesas sin plazas indicadas en Mi Negocio no se pueden ofrecer a la web: esas reservas no se confirman solas. Pon las plazas de todas tus mesas.</div>
<p>Con <strong>Pedir señal para confirmar reservas</strong> activado (necesita el pago con Stripe conectado), el cliente paga la señal con tarjeta al reservar y solo entonces se confirma. Al cancelar una reserva con la señal ya cobrada, la app te recuerda <strong>devolverla</strong> desde tu panel de Stripe.</p>

<h4>Llegada y no presentados</h4>
<ul>
  <li><strong>Ha llegado</strong> abre una ventana donde confirmas la mesa en la que se sientan (por si cambiaste de sitio). También se marca sola cuando abres la mesa en el TPV con <strong>Tiene reserva</strong>; la señal pagada se descuenta de la cuenta.</li>
  <li><strong>No presentado</strong> (en el ⋯) pide confirmación y le suma un aviso al cliente, que verás al reservar de nuevo. <strong>Deshacer no presentado</strong> lo revierte.</li>
</ul>

<h4>Avisar al cliente</h4>
<ul>
  <li><strong>Recordatorios pendientes de mañana</strong>: arriba salen las reservas de mañana a las que aún no has avisado. <strong>Enviar recordatorio</strong> te deja el texto escrito y editable, con botón de <strong>WhatsApp / SMS</strong> y de <strong>Email</strong>. La app no envía nada sola: el mensaje sale de tu WhatsApp o tu correo. WhatsApp solo abre con móviles; un fijo avisa.</li>
  <li><strong>Cancelar</strong> (pide confirmación) o <strong>cambiar fecha u hora</strong> te ofrece <strong>Avisar al cliente</strong> con el mensaje listo.</li>
  <li>El cliente puede <strong>editar la hora o cancelar</strong> solo desde su enlace de seguimiento. Los pedidos para llevar no se editan ahí.</li>
</ul>

<h4>Semana y Mes</h4>
<ul>
  <li><strong>Semana</strong> — siete columnas con las reservas de cada día en tarjetitas (hora, nombre, personas), totales arriba (<strong>Reservas de la semana</strong>, <strong>Comensales</strong>, <strong>Día más cargado</strong>), un <strong>+</strong> para crear en ese día y, al tocar el día, saltas a su vista Día.</li>
  <li><strong>Mes</strong> — calendario con el número de reservas y comensales por día. El selector de arriba (‹ mes año ›) te deja ir de mes en mes o abrir el año y ver cuántas reservas tiene cada mes.</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
  <li><strong>Permisos:</strong> cualquier empleado crea, confirma y marca llegadas. <strong>Cancelar</strong> y <strong>Rechazar</strong> son del propietario o de un empleado con permiso de edición.</li>
  <li>Una reserva cancelada <strong>no desaparece</strong>: queda registrada y libera la mesa y el aforo.</li>
  <li>Las reservas de mañana y de la semana también salen en el <strong>Panel de Control</strong>.</li>
  <li>Todo se sincroniza entre dispositivos y con la web pública.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
  <li><strong>No me deja confirmar:</strong> falta asignar mesa. Ábrela con <strong>Editar</strong> y elige una.</li>
  <li><strong>La mesa que busco no sale:</strong> está reservada o abierta en el TPV dentro de la duración de mesa.</li>
  <li><strong>No veo el botón Cancelar:</strong> hace falta ser propietario o tener permiso de edición.</li>
  <li><strong>El turno sale lleno y el cliente no puede reservar en la web:</strong> es el aforo; sube el aforo o confirma a mano.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Reserves és el teu llibre de reserves digital: veus qui ve, a quina hora i a quina taula, controles que no et passis d'aforament i ateneu les reserves que els clients fan sols des de la teva web. El trobaràs a <strong>Sala → Reserves</strong> i està enllaçat amb el TPV: quan asseguis un client amb reserva, la reserva es marca sola com a arribada.</p>

<h4>La pantalla del dia</h4>
<p>A dalt hi ha un cercador, <strong>Cerca client (totes les dates)…</strong>: troba per nom, telèfon o pel <strong>número que la web va donar</strong> al client (per exemple, el que et dicta per telèfon). A sota, les pestanyes <strong>Dia</strong>, <strong>Setmana</strong> i <strong>Mes</strong>.</p>
<p>A <strong>Dia</strong> veus quatre xifres: <strong>Reserves</strong> (amb quantes són sense taula), <strong>Comensals</strong>, <strong>Han arribat</strong> (per exemple, 4 / 9) i <strong>Per confirmar</strong>. Amb les fletxes passes de dia en dia, tocant la data tries qualsevol dia i <strong>Avui</strong> et torna al present. A la dreta: <strong>Imprimir el dia</strong> (un full de sala amb hora, client, persones, taula, telèfon, notes i casella d'arribada) i <strong>Nova Reserva</strong>.</p>
<p>Si tens més d'una reserva aquell dia, surten filtres amb el seu compte: <strong>Totes</strong>, <strong>Per confirmar</strong>, <strong>Confirmades</strong>, <strong>Han arribat</strong>, <strong>Llista d'espera</strong> i <strong>Cancel·lades / no-show</strong>.</p>

<h4>Cada reserva, d'un cop d'ull</h4>
<p>Cada fila mostra l'hora, el nom, l'estat i unes etiquetes: persones, taula (o <em>Sense assignar</em> en ambre), el número de la web, la senyal (pagada o pendent) i les <strong>al·lèrgies</strong> del client si les té desades. Si hi ha telèfon mòbil, un botó de WhatsApp obre el xat.</p>
<p>A la dreta hi ha <strong>l'acció que toca</strong>, a un toc, i la resta al menú <strong>⋯</strong>:</p>
<table>
  <thead><tr><th>Si la reserva està…</th><th>El botó principal és…</th></tr></thead>
  <tbody>
    <tr><td>Pendent</td><td><strong>Confirmar</strong></td></tr>
    <tr><td>En llista d'espera</td><td><strong>Confirmar igualment</strong></td></tr>
    <tr><td>Confirmada</td><td><strong>Ha arribat</strong></td></tr>
    <tr><td>No presentat</td><td><strong>Desfer no presentat</strong></td></tr>
  </tbody>
</table>
<p>El menú <strong>⋯</strong> té <strong>Editar</strong>, <strong>Enviar recordatori</strong> (si és confirmada i hi ha telèfon), <strong>Marcar senyal com a rebuda</strong> (si demana senyal i encara no hi és), <strong>No presentat</strong> i <strong>Cancel·lar</strong>.</p>

<h4>Crear una reserva a mà, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Nova Reserva</strong> (al dia, la setmana o el mes; amb el <strong>+</strong> d'un dia de la setmana, ja amb aquella data).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escriu el client al cercador per triar-ne un de la teva base de <strong>Clients</strong> (si ha fallat abans, l'app t'avisa de quants no-shows porta). Si no té fitxa, escriu només el nom.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria <strong>data</strong>, <strong>hora</strong> i <strong>persones</strong>. Les hores són trams de mitja hora dins del teu <strong>Horari d'obertura</strong> i cadascuna indica quant d'aforament porta ja aquell torn. Si el dia és tancat, ho diu.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Tria la <strong>taula</strong> (obligatòria si tens taules donades d'alta). Només surten les lliures a aquella hora. Si la taula té menys places que el grup, t'avisa i decideixes tu.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Afegeix <strong>notes</strong> (al·lèrgies, aniversari, trona…) i <strong>Desa</strong>. Si ja hi ha una reserva gairebé igual per a aquell client, et pregunta abans de duplicar-la.</div></div>
<p>Una taula <strong>no es pot reservar dues vegades</strong> dins de la seva durada de taula (90 minuts per defecte). Es canvia a <strong>El Meu Negoci → Operativa → Durada de taula (min)</strong>.</p>

<h4>Aforament per torn</h4>
<p>Si poses l'<strong>Aforament</strong> a <strong>El Meu Negoci → Operativa</strong> (màxim de comensals per servei), el dia mostra una barra per torn (<strong>Torn 1</strong>, <strong>Torn 2</strong>…, segons el teu horari) amb quantes persones portes enfront del màxim. La barra canvia de color quan el torn és gairebé ple (80 %) i quan es completa.</p>
<p>Si una reserva et faria passar, surt <strong>Torn complet</strong> amb els números exactes i tres opcions: <strong>Cancel·lar</strong>, <strong>Posar en llista d'espera</strong> (no compta per a l'aforament fins que la confirmis) o <strong>Confirmar igualment</strong> (per si pots habilitar taules extra).</p>

<h4>Reserves que arriben des de la teva web</h4>
<p>El client reserva sol a la teva pàgina pública. L'app intenta <strong>confirmar-la sense que facis res</strong>: si hi ha una taula lliure amb places suficients a aquella hora, hi cap a l'aforament, no hi ha senyal pendent i el grup no supera la mida que vas reservar per a gestió manual (<strong>El Meu Negoci → Operativa → Reserves de grup per telèfon o email</strong>), queda <strong>Confirmada</strong> amb la seva taula. Si no, apareix a dalt a <strong>Sol·licituds en línia pendents</strong>, amb l'hora, les persones, el telèfon, quant fa que espera i si el torn se'n passaria.</p>
<ul>
  <li><strong>Confirmar</strong> — si no té taula, s'obre la reserva perquè en triïs una (confirmar exigeix taula).</li>
  <li><strong>Rebutjar</strong> — la cancel·la; només propietari o empleat amb edició.</li>
  <li><strong>Senyal rebuda</strong> — si cobres senyal fora de l'app i ja t'ha arribat.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Les taules sense places indicades a El Meu Negoci no es poden oferir a la web: aquestes reserves no es confirmen soles. Posa les places de totes les taules.</div>
<p>Amb <strong>Demanar senyal per confirmar reserves</strong> activat (necessita el pagament amb Stripe connectat), el client paga la senyal amb targeta en reservar i només llavors es confirma. En cancel·lar una reserva amb la senyal ja cobrada, l'app et recorda <strong>tornar-la</strong> des del teu tauler de Stripe.</p>

<h4>Arribada i no presentats</h4>
<ul>
  <li><strong>Ha arribat</strong> obre una finestra on confirmes la taula on s'asseuen (per si has canviat de lloc). També es marca sola quan obres la taula al TPV amb <strong>Té reserva</strong>; la senyal pagada es descompta del compte.</li>
  <li><strong>No presentat</strong> (al ⋯) demana confirmació i suma un avís al client, que veuràs quan torni a reservar. <strong>Desfer no presentat</strong> ho reverteix.</li>
</ul>

<h4>Avisar el client</h4>
<ul>
  <li><strong>Recordatoris pendents de demà</strong>: a dalt surten les reserves de demà a les quals encara no has avisat. <strong>Enviar recordatori</strong> et deixa el text escrit i editable, amb botó de <strong>WhatsApp / SMS</strong> i d'<strong>Email</strong>. L'app no envia res sola: el missatge surt del teu WhatsApp o del teu correu. WhatsApp només s'obre amb mòbils; un fix avisa.</li>
  <li><strong>Cancel·lar</strong> (demana confirmació) o <strong>canviar data o hora</strong> t'ofereix <strong>Avisar el client</strong> amb el missatge a punt.</li>
  <li>El client pot <strong>editar l'hora o cancel·lar</strong> sol des del seu enllaç de seguiment. Les comandes per emportar no s'editen allà.</li>
</ul>

<h4>Setmana i Mes</h4>
<ul>
  <li><strong>Setmana</strong> — set columnes amb les reserves de cada dia en targetes petites (hora, nom, persones), totals a dalt (<strong>Reserves de la setmana</strong>, <strong>Comensals</strong>, <strong>Dia més carregat</strong>), un <strong>+</strong> per crear en aquell dia i, en tocar el dia, saltes a la seva vista Dia.</li>
  <li><strong>Mes</strong> — calendari amb el nombre de reserves i comensals per dia. El selector de dalt (‹ mes any ›) et deixa anar de mes en mes o obrir l'any i veure quantes reserves té cada mes.</li>
</ul>

<h4>El que convé saber</h4>
<ul>
  <li><strong>Permisos:</strong> qualsevol empleat crea, confirma i marca arribades. <strong>Cancel·lar</strong> i <strong>Rebutjar</strong> són del propietari o d'un empleat amb permís d'edició.</li>
  <li>Una reserva cancel·lada <strong>no desapareix</strong>: queda registrada i allibera la taula i l'aforament.</li>
  <li>Les reserves de demà i de la setmana també surten al <strong>Tauler de Control</strong>.</li>
  <li>Tot se sincronitza entre dispositius i amb la web pública.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
  <li><strong>No em deixa confirmar:</strong> falta assignar taula. Obre-la amb <strong>Editar</strong> i tria'n una.</li>
  <li><strong>La taula que busco no surt:</strong> està reservada o oberta al TPV dins de la durada de taula.</li>
  <li><strong>No veig el botó Cancel·lar:</strong> cal ser propietari o tenir permís d'edició.</li>
  <li><strong>El torn surt ple i el client no pot reservar a la web:</strong> és l'aforament; puja'l o confirma a mà.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>Reservations is your digital booking book: you see who's coming, at what time and at which table, you make sure you don't go over capacity, and you handle the bookings customers make by themselves from your website. You'll find it under <strong>Dining Room → Reservations</strong>, and it's linked to the POS: when you seat a customer with a booking, the booking is marked as arrived automatically.</p>

<h4>The day screen</h4>
<p>At the top there's a search box, <strong>Search client (all dates)…</strong>: it finds by name, phone or by the <strong>number the website gave</strong> the customer (for instance, the one they read out over the phone). Below, the tabs <strong>Day</strong>, <strong>Week</strong> and <strong>Month</strong>.</p>
<p>In <strong>Day</strong> you see four figures: <strong>Bookings</strong> (with how many have no table), <strong>Guests</strong>, <strong>Arrived</strong> (for example 4 / 9) and <strong>To confirm</strong>. The arrows move day by day, tapping the date lets you pick any day and <strong>Today</strong> brings you back. On the right: <strong>Print the day</strong> (a floor sheet with time, customer, people, table, phone, notes and an arrival tick-box) and <strong>New Reservation</strong>.</p>
<p>If you have more than one booking that day, filters with counts appear: <strong>All</strong>, <strong>To confirm</strong>, <strong>Confirmed</strong>, <strong>Arrived</strong>, <strong>Waitlist</strong> and <strong>Cancelled / no-show</strong>.</p>

<h4>Each booking at a glance</h4>
<p>Each row shows the time, name, status and some tags: people, table (or <em>Not assigned</em> in amber), the website number, the deposit (paid or pending) and the customer's <strong>allergies</strong> if saved. If there's a mobile number, a WhatsApp button opens the chat.</p>
<p>On the right is <strong>the action that's due</strong>, one tap away, and the rest in the <strong>⋯</strong> menu:</p>
<table>
  <thead><tr><th>If the booking is…</th><th>The main button is…</th></tr></thead>
  <tbody>
    <tr><td>Pending</td><td><strong>Confirm</strong></td></tr>
    <tr><td>On the waitlist</td><td><strong>Confirm anyway</strong></td></tr>
    <tr><td>Confirmed</td><td><strong>Arrived</strong></td></tr>
    <tr><td>No-show</td><td><strong>Undo no-show</strong></td></tr>
  </tbody>
</table>
<p>The <strong>⋯</strong> menu has <strong>Edit</strong>, <strong>Send reminder</strong> (if confirmed and there's a phone), <strong>Mark deposit as received</strong> (if a deposit is required and not yet in), <strong>No-show</strong> and <strong>Cancel</strong>.</p>

<h4>Creating a booking by hand, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>New Reservation</strong> (in the day, week or month; with the <strong>+</strong> on a weekday, already set to that date).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Type the customer in the search box to pick one from your <strong>Customers</strong> database (if they've failed before, the app tells you how many no-shows they have). If they have no record, just type the name.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Choose <strong>date</strong>, <strong>time</strong> and <strong>people</strong>. Times are half-hour slots within your <strong>Opening hours</strong> and each shows how much capacity that shift already has. If the day is closed, it says so.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Choose the <strong>table</strong> (required if you have tables set up). Only tables free at that time are listed. If the table has fewer seats than the party, it warns you and you decide.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Add <strong>notes</strong> (allergies, birthday, high chair…) and <strong>Save</strong>. If there's already an almost identical booking for that customer, it asks before duplicating it.</div></div>
<p>A table <strong>can't be booked twice</strong> within its table duration (90 minutes by default). Change it in <strong>My Business → Operations → Table duration (min)</strong>.</p>

<h4>Capacity per shift</h4>
<p>If you set the <strong>Capacity</strong> in <strong>My Business → Operations</strong> (maximum guests per service), the day shows a bar per shift (<strong>Shift 1</strong>, <strong>Shift 2</strong>…, following your hours) with how many people you have against the maximum. The bar changes colour when the shift is nearly full (80%) and when it's complete.</p>
<p>If a booking would push you over, <strong>Full shift</strong> appears with the exact numbers and three options: <strong>Cancel</strong>, <strong>Add to waitlist</strong> (doesn't count towards capacity until you confirm it) or <strong>Confirm anyway</strong> (in case you can open extra tables).</p>

<h4>Bookings coming from your website</h4>
<p>The customer books alone on your public page. The app tries to <strong>confirm it without you doing anything</strong>: if there's a free table with enough seats at that time, it fits within capacity, no deposit is pending and the party isn't above the size you reserved for manual handling (<strong>My Business → Operations → Group bookings by phone or email</strong>), it becomes <strong>Confirmed</strong> with its table. If not, it appears at the top under <strong>Pending online requests</strong>, with time, people, phone, how long it's been waiting and whether the shift would be exceeded.</p>
<ul>
  <li><strong>Confirm</strong> — if it has no table, the booking opens so you can pick one (confirming requires a table).</li>
  <li><strong>Reject</strong> — cancels it; owner or employee with edit permission only.</li>
  <li><strong>Deposit received</strong> — if you take deposits outside the app and it has arrived.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Tables with no seats entered in My Business can't be offered to the website: those bookings don't confirm themselves. Enter the seats for all your tables.</div>
<p>With <strong>Require a deposit to confirm reservations</strong> on (needs Stripe payment connected), the customer pays the deposit by card when booking and only then is it confirmed. When you cancel a booking whose deposit was already charged, the app reminds you to <strong>refund it</strong> from your Stripe dashboard.</p>

<h4>Arrival and no-shows</h4>
<ul>
  <li><strong>Arrived</strong> opens a window where you confirm the table they sit at (in case you moved them). It's also marked automatically when you open the table in the POS with <strong>Has a reservation</strong>; a paid deposit is taken off the bill.</li>
  <li><strong>No-show</strong> (in the ⋯) asks for confirmation and adds a warning to the customer, which you'll see when they book again. <strong>Undo no-show</strong> reverses it.</li>
</ul>

<h4>Notifying the customer</h4>
<ul>
  <li><strong>Reminders due tomorrow</strong>: at the top are tomorrow's bookings you haven't yet reminded. <strong>Send reminder</strong> gives you the text written and editable, with a <strong>WhatsApp / SMS</strong> button and an <strong>Email</strong> button. The app sends nothing by itself: the message goes out from your WhatsApp or your email. WhatsApp only opens with mobile numbers; a landline shows a warning.</li>
  <li><strong>Cancelling</strong> (asks for confirmation) or <strong>changing date or time</strong> offers <strong>Notify the customer</strong> with the message ready.</li>
  <li>The customer can <strong>edit the time or cancel</strong> by themselves from their tracking link. Takeaway orders can't be edited there.</li>
</ul>

<h4>Week and Month</h4>
<ul>
  <li><strong>Week</strong> — seven columns with each day's bookings as small cards (time, name, people), totals on top (<strong>Bookings this week</strong>, <strong>Guests</strong>, <strong>Busiest day</strong>), a <strong>+</strong> to create on that day and, tapping the day, you jump to its Day view.</li>
  <li><strong>Month</strong> — a calendar with the number of bookings and guests per day. The selector at the top (‹ month year ›) lets you go month by month or open the year and see how many bookings each month has.</li>
</ul>

<h4>Good to know</h4>
<ul>
  <li><strong>Permissions:</strong> any employee creates, confirms and marks arrivals. <strong>Cancel</strong> and <strong>Reject</strong> belong to the owner or an employee with edit permission.</li>
  <li>A cancelled booking <strong>doesn't disappear</strong>: it stays on record and frees the table and capacity.</li>
  <li>Tomorrow's and this week's bookings also show on the <strong>Dashboard</strong>.</li>
  <li>Everything syncs between devices and with the public website.</li>
</ul>

<h4>If something isn't working</h4>
<ul>
  <li><strong>It won't let me confirm:</strong> a table is missing. Open it with <strong>Edit</strong> and pick one.</li>
  <li><strong>The table I want isn't listed:</strong> it's booked or open in the POS within the table duration.</li>
  <li><strong>I can't see the Cancel button:</strong> you need to be the owner or have edit permission.</li>
  <li><strong>The shift shows full and the customer can't book on the website:</strong> that's capacity; raise it or confirm by hand.</li>
</ul>`}
  },
  {id:'online', area:'sala',
    title:{es:`<i class="ti ti-world"></i> Reservas y Pedidos Online`, ca:`<i class="ti ti-world"></i> Reserves i Comandes en Línia`, en:`<i class="ti ti-world"></i> Online Reservations and Ordering`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>GastroGoan crea una <strong>página web propia de tu restaurante</strong> (y su código QR) donde tus clientes pueden <strong>reservar mesa</strong>, <strong>pedir para recoger o a domicilio</strong> y pagar con tarjeta, sin que tú programes nada ni pagues comisiones por pedido a ninguna plataforma. Lo que piden entra solo en tu app: las reservas en <strong>Sala → Reservas</strong> y los pedidos en el <strong>TPV</strong>.</p>

<h4>Antes de empezar</h4>
<ul>
  <li>Tener la licencia activada y <strong>tu propia nube</strong> conectada (el asistente del alta te guía). Sin eso, la tarjeta de <strong>Reserva y pedidos online</strong> en Mi Negocio te avisa de qué falta.</li>
  <li>Tener creadas las mesas, el horario de apertura y al menos una carta (más abajo).</li>
</ul>

<h4>Tu enlace y tu QR, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Ve a <strong>Gestión → Mi Negocio</strong> y busca la tarjeta <strong>Reserva y pedidos online</strong> (solo la ve el propietario).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Verás tu <strong>código QR</strong> y tu enlace. Usa <strong>Descargar QR</strong> para imprimirlo (mesas, escaparate, carta), <strong>Copiar enlace</strong> o el botón de <strong>WhatsApp</strong> para mandarlo, y <strong>Ver página</strong> para ver lo que ve tu cliente.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si quieres un enlace fácil de recordar, escribe un nombre corto en <strong>Personaliza tu enlace</strong> (solo minúsculas, números y guiones, por ejemplo <em>casa-paco</em>) y pulsa <strong>Guardar</strong>. Si otro negocio ya lo usa, te lo dice y pruebas con otro.</div></div>
<p>La tarjeta también te dice qué <strong>carta está activa para pedidos online</strong>; si no hay ninguna, te avisa de que tus clientes no podrán pedir.</p>

<h4>Qué ve tu cliente</h4>
<p>La página sale en su idioma (castellano, catalán o inglés) y al entrar le pide <strong>elegir</strong> entre los servicios que ofreces (si solo ofreces uno, entra directo; arriba tiene «Cambiar» para volver a elegir), según <strong>Mi Negocio → Tipos de servicio</strong> (<strong>En mesa</strong>, <strong>Para llevar</strong>, <strong>A domicilio</strong>): <strong>Reservar mesa</strong>, <strong>Take Away</strong> y <strong>Delivery</strong>. Cada una va <strong>por pasos</strong>, con una barra de progreso y un botón <strong>Continuar</strong> que no deja avanzar si falta algo: en <strong>Reservar mesa</strong>, <em>Cuándo</em> (personas, día y hora) → <em>Tus datos</em> → <em>Confirmar</em> (resumen con «Cambiar» en cada bloque); en <strong>Take Away</strong> y <strong>Delivery</strong>, <em>Elige</em> → <em>Tus datos</em> → <em>Confirmar</em>. Al elegir, los <strong>Menús</strong> salen como tarjetas (al tocar una se abre entera y se elige cada apartado) y la <strong>Carta</strong> como carpetas pequeñas con buscador, donde cada plato es una tarjeta que se toca para añadirlo (con su descripción) y una bandeja <strong>Tu selección</strong>, siempre abajo, enseña lo elegido y deja ajustarlo; la hora se elige con un toque entre los huecos reales («Cuanto antes»). En <strong>Delivery</strong> se piden dirección y código postal, y se avisa si está fuera de zona o por debajo del pedido mínimo. La franja de arriba se adapta a tu logo (claro u oscuro). Al terminar, entra en una pantalla de <strong>seguimiento</strong> con el estado en vivo y un número corto que puede decirte por teléfono. Puede guardar el enlace, y si lo pierde lo recupera con <strong>¿Ya reservaste? Accede a tu reserva</strong> (nombre, email y teléfono). En una reserva puede editar la hora o cancelar sin llamarte; un pedido no se cambia desde ahí: se le muestran tu teléfono y tu email.</p>

<h4>Ajustes que mandan sobre la web</h4>
<ul>
  <li><strong>Tipos de servicio</strong> — qué pestañas existen.</li>
  <li><strong>Horario de apertura</strong> (día a día, con turnos) — la web solo deja elegir fecha y hora dentro de él. Sin horario, no hay límite.</li>
  <li><strong>Operativa</strong> — <strong>Aforo</strong> (máximo de comensales por servicio), <strong>Duración de mesa (min)</strong>, <strong>Antelación mínima</strong> para reservas y para pedidos, <strong>Reservas de grupo por teléfono o email</strong> (a partir de cuántos comensales la web no deja reservar y pide llamar o escribir) y <strong>Pedir señal para confirmar reservas</strong> (con el importe fijo o por persona, y desde cuántas personas).</li>
  <li><strong>Pedidos para llevar / domicilio</strong> — tiempo de preparación, <strong>Dejar de aceptar pedidos X min antes del cierre</strong>, <strong>Pedido mínimo</strong>, <strong>Máx. pedidos por franja de 30 min</strong> (0 = sin límite), <strong>Coste de envío</strong>, <strong>Envío gratis a partir de</strong>, <strong>Códigos postales donde repartes</strong> y <strong>Radio de reparto</strong> (basta cumplir uno de los dos), y las rutas de reparto.</li>
  <li><strong>Formas de pago al entregar/recoger</strong> — <strong>Efectivo</strong>, <strong>Tarjeta</strong> (datáfono) y <strong>TPV virtual</strong> (pagar ya online; solo con Stripe conectado). Al menos una debe quedar marcada. Si el pedido a domicilio es en efectivo, el cliente dice con qué billete paga y el reparto ya ve el cambio a preparar.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>El aforo, la antelación y los límites funcionan solos: si un turno está lleno, la web avisa al cliente para que elija otra hora, reduzca comensales o te llame.</div>

<h4>La carta que ve el cliente</h4>
<p>La web enseña las <strong>cartas activas ahora</strong>. Cada carta se activa sola según el horario que le pusiste en <strong>Oferta Gastronómica</strong>; en el TPV, el botón <strong>Cartas</strong> te dice cuáles están activas. Un plato solo sale si está <strong>Disponible</strong>: en cuanto lo marcas como agotado (en el TPV con <strong>Marcar agotado</strong>, o en la Oferta), desaparece de la web. Si no hay carta activa o ningún plato disponible, el cliente ve que la carta no está disponible para pedidos y puede llamar o reservar mesa. Los precios los pone siempre tu carta, no el navegador del cliente: si alguien los manipula, la app los corrige.</p>

<h4>Cómo llegan las reservas y los pedidos</h4>
<ul>
  <li><strong>Reservas</strong> — se confirman solas si hay mesa y aforo; si no, quedan en <strong>Solicitudes online pendientes</strong> (ver capítulo Reservas).</li>
  <li><strong>Pedidos para llevar y a domicilio</strong> — con <strong>Pedidos online</strong> en <strong>ON</strong> (en el TPV, sección <strong>Para Llevar / Delivery</strong>) se aceptan solos y pasan a cocina, y si el reparto es propio se asignan al repartidor. Quedan en <strong>Pendientes</strong> los que tienen la zona sin verificar, los pagados con tarjeta cuyo pago aún no ha confirmado el banco y, si el interruptor está en <strong>OFF</strong>, todos. Cada uno tiene <strong>Aceptar</strong> y <strong>Rechazar</strong>.</li>
  <li><strong>OFF</strong> es el freno de emergencia: la web deja de admitir pedidos y avisa al cliente de que lo intente en unos minutos. Las reservas siguen.</li>
  <li><strong>Rechazar</strong> o <strong>Cancelar pedido</strong> lo hace el propietario o un empleado con permiso de edición, y te ofrece avisar al cliente por WhatsApp o email.</li>
  <li>Un pedido de la web es <strong>solo de consulta</strong> en el TPV (no se añaden platos) para que el total siga cuadrando con lo pagado.</li>
  <li>Los pedidos programados para otro día no aparecen en pantalla hasta una hora antes; los ves siempre en <strong>Calendario</strong>.</li>
  <li>Al cliente le sale «tu pedido debería estar listo en unos X min», calculado con los pedidos que hay ahora en cocina: base + minutos por pedido en cola, con un máximo (<strong>Mi Negocio → Pedidos para llevar / domicilio</strong>).</li>
</ul>

<h4>Pagos con tarjeta (Stripe)</h4>
<p>Para cobrar online con tarjeta, Apple Pay o Google Pay, conecta tu cuenta de Stripe en <strong>Mi Negocio → Pago online con tarjeta (Stripe)</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Conectar con Stripe</strong> y sigue el alta en la web de Stripe (unos 10 minutos: tus datos, tu cuenta bancaria y tu DNI). Lee antes el aviso que sale y pulsa <strong>Entendido, ir a Stripe</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Al volver, la tarjeta dice <strong>Activo</strong> cuando Stripe ya deja cobrar. Si dice que falta algo, usa <strong>Terminar el alta en Stripe</strong>.</div></div>
<ul>
  <li>El dinero va <strong>directo a tu cuenta de Stripe</strong> y de ahí a tu banco; GastroGoan no lo toca ni se queda comisión. Stripe te descuenta su tarifa. El primer ingreso tarda más (unos 7 días); después, lo habitual son pocos días. Cada pago lo ves en tu panel de Stripe (<strong>Abrir mi Stripe</strong>).</li>
  <li>Cada venta online se apunta por su importe total y la comisión de Stripe se apunta sola como gasto en Gestión Económica. Las devoluciones se hacen desde tu panel de Stripe.</li>
  <li>Un cliente que paga <strong>de menos</strong> no confirma el pedido ni la reserva: queda pendiente para que decidas.</li>
  <li><strong>Desactivar</strong> quita el pago con tarjeta de la web hasta que lo vuelvas a activar; tu cuenta de Stripe no se borra.</li>
</ul>

<h4>Carta por QR en la mesa</h4>
<p>Además del QR de tu web, cada mesa puede tener <strong>su propio QR</strong>: el comensal ve la carta con alérgenos, pide desde su móvil y, si tienes Stripe conectado, paga la cuenta entera o su parte. Viene <strong>desactivado</strong>. Se configura en <strong>Mi Negocio → QR auto pedido</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Marca <strong>Activar la carta por QR en las mesas (pedido y pago)</strong>. Cada mesa recibe su código.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En <strong>Cuando llega un pedido desde el QR</strong> elige: <strong>Lo acepta el camarero antes de ir a cocina</strong> o <strong>Entra directo en cocina</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa el botón de cada mesa para ver su QR y <strong>Descargar QR</strong>, o usa <strong>Imprimir los QR de todas las mesas</strong> (una tarjeta por mesa, para recortar).</div></div>
<ul>
  <li>Si los pedidos requieren camarero, salen arriba del TPV en <strong>Pedidos desde el QR de la mesa</strong> con <strong>Aceptar y marchar</strong> y <strong>Rechazar</strong>. Aceptar los pasa a la comanda de esa mesa y a cocina.</li>
  <li>Si alguien se lleva o fotografía un QR, usa <strong>Cambiar QR</strong> en esa mesa: el impreso deja de funcionar y hay que imprimir el nuevo.</li>
  <li>Quien paga desde el móvil su parte ya no se la vuelves a cobrar al cerrar la mesa: el cobro del TPV descuenta lo pagado online.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La carta por QR necesita que las <strong>reglas de tu base de datos</strong> estén actualizadas. Si activas el QR y los pedidos no llegan, revisa el aviso de reglas desactualizadas en la app y pega las reglas nuevas en tu Firebase.</div>

<h4>Cómo se sincroniza con la web</h4>
<ul>
  <li>Lo que cambias en la app (cartas, disponibilidad, horarios, aforo, reservas) se publica en tu nube y la web lo refleja en <strong>unos segundos</strong>.</li>
  <li>Las reservas y pedidos de los clientes entran en tu app a través de tu nube. Si la app no está abierta en ningún dispositivo, esperan en la nube y entran en cuanto se abre.</li>
  <li>El aviso de privacidad de la web de reservas lleva el responsable y, si lo publicas, tu NIF (<strong>Mi Negocio</strong>).</li>
</ul>

<h4>Lo que conviene saber</h4>
<ul>
  <li>Todo lo de esta página lo configura el <strong>propietario</strong>; el personal solo ve el resultado en Reservas y TPV.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
  <li><strong>La web dice que la carta no está disponible:</strong> comprueba que haya una carta activa ahora (horario en Oferta) y platos Disponibles.</li>
  <li><strong>No puedo reservar a esa hora:</strong> está fuera del horario, el turno está lleno o falta antelación mínima.</li>
  <li><strong>Los pedidos no entran solos:</strong> mira que <strong>Pedidos online</strong> esté en ON, y revisa <strong>Pendientes</strong>.</li>
  <li><strong>No puedo marcar «TPV virtual»:</strong> falta conectar Stripe y que aparezca <strong>Activo</strong>.</li>
  <li><strong>Un cambio no aparece en la web:</strong> espera unos segundos y confirma que la app tiene internet (indicador de nube en verde).</li>
  <li><strong>Un pedido a domicilio pide verificar la zona:</strong> revisa la dirección y acéptalo o recházalo a mano.</li>
</ul>`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>GastroGoan crea una <strong>pàgina web pròpia del teu restaurant</strong> (i el seu codi QR) on els teus clients poden <strong>reservar taula</strong>, <strong>demanar per recollir o a domicili</strong> i pagar amb targeta, sense que programis res ni paguis comissions per comanda a cap plataforma. El que demanen entra sol a la teva app: les reserves a <strong>Sala → Reserves</strong> i les comandes al <strong>TPV</strong>.</p>

<h4>Abans de començar</h4>
<ul>
  <li>Tenir la llicència activada i <strong>el teu propi núvol</strong> connectat (l'assistent de l'alta et guia). Sense això, la targeta de <strong>Reserva i comandes en línia</strong> a El Meu Negoci t'avisa del que falta.</li>
  <li>Tenir creades les taules, l'horari d'obertura i almenys una carta (més avall).</li>
</ul>

<h4>El teu enllaç i el teu QR, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Ves a <strong>Gestió → El Meu Negoci</strong> i busca la targeta <strong>Reserva i comandes en línia</strong> (només la veu el propietari).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Veuràs el teu <strong>codi QR</strong> i el teu enllaç. Fes servir <strong>Descarregar QR</strong> per imprimir-lo (taules, aparador, carta), <strong>Copiar enllaç</strong> o el botó de <strong>WhatsApp</strong> per enviar-lo, i <strong>Veure pàgina</strong> per veure el que veu el teu client.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si vols un enllaç fàcil de recordar, escriu un nom curt a <strong>Personalitza el teu enllaç</strong> (només minúscules, números i guions, per exemple <em>casa-paco</em>) i prem <strong>Desar</strong>. Si un altre negoci ja el fa servir, t'ho diu i en proves un altre.</div></div>
<p>La targeta també et diu quina <strong>carta és activa per a comandes en línia</strong>; si no n'hi ha cap, t'avisa que els teus clients no podran demanar.</p>

<h4>Què veu el teu client</h4>
<p>La pàgina surt en el seu idioma (castellà, català o anglès) i en entrar li demana <strong>triar</strong> entre els serveis que ofereixes (si en ofereixes només un, entra directe; a dalt té «Canvia» per tornar a triar), segons <strong>El Meu Negoci → Tipus de servei</strong> (<strong>A taula</strong>, <strong>Per emportar</strong>, <strong>A domicili</strong>): <strong>Reservar taula</strong>, <strong>Take Away</strong> i <strong>Delivery</strong>. Cadascuna va <strong>per passos</strong>, amb una barra de progrés i un botó <strong>Continua</strong> que no deixa avançar si falta alguna cosa: a <strong>Reservar taula</strong>, <em>Quan</em> (persones, dia i hora) → <em>Les teves dades</em> → <em>Confirmar</em> (resum amb «Canvia» a cada bloc); a <strong>Take Away</strong> i <strong>Delivery</strong>, <em>Tria</em> → <em>Les teves dades</em> → <em>Confirmar</em>. En triar, els <strong>Menús</strong> surten com a targetes (en tocar-ne una s'obre sencera i es tria cada apartat) i la <strong>Carta</strong> com a carpetes petites amb cercador, on cada plat és una targeta que es toca per afegir-lo (amb la seva descripció) i una safata <strong>La teva selecció</strong>, sempre a baix, ensenya el que s'ha triat i deixa ajustar-ho; l'hora es tria amb un toc entre els buits reals («Com abans millor»). A <strong>Delivery</strong> es demanen adreça i codi postal, i s'avisa si és fora de zona o per sota de la comanda mínima. La franja de dalt s'adapta al teu logotip (clar o fosc). En acabar, entra en una pantalla de <strong>seguiment</strong> amb l'estat en viu i un número curt que et pot dir per telèfon. Pot desar l'enllaç, i si el perd el recupera amb <strong>Ja vas reservar? Accedeix a la teva reserva</strong> (nom, email i telèfon). En una reserva pot editar l'hora o cancel·lar sense trucar-te; una comanda no es canvia des d'allà: se li mostren el teu telèfon i el teu email.</p>

<h4>Ajustos que manen sobre la web</h4>
<ul>
  <li><strong>Tipus de servei</strong> — quines pestanyes existeixen.</li>
  <li><strong>Horari d'obertura</strong> (dia per dia, amb torns) — la web només deixa triar data i hora dins d'ell. Sense horari, no hi ha límit.</li>
  <li><strong>Operativa</strong> — <strong>Aforament</strong> (màxim de comensals per servei), <strong>Durada de taula (min)</strong>, <strong>Antelació mínima</strong> per a reserves i per a comandes, <strong>Reserves de grup per telèfon o email</strong> (a partir de quants comensals la web no deixa reservar i demana trucar o escriure) i <strong>Demanar senyal per confirmar reserves</strong> (amb l'import fix o per persona, i des de quantes persones).</li>
  <li><strong>Comandes per emportar / domicili</strong> — temps de preparació, <strong>Deixar d'acceptar comandes X min abans del tancament</strong>, <strong>Comanda mínima</strong>, <strong>Màx. comandes per franja de 30 min</strong> (0 = sense límit), <strong>Cost d'enviament</strong>, <strong>Enviament gratis a partir de</strong>, <strong>Codis postals on repartiu</strong> i <strong>Radi de repartiment</strong> (n'hi ha prou de complir-ne un), i les rutes de repartiment.</li>
  <li><strong>Formes de pagament en entregar/recollir</strong> — <strong>Efectiu</strong>, <strong>Targeta</strong> (datàfon) i <strong>TPV virtual</strong> (pagar ja en línia; només amb Stripe connectat). N'ha de quedar almenys una marcada. Si la comanda a domicili és en efectiu, el client diu amb quin bitllet paga i el repartiment ja veu el canvi a preparar.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>L'aforament, l'antelació i els límits funcionen sols: si un torn és ple, la web avisa el client perquè triï una altra hora, redueixi comensals o et truqui.</div>

<h4>La carta que veu el client</h4>
<p>La web mostra les <strong>cartes actives ara</strong>. Cada carta s'activa sola segons l'horari que li vas posar a <strong>Oferta Gastronòmica</strong>; al TPV, el botó <strong>Cartes</strong> et diu quines són actives. Un plat només surt si és <strong>Disponible</strong>: en el moment que el marques com a esgotat (al TPV amb <strong>Marcar esgotat</strong>, o a l'Oferta), desapareix de la web. Si no hi ha carta activa o cap plat disponible, el client veu que la carta no està disponible per a comandes i pot trucar o reservar taula. Els preus els posa sempre la teva carta, no el navegador del client: si algú els manipula, l'app els corregeix.</p>

<h4>Com arriben les reserves i les comandes</h4>
<ul>
  <li><strong>Reserves</strong> — es confirmen soles si hi ha taula i aforament; si no, queden a <strong>Sol·licituds en línia pendents</strong> (vegeu el capítol Reserves).</li>
  <li><strong>Comandes per emportar i a domicili</strong> — amb <strong>Comandes online</strong> en <strong>ON</strong> (al TPV, secció <strong>Per Emportar / Delivery</strong>) s'accepten soles i passen a cuina, i si el repartiment és propi s'assignen al repartidor. Queden a <strong>Pendents</strong> les que tenen la zona sense verificar, les pagades amb targeta el pagament de les quals encara no ha confirmat el banc i, si l'interruptor és en <strong>OFF</strong>, totes. Cadascuna té <strong>Acceptar</strong> i <strong>Rebutjar</strong>.</li>
  <li><strong>OFF</strong> és el fre d'emergència: la web deixa d'admetre comandes i avisa el client que ho provi d'aquí a uns minuts. Les reserves continuen.</li>
  <li><strong>Rebutjar</strong> o <strong>Cancel·lar comanda</strong> ho fa el propietari o un empleat amb permís d'edició, i t'ofereix avisar el client per WhatsApp o email.</li>
  <li>Una comanda de la web és <strong>només de consulta</strong> al TPV (no s'hi afegeixen plats) perquè el total segueixi quadrant amb el pagat.</li>
  <li>Les comandes programades per a un altre dia no apareixen en pantalla fins una hora abans; les veus sempre a <strong>Calendari</strong>.</li>
  <li>Al client li surt «la teva comanda hauria d'estar llesta en uns X min», calculat amb les comandes que hi ha ara a cuina: base + minuts per comanda en cua, amb un màxim (<strong>El Meu Negoci → Comandes per emportar / domicili</strong>).</li>
</ul>

<h4>Pagaments amb targeta (Stripe)</h4>
<p>Per cobrar en línia amb targeta, Apple Pay o Google Pay, connecta el teu compte de Stripe a <strong>El Meu Negoci → Pagament en línia amb targeta (Stripe)</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Connectar amb Stripe</strong> i segueix l'alta a la web de Stripe (uns 10 minuts: les teves dades, el teu compte bancari i el teu DNI). Llegeix abans l'avís que surt i prem <strong>Entesos, anar a Stripe</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En tornar, la targeta diu <strong>Actiu</strong> quan Stripe ja deixa cobrar. Si diu que falta alguna cosa, fes servir <strong>Acabar l'alta a Stripe</strong>.</div></div>
<ul>
  <li>Els diners van <strong>directes al teu compte de Stripe</strong> i d'allà al teu banc; GastroGoan no els toca ni es queda comissió. Stripe et descompta la seva tarifa. El primer ingrés triga més (uns 7 dies); després, el normal són pocs dies. Cada pagament el veus al teu tauler de Stripe (<strong>Obrir el meu Stripe</strong>).</li>
  <li>Cada venda en línia s'apunta pel seu import total i la comissió de Stripe s'apunta sola com a despesa a Gestió Econòmica. Les devolucions es fan des del teu tauler de Stripe.</li>
  <li>Un client que paga <strong>de menys</strong> no confirma la comanda ni la reserva: queda pendent perquè decideixis.</li>
  <li><strong>Desactivar</strong> treu el pagament amb targeta de la web fins que el tornis a activar; el teu compte de Stripe no s'esborra.</li>
</ul>

<h4>Carta per QR a la taula</h4>
<p>A més del QR de la teva web, cada taula pot tenir <strong>el seu propi QR</strong>: el comensal veu la carta amb al·lèrgens, demana des del seu mòbil i, si tens Stripe connectat, paga el compte sencer o la seva part. Ve <strong>desactivada</strong>. Es configura a <strong>El Meu Negoci → QR autocomanda</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Marca <strong>Activar la carta per QR a les taules (comanda i pagament)</strong>. Cada taula rep el seu codi.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A <strong>Quan arriba una comanda des del QR</strong> tria: <strong>L'accepta el cambrer abans d'anar a cuina</strong> o <strong>Entra directament a cuina</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem el botó de cada taula per veure'n el QR i <strong>Descarregar QR</strong>, o fes servir <strong>Imprimir els QR de totes les taules</strong> (una targeta per taula, per retallar).</div></div>
<ul>
  <li>Si les comandes requereixen cambrer, surten a dalt del TPV a <strong>Comandes des del QR de la taula</strong> amb <strong>Acceptar i marxar</strong> i <strong>Rebutjar</strong>. Acceptar les passa a la comanda d'aquella taula i a cuina.</li>
  <li>Si algú s'endú o fotografia un QR, fes servir <strong>Canviar QR</strong> en aquella taula: l'imprès deixa de funcionar i cal imprimir el nou.</li>
  <li>Qui paga des del mòbil la seva part ja no la hi tornes a cobrar en tancar la taula: el cobrament del TPV descompta el pagat en línia.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La carta per QR necessita que les <strong>regles de la teva base de dades</strong> estiguin actualitzades. Si actives el QR i les comandes no arriben, revisa l'avís de regles desactualitzades a l'app i enganxa les regles noves al teu Firebase.</div>

<h4>Com se sincronitza amb la web</h4>
<ul>
  <li>El que canvies a l'app (cartes, disponibilitat, horaris, aforament, reserves) es publica al teu núvol i la web ho reflecteix en <strong>uns segons</strong>.</li>
  <li>Les reserves i comandes dels clients entren a la teva app a través del teu núvol. Si l'app no és oberta en cap dispositiu, esperen al núvol i entren tan bon punt s'obre.</li>
  <li>L'avís de privacitat de la web de reserves porta el responsable i, si el publiques, el teu NIF (<strong>El Meu Negoci</strong>).</li>
</ul>

<h4>El que convé saber</h4>
<ul>
  <li>Tot el d'aquesta pàgina ho configura el <strong>propietari</strong>; el personal només en veu el resultat a Reserves i TPV.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
  <li><strong>La web diu que la carta no està disponible:</strong> comprova que hi hagi una carta activa ara (horari a Oferta) i plats Disponibles.</li>
  <li><strong>No puc reservar a aquella hora:</strong> és fora de l'horari, el torn és ple o falta antelació mínima.</li>
  <li><strong>Les comandes no entren soles:</strong> mira que <strong>Comandes online</strong> sigui en ON, i revisa <strong>Pendents</strong>.</li>
  <li><strong>No puc marcar «TPV virtual»:</strong> falta connectar Stripe i que aparegui <strong>Actiu</strong>.</li>
  <li><strong>Un canvi no apareix a la web:</strong> espera uns segons i confirma que l'app té internet (indicador de núvol en verd).</li>
  <li><strong>Una comanda a domicili demana verificar la zona:</strong> revisa l'adreça i accepta-la o rebutja-la a mà.</li>
</ul>`,
    en:`<h3>What it is and what it's for</h3>
<p>GastroGoan creates a <strong>website of your own for your restaurant</strong> (and its QR code) where your customers can <strong>book a table</strong>, <strong>order for pickup or delivery</strong> and pay by card, with nothing for you to build and no per-order commission to any platform. What they ask for comes straight into your app: bookings in <strong>Dining Room → Reservations</strong> and orders in the <strong>POS</strong>.</p>

<h4>Before you start</h4>
<ul>
  <li>Have your licence activated and <strong>your own cloud</strong> connected (the sign-up wizard guides you). Without it, the <strong>Online reservations and orders</strong> card in My Business tells you what's missing.</li>
  <li>Have your tables, opening hours and at least one menu set up (see below).</li>
</ul>

<h4>Your link and your QR, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>Management → My Business</strong> and find the <strong>Online reservations and orders</strong> card (only the owner sees it).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">You'll see your <strong>QR code</strong> and your link. Use <strong>Download QR</strong> to print it (tables, shop window, menu), <strong>Copy link</strong> or the <strong>WhatsApp</strong> button to send it, and <strong>View page</strong> to see what your customer sees.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">If you want an easy-to-remember link, type a short name in <strong>Customize your link</strong> (lowercase letters, numbers and hyphens only, for example <em>casa-paco</em>) and press <strong>Save</strong>. If another business already uses it, you're told and you try another.</div></div>
<p>The card also tells you which <strong>menu is active for online ordering</strong>; if there's none, it warns you that your customers won't be able to order.</p>

<h4>What your customer sees</h4>
<p>The page appears in their language (Spanish, Catalan or English) and asks them to <strong>choose</strong> among the services you offer on arrival (with only one, it goes straight in; a «Change» link at the top lets them choose again), based on <strong>My Business → Service types</strong> (<strong>Dine-in</strong>, <strong>Takeaway</strong>, <strong>Delivery</strong>): <strong>Book a table</strong>, <strong>Take Away</strong> and <strong>Delivery</strong>. Each one works <strong>in steps</strong>, with a progress bar and a <strong>Continue</strong> button that won't let them move on if something is missing: in <strong>Book a table</strong>, <em>When</em> (guests, day and time) → <em>Your details</em> → <em>Confirm</em> (a summary with «Change» on each block); in <strong>Take Away</strong> and <strong>Delivery</strong>, <em>Choose</em> → <em>Your details</em> → <em>Confirm</em>. When choosing, <strong>Menus</strong> appear as cards (tap one to open it in full and pick each part) and the <strong>Menu</strong> as small folders with a search box, where each dish is a card you tap to add (with its description) and a <strong>Your selection</strong> tray, always at the bottom, shows what has been picked and lets them adjust it; the time is picked with one tap among the real slots («As soon as possible»). In <strong>Delivery</strong> an address and postcode are required, and it warns if the address is out of the area or under the minimum order. The top strip adapts to your logo (light or dark). When they finish, they land on a <strong>tracking</strong> screen with live status and a short number they can read out to you over the phone. They can save the link, and if they lose it they recover it with <strong>Already booked? Access your reservation</strong> (name, email and phone). On a booking they can change the time or cancel without calling you; an order can't be changed from there: your phone and email are shown instead.</p>

<h4>Settings that control the website</h4>
<ul>
  <li><strong>Service types</strong> — which tabs exist.</li>
  <li><strong>Opening hours</strong> (day by day, with shifts) — the website only lets customers pick a date and time within them. With no hours set, there's no limit.</li>
  <li><strong>Operations</strong> — <strong>Capacity</strong> (maximum guests per service), <strong>Table duration (min)</strong>, <strong>Minimum lead time</strong> for bookings and for orders, <strong>Group bookings by phone or email</strong> (from how many guests the website doesn't allow booking and asks them to call or write) and <strong>Require a deposit to confirm reservations</strong> (fixed amount or per person, and from how many people).</li>
  <li><strong>Takeaway / delivery orders</strong> — prep time, <strong>Stop accepting orders X min before closing</strong>, <strong>Minimum order</strong>, <strong>Max. orders per 30-min slot</strong> (0 = no limit), <strong>Delivery fee</strong>, <strong>Free delivery from</strong>, <strong>Postal codes you deliver to</strong> and <strong>Delivery radius</strong> (meeting one of the two is enough), plus the delivery route settings.</li>
  <li><strong>Payment methods on delivery/pickup</strong> — <strong>Cash</strong>, <strong>Card</strong> (reader) and <strong>Virtual POS</strong> (pay now online; only with Stripe connected). At least one must stay ticked. If a delivery order is paid in cash, the customer says what bill they'll pay with and delivery already sees the change to prepare.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Capacity, lead time and limits work by themselves: if a shift is full, the website tells the customer to pick another time, reduce the party or call you.</div>

<h4>The menu the customer sees</h4>
<p>The website shows the <strong>menus active right now</strong>. Each menu switches on by itself following the schedule you gave it in <strong>Menu Offering</strong>; in the POS, the <strong>Menus</strong> button tells you which are active. A dish only shows if it's <strong>Available</strong>: the moment you mark it as sold out (in the POS with <strong>Mark as out</strong>, or in the Offering), it disappears from the website. If no menu is active or no dish is available, the customer sees that the menu isn't available for orders and can call or book a table. Prices always come from your menu, not the customer's browser: if someone tampers with them, the app corrects them.</p>

<h4>How bookings and orders arrive</h4>
<ul>
  <li><strong>Bookings</strong> — confirm themselves if there's a table and capacity; otherwise they wait in <strong>Pending online requests</strong> (see the Reservations chapter).</li>
  <li><strong>Takeaway and delivery orders</strong> — with <strong>Online orders</strong> <strong>ON</strong> (in the POS, <strong>Takeaway / Delivery</strong> section) they're accepted by themselves and go to the kitchen, and for own delivery they're assigned to the rider. These stay in <strong>Pending</strong>: orders with an unverified zone, card-paid orders whose payment the bank hasn't confirmed yet, and, if the switch is <strong>OFF</strong>, all of them. Each has <strong>Accept</strong> and <strong>Reject</strong>.</li>
  <li><strong>OFF</strong> is the emergency brake: the website stops accepting orders and tells the customer to try again in a few minutes. Bookings carry on.</li>
  <li><strong>Reject</strong> or <strong>Cancel order</strong> is done by the owner or an employee with edit permission, and offers to notify the customer by WhatsApp or email.</li>
  <li>A website order is <strong>view-only</strong> in the POS (no dishes added) so the total keeps matching what was paid.</li>
  <li>Orders scheduled for another day don't show on screen until an hour before; you always see them in <strong>Calendar</strong>.</li>
  <li>The customer sees "your order should be ready in about X min", worked out from the orders currently in the kitchen: base time + minutes per queued order, with a cap (<strong>My Business → Takeaway / delivery orders</strong>).</li>
</ul>

<h4>Card payments (Stripe)</h4>
<p>To take online payments by card, Apple Pay or Google Pay, connect your Stripe account in <strong>My Business → Online card payment (Stripe)</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>Connect with Stripe</strong> and follow the sign-up on the Stripe site (about 10 minutes: your details, your bank account and your ID). Read the notice first and press <strong>Got it, go to Stripe</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">On your return, the card says <strong>Active</strong> once Stripe allows charges. If it says something is missing, use <strong>Finish signing up on Stripe</strong>.</div></div>
<ul>
  <li>The money goes <strong>straight to your Stripe account</strong> and from there to your bank; GastroGoan doesn't touch it or take a commission. Stripe deducts its own fee. The first payout takes longer (about 7 days); after that, it's usually a few days. You see each payment in your Stripe dashboard (<strong>Open my Stripe</strong>).</li>
  <li>Each online sale is recorded at its full amount and Stripe's commission is recorded automatically as an expense in Financial Management. Refunds are done from your Stripe dashboard.</li>
  <li>A customer who pays <strong>too little</strong> doesn't confirm the order or booking: it stays pending for you to decide.</li>
  <li><strong>Turn off</strong> removes card payment from the website until you turn it back on; your Stripe account isn't deleted.</li>
</ul>

<h4>QR menu at the table</h4>
<p>Besides your website's QR, each table can have <strong>its own QR</strong>: the diner sees the menu with allergens, orders from their phone and, if you have Stripe connected, pays the whole bill or their share. It's <strong>off</strong> by default. Set it up in <strong>My Business → Self-order QR</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Tick <strong>Turn on the QR menu at tables (ordering and payment)</strong>. Each table gets its code.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Under <strong>When an order arrives from the QR</strong> choose: <strong>A waiter accepts it before it goes to the kitchen</strong> or <strong>It goes straight to the kitchen</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press each table's button to see its QR and <strong>Download QR</strong>, or use <strong>Print the QR codes for all tables</strong> (one card per table, to cut out).</div></div>
<ul>
  <li>If orders need a waiter, they appear at the top of the POS under <strong>Orders from table QR codes</strong> with <strong>Accept and send</strong> and <strong>Reject</strong>. Accepting moves them onto that table's order and to the kitchen.</li>
  <li>If someone takes or photographs a QR, use <strong>Change QR</strong> on that table: the printed one stops working and you need to print the new one.</li>
  <li>Whoever pays their share from their phone isn't charged for it again when the table closes: the POS charge deducts what was paid online.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The QR menu needs your <strong>database rules</strong> to be up to date. If you turn on the QR and orders don't arrive, check the outdated-rules notice in the app and paste the new rules into your Firebase.</div>

<h4>How it syncs with the website</h4>
<ul>
  <li>What you change in the app (menus, availability, hours, capacity, bookings) is published to your cloud and the website reflects it within <strong>a few seconds</strong>.</li>
  <li>Customers' bookings and orders reach your app through your cloud. If the app isn't open on any device, they wait in the cloud and come in as soon as it's opened.</li>
  <li>The privacy notice on the booking website names the data controller and, if you publish it, your tax ID (<strong>My Business</strong>).</li>
</ul>

<h4>Good to know</h4>
<ul>
  <li>Everything on this page is configured by the <strong>owner</strong>; staff only see the result in Reservations and the POS.</li>
</ul>

<h4>If something isn't working</h4>
<ul>
  <li><strong>The website says the menu isn't available:</strong> check there's a menu active now (schedule in the Offering) and dishes marked Available.</li>
  <li><strong>I can't book at that time:</strong> it's outside opening hours, the shift is full or the minimum lead time hasn't been met.</li>
  <li><strong>Orders don't come in by themselves:</strong> check <strong>Online orders</strong> is ON, and look in <strong>Pending</strong>.</li>
  <li><strong>I can't tick "Virtual POS":</strong> Stripe must be connected and show <strong>Active</strong>.</li>
  <li><strong>A change doesn't show on the website:</strong> wait a few seconds and make sure the app has internet (cloud indicator green).</li>
  <li><strong>A delivery order asks to verify the zone:</strong> check the address and accept or reject it by hand.</li>
</ul>`}
  },
  {id:'clientes', area:'sala',
    title:{es:`<i class="ti ti-address-book"></i> Clientes`, ca:`<i class="ti ti-address-book"></i> Clients`, en:`<i class="ti ti-address-book"></i> Customers`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Aquí viven las fichas de tus clientes. Conocer a quien ya te visita es lo más barato que hay para vender más: volver a traer a un cliente cuesta mucho menos que conseguir uno nuevo. La pantalla guarda sus datos, apunta sola lo que gasta y cada cuánto viene, y te avisa de quién se está yendo, quién cumple años y quién tiene un premio esperando. También gestiona los <strong>vales regalo</strong>.</p>
<p>Está en la carpeta <strong>Sala</strong> (Sala → <strong>Clientes</strong>).</p>

<h4>Lo primero que ves</h4>
<ul>
<li><strong>Cuatro cifras arriba</strong>: <strong>Clientes</strong> (con cuántos aceptan novedades), <strong>Activos este mes</strong>, <strong>En riesgo</strong> y <strong>Premios por dar</strong>.</li>
<li><strong>Una tarjeta por cliente</strong>, de dos o tres por fila según la pantalla. Cada una muestra su nombre, hace cuántos días vino, sus etiquetas (Nuevo, En riesgo, VIP, Alergias, no-shows, sin permiso de marketing, vales pendientes) y su barra de puntos de fidelidad.</li>
<li><strong>Buscador</strong> (por nombre, teléfono o email) y un desplegable <strong>Ordenar por</strong>: Nombre, Última visita, Más visitas (30 d), Mayor gasto (año) o Más puntos.</li>
<li><strong>Filtros en fichas, cada uno con su cuenta</strong>: Todos, VIP, Nuevos, En riesgo, Inactivos, Con alergias, No-shows y Sin permiso de marketing.</li>
</ul>
<p>Si hay muchos clientes se pintan de 60 en 60: pulsa <strong>Ver más</strong> al final de la lista.</p>

<h4>Dar de alta a un cliente, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Nuevo Cliente</strong> (arriba a la derecha). Se abre la ficha.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escribe el <strong>Nombre</strong> con nombre y apellidos (la app no deja guardar con una sola palabra, para que dos «Juan» no se confundan) y el <strong>Teléfono</strong>. Los dos son obligatorios. El email es opcional.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si quieres, rellena <strong>Código postal</strong>, <strong>Cumpleaños</strong>, <strong>Último contacto</strong>, <strong>Alergias / preferencias</strong> y <strong>Notas</strong>. El campo de notas es grande y crece según escribes: apunta lo que quieras («le gusta la mesa del fondo», «viene con perro»).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Deja marcada la casilla <strong>Acepta recibir promociones y premios por WhatsApp/email</strong> solo si el cliente te lo ha dicho. Desmárcala si no quiere (más abajo se explica qué cambia).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Pulsa <strong>Guardar</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Dos clientes no pueden tener exactamente el mismo nombre: añade el segundo apellido o una inicial. Si el teléfono o el email ya existen en otra ficha, la app te avisa y puedes seguir (puede ser alguien de la misma casa). Si el teléfono tiene menos de 9 cifras o el email parece mal escrito, también te pregunta antes de guardar.</div>
<p>Cuando alguien reserva o pide desde la web pública con un teléfono que ya tienes, la reserva o el pedido se enlazan solos a su ficha.</p>

<h4>La ficha: todo del cliente en una sola ventana</h4>
<p>Tocar una tarjeta abre la <strong>ficha entera</strong>. A la izquierda está lo que editas (datos, alergias, notas, permiso de marketing). A la derecha, lo que la app ya sabe de él:</p>
<ul>
<li><strong>De un vistazo</strong>: Visitas 30 días, Visitas año en curso, Ticket medio, Total 30 días, Total año en curso y Última visita; y etiquetas como su plato favorito, si cumple años en menos de 30 días o cuántos no-shows lleva.</li>
<li><strong>Puntos de fidelidad</strong> y sus últimos premios.</li>
<li><strong>Reservas próximas</strong> (pulsa una para ir a ella) y sus <strong>vales regalo</strong>.</li>
</ul>
<p>Abajo de la ficha tienes tres botones: <strong>Historial</strong>, <strong>Fusionar con otro cliente</strong> y <strong>Borrar datos (RGPD)</strong>. En una ficha nueva todavía no se ve nada a la derecha: aparece al guardarla y al registrar su primera venta.</p>
<p>En cada tarjeta también hay un icono de <strong>WhatsApp</strong> y otro de <strong>email</strong> para escribirle directamente (el de WhatsApp solo sale si el número es un móvil; un fijo no abre ningún chat) y un menú <strong>⋯</strong> con <strong>Abrir ficha</strong>, <strong>Historial</strong>, <strong>Fusionar con otro cliente</strong> y <strong>Eliminar</strong>.</p>

<h4>Qué significan las etiquetas</h4>
<table>
<thead><tr><th>Etiqueta</th><th>Cuándo sale</th></tr></thead>
<tbody>
<tr><td><strong>Nuevo</strong></td><td>Su primera visita fue hace 30 días o menos.</td></tr>
<tr><td><strong>VIP</strong></td><td>Tiene 7 o más puntos de fidelidad.</td></tr>
<tr><td><strong>En riesgo</strong></td><td>Venía con ritmo y ha dejado de venir. Exige tres cosas a la vez: al menos 3 visitas, más de 30 días desde la primera y una ausencia mayor que el doble de su intervalo habitual (y nunca menos de 14 días).</td></tr>
<tr><td><strong>Inactivos</strong> (filtro)</td><td>Más de 60 días sin venir, o ninguna visita todavía.</td></tr>
<tr><td><strong>No-shows</strong></td><td>Ha dejado alguna mesa vacía sin avisar.</td></tr>
</tbody>
</table>
<p>Así, alguien que viene cada día y falta uno no se marca como «perdido». Lo que sí sale en «En riesgo» merece una llamada o un mensaje.</p>

<h4>Puntos de fidelidad y premios</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada vez que cobras en el TPV una venta asignada a un cliente, suma <strong>1 punto</strong> (hasta 10). Si anulas esa venta, el punto se resta.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Al llegar a 10 aparece el botón <strong>Dar premio</strong> en su tarjeta y en su ficha, y cuenta en «Premios por dar».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige el premio. La app te sugiere regalarle su producto favorito; también puedes escoger de tu catálogo o escribir otro. Pulsa <strong>Entregar premio y reiniciar</strong>: el contador vuelve a 0 y el premio queda apuntado.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Te ofrece avisarle con el mensaje ya escrito, por WhatsApp / SMS o email.</div></div>
<p>El botón <strong>i</strong> junto a los puntos explica el sistema y, si eres propietario o tienes permiso de edición, te deja mantener tu <strong>catálogo de premios sugeridos</strong>.</p>

<h4>El historial de un cliente</h4>
<p>Es una pantalla propia, no una ventana encima de otra: entras con <strong>Historial</strong> y vuelves con <strong>Clientes</strong>. Arriba ves sus cifras y debajo una línea de tiempo con todo lo suyo, que puedes filtrar: <strong>Todo</strong>, <strong>Pedidos</strong>, <strong>Reservas</strong>, <strong>Vale regalo</strong> y <strong>Premios</strong>. El botón <strong>Ficha</strong> te lleva de vuelta a sus datos.</p>

<h4>Fusionar duplicados</h4>
<p>Si un mismo cliente tiene dos fichas, abre una y pulsa <strong>Fusionar con otro cliente</strong>. Escribe el nombre de la ficha duplicada y confirma. La que elijas desaparece y todo pasa a la ficha que conservas: se suman los puntos (máximo 10), el historial, las ventas, las reservas y los vales; las alergias, el email, el código postal y el cumpleaños se rellenan solo si faltaban, y las notas se juntan. La ficha eliminada se queda 30 días en la papelera. Fusionar es cosa del propietario o de un empleado con permiso de edición.</p>

<h4>Eliminar un cliente y el derecho al olvido</h4>
<ul>
<li><strong>Eliminar</strong> (menú ⋯) pide el PIN del negocio. Sus ventas y reservas no se pierden: solo se desvinculan. Se puede recuperar desde la papelera durante 30 días y, al restaurarlo, se enlaza de nuevo todo su historial.</li>
<li><strong>Borrar datos (RGPD)</strong> (en la ficha) es para cuando un cliente pide que olvides sus datos. Pide el PIN del negocio, <strong>borra al instante y para siempre</strong> su nombre, teléfono, email, alergias, notas, código postal y cumpleaños, y retira su permiso de marketing. Solo queda un registro anónimo («Cliente (datos eliminados)») para que las ventas y reservas pasadas sigan cuadrando. No se puede deshacer ni pasa por la papelera.</li>
</ul>

<h4>Permiso de marketing</h4>
<p>La casilla de la ficha manda: quien no la tenga marcada <strong>no aparece</strong> en la pestaña Clientes de Promoción ni recibe Novedades. Lo ves con el filtro <strong>Sin permiso de marketing</strong> y con un pequeño icono de correo tachado en su tarjeta. Si alguien responde «BAJA» a una novedad, se le quita el permiso (Promoción → Novedades → <strong>Registrar una baja</strong>).</p>

<h4>Vales regalo</h4>
<p>Un vale regalo es dinero (o una experiencia concreta) que alguien paga ahora y otra persona gasta después. Se gestiona desde esta misma pantalla con dos botones de la barra superior: <strong>Vale regalo</strong> (para emitir) y <strong>Historial de vales</strong>.</p>
<h4>Emitir un vale</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Vale regalo</strong>. Elige el <strong>Tipo de vale</strong>: <strong>Cantidad económica</strong> (dinero para gastar en lo que quieran) o <strong>Experiencia concreta</strong> (por ejemplo «cena para dos»).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pon el importe. En una experiencia, escribe qué es, el <strong>precio cobrado (con IVA)</strong> y el IVA (4, 10 o 21 %).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si quieres, elige el <strong>Cliente</strong> que lo compra y escribe el nombre que irá en el vale (<strong>Para</strong>). Por defecto vale <strong>un año</strong>: cambia <strong>Válido hasta</strong> o marca <strong>Sin fecha de caducidad</strong>.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Pulsa <strong>Emitir vale</strong>. Sale una ventana con su código (del tipo VR-ABC123) y tres botones: <strong>Imprimir vale</strong>, <strong>WhatsApp</strong> y <strong>Email</strong> (se activan si el cliente tiene móvil o correo).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>El código es corto a propósito: se puede leer por teléfono o escribir a mano en un vale de papel. Cobra el vale en tu forma de pago habitual (caja, datáfono, transferencia): la app lo anota como dinero cobrado por adelantado.</div>

<h4>Estados de un vale</h4>
<table>
<thead><tr><th>Estado</th><th>Qué significa</th></tr></thead>
<tbody>
<tr><td><strong>Pendiente</strong></td><td>Emitido y sin usar.</td></tr>
<tr><td><strong>Canje parcial</strong></td><td>Se ha gastado una parte; en la tarjeta ves cuánto <strong>Quedan</strong>.</td></tr>
<tr><td><strong>Canjeado</strong></td><td>Gastado entero.</td></tr>
<tr><td><strong>Caducado</strong></td><td>Pasó su fecha sin gastarse.</td></tr>
<tr><td><strong>Anulado</strong></td><td>Dejó de valer.</td></tr>
</tbody>
</table>

<h4>El Historial de vales</h4>
<p>Pulsa <strong>Historial de vales</strong> para abrir su pantalla (con <strong>Clientes</strong> para volver). Arriba, cuatro cifras: <strong>Por canjear</strong> (dinero que aún te pueden reclamar), <strong>Emitido este año</strong>, <strong>Canjeado este año</strong> y <strong>Caducan en 30 días</strong>. Debajo, un buscador por código o nombre y filtros por estado: Todos, Pendientes, Canje parcial, Canjeados, Caducados y Anulados.</p>
<p>Cada vale es una tarjeta con su código, estado, importe, fecha de emisión y caducidad (en rojo si caduca pronto). Si hay vales de antes de esta versión sin anotar en la contabilidad, un aviso rojo te deja anotarlos de una vez.</p>
<h4>Canjear, ampliar, deshacer y anular</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Canjear</strong>: pulsa el botón en la tarjeta. En un vale de dinero eliges <strong>Importe que se canjea</strong> (puede ser menos que el saldo: queda un canje parcial) y una <strong>Nota</strong> opcional («Mesa 4»). Un vale de experiencia se canjea entero. Si el vale está caducado, la ventana te lo avisa.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En el menú <strong>⋯</strong> de la tarjeta tienes además <strong>Imprimir vale</strong>, <strong>Enviar por WhatsApp</strong>, <strong>Enviar por email</strong>, <strong>Copiar el código</strong>, <strong>Ampliar la caducidad</strong>, <strong>Deshacer el último canje</strong> y <strong>Anular el vale</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Anular</strong> solo se puede si el vale no tiene ningún canje y su mes no está cerrado en Gestión Económica. Al anularlo se quita de la contabilidad. Un vale emitido <strong>nunca se borra</strong>: solo uno ya anulado puede eliminarse del todo (para corregir un error de tecleo).</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El TPV todavía no acepta un vale como forma de pago. Cuando alguien lo traiga, cobra la cuenta como siempre y pulsa <strong>Canjear</strong> aquí para descontarlo del saldo.</div>

<h4>Qué pasa en la contabilidad</h4>
<p>Cada vale emitido deja su apunte automático en Gestión Económica (pestaña Ventas, bloque <strong>Vales regalo</strong>):</p>
<ul>
<li>Un vale de <strong>Cantidad económica</strong> es un <em>polivalente</em>: es dinero cobrado por adelantado y el IVA se paga cuando lo gastan, en la venta del TPV.</li>
<li>Una <strong>Experiencia concreta</strong> es un <em>univalente</em>: su IVA se declara el día que lo vendes, no cuando lo canjean.</li>
<li>Los vales caducados dejan de contar como dinero pendiente.</li>
</ul>
<p>Tu gestor ve todo esto en el paquete que le envías desde Gestión Económica; la app no presenta nada por ti.</p>

<h4>Lo que conviene saber</h4>
<ul>
<li>Cualquier persona del equipo de Sala puede abrir y editar fichas. <strong>Fusionar</strong>, <strong>Eliminar</strong> y las acciones sobre vales (canjear, ampliar, deshacer, anular) son del propietario o de un empleado con permiso de edición; borrar datos por RGPD y eliminar piden además el PIN del negocio.</li>
<li>Todo se sincroniza con tu nube y también funciona sin conexión.</li>
<li>En el móvil, las tarjetas pasan a una por fila y las ventanas ocupan toda la pantalla.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>«Escribe nombre y apellidos»</strong>: la ficha necesita al menos dos palabras en el nombre.</li>
<li><strong>No puedo guardar, ya existe ese nombre</strong>: añade el segundo apellido o una inicial.</li>
<li><strong>No sale el icono de WhatsApp</strong>: el teléfono no parece un móvil (los fijos no abren WhatsApp) o está vacío.</li>
<li><strong>Un cliente habitual sale «En riesgo» y vino ayer</strong>: no debería. Esa etiqueta pide 14 días de ausencia como mínimo; revisa que no tenga ventas asignadas a otra ficha duplicada y fusiónalas.</li>
<li><strong>Un cliente no suma puntos</strong>: los puntos se suman al cobrar una venta que tiene un cliente asignado en el TPV. Si se cobró sin elegir cliente, no cuenta.</li>
<li><strong>No puedo anular un vale</strong>: ya tiene algún canje, o el mes en que se emitió está cerrado. Habla con tu gestor.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Aquí viuen les fitxes dels teus clients. Conèixer qui ja et visita és el més barat que hi ha per vendre més: tornar a portar un client costa molt menys que aconseguir-ne un de nou. La pantalla desa les seves dades, apunta sola el que gasta i cada quant ve, i t'avisa de qui se'n va, qui fa anys i qui té un premi esperant. També gestiona els <strong>vals regal</strong>.</p>
<p>És a la carpeta <strong>Sala</strong> (Sala → <strong>Clients</strong>).</p>

<h4>El primer que veus</h4>
<ul>
<li><strong>Quatre xifres a dalt</strong>: <strong>Clients</strong> (amb quants accepten novetats), <strong>Actius aquest mes</strong>, <strong>En risc</strong> i <strong>Premis per donar</strong>.</li>
<li><strong>Una targeta per client</strong>, de dues o tres per fila segons la pantalla. Cadascuna mostra el nom, fa quants dies va venir, les etiquetes (Nou, En risc, VIP, Al·lèrgies, no-shows, sense permís de màrqueting, vals pendents) i la barra de punts de fidelitat.</li>
<li><strong>Cercador</strong> (per nom, telèfon o email) i un desplegable <strong>Ordenar per</strong>: Nom, Última visita, Més visites (30 d), Major despesa (any) o Més punts.</li>
<li><strong>Filtres en fitxes, cadascun amb el seu compte</strong>: Tots, VIP, Nous, En risc, Inactius, Amb al·lèrgies, No-shows i Sense permís de màrqueting.</li>
</ul>
<p>Si hi ha molts clients es pinten de 60 en 60: prem <strong>Veure'n més</strong> al final de la llista.</p>

<h4>Donar d'alta un client, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Nou Client</strong> (a dalt a la dreta). S'obre la fitxa.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Escriu el <strong>Nom</strong> amb nom i cognoms (l'app no deixa desar amb una sola paraula, perquè dos «Joan» no es confonguin) i el <strong>Telèfon</strong>. Tots dos són obligatoris. L'email és opcional.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si vols, emplena <strong>Codi postal</strong>, <strong>Aniversari</strong>, <strong>Últim contacte</strong>, <strong>Al·lèrgies / preferències</strong> i <strong>Notes</strong>. El camp de notes és gran i creix a mesura que escrius: apunta el que vulguis («li agrada la taula del fons», «ve amb gos»).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Deixa marcada la casella <strong>Accepta rebre promocions i premis per WhatsApp/email</strong> només si el client t'ho ha dit. Desmarca-la si no vol (més avall s'explica què canvia).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Prem <strong>Desar</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Dos clients no poden tenir exactament el mateix nom: afegeix el segon cognom o una inicial. Si el telèfon o l'email ja existeixen en una altra fitxa, l'app t'avisa i pots continuar (pot ser algú de la mateixa casa). Si el telèfon té menys de 9 xifres o l'email sembla mal escrit, també et pregunta abans de desar.</div>
<p>Quan algú reserva o demana des de la web pública amb un telèfon que ja tens, la reserva o la comanda s'enllacen soles a la seva fitxa.</p>

<h4>La fitxa: tot del client en una sola finestra</h4>
<p>Tocar una targeta obre la <strong>fitxa sencera</strong>. A l'esquerra hi ha el que edites (dades, al·lèrgies, notes, permís de màrqueting). A la dreta, el que l'app ja sap d'ell:</p>
<ul>
<li><strong>D'un cop d'ull</strong>: Visites 30 dies, Visites any en curs, Tiquet mitjà, Total 30 dies, Total any en curs i Última visita; i etiquetes com el seu plat preferit, si fa anys d'aquí a menys de 30 dies o quants no-shows porta.</li>
<li><strong>Punts de fidelitat</strong> i els seus últims premis.</li>
<li><strong>Reserves properes</strong> (prem una per anar-hi) i els seus <strong>vals regal</strong>.</li>
</ul>
<p>A sota de la fitxa tens tres botons: <strong>Historial</strong>, <strong>Fusionar amb un altre client</strong> i <strong>Esborrar dades (RGPD)</strong>. En una fitxa nova encara no es veu res a la dreta: apareix en desar-la i en registrar la primera venda.</p>
<p>A cada targeta també hi ha una icona de <strong>WhatsApp</strong> i una altra d'<strong>email</strong> per escriure-li directament (la de WhatsApp només surt si el número és un mòbil; un fix no obre cap xat) i un menú <strong>⋯</strong> amb <strong>Obrir fitxa</strong>, <strong>Historial</strong>, <strong>Fusionar amb un altre client</strong> i <strong>Eliminar</strong>.</p>

<h4>Què signifiquen les etiquetes</h4>
<table>
<thead><tr><th>Etiqueta</th><th>Quan surt</th></tr></thead>
<tbody>
<tr><td><strong>Nou</strong></td><td>La primera visita va ser fa 30 dies o menys.</td></tr>
<tr><td><strong>VIP</strong></td><td>Té 7 o més punts de fidelitat.</td></tr>
<tr><td><strong>En risc</strong></td><td>Venia amb ritme i ha deixat de venir. Exigeix tres coses alhora: almenys 3 visites, més de 30 dies des de la primera i una absència més gran que el doble del seu interval habitual (i mai menys de 14 dies).</td></tr>
<tr><td><strong>Inactius</strong> (filtre)</td><td>Més de 60 dies sense venir, o cap visita encara.</td></tr>
<tr><td><strong>No-shows</strong></td><td>Ha deixat alguna taula buida sense avisar.</td></tr>
</tbody>
</table>
<p>Així, algú que ve cada dia i falta un no es marca com a «perdut». El que sí surt a «En risc» mereix una trucada o un missatge.</p>

<h4>Punts de fidelitat i premis</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada vegada que cobres al TPV una venda assignada a un client, suma <strong>1 punt</strong> (fins a 10). Si anul·les aquesta venda, el punt es resta.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En arribar a 10 apareix el botó <strong>Donar premi</strong> a la targeta i a la fitxa, i compta a «Premis per donar».</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria el premi. L'app et suggereix regalar-li el seu producte preferit; també pots triar del teu catàleg o escriure'n un altre. Prem <strong>Lliurar premi i reiniciar</strong>: el comptador torna a 0 i el premi queda apuntat.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">T'ofereix avisar-lo amb el missatge ja escrit, per WhatsApp / SMS o email.</div></div>
<p>El botó <strong>i</strong> al costat dels punts explica el sistema i, si ets propietari o tens permís d'edició, et deixa mantenir el teu <strong>catàleg de premis suggerits</strong>.</p>

<h4>L'historial d'un client</h4>
<p>És una pantalla pròpia, no una finestra damunt d'una altra: hi entres amb <strong>Historial</strong> i tornes amb <strong>Clients</strong>. A dalt veus les seves xifres i a sota una línia de temps amb tot el que és seu, que pots filtrar: <strong>Tot</strong>, <strong>Comandes</strong>, <strong>Reserves</strong>, <strong>Val regal</strong> i <strong>Premis</strong>. El botó <strong>Fitxa</strong> et porta de tornada a les seves dades.</p>

<h4>Fusionar duplicats</h4>
<p>Si un mateix client té dues fitxes, obre'n una i prem <strong>Fusionar amb un altre client</strong>. Escriu el nom de la fitxa duplicada i confirma. La que triïs desapareix i tot passa a la fitxa que conserves: se sumen els punts (màxim 10), l'historial, les vendes, les reserves i els vals; les al·lèrgies, l'email, el codi postal i l'aniversari s'omplen només si faltaven, i les notes s'ajunten. La fitxa eliminada es queda 30 dies a la paperera. Fusionar és cosa del propietari o d'un empleat amb permís d'edició.</p>

<h4>Eliminar un client i el dret a l'oblit</h4>
<ul>
<li><strong>Eliminar</strong> (menú ⋯) demana el PIN del negoci. Les seves vendes i reserves no es perden: només es desvinculen. Es pot recuperar des de la paperera durant 30 dies i, en restaurar-lo, s'enllaça de nou tot el seu historial.</li>
<li><strong>Esborrar dades (RGPD)</strong> (a la fitxa) és per quan un client demana que oblidis les seves dades. Demana el PIN del negoci, <strong>esborra a l'instant i per sempre</strong> el seu nom, telèfon, email, al·lèrgies, notes, codi postal i aniversari, i retira el seu permís de màrqueting. Només queda un registre anònim («Client (dades eliminades)») perquè les vendes i reserves passades segueixin quadrant. No es pot desfer ni passa per la paperera.</li>
</ul>

<h4>Permís de màrqueting</h4>
<p>La casella de la fitxa mana: qui no la tingui marcada <strong>no apareix</strong> a la pestanya Clients de Promoció ni rep Novetats. Ho veus amb el filtre <strong>Sense permís de màrqueting</strong> i amb una petita icona de correu ratllat a la targeta. Si algú respon «BAIXA» a una novetat, se li treu el permís (Promoció → Novetats → <strong>Registrar una baixa</strong>).</p>

<h4>Vals regal</h4>
<p>Un val regal és diners (o una experiència concreta) que algú paga ara i una altra persona gasta després. Es gestiona des d'aquesta mateixa pantalla amb dos botons de la barra superior: <strong>Val regal</strong> (per emetre) i <strong>Historial de vals</strong>.</p>
<h4>Emetre un val</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Val regal</strong>. Tria el <strong>Tipus de val</strong>: <strong>Quantitat econòmica</strong> (diners per gastar en el que vulguin) o <strong>Experiència concreta</strong> (per exemple «sopar per a dos»).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Posa l'import. En una experiència, escriu què és, el <strong>preu cobrat (amb IVA)</strong> i l'IVA (4, 10 o 21 %).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Si vols, tria el <strong>Client</strong> que el compra i escriu el nom que anirà al val (<strong>Per a</strong>). Per defecte val <strong>un any</strong>: canvia <strong>Vàlid fins</strong> o marca <strong>Sense data de caducitat</strong>.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Prem <strong>Emetre val</strong>. Surt una finestra amb el seu codi (del tipus VR-ABC123) i tres botons: <strong>Imprimir val</strong>, <strong>WhatsApp</strong> i <strong>Email</strong> (s'activen si el client té mòbil o correu).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>El codi és curt a propòsit: es pot llegir per telèfon o escriure a mà en un val de paper. Cobra el val amb la teva forma de pagament habitual (caixa, datàfon, transferència): l'app l'anota com a diners cobrats per avançat.</div>

<h4>Estats d'un val</h4>
<table>
<thead><tr><th>Estat</th><th>Què significa</th></tr></thead>
<tbody>
<tr><td><strong>Pendent</strong></td><td>Emès i sense usar.</td></tr>
<tr><td><strong>Bescanvi parcial</strong></td><td>S'ha gastat una part; a la targeta veus quant <strong>Queden</strong>.</td></tr>
<tr><td><strong>Bescanviat</strong></td><td>Gastat sencer.</td></tr>
<tr><td><strong>Caducat</strong></td><td>Va passar la data sense gastar-se.</td></tr>
<tr><td><strong>Anul·lat</strong></td><td>Va deixar de valer.</td></tr>
</tbody>
</table>

<h4>L'Historial de vals</h4>
<p>Prem <strong>Historial de vals</strong> per obrir-ne la pantalla (amb <strong>Clients</strong> per tornar). A dalt, quatre xifres: <strong>Per bescanviar</strong> (diners que encara et poden reclamar), <strong>Emès aquest any</strong>, <strong>Bescanviat aquest any</strong> i <strong>Caduquen en 30 dies</strong>. A sota, un cercador per codi o nom i filtres per estat: Tots, Pendents, Bescanvi parcial, Bescanviats, Caducats i Anul·lats.</p>
<p>Cada val és una targeta amb el codi, l'estat, l'import, la data d'emissió i de caducitat (en vermell si caduca aviat). Si hi ha vals d'abans d'aquesta versió sense anotar a la comptabilitat, un avís vermell et deixa anotar-los d'un cop.</p>
<h4>Bescanviar, ampliar, desfer i anul·lar</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Bescanviar</strong>: prem el botó a la targeta. En un val de diners tries l'<strong>Import que es bescanvia</strong> (pot ser menys que el saldo: queda un bescanvi parcial) i una <strong>Nota</strong> opcional («Taula 4»). Un val d'experiència es bescanvia sencer. Si el val està caducat, la finestra t'ho avisa.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Al menú <strong>⋯</strong> de la targeta tens a més <strong>Imprimir val</strong>, <strong>Enviar per WhatsApp</strong>, <strong>Enviar per email</strong>, <strong>Copiar el codi</strong>, <strong>Ampliar la caducitat</strong>, <strong>Desfer l'últim bescanvi</strong> i <strong>Anul·lar el val</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Anul·lar</strong> només es pot si el val no té cap bescanvi i el seu mes no està tancat a Gestió Econòmica. En anul·lar-lo se'n treu de la comptabilitat. Un val emès <strong>mai s'esborra</strong>: només un d'anul·lat es pot eliminar del tot (per corregir un error de teclat).</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El TPV encara no accepta un val com a forma de pagament. Quan algú el porti, cobra el compte com sempre i prem <strong>Bescanviar</strong> aquí per descomptar-lo del saldo.</div>

<h4>Què passa a la comptabilitat</h4>
<p>Cada val emès deixa el seu apunt automàtic a Gestió Econòmica (pestanya Vendes, bloc <strong>Vals regal</strong>):</p>
<ul>
<li>Un val de <strong>Quantitat econòmica</strong> és un <em>polivalent</em>: són diners cobrats per avançat i l'IVA es paga quan els gasten, a la venda del TPV.</li>
<li>Una <strong>Experiència concreta</strong> és un <em>univalent</em>: el seu IVA es declara el dia que el vens, no quan el bescanvien.</li>
<li>Els vals caducats deixen de comptar com a diners pendents.</li>
</ul>
<p>El teu gestor ho veu tot al paquet que li envies des de Gestió Econòmica; l'app no presenta res per tu.</p>

<h4>El que convé saber</h4>
<ul>
<li>Qualsevol persona de l'equip de Sala pot obrir i editar fitxes. <strong>Fusionar</strong>, <strong>Eliminar</strong> i les accions sobre vals (bescanviar, ampliar, desfer, anul·lar) són del propietari o d'un empleat amb permís d'edició; esborrar dades per RGPD i eliminar demanen a més el PIN del negoci.</li>
<li>Tot se sincronitza amb el teu núvol i també funciona sense connexió.</li>
<li>Al mòbil, les targetes passen a una per fila i les finestres ocupen tota la pantalla.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>«Escriu nom i cognoms»</strong>: la fitxa necessita almenys dues paraules al nom.</li>
<li><strong>No puc desar, ja existeix aquest nom</strong>: afegeix el segon cognom o una inicial.</li>
<li><strong>No surt la icona de WhatsApp</strong>: el telèfon no sembla un mòbil (els fixos no obren WhatsApp) o és buit.</li>
<li><strong>Un client habitual surt «En risc» i va venir ahir</strong>: no hauria de ser. Aquesta etiqueta demana 14 dies d'absència com a mínim; revisa que no tingui vendes assignades a una altra fitxa duplicada i fusiona-les.</li>
<li><strong>Un client no suma punts</strong>: els punts se sumen en cobrar una venda que té un client assignat al TPV. Si es va cobrar sense triar client, no compta.</li>
<li><strong>No puc anul·lar un val</strong>: ja té algun bescanvi, o el mes en què es va emetre està tancat. Parla amb el teu gestor.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>This is where your customer records live. Knowing the people who already visit you is the cheapest way to sell more: bringing a customer back costs far less than winning a new one. The screen stores their details, records on its own what they spend and how often they come, and tells you who is drifting away, whose birthday is coming and who has a reward waiting. It also manages <strong>gift vouchers</strong>.</p>
<p>It lives in the <strong>Dining Room</strong> folder (Dining Room → <strong>Customers</strong>).</p>

<h4>What you see first</h4>
<ul>
<li><strong>Four figures at the top</strong>: <strong>Customers</strong> (with how many accept news), <strong>Active this month</strong>, <strong>At risk</strong> and <strong>Rewards to give</strong>.</li>
<li><strong>One card per customer</strong>, two or three per row depending on the screen. Each shows their name, how many days ago they came, their tags (New, At risk, VIP, Allergies, no-shows, no marketing consent, pending vouchers) and their loyalty points bar.</li>
<li><strong>Search</strong> (by name, phone or email) and a <strong>Sort by</strong> drop-down: Name, Last visit, Most visits (30 d), Highest spend (year) or Most points.</li>
<li><strong>Filter chips, each with its count</strong>: All, VIP, New, At risk, Inactive, With allergies, No-shows and No marketing consent.</li>
</ul>
<p>With many customers the list loads 60 at a time: press <strong>Show more</strong> at the end.</p>

<h4>Adding a customer, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>New Client</strong> (top right). The customer card opens.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Type the <strong>Name</strong> with first and last name (the app won't save a single word, so two "Johns" don't get mixed up) and the <strong>Phone</strong>. Both are required. Email is optional.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">If you like, fill in <strong>Postal code</strong>, <strong>Birthday</strong>, <strong>Last contact</strong>, <strong>Allergies / preferences</strong> and <strong>Notes</strong>. The notes box is large and grows as you type: write whatever helps ("likes the back table", "comes with a dog").</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Leave <strong>Accepts promotions and rewards by WhatsApp/email</strong> ticked only if the customer told you so. Untick it if they don't want them (more on what changes below).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Press <strong>Save</strong>.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Two customers can't have exactly the same name: add a second surname or an initial. If the phone or email already exists on another card, the app warns you and you can carry on (it may be someone in the same household). If the phone has fewer than 9 digits or the email looks mistyped, it also asks before saving.</div>
<p>When someone books or orders from the public website with a phone number you already have, the booking or order links itself to their card.</p>

<h4>The card: everything about the customer in one window</h4>
<p>Tapping a card opens the <strong>full customer card</strong>. On the left is what you edit (details, allergies, notes, marketing consent). On the right, what the app already knows about them:</p>
<ul>
<li><strong>At a glance</strong>: Visits last 30 days, Visits this year, Avg. ticket, Total last 30 days, Total this year and Last visit; plus tags such as their favourite dish, whether their birthday is within 30 days, or how many no-shows they have.</li>
<li><strong>Loyalty points</strong> and their latest rewards.</li>
<li><strong>Upcoming bookings</strong> (tap one to jump to it) and their <strong>gift vouchers</strong>.</li>
</ul>
<p>At the bottom of the card are three buttons: <strong>History</strong>, <strong>Merge with another customer</strong> and <strong>Erase data (GDPR)</strong>. A brand-new card shows nothing on the right yet: it fills in once you save it and log their first sale.</p>
<p>Each tile also has a <strong>WhatsApp</strong> icon and an <strong>email</strong> icon to write to them directly (WhatsApp only appears if the number is a mobile; a landline won't open a chat) and a <strong>⋯</strong> menu with <strong>Open card</strong>, <strong>History</strong>, <strong>Merge with another customer</strong> and <strong>Delete</strong>.</p>

<h4>What the tags mean</h4>
<table>
<thead><tr><th>Tag</th><th>When it appears</th></tr></thead>
<tbody>
<tr><td><strong>New</strong></td><td>Their first visit was 30 days ago or less.</td></tr>
<tr><td><strong>VIP</strong></td><td>They have 7 or more loyalty points.</td></tr>
<tr><td><strong>At risk</strong></td><td>They used to come regularly and have stopped. It needs three things at once: at least 3 visits, more than 30 days since the first one, and an absence longer than double their usual interval (and never under 14 days).</td></tr>
<tr><td><strong>Inactive</strong> (filter)</td><td>More than 60 days without coming, or no visit yet.</td></tr>
<tr><td><strong>No-shows</strong></td><td>They have left a table empty without warning.</td></tr>
</tbody>
</table>
<p>So someone who comes every day and misses one isn't marked as "lost". Whoever does appear under "At risk" deserves a call or a message.</p>

<h4>Loyalty points and rewards</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Every time you take payment at the POS for a sale assigned to a customer, they get <strong>1 point</strong> (up to 10). If you cancel that sale, the point is taken back.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">At 10, the <strong>Give reward</strong> button appears on their tile and card, and they count under "Rewards to give".</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Choose the reward. The app suggests giving their favourite product; you can also pick from your catalogue or write another. Press <strong>Give reward and reset</strong>: the counter goes back to 0 and the reward is logged.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">It then offers to tell them with a ready-written message, by WhatsApp / SMS or email.</div></div>
<p>The <strong>i</strong> button next to the points explains the system and, if you are the owner or have edit permission, lets you maintain your <strong>suggested rewards catalogue</strong>.</p>

<h4>A customer's history</h4>
<p>It's a screen of its own, not a window on top of another: open it with <strong>History</strong> and come back with <strong>Customers</strong>. At the top you see their figures and below it a timeline of everything about them, which you can filter: <strong>All</strong>, <strong>Orders</strong>, <strong>Bookings</strong>, <strong>Gift voucher</strong> and <strong>Rewards</strong>. The <strong>Card</strong> button takes you back to their details.</p>

<h4>Merging duplicates</h4>
<p>If one customer has two cards, open one and press <strong>Merge with another customer</strong>. Type the name of the duplicate card and confirm. The one you pick disappears and everything moves to the card you keep: points are added (maximum 10), history, sales, bookings and vouchers; allergies, email, postal code and birthday are filled in only if they were missing, and the notes are joined together. The removed card stays 30 days in the recycle bin. Merging is for the owner or an employee with edit permission.</p>

<h4>Deleting a customer and the right to be forgotten</h4>
<ul>
<li><strong>Delete</strong> (⋯ menu) asks for the business PIN. Their sales and bookings are not lost: they are only unlinked. You can recover them from the recycle bin for 30 days and, when restored, their whole history is linked back.</li>
<li><strong>Erase data (GDPR)</strong> (on the card) is for when a customer asks you to forget their data. It asks for the business PIN and <strong>erases immediately and permanently</strong> their name, phone, email, allergies, notes, postal code and birthday, and withdraws their marketing consent. Only an anonymous record ("Customer (data erased)") stays so past sales and bookings still add up. It can't be undone and doesn't go through the recycle bin.</li>
</ul>

<h4>Marketing consent</h4>
<p>The tick box on the card rules: anyone without it ticked <strong>doesn't appear</strong> in the Customers tab of Promotion and doesn't receive News. You can see them with the <strong>No marketing consent</strong> filter and a small crossed-out mail icon on their tile. If someone replies "UNSUBSCRIBE" to a message, their consent is removed (Promotion → News → <strong>Record an opt-out</strong>).</p>

<h4>Gift vouchers</h4>
<p>A gift voucher is money (or a specific experience) that someone pays for now and another person spends later. It's managed from this same screen with two buttons in the top bar: <strong>Gift voucher</strong> (to issue one) and <strong>Voucher history</strong>.</p>
<h4>Issuing a voucher</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>Gift voucher</strong>. Pick the <strong>Voucher type</strong>: <strong>Monetary amount</strong> (money to spend on anything) or <strong>Specific experience</strong> (for example "dinner for two").</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Enter the amount. For an experience, write what it is, the <strong>price charged (incl. VAT)</strong> and the VAT (4, 10 or 21 %).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">If you like, choose the <strong>Client</strong> who is buying it and type the name that goes on the voucher (<strong>For</strong>). By default it's valid for <strong>one year</strong>: change <strong>Valid until</strong> or tick <strong>No expiry date</strong>.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Press <strong>Issue voucher</strong>. A window shows its code (like VR-ABC123) and three buttons: <strong>Print voucher</strong>, <strong>WhatsApp</strong> and <strong>Email</strong> (enabled if the customer has a mobile or email).</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>The code is short on purpose: it can be read over the phone or written by hand on a paper voucher. Take the payment for the voucher the way you usually do (till, card machine, transfer): the app records it as money collected in advance.</div>

<h4>Voucher states</h4>
<table>
<thead><tr><th>State</th><th>What it means</th></tr></thead>
<tbody>
<tr><td><strong>Pending</strong></td><td>Issued and unused.</td></tr>
<tr><td><strong>Partly redeemed</strong></td><td>Part has been spent; the tile shows how much is <strong>Left</strong>.</td></tr>
<tr><td><strong>Redeemed</strong></td><td>Spent in full.</td></tr>
<tr><td><strong>Expired</strong></td><td>Its date passed without being spent.</td></tr>
<tr><td><strong>Voided</strong></td><td>No longer valid.</td></tr>
</tbody>
</table>

<h4>Voucher history</h4>
<p>Press <strong>Voucher history</strong> to open its screen (with <strong>Customers</strong> to go back). At the top, four figures: <strong>To redeem</strong> (money they can still claim from you), <strong>Issued this year</strong>, <strong>Redeemed this year</strong> and <strong>Expire in 30 days</strong>. Below, a search by code or name and filters by state: All, Pending, Partly redeemed, Redeemed, Expired and Voided.</p>
<p>Each voucher is a tile with its code, state, amount, issue date and expiry (in red if it expires soon). If there are vouchers from before this version not yet recorded in the accounts, a red notice lets you record them all at once.</p>
<h4>Redeeming, extending, undoing and voiding</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Redeem</strong>: press the button on the tile. For a money voucher you choose the <strong>Amount redeemed</strong> (it can be less than the balance: that leaves a partial redemption) and an optional <strong>Note</strong> ("Table 4"). An experience voucher is redeemed in full. If the voucher has expired, the window warns you.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">In the tile's <strong>⋯</strong> menu you also have <strong>Print voucher</strong>, <strong>Send by WhatsApp</strong>, <strong>Send by email</strong>, <strong>Copy the code</strong>, <strong>Extend expiry</strong>, <strong>Undo the last redemption</strong> and <strong>Void the voucher</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Void</strong> only works if the voucher has no redemptions and its month isn't closed in Financial Management. Voiding removes it from the accounts. An issued voucher is <strong>never deleted</strong>: only one that is already voided can be removed entirely (to fix a typing mistake).</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The POS doesn't accept a voucher as a payment method yet. When someone brings one, take payment as usual and press <strong>Redeem</strong> here to deduct it from the balance.</div>

<h4>What happens in the accounts</h4>
<p>Every voucher you issue leaves an automatic entry in Financial Management (Sales tab, <strong>Gift vouchers</strong> block):</p>
<ul>
<li>A <strong>Monetary amount</strong> voucher is a <em>multi-purpose</em> voucher: it's money collected in advance and the VAT is paid when it is spent, on the POS sale.</li>
<li>A <strong>Specific experience</strong> is a <em>single-purpose</em> voucher: its VAT is declared the day you sell it, not when it is redeemed.</li>
<li>Expired vouchers stop counting as pending money.</li>
</ul>
<p>Your accountant sees all this in the package you send from Financial Management; the app files nothing for you.</p>

<h4>Good to know</h4>
<ul>
<li>Anyone on the Dining Room team can open and edit cards. <strong>Merge</strong>, <strong>Delete</strong> and the voucher actions (redeem, extend, undo, void) are for the owner or an employee with edit permission; erasing data under GDPR and deleting also ask for the business PIN.</li>
<li>Everything syncs with your cloud and also works offline.</li>
<li>On mobile, tiles go to one per row and windows take the whole screen.</li>
</ul>

<h4>If something doesn't work</h4>
<ul>
<li><strong>"Enter first and last name"</strong>: the card needs at least two words in the name.</li>
<li><strong>I can't save, that name already exists</strong>: add a second surname or an initial.</li>
<li><strong>The WhatsApp icon is missing</strong>: the phone doesn't look like a mobile (landlines don't open WhatsApp) or is empty.</li>
<li><strong>A regular shows "At risk" and came yesterday</strong>: it shouldn't. That tag needs at least 14 days' absence; check they don't have sales assigned to another duplicate card and merge them.</li>
<li><strong>A customer isn't earning points</strong>: points are added when you take payment for a sale that has a customer assigned in the POS. If it was paid without choosing a customer, it doesn't count.</li>
<li><strong>I can't void a voucher</strong>: it already has a redemption, or the month it was issued in is closed. Talk to your accountant.</li>
</ul>
`}
  },
  {id:'promocion', area:'sala',
    title:{es:`<i class="ti ti-speakerphone"></i> Promoción`, ca:`<i class="ti ti-speakerphone"></i> Promoció`, en:`<i class="ti ti-speakerphone"></i> Promotion`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Promoción es el calendario de marketing de tu negocio: qué acción hacer, qué día y quién es responsable. Además, una acción puede <strong>rebajar el precio de verdad en el TPV</strong>, y desde aquí puedes escribir a tus clientes por email y WhatsApp. Está en la carpeta <strong>Sala</strong> (Sala → <strong>Promoción</strong>).</p>
<p>Tiene seis pestañas: <strong>Día</strong>, <strong>Semana</strong>, <strong>Mes</strong>, <strong>Novedades</strong>, <strong>Clientes</strong> e <strong>Ideas de contenido</strong>. Arriba también tienes accesos directos a tus redes (Instagram, Facebook, TikTok, Google Maps) si las rellenaste en Mi Negocio → Redes sociales.</p>

<h4>Crear una acción, paso a paso</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">En Día, Semana o Mes pulsa <strong>Nueva Acción</strong> (en la vista Semana, también el «+» de cada día).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En <strong>Qué vas a hacer</strong> pon un <strong>Título</strong> («Responder reseñas», «Happy hour de cañas») y, si quieres, una <strong>Descripción</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En <strong>Cuándo y quién</strong> elige la <strong>Fecha</strong> y el <strong>Responsable</strong> (personal de Sala). Marca <strong>Se repite cada semana</strong> para un 2x1 de todos los martes; puedes poner <strong>Se repite hasta</strong> para una promo de temporada.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si quieres que rebaje el precio, marca <strong>Aplica un descuento real en el TPV</strong> (siguiente apartado). Pulsa <strong>Guardar</strong>.</div></div>
<p>Si ya existe otra igual ese día con el mismo responsable, la app te avisa antes de duplicarla.</p>

<h4>Descuento real en el TPV</h4>
<ul>
<li>Elige el <strong>Plato o bebida</strong> (la lista separa Platos y Bebidas) y el <strong>Descuento (%)</strong>. Debajo ves el antes y el después: «En carta: 12,00 € → 9,60 €».</li>
<li>Opcional: <strong>Desde</strong> y <strong>Hasta</strong> (hora) para limitarlo a una franja, como un happy hour de 18:00 a 20:00 (rellena las dos o ninguna), y <strong>Límite de usos por día</strong>: al llegar a ese número, el plato vuelve a su precio normal.</li>
<li>Ese día (y esa franja), al añadir el artículo en una comanda, el TPV aplica el precio rebajado solo. La carta online de tu web de reservas y pedidos también lo muestra rebajado.</li>
<li>Si dos descuentos se pisan sobre el mismo plato y horario, la app te avisa para que decidas cuál conservar.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Una acción con descuento tiene el botón <strong>Anunciar a clientes</strong>: te lleva a Novedades con el mensaje ya escrito.</div>

<h4>Día, Semana y Mes</h4>
<ul>
<li><strong>Día</strong>: cifras (acciones del día, completadas, descuento concedido en caja, próximos 7 días), flechas para cambiar de día, y una tarjeta por acción con su casilla de <strong>hecha</strong> (queda la hora). Filtra por responsable y por estado (Todos, Pendientes, Hechas). El menú <strong>⋯</strong> de cada tarjeta: <strong>Editar</strong>, <strong>Duplicar al día siguiente</strong> y <strong>Eliminar</strong>.</li>
<li><strong>Semana</strong>: siete columnas con las acciones de cada día; tocar la cabecera de un día abre esa jornada.</li>
<li><strong>Mes</strong>: calendario con el selector de periodo «‹ mes año ▾ ›» (al abrirlo ves cuántas acciones tiene cada mes) y el botón <strong>Imprimir</strong> para repasar el plan en una reunión.</li>
</ul>

<h4>Novedades: escribir a tus clientes</h4>
<p>Solo la ven el propietario y quien tenga permiso de edición, porque usa los datos de contacto de los clientes. <strong>No hay servidor de correo ni WhatsApp de por medio</strong>: el mensaje sale de TU correo y de TU WhatsApp, y la app lo prepara todo. Arriba, <strong>Nueva novedad</strong>, <strong>Enviadas y borradores</strong> y <strong>Registrar una baja</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>A quién se la envías</strong>: Todos, Habituales, Nuevos, Hace tiempo que no vienen, En riesgo, Cumpleaños este mes, Mejores clientes (el 20 % que más gastó este año), Por código postal o Elegir uno a uno. Cada botón dice cuántos son, y debajo ves cuántos tienen email válido y cuántos móvil. <strong>Ver destinatarios</strong> te deja desmarcar a quien no quieras. Nunca llega a quien retiró su permiso de marketing.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Sobre qué es</strong>: elige un tema (Plato o bebida nuevo, Promoción u oferta, Evento, Menú, Cambio de horario, Vacaciones, Volvemos a abrir, Fecha señalada, Grupos, Gracias…) y te deja el texto escrito, o elige <strong>Escribir el mío</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>El mensaje</strong>: Asunto, Titular y Texto (usa <strong>{nombre}</strong> y <strong>{negocio}</strong>), un recuadro de oferta opcional (título, condiciones, código, fecha), un botón (Reservar mesa, Hacer un pedido, Ver la carta, Llamar, Cómo llegar u otro enlace), una imagen por enlace https y tu logo. A la derecha, la <strong>vista previa</strong> en Email, Móvil o WhatsApp.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Lo que va entre [corchetes] hay que rellenarlo. La app te avisa antes de copiar o enviar si queda alguno sin cambiar.</div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Enviar</strong>: elige <strong>Email</strong> o <strong>WhatsApp</strong>. Es una guía con pasos que se marcan como hechos.</div></div>
<h4>Guía de email (modo «Paso a paso»)</h4>
<ol>
<li>Abre tu correo (<strong>Gmail</strong>, <strong>Outlook</strong> o <strong>Mi programa de correo</strong>) y crea un mensaje nuevo.</li>
<li><strong>Copiar asunto</strong> y pégalo en «Asunto».</li>
<li><strong>Copiar destinatarios</strong> y pégalos en <strong>CCO</strong> (copia oculta), nunca en «Para»: así nadie ve el correo de los demás. Se reparte en <strong>lotes</strong> de 25, 50 o 100 (Gmail gratuito admite unos 500 envíos al día).</li>
<li><strong>Copiar el mensaje con diseño</strong> y pégalo en el cuerpo (o «Solo el texto»).</li>
<li>Opcional: adjunta fotos o vídeos (un vídeo pesado, mejor como enlace).</li>
<li>Envía desde tu correo y pulsa <strong>Ya lo he enviado</strong>; si hay más lotes, <strong>Siguiente lote</strong>.</li>
</ol>
<p>En <strong>Más opciones</strong>: <strong>Enviarme una prueba</strong>, <strong>Descargar borrador (.eml)</strong> (se abre ya maquetado en Outlook de escritorio, Apple Mail o Thunderbird) y <strong>Descargar HTML</strong>. El modo <strong>Uno a uno</strong> abre un correo de texto por cliente, con su nombre.</p>
<h4>Guía de WhatsApp (modo «Lista de difusión»)</h4>
<ol>
<li>En el móvil, mejor con WhatsApp Business: Chats → menú ⋮ → «Nueva difusión» (iPhone: «Listas de difusión» → «Nueva lista»). Las listas se crean en el móvil, no en WhatsApp Web.</li>
<li>Tus clientes tienen que estar en tu agenda: <strong>Descargar agenda (.vcf)</strong> y ábrela desde el móvil, o <strong>Copiar nombres y teléfonos</strong>.</li>
<li>Añádelos a la lista (hasta 256 por lista: se reparte en lotes) y <strong>Copiar nombre de la lista</strong>.</li>
<li><strong>Copiar el mensaje</strong> (sin nombre) y pégalo en el chat de la lista; opcionalmente fotos o vídeos.</li>
<li>Envía y marca el lote.</li>
</ol>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Una lista de difusión solo llega a quien tiene tu número guardado en su agenda. En modo <strong>Uno a uno</strong>, cada botón abre WhatsApp con el mensaje y el nombre de ese cliente; tú solo pulsas enviar. Los fijos no cuentan: WhatsApp no los abre.</div>
<h4>Bajas, historial y base legal</h4>
<ul>
<li>Cada email lleva el aviso de baja y tus datos como responsable. Si alguien responde BAJA, pulsa <strong>Registrar una baja</strong>, búscalo y pulsa <strong>Dar de baja</strong>: pierde el permiso y desaparece de todas las listas.</li>
<li>En <strong>Enviadas y borradores</strong> ves cada novedad con su tema, su público y cuántos email/WhatsApp se marcaron como enviados. Desde su menú ⋯ puedes <strong>Usar como base de una nueva</strong> o eliminarla.</li>
</ul>

<h4>Clientes: acciones rápidas de fidelización</h4>
<p>Mensajes ya escritos (los puedes editar antes de enviar) para cuatro momentos: <strong>Próximos cumpleaños (30 días)</strong>, <strong>Visitas recientes — pedir reseña</strong> (con el enlace de Google si lo pusiste en Mi Negocio), <strong>Clientes que hace tiempo no vienen</strong> y la <strong>Encuesta de satisfacción (privada)</strong>. Cada tarjeta tiene <strong>WhatsApp</strong> y <strong>Email</strong>; la ventana del mensaje deja además <strong>Copiar</strong>. El menú ⋯ ofrece <strong>Registrar como acción</strong>, que lo apunta en el calendario ya hecho. En los inactivos, <strong>Escribirles a todos</strong> te lleva a Novedades con ese público. Solo salen clientes con permiso de marketing.</p>
<p>Arriba hay cuatro cifras (cumpleaños, visitas recientes, inactivos y NPS), el resumen de la encuesta con los últimos comentarios y «¿Cómo te conocieron?» de los últimos 90 días.</p>

<h4>Ideas de contenido</h4>
<p>Una biblioteca de ideas para redes y gestión online, por categorías (incluidas «Google Business y reseñas» y gestión de redes, que son tareas de mantenimiento reales). Usa el buscador, entra en una categoría y pulsa <strong>Crear acción</strong>; la idea queda marcada como usada. <strong>Sorpréndeme (idea rápida para hoy)</strong> te propone una al azar.</p>

<h4>Lo que conviene saber</h4>
<ul>
<li>Crear, editar, duplicar y eliminar acciones, Novedades y las ideas son del propietario o de un empleado con permiso de edición. Cualquier empleado de Sala puede ver el calendario y marcar acciones como hechas.</li>
<li>Una acción semanal se marca hecha día a día, no para siempre.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li><strong>El descuento no se aplica en el TPV</strong>: revisa fecha (o que sea semanal y no haya terminado), franja horaria y que no haya llegado al límite de usos.</li>
<li><strong>No puedo escribir a un cliente por WhatsApp</strong>: el teléfono no parece un móvil.</li>
<li><strong>No veo la pestaña Novedades</strong>: es solo para el propietario o con permiso de edición.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Promoció és el calendari de màrqueting del teu negoci: quina acció fer, quin dia i qui n'és responsable. A més, una acció pot <strong>rebaixar el preu de veritat al TPV</strong>, i des d'aquí pots escriure als teus clients per email i WhatsApp. És a la carpeta <strong>Sala</strong> (Sala → <strong>Promoció</strong>).</p>
<p>Té sis pestanyes: <strong>Dia</strong>, <strong>Setmana</strong>, <strong>Mes</strong>, <strong>Novetats</strong>, <strong>Clients</strong> i <strong>Idees de contingut</strong>. A dalt també tens accessos directes a les teves xarxes (Instagram, Facebook, TikTok, Google Maps) si les vas emplenar a El Meu Negoci → Xarxes socials.</p>

<h4>Crear una acció, pas a pas</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">A Dia, Setmana o Mes prem <strong>Nova Acció</strong> (a la vista Setmana, també el «+» de cada dia).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A <strong>Què faràs</strong> posa un <strong>Títol</strong> («Respondre ressenyes», «Happy hour de canyes») i, si vols, una <strong>Descripció</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A <strong>Quan i qui</strong> tria la <strong>Data</strong> i el <strong>Responsable</strong> (personal de Sala). Marca <strong>Es repeteix cada setmana</strong> per a un 2x1 de tots els dimarts; pots posar <strong>Es repeteix fins</strong> per a una promo de temporada.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si vols que rebaixi el preu, marca <strong>Aplica un descompte real al TPV</strong> (apartat següent). Prem <strong>Desar</strong>.</div></div>
<p>Si ja n'hi ha una d'igual aquell dia amb el mateix responsable, l'app t'avisa abans de duplicar-la.</p>

<h4>Descompte real al TPV</h4>
<ul>
<li>Tria el <strong>Plat o beguda</strong> (la llista separa Plats i Begudes) i el <strong>Descompte (%)</strong>. A sota veus l'abans i el després: «A la carta: 12,00 € → 9,60 €».</li>
<li>Opcional: <strong>Des de</strong> i <strong>Fins a</strong> (hora) per limitar-ho a una franja, com un happy hour de 18:00 a 20:00 (omple les dues o cap), i <strong>Límit d'usos per dia</strong>: en arribar a aquest nombre, el plat torna al seu preu normal.</li>
<li>Aquell dia (i aquella franja), en afegir l'article a una comanda, el TPV aplica el preu rebaixat sol. La carta en línia de la teva web de reserves i comandes també ho mostra rebaixat.</li>
<li>Si dos descomptes es trepitgen sobre el mateix plat i horari, l'app t'avisa perquè decideixis quin conservar.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Una acció amb descompte té el botó <strong>Anunciar als clients</strong>: et porta a Novetats amb el missatge ja escrit.</div>

<h4>Dia, Setmana i Mes</h4>
<ul>
<li><strong>Dia</strong>: xifres (accions del dia, completades, descompte concedit a caixa, propers 7 dies), fletxes per canviar de dia, i una targeta per acció amb la seva casella de <strong>feta</strong> (queda l'hora). Filtra per responsable i per estat (Tots, Pendents, Fetes). El menú <strong>⋯</strong> de cada targeta: <strong>Editar</strong>, <strong>Duplicar al dia següent</strong> i <strong>Eliminar</strong>.</li>
<li><strong>Setmana</strong>: set columnes amb les accions de cada dia; tocar la capçalera d'un dia obre aquella jornada.</li>
<li><strong>Mes</strong>: calendari amb el selector de període «‹ mes any ▾ ›» (en obrir-lo veus quantes accions té cada mes) i el botó <strong>Imprimir</strong> per repassar el pla en una reunió.</li>
</ul>

<h4>Novetats: escriure als teus clients</h4>
<p>Només la veuen el propietari i qui tingui permís d'edició, perquè fa servir les dades de contacte dels clients. <strong>No hi ha servidor de correu ni WhatsApp pel mig</strong>: el missatge surt del TEU correu i del TEU WhatsApp, i l'app ho prepara tot. A dalt, <strong>Nova novetat</strong>, <strong>Enviades i esborranys</strong> i <strong>Registrar una baixa</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>A qui l'envies</strong>: Tots, Habituals, Nous, Fa temps que no vénen, En risc, Aniversari aquest mes, Millors clients (el 20 % que més ha gastat aquest any), Per codi postal o Triar un a un. Cada botó diu quants són, i a sota veus quants tenen email vàlid i quants mòbil. <strong>Veure destinataris</strong> et deixa desmarcar qui no vulguis. Mai arriba a qui va retirar el permís de màrqueting.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>De què va</strong>: tria un tema (Plat o beguda nova, Promoció o oferta, Esdeveniment, Menú, Canvi d'horari, Vacances, Tornem a obrir, Data assenyalada, Grups, Gràcies…) i et deixa el text escrit, o tria <strong>Escriure el meu</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>El missatge</strong>: Assumpte, Titular i Text (usa <strong>{nombre}</strong> i <strong>{negocio}</strong>), un requadre d'oferta opcional (títol, condicions, codi, data), un botó (Reservar taula, Fer una comanda, Veure la carta, Trucar, Com arribar o un altre enllaç), una imatge per enllaç https i el teu logo. A la dreta, la <strong>vista prèvia</strong> en Email, Mòbil o WhatsApp.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El que va entre [claudàtors] cal emplenar-ho. L'app t'avisa abans de copiar o enviar si en queda algun sense canviar.</div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Enviar</strong>: tria <strong>Email</strong> o <strong>WhatsApp</strong>. És una guia amb passos que es marquen com a fets.</div></div>
<h4>Guia d'email (mode «Pas a pas»)</h4>
<ol>
<li>Obre el teu correu (<strong>Gmail</strong>, <strong>Outlook</strong> o <strong>El meu programa de correu</strong>) i crea un missatge nou.</li>
<li><strong>Copiar assumpte</strong> i enganxa'l a «Assumpte».</li>
<li><strong>Copiar destinataris</strong> i enganxa'ls a <strong>CCO</strong> (còpia oculta), mai a «Per a»: així ningú veu el correu dels altres. Es reparteix en <strong>lots</strong> de 25, 50 o 100 (Gmail gratuït admet uns 500 enviaments al dia).</li>
<li><strong>Copiar el missatge amb disseny</strong> i enganxa'l al cos (o «Només el text»).</li>
<li>Opcional: adjunta fotos o vídeos (un vídeo pesat, millor com a enllaç).</li>
<li>Envia des del teu correu i prem <strong>Ja l'he enviat</strong>; si hi ha més lots, <strong>Lot següent</strong>.</li>
</ol>
<p>A <strong>Més opcions</strong>: <strong>Enviar-me una prova</strong>, <strong>Descarregar esborrany (.eml)</strong> (s'obre ja maquetat a Outlook d'escriptori, Apple Mail o Thunderbird) i <strong>Descarregar HTML</strong>. El mode <strong>Un a un</strong> obre un correu de text per client, amb el seu nom.</p>
<h4>Guia de WhatsApp (mode «Llista de difusió»)</h4>
<ol>
<li>Al mòbil, millor amb WhatsApp Business: Xats → menú ⋮ → «Nova difusió» (iPhone: «Llistes de difusió» → «Nova llista»). Les llistes es creen al mòbil, no a WhatsApp Web.</li>
<li>Els teus clients han d'estar a la teva agenda: <strong>Descarregar agenda (.vcf)</strong> i obre-la des del mòbil, o <strong>Copiar noms i telèfons</strong>.</li>
<li>Afegeix-los a la llista (fins a 256 per llista: es reparteix en lots) i <strong>Copiar nom de la llista</strong>.</li>
<li><strong>Copiar el missatge</strong> (sense nom) i enganxa'l al xat de la llista; opcionalment fotos o vídeos.</li>
<li>Envia i marca el lot.</li>
</ol>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Una llista de difusió només arriba a qui té el teu número desat a l'agenda. En mode <strong>Un a un</strong>, cada botó obre WhatsApp amb el missatge i el nom d'aquell client; tu només prems enviar. Els fixos no compten: WhatsApp no els obre.</div>
<h4>Baixes, historial i base legal</h4>
<ul>
<li>Cada email porta l'avís de baixa i les teves dades com a responsable. Si algú respon BAIXA, prem <strong>Registrar una baixa</strong>, cerca'l i prem <strong>Donar de baixa</strong>: perd el permís i desapareix de totes les llistes.</li>
<li>A <strong>Enviades i esborranys</strong> veus cada novetat amb el tema, el públic i quants email/WhatsApp es van marcar com a enviats. Des del seu menú ⋯ pots <strong>Usar com a base d'una nova</strong> o eliminar-la.</li>
</ul>

<h4>Clients: accions ràpides de fidelització</h4>
<p>Missatges ja escrits (els pots editar abans d'enviar) per a quatre moments: <strong>Propers aniversaris (30 dies)</strong>, <strong>Visites recents — demanar ressenya</strong> (amb l'enllaç de Google si el vas posar a El Meu Negoci), <strong>Clients que fa temps que no vénen</strong> i l'<strong>Enquesta de satisfacció (privada)</strong>. Cada targeta té <strong>WhatsApp</strong> i <strong>Email</strong>; la finestra del missatge deixa a més <strong>Copiar</strong>. El menú ⋯ ofereix <strong>Registrar com a acció</strong>, que ho apunta al calendari ja fet. Als inactius, <strong>Escriure'ls a tots</strong> et porta a Novetats amb aquest públic. Només surten clients amb permís de màrqueting.</p>
<p>A dalt hi ha quatre xifres (aniversaris, visites recents, inactius i NPS), el resum de l'enquesta amb els últims comentaris i «Com et van conèixer?» dels últims 90 dies.</p>

<h4>Idees de contingut</h4>
<p>Una biblioteca d'idees per a xarxes i gestió en línia, per categories (incloses «Google Business i ressenyes» i gestió de xarxes, que són tasques de manteniment reals). Fes servir el cercador, entra en una categoria i prem <strong>Crear acció</strong>; la idea queda marcada com a usada. <strong>Sorprèn-me (idea ràpida per avui)</strong> te'n proposa una a l'atzar.</p>

<h4>El que convé saber</h4>
<ul>
<li>Crear, editar, duplicar i eliminar accions, Novetats i les idees són del propietari o d'un empleat amb permís d'edició. Qualsevol empleat de Sala pot veure el calendari i marcar accions com a fetes.</li>
<li>Una acció setmanal es marca feta dia a dia, no per sempre.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>El descompte no s'aplica al TPV</strong>: revisa data (o que sigui setmanal i no hagi acabat), franja horària i que no hagi arribat al límit d'usos.</li>
<li><strong>No puc escriure a un client per WhatsApp</strong>: el telèfon no sembla un mòbil.</li>
<li><strong>No veig la pestanya Novetats</strong>: és només per al propietari o amb permís d'edició.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>Promotion is your business's marketing calendar: which action to take, on which day and who is responsible. An action can also <strong>really lower the price at the POS</strong>, and from here you can write to your customers by email and WhatsApp. It's in the <strong>Dining Room</strong> folder (Dining Room → <strong>Promotion</strong>).</p>
<p>It has six tabs: <strong>Day</strong>, <strong>Week</strong>, <strong>Month</strong>, <strong>News</strong>, <strong>Customers</strong> and <strong>Content ideas</strong>. At the top you also have shortcuts to your social accounts (Instagram, Facebook, TikTok, Google Maps) if you filled them in under My Business → Social media.</p>

<h4>Creating an action, step by step</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">In Day, Week or Month press <strong>New Action</strong> (in the Week view, also the "+" on each day).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Under <strong>What you will do</strong> enter a <strong>Title</strong> ("Reply to reviews", "Beer happy hour") and, if you like, a <strong>Description</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Under <strong>When and who</strong> choose the <strong>Date</strong> and the <strong>Responsible</strong> person (Dining Room staff). Tick <strong>Repeats every week</strong> for a 2-for-1 every Tuesday; you can set <strong>Repeats until</strong> for a seasonal promo.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">If you want it to lower the price, tick <strong>Applies a real discount at the till</strong> (next section). Press <strong>Save</strong>.</div></div>
<p>If an identical one already exists that day with the same person responsible, the app warns you before duplicating.</p>

<h4>A real discount at the till</h4>
<ul>
<li>Pick the <strong>Dish or drink</strong> (the list separates Dishes and Drinks) and the <strong>Discount (%)</strong>. Below you see before and after: "On the menu: 12.00 € → 9.60 €".</li>
<li>Optional: <strong>From</strong> and <strong>To</strong> (time) to limit it to a slot, like a happy hour 6-8 pm (fill both or neither), and a <strong>Daily usage limit</strong>: once reached, the dish goes back to its normal price.</li>
<li>On that day (and slot), adding the item to an order makes the POS apply the lower price on its own. The online menu on your booking and ordering website shows it reduced too.</li>
<li>If two discounts overlap on the same dish and time, the app warns you so you can decide which to keep.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>An action with a discount has a <strong>Tell customers</strong> button: it takes you to News with the message already written.</div>

<h4>Day, Week and Month</h4>
<ul>
<li><strong>Day</strong>: figures (actions today, completed, discount given at the till, next 7 days), arrows to change day, and a tile per action with its <strong>done</strong> tick box (the time is kept). Filter by person responsible and by status (All, Pending, Done). Each tile's <strong>⋯</strong> menu: <strong>Edit</strong>, <strong>Duplicate to the next day</strong> and <strong>Delete</strong>.</li>
<li><strong>Week</strong>: seven columns with each day's actions; tapping a day's header opens that day.</li>
<li><strong>Month</strong>: a calendar with the "‹ month year ▾ ›" period picker (open it to see how many actions each month has) and a <strong>Print</strong> button to go over the plan in a meeting.</li>
</ul>

<h4>News: writing to your customers</h4>
<p>Only the owner and anyone with edit permission can see it, because it uses customers' contact details. <strong>There is no mail server or WhatsApp service in between</strong>: the message goes out from YOUR email and YOUR WhatsApp, and the app prepares everything. At the top: <strong>New message</strong>, <strong>Sent and drafts</strong> and <strong>Record an opt-out</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Who you send it to</strong>: Everyone, Regulars, New, Haven't visited in a while, At risk, Birthday this month, Best customers (the top 20% by spend this year), By postcode or Pick one by one. Each button shows how many there are, and below you see how many have a valid email and how many a mobile. <strong>See recipients</strong> lets you untick anyone you don't want. It never reaches anyone who withdrew their marketing consent.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>What it is about</strong>: choose a topic (New dish or drink, Promotion or offer, Event, Menu, Opening hours change, Holidays, We are reopening, Special date, Groups, Thank you…) and it writes the text for you, or choose <strong>Write my own</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>The message</strong>: Email subject, Headline and Text (use <strong>{nombre}</strong> and <strong>{negocio}</strong>), an optional offer box (title, conditions, code, date), a button (Book a table, Order now, See the menu, Call us, Get directions or another link), an image by https link and your logo. On the right, the <strong>preview</strong> as Email, Mobile or WhatsApp.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Anything in [square brackets] must be filled in. The app warns you before copying or sending if any is left unchanged.</div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Send</strong>: choose <strong>Email</strong> or <strong>WhatsApp</strong>. It's a guide with steps you tick off as done.</div></div>
<h4>Email guide ("Step by step" mode)</h4>
<ol>
<li>Open your email (<strong>Gmail</strong>, <strong>Outlook</strong> or <strong>My mail app</strong>) and start a new message.</li>
<li><strong>Copy subject</strong> and paste it into "Subject".</li>
<li><strong>Copy recipients</strong> and paste them into <strong>BCC</strong> (hidden copy), never "To": that way nobody sees the others' emails. They are split into <strong>batches</strong> of 25, 50 or 100 (free Gmail allows about 500 sends a day).</li>
<li><strong>Copy the message with design</strong> and paste it into the body (or "Text only").</li>
<li>Optional: attach photos or videos (a heavy video is better as a link).</li>
<li>Send from your email and press <strong>I have sent it</strong>; if there are more batches, <strong>Next batch</strong>.</li>
</ol>
<p>Under <strong>More options</strong>: <strong>Send myself a test</strong>, <strong>Download draft (.eml)</strong> (opens already laid out in desktop Outlook, Apple Mail or Thunderbird) and <strong>Download HTML</strong>. <strong>One by one</strong> mode opens a plain-text email per customer, with their name.</p>
<h4>WhatsApp guide ("Broadcast list" mode)</h4>
<ol>
<li>On your phone, ideally WhatsApp Business: Chats → menu ⋮ → "New broadcast" (iPhone: "Broadcast lists" → "New list"). Lists are created on the phone, not on WhatsApp Web.</li>
<li>Your customers must be in your contacts: <strong>Download contacts (.vcf)</strong> and open it from your phone, or <strong>Copy names and phones</strong>.</li>
<li>Add them to the list (up to 256 per list: it is split into batches) and <strong>Copy list name</strong>.</li>
<li><strong>Copy the message</strong> (no name) and paste it into the list's chat; optionally photos or videos.</li>
<li>Send and mark the batch.</li>
</ol>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>A broadcast list only reaches people who have YOUR number saved in their contacts. In <strong>One by one</strong> mode, each button opens WhatsApp with the message and that customer's name; you only press send. Landlines don't count: WhatsApp can't open them.</div>
<h4>Opt-outs, history and legal basis</h4>
<ul>
<li>Every email carries the opt-out notice and your details as the controller. If someone replies UNSUBSCRIBE, press <strong>Record an opt-out</strong>, find them and press <strong>Opt out</strong>: they lose consent and vanish from every list.</li>
<li>In <strong>Sent and drafts</strong> you see each message with its topic, audience and how many emails/WhatsApps were marked as sent. From its ⋯ menu you can <strong>Use as the base of a new one</strong> or delete it.</li>
</ul>

<h4>Customers: quick loyalty actions</h4>
<p>Ready-written messages (editable before sending) for four moments: <strong>Upcoming birthdays (30 days)</strong>, <strong>Recent visits — ask for a review</strong> (with your Google link if you set it in My Business), <strong>Clients who haven't come in a while</strong> and the <strong>Satisfaction survey (private)</strong>. Each tile has <strong>WhatsApp</strong> and <strong>Email</strong>; the message window also offers <strong>Copy</strong>. The ⋯ menu offers <strong>Register as action</strong>, which logs it in the calendar already done. For inactive customers, <strong>Write to all of them</strong> takes you to News with that audience. Only customers with marketing consent appear.</p>
<p>At the top are four figures (birthdays, recent visits, inactive and NPS), the survey summary with the latest comments and "How did they hear about you?" for the last 90 days.</p>

<h4>Content ideas</h4>
<p>A library of ideas for social media and online management, by category (including "Google Business and reviews" and social account upkeep, which are real maintenance tasks). Use the search, open a category and press <strong>Create action</strong>; the idea is marked as used. <strong>Surprise me (quick idea for today)</strong> suggests one at random.</p>

<h4>Good to know</h4>
<ul>
<li>Creating, editing, duplicating and deleting actions, News and ideas are for the owner or an employee with edit permission. Any Dining Room employee can see the calendar and tick actions as done.</li>
<li>A weekly action is ticked done day by day, not forever.</li>
</ul>
<h4>If something doesn't work</h4>
<ul>
<li><strong>The discount doesn't apply at the POS</strong>: check the date (or that it's weekly and hasn't ended), the time slot and that it hasn't reached its usage limit.</li>
<li><strong>I can't message a customer on WhatsApp</strong>: the phone doesn't look like a mobile.</li>
<li><strong>I can't see the News tab</strong>: it's only for the owner or with edit permission.</li>
</ul>
`}
  },
  {id:'economia', area:'gestion',
    title:{es:`<i class="ti ti-coin"></i> Gestión Económica`, ca:`<i class="ti ti-coin"></i> Gestió Econòmica`, en:`<i class="ti ti-coin"></i> Financial Management`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Gestión Económica junta lo que vendes (el TPV) con lo que gastas (lo que registras aquí y lo que llega de Pedidos) y te dice, sin esperar al fin de año, si ganas dinero, cuánto, cuánto debes apartar para Hacienda y cuántos cubiertos necesitas para no perder. Y lo ordena como lo pide tu gestor para que se lo mandes en un clic. Está en <strong>Gestión → Gestión Económica</strong> y es <strong>solo del propietario</strong>.</p>
<p><strong>La app no es una gestoría</strong>: ordena tus datos de forma objetiva y calcula provisiones para que sepas qué apartar; presentar los impuestos lo hace tu gestor.</p>

<h4>Antes de empezar: «Para que tus números salgan bien»</h4>
<p>Arriba puede aparecer un aviso rojo o una lista con lo que falta. Hazla antes que nada, porque cambia todas las cuentas:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Elige tu forma jurídica</strong> en <strong>Gestión → Mi Negocio → Forma jurídica y régimen fiscal</strong>: autónomo, comunidad de bienes, sociedad o cooperativa; si eres autónomo, estimación directa (simplificada o normal) o módulos. Sin esto, la app calcula como si fueras una sociedad y tu impuesto y tu sueldo salen mal. Si GastroGoan ya fijó tu forma jurídica, tu régimen y tu <strong>comunidad autónoma</strong> al darte de alta, aparecen bloqueados: si algo no es correcto, pulsa <strong>Comprobar cambios</strong> o díselo a GastroGoan.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pon el <strong>NIF del negocio</strong> (sale en cada ticket y en lo que recibe tu gestor).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Da de alta tus <strong>gastos fijos</strong> (alquiler, luz, seguros, gestoría…).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si eres autónomo o comunidad de bienes, apunta <strong>Mi sueldo (titular)</strong> (o <strong>No me pago un fijo</strong>).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Pon el <strong>mes de factura</strong> a los gastos que no son mensuales y el <strong>IVA</strong> a los platos de la carta que no lo tengan.</div></div>
<p>Cada punto tiene un botón <strong>Ir</strong>. La lista se puede ocultar un mes con <strong>Ocultar un mes</strong>.</p>

<h4>Las pestañas</h4>
<p>Ventas, Gastos fijos, Gastos Variables, Cuenta de Resultados, Tesorería, <strong>Beneficio y caja</strong>, Punto de equilibrio e Inversiones. Si eres autónomo en módulos, aparece además <strong>Módulos</strong>. En las pestañas por mes eliges el año con las flechas y el mes en la tira de abajo.</p>

<h4>Ventas</h4>
<p>El histórico de lo que has vendido, mes a mes: totales por <strong>tipo de servicio</strong> (Mesa, Take Away, Delivery), con su filtro, y <strong>Ventas por día</strong> con tickets y ticket medio. Las propinas se enseñan aparte (informativo, no suman). Las <strong>señales de reservas</strong> cobradas se avisan aparte, porque su IVA cuenta en el mes en que las cobras.</p>
<p>Dos bloques más: <strong>Otros ingresos</strong> (subvenciones, comisión de máquinas, alquiler del local para un evento; botón <strong>Añadir ingreso</strong>, con su IVA según el tipo) y <strong>Vales regalo</strong> (los de Clientes aparecen solos; el botón <strong>Vender un vale</strong> anota a mano uno solo en la contabilidad).</p>

<h4>Gastos fijos</h4>
<p>Lo que pagas todos los meses aunque vendas poco. Tres cifras arriba y dos bloques: <strong>Personal (nómina/SS)</strong> y <strong>Gastos Fijos Generales</strong>, cada uno con su botón <strong>Añadir</strong> (en Personal, también <strong>Mi sueldo (titular)</strong>). Al final, el <strong>total de gastos fijos mensuales</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Añadir</strong>. Pon el <strong>Concepto</strong>, el <strong>importe sin IVA</strong>, el <strong>día de pago</strong> y la <strong>Periodicidad del pago</strong> (mensual, trimestral, anual…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si no es mensual, elige el <strong>Mes de la factura</strong>: el gasto se reparte a lo largo del año, pero el IVA se deduce entero el mes de la factura.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En gastos generales indica <strong>Proveedor</strong> y <strong>NIF</strong> (se recuerda para la próxima vez y alimenta el modelo 347), el <strong>tipo de IVA</strong> y, si procede, la <strong>Retención IRPF de la factura</strong>: alquiler del local 19 % (modelo 115) o profesional 15 % o 7 % (modelo 111). Puedes adjuntar la foto de la factura.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En una <strong>nómina</strong>, marca <strong>Calcular el coste total a partir del sueldo neto</strong> y rellena bruto anual (si lo sabes), hijos, IRPF, contrato (indefinido, temporal, fijo discontinuo), grupo de cotización, pagas y jornada. La app calcula bruto, Seguridad Social de la empresa (con las bases de 2026) y coste total, y avisa si queda por debajo del salario mínimo.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Lo que cobra el titular (autónomo o comunidad de bienes) <strong>no es un gasto</strong>: márcalo con «Es lo que cobra el titular o un socio, no un empleado» o usa <strong>Mi sueldo (titular)</strong>. Sale debajo del resultado. Tu cuota de autónomos sí es un gasto: ponla aparte. En una sociedad, la nómina del administrador sí es gasto.</div>

<h4>Gastos Variables</h4>
<p>Las compras del mes. Los pedidos a proveedor marcados como <strong>Recibido</strong> en Pedidos entran solos; lo demás lo añades tú.</p>
<ul>
<li><strong>Añadir compra extra</strong>: material, limpieza, gastos puntuales.</li>
<li><strong>Leer factura con foto</strong>: haz una foto o sube un PDF y la IA de tu negocio la lee; la app cuadra sumas e IVA y <strong>nada se guarda sin que lo revises</strong>. Necesita tu clave de IA (ver capítulo Herramientas); solo el propietario.</li>
<li><strong>Facturas sin asignar</strong> y <strong>Foto de factura</strong>: guarda ahora la foto de una factura que aún no sabes dónde apuntar y úsala luego.</li>
<li>Arriba: cifras del mes, <strong>Gasto por categoría</strong> y, si procede, <strong>Gasto hormiga detectado</strong> (proveedores con muchos cargos pequeños que suman). En <strong>Existencias</strong>, la foto automática de tu stock a fin de mes o un <strong>Recuento</strong> a mano: la variación entra en la Cuenta de Resultados.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si tu food cost real está muy por encima del objetivo, revisa escandallos sin actualizar, mermas, descontrol de stock o precios de carta que ya no cubren el coste.</div>

<h4>Cuenta de Resultados</h4>
<p>Es la del gestor: sigue el orden del Plan General Contable. Eliges el año y <strong>Mensual</strong> o <strong>Trimestral</strong>, y la tira de periodos. De arriba abajo: <strong>Facturación (TPV, IVA incl.)</strong> → IVA repercutido → <strong>Facturación neta</strong> → otros ingresos → Gastos Variables (sin IVA) y variación de existencias → <strong>Margen Bruto</strong> → <strong>Gastos de personal</strong> → <strong>Otros gastos de explotación</strong> → comisiones de apps de delivery → <strong>Beneficio antes de amortizar (EBITDA)</strong> → <strong>Amortización de inversiones</strong> → <strong>Resultado de explotación</strong> → <strong>Intereses de préstamos</strong> → <strong>Resultado Antes de Impuestos</strong> → impuesto → <strong>Resultado Neto</strong>.</p>
<p>Debajo del resultado, según el caso: lo que se paga el titular y «Queda en el negocio», el <strong>IVA a liquidar (modelo 303)</strong> y el IRPF y retenciones a ingresar (modelos 111 y 115). Cada trimestre y el año se desglosan al pasar el cursor.</p>
<ul>
<li><strong>El impuesto se calcula por año</strong>, no mes a mes: tipo efectivo del año por el beneficio acumulado, descontando pérdidas de años anteriores. Un mes puede salir con impuesto negativo: es lo que ya habías provisionado de más.</li>
<li><strong>Autónomo y comunidad de bienes</strong>: el IRPF sale de la escala por tramos con mínimo personal y gastos de difícil justificación; cada comunero tributa por su parte (se pone en Mi Negocio).</li>
<li><strong>Sociedad</strong>: un campo <strong>Impuesto de Sociedades</strong> con una sugerencia de tipo; los dividendos no son gasto y llevan retención. <strong>Cooperativa</strong>: pon tú el tipo que te dé tu gestoría. <strong>Módulos</strong>: tu impuesto real lo fija la pestaña Módulos, no este porcentaje.</li>
<li>Una venta anulada resta en el mes de su rectificativa; no se reescribe un trimestre ya presentado.</li>
<li>El impuesto que ves es una <strong>provisión</strong> para saber cuánto apartar, no la cuota de la declaración.</li>
</ul>

<h4>Tesorería: dónde va cada euro</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">Arriba: <strong>Facturación bruta</strong>, IVA repercutido y facturación neta del mes. Configura tu <strong>distribución objetivo</strong> (Personal, Gastos fijos, Gastos Variables, Otros y Beneficio, que suman 100 %).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En <strong>Distribución de tesorería</strong> ves, por partida, objetivo y real con una ✓ o ✗: en un gasto es bueno quedarse por debajo del objetivo; en el beneficio, por encima. Aquí cuenta la <strong>caja</strong>: la cuota entera del préstamo y lo pagado al contado por una inversión.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Debajo, lo que debes <strong>apartar</strong>: <strong>Reserva IVA (modelo 303)</strong> del trimestre, IRPF retenido, retención del alquiler y los pagos a cuenta (130, 131 o 202).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">El <strong>calendario de pagos a Hacienda</strong> del trimestre lista cada modelo con importe y fecha límite (del 1 al 20 del mes siguiente; el 4.º trimestre, hasta enero, con los resúmenes anuales).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Previsión de tesorería</strong> a 30, 60 y 90 días, a partir del resultado medio de los 3 últimos meses (una estimación, no una promesa), y «Próximos pagos grandes» de gastos no mensuales.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Cerrar mes</strong> bloquea los gastos variables y las inversiones de ese mes para protegerlos tras mandárselos al gestor; <strong>Reabrir mes</strong> lo deshace. También está <strong>Conciliación bancaria</strong>.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Muchos negocios «ganan sobre el papel» pero van justos porque se gastan el IVA cobrado como si fuera suyo. Aparta lo que indica la reserva.</div>

<h4>Punto de equilibrio</h4>
<p>Cuántos cubiertos al mes necesitas para cubrir tus gastos fijos.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Los <strong>Costes fijos totales</strong> vienen solos de Gastos fijos.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pon el <strong>Ticket medio (€/cubierto)</strong> <strong>sin IVA</strong>, los <strong>Cubiertos al mes</strong>, los <strong>Días de apertura/mes</strong> y el <strong>Food cost objetivo (%)</strong>. O pulsa <strong>Usar datos del último mes</strong> (últimos 30 días de ventas reales).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Resultado: coste variable por cubierto, contribución, <strong>cubiertos para cubrir gastos</strong>, cubiertos por día y ventas mínimas mensuales, con un indicador de si estás por encima o por debajo. Con <strong>Guardar como escenario</strong> guardas variantes («Verano/Terraza», «Invierno»).</div></div>
<p><strong>Ejemplo:</strong> gastos fijos 6.000 €, ticket sin IVA 18 € y food cost 30 %: cada cubierto deja 12,60 €; 6.000 / 12,60 ≈ 477 cubiertos al mes; abriendo 26 días, unos 19 al día.</p>

<h4>Inversiones</h4>
<p>Horno, cámara, obra, mobiliario, vehículo… pulsa <strong>Nueva inversión</strong> con importe, IVA, fecha y <strong>Qué es (para la amortización)</strong>. En la Cuenta de Resultados no entra lo que pagas, sino lo que se <strong>amortiza</strong> cada año (porcentaje oficial) más los intereses; hasta 300 € va entero a gasto. Si la pagas a plazos, marca <strong>Inversión pagada a plazos</strong> con cuotas y cuota mensual: la cuota es caja y va en Tesorería. El estado es PAGADO, PARCIAL o PENDIENTE y arriba ves la <strong>Deuda pendiente</strong>. En obras de un local alquilado, indica los años que quedan de contrato; en un turismo de uso mixto, el IVA se deduce al 50 %.</p>

<h4>Beneficio y caja</h4>
<p>Un negocio puede «ganar» en la Cuenta de Resultados y estar justo de dinero (o al revés). Esta pestaña te lleva del <strong>resultado neto</strong> a la <strong>caja estimada</strong> paso a paso: suma lo que no es gasto pero sí sale de tu cuenta (cuotas de préstamos, inversiones pagadas, IVA e IRPF por pagar…) y resta lo que es gasto pero no sale (amortización). Escribe en <strong>Saldo del banco</strong> lo que tienes hoy y verás el <strong>dinero disponible de verdad</strong> y la <strong>liquidez a 30, 60 y 90 días</strong>, con lo confirmado separado de lo estimado. Es una estimación: la app no ve tu banco.</p>

<h4>Tus impuestos: previsión, cálculo y simulador</h4>
<p>En <strong>Tesorería</strong>, la tarjeta de impuestos prevé cada modelo del trimestre (303, 111, 115, 130/131, 202…) con su importe, su fecha límite y un estado: <em>estimado</em>, <em>devengado</em>, <em>plazo pasado</em>, <em>presentado</em> o <em>pagado</em>. Además:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Ver cálculo</strong> enseña el impuesto paso a paso, qué reglas se han usado (con su fuente y si están verificadas) y una <strong>fiabilidad</strong> alta, media o baja con los motivos.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Marcar</strong> te deja anotar que un modelo ya está presentado o pagado, con el <strong>importe real</strong>, y compara lo previsto con lo real.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Simular</strong> te deja probar «¿y si vendo un 10 % más?» o «¿y si contrato a alguien?». Es solo una simulación: no toca ningún dato.</div></div>
<p>Cada gasto fijo o variable lleva <strong>¿Es deducible?</strong> (sí, parcial con porcentaje, no o pendiente). La app no decide qué es deducible: lo decides tú con tu gestor, y lo «pendiente» cuenta como deducible hasta que lo revises. Para el IRPF se usa la escala de <strong>tu comunidad autónoma</strong> (las 15 de régimen común, y Ceuta y Melilla); Navarra y el País Vasco tienen su propio impuesto (régimen foral): se calcula con su escala, pero con fiabilidad media y sin verificar con la fuente oficial; confírmalo con tu gestoría.</p>

<h4>Módulos</h4>
<p>Solo para autónomos en estimación objetiva: eliges epígrafe y los datos del módulo (mesas, potencia, personal, máquinas…) y la app estima tu IVA e IRPF y los pagos a cuenta (131). Es una previsión: el cálculo definitivo lo hace tu gestor.</p>

<h4>Enviar al gestor</h4>
<p>El botón <strong>Enviar al gestor</strong> (arriba) prepara un único <strong>ZIP</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Elige el <strong>Periodo</strong>: Mes, Trimestre, Año entero o Fechas exactas.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Marca <strong>Qué incluye</strong>: Facturas emitidas, Facturas recibidas, fotos y PDF de las facturas, Impuestos del periodo, Cuenta de resultados, Bienes de inversión, Nóminas y SS y Registro de jornada. Opcionalmente, el email de tu gestor.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Descargar</strong> guarda el ZIP; <strong>Enviar / compartir</strong> lo adjunta desde tu móvil o tablet (en un ordenador lo descarga y abre tu correo).</div></div>
<p>Dentro: un Excel con una hoja por libro, los mismos libros en CSV (para A3, Sage, ContaSol…), las fotos de las facturas con cada línea citando su archivo y un LÉEME. Las emitidas van como libro registro: tickets agrupados por día, facturas completas con cliente y rectificativas en su fecha.</p>

<h4>Lo que conviene saber</h4>
<ul>
<li>Todo es solo del propietario. Un empleado ve un aviso y no entra.</li>
<li>Usa el mismo food cost objetivo en Punto de equilibrio, Panel de Control y avisos de subida de precios.</li>
<li>Los datos de nóminas y cotización se actualizan cada año; tu gestor debe revisar lo que presente.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li><strong>Mi impuesto sale raro</strong>: revisa la forma jurídica y el régimen en Mi Negocio y que el sueldo del titular esté marcado como tal.</li>
<li><strong>Las cifras del Panel no coinciden con las de aquí</strong>: ambos usan el mes natural; si no coinciden, revisa que no haya un mes cerrado distinto o gastos fijos sin el mes de factura.</li>
<li><strong>No puedo editar una compra o inversión</strong>: ese mes está cerrado en Tesorería; reábrelo.</li>
<li><strong>No funciona «Leer factura con foto»</strong>: falta la clave de IA en Mi Negocio → Asistente de IA.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Gestió Econòmica ajunta el que vens (el TPV) amb el que gastes (el que registres aquí i el que arriba de Comandes) i et diu, sense esperar a final d'any, si guanyes diners, quant, quant has d'apartar per a Hisenda i quants comensals necessites per no perdre. I ho ordena com ho demana el teu gestor perquè li ho enviïs d'un clic. És a <strong>Gestió → Gestió Econòmica</strong> i és <strong>només del propietari</strong>.</p>
<p><strong>L'app no és una gestoria</strong>: ordena les teves dades de manera objectiva i calcula provisions perquè sàpigues què apartar; presentar els impostos ho fa el teu gestor.</p>

<h4>Abans de començar: «Perquè els teus números surtin bé»</h4>
<p>A dalt pot aparèixer un avís vermell o una llista amb el que falta. Fes-la abans de res, perquè canvia tots els comptes:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Tria la teva forma jurídica</strong> a <strong>Gestió → El Meu Negoci → Forma jurídica i règim fiscal</strong>: autònom, comunitat de béns, societat o cooperativa; si ets autònom, estimació directa (simplificada o normal) o mòduls. Sense això, l'app calcula com si fossis una societat i el teu impost i el teu sou surten malament. Si GastroGoan ja ha fixat la teva forma jurídica, el teu règim i la teva <strong>comunitat autònoma</strong> en donar-te d'alta, apareixen bloquejats: si alguna cosa no és correcta, prem <strong>Comprovar canvis</strong> o digues-ho a GastroGoan.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Posa el <strong>NIF del negoci</strong> (surt a cada tiquet i en el que rep el teu gestor).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Dona d'alta les teves <strong>despeses fixes</strong> (lloguer, llum, assegurances, gestoria…).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Si ets autònom o comunitat de béns, apunta <strong>El meu sou (titular)</strong> (o <strong>No em pago un fix</strong>).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Posa el <strong>mes de factura</strong> a les despeses que no són mensuals i l'<strong>IVA</strong> als plats de la carta que no en tinguin.</div></div>
<p>Cada punt té un botó <strong>Anar</strong>. La llista es pot amagar un mes amb <strong>Amagar un mes</strong>.</p>

<h4>Les pestanyes</h4>
<p>Vendes, Despeses fixes, Despeses Variables, Compte de Resultats, Tresoreria, <strong>Benefici i caixa</strong>, Punt d'equilibri i Inversions. Si ets autònom en mòduls, apareix a més <strong>Mòduls</strong>. A les pestanyes per mes tries l'any amb les fletxes i el mes a la tira de sota.</p>

<h4>Vendes</h4>
<p>L'historial del que has venut, mes a mes: totals per <strong>tipus de servei</strong> (Taula, Take Away, Delivery), amb el seu filtre, i <strong>Vendes per dia</strong> amb tiquets i tiquet mitjà. Les propines es mostren a part (informatiu, no sumen). Les <strong>senyals de reserves</strong> cobrades s'avisen a part, perquè el seu IVA compta al mes en què les cobres.</p>
<p>Dos blocs més: <strong>Altres ingressos</strong> (subvencions, comissió de màquines, lloguer del local per a un esdeveniment; botó <strong>Afegir ingrés</strong>, amb el seu IVA segons el tipus) i <strong>Vals regal</strong> (els de Clients apareixen sols; el botó <strong>Vendre un val</strong> n'anota a mà un de sol a la comptabilitat).</p>

<h4>Despeses fixes</h4>
<p>El que pagues tots els mesos encara que vengui poc. Tres xifres a dalt i dos blocs: <strong>Personal (nòmina/SS)</strong> i <strong>Despeses Fixes Generals</strong>, cadascun amb el seu botó <strong>Afegir</strong> (a Personal, també <strong>El meu sou (titular)</strong>). Al final, el <strong>total de despeses fixes mensuals</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Afegir</strong>. Posa el <strong>Concepte</strong>, l'<strong>import sense IVA</strong>, el <strong>dia de pagament</strong> i la <strong>Periodicitat del pagament</strong> (mensual, trimestral, anual…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Si no és mensual, tria el <strong>Mes de la factura</strong>: la despesa es reparteix al llarg de l'any, però l'IVA es dedueix sencer el mes de la factura.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A despeses generals indica <strong>Proveïdor</strong> i <strong>NIF</strong> (es recorda per a la propera vegada i alimenta el model 347), el <strong>tipus d'IVA</strong> i, si cal, la <strong>Retenció IRPF de la factura</strong>: lloguer del local 19 % (model 115) o professional 15 % o 7 % (model 111). Pots adjuntar la foto de la factura.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En una <strong>nòmina</strong>, marca <strong>Calcular el cost total a partir del sou net</strong> i omple brut anual (si el saps), fills, IRPF, contracte (indefinit, temporal, fix discontinu), grup de cotització, pagues i jornada. L'app calcula brut, Seguretat Social de l'empresa (amb les bases de 2026) i cost total, i avisa si queda per sota del salari mínim.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>El que cobra el titular (autònom o comunitat de béns) <strong>no és una despesa</strong>: marca-ho amb «És el que cobra el titular o un soci, no un empleat» o fes servir <strong>El meu sou (titular)</strong>. Surt sota el resultat. La teva quota d'autònoms sí que és una despesa: posa-la a part. En una societat, la nòmina de l'administrador sí que és despesa.</div>

<h4>Despeses Variables</h4>
<p>Les compres del mes. Les comandes a proveïdor marcades com a <strong>Rebut</strong> a Comandes entren soles; la resta l'afegeixes tu.</p>
<ul>
<li><strong>Afegir compra extra</strong>: material, neteja, despeses puntuals.</li>
<li><strong>Llegir factura amb foto</strong>: fes una foto o puja un PDF i la IA del teu negoci la llegeix; l'app quadra sumes i IVA i <strong>res es desa sense que ho revisis</strong>. Necessita la teva clau d'IA (vegeu el capítol Eines); només el propietari.</li>
<li><strong>Factures sense assignar</strong> i <strong>Foto de factura</strong>: desa ara la foto d'una factura que encara no saps on apuntar i fes-la servir després.</li>
<li>A dalt: xifres del mes, <strong>Despesa per categoria</strong> i, si cal, <strong>Despesa formiga detectada</strong> (proveïdors amb molts càrrecs petits que sumen). A <strong>Existències</strong>, la foto automàtica del teu estoc a final de mes o un <strong>Recompte</strong> a mà: la variació entra al Compte de Resultats.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>Si el teu food cost real està molt per sobre de l'objectiu, revisa escandalls sense actualitzar, mermes, descontrol d'estoc o preus de carta que ja no cobreixen el cost.</div>

<h4>Compte de Resultats</h4>
<p>És la del gestor: segueix l'ordre del Pla General Comptable. Tries l'any i <strong>Mensual</strong> o <strong>Trimestral</strong>, i la tira de períodes. De dalt a baix: <strong>Facturació (TPV, IVA inclòs)</strong> → IVA repercutit → <strong>Facturació neta</strong> → altres ingressos → Despeses Variables (sense IVA) i variació d'existències → <strong>Marge Brut</strong> → <strong>Despeses de personal</strong> → <strong>Altres despeses d'explotació</strong> → comissions d'apps de delivery → <strong>Benefici abans d'amortitzar (EBITDA)</strong> → <strong>Amortització d'inversions</strong> → <strong>Resultat d'explotació</strong> → <strong>Interessos de préstecs</strong> → <strong>Resultat Abans d'Impostos</strong> → impost → <strong>Resultat Net</strong>.</p>
<p>Sota el resultat, segons el cas: el que es paga el titular i «Queda al negoci», l'<strong>IVA a liquidar amb Hisenda (model 303)</strong> i l'IRPF i retencions a ingressar (models 111 i 115). Cada trimestre i l'any es desglossen en passar el cursor.</p>
<ul>
<li><strong>L'impost es calcula per any</strong>, no mes a mes: tipus efectiu de l'any pel benefici acumulat, descomptant pèrdues d'anys anteriors. Un mes pot sortir amb impost negatiu: és el que ja havies provisionat de més.</li>
<li><strong>Autònom i comunitat de béns</strong>: l'IRPF surt de l'escala per trams amb mínim personal i despeses de difícil justificació; cada comuner tributa per la seva part (es posa a El Meu Negoci).</li>
<li><strong>Societat</strong>: un camp <strong>Impost de Societats</strong> amb un suggeriment de tipus; els dividends no són despesa i porten retenció. <strong>Cooperativa</strong>: posa tu el tipus que et doni la teva gestoria. <strong>Mòduls</strong>: el teu impost real el fixa la pestanya Mòduls, no aquest percentatge.</li>
<li>Una venda anul·lada resta al mes de la seva rectificativa; no es reescriu un trimestre ja presentat.</li>
<li>L'impost que veus és una <strong>provisió</strong> per saber quant apartar, no la quota de la declaració.</li>
</ul>

<h4>Tresoreria: on va cada euro</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">A dalt: <strong>Facturació bruta</strong>, IVA repercutit i facturació neta del mes. Configura la teva <strong>distribució objectiu</strong> (Personal, Despeses fixes, Despeses Variables, Altres i Benefici, que sumen 100 %).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A <strong>Distribució de tresoreria</strong> veus, per partida, objectiu i real amb una ✓ o ✗: en una despesa és bo quedar-se per sota de l'objectiu; en el benefici, per sobre. Aquí compta la <strong>caixa</strong>: la quota sencera del préstec i el pagat al comptat per una inversió.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">A sota, el que has d'<strong>apartar</strong>: <strong>Reserva IVA (model 303)</strong> del trimestre, IRPF retingut, retenció del lloguer i els pagaments a compte (130, 131 o 202).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">El <strong>calendari de pagaments a Hisenda</strong> del trimestre llista cada model amb import i data límit (de l'1 al 20 del mes següent; el 4t trimestre, fins al gener, amb els resums anuals).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Previsió de tresoreria</strong> a 30, 60 i 90 dies, a partir del resultat mitjà dels 3 últims mesos (una estimació, no una promesa), i «Propers pagaments grans» de despeses no mensuals.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Tancar mes</strong> bloqueja les despeses variables i les inversions d'aquell mes per protegir-les després d'enviar-les al gestor; <strong>Reobrir mes</strong> ho desfà. També hi ha <strong>Conciliació bancària</strong>.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Molts negocis «guanyen sobre el paper» però van justos perquè es gasten l'IVA cobrat com si fos seu. Aparta el que indica la reserva.</div>

<h4>Punt d'equilibri</h4>
<p>Quants comensals al mes necessites per cobrir les teves despeses fixes.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Els <strong>Costos fixos totals</strong> vénen sols de Despeses fixes.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Posa el <strong>Tiquet mitjà (€/comensal)</strong> <strong>sense IVA</strong>, els <strong>Comensals al mes</strong>, els <strong>Dies d'obertura/mes</strong> i el <strong>Food cost objectiu (%)</strong>. O prem <strong>Usar dades de l'últim mes</strong> (últims 30 dies de vendes reals).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Resultat: cost variable per comensal, contribució, <strong>comensals per cobrir despeses</strong>, comensals per dia i vendes mínimes mensuals, amb un indicador de si estàs per sobre o per sota. Amb <strong>Desar com a escenari</strong> deses variants («Estiu/Terrassa», «Hivern»).</div></div>
<p><strong>Exemple:</strong> despeses fixes 6.000 €, tiquet sense IVA 18 € i food cost 30 %: cada comensal deixa 12,60 €; 6.000 / 12,60 ≈ 477 comensals al mes; obrint 26 dies, uns 19 al dia.</p>

<h4>Inversions</h4>
<p>Forn, cambra, obra, mobiliari, vehicle… prem <strong>Nova inversió</strong> amb import, IVA, data i <strong>Què és (per a l'amortització)</strong>. Al Compte de Resultats no entra el que pagues, sinó el que s'<strong>amortitza</strong> cada any (percentatge oficial) més els interessos; fins a 300 € va sencer a despesa. Si la pagues a terminis, marca <strong>Inversió pagada a terminis</strong> amb quotes i quota mensual: la quota és caixa i va a Tresoreria. L'estat és PAGAT, PARCIAL o PENDENT i a dalt veus el <strong>Deute pendent</strong>. En obres d'un local llogat, indica els anys que queden de contracte; en un turisme d'ús mixt, l'IVA es dedueix al 50 %.</p>

<h4>Benefici i caixa</h4>
<p>Un negoci pot «guanyar» al Compte de Resultats i anar just de diners (o al revés). Aquesta pestanya et porta del <strong>resultat net</strong> a la <strong>caixa estimada</strong> pas a pas: suma el que no és despesa però sí que surt del teu compte (quotes de préstecs, inversions pagades, IVA i IRPF per pagar…) i resta el que és despesa però no surt (amortització). Escriu a <strong>Saldo del banc</strong> el que tens avui i veuràs els <strong>diners disponibles de veritat</strong> i la <strong>liquiditat a 30, 60 i 90 dies</strong>, amb el confirmat separat de l'estimat. És una estimació: l'app no veu el teu banc.</p>

<h4>Els teus impostos: previsió, càlcul i simulador</h4>
<p>A <strong>Tresoreria</strong>, la targeta d'impostos preveu cada model del trimestre (303, 111, 115, 130/131, 202…) amb el seu import, la data límit i un estat: <em>estimat</em>, <em>meritat</em>, <em>termini passat</em>, <em>presentat</em> o <em>pagat</em>. A més:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Veure càlcul</strong> mostra l'impost pas a pas, quines regles s'han fet servir (amb la font i si estan verificades) i una <strong>fiabilitat</strong> alta, mitjana o baixa amb els motius.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Marcar</strong> et deixa anotar que un model ja està presentat o pagat, amb l'<strong>import real</strong>, i compara el previst amb el real.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Simular</strong> et deixa provar «i si venc un 10 % més?» o «i si contracto algú?». És només una simulació: no toca cap dada.</div></div>
<p>Cada despesa fixa o variable porta <strong>És deduïble?</strong> (sí, parcial amb percentatge, no o pendent). L'app no decideix què és deduïble: ho decideixes tu amb el teu gestor, i el «pendent» compta com a deduïble fins que el revisis. Per a l'IRPF es fa servir l'escala de <strong>la teva comunitat autònoma</strong> (les 15 de règim comú, i Ceuta i Melilla); Navarra i el País Basc tenen el seu propi impost (règim foral): es calcula amb la seva escala, però amb fiabilitat mitjana i sense verificar amb la font oficial; confirma-ho amb la teva gestoria.</p>

<h4>Mòduls</h4>
<p>Només per a autònoms en estimació objectiva: tries epígraf i les dades del mòdul (taules, potència, personal, màquines…) i l'app estima el teu IVA i IRPF i els pagaments a compte (131). És una previsió: el càlcul definitiu el fa el teu gestor.</p>

<h4>Enviar al gestor</h4>
<p>El botó <strong>Enviar al gestor</strong> (a dalt) prepara un únic <strong>ZIP</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Tria el <strong>Període</strong>: Mes, Trimestre, Any sencer o Dates exactes.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Marca <strong>Què inclou</strong>: Factures emeses, Factures rebudes, fotos i PDF de les factures, Impostos del període, Compte de resultats, Béns d'inversió, Nòmines i SS i Registre de jornada. Opcionalment, l'email del teu gestor.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Descarregar</strong> desa el ZIP; <strong>Enviar / compartir</strong> l'adjunta des del mòbil o tauleta (en un ordinador el descarrega i obre el correu).</div></div>
<p>A dins: un Excel amb un full per llibre, els mateixos llibres en CSV (per a A3, Sage, ContaSol…), les fotos de les factures amb cada línia citant el seu arxiu i un LLEGEIX-ME. Les emeses van com a llibre registre: tiquets agrupats per dia, factures completes amb client i rectificatives a la seva data.</p>

<h4>El que convé saber</h4>
<ul>
<li>Tot és només del propietari. Un empleat veu un avís i no hi entra.</li>
<li>Fa servir el mateix food cost objectiu a Punt d'equilibri, Tauler de Control i avisos de pujada de preus.</li>
<li>Les dades de nòmines i cotització s'actualitzen cada any; el teu gestor ha de revisar el que presenti.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>El meu impost surt estrany</strong>: revisa la forma jurídica i el règim a El Meu Negoci i que el sou del titular estigui marcat com a tal.</li>
<li><strong>Les xifres del Tauler no coincideixen amb les d'aquí</strong>: tots dos fan servir el mes natural; si no coincideixen, revisa que no hi hagi un mes tancat diferent o despeses fixes sense el mes de factura.</li>
<li><strong>No puc editar una compra o inversió</strong>: aquell mes està tancat a Tresoreria; reobre'l.</li>
<li><strong>No funciona «Llegir factura amb foto»</strong>: falta la clau d'IA a El Meu Negoci → Assistent d'IA.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>Financial Management brings together what you sell (the POS) and what you spend (what you record here and what arrives from Orders) and tells you, without waiting for year end, whether you make money, how much, how much to set aside for the tax office and how many covers you need not to lose. It also arranges it the way your accountant wants it so you can send it in one click. It's under <strong>Management → Financial Management</strong> and is <strong>for the owner only</strong>.</p>
<p><strong>The app is not an accountancy firm</strong>: it organises your data objectively and calculates provisions so you know what to set aside; filing the taxes is done by your accountant.</p>

<h4>Before you start: "So your numbers come out right"</h4>
<p>At the top a red notice or a list of what is missing may appear. Do it first, because it changes every calculation:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Choose your legal form</strong> in <strong>Management → My Business → Legal form and tax regime</strong>: self-employed, joint ownership, company or cooperative; if self-employed, actual-expense taxation (simplified or normal) or modules. Without it the app calculates as if you were a company and your tax and pay come out wrong. If GastroGoan already set your legal form, your regime and your <strong>autonomous community</strong> when you signed up, they appear locked: if something is wrong, press <strong>Check for changes</strong> or tell GastroGoan.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Enter the <strong>business tax ID</strong> (it appears on every ticket and in what your accountant receives).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Add your <strong>fixed expenses</strong> (rent, electricity, insurance, accountant…).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">If you're self-employed or a joint ownership, enter <strong>My pay (owner)</strong> (or <strong>I don't pay myself a fixed amount</strong>).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">Set the <strong>invoice month</strong> on expenses that aren't monthly and the <strong>VAT</strong> on menu dishes that don't have one.</div></div>
<p>Each item has a <strong>Go</strong> button. You can hide the list for a month with <strong>Hide for a month</strong>.</p>

<h4>The tabs</h4>
<p>Sales, Fixed expenses, Variable Expenses, Income Statement, Treasury, <strong>Profit and cash</strong>, Break-even point and Investments. If you're self-employed under modules, <strong>Modules</strong> also appears. On the monthly tabs you pick the year with the arrows and the month in the strip below.</p>

<h4>Sales</h4>
<p>The history of what you've sold, month by month: totals by <strong>service type</strong> (Table, Take Away, Delivery), with its filter, and <strong>Sales by day</strong> with tickets and average ticket. Tips are shown separately (informative, not added). Booking <strong>deposits</strong> collected are noted apart, because their VAT counts in the month you collect them.</p>
<p>Two more blocks: <strong>Other income</strong> (grants, machine commission, renting the premises for an event; <strong>Add income</strong> button, with VAT by type) and <strong>Gift vouchers</strong> (those from Customers appear by themselves; the <strong>Sell a voucher</strong> button logs a stand-alone one by hand in the accounts).</p>

<h4>Fixed expenses</h4>
<p>What you pay every month even if you sell little. Three figures at the top and two blocks: <strong>Staff (payroll/SS)</strong> and <strong>General Fixed Expenses</strong>, each with its <strong>Add</strong> button (under Staff, also <strong>My pay (owner)</strong>). At the bottom, the <strong>total monthly fixed expenses</strong>.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Press <strong>Add</strong>. Enter the <strong>Concept</strong>, the <strong>amount excl. VAT</strong>, the <strong>payment day</strong> and the <strong>Payment frequency</strong> (monthly, quarterly, yearly…).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">If it isn't monthly, choose the <strong>Invoice month (if not monthly)</strong>: the expense is spread over the year, but the VAT is deducted in full in the invoice month.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">For general expenses give the <strong>Supplier</strong> and <strong>tax ID</strong> (remembered for next time and feeding form 347), the <strong>VAT type</strong> and, where relevant, the <strong>Income tax withholding on the invoice</strong>: premises rent 19% (form 115) or professional 15% or 7% (form 111). You can attach the invoice photo.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">For a <strong>payroll</strong> entry, tick <strong>Calculate total cost from the net salary</strong> and fill in annual gross (if known), children, income tax, contract (permanent, temporary, seasonal), contribution group, pay periods and working hours. The app calculates gross, employer Social Security (with 2026 bases) and total cost, and warns if it's under the minimum wage.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>What the owner takes (self-employed or joint ownership) is <strong>not an expense</strong>: mark it with "This is what the owner or a partner takes, not an employee" or use <strong>My pay (owner)</strong>. It appears below the result. Your self-employed contribution is an expense: enter it separately. In a company, the director's payroll is an expense.</div>

<h4>Variable Expenses</h4>
<p>The month's purchases. Supplier orders marked <strong>Received</strong> in Orders come in by themselves; you add the rest.</p>
<ul>
<li><strong>Add extra purchase</strong>: supplies, cleaning, one-off costs.</li>
<li><strong>Read invoice from photo</strong>: take a photo or upload a PDF and your business's AI reads it; the app checks sums and VAT and <strong>nothing is saved until you review it</strong>. It needs your AI key (see the Tools chapter); owner only.</li>
<li><strong>Unassigned invoices</strong> and <strong>Invoice photo</strong>: save the photo of an invoice now when you don't yet know where to record it, and use it later.</li>
<li>At the top: the month's figures, <strong>Spend by category</strong> and, if relevant, <strong>Small recurring expenses detected</strong> (suppliers with many small charges that add up). Under <strong>Inventory</strong>, the automatic snapshot of your stock at month end or a manual <strong>Count</strong>: the change goes into the Income Statement.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>If your real food cost is well above target, check outdated costings, waste, stock control or menu prices that no longer cover cost.</div>

<h4>Income Statement</h4>
<p>This is your accountant's own format: it follows the General Accounting Plan order. You choose the year and <strong>Monthly</strong> or <strong>Quarterly</strong>, and the period strip. From top to bottom: <strong>Revenue (POS, VAT incl.)</strong> → VAT on sales → <strong>Net revenue</strong> → other income → Variable Expenses (excl. VAT) and change in inventory → <strong>Gross Margin</strong> → <strong>Staff costs</strong> → <strong>Other operating expenses</strong> → delivery-app commissions → <strong>Profit before depreciation (EBITDA)</strong> → <strong>Depreciation</strong> → <strong>Operating result</strong> → <strong>Loan interest</strong> → <strong>Result Before Tax</strong> → tax → <strong>Net Result</strong>.</p>
<p>Below the result, as applicable: what the owner takes and "Left in the business", the <strong>VAT to settle with the tax office (form 303)</strong> and income tax and withholdings to deposit (forms 111 and 115). Each quarter and the year break down when you hover.</p>
<ul>
<li><strong>Tax is calculated per year</strong>, not month by month: the year's effective rate times accumulated profit, minus losses from earlier years. A month can show negative tax: it's what you had provisioned too much.</li>
<li><strong>Self-employed and joint ownership</strong>: income tax comes from the bracket scale with personal allowance and hard-to-document costs; each co-owner is taxed on their share (set in My Business).</li>
<li><strong>Company</strong>: a <strong>Corporate tax</strong> field with a suggested rate; dividends are not an expense and carry withholding. <strong>Cooperative</strong>: enter the rate your accountant gives you. <strong>Modules</strong>: your real tax is set by the Modules tab, not this percentage.</li>
<li>A cancelled sale subtracts in the month of its corrective invoice; an already-filed quarter is never rewritten.</li>
<li>The tax you see is a <strong>provision</strong> to know how much to set aside, not the return's amount.</li>
</ul>

<h4>Treasury: where every euro goes</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">At the top: <strong>Gross revenue</strong>, VAT passed on and net revenue for the month. Set your <strong>target distribution</strong> (Staff, Fixed, Variable Expenses, Other and Profit, adding up to 100%).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">In <strong>Treasury distribution</strong> you see, per line, target and actual with a ✓ or ✗: for an expense, staying under target is good; for profit, above it. Here it's <strong>cash</strong> that counts: the whole loan instalment and what was paid up front for an investment.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Below, what to <strong>set aside</strong>: the quarter's <strong>VAT reserve (form 303)</strong>, income tax withheld, rent withholding and payments on account (130, 131 or 202).</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">The quarter's <strong>tax payments calendar</strong> lists each form with amount and deadline (1st to 20th of the following month; Q4 until January, with the annual summaries).</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Cash flow forecast</strong> at 30, 60 and 90 days, from the average result of the last 3 months (an estimate, not a promise), and "Upcoming large payments" for non-monthly expenses.</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Close month</strong> locks that month's variable expenses and investments to protect them after sending them to your accountant; <strong>Reopen month</strong> undoes it. <strong>Bank reconciliation</strong> is also here.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Many businesses "make money on paper" but run tight because they spend the VAT they collected as if it were theirs. Set aside what the reserve shows.</div>

<h4>Break-even point</h4>
<p>How many covers a month you need to cover your fixed expenses.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">The <strong>Total fixed costs</strong> come in by themselves from Fixed expenses.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Enter the <strong>Average ticket (€/cover)</strong> <strong>excluding VAT</strong>, the <strong>Covers per month</strong>, the <strong>Open days/month</strong> and the <strong>Target food cost (%)</strong>. Or press <strong>Use last month's data</strong> (the last 30 days of real sales).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Result: variable cost per cover, contribution, <strong>covers needed to cover expenses</strong>, covers per day and minimum monthly sales, with an indicator of whether you're above or below. With <strong>Save as scenario</strong> you keep variants ("Summer/Terrace", "Winter").</div></div>
<p><strong>Example:</strong> fixed expenses 6,000 €, ticket excl. VAT 18 € and food cost 30%: each cover leaves 12.60 €; 6,000 / 12.60 ≈ 477 covers a month; opening 26 days, about 19 a day.</p>

<h4>Investments</h4>
<p>Oven, cold room, building work, furniture, vehicle… press <strong>New investment</strong> with amount, VAT, date and <strong>What it is (for depreciation)</strong>. The Income Statement doesn't take what you pay but what is <strong>depreciated</strong> each year (official percentage) plus interest; up to 300 € goes straight to expense. If you pay in instalments, tick <strong>Investment paid in installments (financed)</strong> with the number and monthly amount: the instalment is cash and goes in Treasury. Status is PAID, PARTIAL or PENDING and at the top you see the <strong>Outstanding debt</strong>. For works on a rented premises, give the years left on the lease; for a mixed-use car, VAT is deducted at 50%.</p>

<h4>Profit and cash</h4>
<p>A business can "make money" on the Income Statement and still be short of cash (or the other way round). This tab takes you from the <strong>net result</strong> to the <strong>estimated cash</strong> step by step: it adds what is not an expense but does leave your account (loan instalments, paid investments, VAT and income tax owed…) and removes what is an expense but doesn't leave (depreciation). Type what you have today in <strong>Bank balance</strong> and you'll see the <strong>money really available</strong> and <strong>liquidity at 30, 60 and 90 days</strong>, with what is confirmed kept apart from what is estimated. It is an estimate: the app cannot see your bank.</p>

<h4>Your taxes: forecast, calculation and simulator</h4>
<p>In <strong>Treasury</strong>, the tax card forecasts each return of the quarter (303, 111, 115, 130/131, 202…) with its amount, its deadline and a status: <em>estimated</em>, <em>accrued</em>, <em>deadline passed</em>, <em>filed</em> or <em>paid</em>. Also:</p>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>See calculation</strong> shows the tax step by step, which rules were used (with their source and whether they are verified) and a high, medium or low <strong>reliability</strong> with the reasons.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Mark</strong> lets you note that a return is already filed or paid, with the <strong>real amount</strong>, and compares forecast with real.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Simulate</strong> lets you try "what if I sell 10 % more?" or "what if I hire someone?". It is only a simulation: it changes no data.</div></div>
<p>Every fixed or variable expense carries <strong>Is it deductible?</strong> (yes, partly with a percentage, no, or pending). The app does not decide what is deductible: you decide with your accountant, and "pending" counts as deductible until you review it. Income tax uses the scale of <strong>your autonomous community</strong> (the 15 common-regime ones, plus Ceuta and Melilla); Navarre and the Basque Country have their own tax (foral regime): it is calculated with their scale, but with medium reliability and not checked against the official source; confirm it with your accountant.</p>

<h4>Modules</h4>
<p>Only for self-employed people under objective estimation: you choose a heading and the module's data (tables, power, staff, machines…) and the app estimates your VAT and income tax and payments on account (131). It's a forecast: the final calculation is done by your accountant.</p>

<h4>Send to accountant</h4>
<p>The <strong>Send to accountant</strong> button (top) prepares a single <strong>ZIP</strong>:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Choose the <strong>Period</strong>: Month, Quarter, Whole year or Exact dates.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Tick <strong>Includes</strong>: Issued invoices, Received invoices, photos and PDFs of the invoices, Period taxes, Profit and loss, Capital assets, Payroll and social security and Working-time record. Optionally, your accountant's email.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Download</strong> saves the ZIP; <strong>Send / share</strong> attaches it from your phone or tablet (on a computer it downloads and opens your email).</div></div>
<p>Inside: an Excel file with one sheet per book, the same books as CSV (for A3, Sage, ContaSol…), the invoice photos with each line naming its file and a README. Issued invoices come as a register book: tickets grouped by day, full invoices with the customer and corrective invoices on their date.</p>

<h4>Good to know</h4>
<ul>
<li>Everything is for the owner only. An employee sees a notice and can't enter.</li>
<li>It uses the same target food cost in Break-even point, Dashboard and price-rise alerts.</li>
<li>Payroll and contribution data are updated every year; your accountant should review whatever they file.</li>
</ul>
<h4>If something doesn't work</h4>
<ul>
<li><strong>My tax looks odd</strong>: check the legal form and regime in My Business and that the owner's pay is marked as such.</li>
<li><strong>Dashboard figures don't match these</strong>: both use the calendar month; if they differ, check for a different closed month or fixed expenses without an invoice month.</li>
<li><strong>I can't edit a purchase or investment</strong>: that month is closed in Treasury; reopen it.</li>
<li><strong>"Read invoice from photo" doesn't work</strong>: the AI key is missing in My Business → AI assistant.</li>
</ul>
`}
  },
  {id:'dashboard', area:'gestion',
    title:{es:`<i class="ti ti-layout-dashboard"></i> Panel de Control`, ca:`<i class="ti ti-layout-dashboard"></i> Tauler de Control`, en:`<i class="ti ti-layout-dashboard"></i> Dashboard`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>El Panel de Control es la pantalla que conviene mirar cada mañana. No introduces nada: reúne lo que pasa en el TPV, las reservas, el stock y la Gestión Económica para decirte en un minuto cómo está tu negocio y qué pide tu atención hoy. Está en <strong>Gestión → Panel de Control</strong> y es <strong>solo del propietario</strong>.</p>
<p>Arriba tienes el botón <strong>Pregúntale a tus números</strong> (ver el capítulo Herramientas).</p>

<h4>De arriba abajo</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Hoy — Atención</strong>. Botones con una cifra por cada cosa que requiere acción, los rojos primero: pagos con tarjeta sin aplicar, ingredientes bajo mínimo, subidas de precio de los últimos 14 días, tareas de tu coach de esta semana, mantenimiento o control de plagas vencidos, facturas vencidas, cierre de caja pendiente. Después, lo que pasa ahora: mesas abiertas, repartos en curso, personal fichado y reservas de hoy y de mañana. Pulsa uno y vas directo a resolverlo. Lo que está a cero baja a una línea tranquila de accesos; si todo está a cero ves «Todo tranquilo por ahora».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Ventas de hoy</strong>. La cifra grande, con cuánto sube o baja frente a ayer y frente al mismo día de la semana pasada, más los tickets de hoy y el ticket medio.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Últimos 7 días y mes en curso</strong>: ventas y gastos. Los gastos incluyen las compras con fecha más una parte proporcional de tus gastos fijos repartida día a día, para ver el coste al mismo ritmo que las ventas.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Reservas de los próximos 7 días</strong>, con acceso a cada día.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Resultado del mes (P&amp;L)</strong>: facturación, gastos y resultado antes de impuestos, con cuatro indicadores: margen sobre ventas, % Food Cost medio frente a tu objetivo, % coste de personal y Prime cost (food cost + personal). Se pintan en rojo si pasan de los umbrales (personal más del 30 %, prime cost más del 65 %).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Tres comparaciones de los últimos 12 meses</strong>: ventas, gastos y resultado (en rojo los meses con pérdidas). El mes en curso va a medias: no lo compares con meses completos.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Análisis de ventas (este mes)</strong>: ticket medio, número de ventas, total, platos más vendidos, mayor margen bruto y ventas por hora. Es el mes natural, igual que en Gestión Económica, para que las cifras coincidan en todas las pantallas.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Picos de venta</strong>: un mapa de calor por día y hora de las últimas 8 semanas. Cuanto más oscura la celda, más se vende: útil para planificar personal y compras.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Punto de equilibrio</strong>: cubiertos necesarios al mes, cubiertos actuales y la diferencia. Si no lo has configurado te lleva a Gestión Económica → Punto de equilibrio.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>Análisis de Platos</strong> (plegable): ranking de más y menos vendidos y más y menos rentables, platos sin ventas, y la <strong>matriz de rentabilidad</strong> que cruza margen y popularidad: <strong>Estrella</strong> (se vende mucho y deja margen: cuídalo), <strong>Promocionar</strong> (buen margen, poco éxito), <strong>Revisar precio/receta</strong> (se vende mucho pero deja poco) y <strong>Candidato a quitar</strong>. Necesita al menos 4 platos con escandallo y ventas en el periodo.</div></div>

<h4>Rutina de 2 minutos</h4>
<ol>
<li>Mira <strong>Hoy — Atención</strong> y resuelve lo rojo.</li>
<li>Compara las ventas de ayer y del mes con los gráficos.</li>
<li>Revisa el resultado del mes y el punto de equilibrio. Una vez a la semana, echa un ojo al Análisis de Platos.</li>
</ol>

<h4>Lo que conviene saber</h4>
<ul>
<li>Las cifras salen de los demás módulos: si faltan gastos fijos o precios en la carta, el panel lo refleja (por ejemplo, el food cost sale «—» si ningún plato tiene precio).</li>
<li>Las cifras se animan un instante al cargar; espera un segundo antes de leerlas.</li>
<li>Si trabajas en Cocina o en Sala, los avisos de stock cuentan los productos de la carpeta en la que estás.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li><strong>«Todavía no hay ventas registradas»</strong>: aparece hasta que cobres el primer ticket en el TPV.</li>
<li><strong>El resultado sale muy negativo a principios de mes</strong>: los gastos fijos corren desde el día 1 y las ventas aún no; no es un fallo.</li>
<li><strong>Un empleado no ve el panel</strong>: Gestión es exclusiva del propietario.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>El Tauler de Control és la pantalla que convé mirar cada matí. No hi introdueixes res: reuneix el que passa al TPV, les reserves, l'estoc i la Gestió Econòmica per dir-te en un minut com està el teu negoci i què demana la teva atenció avui. És a <strong>Gestió → Tauler de Control</strong> i és <strong>només del propietari</strong>.</p>
<p>A dalt tens el botó <strong>Pregunta als teus números</strong> (vegeu el capítol Eines).</p>

<h4>De dalt a baix</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Avui — Atenció</strong>. Botons amb una xifra per cada cosa que requereix acció, els vermells primer: pagaments amb targeta sense aplicar, ingredients per sota del mínim, pujades de preu dels últims 14 dies, tasques del teu coach d'aquesta setmana, manteniment o control de plagues vençuts, factures vençudes, tancament de caixa pendent. Després, el que passa ara: taules obertes, repartiments en curs, personal fitxat i reserves d'avui i de demà. Prem-ne un i vas directe a resoldre-ho. El que és a zero baixa a una línia tranquil·la d'accessos; si tot és a zero veus «Tot tranquil per ara».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Vendes d'avui</strong>. La xifra gran, amb quant puja o baixa respecte a ahir i respecte al mateix dia de la setmana passada, més els tiquets d'avui i el tiquet mitjà.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Últims 7 dies i mes en curs</strong>: vendes i despeses. Les despeses inclouen les compres amb data més una part proporcional de les teves despeses fixes repartida dia a dia, per veure el cost al mateix ritme que les vendes.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Reserves dels propers 7 dies</strong>, amb accés a cada dia.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Resultat del mes (P&amp;L)</strong>: facturació, despeses i resultat abans d'impostos, amb quatre indicadors: marge sobre vendes, % Food Cost mitjà respecte al teu objectiu, % cost de personal i Prime cost (food cost + personal). Es pinten en vermell si passen dels llindars (personal més del 30 %, prime cost més del 65 %).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Tres comparacions dels últims 12 mesos</strong>: vendes, despeses i resultat (en vermell els mesos amb pèrdues). El mes en curs va a mitges: no el comparis amb mesos complets.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Anàlisi de vendes (aquest mes)</strong>: tiquet mitjà, nombre de vendes, total, plats més venuts, major marge brut i vendes per hora. És el mes natural, igual que a Gestió Econòmica, perquè les xifres coincideixin a totes les pantalles.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Pics de venda</strong>: un mapa de calor per dia i hora de les últimes 8 setmanes. Com més fosca la cel·la, més es ven: útil per planificar personal i compres.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Punt d'equilibri</strong>: coberts necessaris al mes, coberts actuals i la diferència. Si no l'has configurat et porta a Gestió Econòmica → Punt d'equilibri.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>Anàlisi de Plats</strong> (plegable): rànquing de més i menys venuts i més i menys rendibles, plats sense vendes, i la <strong>matriu de rendibilitat</strong> que creua marge i popularitat: <strong>Estrella</strong> (es ven molt i deixa marge: cuida'l), <strong>Promocionar</strong> (bon marge, poc èxit), <strong>Revisar preu/recepta</strong> (es ven molt però deixa poc) i <strong>Candidat a treure</strong>. Necessita almenys 4 plats amb escandall i vendes al període.</div></div>

<h4>Rutina de 2 minuts</h4>
<ol>
<li>Mira <strong>Avui — Atenció</strong> i resol el vermell.</li>
<li>Compara les vendes d'ahir i del mes amb els gràfics.</li>
<li>Revisa el resultat del mes i el punt d'equilibri. Un cop per setmana, fes un cop d'ull a l'Anàlisi de Plats.</li>
</ol>

<h4>El que convé saber</h4>
<ul>
<li>Les xifres surten dels altres mòduls: si falten despeses fixes o preus a la carta, el tauler ho reflecteix (per exemple, el food cost surt «—» si cap plat té preu).</li>
<li>Les xifres s'animen un instant en carregar; espera un segon abans de llegir-les.</li>
<li>Si treballes a Cuina o a Sala, els avisos d'estoc compten els productes de la carpeta on ets.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>«Encara no hi ha vendes registrades»</strong>: apareix fins que cobris el primer tiquet al TPV.</li>
<li><strong>El resultat surt molt negatiu a principis de mes</strong>: les despeses fixes corren des del dia 1 i les vendes encara no; no és un error.</li>
<li><strong>Un empleat no veu el tauler</strong>: Gestió és exclusiva del propietari.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>The Dashboard is the screen worth checking every morning. You enter nothing: it gathers what is happening in the POS, bookings, stock and Financial Management to tell you in a minute how your business is doing and what needs your attention today. It's under <strong>Management → Dashboard</strong> and it's <strong>for the owner only</strong>.</p>
<p>At the top is the <strong>Ask your numbers</strong> button (see the Tools chapter).</p>

<h4>From top to bottom</h4>
<div class="manual-step"><div class="sn">1</div><div class="st"><strong>Today — Attention</strong>. Buttons with a number for everything that needs action, red ones first: card payments not applied, ingredients below minimum, price rises in the last 14 days, your coach's tasks this week, overdue maintenance or pest control, overdue invoices, cash closing pending. Then what is happening now: open tables, deliveries in progress, staff clocked in and today's and tomorrow's bookings. Press one to go straight to fixing it. Anything at zero drops to a quiet line of shortcuts; if everything is zero you see "All quiet for now".</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Today's sales</strong>. The big figure, with how much it is up or down against yesterday and against the same weekday last week, plus today's tickets and average ticket.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Last 7 days and current month</strong>: sales and expenses. Expenses include dated purchases plus a proportional share of your fixed expenses spread day by day, so you see costs at the same pace as sales.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st"><strong>Bookings for the next 7 days</strong>, with access to each day.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st"><strong>Monthly result (P&amp;L)</strong>: revenue, expenses and result before tax, with four indicators: margin on sales, average Food Cost % against your target, staff cost % and Prime cost (food cost + staff). They turn red above the thresholds (staff over 30%, prime cost over 65%).</div></div>
<div class="manual-step"><div class="sn">6</div><div class="st"><strong>Three comparisons of the last 12 months</strong>: sales, expenses and result (months with losses in red). The current month is partial: don't compare it with full months.</div></div>
<div class="manual-step"><div class="sn">7</div><div class="st"><strong>Sales analysis (this month)</strong>: average ticket, number of sales, total, best-selling dishes, highest gross margin and sales by hour. It's the calendar month, like Financial Management, so figures match on every screen.</div></div>
<div class="manual-step"><div class="sn">8</div><div class="st"><strong>Sales peaks</strong>: a heat map by day and hour for the last 8 weeks. The darker the cell, the more is sold: useful for planning staff and purchases.</div></div>
<div class="manual-step"><div class="sn">9</div><div class="st"><strong>Break-even point</strong>: covers needed per month, current covers and the difference. If you haven't set it up, it points you to Financial Management → Break-even point.</div></div>
<div class="manual-step"><div class="sn">10</div><div class="st"><strong>Dish Analysis</strong> (collapsible): ranking of most and least sold and most and least profitable, dishes with no sales, and the <strong>profitability matrix</strong> crossing margin and popularity: <strong>Star</strong> (sells a lot and leaves margin: look after it), <strong>Promote</strong> (good margin, low sales), <strong>Review price/recipe</strong> (sells a lot but leaves little) and <strong>Consider dropping</strong>. It needs at least 4 dishes with costing and sales in the period.</div></div>

<h4>A 2-minute routine</h4>
<ol>
<li>Look at <strong>Today — Attention</strong> and deal with the red.</li>
<li>Compare yesterday's and the month's sales with the charts.</li>
<li>Check the month result and break-even point. Once a week, glance at the Dish Analysis.</li>
</ol>

<h4>Good to know</h4>
<ul>
<li>The figures come from the other modules: if fixed expenses or menu prices are missing, the dashboard reflects it (for example, food cost shows "—" if no dish has a price).</li>
<li>Figures animate for a moment on loading; wait a second before reading them.</li>
<li>If you work in Kitchen or the Dining Room, stock alerts count the products of the folder you're in.</li>
</ul>
<h4>If something doesn't work</h4>
<ul>
<li><strong>"No sales recorded yet"</strong>: it shows until you take payment for the first ticket at the POS.</li>
<li><strong>The result looks very negative early in the month</strong>: fixed expenses run from day 1 and sales haven't yet; it's not a fault.</li>
<li><strong>An employee can't see the dashboard</strong>: Management is exclusive to the owner.</li>
</ul>
`}
  },
  {id:'minegocio', area:'gestion',
    title:{es:`<i class="ti ti-building-store"></i> Mi Negocio`, ca:`<i class="ti ti-building-store"></i> El Meu Negoci`, en:`<i class="ti ti-building-store"></i> My Business`},
    content:{es:`<h3>Qué es Mi Negocio y cómo moverte por ella</h3>
<p>Mi Negocio (en <strong>Gestión</strong>) es el panel de control de la configuración: datos del local, impuestos, mesas, tickets, impresoras, reservas online, cobros con tarjeta y copias de seguridad. Es <strong>exclusiva del propietario</strong>: ni un empleado con permiso de edición puede entrar.</p>
<p>Es una pantalla larga hecha de tarjetas. Arriba tienes la tira <strong>Ir a:</strong> con un botón por cada tarjeta; púlsalo para saltar directamente a ella (se ilumina un momento). En móvil las tarjetas van en una sola columna; en pantallas grandes, en dos.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>Qué se guarda y cuándo.</strong> Casi todos los campos de «Datos del negocio» y «Operativa» se guardan solos al salir del campo; <strong>Guardar todo</strong> guarda esa tarjeta entera de una vez. Los interruptores (tipos de servicio, cajón, QR de mesa, modo de comandas) se guardan al marcarlos. Las tarjetas <strong>Configuración del ticket</strong> y <strong>Pedidos para llevar / domicilio</strong> tienen su propio botón <strong>Guardar</strong>.</div>

<h4>Código de negocio</h4>
<p>Los 8 caracteres de la licencia de <strong>este local</strong>. Es lo que das a tus empleados: lo necesitan, junto a su nombre y su PIN, para entrar desde <strong>Acceso Empleados</strong>. Si tienes varios locales, cada uno tiene el suyo.</p>

<h4>PIN del negocio</h4>
<p>Un PIN de 4 dígitos que se le pide a un <strong>empleado</strong> para confirmar acciones delicadas (anular una venta cobrada, borrar un empleado, corregir un fichaje...). Escribe el nuevo dos veces y pulsa <strong>Cambiar PIN</strong>; el propietario solo tiene que confirmar. Viene como 1234 hasta que lo cambies, y la app avisa si eliges uno muy fácil (0000, 1234...). <strong>No es tu contraseña de propietario</strong> (esa se cambia en el selector de negocios, con «Cambiar mi contraseña») y no da acceso a Gestión.</p>

<h4>Conexiones externas</h4>
<p>Resumen de los servicios de fuera que usa la app, cada uno con <strong>tu propia cuenta</strong>. En cada fila ves si está <strong>Conectado</strong> o <strong>Sin conectar</strong> y un botón (<strong>Conectar</strong> o <strong>Editar</strong>).</p>
<ul>
<li><strong>Nube propia (Firebase)</strong> — Obligatoria. Sincroniza todos tus dispositivos y guarda tus datos en tiempo real. Es un proyecto gratuito de Firebase que creas con tu cuenta de Google.
  <ul>
  <li>La primera vez, un asistente de 6 pasos te guía: crear el proyecto, activar <em>Realtime Database</em> (ubicación Bélgica, modo bloqueado), activar el inicio de sesión <em>Anónimo</em>, <strong>autorizar los dominios</strong> <strong>app.gastrogoan.com</strong> y <strong>reservas.gastrogoan.com</strong>, <strong>pegar las reglas de seguridad</strong> (con botón de copiar) y registrar una app web para copiar la <strong>clave de API</strong> y la <strong>URL de la base de datos</strong>. Pega esos dos datos y pulsa <strong>Guardar y conectar</strong>; la app se recarga.</li>
  <li>Con la nube ya conectada, el botón <strong>Editar</strong> abre <strong>Nube — Sincronización entre dispositivos</strong>: estado, <strong>Probar mi nube ahora</strong>, motivo exacto si hay error (con botón de copiarlo), el enlace público y, en <strong>Cambiar la configuración de Firebase</strong>, los dos datos. Dejarlos vacíos y guardar desconecta la nube de ese negocio.</li>
  <li>Si tu proyecto tiene unas <strong>reglas de seguridad antiguas</strong>, aquí sale un aviso con <strong>Copiar las reglas nuevas</strong>. Pégalas en Firebase → Realtime Database → Reglas → Publicar. No pierdes ningún dato: las reglas son solo permisos.</li>
  <li>Para otro dispositivo no repitas nada: entra con tu cuenta de propietario (o tus empleados con su código) y el negocio aparece solo.</li>
  </ul></li>
<li><strong>Pago online con tarjeta (Stripe)</strong> — Opcional. La fila te lleva a la tarjeta de Stripe, más abajo.</li>
<li><strong>Puesta a punto de tu negocio</strong> — Si te queda algo por hacer, aparece <strong>Ver lo que falta</strong>, que recupera la lista de tareas en el Inicio.</li>
</ul>

<h4>Datos del negocio</h4>
<p>La tarjeta grande, dividida en bloques. Se usa en tickets, web de reservas, pedidos a proveedores y selector de negocios.</p>
<ul>
<li><strong>Identidad</strong> — <strong>Logo</strong> (imagen de hasta 2 MB; <strong>Subir logo</strong> / <strong>Quitar</strong>), <strong>Nombre del negocio</strong>, <strong>Propietario/a</strong>, <strong>Tipo de negocio</strong>, <strong>Año de apertura</strong> y <strong>Color de marca</strong> (el de tu página pública de reservas y pedidos).</li>
<li><strong>Forma jurídica y régimen fiscal</strong> — Decide cómo calcula la app los impuestos en Gestión Económica. Elige <strong>Eres</strong>: <em>Autónomo</em>, <em>Comunidad de Bienes</em>, <em>Sociedad</em> o <em>Cooperativa</em>.
  <ul>
  <li><strong>Autónomo</strong> → eliges <strong>Tributas por</strong> <em>Estimación directa</em> (simplificada o normal, y la casilla del primer año con beneficio) o <em>Módulos</em>. También puedes poner otras rentas del titular y los hijos a cargo, que afectan al IRPF.</li>
  <li><strong>Comunidad de Bienes</strong> → añades a cada <strong>comunero</strong> con su porcentaje (deben sumar 100 %) y su tipo de IRPF.</li>
  <li><strong>Sociedad</strong> → impuesto de sociedades; puedes indicar las ventas netas del año anterior. <strong>Cooperativa</strong> → tiene régimen propio que la app no calcula: consulta con tu gestoría.</li>
  </ul>
  Sin esto elegido, la Cuenta de Resultados lo avisa en rojo. La app ordena tus datos; presentar impuestos lo hace tu gestor.</li>
<li><strong>Descripción</strong> — El concepto de tu local, que sale en la web de pedidos.</li>
<li><strong>Contacto</strong> — Dirección (la usa también el radio de reparto), teléfono, email, web y <strong>CIF/NIF</strong> (el NIF sale siempre en el ticket). Debajo, <strong>Titular o razón social</strong> para el aviso legal de tu web de reservas, y una casilla para <strong>mostrar tu NIF</strong> en él: la ley lo exige a quien recoge datos de clientes por internet.</li>
<li><strong>Redes sociales</strong> — Instagram, Facebook, TikTok y <strong>Google Maps / Perfil de empresa</strong>. Para este último busca tu negocio en Google Maps, pulsa «Compartir» y pega el enlace: activa el QR de reseñas del ticket.</li>
</ul>
<p>Al final de la tarjeta, <strong>Guardar todo</strong>. Dentro de ella están también:</p>
<ul>
<li><strong>Tipos de servicio</strong> — Casillas <strong>En mesa</strong>, <strong>Para llevar</strong> y <strong>A domicilio</strong>. Se guardan al marcar y condicionan los botones del TPV y las opciones de la web de pedidos. Debe quedar al menos uno activo; la app avisa si no encaja con tu tipo de negocio.</li>
<li><strong>Horario de apertura</strong> — Cada día de lunes a domingo: casilla de abierto y modo <strong>Por turnos</strong> (hasta dos tramos, para el horario partido) o <strong>Seguido</strong>. Para cerrar a medianoche escribe 00:00 en la hora de cierre. Fija el aforo por turno en Reservas y las horas que ofrece la web; si un cierre es anterior a la apertura o dos turnos se solapan, la app te pregunta antes de guardar. La <strong>carta</strong> concreta de cada franja se decide en Oferta Gastronómica, no aquí.</li>
</ul>

<h4>Operativa</h4>
<p>La capacidad y la distribución de tu local.</p>
<ul>
<li><strong>Aforo</strong> (comensales por servicio) y <strong>Duración de mesa (min)</strong> — cuánto ocupa una reserva una mesa antes de poder volver a ofrecerla.</li>
<li><strong>Antelación mínima (reservas)</strong> y <strong>Antelación mínima (pedidos)</strong> — cuánto antes tiene que reservar o pedir un cliente (días, horas y minutos). Son dos ajustes distintos; la app avisa si la de pedidos es mayor que lo que dura tu horario ese día.</li>
<li><strong>Reservas de grupo por teléfono o email</strong> — Marca la casilla y pon <strong>a partir de cuántos comensales</strong>: la web no deja reservar y pide al cliente que te llame o escriba. Las demás se confirman solas si hay mesa.</li>
<li><strong>Pedir señal para confirmar reservas</strong> — Cobra una señal con tarjeta al reservar. Necesita Stripe conectado (si no, te lo dice y hay un botón para ir a conectarlo). Eliges el <strong>importe</strong>, si es <strong>fijo por reserva</strong> o <strong>por persona</strong>, <strong>a partir de cuántas personas</strong> (0 = siempre) y una nota para el cliente.</li>
<li><strong>Crea el plano de tu sala</strong> — Escribe el <strong>Nombre de la zona</strong> (Interior, Terraza, Barra, Planta 1...), el <strong>Número de mesas</strong> y las <strong>Plazas por mesa</strong> (obligatorias) y pulsa <strong>Crear zona</strong>: se crean todas de golpe. No hay zonas fijas: las que tú quieras.</li>
<li><strong>Mesas configuradas</strong> — Renombra una zona escribiendo sobre su nombre, añade una mesa a la zona (<strong>+</strong>), elimina la zona entera (papelera), o cambia el nombre y las plazas de cada mesa. Las mesas sin plazas salen marcadas en rojo: la web de reservas no puede ofrecerlas. Una mesa o zona con una comanda abierta no se puede borrar hasta cobrarla en el TPV. Si la suma de plazas se aleja mucho del aforo, aparece un aviso.</li>
</ul>
<p>Estas mesas son las que ves en el TPV, en Reservas y en los QR de mesa.</p>

<h4>Configuración del ticket</h4>
<p>Qué sale impreso en tus tickets: <strong>Mostrar dirección</strong>, <strong>Mostrar teléfono</strong>, <strong>Mostrar web</strong>, <strong>Mostrar CIF/NIF</strong> (siempre marcada y bloqueada, es obligatorio), <strong>Pedir reseña con QR al final del ticket</strong> (necesita el enlace de Google Maps), un <strong>Mensaje de pie de ticket</strong> y el <strong>IVA (%)</strong> general que se usa para el desglose cuando un artículo no trae el suyo. Pulsa <strong>Guardar</strong> y mira el resultado con <strong>Vista previa del ticket</strong>. Cada ticket lleva un número de factura simplificada propio de cada dispositivo.</p>

<h4>Impresora de tickets (y cajón)</h4>
<p>Cómo imprime <strong>este aparato</strong> (cada tablet o puesto elige la suya):</p>
<ul>
<li><strong>Navegador / AirPrint / impresora del sistema</strong> — Sirve para cualquier impresora instalada (red, USB, AirPrint). Eliges la impresora en el cuadro de imprimir una vez y queda recordada. Es la única opción en iPhone, iPad y Firefox.</li>
<li><strong>Bluetooth (impresora térmica emparejada)</strong> — Solo en Chrome y Edge. Pulsa <strong>Conectar impresora</strong> y elige la tuya. Si el Bluetooth falla en un cobro, la app abre la impresión del navegador y te lo dice.</li>
<li><strong>Ancho del papel</strong> — 80 mm (estándar) o 58 mm (compacto).</li>
<li><strong>Cajón portamonedas</strong> — No se conecta al ordenador ni a la tablet: va enchufado a la impresora por un cable RJ11 y es la impresora la que lo abre. Con impresora Bluetooth, marca <strong>Abrir el cajón automáticamente al cobrar</strong> (cualquier forma de pago) y comprueba con <strong>Probar apertura</strong>; en el TPV tendrás además un botón para abrirlo sin cobrar, que queda anotado en el Registro de actividad. Con impresión por navegador la app no puede abrirlo: activa «abrir cajón al imprimir» en las propiedades de la impresora del sistema.</li>
</ul>

<h4>QR auto pedido</h4>
<p>Aparece cuando tienes mesas y el servicio <em>En mesa</em> activo, y exige licencia y nube conectada. Cada mesa tiene su QR: el comensal ve la carta con alérgenos, pide a su mesa y, si tienes Stripe, paga la cuenta entera o su parte desde el móvil.</p>
<ul>
<li>Marca <strong>Activar la carta por QR en las mesas (pedido y pago)</strong>. Viene desactivado.</li>
<li><strong>Cuando llega un pedido desde el QR</strong>: <em>lo acepta el camarero antes de ir a cocina</em> (aparece arriba en el TPV) o <em>entra directo en cocina</em>.</li>
<li>Pulsa el nombre de una mesa para ver su QR y <strong>Descargar QR</strong>. <strong>Imprimir los QR de todas las mesas</strong> saca una hoja con uno por tarjeta.</li>
<li><strong>Cambiar QR</strong> genera uno nuevo y anula el impreso en esa mesa; úsalo si alguien se lo ha llevado o fotografiado.</li>
</ul>

<h4>Comandas de cocina y sala</h4>
<p>Cómo recibe el equipo lo que se marcha: <strong>Mostrar en pantalla</strong> (Comandas Cocina y las pantallas de sala, sin imprimir) o <strong>Imprimir</strong> (se abre un vale en cuanto se marcha un plato). Al elegir imprimir configuras uno o varios <strong>perfiles de impresora</strong> (cocina, barra, sala...), uno por cada punto físico:</p>
<ul>
<li>La casilla activa el perfil, y le das un nombre.</li>
<li>Ancho de papel (80 o 58 mm) y contenido: <strong>Comida</strong>, <strong>Bebida</strong> o <strong>Todo el pedido</strong>.</li>
<li>Cada perfil elige cómo imprime este aparato (navegador o Bluetooth, con <strong>Conectar impresora</strong>, <strong>Reconectar</strong> y <strong>Olvidar</strong>).</li>
<li><strong>Comanda de prueba</strong> en cada perfil: úsala antes de empezar a servir. <strong>Añadir impresora</strong> crea otro perfil.</li>
</ul>

<h4>Asistente de IA</h4>
<p>Con una clave de <strong>tu propio proveedor de IA</strong>, la app responde preguntas sobre tus números («Pregúntale a tus números»), lee facturas de proveedores a partir de una foto y te ayuda a crear platos en I+D. El consumo va a tu cuenta, no a GastroGoan.</p>
<ul>
<li>Elige el <strong>Proveedor</strong> (Google Gemini, Anthropic Claude u OpenAI ChatGPT), el <strong>Modelo</strong> (opcional) y pega la <strong>Clave</strong>. La de Google es gratuita: se saca en aistudio.google.com/apikey con una cuenta de Google.</li>
<li>Botones: <strong>Guardar</strong>, <strong>Probar la conexión</strong>, <strong>Ver modelos disponibles</strong> y <strong>Eliminar</strong>.</li>
<li>⚠ La clave se guarda <strong>solo en este dispositivo</strong>, nunca en la nube: así ningún empleado puede leerla. En otra tablet hay que ponerla de nuevo.</li>
<li>Verás cuántas consultas llevas hoy del tope diario por dispositivo, que está para que un fallo no gaste tu cuota sin darte cuenta.</li>
<li>Sin clave, la app funciona igual; esas ayudas se rellenan a mano. Un empleado que pulse «configurar» ve que lo hace el propietario aquí.</li>
</ul>

<h4>Reserva y pedidos online</h4>
<p>Con la licencia canjeada y la nube conectada, aquí tienes el <strong>enlace público</strong> y el <strong>código QR</strong> de tu negocio para que los clientes reserven mesa y pidan para llevar o a domicilio desde el móvil.</p>
<ul>
<li>Ves qué <strong>carta está activa</strong> para pedidos; si no hay ninguna, avisa en rojo (los clientes no podrán pedir).</li>
<li><strong>Descargar QR</strong> (para imprimirlo en mesas o escaparate), <strong>Ver página</strong>, <strong>Copiar enlace</strong> y un botón de <strong>WhatsApp</strong> con el mensaje ya escrito.</li>
<li><strong>Personaliza tu enlace</strong> — Cambia el código automático por un nombre corto (mi-restaurante). Si otro negocio ya lo usa, la app te lo dice.</li>
<li>La web pública muestra tu horario, tus cartas activas y el aforo libre, y recoge las solicitudes, que llegan a Reservas y al TPV.</li>
</ul>

<h4>Pedidos para llevar / domicilio</h4>
<p>Se oculta si tienes desactivados «Para llevar» y «A domicilio». Defines, con un solo botón <strong>Guardar</strong>:</p>
<ul>
<li><strong>Tiempo base de preparación</strong>, <strong>Extra por cada pedido en cola</strong> y <strong>Tiempo máximo a mostrar</strong>: con ellos la web dice al cliente «tu pedido estará listo en X min».</li>
<li><strong>Dejar de aceptar pedidos X min antes del cierre</strong>, <strong>Pedido mínimo (€)</strong> (sin envío) y <strong>Máx. pedidos por franja de 30 min</strong> para no saturar la cocina. 0 = sin límite.</li>
<li>Con delivery activo: <strong>Máx. paradas por ruta de reparto</strong> y <strong>Ventana de tiempo para agrupar en ruta</strong>.</li>
<li><strong>Formas de pago al entregar/recoger</strong>: efectivo, tarjeta (datáfono) y TPV virtual (pagar ahora online, solo con Stripe). Debe quedar una marcada.</li>
<li>Con delivery: <strong>Coste de envío a domicilio</strong>, <strong>Envío gratis a partir de</strong>, <strong>Códigos postales donde repartes</strong> (separados por comas) y <strong>Radio de reparto</strong> en km desde tu dirección (necesita la dirección rellena en Contacto). Se acepta el pedido si cumple una de las dos condiciones.</li>
</ul>

<h4>Plataformas de delivery y repartidores propios</h4>
<ul>
<li><strong>Plataformas de delivery</strong> (Glovo, Uber Eats, Just Eat, Deliveroo u otras): <strong>Añadir plataforma</strong> con su <strong>Comisión (%)</strong> y el <strong>IVA sobre la comisión (%)</strong>; la ventana te calcula cuánto recibes neto de un pedido de 20 €. Una casilla indica si la comisión también se aplica al envío. Hay otras dos para casos fiscales: factura desde otro país de la UE y «meto la factura real de cada mes en Gastos Variables» (para no estimar la comisión). Cada venta de esa plataforma resta su comisión como gasto en Gestión Económica. Editar y borrar con los botones de la fila.</li>
<li><strong>Repartidores propios</strong>: <strong>Añadir repartidor</strong> con nombre y teléfono con prefijo de país (+34...). Hay un acceso directo de <strong>WhatsApp</strong> y el botón <strong>Probar WhatsApp</strong>. Para que un empleado entre en el reparto automático, marca la casilla de repartidor en su ficha de Personal.</li>
</ul>

<h4>Pago online con tarjeta (Stripe)</h4>
<p>Tus clientes pagan con tarjeta, Apple Pay o Google Pay al hacer un pedido o una reserva con señal, y también en la carta por QR de mesa. El dinero va <strong>directo a tu cuenta de Stripe</strong> y de ahí a tu banco; GastroGoan no lo toca ni cobra comisión (Stripe cobra la suya, en torno a un 1,5 % + 0,25 € por pago con tarjeta europea).</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa <strong>Conectar con Stripe</strong>. Antes de saltar a Stripe verás una guía con lo que necesitarás (unos 15 minutos, una sola vez, mejor desde el móvil): DNI o NIE, IBAN, dirección y la app Google Authenticator.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>No crees antes la cuenta en stripe.com</strong>: el botón crea la de tu restaurante y, si te registras antes, acabarías con dos cuentas. Si Stripe pide una web y no tienes, la guía te da la de tu página de reservas, lista para copiar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Al terminar Stripe te devuelve a la app. El estado pasa a <strong>Activo</strong>. Si pone que Stripe está revisando tus datos, espera y pulsa <strong>Volver a comprobar</strong>; si te quedaste a medias, <strong>Terminar el alta en Stripe</strong> retoma donde lo dejaste.</div></div>
<ul>
<li>Con Stripe activo se habilitan en Mi Negocio la <strong>señal en reservas</strong>, el <strong>TPV virtual</strong> en pedidos y el pago desde el QR de mesa. <strong>Abrir mi Stripe</strong> lleva a tu panel; <strong>Desactivar</strong> deja de ofrecer el pago con tarjeta (tu cuenta de Stripe no se borra).</li>
<li>Los precios los pone siempre tu carta, no el navegador del cliente. Cada venta online se apunta por su importe total y la comisión de Stripe se apunta sola como gasto sin IVA (Gestión Económica → Gastos Variables → Comisiones venta).</li>
<li>El desplegable <strong>Cómo y cuándo cobras</strong> explica plazos (el primer ingreso tarda unos 7 días).</li>
</ul>

<h4>VeriFactu</h4>
<p>Aparece marcada <strong>Próximamente</strong> y bloqueada en gris: todavía no emite facturas verificables ni sirve para cumplir la normativa. Cuando esté lista, se activará aquí. Mientras tanto, cada ticket ya lleva su número de factura simplificada.</p>

<h4>Mantenimiento de datos</h4>
<ul>
<li><strong>Descargar copia de seguridad</strong> — Un archivo con todos los datos del negocio. Debajo ves cuándo fue la última; la app te avisa pasados 30 días.</li>
<li><strong>Restaurar copia de seguridad</strong> — Sustituye <strong>todos</strong> los datos de este dispositivo por los del archivo; te pide escribir el nombre del negocio para confirmar.</li>
<li><strong>Papelera</strong> — Guarda 30 días lo que borras (empleados, clientes, recetas, ingredientes, elaboraciones, reservas, pedidos). <strong>Restaurar</strong> o <strong>Borrar definitivamente</strong>.</li>
<li><strong>Registro de actividad</strong> — Quién hizo qué y cuándo, con filtro por empleado: sesiones, anulaciones, descuentos, cierres de caja con descuadre, aperturas del cajón, cambios de stock y de precio, reseteos de PIN... Registra <strong>solo a los empleados</strong>, nunca lo que haces tú; lo delicado sale en rojo.</li>
<li><strong>Avisos del navegador</strong> — <strong>Activar avisos</strong> para recibir mensajes urgentes del chat o un cierre de caja raro, aunque tengas otra pestaña abierta. Solo con el navegador abierto.</li>
<li><strong>Archivar datos antiguos</strong> — Elige una fecha (por defecto, hace un año) y la app te dice cuántas ventas, reservas, cierres y pedidos recibidos se archivarán. <strong>Archivar y descargar</strong> primero descarga un archivo y, al confirmar que lo tienes, los quita para aligerar la app.</li>
</ul>

<h4>Lo que no está aquí</h4>
<ul>
<li><strong>Empleados y accesos</strong> — Se dan de alta en <strong>Personal</strong>, no en Mi Negocio. Aquí solo tienes el código de negocio que ellos necesitan y el PIN del negocio.</li>
<li><strong>Idioma</strong> — Es un ajuste de cada dispositivo, con el selector <strong>ES / CA / EN</strong> de la cabecera.</li>
<li><strong>Tu contraseña de propietario y varios negocios</strong> — En el selector de negocios (botón <strong>Negocios</strong> de la cabecera).</li>
<li><strong>Tour guiado</strong> — En Manual de Uso.</li>
</ul>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>No cambia lo que escribes:</strong> sal del campo o pulsa <strong>Guardar todo</strong>. En ticket y pedidos, su propio <strong>Guardar</strong>.</li>
<li><strong>Las tarjetas de reserva online o QR piden «Configura la nube»:</strong> falta canjear la licencia o conectar Firebase.</li>
<li><strong>La reserva online no ofrece una mesa:</strong> le faltan las plazas.</li>
<li>Para nube, impresión, Stripe y números, mira el capítulo <strong>Preguntas frecuentes y problemas</strong>.</li>
</ul>`,
    ca:`<h3>Què és El Meu Negoci i com moure-t'hi</h3>
<p>El Meu Negoci (a <strong>Gestió</strong>) és el panell de control de la configuració: dades del local, impostos, taules, tiquets, impressores, reserves en línia, cobraments amb targeta i còpies de seguretat. És <strong>exclusiva del propietari</strong>: ni un empleat amb permís d'edició hi pot entrar.</p>
<p>És una pantalla llarga feta de targetes. A dalt tens la tira <strong>Ves a:</strong> amb un botó per a cada targeta; prem-lo per saltar-hi directament (s'il·lumina un moment). En mòbil les targetes van en una sola columna; en pantalles grans, en dues.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>Què es desa i quan.</strong> Gairebé tots els camps de «Dades del negoci» i «Operativa» es desen sols en sortir del camp; <strong>Desar-ho tot</strong> desa aquella targeta sencera de cop. Els interruptors (tipus de servei, calaix, QR de taula, mode de comandes) es desen en marcar-los. Les targetes <strong>Configuració del tiquet</strong> i <strong>Comandes per emportar / domicili</strong> tenen el seu propi botó <strong>Desar</strong>.</div>

<h4>Codi de negoci</h4>
<p>Els 8 caràcters de la llicència d'<strong>aquest local</strong>. És el que dones als teus empleats: el necessiten, juntament amb el seu nom i el seu PIN, per entrar des d'<strong>Accés Empleats</strong>. Si tens diversos locals, cadascun té el seu.</p>

<h4>PIN del negoci</h4>
<p>Un PIN de 4 dígits que es demana a un <strong>empleat</strong> per confirmar accions delicades (anul·lar una venda cobrada, esborrar un empleat, corregir un fitxatge...). Escriu el nou dues vegades i prem <strong>Canviar PIN</strong>; el propietari només ha de confirmar. Ve com 1234 fins que el canviïs, i l'app avisa si en tries un de massa fàcil (0000, 1234...). <strong>No és la teva contrasenya de propietari</strong> (aquesta es canvia al selector de negocis, amb «Canviar la meva contrasenya») i no dona accés a Gestió.</p>

<h4>Connexions externes</h4>
<p>Resum dels serveis de fora que fa servir l'app, cadascun amb <strong>el teu propi compte</strong>. A cada fila veus si està <strong>Connectat</strong> o <strong>Sense connectar</strong> i un botó (<strong>Connectar</strong> o <strong>Editar</strong>).</p>
<ul>
<li><strong>Núvol propi (Firebase)</strong> — Obligatori. Sincronitza tots els teus dispositius i desa les teves dades en temps real. És un projecte gratuït de Firebase que crees amb el teu compte de Google.
  <ul>
  <li>La primera vegada, un assistent de 6 passos et guia: crear el projecte, activar <em>Realtime Database</em> (ubicació Bèlgica, mode bloquejat), activar l'inici de sessió <em>Anònim</em>, <strong>autoritzar els dominis</strong> <strong>app.gastrogoan.com</strong> i <strong>reservas.gastrogoan.com</strong>, <strong>enganxar les regles de seguretat</strong> (amb botó de copiar) i registrar una app web per copiar la <strong>clau d'API</strong> i l'<strong>URL de la base de dades</strong>. Enganxa aquestes dues dades i prem <strong>Desar i connectar</strong>; l'app es recarrega.</li>
  <li>Amb el núvol ja connectat, el botó <strong>Editar</strong> obre <strong>Núvol — Sincronització entre dispositius</strong>: estat, <strong>Provar el meu núvol ara</strong>, motiu exacte si hi ha error (amb botó per copiar-lo), l'enllaç públic i, a <strong>Canviar la configuració de Firebase</strong>, les dues dades. Deixar-les buides i desar desconnecta el núvol d'aquell negoci.</li>
  <li>Si el teu projecte té unes <strong>regles de seguretat antigues</strong>, aquí surt un avís amb <strong>Copiar les regles noves</strong>. Enganxa-les a Firebase → Realtime Database → Regles → Publicar. No perds cap dada: les regles són només permisos.</li>
  <li>Per a un altre dispositiu no repeteixis res: entra amb el teu compte de propietari (o els teus empleats amb el seu codi) i el negoci apareix sol.</li>
  </ul></li>
<li><strong>Pagament en línia amb targeta (Stripe)</strong> — Opcional. La fila et porta a la targeta de Stripe, més avall.</li>
<li><strong>Posada a punt del teu negoci</strong> — Si et queda alguna cosa per fer, apareix <strong>Veure què falta</strong>, que recupera la llista de tasques a l'Inici.</li>
</ul>

<h4>Dades del negoci</h4>
<p>La targeta gran, dividida en blocs. S'usa en tiquets, web de reserves, comandes a proveïdors i selector de negocis.</p>
<ul>
<li><strong>Identitat</strong> — <strong>Logo</strong> (imatge de fins a 2 MB; <strong>Pujar logo</strong> / <strong>Treure</strong>), <strong>Nom del negoci</strong>, <strong>Propietari/ària</strong>, <strong>Tipus de negoci</strong>, <strong>Any d'obertura</strong> i <strong>Color de marca</strong> (el de la teva pàgina pública de reserves i comandes).</li>
<li><strong>Forma jurídica i règim fiscal</strong> — Decideix com calcula l'app els impostos a Gestió Econòmica. Tria <strong>Ets</strong>: <em>Autònom</em>, <em>Comunitat de Béns</em>, <em>Societat</em> o <em>Cooperativa</em>.
  <ul>
  <li><strong>Autònom</strong> → tries <strong>Tributes per</strong> <em>Estimació directa</em> (simplificada o normal, i la casella del primer any amb benefici) o <em>Mòduls</em>. També pots posar altres rendes del titular i els fills a càrrec, que afecten l'IRPF.</li>
  <li><strong>Comunitat de Béns</strong> → afegeixes cada <strong>comuner</strong> amb el seu percentatge (han de sumar 100 %) i el seu tipus d'IRPF.</li>
  <li><strong>Societat</strong> → impost de societats; pots indicar les vendes netes de l'any anterior. <strong>Cooperativa</strong> → té règim propi que l'app no calcula: consulta-ho amb la teva gestoria.</li>
  </ul>
  Sense això triat, el Compte de Resultats ho avisa en vermell. L'app ordena les teves dades; presentar impostos ho fa el teu gestor.</li>
<li><strong>Descripció</strong> — El concepte del teu local, que surt a la web de comandes.</li>
<li><strong>Contacte</strong> — Adreça (també la fa servir el radi de repartiment), telèfon, email, web i <strong>CIF/NIF</strong> (el NIF surt sempre al tiquet). A sota, <strong>Titular o raó social</strong> per a l'avís legal de la teva web de reserves, i una casella per <strong>mostrar el teu NIF</strong> en ell: la llei ho exigeix a qui recull dades de clients per internet.</li>
<li><strong>Xarxes socials</strong> — Instagram, Facebook, TikTok i <strong>Google Maps / Perfil d'empresa</strong>. Per a aquest últim cerca el teu negoci a Google Maps, prem «Comparteix» i enganxa l'enllaç: activa el QR de ressenyes del tiquet.</li>
</ul>
<p>Al final de la targeta, <strong>Desar-ho tot</strong>. A dins hi ha també:</p>
<ul>
<li><strong>Tipus de servei</strong> — Caselles <strong>A taula</strong>, <strong>Per emportar</strong> i <strong>A domicili</strong>. Es desen en marcar-les i condicionen els botons del TPV i les opcions de la web de comandes. N'ha de quedar almenys un d'actiu; l'app avisa si no encaixa amb el teu tipus de negoci.</li>
<li><strong>Horari d'obertura</strong> — Cada dia de dilluns a diumenge: casella d'obert i mode <strong>Per torns</strong> (fins a dos trams, per a l'horari partit) o <strong>Seguit</strong>. Per tancar a mitjanit escriu 00:00 a l'hora de tancament. Fixa l'aforament per torn a Reserves i les hores que ofereix la web; si un tancament és anterior a l'obertura o dos torns se solapen, l'app et pregunta abans de desar. La <strong>carta</strong> concreta de cada franja es decideix a Oferta Gastronòmica, no aquí.</li>
</ul>

<h4>Operativa</h4>
<p>La capacitat i la distribució del teu local.</p>
<ul>
<li><strong>Aforament</strong> (comensals per servei) i <strong>Durada de taula (min)</strong> — quant ocupa una reserva una taula abans de poder tornar-la a oferir.</li>
<li><strong>Antelació mínima (reserves)</strong> i <strong>Antelació mínima (comandes)</strong> — amb quanta antelació ha de reservar o demanar un client (dies, hores i minuts). Són dos ajustos diferents; l'app avisa si la de comandes és més gran del que dura el teu horari aquell dia.</li>
<li><strong>Reserves de grup per telèfon o email</strong> — Marca la casella i posa <strong>a partir de quants comensals</strong>: la web no deixa reservar i demana al client que et truqui o t'escrigui. La resta es confirmen soles si hi ha taula.</li>
<li><strong>Demanar senyal per confirmar reserves</strong> — Cobra una senyal amb targeta en reservar. Necessita Stripe connectat (si no, t'ho diu i hi ha un botó per anar-lo a connectar). Tries l'<strong>import</strong>, si és <strong>fix per reserva</strong> o <strong>per persona</strong>, <strong>a partir de quantes persones</strong> (0 = sempre) i una nota per al client.</li>
<li><strong>Crea el plànol de la teva sala</strong> — Escriu el <strong>Nom de la zona</strong> (Interior, Terrassa, Barra, Planta 1...), el <strong>Nombre de taules</strong> i les <strong>Places per taula</strong> (obligatòries) i prem <strong>Crear zona</strong>: es creen totes de cop. No hi ha zones fixes: les que tu vulguis.</li>
<li><strong>Taules configurades</strong> — Reanomena una zona escrivint sobre el seu nom, afegeix una taula a la zona (<strong>+</strong>), elimina la zona sencera (paperera), o canvia el nom i les places de cada taula. Les taules sense places surten marcades en vermell: la web de reserves no les pot oferir. Una taula o zona amb una comanda oberta no es pot esborrar fins que es cobri al TPV. Si la suma de places s'allunya molt de l'aforament, apareix un avís.</li>
</ul>
<p>Aquestes taules són les que veus al TPV, a Reserves i als QR de taula.</p>

<h4>Configuració del tiquet</h4>
<p>Què surt imprès als teus tiquets: <strong>Mostrar adreça</strong>, <strong>Mostrar telèfon</strong>, <strong>Mostrar web</strong>, <strong>Mostrar CIF/NIF</strong> (sempre marcada i bloquejada, és obligatori), <strong>Demanar ressenya amb QR al final del tiquet</strong> (necessita l'enllaç de Google Maps), un <strong>Missatge de peu de tiquet</strong> i l'<strong>IVA (%)</strong> general que s'usa per al desglossament quan un article no porta el seu. Prem <strong>Desar</strong> i mira el resultat amb <strong>Vista prèvia del tiquet</strong>. Cada tiquet porta un número de factura simplificada propi de cada dispositiu.</p>

<h4>Impressora de tiquets (i calaix)</h4>
<p>Com imprimeix <strong>aquest aparell</strong> (cada tauleta o lloc tria la seva):</p>
<ul>
<li><strong>Navegador / AirPrint / impressora del sistema</strong> — Serveix per a qualsevol impressora instal·lada (xarxa, USB, AirPrint). Tries la impressora al quadre d'imprimir una vegada i queda recordada. És l'única opció a iPhone, iPad i Firefox.</li>
<li><strong>Bluetooth (impressora tèrmica emparellada)</strong> — Només a Chrome i Edge. Prem <strong>Connectar impressora</strong> i tria la teva. Si el Bluetooth falla en un cobrament, l'app obre la impressió del navegador i t'ho diu.</li>
<li><strong>Amplada del paper</strong> — 80 mm (estàndard) o 58 mm (compacte).</li>
<li><strong>Calaix portamonedes</strong> — No es connecta a l'ordinador ni a la tauleta: va endollat a la impressora amb un cable RJ11 i és la impressora qui l'obre. Amb impressora Bluetooth, marca <strong>Obrir el calaix automàticament en cobrar</strong> (qualsevol forma de pagament) i comprova-ho amb <strong>Provar obertura</strong>; al TPV tindràs a més un botó per obrir-lo sense cobrar, que queda anotat al Registre d'activitat. Amb impressió pel navegador l'app no el pot obrir: activa «obrir calaix en imprimir» a les propietats de la impressora del sistema.</li>
</ul>

<h4>QR autocomanda</h4>
<p>Apareix quan tens taules i el servei <em>A taula</em> actiu, i exigeix llicència i núvol connectat. Cada taula té el seu QR: el comensal veu la carta amb al·lèrgens, demana a la seva taula i, si tens Stripe, paga el compte sencer o la seva part des del mòbil.</p>
<ul>
<li>Marca <strong>Activar la carta per QR a les taules (comanda i pagament)</strong>. Ve desactivat.</li>
<li><strong>Quan arriba una comanda des del QR</strong>: <em>l'accepta el cambrer abans d'anar a cuina</em> (apareix a dalt al TPV) o <em>entra directament a cuina</em>.</li>
<li>Prem el nom d'una taula per veure'n el QR i <strong>Descarregar QR</strong>. <strong>Imprimir els QR de totes les taules</strong> treu un full amb un per targeta.</li>
<li><strong>Canviar QR</strong> en genera un de nou i anul·la l'imprès en aquella taula; fes-ho servir si algú se l'ha endut o fotografiat.</li>
</ul>

<h4>Comandes de cuina i sala</h4>
<p>Com rep l'equip el que es marxa: <strong>Mostrar en pantalla</strong> (Comandes Cuina i les pantalles de sala, sense imprimir) o <strong>Imprimir</strong> (s'obre un val en marxar un plat). En triar imprimir configures un o diversos <strong>perfils d'impressora</strong> (cuina, barra, sala...), un per cada punt físic:</p>
<ul>
<li>La casella activa el perfil, i li poses un nom.</li>
<li>Amplada de paper (80 o 58 mm) i contingut: <strong>Menjar</strong>, <strong>Beguda</strong> o <strong>Tota la comanda</strong>.</li>
<li>Cada perfil tria com imprimeix aquest aparell (navegador o Bluetooth, amb <strong>Connectar impressora</strong>, <strong>Reconnectar</strong> i <strong>Oblidar</strong>).</li>
<li><strong>Comanda de prova</strong> a cada perfil: fes-la servir abans de començar a servir. <strong>Afegir impressora</strong> crea un altre perfil.</li>
</ul>

<h4>Assistent d'IA</h4>
<p>Amb una clau del <strong>teu propi proveïdor d'IA</strong>, l'app respon preguntes sobre els teus números («Pregunta-ho als teus números»), llegeix factures de proveïdors a partir d'una foto i t'ajuda a crear plats a R+D. El consum va al teu compte, no a GastroGoan.</p>
<ul>
<li>Tria el <strong>Proveïdor</strong> (Google Gemini, Anthropic Claude o OpenAI ChatGPT), el <strong>Model</strong> (opcional) i enganxa la <strong>Clau</strong>. La de Google és gratuïta: es treu a aistudio.google.com/apikey amb un compte de Google.</li>
<li>Botons: <strong>Desar</strong>, <strong>Provar la connexió</strong>, <strong>Veure models disponibles</strong> i <strong>Eliminar</strong>.</li>
<li>⚠ La clau es desa <strong>només en aquest dispositiu</strong>, mai al núvol: així cap empleat no la pot llegir. En una altra tauleta cal tornar-la a posar.</li>
<li>Veuràs quantes consultes portes avui del límit diari per dispositiu, que hi és perquè una errada no gasti la teva quota sense adonar-te'n.</li>
<li>Sense clau, l'app funciona igual; aquestes ajudes s'omplen a mà. Un empleat que premi «configurar» veu que ho fa el propietari aquí.</li>
</ul>

<h4>Reserva i comandes en línia</h4>
<p>Amb la llicència bescanviada i el núvol connectat, aquí tens l'<strong>enllaç públic</strong> i el <strong>codi QR</strong> del teu negoci perquè els clients reservin taula i demanin per emportar o a domicili des del mòbil.</p>
<ul>
<li>Veus quina <strong>carta és activa</strong> per a comandes; si no n'hi ha cap, avisa en vermell (els clients no podran demanar).</li>
<li><strong>Descarregar QR</strong> (per imprimir-lo a les taules o a l'aparador), <strong>Veure pàgina</strong>, <strong>Copiar enllaç</strong> i un botó de <strong>WhatsApp</strong> amb el missatge ja escrit.</li>
<li><strong>Personalitza el teu enllaç</strong> — Canvia el codi automàtic per un nom curt (el-meu-restaurant). Si un altre negoci ja el fa servir, l'app t'ho diu.</li>
<li>La web pública mostra el teu horari, les teves cartes actives i l'aforament lliure, i recull les sol·licituds, que arriben a Reserves i al TPV.</li>
</ul>

<h4>Comandes per emportar / domicili</h4>
<p>S'amaga si tens desactivats «Per emportar» i «A domicili». Defineixes, amb un sol botó <strong>Desar</strong>:</p>
<ul>
<li><strong>Temps base de preparació</strong>, <strong>Extra per cada comanda en cua</strong> i <strong>Temps màxim a mostrar</strong>: amb ells la web diu al client «la teva comanda estarà llesta en X min».</li>
<li><strong>Deixar d'acceptar comandes X min abans del tancament</strong>, <strong>Comanda mínima (€)</strong> (sense enviament) i <strong>Màx. comandes per franja de 30 min</strong> per no saturar la cuina. 0 = sense límit.</li>
<li>Amb delivery actiu: <strong>Màx. parades per ruta de repartiment</strong> i <strong>Finestra de temps per agrupar en ruta</strong>.</li>
<li><strong>Formes de pagament en entregar/recollir</strong>: efectiu, targeta (datàfon) i TPV virtual (pagar ara en línia, només amb Stripe). N'ha de quedar una de marcada.</li>
<li>Amb delivery: <strong>Cost d'enviament a domicili</strong>, <strong>Enviament gratis a partir de</strong>, <strong>Codis postals on repartiu</strong> (separats per comes) i <strong>Radi de repartiment</strong> en km des de la teva adreça (necessita l'adreça emplenada a Contacte). S'accepta la comanda si compleix una de les dues condicions.</li>
</ul>

<h4>Plataformes de delivery i repartidors propis</h4>
<ul>
<li><strong>Plataformes de delivery</strong> (Glovo, Uber Eats, Just Eat, Deliveroo o altres): <strong>Afegir plataforma</strong> amb la seva <strong>Comissió (%)</strong> i l'<strong>IVA sobre la comissió (%)</strong>; la finestra et calcula quant reps net d'una comanda de 20 €. Una casella indica si la comissió també s'aplica a l'enviament. N'hi ha dues més per a casos fiscals: factura des d'un altre país de la UE i «poso la factura real de cada mes a Despeses Variables» (per no estimar la comissió). Cada venda d'aquesta plataforma resta la seva comissió com a despesa a Gestió Econòmica. Editar i esborrar amb els botons de la fila.</li>
<li><strong>Repartidors propis</strong>: <strong>Afegir repartidor</strong> amb nom i telèfon amb prefix de país (+34...). Hi ha un accés directe de <strong>WhatsApp</strong> i el botó <strong>Provar WhatsApp</strong>. Perquè un empleat entri al repartiment automàtic, marca la casella de repartidor a la seva fitxa de Personal.</li>
</ul>

<h4>Pagament en línia amb targeta (Stripe)</h4>
<p>Els teus clients paguen amb targeta, Apple Pay o Google Pay en fer una comanda o una reserva amb senyal, i també a la carta per QR de taula. Els diners van <strong>directes al teu compte de Stripe</strong> i d'allà al teu banc; GastroGoan no els toca ni cobra comissió (Stripe cobra la seva, al voltant d'un 1,5 % + 0,25 € per pagament amb targeta europea).</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem <strong>Connectar amb Stripe</strong>. Abans de saltar a Stripe veuràs una guia amb el que necessitaràs (uns 15 minuts, una sola vegada, millor des del mòbil): DNI o NIE, IBAN, adreça i l'app Google Authenticator.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>No creïs abans el compte a stripe.com</strong>: el botó crea el del teu restaurant i, si et registres abans, acabaries amb dos comptes. Si Stripe demana una web i no en tens, la guia et dona la de la teva pàgina de reserves, a punt per copiar.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">En acabar, Stripe et torna a l'app. L'estat passa a <strong>Actiu</strong>. Si diu que Stripe està revisant les teves dades, espera i prem <strong>Tornar a comprovar</strong>; si t'has quedat a mitges, <strong>Acabar l'alta a Stripe</strong> reprèn on ho vas deixar.</div></div>
<ul>
<li>Amb Stripe actiu s'habiliten a El Meu Negoci la <strong>senyal en reserves</strong>, el <strong>TPV virtual</strong> en comandes i el pagament des del QR de taula. <strong>Obrir el meu Stripe</strong> porta al teu panell; <strong>Desactivar</strong> deixa d'oferir el pagament amb targeta (el teu compte de Stripe no s'esborra).</li>
<li>Els preus els posa sempre la teva carta, no el navegador del client. Cada venda en línia s'apunta pel seu import total i la comissió de Stripe s'apunta sola com a despesa sense IVA (Gestió Econòmica → Despeses Variables → Comissions venda).</li>
<li>El desplegable <strong>Com i quan cobres</strong> explica terminis (el primer ingrés triga uns 7 dies).</li>
</ul>

<h4>VeriFactu</h4>
<p>Apareix marcada <strong>Properament</strong> i bloquejada en gris: encara no emet factures verificables ni serveix per complir la normativa. Quan estigui llesta, s'activarà aquí. Mentrestant, cada tiquet ja porta el seu número de factura simplificada.</p>

<h4>Manteniment de dades</h4>
<ul>
<li><strong>Descarregar còpia de seguretat</strong> — Un fitxer amb totes les dades del negoci. A sota veus quan va ser l'última; l'app t'avisa passats 30 dies.</li>
<li><strong>Restaurar còpia de seguretat</strong> — Substitueix <strong>totes</strong> les dades d'aquest dispositiu per les del fitxer; et demana escriure el nom del negoci per confirmar.</li>
<li><strong>Paperera</strong> — Guarda 30 dies el que esborres (empleats, clients, receptes, ingredients, elaboracions, reserves, comandes). <strong>Restaurar</strong> o <strong>Esborrar definitivament</strong>.</li>
<li><strong>Registre d'activitat</strong> — Qui va fer què i quan, amb filtre per empleat: sessions, anul·lacions, descomptes, tancaments de caixa amb descaix, obertures del calaix, canvis d'estoc i de preu, reinicis de PIN... Registra <strong>només els empleats</strong>, mai el que fas tu; el delicat surt en vermell.</li>
<li><strong>Avisos del navegador</strong> — <strong>Activar avisos</strong> per rebre missatges urgents del xat o un tancament de caixa estrany, encara que tinguis una altra pestanya oberta. Només amb el navegador obert.</li>
<li><strong>Arxivar dades antigues</strong> — Tria una data (per defecte, fa un any) i l'app et diu quantes vendes, reserves, tancaments i comandes rebudes s'arxivaran. <strong>Arxivar i descarregar</strong> primer descarrega un fitxer i, quan confirmes que el tens, ho treu per alleugerir l'app.</li>
</ul>

<h4>El que no és aquí</h4>
<ul>
<li><strong>Empleats i accessos</strong> — Es donen d'alta a <strong>Personal</strong>, no a El Meu Negoci. Aquí només tens el codi de negoci que necessiten i el PIN del negoci.</li>
<li><strong>Idioma</strong> — És un ajust de cada dispositiu, amb el selector <strong>ES / CA / EN</strong> de la capçalera.</li>
<li><strong>La teva contrasenya de propietari i diversos negocis</strong> — Al selector de negocis (botó <strong>Negocis</strong> de la capçalera).</li>
<li><strong>Tour guiat</strong> — Al Manual d'Ús.</li>
</ul>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No canvia el que escrius:</strong> surt del camp o prem <strong>Desar-ho tot</strong>. A tiquet i comandes, el seu propi <strong>Desar</strong>.</li>
<li><strong>Les targetes de reserva en línia o QR demanen «Configura el núvol»:</strong> falta bescanviar la llicència o connectar Firebase.</li>
<li><strong>La reserva en línia no ofereix una taula:</strong> li falten les places.</li>
<li>Per a núvol, impressió, Stripe i números, mira el capítol <strong>Preguntes freqüents i problemes</strong>.</li>
</ul>`,
    en:`<h3>What My Business is and how to find your way around</h3>
<p>My Business (in <strong>Management</strong>) is the configuration control panel: the venue's details, taxes, tables, receipts, printers, online reservations, card payments and backups. It is <strong>owner-only</strong>: not even an employee with edit permission can get in.</p>
<p>It is a long screen made of cards. At the top is the <strong>Jump to:</strong> strip with one button per card; tap it to jump straight there (the card lights up briefly). On a phone the cards form a single column; on large screens, two.</p>
<div class="manual-tip"><i class="ti ti-bulb"></i><strong>What saves and when.</strong> Almost every field in "Business details" and "Operations" saves itself when you leave the field; <strong>Save all</strong> saves that whole card at once. Switches (service types, drawer, table QR, ticket mode) save as you tick them. The <strong>Receipt settings</strong> and <strong>Takeaway / delivery orders</strong> cards have their own <strong>Save</strong> button.</div>

<h4>Business code</h4>
<p>The 8 characters of <strong>this location's</strong> licence. It is what you give your employees: together with their name and PIN they need it to sign in from <strong>Employee access</strong>. If you have several locations, each has its own.</p>

<h4>Business PIN</h4>
<p>A 4-digit PIN asked from an <strong>employee</strong> to confirm delicate actions (voiding a charged sale, deleting an employee, correcting a clock-in...). Type the new one twice and tap <strong>Change PIN</strong>; the owner only has to confirm. It is 1234 until you change it, and the app warns if you pick a very easy one (0000, 1234...). <strong>It is not your owner password</strong> (that one is changed in the business selector, with "Change my password") and it does not give access to Management.</p>

<h4>External connections</h4>
<p>A summary of the outside services the app uses, each with <strong>your own account</strong>. Each row shows whether it is <strong>Connected</strong> or <strong>Not connected</strong> and a button (<strong>Connect</strong> or <strong>Edit</strong>).</p>
<ul>
<li><strong>Own cloud (Firebase)</strong> — Mandatory. It syncs all your devices and stores your data in real time. It is a free Firebase project that you create with your Google account.
  <ul>
  <li>The first time, a 6-step wizard guides you: create the project, enable <em>Realtime Database</em> (Belgium location, locked mode), enable <em>Anonymous</em> sign-in, <strong>authorise the domains</strong> <strong>app.gastrogoan.com</strong> and <strong>reservas.gastrogoan.com</strong>, <strong>paste the security rules</strong> (with a copy button) and register a web app to copy the <strong>API key</strong> and the <strong>database URL</strong>. Paste those two values and tap <strong>Save and connect</strong>; the app reloads.</li>
  <li>With the cloud already connected, <strong>Edit</strong> opens <strong>Cloud — Sync between devices</strong>: status, <strong>Test my cloud now</strong>, the exact reason if there is an error (with a button to copy it), the public link and, under <strong>Change Firebase settings</strong>, the two values. Leaving them empty and saving disconnects that business's cloud.</li>
  <li>If your project has <strong>old security rules</strong>, a notice appears here with <strong>Copy the new rules</strong>. Paste them into Firebase → Realtime Database → Rules → Publish. You lose no data: rules are only permissions.</li>
  <li>For another device you repeat nothing: sign in with your owner account (or your employees with their code) and the business appears on its own.</li>
  </ul></li>
<li><strong>Online card payment (Stripe)</strong> — Optional. The row takes you to the Stripe card, further down.</li>
<li><strong>Setting up your business</strong> — If anything is left to do, <strong>See what is left</strong> appears, which brings the task list back on the Home screen.</li>
</ul>

<h4>Business details</h4>
<p>The big card, split into blocks. It is used on receipts, the booking website, supplier orders and the business selector.</p>
<ul>
<li><strong>Identity</strong> — <strong>Logo</strong> (an image up to 2 MB; <strong>Upload logo</strong> / <strong>Remove</strong>), <strong>Business name</strong>, <strong>Owner</strong>, <strong>Business type</strong>, <strong>Year opened</strong> and <strong>Brand color</strong> (the one on your public reservations and ordering page).</li>
<li><strong>Legal form and tax regime</strong> — Decides how the app calculates taxes in Financial Management. Choose <strong>You are</strong>: <em>Self-employed</em>, <em>Community of Property (CB)</em>, <em>Company</em> or <em>Cooperative</em>.
  <ul>
  <li><strong>Self-employed</strong> → you choose <strong>You are taxed under</strong> <em>Actual-expense taxation</em> (simplified or normal, plus the first-profitable-year box) or <em>Modules</em>. You can also enter the holder's other income and dependent children, which affect income tax.</li>
  <li><strong>Community of Property</strong> → add each <strong>co-owner</strong> with their share (must total 100 %) and their income-tax rate.</li>
  <li><strong>Company</strong> → corporate tax; you can enter last year's net sales. <strong>Cooperative</strong> → it has its own regime that the app does not calculate: check with your accountant.</li>
  </ul>
  Without this chosen, the Income Statement warns you in red. The app organises your data; filing taxes is done by your accountant.</li>
<li><strong>Description</strong> — Your venue's concept, shown on the ordering website.</li>
<li><strong>Contact</strong> — Address (the delivery radius uses it too), phone, email, website and <strong>Tax ID</strong> (the tax ID always appears on the receipt). Below, <strong>Legal owner or company name</strong> for your booking website's legal notice, and a box to <strong>show your tax ID</strong> in it: the law requires it from anyone collecting customer data online.</li>
<li><strong>Social media</strong> — Instagram, Facebook, TikTok and <strong>Google Maps / Business profile</strong>. For the last one, search your business on Google Maps, tap "Share" and paste the link: it enables the review QR on receipts.</li>
</ul>
<p>At the bottom of the card, <strong>Save all</strong>. Inside it you also find:</p>
<ul>
<li><strong>Service types</strong> — Checkboxes <strong>Dine-in</strong>, <strong>Takeaway</strong> and <strong>Delivery</strong>. They save as you tick them and control the POS buttons and the ordering website's options. At least one must stay on; the app warns if it does not fit your business type.</li>
<li><strong>Opening hours</strong> — Each day from Monday to Sunday: an open checkbox and mode <strong>By shift</strong> (up to two blocks, for split hours) or <strong>Continuous</strong>. To close at midnight, type 00:00 as closing time. It sets the capacity per slot in Reservations and the times the website offers; if a closing time is before the opening or two shifts overlap, the app asks before saving. Which <strong>menu</strong> applies to each time slot is decided in Menu Offering, not here.</li>
</ul>

<h4>Operations</h4>
<p>Your venue's capacity and layout.</p>
<ul>
<li><strong>Capacity</strong> (guests per service) and <strong>Table duration (min)</strong> — how long a booking occupies a table before it can be offered again.</li>
<li><strong>Minimum lead time (reservations)</strong> and <strong>Minimum lead time (orders)</strong> — how far ahead a customer must book or order (days, hours and minutes). They are two separate settings; the app warns if the orders one is longer than your opening window that day.</li>
<li><strong>Group bookings by phone or email</strong> — Tick the box and set <strong>from how many guests</strong>: the website won't take the booking and asks the guest to call or email you. All others confirm themselves if there is a table.</li>
<li><strong>Require a deposit to confirm reservations</strong> — Charges a deposit by card when booking. It needs Stripe connected (if not, it says so and a button takes you to connect it). You choose the <strong>amount</strong>, whether it is <strong>fixed per booking</strong> or <strong>per person</strong>, <strong>from how many people</strong> (0 = always) and a note for the customer.</li>
<li><strong>Create your floor plan</strong> — Type the <strong>Zone name</strong> (Indoor, Terrace, Bar, Floor 1...), the <strong>Number of tables</strong> and the <strong>Seats per table</strong> (required) and tap <strong>Create zone</strong>: they are all created at once. There are no fixed zones: as many as you like.</li>
<li><strong>Configured tables</strong> — Rename a zone by typing over its name, add a table to the zone (<strong>+</strong>), delete the whole zone (bin), or change each table's name and seats. Tables without seats show in red: the booking website cannot offer them. A table or zone with an open order cannot be deleted until it is charged in the POS. If total seats are far from your capacity, a notice appears.</li>
</ul>
<p>These tables are the ones you see in the POS, in Reservations and on the table QR codes.</p>

<h4>Receipt settings</h4>
<p>What is printed on your receipts: <strong>Show address</strong>, <strong>Show phone</strong>, <strong>Show website</strong>, <strong>Show tax ID</strong> (always ticked and locked, it is mandatory), <strong>Ask for a review with a QR at the bottom of the receipt</strong> (needs the Google Maps link), a <strong>Receipt footer message</strong> and the general <strong>VAT (%)</strong> used for the breakdown when an item has no rate of its own. Tap <strong>Save</strong> and see the result with <strong>Receipt preview</strong>. Each receipt carries a simplified-invoice number of its own per device.</p>

<h4>Receipt printer (and cash drawer)</h4>
<p>How <strong>this device</strong> prints (each tablet or station picks its own):</p>
<ul>
<li><strong>Browser / AirPrint / system printer</strong> — Works with any installed printer (network, USB, AirPrint). You pick the printer in the print dialog once and it is remembered. It is the only option on iPhone, iPad and Firefox.</li>
<li><strong>Bluetooth (paired thermal printer)</strong> — Chrome and Edge only. Tap <strong>Connect printer</strong> and choose yours. If Bluetooth fails during a charge, the app opens the browser print and tells you.</li>
<li><strong>Paper width</strong> — 80 mm (standard) or 58 mm (compact).</li>
<li><strong>Cash drawer</strong> — It does not connect to the computer or tablet: it plugs into the printer with an RJ11 cable and the printer is what opens it. With a Bluetooth printer, tick <strong>Open the drawer automatically on every charge</strong> (any payment method) and check with <strong>Test opening</strong>; in the POS you also get a button to open it without charging, which is recorded in the Activity log. With browser printing the app cannot open it: turn on "open cash drawer when printing" in the system printer's properties.</li>
</ul>

<h4>Self-order QR</h4>
<p>It appears when you have tables and the <em>Dine-in</em> service on, and requires a licence and connected cloud. Each table has its own QR: diners see the menu with allergens, order to their table and, if you have Stripe, pay the whole bill or their share from their phone.</p>
<ul>
<li>Tick <strong>Turn on the QR menu at tables (ordering and payment)</strong>. It is off by default.</li>
<li><strong>When an order arrives from the QR</strong>: <em>a waiter accepts it before it goes to the kitchen</em> (it shows at the top of the POS) or <em>it goes straight to the kitchen</em>.</li>
<li>Tap a table's name to see its QR and <strong>Download QR</strong>. <strong>Print the QR codes for all tables</strong> produces a sheet with one per card.</li>
<li><strong>Change QR</strong> generates a new one and cancels the one printed on that table; use it if someone took or photographed it.</li>
</ul>

<h4>Kitchen and floor tickets</h4>
<p>How the team receives what is fired: <strong>Show on screen</strong> (Kitchen Orders and the floor screens, nothing printed) or <strong>Print</strong> (a ticket opens as soon as a dish is fired). When you choose print you set up one or more <strong>printer profiles</strong> (kitchen, bar, dining room...), one per physical spot:</p>
<ul>
<li>The checkbox switches the profile on, and you give it a name.</li>
<li>Paper width (80 or 58 mm) and content: <strong>Food</strong>, <strong>Drinks</strong> or <strong>Whole order</strong>.</li>
<li>Each profile chooses how this device prints (browser or Bluetooth, with <strong>Connect printer</strong>, <strong>Reconnect</strong> and <strong>Forget</strong>).</li>
<li><strong>Test ticket</strong> on each profile: use it before you start serving. <strong>Add printer</strong> creates another profile.</li>
</ul>

<h4>AI assistant</h4>
<p>With a key from <strong>your own AI provider</strong>, the app answers questions about your numbers ("Ask your numbers"), reads supplier invoices from a photo and helps you create dishes in R&amp;D. Usage goes to your account, not to GastroGoan.</p>
<ul>
<li>Choose the <strong>Provider</strong> (Google Gemini, Anthropic Claude or OpenAI ChatGPT), the <strong>Model</strong> (optional) and paste the <strong>Key</strong>. Google's is free: get it at aistudio.google.com/apikey with a Google account.</li>
<li>Buttons: <strong>Save</strong>, <strong>Test the connection</strong>, <strong>See available models</strong> and <strong>Delete</strong>.</li>
<li>⚠ The key is stored <strong>only on this device</strong>, never in the cloud: that way no employee can read it. On another tablet you must enter it again.</li>
<li>You will see how many queries you have used today out of the daily limit per device, which exists so a glitch cannot burn your quota unnoticed.</li>
<li>Without a key the app works just the same; those helpers are filled in by hand. An employee who taps "set up" is told the owner does it here.</li>
</ul>

<h4>Online reservations and orders</h4>
<p>With the licence redeemed and the cloud connected, here is your business's <strong>public link</strong> and <strong>QR code</strong> so customers can book a table and order takeaway or delivery from their phone.</p>
<ul>
<li>You see which <strong>menu is active</strong> for orders; if there is none it warns in red (customers won't be able to order).</li>
<li><strong>Download QR</strong> (to print for tables or the shop window), <strong>View page</strong>, <strong>Copy link</strong> and a <strong>WhatsApp</strong> button with the message already written.</li>
<li><strong>Customize your link</strong> — Replace the automatic code with a short name (my-restaurant). If another business already uses it, the app tells you.</li>
<li>The public site shows your hours, your active menus and free capacity, and collects the requests, which arrive in Reservations and the POS.</li>
</ul>

<h4>Takeaway / delivery orders</h4>
<p>Hidden if you have turned off both "Takeaway" and "Delivery". You define, with a single <strong>Save</strong> button:</p>
<ul>
<li><strong>Base prep time</strong>, <strong>Extra per order in queue</strong> and <strong>Max time to show</strong>: with them the website tells the customer "your order should be ready in X min".</li>
<li><strong>Stop accepting orders X min before closing</strong>, <strong>Minimum order (€)</strong> (excluding delivery) and <strong>Max. orders per 30-min slot</strong> to avoid overloading the kitchen. 0 = no limit.</li>
<li>With delivery on: <strong>Max. stops per delivery route</strong> and <strong>Time window to group into a route</strong>.</li>
<li><strong>Payment methods on delivery/pickup</strong>: cash, card (reader) and virtual POS (pay now online, Stripe only). At least one must stay ticked.</li>
<li>With delivery: <strong>Delivery fee</strong>, <strong>Free delivery from</strong>, <strong>Postal codes you deliver to</strong> (comma-separated) and <strong>Delivery radius</strong> in km from your address (needs the address filled in under Contact). An order is accepted if it meets either condition.</li>
</ul>

<h4>Delivery platforms and own couriers</h4>
<ul>
<li><strong>Delivery platforms</strong> (Glovo, Uber Eats, Just Eat, Deliveroo or others): <strong>Add platform</strong> with its <strong>Commission (%)</strong> and the <strong>VAT on commission (%)</strong>; the window works out how much you net on a €20 order. A checkbox says whether the commission also applies to the delivery fee. Two more cover tax cases: invoice from another EU country and "I enter the real invoice each month in Variable Expenses" (so the commission is not estimated). Each sale from that platform deducts its commission as an expense in Financial Management. Edit and delete with the row's buttons.</li>
<li><strong>Own couriers</strong>: <strong>Add courier</strong> with a name and a phone including the country code (+34...). There is a direct <strong>WhatsApp</strong> shortcut and a <strong>Test WhatsApp</strong> button. For an employee to join the automatic delivery rota, tick the rider box on their Staff record.</li>
</ul>

<h4>Online card payment (Stripe)</h4>
<p>Your customers pay by card, Apple Pay or Google Pay when placing an order or a booking with a deposit, and also in the table QR menu. The money goes <strong>straight to your Stripe account</strong> and from there to your bank; GastroGoan never touches it or takes a commission (Stripe charges its own, around 1.5% + €0.25 per European card payment).</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Tap <strong>Connect with Stripe</strong>. Before jumping to Stripe you will see a guide to what you need (about 15 minutes, only once, best from your phone): ID card or NIE, IBAN, address and the Google Authenticator app.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Do not create the account on stripe.com beforehand</strong>: the button creates your restaurant's, and signing up first would leave you with two accounts. If Stripe asks for a website and you have none, the guide gives you your booking page's, ready to copy.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">When finished, Stripe brings you back to the app. The status turns <strong>Active</strong>. If it says Stripe is reviewing your details, wait and tap <strong>Check again</strong>; if you stopped halfway, <strong>Finish signing up on Stripe</strong> picks up where you left off.</div></div>
<ul>
<li>With Stripe active, My Business enables the <strong>deposit on reservations</strong>, the <strong>virtual POS</strong> on orders and payment from the table QR. <strong>Open my Stripe</strong> takes you to your dashboard; <strong>Turn off</strong> stops offering card payment (your Stripe account is not deleted).</li>
<li>Prices always come from your menu, not from the customer's browser. Each online sale is recorded at its full amount and the Stripe fee is recorded automatically as an expense with no VAT (Financial Management → Variable Expenses → Sales commissions).</li>
<li>The <strong>How and when you get paid</strong> dropdown explains timings (the first payout takes about 7 days).</li>
</ul>

<h4>VeriFactu</h4>
<p>It shows marked <strong>Coming soon</strong> and greyed out: it does not issue verifiable invoices yet and cannot be used to comply with the regulation. When it is ready, it will be turned on here. Meanwhile, each receipt already carries its simplified-invoice number.</p>

<h4>Data maintenance</h4>
<ul>
<li><strong>Download backup</strong> — A file with all the business's data. Below you see when the last one was; the app warns you after 30 days.</li>
<li><strong>Restore backup</strong> — Replaces <strong>all</strong> the data on this device with the file's; it asks you to type the business name to confirm.</li>
<li><strong>Recycle bin</strong> — Keeps what you delete for 30 days (employees, customers, recipes, ingredients, preparations, reservations, orders). <strong>Restore</strong> or <strong>Delete permanently</strong>.</li>
<li><strong>Activity log</strong> — Who did what and when, with a filter by employee: sign-ins, voids, discounts, cash closures with a mismatch, drawer openings, stock and price changes, PIN resets... It records <strong>employees only</strong>, never what you do; delicate items show in red.</li>
<li><strong>Browser notifications</strong> — <strong>Enable notifications</strong> to receive urgent chat messages or an odd cash closure, even with another tab open. Only with the browser open.</li>
<li><strong>Archive old data</strong> — Pick a date (by default, a year ago) and the app tells you how many sales, reservations, closures and received orders will be archived. <strong>Archive and download</strong> first downloads a file and, once you confirm you have it, removes them to lighten the app.</li>
</ul>

<h4>What is not here</h4>
<ul>
<li><strong>Employees and access</strong> — They are added in <strong>Staff</strong>, not in My Business. Here you only have the business code they need and the Business PIN.</li>
<li><strong>Language</strong> — It is a per-device setting, with the <strong>ES / CA / EN</strong> selector in the header.</li>
<li><strong>Your owner password and several businesses</strong> — In the business selector (the header's <strong>Businesses</strong> button).</li>
<li><strong>Guided tour</strong> — In the User Manual.</li>
</ul>

<h4>If something doesn't work</h4>
<ul>
<li><strong>What you type doesn't stick:</strong> leave the field or tap <strong>Save all</strong>. In receipt and orders, their own <strong>Save</strong>.</li>
<li><strong>The online reservation or QR cards ask you to "Set up the cloud":</strong> the licence still needs redeeming or Firebase connecting.</li>
<li><strong>Online booking doesn't offer a table:</strong> it is missing its seats.</li>
<li>For cloud, printing, Stripe and numbers, see the <strong>Frequently asked questions and problems</strong> chapter.</li>
</ul>`}
  },
  {id:'plan360', area:'gestion',
    title:{es:`<i class="ti ti-compass"></i> Plan 360° y Mantenimiento`, ca:`<i class="ti ti-compass"></i> Pla 360° i Manteniment`, en:`<i class="ti ti-compass"></i> Plan 360° and Maintenance`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p><strong>Plan 360°</strong> es tu acompañamiento con un coach de GastroGoan: un programa de 28 días (cuatro semanas) con visitas presenciales, tareas para tu negocio y objetivos pactados. Después puede continuar con el <strong>Mantenimiento</strong>: un mes tipo con entregas de tu coach y tareas para ti. Aquí ves todo lo que te toca, marcas lo que haces y le contestas a tu coach, que lo ve al momento.</p>
<p>Está en <strong>Gestión → Plan 360°</strong> y <strong>solo aparece si tu coach lo ha activado</strong> para tu negocio. Es del propietario: un empleado no entra.</p>

<h4>La pantalla principal</h4>
<ul>
<li>Arriba, el resumen del <strong>Programa de 28 días</strong>: <strong>Día del programa</strong>, <strong>Tareas completadas</strong> y <strong>Objetivos cumplidos</strong>, con una barra de avance.</li>
<li><strong>Hoy</strong>: las tareas de hoy con sus botones <strong>Pendiente</strong>, <strong>Hecha</strong> y <strong>No hecha</strong>. Si hoy toca sesión presencial, te lo dice. Las tareas de días pasados que no están hechas salen en rojo en <strong>Atrasado</strong>, con los días de retraso: lo que no haces no desaparece, se acumula.</li>
<li>Tres tarjetas: <strong>Documentación inicial</strong>, <strong>Recursos</strong> y <strong>Mantenimiento</strong> (esta última, cuando tu coach ya ha preparado algún mes).</li>
<li>La barra <strong>Programa de 28 días</strong> abre el <strong>resumen visual</strong> de todo.</li>
<li>El calendario, <strong>semana a semana</strong>: cada casilla es un día. Los días <strong>Presencial</strong> tienen su propia pantalla; los de trabajo muestran el progreso (por ejemplo 2/3) y una marca si hay reunión online o presencial. Pulsa un día para abrirlo.</li>
</ul>

<h4>Tu primer paso: Documentación inicial</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">La primera vez se abre la <strong>carta de bienvenida</strong>. Pulsa <strong>Entendido, continuar</strong>: es tu confirmación de recepción y avisa a tu coach. La puedes releer luego en Documentación inicial.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Contrato y RGPD</strong>: lo lees y lo firmas en la propia pantalla (nombre completo y DNI; firma electrónica simple que guarda el texto exacto aceptado y la fecha). Solo puede firmar el propietario, y no se puede hasta que tu coach haya fijado las condiciones. Puedes <strong>Descargar / imprimir</strong> el contrato.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Cuestionario inicial</strong> (con un contador de respuestas): cuéntale a tu coach cómo es tu negocio antes de la primera visita. Pulsa <strong>Guardar</strong>.</div></div>

<h4>Los días del programa</h4>
<ul>
<li><strong>Día de trabajo</strong>: ves cada tarea con su descripción, el objetivo al que sirve, y puedes marcar <strong>Pendiente</strong>, <strong>Hecha</strong> o <strong>No hecha</strong> y dejar <strong>Tu nota</strong>.</li>
<li><strong>Día 1</strong>: tu coach te entrega tres cosas cuando están listas: el informe del <strong>Cliente misterioso</strong>, el resumen de la <strong>Reunión presencial</strong> y la <strong>Voz del equipo</strong> (lo que opina tu plantilla). Hasta entonces aparecen apagadas, en preparación.</li>
<li><strong>Día 2</strong>: el <strong>Plan de acción — 4 semanas</strong>, los <strong>Objetivos</strong> (los pacta el propietario con el coach y solo él puede editarlos; cada uno con su prioridad Prioritario, Esencial o Complementario y sus mediciones), el <strong>Plan de inversiones</strong> y el <strong>Team building</strong> (resultados y un check de a quién ya le has entregado el premio).</li>
</ul>

<h4>Recursos y Libro de marca</h4>
<p>En <strong>Recursos</strong> tienes los documentos de tu programa por categorías (playbooks, guías…), que puedes leer o <strong>Descargar en PDF</strong>. El <strong>Libro de marca</strong> aparece como «Tu coach lo está preparando» hasta que te lo envía; entonces pone «Listo para ver»: lo ves incrustado y lo descargas en PDF. Recoge la identidad de tu negocio a partir de tu cuestionario.</p>

<h4>El cierre del programa</h4>
<p>Debajo de la última semana, <strong>Cierre y próximos pasos</strong> aparece el día 28 o cuando tu coach inicia la revisión final. Incluye: <strong>El balance de tu mes</strong> (lo conseguido y lo que falta), <strong>Los números: antes → hoy</strong> (nota del local, ticket medio, food cost, personal, ventas, reseñas, horas del dueño), las acciones completadas por nivel, cada objetivo marcado como <strong>Cumplido</strong>, <strong>Parcial</strong> o <strong>No cumplido</strong> con sus mediciones, las <strong>3 mejoras más visibles</strong>, <strong>Qué hay que vigilar para no retroceder</strong> y <strong>El siguiente nivel</strong>.</p>
<p>Al final, tu coach te propone continuar con el <strong>Plan de mantenimiento</strong>. Solo el propietario responde: escribe tu nombre y pulsa <strong>Sí, quiero activarlo</strong>, o elige una fecha y pulsa <strong>Me lo pienso</strong> (tu coach volverá a hablar contigo ese día).</p>

<h4>Mantenimiento: tu mes con el coach</h4>
<p>Abre la tarjeta <strong>Mantenimiento</strong> (o el aviso del Panel de Control). Cambia de mes con las flechas.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Arriba, <strong>Lo que llevamos juntos</strong>: tareas hechas, reportes, llamadas, entregas y subidas de precio detectadas, y <strong>En números</strong>: el Día 1 frente al último mes completo y lo que supone al mes en euros (ventas, ticket medio, food cost, personal sobre ventas, resultado). Los calcula la app con las mismas cuentas que tu Cuenta de Resultados.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">El <strong>Objetivo del mes</strong> y, por cada lunes, una tarjeta que dice cómo trabajáis esa semana (<strong>WhatsApp</strong> o <strong>Videollamada</strong>), lo que tu coach te entrega (<strong>Te entrego</strong>, marcado <strong>Entregado</strong>) y <strong>Tu tarea</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Marca tus tareas con la casilla cuando las hagas: tu coach lo ve al momento. Las que se pasan del día salen en rojo.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">En cada tarea, <strong>Contestar a tu coach</strong> te deja escribir cómo ha ido, qué has visto o si no has podido; pulsa <strong>Enviar</strong>. Así la llamada empieza sabiendo qué ha pasado.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">A fin de mes, el <strong>Cierre del mes</strong>: lo que ha ido bien, lo que hay que mejorar, si se cumplió el objetivo y el <strong>Objetivo del mes que viene</strong>.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Las tareas de tu coach de esta semana salen también en el Panel de Control, en «Hoy — Atención» (<strong>Tareas de tu coach esta semana</strong>), donde entras cada día.</div>

<h4>Lo que conviene saber</h4>
<ul>
<li>Solo el propietario firma, marca tareas, responde y edita objetivos. Un empleado recibe un aviso.</li>
<li>Todo se sincroniza con tu coach: lo que marcas o escribes aparece en su panel, y lo que él prepara aparece en el tuyo.</li>
<li>Los números que ve tu coach los calcula la app sola con tus datos; no tienes que rellenar nada.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li><strong>No veo Plan 360° en Gestión</strong>: tu coach aún no lo ha activado.</li>
<li><strong>No puedo firmar el contrato</strong>: tu coach todavía no ha fijado las condiciones, o no estás como propietario.</li>
<li><strong>El Libro de marca sale «Tu coach lo está preparando»</strong>: aún no te lo ha enviado.</li>
<li><strong>No puedo marcar una tarea</strong>: solo lo hace el propietario; entra con tu cuenta de propietario.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p><strong>Pla 360°</strong> és el teu acompanyament amb un coach de GastroGoan: un programa de 28 dies (quatre setmanes) amb visites presencials, tasques per al teu negoci i objectius pactats. Després pot continuar amb el <strong>Manteniment</strong>: un mes tipus amb lliuraments del teu coach i tasques per a tu. Aquí veus tot el que et toca, marques el que fas i contestes al teu coach, que ho veu a l'instant.</p>
<p>És a <strong>Gestió → Pla 360°</strong> i <strong>només apareix si el teu coach l'ha activat</strong> per al teu negoci. És del propietari: un empleat no hi entra.</p>

<h4>La pantalla principal</h4>
<ul>
<li>A dalt, el resum del <strong>Programa de 28 dies</strong>: <strong>Dia del programa</strong>, <strong>Tasques completades</strong> i <strong>Objectius complerts</strong>, amb una barra d'avanç.</li>
<li><strong>Avui</strong>: les tasques d'avui amb els botons <strong>Pendent</strong>, <strong>Feta</strong> i <strong>No feta</strong>. Si avui toca sessió presencial, t'ho diu. Les tasques de dies passats que no estan fetes surten en vermell a <strong>Endarrerit</strong>, amb els dies de retard: el que no fas no desapareix, s'acumula.</li>
<li>Tres targetes: <strong>Documentació inicial</strong>, <strong>Recursos</strong> i <strong>Manteniment</strong> (aquesta última, quan el teu coach ja ha preparat algun mes).</li>
<li>La barra <strong>Programa de 28 dies</strong> obre el <strong>resum visual</strong> de tot.</li>
<li>El calendari, <strong>setmana a setmana</strong>: cada casella és un dia. Els dies <strong>Presencial</strong> tenen la seva pròpia pantalla; els de treball mostren el progrés (per exemple 2/3) i una marca si hi ha reunió en línia o presencial. Prem un dia per obrir-lo.</li>
</ul>

<h4>El teu primer pas: Documentació inicial</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">La primera vegada s'obre la <strong>carta de benvinguda</strong>. Prem <strong>Entès, continuar</strong>: és la teva confirmació de recepció i avisa el teu coach. La pots rellegir després a Documentació inicial.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Contracte i RGPD</strong>: el llegeixes i el signes a la mateixa pantalla (nom complet i DNI; signatura electrònica simple que desa el text exacte acceptat i la data). Només pot signar el propietari, i no es pot fins que el teu coach hagi fixat les condicions. Pots <strong>Descarregar / imprimir</strong> el contracte.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Qüestionari inicial</strong> (amb un comptador de respostes): explica al teu coach com és el teu negoci abans de la primera visita. Prem <strong>Desar</strong>.</div></div>

<h4>Els dies del programa</h4>
<ul>
<li><strong>Dia de treball</strong>: veus cada tasca amb la seva descripció, l'objectiu al qual serveix, i pots marcar <strong>Pendent</strong>, <strong>Feta</strong> o <strong>No feta</strong> i deixar <strong>La teva nota</strong>.</li>
<li><strong>Dia 1</strong>: el teu coach et lliura tres coses quan són a punt: l'informe del <strong>Client misteriós</strong>, el resum de la <strong>Reunió presencial</strong> i la <strong>Veu de l'equip</strong> (el que opina la teva plantilla). Fins llavors apareixen apagades, en preparació.</li>
<li><strong>Dia 2</strong>: el <strong>Pla d'acció — 4 setmanes</strong>, els <strong>Objectius</strong> (els pacta el propietari amb el coach i només ell els pot editar; cadascun amb la seva prioritat Prioritari, Essencial o Complementari i les seves mesures), el <strong>Pla d'inversions</strong> i el <strong>Team building</strong> (resultats i un check d'a qui ja has lliurat el premi).</li>
</ul>

<h4>Recursos i Llibre de marca</h4>
<p>A <strong>Recursos</strong> tens els documents del teu programa per categories (playbooks, guies…), que pots llegir o <strong>Descarregar en PDF</strong>. El <strong>Llibre de marca</strong> apareix com «El teu coach l'està preparant» fins que te l'envia; llavors posa «Llest per veure»: el veus incrustat i el descarregues en PDF. Recull la identitat del teu negoci a partir del teu qüestionari.</p>

<h4>El tancament del programa</h4>
<p>Sota l'última setmana, <strong>Tancament i pròxims passos</strong> apareix el dia 28 o quan el teu coach inicia la revisió final. Inclou: <strong>El balanç del teu mes</strong> (el aconseguit i el que falta), <strong>Els números: abans → avui</strong> (nota del local, tiquet mitjà, food cost, personal, vendes, ressenyes, hores del propietari), les accions completades per nivell, cada objectiu marcat com a <strong>Complert</strong>, <strong>Parcial</strong> o <strong>No complert</strong> amb les seves mesures, les <strong>3 millores més visibles</strong>, <strong>Què cal vigilar per no retrocedir</strong> i <strong>El següent nivell</strong>.</p>
<p>Al final, el teu coach et proposa continuar amb el <strong>Pla de manteniment</strong>. Només el propietari respon: escriu el teu nom i prem <strong>Sí, vull activar-lo</strong>, o tria una data i prem <strong>M'ho penso</strong> (el teu coach tornarà a parlar amb tu aquell dia).</p>

<h4>Manteniment: el teu mes amb el coach</h4>
<p>Obre la targeta <strong>Manteniment</strong> (o l'avís del Tauler de Control). Canvia de mes amb les fletxes.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">A dalt, <strong>El que portem junts</strong>: tasques fetes, reports, trucades, lliuraments i pujades de preu detectades, i <strong>En nombres</strong>: el Dia 1 davant de l'últim mes complet i el que suposa al mes en euros (vendes, tiquet mitjà, food cost, personal sobre vendes, resultat). Els calcula l'app amb els mateixos comptes que el teu Compte de Resultats.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">L'<strong>Objectiu del mes</strong> i, per cada dilluns, una targeta que diu com treballeu aquella setmana (<strong>WhatsApp</strong> o <strong>Videotrucada</strong>), el que el teu coach et lliura (<strong>T'entrego</strong>, marcat <strong>Entregat</strong>) i <strong>La teva tasca</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Marca les teves tasques amb la casella quan les facis: el teu coach ho veu a l'instant. Les que passen del dia surten en vermell.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">A cada tasca, <strong>Contestar al teu coach</strong> et deixa escriure com ha anat, què has vist o si no has pogut; prem <strong>Enviar</strong>. Així la trucada comença sabent què ha passat.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">A final de mes, el <strong>Tancament del mes</strong>: el que ha anat bé, el que cal millorar, si es va complir l'objectiu i l'<strong>Objectiu del mes que ve</strong>.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Les tasques del teu coach d'aquesta setmana surten també al Tauler de Control, a «Avui — Atenció» (<strong>Tasques del teu coach aquesta setmana</strong>), on entres cada dia.</div>

<h4>El que convé saber</h4>
<ul>
<li>Només el propietari signa, marca tasques, respon i edita objectius. Un empleat rep un avís.</li>
<li>Tot se sincronitza amb el teu coach: el que marques o escrius apareix al seu tauler, i el que ell prepara apareix al teu.</li>
<li>Els números que veu el teu coach els calcula l'app sola amb les teves dades; no has d'emplenar res.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No veig Pla 360° a Gestió</strong>: el teu coach encara no l'ha activat.</li>
<li><strong>No puc signar el contracte</strong>: el teu coach encara no ha fixat les condicions, o no ets com a propietari.</li>
<li><strong>El Llibre de marca surt «El teu coach l'està preparant»</strong>: encara no te l'ha enviat.</li>
<li><strong>No puc marcar una tasca</strong>: només ho fa el propietari; entra amb el teu compte de propietari.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p><strong>Plan 360°</strong> is your coaching with a GastroGoan coach: a 28-day (four-week) program with in-person visits, tasks for your business and agreed goals. It can then continue as <strong>Maintenance</strong>: a typical month with deliveries from your coach and tasks for you. Here you see everything that's yours to do, tick what you've done and reply to your coach, who sees it straight away.</p>
<p>It's under <strong>Management → Plan 360°</strong> and <strong>only appears if your coach has activated it</strong> for your business. It's for the owner: an employee can't enter.</p>

<h4>The main screen</h4>
<ul>
<li>At the top, the <strong>28-day program</strong> summary: <strong>Program day</strong>, <strong>Tasks completed</strong> and <strong>Objectives achieved</strong>, with a progress bar.</li>
<li><strong>Today</strong>: today's tasks with the buttons <strong>Pending</strong>, <strong>Done</strong> and <strong>Not done</strong>. If today is an in-person session, it says so. Tasks from past days that aren't done show in red under <strong>Overdue</strong>, with the days late: what you don't do doesn't vanish, it piles up.</li>
<li>Three cards: <strong>Initial documentation</strong>, <strong>Resources</strong> and <strong>Maintenance</strong> (the last once your coach has prepared a month).</li>
<li>The <strong>28-day program</strong> bar opens the <strong>visual summary</strong> of everything.</li>
<li>The calendar, <strong>week by week</strong>: each box is a day. <strong>In-person</strong> days have their own screen; work days show progress (e.g. 2/3) and a mark if there is an online or in-person meeting. Press a day to open it.</li>
</ul>

<h4>Your first step: Initial documentation</h4>
<div class="manual-step"><div class="sn">1</div><div class="st">The first time, the <strong>welcome letter</strong> opens. Press <strong>Got it, continue</strong>: it's your confirmation of receipt and notifies your coach. You can reread it later under Initial documentation.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st"><strong>Contract and GDPR</strong>: you read and sign it on the screen itself (full name and ID number; a simple electronic signature that records the exact text accepted and the date). Only the owner can sign, and not until your coach has set the terms. You can <strong>Download / print</strong> the contract.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st"><strong>Initial questionnaire</strong> (with an answer counter): tell your coach about your business before the first visit. Press <strong>Save</strong>.</div></div>

<h4>The program days</h4>
<ul>
<li><strong>Work day</strong>: you see each task with its description and the goal it serves, and you can mark <strong>Pending</strong>, <strong>Done</strong> or <strong>Not done</strong> and leave <strong>Your note</strong>.</li>
<li><strong>Day 1</strong>: your coach delivers three things when they're ready: the <strong>Mystery shopper</strong> report, the summary of the <strong>In-person meeting</strong> and the <strong>Team voice</strong> (what your staff think). Until then they appear greyed out, in preparation.</li>
<li><strong>Day 2</strong>: the <strong>Action plan — 4 weeks</strong>, the <strong>Objectives</strong> (agreed by the owner with the coach and only the owner can edit them; each with its priority Priority, Essential or Complementary and its measurements), the <strong>Investment plan</strong> and the <strong>Team building</strong> (results and a check for who has already received the prize).</li>
</ul>

<h4>Resources and Brand book</h4>
<p>Under <strong>Resources</strong> you have your program's documents by category (playbooks, guides…), which you can read or <strong>Download as PDF</strong>. The <strong>Brand book</strong> shows as "Your coach is preparing it" until it is sent to you; then it says "Ready to view": you see it embedded and download it as a PDF. It captures your business's identity from your questionnaire.</p>

<h4>Program close</h4>
<p>Below the last week, <strong>Closing and next steps</strong> appears on day 28 or when your coach starts the final review. It includes: <strong>Your month in review</strong> (what's achieved and what's missing), <strong>The numbers: before → today</strong> (venue score, average ticket, food cost, staff, sales, reviews, owner's hours), actions completed by level, each objective marked <strong>Achieved</strong>, <strong>Partial</strong> or <strong>Not achieved</strong> with its measurements, the <strong>3 most visible improvements</strong>, <strong>What to watch to avoid slipping back</strong> and <strong>The next level</strong>.</p>
<p>At the end, your coach proposes continuing with the <strong>Maintenance plan</strong>. Only the owner answers: type your name and press <strong>Yes, activate it</strong>, or pick a date and press <strong>I'll think about it</strong> (your coach will talk to you again that day).</p>

<h4>Maintenance: your month with the coach</h4>
<p>Open the <strong>Maintenance</strong> card (or the Dashboard notice). Change month with the arrows.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">At the top, <strong>What we've done together</strong>: tasks done, reports, calls, deliveries and price rises detected, and <strong>In numbers</strong>: Day 1 against the last full month and what it means per month in euros (sales, average ticket, food cost, staff over sales, result). The app calculates them with the same sums as your Income Statement.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">The <strong>Goal of the month</strong> and, for each Monday, a card saying how you work that week (<strong>WhatsApp</strong> or <strong>Video call</strong>), what your coach delivers (<strong>From your coach</strong>, marked <strong>Delivered</strong>) and <strong>Your task</strong>.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tick your tasks with the box when you've done them: your coach sees it straight away. Those past their day show in red.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">On each task, <strong>Reply to your coach</strong> lets you write how it went, what you saw or if you couldn't; press <strong>Send</strong>. That way the call starts knowing what happened.</div></div>
<div class="manual-step"><div class="sn">5</div><div class="st">At month end, the <strong>Month review</strong>: what went well, what to improve, whether the goal was met and the <strong>Goal for next month</strong>.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Your coach's tasks for this week also appear on the Dashboard, under "Today — Attention" (<strong>Your coach's tasks this week</strong>), where you go in every day.</div>

<h4>Good to know</h4>
<ul>
<li>Only the owner signs, ticks tasks, replies and edits objectives. An employee gets a notice.</li>
<li>Everything syncs with your coach: what you tick or write appears on their panel, and what they prepare appears on yours.</li>
<li>The numbers your coach sees are calculated by the app from your data; you fill in nothing.</li>
</ul>
<h4>If something doesn't work</h4>
<ul>
<li><strong>I don't see Plan 360° in Management</strong>: your coach hasn't activated it yet.</li>
<li><strong>I can't sign the contract</strong>: your coach hasn't set the terms yet, or you aren't signed in as owner.</li>
<li><strong>The Brand book says "Your coach is preparing it"</strong>: it hasn't been sent yet.</li>
<li><strong>I can't tick a task</strong>: only the owner can; sign in with your owner account.</li>
</ul>
`}
  },
  {id:'herramientas', area:'gestion',
    title:{es:`<i class="ti ti-sparkles"></i> Herramientas: visión global e IA`, ca:`<i class="ti ti-sparkles"></i> Eines: visió global i IA`, en:`<i class="ti ti-sparkles"></i> Tools: overview and AI`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Tres herramientas pensadas para el propietario: <strong>Visión global de mis negocios</strong> (comparar todos tus locales de un vistazo), el <strong>Asistente de IA</strong> (la clave que activa las funciones con inteligencia artificial) y <strong>Pregúntale a tus números</strong> (preguntar en lenguaje normal cómo va el negocio).</p>

<h4>Visión global de mis negocios</h4>
<p>Si tienes dos o más negocios en el mismo aparato, aquí ves cómo va cada uno sin entrar y salir de ellos.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra como propietario y pulsa <strong>Negocios</strong> en la barra superior. Se abre «Selecciona tu negocio».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pulsa <strong>Visión global de mis negocios</strong> (solo aparece con 2 o más negocios).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Elige el periodo: <strong>Hoy</strong>, <strong>Esta semana</strong>, <strong>Este mes</strong> o <strong>Mes anterior</strong>.</div></div>
<p>Arriba, el cuadro <strong>Todos mis negocios</strong> con los totales (Ventas sin IVA, Tickets, Ticket medio, Food cost, Personal, Resultado, reservas de hoy y stock bajo). Debajo, una tarjeta por negocio ordenadas de mejor a peor resultado, con su peso en las ventas. El de <strong>menor margen sobre ventas</strong> sale marcado en rojo. Pulsa una tarjeta para abrir ese negocio.</p>
<ul>
<li><strong>Es solo lectura</strong>: no cambia el negocio activo ni guarda nada.</li>
<li>Lee los datos <strong>guardados en este aparato</strong>. Un negocio que nunca has abierto aquí sale como «Sin datos en este aparato: ábrelo una vez aquí para verlo».</li>
<li>Hoy y Esta semana son estimaciones, porque los gastos fijos del mes se reparten por días.</li>
</ul>

<h4>Asistente de IA: poner la clave</h4>
<p>Las funciones de IA (Pregúntale a tus números, Leer factura con foto, I+D) usan la clave de <strong>tu propio proveedor</strong>. El consumo va a tu cuenta, no a GastroGoan. Sin clave, el resto de la app funciona igual.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Ve a <strong>Gestión → Mi Negocio → Asistente de IA</strong> (también se ofrece, opcional, al dar de alta el negocio).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Elige el <strong>Proveedor</strong>: <strong>Google (Gemini)</strong> (tiene clave gratuita), <strong>Anthropic (Claude)</strong> u <strong>OpenAI (ChatGPT)</strong>. El <strong>Modelo</strong> viene puesto; solo cámbialo si el proveedor retira ese.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pega la <strong>Clave</strong>. La de Google se saca gratis en dos minutos en aistudio.google.com/apikey con tu cuenta de Google: <strong>Create API key</strong>, copiar y pegar. La tarjeta explica el paso a paso de cada proveedor.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Pulsa <strong>Guardar</strong> y después <strong>Probar la conexión</strong>. Si falla el modelo, <strong>Ver modelos disponibles</strong> te dice los que admite tu clave.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La clave se guarda <strong>solo en este aparato</strong>, nunca en la nube del negocio, para que ningún empleado pueda leerla. Si usas la app en la tablet y en el móvil, tendrás que ponerla en cada uno. <strong>Eliminar</strong> la quita de este aparato.</div>
<p><strong>Límite</strong>: hay un tope de <strong>500 consultas al día por aparato</strong> para que un fallo no gaste tu cuota sin que te des cuenta. En la misma tarjeta ves cuántas llevas hoy.</p>

<h4>Pregúntale a tus números</h4>
<p>Una conversación para preguntar cosas como «¿Cómo va este mes?», «¿Qué platos han perdido margen?» o «¿Dónde han subido mis gastos?». Se abre con el botón <strong>Pregúntale a tus números</strong> del Panel de Control y de Gestión Económica.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Pulsa una de las tres preguntas sugeridas o escribe la tuya y pulsa Enter (o el botón de enviar).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Espera a «Mirando tus números…» y lee la respuesta. Puedes seguir preguntando sobre lo que te conteste.</div></div>
<p><strong>Cómo funciona y sus límites</strong>:</p>
<ul>
<li>Los números los calcula la app, con las mismas cuentas que tu Cuenta de Resultados. La IA solo los <strong>lee y los explica</strong>; no los inventa. Si un dato no está (por ejemplo, un mes sin ventas), te lo dice.</li>
<li>Responde solo con lo que la app sabe: ventas, escandallos, gastos, mermas, reservas y stock. No te da consejo fiscal ni sabe nada de fuera de tu negocio.</li>
<li>La conversación <strong>no se guarda</strong>: se borra al recargar la app.</li>
<li>Es solo para el propietario. Sin clave de IA, el botón te lleva a Mi Negocio para ponerla.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Pregunta cosas concretas («¿cuánto food cost llevo este mes frente al anterior?») y contrasta las cifras importantes con la pantalla correspondiente antes de decidir.</div>

<h4>Si algo no funciona</h4>
<ul>
<li><strong>No veo «Visión global»</strong>: necesitas ser propietario y tener 2 o más negocios en este aparato.</li>
<li><strong>«Falta la clave»</strong>: pégala en Mi Negocio → Asistente de IA y pulsa Guardar.</li>
<li><strong>El asistente no responde</strong>: pulsa Probar la conexión. Si el modelo ya no existe, pulsa Ver modelos disponibles y elige uno.</li>
<li><strong>Dice «sin datos»</strong>: aún no hay ventas o gastos en ese periodo.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Tres eines pensades per al propietari: <strong>Visió global dels meus negocis</strong> (comparar tots els teus locals d'un cop d'ull), l'<strong>Assistent d'IA</strong> (la clau que activa les funcions amb intel·ligència artificial) i <strong>Pregunta als teus números</strong> (preguntar en llenguatge normal com va el negoci).</p>

<h4>Visió global dels meus negocis</h4>
<p>Si tens dos o més negocis al mateix aparell, aquí veus com va cadascun sense entrar-hi i sortir-ne.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Entra com a propietari i prem <strong>Negocis</strong> a la barra superior. S'obre «Selecciona el teu negoci».</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Prem <strong>Visió global dels meus negocis</strong> (només apareix amb 2 o més negocis).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Tria el període: <strong>Avui</strong>, <strong>Aquesta setmana</strong>, <strong>Aquest mes</strong> o <strong>Mes anterior</strong>.</div></div>
<p>A dalt, el quadre <strong>Tots els meus negocis</strong> amb els totals (Vendes sense IVA, Tiquets, Tiquet mitjà, Food cost, Personal, Resultat, reserves d'avui i estoc baix). A sota, una targeta per negoci ordenades de millor a pitjor resultat, amb el seu pes a les vendes. El de <strong>menor marge sobre vendes</strong> surt marcat en vermell. Prem una targeta per obrir aquell negoci.</p>
<ul>
<li><strong>És només de lectura</strong>: no canvia el negoci actiu ni desa res.</li>
<li>Llegeix les dades <strong>desades en aquest aparell</strong>. Un negoci que mai has obert aquí surt com «Sense dades en aquest aparell: obre'l una vegada aquí per veure'l».</li>
<li>Avui i Aquesta setmana són estimacions, perquè les despeses fixes del mes es reparteixen per dies.</li>
</ul>

<h4>Assistent d'IA: posar la clau</h4>
<p>Les funcions d'IA (Pregunta als teus números, Llegir factura amb foto, R+D) fan servir la clau del <strong>teu propi proveïdor</strong>. El consum va al teu compte, no a GastroGoan. Sense clau, la resta de l'app funciona igual.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Ves a <strong>Gestió → El Meu Negoci → Assistent d'IA</strong> (també s'ofereix, opcional, en donar d'alta el negoci).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Tria el <strong>Proveïdor</strong>: <strong>Google (Gemini)</strong> (té clau gratuïta), <strong>Anthropic (Claude)</strong> o <strong>OpenAI (ChatGPT)</strong>. El <strong>Model</strong> ve posat; només canvia'l si el proveïdor retira aquest.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Enganxa la <strong>Clau</strong>. La de Google es treu gratis en dos minuts a aistudio.google.com/apikey amb el teu compte de Google: <strong>Create API key</strong>, copiar i enganxar. La targeta explica el pas a pas de cada proveïdor.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Prem <strong>Desar</strong> i després <strong>Provar la connexió</strong>. Si falla el model, <strong>Veure models disponibles</strong> et diu els que admet la teva clau.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>La clau es desa <strong>només en aquest aparell</strong>, mai al núvol del negoci, perquè cap empleat pugui llegir-la. Si fas servir l'app a la tauleta i al mòbil, l'hauràs de posar a cadascun. <strong>Eliminar</strong> la treu d'aquest aparell.</div>
<p><strong>Límit</strong>: hi ha un màxim de <strong>500 consultes al dia per aparell</strong> perquè un error no gasti la teva quota sense que te n'adonis. A la mateixa targeta veus quantes en portes avui.</p>

<h4>Pregunta als teus números</h4>
<p>Una conversa per preguntar coses com «Com va aquest mes?», «Quins plats han perdut marge?» o «On han pujat les meves despeses?». S'obre amb el botó <strong>Pregunta als teus números</strong> del Tauler de Control i de Gestió Econòmica.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Prem una de les tres preguntes suggerides o escriu la teva i prem Enter (o el botó d'enviar).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Espera a «Mirant els teus números…» i llegeix la resposta. Pots continuar preguntant sobre el que et contesti.</div></div>
<p><strong>Com funciona i els seus límits</strong>:</p>
<ul>
<li>Els números els calcula l'app, amb els mateixos comptes que el teu Compte de Resultats. La IA només els <strong>llegeix i els explica</strong>; no se'ls inventa. Si una dada no hi és (per exemple, un mes sense vendes), t'ho diu.</li>
<li>Respon només amb el que l'app sap: vendes, escandalls, despeses, mermes, reserves i estoc. No et dona consell fiscal ni sap res de fora del teu negoci.</li>
<li>La conversa <strong>no es desa</strong>: s'esborra en recarregar l'app.</li>
<li>És només per al propietari. Sense clau d'IA, el botó et porta a El Meu Negoci per posar-la.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Pregunta coses concretes («quant food cost porto aquest mes respecte a l'anterior?») i contrasta les xifres importants amb la pantalla corresponent abans de decidir.</div>

<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>No veig «Visió global»</strong>: has de ser propietari i tenir 2 o més negocis en aquest aparell.</li>
<li><strong>«Falta la clau»</strong>: enganxa-la a El Meu Negoci → Assistent d'IA i prem Desar.</li>
<li><strong>L'assistent no respon</strong>: prem Provar la connexió. Si el model ja no existeix, prem Veure models disponibles i tria'n un.</li>
<li><strong>Diu «sense dades»</strong>: encara no hi ha vendes o despeses en aquest període.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>Three tools designed for the owner: <strong>Overview of my businesses</strong> (compare all your venues at a glance), the <strong>AI assistant</strong> (the key that switches on the artificial-intelligence features) and <strong>Ask your numbers</strong> (ask in plain language how the business is doing).</p>

<h4>Overview of my businesses</h4>
<p>If you have two or more businesses on the same device, here you see how each is doing without going in and out of them.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Sign in as owner and press <strong>Businesses</strong> in the top bar. "Select your business" opens.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Press <strong>Overview of my businesses</strong> (it only appears with 2 or more businesses).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Choose the period: <strong>Today</strong>, <strong>This week</strong>, <strong>This month</strong> or <strong>Last month</strong>.</div></div>
<p>At the top, the <strong>All my businesses</strong> box with the totals (Sales excl. VAT, Tickets, Average ticket, Food cost, Staff, Result, today's bookings and low stock). Below, one card per business, ordered from best to worst result, with its share of sales. The one with the <strong>lowest margin on sales</strong> is flagged in red. Press a card to open that business.</p>
<ul>
<li><strong>It is read-only</strong>: it doesn't change the active business or save anything.</li>
<li>It reads the data <strong>saved on this device</strong>. A business you've never opened here shows as "No data on this device: open it once here to see it".</li>
<li>Today and This week are estimates, because the month's fixed expenses are spread by day.</li>
</ul>

<h4>AI assistant: adding the key</h4>
<p>The AI features (Ask your numbers, Read invoice from photo, R&amp;D) use the key from <strong>your own provider</strong>. Usage is billed to your account, not to GastroGoan. Without a key, the rest of the app works the same.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Go to <strong>Management → My Business → AI assistant</strong> (it's also offered, optionally, when you set the business up).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Choose the <strong>Provider</strong>: <strong>Google (Gemini)</strong> (has a free key), <strong>Anthropic (Claude)</strong> or <strong>OpenAI (ChatGPT)</strong>. The <strong>Model</strong> comes pre-filled; change it only if the provider retires that one.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Paste the <strong>Key</strong>. Google's is free and takes two minutes at aistudio.google.com/apikey with your Google account: <strong>Create API key</strong>, copy and paste. The card explains the steps for each provider.</div></div>
<div class="manual-step"><div class="sn">4</div><div class="st">Press <strong>Save</strong> and then <strong>Test the connection</strong>. If the model fails, <strong>See available models</strong> tells you which ones your key supports.</div></div>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>The key is saved <strong>only on this device</strong>, never in the business cloud, so no employee can read it. If you use the app on a tablet and a phone, you'll need to enter it on each. <strong>Delete</strong> removes it from this device.</div>
<p><strong>Limit</strong>: there is a cap of <strong>500 queries a day per device</strong> so a glitch can't burn through your quota unnoticed. On the same card you see how many you've used today.</p>

<h4>Ask your numbers</h4>
<p>A conversation to ask things like "How is this month going?", "Which dishes have lost margin?" or "Where have my expenses gone up?". It opens with the <strong>Ask your numbers</strong> button on the Dashboard and in Financial Management.</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Press one of the three suggested questions or type your own and press Enter (or the send button).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Wait for "Looking at your numbers…" and read the answer. You can keep asking about what it replies.</div></div>
<p><strong>How it works and its limits</strong>:</p>
<ul>
<li>The numbers are calculated by the app, with the same sums as your Income Statement. The AI only <strong>reads and explains</strong> them; it doesn't invent them. If a figure isn't there (for example, a month with no sales), it tells you.</li>
<li>It answers only with what the app knows: sales, costings, expenses, waste, bookings and stock. It gives no tax advice and knows nothing outside your business.</li>
<li>The conversation is <strong>not saved</strong>: it's wiped when you reload the app.</li>
<li>It's for the owner only. Without an AI key, the button takes you to My Business to add one.</li>
</ul>
<div class="manual-tip"><i class="ti ti-bulb"></i>Ask specific things ("how much food cost am I running this month compared with last?") and check the important figures against the relevant screen before deciding.</div>

<h4>If something doesn't work</h4>
<ul>
<li><strong>I can't see "Overview"</strong>: you need to be the owner and have 2 or more businesses on this device.</li>
<li><strong>"Key missing"</strong>: paste it in My Business → AI assistant and press Save.</li>
<li><strong>The assistant doesn't answer</strong>: press Test the connection. If the model no longer exists, press See available models and pick one.</li>
<li><strong>It says "no data"</strong>: there are no sales or expenses in that period yet.</li>
</ul>
`}
  },
  {id:'legal', area:'gestion',
    title:{es:`<i class="ti ti-file-certificate"></i> Facturas, VeriFactu y registros legales`, ca:`<i class="ti ti-file-certificate"></i> Factures, VeriFactu i registres legals`, en:`<i class="ti ti-file-certificate"></i> Invoices, VeriFactu and legal records`},
    content:{es:`<h3>Qué es y para qué sirve</h3>
<p>Qué hace la app por ti con lo que la ley te exige —tickets numerados, facturas, registro de jornada, aviso de privacidad, copias de seguridad— y qué sigue siendo cosa de tu gestor.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>La app no es una gestoría.</strong> Ordena tus datos de forma objetiva y los prepara para tu gestor, pero <strong>presentar los impuestos lo hace él</strong>. Y <strong>VeriFactu está en desarrollo: todavía no emite facturas verificables ni sirve para cumplir la normativa</strong>.</div>

<h4>Tickets y facturas: la numeración</h4>
<p>Todo ticket que cobras es una <strong>factura simplificada</strong> y lleva un número correlativo que nunca se repite ni se salta. Cada aparato (tablet, móvil, ordenador) tiene <strong>su propia serie</strong>, así que dos tablets trabajando a la vez, incluso sin conexión, jamás dan el mismo número. El número tiene este aspecto:</p>
<table>
<thead><tr><th>Empieza por</th><th>Qué es</th><th>Ejemplo</th></tr></thead>
<tbody>
<tr><td><strong>T</strong></td><td>Ticket (factura simplificada)</td><td>T26K4P-000123</td></tr>
<tr><td><strong>F</strong></td><td>Factura completa, con los datos del cliente</td><td>F26K4P-000007</td></tr>
<tr><td><strong>R</strong></td><td>Factura rectificativa (al anular una venta)</td><td>R26K4P-000002</td></tr>
</tbody>
</table>
<p>Las dos cifras tras la letra son el año; las tres siguientes, el código de ese aparato. El <strong>NIF del negocio</strong> sale siempre en el ticket: ponlo en Mi Negocio (si falta, la lista «Para que tus números salgan bien» de Gestión Económica te lo recuerda).</p>

<h4>Dar una factura completa a un cliente</h4>
<p>Cuando un cliente empresa o autónomo necesita factura para deducirse el gasto:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Al cobrar, en la ventana <strong>Cobro registrado</strong> pulsa <strong>Factura</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Rellena <strong>Nombre o razón social del cliente</strong>, <strong>NIF</strong> y <strong>Domicilio del cliente</strong> (los tres son obligatorios; si el cliente ya tiene ficha se rellenan solos).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Pulsa <strong>Emitir e imprimir</strong>. La factura lleva su número F y dice a qué ticket sustituye. Sus datos se guardan en la ficha del cliente para la próxima vez.</div></div>
<p>Si vuelves a pedirla para esa misma venta, sale una <strong>copia marcada como duplicado</strong>, con el mismo número: una venta solo tiene una factura completa.</p>

<h4>Anular una venta ya cobrada</h4>
<p>Con <strong>Anular venta</strong> (propietario o empleado con permiso de edición) no se borra nada: se emite una <strong>factura rectificativa</strong> (R) que la deja a cero y apunta el motivo. La venta sigue en el mes en que se hizo y la rectificativa resta en el suyo, así que nunca se reescribe un trimestre que ya presentaste. Puedes imprimirla.</p>

<h4>VeriFactu</h4>
<p>En <strong>Mi Negocio → VeriFactu (facturación certificada)</strong> verás la tarjeta marcada <strong>Próximamente</strong>. Explica que la idea es conectar tu propia cuenta con un proveedor certificado, pero hoy <strong>la función está en desarrollo</strong>: no envía nada ni sirve para cumplir. Mientras tanto, la numeración de arriba es la base sobre la que se montará. Si tu negocio debe usar un sistema de facturación certificado, <strong>consúltalo con tu gestor</strong> y no te apoyes en esta tarjeta.</p>

<h4>Registro de jornada de tu personal</h4>
<p>La ley obliga a registrar la jornada de cada empleado y guardarla cuatro años. En la app es el fichaje:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada empleado ficha en <strong>Horario del Personal</strong>, en su ficha, con <strong>Entrada</strong> al llegar y <strong>Salida</strong> al irse (con su PIN).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">En <strong>Últimos fichajes</strong> se ve cada jornada y si coincide con el turno previsto. Corregir un fichaje (<strong>Corregir fichaje</strong>) <strong>requiere el PIN del negocio</strong> y la app conserva la hora original: el registro marca «Corregido a mano» con lo que se fichó en realidad.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Cuando lo necesites, sale en el paquete de <strong>Enviar al gestor</strong> (Gestión Económica) marcando <strong>Registro de jornada</strong>: una hoja por mes, con empleado, entrada, salida y horas.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Borrar a un empleado <strong>no borra sus fichajes</strong>: se conservan los cuatro años que exige la ley.</div>

<h4>Aviso de privacidad de tu web de reservas</h4>
<p>La web pública donde tus clientes reservan y piden recoge sus datos, así que lleva una casilla obligatoria (<strong>Acepto que mis datos se usen para gestionar mi reserva/pedido</strong>) y un aviso de privacidad (<strong>Ver más</strong>) con el responsable, la base legal, cuánto se guardan los datos y cómo reclamar ante la Agencia Española de Protección de Datos. La casilla de avisarles de novedades es aparte y opcional.</p>
<p>Para que el aviso lleve tu identidad, rellena en <strong>Mi Negocio</strong> el <strong>Titular o razón social (aviso legal de tu web)</strong> y marca <strong>Mostrar mi NIF en el aviso legal y de privacidad de la web de reservas</strong>: la ley lo exige a quien recoge datos por internet.</p>
<p>Y para atender a un cliente que pide sus derechos: <strong>Clientes → ficha → Borrar datos (RGPD)</strong> los elimina para siempre, y <strong>Promoción → Novedades → Registrar una baja</strong> le quita el permiso de marketing. Cada email de novedades lleva su aviso de baja.</p>

<h4>Copias de seguridad y archivo</h4>
<p>Tus datos están en tu aparato y en tu nube, pero una copia tuya es la mejor tranquilidad. En <strong>Mi Negocio → Mantenimiento de datos</strong>:</p>
<ul>
<li><strong>Descargar copia de seguridad</strong>: un archivo con todo el negocio. Si pasa tiempo sin hacerla, la app te lo recuerda al entrar (cuando eres propietario) con el botón para descargarla en el momento.</li>
<li><strong>Restaurar copia de seguridad</strong>: vuelve a cargar un archivo; te dice de qué negocio es y cuántas ventas contiene antes de aplicarlo.</li>
<li><strong>Archivar datos antiguos</strong> (<strong>Archivar anterior a</strong> una fecha → <strong>Archivar y descargar</strong>): descarga primero un archivo con ventas, reservas, cierres y pedidos recibidos antiguos y, solo si se ha guardado bien y lo confirmas, los quita de la app para aligerarla. Esos datos <strong>salen de la app</strong>: guarda el archivo y pregunta a tu gestor cuánto tiempo debes conservarlo.</li>
</ul>
<p>Además, <strong>Cerrar mes</strong> en Tesorería bloquea las compras y las inversiones de ese mes para que no se cambien tras enviárselas al gestor, y los pedidos a proveedor recibidos no se borran (solo se deshace la recepción).</p>

<h4>Lo que conviene saber</h4>
<ul>
<li>Anular, cerrar mes, borrar datos por RGPD y corregir fichajes están protegidos por permisos o por el PIN del negocio, porque tocan datos que podría revisar Hacienda o Inspección.</li>
<li>La numeración depende de cada aparato: si reinstalas, la app toma como base las ventas ya guardadas y nunca baja el número.</li>
<li>Lo que cobras por adelantado (señales de reserva, vales regalo) se trata en la contabilidad según su tipo; tu gestor lo ve en el paquete.</li>
</ul>
<h4>Si algo no funciona</h4>
<ul>
<li><strong>«Para una factura completa hacen falta el nombre, el NIF y el domicilio»</strong>: rellena los tres campos.</li>
<li><strong>No encuentro el botón Factura</strong>: sale en la ventana Cobro registrado justo tras cobrar; también se puede pedir desde la venta.</li>
<li><strong>No puedo corregir un fichaje</strong>: necesitas el PIN del negocio.</li>
<li><strong>No tengo copia reciente</strong>: Mi Negocio → Mantenimiento de datos → Descargar copia de seguridad.</li>
</ul>
`,
    ca:`<h3>Què és i per a què serveix</h3>
<p>Què fa l'app per tu amb el que la llei t'exigeix —tiquets numerats, factures, registre de jornada, avís de privacitat, còpies de seguretat— i què continua sent cosa del teu gestor.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>L'app no és una gestoria.</strong> Ordena les teves dades de manera objectiva i les prepara per al teu gestor, però <strong>presentar els impostos ho fa ell</strong>. I <strong>VeriFactu està en desenvolupament: encara no emet factures verificables ni serveix per complir la normativa</strong>.</div>

<h4>Tiquets i factures: la numeració</h4>
<p>Tot tiquet que cobres és una <strong>factura simplificada</strong> i porta un número correlatiu que mai es repeteix ni se salta. Cada aparell (tauleta, mòbil, ordinador) té <strong>la seva pròpia sèrie</strong>, així que dues tauletes treballant alhora, fins i tot sense connexió, mai donen el mateix número. El número té aquest aspecte:</p>
<table>
<thead><tr><th>Comença per</th><th>Què és</th><th>Exemple</th></tr></thead>
<tbody>
<tr><td><strong>T</strong></td><td>Tiquet (factura simplificada)</td><td>T26K4P-000123</td></tr>
<tr><td><strong>F</strong></td><td>Factura completa, amb les dades del client</td><td>F26K4P-000007</td></tr>
<tr><td><strong>R</strong></td><td>Factura rectificativa (en anul·lar una venda)</td><td>R26K4P-000002</td></tr>
</tbody>
</table>
<p>Les dues xifres després de la lletra són l'any; les tres següents, el codi d'aquell aparell. El <strong>NIF del negoci</strong> surt sempre al tiquet: posa'l a El Meu Negoci (si falta, la llista «Perquè els teus números surtin bé» de Gestió Econòmica t'ho recorda).</p>

<h4>Donar una factura completa a un client</h4>
<p>Quan un client empresa o autònom necessita factura per deduir-se la despesa:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">En cobrar, a la finestra <strong>Cobrament registrat</strong> prem <strong>Factura</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Omple <strong>Nom o raó social del client</strong>, <strong>NIF</strong> i <strong>Domicili del client</strong> (els tres són obligatoris; si el client ja té fitxa s'omplen sols).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Prem <strong>Emetre i imprimir</strong>. La factura porta el seu número F i diu a quin tiquet substitueix. Les seves dades es desen a la fitxa del client per a la propera vegada.</div></div>
<p>Si la tornes a demanar per a aquella mateixa venda, surt una <strong>còpia marcada com a duplicat</strong>, amb el mateix número: una venda només té una factura completa.</p>

<h4>Anul·lar una venda ja cobrada</h4>
<p>Amb <strong>Anul·lar venda</strong> (propietari o empleat amb permís d'edició) no s'esborra res: s'emet una <strong>factura rectificativa</strong> (R) que la deixa a zero i n'apunta el motiu. La venda continua al mes en què es va fer i la rectificativa resta al seu, així que mai es reescriu un trimestre que ja vas presentar. Pots imprimir-la.</p>

<h4>VeriFactu</h4>
<p>A <strong>El Meu Negoci → VeriFactu (facturació certificada)</strong> veuràs la targeta marcada <strong>Properament</strong>. Explica que la idea és connectar el teu propi compte amb un proveïdor certificat, però avui <strong>la funció està en desenvolupament</strong>: no envia res ni serveix per complir. Mentrestant, la numeració de dalt és la base sobre la qual es muntarà. Si el teu negoci ha de fer servir un sistema de facturació certificat, <strong>consulta-ho amb el teu gestor</strong> i no et recolzis en aquesta targeta.</p>

<h4>Registre de jornada del teu personal</h4>
<p>La llei obliga a registrar la jornada de cada empleat i guardar-la quatre anys. A l'app és el fitxatge:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Cada empleat fitxa a <strong>Horari del Personal</strong>, a la seva fitxa, amb <strong>Entrada</strong> en arribar i <strong>Sortida</strong> en marxar (amb el seu PIN).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">A <strong>Últims fitxatges</strong> es veu cada jornada i si coincideix amb el torn previst. Corregir un fitxatge (<strong>Corregir fitxatge</strong>) <strong>requereix el PIN del negoci</strong> i l'app conserva l'hora original: el registre marca «Corregit a mà» amb el que es va fitxar realment.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Quan ho necessitis, surt al paquet d'<strong>Enviar al gestor</strong> (Gestió Econòmica) marcant <strong>Registre de jornada</strong>: un full per mes, amb empleat, entrada, sortida i hores.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Esborrar un empleat <strong>no esborra els seus fitxatges</strong>: es conserven els quatre anys que exigeix la llei.</div>

<h4>Avís de privacitat de la teva web de reserves</h4>
<p>La web pública on els teus clients reserven i demanen recull les seves dades, així que porta una casella obligatòria (<strong>Accepto que les meves dades es facin servir per gestionar la meva reserva/comanda</strong>) i un avís de privacitat (<strong>Veure més</strong>) amb el responsable, la base legal, quant de temps es guarden les dades i com reclamar davant l'Agència Espanyola de Protecció de Dades. La casella d'avisar-los de novetats és a part i opcional.</p>
<p>Perquè l'avís porti la teva identitat, omple a <strong>El Meu Negoci</strong> el <strong>Titular o raó social (avís legal del teu web)</strong> i marca <strong>Mostrar el meu NIF a l'avís legal i de privacitat del web de reserves</strong>: la llei ho exigeix a qui recull dades per internet.</p>
<p>I per atendre un client que demana els seus drets: <strong>Clients → fitxa → Esborrar dades (RGPD)</strong> les elimina per sempre, i <strong>Promoció → Novetats → Registrar una baixa</strong> li treu el permís de màrqueting. Cada email de novetats porta el seu avís de baixa.</p>

<h4>Còpies de seguretat i arxiu</h4>
<p>Les teves dades són al teu aparell i al teu núvol, però una còpia teva és la millor tranquil·litat. A <strong>El Meu Negoci → Manteniment de dades</strong>:</p>
<ul>
<li><strong>Descarregar còpia de seguretat</strong>: un arxiu amb tot el negoci. Si passa temps sense fer-la, l'app t'ho recorda en entrar (quan ets propietari) amb el botó per descarregar-la al moment.</li>
<li><strong>Restaurar còpia de seguretat</strong>: torna a carregar un arxiu; et diu de quin negoci és i quantes vendes conté abans d'aplicar-lo.</li>
<li><strong>Arxivar dades antigues</strong> (<strong>Arxivar anterior a</strong> una data → <strong>Arxivar i descarregar</strong>): descarrega primer un arxiu amb vendes, reserves, tancaments i comandes rebudes antigues i, només si s'ha desat bé i ho confirmes, les treu de l'app per alleugerir-la. Aquestes dades <strong>surten de l'app</strong>: guarda l'arxiu i pregunta al teu gestor quant de temps l'has de conservar.</li>
</ul>
<p>A més, <strong>Tancar mes</strong> a Tresoreria bloqueja les compres i les inversions d'aquell mes perquè no es canviïn després d'enviar-les al gestor, i les comandes a proveïdor rebudes no s'esborren (només es desfà la recepció).</p>

<h4>El que convé saber</h4>
<ul>
<li>Anul·lar, tancar mes, esborrar dades per RGPD i corregir fitxatges estan protegits per permisos o pel PIN del negoci, perquè toquen dades que podria revisar Hisenda o Inspecció.</li>
<li>La numeració depèn de cada aparell: si reinstal·les, l'app pren com a base les vendes ja desades i mai baixa el número.</li>
<li>El que cobres per avançat (senyals de reserva, vals regal) es tracta a la comptabilitat segons el seu tipus; el teu gestor ho veu al paquet.</li>
</ul>
<h4>Si alguna cosa no funciona</h4>
<ul>
<li><strong>«Per a una factura completa calen el nom, el NIF i el domicili»</strong>: omple els tres camps.</li>
<li><strong>No trobo el botó Factura</strong>: surt a la finestra Cobrament registrat just després de cobrar; també es pot demanar des de la venda.</li>
<li><strong>No puc corregir un fitxatge</strong>: necessites el PIN del negoci.</li>
<li><strong>No tinc còpia recent</strong>: El Meu Negoci → Manteniment de dades → Descarregar còpia de seguretat.</li>
</ul>
`,
    en:`<h3>What it is and what it's for</h3>
<p>What the app does for you with what the law requires —numbered tickets, invoices, working-time records, privacy notice, backups— and what remains your accountant's job.</p>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i><strong>The app is not an accountancy firm.</strong> It organises your data objectively and prepares it for your accountant, but <strong>filing the taxes is done by them</strong>. And <strong>VeriFactu is under development: it does not yet issue verifiable invoices or serve to comply with the regulation</strong>.</div>

<h4>Tickets and invoices: the numbering</h4>
<p>Every ticket you charge is a <strong>simplified invoice</strong> and carries a sequential number that is never repeated or skipped. Each device (tablet, phone, computer) has <strong>its own series</strong>, so two tablets working at once, even offline, never give the same number. The number looks like this:</p>
<table>
<thead><tr><th>Starts with</th><th>What it is</th><th>Example</th></tr></thead>
<tbody>
<tr><td><strong>T</strong></td><td>Ticket (simplified invoice)</td><td>T26K4P-000123</td></tr>
<tr><td><strong>F</strong></td><td>Full invoice, with the customer's details</td><td>F26K4P-000007</td></tr>
<tr><td><strong>R</strong></td><td>Corrective invoice (when cancelling a sale)</td><td>R26K4P-000002</td></tr>
</tbody>
</table>
<p>The two digits after the letter are the year; the next three, that device's code. The <strong>business tax ID</strong> always appears on the ticket: enter it in My Business (if missing, the "So your numbers come out right" list in Financial Management reminds you).</p>

<h4>Giving a customer a full invoice</h4>
<p>When a company or self-employed customer needs an invoice to deduct the expense:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">After taking payment, in the <strong>Charge registered</strong> window press <strong>Invoice</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Fill in the <strong>Customer name or company name</strong>, <strong>tax ID</strong> and <strong>Customer address</strong> (all three are required; if the customer already has a card they fill in on their own).</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">Press <strong>Issue and print</strong>. The invoice carries its F number and says which ticket it replaces. Its details are saved on the customer's card for next time.</div></div>
<p>If you ask for it again for that same sale, a <strong>copy marked as duplicate</strong> comes out with the same number: a sale has only one full invoice.</p>

<h4>Cancelling a sale already paid</h4>
<p>With <strong>Void sale</strong> (owner or employee with edit permission) nothing is deleted: a <strong>corrective invoice</strong> (R) is issued that brings it to zero and records the reason. The sale stays in the month it was made and the corrective invoice subtracts in its own, so a quarter you already filed is never rewritten. You can print it.</p>

<h4>VeriFactu</h4>
<p>In <strong>My Business → VeriFactu (certified invoicing)</strong> you'll see the card marked <strong>Coming soon</strong>. It explains that the idea is to connect your own account with a certified provider, but today <strong>the feature is under development</strong>: it sends nothing and doesn't serve to comply. Meanwhile, the numbering above is the foundation it will be built on. If your business must use a certified invoicing system, <strong>check with your accountant</strong> and don't rely on this card.</p>

<h4>Your staff's working-time record</h4>
<p>The law requires recording each employee's working hours and keeping them for four years. In the app that's clocking in:</p>
<div class="manual-step"><div class="sn">1</div><div class="st">Each employee clocks in under <strong>Staff Schedule</strong>, on their card, with <strong>Clock in</strong> on arrival and <strong>Clock out</strong> on leaving (with their PIN).</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Under <strong>Last clock-ins</strong> you see each day and whether it matches the planned shift. Fixing a clock-in (<strong>Fix clock-in</strong>) <strong>requires the business PIN</strong> and the app keeps the original time: the record marks "Edited by hand" with what was actually clocked.</div></div>
<div class="manual-step"><div class="sn">3</div><div class="st">When you need it, it comes in the <strong>Send to accountant</strong> package (Financial Management) by ticking <strong>Working-time record</strong>: one sheet per month, with employee, in, out and hours.</div></div>
<div class="manual-tip"><i class="ti ti-bulb"></i>Deleting an employee <strong>does not delete their clock-ins</strong>: they are kept for the four years the law requires.</div>

<h4>Privacy notice on your booking website</h4>
<p>The public website where your customers book and order collects their data, so it carries a required tick box (<strong>I agree that my data will be used to manage my reservation/order</strong>) and a privacy notice (<strong>Read more</strong>) with the controller, the legal basis, how long data is kept and how to complain to the Spanish Data Protection Agency. The box for sending them news is separate and optional.</p>
<p>For the notice to carry your identity, fill in <strong>Legal owner or company name (your website's legal notice)</strong> in <strong>My Business</strong> and tick <strong>Show my tax ID in the booking website's legal and privacy notice</strong>: the law requires it from anyone collecting data online.</p>
<p>And to handle a customer exercising their rights: <strong>Customers → card → Erase data (GDPR)</strong> deletes it for good, and <strong>Promotion → News → Record an opt-out</strong> removes their marketing consent. Every news email carries its opt-out notice.</p>

<h4>Backups and archiving</h4>
<p>Your data is on your device and in your cloud, but a copy of your own is the best peace of mind. In <strong>My Business → Data maintenance</strong>:</p>
<ul>
<li><strong>Download backup</strong>: a file with the whole business. If time passes without one, the app reminds you on entry (when you're the owner) with a button to download it right away.</li>
<li><strong>Restore backup</strong>: loads a file again; it tells you which business it belongs to and how many sales it contains before applying it.</li>
<li><strong>Archive old data</strong> (<strong>Archive before</strong> a date → <strong>Archive and download</strong>): first downloads a file with old sales, bookings, cash closings and received orders and, only if it saved properly and you confirm, removes them from the app to lighten it. That data <strong>leaves the app</strong>: keep the file and ask your accountant how long you must keep it.</li>
</ul>
<p>In addition, <strong>Close month</strong> in Treasury locks that month's purchases and investments so they can't change after being sent to your accountant, and received supplier orders are never deleted (you can only undo the receipt).</p>

<h4>Good to know</h4>
<ul>
<li>Cancelling, closing a month, erasing data under GDPR and fixing clock-ins are protected by permissions or the business PIN, because they touch data that the tax office or labour inspectors could review.</li>
<li>Numbering depends on each device: if you reinstall, the app takes the already-saved sales as its base and the number never goes down.</li>
<li>What you collect in advance (booking deposits, gift vouchers) is treated in the accounts according to its type; your accountant sees it in the package.</li>
</ul>
<h4>If something doesn't work</h4>
<ul>
<li><strong>"A full invoice needs the customer's name, tax ID and address."</strong>: fill in all three fields.</li>
<li><strong>I can't find the Invoice button</strong>: it appears in the Charge registered window right after taking payment; it can also be requested from the sale.</li>
<li><strong>I can't fix a clock-in</strong>: you need the business PIN.</li>
<li><strong>I have no recent backup</strong>: My Business → Data maintenance → Download backup.</li>
</ul>
`}
  },
  {id:'faq', area:'ayuda',
    title:{es:`<i class="ti ti-help-circle"></i> Preguntas frecuentes y problemas`, ca:`<i class="ti ti-help-circle"></i> Preguntes freqüents i problemes`, en:`<i class="ti ti-help-circle"></i> Frequently asked questions and problems`},
    content:{es:`<h3>Cómo usar este capítulo</h3>
<p>Aquí están los problemas que más se repiten, ordenados por <strong>lo que ves en pantalla</strong>. Busca tu síntoma, mira las causas por orden (la primera suele ser la buena) y sigue los pasos. Puedes usar el buscador del manual con una palabra del mensaje (por ejemplo «Guardando» o «PIN»).</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si el problema es de la nube, abre siempre antes la etiqueta de nube de la cabecera: te dice el motivo exacto y es lo más rápido de diagnosticar.</div>

<h4>Entrar y PIN</h4>
<p><strong>«Nombre, PIN o código de negocio incorrectos» al entrar como empleado</strong></p>
<ul>
<li>El nombre debe ser el de su ficha en <strong>Personal</strong> (da igual mayúsculas o minúsculas, pero sí los espacios y las letras).</li>
<li>El PIN son 4 dígitos. Si es la primera vez que entra, es el de fábrica: <strong>1234</strong>.</li>
<li>La ficha debe estar con la casilla <strong>Activo</strong> marcada.</li>
<li>El código de negocio son 8 caracteres; se lo da el propietario y está en Mi Negocio → <strong>Código de negocio</strong>.</li>
<li>En un aparato nuevo, la primera vez necesita internet y que el propietario ya haya conectado la nube del negocio.</li>
</ul>
<p><strong>Un empleado ha olvidado su PIN</strong></p>
<div class="manual-step"><div class="sn">1</div><div class="st">El propietario entra en <strong>Personal</strong>, abre el menú <strong>⋯</strong> de su tarjeta → <strong>Editar ficha</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Pulsa <strong>Restablecer PIN a 1234</strong> y confirma. Al entrar, el empleado tendrá que elegir uno nuevo.</div></div>
<p><strong>He olvidado mi PIN de propietario</strong></p>
<ul>
<li>Si sigues dentro en otro dispositivo: en el botón <strong>Negocios</strong> de la cabecera, abajo, <strong>Cambiar mi contraseña</strong>. Vale en todos tus dispositivos y necesita internet.</li>
<li>Si no, en un dispositivo donde esa cuenta ya entró alguna vez: escribe tu usuario y en el campo PIN escribe <strong>GGGG</strong>; la app te pide fijar uno nuevo (6-12 letras o números).</li>
<li>Si has perdido el PIN y todos los dispositivos, escribe a quien te vendió GastroGoan: puede reemitir tu cuenta con un PIN nuevo y recuperas tus negocios volviendo a canjear sus códigos.</li>
</ul>
<p><strong>«Ese código ya está en uso en otra cuenta»</strong></p>
<p>Cada código de negocio pertenece a una sola cuenta de propietario, la primera que lo canjeó. Entra con <strong>esa</strong> cuenta (si es la tuya, aparecerá sola en <strong>Selecciona tu negocio</strong>). Si estás seguro de que es tuyo y nunca lo habías canjeado, escribe a quien te lo vendió.</p>
<p><strong>«Ese código de negocio no es correcto»</strong>: revisa que no falte ni sobre ningún carácter (son 8). <strong>«Este código ya es uno de tus negocios en este dispositivo»</strong>: no hace falta canjearlo otra vez, ya está en tu selector.</p>
<p><strong>«Licencia desactivada»</strong>: la licencia de ese negocio se ha dado de baja. Si crees que es un error, contacta con quien te vendió GastroGoan. Con <strong>Quitar este negocio de este dispositivo</strong> el aviso desaparece del todo; sus datos siguen en su nube.</p>
<p><strong>Entro con mi cuenta nueva y no veo ningún negocio</strong>: es lo normal en una cuenta recién creada. Pulsa <strong>Canjear negocio</strong> y escribe el código de tu licencia.</p>

<h4>Permisos: «no me deja hacer esto»</h4>
<p><strong>No me deja editar a un empleado</strong></p>
<p>Las fichas del personal (alta, datos y PIN) las lleva <strong>solo el propietario</strong>. Un jefe de cocina o de sala con permiso de edición sí puede organizar los <strong>turnos</strong> de su equipo desde Día y Semana, pero en Personal solo ve su propia tarjeta. Entra como propietario para tocar las fichas.</p>
<p><strong>«Necesitas permiso de edición para entrar aquí»</strong></p>
<p>Esa pantalla (por ejemplo Oferta, Escandallo, Mega Lista, Proveedores o I+D) solo está para el propietario o para un empleado con permiso de edición. El propietario lo concede en la ficha del empleado, en Personal.</p>
<p><strong>«Gestión es solo para el propietario del negocio»</strong></p>
<p>Gestión Económica, Panel de Control y Mi Negocio no se abren con ningún PIN de empleado, ni siquiera con permiso de edición. Hay que entrar por <strong>Acceso Propietarios</strong>.</p>
<p><strong>«Cancelar o anular algo lo hace el propietario o un empleado con permiso de editar»</strong></p>
<p>Vale para reservas, pedidos online, ventas y lista de espera. Pide que lo haga quien lleve el turno con permiso, o hazlo tú como propietario.</p>
<p><strong>No veo el botón Negocios ni Ayuda</strong>: son solo del propietario.</p>

<h4>Nube y sincronización</h4>
<p><strong>La etiqueta se queda en «Guardando...»</strong></p>
<ul>
<li>Espera unos segundos: los cambios suben a los 0,8 s de dejar de escribir.</li>
<li>Si no cambia, mira si hay conexión. Sin internet pasa a <strong>Sin conexión</strong> y sube sola al volver.</li>
<li>Pulsa la etiqueta y <strong>Probar mi nube ahora</strong>: si hay un fallo, te lo explica.</li>
</ul>
<p><strong>«Error de nube»</strong>: pulsa la etiqueta; la app muestra el motivo y el botón para copiarlo. Las causas habituales, en tu proyecto de Firebase:</p>
<ul>
<li><strong>Falta el inicio de sesión Anónimo</strong>: Authentication → Método de acceso → Anónimo → activar y guardar.</li>
<li><strong>Dirección no autorizada</strong>: Authentication → Settings → Dominios autorizados, añade <strong>app.gastrogoan.com</strong> y <strong>reservas.gastrogoan.com</strong>.</li>
<li><strong>Clave de API incorrecta</strong>: vuelve a copiarla sin espacios ni comillas.</li>
<li><strong>La nube te rechaza</strong>: no pegaste las reglas de seguridad (Realtime Database → Reglas → Publicar) o la URL de la base de datos no es la de ese proyecto.</li>
</ul>
<p>Puedes corregirlo en el mismo cuadro, en <strong>Cambiar la configuración de Firebase</strong> (o en Mi Negocio → Conexiones externas).</p>
<p><strong>Tengo un aviso de «reglas de seguridad de una versión anterior»</strong>: todo funciona y no pierdes nada. Pulsa <strong>Copiar las reglas nuevas</strong>, pégalas en Firebase → Realtime Database → Reglas → Publicar y vuelve a pulsar <strong>Probar mi nube ahora</strong>. Mientras no lo hagas, las reservas online pueden seguir pasando por el servidor compartido y faltan las mejoras de pagos y de borrado del histórico.</p>
<p><strong>Un cambio no se ve en el otro dispositivo</strong></p>
<ol>
<li>Pulsa <strong>Actualizar</strong> en la cabecera del dispositivo que no lo ve.</li>
<li>Mira que los dos tengan la etiqueta <strong>Nube conectada</strong> y que sean el <strong>mismo negocio</strong> (mismo código en Mi Negocio). Con varios locales es fácil estar en otro.</li>
<li>Si uno estuvo sin conexión, sincronizará al volver; dale un minuto.</li>
<li>Hay cosas que son <strong>de cada aparato</strong> y nunca se sincronizan: el idioma, la impresora, la clave del asistente de IA y la clave de VeriFactu. Se configuran en cada dispositivo.</li>
</ol>
<p><strong>Una sesión de empleado no encuentra el negocio en un aparato nuevo</strong>: necesita internet esa primera vez y que la nube esté bien conectada (mira «Error de nube»).</p>

<h4>Impresión y cajón</h4>
<p><strong>No imprime el ticket</strong></p>
<ol>
<li>En Mi Negocio → <strong>Impresora de tickets</strong>, mira <strong>Cómo imprime este aparato</strong>. Es un ajuste de <strong>cada dispositivo</strong>.</li>
<li><strong>Navegador / AirPrint / impresora del sistema</strong> vale para cualquier impresora instalada (red, USB, AirPrint): la eliges en el cuadro de imprimir y queda recordada. Es lo que funciona en iPhone, iPad y Firefox.</li>
<li><strong>Bluetooth</strong> solo existe en Chrome y Edge (Android u ordenador). Pulsa <strong>Conectar impresora</strong>, elige la tuya y comprueba que está encendida y cerca. Si falla, la app abre la impresión del navegador y te lo dice.</li>
<li>Comprueba el <strong>ancho del papel</strong> (80 mm o 58 mm).</li>
</ol>
<p><strong>No salen las comandas en cocina o barra</strong>: en Mi Negocio → <strong>Comandas de cocina y sala</strong> debe estar elegido <strong>Imprimir</strong> (con <strong>Mostrar en pantalla</strong> no se imprime nada), el perfil de impresora con su casilla marcada y el contenido correcto (comida, bebida o todo el pedido). Prueba con <strong>Comanda de prueba</strong> antes del servicio.</p>
<p><strong>El cajón no se abre</strong></p>
<ul>
<li>El cajón va enchufado a la impresora (cable RJ11), no al ordenador. Si la impresora no imprime, el cajón tampoco abrirá.</li>
<li>La apertura automática de la app solo funciona con impresora por <strong>Bluetooth</strong> y la casilla <strong>Abrir el cajón automáticamente al cobrar</strong> marcada. Prueba con <strong>Probar apertura</strong>.</li>
<li>En iPad, iPhone o con impresión por navegador, activa «abrir cajón al imprimir» en las propiedades de la impresora del sistema.</li>
</ul>

<h4>Web de reservas, pedidos online y QR</h4>
<p><strong>El enlace o el QR no cargan, o Mi Negocio dice «Configura la nube» / «Activa tu licencia»</strong>: la tarjeta de reservas online solo se activa con la licencia canjeada y la nube conectada. Si no cargó desde el principio, mira que <strong>reservas.gastrogoan.com</strong> esté en los dominios autorizados de tu Firebase.</p>
<p><strong>Los clientes no pueden pedir</strong></p>
<ul>
<li>Mi Negocio avisa en la tarjeta de reservas con «Ninguna carta activa ahora mismo». Las cartas se activan solas por el horario que les pusiste en Oferta; revisa que haya una activa a esa hora.</li>
<li>Revisa los <strong>Tipos de servicio</strong> (si desactivas Delivery, no se ofrece) y el <strong>Horario de apertura</strong>.</li>
<li>La <strong>antelación mínima</strong>, el <strong>cierre de pedidos antes de la hora de cierre</strong> y el <strong>pedido mínimo</strong> pueden impedirlo.</li>
</ul>
<p><strong>No dejan reservar, o dicen que no hay mesa</strong>: todas las mesas necesitan sus <strong>plazas</strong> (aparecen marcadas en rojo en Mi Negocio → Operativa si faltan). Sin plazas la web no puede ofrecer esa mesa y las reservas no se confirman solas. Comprueba también el aforo por turno y el horario.</p>
<p><strong>El cobro con tarjeta no aparece o está «Pendiente»</strong>: en Mi Negocio → <strong>Pago online con tarjeta (Stripe)</strong> mira el estado. Si pone «Conectado, pero Stripe aún no deja cobrar», pulsa <strong>Terminar el alta en Stripe</strong>; si Stripe está revisando tus datos, espera unos minutos y pulsa <strong>Volver a comprobar</strong>.</p>
<p><strong>El QR de una mesa no funciona</strong>: en Mi Negocio → <strong>QR auto pedido</strong> tiene que estar activada la carta por QR. Si lo cambiaste, recuerda que <strong>Cambiar QR</strong> anula el QR impreso en esa mesa. Si el enlace con tu nombre da «Ese nombre ya lo está usando otro negocio», prueba con otro.</p>

<h4>TPV, oferta y stock</h4>
<p><strong>No aparece una carta (o un plato) en el TPV</strong></p>
<ol>
<li>Pulsa el botón <strong>Cartas</strong> de la barra del TPV: lista las cartas y menús activos ahora. Si no hay ninguna, el botón sale en rojo.</li>
<li>Las cartas se activan solas según el <strong>horario</strong> de cada una en Oferta Gastronómica (Oferta de Bebidas en Sala). Comprueba los días y las franjas.</li>
<li>Dentro de la carta, mira que el plato no esté <strong>agotado</strong> (también desde el menú <strong>⋯</strong> del TPV → «Marcar agotado») y que tenga raciones si usas el límite.</li>
<li>Si es un plato de Cocina y estás en Sala, o al revés, busca en la carta del área correcta.</li>
</ol>
<p><strong>El stock no baja</strong></p>
<ul>
<li>El stock se descuenta <strong>al cobrar</strong>, no al marchar el plato.</li>
<li>El plato de la carta debe estar enlazado a una <strong>receta del Escandallo</strong> con sus ingredientes; un plato sin receta no mueve existencias.</li>
<li>Cada ingrediente debe existir en <strong>Stock</strong> (se descuenta con la merma que pusiste en la receta). Las elaboraciones base descuentan de su propio stock.</li>
<li>Si lo que no baja son las raciones de un plato, mira el límite en Oferta.</li>
</ul>
<p><strong>Un plato sale en la carta con el precio viejo</strong>: cambiar el precio en el Escandallo no siempre cambia la carta. Actualízalo en Oferta Gastronómica, o aplica la sugerencia desde la ventana de subidas de precio.</p>

<h4>Los números no cuadran</h4>
<ul>
<li><strong>El escandallo sale a 0 €</strong>: faltan los precios de compra en la Mega Lista (ya viene el catálogo, pero a precio cero) o el formato/unidad está mal. Mira «por revisar» en la Mega Lista.</li>
<li><strong>El food cost parece distinto del esperado</strong>: el precio de compra es <strong>sin IVA</strong>; el precio de la carta lleva IVA y la app lo quita para calcular el food cost. Comparas manzanas con manzanas solo si ambos van sin IVA.</li>
<li><strong>El IVA de los tickets</strong> sale del tipo general de Mi Negocio → <strong>Configuración del ticket</strong>. Revísalo si vendes con otros tipos.</li>
<li><strong>La Cuenta de Resultados no se parece a la de tu gestor</strong>: primero comprueba la <strong>forma jurídica y el régimen fiscal</strong> de Mi Negocio (si falta, aparece un aviso rojo) y tus gastos fijos. El impuesto se calcula por años, no mes a mes, y un mes puede salir con impuesto negativo. En autónomos y CB el «sueldo del titular» no es gasto.</li>
<li><strong>Una venta anulada</strong> sigue contando en su mes; la rectificativa resta en el mes en que se anula, para no tocar un trimestre ya presentado.</li>
<li><strong>Pedidos por plataformas</strong>: la comisión se descuenta con el porcentaje que pusiste en Mi Negocio → Plataformas de delivery.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>GastroGoan ordena tus datos, pero no es una gestoría: las declaraciones las presenta tu gestor.</div>

<h4>Copias, borrados y datos</h4>
<p><strong>¿Cómo hago una copia de seguridad?</strong> Mi Negocio → <strong>Mantenimiento de datos</strong> → <strong>Descargar copia de seguridad</strong>. Se guarda un archivo con todos los datos del negocio; guárdalo fuera del dispositivo. La app te lo recuerda si pasan 30 días.</p>
<p><strong>¿Cómo la recupero?</strong> <strong>Restaurar copia de seguridad</strong> y elegir el archivo. Cuidado: sustituye todos los datos de este dispositivo y te pide escribir el nombre del negocio para confirmar.</p>
<p><strong>He borrado algo por error</strong>: Mi Negocio → Mantenimiento de datos → <strong>Papelera</strong>. Guarda 30 días lo borrado (empleados, clientes, recetas, ingredientes, elaboraciones, reservas y pedidos) y se recupera con <strong>Restaurar</strong>. Las relaciones ya limpiadas, como los turnos de un empleado, hay que rehacerlas.</p>
<p><strong>¿Por qué no puedo borrar este registro?</strong></p>
<ul>
<li><strong>Ventas</strong>: no se borran, se <strong>anulan</strong> (y no se puede anular si el mes ya está cerrado en Gestión Económica; hay que reabrirlo en Tesorería).</li>
<li><strong>Pedidos a proveedor recibidos</strong>: no se borran; solo hay <strong>Deshacer recepción</strong>.</li>
<li><strong>Vales regalo emitidos</strong>: se anulan, no se borran, y solo si no tienen canjes.</li>
<li><strong>Mesa o zona con una comanda abierta</strong>: cóbrala o vacíala primero en el TPV.</li>
<li><strong>Empleado</strong>: al borrarlo, sus fichajes se conservan (obligación legal de 4 años).</li>
<li><strong>Negocio con sucursales</strong>: quita primero las sucursales.</li>
<li>Si el botón no está, mira el menú <strong>⋯</strong> de la fila: editar y eliminar van ahí, y solo los ve quien puede hacerlo.</li>
</ul>
<p><strong>La app va lenta o pesa mucho</strong>: en Mantenimiento de datos usa <strong>Archivar y descargar</strong> para sacar ventas, reservas, cierres y pedidos recibidos de más de un año (descarga antes un archivo con todo).</p>

<h4>Idioma, versión y otros</h4>
<p><strong>¿Cómo cambio el idioma?</strong> Con el selector <strong>ES / CA / EN</strong> de la cabecera (o de la pantalla de entrada). Es un ajuste de cada dispositivo. Los datos que escribiste (nombres de platos, ingredientes...) no se traducen.</p>
<p><strong>Veo una versión vieja o falta algo que me dijeron</strong>: pulsa <strong>Actualizar</strong> en la cabecera; si hay versión nueva te la ofrece (<strong>Actualizar ahora</strong>). Cierra y vuelve a abrir la app si no se ve.</p>
<p><strong>La app me pide activar otra vez el negocio</strong>: entra con tu cuenta de propietario; tus negocios aparecen solos en el selector sin volver a canjear sus códigos.</p>
<p><strong>No llegan los avisos del navegador</strong>: actívalos en Mi Negocio → Mantenimiento de datos → <strong>Activar avisos</strong>. Solo funcionan con el navegador abierto.</p>
<p><strong>No encuentro quién cambió algo</strong>: Mi Negocio → Mantenimiento de datos → <strong>Registro de actividad</strong>, con filtro por empleado. Solo recoge lo que hacen los empleados, no lo que haces tú como propietario.</p>`,
    ca:`<h3>Com fer servir aquest capítol</h3>
<p>Aquí hi ha els problemes que més es repeteixen, ordenats per <strong>el que veus en pantalla</strong>. Busca el teu símptoma, mira les causes per ordre (la primera sol ser la bona) i segueix els passos. Pots fer servir el cercador del manual amb una paraula del missatge (per exemple «Desant» o «PIN»).</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>Si el problema és del núvol, obre sempre abans l'etiqueta de núvol de la capçalera: et diu el motiu exacte i és el més ràpid de diagnosticar.</div>

<h4>Entrar i PIN</h4>
<p><strong>«Nom, PIN o codi de negoci incorrectes» en entrar com a empleat</strong></p>
<ul>
<li>El nom ha de ser el de la seva fitxa a <strong>Personal</strong> (és igual majúscules o minúscules, però no els espais ni les lletres).</li>
<li>El PIN són 4 dígits. Si és la primera vegada que entra, és el de fàbrica: <strong>1234</strong>.</li>
<li>La fitxa ha de tenir la casella <strong>Actiu</strong> marcada.</li>
<li>El codi de negoci són 8 caràcters; li'l dona el propietari i és a El Meu Negoci → <strong>Codi de negoci</strong>.</li>
<li>En un aparell nou, la primera vegada cal internet i que el propietari ja hagi connectat el núvol del negoci.</li>
</ul>
<p><strong>Un empleat ha oblidat el seu PIN</strong></p>
<div class="manual-step"><div class="sn">1</div><div class="st">El propietari entra a <strong>Personal</strong>, obre el menú <strong>⋯</strong> de la seva targeta → <strong>Editar fitxa</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Prem <strong>Restablir PIN a 1234</strong> i confirma. En entrar, l'empleat haurà de triar-ne un de nou.</div></div>
<p><strong>He oblidat el meu PIN de propietari</strong></p>
<ul>
<li>Si encara ets dins en un altre dispositiu: al botó <strong>Negocis</strong> de la capçalera, a baix, <strong>Canviar la meva contrasenya</strong>. Val a tots els teus dispositius i necessita internet.</li>
<li>Si no, en un dispositiu on aquest compte ja hagi entrat alguna vegada: escriu el teu usuari i al camp del PIN escriu <strong>GGGG</strong>; l'app et demana fixar-ne un de nou (6-12 lletres o números).</li>
<li>Si has perdut el PIN i tots els dispositius, escriu a qui et va vendre GastroGoan: pot reemetre el teu compte amb un PIN nou i recuperes els negocis tornant a bescanviar-ne els codis.</li>
</ul>
<p><strong>«Aquest codi ja s'està fent servir en un altre compte»</strong></p>
<p>Cada codi de negoci pertany a un sol compte de propietari, el primer que el va bescanviar. Entra amb <strong>aquell</strong> compte (si és el teu, apareixerà sol a <strong>Selecciona el teu negoci</strong>). Si estàs segur que és teu i mai l'havies bescanviat, escriu a qui te'l va vendre.</p>
<p><strong>«Aquest codi de negoci no és correcte»</strong>: revisa que no falti ni sobri cap caràcter (són 8). <strong>«Aquest codi ja és un dels teus negocis en aquest dispositiu»</strong>: no cal bescanviar-lo un altre cop, ja és al teu selector.</p>
<p><strong>«Llicència desactivada»</strong>: la llicència d'aquest negoci s'ha donat de baixa. Si creus que és un error, contacta amb qui et va vendre GastroGoan. Amb <strong>Treure aquest negoci d'aquest dispositiu</strong> l'avís desapareix del tot; les seves dades continuen al seu núvol.</p>
<p><strong>Entro amb el meu compte nou i no veig cap negoci</strong>: és el normal en un compte acabat de crear. Prem <strong>Bescanviar negoci</strong> i escriu el codi de la teva llicència.</p>

<h4>Permisos: «no em deixa fer això»</h4>
<p><strong>No em deixa editar un empleat</strong></p>
<p>Les fitxes del personal (alta, dades i PIN) les porta <strong>només el propietari</strong>. Un cap de cuina o de sala amb permís d'edició sí que pot organitzar els <strong>torns</strong> del seu equip des de Dia i Setmana, però a Personal només veu la seva pròpia targeta. Entra com a propietari per tocar les fitxes.</p>
<p><strong>«Necessites permís d'edició per entrar aquí»</strong></p>
<p>Aquesta pantalla (per exemple Oferta, Escandall, Mega Llista, Proveïdors o R+D) només és per al propietari o per a un empleat amb permís d'edició. El propietari el concedeix a la fitxa de l'empleat, a Personal.</p>
<p><strong>«Gestió és només per al propietari del negoci»</strong></p>
<p>Gestió Econòmica, Tauler de Control i El Meu Negoci no s'obren amb cap PIN d'empleat, ni tan sols amb permís d'edició. Cal entrar per <strong>Accés Propietaris</strong>.</p>
<p><strong>«Cancel·lar o anul·lar alguna cosa ho fa el propietari o un empleat amb permís d'editar»</strong></p>
<p>Val per a reserves, comandes en línia, vendes i llista d'espera. Demana que ho faci qui porti el torn amb permís, o fes-ho tu com a propietari.</p>
<p><strong>No veig el botó Negocis ni Ajuda</strong>: són només del propietari.</p>

<h4>Núvol i sincronització</h4>
<p><strong>L'etiqueta es queda a «Desant...»</strong></p>
<ul>
<li>Espera uns segons: els canvis pugen 0,8 s després de deixar d'escriure.</li>
<li>Si no canvia, mira si hi ha connexió. Sense internet passa a <strong>Sense connexió</strong> i puja sola en tornar.</li>
<li>Prem l'etiqueta i <strong>Provar el meu núvol ara</strong>: si hi ha una fallada, t'ho explica.</li>
</ul>
<p><strong>«Error de núvol»</strong>: prem l'etiqueta; l'app mostra el motiu i el botó per copiar-lo. Les causes habituals, al teu projecte de Firebase:</p>
<ul>
<li><strong>Falta l'inici de sessió Anònim</strong>: Authentication → Mètode d'accés → Anònim → activar i desar.</li>
<li><strong>Adreça no autoritzada</strong>: Authentication → Settings → Dominis autoritzats, afegeix <strong>app.gastrogoan.com</strong> i <strong>reservas.gastrogoan.com</strong>.</li>
<li><strong>Clau d'API incorrecta</strong>: torna a copiar-la sense espais ni cometes.</li>
<li><strong>El núvol et rebutja</strong>: no vas enganxar les regles de seguretat (Realtime Database → Regles → Publicar) o l'URL de la base de dades no és la d'aquest projecte.</li>
</ul>
<p>Ho pots corregir al mateix quadre, a <strong>Canviar la configuració de Firebase</strong> (o a El Meu Negoci → Connexions externes).</p>
<p><strong>Tinc un avís de «regles de seguretat d'una versió anterior»</strong>: tot funciona i no perds res. Prem <strong>Copiar les regles noves</strong>, enganxa-les a Firebase → Realtime Database → Regles → Publicar i torna a prémer <strong>Provar el meu núvol ara</strong>. Mentre no ho facis, les reserves en línia poden continuar passant pel servidor compartit i falten les millores de pagaments i d'esborrat de l'historial.</p>
<p><strong>Un canvi no es veu a l'altre dispositiu</strong></p>
<ol>
<li>Prem <strong>Actualitzar</strong> a la capçalera del dispositiu que no el veu.</li>
<li>Mira que tots dos tinguin l'etiqueta <strong>Núvol connectat</strong> i que siguin el <strong>mateix negoci</strong> (mateix codi a El Meu Negoci). Amb diversos locals és fàcil ser en un altre.</li>
<li>Si un va estar sense connexió, sincronitzarà en tornar; dona-li un minut.</li>
<li>Hi ha coses que són <strong>de cada aparell</strong> i mai se sincronitzen: l'idioma, la impressora, la clau de l'assistent d'IA i la clau de VeriFactu. Es configuren a cada dispositiu.</li>
</ol>
<p><strong>Una sessió d'empleat no troba el negoci en un aparell nou</strong>: necessita internet aquella primera vegada i que el núvol estigui ben connectat (mira «Error de núvol»).</p>

<h4>Impressió i calaix</h4>
<p><strong>No imprimeix el tiquet</strong></p>
<ol>
<li>A El Meu Negoci → <strong>Impressora de tiquets</strong>, mira <strong>Com imprimeix aquest aparell</strong>. És un ajust de <strong>cada dispositiu</strong>.</li>
<li><strong>Navegador / AirPrint / impressora del sistema</strong> serveix per a qualsevol impressora instal·lada (xarxa, USB, AirPrint): la tries al quadre d'imprimir i queda recordada. És el que funciona a iPhone, iPad i Firefox.</li>
<li><strong>Bluetooth</strong> només existeix a Chrome i Edge (Android o ordinador). Prem <strong>Connectar impressora</strong>, tria la teva i comprova que està encesa i a prop. Si falla, l'app obre la impressió del navegador i t'ho diu.</li>
<li>Comprova l'<strong>amplada del paper</strong> (80 mm o 58 mm).</li>
</ol>
<p><strong>No surten les comandes a cuina o barra</strong>: a El Meu Negoci → <strong>Comandes de cuina i sala</strong> ha d'estar triat <strong>Imprimir</strong> (amb <strong>Mostrar en pantalla</strong> no s'imprimeix res), el perfil d'impressora amb la seva casella marcada i el contingut correcte (menjar, beguda o tota la comanda). Prova-ho amb <strong>Comanda de prova</strong> abans del servei.</p>
<p><strong>El calaix no s'obre</strong></p>
<ul>
<li>El calaix va endollat a la impressora (cable RJ11), no a l'ordinador. Si la impressora no imprimeix, el calaix tampoc s'obrirà.</li>
<li>L'obertura automàtica de l'app només funciona amb impressora per <strong>Bluetooth</strong> i la casella <strong>Obrir el calaix automàticament en cobrar</strong> marcada. Prova-ho amb <strong>Provar obertura</strong>.</li>
<li>A iPad, iPhone o amb impressió pel navegador, activa «obrir calaix en imprimir» a les propietats de la impressora del sistema.</li>
</ul>

<h4>Web de reserves, comandes en línia i QR</h4>
<p><strong>L'enllaç o el QR no carreguen, o El Meu Negoci diu «Configura el núvol» / «Activa la teva llicència»</strong>: la targeta de reserves en línia només s'activa amb la llicència bescanviada i el núvol connectat. Si no va carregar des del principi, mira que <strong>reservas.gastrogoan.com</strong> sigui als dominis autoritzats del teu Firebase.</p>
<p><strong>Els clients no poden demanar</strong></p>
<ul>
<li>El Meu Negoci avisa a la targeta de reserves amb «Cap carta activa ara mateix». Les cartes s'activen soles per l'horari que els vas posar a Oferta; revisa que n'hi hagi una d'activa a aquella hora.</li>
<li>Revisa els <strong>Tipus de servei</strong> (si desactives Delivery, no s'ofereix) i l'<strong>Horari d'obertura</strong>.</li>
<li>L'<strong>antelació mínima</strong>, el <strong>tancament de comandes abans de l'hora de tancament</strong> i la <strong>comanda mínima</strong> ho poden impedir.</li>
</ul>
<p><strong>No deixen reservar, o diuen que no hi ha taula</strong>: totes les taules necessiten les seves <strong>places</strong> (apareixen marcades en vermell a El Meu Negoci → Operativa si falten). Sense places la web no pot oferir aquella taula i les reserves no es confirmen soles. Comprova també l'aforament per torn i l'horari.</p>
<p><strong>El cobrament amb targeta no apareix o està «Pendent»</strong>: a El Meu Negoci → <strong>Pagament en línia amb targeta (Stripe)</strong> mira l'estat. Si diu «Connectat, però Stripe encara no deixa cobrar», prem <strong>Acabar l'alta a Stripe</strong>; si Stripe està revisant les teves dades, espera uns minuts i prem <strong>Tornar a comprovar</strong>.</p>
<p><strong>El QR d'una taula no funciona</strong>: a El Meu Negoci → <strong>QR autocomanda</strong> ha d'estar activada la carta per QR. Si el vas canviar, recorda que <strong>Canviar QR</strong> anul·la el QR imprès en aquella taula. Si l'enllaç amb el teu nom dona «Aquest nom ja el fa servir un altre negoci», prova'n un altre.</p>

<h4>TPV, oferta i estoc</h4>
<p><strong>No apareix una carta (o un plat) al TPV</strong></p>
<ol>
<li>Prem el botó <strong>Cartes</strong> de la barra del TPV: llista les cartes i menús actius ara. Si no n'hi ha cap, el botó surt en vermell.</li>
<li>Les cartes s'activen soles segons l'<strong>horari</strong> de cadascuna a Oferta Gastronòmica (Oferta de Begudes a Sala). Comprova els dies i les franges.</li>
<li>Dins de la carta, mira que el plat no estigui <strong>esgotat</strong> (també des del menú <strong>⋯</strong> del TPV → «Marcar esgotat») i que tingui racions si fas servir el límit.</li>
<li>Si és un plat de Cuina i ets a Sala, o al revés, busca a la carta de l'àrea correcta.</li>
</ol>
<p><strong>L'estoc no baixa</strong></p>
<ul>
<li>L'estoc es descompta <strong>en cobrar</strong>, no en marxar el plat.</li>
<li>El plat de la carta ha d'estar enllaçat amb una <strong>recepta de l'Escandall</strong> amb els seus ingredients; un plat sense recepta no mou existències.</li>
<li>Cada ingredient ha d'existir a <strong>Estoc</strong> (es descompta amb la merma que vas posar a la recepta). Les elaboracions base descompten del seu propi estoc.</li>
<li>Si el que no baixa són les racions d'un plat, mira el límit a Oferta.</li>
</ul>
<p><strong>Un plat surt a la carta amb el preu vell</strong>: canviar el preu a l'Escandall no sempre canvia la carta. Actualitza'l a Oferta Gastronòmica, o aplica el suggeriment des de la finestra de pujades de preu.</p>

<h4>Els números no quadren</h4>
<ul>
<li><strong>L'escandall surt a 0 €</strong>: falten els preus de compra a la Mega Llista (ja ve el catàleg, però a preu zero) o el format/unitat és incorrecte. Mira «per revisar» a la Mega Llista.</li>
<li><strong>El food cost sembla diferent de l'esperat</strong>: el preu de compra és <strong>sense IVA</strong>; el preu de la carta porta IVA i l'app el treu per calcular el food cost. Compares peres amb peres només si tots dos van sense IVA.</li>
<li><strong>L'IVA dels tiquets</strong> surt del tipus general d'El Meu Negoci → <strong>Configuració del tiquet</strong>. Revisa'l si vens amb altres tipus.</li>
<li><strong>El Compte de Resultats no s'assembla al del teu gestor</strong>: primer comprova la <strong>forma jurídica i el règim fiscal</strong> d'El Meu Negoci (si falta, apareix un avís vermell) i les teves despeses fixes. L'impost es calcula per anys, no mes a mes, i un mes pot sortir amb impost negatiu. En autònoms i CB el «sou del titular» no és despesa.</li>
<li><strong>Una venda anul·lada</strong> continua comptant en el seu mes; la rectificativa resta al mes en què s'anul·la, per no tocar un trimestre ja presentat.</li>
<li><strong>Comandes per plataformes</strong>: la comissió es descompta amb el percentatge que vas posar a El Meu Negoci → Plataformes de delivery.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>GastroGoan ordena les teves dades, però no és una gestoria: les declaracions les presenta el teu gestor.</div>

<h4>Còpies, esborrats i dades</h4>
<p><strong>Com faig una còpia de seguretat?</strong> El Meu Negoci → <strong>Manteniment de dades</strong> → <strong>Descarregar còpia de seguretat</strong>. Es desa un fitxer amb totes les dades del negoci; guarda'l fora del dispositiu. L'app te ho recorda si passen 30 dies.</p>
<p><strong>Com la recupero?</strong> <strong>Restaurar còpia de seguretat</strong> i triar el fitxer. Compte: substitueix totes les dades d'aquest dispositiu i et demana escriure el nom del negoci per confirmar.</p>
<p><strong>He esborrat alguna cosa per error</strong>: El Meu Negoci → Manteniment de dades → <strong>Paperera</strong>. Guarda 30 dies l'esborrat (empleats, clients, receptes, ingredients, elaboracions, reserves i comandes) i es recupera amb <strong>Restaurar</strong>. Les relacions ja netejades, com els torns d'un empleat, cal refer-les.</p>
<p><strong>Per què no puc esborrar aquest registre?</strong></p>
<ul>
<li><strong>Vendes</strong>: no s'esborren, s'<strong>anul·len</strong> (i no es pot anul·lar si el mes ja és tancat a Gestió Econòmica; cal reobrir-lo a Tresoreria).</li>
<li><strong>Comandes a proveïdor rebudes</strong>: no s'esborren; només hi ha <strong>Desfer recepció</strong>.</li>
<li><strong>Vals regal emesos</strong>: s'anul·len, no s'esborren, i només si no tenen bescanvis.</li>
<li><strong>Taula o zona amb una comanda oberta</strong>: cobra-la o buida-la primer al TPV.</li>
<li><strong>Empleat</strong>: en esborrar-lo, els seus fitxatges es conserven (obligació legal de 4 anys).</li>
<li><strong>Negoci amb sucursals</strong>: treu primer les sucursals.</li>
<li>Si el botó no hi és, mira el menú <strong>⋯</strong> de la fila: editar i eliminar van allà, i només els veu qui ho pot fer.</li>
</ul>
<p><strong>L'app va lenta o pesa molt</strong>: a Manteniment de dades fes servir <strong>Arxivar i descarregar</strong> per treure vendes, reserves, tancaments i comandes rebudes de més d'un any (abans descarrega un fitxer amb tot).</p>

<h4>Idioma, versió i altres</h4>
<p><strong>Com canvio l'idioma?</strong> Amb el selector <strong>ES / CA / EN</strong> de la capçalera (o de la pantalla d'entrada). És un ajust de cada dispositiu. Les dades que has escrit (noms de plats, ingredients...) no es tradueixen.</p>
<p><strong>Veig una versió vella o falta alguna cosa que m'han dit</strong>: prem <strong>Actualitzar</strong> a la capçalera; si hi ha versió nova te l'ofereix (<strong>Actualitzar ara</strong>). Tanca i torna a obrir l'app si no es veu.</p>
<p><strong>L'app em demana activar un altre cop el negoci</strong>: entra amb el teu compte de propietari; els teus negocis apareixen sols al selector sense tornar a bescanviar-ne els codis.</p>
<p><strong>No arriben els avisos del navegador</strong>: activa'ls a El Meu Negoci → Manteniment de dades → <strong>Activar avisos</strong>. Només funcionen amb el navegador obert.</p>
<p><strong>No trobo qui va canviar alguna cosa</strong>: El Meu Negoci → Manteniment de dades → <strong>Registre d'activitat</strong>, amb filtre per empleat. Només recull el que fan els empleats, no el que fas tu com a propietari.</p>`,
    en:`<h3>How to use this chapter</h3>
<p>These are the problems that come up most, sorted by <strong>what you see on screen</strong>. Find your symptom, go through the causes in order (the first is usually the right one) and follow the steps. You can use the manual's search box with a word from the message (for example "Saving" or "PIN").</p>
<div class="manual-tip"><i class="ti ti-bulb"></i>If the problem is cloud-related, always open the cloud badge in the header first: it tells you the exact reason and is the quickest thing to diagnose.</div>

<h4>Signing in and PINs</h4>
<p><strong>"Wrong name, PIN or business code" when signing in as an employee</strong></p>
<ul>
<li>The name must be the one on their record in <strong>Staff</strong> (capitals do not matter, but spaces and letters do).</li>
<li>The PIN is 4 digits. If it is their first sign-in, it is the factory one: <strong>1234</strong>.</li>
<li>Their record must have the <strong>Active</strong> checkbox ticked.</li>
<li>The business code is 8 characters; the owner gives it out and it is in My Business → <strong>Business code</strong>.</li>
<li>On a new device, the first time needs internet and the owner must already have connected the business's cloud.</li>
</ul>
<p><strong>An employee forgot their PIN</strong></p>
<div class="manual-step"><div class="sn">1</div><div class="st">The owner goes to <strong>Staff</strong>, opens the <strong>⋯</strong> menu on their card → <strong>Edit record</strong>.</div></div>
<div class="manual-step"><div class="sn">2</div><div class="st">Tap <strong>Reset PIN to 1234</strong> and confirm. On their next sign-in the employee will have to choose a new one.</div></div>
<p><strong>I forgot my owner PIN</strong></p>
<ul>
<li>If you are still signed in on another device: on the header's <strong>Businesses</strong> button, at the bottom, <strong>Change my password</strong>. It works on all your devices and needs internet.</li>
<li>If not, on a device where that account has signed in before: type your username and, in the PIN field, type <strong>GGGG</strong>; the app asks you to set a new one (6-12 letters or numbers).</li>
<li>If you have lost the PIN and all your devices, write to whoever sold you GastroGoan: they can reissue your account with a new PIN, and you recover your businesses by redeeming their codes again.</li>
</ul>
<p><strong>"That code is already in use on another account"</strong></p>
<p>Each business code belongs to a single owner account, the first one that redeemed it. Sign in with <strong>that</strong> account (if it is yours, it will appear on its own in <strong>Select your business</strong>). If you are sure it is yours and you never redeemed it, write to whoever sold it to you.</p>
<p><strong>"That business code is not correct"</strong>: check no character is missing or extra (there are 8). <strong>"This code is already one of your businesses on this device"</strong>: no need to redeem it again, it is already in your selector.</p>
<p><strong>"License deactivated"</strong>: that business's licence has been cancelled. If you think it is a mistake, contact whoever sold you GastroGoan. <strong>Remove this business from this device</strong> clears the notice for good; its data stays in its cloud.</p>
<p><strong>I sign in with my new account and see no business</strong>: that is normal for a freshly created account. Tap <strong>Redeem business</strong> and type your licence code.</p>

<h4>Permissions: "it won't let me do this"</h4>
<p><strong>It won't let me edit an employee</strong></p>
<p>Staff records (adding people, their details and PINs) are handled by <strong>the owner only</strong>. A kitchen or floor manager with edit permission can organise their team's <strong>shifts</strong> from Day and Week, but in Staff they only see their own card. Sign in as owner to touch the records.</p>
<p><strong>"You need edit permission to enter here"</strong></p>
<p>That screen (for example Menu Offering, Costing, Master List, Suppliers or R&amp;D) is only for the owner or an employee with edit permission. The owner grants it on the employee's record, in Staff.</p>
<p><strong>"Management is for the business owner only"</strong></p>
<p>Financial Management, Dashboard and My Business do not open with any employee PIN, not even with edit permission. You have to sign in through <strong>Owner access</strong>.</p>
<p><strong>"Cancelling or voiding is done by the owner or an employee with edit permission"</strong></p>
<p>It applies to reservations, online orders, sales and the waiting list. Ask whoever runs the shift with permission, or do it yourself as owner.</p>
<p><strong>I can't see the Businesses or Help button</strong>: they are owner-only.</p>

<h4>Cloud and sync</h4>
<p><strong>The badge stays on "Saving..."</strong></p>
<ul>
<li>Wait a few seconds: changes upload 0.8 s after you stop typing.</li>
<li>If it does not change, check the connection. Without internet it switches to <strong>Offline</strong> and uploads on its own when it returns.</li>
<li>Tap the badge and <strong>Test my cloud now</strong>: if something is wrong, it explains it.</li>
</ul>
<p><strong>"Cloud error"</strong>: tap the badge; the app shows the reason and a button to copy it. The usual causes, in your Firebase project:</p>
<ul>
<li><strong>Anonymous sign-in is not enabled</strong>: Authentication → Sign-in method → Anonymous → enable and save.</li>
<li><strong>Address not authorised</strong>: Authentication → Settings → Authorised domains, add <strong>app.gastrogoan.com</strong> and <strong>reservas.gastrogoan.com</strong>.</li>
<li><strong>Wrong API key</strong>: copy it again with no spaces or quotes.</li>
<li><strong>Your cloud refuses you</strong>: you did not paste the security rules (Realtime Database → Rules → Publish) or the database URL is not that project's.</li>
</ul>
<p>You can fix it in the same window, under <strong>Change Firebase settings</strong> (or in My Business → External connections).</p>
<p><strong>I get a notice about "security rules from an older version"</strong>: everything works and you lose nothing. Tap <strong>Copy the new rules</strong>, paste them into Firebase → Realtime Database → Rules → Publish and tap <strong>Test my cloud now</strong> again. Until you do, online bookings may keep going through the shared server and you miss the payments and history-cleanup improvements.</p>
<p><strong>A change doesn't show on the other device</strong></p>
<ol>
<li>Tap <strong>Refresh</strong> in the header of the device that does not see it.</li>
<li>Check both show <strong>Cloud connected</strong> and are the <strong>same business</strong> (same code in My Business). With several locations it is easy to be in another one.</li>
<li>If one was offline, it syncs when it comes back; give it a minute.</li>
<li>Some things are <strong>per device</strong> and never sync: the language, the printer, the AI assistant key and the VeriFactu key. Set them up on each device.</li>
</ol>
<p><strong>An employee sign-in can't find the business on a new device</strong>: it needs internet that first time and a properly connected cloud (see "Cloud error").</p>

<h4>Printing and cash drawer</h4>
<p><strong>The receipt won't print</strong></p>
<ol>
<li>In My Business → <strong>Receipt printer</strong>, look at <strong>How this device prints</strong>. It is a setting of <strong>each device</strong>.</li>
<li><strong>Browser / AirPrint / system printer</strong> works with any installed printer (network, USB, AirPrint): you pick it in the print dialog and it is remembered. It is what works on iPhone, iPad and Firefox.</li>
<li><strong>Bluetooth</strong> only exists in Chrome and Edge (Android or computer). Tap <strong>Connect printer</strong>, choose yours and check it is on and nearby. If it fails, the app opens the browser print and tells you.</li>
<li>Check the <strong>paper width</strong> (80 mm or 58 mm).</li>
</ol>
<p><strong>Kitchen or bar tickets don't come out</strong>: in My Business → <strong>Kitchen and floor tickets</strong>, <strong>Print</strong> must be selected (with <strong>Show on screen</strong> nothing prints), the printer profile's checkbox ticked and the right content chosen (food, drinks or whole order). Try <strong>Test ticket</strong> before service.</p>
<p><strong>The cash drawer won't open</strong></p>
<ul>
<li>The drawer plugs into the printer (RJ11 cable), not into the computer. If the printer doesn't print, the drawer won't open either.</li>
<li>The app's automatic opening only works with a <strong>Bluetooth</strong> printer and the <strong>Open the drawer automatically on every charge</strong> box ticked. Try <strong>Test opening</strong>.</li>
<li>On iPad, iPhone or when printing through the browser, turn on "open cash drawer when printing" in the system printer's properties.</li>
</ul>

<h4>Booking website, online orders and QR</h4>
<p><strong>The link or QR doesn't load, or My Business says "Set up the cloud" / "Activate your license"</strong>: the online reservations card only switches on with a redeemed licence and a connected cloud. If it never loaded, check that <strong>reservas.gastrogoan.com</strong> is among your Firebase's authorised domains.</p>
<p><strong>Customers can't order</strong></p>
<ul>
<li>My Business warns on the reservations card: "No menu is active right now". Menus switch on by themselves according to the schedule you set in Offering; check one is active at that hour.</li>
<li>Check the <strong>Service types</strong> (if you turn Delivery off, it is not offered) and the <strong>Opening hours</strong>.</li>
<li>The <strong>minimum lead time</strong>, <strong>stop accepting orders before closing</strong> and <strong>minimum order</strong> can block it.</li>
</ul>
<p><strong>They can't book, or it says there is no table</strong>: every table needs its <strong>seats</strong> (they show in red in My Business → Operations when missing). Without seats the website cannot offer that table and those bookings don't confirm themselves. Also check capacity per slot and opening hours.</p>
<p><strong>Card payment doesn't appear or says "Pending"</strong>: in My Business → <strong>Online card payment (Stripe)</strong> look at the status. If it says "Connected, but Stripe does not allow payments yet", tap <strong>Finish signing up on Stripe</strong>; if Stripe is reviewing your details, wait a few minutes and tap <strong>Check again</strong>.</p>
<p><strong>A table's QR doesn't work</strong>: in My Business → <strong>Self-order QR</strong> the QR menu must be turned on. If you changed it, remember <strong>Change QR</strong> cancels the QR printed on that table. If your custom-name link says "That name is already used by another business", try another.</p>

<h4>POS, offering and stock</h4>
<p><strong>A menu (or a dish) doesn't show in the POS</strong></p>
<ol>
<li>Tap the <strong>Menus</strong> button on the POS bar: it lists the menus and set menus active right now. If none is, the button turns red.</li>
<li>Menus switch on by themselves according to each one's <strong>schedule</strong> in Menu Offering (Beverage Offering in the Dining Room). Check the days and slots.</li>
<li>Inside the menu, check the dish is not <strong>sold out</strong> (also from the POS <strong>⋯</strong> menu → "Mark sold out") and that it has portions left if you use the limit.</li>
<li>If it is a Kitchen dish and you are in the Dining Room, or the other way round, look in the right area's menu.</li>
</ol>
<p><strong>Stock doesn't go down</strong></p>
<ul>
<li>Stock is deducted <strong>when you charge</strong>, not when you fire the dish.</li>
<li>The menu dish must be linked to a <strong>Costing recipe</strong> with its ingredients; a dish with no recipe moves no stock.</li>
<li>Each ingredient must exist in <strong>Stock</strong> (it is deducted with the waste you set on the recipe). Base preparations deduct from their own stock.</li>
<li>If what does not go down is a dish's portions, check the limit in Offering.</li>
</ul>
<p><strong>A dish shows on the menu with the old price</strong>: changing the price in Costing does not always change the menu. Update it in Menu Offering, or apply the suggestion from the price-increase window.</p>

<h4>The numbers don't add up</h4>
<ul>
<li><strong>Costing shows €0</strong>: purchase prices are missing in the Master List (the catalogue is there, but at zero price) or the pack size/unit is wrong. Check "to review" in the Master List.</li>
<li><strong>Food cost looks different from expected</strong>: the purchase price is <strong>excluding VAT</strong>; the menu price includes VAT and the app removes it to work out food cost. You are only comparing like with like if both exclude VAT.</li>
<li><strong>VAT on receipts</strong> comes from the general rate in My Business → <strong>Receipt settings</strong>. Check it if you sell at other rates.</li>
<li><strong>The Income Statement doesn't look like your accountant's</strong>: first check the <strong>legal form and tax regime</strong> in My Business (a red notice shows if it is missing) and your fixed costs. Tax is calculated per year, not month by month, and a month can show negative tax. For self-employed and CB the "owner's salary" is not an expense.</li>
<li><strong>A voided sale</strong> still counts in its own month; the credit note subtracts in the month it is voided, so a quarter already filed is never touched.</li>
<li><strong>Platform orders</strong>: the commission is deducted using the percentage you set in My Business → Delivery platforms.</li>
</ul>
<div class="manual-warning"><i class="ti ti-alert-triangle"></i>GastroGoan organises your data, but it is not an accounting firm: your accountant files the returns.</div>

<h4>Backups, deletions and data</h4>
<p><strong>How do I make a backup?</strong> My Business → <strong>Data maintenance</strong> → <strong>Download backup</strong>. A file with all the business's data is saved; keep it off the device. The app reminds you after 30 days.</p>
<p><strong>How do I recover it?</strong> <strong>Restore backup</strong> and choose the file. Careful: it replaces all the data on this device and asks you to type the business name to confirm.</p>
<p><strong>I deleted something by mistake</strong>: My Business → Data maintenance → <strong>Recycle bin</strong>. It keeps what you deleted for 30 days (employees, customers, recipes, ingredients, preparations, reservations and orders) and you recover it with <strong>Restore</strong>. Relationships already cleaned up, such as an employee's shifts, must be redone.</p>
<p><strong>Why can't I delete this record?</strong></p>
<ul>
<li><strong>Sales</strong>: they are not deleted, they are <strong>voided</strong> (and you cannot void one if its month is already closed in Financial Management; reopen it in Cash Flow first).</li>
<li><strong>Received supplier orders</strong>: not deleted; there is only <strong>Undo receipt</strong>.</li>
<li><strong>Issued gift vouchers</strong>: voided, not deleted, and only if they have no redemptions.</li>
<li><strong>A table or zone with an open order</strong>: charge or empty it in the POS first.</li>
<li><strong>Employee</strong>: when deleted, their clock-ins are kept (a 4-year legal requirement).</li>
<li><strong>A business with branches</strong>: remove the branches first.</li>
<li>If the button is not there, look in the row's <strong>⋯</strong> menu: edit and delete live there, and only people who can do it see them.</li>
</ul>
<p><strong>The app is slow or heavy</strong>: in Data maintenance use <strong>Archive and download</strong> to move out sales, reservations, closures and received orders older than a year (a file with everything is downloaded first).</p>

<h4>Language, version and other</h4>
<p><strong>How do I change the language?</strong> With the <strong>ES / CA / EN</strong> selector in the header (or on the sign-in screen). It is a per-device setting. The data you typed (dish names, ingredients...) is not translated.</p>
<p><strong>I see an old version or something I was told about is missing</strong>: tap <strong>Refresh</strong> in the header; if there is a new version it offers it (<strong>Update now</strong>). Close and reopen the app if it does not show.</p>
<p><strong>The app asks me to activate the business again</strong>: sign in with your owner account; your businesses appear on their own in the selector without redeeming their codes again.</p>
<p><strong>Browser notifications don't arrive</strong>: turn them on in My Business → Data maintenance → <strong>Enable notifications</strong>. They only work with the browser open.</p>
<p><strong>I can't find who changed something</strong>: My Business → Data maintenance → <strong>Activity log</strong>, with a filter by employee. It only records what employees do, not what you do as owner.</p>`}
  },
];

/* ============================================================
   Cómo se pinta el Manual (1/11, diseño nuevo)
   · un solo índice, agrupado por áreas (Empezar · Cocina · Sala · Gestión · Ayuda), que en móvil se
     pliega en un botón con el capítulo actual (25 capítulos en fila ocuparían tres pantallas);
   · el capítulo se lee en una columna de ancho cómodo, con «En este capítulo» (saltos a cada apartado);
   · el buscador filtra los capítulos y marca lo encontrado dentro del texto;
   · abajo, «anterior / siguiente» e imprimir.
   ============================================================ */
let manualChapter = 0;
let manualSearch = '';
let manualIndiceAbierto = null;   // null = según el ancho de pantalla

const MANUAL_AREAS = [
  {key:'empezar', icon:'ti-rocket',           label:{es:'Empezar', ca:'Començar', en:'Start'}},
  {key:'cocina',  icon:'ti-tools-kitchen-2',  label:{es:'Cocina', ca:'Cuina', en:'Kitchen'}},
  {key:'sala',    icon:'ti-armchair',         label:{es:'Sala', ca:'Sala', en:'Floor'}},
  {key:'gestion', icon:'ti-layout-dashboard', label:{es:'Gestión', ca:'Gestió', en:'Management'}},
  {key:'ayuda',   icon:'ti-lifebuoy',         label:{es:'Ayuda', ca:'Ajuda', en:'Help'}},
];
function manualAreaLabel(key){ const a = MANUAL_AREAS.find(x => x.key === key); return a ? gl(a.label) : ''; }

// El título/contenido de cada capítulo es un {es,ca,en}; el valor de cada idioma puede ser el HTML o una
// función. Si el idioma actual no existe, se cae a español.
function manualChapterTitle(ch){
  const lang = getLang();
  const raw = ch.title[lang] !== undefined ? ch.title[lang] : ch.title.es;
  return typeof raw === 'function' ? raw() : raw;
}
function manualChapterText(ch){
  const lang = getLang();
  const raw = ch.content[lang] !== undefined ? ch.content[lang] : ch.content.es;
  return typeof raw === 'function' ? raw() : raw;
}
function manualChapterPlainTitle(ch){ return manualChapterTitle(ch).replace(/<[^>]+>/g, '').trim(); }
// Busca en el título y en el texto (sin etiquetas HTML) de cada capítulo.
function manualChapterMatches(ch, q){
  if(!q) return true;
  const sin = s => pmSinTildes(String(s).toLowerCase());
  if(sin(manualChapterPlainTitle(ch)).includes(q)) return true;
  return sin(manualChapterText(ch).replace(/<[^>]+>/g, ' ')).includes(q);
}
function manualMatches(){
  const q = pmSinTildes(manualSearch.trim().toLowerCase());
  return MANUAL_CHAPTERS.map((ch, i) => ({ch, i})).filter(({ch}) => manualChapterMatches(ch, q));
}
function setManualSearch(val){
  manualSearch = val;
  const m = manualMatches();
  if(m.length && !m.some(x => x.i === manualChapter)) manualChapter = m[0].i;
  if(val.trim()) manualIndiceAbierto = true;
  renderManual();
  const el = document.getElementById('manual-search-input');
  if(el){ el.focus(); try{ el.setSelectionRange(val.length, val.length); }catch(e){} }
}

function manualIndiceVisible(){ return manualIndiceAbierto === null ? window.innerWidth >= 900 : manualIndiceAbierto; }
function toggleManualIndice(){ manualIndiceAbierto = !manualIndiceVisible(); renderManual(); }

// Marca lo buscado dentro del texto del capítulo (solo en nodos de texto; nunca rompe el HTML).
function manualResaltar(raiz, q){
  if(!q || q.length < 2) return;
  const sin = s => pmSinTildes(s.toLowerCase());
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  const nodos = [];
  while(walker.nextNode()) nodos.push(walker.currentNode);
  nodos.forEach(n => {
    const txt = n.nodeValue;
    const plano = sin(txt);
    // pmSinTildes conserva la longitud (cada letra con tilde → una letra), así que los índices valen sobre el original.
    if(plano.length !== txt.length || !plano.includes(q)) return;
    const frag = document.createDocumentFragment();
    let desde = 0, i;
    while((i = plano.indexOf(q, desde)) !== -1){
      if(i > desde) frag.appendChild(document.createTextNode(txt.slice(desde, i)));
      const mk = document.createElement('mark'); mk.className = 'mnl-hl'; mk.textContent = txt.slice(i, i + q.length); frag.appendChild(mk);
      desde = i + q.length;
    }
    if(desde < txt.length) frag.appendChild(document.createTextNode(txt.slice(desde)));
    n.parentNode.replaceChild(frag, n);
  });
}

function renderManual(){
  const cont = document.getElementById('manual-detail');
  const indice = document.getElementById('manual-indice');
  if(!cont || !indice) return;
  const q = pmSinTildes(manualSearch.trim().toLowerCase());
  const matches = manualMatches();
  if(manualChapter >= MANUAL_CHAPTERS.length) manualChapter = 0;
  indice.setAttribute('aria-label', gl({es:'Capítulos del manual', ca:'Capítols del manual', en:'Manual chapters'}));

  // ── índice agrupado por áreas ──
  const actual = MANUAL_CHAPTERS[manualChapter];
  const abierto = manualIndiceVisible();
  const grupos = MANUAL_AREAS.map(a => {
    const del = matches.filter(m => m.ch.area === a.key);
    if(!del.length) return '';
    return `<div class="mnl-grupo"><span class="mnl-grupo-et"><i class="ti ${a.icon}"></i> ${escapeHtml(gl(a.label))}</span>
      <div class="mnl-chips">${del.map(({ch, i}) => `<button type="button" class="mnl-chip${i === manualChapter ? ' activo' : ''}" aria-current="${i === manualChapter}" onclick="goManualChapter(${i})">${escapeHtml(manualChapterPlainTitle(ch))}</button>`).join('')}</div></div>`;
  }).join('');
  indice.innerHTML = `
    <button type="button" class="mnl-toggle" aria-expanded="${abierto}" onclick="toggleManualIndice()">
      <span class="mnl-toggle-izq"><i class="ti ti-list-details"></i> ${escapeHtml(gl({es:'Capítulo', ca:'Capítol', en:'Chapter'}))}: <b>${escapeHtml(manualChapterPlainTitle(actual))}</b></span>
      <i class="ti ti-chevron-${abierto ? 'up' : 'down'}"></i></button>
    <div class="mnl-grupos${abierto ? '' : ' cerrado'}">${grupos || `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`}</div>`;

  // ── capítulo ──
  if(!matches.length){
    cont.innerHTML = `<div class="empty es-vacio"><i class="ti ti-search-off"></i>${escapeHtml(t('common.noResults'))}</div>`;
    document.getElementById('manual-pie').innerHTML = '';
    return;
  }
  cont.innerHTML = `
    <header class="mnl-cab"><span class="mnl-cab-area">${escapeHtml(manualAreaLabel(actual.area))}</span><h2 class="mnl-cab-tit">${manualChapterTitle(actual)}</h2></header>
    <div class="mnl-cuerpo">${manualChapterText(actual)}</div>`;
  const cuerpo = cont.querySelector('.mnl-cuerpo');
  // «En este capítulo»: un salto a cada apartado (h4), cuando hay varios.
  const hs = [...cuerpo.querySelectorAll('h4')];
  if(hs.length >= 3){
    hs.forEach((h, k) => { h.id = 'mnl-h-' + k; });
    const toc = document.createElement('nav');
    toc.className = 'mnl-toc';
    toc.setAttribute('aria-label', gl({es:'En este capítulo', ca:'En aquest capítol', en:'In this chapter'}));
    toc.innerHTML = `<span class="mnl-toc-et">${escapeHtml(gl({es:'En este capítulo', ca:'En aquest capítol', en:'In this chapter'}))}</span>` +
      hs.map((h, k) => `<button type="button" class="mnl-toc-it" onclick="manualIrA(${k})">${escapeHtml(h.textContent.trim())}</button>`).join('');
    const h3 = cuerpo.querySelector('h3');
    if(h3 && h3.parentNode === cuerpo) h3.after(toc); else cuerpo.prepend(toc);
  }
  manualResaltar(cuerpo, q);

  // ── pie: anterior / siguiente / imprimir ──
  const pos = matches.findIndex(m => m.i === manualChapter);
  const ant = pos > 0 ? matches[pos - 1] : null, sig = pos < matches.length - 1 ? matches[pos + 1] : null;
  document.getElementById('manual-pie').innerHTML = `
    <div class="mnl-pie">
      ${ant ? `<button type="button" class="btn btn-fino mnl-nav" onclick="goManualChapter(${ant.i})"><i class="ti ti-arrow-left"></i><span><small>${escapeHtml(gl({es:'Anterior', ca:'Anterior', en:'Previous'}))}</small>${escapeHtml(manualChapterPlainTitle(ant.ch))}</span></button>` : '<span></span>'}
      <button type="button" class="btn btn-fino mnl-imprimir" onclick="printManualChapter()"><i class="ti ti-printer"></i> ${escapeHtml(t('btn.printChapter'))}</button>
      ${sig ? `<button type="button" class="btn btn-fino mnl-nav mnl-sig" onclick="goManualChapter(${sig.i})"><span><small>${escapeHtml(gl({es:'Siguiente', ca:'Següent', en:'Next'}))}</small>${escapeHtml(manualChapterPlainTitle(sig.ch))}</span><i class="ti ti-arrow-right"></i></button>` : '<span></span>'}
    </div>`;
}
function manualIrA(k){
  const h = document.getElementById('mnl-h-' + k);
  if(h) h.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
}
function goManualChapter(i){
  manualChapter = i;
  if(window.innerWidth < 900) manualIndiceAbierto = false;
  renderManual();
  const cab = document.querySelector('#manual-detail .mnl-cab');
  if(cab) cab.scrollIntoView({block:'start'});
}
// Abrir el manual en un capítulo concreto (id), p. ej. desde un enlace de ayuda.
function openManualAt(id){
  const i = MANUAL_CHAPTERS.findIndex(c => c.id === id);
  if(i >= 0) manualChapter = i;
  manualSearch = '';
  navigate('manual');
}
function printManualChapter(){
  const ch = MANUAL_CHAPTERS[manualChapter];
  const title = manualChapterPlainTitle(ch);
  const body = printReportHeaderHtml(title) + manualChapterText(ch);
  printReportWindow(title, body, {winSize:'width=800,height=1000'});
}
