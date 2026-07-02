#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Copia/rasteriza las partituras originales y genera los QR de audio."""
import os, re, json, unicodedata, urllib.parse
import fitz, qrcode

SRC="/root/.claude/uploads/bc0cc3c1-2a9a-5413-935b-f497ddaf5309/joan/JOAN ok/"
os.makedirs("scores/img", exist_ok=True); os.makedirs("scores/qr", exist_ok=True)

# base (título h2) -> (archivo PDF, búsqueda YouTube)
M = {
 "Himno de la Alegría": ("HIMNO DE LA ALEGRIA_.pdf","Himno de la Alegría Beethoven piano tutorial"),
 "Yankee Doodle": ("pYankeeD.pdf","Yankee Doodle piano"),
 "Alouette": ("pAlouette.pdf","Alouette piano"),
 "Top Gun (Anthem)": ("TOP GUN.pdf","Top Gun Anthem piano"),
 "Tetris (Korobéiniki)": ("-TETRIX.pdf","Tetris theme Korobeiniki piano"),
 "Oh, When the Saints": ("Oh, when the Saints.pdf","When the Saints Go Marching In piano"),
 "La Pantera Rosa": (" La Pantera Rosa.pdf","Pink Panther theme piano"),
 "El Submarino Amarillo": ("EL SUBMARINO_.pdf","Yellow Submarine piano"),
 "Ejercicios a cuatro manos": ("Copia de EJERCICIOS 4 MANOS.pdf","Le Couppey ABC du piano"),
 "Jingle Bells": ("Jingle Bells.pdf","Jingle Bells piano"),
 "We Wish You a Merry Christmas": ("WE WISH YOU A MERRY CRISTMAS.pdf","We Wish You a Merry Christmas piano"),
 "Trouble": (" Trouble.pdf","Coldplay Trouble piano"),
 "Eye of the Tiger": ("-EYE OF THE TIGER.pdf","Eye of the Tiger piano"),
 "The Beginner": ("THE BEGINNER 4 MANOS.pdf","Gurlitt The Beginner piano duet"),
 "Sonatina en La menor": (" SONATINA LA MENOR 4 MANOS.pdf","Sonatina A minor piano four hands"),
 "Heart and Soul": (" heart-and-soul-.pdf","Heart and Soul piano"),
 "Greensleeves": ("-Greensleeves.pdf","Greensleeves piano"),
 "Morning Song": ("Morning Song.pdf","Grieg Morning Mood piano"),
 "Shallow": (" SHALLOW.pdf","Shallow Lady Gaga piano"),
 "Lovely": ("LOVELY.pdf","Lovely Billie Eilish Khalid piano"),
 "My Heart Will Go On": ("TITANIC.pdf","My Heart Will Go On Titanic piano"),
 "Boig per tu": ("Copia de Microsoft Word - boig per tu.pdf","Boig per tu Sau piano"),
 "Perfect": ("ed-sheeran-perfect-.pdf","Ed Sheeran Perfect piano"),
 "Believer": (" believer-imagine-dragons-.pdf","Believer Imagine Dragons piano"),
 "El Golpe (The Entertainer)": ("EL GOLPE.pdf","The Entertainer Scott Joplin piano"),
 "Primavera de Vivaldi": (" PRIMAVERA DE VIVALDI.pdf","Vivaldi Spring La Primavera piano"),
 "Romance": (" ROMANCE diabelli-4 MANOS.pdf","Diabelli Romance piano four hands"),
 "Scherzo": ("Copia de 4 MANOS]_diabelli-anton-scherzo-185930.pdf","Diabelli Scherzo piano four hands"),
 "Sonatina en Sol mayor": ("SONATINA SOL MENOR -4 MANOS.pdf","Sonatina G major piano four hands"),
 "Para Elisa": ("Para Elisa.pdf","Für Elise Beethoven piano"),
}

# ID de vídeo de YouTube (versión al piano) por pieza -> el QR abre el vídeo directamente
VID={
 "Himno de la Alegría":"i4bfhW7uLmc","Yankee Doodle":"YDkrvSnZ9YQ","Alouette":"1lUi3ke3YBo",
 "Top Gun (Anthem)":"krBX-d31YlQ","Tetris (Korobéiniki)":"B_pZ810jHho","Oh, When the Saints":"49fetoWKcAA",
 "La Pantera Rosa":"tKIczCGGrJw","El Submarino Amarillo":"xdX-gS8Bvjg","Ejercicios a cuatro manos":"DYCAcctpHAw",
 "Jingle Bells":"OH1OzqqMnkQ","We Wish You a Merry Christmas":"eQs0i2yFO90","Trouble":"8lVTojsL_Xo",
 "Eye of the Tiger":"fUJwyPgEYrk","The Beginner":"1savD0tM1Mc","Sonatina en La menor":"-1SOMp51Bp8",
 "Heart and Soul":"0x-wNJKzlAs","Greensleeves":"ShVCxhHYB3I","Morning Song":"zp1OAvOkFrs",
 "Shallow":"G5Jt1EcuMG4","Lovely":"bH0s16xd2Do","My Heart Will Go On":"prbzAG1zKV8",
 "Boig per tu":"LOtSwsG8-VM","Perfect":"gvqT2Rft9dk","Believer":"tZvieGpvbFw",
 "El Golpe (The Entertainer)":"dP8pwyYaa7g","Primavera de Vivaldi":"8sFtPajQ-XA","Romance":"oiMhrhbaCk0",
 "Scherzo":"OD2Kl8J0Yt0","Sonatina en Sol mayor":"CE8eX1ZRjpw","Para Elisa":"q9bU12gXUyM",
}

def slug(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+","_",s.lower()).strip("_")

out={}
for base,(fn,yt) in M.items():
    sl=slug(base); path=SRC+fn
    pages=[]
    if os.path.exists(path):
        doc=fitz.open(path)
        for i,pg in enumerate(doc):
            p=f"scores/img/{sl}_{i+1}.png"
            pg.get_pixmap(dpi=150).save(p); pages.append(p)
        doc.close()
    else:
        print("  !! FALTA", fn)
    url=("https://www.youtube.com/watch?v="+VID[base]) if base in VID \
        else ("https://www.youtube.com/results?search_query="+urllib.parse.quote(yt))
    qp=f"scores/qr/{sl}.png"
    qr=qrcode.QRCode(border=1,box_size=10); qr.add_data(url); qr.make()
    qr.make_image(fill_color="#1b2433",back_color="white").save(qp)
    out[base]={"slug":sl,"pages":pages,"qr":qp,"yt":yt,"url":url}
    print(f"{base}: {len(pages)} pág")

json.dump(out,open("scores/map.json","w"),ensure_ascii=False,indent=1)
print("TOTAL piezas:",len(out))
