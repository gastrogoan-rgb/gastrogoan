#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Crea un PDF A4 DESDE CERO con la informacion del HTML (no convierte el HTML).
Lee partials/diaNN.html, extrae el contenido y lo maqueta con ReportLab,
que pagina solo en hojas A4 (sin cortes ni huecos)."""
import glob, os, re
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
    t=Table([[circ,ht]],colWidths=[9*mm,CW-9*mm])
    t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"MIDDLE"),("BACKGROUND",(0,0),(0,0),col),
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
    ("Boig per tu (cifrado)","Sau","Sol mayor / Mi menor")]),
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
    for f in sorted(glob.glob("partials/dia*.html")):
        story.append(PageBreak())          # cada sesión empieza en hoja nueva
        story+=day_flowables(f)
    doc.build(story)
    print("PDF creado:",doc.page,"paginas")

if __name__=="__main__":
    build()
