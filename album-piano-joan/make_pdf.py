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
    Spacer, Table, TableStyle, Flowable, KeepTogether, PageBreak, Image as RLImage)
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
STGNAME={"s1":"Etapa I · Fundamentos","s2":"Etapa II · Desarrollo","s3":"Etapa III · Maestría"}
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
    col=STG[stage]; m=SCORES.get(base)
    out=[Spacer(0,26),HRFlowable(width="100%",thickness=3,color=col,spaceAfter=6,lineCap="round")]
    out.append(Paragraph("<b>%s</b>"%esc(STGNAME[stage]),P("S",9,12,color=col)))
    out.append(Paragraph("<b>%s</b>"%esc(base),P("FB",30,34,color=INK,sa=5)))
    out.append(Paragraph("Partitura · sesiones de estudio · taller de práctica",P("F",13,16,color=MUT,sa=12)))
    if m and os.path.exists(m["qr"]):
        note=Paragraph("<b>♪ Escucha la pieza</b><br/>Escanea este código con la cámara del móvil "
              "para oír una versión de referencia. Escuchar la obra antes de tocarla ayuda muchísimo.",P("S",9.5,13))
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
    return out

# ---- Ejercicios de taller PROPIOS de cada pieza (según su reto técnico real) ----
# clave = título base de la obra (h2 hasta el primer · o —)
WORKSHOPS = {
 "Himno de la Alegría":[
   ("Grados conjuntos parejos","toca el tema Mi-Mi-Fa-Sol / Sol-Fa-Mi-Re muy lento; como todo se mueve por notas vecinas, busca que cada nota pese <b>exactamente igual</b> que la anterior, sin bultos."),
   ("El descenso central","aísla la bajada de la frase central y repítela cinco veces seguidas vigilando que <b>no se acelere</b> al bajar; el descenso debe sonar tan medido como la subida."),
   ("Manos juntas a bloque","añade la izquierda con un acorde por compás (Do–Sol–Do) y comprueba que cae justo con la primera nota de la melodía.")],
 "Yankee Doodle":[
   ("Pulso de marcha","toca la melodía marcando con el pie el <b>1</b> y el <b>3</b> del 4/4; debe sentirse el paso firme de una marcha, sin correr."),
   ("Tocar y cantar","canta la letra mientras tocas solo la mano derecha; coordinar voz y dedos afianza el fraseo y te obliga a respetar el pulso."),
   ("Pregunta y respuesta","toca los dos primeros compases fuertes (la pregunta) y los dos siguientes suaves (la respuesta), como un diálogo.")],
 "Alouette":[
   ("Los dos tempos A y B","toca la sección A viva y la B más calmada; ensaya el cambio parando un segundo entre ellas hasta interiorizar los <b>dos caracteres</b>."),
   ("Motivo eco","repite cada motivo de dos compases primero fuerte y luego como un eco suave, para trabajar el contraste dinámico."),
   ("La vuelta a A","enlaza el final de B con el regreso de A sin frenar, para que la forma A–B–A quede redonda.")],
 "Top Gun (Anthem)":[
   ("Acordes en bloque sincronizados","ataca las quintas abiertas (Do–Sol) con las dos manos <b>a la vez</b>; las notas deben sonar juntas, nunca arpegiadas una tras otra."),
   ("Sonido épico sostenido","mantén cada acorde cuatro tiempos con sonido pleno y firme, <b>sin endurecer</b> el brazo; el carácter es potente pero no aporreado."),
   ("Enlace de acordes","pasa de un acorde al siguiente moviendo la mano lo mínimo, mirando adónde va antes de saltar.")],
 "Tetris (Korobéiniki)":[
   ("Ostinato de la izquierda","repite el patrón grave La–Mi en bucle contando en voz alta, hasta que la mano lo haga sola <b>sin mirarse</b>: es el motor de la pieza."),
   ("Saltos de registro a ciegas","practica solo el salto de la izquierda de una octava a otra sin mirar el teclado, tocando y volviendo; primero lento, luego a tempo."),
   ("Melodía ágil","toca el tema de la derecha en La menor buscando notas ligeras y bien articuladas, con el pulso del ostinato en la cabeza.")],
 "Oh, When the Saints":[
   ("Contar la anacrusa","di «…2-3-4» sin tocar y entra en el «1»; repítelo hasta que arrancar <b>antes</b> del tiempo fuerte te salga natural."),
   ("Enlace I–IV–V","encadena solo con la izquierda Sol–Do–Re–Sol, un acorde por compás, cambiando <b>a tiempo</b> sin frenar la mano."),
   ("Melodía con Fa#","toca la melodía en Sol mayor recordando pisar el Fa# cada vez que aparezca, hasta que salga sin dudar.")],
 "La Pantera Rosa":[
   ("Escala cromática felina","sube y baja medio tono a medio tono con digitación 1-3-1-3, buscando notas iguales y <b>reptantes</b>, como los pasos del gato."),
   ("Saltos de octava staccato","salta la misma nota de una octava a otra en staccato, ligero y sin mirar; el salto debe ser limpio y felino."),
   ("El motivo con silencios","toca el famoso motivo respetando los silencios; lo que <b>no</b> suena es tan importante como lo que suena.")],
 "El Submarino Amarillo":[
   ("Dos articulaciones a la vez","la derecha liga (legato) mientras la izquierda pica (staccato) en el mismo compás; empieza <b>muy lento</b> hasta que cada mano mantenga su toque."),
   ("Cada mano su carácter","practica primero por separado —MD ligada, MI cortada— y luego júntalas sin que una contagie a la otra."),
   ("Acompañamiento firme","toca solo la izquierda staccato marcando un pulso alegre y regular, como el latido del submarino.")],
 "Ejercicios a cuatro manos":[
   ("Entrada sincronizada","cuenta «1-2-3-4» con la profesora antes de empezar y entrad juntos <b>exactamente</b> en el «1»."),
   ("Tocar escuchando","toca tu parte oyendo la de la profesora para encajar el pulso; la música a cuatro manos se hace con los oídos, no solo con los dedos."),
   ("Ceder y sostener","practica mantener tu tempo estable aunque la otra parte tenga notas más rápidas: cada uno sostiene su capa.")],
 "Jingle Bells":[
   ("El acorde en tres posiciones","toca Sol–Si–Re, luego Si–Re–Sol, luego Re–Sol–Si: el <b>mismo</b> acorde en fundamental y sus dos inversiones, con el mínimo movimiento de mano."),
   ("Cambios rápidos por inversión","alterna dos acordes cercanos eligiendo la inversión que menos desplaza la mano; sube el tempo poco a poco."),
   ("Melodía repetida","toca la melodía «Si-Si-Si» pareja y a tempo vivo, sin que las repeticiones se aceleren.")],
 "We Wish You a Merry Christmas":[
   ("Pulso de vals","toca bajo en el «1» y acorde en «2» y «3» (bajo-acorde-acorde), sintiendo el <b>balanceo ternario</b> del 3/4."),
   ("La séptima que tira","forma A7 (La-Do#-Mi-Sol) y resuélvelo bajando a Re; escucha cómo la séptima «pide» resolver: ese imán es el motor del estribillo."),
   ("Melodía en oleadas","toca la melodía que repite el arranque cada vez más arriba, respetando el vaivén del vals.")],
 "Trouble":[
   ("Leer el cifrado de memoria","mira los símbolos (G, Em, Am, C) y forma cada acorde con la izquierda <b>sin partitura</b>, de memoria, hasta reconocerlos al instante."),
   ("El giro que ensombrece","practica lento el cambio Sol→Am y Do→Fa, el momento en que la armonía se vuelve más oscura."),
   ("Acorde y melodía","sostén el acorde con la izquierda mientras la derecha canta encima, sin que el acorde tape la melodía.")],
 "Eye of the Tiger":[
   ("Power chords deslizantes","toca Do–Sol (quinta sin tercera), seco y contundente, y desliza la <b>misma forma</b> a Sib–Fa y Lab–Mib sin cambiar la mano."),
   ("La síncopa del riff","marca el pulso con el pie y ataca las notas justo <b>después</b> del tiempo (a contratiempo); repite el riff hasta que la síncopa salga sola."),
   ("Escala menor con tres bemoles","repasa la escala de Do menor (Mib, Lab, Sib) para tener la mano dentro de la tonalidad del riff.")],
 "The Beginner":[
   ("La apoyatura ligera","toca la notita de adorno <b>muy rápida</b> y ligera justo antes de la nota principal, dejando todo el peso en la nota destino, no en el adorno."),
   ("Encajar con el Secondo","cuenta el vals «1-2-3» con la profesora para que cada apoyatura caiga exactamente en su sitio."),
   ("Vals a tres","toca tu melodía sintiendo el balanceo del 3/4, sin acentuar de más los tiempos débiles.")],
 "Sonatina en La menor":[
   ("Tónica y dominante","alterna el acorde de La menor (reposo) y el de Mi (tensión), escuchando cómo Mi <b>pide volver</b> a La; es el eje de la pieza."),
   ("El giro a Do mayor","aísla el pasaje donde la música pasa al relativo mayor Do y siente cómo el color se vuelve más luminoso."),
   ("Sincronía con la profesora","cuenta la entrada y toca tu parte encajando con el segundo piano, mirando que las manos se correspondan.")],
 "Heart and Soul":[
   ("El bucle de cuatro acordes","repite Do–Lam–Fa–Sol en bucle con la izquierda hasta memorizarlo <b>sin pensar</b>: es la base de toda la canción."),
   ("Swing y síncopa","toca la melodía atrasando ligeramente las notas débiles para darle balanceo; marca el pulso firme con el pie por debajo."),
   ("Manos independientes","mantén el bucle constante en la izquierda mientras la derecha juega con las síncopas encima.")],
 "Greensleeves":[
   ("Vals melancólico","bajo en el «1», acorde en «2-3»; siente el balanceo triste del 3/4 en La menor."),
   ("El paso Am → E","practica ir de La menor a Mi mayor (con su Sol#), la tensión que da color a la melodía y pide resolver."),
   ("Pedal por acorde","pisa el pedal justo <b>después</b> de cada acorde y cámbialo al siguiente, para ligar sin emborronar el sonido."),
   ("Crecer al forte","reserva volumen para la sección en forte creciendo poco a poco, sin estallar de golpe.")],
 "Morning Song":[
   ("Las cuatro teclas negras","localiza Fa#-Do#-Sol#-Re# sin mirar, diciendo su nombre: son la <b>armadura</b> de Mi mayor y hay que sentirlas bajo los dedos."),
   ("Dobles notas de sexta","toca dos notas a distancia de sexta a la vez (Mi + Do#) y deslízalas manteniendo la distancia; ambas deben sonar <b>exactamente juntas</b>."),
   ("Frase que amanece","toca la melodía creciendo desde el silencio como la luz del amanecer, en frases suaves y unidas.")],
 "Shallow":[
   ("Arpegio quebrado","desgrana el acompañamiento (Sol–Re–Si–Re) nota a nota, no de golpe; busca que las notas suenen <b>regulares</b> como un goteo."),
   ("Entradas adelantadas","practica entrar <b>antes</b> del tiempo (anticipación) contando bien, para no descuadrarte con el acompañamiento."),
   ("Crescendo hacia el ff","haz crecer el volumen por escalones hasta el estribillo denso, guardando fuerza para el clímax final.")],
 "Lovely":[
   ("Arpegio en espejo","las dos manos abren y cierran el arpegio a la vez, como un <b>espejo</b>; busca que suban y bajen simétricas y parejas."),
   ("Melodía sobre arpegio","la derecha canta legato mientras la izquierda mantiene el arpegio constante por debajo: independencia total entre capas."),
   ("Color a Mi menor","aísla el giro al relativo menor y cambia el carácter a más íntimo sin cambiar el tempo.")],
 "My Heart Will Go On":[
   ("Legato profundo","hunde cada tecla hasta el fondo y <b>no la sueltes</b> hasta pulsar la siguiente, transfiriendo el peso del brazo de dedo a dedo."),
   ("Frase por arcos","toca cada frase como un arco —crece hacia el centro y se apaga al final— respirando entre una frase y la siguiente."),
   ("Pedal sincopado","cambia el pedal justo <b>después</b> de bajar cada acorde (bajas, luego pedal) para un legato limpio sin barullo."),
   ("Sostener el tempo lento","con notas tan largas, cuenta los tiempos en voz alta para no acortarlas ni acelerar.")],
 "Boig per tu":[
   ("Acordes en bloque cálidos","toca los acordes de la balada juntos y sostenidos, <b>sin arpegiar</b>, buscando un sonido cálido y lleno."),
   ("Sostenidos de paso","localiza las notas alteradas de paso y tócalas con naturalidad dentro de la línea, sin que rompan el legato."),
   ("Balada legato","enlaza los acordes moviéndote lo justo, manteniendo el canto por encima siempre unido.")],
 "Perfect":[
   ("Sentir el 6/8","cuenta «1-2-3 / 4-5-6» agrupando en <b>dos pulsos</b>; es un balanceo mecido, no una marcha de seis golpes iguales."),
   ("Arpegio regular","desgrana el arpegio de acompañamiento con notas parejas; aquí la <b>regularidad</b> importa más que la velocidad."),
   ("Enlace del bajo Re/Fa# → Sol","practica el bajo que sube de Re a Sol pasando por Fa#, sin que se note el salto.")],
 "Believer":[
   ("Ostinato como un latido","repite el patrón grave sin variar el pulso, <b>constante y mecánico</b> como un latido; es la columna de la canción."),
   ("Tresillos iguales","divide cada tiempo en tres partes iguales (di «tri-pe-te»); palméalo antes de tocarlo para que las tres notas suenen parejas."),
   ("Tres contra dos","una mano hace tres notas mientras la otra hace dos en el mismo tiempo; practícalo <b>muy lento</b> hasta que encajen solos."),
   ("Escala menor con cuatro bemoles","repasa Fa menor (Sib, Mib, Lab, Reb) para tener la mano en la tonalidad.")],
 "El Golpe (The Entertainer)":[
   ("La izquierda reloj","la mano izquierda marca bajo-acorde-bajo-acorde como un <b>metrónomo</b> firme, sin acelerar jamás: es la base del ragtime."),
   ("Síncopa contra staccato","la derecha sincopada (a contratiempo) sobre la izquierda regular y picada; júntalas <b>muy lento</b> hasta que engranen."),
   ("El cambio a Fa mayor","localiza dónde la música pasa a Fa mayor (aparece el Sib) y practica ese enlace aparte.")],
 "Primavera de Vivaldi":[
   ("Staccato veloz de muñeca","toca el tema con notas cortas y ligeras rebotando la muñeca; sube el tempo <b>solo</b> cuando salga limpio."),
   ("Acordes en bloque con eco","ataca los acordes juntos y contrastados: uno fuerte y su repetición como un eco suave."),
   ("La modulación a Si mayor","aísla el pasaje donde aparece La# y la música cambia de color hacia Si mayor.")],
 "Romance":[
   ("Frase cantábile","toca la melodía como si tuviera <b>letra</b>, ligada y sin huecos entre notas, respirando al final de cada frase."),
   ("Crescendo escalonado","reparte el crescendo en cuatro escalones (p · mp · mf · f), sin adelantar el volumen para que quede recorrido hasta el clímax."),
   ("Del mf al pp","aligera el peso del brazo compás a compás hasta que el final sea un <b>murmullo</b>, manteniendo el legato."),
   ("Color a Mi menor","siente cómo la parte central se ensombrece al girar al relativo menor, cambiando el carácter, no el tempo.")],
 "Scherzo":[
   ("Staccato de muñeca","pulsa y suelta al instante, notas secas y ligeras como gotas: es la <b>broma</b> del scherzo, nunca aporreada."),
   ("Las tres negras del Trío","localiza Mib-Lab-Sib sin mirar, la armadura del Trío; sube la escala de Mi bemol apoyando cada bemol."),
   ("Tresillos iguales","palmea «tri-pe-te» y toca los tresillos con las tres notas <b>exactamente iguales</b>, sin cojear."),
   ("La transición Sol → Mib","practica el enlace del Scherzo al Trío (y la vuelta con el D.C.) muy lento, reubicando la mano sobre las negras.")],
 "Sonatina en Sol mayor":[
   ("Bajo-acorde","toca el bajo grave y luego el acorde staccato (bajo-acorde-acorde): ese patrón es el <b>motor</b> del acompañamiento."),
   ("Correspondencia con la profesora","cuenta tus blancas largas en voz alta para que caigan <b>exactas</b> sobre los acordes cortos del otro piano."),
   ("El acorde de Sol y su bajo","ataca Sol-Si-Re en bloque staccato tres veces marcando entre medias el bajo Sol grave.")],
 "Para Elisa":[
   ("Alternancia Mi–Re#","repite Mi-Re#-Mi-Re# con los dedos 2-1, <b>ligero y sin acento</b>; ese temblor es el gesto de apertura de la pieza."),
   ("Arpegios de la izquierda","desgrana La-Mi-La (arpegio) suave y regular como acompañamiento, con la mano relajada."),
   ("Corcheas continuas","toca corcheas seguidas con las dos manos manteniendo el pulso parejo del 3/8, <b>sin acelerar</b> al enlazar los compases."),
   ("La forma A–B–A","ensaya el regreso del tema tras la sección B, controlando que el tempo vuelva igual que al principio.")],
}
DEFAULT_WS=[("Escala de la tonalidad","sube y baja la escala despacio, con sonido parejo y la digitación correcta."),
   ("Manos separadas","estudia cada mano por separado antes de juntarlas, muy lento."),
   ("Pasajes exigentes","aísla los compases señalados como difíciles y repítelos en bucle hasta que salgan limpios.")]

def workshop(base, key, stage):
    col=STG[stage]
    out=[Spacer(0,4),HRFlowable(width="100%",thickness=2.6,color=col,spaceAfter=3,lineCap="round")]
    out.append(Paragraph("<b>%s · Taller de práctica</b>"%esc(STGNAME[stage]),P("S",8,10,color=col)))
    out.append(Paragraph("<b>Taller de práctica al piano · %s</b>"%esc(base),P("FB",18,21,sa=3)))
    out.append(Paragraph("<i>Ejercicios pensados <b>para esta obra en concreto</b>: atacan sus dificultades reales. "
        "Tócalos despacio como calentamiento antes de cada sesión, en la tonalidad de la pieza.</i>",
        P("F",10.5,14,color=colors.HexColor("#4a463d"),sa=6)))
    n=1
    if key and os.path.exists("notation/scale_%s.png"%key):
        out.append(Paragraph("<b>%d · Escala y arpegio de la tonalidad</b> — el cimiento: sube y baja despacio con la digitación escrita bajo cada nota; primero la mano derecha, luego la izquierda."%n,P("S",9.5,13,sa=2))); n+=1
        out+=staff("scale_%s.png"%key)
    for title,desc in WORKSHOPS.get(base,DEFAULT_WS):
        out.append(Paragraph("<b>%d · %s</b> — %s"%(n,esc(title),desc),P("S",9.5,13,sa=3))); n+=1
    box=[Paragraph("<b>Cómo usar este taller</b>",P("SB",9.5,12,color=col)),
         Paragraph("Dedica unos minutos a estos ejercicios antes de tocar la pieza. Están hechos a la medida de "
         "<b>sus</b> dificultades: cuando salgan fluidos, los pasajes exigentes de cada sesión te resultarán mucho "
         "más fáciles. Sube el metrónomo solo cuando algo salga limpio tres veces seguidas.",P("S",9,12.5))]
    t=Table([[box]],colWidths=[CW])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#f3eee2")),("BOX",(0,0),(-1,-1),0.6,LINE),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),("TOPPADDING",(0,0),(-1,-1),6),("BOTTOMPADDING",(0,0),(-1,-1),6)]))
    out.append(Spacer(0,4)); out.append(t)
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
REP=[("Nivel I · Fundamentos",[("Himno de la Alegría","L. van Beethoven","Do mayor"),
    ("Yankee Doodle","Tradicional","Do mayor"),("Alouette","Tradicional","Do mayor"),
    ("Top Gun (Anthem)","H. Faltermeyer","Do mayor"),("Tetris (Korobéiniki)","Tradicional ruso","La menor"),
    ("Oh, When the Saints","Tradicional","Sol mayor"),("La Pantera Rosa","H. Mancini","La menor"),
    ("El Submarino Amarillo","Lennon / McCartney","Sol mayor"),("Ejercicios a cuatro manos","F. Le Couppey","Do mayor")]),
 ("Nivel II · Desarrollo",[("Jingle Bells","J. Pierpont","Sol mayor"),("We Wish You a Merry Christmas","Tradicional","Sol mayor"),
    ("Trouble (cifrado)","Coldplay","Sol mayor"),("Eye of the Tiger","Survivor","Do mayor"),
    ("The Beginner (4 manos)","C. Gurlitt","Do mayor"),("Sonatina en La menor (4 manos)","M. Bazzoni","La menor"),
    ("Heart and Soul","H. Carmichael","Do mayor"),("Greensleeves","Tradicional inglés","La menor"),
    ("Morning Song","E. Grieg","Mi mayor"),("Shallow (cifrado)","Lady Gaga / B. Cooper","Sol mayor"),
    ("Lovely (cifrado)","Billie Eilish / Khalid","Sol mayor"),("Titanic (My Heart Will Go On)","J. Horner","Fa mayor"),
    ("Boig per tu","Sau (arr. Pilar Sanz)","Do mayor / La menor")]),
 ("Nivel III · Maestría",[("Perfect","Ed Sheeran","Sol mayor"),("Believer","Imagine Dragons","Fa menor"),
    ("El Golpe (The Entertainer)","S. Joplin","Do mayor"),("La Primavera","A. Vivaldi","Mi mayor"),
    ("Romance (4 manos)","A. Diabelli","Sol mayor"),("Scherzo (4 manos)","A. Diabelli","Sol mayor"),
    ("Sonatina en Sol mayor (4 manos)","M. Bazzoni","Sol mayor"),("Para Elisa (Für Elise)","L. van Beethoven","La menor")])]

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
    c.setFillColor(INK); c.setFont("FB",40); c.drawCentredString(w/2,h-178*mm,"El Cuaderno del Pianista")
    c.setFillColor(colors.HexColor("#4a463d")); c.setFont("F",16)
    c.drawCentredString(w/2,h-190*mm,"Cuarenta y cuatro sesiones de estudio progresivo")
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
        story.append(PageBreak()); story+=workshop(g["base"],g["key"],g["stage"])       # taller
    doc.build(story)
    print("PDF creado:",doc.page,"paginas")

if __name__=="__main__":
    build()
