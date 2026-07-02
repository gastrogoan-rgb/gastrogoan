#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera EJERCICIOS en pentagrama (Verovio) propios de cada pieza.
Ejercicios largos, tipo estudio, para trabajar de verdad un aspecto real
de la partitura (anacrusa, sincopa, arpegio, tresillo, dobles notas...).
Escribe notation/ex_<id>.png y exercises.json (base -> [{id,title,instr}])."""
import verovio, cairosvg, io, os, json
from PIL import Image

os.makedirs("notation", exist_ok=True)
tk = verovio.toolkit()

def render(abc, name, w=1500, scale=38):
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

def buildabc(M,L,K,body):
    return f"X:1\nM:{M}\nL:{L}\nK:{K}\n{body}"

# ---- Cada entrada: (base, id, titulo, instruccion, M, L, K, body) ----
# los cuerpos son largos (4-8 compases) para trabajar de verdad
EX = [
 # ============ FUNDAMENTOS ============
 ("Himno de la Alegría","himno1","Grados conjuntos ligados","Estudio de legato por notas vecinas: liga cada grupo sin cortar el sonido. Sube y baja en oleadas.",
   "4/4","1/4","C","(C D E F)|(E F G A)|(G A B c)|(B c d e)|(e d c B)|(c B A G)|(A G F E)|(F E D C)|]"),
 ("Himno de la Alegría","himno2","Escala de Do a dos octavas","Sube dos octavas y baja; misma velocidad y peso en cada nota, ida y vuelta.",
   "4/4","1/4","C","C D E F|G A B c|d e f g|a b c' d'|c' b a g|f e d c|B A G F|E D C2|]"),
 ("Yankee Doodle","yankee1","Notas repetidas con cambio de dedo","Repite cada nota con dedos 3-2-1-3 subiendo por la escala; ágil y ligero.",
   "4/4","1/4","C","C C C C|D D D D|E E E E|F F F F|G G G G|A A A A|B B B B|c c c c|]"),
 ("Yankee Doodle","yankee2","Saltos de quinta y octava","Trabaja los saltos abiertos sin mirar; que cada llegada sea limpia.",
   "4/4","1/4","C","C G C G|E c E c|G d G d|c g c g|G c E G|c e G c|E G C E|C4|]"),
 ("Alouette","alou1","Staccato de muñeca","Escala staccato subiendo y bajando; notas cortas, secas y parejas, con la muñeca suelta.",
   "4/4","1/4","C",".C .D .E .F|.G .A .B .c|.c .B .A .G|.F .E .D .C|.C .E .G .E|.C .E .G .c|.G .E .C2|]"),
 ("Alouette","alou2","Legato y staccato alternando","Un compás ligado y el siguiente picado, subiendo por la escala: domina las dos articulaciones.",
   "4/4","1/4","C","(C D E F)|.G .F .E .D|(E F G A)|.B .A .G .F|(G A B c)|.d .c .B .G|(C E G c)|c4|]"),
 ("Top Gun (Anthem)","topgun1","Acordes en bloque","Progresión I-IV-V-I; ataca las tres notas exactamente juntas, con sonido firme y sostenido.",
   "4/4","1/4","C","[CEG][CEG][CEG][CEG]|[FAc][FAc][FAc][FAc]|[GBd][GBd][GBd][GBd]|[CEG]2 [CEG]2|[FAc]2 [GBd]2|[CEG]2 [GBd]2|[CEG]4|]"),
 ("Top Gun (Anthem)","topgun2","Desgranar los acordes","Los acordes I-IV-V rotos, subiendo y bajando: conoce cada uno por dentro.",
   "4/4","1/4","C","C E G c|G E C2|F A c f|c A F2|G B d g|d B G2|C E G c|c G E C|]"),
 ("Tetris (Korobéiniki)","tetris1","Ostinato de la izquierda","El patrón grave que sostiene toda la pieza, moviendo la armonía; en clave de Fa.",
   "4/4","1/4","Am","[K:clef=bass] A,,2 E,2|A,,2 E,2|D,2 A,2|D,2 A,2|E,2 B,2|E,2 B,2|A,,2 E,2|A,,4|]"),
 ("Tetris (Korobéiniki)","tetris2","El tema completo en La menor","La melodía principal de Korobéiniki; articula cada nota con claridad y buen pulso.",
   "4/4","1/4","Am","e2 B c|d2 c B|A2 A c|e2 d c|B2 z B|c d e2|c2 A2|A4|]"),
 ("Oh, When the Saints","saints1","La anacrusa (tema de los Santos)","Arranca en anacrusa: las tres notas de impulso (Sol-Si-Do) caen ANTES del «1». Cuenta «…2-3-4».",
   "4/4","1/4","G","G B c|d2 d2|c2 A2|B2 G2|c2 c2|c2 A2|B2 d2|c2 B2|G4|]"),
 ("Oh, When the Saints","saints2","Acordes I-IV-V encadenados","Los tres pilares de Sol mayor en varias combinaciones; cambia a tiempo, en clave de Fa.",
   "4/4","1/4","G","[K:clef=bass] [G,,B,,D,]2 [C,E,G,]2|[D,F,A,]2 [G,,B,,D,]2|[G,,B,,D,] [C,E,G,] [D,F,A,] [G,,B,,D,]|[C,E,G,]2 [D,F,A,]2|[G,,B,,D,]4|]"),
 ("La Pantera Rosa","panther1","Escala cromática","Estudio cromático: sube medio tono a medio tono hasta el agudo y baja igual. Misterioso y parejo.",
   "4/4","1/8","Am","A ^A B c ^c d ^d e|f ^f g ^f f e ^d e|a ^g g ^f f e ^d d|^c c B ^A A2 z2|]"),
 ("La Pantera Rosa","panther2","Saltos de octava en staccato","Sube por la escala saltando octavas, corto y preciso; el gato que acecha y salta.",
   "4/4","1/4","Am",".A, .A .A, .A|.B, .B .B, .B|.C .c .C .c|.D .d .D .d|.E .e .E .e|.A, .A .A,2|]"),
 ("El Submarino Amarillo","submarine1","Mano derecha legato","Línea larga y ligada, sin cortar el sonido entre notas; el canto de la melodía.",
   "4/4","1/4","G","(G A B c)|(d e d c)|(B c d e)|(f g f e)|(d c B A)|(G A B G)|(c B A G)|(G2 z2)|]"),
 ("El Submarino Amarillo","submarine2","Mano izquierda staccato","El acompañamiento picado y saltarín en clave de Fa; corto y con rebote de muñeca.",
   "4/4","1/4","G","[K:clef=bass] .G, .D .G, .D|.C .G, .C .G,|.D, .A, .D, .A,|.G, .D .G,2|.G, .B, .D .B,|.G,4|]"),
 ("Ejercicios a cuatro manos","fourhands1","Terceras paralelas","Dos notas a distancia de tercera a la vez, subiendo y bajando; deben sonar exactamente juntas.",
   "4/4","1/4","C","[CE][DF][EG][FA]|[GB][Ac][Bd][ce]|[df][eg][fa][gb]|[ac']2 [gb]2|[fa][eg][df][ce]|[Bd][Ac][GB][FA]|[EG][DF][CE]2|]"),
 ("Ejercicios a cuatro manos","fourhands2","Escala al unísono, dos octavas","Las dos manos la misma escala en octavas; sincronía perfecta arriba y abajo.",
   "4/4","1/4","C","C D E F|G A B c|d e f g|a b c'2|c' b a g|f e d c|B A G F|E D C2|]"),
 # ============ DESARROLLO ============
 ("Jingle Bells","jingle1","El acorde de Sol y sus inversiones","Recorre el acorde en fundamental y sus dos inversiones, subiendo y bajando, con el mínimo movimiento.",
   "4/4","1/4","G","[G,B,D]2 [B,DG]2|[DGB]2 [Gdg]2|[Gdg]2 [DGB]2|[B,DG]2 [G,B,D]2|[G,B,D] [B,DG] [DGB] [Gdg]|[G,B,D]4|]"),
 ("Jingle Bells","jingle2","El tema completo","La estrofa de Jingle Bells; nota repetida pareja y el salto Re-Sol bien medido.",
   "4/4","1/4","G","B B B2|B B B2|B d G A|B4|c c c c|c B B B|B A A B|A2 d2|]"),
 ("We Wish You a Merry Christmas","wewish1","Bajo-acorde de vals","Acompañamiento completo de vals (bajo en «1», acorde en «2-3») sobre toda la vuelta armónica; clave de Fa.",
   "3/4","1/4","G","[K:clef=bass] G,, [B,D] [B,D]|C, [CE] [CE]|D, [DF] [DF]|G,, [B,D] [B,D]|E, [CE] [CE]|A,, [CE] [CE]|D, [DF] [DF]|G,,2 z|]"),
 ("We Wish You a Merry Christmas","wewish2","Séptimas dominantes y su resolución","Cadena de acordes de séptima que resuelven; escucha cómo cada uno «tira» hacia el siguiente.",
   "4/4","1/4","G","[A^CEG]2 [DFAd]2|[E^GBd]2 [A^Ce]2|[D^FAc]2 [GBd]2|[A^CEG]2 [DFAd]2|]"),
 ("Trouble","trouble1","Arpegios de los cuatro acordes","Desgrana G-Em-C-D como acompañamiento continuo y regular; que las notas fluyan igual.",
   "4/4","1/8","G","G B d B G B d B|E G B G E G B G|C E G E C E G E|D F A F D F A F|G B d B G B d g|G4 z4|]"),
 ("Trouble","trouble2","La vuelta de acordes","La progresión en bloques, con el giro a Am/F que ensombrece; cambia a tiempo.",
   "4/4","1/4","G","[G,B,D]2 [E,G,B,]2|[C,E,G,]2 [D,F,A,]2|[G,B,D]2 [E,G,B,]2|[A,CE]2 [D,F,A,]2|[G,B,D]4|]"),
 ("Eye of the Tiger","eye1","Power chords deslizantes","Estudio de quintas (sin tercera) que se deslizan por la tonalidad; seco y contundente. Clave de Fa.",
   "4/4","1/4","Cm","[K:clef=bass] [C,G,]2 [C,G,]2|[B,,F,]2 [A,,E,]2|[C,G,]2 [C,G,]2|[F,,C,]2 [G,,D,]2|[C,G,]2 [B,,F,]2|[C,G,]4|]"),
 ("Eye of the Tiger","eye2","Ritmo sincopado","Estudio de síncopa: ataca las notas justo DESPUÉS del pulso. Marca el tiempo con el pie.",
   "4/4","1/8","Cm","C z C C z C C z|C z C C z C z2|G z G G z G G z|G z G G z G z2|C z C E z C C z|C4 z4|]"),
 ("The Beginner","beginner1","Apoyaturas","Estudio de la nota de adorno: la apoyatura rapidísima antes de cada nota principal, sin robarle tiempo.",
   "3/4","1/4","C","{D}E2 {F}E|{D}E {C}D2|{F}G2 {A}G|{F}G {E}F2|{D}E {C}D {B,}C|{B,}C {D}E {F}G|{A}G2 {F}E|C3|]"),
 ("The Beginner","beginner2","Vals a tres tiempos","Melodía de vals ligera; no pises los tiempos débiles, deja que el «2-3» flote.",
   "3/4","1/4","C","C2 E|G2 E|C E G|c3|G2 F|E2 D|C E G|C3|]"),
 ("Sonatina en La menor","sonatina_a1","Tónica y dominante","Alterna La menor (reposo) y Mi (tensión, con Sol#) y cierra la cadencia; escucha el imán de la dominante.",
   "4/4","1/4","Am","[A,CE]2 [E,^G,B,]2|[A,CE]2 [E,^G,B,]2|[A,CE] [D,F,A,] [E,^G,B,] [A,CE]|[D,F,A,]2 [E,^G,B,]2|[A,CE]4|]"),
 ("Sonatina en La menor","sonatina_a2","Arpegio menor, dos octavas","El acorde de La menor desgranado subiendo y bajando dos octavas; parejo y relajado.",
   "4/4","1/8","Am","A, C E A E C A, C|A, C E A c e a2|a e c A c e c A|A,2 E2 A,2 z2|]"),
 ("Heart and Soul","heart1","El bucle de cuatro acordes","La vuelta I-vi-IV-V que se repite en toda la canción; memorízala en clave de Fa.",
   "4/4","1/4","C","[K:clef=bass] [C,E,G,]2 [A,,C,E,]2|[F,,A,,C,]2 [G,,B,,D,]2|[C,E,G,]2 [A,,C,E,]2|[F,,A,,C,]2 [G,,B,,D,]2|[C,E,G,]4|]"),
 ("Heart and Soul","heart2","Síncopa de la melodía","La melodía que entra a contratiempo sobre el bucle; ataca en los huecos, no en el pulso.",
   "4/4","1/8","C","z E E z G G z c|z c c z G G z E|z E E z G G z c|z G G z e e z c|c2 z2 z4|]"),
 ("Greensleeves","greensleeves1","Vals melancólico","Acompañamiento de vals en La menor sobre la vuelta completa; bajo en «1», acorde en «2-3». Clave de Fa.",
   "3/4","1/4","Am","[K:clef=bass] A,, [EA] [Ec]|E, [E^G] [EB]|F, [FA] [Fc]|C, [EG] [Ec]|D, [FA] [Fd]|A,, [EA] [Ec]|E, [E^G] [EB]|A,,2 z|]"),
 ("Greensleeves","greensleeves2","El giro Am → E","Cadencia menor: de La menor a Mi mayor (con Sol#) y vuelta; la tensión que da color.",
   "4/4","1/4","Am","[A,CE]2 [E,^G,B,]2|[A,CE]2 [D,F,A,]2|[E,^G,B,]2 [A,CE]2|[A,CE] [E,^G,B,] [A,CE] [E,^G,B,]|[A,CE]4|]"),
 ("Morning Song","morning1","Dobles notas de sexta","Estudio de sextas: dos notas a la vez subiendo y bajando; ambas exactamente juntas.",
   "4/4","1/4","E","[CE][DF][EG][FA]|[GB][Ac][Bd][ce]|[ce][Bd][Ac][GB]|[FA][EG][DF][CE]|[CE][EG][GB][ce]|[CE]4|]"),
 ("Morning Song","morning2","Escala de Mi mayor, dos octavas","Cuatro sostenidos (Fa#-Do#-Sol#-Re#); sube dos octavas y baja sintiendo las teclas negras.",
   "4/4","1/4","E","E F G A|B c d e|e f g a|b2 e'2|e' b a g|f e d c|B A G F|E4|]"),
 ("Shallow","shallow1","Arpegio quebrado","Estudio de arpegios de acompañamiento subiendo por la vuelta; que suenen como un goteo regular.",
   "4/4","1/8","G","D G B G D G B G|E A c A E A c A|D G B G D G B G|C E G E C E G E|D F A F D F A d|G B d g d B G2|]"),
 ("Shallow","shallow2","Entradas anticipadas","Estudio de anticipación: la melodía entra ANTES del tiempo (tras el silencio). Cuenta bien.",
   "4/4","1/4","G","z G G B|d2 z d|c B A2|z A A c|e2 z e|d c B2|z B d g|d2 z2|]"),
 ("Lovely","lovely1","Arpegio simétrico","Estudio de arpegios en espejo por varias tonalidades; sube y baja parejo, como reflejado.",
   "4/4","1/8","G","G B d g d B G B|A c e a e c A c|B d g b g d B d|E G B e B G E G|A, C E A E C A, C|G, B, D G D B, G,2|]"),
 ("Lovely","lovely2","Melodía sostenida sobre arpegio","Notas largas y cantadas que flotan sobre el arpegio; escucha la línea por encima.",
   "4/4","1/4","G","d2 B2|d2 e2|d2 B2|c2 A2|B2 d2|e2 d2|B2 A2|G4|]"),
 ("My Heart Will Go On","titanic1","Legato profundo","Estudio de notas largas ligadas; hunde cada tecla hasta el fondo y no la sueltes hasta la siguiente.",
   "4/4","1/4","F","(F2 G2)|(A2 G2)|(F2 A2)|(c4)|(c2 d2)|(c2 A2)|(G2 F2)|(F4)|]"),
 ("My Heart Will Go On","titanic2","Escala de Fa (con Sib), dos octavas","Un solo bemol: toca el Sib cada vez que aparezca el Si. Sube dos octavas y baja.",
   "4/4","1/4","F","F G A B|c d e f|g a b c'|d'2 c'2|c' b a g|f e d c|B A G F|F4|]"),
 ("Boig per tu","boig1","Acordes en bloque","La vuelta de acordes de la balada, todos juntos y sostenidos, con sonido cálido y lleno.",
   "4/4","1/4","C","[CEG]2 [GBd]2|[A,CE]2 [FAc]2|[CEG]2 [GBd]2|[A,CE]2 [E,G,B,]2|[FAc]2 [GBd]2|[CEG]4|]"),
 ("Boig per tu","boig2","Sostenidos de paso","Estudio cromático: notas alteradas que conectan la melodía; tócalas con naturalidad dentro de la línea.",
   "4/4","1/8","C","C ^C D ^D E ^F G z|G ^F E ^D C z z2|C ^C D E ^F G ^G a|a ^g g ^f f e z2|]"),
 # ============ MAESTRIA ============
 ("Perfect","perfect1","Arpegio en 6/8","Estudio de arpegio en el vaivén mecido de 6/8, recorriendo los acordes; regular, no rápido.",
   "6/8","1/8","G","G B d g d B|c e g e c A|G B d g d B|D F A d A F|G B d g b g|d B G G2 z|]"),
 ("Perfect","perfect2","Balanceo de 6/8","Melodía en dos pulsos por compás (1-2-3 / 4-5-6); mécela, no la marches.",
   "6/8","1/8","G","G2 B d2 B|c2 A G3|d2 B g3|e2 c A3|G2 B d2 g|d2 B G3|]"),
 ("Believer","believer1","Tresillos","Estudio de tresillos subiendo y bajando (Fa menor, 4 bemoles); tres notas iguales por tiempo.",
   "4/4","1/8","Fm","(3F G A (3B c d (3e f g (3f e d|(3c B A (3G F E (3F G A (3B c d|(3c d e (3f g a (3g f e (3d c B|(3c B A (3G F E (3F G A F2|]"),
 ("Believer","believer2","Ostinato constante","El latido grave que no varía, moviéndose por la armonía; mecánico y firme. Clave de Fa.",
   "4/4","1/4","Fm","[K:clef=bass] F,2 C,2|F,2 C,2|F,2 C,2|C,2 C,2|D,2 A,,2|D,2 A,,2|F,2 C,2|F,4|]"),
 ("El Golpe (The Entertainer)","entertainer1","Síncopa de ragtime","Estudio de síncopa: la melodía se adelanta al pulso; ese «cojeo» pícaro es el sabor del ragtime.",
   "2/4","1/8","C","D E C2|E F D2|E F G2|c2 z2|A c G2|E G C2|D E C2|C2 z2|]"),
 ("El Golpe (The Entertainer)","entertainer2","Bajo-acorde (la izquierda reloj)","Estudio de la izquierda: grave y acorde alternos, firmes como un metrónomo. Clave de Fa.",
   "2/4","1/8","C","[K:clef=bass] C, [E,G,] G,, [E,G,]|C, [E,G,] G,, [E,G,]|F,, [A,C] C, [A,C]|F,, [A,C] C, [A,C]|G,, [D,G,] D,, [D,G,]|C, [E,G,] G,,2|]"),
 ("Primavera de Vivaldi","spring1","Staccato veloz","Estudio de staccato ágil (Mi mayor); notas cortas como pájaros, subiendo por los acordes.",
   "4/4","1/8","E",".E .G .B .G .E .G .B .G|.F .A .c .A .F .A .c .A|.G .B .d .B .G .B .d .B|.E .G .B .e .B .G .E2|]"),
 ("Primavera de Vivaldi","spring2","Acordes en bloque con eco","Acorde fuerte y su repetición suave, como pregunta y respuesta; recorre la armonía.",
   "4/4","1/4","E","[EGB][EGB] [Bdf][Bdf]|[EGB]2 z2|[Ace][Ace] [EGB][EGB]|[Ace]2 z2|[EGB] [Bdf] [EGB] [Bdf]|[EGB]4|]"),
 ("Romance","romance1","Frase cantábile","Estudio de legato cantábile: frases largas ligadas que respiran; canta con los dedos.",
   "4/4","1/4","G","(G2 A2)|(B2 c2)|(d2 B2)|(G4)|(e2 d2)|(c2 B2)|(A2 G2)|(G4)|]"),
 ("Romance","romance2","Escala con matiz","Sube creciendo y baja apagando; la misma línea con dos dinámicas, para el fraseo.",
   "4/4","1/4","G","G A B c|d e f g|a g f e|d c B A|G A B c|d c B A|G F E D|G4|]"),
 ("Scherzo","scherzo1","Staccato scherzando","La broma del scherzo en 3/4: notas secas y saltarinas subiendo y bajando; muñeca ligera.",
   "3/4","1/8","G",".G .B .d .B .G .B|.c .A .F .A .G .B|.d .g .d .B .G .d|.c .A .F .A .G2|.G .d .B .g .d .B|.G2 z2 z2|]"),
 ("Scherzo","scherzo2","Tresillos del Trío (Mi bemol)","El Trío en Mi bemol (tres bemoles): tresillos iguales y suaves, subiendo por los acordes.",
   "3/4","1/8","Eb","(3E G B (3E G B (3E G B|(3F A c (3F A c (3F A c|(3G B e (3G B e (3G B e|(3E G B (3E G B (3E2 z|]"),
 ("Sonatina en Sol mayor","sonatina_g1","Melodía en blancas","Estudio de notas largas (blancas): cuéntalas enteras para que caigan sobre el acompañamiento.",
   "4/4","1/4","G","G2 B2|d2 B2|c2 A2|G2 G2|B2 d2|g2 d2|B2 A2|G4|]"),
 ("Sonatina en Sol mayor","sonatina_g2","Bajo-acorde (el Secondo)","Estudio del acompañamiento a cuatro manos: bajo grave y acordes staccato. Clave de Fa.",
   "4/4","1/4","G","[K:clef=bass] G,, [DGB] [DGB] [DGB]|D, [DFA] [DFA] [DFA]|C, [CEG] [CEG] [CEG]|G,, [DGB] [DGB] [DGB]|A,, [CEA] [CEA] [CEA]|D, [DFA]2 z|]"),
 ("Para Elisa","elisa1","Alternancia Mi–Re#","El temblor de apertura de Für Elise: alterna Mi y Re# ligero y sin acento, repetido en 3/8.",
   "3/8","1/16","Am","e ^d e ^d e B|d c A2 z2|e ^d e ^d e B|d c A2 z2|]"),
 ("Para Elisa","elisa2","Arpegios de la izquierda","El acompañamiento desgranado en 3/8 recorriendo La menor y Mi; en clave de Fa, suave y regular.",
   "3/8","1/16","Am","[K:clef=bass] A,, E, A, E, A, E,|E,, E, ^G, E, ^G, E,|A,, E, A, E, A, E,|A,,2 E,2 A,2|]"),
]

manifest={}
for base,eid,title,instr,M,L,K,body in EX:
    if body.startswith("[K:clef=bass] "):
        K=K+" clef=bass"; body=body[len("[K:clef=bass] "):]
    a=buildabc(M,L,K,body)
    try:
        sz=render(a, f"ex_{eid}.png")
        print("ex", eid, sz)
    except Exception as e:
        print("ERROR", eid, e)
    manifest.setdefault(base,[]).append({"id":eid,"title":title,"instr":instr})

json.dump(manifest, open("exercises.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)
print("LISTO ·", sum(len(v) for v in manifest.values()), "ejercicios ·", len(manifest), "piezas")
