#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Crea un PDF A4 DESDE CERO con la informacion del HTML (no convierte el HTML).
Lee partials/diaNN.html, extrae el contenido y lo maqueta con ReportLab,
que pagina solo en hojas A4 (sin cortes ni huecos)."""
import glob, os, re, json
from bs4 import BeautifulSoup, NavigableString, Tag
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
    Spacer, Table, TableStyle, Flowable, KeepTogether, PageBreak, CondPageBreak, Image as RLImage)
from reportlab.platypus.flowables import HRFlowable
from reportlab.lib.styles import ParagraphStyle
from PIL import Image as PILImage

D="/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", D+"DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("SB", D+"DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("F", D+"DejaVuSerif.ttf"))
pdfmetrics.registerFont(TTFont("FB", D+"DejaVuSerif-Bold.ttf"))
pdfmetrics.registerFontFamily("S", normal="S", bold="SB", italic="S", boldItalic="SB")
pdfmetrics.registerFontFamily("F", normal="F", bold="FB", italic="F", boldItalic="FB")

INK=colors.HexColor("#23211c"); MUT=colors.HexColor("#827b6c"); LINE=colors.HexColor("#ddd4c0")
GOLD=colors.HexColor("#a8884e"); SLATE=colors.HexColor("#3d4f63"); WINE=colors.HexColor("#7a2e3a")
NAVY=colors.HexColor("#1b2433")
STG={"s1":colors.HexColor("#3c5d4a"),"s2":colors.HexColor("#33526e"),"s3":colors.HexColor("#7a2e3a")}
STGNAME={"s1":"Nivel 1 · Empiezo","s2":"Nivel 2 · Avanzo","s3":"Nivel 3 · Ya toco"}
PANELBG={"theory":colors.HexColor("#e9eef3"),"soft":colors.HexColor("#f3eee2"),
         "gold":colors.HexColor("#f0e7d2"),"warm":colors.HexColor("#e3f4f3")}
PANELH={"theory":SLATE,"soft":INK,"gold":colors.HexColor("#7c6224"),"warm":colors.HexColor("#1f7d7d")}
CW=210*mm-32*mm  # ancho util (margenes 16mm)

def P(font="S", size=9.3, lead=12.4, color=INK, align=0, sb=0, sa=0, ital=False):
    return ParagraphStyle("x",fontName=font,fontSize=size,leading=lead,textColor=color,
        alignment=align,spaceBefore=sb,spaceAfter=sa)

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
def inline(el):
    out=[]
    for c in el.children:
        if isinstance(c,NavigableString): out.append(esc(str(c)))
        elif isinstance(c,Tag):
            cls=c.get("class") or []
            inner=inline(c)
            if c.name in ("b","strong"): out.append("<b>%s</b>"%inner)
            elif c.name in ("em","i"): out.append("<i>%s</i>"%inner)
            elif c.name=="small": out.append('<font size=7.5 color="#827b6c">%s</font>'%inner)
            else: out.append(inner)
    return re.sub(r"\s+"," ","".join(out)).strip()

# ---------- componentes visuales ----------
class Keyboard(Flowable):
    def __init__(self,whites,blacks_hl,stage):
        Flowable.__init__(self); self.w=whites; self.bh=blacks_hl; self.stage=stage
        self.ww=21; self.wh=58; self.bw=12; self.bh_h=36; self.pad=16
        self.width=7*self.ww+8; self.height=self.wh+self.pad+6
    def wrap(self,aw,ah): return (self.width,self.height)
    def draw(self):
        c=self.canv; ww=self.ww; wh=self.wh; bw=self.bw
        x0=4; y0=4
        c.setLineWidth(0.6)
        for i,k in enumerate(self.w):
            x=x0+i*ww
            if k.get("hl"): c.setFillColor(colors.HexColor("#f7eecf"))
            elif k.get("hl2"): c.setFillColor(colors.HexColor("#e9eef3"))
            else: c.setFillColor(colors.white)
            c.setStrokeColor(colors.HexColor("#b9ad92"))
            c.rect(x,y0,ww,wh,fill=1,stroke=1)
            nm=k.get("name","")
            if nm:
                c.setFont("SB",6.2); c.setFillColor(MUT if not k.get("hl") else colors.HexColor("#7c6224"))
                c.drawCentredString(x+ww/2,y0+3,nm)
        bxidx={0:0,1:1,3:2,4:3,5:4}  # white index -> black slot
        for wi,slot in bxidx.items():
            x=x0+(wi+1)*ww-bw/2
            if slot in self.bh: c.setFillColor(GOLD)
            else: c.setFillColor(NAVY)
            c.setStrokeColor(NAVY); c.rect(x,y0+wh-self.bh_h,bw,self.bh_h,fill=1,stroke=1)
        # dedos
        for i,k in enumerate(self.w):
            f=k.get("finger")
            if f:
                x=x0+i*ww+ww/2; y=y0+wh+8
                c.setFillColor(STG.get(self.stage,INK)); c.circle(x,y,6,fill=1,stroke=0)
                c.setFillColor(colors.white); c.setFont("SB",6.5); c.drawCentredString(x,y-2.3,f)

def parse_kbd(kbd):
    whites=[]
    for wk in kbd.select(".wk"):
        cls=wk.get("class") or []
        fg=wk.select_one(".fg"); nn=wk.select_one(".nn")
        whites.append({"hl":"hl" in cls,"hl2":"hl2" in cls,
            "finger":fg.get_text(strip=True) if fg else None,
            "name":nn.get_text(strip=True) if nn else ""})
    blacks=set()
    leftmap={31:0,67:1,139:2,175:3,211:4}
    for bk in kbd.select(".bk"):
        cls=bk.get("class") or []
        if "hl" in cls:
            m=re.search(r"left:(\d+)px",bk.get("style","") or "")
            if m: blacks.add(leftmap.get(int(m.group(1)),-1))
    return whites,blacks

def scale_flow(sc):
    cells=[]
    for it in sc.select(".sc"):
        nt=it.select_one(".nt"); fn=it.select_one(".fn"); sm=it.select_one("small")
        t="<b>%s</b>"%esc(nt.get_text(strip=True) if nt else "")
        if fn: t+="<br/><font color='#3d4f63'><b>%s</b></font>"%esc(fn.get_text(strip=True))
        if sm: t+="<br/><font size=6 color='#827b6c'>%s</font>"%esc(sm.get_text(strip=True))
        cells.append(Paragraph(t,P("S",9,11,align=1)))
    if not cells: return None
    t=Table([cells],colWidths=[min(34,(CW-4)/len(cells))]*len(cells))
    t.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.5,LINE),("BACKGROUND",(0,0),(-1,-1),colors.white),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t

def chord_flow(boxes):
    cells=[]
    for cb in boxes:
        notes=[esc(b.get_text(strip=True)) for b in cb.find_all("b")]
        sym=cb.select_one(".sym")
        t="<br/>".join(notes)
        if sym: t+="<br/><font color='#a8884e'><b>%s</b></font>"%esc(sym.get_text(strip=True))
        cells.append(Paragraph(t,P("S",8.5,10.5,align=1)))
    if not cells: return None
    t=Table([cells],colWidths=[min(60,(CW-4)/len(cells))]*len(cells))
    t.setStyle(TableStyle([("GRID",(0,0),(-1,-1),0.5,LINE),("BACKGROUND",(0,0),(-1,-1),colors.white),
        ("VALIGN",(0,0),(-1,-1),"MIDDLE"),("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t

def rhythm_flow(rh):
    cells=[]
    for be in rh.select(".beat"):
        fig=be.select_one(".fig"); syl=be.select_one(".syl")
        t=""
        if fig: t+="<font size=12>%s</font>"%esc(fig.get_text(strip=True))
        if syl: t+="<br/><font color='#33526e'><b>%s</b></font>"%esc(syl.get_text(strip=True))
        cells.append(Paragraph(t,P("S",8.5,12,align=1)))
    if not cells: return None
    t=Table([cells],colWidths=[min(40,(CW-4)/len(cells))]*len(cells))
    t.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.5,LINE),("BACKGROUND",(0,0),(-1,-1),colors.white),
        ("VALIGN",(0,0),(-1,-1),"BOTTOM"),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    return t

def render_blocks(parent, stage, heading_color=INK):
    """Recorre hijos directos y devuelve flowables (paras y visuales)."""
    out=[]
    for ch in parent.children:
        if not isinstance(ch,Tag): continue
        cls=ch.get("class") or []
        if ch.name=="h4":
            out.append(Paragraph("<b>%s</b>"%inline(ch),P("SB",9.6,12,color=heading_color,sb=1,sa=2)))
        elif "kbd-cap" in cls:
            out.append(Paragraph("<i>%s</i>"%inline(ch),P("F",8,10.5,color=MUT,sa=2)))
        elif "kbd" in cls:
            w,b=parse_kbd(ch); out.append(Spacer(0,2)); out.append(Keyboard(w,b,stage))
        elif "scale" in cls:
            f=scale_flow(ch);  out.append(f) if f else None
        elif "rhythm" in cls:
            f=rhythm_flow(ch); out.append(f) if f else None
        elif ch.name=="p":
            txt=inline(ch)
            if txt: out.append(Paragraph(txt,P("S",9.2,12.3,sa=2)))
        elif ch.name=="div" and ch.select(".chordbox"):
            f=chord_flow(ch.select(".chordbox")); out.append(f) if f else None
        elif "chordbox" in cls:
            pass  # se gestiona en el div contenedor
    return out

def panel_flow(panel, stage):
    cls=panel.get("class") or []
    variant=None
    for v in ("theory","soft","gold","warm"):
        if ("panel--"+v) in cls: variant=v
    if "panel--quote" in cls:
        inner=[Paragraph("<i>%s</i>"%inline(panel),P("F",9.8,13,color=colors.HexColor("#4a463d")))]
        t=Table([[inner]],colWidths=[CW])
        t.setStyle(TableStyle([("LINEBEFORE",(0,0),(0,-1),2.4,GOLD),("LEFTPADDING",(0,0),(-1,-1),10),
            ("RIGHTPADDING",(0,0),(-1,-1),4),("TOPPADDING",(0,0),(-1,-1),3),("BOTTOMPADDING",(0,0),(-1,-1),3)]))
        return t
    bg=PANELBG.get(variant,colors.white); hc=PANELH.get(variant,INK)
    inner=render_blocks(panel,stage,hc)
    if not inner: inner=[Spacer(0,1)]
    t=Table([[inner]],colWidths=[CW])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),bg),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    return t

def two_flow(two, stage):
    panels=two.select(".panel")
    cells=[]
    for p in panels[:2]:
        cells.append(panel_inner_table(p,stage))
    while len(cells)<2: cells.append("")
    gw=(CW-8)/2
    t=Table([cells],colWidths=[gw,gw]);
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),0),
        ("RIGHTPADDING",(0,0),(0,0),8),("RIGHTPADDING",(1,0),(1,0),0),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    return t

def panel_inner_table(panel,stage,width=None):
    cls=panel.get("class") or []; hc=INK
    inner=render_blocks(panel,stage,hc)
    w=width or (CW-8)/2
    t=Table([[inner]],colWidths=[w])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.white),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),
        ("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    return t

def steps_flow(steps,stage):
    rows=[]
    col=STG.get(stage,INK)
    for i,st in enumerate(steps.select(".step"),1):
        txt=inline(st)
        num=Paragraph("<b>%d</b>"%i,P("FB",12,16,color=colors.white,align=1))
        body=Paragraph(txt,P("S",9,11.8))
        rows.append([num,body])
    t=Table(rows,colWidths=[10*mm,CW-10*mm])
    style=[("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,0),(0,-1),col),
        ("BACKGROUND",(1,0),(1,-1),colors.white),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("INNERGRID",(0,0),(-1,-1),0.6,LINE),("LEFTPADDING",(1,0),(1,-1),8),
        ("RIGHTPADDING",(1,0),(1,-1),8),("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]
    t.setStyle(TableStyle(style))
    return t

def hard_flow(hard,stage):
    cc=hard.select_one(".cc"); tt=hard.select_one(".tt")
    on=len(hard.select(".gauge i.on"))
    dots="●"*on+"○"*(5-on)
    top=Table([[Paragraph("<b>%s</b>  %s"%(esc(cc.get_text(strip=True)) if cc else "",
        esc(tt.get_text(strip=True)) if tt else ""),P("SB",9,12,color=colors.white)),
        Paragraph('<font color="#ffffff">%s</font>'%dots,P("S",9,12,color=colors.white,align=2))]],
        colWidths=[CW-70,70])
    top.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),WINE),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    body=[]
    for p in hard.select(".hard-body p"):
        lab=p.select_one(".lab")
        labtxt=esc(lab.get_text(strip=True)) if lab else ""
        rest=inline(p)
        body.append(Paragraph(rest,P("S",9,12,sa=2)))
    bt=Table([[body]],colWidths=[CW])
    bt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#f6e8e8")),
        ("BOX",(0,0),(-1,-1),0.6,colors.HexColor("#caa6a6")),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    return [top,bt]

def goals_flow(ul):
    out=[]
    for li in ul.select("li"):
        out.append(Paragraph("☐  "+inline(li),P("S",9,13,sa=1)))
    return out

def sec_heading(roman,h3,stage):
    col=STG.get(stage,INK)
    circ=Paragraph("<b>%s</b>"%esc(roman),P("FB",9.5,12,color=colors.white,align=1))
    ht=Paragraph("<b>%s</b>"%esc(h3),P("FB",13,15,color=INK))
    t=Table([[circ,ht]],colWidths=[10*mm,CW-10*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,0),(0,0),col),
        ("LEFTPADDING",(0,0),(0,0),1),("RIGHTPADDING",(0,0),(0,0),1),("ALIGN",(0,0),(0,0),"CENTER"),
        ("LEFTPADDING",(1,0),(1,0),7),("TOPPADDING",(0,0),(-1,-1),2),("BOTTOMPADDING",(0,0),(-1,-1),2),
        ("ROUNDEDCORNERS",[2,2,2,2])]))
    t.keepWithNext=True
    return t

def specs_flow(specs,stage):
    cells=[]
    for k,v in specs:
        cells.append(Paragraph("<font size=6 color='#827b6c'>%s</font><br/><b>%s</b>"%(esc(k.upper()),esc(v)),
            P("S",9.5,11.5)))
    n=len(cells); cw=CW/n
    t=Table([cells],colWidths=[cw]*n)
    t.setStyle(TableStyle([("BOX",(0,0),(-1,-1),0.6,LINE),("INNERGRID",(0,0),(-1,-1),0.6,LINE),
        ("BACKGROUND",(0,0),(-1,-1),colors.white),("VALIGN",(0,0),(-1,-1),"MIDDLE"),
        ("LEFTPADDING",(0,0),(-1,-1),5),("RIGHTPADDING",(0,0),(-1,-1),5),
        ("TOPPADDING",(0,0),(-1,-1),4),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    return t

def staff(fname, label=None, maxw=CW*0.98, ref=1400.0):
    path="notation/"+fname
    if not os.path.exists(path): return []
    iw,ih=PILImage.open(path).size
    w=iw*(150*mm)/ref
    if w>maxw: w=maxw
    h=w*ih/iw
    out=[]
    if label: out.append(Paragraph("♪ <b>%s</b>"%esc(label),P("SB",8.5,11,color=GOLD,sb=3,sa=2)))
    out.append(RLImage(path,width=w,height=h)); out.append(Spacer(0,2))
    return out

def norm_key(t):
    t=(t or "").lower()
    if "la menor" in t: return "Am"
    if "fa menor" in t: return "Fm"
    if "mi bemol" in t: return "Eb"
    if "do menor" in t: return "Cm"
    if "mi mayor" in t: return "E"
    if "do mayor" in t: return "C"
    if "fa mayor" in t: return "F"
    if "sol mayor" in t: return "G"
    return None

_INCIP={"himno de la alegr":"ode","para elisa":"furelise","jingle bells":"jingle",
        "yankee doodle":"yankee","tetris":"tetris"}
def incipit_for(title):
    tl=(title or "").lower()
    for k,v in _INCIP.items():
        if k in tl: return "incipit_%s.png"%v
    return None

SCORES = json.load(open("scores/map.json")) if os.path.exists("scores/map.json") else {}

def get_meta(path):
    soup=BeautifulSoup(open(path,encoding="utf-8").read(),"html.parser")
    sec=soup.find("section"); cls=sec.get("class") or []
    stage=next((c for c in cls if c in ("s1","s2","s3")),"s1")
    h2=sec.select_one(".day-head h2").get_text(strip=True)
    base=re.split(r"[·—]",h2)[0].strip()
    ton=""
    for sp in sec.select(".specs .sp"):
        if sp.select_one(".k").get_text(strip=True)=="Tonalidad":
            ton=sp.select_one(".v").get_text(strip=True)
    return base, norm_key(ton), stage

def score_img(path):
    iw,ih=PILImage.open(path).size
    fh=297*mm-30*mm
    w=CW; h=w*ih/iw
    if h>fh: h=fh; w=h*iw/ih
    return RLImage(path,width=w,height=h)

def piece_cover(base, key, stage):
    col=STG[stage]; chex="#%s"%col.hexval()[2:]; m=SCORES.get(base)
    out=[Spacer(0,26),HRFlowable(width="100%",thickness=3,color=col,spaceAfter=6,lineCap="round")]
    out.append(Paragraph("<b>%s</b>"%esc(STGNAME[stage]),P("S",9,12,color=col)))
    out.append(Paragraph("<b>%s</b>"%esc(base),P("FB",30,34,color=INK,sa=5)))
    out.append(Paragraph("Partitura · sesiones de estudio · taller de práctica",P("F",13,16,color=MUT,sa=12)))
    if m and os.path.exists(m["qr"]):
        note=Paragraph("<b>♪ Escucha la pieza al piano</b><br/>Escanea este código con la cámara del móvil "
              "para ver y oír esta pieza <b>tocada al piano</b>. Escucharla antes de tocarla ayuda muchísimo.",P("S",9.5,13))
        t=Table([[RLImage(m["qr"],width=30*mm,height=30*mm),note]],colWidths=[38*mm,CW-38*mm])
        t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("LEFTPADDING",(1,0),(1,0),8),
            ("BOX",(0,0),(-1,-1),0.6,LINE),("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#faf7f0")),
            ("TOPPADDING",(0,0),(-1,-1),8),("BOTTOMPADDING",(0,0),(-1,-1),8),("LEFTPADDING",(0,0),(0,0),8)]))
        out.append(t)
    out.append(Spacer(0,12))
    intro=("A continuación tienes <b>la partitura</b> de la pieza y, después, las <b>sesiones de estudio</b> "
        "para aprenderla paso a paso. Al final encontrarás un <b>taller de práctica al piano</b> con "
        "ejercicios técnicos en su tonalidad.")
    if not (m and m["pages"]):
        intro=("Para esta pieza, trabaja con tu partitura original. Después tienes las <b>sesiones de estudio</b> "
            "y, al final, un <b>taller de práctica al piano</b>.")
    out.append(Paragraph("<i>%s</i>"%intro,P("F",11,15,color=colors.HexColor("#4a463d"))))
    # ---- Zona de anotaciones (aprovecha el espacio de la hoja del QR) ----
    out.append(Spacer(0,20))
    out.append(HRFlowable(width="100%",thickness=0.8,color=LINE,spaceAfter=7))
    out.append(Paragraph("<font color='%s'><b>MIS ANOTACIONES SOBRE LA PIEZA</b></font>"%chex,P("SB",11,14,sa=1)))
    out.append(Paragraph("<i>Apunta aquí lo que necesites recordar: digitaciones, pasajes difíciles, dinámicas, "
        "objetivos de tempo o lo que corrija la profesora.</i>",P("F",9.5,12.5,color=MUT,sa=8)))
    labels=["Fecha de inicio","Tempo objetivo   ♩ =","Nivel alcanzado   ★"]
    lab=[Paragraph("<font color='#827b6c'>%s</font>"%esc(x),P("S",8,10)) for x in labels]
    fld=Table([lab],colWidths=[CW/3.0]*3,rowHeights=[26])
    fld.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBELOW",(0,0),(-1,-1),0.7,col),
        ("LEFTPADDING",(0,0),(-1,-1),2),("RIGHTPADDING",(0,0),(-1,-1),10),("TOPPADDING",(0,0),(-1,-1),1)]))
    out.append(fld); out.append(Spacer(0,16))
    nlines=13
    rl=Table([[""] for _ in range(nlines)],colWidths=[CW],rowHeights=[21]*nlines)
    rl.setStyle(TableStyle([("LINEBELOW",(0,0),(-1,-1),0.5,LINE),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    out.append(rl)
    return out

# ---- Taller de práctica: MENÚ DE ACTIVIDADES VARIADAS propio de cada pieza ----
# clave = título base de la obra (h2 hasta el primer · o —)
# cada actividad = (etiqueta_tipo, título, descripción)  · la etiqueta muestra la variedad
WORKSHOPS = {
 "Himno de la Alegría":[
   ("Oído","Cántala antes de tocarla","canta «Mi-Mi-Fa-Sol» señalando las teclas sin pulsarlas; oírla primero fija la melodía en la cabeza."),
   ("Ritmo","Palmea la frase","da palmadas al ritmo de toda la frase antes de tocarla; cuando el ritmo esté en el cuerpo, las notas caen solas."),
   ("Reto","Tres veces sin fallo","tócala entera tres veces seguidas sin parar; si te equivocas, vuelves a empezar la cuenta. Gana la calma, no la prisa."),
   ("Juego","Invéntate el final","sobre los acordes Do y Sol, improvisa tú cuatro notas para cerrar el himno a tu gusto.")],
 "Yankee Doodle":[
   ("Oído","Búscala de oído","canta «Yankee Doodle» y luego encuéntrala en el teclado sin mirar la partitura, nota a nota."),
   ("Ritmo","El pie es la marcha","marca el pulso con el pie mientras tocas: el pie desfila, las manos tocan encima."),
   ("Dinámica","La banda que se aleja","toca la melodía fuerte (la banda cerca) y repítela suave (la banda alejándose)."),
   ("Reto","Sube el metrónomo","avanza de cinco en cinco pulsaciones hacia el tempo vivo; solo subes cuando sale limpio.")],
 "Alouette":[
   ("Carácter","Dos ánimos","ponle nombre a cada parte: A es «juego rápido», B es «descanso»; tócalas con dos caracteres distintos."),
   ("Juego","Diálogo con la profe","ella toca la sección A, tú respondes con la B, y os vais turnando."),
   ("Memoria","A de memoria","aprende la sección A sin partitura y tócala mirando solo tus manos."),
   ("Reto","A–B–A del tirón","encadena las tres secciones sin pausas ni tropiezos, tres veces seguidas.")],
 "Top Gun (Anthem)":[
   ("Manos","¿Juntas o arpegiadas?","toca los acordes de las dos manos a la vez; si oyes las notas «una tras otra», vuelve a atacarlas más juntas."),
   ("Dinámica","Trueno y eco","haz un acorde como un trueno (f) y el siguiente como un eco lejano (p)."),
   ("Reto","Acorde de 4 tiempos","sostén cada acorde contando «1-2-3-4» completo sin que el sonido decaiga."),
   ("Carácter","El despegue","imagina un avión despegando: crece desde casi nada hasta el máximo brillo.")],
 "Tetris (Korobéiniki)":[
   ("Manos","Izquierda en automático","toca el ostinato en bucle hasta poder hacerlo mientras hablas de otra cosa: eso es tenerlo automatizado."),
   ("Reto","Récord de saltos","salta la izquierda de octava sin mirar; cuenta cuántos aciertas seguidos e intenta batir tu marca."),
   ("Velocidad","Sube de nivel","toca el tema cada vez más rápido, como los niveles del videojuego, sin perder el pulso."),
   ("Carácter","Sabor ruso","acentúa fuerte la primera nota de cada grupo para darle aire de danza eslava.")],
 "Oh, When the Saints":[
   ("Ritmo","Entrar en el aire","cuenta en alto «…2-3-4» y da una palmada en el «1»; entra en anacrusa hasta que salga natural."),
   ("Manos","La banda que marcha","toca solo la izquierda encadenando Sol-Do-Re-Sol a tiempo, como una banda desfilando."),
   ("Juego","Acompaña cantando","con esos tres acordes acompaña mientras cantas (o canta la profe) la melodía."),
   ("Carácter","Swing de Nueva Orleans","tócala alegre y contagiosa, con ganas de que apetezca moverse.")],
 "La Pantera Rosa":[
   ("Carácter","De puntillas","notas muy ligeras y silencios bien marcados, como el gato acechando sin que le oigan."),
   ("Oído","El misterio cromático","sube medio tono a medio tono y párate en la nota que más «intriga» te dé."),
   ("Reto","Salto felino limpio","acierta la nota lejana de la octava cinco veces seguidas sin mirar el teclado."),
   ("Dinámica","El zarpazo","toca el motivo muy suave y remátalo con un golpe sorpresa (sf) al final.")],
 "El Submarino Amarillo":[
   ("Manos","Manos al revés","primero MD ligada y MI picada; luego cámbialo, para que las dos manos sepan hacer las dos cosas."),
   ("Juego","Canta el estribillo","canta «We all live in a yellow submarine» mientras tocas el acompañamiento."),
   ("Carácter","Fiesta a bordo","tócalo alegre y rítmico, con la izquierda saltarina y buen humor."),
   ("Reto","Sin contagios","mantén cada mano con su articulación durante ocho compases sin que se «peguen».")],
 "Ejercicios a cuatro manos":[
   ("Reto","Arranque clavado","la profe respira y entráis en el mismo instante; repetid hasta empezar exactamente juntos."),
   ("Oído","Tocar escuchando","encaja mirando/oyendo la otra parte, no tus propias manos."),
   ("Ritmo","Pulso común","contad los dos en alto el «1-2-3-4» para no perder el pulso compartido."),
   ("Juego","Cambiad de papel","hoy llevas tú la melodía, mañana el acompañamiento; entiende las dos partes.")],
 "Jingle Bells":[
   ("Manos","La inversión más cómoda","toca el mismo acorde en sus tres posiciones y quédate con la que menos mueve la mano."),
   ("Reto","Cambio veloz","pasa entre dos acordes cercanos sin saltar la mano; cronométrate y mejora tu marca."),
   ("Juego","A dúo","tú la melodía, otra persona los acordes… y luego intercambiáis."),
   ("Carácter","Cascabeles","tócala ligera y brillante, sin peso, como campanillas.")],
 "We Wish You a Merry Christmas":[
   ("Ritmo","Balanceo de vals","pie en el «1» y palmadas suaves en «2-3»; siente el vaivén ternario antes de tocar."),
   ("Oído","Tensión y descanso","toca A7 y escucha su tirón; resuélvelo a Re y nota el alivio: ese viaje es la gracia."),
   ("Manos","Bajo-acorde-acorde","izquierda sola en ese patrón durante toda la canción, sin frenar en los cambios."),
   ("Reto","La melodía que sube","encadena las oleadas cada vez más arriba sin fallar la entrada.")],
 "Trouble":[
   ("Memoria","Acordes a ciegas","aprende los cuatro acordes y fórmalos con los ojos cerrados al oír su nombre."),
   ("Juego","Improvisa encima","inventa una melodía sencilla con la derecha sobre los acordes de la izquierda: crea, no leas."),
   ("Carácter","El secreto menor","toca el giro a menor más íntimo y bajito, como si contaras un secreto."),
   ("Reto","De memoria","encadena toda la vuelta de acordes sin mirar el cifrado.")],
 "Eye of the Tiger":[
   ("Ritmo","A contratiempo","marca el pulso con el pie y palmea la síncopa antes de tocar el riff «entre» los tiempos."),
   ("Manos","Power chord deslizante","la misma forma de quinta (sin 3ª) que baja de Do-Sol a Sib-Fa y a Lab-Mib."),
   ("Reto","El riff diez veces","tócalo diez veces seguidas sin perder la síncopa: es el corazón de la canción."),
   ("Carácter","Actitud de ring","seco, fuerte y decidido, como un boxeador subiendo al cuadrilátero.")],
 "The Beginner":[
   ("Manos","La apoyatura ligera","notita rapidísima antes de la nota buena, sin robarle tiempo; empieza muy lento."),
   ("Reto","Ni antes ni tarde","encaja cada apoyatura justo sobre el pulso del Secondo, clavada en su sitio."),
   ("Ritmo","Vals a tres","ligero y saltarín, sin pisar los tiempos débiles del compás."),
   ("Juego","Prueba las dos partes","turnaos tocando Primo y Secondo para entender la pieza entera.")],
 "Sonatina en La menor":[
   ("Oído","El imán de la dominante","toca La menor (reposo) y Mi (tensión) y reconoce de oído cómo Mi «pide» volver a La."),
   ("Carácter","Que salga el sol","al llegar a Do mayor cambia el color a más luminoso, mismo tempo, otra cara."),
   ("Manos","Sincronía con la profe","cuenta la entrada juntas y encaja tu parte con el segundo piano."),
   ("Reto","Exposición sin parar","toca la primera parte entera manteniendo el pulso firme de principio a fin.")],
 "Heart and Soul":[
   ("Memoria","El bucle mítico","aprende Do-Lam-Fa-Sol en la izquierda hasta que salga sin pensar."),
   ("Juego","Tontea al piano","improvisa una melodía tuya con la derecha sobre ese bucle: es el clásico de «juguetear»."),
   ("Ritmo","Dale swing","atrasa un poco las notas débiles y marca el pulso firme con el pie."),
   ("Reto","Sin mirar","toca el bucle sin mirar las manos mientras cantas la melodía.")],
 "Greensleeves":[
   ("Ritmo","Vals melancólico","bajo en el «1» y acorde en «2-3»; siente el balanceo triste del 3/4."),
   ("Oído","El color de Sol#","escucha el paso Am→E (con Sol#): esa alteración es la que da el color; búscala de oído."),
   ("Pedal","Limpiar el sonido","pisa el pedal después de cada acorde y cámbialo al siguiente sin emborronar."),
   ("Dinámica","Guarda la fuerza","llega al forte creciendo poco a poco, no de golpe.")],
 "Morning Song":[
   ("Memoria","Las cuatro negras","localiza Fa#-Do#-Sol#-Re# sin mirar, diciendo su nombre: son la armadura de Mi mayor."),
   ("Manos","Dobles notas clavadas","dos notas a la vez (sexta) que suenen exactamente juntas, ni una antes que la otra."),
   ("Carácter","El amanecer","empieza de la nada y ve creciendo la luz, como el sol que sale despacio."),
   ("Reto","La cadena de sextas","desliza las sextas manteniendo la distancia sin que se desajusten los ataques.")],
 "Shallow":[
   ("Manos","Arpegio-goteo","desgrana Sol-Re-Si-Re parejo y regular, como gotas que caen igual."),
   ("Ritmo","Anticiparse","practica entrar un pelín antes del tiempo contando bien, sin descuadrarte."),
   ("Dinámica","Crescendo por escalones","crece hacia el estribillo por peldaños y guarda el ff para el clímax."),
   ("Juego","Canta y acompaña","canta el estribillo mientras la izquierda mantiene el arpegio.")],
 "Lovely":[
   ("Manos","Arpegio en espejo","las dos manos abren y cierran simétricas; míralas moverse iguales."),
   ("Manos","Melodía sobre arpegio","la derecha canta legato mientras la izquierda no detiene el arpegio."),
   ("Carácter","Más íntimo","en el giro a Mi menor bájalo de volumen y hazlo más triste."),
   ("Reto","Ocho compases sin cortes","melodía ligada y arpegio constante durante ocho compases seguidos.")],
 "My Heart Will Go On":[
   ("Manos","Legato profundo","hunde cada tecla y no la sueltes hasta pulsar la siguiente; deja pesar el brazo."),
   ("Carácter","Frase en arco","cada frase crece hacia el centro y se apaga; respira al terminarla."),
   ("Pedal","Pedal sincopado","baja el acorde y después cambia el pedal, para que no se emborrone el sonido."),
   ("Reto","No acortar lo largo","cuenta en alto las notas largas para no comértelas ni acelerar.")],
 "Boig per tu":[
   ("Manos","Acordes cálidos","todas las notas del acorde juntas y sostenidas, sin arpegiar, con sonido lleno."),
   ("Oído","Sostenidos de paso","localiza las notas alteradas de paso y tócalas con naturalidad dentro de la línea."),
   ("Carácter","Balada con alma","tócala con sentimiento, sin prisa, dejando respirar cada frase."),
   ("Juego","Canta en catalán","canta la letra mientras acompañas con los acordes.")],
 "Perfect":[
   ("Ritmo","Mecer en 6/8","cuenta «1-2-3 / 4-5-6» en dos pulsos: es un vaivén mecido, no seis golpes iguales."),
   ("Manos","Arpegio suave","el arpegio de acompañamiento, regular y con la mano relajada."),
   ("Reto","El bajo que sube","enlaza Re/Fa#→Sol en el bajo sin que se note el salto."),
   ("Juego","Canción de boda","canta el estribillo sobre tu arpegio y tócalo con ternura.")],
 "Believer":[
   ("Ritmo","Tri-pe-te","di «tri-pe-te» y palmea el tresillo; las tres notas exactamente iguales."),
   ("Manos","Latido constante","el ostinato de la izquierda como un latido mecánico que no varía."),
   ("Reto","Tres contra dos","una mano tres notas, la otra dos, en el mismo tiempo; muy lento hasta que encajen solas."),
   ("Carácter","Tambor tribal","fuerza contenida que va creciendo, como un tambor que se acerca.")],
 "El Golpe (The Entertainer)":[
   ("Manos","La izquierda reloj","bajo-acorde-bajo-acorde firme como un metrónomo, sin acelerar jamás."),
   ("Ritmo","Síncopa sobre staccato","derecha a contratiempo sobre izquierda regular y picada; júntalas muy lento."),
   ("Carácter","Pícaro y alegre","ragtime con una sonrisa, ligero, nunca pesado."),
   ("Reto","El cambio a Fa","enlaza el paso a Fa mayor (aparece Sib) sin ningún tropiezo.")],
 "Primavera de Vivaldi":[
   ("Manos","Muñeca que rebota","staccato veloz y ligero, notas cortas como pájaros saltando."),
   ("Dinámica","Acorde y eco","uno fuerte y su repetición suave, como pregunta y respuesta."),
   ("Oído","Encuentra el La#","busca la modulación a Si mayor: el momento en que aparece La# y cambia el color."),
   ("Reto","Ágil, no atropellada","sube el tempo del tema solo cuando salga limpio.")],
 "Romance":[
   ("Carácter","Como si tuviera letra","toca la melodía cantábile, ligada, respirando entre frases."),
   ("Dinámica","Crescendo en 4 peldaños","reparte la subida p-mp-mf-f sin adelantar el volumen."),
   ("Dinámica","Del mf al murmullo","aligera el brazo hasta que el último sonido sea casi un susurro."),
   ("Oído","El giro triste","siente el paso a Mi menor: cambia el carácter, no el tempo.")],
 "Scherzo":[
   ("Manos","Gotas de staccato","muñeca ligera, notas como gotas: es la broma del scherzo."),
   ("Memoria","Las tres negras del Trío","localiza Mib-Lab-Sib sin mirar el teclado."),
   ("Ritmo","Tresillos iguales","palmea «tri-pe-te» y que las tres notas suenen parejas."),
   ("Reto","Ir y volver del Trío","enlaza la transición Sol→Mib y la vuelta (D.C.) muy lento hasta automatizarlas.")],
 "Sonatina en Sol mayor":[
   ("Manos","Bajo-acorde-acorde","bajo grave y luego el acorde staccato: ese patrón es el motor del acompañamiento."),
   ("Reto","Blancas exactas","cuenta tus notas largas para que caigan justo sobre los acordes del otro piano."),
   ("Oído","Cámara con los oídos","escucha cómo tu melodía encaja con el Piano 2 mientras tocas."),
   ("Ritmo","El acorde de Sol","ataca Sol-Si-Re en bloque tres veces marcando el bajo Sol entre medias.")],
 "Para Elisa":[
   ("Manos","El temblor Mi–Re#","alterna Mi-Re# con dedos 2-1, ligero y sin acento: el famoso gesto de apertura."),
   ("Manos","Arpegios de la izquierda","desgrana La-Mi-La suave y regular, con la mano relajada."),
   ("Ritmo","Corcheas parejas","corcheas seguidas con las dos manos en 3/8, pulso igual, sin acelerar al enlazar."),
   ("Reto","La vuelta del tema","tras la sección B, recupera el tema con el tempo idéntico al del principio.")],
}
DEFAULT_WS=[("Manos","Manos separadas","estudia cada mano por separado, muy lento, antes de juntarlas."),
   ("Reto","Pasajes difíciles","aísla los compases marcados como exigentes y repítelos en bucle hasta que salgan limpios."),
   ("Ritmo","Con metrónomo","toca despacio con metrónomo y sube el tempo solo cuando salga sin fallo.")]

# ---- Ejercicios de piano COMPLEMENTARIOS: entrenan lo contrario a lo que domina en la pieza ----
# (si la obra sube mucho -> bajar; si es legato -> staccato; si es acordes -> arpegios; etc.)
DRILLS = {
 "Himno de la Alegría":[
   ("Escala descendente","el tema sube por grados; entrena la bajada: Do-Si-La-Sol-Fa-Mi-Re-Do a negras, pareja y sin acelerar."),
   ("Saltos de tercera","suelta la mano del movimiento por notas vecinas saltando de tercera: Do-Mi, Re-Fa, Mi-Sol, Fa-La…")],
 "Yankee Doodle":[
   ("Bajada en espejo","la melodía sube; equilíbrala bajando Sol-Fa-Mi-Re-Do a negras, con sonido parejo."),
   ("Notas repetidas con cambio de dedo","Do-Do-Do con dedos 3-2-1, ágil y ligero, para las notas repetidas del tema.")],
 "Alouette":[
   ("Escala ida y vuelta","sube y baja la escala de Do sin pararte en la cima; la vuelta debe sonar igual de medida que la ida."),
   ("Staccato de contraste","toca la melodía picada además de ligada, para dominar las dos articulaciones.")],
 "Top Gun (Anthem)":[
   ("Acordes rotos","la pieza es todo bloques; desgrana cada acorde nota a nota (Do-Mi-Sol) para conocerlo por dentro."),
   ("Encadenar bajando","enlaza los acordes descendiendo del agudo al grave, no solo subiendo.")],
 "Tetris (Korobéiniki)":[
   ("La menor descendente","el tema asciende; compénsalo bajando La-Sol-Fa-Mi-Re-Do-Si-La parejo."),
   ("Ostinato invertido","toca el patrón de la izquierda de agudo a grave, al revés de como suena.")],
 "Oh, When the Saints":[
   ("Melodía al revés","el arranque sube (Sol-Si-Do-Re); tócalo bajando (Re-Do-Si-Sol) como un reflejo."),
   ("Acordes descendentes","encadena V-IV-I bajando (Re-Do-Sol), no solo I-IV-V subiendo.")],
 "La Pantera Rosa":[
   ("Cromática descendente","baja medio tono a medio tono (Do-Si-Sib-La-Lab…), la cromática al revés."),
   ("Notas tenidas","sostén notas largas para contrastar con las notas cortas y saltarinas del tema.")],
 "El Submarino Amarillo":[
   ("Invierte las articulaciones","ahora MD staccato y MI legato, justo lo contrario de la pieza."),
   ("Legato en la izquierda","liga una escala descendente solo con la mano izquierda, que también aprenda a cantar.")],
 "Ejercicios a cuatro manos":[
   ("Movimiento contrario","una mano sube la escala y la otra la baja a la vez, partiendo del centro."),
   ("Unísono descendente","las dos manos bajan por grados a la vez, exactamente juntas.")],
 "Jingle Bells":[
   ("Arpegios descendentes","desgrana los acordes de agudo a grave (Re-Si-Sol) además de subiendo."),
   ("Escala de Sol descendente","baja Sol-Fa#-Mi-Re-Do-Si-La-Sol para equilibrar los ascensos del tema.")],
 "We Wish You a Merry Christmas":[
   ("Oleada descendente","la melodía sube en oleadas; tócala bajando en espejo, frase a frase."),
   ("Resolver hacia abajo","practica las séptimas resolviendo grave: D7→Sol, B7→Mi, con el bajo descendiendo.")],
 "Trouble":[
   ("Arpegios bajando","desgrana cada acorde (G, Em, Am, C) de agudo a grave."),
   ("Bajo descendente","encadena las fundamentales de los acordes en línea que baja por el teclado.")],
 "Eye of the Tiger":[
   ("Power chord ascendente","el riff baja (Do-Sib-Lab); tócalo subiendo (Lab-Sib-Do) con la misma forma de quinta."),
   ("Ritmo recto","toca el riff a tiempo, sin síncopa; luego recupera el contratiempo y notarás mejor su fuerza.")],
 "The Beginner":[
   ("Apoyatura desde arriba","el adorno cae desde abajo; prueba desde arriba (Fa→Mi) para dominar las dos."),
   ("Escala de Do en 3/4","baja la escala en tiempos de vals, ligera, para soltar la mano.")],
 "Sonatina en La menor":[
   ("Menor melódica descendente","baja la escala de La menor con Sol y Fa naturales, el color del descenso menor."),
   ("Arpegios bajando","desgrana La menor y Mi de agudo a grave, al revés de la exposición.")],
 "Heart and Soul":[
   ("Bucle al revés","toca el círculo de acordes en orden inverso (Sol-Fa-Lam-Do) para conocerlo por los dos lados."),
   ("Melodía descendente","improvisa una línea que baje sobre el bucle, para equilibrar las subidas.")],
 "Greensleeves":[
   ("La menor descendente en 3/4","baja la escala en tiempos de vals, ligada y triste."),
   ("Arpegios bajando","desgrana Am y E de agudo a grave, en vez de subir hacia la melodía.")],
 "Morning Song":[
   ("Sextas descendentes","desliza las dobles notas de sexta hacia abajo (Do#+La, Si+Sol#…), no solo subiendo."),
   ("Mi mayor descendente","baja la escala con sus cuatro sostenidos, notas parejas.")],
 "Shallow":[
   ("Arpegio descendente","el acompañamiento sube; tócalo bajando (Re-Si-Sol-Re) como reflejo."),
   ("Decrescendo","practica bajar el volumen poco a poco, lo contrario del gran crescendo de la pieza.")],
 "Lovely":[
   ("Arpegio solo descendente","desgrana el arpegio hacia abajo en las dos manos, sin la subida."),
   ("Movimiento contrario","una mano sube el arpegio mientras la otra lo baja a la vez.")],
 "My Heart Will Go On":[
   ("Legato descendente","liga una escala bajando con el mismo peso de brazo del tema."),
   ("Staccato ligero","toca picado y corto como contraste al legato profundo de la obra.")],
 "Boig per tu":[
   ("Acordes arpegiados bajando","la balada es en bloques; desgrana cada acorde de agudo a grave."),
   ("Bajo descendente","enlaza las fundamentales de los acordes en una línea que desciende.")],
 "Perfect":[
   ("Arpegio descendente en 6/8","baja Sol-Re-Si-Sol manteniendo el balanceo de dos pulsos."),
   ("Escala de Sol bajando","desciende en grupos de tres notas, parejo, sin acelerar.")],
 "Believer":[
   ("Tresillos descendentes","toca tresillos bajando la escala de Fa menor, tres notas iguales por tiempo."),
   ("Ostinato agudo","lleva el patrón grave a la mano derecha, invirtiendo los registros.")],
 "El Golpe (The Entertainer)":[
   ("Do descendente en staccato","baja la escala de Do picada y ligera, lo opuesto a los ascensos sincopados."),
   ("Bajo-acorde que baja","desplaza la izquierda bajando por el teclado, bajo y acorde, en vez de saltar arriba.")],
 "Primavera de Vivaldi":[
   ("Mi mayor descendente staccato","baja la escala picada con sus cuatro sostenidos, ágil y ligera."),
   ("Acordes desplegados bajando","desgrana los acordes de agudo a grave como contraste a los bloques.")],
 "Romance":[
   ("Frase descendente cantábile","liga una bajada con las mismas dinámicas, para que el descenso también cante."),
   ("Diminuendo subiendo","apaga el sonido mientras subes: el contraste del crescendo de la pieza.")],
 "Scherzo":[
   ("Mi bemol descendente","baja la escala del Trío con sus tres bemoles (Sib-Lab-Mib), parejo."),
   ("Legato de contraste","liga una frase larga frente al staccato saltarín que domina el scherzo.")],
 "Sonatina en Sol mayor":[
   ("Sol descendente en blancas","baja la escala en notas largas, contando los dos tiempos de cada una."),
   ("Acorde-bajo invertido","toca primero el acorde y luego el bajo, al revés del patrón bajo-acorde.")],
 "Para Elisa":[
   ("Arpegio descendente","el acompañamiento sube (La-Mi-La); tócalo bajando (Mi-Do-La) como reflejo."),
   ("Cromática Mi-Fa","practica el semitono hacia arriba (Mi-Fa), el contrario del Mi-Re# de la pieza.")],
}
DEFAULT_DR=[("Escala en las dos direcciones","sube y baja la escala de la tonalidad sin pararte en la cima."),
   ("Manos en movimiento contrario","una mano sube y la otra baja a la vez, partiendo del centro.")]

TAGCOL={"Ritmo":"#b5762b","Manos":"#6b7f52","Dinámica":"#8a6d3b","Memoria":"#7a5c86","Juego":"#b5762b",
   "Reto":"#a23b2e","Oído":"#3d6b7a","Velocidad":"#a23b2e","Carácter":"#8a6d3b","Pedal":"#6b7f52"}

EXJSON=json.load(open("exercises.json",encoding="utf-8")) if os.path.exists("exercises.json") else {}

def _star(c,cx,cy,r,fill=None,stroke=None,sw=1.5):
    import math
    p=c.beginPath()
    for i in range(10):
        ang=math.pi/2+i*math.pi/5; rr=r if i%2==0 else r*0.45
        x=cx+rr*math.cos(ang); y=cy+rr*math.sin(ang)
        (p.moveTo if i==0 else p.lineTo)(x,y)
    p.close()
    if fill: c.setFillColor(fill)
    c.setStrokeColor(stroke or INK); c.setLineWidth(sw)
    c.drawPath(p,fill=1 if fill else 0,stroke=1)

class PracticeTracker(Flowable):
    def __init__(self,col,w,h=98*mm):
        Flowable.__init__(self); self.col=col; self.w=w; self.height=h
    def wrap(self,aw,ah):
        # se estira para rellenar lo que quede de pagina (sin dejar huecos)
        self.height=max(98*mm, min(ah-3, 210*mm)); return (self.w,self.height)
    def draw(self):
        c=self.canv; w=self.w; h=self.height
        c.setFillColor(colors.HexColor("#fbf7ec")); c.setStrokeColor(self.col); c.setLineWidth(1.5)
        c.roundRect(0,0,w,h,12,fill=1,stroke=1)
        _star(c,15*mm,h-11*mm,4.5*mm,fill=GOLD,stroke=GOLD)
        c.setFillColor(self.col); c.setFont("SB",15); c.drawString(22*mm,h-13*mm,"Mi diario de práctica")
        c.setFillColor(INK); c.setFont("S",11); c.drawString(9*mm,h-23*mm,"Colorea una estrella cada día que practiques esta canción:")
        days=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]; gap=(w-20*mm)/7
        for i,d in enumerate(days):
            cx=10*mm+gap*i+gap/2; cy=h-42*mm
            _star(c,cx,cy,9*mm,fill=None,stroke=GOLD,sw=2)
            c.setFillColor(MUT); c.setFont("SB",9); c.drawCentredString(cx,cy-15*mm,d)
        c.setStrokeColor(LINE); c.setLineWidth(0.8); c.line(9*mm,h-64*mm,w-9*mm,h-64*mm)
        c.setFillColor(INK); c.setFont("SB",11.5); c.drawString(9*mm,h-74*mm,"¿Cómo me salió hoy? Rodea una carita:")
        faces=[("bien",colors.HexColor("#5bb85b")),("regular",GOLD),("difícil",WINE)]
        fx=9*mm
        for lab,fc in faces:
            c.setStrokeColor(fc); c.setLineWidth(2); c.setFillColor(colors.white)
            c.circle(fx+5*mm,h-84*mm,6*mm,fill=1,stroke=1)
            c.setFillColor(fc); c.circle(fx+3*mm,h-83*mm,0.9*mm,fill=1,stroke=0); c.circle(fx+7*mm,h-83*mm,0.9*mm,fill=1,stroke=0)
            c.setStrokeColor(fc); c.setLineWidth(1.4)
            if lab=="bien": c.arc(fx+2*mm,h-89*mm,fx+8*mm,h-83*mm,200,140)
            elif lab=="regular": c.line(fx+2.5*mm,h-86*mm,fx+7.5*mm,h-86*mm)
            else: c.arc(fx+2*mm,h-84*mm,fx+8*mm,h-78*mm,200,140)
            c.setFillColor(MUT); c.setFont("S",8.5); c.drawCentredString(fx+5*mm,h-95*mm,lab)
            fx+=30*mm
        c.setFillColor(INK); c.setFont("SB",11.5); c.drawString(w-78*mm,h-84*mm,"¡Ya me la sé!")
        _star(c,w-16*mm,h-86*mm,10*mm,fill=None,stroke=self.col,sw=2.2)
        # zona de dibujo que rellena el espacio sobrante
        if h>120*mm:
            c.setStrokeColor(LINE); c.setLineWidth(0.8); c.line(9*mm,h-102*mm,w-9*mm,h-102*mm)
            _star(c,14*mm,h-111*mm,3.5*mm,fill=GOLD,stroke=GOLD)
            c.setFillColor(self.col); c.setFont("SB",12); c.drawString(20*mm,h-113*mm,"Dibuja algo de esta canción:")

def workshop(base, key, stage):
    col=STG[stage]; chex="#%s"%col.hexval()[2:]
    out=[Spacer(0,4),HRFlowable(width="100%",thickness=2.6,color=col,spaceAfter=3,lineCap="round")]
    out.append(Paragraph("<b>%s · Taller de práctica</b>"%esc(STGNAME[stage]),P("S",8,10,color=col)))
    out.append(Paragraph("<b>Taller de práctica al piano · %s</b>"%esc(base),P("FB",18,21,sa=3)))
    out.append(Paragraph("<i>No es teoría, es <b>jugar</b> con la pieza: un menú de actividades distintas — de ritmo, de "
        "manos, de oído, de memoria, de inventar— pensadas para <b>esta</b> obra. Elige una o dos cada día, cámbialas, "
        "y pásalo bien mientras la dominas.</i>",
        P("F",10.5,14,color=colors.HexColor("#4a463d"),sa=7)))
    n=1
    for item in WORKSHOPS.get(base,DEFAULT_WS):
        tag,title,desc=item
        tc=TAGCOL.get(tag,"#a8884e")
        out.append(Paragraph(
            "<b>%d</b>&nbsp;&nbsp;<font color='%s'><b>%s</b></font>&nbsp; <b>%s</b> — %s"
            %(n,tc,esc(tag).upper(),esc(title),desc),
            P("S",9.6,13.4,sa=5))); n+=1
    # --- Ejercicios en pentagrama, propios de la partitura ---
    exs=EXJSON.get(base,[])
    if exs:
        out.append(Spacer(0,4))
        out.append(HRFlowable(width="100%",thickness=0.8,color=LINE,spaceAfter=5))
        out.append(Paragraph("<font color='%s'><b>EJERCICIOS AL PIANO · para tu partitura</b></font>"
            %chex,P("SB",10.5,13,sa=1)))
        out.append(Paragraph("<i>Cuatro ejercicios <b>en pentagrama</b>, de <b>dificultad progresiva</b> "
            "(<font name='S' color='#a8884e'>★</font> fácil → <font name='S' color='#a8884e'>★★★★</font> avanzado), para practicar cosas que "
            "salen en <b>esta</b> pieza: su ritmo, sus acordes, sus giros. Empieza por el <font name='S' color='#a8884e'>★</font> y sube cuando salga limpio.</i>",
            P("F",9.3,12.4,color=colors.HexColor("#4a463d"),sa=5)))
        for e in exs:
            lv=int(e.get("level",2)); stars="★"*lv+"☆"*(4-lv)
            ttl=Table([[Paragraph("<font color='%s'><b>♪ %s</b></font>"%(chex,esc(e["title"])),P("SB",9.8,12.6)),
                Paragraph("<font color='#a8884e'>%s</font>"%stars,P("S",9.5,12,align=2))]],
                colWidths=[CW*0.72,CW*0.28])
            ttl.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                ("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),0),("VALIGN",(0,0),(-1,-1),"MIDDLE")]))
            blk=[ttl, Paragraph("<i>%s</i>"%esc(e["instr"]),P("F",8.8,11.6,color=colors.HexColor("#4a463d"),sa=1))]
            blk+=staff("ex_%s.png"%e["id"])
            out.append(KeepTogether(blk))
            out.append(Spacer(0,4))
    out.append(Spacer(0,6)); out.append(PracticeTracker(col,CW))
    return out


def day_flowables(path):
    soup=BeautifulSoup(open(path,encoding="utf-8").read(),"html.parser")
    sec=soup.find("section")
    cls=sec.get("class") or []
    stage=next((c for c in cls if c in ("s1","s2","s3")),"s1")
    col=STG[stage]
    stlbl=sec.select_one(".stage-lbl"); sess=sec.select_one(".sess")
    title=sec.select_one(".day-head h2"); comp=sec.select_one(".composer")
    specs=[(sp.select_one(".k").get_text(strip=True),sp.select_one(".v").get_text(strip=True))
           for sp in sec.select(".specs .sp")]
    head=[]
    head.append(HRFlowable(width="100%",thickness=2.6,color=col,spaceBefore=0,spaceAfter=3,lineCap="round"))
    row=Table([[Paragraph("<b>%s</b>"%esc(stlbl.get_text(strip=True) if stlbl else STGNAME[stage]),
            P("S",8,10,color=col)),
        Paragraph("<i>%s</i>"%esc(sess.get_text(strip=True) if sess else ""),P("F",8.5,10,color=MUT,align=2))]],
        colWidths=[CW*0.6,CW*0.4])
    row.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
        ("TOPPADDING",(0,0),(-1,-1),0),("BOTTOMPADDING",(0,0),(-1,-1),1)]))
    head.append(row)
    head.append(Paragraph("<b>%s</b>"%esc(title.get_text(strip=True)),P("FB",19,22,color=INK,sa=1)))
    if comp: head.append(Paragraph("<i>%s</i>"%inline(comp),P("F",10.5,13,color=colors.HexColor("#4a463d"),sa=4)))
    head.append(specs_flow(specs,stage))
    flow=[Spacer(0,5),KeepTogether(head),Spacer(0,4)]
    ttl=title.get_text(strip=True)
    specd={k:v for k,v in specs}
    inc=incipit_for(ttl)
    if inc: flow += staff(inc, "El tema · primeros compases")
    for s in sec.select(".sec"):
        roman=s.select_one(".rn"); h3=s.select_one(".sec-h h3")
        rtxt=roman.get_text(strip=True) if roman else ""
        flow.append(sec_heading(rtxt, h3.get_text(strip=True) if h3 else "",stage))
        flow.append(Spacer(0,2))
        if rtxt=="III":
            kk=norm_key(specd.get("Tonalidad",""))
            if kk: flow += staff("scale_%s.png"%kk, "Escala y arpegio de la tonalidad · calentamiento")
        for ch in s.children:
            if not isinstance(ch,Tag): continue
            ccls=ch.get("class") or []
            if "sec-h" in ccls: continue
            if "two" in ccls: flow.append(two_flow(ch,stage))
            elif "panel" in ccls: flow.append(panel_flow(ch,stage))
            elif "steps" in ccls: flow.append(steps_flow(ch,stage))
            elif "hard" in ccls: flow.extend(hard_flow(ch,stage))
            elif ch.name=="ul" and "goals" in ccls: flow.extend(goals_flow(ch))
            elif ch.name=="p" and ch.select_one(".metro"):
                flow.append(Paragraph("<i>%s</i>"%inline(ch),P("F",9,12,color=colors.HexColor("#4a463d"),sb=2)))
            elif ch.name=="p" and "lede" in ccls:
                flow.append(Paragraph("<i>%s</i>"%inline(ch),P("F",9.8,12.6,color=colors.HexColor("#4a463d"),sa=2)))
            elif ch.name=="p":
                flow.append(Paragraph(inline(ch),P("S",9.2,12.3,sa=2)))
        flow.append(Spacer(0,2))
    return flow

# ---------- portada / indice / contraportada ----------
if os.path.exists("index.json"):
    REP=[(lvl,[tuple(x) for x in items]) for lvl,items in json.load(open("index.json",encoding="utf-8"))]
else:
    REP=[]

def index_flow():
    out=[Spacer(0,2),Paragraph("<font size=8 color='#a8884e'><b>CONTENIDO</b></font>",P("S",8,10)),
        Paragraph("<b>El repertorio del cuaderno</b>",P("FB",19,22,sa=2)),
        HRFlowable(width="100%",thickness=2,color=GOLD,spaceAfter=5),
        Paragraph("Estas son las obras que trabajaremos, ordenadas por dificultad (no por fechas): "
                  "<b>cada alumno avanza a su propio ritmo</b>.",P("S",9.2,12,sa=5))]
    for lvl,items in REP:
        rows=[[Paragraph("<b><i>%s</i></b>"%esc(lvl),P("F",10.5,12,color=INK)),"",""]]
        for o,c,t in items:
            rows.append([Paragraph("<b>%s</b>"%esc(o),P("S",8.6,10.5)),
                Paragraph(esc(c),P("S",8.4,10.5,color=colors.HexColor("#4a463d"))),
                Paragraph(esc(t),P("S",8.4,10.5,color=colors.HexColor("#4a463d")))])
        t=Table(rows,colWidths=[CW*0.46,CW*0.30,CW*0.24])
        ts=[("LINEBELOW",(0,0),(-1,0),1.2,INK),("SPAN",(0,0),(-1,0)),
            ("BACKGROUND",(0,0),(-1,0),colors.HexColor("#f3eee2")),
            ("TOPPADDING",(0,0),(-1,-1),2.3),("BOTTOMPADDING",(0,0),(-1,-1),2.3),
            ("LEFTPADDING",(0,0),(-1,-1),6),("LINEBELOW",(0,1),(-1,-1),0.4,LINE),("VALIGN",(0,0),(-1,-1),"MIDDLE")]
        t.setStyle(TableStyle(ts)); out.append(t); out.append(Spacer(0,4))
    return out

LOGO="/tmp/logo.png"
def draw_cover(c,doc):
    w,h=A4
    c.setFillColor(colors.HexColor("#faf7f0")); c.rect(0,0,w,h,fill=1,stroke=0)
    c.setStrokeColor(GOLD); c.setLineWidth(1); c.rect(13*mm,13*mm,w-26*mm,h-26*mm,fill=0,stroke=1)
    c.setStrokeColor(LINE); c.rect(16*mm,16*mm,w-32*mm,h-32*mm,fill=0,stroke=1)
    c.setFillColor(GOLD); c.setFont("S",11)
    c.drawCentredString(w/2,h-40*mm,"M É T O D O   D E   P I A N O   T - C L A S")
    if os.path.exists(LOGO):
        s=78*mm; c.drawImage(LOGO,(w-s)/2,h-150*mm,s,s,mask='auto')
    c.setFillColor(INK)
    _title="El Cuaderno del Pianista"; _maxw=w-64*mm; _fs=40
    while _fs>20 and c.stringWidth(_title,"FB",_fs)>_maxw: _fs-=0.5
    c.setFont("FB",_fs); c.drawCentredString(w/2,h-178*mm,_title)
    c.setFillColor(colors.HexColor("#4a463d")); c.setFont("F",16)
    c.drawCentredString(w/2,h-190*mm,"Canciones para empezar a tocar  ·  para Arnau")
    c.setStrokeColor(GOLD); c.setLineWidth(1.4); c.line(60*mm,55*mm,w-60*mm,55*mm)
    c.setFillColor(colors.HexColor("#4a463d")); c.setFont("F",13)
    c.drawCentredString(w/2,44*mm,"Curso de Piano · Material de estudio para el alumno")
    c.setFillColor(MUT); c.setFont("S",9)
    c.drawCentredString(w/2,37*mm,"E D I C I Ó N   D E   S E P T I E M B R E")

def draw_seal(c,doc):
    w,h=A4
    if os.path.exists(LOGO):
        s=11*mm; c.drawImage(LOGO,w-3*mm-s,h-3*mm-s,s,s,mask='auto')
    c.setFillColor(MUT); c.setFont("S",7.5)
    c.drawCentredString(w/2,8*mm,"El Cuaderno del Pianista · T-Clas")

def build():
    doc=BaseDocTemplate("El-Cuaderno-del-Pianista-TClas.pdf",pagesize=A4,
        leftMargin=16*mm,rightMargin=16*mm,topMargin=14*mm,bottomMargin=14*mm)
    frame=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height,id="f",
        leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="cover",frames=[frame],onPage=draw_cover),
        PageTemplate(id="main",frames=[frame],onPage=draw_seal)])
    story=[]
    from reportlab.platypus.doctemplate import NextPageTemplate
    story.append(NextPageTemplate("main")); story.append(PageBreak())  # pagina 1 = portada
    story+=index_flow()
    files=sorted(glob.glob("partials/dia*.html"))
    groups=[]
    for f in files:
        base,key,stage=get_meta(f)
        if groups and groups[-1]["base"]==base: groups[-1]["files"].append(f)
        else: groups.append({"base":base,"key":key,"stage":stage,"files":[f]})
    for g in groups:
        m=SCORES.get(g["base"])
        story.append(PageBreak()); story+=piece_cover(g["base"],g["key"],g["stage"])   # portada+QR
        for p in (m["pages"] if m else []):
            story.append(PageBreak()); story.append(score_img(p))                       # partitura
        for f in g["files"]:
            story.append(PageBreak()); story+=day_flowables(f)                          # sesiones
        # el taller sigue tras "Objetivos de la sesión" si hay sitio (evita hojas medio vacías);
        # solo salta a hoja nueva si queda muy poco espacio
        story.append(CondPageBreak(78*mm)); story+=workshop(g["base"],g["key"],g["stage"])  # taller
    doc.build(story)
    print("PDF creado:",doc.page,"paginas")

if __name__=="__main__":
    build()
