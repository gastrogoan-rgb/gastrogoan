#!/usr/bin/env python3
"""Le Petit Comité (es/ca/en), guiada por el dueño sección a sección. Parte siempre de git (a152bda).
La página conserva SU letra (Cormorant Garamond, la marca de Le Petit Comité); lo común con el resto
de la web es el sistema: etiquetas en mono, botones rectos, verde oliva, aire y efectos de entrada.
 1) Cabecera: el nombre entra letra a letra bajo una luz cálida que respira, la frase con dos filetes
    que se dibujan, y dos botones centrados: «Pedir propuesta» (WhatsApp con el mensaje ya escrito)
    y «Ver menús» (baja a los menús de ejemplo).
 2) «Volver» como botón (volver.py).
Uso: python3 tools/web-parche/eventos.py
"""
import re, json, os, subprocess, sys
from urllib.parse import quote
sys.path.insert(0, os.path.dirname(__file__))
import volver, eventos_secciones, eventos_ocasiones
from asesoria_extras import WA
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
PAGS = {'es': 'eventos', 'ca': 'ca-esdeveniments', 'en': 'en-events'}
BASE_GIT = 'a152bda'

MSG = {'es': 'Hola, me gustaría pedir una propuesta para un evento con Le Petit Comité.',
       'ca': "Hola, m'agradaria demanar una proposta per a un esdeveniment amb Le Petit Comité.",
       'en': "Hi, I'd like to request a proposal for an event with Le Petit Comité."}

# Menús de ejemplo con más nivel (pedido del dueño, 17/11: «lo de cada ejemplo es demasiado básico»).
# Producto con nombre y técnica concreta, sin prometer nada que no se haga.
MENUS_TOP = {
 'es': [
  ('Pan de cristal con tomate, jamón y anchoas', 'Pan de cristal, tomate de colgar y anchoa del Cantábrico'),
  ('Gamba roja y calamar a la plancha', 'Gamba roja a la sal y calamar de potera a la llama'),
  ('Arroz meloso de galeras y sepia · a elegir', 'Arroz de galeras y sepia con alioli de su coral · o de pato y setas'),
  ('Crema catalana quemada al momento', 'Crema catalana de vainilla, quemada en la mesa'),
  ('Verduras de temporada a la llama con romesco', 'Verduras de temporada a la llama con romesco de avellana tostada'),
  ('Butifarra artesana y costillas glaseadas', 'Costilla ibérica glaseada a baja temperatura y butifarra de payés'),
  ('Chuletón madurado a la brasa de encina', 'Chuletón de vaca madurada a la brasa de encina, sal en escamas'),
  ('Piña a la brasa con helado de coco', 'Piña asada al carbón con ron añejo y helado de coco y lima'),
  ('Dos blancos de variedad autóctona', 'Xarel·lo de viñas viejas y un blanco con crianza sobre lías'),
  ('Un cava de crianza como transición', 'Un espumoso de larga crianza de la zona como transición'),
  ('Dos tintos de bodegas pequeñas de la zona', 'Sumoll y garnacha de pequeños productores del Penedès'),
  ('Tabla de embutido y queso curado', 'Embutido artesano, quesos catalanes y pan de masa madre'),
  ('Quesos frescos con blanco joven', 'Mató y cabra fresco con un xarel·lo joven'),
  ('Semicurados de oveja con cava', 'Oveja semicurada con un espumoso brut nature'),
  ('Curados intensos con tinto de crianza', 'Curados de largo afinado con una garnacha con crianza'),
  ('Azul con vino dulce, para cerrar', 'Azul cremoso con un vino dulce, para cerrar'),
  ('Compra y planificación del menú semanal', 'Menú semanal pensado para tu casa: gustos, alergias y temporada'),
  ('Cocinado en tu propia cocina, en casa', 'Cocino en tu cocina con producto de mercado'),
  ('Comidas y cenas listas, etiquetadas por día', 'Comidas y cenas listas, etiquetadas y con cómo calentarlas'),
  ('Menú acordado y compra hecha por mí', 'Menú degustación a medida y compra de producto de primera'),
  ('Cocino en tu cocina, sin salir de casa', 'Cocino y emplato en tu casa, pase a pase'),
 ],
 'ca': [
  ('Croqueta de rostit i snack del Penedès', 'Croqueta de rostit de l’àvia i coca de recapte cruixent'),
  ('Tàrtar de tomàquet rosa amb ventresca', 'Tàrtar de tomàquet rosa, ventresca de tonyina i oli d’arbequina'),
  ('Presa ibèrica a la brasa amb escalivada', 'Presa ibèrica a la brasa d’alzina amb escalivada fumada'),
  ('Torrada caramel·litzada amb gelat de vainilla', 'Torrija de brioix caramel·litzada amb gelat de vainilla'),
  ('Pa de vidre amb tomàquet, pernil i anxoves', 'Pa de vidre, tomàquet de penjar i anxova del Cantàbric'),
  ('Gamba vermella i calamar a la planxa', 'Gamba vermella a la sal i calamar de potera a la flama'),
  ('Arròs melós de galeres i sípia · a triar', 'Arròs de galeres i sípia amb allioli del seu corall · o d’ànec i bolets'),
  ('Crema catalana cremada al moment', 'Crema catalana de vainilla, cremada a taula'),
  ('Verdures de temporada a la flama amb romesco', 'Verdures de temporada a la flama amb romesco d’avellana torrada'),
  ('Botifarra artesana i costelles glacejades', 'Costella ibèrica glacejada a baixa temperatura i botifarra de pagès'),
  ('Xuletó madurat a la brasa d\'alzina', 'Xuletó de vaca madurada a la brasa d’alzina, sal en escates'),
  ('Pinya a la brasa amb gelat de coco', 'Pinya rostida al carbó amb rom vell i gelat de coco i llima'),
  ('Estacions d\'aperitius i show-cooking', 'Estacions d’aperitius, ostres obertes al moment i show-cooking'),
  ('Carpaccio de gamba i bombó de foie', 'Carpaccio de gamba vermella i bombó de foie amb poma verda'),
  ('Filet amb reducció de garnatxa', 'Filet de vedella amb reducció de garnatxa i parmentier de tòfona'),
  ('Taula de postres i pastís nupcial', 'Taula de postres d’autor i pastís nupcial a mida'),
 ],
 'en': [
  ('Slow-roast croquette and Penedès snack', 'Grandma’s slow-roast croquette and crisp coca de recapte'),
  ('Pink tomato tartare with belly tuna', 'Pink tomato tartare, tuna belly and arbequina oil'),
  ('Grilled Ibérico pork with escalivada', 'Ibérico pork over holm-oak coals with smoked escalivada'),
  ('Caramelised torrija with vanilla ice cream', 'Caramelised brioche torrija with vanilla ice cream'),
  ('Glass bread with tomato, ham and anchovies', 'Glass bread, hanging tomatoes and Cantabrian anchovy'),
  ('Grilled red prawn and squid', 'Salt-baked red prawn and line-caught squid over the flame'),
  ('Creamy mantis shrimp and cuttlefish rice · your choice', 'Mantis shrimp and cuttlefish rice with coral aioli · or duck and wild mushrooms'),
  ('Crema catalana torched to order', 'Vanilla crema catalana, torched at the table'),
  ('Flame-grilled seasonal vegetables with romesco', 'Flame-grilled seasonal vegetables with toasted hazelnut romesco'),
  ('Artisan sausage and glazed ribs', 'Slow-cooked glazed Ibérico ribs and farmhouse butifarra'),
  ('Aged côte de boeuf over holm-oak coals', 'Aged côte de boeuf over holm-oak coals, flaked salt'),
  ('Grilled pineapple with coconut ice cream', 'Charcoal-roasted pineapple, aged rum and coconut-lime ice cream'),
  ('Appetiser stations and show-cooking', 'Appetiser stations, freshly shucked oysters and show-cooking'),
  ('Prawn carpaccio and foie bonbon', 'Red prawn carpaccio and foie bonbon with green apple'),
  ('Sirloin with garnacha reduction', 'Beef tenderloin, garnacha reduction and truffle parmentier'),
  ('Dessert table and wedding cake', 'Signature dessert table and bespoke wedding cake'),
 ],
}

MENUS = {'es': 'Ver menús', 'ca': 'Veure menús', 'en': 'See menus'}

CSS = '''<style data-gg="eventos">
html{scroll-behavior:smooth}
/* ---------- Cabecera ---------- */
.ev-hero{position:relative;overflow:hidden;isolation:isolate;padding:clamp(40px,6vw,84px) clamp(24px,6vw,64px) clamp(44px,6vw,80px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:18px;border-bottom:1px solid #E7E2D9}
/* Luz cálida de lámpara detrás del nombre (la de la entrada de la app), que respira */
.ev-hero::before{content:"";position:absolute;z-index:-1;left:50%;top:-30%;width:min(1100px,140%);aspect-ratio:1.6;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(231,214,180,.55),rgba(231,214,180,.18) 55%,transparent 75%);pointer-events:none}
.ev-et{display:flex;flex-direction:column;align-items:center;gap:8px}
.ev-et span{font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#1C1A17}
.ev-et span+span{color:#716C65}
.ev-h1{margin:6px 0 0;font-family:'Cormorant Garamond',serif;font-size:clamp(50px,7.4vw,98px);font-weight:500;font-style:italic;letter-spacing:-.01em;line-height:1;color:#1C1A17}
.ev-h1 .l{display:inline-block}
.ev-frase{display:flex;align-items:center;gap:16px;margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(20px,2.4vw,27px);color:#3D3A34}
.ev-frase::before,.ev-frase::after{content:"";width:clamp(24px,5vw,56px);height:1px;background:#4A5D4E}
.ev-desc{margin:4px 0 0;font-size:clamp(15px,1.8vw,17px);line-height:1.65;color:#3D3A34;max-width:560px;text-wrap:pretty}
.ev-acc{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:8px}
.ev-btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;min-width:210px;padding:0 26px;box-sizing:border-box;border-radius:3px;font-family:'IBM Plex Mono',monospace;font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;text-decoration:none;white-space:nowrap;transition:background .25s,color .25s,border-color .25s,transform .25s,box-shadow .25s}
.ev-btn svg{width:17px;height:17px;flex:none}
.ev-btn.prim{background:#1C1A17;color:#FAF8F4;border:1px solid #1C1A17}
.ev-btn.sec{background:transparent;color:#1C1A17;border:1px solid #C9C2B6}
.ev-btn:hover,.ev-btn:focus-visible{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4;transform:translateY(-2px);box-shadow:0 16px 30px -18px rgba(28,26,23,.6)}
.ev-btn:focus-visible{outline:2px solid #4A5D4E;outline-offset:3px}
.ev-btn .gg-flecha{display:inline-block;transition:transform .3s cubic-bezier(.2,.7,.2,1)}
.ev-btn.prim:hover .gg-flecha{transform:translateX(5px)}
.ev-btn.sec:hover .gg-flecha{transform:translateY(4px)}
@media (max-width:480px){.ev-acc{display:grid;grid-template-columns:1fr 1fr;width:100%;gap:10px}.ev-btn{min-width:0;padding:6px 10px;letter-spacing:.05em;font-size:12px;white-space:normal;text-align:center;line-height:1.25}.ev-btn svg{display:none}}
@media (prefers-reduced-motion:no-preference){
  @keyframes ev-respira{0%,100%{opacity:.75;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.06)}}
  @keyframes ev-letra{from{opacity:0;transform:translateY(.35em) rotate(4deg);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
  @keyframes ev-sube{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  @keyframes ev-filete{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes ev-brillo{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
  .ev-hero::before{animation:ev-respira 7s ease-in-out infinite}
  .ev-h1 .l{animation:ev-letra .8s cubic-bezier(.2,.7,.2,1) calc(.15s + var(--i) * .045s) both}
  .ev-et{animation:ev-sube .6s cubic-bezier(.2,.7,.2,1) both}
  .ev-frase{animation:ev-sube .7s cubic-bezier(.2,.7,.2,1) .75s both}
  .ev-frase::before{transform-origin:right;animation:ev-filete .8s cubic-bezier(.65,0,.35,1) 1s both}
  .ev-frase::after{transform-origin:left;animation:ev-filete .8s cubic-bezier(.65,0,.35,1) 1s both}
  .ev-desc{animation:ev-sube .7s cubic-bezier(.2,.7,.2,1) .95s both}
  .ev-acc{animation:ev-sube .7s cubic-bezier(.2,.7,.2,1) 1.1s both}
  .ev-btn.prim::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(90deg,transparent,rgba(250,248,244,.18),transparent);animation:ev-brillo 3.6s ease-in-out 2s infinite;pointer-events:none}
}
</style>'''


def cabecera(h, l):
    et = re.findall(r"<span style=\"font-family:'IBM Plex Mono'[^>]*>([^<]+)</span>", h)
    nombre = re.search(r'<h1[^>]*>([^<]+)</h1>', h).group(1)
    ps = re.findall(r'<p[^>]*>([^<]+)</p>', h)
    pedir = re.search(r'<a [^>]*>([^<]+)</a>', h).group(1)
    # Cambio pedido por el dueño (16/11): «disfrutes», no «estés en la mesa»
    desc = (ps[1].replace('para que tú solo estés en la mesa.', 'para que tú solo disfrutes.')
                 .replace('perquè tu només siguis a taula.', 'perquè tu només gaudeixis.')
                 .replace('so you just sit at the table.', 'so you just enjoy it.'))
    assert desc != ps[1], 'frase de la descripción no encontrada'
    letras = ''.join(f'<span class="l" style="--i:{k}">{c}</span>' if c != ' ' else ' ' for k, c in enumerate(nombre))
    wa = 'https://wa.me/34622390245?text=' + quote(MSG[l])
    return f'''<header class="ev-hero">
    <div class="ev-et"><span>{et[0]}</span><span>{et[1]}</span></div>
    <h1 class="ev-h1" aria-label="{nombre}"><span aria-hidden="true">{letras}</span></h1>
    <p class="ev-frase">{ps[0]}</p>
    <p class="ev-desc">{desc}</p>
    <div class="ev-acc">
      <a class="ev-btn prim" href="{wa}" target="_blank" rel="noopener">{WA}{pedir}<span class="gg-flecha" aria-hidden="true">→</span></a>
      <a class="ev-btn sec" href="#ev-menus">{MENUS[l]}<span class="gg-flecha" aria-hidden="true">↓</span></a>
    </div>
  </header>'''


def procesar(l):
    arch = PAGS[l] + '.html'; ruta = os.path.join(RAIZ, 'deploy', 'web', 'public', arch)
    s = subprocess.run(['git', 'show', f'{BASE_GIT}:deploy/web/public/{arch}'], capture_output=True, text=True, cwd=RAIZ, check=True).stdout
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    t = json.loads(m.group(2))
    # 1) cabecera
    i = t.index('<header'); j = t.index('</header>', i) + len('</header>')
    t = t[:i] + cabecera(t[i:j], l) + t[j:]
    # 3) servicios con más juego y «Cómo funciona» paso a paso
    i = t.index('<!-- serv'); j = t.index('<!-- c', i + 5)
    t = t[:i] + eventos_secciones.servicios(t[i:j], l) + t[j:]
    # La franja negra de datos (comensales, dónde, zona) pasa a ser la ficha del evento dentro de
    # «Cómo funciona» (pedido del dueño): se leen sus textos y se quita la franja.
    fi = t.index('<!-- form'); fj = t.index('<!--', fi + 5)
    datos = eventos_secciones.datos_de(t[fi:fj]); t = t[:fi] + t[fj:]
    i = t.index('<!-- c', i + 5); j = t.index('<!-- men', i)
    t = t[:i] + eventos_secciones.como(t[i:j], l, datos) + t[j:]
    t = t.replace('</header>', '</header>' + eventos_secciones.JS, 1)
    # 4) «¿Qué celebramos?» rehecho y movido ANTES de los menús de ejemplo
    i = t.index('<!-- ocas'); j = t.index('<!-- cta', i)
    oc = eventos_ocasiones.ocasiones(t[i:j], l); t = t[:i] + t[j:]
    k = t.index('<!-- men'); t = t[:k] + oc + t[k:]
    # 5) Cierre como en Asesoría y App: frase, «Reserva tu fecha» subrayado y WhatsApp/email/Instagram
    i = t.index('<!-- cta'); j = t.index('</section>', i) + len('</section>')
    t = t[:i] + eventos_ocasiones.cierre(t[i:j], l) + t[j:]
    # menús de ejemplo con más nivel
    for viejo, nuevo in MENUS_TOP[l]:
        assert viejo in t, ('menú', l, viejo)
        t = t.replace(viejo, nuevo)
    # ancla para «Ver menús»
    k = t.index('<!-- men'); k = t.index('<section', k)
    t = t[:k] + '<section id="ev-menus"' + t[k + len('<section'):]
    # 2) volver
    t = volver.aplicar(t)
    t = t.replace('</helmet>', CSS.replace('</style>', eventos_secciones.CSS + eventos_ocasiones.CSS + '</style>') + '\n</helmet>', 1)
    nuevo = json.dumps(t, ensure_ascii=False).replace('</', '<\\u002F')
    open(ruta, 'w', encoding='utf-8').write(s[:m.start(2)] + nuevo + s[m.end(2):])
    print('OK', arch)

for l in PAGS: procesar(l)
