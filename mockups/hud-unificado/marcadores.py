# Marcadores pixel art provisionales para las 3 direcciones (marcos nine-slice, texturas e iconos).
# Uso: python3 mockups/hud-unificado/marcadores.py  → escribe mockups/hud-unificado/px/*.png
# Son PROVISIONALES: el diseñador los sustituye por los definitivos con las mismas medidas y cortes.
import os, random
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), 'px')
os.makedirs(OUT, exist_ok=True)
R = random.Random(7)

def hexc(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def img(w, h, fill=(0, 0, 0, 0)):
    return Image.new('RGBA', (w, h), fill)

def jitter(c, n):
    return tuple(max(0, min(255, c[i] + R.randint(-n, n))) for i in range(3)) + (c[3],)

def texture(w, h, base, n, specks=()):
    im = img(w, h); px = im.load()
    for y in range(h):
        for x in range(w):
            px[x, y] = jitter(hexc(base), n)
    for col, k in specks:
        for _ in range(k):
            px[R.randrange(w), R.randrange(h)] = hexc(col)
    return im

def frame(size, slice_, fill_tex, edge, edge_hi, edge_lo, corner=None, burnt=None, rivet=None):
    """Marco cuadrado: borde de 2 px (claro arriba-izq, oscuro abajo-dcha), relleno con textura y esquina decorada."""
    im = fill_tex.crop((0, 0, size, size)); px = im.load()
    for i in range(size):
        for t, col in ((0, edge_lo), (1, edge)):
            px[i, t] = hexc(col); px[t, i] = hexc(col)
            px[i, size - 1 - t] = hexc(col); px[size - 1 - t, i] = hexc(col)
        px[i, 2] = hexc(edge_hi) if 2 < i < size - 3 else px[i, 2]
        px[2, i] = hexc(edge_hi) if 2 < i < size - 3 else px[2, i]
    if burnt:  # bordes quemados: píxeles oscuros que entran desde el borde (solo en los lados, que se repiten bien)
        for i in range(3, size - 3):
            for side in range(4):
                d = R.choice([0, 0, 1, 1, 2])
                for k in range(d):
                    xy = [(i, 3 + k), (3 + k, i), (i, size - 4 - k), (size - 4 - k, i)][side]
                    px[xy] = hexc(burnt, 200)
    if rivet:
        for cx, cy in ((4, 4), (size - 5, 4), (4, size - 5), (size - 5, size - 5)):
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                px[cx + dx, cy + dy] = hexc(rivet[0] if (dx, dy) == (0, 0) else rivet[1])
    if corner:
        for cx, cy, sx, sy in ((0, 0, 1, 1), (size - 1, 0, -1, 1), (0, size - 1, 1, -1), (size - 1, size - 1, -1, -1)):
            for k in range(slice_ - 2):
                px[cx + sx * k, cy] = hexc(corner); px[cx, cy + sy * k] = hexc(corner)
            px[cx + sx * 1, cy + sy * 1] = hexc(corner)
    return im

def save(im, name):
    im.save(os.path.join(OUT, name + '.png'))

# ── Texturas repetibles (32×32) ──
save(texture(32, 32, '#c9b48a', 7, [('#a8916a', 40), ('#8e7752', 10), ('#dccaa2', 20)]), 'tex-pergamino')
save(texture(32, 32, '#3a2a20', 5, [('#2a1d16', 50), ('#4a372a', 30)]), 'tex-cuero')
save(texture(32, 32, '#16141b', 3, [('#1e1b24', 40), ('#0e0d12', 30)]), 'tex-piedra')
save(texture(32, 32, '#2b2018', 4, [('#21180f', 60), ('#3a2b1f', 20)]), 'tex-madera')

# ── Marcos nine-slice 24×24, corte 8 ──
save(frame(24, 8, texture(24, 24, '#c9b48a', 7, [('#a8916a', 18)]), '#3b2a18', '#e2d2ac', '#1a120a', corner='#6b4a22', burnt='#5a3d1c'), 'marco-pergamino')
save(frame(24, 8, texture(24, 24, '#3a2a20', 5, [('#2a1d16', 30)]), '#5b5662', '#8d8794', '#0b0a0d', rivet=('#b5aeb9', '#4d4954')), 'marco-cuero')
save(frame(24, 8, texture(24, 24, '#16141b', 3), '#4a4552', '#6b6672', '#07060a', corner='#8a6a2a', rivet=('#8d8794', '#2e2b33')), 'marco-hierro')
save(frame(24, 8, texture(24, 24, '#2b2018', 4), '#4a3524', '#6b5038', '#0e0905', rivet=('#9a8f7c', '#3a3028')), 'marco-madera')

# ── Casillas 12×12, corte 4 (hundidas) ──
def slot(base, lo, hi):
    im = texture(12, 12, base, 2); px = im.load()
    for i in range(12):
        px[i, 0] = hexc(lo); px[0, i] = hexc(lo); px[i, 11] = hexc(hi); px[11, i] = hexc(hi)
    return im
save(slot('#b39d74', '#6b5638', '#dccaa2'), 'casilla-pergamino')
save(slot('#1c1612', '#07060a', '#4a3a2c'), 'casilla-cuero')
save(slot('#0f0e13', '#050407', '#3a3741'), 'casilla-hierro')

# ── Botones 16×16, corte 5 ──
def button(top, mid, bot, edge):
    im = img(16, 16); px = im.load()
    for y in range(16):
        c = top if y < 5 else mid if y < 12 else bot
        for x in range(16): px[x, y] = jitter(hexc(c), 3)
    for i in range(16):
        px[i, 0] = hexc(edge); px[0, i] = hexc(edge); px[i, 15] = hexc(edge); px[15, i] = hexc(edge)
    for cx, cy in ((2, 2), (13, 2), (2, 13), (13, 13)): px[cx, cy] = hexc('#e6dfd0')
    return im
save(button('#7a7480', '#5b5662', '#3a3741', '#07060a'), 'boton-hierro')
save(button('#f2c75a', '#c48f22', '#8a5d14', '#2a1a06'), 'boton-oro')
save(button('#dccaa2', '#c9b48a', '#a8916a', '#3b2a18'), 'boton-pergamino')
save(button('#7a5a36', '#5a4026', '#3a2a1a', '#0e0905'), 'boton-cuero')

# ── Pestaña marcapáginas 16×28 (corte: 4 arriba, 8 abajo, 4 lados): cinta con muesca ──
def bookmark(c1, c2):
    im = img(16, 28); px = im.load()
    for y in range(28):
        for x in range(16):
            notch = y >= 22 and abs(x - 7.5) < (y - 21)
            if not notch: px[x, y] = jitter(hexc(c1 if 3 < x < 12 else c2), 4)
    for y in range(22): px[0, y] = hexc('#07060a'); px[15, y] = hexc('#07060a')
    return im
save(bookmark('#8a1c24', '#6a1018'), 'marcapaginas-rojo')
save(bookmark('#3a3741', '#2e2b33'), 'marcapaginas-gris')

# ── Separador ornamentado 48×7 (corte: 20 | 8 | 20; el centro no se repite, los lados sí) ──
def divider(line, gem):
    im = img(48, 7); px = im.load()
    for x in range(48):
        if x < 20 or x > 27: px[x, 3] = hexc(line)
        if x % 6 == 0 and (x < 18 or x > 29): px[x, 2] = hexc(line); px[x, 4] = hexc(line)
    for dy in range(-3, 4):
        w = 3 - abs(dy)
        for dx in range(-w, w + 1): px[24 + dx, 3 + dy] = hexc(gem if abs(dx) + abs(dy) < 2 else line)
    return im
save(divider('#5a3d1c', '#8a1c24'), 'separador-pergamino')
save(divider('#5b5662', '#c9a24a'), 'separador-hierro')

# ── Iconos 12×12 ──
def icon(rows, pal):
    im = img(len(rows[0]), len(rows)); px = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.': px[x, y] = hexc(pal[ch])
    return im
D20 = ['....oooo....', '..oowwwwoo..', '.owwwlwwwwo.', 'owwwlllwwwwo', 'owwlll1lwwwo', 'owwl1l1llwwo', 'owlll1lllwwo',
       'owwlllllwwwo', '.owwwllwwwo.', '..oowwwwoo..', '....oooo....', '............']
save(icon(D20, {'o': '#07060a', 'w': '#c9b48a', 'l': '#8a6a3a', '1': '#2a1a0a'}), 'icono-dado')
SEAL = ['....rrrr....', '..rrRRRRrr..', '.rRRRddRRRr.', '.rRRdRRdRRr.', 'rRRdRRRRdRRr', 'rRRRRddRRRRr', 'rRRdRRRRdRRr',
        '.rRRdRRdRRr.', '.rRRRddRRRr.', '..rrRRRRrr..', '...rr..rr...', '..r......r..']
save(icon(SEAL, {'r': '#4a0c12', 'R': '#8a1c24', 'd': '#c4283b'}), 'icono-sello')
CANDLE = ['.....y......', '....yY......', '....yYy.....', '.....o......', '....wwww....', '....wWww....', '....wwww....',
          '....wwww....', '....wwww....', '...bbbbbb...', '..bbbbbbbb..', '............']
save(icon(CANDLE, {'y': '#e8752b', 'Y': '#ffd36a', 'o': '#2a1a0a', 'w': '#dccaa2', 'W': '#f4ead2', 'b': '#5a4026'}), 'icono-vela')
SKULL = ['...oooooo...', '..owwwwwwo..', '.owwwwwwwwo.', '.owwwwwwwwo.', '.owkkwwkkwo.', '.owkkwwkkwo.', '.owwwkkwwwo.',
         '..owwwwwwo..', '...owkwko...', '...oooooo...', '............', '............']
save(icon(SKULL, {'o': '#07060a', 'w': '#d6d1c4', 'k': '#1a1612'}), 'icono-calavera')
# Pin de alerta (pendiente): sello verde
PIN = ['..oooo..', '.oggggo.', 'oggwwggo', 'oggwwggo', 'oggggggo', 'oggwwggo', '.oggggo.', '..oooo..']
save(icon(PIN, {'o': '#07060a', 'g': '#4f9a3a', 'w': '#e6f5d0'}), 'icono-pendiente')
print('ok', len(os.listdir(OUT)))
