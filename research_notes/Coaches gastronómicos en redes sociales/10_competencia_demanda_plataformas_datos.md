# Competencia, demanda y plataformas: datos medidos (captura 19/11/2026, España)

Alcance real de esta ronda: 3 ejecuciones de Apify en total (2 de Google Trends con éxito; 1 de scraping de perfiles de Instagram **denegada por el usuario, no se reintentó ni se esquivó por otra vía**) más 6 búsquedas web (Google vía apify/web-search). No se ejecutó ningún actor de YouTube, TikTok ni Facebook. Por tanto la tabla de cuentas (seguidores, cadencia, vistas, top-3 posts) NO se obtuvo y queda como hueco. Lo medido de primera mano es la demanda en Google Trends.

## 1. Presencia en redes de marcas de software y medios/asociaciones

### Takeaway
No hay ni un solo recuento de seguidores, cadencia, vistas medias ni top-3 posts verificado para ninguna marca ni medio de la lista. Solo se confirma que existen cuentas de Qamarero en Instagram (@qamareroapp) y de Last.app en YouTube, y que su contenido visible es tutorial de producto/corporativo.

### Cited Findings
- Qamarero publica en Instagram (@qamareroapp) reels tutoriales de producto ("optimiza la rentabilidad de tu carta", "edita y añade productos") con hashtags genéricos (#GestiónDeCarta #software #hosteleria) — [Reel 1](https://www.instagram.com/reel/C3NpDaZM_M4/), [Reel 2](https://www.instagram.com/reel/C3H2SAmo1JG/) (sin cifras de vistas/likes en el snippet).
- Last.app tiene canal de YouTube con vídeos de producto ("Software para Restaurante Last.app - Integraciones") — [YouTube](https://www.youtube.com/watch?v=2Abxily6aio).
- Last.app: startup española con 8 M€ captados en distintas rondas y facturación duplicada en 2023 según RRHH Digital (cifra de prensa, no auditada); integra 150+ programas — [RRHH Digital](https://www.rrhhdigital.com/secciones/actualidad/737257/buenas-noticias-para-last-app-duplica-su-facturacion-en-2023-y-continua-su-expansion-internacional/), [Profesional Horeca](https://www.profesionalhoreca.com/last-app-ya-integra-mas-de-150-programas-de-gestion-en-su-sistema-operativo-para-restaurantes/).
- Comparativas de terceros de apps para restaurantes citan Last.app, Camarero10, Foodeo, Glop, Ágora, Miss Tipsi, Revo y SirTPV como el grupo competidor (feb 2025) — [The Last Bite](https://thelastbitemedia.com/mejores-apps-gestionar-restaurante/).
- Existen podcasts/vídeos de medios y asociaciones en YouTube: ABRECA (marketing para restaurantes y hoteles), Hostelería Madrid (podcast "Los secretos de emprendedores de restaurantes"), Fagor Professional ("Liderazgo culinario hotelero", 2 vistas el post visible), TALENT | HOSTELERÍA. Sin suscriptores ni vistas medias medidos — [ABRECA](https://music.youtube.com/podcast/xA77hTmRmJM), [Hostelería Madrid](https://music.youtube.com/podcast/pUbAgOzy_-E), [Fagor](https://music.youtube.com/podcast/l8x07kfZ8X0).

### Inferences
- El contenido social de las marcas de software que se puede ver es tutorial de funciones, con tono institucional; el hueco (hipótesis, no medido) es contenido de "número real explicado por una persona".
- La señal de 2 vistas del podcast de Fagor sugiere que los canales corporativos de formación pueden tener alcance muy bajo, pero es un solo dato anecdótico.

### Gaps
- Seguidores, cadencia, vistas/likes medias y top-3 de 12 meses de Last.app, Revo, Agora, Tspoonlab, Gstock, Camarero10, Qamarero, Zenchef, TheFork Manager, Alexia Rest, Haddock, SumUp/Square/Toast, Hostelería de España, Restauración News, Gastroeconomy, Metro, Hostelería Madrid/Barcelona, FACYRE: no obtenidos (la ejecución de Instagram fue denegada por el usuario; ningún actor de YouTube/TikTok/Facebook se lanzó). Recomendación: pedir permiso explícito para una ejecución pequeña de apify/instagram-profile-scraper (~0,003 USD/perfil, input `usernames`) con handles verificados a mano, o revisión manual de 10 min por marca. Los handles (salvo @qamareroapp) no están verificados.

## 2. Demanda: Google Trends España, últimos 12 meses (nov 2025 a nov 2026)

Fuente: actor apify/google-trends-scraper, geo=ES, rango por defecto (12 meses), capturado 19/11/2026. Los valores son índice relativo 0-100 **dentro de cada término por separado** (no comparables entre términos). Los términos sin datos devuelven vacío por bajo volumen, no por inexistencia.

### Takeaway
"Escandallo" es una búsqueda estable y de volumen apreciable todo el año (sin estacionalidad fuerte); "convenio hostelería" también, con picos en feb-mar; "food cost" cayó casi a cero desde julio (probablemente por cambio de término hacia "escandallo"/ruido); VeriFactu es una búsqueda masiva pero genérica (no hostelera) y dominada por noticias de aplazamiento. Las consultas largas de cola ("cómo calcular food cost", "comisión glovo", "abrir un restaurante", "software tpv restaurante", "turnos camareros", "verifactu hostelería") no tienen volumen suficiente para Trends.

### Cited Findings
- **escandallo**: serie con datos casi todas las semanas, rango típico 39-100. Picos: 100 (23-29 ago 2026), 94 (20-26 sep 2026), 93 (16-22 nov 2025), 91 (22-28 mar 2026), 86 (11-17 oct 2026). Mínimos: 39 (25-31 oct 2026) y dos semanas a 0 sin datos (21 dic 2025-3 ene 2026, y 2-8 ago 2026). Última semana parcial: 81. Consultas relacionadas top: "que es un escandallo" (100), "escandallo de costes" (99), "escandallo significado" (62), "escandallo cocina" (56), "escandallo de precios" (21). Sin consultas en alza — [Google Trends vía Apify run yl7wiPZK58dY9Sjly](https://api.apify.com/v2/datasets/nssAtvEqvaxXKV7pc/items)
- **food cost**: pico 100 en 30 nov-6 dic 2025, 73 a finales de ene 2026, ~50-60 en feb-mar, y descenso a 3-11 desde julio 2026; 0-2 en oct-nov 2026. Única relacionada: "rizopacho food cost" (marca/persona, 100) — mismo dataset.
- **convenio hostelería**: siempre alto (47-100). Máximo 100 (22-28 feb 2026), 95 (1-7 mar), 93 (25-31 ene y 22-28 mar 2026); mínimo 47 (8-14 nov 2026). Consultas en alza: "convenio hostelería catalunya 2026" (Breakout), "...baleares 2026" (+4.250 %), "...madrid 2026" (+1.650 %) — mismo dataset.
- **verifactu** (genérico): consultas top "aeat verifactu", "que es verifactu", "verifactu cuando entra en vigor", "verifactu 2027", "verifactu 2028", "verifactu gratis", "holded verifactu", "verifactu autonomos"; en alza (Breakout): "verifactu 2028", "verifactu hacienda retrasa", "verifactu aplazado", "verifactu octubre 2028", "verifactu se aplaza" — [Run Cmd4BQUuhun2Juni7](https://api.apify.com/v2/datasets/iDgS53Pc2qzfqo4It/items)
- **verifactu hostelería**: solo una semana con dato (23-29 nov 2025 = 100) y 0 el resto: volumen demasiado bajo; la demanda de VeriFactu es genérica (autónomos/empresas), no segmentada por hostelería.
- Sin datos suficientes para Trends: "software tpv restaurante", "cómo calcular food cost", "comisión glovo", "abrir un restaurante", "turnos camareros" (series o relacionadas vacías).
- Búsquedas por la noticia: el aplazamiento de VeriFactu a 2028 domina las consultas en alza (coincide con la nota de la ronda anterior; fecha no formalizada).

### Inferences
- "Escandallo" es el término hostelero de gestión con demanda sostenida y de intención informativa ("qué es", "significado"): perfil de contenido educativo de entrada, ya servido por guías SEO (Qamarero, nota 06).
- Estacionalidad: escandallo sin ciclo claro (picos en nov, ene, mar, ago-sep: inicios de proyecto/temporada); convenio con pico invierno-primavera ligado a negociaciones. No se midió "abrir un restaurante" (sin datos), así que no se puede afirmar estacionalidad de apertura.
- Al ser Trends relativo, no se pueden comparar volúmenes absolutos entre escandallo, convenio y VeriFactu sin una segunda ejecución con comparativa.

### Gaps
- Volúmenes absolutos de búsqueda (Trends es relativo); no se usó Google Autocomplete (no se lanzó actor).
- Preguntas frecuentes reales de hosteleros en grupos, hashtags y comentarios: no recopiladas (no se ejecutó scraping de comentarios).
- Datos de "abrir un restaurante" en bruto: la serie existe en el dataset (id iDgS53Pc2qzfqo4It) pero no se leyó; las relacionadas vienen vacías.

## 3. Plataformas y creadores-hosteleros

### Takeaway
Los hosteleros de a pie están en Facebook (grupos) y los creadores del sector con más alcance son camareros/hosteleros en TikTok e Instagram que hablan de condiciones laborales y del día a día; el contenido viral gira en torno a conflictos (clientes que se van sin pagar, influencers que piden comida gratis, derechos laborales), no en gestión.

### Cited Findings
- Grupos públicos de Facebook de hostelería españoles (sin nº de miembros verificado): "Todo hostelería (España)", "HOSTELERIA UNIDA", "Hosteleria", "Club HAT (Hosteleros Amantes del Turismo)", "COSAS DE CAMAREROS (y hostelería)", "Bares y Restaurantes de España", "COMUNIDAD ESPAÑOLA DE HOSTELERIA"; página "Hosteleros España" (traspasos, alquileres, consultoría) — [búsqueda Google 19/11/2026](https://www.facebook.com/groups/hosteleriaespana/), [Hosteleros España](https://www.facebook.com/hostelerosespana/), [Club HAT](https://www.facebook.com/groups/clubhat/), [Cosas de camareros](https://www.facebook.com/groups/cosasdecamareros/).
- Creadores camarero/hostelero con audiencia: Abraham Galera (@abrigaca; bio: "doy voz a lo que piensan y callan los camareros", +887K en TikTok según su bio de Instagram) — [Instagram](https://www.instagram.com/abrigaca/?hl=es); "Soy Camarero" (Jesús Soriano), citado por El País con más de un millón de seguidores en redes, voz contra malas prácticas laborales — [El País, 26/10/2025](https://elpais.com/gastronomia/2025-10-26/de-camarero-a-atender-un-millon-de-seguidores-en-las-redes-a-veces-mis-companeros-me-piden-que-llame-a-la-inspeccion-de-trabajo-no-me-duele-que-se-queden-sin-un-empleo-precario.html); Francis Corral (dueño de La Montera y Tabanco Compañía, Jerez): +60.000 seguidores en TikTok y 1,3 M de me gusta, viral por impotencia ante clientes que se van sin pagar — [La Voz del Sur, 5/5/2026](https://www.lavozdelsur.es/entrevistas/podcast-lavozdelsures/reservado/francis-corral-hostelero-jerezano-viral-en-redes-he-llorado-impotencia-cuando-se-han-ido-sin-pagar_357267_102.html); Saulo Velázquez (camarero en Málaga, día a día en TikTok, sin cifra) — [TikTok](https://www.tiktok.com/@saulovelasquezoficial/video/7521401937992912150?lang=es).
- Hostelero de Guadalix de la Sierra viral en TikTok (2022) por reclamar descanso para sus empleados, y hostelero salmantino viral por denunciar influencers que pedían 400 € — [Antena 3, 31/10/2022](https://www.antena3.com/programas/espejo-publico/noticias/hostelero-viral-tik-tok-reclamar-descanso-sus-empleados-que-dicho-clamor-toda-hosteleria_20221031635fc37747a3840001ec54a4.html), [El Debate en Facebook](https://www.facebook.com/eldebatecom/posts/un-hostelero-salmantino-se-hace-viral-por-denunciar-a-las-influencers-400-euros-/1176883771535072/).
- Abraham Galera aconseja públicamente "no abras un bar" a quien sueñe con ello (entrevista, oct 2025) — [El Nacional](https://www.elnacional.cat/enblau/es/television/abraham-galera-camarero-un-consejo-daria-alguien-quiere-abrir-bar-es-no-abra_1497121_102.html).
- Datos generales de uso de redes en España (no hostelería): Instagram (54,3 %) y TikTok (29,8 %) fueron las que más crecieron en el último año según CNMC (mayo 2025) — [CNMC](https://www.cnmc.es/prensa/panel-usos-internet-servicios-ott-20250530). Las recomendaciones de agencias para restaurantes son Instagram y Facebook, TikTok y Google Business Profile (consumidor final, no hostelero) — [Línea Creativa, jul 2026](https://wearelineacreativa.es/blog/mejores-redes-sociales-restaurantes).

### Inferences
- Candidatos a colaborador: Francis Corral (hostelero dueño, audiencia mediana, tono de dueño a dueño) y creadores-camarero como Galera; este último tiene tono laboral y de crítica, que puede chocar o encajar según el mensaje (hipótesis).
- Lo que se hace viral en este nicho es conflicto emocional y laboral; contenido de números de gestión no aparece entre los virales hallados (ausencia de evidencia, no evidencia de ausencia).
- La cifra de "+887K" de Galera procede de su propia bio y el "+1 M" de Soy Camarero de prensa: ambas sin verificar con el perfil en el momento de la captura.

### Gaps
- Suscriptores y vistas de canales de YouTube de formación hostelera: no medidos (ningún actor de YouTube lanzado).
- Miembros y actividad de los grupos de Facebook: no visibles en los snippets.
- Qué plataformas usan realmente los dueños de bares/restaurantes para consumir contenido de negocio: ningún estudio sectorial encontrado; solo recomendaciones de agencias orientadas al cliente final.
- Vistas medias y qué formato exacto hace viral a cada creador: no medido.
