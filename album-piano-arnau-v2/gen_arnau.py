#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera el cuaderno de Arnau con el MISMO diseño que el de Joan, pero con
contenido (teoria + ejercicios) para un niño de 7 anios con base.
Produce: partials/diaNN.html, scores/map.json (+imagenes +QR),
exercises.json (+notation/ex_*.png). Luego se usa el make_pdf.py de Joan."""
import os, io, json, re, unicodedata, urllib.parse, html
import fitz, qrcode, verovio, cairosvg
from PIL import Image

os.makedirs("partials",exist_ok=True); os.makedirs("scores/img",exist_ok=True)
os.makedirs("scores/qr",exist_ok=True); os.makedirs("notation",exist_ok=True)
tk=verovio.toolkit()

def slug(s):
    s=unicodedata.normalize("NFKD",s).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+","_",s.lower()).strip("_")

def esc(s): return html.escape(str(s),quote=False)

def render_ex(abc,name):
    tk.setOptions({"inputFrom":"abc","adjustPageHeight":True,"pageWidth":1500,"scale":42,
        "footer":"none","header":"none","pageMarginTop":5,"pageMarginBottom":5,"pageMarginLeft":5,"pageMarginRight":5})
    tk.loadData(abc); svg=tk.renderToSVG(1)
    png=cairosvg.svg2png(bytestring=svg.encode(),output_width=2000)
    im=Image.open(io.BytesIO(png)).convert("RGBA")
    g=Image.alpha_composite(Image.new("RGBA",im.size,(255,255,255,0)),im).convert("L")
    bb=g.point(lambda p:0 if p>245 else 255).getbbox()
    if bb:
        m=14; bb=(max(0,bb[0]-m),max(0,bb[1]-m),min(im.size[0],bb[2]+m),min(im.size[1],bb[3]+m)); im=im.crop(bb)
    out=Image.new("RGB",im.size,(255,255,255)); out.paste(im,mask=im.split()[3])
    p="notation/ex_"+name+".png"; out.save(p); return p

# ---- teclado HTML (formato Joan) a partir de lista de notas blancas resaltadas + dedos ----
BLACK={"Do#":31,"Re#":67,"Fa#":139,"Sol#":175,"La#":211}
def kbd_html(hl):
    """hl: dict nombre_blanca -> dedo (o '' ). Solo Do-Si, teclas blancas."""
    whites=["Do","Re","Mi","Fa","Sol","La","Si"]
    out=['<div class="kbd">']
    for nm in whites:
        if nm in hl:
            fg=hl[nm]
            fgs=f'<span class="fg">{fg}</span>' if fg else ''
            out.append(f'<div class="wk hl">{fgs}<span class="nn">{nm}</span></div>')
        else:
            out.append(f'<div class="wk"><span class="nn">{nm}</span></div>')
    out.append('<div class="bk" style="left:31px"></div><div class="bk" style="left:67px"></div><div class="bk" style="left:139px"></div><div class="bk" style="left:175px"></div><div class="bk" style="left:211px"></div>')
    out.append('</div>')
    return "".join(out)

def scale_html(key_grados):
    """key_grados: lista de (nota, dedo/'·', etiqueta)"""
    out=['<div class="scale">']
    for nt,fn,lab in key_grados:
        out.append(f'<div class="sc"><div class="nt">{nt}</div><span class="fn">{fn}</span><small>{lab}</small></div>')
    out.append('</div>')
    return "".join(out)

STAGE={"1":"s1","2":"s2","3":"s3"}
STAGENAME={"1":"Nivel 1 · Empiezo","2":"Nivel 2 · Avanzo","3":"Nivel 3 · Ya toco"}

def partial(idx,total,S):
    st=STAGE[S["level"]]; specs=S["specs"]
    scal=scale_html(S["scale"])
    two=S["two"]; kbd=kbd_html(S["kbd"])
    steps="".join(f'<div class="step"><span class="st-t">{esc(t)}</span> {esc(d)}{(" <span class=bpm>"+b+"</span>") if b else ""}</div>' for t,d,b in S["steps"])
    goals="".join(f'<li><span class="bx"></span> {esc(g)}</li>' for g in S["goals"])
    hard=S["hard"]
    return f"""<!-- ===== {esc(S['title'])} ===== -->
<section class="sheet {st}">
  <div class="day-head">
    <div class="row1"><span class="stage-lbl">{STAGENAME[S['level']]}</span><span class="sess">Canción {idx} de {total}</span></div>
    <h2>{esc(S['title'])}</h2>
    <div class="composer">{esc(S['composer'])}</div>
    <div class="specs">
      <div class="sp"><div class="k">Tonalidad</div><div class="v">{esc(specs['ton'])}</div></div>
      <div class="sp"><div class="k">Compás</div><div class="v">{esc(specs['comp'])}</div></div>
      <div class="sp"><div class="k">Tempo</div><div class="v">{esc(specs['tempo'])}</div></div>
      <div class="sp"><div class="k">Forma</div><div class="v">{esc(specs['forma'])}</div></div>
      <div class="sp"><div class="k">Dificultad</div><div class="v diff">{esc(specs['dif'])}</div></div>
      <div class="sp"><div class="k">Manos</div><div class="v">{esc(specs['manos'])}</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">I</span><h3>La canción</h3><hr class="rule"></div>
    <p>{S['obra']}</p>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">II</span><h3>Lo que aprendes</h3><hr class="rule"></div>
    <div class="panel panel--theory">
      <h4>{esc(S['ton_title'])}</h4>
      <p>{S['ton_txt']}</p>
      {scal}
    </div>
    <div class="two">
      <div class="panel"><h4>{esc(two[0][0])}</h4><p>{two[0][1]}</p></div>
      <div class="panel"><h4>{esc(two[1][0])}</h4><p>{two[1][1]}</p></div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">III</span><h3>A tocar — {esc(S['tec_title'])}</h3><hr class="rule"></div>
    <p class="lede">{S['tec_lede']}</p>
    <div class="panel panel--soft">
      <h4>{esc(S['warm_title'])}</h4>
      <p>{S['warm_txt']}</p>
      {kbd}
      <p class="kbd-cap">{S['kbd_cap']}</p>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">IV</span><h3>Cómo estudiar</h3><hr class="rule"></div>
    <div class="steps">{steps}</div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">V</span><h3>La parte difícil</h3><hr class="rule"></div>
    <div class="hard">
      <div class="hard-top"><span class="cc">{esc(hard['cc'])}</span><span class="tt">{esc(hard['tt'])}</span>
        <span class="gauge"><i class="on"></i>{'<i class="on"></i>' if S['level']!='1' else '<i></i>'}<i></i><i></i><i></i></span></div>
      <div class="hard-body">
        <p><span class="lab">El reto</span> {hard['reto']}</p>
        <p><span class="lab">El truco</span> {hard['truco']}</p>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">VI</span><h3>Cómo suena</h3><hr class="rule"></div>
    <div class="panel panel--quote">{S['interp']}</div>
  </div>

  <div class="sec">
    <div class="sec-h"><span class="rn">VII</span><h3>Lo que consigo</h3><hr class="rule"></div>
    <ul class="goals">{goals}</ul>
    <p style="margin-top:9px"><span class="metro">{S['meta']}</span></p>
  </div>

  <div class="foot"><span class="stage-tag">{STAGENAME[S['level']].split('·')[0].strip()}</span><span>{idx} · {esc(S['title'])}</span><span>El Piano de Arnau</span></div>
</section>
"""

def build(SONGS):
    total=len(SONGS)
    scoremap={}; exj={}
    for i,S in enumerate(SONGS,1):
        sl=slug(S["title"]); S["_slug"]=sl
        # partitura -> imagenes (descartando blancas)
        pages=[]
        if os.path.exists(S["score"]):
            d=fitz.open(S["score"])
            for pg in range(d.page_count):
                p=f"scores/img/{sl}_{pg+1}.png"; pix=d[pg].get_pixmap(dpi=150); pix.save(p)
                im=Image.open(p).convert("L"); hh=im.histogram(); ink=sum(hh[:230])/(im.width*im.height)*100
                if ink<0.5: os.remove(p); continue
                pages.append(p)
            d.close()
        url=("https://www.youtube.com/watch?v="+S["video"]) if S.get("video") else ""
        qp=f"scores/qr/{sl}.png"
        if url:
            q=qrcode.QRCode(border=1,box_size=10); q.add_data(url); q.make()
            q.make_image(fill_color="#1b2433",back_color="white").save(qp)
        scoremap[S["title"]]={"slug":sl,"pages":pages,"qr":qp if url else "","url":url}
        # ejercicios
        exlist=[]
        for e in S["ex"]:
            eid=sl+"_"+e["k"]; render_ex(e["abc"],eid)
            exlist.append({"id":eid,"level":e["lvl"],"title":e["title"],"instr":e["instr"]})
        exj[S["title"]]=exlist
        # partial
        open(f"partials/dia{i:02d}.html","w",encoding="utf-8").write(partial(i,total,S))
        print("OK",i,S["title"],"·",len(pages),"pag partitura ·",len(exlist),"ejercicios")
    json.dump(scoremap,open("scores/map.json","w"),ensure_ascii=False,indent=1)
    json.dump(exj,open("exercises.json","w"),ensure_ascii=False,indent=1)
    # indice agrupado por nivel
    levels={"1":"Nivel 1 · Empiezo","2":"Nivel 2 · Avanzo","3":"Nivel 3 · Ya toco"}
    idx=[]
    for lv in ("1","2","3"):
        items=[[S["title"],S["composer"].split("·")[0].strip(),S["specs"]["ton"]] for S in SONGS if S["level"]==lv]
        if items: idx.append([levels[lv],items])
    json.dump(idx,open("index.json","w"),ensure_ascii=False,indent=1)
    print("TOTAL:",total,"canciones")

from songs_arnau import SONGS
if __name__=="__main__":
    build(SONGS)
