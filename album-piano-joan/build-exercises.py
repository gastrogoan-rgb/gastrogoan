#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera EJERCICIOS en pentagrama (Verovio) propios de cada pieza.
Cada ejercicio es unico y trabaja un aspecto real de la partitura
(anacrusa, sincopa, arpegio, tresillo, dobles notas, cromatismo...).
Escribe notation/ex_<id>.png y exercises.json (base -> [{id,title,instr}])."""
import verovio, cairosvg, io, os, json
from PIL import Image

os.makedirs("notation", exist_ok=True)
tk = verovio.toolkit()

def render(abc, name, w=1500, scale=40):
    tk.setOptions({"inputFrom":"abc","adjustPageHeight":True,"pageWidth":w,"scale":scale,
        "footer":"none","header":"none","pageMarginTop":6,"pageMarginBottom":6,
        "pageMarginLeft":6,"pageMarginRight":6})
    tk.loadData(abc); svg=tk.renderToSVG(1)
    png=cairosvg.svg2png(bytestring=svg.encode(), output_width=int(w*1.35))
    im=Image.open(io.BytesIO(png)).convert("RGBA")
    gray=Image.alpha_composite(Image.new("RGBA",im.size,(255,255,255,0)),im).convert("L")
    bbox=gray.point(lambda p:0 if p>245 else 255).getbbox()
    if bbox:
        m=12; b=(max(0,bbox[0]-m),max(0,bbox[1]-m),min(im.size[0],bbox[2]+m),min(im.size[1],bbox[3]+m)); im=im.crop(b)
    out=Image.new("RGB",im.size,(255,255,255)); out.paste(im,mask=im.split()[3])
    out.save("notation/"+name); return out.size

def abc(M,L,K,body,w=None):
    head=f"X:1\nM:{M}\nL:{L}\nK:{K}\n{body}"
    if w: head+=f"\nw: {w}"
    return head

# ---- Cada entrada: (base, id, titulo, instruccion, M, L, K, body, words) ----
EX = [
 # ============ FUNDAMENTOS ============
 ("Himno de la Alegría","himno1","Grados conjuntos ligados","La pieza se mueve por notas vecinas: liga cada nota con la siguiente, sin huecos.",
   "4/4","1/4","C","(C D E F) | (E D C2) | (E F G A) | (G F E2) |]","1 2 3 4 3 2 1 - 1 2 3 4 3 2 1"),
 ("Himno de la Alegría","himno2","Escala de Do ida y vuelta","Sube y baja sin pararte en la cima; la bajada tan medida como la subida.",
   "4/4","1/4","C","C D E F | G A B c | c B A G | F E D C |]","1 2 3 1 2 3 4 5 5 4 3 2 1 2 3 1"),
 ("Yankee Doodle","yankee1","Notas repetidas con cambio de dedo","Repite cada nota alternando dedos 3-2-1; ágil y ligero como el tema.",
   "4/4","1/8","C","C C C C E E E E | G G G G c c c c |]","3 2 1 3 3 2 1 3 3 2 1 3 3 2 1 3"),
 ("Yankee Doodle","yankee2","Saltos de quinta","Trabaja el salto Do-Sol de la melodía, sin mirar el teclado.",
   "4/4","1/4","C","C G C G | E c E c |]","1 5 1 5 1 5 1 5"),
 ("Alouette","alou1","Staccato ligero","Notas cortas y sueltas, con la muñeca; contrasta con el legato de la pieza.",
   "4/4","1/4","C",".C .D .E .F | .G .F .E .D |]",None),
 ("Alouette","alou2","Legato y staccato juntos","Primer compás ligado, segundo picado: domina las dos articulaciones.",
   "4/4","1/4","C","(C D E F) | .G .F .E .C |]",None),
 ("Top Gun (Anthem)","topgun1","Acordes en bloque","Ataca las tres notas exactamente juntas, con sonido pleno y firme.",
   "4/4","1/4","C","[CEG][CEG] [FAc][FAc] | [GBd][GBd] [CEG]2 |]",None),
 ("Top Gun (Anthem)","topgun2","Desgrana el acorde","El mismo acorde roto nota a nota, para conocerlo por dentro.",
   "4/4","1/4","C","C E G c | G E C2 |]","1 3 5 . 5 3 1"),
 ("Tetris (Korobéiniki)","tetris1","Ostinato de la izquierda","El patrón grave que sostiene la pieza; repítelo hasta que salga solo.",
   "4/4","1/4","Am","[K:clef=bass] A,,2 E,2 | A,,2 E,2 |]","5 . 1 . 5 . 1"),
 ("Tetris (Korobéiniki)","tetris2","El tema en La menor","La melodía principal; articula cada nota con claridad.",
   "4/4","1/4","Am","e2 B c | d2 c B | A2 A c | e2 d c |]",None),
 ("Oh, When the Saints","saints1","La anacrusa","Tres notas de impulso ANTES del compás fuerte; cuenta «…2-3-4» y cae en el «1».",
   "4/4","1/4","G","G A B | c4 | c B A | G4 |]","1 2 3 4 . 3 2 1 1"),
 ("Oh, When the Saints","saints2","Acordes I-IV-V","Los tres pilares de Sol mayor encadenados a tiempo.",
   "4/4","1/4","G","[K:clef=bass] [G,,B,,D,][G,,B,,D,] [C,E,G,][C,E,G,] | [D,F,A,][D,F,A,] [G,,B,,D,]2 |]",None),
 ("La Pantera Rosa","panther1","Cromatismo felino","Sube medio tono a medio tono, misterioso y ligero.",
   "4/4","1/8","Am","A ^A B c | ^c d ^d e |]","1 2 1 2 1 2 1 2"),
 ("La Pantera Rosa","panther2","Salto de octava en staccato","La misma nota una octava arriba, corta y precisa.",
   "4/4","1/4","Am",".A, .A .A, .A | .E, .E .E, .E |]",None),
 ("El Submarino Amarillo","submarine1","Mano derecha legato","Notas unidas, sin cortar el sonido entre una y otra.",
   "4/4","1/4","G","(G A B c) | (d c B A) |]",None),
 ("El Submarino Amarillo","submarine2","Mano izquierda staccato","El acompañamiento picado y saltarin (en clave de Fa).",
   "4/4","1/4","G","[K:clef=bass] .G, .D .G, .D | .C .D .G,2 |]",None),
 ("Ejercicios a cuatro manos","fourhands1","Terceras paralelas","Dos notas a la vez a distancia de tercera; que suenen exactamente juntas.",
   "4/4","1/4","C","[CE][DF][EG][FA] | [GB][Ac][Bd][ce] |]",None),
 ("Ejercicios a cuatro manos","fourhands2","Escala al unisono","Las dos manos la misma escala; sincronia perfecta.",
   "4/4","1/4","C","C D E F | G F E D | C4 |]",None),
 # ============ DESARROLLO ============
 ("Jingle Bells","jingle1","El acorde y sus inversiones","El mismo acorde de Sol en tres posiciones, con el minimo movimiento.",
   "4/4","1/4","G","[G,B,D]2 [B,DG]2 | [DGB]2 [G,B,D]2 |]",None),
 ("Jingle Bells","jingle2","Notas repetidas del tema","«Si-Si-Si» parejo y a tempo, sin acelerar las repeticiones.",
   "4/4","1/4","G","B B B2 | B B B2 | B d G A | B4 |]",None),
 ("We Wish You a Merry Christmas","wewish1","Bajo-acorde de vals","Bajo en el «1», acorde en «2-3»: el balanceo del vals.",
   "3/4","1/4","G","[K:clef=bass] G,, [B,D] [B,D] | C, [CE] [CE] | D, [DF] [DF] | G,,2 z |]",None),
 ("We Wish You a Merry Christmas","wewish2","La séptima A7 → Re","Escucha la tension de A7 (con Do#) y como resuelve a Re.",
   "4/4","1/2","G","[A^CEG]2 | [DFAd]2 |]",None),
 ("Trouble","trouble1","Arpegios de los acordes","Desgrana G y Em como acompañamiento fluido y regular.",
   "4/4","1/8","G","G B d B G B d B | E G B G E G B G |]",None),
 ("Trouble","trouble2","El giro Sol → Am","El cambio de acorde que ensombrece la armonia.",
   "4/4","1/4","G","[G,B,D][G,B,D] [A,CE][A,CE] | [G,B,D][G,B,D] [A,CE]2 |]",None),
 ("Eye of the Tiger","eye1","Power chords","Quintas sin tercera, secas y contundentes, deslizando la misma forma.",
   "4/4","1/4","Cm","[K:clef=bass] [C,G,][C,G,] [B,,F,][B,,F,] | [A,,E,][A,,E,] [C,G,]2 |]",None),
 ("Eye of the Tiger","eye2","Ritmo sincopado","Ataca las notas a contratiempo, justo DESPUES del pulso.",
   "4/4","1/8","Cm","C z C C z C C z | C z C C z C C2 |]",None),
 ("The Beginner","beginner1","Apoyaturas","La notita de adorno rapidisima antes de la nota buena, sin robarle tiempo.",
   "3/4","1/4","C","{D}E2 {F}E2 {D}E2 | {C}D2 {E}D2 D2 |]",None),
 ("The Beginner","beginner2","Vals a tres tiempos","Bajo y acordes ligeros, sin pisar los tiempos debiles.",
   "3/4","1/4","C","C2 E | G2 E | C E G | c3 |]",None),
 ("Sonatina en La menor","sonatina_a1","Tonica y dominante","La menor (reposo) y Mi (tension, con Sol#) que pide volver.",
   "4/4","1/2","Am","[A,CE]2 | [E,^G,B,]2 | [A,CE]2 z2 |]",None),
 ("Sonatina en La menor","sonatina_a2","Arpegio menor","El acorde de La menor desgranado, subiendo y bajando.",
   "4/4","1/8","Am","A, C E A E C A, C | A,4 z4 |]",None),
 ("Heart and Soul","heart1","El bucle I-vi-IV-V","Los cuatro acordes que se repiten en toda la cancion.",
   "4/4","1/2","C","[K:clef=bass] [C,E,G,]2 | [A,,C,E,]2 | [F,,A,,C,]2 | [G,,B,,D,]2 |]",None),
 ("Heart and Soul","heart2","Síncopa de la melodía","Notas que entran a contratiempo sobre el bucle.",
   "4/4","1/8","C","z E E z G G z c | c z z2 z4 |]",None),
 ("Greensleeves","greensleeves1","Vals en La menor","Bajo en «1», acorde en «2-3», con aire melancolico.",
   "3/4","1/4","Am","[K:clef=bass] A,, [EA] [Ec] | E, [E^G] [EB] | A,,2 z |]",None),
 ("Greensleeves","greensleeves2","El paso Am → E","De La menor a Mi mayor (con Sol#): la tension que da color.",
   "4/4","1/2","Am","[A,CE]2 | [E,^G,B,]2 |]",None),
 ("Morning Song","morning1","Dobles notas de sexta","Dos notas a distancia de sexta a la vez; deslizalas parejas.",
   "4/4","1/4","E","[CE][DF] [EG][FA] | [GB][Ac] [Bd]2 |]",None),
 ("Morning Song","morning2","Escala de Mi mayor","Cuatro sostenidos (Fa#-Do#-Sol#-Re#); memoriza donde caen.",
   "4/4","1/4","E","E F G A | B c d e |]","1 2 3 1 2 3 4 5"),
 ("Shallow","shallow1","Arpegio quebrado","El acompañamiento desgranado, como un goteo regular.",
   "4/4","1/8","G","D G B G D G B G | E A c A E A c A |]",None),
 ("Shallow","shallow2","Entradas anticipadas","La melodia entra ANTES del tiempo; cuenta bien para no descuadrarte.",
   "4/4","1/4","G","z G G B | d2 z d | c B A2 |]",None),
 ("Lovely","lovely1","Arpegio simétrico","Sube y baja el arpegio en espejo, parejo en las dos direcciones.",
   "4/4","1/8","G","G B d g d B G B | E G B e B G E G |]",None),
 ("Lovely","lovely2","Melodía sostenida","Notas largas cantadas sobre el arpegio que no para.",
   "4/4","1/2","G","d2 | B2 | d2 | e2 |]",None),
 ("My Heart Will Go On","titanic1","Legato profundo","Notas largas unidas, hundiendo cada tecla hasta el fondo.",
   "4/4","1/1","F","F | G | A | G |]",None),
 ("My Heart Will Go On","titanic2","Escala de Fa (con Sib)","Un solo bemol; toca el Sib cada vez que aparezca el Si.",
   "4/4","1/4","F","F G A B | c d e f |]","1 2 3 4 1 2 3 4"),
 ("Boig per tu","boig1","Acordes en bloque","Todas las notas juntas y sostenidas, con sonido calido.",
   "4/4","1/2","C","[CEG]2 | [A,CE]2 | [FAc]2 | [GBd]2 |]",None),
 ("Boig per tu","boig2","Sostenidos de paso","Notas alteradas que conectan la linea con naturalidad.",
   "4/4","1/8","C","C ^C D ^D E z z2 | E ^D D ^C C z z2 |]",None),
 # ============ MAESTRIA ============
 ("Perfect","perfect1","Arpegio en 6/8","Desgrana el acorde en el vaiven mecido de 6/8.",
   "6/8","1/8","G","G B d g d B | c e g e c A |]",None),
 ("Perfect","perfect2","Balanceo de 6/8","Agrupa en dos pulsos (1-2-3 / 4-5-6); no seis golpes iguales.",
   "6/8","1/8","G","G2 B d2 B | c2 A G3 |]",None),
 ("Believer","believer1","Tresillos","Tres notas iguales por tiempo; di «tri-pe-te» al tocarlas.",
   "4/4","1/8","Fm","(3F G A (3F G A (3F G A (3F G A |]",None),
 ("Believer","believer2","Ostinato constante","El latido grave que no varia (cuatro bemoles: Fa menor).",
   "4/4","1/4","Fm","[K:clef=bass] F,2 C,2 | F,2 C,2 |]",None),
 ("El Golpe (The Entertainer)","entertainer1","Síncopa de ragtime","La melodia se adelanta al pulso; ese «cojeo» es el sabor del ragtime.",
   "2/4","1/8","C","D E C2 | E F D2 |]",None),
 ("El Golpe (The Entertainer)","entertainer2","Bajo-acorde (la izquierda reloj)","Grave y acorde alternos, firmes como un metronomo.",
   "2/4","1/8","C","[K:clef=bass] C, [E,G,] G,, [E,G,] | C, [E,G,] G,, [E,G,] |]",None),
 ("Primavera de Vivaldi","spring1","Staccato veloz","Notas cortas y ligeras como pajaros (Mi mayor, cuatro sostenidos).",
   "4/4","1/8","E",".E .G .B .G .E .G .B .G | .F .A .c .A .F .A .c .A |]",None),
 ("Primavera de Vivaldi","spring2","Acordes en bloque con eco","Uno fuerte y su repeticion suave, como pregunta y respuesta.",
   "4/4","1/4","E","[EGB][EGB] [Bdf][Bdf] | [EGB]2 z2 |]",None),
 ("Romance","romance1","Frase cantábile","Liga la melodia como si tuviera letra, respirando al final.",
   "2/4","1/4","G","(G A) | (B c) | (d B) | G2 |]",None),
 ("Romance","romance2","Escala con matiz","Sube creciendo y baja apagando; la misma linea, dos dinamicas.",
   "4/4","1/4","G","G A B c | d c B A | G4 |]",None),
 ("Scherzo","scherzo1","Staccato scherzando","La broma del scherzo: notas secas y saltarinas en 3/4.",
   "3/4","1/8","G",".G .B .d .B .G .B | .c .A .F .A .G2 |]",None),
 ("Scherzo","scherzo2","Tresillos del Trío (Mi bemol)","Tres bemoles; tresillos iguales y suaves para el Trio.",
   "3/4","1/8","Eb","(3E G B (3E G B (3E G B |]",None),
 ("Sonatina en Sol mayor","sonatina_g1","Melodía en blancas","Notas largas de dos tiempos; cuentalas para no acortarlas.",
   "4/4","1/2","G","G2 | B2 | d2 | B2 |]",None),
 ("Sonatina en Sol mayor","sonatina_g2","Bajo-acorde (el Secondo)","Bajo grave y acordes staccato: el motor del acompañamiento.",
   "4/4","1/4","G","[K:clef=bass] G,, [DGB] [DGB] [DGB] | D, [DFA] [DFA] [DFA] |]",None),
 ("Para Elisa","elisa1","Alternancia Mi–Re#","El temblor de apertura: alterna Mi y Re# ligero, sin acento.",
   "3/8","1/16","Am","e ^d e ^d e ^d |]","2 1 2 1 2 1"),
 ("Para Elisa","elisa2","Arpegios de la izquierda","El acompañamiento desgranado en 3/8 (en clave de Fa).",
   "3/8","1/16","Am","[K:clef=bass] A,, E, A, E, A, E, |]",None),
]

manifest={}
for base,eid,title,instr,M,L,K,body,words in EX:
    if body.startswith("[K:clef=bass] "):
        K=K+" clef=bass"; body=body[len("[K:clef=bass] "):]
    a=abc(M,L,K,body,words)
    try:
        sz=render(a, f"ex_{eid}.png")
        print("ex", eid, sz)
    except Exception as e:
        print("ERROR", eid, e)
    manifest.setdefault(base,[]).append({"id":eid,"title":title,"instr":instr})

json.dump(manifest, open("exercises.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("LISTO ·", sum(len(v) for v in manifest.values()), "ejercicios ·", len(manifest), "piezas")
