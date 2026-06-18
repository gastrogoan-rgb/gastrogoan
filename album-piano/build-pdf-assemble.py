# Monta el PDF A4 fiel: cada hoja del HTML se trocea por secciones (sin partir recuadros)
# y cada trozo va en su pagina A4. Ejecutar primero: node build-pdf-shots.js
import fitz, json, glob
plan=json.load(open('/tmp/plan.json')); imgs=sorted(glob.glob('/tmp/ch_*.png'))
Wp,Hp=595.276,841.890
doc=fitz.open()
for c,f in zip(plan,imgs):
    pm=fitz.Pixmap(f); top=0 if c['full'] else 20
    hpt=Wp*pm.height/pm.width
    if top+hpt>Hp: hpt=Hp-top
    pg=doc.new_page(width=Wp,height=Hp)
    pg.insert_image(fitz.Rect(0,top,Wp,top+hpt), filename=f)
doc.save('El-Cuaderno-del-Pianista-TClas.pdf', deflate=True, garbage=4)
print('PDF A4 generado:', len(plan), 'paginas')
