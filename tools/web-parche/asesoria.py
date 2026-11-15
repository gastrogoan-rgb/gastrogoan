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
.gg-sobre{display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:clamp(28px,5vw,72px);align-items:center;max-width:1040px;isolation:isolate}
.gg-sobre-foto{position:relative;margin:0;aspect-ratio:431/580;background:#F1EFE9;border:1px solid #E7E2D9}
.gg-sobre-foto::before{content:"";position:absolute;inset:14px -14px -14px 14px;border:1px solid #4A5D4E;z-index:-1}
.gg-sobre-foto img{position:absolute;inset:6% 6% 0;width:88%;height:94%;object-fit:contain;object-position:bottom}
.gg-sobre-foto figcaption{position:absolute;left:0;bottom:-34px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#716C65}
.gg-sobre-txt{display:flex;flex-direction:column;gap:16px;max-width:600px}
.gg-sobre-et{display:inline-flex;align-items:center;gap:10px;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#4A5D4E}
.gg-sobre-et::before{content:"";width:28px;height:2px;background:#4A5D4E}
.gg-cita{margin:6px 0;padding:2px 0 2px 18px;border-left:3px solid #4A5D4E;font-size:clamp(19px,1.1rem + .6vw,24px);line-height:1.35;font-weight:600;letter-spacing:-.015em;color:#1C1A17;text-wrap:balance}
@media (max-width:720px){
  .gg-sobre{grid-template-columns:1fr;justify-items:center;gap:68px}
  .gg-sobre-foto{width:min(240px,64vw)}
  .gg-sobre-txt{max-width:none;width:100%}
}
@media (prefers-reduced-motion:no-preference){
  @keyframes gg-flotar{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  .gg-sobre-foto img{animation:gg-flotar 3.6s ease-in-out infinite}
}
</style>'''

def sobre(sec, l):
    et = re.search(r'<span[^>]*>([^<]+)</span>', sec).group(1)
    nombre = re.search(r'<h2[^>]*>([^<]+)</h2>', sec).group(1)
    ps = re.findall(r'<p[^>]*>(.*?)</p>', sec, re.S)
    # La última frase del primer párrafo («Si buscas…, no soy tu asesor») pasa a ser la cita.
    m = re.match(r'(.*[.!?])\s+((?:Si |If )[^.]*[.!?])\s*$', ps[0], re.S)
    p1, cita = (m.group(1), m.group(2)) if m else (ps[0], '')
    resto = ''.join(f'<p style="margin:0;font-size:16px;line-height:1.65;color:#3D3A34;text-wrap:pretty;">{p}</p>' for p in ps[1:])
    return f'''<section class="aseso-sobre" style="padding:clamp(40px,5.5vw,76px) clamp(24px,6vw,64px) clamp(56px,6.5vw,92px);border-bottom:1px solid #E7E2D9;">
    <div class="gg-sobre">
      <figure class="gg-sobre-foto"><img src="img/slot-marcos-retrato.webp" alt="{ALT[l]}" width="431" height="580" loading="lazy"><figcaption>{nombre} · GastroGoan</figcaption></figure>
      <div class="gg-sobre-txt">
        <span class="gg-sobre-et">{et}</span>
        <h2 style="margin:0;font-size:clamp(26px,3vw,36px);font-weight:700;letter-spacing:-0.02em;">{nombre}</h2>
        <p style="margin:0;font-size:16px;line-height:1.65;color:#3D3A34;text-wrap:pretty;">{p1}</p>
        {f'<blockquote class="gg-cita">{cita}</blockquote>' if cita else ''}
        {resto}
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
