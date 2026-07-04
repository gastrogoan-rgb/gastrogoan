#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""El Piano de Arnau — cuaderno infantil (7 años).
Por cada canción: (1) portada+partitura, (2) info infantil + ejercicios sencillos,
(3) pagina creativa para pintar/dibujar. Todo grande, colorido y sencillo."""
import os, math
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as canv
import fitz

FONT="/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", FONT+"DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("SB", FONT+"DejaVuSans-Bold.ttf"))

# paleta alegre
SKY=colors.HexColor("#4db6e6"); SUN=colors.HexColor("#ffcb3d"); CORAL=colors.HexColor("#ff6f61")
GRASS=colors.HexColor("#6fbf5b")
GRAPE=colors.HexColor("#ab6dd8"); INK=colors.HexColor("#2e3a46"); CREAM=colors.HexColor("#fff8e7")
PINKB=colors.HexColor("#ffd6e0"); BLUEB=colors.HexColor("#d6ecff"); GREENB=colors.HexColor("#e0f5d8")
YELB=colors.HexColor("#fff2c4"); LINE=colors.HexColor("#c9bfa8")
NOTECOL=[CORAL,SUN,GRASS,SKY,GRAPE,colors.HexColor("#ff9a3d"),colors.HexColor("#e84f8a")]
W,H=A4

def rrect(c,x,y,w,h,r,fill=None,stroke=None,sw=2):
    if fill: c.setFillColor(fill)
    if stroke: c.setStrokeColor(stroke); c.setLineWidth(sw)
    c.roundRect(x,y,w,h,r,fill=1 if fill else 0,stroke=1 if stroke else 0)

def star(c,cx,cy,r,col,rot=0):
    c.setFillColor(col); p=c.beginPath();
    for i in range(10):
        ang=math.pi/2+rot+i*math.pi/5; rr=r if i%2==0 else r*0.45
        x=cx+rr*math.cos(ang); y=cy+rr*math.sin(ang)
        (p.moveTo if i==0 else p.lineTo)(x,y)
    p.close(); c.drawPath(p,fill=1,stroke=0)

def eighth(c,cx,cy,r,col):
    # nota (cabeza + plica + corchea) sencilla
    c.setFillColor(col); c.circle(cx,cy,r,fill=1,stroke=0)
    c.setStrokeColor(col); c.setLineWidth(r*0.5)
    c.line(cx+r*0.85,cy,cx+r*0.85,cy+r*3.2)
    c.setFillColor(col); pth=c.beginPath()
    pth.moveTo(cx+r*0.85,cy+r*3.2); pth.curveTo(cx+r*2.4,cy+r*2.6,cx+r*2.2,cy+r*1.2,cx+r*1.1,cy+r*1.5)
    pth.lineTo(cx+r*0.85,cy+r*2.0); pth.close(); c.drawPath(pth,fill=1,stroke=0)

def note_head_outline(c,cx,cy,r):
    # cabeza de nota para COLOREAR (solo contorno)
    c.setStrokeColor(INK); c.setLineWidth(2.4); c.setFillColor(colors.white)
    c.circle(cx,cy,r,fill=1,stroke=1)
    c.line(cx+r*0.9,cy,cx+r*0.9,cy+r*3.4)
    pth=c.beginPath(); pth.moveTo(cx+r*0.9,cy+r*3.4)
    pth.curveTo(cx+r*2.6,cy+r*2.7,cx+r*2.3,cy+r*1.2,cx+r*1.15,cy+r*1.6);
    c.drawPath(pth,fill=0,stroke=1)

def clef_outline(c,cx,cy,s):
    # clave de sol estilizada (contorno, para colorear)
    c.setStrokeColor(INK); c.setLineWidth(3); c.setFillColor(colors.white)
    p=c.beginPath()
    p.moveTo(cx,cy-2.6*s); p.curveTo(cx+1.4*s,cy-1.2*s,cx-1.4*s,cy-0.2*s,cx,cy+1.1*s)
    p.curveTo(cx+1.7*s,cy+2.4*s,cx+0.2*s,cy+3.6*s,cx-0.7*s,cy+2.7*s)
    p.curveTo(cx-1.5*s,cy+1.9*s,cx-0.4*s,cy+0.9*s,cx+0.2*s,cy-0.4*s)
    p.curveTo(cx+0.9*s,cy-2.0*s,cx-0.6*s,cy-2.9*s,cx-0.5*s,cy-1.6*s)
    c.drawPath(p,fill=0,stroke=1)
    c.circle(cx-0.5*s,cy-2.7*s,0.35*s,fill=0,stroke=1)

def keyboard(c,x,y,kw,kh,marks=None,octaves=1,label_do=True):
    """teclado grande; marks: dict nombre-> color para resaltar teclas blancas.
    nombres blancos: Do Re Mi Fa Sol La Si"""
    marks=marks or {}
    whites=["Do","Re","Mi","Fa","Sol","La","Si"]*octaves
    n=len(whites)
    c.setLineWidth(2)
    for i,nm in enumerate(whites):
        xx=x+i*kw
        col=marks.get(nm+str(i//7)) or marks.get(nm)
        c.setFillColor(col if col else colors.white); c.setStrokeColor(INK)
        c.roundRect(xx,y,kw,kh,3,fill=1,stroke=1)
        if col or label_do and nm=="Do":
            c.setFillColor(INK if not col else colors.white); c.setFont("SB",kw*0.34)
            c.drawCentredString(xx+kw/2,y+6,nm)
    # negras (grupos 2-3)
    blackpos=[0,1,3,4,5]
    for o in range(octaves):
        for bp in blackpos:
            idx=o*7+bp
            bx=x+(idx+1)*kw-kw*0.30
            c.setFillColor(INK); c.roundRect(bx,y+kh*0.42,kw*0.6,kh*0.58,2,fill=1,stroke=0)

def big_notes(c,x,y,seq,r=13,gap=52):
    """fila de notas gordas de colores con el nombre dentro; seq: [(nombre,color_idx)]"""
    for i,(nm,ci) in enumerate(seq):
        cx=x+i*gap; col=NOTECOL[ci%len(NOTECOL)]
        c.setFillColor(col); c.circle(cx,y,r,fill=1,stroke=0)
        c.setFillColor(colors.white); c.setFont("SB",r*0.82)
        c.drawCentredString(cx,y-r*0.34,nm)

def page_footer(c,txt):
    c.setFillColor(colors.HexColor("#9aa7b0")); c.setFont("S",8.5)
    c.drawCentredString(W/2,10*mm,txt)

def title_banner(c,y,title,sub,col):
    rrect(c,16*mm,y,W-32*mm,20*mm,10,fill=col)
    star(c,26*mm,y+10*mm,5,colors.white); star(c,W-26*mm,y+10*mm,5,colors.white)
    c.setFillColor(colors.white); c.setFont("SB",23)
    c.drawCentredString(W/2,y+8.5*mm,title)
    if sub:
        c.setFont("S",11); c.drawCentredString(W/2,y+3.2*mm,sub)

# ---------------- PÁGINAS ----------------
def page_score(c,P):
    # fondo
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-34*mm,P["title_es"],P["title"]+"  ·  "+P["key"],SKY)
    # notitas decorativas
    for i,cx in enumerate([22*mm,W-22*mm]):
        eighth(c,cx,H-46*mm,5,SUN if i==0 else CORAL)
    # partitura embebida (imagen del PDF original)
    img=P["_scoreimg"]
    if img and os.path.exists(img):
        from PIL import Image as PImage
        iw,ih=PImage.open(img).size
        maxw=W-40*mm; maxh=H-90*mm
        sc=min(maxw/iw, maxh/ih); dw,dh=iw*sc,ih*sc
        rrect(c,(W-dw)/2-5,H-46*mm-dh-6,dw+10,dh+12,8,fill=colors.white,stroke=LINE,sw=1.5)
        c.drawImage(img,(W-dw)/2,H-46*mm-dh, dw,dh,mask='auto')
    page_footer(c,"El Piano de Arnau  ·  T-Clas")

def page_info_ex(c,P):
    c.setFillColor(CREAM); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-30*mm,"¿Qué es esta canción?","",GRASS)
    y=H-40*mm
    # caja info infantil
    rrect(c,16*mm,y-40*mm,W-32*mm,40*mm,10,fill=BLUEB,stroke=SKY,sw=1.5)
    c.setFillColor(INK); c.setFont("SB",13); c.drawString(22*mm,y-9*mm," La historia")
    c.setFont("S",12.5)
    yy=y-17*mm
    for line in P["about"]:
        c.setFillColor(CORAL); c.circle(24*mm,yy+3,2.2,fill=1,stroke=0)
        c.setFillColor(INK); c.drawString(28*mm,yy,line); yy-=7.2*mm
    # ¿Sabías que?
    rrect(c,16*mm,y-63*mm,W-32*mm,20*mm,10,fill=YELB,stroke=SUN,sw=1.5)
    c.setFillColor(colors.HexColor("#a5761b")); c.setFont("SB",12); c.drawString(22*mm,y-51*mm," ¿Sabías que…?")
    c.setFillColor(INK); c.setFont("S",11.5); c.drawString(22*mm,y-58.5*mm,P["fact"])

    # EJERCICIOS
    ey=y-74*mm
    title_banner(c,ey-8*mm,"¡A jugar con el piano!","",CORAL)
    # 1) encuentra el DO
    b1=ey-52*mm
    rrect(c,16*mm,b1,W-32*mm,40*mm,10,fill=GREENB,stroke=GRASS,sw=1.5)
    c.setFillColor(INK); c.setFont("SB",12.5); c.drawString(22*mm,b1+33*mm,"1  ·  Encuentra el DO")
    c.setFont("S",10.5); c.drawString(22*mm,b1+27*mm,"El DO está justo a la izquierda de las 2 teclas negras juntas.")
    keyboard(c,26*mm,b1+6*mm,16*mm,18*mm,marks={"Do":CORAL},octaves=1)
    # 2) toca el principio (notas gordas)
    b2=b1-40*mm
    rrect(c,16*mm,b2,W-32*mm,36*mm,10,fill=PINKB,stroke=CORAL,sw=1.5)
    c.setFillColor(INK); c.setFont("SB",12.5); c.drawString(22*mm,b2+28*mm,"2  ·  Toca el principio")
    c.setFont("S",10.5); c.drawString(22*mm,b2+22*mm,P["ex_text"])
    big_notes(c,32*mm,b2+9*mm,P["melody"],r=11,gap=(W-64*mm)/max(1,len(P["melody"])-1) if len(P["melody"])>1 else 40)
    page_footer(c,"El Piano de Arnau  ·  T-Clas")

def page_creative(c,P):
    c.setFillColor(colors.white); c.rect(0,0,W,H,fill=1,stroke=0)
    title_banner(c,H-30*mm,"¡A PINTAR Y CREAR!","Colorea, dibuja y decora",GRAPE)
    # elementos para colorear (contornos)
    c.setFillColor(INK); c.setFont("SB",13); c.drawString(18*mm,H-42*mm,"Colorea las notas y la clave de sol:")
    clef_outline(c,32*mm,H-70*mm,9)
    for i in range(5):
        note_head_outline(c,58*mm+i*26*mm,H-74*mm,8)
    # teclado para colorear el DO
    c.setFillColor(INK); c.setFont("SB",12.5); c.drawString(18*mm,H-92*mm,"Pinta de rojo las teclas DO:")
    c.setLineWidth(2)
    kw=17*mm
    for i,nm in enumerate(["Do","Re","Mi","Fa","Sol","La","Si"]):
        xx=18*mm+i*kw; c.setStrokeColor(INK); c.setFillColor(colors.white)
        c.roundRect(xx,H-118*mm,kw,20*mm,3,fill=1,stroke=1)
        c.setFillColor(INK); c.setFont("S",kw*0.28); c.drawCentredString(xx+kw/2,H-115*mm,nm)
    for bp in [0,1,3,4,5]:
        bx=18*mm+(bp+1)*kw-kw*0.30; c.setFillColor(INK)
        c.roundRect(bx,H-118*mm+20*mm*0.42,kw*0.6,20*mm*0.58,2,fill=1,stroke=0)
    # marco "Mi dibujo"
    dy=28*mm; dh=H-160*mm
    c.setStrokeColor(GRAPE); c.setLineWidth(3); c.setFillColor(colors.HexColor("#fbf6ff"))
    c.roundRect(18*mm,dy,W-36*mm,dh,12,fill=1,stroke=1)
    c.setFillColor(GRAPE); c.setFont("SB",14); c.drawString(24*mm,dy+dh-11*mm," Mi dibujo")
    c.setFillColor(INK); c.setFont("S",12); c.drawString(24*mm,dy+dh-18*mm,P["draw_prompt"])
    # estrellitas en las esquinas
    for cx,cy in [(28*mm,dy+10*mm),(W-28*mm,dy+10*mm)]:
        star(c,cx,cy,5,SUN)
    page_footer(c,"El Piano de Arnau  ·  T-Clas")

def render_score_img(pdfpath,out):
    d=fitz.open(pdfpath); d[0].get_pixmap(dpi=200).save(out); d.close(); return out

def build(pieces,outfile):
    c=canv.Canvas(outfile,pagesize=A4)
    os.makedirs("scoreimg",exist_ok=True)
    for P in pieces:
        P["_scoreimg"]=render_score_img(P["score"],"scoreimg/"+P["id"]+".png") if os.path.exists(P["score"]) else None
        page_score(c,P); c.showPage()
        page_info_ex(c,P); c.showPage()
        page_creative(c,P); c.showPage()
    c.save(); print("PDF:",outfile)

# ---------------- MUESTRA: 1 canción ----------------
if __name__=="__main__":
    PIECES=[{
      "id":"baabaa","title":"Baa Baa Black Sheep","title_es":"La Ovejita Negra",
      "score":"src/Baa Baa Black Sheep.pdf","key":"en DO",
      "about":[
        "Es una canción muy antigua de una ovejita negra muy suave.",
        "La ovejita tiene lana para llenar ¡tres sacos enteros!",
        "Se toca en DO, la nota más fácil de encontrar.",
      ],
      "fact":"¡Es la misma melodía que 'Estrellita, dónde estás'!",
      "ex_text":"Busca cada nota en el piano y tócala con un dedito:",
      "melody":[("Do",0),("Do",0),("Sol",3),("Sol",3),("La",4),("La",4),("Sol",3)],
      "draw_prompt":"Dibuja tu ovejita negra con su lana blandita.",
    }]
    build(PIECES,"MUESTRA-Arnau.pdf")
