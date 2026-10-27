#!/usr/bin/env python3
"""Genera css/iconos-gg.css: los iconos propios de GastroGoan (27/10, «Nórdico afinado» + «Comanda»).

Por qué así: la app pinta ~290 iconos con la fuente Tabler (<i class="ti ti-x">), repartidos por miles de
plantillas. En vez de tocar cada uno, cada `.ti-x::before` se REEMPLAZA por una máscara con nuestro dibujo
(trazo fino, esquinas rectas, geometría de rejilla). El color sigue siendo `currentColor`, así que todo lo que
ya tiñe un icono (hover, estados, modo oscuro) sigue funcionando. Los iconos que no están aquí siguen con la
fuente de siempre.

Se ejecuta a mano al cambiar un dibujo:  python3 tools/generar-iconos-gg.py
"""
import re, sys, os

# Rejilla 24×24, trazo 1,8, remates y uniones redondeados: el estilo de las maquetas «Nórdico afinado» y «Comanda».
I = {
 'alert-triangle': '<path d="M12 4 21 20H3z"/><path d="M12 10v4M12 17v1"/>',
 'alert-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v1"/>',
 'info-circle': '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
 'bulb': '<path d="M8.5 15.5A6 6 0 1 1 15.5 15.5V17h-7z"/><path d="M10 20h4"/>',
 'plus': '<path d="M12 5v14M5 12h14"/>',
 'minus': '<path d="M5 12h14"/>',
 'x': '<path d="M5 5l14 14M19 5 5 19"/>',
 'check': '<path d="M4 12.5l5 5L20 6.5"/>',
 'circle-check': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
 'circle-x': '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
 'ban': '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
 'arrow-left': '<path d="M20 12H4M10 6l-6 6 6 6"/>',
 'arrow-right': '<path d="M4 12h16M14 6l6 6-6 6"/>',
 'arrow-up': '<path d="M12 20V4M6 10l6-6 6 6"/>',
 'arrow-down': '<path d="M12 4v16M6 14l6 6 6-6"/>',
 'chevron-right': '<path d="M9 5l7 7-7 7"/>',
 'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
 'chevron-down': '<path d="M5 9l7 7 7-7"/>',
 'chevron-up': '<path d="M5 15l7-7 7 7"/>',
 'trash': '<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
 'edit': '<path d="M5 20h4L20 9l-4-4L5 16zM14 7l4 4"/>',
 'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1.5A4.5 4.5 0 0 1 7 14h4a4.5 4.5 0 0 1 4.5 4.5V20M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a4.5 4.5 0 0 1 3.5 4.3V20"/>',
 'user': '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>',
 'user-shield': '<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14H10M16 21s-4-1.5-4-5v-3l4-1.5 4 1.5v3c0 3.5-4 5-4 5z"/>',
 'user-plus': '<circle cx="9" cy="8" r="3.5"/><path d="M3 20v-1.500A4.500 4.500 0 0 1 7.500 14h3M17 14v6M14 17h6"/>',
 'tools-kitchen-2': '<path d="M6 3v8a3 3 0 0 0 6 0V3M9 3v18M17 3c-2 2-2 6 0 8v10"/>',
 'table': '<path d="M4 10h16M6 10v9M18 10v9M8 6h8"/>',
 'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 'clock-exclamation': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5M12 15v1"/>',
 'printer': '<path d="M7 9V3h10v6M7 17H4V9h16v8h-3M7 14h10v7H7z"/>',
 'list-details': '<path d="M3 6h3M9 6h12M3 12h3M9 12h12M3 18h3M9 18h12"/>',
 'list': '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
 'list-check': '<path d="M3 6l2 2 3-3M11 6h10M3 14l2 2 3-3M11 14h10M11 19h10"/>',
 'calendar-event': '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3v3H8z"/>',
 'calendar': '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/>',
 'calendar-stats': '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 17v-3M12 17v-5M16 17v-2"/>',
 'calendar-time': '<path d="M4 14V6h16v6M4 10h16M8 3v4M16 3v4M4 14v6h7"/><circle cx="17" cy="17" r="4"/><path d="M17 15v2l1 1"/>',
 'mail': '<path d="M3 5h18v14H3zM3 6l9 7 9-7"/>',
 'key': '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
 'credit-card': '<path d="M3 5h18v14H3zM3 10h18M7 15h4"/>',
 'copy': '<path d="M8 8h12v12H8zM16 8V4H4v12h4"/>',
 'lock': '<path d="M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4"/>',
 'clipboard-list': '<path d="M6 5h12v16H6zM9 3h6v4H9zM9 11h6M9 15h6"/>',
 'clipboard-text': '<path d="M6 5h12v16H6zM9 3h6v4H9zM9 12h6M9 16h4"/>',
 'cash': '<path d="M3 6h18v12H3z"/><circle cx="12" cy="12" r="3"/>',
 'moped': '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17h7M15 17l-2-9h-3M18 14.500l-1.500-6.500H14"/>',
 'bell': '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4"/>',
 'bell-ringing': '<path d="M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4M3 8c.5-2 1.500-3.500 3-4.500M21 8c-.5-2-1.500-3.500-3-4.500"/>',
 'history': '<path d="M4 12a8 8 0 1 0 2.500-5.800M4 4v4h4M12 8v4l3 2"/>',
 'flame': '<path d="M12 21c-4 0-6-2.500-6-6 0-3 2-4.500 3-7 1 1.500 1.500 2 2 3 1-1.500 1.500-3.500 1-6 3 2 6 5 6 10 0 3.500-2 6-6 6z"/>',
 'building-store': '<path d="M4 9l1-5h14l1 5M4 9v11h16V9M4 9h16M9 20v-6h6v6"/>',
 'device-floppy': '<path d="M4 4h13l3 3v13H4zM8 4v5h8V4M8 20v-6h8v6"/>',
 'send': '<path d="M21 3 3 11l8 3 3 8z"/><path d="M11 14l4-4"/>',
 'note': '<path d="M5 4h14v12l-4 4H5zM15 20v-4h4M8 9h8M8 13h5"/>',
 'soup': '<path d="M3 12h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8zM8 8c0-1 1-1 1-2s-1-1-1-2M12 8c0-1 1-1 1-2s-1-1-1-2M16 8c0-1 1-1 1-2s-1-1-1-2"/>',
 'receipt': '<path d="M5 3h14v18l-3.500-2-3.500 2-3.500-2L5 21zM9 8h6M9 12h6M9 16h3"/>',
 'map-pin': '<path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.500"/>',
 'glass-cocktail': '<path d="M4 4h16l-8 9zM12 13v7M8 20h8"/>',
 'download': '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
 'upload': '<path d="M12 16V5M7 9l5-5 5 5M4 20h16"/>',
 'shopping-cart': '<path d="M4 5h2l2 11h10l2-8H7M10 20h.01M17 20h.01"/>',
 'shopping-bag': '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
 'file-text': '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 17h7"/>',
 'file-invoice': '<path d="M6 3h8l5 5v13H6zM14 3v5h5M9 12h4M9 16h6"/>',
 'chef-hat': '<path d="M6 14a4 4 0 0 1 1-7.800A5 5 0 0 1 17 6.200 4 4 0 0 1 18 14v6H6zM6 17h12"/>',
 'calculator': '<path d="M5 3h14v18H5zM8 6h8v4H8zM8 14h2M12 14h2M8 18h2M12 18h2M16 14v4"/>',
 'search': '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
 'search-off': '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M7 7l6 6"/>',
 'chart-bar': '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 'truck-delivery': '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
 'spray': '<path d="M8 10h6v11H8zM10 10V7h2v3M12 7h5M19 4v1M19 8v1M21 6h-1M17 6h-1"/>',
 'speakerphone': '<path d="M3 10v4h4l8 5V5L7 10zM18 9a4 4 0 0 1 0 6"/>',
 'refresh': '<path d="M20 5v5h-5M4 19v-5h5M5.500 10A7.500 7.500 0 0 1 19 8M18.500 14A7.500 7.500 0 0 1 5 16"/>',
 'qrcode': '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2M14 18h2v2M18 18h2v2"/>',
 'plug-connected': '<path d="M7 3v5M13 3v5M5 8h10v4a5 5 0 0 1-10 0zM10 17v4"/>',
 'package': '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
 'mood-smile': '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M8 14c1 2 3 3 4 3s3-1 4-3"/>',
 'cloud': '<path d="M7 18a4.500 4.500 0 0 1-.500-9A6 6 0 0 1 18 10.500a3.800 3.800 0 0 1-.500 7.500z"/>',
 'arrows-sort': '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
 'world': '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 'star': '<path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z"/>',
 'phone': '<path d="M5 4h4l2 5-2.500 1.500a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 'video': '<path d="M3 6h13v12H3zM16 10l5-3v10l-5-3z"/>',
 'trending-up': '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
 'rocket': '<path d="M12 3c4 2 6 6 6 10l-3 3H9l-3-3c0-4 2-8 6-10zM9 16l-2 5M15 16l2 5"/><circle cx="12" cy="10" r="1.500"/>',
 'logout': '<path d="M14 4H5v16h9M10 12h11M17 8l4 4-4 4"/>',
 'discount-2': '<path d="M4 4h16v16H4zM9 9h.01M15 15h.01M16 8l-8 8"/>',
 'device-mobile': '<path d="M7 3h10v18H7zM11 18h2"/>',
 'device-desktop': '<path d="M3 4h18v12H3zM8 21h8M12 16v5"/>',
 'coin': '<circle cx="12" cy="12" r="9"/><path d="M14.500 9a3 2 0 0 0-2.500-1c-2 0-3 1-3 2s1 1.500 3 2 3 1 3 2-1 2-3 2a3 2 0 0 1-2.500-1M12 6v2M12 16v2"/>',
 'building-factory-2': '<path d="M3 21V9l6 4V9l6 4V5h6v16zM7 17h2M13 17h2M18 17h1"/>',
 'book': '<path d="M4 5h7a1 1 0 0 1 1 1v14a1 1 0 0 0-1-1H4zM20 5h-7a1 1 0 0 0-1 1v14a1 1 0 0 1 1-1h7z"/>',
 'sparkles': '<path d="M9 4l1.500 4.500L15 10l-4.500 1.500L9 16l-1.500-4.500L3 10l4.500-1.500zM18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/>',
 'repeat': '<path d="M4 11V9a3 3 0 0 1 3-3h13M17 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H4M7 21l-3-3 3-3"/>',
 'message-chatbot': '<path d="M4 5h16v11H11l-5 4v-4H4zM9 10h.01M15 10h.01"/>',
 'loader': '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.600 5.600l2.800 2.800M15.600 15.600l2.800 2.800M5.600 18.400l2.800-2.800M15.600 8.400l2.800-2.800"/>',
 'layout-grid': '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
 'layout-dashboard': '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
 'flask': '<path d="M9 3h6M10 3v6l-5 10a1 1 0 0 0 1 2h12a1 1 0 0 0 1-2l-5-10V3M8 15h8"/>',
 'cash-register': '<path d="M5 14h14v6H5zM8 14V9h8v5M9 4h6v5H9zM9 17h.01M12 17h.01M15 17h.01"/>',
 'building-bank': '<path d="M3 9l9-5 9 5zM5 9v9M9 9v9M15 9v9M19 9v9M3 21h18"/>',
 'archive': '<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
 'address-book': '<path d="M6 3h12v18H6zM3 8h3M3 12h3M3 16h3M12 11a2 2 0 1 0 0 .01M9 17a3 3 0 0 1 6 0"/>',
 'compass': '<circle cx="12" cy="12" r="9"/><path d="M15.500 8.500l-2 5-5 2 2-5z"/>',
 'fingerprint': '<path d="M12 11v4a7 7 0 0 1-2 5M8 12a4 4 0 0 1 8 0v3a11 11 0 0 1-1 4.500M5 12a7 7 0 0 1 14 0v2M8 17c0 2-.500 3-1 4"/>',
 'confetti': '<path d="M4 20l4-12 8 8zM14 5v2M19 8h-2M20 14l-2-1M12 3l1 2"/>',
 'lifebuoy': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.500"/><path d="M6 6l3.500 3.500M18 6l-3.500 3.500M6 18l3.500-3.500M18 18l-3.500-3.500"/>',
 'settings': '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100"/>',
 'eye': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
 'eye-off': '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM4 4l16 16"/>',
 'folder': '<path d="M3 5h7l2 3h9v12H3z"/>',
 'tag': '<path d="M3 3h8l10 10-8 8L3 11zM7.500 7.500h.01"/>',
 'percent': '<circle cx="7" cy="7" r="2"/><circle cx="17" cy="17" r="2"/><path d="M19 5 5 19"/>',
 'menu-2': '<path d="M4 6h16M4 12h16M4 18h16"/>',
 'dots': '<path d="M5 12h.01M12 12h.01M19 12h.01"/>',
 'external-link': '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
 'photo': '<path d="M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6"/>',
 'bug': '<path d="M8 8h8v8a4 4 0 0 1-8 0zM12 8V4M8 12H4M16 12h4M8 16H5M16 16h3"/>',
 'tool': '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2.100 2.100 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>',
}

# Dibujos que sirven para varios nombres de la fuente.
ALIAS = {
 'pencil': 'edit', 'file-description': 'file-text', 'tools-kitchen': 'tools-kitchen-2', 'clock-hour-4': 'clock',
 'clock-hour-3': 'clock', 'clock-hour-12': 'clock', 'brand-whatsapp': 'message-chatbot', 'edit-circle': 'edit',
 'circle-check-filled': 'circle-check', 'alert-circle-filled': 'alert-circle', 'info-circle-filled': 'info-circle',
 'x-circle': 'circle-x', 'trash-x': 'trash', 'file': 'file-text', 'files': 'copy', 'search-circle': 'search',
 'adjustments': 'settings', 'settings-2': 'settings', 'ban-circle': 'ban', 'user-circle': 'user',
 'user-check': 'user', 'users-group': 'users', 'cloud-upload': 'cloud', 'cloud-check': 'cloud',
 'cloud-off': 'cloud', 'building': 'building-store', 'home': 'layout-grid', 'basket': 'shopping-bag',
 'shopping-cart-plus': 'shopping-cart', 'receipt-2': 'receipt', 'currency-euro': 'coin', 'coins': 'coin',
 'device-tablet': 'device-mobile', 'phone-call': 'phone', 'brand-instagram': 'photo', 'link': 'external-link',
}

FINOS = {'bell-ringing','tools-kitchen-2','flask','building-factory-2','list-details','calculator','file-text','file-description','shopping-cart','package','calendar-time','clipboard-list','spray','device-desktop','calendar-event','address-book','glass-cocktail','speakerphone','book','building-store','layout-dashboard','coin','compass','users','table','chart-bar'}

def uri(inner, grosor='1.8'):
    svg = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='" + grosor + "' "
           "stroke-linejoin='round' stroke-linecap='round'>" + re.sub(r'(\d)\.(\d)00\b', r'\1.\2', inner.replace('"', "'")) + "</svg>")
    return svg.replace('%', '%25').replace('<', '%3C').replace('>', '%3E').replace('#', '%23')

def main():
    out = ["/* GENERADO por tools/generar-iconos-gg.py — no editar a mano.\n"
           "   Iconos propios de GastroGoan (Nórdico afinado + Comanda): trazo fino y redondeado.\n"
           "   Sustituyen a la fuente Tabler icono a icono; el color sigue siendo currentColor. */"]
    # Un solo dibujo para varios nombres: se escribe una vez y se agrupan los selectores.
    por_dibujo = {}
    for name, inner in I.items(): por_dibujo.setdefault(inner, []).append(name)
    for a, b in ALIAS.items():
        if a not in I and b in I: por_dibujo[I[b]].append(a)
    total = 0
    for inner, nombres in por_dibujo.items():
        sel = ','.join(f'.ti-{n}::before' for n in sorted(nombres)); total += len(nombres)
        fino = ''
        if any(n in FINOS for n in nombres): fino = f'--gg-mf:url("data:image/svg+xml,{uri(inner, "1.1")}");'
        out.append(f'{sel}{{--gg-m:url("data:image/svg+xml,{uri(inner)}");{fino}content:"";display:inline-block;width:1em;height:1em;'
                   f'vertical-align:-.15em;background:currentColor;-webkit-mask:var(--gg-m) center/100% 100% no-repeat;mask:var(--gg-m) center/100% 100% no-repeat}}')
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'css', 'iconos-gg.css')
    open(base, 'w').write('\n'.join(out) + '\n')
    print(f'{total} nombres de icono, {len(por_dibujo)} dibujos → css/iconos-gg.css ({os.path.getsize(base)//1024} KB)')

main()
