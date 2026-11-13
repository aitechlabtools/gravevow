# Retoque de las capturas de la landing v4: aclara las de mazmorra (el juego se ve oscuro reducido),
# crea la imagen para compartir (1200×630) y pasa todo a WebP (el PNG se queda como respaldo).
# Uso: python3 scripts/landing4-post.py [carpeta]   (por defecto public/screenshots/landing)
import os, sys
from PIL import Image, ImageEnhance
d = sys.argv[1] if len(sys.argv) > 1 else 'public/screenshots/landing'
DARK = ['g-afueras', 'g-cripta', 'g-infierno', 'g-portal', 'g-aliado', 'g-movil']
def gamma(im, g=1.45):
    lut = [round(255 * (i / 255) ** (1 / g)) for i in range(256)] * 3
    return ImageEnhance.Color(im.point(lut)).enhance(1.15)
for n in DARK:
    p = f'{d}/{n}.png'
    if os.path.exists(p): gamma(Image.open(p).convert('RGB')).save(p)
src = f'{d}/g-portal.png'
if os.path.exists(src):
    im = Image.open(src).convert('RGB'); w, h = im.size; cw, ch = round(h * 1200 / 630), h
    im.crop(((w - cw) // 2, 0, (w + cw) // 2, ch)).resize((1200, 630), Image.LANCZOS).save(f'{d}/compartir.png')
# Recortes para los ganchos (las capturas de menú se leen mejor de cerca)
CROPS = {'h-botin': ('g-botin', (480, 270, 1440, 810)), 'h-bastion': ('g-bastion', (330, 80, 1590, 789))}
for n, (srcn, box) in CROPS.items():
    p = f'{d}/{srcn}.png'
    if os.path.exists(p): Image.open(p).convert('RGB').crop(box).resize((1280, 720), Image.LANCZOS).save(f'{d}/{n}.png')
for f in sorted(os.listdir(d)):
    if f[:2] in ('g-', 'h-') and f.endswith('.png'):
        Image.open(f'{d}/{f}').convert('RGB').save(f'{d}/{f[:-4]}.webp', quality=95, method=6)
        print('webp:', f[:-4])
