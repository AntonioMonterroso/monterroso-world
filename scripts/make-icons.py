"""Genera los íconos de la app (M + </> en azul marino). Uso: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw, ImageFilter
import os

IV = (247, 241, 227); BR = (196, 169, 101)
S = 4  # supersampling

def gradient(size, c1, c2):
    g = Image.new('RGB', (size, size))
    px = g.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return g

def line(d, pts, w, fill):
    for a, b in zip(pts, pts[1:]):
        d.line([a, b], fill=fill, width=int(w))
    for p in pts:
        r = w / 2
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=fill)

M = [(116,330),(116,112),(168,112),(256,226),(344,112),(396,112),(396,330),(344,330),(344,196),(256,310),(168,196),(168,330)]

def glyph(scale=1.0):
    """Capa transparente 512x512 (x S) con la M y los corchetes; se escala alrededor del centro."""
    n = 512 * S
    layer = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    k = 0.8 * scale
    f = lambda x, y: ((256 + (x - 256) * k) * S, (256 + (y - 221) * k) * S)
    d.polygon([f(x, y) for x, y in M], fill=IV + (255,))
    for pts in ([(92,196),(36,256),(92,316)], [(420,196),(476,256),(420,316)]):
        line(d, [f(x, y) for x, y in pts], 24 * scale * S, BR + (255,))
    return layer

def icon(size, maskable=False, rounded=True):
    n = 512 * S
    bg = gradient(n, (22, 40, 78), (7, 16, 31)).convert('RGBA')
    # luz suave arriba a la izquierda
    glow = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([-n * .1, -n * .2, n * .6, n * .45], fill=(120, 150, 210, 40))
    bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(n * .16)))
    img = Image.alpha_composite(bg, glyph(0.82 if maskable else 1.0))
    if rounded and not maskable:
        mask = Image.new('L', (n, n), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, n - 1, n - 1], radius=int(n * .22), fill=255)
        img.putalpha(mask)
    return img.resize((size, size), Image.LANCZOS)

def save(name, im, bg=None):
    p = os.path.join('public', name)
    im.save(p, optimize=True)
    print(p)

if __name__ == '__main__':
    save('icon-512.png', icon(512))
    save('icon-192.png', icon(192))
    save('icon-maskable-512.png', icon(512, maskable=True))
    # iOS aplica sus propias esquinas: sin transparencia
    save('apple-touch-icon.png', icon(180, rounded=False).convert('RGB'))
    # Portada de arranque: fondo marfil con el ícono centrado
    sizes = [f[len('splash-'):-4] for f in os.listdir('public/splash') if f.endswith('.jpg')]
    master = icon(1024)
    for s in sizes:
        w, h = map(int, s.split('x'))
        bg = gradient(max(w, h), (255, 253, 248), (236, 227, 203)).crop((0, 0, w, h)).convert('RGBA')
        side = int(min(w, h) * .34)
        ic = master.resize((side, side), Image.LANCZOS)
        bg.alpha_composite(ic, ((w - side) // 2, (h - side) // 2 - int(h * .03)))
        bg.convert('RGB').save(f'public/splash/splash-{s}.jpg', quality=82, optimize=True)
    print(len(sizes), 'portadas')
