#!/usr/bin/env python3
# -*- coding: utf-8 -*-
from fpdf import FPDF

ORANGE = (223, 112, 57)
CREAM = (246, 237, 213)
DARK = (40, 40, 40)
MUTED = (110, 110, 110)
GREEN = (37, 211, 102)
BLUE = (59, 130, 196)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"

class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("DejaVu", "B", 9)
        self.set_text_color(*ORANGE)
        self.cell(0, 8, "GastroGoan · Guía de puesta en marcha", ln=1)
        self.set_draw_color(*CREAM)
        self.set_line_width(0.5)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)

    def footer(self):
        self.set_y(-15)
        self.set_font("DejaVu", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 10, f"Página {self.page_no()}", align="C")


def add_fonts(pdf):
    pdf.add_font("DejaVu", "", f"{FONT_DIR}/DejaVuSans.ttf")
    pdf.add_font("DejaVu", "B", f"{FONT_DIR}/DejaVuSans-Bold.ttf")
    pdf.add_font("DejaVu", "I", f"{FONT_DIR}/DejaVuSans.ttf")


def step_badge(pdf, n, title, time_est):
    pdf.set_fill_color(*ORANGE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("DejaVu", "B", 13)
    pdf.cell(10, 10, "", fill=True)  # spacer not used
    pdf.set_xy(pdf.get_x(), pdf.get_y())


def section_title(pdf, number, title, time_est):
    pdf.ln(2)
    y = pdf.get_y()
    # circle with number
    pdf.set_fill_color(*ORANGE)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("DejaVu", "B", 14)
    pdf.ellipse(10, y, 12, 12, style="F")
    pdf.set_xy(10, y + 1.2)
    pdf.cell(12, 10, str(number), align="C")
    # title
    pdf.set_xy(26, y)
    pdf.set_text_color(*DARK)
    pdf.set_font("DejaVu", "B", 14)
    pdf.cell(0, 6, title, ln=1)
    pdf.set_xy(26, pdf.get_y())
    pdf.set_font("DejaVu", "I", 10)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 6, f"Tiempo estimado: {time_est}", ln=1)
    pdf.set_text_color(*DARK)
    pdf.ln(3)


def sub_step(pdf, num, text):
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(*ORANGE)
    pdf.set_x(20)
    pdf.cell(8, 6, f"{num}.", ln=0)
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(*DARK)
    pdf.set_x(28)
    pdf.multi_cell(0, 6, text)
    pdf.ln(1)


def callout(pdf, text, kind="tip"):
    color = CREAM if kind == "tip" else (255, 243, 224)
    bar = ORANGE if kind != "warn" else (192, 57, 43)
    icon = "Consejo: " if kind == "tip" else "Importante: "
    pdf.set_x(20)
    x0 = pdf.get_x()
    y0 = pdf.get_y()
    pdf.set_font("DejaVu", "", 10)
    w = pdf.w - 20 - 20
    # measure height by splitting lines
    lines = pdf.multi_cell(w - 6, 5.5, icon + text, dry_run=True, output="LINES")
    h = 5.5 * len(lines) + 6
    pdf.set_fill_color(*color)
    pdf.rect(x0, y0, w, h, style="F")
    pdf.set_draw_color(*bar)
    pdf.set_line_width(1.2)
    pdf.line(x0 + 0.6, y0, x0 + 0.6, y0 + h)
    pdf.set_xy(x0 + 4, y0 + 3)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(w - 6, 5.5, icon + text)
    pdf.set_xy(x0, y0 + h + 3)


def faq_item(pdf, q, a):
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(*ORANGE)
    pdf.multi_cell(0, 6, "P: " + q)
    pdf.set_font("DejaVu", "", 10.5)
    pdf.set_text_color(*DARK)
    pdf.set_x(10)
    pdf.multi_cell(0, 5.8, a)
    pdf.ln(2)


pdf = PDF()
add_fonts(pdf)
pdf.set_auto_page_break(auto=True, margin=18)

# ---------- PORTADA ----------
pdf.add_page()
pdf.set_fill_color(*ORANGE)
pdf.rect(0, 0, 210, 70, style="F")
pdf.set_xy(0, 22)
pdf.set_text_color(255, 255, 255)
pdf.set_font("DejaVu", "B", 28)
pdf.cell(0, 14, "GastroGoan", align="C", ln=1)
pdf.set_font("DejaVu", "", 14)
pdf.cell(0, 10, "Guía de puesta en marcha", align="C", ln=1)

pdf.set_y(85)
pdf.set_text_color(*DARK)
pdf.set_font("DejaVu", "B", 16)
pdf.cell(0, 10, "En solo 3 pasos, tu app estará lista para usar", align="C", ln=1)
pdf.ln(4)
pdf.set_font("DejaVu", "", 12)
pdf.set_text_color(*MUTED)
pdf.cell(0, 8, "Tiempo total estimado: unos 20 minutos · Solo tienes que hacerlo UNA VEZ", align="C", ln=1)

pdf.ln(14)
pdf.set_x(20)
pdf.set_font("DejaVu", "", 11)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 6.5,
    "Sigue esta guía de principio a fin, en el orden indicado, sin saltarte pasos. "
    "No necesitas conocimientos técnicos: solo ir despacio y seguir cada paso tal y como se explica.\n\n"
    "Al terminar el Paso 3, tu app estará completamente lista: con tu licencia activada, "
    "tu propia carta digital online y un código QR para que tus clientes reserven mesa o hagan pedidos desde el móvil.")

pdf.ln(8)
callout(pdf,
    "Antes de empezar, asegúrate de tener a mano: los dos archivos que te han enviado "
    "(la app de gestión y el archivo \"reservagastrogoan.html\") y tu clave de licencia "
    "personal (te la habrán dado por WhatsApp o email).")

pdf.ln(10)
pdf.set_x(20)
pdf.set_font("DejaVu", "B", 12)
pdf.set_text_color(*DARK)
pdf.cell(0, 8, "Resumen de los 3 pasos:", ln=1)
resumen = [
    ("1", "Sube los archivos a internet (Netlify)", "~10 min"),
    ("2", "Activa tu licencia", "~2 min"),
    ("3", "Configura tu nube (Firebase)", "~10 min"),
]
pdf.set_font("DejaVu", "", 11)
for n, t, tm in resumen:
    pdf.set_x(24)
    pdf.set_text_color(*ORANGE)
    pdf.set_font("DejaVu", "B", 11)
    pdf.cell(8, 7, n + ".", ln=0)
    pdf.set_font("DejaVu", "", 11)
    pdf.set_text_color(*DARK)
    pdf.cell(0, 7, f"{t}   ({tm})", ln=1)

# ---------- PASO 1 ----------
pdf.add_page()
section_title(pdf, 1, "Sube los archivos a internet (Netlify)", "~10 minutos")

pdf.set_x(20)
pdf.set_font("DejaVu", "", 10.5)
pdf.multi_cell(0, 6,
    "Para que tu app funcione correctamente (y para que el código QR de reservas y pedidos "
    "funcione en el móvil de tus clientes), los dos archivos que te han entregado deben "
    "subirse juntos a un servicio gratuito llamado Netlify, que les da una dirección web propia.")
pdf.ln(2)

sub_step(pdf, "1", "Localiza en tu ordenador o móvil los dos archivos que te han enviado: "
    "el archivo de la app (termina en \".html\") y el archivo \"reservagastrogoan.html\". "
    "Guárdalos juntos dentro de una misma carpeta nueva, por ejemplo llamada \"GastroGoan\".")

sub_step(pdf, "2", "Abre un navegador (Chrome, Safari, etc.) y entra en la web: www.netlify.com")

sub_step(pdf, "3", "Pulsa el botón \"Sign up\" (Registrarse) y crea una cuenta gratuita. "
    "Puedes registrarte con tu cuenta de Google o de email; es gratis y no pide tarjeta de crédito.")

sub_step(pdf, "4", "Una vez dentro de tu panel de Netlify, busca un botón que diga "
    "\"Add new site\" (Añadir nuevo sitio) y elige la opción \"Deploy manually\" "
    "(Desplegar manualmente).")

sub_step(pdf, "5", "Te aparecerá un recuadro grande donde puedes arrastrar archivos. "
    "Arrastra ahí dentro la carpeta \"GastroGoan\" que has creado en el paso 1 "
    "(con los dos archivos dentro), o selecciona y arrastra los dos archivos a la vez.")

sub_step(pdf, "6", "Espera unos segundos. Netlify subirá los archivos y te mostrará una "
    "dirección web (URL) parecida a esta: https://nombre-aleatorio-12345.netlify.app")

callout(pdf,
    "(Opcional) Puedes cambiar ese nombre tan raro por uno más fácil de recordar."
    "Dentro del sitio, busca \"Site configuration\" → \"Change site name\" y escribe algo "
    "como el nombre de tu restaurante (por ejemplo: mi-restaurante.netlify.app).")

sub_step(pdf, "7", "Copia esa dirección web (la URL). A partir de ahora, ESA es la dirección "
    "de tu app: ábrela en el navegador del ordenador y del móvil/tablet del restaurante, "
    "y guárdala como favorito o añádela a la pantalla de inicio del móvil "
    "(en el menú del navegador busca \"Añadir a pantalla de inicio\") para acceder con un solo toque, "
    "como si fuera una aplicación.")

callout(pdf,
    "Importante: a partir de ahora, usa SIEMPRE esa dirección web para abrir la app, tanto "
    "en el ordenador como en el móvil. No vuelvas a abrir los archivos originales con doble clic: "
    "puedes guardarlos como copia de seguridad, pero no los uses para trabajar.",
    kind="warn")

# ---------- PASO 2 ----------
pdf.add_page()
section_title(pdf, 2, "Activa tu licencia", "~2 minutos")

pdf.set_x(20)
pdf.set_font("DejaVu", "", 10.5)
pdf.multi_cell(0, 6,
    "Cada copia de GastroGoan tiene una clave de licencia única, asociada a tu negocio. "
    "Esta clave te la habrá proporcionado la persona que te ha vendido la app "
    "(normalmente por WhatsApp o email).")
pdf.ln(2)

sub_step(pdf, "1", "Abre la dirección web de Netlify que has guardado en el Paso 1 "
    "(la primera vez tardará unos segundos en cargar).")

sub_step(pdf, "2", "Automáticamente aparecerá una pantalla pidiéndote que elijas si eres "
    "\"el/la propietario/a\" o \"empleado/a\". Si eres el dueño del negocio, elige "
    "\"Soy el dueño/a\".")

sub_step(pdf, "3", "A continuación, pega tu clave de licencia en el campo correspondiente "
    "(puedes copiarla directamente del mensaje que te enviaron) y pulsa el botón para activarla.")

sub_step(pdf, "4", "Si la clave es correcta, la app se desbloqueará y pasará automáticamente "
    "al Paso 3 (configuración de la nube). Si te indica que la clave no es válida, "
    "revisa que la has copiado completa, sin espacios al principio o al final.")

callout(pdf,
    "Guarda tu clave de licencia en un lugar seguro (notas del móvil, por ejemplo). "
    "La necesitarás solo esta vez, pero conviene tenerla a mano por si en algún momento "
    "necesitas reinstalar la app.")

# ---------- PASO 3 ----------
pdf.add_page()
section_title(pdf, 3, "Configura tu nube (Firebase)", "~10 minutos")

pdf.set_x(20)
pdf.set_font("DejaVu", "", 10.5)
pdf.multi_cell(0, 6,
    "Este último paso conecta tu app con un espacio de almacenamiento gratuito en internet "
    "(de Google). Sirve para que todos los dispositivos del restaurante (camareros, cocina, caja) "
    "estén siempre sincronizados, y para que la carta y los pedidos online funcionen.")
pdf.ln(2)

sub_step(pdf, "1", "Justo después de activar tu licencia, la propia app te mostrará en "
    "pantalla una guía con 6 pasos numerados, titulada \"Configura tu nube\".")

sub_step(pdf, "2", "Sigue esos 6 pasos tal y como aparecen en tu pantalla, en orden y sin "
    "saltarte ninguno. La guía te irá indicando exactamente dónde pulsar dentro de la web "
    "de Firebase (console.firebase.google.com), con capturas y explicaciones detalladas "
    "para cada botón.")

sub_step(pdf, "3", "Al final de esos 6 pasos, copiarás dos datos (\"Clave de API\" y "
    "\"URL de la base de datos\") y los pegarás en la propia app, donde se te indique. "
    "Pulsa \"Guardar y conectar\".")

sub_step(pdf, "4", "La app se recargará sola y quedará completamente lista para usar. "
    "Es posible que te aparezca un tour/recorrido guiado por las distintas pantallas: "
    "puedes seguirlo para familiarizarte con la app, o cerrarlo si prefieres explorar tú mismo.")

callout(pdf,
    "Guarda también los dos datos del paso 3 (Clave de API y URL de la base de datos) "
    "en un lugar seguro. Los necesitarás si más adelante quieres configurar otro dispositivo "
    "(móvil de un camarero, tablet de cocina, etc.) o el ordenador de la caja: en esos casos, "
    "no hay que repetir todo el proceso, solo pegar esos dos datos cuando la app lo pida.")

pdf.ln(2)
pdf.set_x(20)
pdf.set_font("DejaVu", "B", 12)
pdf.set_text_color(*ORANGE)
pdf.cell(0, 8, "¡Listo! Tu app ya está lista para usar.", ln=1)
pdf.set_x(20)
pdf.set_font("DejaVu", "", 10.5)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 6,
    "Desde el menú de \"Reservas y pedidos online\" dentro de la app podrás descargar tu "
    "código QR y tu enlace para compartir con tus clientes (imprímelo en las mesas, "
    "escaparate o redes sociales).")

# ---------- COMPARTIR CON EMPLEADOS ----------
pdf.add_page()
pdf.set_fill_color(*CREAM)
pdf.rect(10, pdf.get_y(), 190, 12, style="F")
pdf.set_xy(14, pdf.get_y() + 2)
pdf.set_font("DejaVu", "B", 13)
pdf.set_text_color(*ORANGE)
pdf.cell(0, 8, "Extra: compartir la app con tus empleados", ln=1)
pdf.ln(4)

pdf.set_x(20)
pdf.set_font("DejaVu", "", 10.5)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 6,
    "Cuando quieras dar acceso a un camarero, cocinero o encargado, no necesitan ninguna "
    "clave de licencia ni hacer nada de lo anterior. Solo tienes que:")
pdf.ln(1)

sub_step(pdf, "1", "Enviarles la misma dirección web de Netlify (la del Paso 1).")

sub_step(pdf, "2", "Al abrirla por primera vez, la app les preguntará si son "
    "\"el/la propietario/a\" o \"empleado/a\": deben elegir \"Soy empleado/a\".")

sub_step(pdf, "3", "La app les pedirá la \"Clave de API\" y la \"URL de la base de datos\" "
    "que guardaste en el Paso 3. Pégaselas (puedes enviárselas por WhatsApp) y listo: "
    "su dispositivo quedará sincronizado con el resto del restaurante al instante.")

pdf.ln(4)

# ---------- FAQ ----------
pdf.set_fill_color(*CREAM)
pdf.rect(10, pdf.get_y(), 190, 12, style="F")
pdf.set_xy(14, pdf.get_y() + 2)
pdf.set_font("DejaVu", "B", 13)
pdf.set_text_color(*ORANGE)
pdf.cell(0, 8, "Preguntas frecuentes", ln=1)
pdf.ln(4)

faq_item(pdf,
    "¿Tengo que borrar los archivos originales del ordenador?",
    "No. Puedes guardarlos como copia de seguridad en una carpeta. Lo único importante es "
    "que, para trabajar día a día, uses siempre la dirección web de Netlify (Paso 1), no los "
    "archivos sueltos.")

faq_item(pdf,
    "He abierto la app y aparece vacía, sin mis datos.",
    "Probablemente la has abierto haciendo doble clic en el archivo del ordenador, en vez "
    "de usar la dirección web de Netlify. Cierra esa pestaña y abre la dirección guardada "
    "en el Paso 1.")

faq_item(pdf,
    "¿Tiene algún coste Netlify o Firebase?",
    "No. Ambos son gratuitos para el uso normal de un restaurante (ni siquiera piden tarjeta "
    "de crédito). Solo tendrían coste si en el futuro creciera muchísimo el número de clientes "
    "que usan la carta online, algo muy poco probable.")

faq_item(pdf,
    "¿Puedo usar la app en varios dispositivos a la vez (móvil, tablet, ordenador)?",
    "Sí. Abre la misma dirección web de Netlify en cada dispositivo. La primera vez que "
    "entres en uno nuevo, sigue las instrucciones del apartado \"Compartir la app con tus "
    "empleados\" de esta guía (pega los datos del Paso 3) y quedará sincronizado con los demás.")

faq_item(pdf,
    "¿Qué pasa si pierdo la clave de licencia o los datos del Paso 3?",
    "Dentro de la app, en el menú de Nube, puedes volver a consultar los datos de conexión "
    "(Clave de API y URL de la base de datos) en cualquier momento. La clave de licencia "
    "conviene guardarla aparte (notas del móvil, email) por si tuvieras que reinstalar la app "
    "desde cero.")

faq_item(pdf,
    "¿Necesito saber programar o tener conocimientos técnicos?",
    "No. Todos los pasos consisten en pulsar botones y copiar/pegar texto. Si sigues la guía "
    "con calma, en unos 20 minutos tendrás todo listo.")

pdf.output("/home/user/gastrogoan/Guia-puesta-en-marcha-GastroGoan.pdf")
print("OK")
