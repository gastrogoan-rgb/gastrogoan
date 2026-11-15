#!/usr/bin/env python3
"""Asesoría (es/ca/en): ajustes guiados por el dueño, uno a uno, sobre la página de siempre.
La página es un «bundle» (HTML que desempaqueta una plantilla); se edita la plantilla y se
vuelve a empaquetar. Idempotente: parte siempre de la versión guardada en git (a152bda).
 1) Titular más pequeño (antes hasta 80 px).
 2) «Sobre mí» con un poco de edición: retrato ilustrado de Marcos que flota (como las gg de la
    app), cita destacada con la raya oliva y la columna de texto al lado.
Uso: python3 tools/web-parche/asesoria.py
"""
import re, json, os, subprocess
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
PAGS = {'es': 'asesoria', 'ca': 'ca-assessoria', 'en': 'en-advisory'}
BASE_GIT = 'a152bda'
ALT = {'es': 'Retrato ilustrado de Marcos González', 'ca': 'Retrat il·lustrat de Marcos González', 'en': 'Illustrated portrait of Marcos González'}

CSS = '''<style data-gg="asesoria">
/* «Sobre mí»: el texto y, debajo, una firma: la foto en miniatura (círculo con borde verde) y al
   lado la cita en cursiva subrayada en verde. Igual en cualquier pantalla. */
.gg-sobre-txt{display:flex;flex-direction:column;gap:14px;max-width:640px}
.gg-sobre-et{display:inline-flex;align-items:center;gap:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.gg-sobre-et::before{content:"";width:28px;height:2px;background:#4A5D4E}
.gg-firma{display:flex;align-items:center;gap:16px;margin-top:10px}
.gg-sobre-foto{flex:none;margin:0;width:68px;height:68px;border-radius:50%;border:2px solid #4A5D4E;overflow:hidden;background:transparent;box-shadow:0 0 0 4px #FAF8F4,0 0 0 5px #C9D3CB}
.gg-sobre-foto img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 6%}
.gg-cita{margin:0;font-size:15.5px;line-height:2;font-weight:400;font-style:italic;color:#1C1A17;text-wrap:balance}
/* Subrayado de rotulador: una franja verde detrás de la mitad baja de las letras, no una línea. */
.gg-marca{background:#4A5D4E;color:#FAF8F4;-webkit-box-decoration-break:clone;box-decoration-break:clone;padding:3px 8px 4px;border-radius:2px}
@media (max-width:420px){.gg-sobre-foto{width:58px;height:58px}.gg-cita{font-size:14.5px}.gg-firma{gap:13px}}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-flotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
  .gg-sobre-foto{animation:gg-flotar 3.6s ease-in-out infinite}
}
</style>'''

# Lo que cuenta «Sobre mí»: quién es, su formación y sus valores (pedido del dueño, 16/11); el
# método ya se explica en «La ruta 360º». Debajo, solo la cita.
BIO = {
 'es': ['Ocho años de formación en las mejores escuelas de hostelería de España y trayectoria en restaurantes de renombre. Especializado en gestión de empresa: números, equipos y procesos que hacen que un local funcione y gane dinero.',
        'Trabajo bajo tres valores: honestidad para decir las cosas como son, exigencia con el oficio y cercanía con quien lleva el negocio.'],
 'ca': ["Vuit anys de formació a les millors escoles d'hostaleria d'Espanya i trajectòria en restaurants de renom. Especialitzat en gestió d'empresa: números, equips i processos que fan que un local funcioni i guanyi diners.",
        "Treballo sota tres valors: honestedat per dir les coses com són, exigència amb l'ofici i proximitat amb qui porta el negoci."],
 'en': ["Eight years of training at Spain's best hospitality schools and experience in renowned restaurants. Specialised in business management: the numbers, teams and processes that make a venue work and make money.",
        'I work by three values: honesty to say things as they are, high standards for the craft, and closeness to the people who run the business.'],
}

def sobre(sec, l):
    et = re.search(r'<span[^>]*>([^<]+)</span>', sec).group(1)
    nombre = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    ps = re.findall(r'<p[^>]*>(.*?)</p>', sec, re.S)
    m = re.search(r'((?:Si |If )[^.]*[.!?])\s*$', ps[0], re.S)
    cita = m.group(1) if m else ''
    texto = ''.join(f'<p style="margin:0;font-size:16px;line-height:1.65;color:#3D3A34;text-wrap:pretty;">{p}</p>' for p in BIO[l])
    return f'''<section class="aseso-sobre" style="padding:clamp(40px,5.5vw,72px) clamp(24px,6vw,64px);border-bottom:1px solid #E7E2D9;">
    <div class="gg-sobre-txt">
      <span class="gg-sobre-et">{et}</span>
      <h2 style="margin:0;font-size:clamp(26px,3vw,36px);font-weight:700;letter-spacing:-0.02em;">{nombre}</h2>
      {texto}
      <div class="gg-firma">
        <figure class="gg-sobre-foto"><img src="img/slot-marcos-retrato.webp" alt="{ALT[l]}" width="431" height="580" loading="lazy"></figure>
        {f'<blockquote class="gg-cita"><span class="gg-marca">{cita}</span></blockquote>' if cita else ''}
      </div>
    </div>
  </section>'''

def procesar(l):
    arch = PAGS[l] + '.html'; ruta = os.path.join(RAIZ, 'deploy', 'web', 'public', arch)
    s = subprocess.run(['git', 'show', f'{BASE_GIT}:deploy/web/public/{arch}'], capture_output=True, text=True, cwd=RAIZ, check=True).stdout
    m = re.search(r'(<script type="__bundler/template">\s*)(.*?)(\s*</script>)', s, re.S)
    t = json.loads(m.group(2))
    # 1) titular
    t, n = re.subn(r'(<h1 style="margin:0;)font-size:clamp\(30px,7vw,80px\);', r'\1font-size:clamp(28px,5vw,56px);', t, count=1)
    assert n == 1, 'titular'
    # 2) sobre mí
    i = t.index('<section class="aseso-sobre"'); j = t.index('</section>', i) + len('</section>')
    t = t[:i] + sobre(t[i:j], l) + t[j:]
    t = t.replace('</helmet>', CSS + '\n</helmet>', 1)
    nuevo = json.dumps(t, ensure_ascii=False).replace('</', '<\\u002F')
    open(ruta, 'w', encoding='utf-8').write(s[:m.start(2)] + nuevo + s[m.end(2):])
    print('OK', arch, '· cita:', bool(re.search('gg-cita', t)))

for l in PAGS: procesar(l)
