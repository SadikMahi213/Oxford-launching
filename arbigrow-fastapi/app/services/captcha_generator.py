"""Dynamic multi-style CAPTCHA image generator.

Public interface (unchanged): ``generate_captcha_image(text)`` returns a
base64 PNG. A random visual style is picked per challenge unless ``style``
is given explicitly (used by tests).

Styles: textile (wavy chars + thread lines), grid (teal + yellow grid +
pixel chars), blocks (solid color + scribbles), ink (blobs + faded stamp),
noisy (arcs/dots/waves over noise).

PIL-only, no new dependencies. Dimensions stay 340x110 so the existing
typing UI, mobile scaling and regression tests keep working.
"""

import io
import base64
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 340, 110
FONT_SIZE = 58

# Readable dark-ish palette used for individual characters. Purely visual:
# validation never depends on these colors. Each color has good contrast on
# the light background.
CHAR_COLORS = [
    (0, 105, 92),      # teal
    (10, 84, 179),     # blue
    (104, 26, 148),    # purple
    (27, 94, 32),      # green
    (194, 90, 0),      # orange
    (0, 100, 140),     # cyan
]

# Light-on-dark palette for dark backgrounds (grid style).
LIGHT_CHAR_COLORS = [
    (255, 255, 255),   # white
    (255, 235, 59),    # yellow
    (255, 255, 255),
    (255, 213, 79),    # amber
    (255, 255, 255),
    (178, 223, 219),   # pale teal
]

STYLES = ("textile", "grid", "blocks", "ink", "noisy")


def _get_font(size: int = FONT_SIZE):
    """Bold TTF chain: Windows dev -> container -> Linux hosts -> default."""
    for path in (
        "arial.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    try:
        return ImageFont.truetype("arial.ttf", size)
    except (IOError, OSError):
        return ImageFont.load_default()


def _get_alt_font(size: int = FONT_SIZE):
    """Oblique/italic alternate for handwritten-style variants."""
    for path in (
        "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBoldOblique.ttf",
        "ariali.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    return _get_font(size)


def _random_bg_color() -> tuple:
    # Light, near-white background for high contrast with the character colors.
    return (random.randint(238, 252),
            random.randint(238, 252),
            random.randint(238, 252))


def _draw_shapes(draw: ImageDraw.ImageDraw, w: int, h: int):
    # Very light, sparse decoration. Never touches the text area heavily.
    for _ in range(random.randint(1, 2)):
        x, y = random.randint(0, w), random.randint(0, h)
        rx, ry = random.randint(20, 45), random.randint(20, 45)
        shade = random.randint(210, 235)
        draw.ellipse([x - rx, y - ry, x + rx, y + ry],
                     outline=(shade, shade, shade), width=1)


def _weave_background(img: Image.Image):
    """Gray/white woven textile texture."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    for y in range(0, h, 3):
        shade = random.randint(228, 244)
        draw.line([(0, y), (w, y)], fill=(shade, shade, shade))
    for x in range(0, w, 3):
        shade = random.randint(232, 246)
        draw.line([(x, 0), (x, h)], fill=(shade, shade, shade))
    # Speckle.
    px = img.load()
    for _ in range(500):
        x, y = random.randint(0, w - 1), random.randint(0, h - 1)
        v = random.randint(200, 245)
        px[x, y] = (v, v, v)


def _tangle_lines(draw: ImageDraw.ImageDraw, w: int, h: int, colors, count: int = 4):
    """Thin wavy thread-like polylines crossing the canvas."""
    for _ in range(count):
        color = random.choice(colors)
        x = random.randint(-10, 30)
        y = random.randint(0, h)
        pts = [(x, y)]
        for _ in range(7):
            x += random.randint(30, 70)
            y = max(0, min(h, y + random.randint(-28, 28)))
            pts.append((x, y))
        draw.line(pts, fill=color, width=1)


def _render_chars(img: Image.Image, text: str, colors,
                  rot_range: float = 6.0, size_jitter: float = 0.0,
                  wave_amp: int = 2, overlap: float = 0.0,
                  use_alt_font: bool = False, opacity: float = 1.0,
                  pixelate: bool = False):
    """Render each character on its own tile and paste it.

    Keeps every glyph fully inside the canvas; rotation/size/overlap are
    bounded so humans can still read the sequence.
    """
    char_count = len(text)
    step_x = (WIDTH - 60) / max(char_count - 1, 1)
    step_x *= (1.0 - overlap)
    font_px = FONT_SIZE
    for i, ch in enumerate(text):
        size = int(font_px * random.uniform(1.0 - size_jitter, 1.0 + size_jitter))
        size = max(28, size)
        font = _get_alt_font(size) if (use_alt_font and random.random() < 0.5) else _get_font(size)
        color = list(colors[i % len(colors)])
        tile = Image.new("RGBA", (size + 28, size + 28), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        td.text((14, 6), ch, font=font, fill=tuple(color))
        if pixelate:
            small = tile.resize((max(8, tile.width // 4), max(8, tile.height // 4)), Image.NEAREST)
            tile = small.resize(tile.size, Image.NEAREST)
        angle = random.uniform(-rot_range, rot_range)
        tile = tile.rotate(angle, expand=1, resample=Image.BICUBIC)
        if opacity < 1.0:
            alpha = tile.split()[3].point(lambda v: int(v * opacity))
            tile.putalpha(alpha)
        x_pos = int(30 + i * step_x - tile.width // 2)
        y_pos = (HEIGHT - tile.height) // 2 + int(
            random.uniform(-wave_amp, wave_amp) + 3 * math.sin(i * 1.7)
        )
        x_pos = max(-8, min(WIDTH - tile.width + 8, x_pos))
        y_pos = max(-8, min(HEIGHT - tile.height + 8, y_pos))
        img.paste(tile, (x_pos, y_pos), tile)


def _style_textile(img: Image.Image, text: str):
    _weave_background(img)
    draw = ImageDraw.Draw(img)
    _tangle_lines(draw, WIDTH, HEIGHT,
                  [(180, 60, 60), (60, 120, 180), (90, 140, 90), (150, 100, 180)], 4)
    _render_chars(img, text, [(40, 40, 40), (20, 60, 120), (120, 30, 30), (30, 90, 60)],
                  rot_range=18, size_jitter=0.14, wave_amp=6, overlap=0.12)


def _style_grid(img: Image.Image, text: str):
    draw = ImageDraw.Draw(img)
    base = (0, random.randint(118, 140), random.randint(118, 140))
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=base)
    # Horizontal yellow grid lines.
    for y in range(6, HEIGHT, 13):
        draw.line([(0, y), (WIDTH, y)], fill=(235, 220, 90), width=1)
    # Vertical dashed lines.
    for x in range(10, WIDTH, 26):
        for y in range(0, HEIGHT, 10):
            draw.line([(x, y), (x, y + 5)], fill=(255, 255, 255), width=1)
    _render_chars(img, text, LIGHT_CHAR_COLORS,
                  rot_range=8, size_jitter=0.1, wave_amp=3, overlap=0.05,
                  pixelate=True)


def _style_blocks(img: Image.Image, text: str):
    draw = ImageDraw.Draw(img)
    bg = random.choice([
        (206, 178, 44),    # mustard
        (64, 150, 150),    # teal
        (178, 102, 66),    # rust
        (110, 130, 180),   # slate blue
        (150, 170, 80),    # olive
    ])
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=bg)
    # Thick dark scribbles occluding parts of the text area.
    for _ in range(random.randint(3, 5)):
        x0, y0 = random.randint(0, WIDTH), random.randint(0, HEIGHT)
        x1, y1 = random.randint(0, WIDTH), random.randint(0, HEIGHT)
        dark = random.choice([(40, 30, 30), (30, 30, 40), (45, 35, 20)])
        draw.line([(x0, y0), ((x0 + x1) // 2 + random.randint(-40, 40), (y0 + y1) // 2), (x1, y1)],
                  fill=dark, width=random.randint(3, 5))
    _render_chars(img, text, [(25, 25, 30)],
                  rot_range=20, size_jitter=0.16, wave_amp=5, overlap=0.1,
                  use_alt_font=True)


def _style_ink(img: Image.Image, text: str):
    draw = ImageDraw.Draw(img)
    shade = random.randint(232, 242)
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=(shade, shade, shade))
    # Irregular gray ink-blot shapes.
    for _ in range(random.randint(2, 4)):
        x, y = random.randint(20, WIDTH - 20), random.randint(10, HEIGHT - 10)
        for _ in range(3):
            rx, ry = random.randint(18, 55), random.randint(8, 26)
            g = random.randint(200, 222)
            draw.ellipse([x - rx, y - ry, x + rx, y + ry], fill=(g, g, g))
    # Faded stamp look: gray-dark chars at reduced opacity + slight blur.
    _render_chars(img, text, [(90, 90, 95)],
                  rot_range=12, size_jitter=0.1, wave_amp=4, overlap=0.08,
                  opacity=0.82)
    img.paste(img.filter(ImageFilter.GaussianBlur(radius=0.6)))


def _style_noisy(img: Image.Image, text: str):
    draw = ImageDraw.Draw(img)
    dark = random.random() < 0.4
    if dark:
        base = (random.randint(40, 70), random.randint(40, 70), random.randint(50, 80))
        char_colors = [(240, 240, 240), (255, 235, 150), (200, 230, 255)]
    else:
        base = (random.randint(225, 240), random.randint(225, 240), random.randint(220, 235))
        char_colors = [(30, 30, 30), (150, 30, 30), (20, 60, 140)]
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=base)
    # Background noise speckle.
    px = img.load()
    spread = 38 if dark else 30
    for _ in range(1400):
        x, y = random.randint(0, WIDTH - 1), random.randint(0, HEIGHT - 1)
        r = max(0, min(255, base[0] + random.randint(-spread, spread)))
        g = max(0, min(255, base[1] + random.randint(-spread, spread)))
        b = max(0, min(255, base[2] + random.randint(-spread, spread)))
        px[x, y] = (r, g, b)
    # Arcs, dots, lines, waves.
    accent = (200, 60, 60) if not dark else (150, 180, 220)
    for _ in range(random.randint(2, 4)):
        x, y = random.randint(0, WIDTH), random.randint(0, HEIGHT)
        r = random.randint(15, 45)
        draw.arc([x - r, y - r, x + r, y + r],
                 start=random.randint(0, 360), end=random.randint(0, 360) + 120,
                 fill=accent, width=1)
    for _ in range(28):
        x, y = random.randint(0, WIDTH), random.randint(0, HEIGHT)
        draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=accent)
    _tangle_lines(draw, WIDTH, HEIGHT, [accent], 2)
    _render_chars(img, text, char_colors,
                  rot_range=22, size_jitter=0.15, wave_amp=6, overlap=0.1,
                  opacity=random.uniform(0.85, 1.0))


_STYLE_PAINT = {
    "textile": _style_textile,
    "grid": _style_grid,
    "blocks": _style_blocks,
    "ink": _style_ink,
    "noisy": _style_noisy,
}


def generate_captcha_image(text: str, style: str | None = None) -> str:
    """Render ``text`` as a base64 PNG using a random visual style.

    ``style`` optionally pins one of ``STYLES`` (used by tests); unknown
    values fall back to random selection. Same dimensions and interface
    as before: callers and validation logic are untouched.
    """
    if style not in _STYLE_PAINT:
        style = random.choice(STYLES)
    img = Image.new("RGB", (WIDTH, HEIGHT))
    _STYLE_PAINT[style](img, text)
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
