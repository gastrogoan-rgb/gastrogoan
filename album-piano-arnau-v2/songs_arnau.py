# -*- coding: utf-8 -*-
# Las 20 canciones de Arnau (7 anios). Datos verificados de cada partitura.
# Un constructor genera las secciones correctas segun tonalidad y compas.

SCALES={
 "C":[("Do","1","I · casa"),("Re","2","II"),("Mi","3","III"),("Fa","4","IV"),("Sol","5","V · imán"),("La","·","VI"),("Si","·","VII"),("Do","·","VIII")],
 "F":[("Fa","1","I · casa"),("Sol","2","II"),("La","3","III"),("Sib","4","IV"),("Do","5","V · imán"),("Re","·","VI"),("Mi","·","VII"),("Fa","·","VIII")],
 "G":[("Sol","1","I · casa"),("La","2","II"),("Si","3","III"),("Do","4","IV"),("Re","5","V · imán"),("Mi","·","VI"),("Fa#","·","VII"),("Sol","·","VIII")],
 "Am":[("La","1","I · casa"),("Si","2","II"),("Do","3","III"),("Re","4","IV"),("Mi","5","V · imán"),("Fa","·","VI"),("Sol","·","VII"),("La","·","VIII")],
}
POS={"C":{"Do":1,"Re":2,"Mi":3,"Fa":4,"Sol":5},"F":{"Fa":1,"Sol":2,"La":3,"Do":5},
     "G":{"Sol":1,"La":2,"Si":3,"Do":4,"Re":5},"Am":{"La":1,"Si":2,"Do":3,"Re":4,"Mi":5}}
POSCAP={"C":"Posición de DO: 1 en Do, 2 en Re, 3 en Mi, 4 en Fa y 5 en Sol.",
 "F":"Posición de FA: 1 en Fa, 2 en Sol, 3 en La, 4 en Sib (tecla negra) y 5 en Do.",
 "G":"Posición de SOL: 1 en Sol, 2 en La, 3 en Si, 4 en Do y 5 en Re.",
 "Am":"Posición de LA menor: 1 en La, 2 en Si, 3 en Do, 4 en Re y 5 en Mi."}
KEYNAME={"C":"DO","F":"FA","G":"SOL","Am":"LA menor"}
NOTES={"C":"Do, Re, Mi, Fa, Sol y La (¡todas teclas blancas!)",
 "F":"Fa, Sol, La, Sib y Do (ojo: el Sib es una tecla negra)",
 "G":"Sol, La, Si, Do, Re (y a veces Fa#, una tecla negra)",
 "Am":"La, Si, Do, Re y Mi (todas blancas)"}
POSABC={"C":("C","C D E F|G F E D|C4|]","1 2 3 4 5 4 3 2 1"),
 "F":("F","F G A B|c B A G|F4|]","1 2 3 4 5 4 3 2 1"),
 "G":("G","G A B c|d c B A|G4|]","1 2 3 4 5 4 3 2 1"),
 "Am":("Am","A B c d|e d c B|A4|]","1 2 3 4 5 4 3 2 1")}
ARPABC={"C":("C","C E G c|G E C2|]","Do Mi Sol Do Sol Mi Do"),
 "F":("F","F A c f|c A F2|]","Fa La Do Fa Do La Fa"),
 "G":("G","G B d g|d B G2|]","Sol Si Re Sol Re Si Sol"),
 "Am":("Am","A c e a|e c A2|]","La Do Mi La Mi Do La")}
# acordes (mano izquierda, clave de Fa) por conjunto
CHORDS={
 "C":("C clef=bass","[C,E,G,]2 [F,A,C]2|[G,B,D]2 [C,E,G,]2|]","DO FA SOL DO","DO, FA y SOL"),
 "G":("G clef=bass","[G,,B,,D,]2 [C,E,G,]2|[D,F,A,]2 [G,,B,,D,]2|]","SOL DO RE SOL","SOL, DO y RE"),
 "F":("F clef=bass","[F,,A,,C,]2 [B,,D,F,]2|[C,E,G,]2 [F,,A,,C,]2|]","FA SIb DO FA","FA, SIb y DO"),
 "Am":("Am clef=bass","[A,,C,E,]2 [E,^G,B,]2|[A,,C,E,]2 [E,^G,B,]2|]","LAm MI LAm MI","La menor y MI"),
}
def RHY(key,meter):
    T={"C":"C","F":"F","G":"G","Am":"A"}[key]; K={"C":"C","F":"F","G":"G","Am":"Am"}[key]
    if meter in ("4/4","C","4/4 (C)"):
        return ("4/4","1/4",K,f"{T} {T} {T} {T}|{T} {T} {T}2|]","1 2 3 4 1 2 3-4")
    if meter=="3/4":
        return ("3/4","1/4",K,f"{T} {T} {T}|{T}2 {T}|]","1 2 3 1-2 3")
    if meter=="6/8":
        return ("6/8","1/8",K,f"{T} {T} {T} {T} {T} {T}|]","1 2 3 4 5 6")
    if meter=="2/4":
        return ("2/4","1/4",K,f"{T} {T}|{T}2|]","1 2 1-2")
    return ("4/4","1/4",K,f"{T} {T} {T} {T}|]","1 2 3 4")

def make(title,composer,score,video,key,meter,tempo,forma,level,obra,tip,hard,
         melody=None,interp=None,manos="Melodía + acordes"):
    kn=KEYNAME[key]; ch=CHORDS[key]; pos=POSABC[key]; arp=ARPABC[key]; rh=RHY(key,meter)
    ex=[
     {"k":"pos","lvl":1,"title":f"Posición de 5 dedos en {kn}","instr":"Sube y baja; un dedo por tecla (mira los números).",
      "abc":f"X:1\nM:4/4\nL:1/4\nK:{pos[0]}\n{pos[1]}\nw:{pos[2]}"},
     {"k":"cho","lvl":2,"title":f"Los acordes ({ch[3]})","instr":"Toca los acordes con la mano izquierda, en clave de Fa.",
      "abc":f"X:1\nM:4/4\nL:1/4\nK:{ch[0]}\n{ch[1]}\nw:{ch[2]}"},
    ]
    if melody:
        ex.append({"k":"mel","lvl":2,"title":"La melodía (mano derecha)","instr":"El principio de la canción. Debajo, el nombre de cada nota.",
          "abc":f"X:1\nM:4/4\nL:1/4\nK:{melody[0]}\n{melody[1]}\nw:{melody[2]}"})
    else:
        ex.append({"k":"arp","lvl":2,"title":f"El acorde de {kn} desgranado","instr":"Toca las notas del acorde una a una, subiendo y bajando.",
          "abc":f"X:1\nM:4/4\nL:1/4\nK:{arp[0]}\n{arp[1]}\nw:{arp[2]}"})
    ex.append({"k":"rit","lvl":1,"title":"El ritmo (palméalo primero)","instr":"Da palmadas contando; luego tócalo en tu nota casa.",
      "abc":f"X:1\nM:{rh[0]}\nL:{rh[1]}\nK:{rh[2]}\n{rh[3]}\nw:{rh[4]}"})
    return {
     "title":title,"composer":composer,"score":score,"video":video,"level":level,
     "specs":{"ton":{"C":"Do mayor","F":"Fa mayor","G":"Sol mayor","Am":"La menor"}[key],
              "comp":meter,"tempo":tempo,"forma":forma,"dif":{"1":"Muy fácil","2":"Fácil","3":"Un reto"}[level],"manos":manos},
     "obra":obra,
     "ton_title":f"Tu tonalidad: {kn}",
     "ton_txt":f"La nota <b>{kn.split()[0]}</b> es la «casa» (donde descansa la canción) y la 5ª es el «imán» que tira para volver. "+
               ("En Fa mayor hay una tecla negra: el <b>Sib</b>." if key=="F" else
                "En Sol mayor aparece el <b>Fa#</b> (una tecla negra)." if key=="G" else
                "La menor usa solo teclas blancas, pero suena más <b>misteriosa</b>." if key=="Am" else
                "En Do mayor todo son <b>teclas blancas</b>: ¡lo más fácil!"),
     "scale":SCALES[key],
     "two":[("Las notas que usas",f"Usas estas: <b>{NOTES[key]}</b>. Búscalas en tu piano antes de tocar."),
            ("El ritmo",{"4/4":"Compás de <b>4/4</b>: cuenta 1-2-3-4 en cada compás.","3/4":"Compás de <b>3/4</b> (¡como un vals!): cuenta 1-2-3.","6/8":"Compás de <b>6/8</b>: se cuenta en dos, «1-2-3 / 4-5-6».","2/4":"Compás de <b>2/4</b>: cuenta 1-2, como una marcha corta."}.get(meter,"Cuenta el pulso en voz alta."))],
     "tec_title":f"la posición de {kn} y los acordes",
     "tec_lede":f"Pon la mano derecha en <b>posición de {kn.split()[0]}</b> (un dedo en cada tecla) y usa la izquierda para los acordes <b>{ch[3]}</b>.",
     "warm_title":f"Calentamiento · la posición de {kn.split()[0]}",
     "warm_txt":f"Coloca un dedo en cada tecla, del <b>1</b> al <b>5</b>, y toca subiendo y bajando muy despacio.",
     "kbd":POS[key],"kbd_cap":POSCAP[key],
     "steps":[("Encuentra tu nota casa.",f"Busca {kn.split()[0]} en el piano y tócala 3 veces.",""),
              ("La mano derecha sola.","Toca la melodía muy despacio, un dedo cada vez.","♩ = 60"),
              ("Los acordes.",f"Mano izquierda: los acordes {ch[3]}, uno por compás.",""),
              ("Las dos manos juntas.","Primero muy lento; cuando salga, un poquito más rápido.","♩ = 80")],
     "hard":hard,
     "interp":interp or "Tócala <b>despacio y contento</b>. Es mejor lento y sin fallos que rápido y con tropiezos. ¡Disfruta!",
     "goals":[f"Encuentro {kn.split()[0]} y pongo bien los dedos.","Toco la melodía con la mano derecha.",f"Hago los acordes {ch[3]} con la izquierda.","Junto las dos manos despacio."],
     "meta":"Meta de hoy: tocar el principio con las dos manos, ¡sin prisa!",
     "ex":ex,
    }

SONGS=[
 make("Baa Baa Black Sheep","Canción tradicional · arr. Jim Paterson","src/Baa Baa Black Sheep.pdf","69KUnCs_460","C","4/4","Alegre · ♩≈ 96","A–A–B–B","1",
   "Una canción antigua de una ovejita negra con lana para <b>tres sacos</b>. ¡Su melodía es la misma que <b>Estrellita, dónde estás</b>! Perfecta para empezar.",
   "La mano derecha canta la melodía y la izquierda acompaña con 3 acordes: DO, FA y SOL.",
   {"cc":"cc. 5–8","tt":"El cambio de acordes","reto":"Cambiar de DO a FA a SOL sin parar la melodía.","truco":"Practica solo la izquierda: DO-FA-SOL-DO muy lento, mirando la mano."},
   melody=("C","C C G G|A A G2|F F E E|D D C2|]","Do Do Sol Sol La La Sol Fa Fa Mi Mi Re Re Do")),
 make("The Wheels on the Bus","Canción tradicional · arr. Jim Paterson","src/ The Wheels on the Bus.pdf","U_osX4AHUs0","C","4/4","Marcha alegre · ♩≈ 100","Estrofa que se repite","1",
   "«Las ruedas del autobús giran y giran». Una canción de gestos con ritmo de <b>marcha</b>: perfecta para llevar el pulso con el pie.",
   "Escucha cuándo cambia de DO a FA: eso te dice cuándo mover la mano izquierda.",
   {"cc":"cc. 1–4","tt":"El salto de Do a Fa","reto":"Llegar al FA sin mirar y sin frenar la marcha.","truco":"Repite el salto Do-Fa-Do-Fa diez veces, cada vez más seguro."}),
 make("Little Miss Muffet","Canción tradicional · arr. Jim Paterson","src/Little Miss Muffet.pdf","UxRJKUSn_SM","C","4/4","Tranquilo · ♩≈ 92","Estrofa corta","1",
   "La historia de la niña que come su comidita y aparece una araña. Es cortita y muy fácil, ideal para tocar de memoria.",
   "Fíjate: casi toda la melodía va por notas <b>vecinas</b> (una al lado de la otra), sin saltos grandes.",
   {"cc":"cc. 5–8","tt":"Notas seguidas","reto":"Tocar las notas vecinas parejas, sin correr.","truco":"Cuenta 1-2-3-4 en voz alta mientras tocas, despacio."}),
 make("Do Your Ears Hang Low?","Canción tradicional · arr. Gilbert DeBenedetti","src/Do Your Ears Hang Low_.pdf","EsuiTHvocQo","C","4/4","Gracioso · ♩≈ 108","A–B","1",
   "Una canción divertida y un poco tonta sobre unas orejas que cuelgan. Se toca con ganas de reír, ligera y saltarina.",
   "Tiene notas repetidas: toca la misma tecla varias veces seguidas, ligero.",
   {"cc":"cc. 1–4","tt":"Notas repetidas","reto":"Repetir la misma nota sin que se atasque el dedo.","truco":"Cambia de dedo al repetir (3-2-1) para que suene ágil."}),
 make("Oh, When the Saints","Canción tradicional · arr. Gilbert DeBenedetti","src/Oh when the Saint.pdf","49fetoWKcAA","C","4/4","Vivo y alegre · ♩≈ 100","A–A–B","1",
   "Un himno alegre del jazz de Nueva Orleans. Empieza subiendo <b>Do-Mi-Fa-Sol</b>: fácil de recordar y muy contagioso.",
   "La melodía sube por saltos pequeños (Do-Mi-Fa-Sol). ¡Cántala mientras la tocas!",
   {"cc":"cc. 5–8","tt":"Subir Do-Mi-Fa-Sol","reto":"Que cada nota suene igual de fuerte al subir.","truco":"Toca solo esas 4 notas subiendo, cinco veces seguidas."},
   melody=("C","C E F G|G4|E C E G|C4|]","Do Mi Fa Sol Sol Mi Do Mi Sol Do")),
 make("Rain, Rain, Go Away","Canción tradicional · arr. Regina Pratley (4 manos)","src/rain-rain-away-easy-piano-4 manos.pdf","wHCIq28aqe8","C","4/4","Tranquilo · ♩≈ 90","Pregunta–respuesta","1",
   "«Lluvia, vete ya». Una cancioncita de solo <b>dos notas</b> al principio (Sol y Mi): la más fácil de todas para empezar.",
   "Es de las más cortas: se toca casi entera con la mano derecha.",
   {"cc":"cc. 1–4","tt":"Sol y Mi","reto":"Alternar Sol y Mi sin equivocarse.","truco":"Di «Sol-Mi, Sol-Mi» en voz alta mientras tocas."}),
 make("Chopsticks","Canción tradicional · arr. Gilbert DeBenedetti","src/ Chopsticks.pdf","zT2CXUKyyGM","C","3/4","Vals divertido · ♩≈ 120","Se repite","1",
   "¡El clásico «Chopsticks»! Se toca con <b>un solo dedo de cada mano</b> y suena divertidísimo. Es un vals: cuenta 1-2-3.",
   "Se toca con el dedo 2 de cada mano. ¡No necesitas más!",
   {"cc":"cc. 1–4","tt":"Las dos manos a la vez","reto":"Que las dos manos toquen justo al mismo tiempo.","truco":"Cuenta 1-2-3 en voz alta y baja los dos dedos en el «1»."},
   manos="Un dedo de cada mano"),
 make("Clementine","Canción tradicional · arr. Gilbert DeBenedetti","src/Clementine.pdf","UNZt8iVr3uY","C","3/4","Cantable · ♩≈ 100","Estrofa","1",
   "«Oh my darling Clementine», una canción vaquera muy conocida. Es un <b>vals</b> (1-2-3) y se canta con mucho sentimiento.",
   "Al ser un vals, marca bien el primer tiempo (el «1») de cada compás.",
   {"cc":"cc. 5–8","tt":"El balanceo del vals","reto":"Sentir el 1-2-3 sin que se vuelva 1-2-3-4.","truco":"Da un pisotón suave en cada «1» mientras tocas."}),
 make("Jolly Old Saint Nicholas","Villancico tradicional · arr. Gilbert DeBenedetti","src/JOLLY OLD SAINT NICHOLAS.pdf","15iuSPvHm8Y","C","4/4","Navideño · ♩≈ 96","A–B","1",
   "Un villancico sobre Papá Noel escuchando los deseos de los niños. Alegre y sencillo, ideal para tocar en Navidad.",
   "Empieza con notas repetidas: la misma tecla varias veces. ¡Cuidado con el ritmo!",
   {"cc":"cc. 1–4","tt":"Notas repetidas a tiempo","reto":"Repetir la nota sin acelerar.","truco":"Cuenta 1-2-3-4 firme; cada nota, un número."}),
 make("We Wish You a Merry Christmas","Villancico tradicional · arr. Gilbert DeBenedetti","src/ WE WISH A MERRY CRISTMAS_.pdf","7QbBTPx7JKo","C","3/4","Con alegría · ♩≈ 110","Estrofa–estribillo","1",
   "El villancico más famoso para desear feliz Navidad. Es un <b>vals</b> (1-2-3) y su melodía sube en olitas alegres.",
   "Es un vals: cuenta 1-2-3. La melodía va subiendo poquito a poco.",
   {"cc":"cc. 5–8","tt":"La melodía que sube","reto":"Subir sin equivocar la nota de arriba.","truco":"Toca solo el trocito que sube, despacio, hasta que salga."}),
 make("Aloha 'Oe","Queen Liliʻuokalani · arr. Regina Pratley","src/Aloha oe.pdf","QIjv8ZEXXZM","C","4/4","Con moto · ♩≈ 92","A–B","2",
   "Una preciosa canción hawaiana de despedida. Suena dulce y tranquila, como una ola del mar de Hawái.",
   "Tiene notas largas: déjalas sonar sin cortarlas, con calma.",
   {"cc":"cc. 5–8","tt":"Notas largas","reto":"Aguantar las notas largas contando bien.","truco":"Cuenta en voz alta los tiempos de cada nota larga."}),
 make("Puff the Magic Dragon","Peter, Paul & Mary · arr. Eric Moore","src/ puff-the-magic-dragon_.pdf","ytStrf6RQvA","C","4/4","Suave · ♩≈ 88","Estrofa–estribillo","2",
   "La historia del dragón mágico Puff y su amigo. Una canción tierna y bonita, para tocar con sentimiento.",
   "La mano izquierda hace acordes largos que sostienen la melodía. Déjalos sonar.",
   {"cc":"cc. 5–8","tt":"Melodía y acordes juntos","reto":"Que la melodía suene por encima de los acordes.","truco":"Toca la izquierda más flojito que la derecha."}),
 make("My Bonnie Lies Over the Ocean","Canción tradicional · arr. Gilbert DeBenedetti","src/MyBonnie.pdf","oRT3Y-G8Wng","C","3/4","Lento y cantable · ♩≈ 96","Estrofa","2",
   "Una canción marinera preciosa: «mi Bonnie está al otro lado del mar». Es un <b>vals</b> lento y con nostalgia.",
   "Hay pequeños cambios de posición de la mano: fíjate en los números de los dedos.",
   {"cc":"cc. 5–8","tt":"Cambiar la mano de sitio","reto":"Mover la mano a otra posición sin mirar.","truco":"Practica solo el momento del cambio, lento, varias veces."}),
 make("Polly Put the Kettle On","Canción tradicional · arr. Jim Paterson","src/ Polly Put the Kettle On.pdf","fUJynaPVatI","F","4/4","Alegre · ♩≈ 100","Estrofa","2",
   "«Polly pon la tetera», una cancioncita inglesa de la hora del té. Se toca en <b>FA mayor</b>: aparece una tecla negra, el <b>Sib</b>.",
   "En FA mayor el 4º dedo va en una tecla NEGRA (el Sib). ¡Es tu primera tecla negra!",
   {"cc":"cc. 1–4","tt":"Tocar el Sib (tecla negra)","reto":"Meter el dedo 4 en la tecla negra sin fallar.","truco":"Toca solo Fa-Sib-Fa varias veces, buscando la negra sin mirar."}),
 make("El Submarino Amarillo","Lennon / McCartney · arr. A. C. Escobés","src/ElSubmarinoAmarillo-.pdf","xdX-gS8Bvjg","G","4/4","Allegro · ♩≈ 110","Estribillo","2",
   "«Yellow Submarine» de los Beatles. Una canción marchosa y muy alegre. Se toca en <b>SOL mayor</b> (a veces aparece Fa#).",
   "En SOL mayor tu nota casa es SOL. A veces sale el Fa#, una tecla negra.",
   {"cc":"cc. 5–8","tt":"El estribillo pegadizo","reto":"Tocar el «yellow submarine» a tiempo, alegre.","truco":"Canta el estribillo mientras tocas la melodía, sin correr."}),
 make("Popeye el Marinero","Sammy Lerner · arr. A. C. Escobés","src/Popeye el marinerito.pdf","lfem5crG96c","G","3/4","Allegretto · ♩≈ 116","Se repite","2",
   "¡El tema de Popeye, el marinero de las espinacas! Es un <b>vals</b> rápido y gracioso, en SOL mayor.",
   "Es un vals (1-2-3) pero rápido y saltarín. Marca bien el «1».",
   {"cc":"cc. 5–8","tt":"El vals rápido","reto":"Llevar el 1-2-3 sin frenar ni acelerar.","truco":"Empieza muy lento y sube la velocidad poco a poco."}),
 make("La Pantera Rosa","Henry Mancini · arr. sencillo","src/La Pantera Rosa.pdf","tKIczCGGrJw","Am","4/4","Misterioso · ♩≈ 100","Tema","3",
   "¡El tema de la Pantera Rosa! Suena <b>misterioso</b>, como el gato que anda de puntillas. Se toca en <b>LA menor</b>.",
   "La menor suena misteriosa. Toca ligero y con muchos silencios, como acechando.",
   {"cc":"cc. 1–4","tt":"Notas y silencios","reto":"Respetar los silencios: ¡lo que no suena también cuenta!","truco":"Cuenta también los silencios, como si fueran notas mudas."}),
 make("Eso que tú me das","Jarabe de Palo (Pau Donés)","src/Eso-que-tu-me-das. Jarabe de Palo.pdf","ppxdqeI5TM4","C","4/4","Con ritmo · ♩≈ 108","Estrofa–estribillo","3",
   "Una canción muy bonita de agradecer lo que nos dan. Usa cuatro acordes que se repiten: perfecta para acompañar cantando.",
   "Se mueve entre 4 acordes: DO, SOL, La menor y FA. Reconócelos de oído.",
   {"cc":"cc. 5–8","tt":"La vuelta de acordes","reto":"Cambiar entre los 4 acordes sin parar.","truco":"Practica solo la izquierda: DO-SOL-Lam-FA en bucle, lento."}),
 make("Largo (Sinfonía del Nuevo Mundo)","Antonín Dvořák · arr. A. C. Escobés","src/Largo-Sinfonia 5 Dvorak.pdf","fuW_In-5t-4","C","4/4","Largo (muy lento) · ♩≈ 60","Melodía tranquila","3",
   "Una melodía clásica preciosa y muy tranquila, del compositor Dvořák. Se toca <b>muy despacio</b>, como una nana.",
   "Es muy lento: las notas duran mucho. La paciencia es lo más importante.",
   {"cc":"cc. 1–4","tt":"Tocar muy lento","reto":"Aguantar las notas largas sin acelerar.","truco":"Cuenta las corcheas dentro de cada nota larga para no correr."},
   interp="Tócala <b>lenta y con cariño</b>, como una canción de dormir. Deja que cada nota respire."),
 make("Here We Go Round the Mulberry Bush","Canción tradicional · arr. Regina Pratley (4 manos)","src/the-mulberry-bush-185807.4 manos.pdf","PyIpLrHRJ24","C","6/8","Balanceado · ♩.≈ 60","Se repite","2",
   "«Damos la vuelta a la morera». Un juego en corro con un balanceo bonito en <b>6/8</b>: se cuenta en dos grupos de tres.",
   "Compás de 6/8: se mece «1-2-3 / 4-5-6». ¡Como columpiarse!",
   {"cc":"cc. 1–4","tt":"El balanceo de 6/8","reto":"Sentir los dos pulsos por compás, no seis golpes.","truco":"Cuenta «UN-dos-tres, DOS-dos-tres» marcando el UN y el DOS."}),
]
