"""Le Petit Comité · menús de ejemplo: los MISMOS ocho en los tres idiomas (pedido del dueño, 17/11).
Antes el castellano tenía seis y el catalán/inglés otros cuatro distintos. Pestañas 4 + 4 (en móvil, de dos
en dos) con radios propios (evm1…evm8) para no chocar con las reglas viejas de la plantilla."""
import html as H

M = {
 'es': dict(et='Menús de ejemplo', h2='Ocho maneras de sentarse a la mesa',
   nota='Cada menú se diseña desde cero para tu ocasión. Estos son solo ejemplos del nivel.',
   menus=[
    ('Degustación', 'Degustación de temporada', 'Del Penedès a la mesa', [
      ('Aperitivo', 'Croqueta de asado de la abuela y coca de recapte crujiente'),
      ('Entrante', 'Tartar de tomate rosa, ventresca de atún y aceite de arbequina'),
      ('Principal', 'Presa ibérica a la brasa de encina con escalivada ahumada'),
      ('Postre', 'Torrija de brioche caramelizada con helado de vainilla')], 'Maridaje con vinos y espumosos del Penedès'),
    ('Arrocero', 'Arrocero', 'Alrededor de la paella', [
      ('Para picar', 'Pan de cristal, tomate de colgar y anchoa del Cantábrico'),
      ('Entrante', 'Gamba roja a la sal y calamar de potera a la llama'),
      ('El arroz', 'Arroz de galeras y sepia con alioli de su coral · o de pato y setas'),
      ('Postre', 'Crema catalana de vainilla, quemada en la mesa')], 'Arroz terminado delante de tus invitados'),
    ('Barbacoa', 'A la brasa', 'Barbacoa de autor', [
      ('Del fuego', 'Verduras de temporada a la llama con romesco de avellana tostada'),
      ('Para compartir', 'Costilla ibérica glaseada a baja temperatura y butifarra de payés'),
      ('Principal', 'Chuletón de vaca madurada a la brasa de encina, sal en escamas'),
      ('Postre', 'Piña asada al carbón con ron añejo y helado de coco y lima')], 'Brasa en directo en tu jardín o terraza'),
    ('Boda', 'Boda y celebración', 'El día importante', [
      ('Cóctel', 'Estaciones de aperitivos, ostras abiertas al momento y show-cooking'),
      ('Entrante', 'Carpaccio de gamba roja y bombón de foie con manzana verde'),
      ('Principal', 'Solomillo de ternera, reducción de garnacha y parmentier de trufa'),
      ('Dulce', 'Mesa de postres de autor y tarta nupcial a medida')], 'Menú y montaje a medida para tu enlace'),
    ('Cata de vinos', 'Cata guiada', 'Cinco vinos del Penedès', [
      ('Blancos', 'Xarel·lo de viñas viejas y un blanco con crianza sobre lías'),
      ('Espumoso', 'Un espumoso de larga crianza de la zona como transición'),
      ('Tintos', 'Sumoll y garnacha de pequeños productores del Penedès'),
      ('Acompaña', 'Embutido artesano, quesos catalanes y pan de masa madre')], 'Guiada en directo, explicando cada copa'),
    ('Maridaje quesos', 'Maridaje', 'Quesos y vino, paso a paso', [
      ('Frescos', 'Mató y cabra fresco con un xarel·lo joven'),
      ('Semicurados', 'Oveja semicurada con un espumoso brut nature'),
      ('Curados', 'Curados de largo afinado con una garnacha con crianza'),
      ('Azules', 'Azul cremoso con un vino dulce, para cerrar')], 'Ocho quesos, cuatro vinos, una conversación'),
    ('Chef semanal', 'Chef privado', 'Tu semana, resuelta', [
      ('Lunes', 'Menú semanal pensado para tu casa: gustos, alergias y temporada'),
      ('Cocina', 'Cocino en tu cocina con producto de mercado'),
      ('Raciones', 'Comidas y cenas listas, etiquetadas y con cómo calentarlas'),
      ('Ritmo', 'Repetición semanal o mensual, a tu medida')], 'Sin pensar en la compra ni en fregar'),
    ('Chef puntual', 'Chef privado', 'Un día concreto, en tu casa', [
      ('Antes', 'Menú degustación a medida y compra de producto de primera'),
      ('Durante', 'Cocino y emplato en tu casa, pase a pase'),
      ('Después', 'Cocina recogida, sin rastro de trabajo'),
      ('Ideal para', 'Una ocasión puntual, sin compromiso semanal')], 'Igual de cuidado, sin repetición'),
   ]),
 'ca': dict(et='Menús d’exemple', h2='Vuit maneres de seure a taula',
   nota='Cada menú es dissenya des de zero per a la teva ocasió. Aquests són només exemples del nivell.',
   menus=[
    ('Degustació', 'Degustació de temporada', 'Del Penedès a taula', [
      ('Aperitiu', 'Croqueta de rostit de l’àvia i coca de recapte cruixent'),
      ('Entrant', 'Tàrtar de tomàquet rosa, ventresca de tonyina i oli d’arbequina'),
      ('Principal', 'Presa ibèrica a la brasa d’alzina amb escalivada fumada'),
      ('Postres', 'Torrija de brioix caramel·litzada amb gelat de vainilla')], 'Maridatge amb vins i escumosos del Penedès'),
    ('Arrosser', 'Arrosser', 'Al voltant de la paella', [
      ('Per picar', 'Pa de vidre, tomàquet de penjar i anxova del Cantàbric'),
      ('Entrant', 'Gamba vermella a la sal i calamar de potera a la flama'),
      ('L’arròs', 'Arròs de galeres i sípia amb allioli del seu corall · o d’ànec i bolets'),
      ('Postres', 'Crema catalana de vainilla, cremada a taula')], 'Arròs acabat davant dels teus convidats'),
    ('Barbacoa', 'A la brasa', 'Barbacoa d’autor', [
      ('Del foc', 'Verdures de temporada a la flama amb romesco d’avellana torrada'),
      ('Per compartir', 'Costella ibèrica glacejada a baixa temperatura i botifarra de pagès'),
      ('Principal', 'Xuletó de vaca madurada a la brasa d’alzina, sal en escates'),
      ('Postres', 'Pinya rostida al carbó amb rom vell i gelat de coco i llima')], 'Brasa en directe al teu jardí o terrassa'),
    ('Casament', 'Casament i celebració', 'El dia important', [
      ('Còctel', 'Estacions d’aperitius, ostres obertes al moment i show-cooking'),
      ('Entrant', 'Carpaccio de gamba vermella i bombó de foie amb poma verda'),
      ('Principal', 'Filet de vedella, reducció de garnatxa i parmentier de tòfona'),
      ('Dolç', 'Taula de postres d’autor i pastís nupcial a mida')], 'Menú i muntatge a mida per al teu enllaç'),
    ('Tast de vins', 'Tast guiat', 'Cinc vins del Penedès', [
      ('Blancs', 'Xarel·lo de vinyes velles i un blanc amb criança sobre mares'),
      ('Escumós', 'Un escumós de llarga criança de la zona com a transició'),
      ('Negres', 'Sumoll i garnatxa de petits productors del Penedès'),
      ('Acompanya', 'Embotit artesà, formatges catalans i pa de massa mare')], 'Guiat en directe, explicant cada copa'),
    ('Maridatge formatges', 'Maridatge', 'Formatges i vi, pas a pas', [
      ('Frescos', 'Mató i cabra fresc amb un xarel·lo jove'),
      ('Semicurats', 'Ovella semicurada amb un escumós brut nature'),
      ('Curats', 'Curats de llarg afinat amb una garnatxa amb criança'),
      ('Blaus', 'Blau cremós amb un vi dolç, per tancar')], 'Vuit formatges, quatre vins, una conversa'),
    ('Xef setmanal', 'Xef privat', 'La teva setmana, resolta', [
      ('Dilluns', 'Menú setmanal pensat per a casa teva: gustos, al·lèrgies i temporada'),
      ('Cuina', 'Cuino a la teva cuina amb producte de mercat'),
      ('Racions', 'Dinars i sopars a punt, etiquetats i amb com escalfar-los'),
      ('Ritme', 'Repetició setmanal o mensual, a la teva mida')], 'Sense pensar en la compra ni a fregar'),
    ('Xef puntual', 'Xef privat', 'Un dia concret, a casa teva', [
      ('Abans', 'Menú degustació a mida i compra de producte de primera'),
      ('Durant', 'Cuino i emplato a casa teva, pas a pas'),
      ('Després', 'Cuina recollida, sense rastre de feina'),
      ('Ideal per a', 'Una ocasió puntual, sense compromís setmanal')], 'Igual de cuidat, sense repetició'),
   ]),
 'en': dict(et='Sample menus', h2='Eight ways to sit at the table',
   nota='Every menu is designed from scratch for your occasion. These are just examples of the level.',
   menus=[
    ('Tasting', 'Seasonal tasting', 'From the Penedès to the table', [
      ('Appetiser', 'Grandma’s slow-roast croquette and crisp coca de recapte'),
      ('Starter', 'Pink tomato tartare, tuna belly and arbequina oil'),
      ('Main', 'Ibérico pork over holm-oak coals with smoked escalivada'),
      ('Dessert', 'Caramelised brioche torrija with vanilla ice cream')], 'Paired with Penedès wines and sparkling wines'),
    ('Rice', 'Rice', 'Around the paella', [
      ('To share', 'Glass bread, hanging tomatoes and Cantabrian anchovy'),
      ('Starter', 'Salt-baked red prawn and line-caught squid over the flame'),
      ('The rice', 'Mantis shrimp and cuttlefish rice with coral aioli · or duck and wild mushrooms'),
      ('Dessert', 'Vanilla crema catalana, torched at the table')], 'Rice finished in front of your guests'),
    ('Barbecue', 'Grilled', 'Signature barbecue', [
      ('From the fire', 'Flame-grilled seasonal vegetables with toasted hazelnut romesco'),
      ('To share', 'Slow-cooked glazed Ibérico ribs and farmhouse butifarra'),
      ('Main', 'Aged côte de boeuf over holm-oak coals, flaked salt'),
      ('Dessert', 'Charcoal-roasted pineapple, aged rum and coconut-lime ice cream')], 'Live grilling in your garden or terrace'),
    ('Wedding', 'Wedding & celebration', 'The big day', [
      ('Cocktail', 'Appetiser stations, freshly shucked oysters and show-cooking'),
      ('Starter', 'Red prawn carpaccio and foie bonbon with green apple'),
      ('Main', 'Beef tenderloin, garnacha reduction and truffle parmentier'),
      ('Sweet', 'Signature dessert table and bespoke wedding cake')], 'Bespoke menu and setup for your wedding'),
    ('Wine tasting', 'Guided tasting', 'Five Penedès wines', [
      ('Whites', 'Old-vine xarel·lo and a white aged on its lees'),
      ('Sparkling', 'A long-aged local sparkling wine as a bridge'),
      ('Reds', 'Sumoll and garnacha from small Penedès growers'),
      ('Alongside', 'Artisan charcuterie, Catalan cheeses and sourdough bread')], 'Guided live, explaining every glass'),
    ('Cheese pairing', 'Pairing', 'Cheese and wine, step by step', [
      ('Fresh', 'Mató and fresh goat’s cheese with a young xarel·lo'),
      ('Semi-cured', 'Semi-cured sheep’s cheese with a brut nature sparkling wine'),
      ('Cured', 'Long-aged cheeses with an oak-aged garnacha'),
      ('Blue', 'Creamy blue with a sweet wine, to finish')], 'Eight cheeses, four wines, one conversation'),
    ('Weekly chef', 'Private chef', 'Your week, sorted', [
      ('Monday', 'A weekly menu made for your home: tastes, allergies and season'),
      ('Cooking', 'I cook in your kitchen with market produce'),
      ('Portions', 'Lunches and dinners ready, labelled, with reheating notes'),
      ('Rhythm', 'Weekly or monthly, as you need it')], 'No shopping, no washing up'),
    ('One-off chef', 'Private chef', 'One special day, at home', [
      ('Before', 'A bespoke tasting menu and top-quality shopping'),
      ('During', 'I cook and plate in your home, course by course'),
      ('After', 'Kitchen cleaned, no trace of work'),
      ('Ideal for', 'A one-off occasion, no weekly commitment')], 'Just as much care, no repetition'),
   ]),
}


def menus(l):
    x = M[l]; e = H.escape
    radios = ''.join(f'<input type="radio" name="evm" id="evm{k + 1}" class="ev-mn-r" data-on="{1 if k == 0 else 0}">' for k in range(8))
    tabs = ''.join(f'<label for="evm{k + 1}" class="ev-mn-tab" data-k="{k + 1}">{e(m[0])}</label>' for k, m in enumerate(x['menus']))
    panels = ''
    for k, (tab, et, tit, filas, pie) in enumerate(x['menus']):
        rows = ''.join(f'<li><span>{e(a)}</span><b>{e(b)}</b></li>' for a, b in filas)
        panels += f'''<article class="ev-mn-p" data-k="{k + 1}">
          <header><span class="ev-mn-et">{k + 1:02d} · {e(et)}</span><h3>{e(tit)}</h3></header>
          <ul>{rows}</ul>
          <p class="ev-mn-pie">{e(pie)}</p>
        </article>'''
    css = ''.join(f'#evm{k}:checked~.ev-mn-tabs .ev-mn-tab[data-k="{k}"]{{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}}'
                  f'#evm{k}:checked~.ev-mn-stage .ev-mn-p[data-k="{k}"]{{display:flex}}' for k in range(1, 9))
    return f'''<section id="ev-menus" class="ev-mn">
    <div class="ev-mn-cab ev-rev"><span class="ev-cm-et">{e(x['et'])}</span><h2 class="ev-cm-h">{e(x['h2'])}</h2></div>
    <div class="ev-mn-sel ev-rev" style="--d:.1s">
      {radios}
      <div class="ev-mn-tabs">{tabs}</div>
      <div class="ev-mn-stage">{panels}</div>
    </div>
    <p class="ev-mn-nota">{e(x['nota'])}</p>
    <style>{css}</style>
    <script>
    /* El empaquetador se come «checked»: el primero se marca aquí (y si la página se vuelve a montar, otra vez) */
    (function(){{ if(window.__evMn) return; window.__evMn=1;
      setInterval(function(){{ var s=document.querySelector('.ev-mn-sel'); if(!s||s.querySelector('.ev-mn-r:checked')) return;
        var r=s.querySelector('.ev-mn-r[data-on="1"]'); if(r) r.checked=true; }},200);
    }})();
    </script>
  </section>'''


CSS = '''
/* ---------- Menús de ejemplo: ocho, iguales en los tres idiomas ---------- */
.ev-mn{padding:clamp(34px,4.2vw,54px) clamp(20px,6vw,64px);border-bottom:1px solid #E7E2D9;display:flex;flex-direction:column;align-items:center;gap:clamp(22px,3vw,30px)}
.ev-mn-cab{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
.ev-mn-sel{width:100%;max-width:880px;display:flex;flex-direction:column;align-items:center;gap:22px}
.ev-mn-r{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}
.ev-mn-tabs{width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.ev-mn-tab{display:flex;align-items:center;justify-content:center;min-height:44px;padding:6px 10px;box-sizing:border-box;border:1px solid #E7E2D9;border-radius:3px;background:#fff;color:#716C65;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-align:center;cursor:pointer;transition:background .2s,color .2s,border-color .2s}
.ev-mn-tab:hover{border-color:#4A5D4E;color:#4A5D4E}
.ev-mn-r:focus-visible~.ev-mn-tabs .ev-mn-tab{outline-offset:2px}
.ev-mn-stage{width:100%;display:flex;justify-content:center}
.ev-mn-p{display:none;flex-direction:column;gap:18px;width:100%;max-width:620px;box-sizing:border-box;padding:clamp(24px,3.6vw,40px);background:#fff;border:1px solid #E7E2D9;border-radius:3px}
.ev-mn-p header{display:flex;flex-direction:column;gap:4px;padding-bottom:14px;border-bottom:1px solid #E7E2D9}
.ev-mn-et{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.ev-mn-p h3{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:600;font-size:clamp(24px,2.6vw,28px);color:#1C1A17}
.ev-mn-p ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.ev-mn-p li{display:flex;flex-direction:column;gap:2px}
.ev-mn-p li span{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#716C65}
.ev-mn-p li b{font-family:'Cormorant Garamond',serif;font-weight:500;font-size:19px;line-height:1.35;color:#1C1A17}
.ev-mn-pie{margin:0;font-family:'Cormorant Garamond',serif;font-style:italic;font-size:16px;color:#4A5D4E}
.ev-mn-nota{margin:0;font-size:14px;color:#716C65;text-align:center;max-width:480px}
/* sin ninguna marcada (antes de que corra el script) se ve el primero */
.ev-mn-sel:not(:has(.ev-mn-r:checked)) .ev-mn-p[data-k="1"]{display:flex}
.ev-mn-sel:not(:has(.ev-mn-r:checked)) .ev-mn-tab[data-k="1"]{background:#4A5D4E;border-color:#4A5D4E;color:#FAF8F4}
@media (max-width:640px){.ev-mn-tabs{grid-template-columns:1fr 1fr}.ev-mn-tab{letter-spacing:.04em}}
'''
