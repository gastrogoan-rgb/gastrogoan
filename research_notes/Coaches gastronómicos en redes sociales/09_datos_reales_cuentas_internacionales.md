# Datos reales de cuentas internacionales (restaurantes en inglés y otros sectores) — medición con scrapers públicos

**Fecha de captura: 19 de noviembre de 2026.** Método: scrapers de Apify sobre cuentas públicas (sin login), 10 ejecuciones. Cada cifra procede de un dataset de Apify (ID indicado) y las URL son de los propios posts. Medias y medianas las calculé yo a mano sobre la muestra devuelta (10 posts o menos por cuenta: no son 12 meses completos). Ratio vistas/seguidores = mediana de vistas de la muestra / seguidores.

Datasets usados: IG perfiles `AbXxjiyaChIagJaVW`; IG reels grupo A `UNh8XHLy525IApmqp` y `lJQ7B1mAWofy3vqBr`; IG reels grupo B `Awxyg2XMUfZALvZ7j`; TikTok A `oTUNjsTiK85E1vpXR`; TikTok B `jcBlfyEOeKidrwtaW`; YouTube `0YdJNd3Vbk6a5OQkJ`.

**Advertencias de calidad del dato (léanse antes de usar cifras):**
- El scraper de reels de Instagram devuelve también reels de terceros en los que la cuenta está etiquetada o es coautora (p. ej. `yahoofinance`, `lemar.m`, `ember_mt`). Los excluí de las medias; solo cuento posts cuyo `ownerUsername` es la cuenta.
- Los posts de las últimas 24 h (19/11) tienen vistas incompletas: p. ej. Vilma tiene reels con 3-4 vistas y Codie uno con 2. Los incluí en las listas pero marco el sesgo a la baja.
- "Seguidores" de TikTok dio valores absurdos en varios casos (`toasttab` 2, `davidscottpeters` 126, `codiesanchez` 14, `vilmanunez` 0): son cuentas equivocadas (mi suposición de handle) o fallo del scraper. No los uso.
- No pude obtener los "3 posts más vistos de los últimos 12 meses". Con 8-10 posts por cuenta solo hay "los más vistos de la muestra reciente". Ordenar por popularidad en IG no es posible con el actor de reels; en YouTube/TikTok el orden "popular" mezcla años.
- Los likes de Vilma Núñez y Restaurant365 en Instagram vienen ocultos (valor -1) y un like de Josh Kopel también.

## 0. Tabla verificable de cuentas (seguidores, medias, ratio)

### Takeaway
El nicho de restaurantes B2B (consultores y software) mueve audiencias pequeñas y vistas por reel muy bajas (centenas a pocos miles), con ratios mediana/seguidores del 2-13 %; el contenido de restaurantes que sí escala viene de personalidades de TV, chefs con historia personal y humor de camarero (cientos de miles de vistas). En otros sectores, Hormozi y Codie Sanchez combinan millones de seguidores con picos de 300.000-780.000 vistas por reel, pero la mediana es 1-4 % de los seguidores.

### Cited Findings
**Instagram — perfiles (scrape 19/11/2026, dataset AbXxjiyaChIagJaVW)**
- Josh Kopel (@joshkopel), "AI Marketing + Restaurant Coach": 10.942 seguidores, 269 posts; bio "2,500+ Students", enlace a restaurantbusinessschool.com — [IG](https://www.instagram.com/joshkopel)
- David Scott Peters (@davidscottpeters), "Restaurant Coach | Restaurant Expert": 5.698 seguidores, 2.237 posts; bio "My Restaurant Prosperity Formula gives restaurants the power to drive down their food & labor costs 23% on average. Schedule a call", enlace a "systems-check-call" — [IG](https://www.instagram.com/davidscottpeters)
- Brandon Dearden (@chefauthorized, "CEO of ChefTok"): 114.167 seguidores, verificado; bio de restaurador en Hamilton, Montana — [IG](https://www.instagram.com/chefauthorized)
- Jon Taffer (@jontaffer): 511.558 seguidores, verificado — [IG](https://www.instagram.com/jontaffer)
- Toast (@toasttab): 65.238 seguidores — [IG](https://www.instagram.com/toasttab); MarginEdge: 23.500; 7shifts: 17.745; Restaurant365: 5.487 (mismo dataset; URLs `instagram.com/<handle>`)
- Alex Hormozi (@hormozi): 5.256.011; Leila Hormozi: 1.641.706; Codie Sanchez: 3.447.760; Iman Gadzhi: 3.386.398 (109 posts); Vilma Núñez (@vilmanunez): 1.265.590 (8.722 posts) (mismo dataset)

**Instagram — reels propios, muestra de 7-10 reels recientes (datasets UNh8…, lJQ7…, Awxy…)**

| Cuenta | Seguidores | Reels en muestra | Vistas media | Vistas mediana | Mediana/seguidores | Nota |
|---|---|---|---|---|---|---|
| @davidscottpeters | 5.698 | 10 (4-18 nov) | ~308 | ~284 | ~5,0 % | Likes medios 3,6; comentarios medios 0,5 |
| @joshkopel | 10.942 | 4 propios (jun 2024-jun 2025) | ~1.222 | ~1.209 | ~11 % | El scraper no devolvió reels propios recientes: solo 4 propios, el más nuevo de junio 2025; el resto son etiquetados en pódcast de terceros. Puede estar inactivo en reels o el actor no los listó |
| @chefauthorized | 114.167 | 7 (3-17 nov) | ~25.444 | ~10.914 | ~9,6 % | Pico 121.057 |
| @jontaffer | 511.558 | 8 (2 oct-11 nov) | ~93.221 | ~29.297 | ~5,7 % | Pico 550.777 |
| @toasttab | 65.238 | 7 (5-19 nov) | ~7.568 | ~3.567 | ~5,5 % | Pico 27.350 |
| @7shifts | 17.745 | 8 (30 oct-19 nov) | ~3.922 | ~2.071 | ~11,7 % | Pico 19.100 |
| @marginedge | 23.500 | 10 (9 sep-18 nov) | ~595 | ~553 | ~2,4 % | Max 858 |
| @restaurant365 | 5.487 | 10 (2 jul-22 oct) | ~1.396 | ~737 | ~13,4 % | Pico 5.498; likes ocultos |
| @hormozi | 5.256.011 | 10 (17-19 nov) | ~243.286 | ~58.486 | ~1,1 % | Pico 777.783; 4 clips sin caption |
| @leilahormozi | 1.641.706 | 10 (14-19 nov) | ~152.573 | ~1.437 | ~0,09 % | Media dominada por un reel de 1.508.891; el resto 200-7.400 |
| @codiesanchez | 3.447.760 | 10 (16-19 nov) | ~130.975 | ~123.356 | ~3,6 % | Pico 339.574 |
| @vilmanunez | 1.265.590 | 10 (18-19 nov) | ~24.840 | ~6.680 | ~0,5 % | Hay 3 reels con 3-4 vistas (publicados hace horas o promocionados): sesgo a la baja |

**TikTok (datasets oTUNj…, jcBlf…)**
- Jon Taffer: 1,5 M fans; últimos 6 posts (12 nov-15 oct): 1.284 / 5.636 / 17.900 / 27.800 / 18.100 / 20.400 vistas; los dos más virales del scrape son de 2021-22 (42,1 M y 9,2 M), fuera de los 12 meses — [TikTok](https://www.tiktok.com/@jontaffer)
- Brandon Dearden (@chefauthorized): 526.400 fans; 8 vídeos (1 ago-1 nov 2026): media ~19.909, mediana ~12.650, ratio mediana/fans ~2,4 % — [TikTok](https://www.tiktok.com/@chefauthorized)
- Iman Gadzhi: 565.200 fans; 8 vídeos (10-19 nov): media ~95.988, mediana ~21.950, ratio ~3,9 %; pico 454.400 — [TikTok](https://www.tiktok.com/@imangadzhi)
- Leila Hormozi: 407.100 fans; 8 vídeos mezclados (feb-nov 2026): media ~152.086, mediana ~2.494; pico 965.300 — [TikTok](https://www.tiktok.com/@leilahormozi)
- Josh Kopel: 170 fans en TikTok (consistente con una cuenta abandonada), vídeos de junio 2025 con 198-268 vistas (los mismos que sus reels de IG: reutiliza el contenido) — [TikTok](https://www.tiktok.com/@joshkopel)
- Vilma Núñez en TikTok: 8 vídeos; los 5 de 18-19 nov tienen 623-1.434 vistas; hay tres antiguos de 517.700 (mar 2025), 568.700 (jun 2024), 754.600 (may 2024) — [TikTok](https://www.tiktok.com/@vilmanunez); seguidores no obtenidos (scraper devolvió 0)

**YouTube (dataset 0YdJNd3Vbk6a5OQkJ; 8 vídeos más recientes por canal)**
- David Scott Peters: 19.700 suscriptores; vídeos de entre 6:53 y 58:07 con 81-418 vistas (media ~245, ratio ~1,2 %); el "Menu Engineering That Actually Moves Restaurant Profit" (42:22) tiene 331 — [canal](https://www.youtube.com/@DavidScottPeters)
- Alex Hormozi: 4,65 M suscriptores; vídeos recientes 186.000-2,1 M vistas (mayor: "How To Make More Money Than You Deserve (My 2027 Framework)", 17:37, 2,1 M, hace 11 días) — [vídeo](https://www.youtube.com/watch?v=pwZJcLZc3_Y)
- Codie Sanchez: 2,28 M suscriptores; 60.000-737.000 vistas (mayor: "I Tried The 'Easiest' Ways To Make Money With AI", 35:20, 737.000) — [vídeo](https://www.youtube.com/watch?v=yO5O_ngyA_8)
- Vilma Núñez ("Vilma OS"): 362.000 suscriptores; 2.900-48.000 vistas (mayor: "Digital Businesses in 2027: Trends You Need to Know", 38:43, 48.000) — [vídeo](https://www.youtube.com/watch?v=cP6zyhK2bJA)
- Jon Taffer: el scraper dio 9.610 suscriptores y vídeos de 363-1.000 vistas: cifra inconsistente con su fama (tiene 1,5 M en TikTok); puede ser un canal secundario/de pódcast. Dato dudoso.

### Inferences
- Para un coach de restaurantes en nicho B2B, un reel "bueno" son 300-3.000 vistas con 5.000-20.000 seguidores; no hay evidencia aquí de cifras de decenas de miles salvo en personalidades (Taffer, Dearden) o marcas con humor (Toast).
- La mediana mucho menor que la media en Hormozi, Codie y Leila indica que una sola pieza explota y el resto no: el éxito se parece más a "loterías" por pieza que a un rendimiento estable, lo que justifica publicar mucho.
- Que Restaurant365/7shifts logren ratios del 11-13 % con 5.000-18.000 seguidores y MarginEdge solo 2,4 % sugiere que el humor de camarero rinde más que el contenido corporativo de producto (ver el apartado de ganchos).

### Gaps
- Sin verificar por handle equivocado o cuenta no encontrada: Owner.com (`ownerdotcom`), Square (`squareupnews`), Restaurant Unstoppable, The Restaurant Boss en Instagram (no encontrados); `nickhuber` (5 seguidores), `dankoe` (23, otra persona), `justinwelsh` (462 seguidores, no parece el real) → cuentas equivocadas, descartadas. Alex Hormozi en TikTok (`alexhormozi`) devolvió "perfil privado/no encontrado"; Toast, David Scott Peters y Codie en TikTok no devolvieron vídeos (probable handle erróneo).
- LinkedIn y X no se intentaron (límite de ejecuciones y sin actor probado); Justin Welsh, Dan Koe, Nick Huber (sus plataformas fuertes) quedan sin datos.
- Sin top 3 de 12 meses real; solo de la muestra reciente.
- Creadores de habla hispana distintos de Vilma Núñez: la búsqueda web y un intento por handles (influsnet, etc.) no devolvió datos útiles. Hueco principal.
- Square for Restaurants, Eric Cacciatore, The Restaurant Boss: sin datos propios.

## 1. Formatos y ganchos que dominan las mejores piezas

### Takeaway
Las piezas más vistas son cortas (5-70 s), de cámara o clip hablado, con una afirmación contraria al sentido común, una cifra concreta, una historia personal con emoción o humor de oficio ("si has trabajado en un restaurante…"). Los consultores de restaurantes con peor rendimiento (David Scott Peters) publican textos largos de "problema-solución" con voz explicativa de 40-100 s y casi sin engagement; los software de restaurantes que ganan usan memes/humor de personal y concursos en comentarios, no demos de producto.

### Cited Findings
Ganchos textuales (caption conocido; el gancho hablado de los primeros segundos NO está capturado porque no pedí transcripciones; el caption es lo único verificable). Entre paréntesis vistas / likes / comentarios, duración.
- Hormozi: "Comment 'SALES' to get the free $100M Sales Teams Training." — 777.783 / 23.085 / 1.322, 48 s — [IG](https://www.instagram.com/p/Df47unjuoLK/). Mismo CTA en otro reel: 674.739 / 21.867 / 1.483, 83 s — [IG](https://www.instagram.com/p/Df2ZGHFTED1/). "Comment 'MAP' to get your free personalized Scaling Roadmap." 447.269 / 8.203 / 1.509, 86 s — [IG](https://www.instagram.com/p/Df3SUd3oVhP/)
- Codie Sanchez: "Chamath found that Facebook users who got 7 friends in 10 days never left. Every business has a number like that, and almost nobody looks for it. What's yours?" — 339.574 / 4.753 / 99, 36 s — [IG](https://www.instagram.com/p/DfzazlsjTLE/)
- Codie Sanchez: "If nobody's hiring you, your résumé probably isn't the problem. Most people get hired through handshakes, friends, and people they already know. Stop applying into the void and start talking to humans." — 251.234 / 4.380 / 82, 50 s — [IG](https://www.instagram.com/p/Df5GcrejBwz/)
- Codie Sanchez: "Millions of grown adults have officially stopped going outside. But somebody's gotta feed them! … Comment 'BUY' to learn how to get into a business worth owning." — 233.862 / 9.083 / 804, 68 s — [IG](https://www.instagram.com/p/Df7hmmCgRwd/)
- Leila Hormozi: "Advice for my younger self: If you don't commit to anything, you'll be distracted by everything." — 1.508.891 / 63.926 / 884, 58 s — [IG](https://www.instagram.com/p/Dfvcm7UPGv8/); en TikTok "How I know who to fire and hire" — 965.300 vistas / 74.300 likes / 12.000 compartidos, 63 s (feb 2026) — [TikTok](https://www.tiktok.com/@leilahormozi/video/7602792356189900046)
- Iman Gadzhi (TikTok): "Would you act the same?" #relatable — 454.400 / 33.700 / 27, 27 s — [TikTok](https://www.tiktok.com/@imangadzhi/video/7706620779701570818). Sus 8 vídeos son skits de 14-27 s sin CTA en caption
- Jon Taffer: "If you have a death wish, take a sip! 💀 Would you drink this?" — IG 550.777 / 16.660 / 826, 35 s — [IG](https://www.instagram.com/p/DfapItxoedh/); TikTok 17.900 vistas — [TikTok](https://www.tiktok.com/@jontaffer/video/7705183355985235214). Segundo en Instagram: "Orlando, we're raising a glass to ONE YEAR of Taffer's Tavern!" 56.083, 12 s — [IG](https://www.instagram.com/p/DehYOGMFZZi/). Contraste: "Service. Sacrifice. Commitment…" (Veterans Day) 15.023
- Brandon Dearden (@chefauthorized): "A lot of you see me on socials talking about our restaurants… none of it happens without the people doing the work every day… JC is one of those people." (historia de reconocimiento a un empleado, texto largo) — 121.057 / 8.720 / 75, 40 s — [IG](https://www.instagram.com/p/DfaAiLOAIQm/)
- Brandon Dearden (TikTok): "Responsible sourcing isn't a marketing line. It's the job. The recent iceberg recall is a reminder that every restaurant should know where its food comes from…" — 36.800 / 2.407 / 92, 22 s; CTA: 'Comment "DRESSING"' — [TikTok](https://www.tiktok.com/@chefauthorized/video/7671086254682819854). Otro: "Top Chef anniversary… 41 years old…" 43.100 — [TikTok](https://www.tiktok.com/@chefauthorized/video/7674845633475300621)
- Restaurante de Brandon (@ember_mt, reel de colaboración): "Do you take pride in scrubbing your kitchen down every day? Pro-tip: squeegee…" — 154.827 / 2.576 / 55, 57 s — [IG](https://www.instagram.com/p/DfmzcxcCcaC/)
- Toast: "hospitality workers, we know you've seen some things… drop your wildest, weirdest, or most unbelievable restaurant story in the comments for a chance to snag a FREE temporary tattoo." — 27.350 / 4.146 / 2, 16 s — [IG](https://www.instagram.com/p/DfsiO1fN5Y3/). Un reel de un creador pagado (#ad, "Toast IQ Team") alcanzó 51.248 / 1.392 / 12, 101 s — [IG](https://www.instagram.com/p/Df5sonphGnU/)
- Creadora de contenido de camarera (@lemar.m, no es coach): "If you've ever worked in a restaurant, you KNOW this table! 😭😂" — 500.742 / 22.470 / 696, 65 s — [IG](https://www.instagram.com/p/DfscvsZBH2Z/); similar 209.220 / 12.468 — [IG](https://www.instagram.com/p/Df2vd5vhqcF/)
- 7shifts: "Restaurant operators, here's some food for thought 🤔 #Reddit" — 19.100 / 156 / 10, 43 s — [IG](https://www.instagram.com/p/DfGdcKCCc_l/) (su mejor de la muestra); el resto, humor de personal, 1.000-2.700
- David Scott Peters, ejemplos de gancho y rendimiento: "Your food isn't the reason guests stopped coming back." — 329 / 3 / 1, 50 s — [IG](https://www.instagram.com/p/DfxYXi8JHYl/); "Your restaurant doesn't need a rebrand. It needs seven days." (plan de 7 días, lista lunes-domingo) — 721 / 7 / 0, 98 s, el mejor de su muestra — [IG](https://www.instagram.com/p/DffUmMXj9B8/); "Your kitchen could be using 50 extra pounds of chicken and nobody is telling you." — 208 / 1 / 0, 41 s — [IG](https://www.instagram.com/p/Dfm-Cnagfhp/)
- Vilma Núñez: "Tus anuncios no están fallando por 'el algoritmo', están fallando porque estás mandando tráfico a una página que no tiene oferta, tiene información." — 13.982 vistas, 27 s — [IG](https://www.instagram.com/p/Df58XgGS3Ws/). Su reel más visto de la muestra: marca personal y fotos profesionales con IA, 5,8 s, 113.585 vistas — [IG](https://www.instagram.com/p/Df7xRHiykU5/); y un hilo sobre ChatGPT y las conversaciones de pareja, 61 s, 42.663 — [IG](https://www.instagram.com/p/Df51Iv1yYw8/). En TikTok sus mejores piezas históricas son de mentalidad ("La felicidad es una decisión", 517.700, mar 2025) — [TikTok](https://www.tiktok.com/@vilmanunez/video/7480650855562136874)
- Josh Kopel: "New customers aren't the answer." 1.264 vistas, 26 s (jun 2025) — [IG](https://www.instagram.com/p/DLNdMkiJRV7/); el contenido sobre él en pódcasts de terceros ("Still hiring on vibes?") rinde igual o menos (973-1.479)
- Duración: el 100 % de los 10 mejores reels de Hormozi, Codie y Leila de la muestra dura entre 5 y 150 s; los más vistos de Codie son 36-68 s; el de Vilma de 5,8 s.
- Ventanas de un tema inesperado en YouTube: los largos de Hormozi con mayor audiencia son marcos de 16-18 minutos con título con cifra o promesa ("My 2027 Framework", "my exact playbook") — [vídeo](https://www.youtube.com/watch?v=21flGkcZO3A) (640.000 vistas)

### Inferences
- Patrón dominante en B2B no restaurante: afirmación contraria + una cifra o un ejemplo concreto + una frase de cierre, de 35-60 s, a cámara o en voz con texto, y CTA con palabra clave. Es la misma plantilla de Codie (cinco de sus diez), Hormozi y Vilma.
- En restaurantes los números vienen de personas y emoción (Taffer, Dearden), no de consejos de gestión. Los consejos de gestión de David Scott Peters, aunque tengan buenos ganchos escritos ("Your restaurant doesn't need a rebrand. It needs seven days."), obtienen 200-700 vistas: el problema parece ser alcance/algoritmo o formato (texto largo, 40-100 s, sin cara) más que tema. No puedo separar esas causas con estos datos.
- El humor desde el punto de vista del camarero (lemar.m, Toast, 7shifts) es el contenido de "restaurantes" que más circula, pero atrae a empleados, no a dueños: no sirve directamente para vender gestión, solo para alcance.
- Para GastroGoan en español: la combinación más prometedora es "afirmación contraria + cifra + palabra clave" aplicada a un dolor de dueño (food cost, escandallo), en 30-60 s; es una hipótesis, no un resultado medido.

### Gaps
- Los primeros segundos hablados (gancho real) no se capturaron; solo caption. Para tenerlos habría que ejecutar transcripciones (el actor las cobra por minuto) o ver los vídeos.
- No tengo formato "teardown/auditoría" medido: ningún post de la muestra es un teardown de un negocio ajeno. No puedo afirmar nada sobre ese formato.
- Los 3 más vistos de 12 meses no están: ver advertencias.

## 2. CTA y oferta visibles (palabra clave, bio, newsletter, llamada) y precios

### Takeaway
Quien vende servicios usa "Comenta PALABRA y te lo mando por DM" en la mayoría de sus piezas (Hormozi, Codie, Leila, Vilma, David Scott Peters), apuntando a un recurso gratuito (formación, hoja de ruta, informe) o a una lista de espera. Los precios casi nunca están en los posts; solo se vio el descuento de un evento presencial y la lista de precios de Owner.com de una fuente anterior.

### Cited Findings
- Hormozi: "Comment 'SALES' to get the free $100M Sales Teams Training" y "Comment 'MAP' to get your free personalized Scaling Roadmap"; la bio enlaza "$100M SALES TEAM TRAINING LINK" — [IG](https://www.instagram.com/hormozi). 6 de sus 10 reels de la muestra llevan uno de los dos CTA y esos seis suman las mayores audiencias (25.442-777.783)
- Leila Hormozi: bio "Get My Free 5 Scaling Frameworks" y reel "Comment 'FRAME' if you want my 5 free scaling frameworks that we use to grow our team." — 7.367 vistas, 62 s — [IG](https://www.instagram.com/p/DfuZrkdklf6/). Es de las pocas piezas con CTA y su rendimiento es bajo (su pico de 1,5 M no lleva CTA)
- Codie Sanchez: "Comment 'BUY'" (compra de negocios) y "Comment 'BIGDEAL'" (enlace al pódcast por DM); bio con libro "ownerbook.com" — [IG](https://www.instagram.com/codiesanchez). 3 de 10 reels llevan CTA de palabra clave
- Vilma Núñez: todos sus captions abren con "Sígueme @vilmanunez" y 7 de 10 llevan palabra clave: "comenta AICEO" (membresía "AI CEO", agentes de IA) y "comenta BF26" (lista de espera de Black Friday de la Escuela Convierte Más, "más de 400 agentes"); bio: enlace a lista de espera de conviertemas.ai — [IG](https://www.instagram.com/vilmanunez). El reel BF26 con mejor rendimiento: 64.691 vistas, 33 comentarios — [IG](https://www.instagram.com/p/Df5pVtvhTeZ/). Texto del reel: "10 años construyendo una de las escuelas de marketing más grandes en español"
- David Scott Peters: 'Comment SYSTEMS to book a Systems Check Call' (llamada gratuita "no-cost Restaurant Systems Check call") — [IG](https://www.instagram.com/p/DfxYXi8JHYl/); 'Drop REPORT and I'll send you my free Food Cost Report' — [IG](https://www.instagram.com/p/Dfm-Cnagfhp/); evento: "The Restaurant Workshop. December 1 to 3 in Las Vegas… Bring a manager and their seat is $500 OFF… If you don't leave with what we promised, you get your money back. GET YOUR TICKETS NOW at the link in B I O" — [IG](https://www.instagram.com/p/DfavPogHH-I/). El precio base del taller no aparece. En la bio: "reduce food & labor costs 23% on average" (afirmación propia, no verificada)
- David Scott Peters usa un cliente real con cifras como prueba social: "Gina Sidebottom… Food cost down 3 points, Sales up 8%, first real two-week vacation in 15 years" — [IG](https://www.instagram.com/p/DfvDi_DBCf4/); "Avery Ward… $750,000 → $2.2 million" — [IG](https://www.instagram.com/p/Dfu7tnchqVg/)
- Josh Kopel: bio "Helping Restaurants Make More Money with AI… 2,500+ Students", enlace a Restaurant Business School — [IG](https://www.instagram.com/joshkopel); no se vio precio
- Jon Taffer: venta de producto propio en TikTok marcada #partner ("Taffer's Browned Butter Bourbon… Order by 11/15… shop.taffers.com") con vistas bajas (1.284 y 27.800 con regalo "buttersquishy") — [TikTok](https://www.tiktok.com/@jontaffer/video/7707347039469817102)
- Toast: CTA de comentarios para regalo (tatuaje temporal) más que de producto; el producto aparece en piezas con creadores pagados (#ad) — ver arriba
- 7shifts: oferta de referidos "Refer your manager to 7shifts and earn $100. They get 50% off their first two months" — 248 vistas (la mañana de publicación) — [IG](https://www.instagram.com/p/Df7rRP7nGyM/); bio "We help 55,000+ restaurants…" y lead magnet de newsletter "Food Runner" — [IG](https://www.instagram.com/7shifts)
- MarginEdge: "link in our story", pocas vistas, producto SmartPrep — [IG](https://www.instagram.com/p/DfVLAeSjVSD/)
- Precio: Owner.com cuesta 499 $/mes más 5 % de comisión al comensal, según Sacra (fuente secundaria, del apartado anterior), no obtenido de sus redes — [Sacra](https://sacra.com/c/owner/)

### Inferences
- La palabra clave en comentarios es el CTA dominante en los que escalan; probablemente porque da un "comentario" al algoritmo y un lead al DM. En esta muestra los reels de Hormozi con CTA son sus más vistos, aunque la correlación no prueba causalidad (el CTA también va en las piezas más trabajadas).
- Los consultores pequeños enlazan a una llamada gratuita; los grandes, a un recurso gratuito y luego a la venta: la llamada solo sale en David Scott Peters.
- Para el hostelero español, la analogía más cercana es "comenta ESCANDALLO y te mando la plantilla"; no medido.

### Gaps
- Precios de los programas (Josh Kopel, David Scott Peters, Vilma, Hormozi) no visibles en los posts ni en las bios; no se abrieron páginas de venta (fuera del alcance de los scrapers).
- Newsletters/anuncios: no se verificó si hay anuncios de pago detrás de las piezas con más vistas.
- Casi todo el catálogo de ofertas de Toast/Square/Owner no se midió.

## 3. Frecuencia de publicación y proporción venta/valor

### Takeaway
Los grandes publican varias piezas al día; los consultores de restaurantes, 1 diaria; las marcas de tecnología, 3-4 a la semana. En las cuentas con CTA, entre el 30 y el 70 % de las piezas recientes lleva CTA de venta o captación; los reels de David Scott Peters son 60 % comerciales y 40 % de pura opinión.

### Cited Findings (de las fechas de los reels propios en la muestra)
- Hormozi: 10 reels entre el 17 y 19 de noviembre (≈ 3-5 al día, parte son recortes sin caption); 6/10 con CTA de palabra clave — datasets Awxy…
- Codie Sanchez: 10 reels entre el 16 y 19 de noviembre (≈ 2,5 al día); 3/10 con CTA de palabra clave, 7/10 sin CTA
- Leila Hormozi: 10 reels entre el 14 y 19 de noviembre (≈ 1,7 al día); 1/10 con CTA
- Vilma Núñez: 10 reels el 18 y 19 de noviembre (≈ 5 al día, varios con muy pocas vistas: posible batería de contenidos o anuncios); 7/10 con CTA de palabra clave
- David Scott Peters: 10 reels entre el 4 y el 18 de noviembre (≈ 0,7 al día); 3 promocionan el Restaurant Workshop, 3 llevan palabra clave (SYSTEMS ×2, REPORT), 4 son pura opinión: 6/10 comerciales
- Jon Taffer: 8 reels entre el 2 de octubre y el 11 de noviembre (≈ 1 cada 5 días); varios son promociones de pódcast o de su bourbon
- Toast: 7 reels en 14 días (5-19 nov, ≈ 0,5 al día); 7shifts: 8 en 21 días (30 oct-19 nov); MarginEdge: 10 en 70 días (9 sep-18 nov, ≈ 1 a la semana); Restaurant365: 10 en 112 días (2 jul-22 oct)
- Chef Brandon Dearden: 7 reels propios en 15 días (3-17 nov); en esa fecha publica la apertura de su restaurante "Buttered Burd" ("grand opening soon"): su contenido actual es narrar la apertura, no consejos a dueños
- Josh Kopel: el scraper no devolvió reels propios desde junio 2025: posible inactividad o hueco del actor

### Inferences
- Los números del grupo B sugieren que la regla es volumen alto + 30-70 % CTA; el ratio vistas/seguidores baja con más volumen (Hormozi 1,1 %, Leila 0,09 %).
- Un consultor pequeño en español podría imitar la frecuencia de David Scott Peters (casi diaria) pero el resultado de este último (≈ 5 % de seguidores/reel, 3 likes de media) alerta de que frecuencia y CTA no bastan sin gancho y alcance.

### Gaps
- Sin datos de 12 meses de frecuencia (solo 1-4 semanas por cuenta salvo MarginEdge y Restaurant365).
- No clasifiqué posts "venta vs valor" para Toast, 7shifts, MarginEdge, Restaurant365 (la mayoría es marca/humor/producto, sin CTA directo en caption).
- Sin datos de YouTube Shorts, ni de comentarios (excluidos a propósito por privacidad), ni de LinkedIn, ni de creadores hispanohablantes más allá de Vilma Núñez.
