# Ensambla el PDF fiel (1 hoja del HTML = 1 página, como imagen) tras ejecutar build-pdf-shots.js
import fitz, glob
imgs=sorted(glob.glob('/tmp/blk_*.png'))
W_PT=210.0/25.4*72.0
doc=fitz.open()
for f in imgs:
    pm=fitz.Pixmap(f); h=W_PT*pm.height/pm.width
    pg=doc.new_page(width=W_PT, height=h); pg.insert_image(fitz.Rect(0,0,W_PT,h), filename=f)
doc.save('El-Cuaderno-del-Pianista-TClas.pdf', deflate=True, garbage=4)
print('PDF generado:', len(imgs), 'páginas')
