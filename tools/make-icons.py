"""Draws the app icon into icons/.

    python tools/make-icons.py

The mark: a progress ring three-quarters closed around a check, on a
violet-to-teal ground — a habit being kept. Needs Pillow only.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

S = 512
K = 3
W = S * K

TOP, BOTTOM = (108, 76, 230), (20, 170, 160)


def ground(size, rounded):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x * 0.35 + y * 0.65) / size
            px[x, y] = tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)) + (255,)
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=255)
        img.putalpha(mask)
    return img


def mark(size, scale):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c = size / 2
    r = size * 0.30 * scale
    w = int(size * 0.075 * scale)
    box = (c - r, c - r, c + r, c + r)
    d.arc(box, 0, 360, fill=(255, 255, 255, 70), width=w)
    d.arc(box, -90, 200, fill=(255, 255, 255, 255), width=w)
    # rounded caps
    for ang in (-90, 200):
        a = math.radians(ang)
        x, y = c + (r - w / 2) * math.cos(a), c + (r - w / 2) * math.sin(a)
        d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=(255, 255, 255, 255))
    # the check
    s = r * 0.62
    pts = [(c - s * 0.62, c + s * 0.02), (c - s * 0.12, c + s * 0.50), (c + s * 0.72, c - s * 0.45)]
    lw = int(size * 0.07 * scale)
    d.line(pts, fill=(255, 255, 255, 255), width=lw, joint="curve")
    for p in (pts[0], pts[-1]):
        d.ellipse((p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2), fill=(255, 255, 255, 255))
    # a small spark top-right
    sx, sy, sr = c + r * 0.98, c - r * 0.98, size * 0.05 * scale
    d.polygon([(sx, sy - sr), (sx + sr * .3, sy - sr * .3), (sx + sr, sy), (sx + sr * .3, sy + sr * .3),
               (sx, sy + sr), (sx - sr * .3, sy + sr * .3), (sx - sr, sy), (sx - sr * .3, sy - sr * .3)],
              fill=(255, 236, 160, 255))
    return layer


def build(rounded, scale):
    base = ground(W, rounded)
    m = mark(W, scale)
    shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    shadow.paste((20, 10, 60, 90), (0, 0), m.split()[3])
    shadow = shadow.filter(ImageFilter.GaussianBlur(W * 0.02))
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.alpha_composite(base)
    off = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    off.paste(shadow, (0, int(W * 0.015)))
    if rounded:
        off.putalpha(Image.composite(off.split()[3], Image.new("L", (W, W), 0), base.split()[3]))
    out.alpha_composite(off)
    out.alpha_composite(m)
    return out


big = build(True, 1.0)
for n in (512, 192):
    big.resize((n, n), Image.LANCZOS).save(f"icons/icon-{n}.png")
build(False, 0.78).resize((512, 512), Image.LANCZOS).save("icons/icon-maskable-512.png")
build(False, 0.9).resize((180, 180), Image.LANCZOS).save("icons/apple-touch-icon.png")
print("icons written")
