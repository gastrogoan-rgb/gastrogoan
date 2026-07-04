#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""El Piano de Arnau — cuaderno para peque con base (7 años).
Por cada cancion, 4 paginas:
 1) Partitura + QR para escuchar.
 2) Aprende de la partitura: teoria REAL aplicada (notas, posicion y dedos,
    ritmo, acordes, un tip de la propia partitura).
 3) Ejercicios en pentagrama, sencillos pero utiles, aplicados a la cancion.
 4) Pagina creativa para pintar/dibujar.
Visual y colorido, pero con contenido de verdad."""
import os, math, io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as canv
from PIL import Image as PImage
import fitz, qrcode, verovio, cairosvg

FONT="/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", FONT+"DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("SB", FONT+"DejaVuSans-Bold.ttf"))
tk=verovio.toolkit()

SKY=colors.HexColor("#4db6e6"); SUN=colors.HexColor("#ffcb3d"); CORAL=colors.HexColor("#ff6f61")
GRASS=colors.HexColor("#5bb85b"); GRAPE=colors.HexColor("#ab6dd8"); INK=colors.HexColor("#2e3a46")
CREAM=colors.HexColor("#fff8e7"); PINKB=colors.HexColor("#ffd6e0"); BLUEB=colors.HexColor("#d6ecff")
GREENB=colors.HexColor("#e2f5da"); YELB=colors.HexColor("#fff2c4"); PURPB=colors.HexColor("#f0e2ff")
LINE=colors.HexColor("#c9bfa8"); MUT=colors.HexColor("#8a97a1")
NOTECOL=[CORAL,SUN,GRASS,SKY,GRAPE,colors.HexColor("#ff9a3d"),colors.HexColor("#e84f8a")]
W,H=A4

# ---------- primitivas de dibujo ----------
def rrect(c,x,y,w,h,r,fill=None,stroke=None,sw=2):
    if fill: c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(sw)
    c.roundRect(x,y,w,h,r,fill=1 if fill else 0,stroke=1 if stroke else 0)

def star(c,cx,cy,r,col,rot=0):
    c.setFillColor(col); p=c.beginPath()
    for i in range(10):
        ang=math.pi/2+rot+i*math.pi/5; rr=r if i%2==0 else r*0.45
        x=cx+rr*math.cos(ang); y=cy+rr*math.sin(ang)
        (p.moveTo if i==0 else p.lineTo)(x,y)
    p.close(); c.drawPath(p,fill=1,stroke=0)

def eighth(c,cx,cy,r,col,filled=True):
    c.setFillColor(col); c.circle(cx,cy,r,fill=1,stroke=0)
    if not filled:
        c.setFillColor(colors.white); c.circle(cx,cy,r*0.5,fill=1,stroke=0)
    c.setStrokeColor(col); c.setLineWidth(r*0.42); c.line(cx+r*0.85,cy,cx+r*0.85,cy+r*3.0)

def title_banner(c,y,title,sub,col,h=18*mm):
    rrect(c,15*mm,y,W-30*mm,h,9,fill=col)
    star(c,25*mm,y+h/2,4.5,colors.white); star(c,W-25*mm,y+h/2,4.5,colors.white)
    c.setFillColor(colors.white)
    if sub:
        c.setFont("SB",19); c.drawCentredString(W/2,y+h*0.50+1,title)
        c.setFont("S",9.5); c.drawCentredString(W/2,y+h*0.20-1,sub)
    else:
        c.setFont("SB",21); c.drawCentredString(W/2,y+h/2-3.5,title)

def footer(c):
    c.setFillColor(MUT); c.setFont("S",8.5); c.drawCentredString(W/2,9*mm,"El Piano de Arnau  ·  T-Clas")

def keyboard(c,x,y,kw,kh,marks=None,fingers=None,octaves=1):
    marks=marks or {}; fingers=fingers or {}
    whites=["Do","Re","Mi","Fa","Sol","La","Si"]*octaves
    c.setLineWidth(1.8)
    for i,nm in enumerate(whites):
        xx=x+i*kw; col=marks.get(nm)
        c.setFillColor(col if col else colors.white); c.setStrokeColor(INK)
        c.roundRect(xx,y,kw,kh,2.5,fill=1,stroke=1)
        if nm in fingers:  # circulo con numero de dedo
            c.setFillColor(INK); c.circle(xx+kw/2,y+kh+4*mm,3.6*mm,fill=1,stroke=0)
            c.setFillColor(colors.white); c.setFont("SB",9); c.drawCentredString(xx+kw/2,y+kh+4*mm-3,str(fingers[nm]))
        if col or nm=="Do":
            c.setFillColor(colors.white if col else INK); c.setFont("SB",kw*0.32)
            c.drawCentredString(xx+kw/2,y+5,nm)
    for o in range(octaves):
        for bp in [0,1,3,4,5]:
            idx=o*7+bp; bx=x+(idx+1)*kw-kw*0.30
            c.setFillColor(INK); c.roundRect(bx,y+kh*0.42,kw*0.6,kh*0.58,1.5,fill=1,stroke=0)

def note_value(c,x,y,kind,col,label):
    # dibuja negra/blanca con etiqueta de tiempos
    filled = kind=="negra"
    c.setFillColor(col if filled else colors.white); c.setStrokeColor(col); c.setLineWidth(2)
    c.circle(x,y,6,fill=1,stroke=1)
    c.setLineWidth(2.4); c.setStrokeColor(col); c.line(x+5.2,y,x+5.2,y+22)
    c.setFillColor(INK); c.setFont("S",9.5); c.drawCentredString(x+2,y-16,label)

def chord_card(c,x,y,w,name,notes,col):
    rrect(c,x,y,w,20*mm,7,fill=colors.white,stroke=col,sw=1.8)
    c.setFillColor(col); c.setFont("SB",15); c.drawCentredString(x+w/2,y+13*mm,name)
    c.setFillColor(INK); c.setFont("S",10); c.drawCentredString(x+w/2,y+5*mm,notes)

# ---------- pentagrama (Verovio) ----------
def render_ex(abc,name):
    tk.setOptions({"inputFrom":"abc","adjustPageHeight":True,"pageWidth":1500,"scale":42,
        "footer":"none","header":"none","pageMarginTop":4,"pageMarginBottom":4,"pageMarginLeft":4,"pageMarginRight":4})
    tk.loadData(abc); svg=tk.renderToSVG(1)
    png=cairosvg.svg2png(bytestring=svg.encode(),output_width=2000)
    im=PImage.open(io.BytesIO(png)).convert("RGBA")
    g=PImage.alpha_composite(PImage.new("RGBA",im.size,(255,255,255,0)),im).convert("L")
    bb=g.point(lambda p:0 if p>245 else 255).getbbox()
    if bb:
        m=14; bb=(max(0,bb[0]-m),max(0,bb[1]-m),min(im.size[0],bb[2]+m),min(im.size[1],bb[3]+m)); im=im.crop(bb)
    out=PImage.new("RGB",im.size,(255,255,255)); out.paste(im,mask=im.split()[3])
    os.makedirs("eximg",exist_ok=True); p="eximg/"+name+".png"; out.save(p); return p

def draw_img(c,path,x,y,maxw,maxh):
    iw,ih=PImage.open(path).size; sc=min(maxw/iw,maxh/ih); dw,dh=iw*sc,ih*sc
    c.drawImage(path,x+(maxw-dw)/2,y,dw,dh,mask='auto'); return dh

def make_qr(url,name):
    os.makedirs("qr",exist_ok=True); p="qr/"+name+".png"
    q=qrcode.QRCode(border=1,box_size=10); q.add_data(url); q.make()
    q.make_image(fill_color="#2e3a46",back_color="white").save(p); return p

# ==================== PÁGINAS ====================
def page_score(c,P):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-30*mm,P["title"],P["subtitle"],SKY)
    # fila de datos + QR
    fy=H-52*mm
    rrect(c,15*mm,fy,W-30*mm,16*mm,8,fill=BLUEB,stroke=SKY,sw=1.5)
    facts=[("Tonalidad",P["key"]),("Compás",P["meter"]),("Manos",P["hands"])]
    fw=(W-30*mm-30*mm)/3
    for i,(k,v) in enumerate(facts):
        fx=20*mm+i*fw
        c.setFillColor(MUT); c.setFont("S",8.5); c.drawString(fx,fy+10.5*mm,k.upper())
        c.setFillColor(INK); c.setFont("SB",11.5); c.drawString(fx,fy+4*mm,v)
    if P.get("_qr"):
        c.drawImage(P["_qr"],W-33*mm,fy+1.5*mm,13*mm,13*mm)
        c.setFillColor(SKY); c.setFont("SB",7.5); c.drawCentredString(W-26.5*mm,fy-1.5*mm,"escúchala")
    # partitura
    img=P.get("_scoreimg")
    if img and os.path.exists(img):
        iw,ih=PImage.open(img).size; maxw=W-34*mm; maxh=fy-24*mm
        sc=min(maxw/iw,maxh/ih); dw,dh=iw*sc,ih*sc
        rrect(c,(W-dw)/2-5,fy-8*mm-dh-6,dw+10,dh+12,8,fill=colors.white,stroke=LINE,sw=1.5)
        c.drawImage(img,(W-dw)/2,fy-8*mm-dh,dw,dh,mask='auto')
    footer(c)

def page_learn(c,P):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-24*mm,"Aprende de esta canción","Lo que enseña la partitura",GRASS,h=16*mm)
    x0=15*mm; ww=W-30*mm; y=H-31*mm
    # 1) las notas que usas
    h1=50*mm; rrect(c,x0,y-h1,ww,h1,10,fill=BLUEB,stroke=SKY,sw=1.6)
    c.setFillColor(INK); c.setFont("SB",13.5); c.drawString(21*mm,y-9*mm,"1 · Las notas que usas")
    c.setFont("S",10.5); c.drawString(21*mm,y-15.5*mm,P["notes_txt"])
    keyboard(c,W/2-7*17*mm/2,y-h1+7*mm,17*mm,22*mm,marks=P["notes_marks"])
    # 2) tu mano derecha
    y2=y-h1-6*mm; h2=58*mm; rrect(c,x0,y2-h2,ww,h2,10,fill=GREENB,stroke=GRASS,sw=1.6)
    c.setFillColor(INK); c.setFont("SB",13.5); c.drawString(21*mm,y2-9*mm,"2 · Tu mano derecha (posición y dedos)")
    c.setFont("S",10.5); c.drawString(21*mm,y2-15.5*mm,P["hand_txt"])
    keyboard(c,W/2-7*17*mm/2,y2-h2+8*mm,17*mm,22*mm,fingers=P["fingers"])
    # 3) el ritmo  +  4) acordes  (fila de dos)
    y3=y2-h2-6*mm; h3=44*mm; halfw=(ww-4*mm)/2
    rrect(c,x0,y3-h3,halfw,h3,10,fill=YELB,stroke=SUN,sw=1.6)
    c.setFillColor(INK); c.setFont("SB",13); c.drawString(21*mm,y3-9*mm,"3 · El ritmo")
    note_value(c,27*mm,y3-22*mm,"negra",CORAL,"1 tiempo")
    note_value(c,49*mm,y3-22*mm,"blanca",SKY,"2 tiempos")
    c.setFillColor(INK); c.setFont("S",9.5); c.drawString(21*mm,y3-37*mm,P["rhythm_txt"])
    rx=x0+halfw+4*mm; rrect(c,rx,y3-h3,halfw,h3,10,fill=PINKB,stroke=CORAL,sw=1.6)
    c.setFillColor(INK); c.setFont("SB",13); c.drawString(rx+6*mm,y3-9*mm,"4 · Acordes (mano izq.)")
    cw=(halfw-16*mm)/3
    for i,(nm,nt) in enumerate(P["chords"]):
        chord_card(c,rx+5*mm+i*(cw+3*mm),y3-h3+8*mm,cw,nm,nt,NOTECOL[i%len(NOTECOL)])
    # 5) TIP
    y5=y3-h3-6*mm; h5=26*mm; rrect(c,x0,y5-h5,ww,h5,10,fill=PURPB,stroke=GRAPE,sw=1.6)
    star(c,24*mm,y5-h5/2,5.5,GRAPE)
    c.setFillColor(GRAPE); c.setFont("SB",13); c.drawString(31*mm,y5-9*mm,"TIP de la partitura")
    c.setFillColor(INK); c.setFont("S",11); c.drawString(31*mm,y5-16.5*mm,P["tip"])
    footer(c)

def page_exercises(c,P):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-24*mm,"Ejercicios al piano","Practica de verdad, paso a paso",CORAL,h=16*mm)
    y=H-32*mm
    boxcol=[GREENB,BLUEB,YELB,PINKB]; edge=[GRASS,SKY,SUN,CORAL]
    n=len(P["exercises"]); avail=(y-20*mm)-(n-1)*5*mm; bh=avail/n
    for i,ex in enumerate(P["exercises"]):
        rrect(c,15*mm,y-bh,W-30*mm,bh,10,fill=boxcol[i%4],stroke=edge[i%4],sw=1.6)
        c.setFillColor(INK); c.setFont("SB",13); c.drawString(20*mm,y-9*mm,f"{i+1} · {ex['title']}")
        c.setFont("S",10); c.drawString(20*mm,y-15*mm,ex["txt"])
        if ex.get("_img"): draw_img(c,ex["_img"],22*mm,y-bh+4*mm,W-44*mm,bh-20*mm)
        y-=bh+5*mm
    footer(c)

def page_creative(c,P):
    c.setFillColor(colors.white); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-24*mm,"¡A crear!","Colorea, decora y dibuja tu música",GRAPE,h=16*mm)
    # colorea las notas por su nombre
    c.setFillColor(INK); c.setFont("SB",12); c.drawString(18*mm,H-36*mm,"Colorea cada nota del color que quieras y escribe su nombre:")
    for i in range(6):
        cx=32*mm+i*28*mm; c.setStrokeColor(INK); c.setLineWidth(2.4); c.setFillColor(colors.white)
        c.circle(cx,H-52*mm,9,fill=1,stroke=1); c.setLineWidth(2.2); c.line(cx+8,H-52*mm,cx+8,H-52*mm+26)
        c.setStrokeColor(INK); c.roundRect(cx-9,H-70*mm,18,9*mm,2,fill=0,stroke=1)  # cajita nombre
    # teclado grande para pintar el DO
    c.setFillColor(INK); c.setFont("SB",12); c.drawString(18*mm,H-84*mm,"Pinta de rojo TODAS las teclas DO y toca una:")
    kw=(W-36*mm)/7
    for i,nm in enumerate(["Do","Re","Mi","Fa","Sol","La","Si"]):
        xx=18*mm+i*kw; c.setStrokeColor(INK); c.setLineWidth(2); c.setFillColor(colors.white)
        c.roundRect(xx,H-112*mm,kw,22*mm,3,fill=1,stroke=1)
        c.setFillColor(INK); c.setFont("S",kw*0.26); c.drawCentredString(xx+kw/2,H-109*mm,nm)
    for bp in [0,1,3,4,5]:
        bx=18*mm+(bp+1)*kw-kw*0.30; c.setFillColor(INK); c.roundRect(bx,H-112*mm+22*mm*0.42,kw*0.6,22*mm*0.58,2,fill=1,stroke=0)
    # marco Mi dibujo
    dy=26*mm; dh=H-150*mm
    c.setStrokeColor(GRAPE); c.setLineWidth(3); c.setFillColor(colors.HexColor("#fbf6ff"))
    c.roundRect(18*mm,dy,W-36*mm,dh,12,fill=1,stroke=1)
    c.setFillColor(GRAPE); c.setFont("SB",13); c.drawString(24*mm,dy+dh-11*mm,"Mi dibujo")
    c.setFillColor(INK); c.setFont("S",11); c.drawString(24*mm,dy+dh-17.5*mm,P["draw_prompt"])
    for cx in (28*mm,W-28*mm): star(c,cx,dy+10*mm,5,SUN)
    footer(c)

# ==================== BUILD ====================
def build(pieces,outfile):
    c=canv.Canvas(outfile,pagesize=A4); os.makedirs("scoreimg",exist_ok=True)
    for P in pieces:
        if os.path.exists(P["score"]):
            d=fitz.open(P["score"]); d[0].get_pixmap(dpi=200).save("scoreimg/"+P["id"]+".png"); d.close()
            P["_scoreimg"]="scoreimg/"+P["id"]+".png"
        if P.get("video"): P["_qr"]=make_qr("https://www.youtube.com/watch?v="+P["video"],P["id"])
        for ex in P["exercises"]:
            ex["_img"]=render_ex(ex["abc"],P["id"]+"_"+ex["k"])
        page_score(c,P); c.showPage()
        page_learn(c,P); c.showPage()
        page_exercises(c,P); c.showPage()
        page_creative(c,P); c.showPage()
    c.save(); print("PDF:",outfile,"·",len(pieces)*4,"paginas")

# -------- MUESTRA v2: Baa Baa Black Sheep --------
if __name__=="__main__":
    PIECES=[{
      "id":"baabaa","title":"Baa Baa Black Sheep","subtitle":"Canción tradicional  ·  arr. sencillo",
      "score":"src/Baa Baa Black Sheep.pdf","video":"69KUnCs_460",
      "key":"Do mayor","meter":"4/4","hands":"Melodía + acordes",
      "notes_txt":"Esta canción usa estas notas (todas teclas blancas):",
      "notes_marks":{"Do":CORAL,"Re":SUN,"Mi":GRASS,"Fa":SKY,"Sol":GRAPE,"La":colors.HexColor("#ff9a3d")},
      "hand_txt":"Coloca la mano en posición de DO: un dedo en cada tecla, del 1 al 5.",
      "fingers":{"Do":1,"Re":2,"Mi":3,"Fa":4,"Sol":5},
      "rhythm_txt":"Mezcla negras y blancas.",
      "chords":[("DO","Do-Mi-Sol"),("FA","Fa-La-Do"),("SOL","Sol-Si-Re")],
      "tip":"La mano derecha canta la melodía y la izquierda acompaña con 3 acordes: DO, FA y SOL.",
      "draw_prompt":"Dibuja la escena de la canción y decórala con notas musicales.",
      "exercises":[
        {"k":"pos","title":"Posición de 5 dedos en DO","h":30*mm,
         "txt":"Toca subiendo y bajando; un dedo por tecla (mira los números).",
         "abc":"X:1\nM:4/4\nL:1/4\nK:C\nC D E F|G F E D|C4|]\nw:1 2 3 4 5 4 3 2 1"},
        {"k":"mel","title":"La melodía (mano derecha)","h":32*mm,
         "txt":"El principio de la canción. Debajo tienes el nombre de cada nota.",
         "abc":"X:1\nM:4/4\nL:1/4\nK:C\nC C G G|A A G2|F F E E|D D C2|]\nw:Do Do Sol Sol La La Sol Fa Fa Mi Mi Re Re Do"},
        {"k":"cho","title":"Los 3 acordes de la izquierda","h":30*mm,
         "txt":"Toca los tres acordes juntos, con la mano izquierda, en clave de Fa.",
         "abc":"X:1\nM:4/4\nL:1/4\nK:C clef=bass\n[C,E,G,]2 [F,A,C]2|[G,B,D]2 [C,E,G,]2|]\nw:DO FA SOL DO"},
        {"k":"rit","title":"El ritmo (palméalo primero)","h":28*mm,
         "txt":"Da palmadas contando 1-2-3-4; luego tócalo en la nota DO.",
         "abc":"X:1\nM:4/4\nL:1/4\nK:C\nC C C C|C C C2|]\nw:1 2 3 4 1 2 3-4"},
      ],
    }]
    build(PIECES,"MUESTRA2-Arnau.pdf")
