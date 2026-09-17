"""Dynamic multi-style CAPTCHA image generator - high contrast visual update.

Public interface (unchanged): ``generate_captcha_image(text)`` returns a
base64 PNG. A random visual style is picked per challenge unless ``style``
is given explicitly (used by tests).

Visual spec (strict scope):
- Dark, bold, opaque multicolored characters (black/dark red/dark blue/dark green)
- Light background with subtle dotted/grid pattern behind characters
- Thin wave/interference lines, subtle distortion, evenly spaced, centered

Dimensions stay 340x110, PIL-only.
"""

import io
import base64
import math
import random
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 340, 110
FONT_SIZE = 58

# Spec-compliant dark palette: black, dark red, dark blue, dark green
CHAR_COLORS = [
    (0, 0, 0),          # black
    (139, 0, 0),        # dark red
    (0, 0, 139),        # dark blue
    (0, 100, 0),        # dark green
]

# For backwards compat, keep LIGHT but make it same dark palette (tests expect multi-color)
LIGHT_CHAR_COLORS = CHAR_COLORS

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


def _draw_light_background(img: Image.Image):
    """Light background with subtle dotted grid pattern."""
    draw = ImageDraw.Draw(img)
    # Base near-white
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=(252, 252, 252))
    # Faded horizontal grid lines (very light gray)
    for y in range(0, HEIGHT, 18):
        draw.line([(0, y), (WIDTH, y)], fill=(235, 235, 235), width=1)
    # Faded vertical grid lines
    for x in range(0, WIDTH, 22):
        draw.line([(x, 0), (x, HEIGHT)], fill=(238, 238, 238), width=1)
    # Subtle dots at grid intersections
    for x in range(6, WIDTH, 20):
        for y in range(6, HEIGHT, 20):
            # Alternate slightly to avoid perfect grid
            if random.random() < 0.55:
                draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(210, 210, 210))


def _draw_wave_lines(draw: ImageDraw.ImageDraw, w: int, h: int, count: int = 2):
    """Thin, low-opacity wave lines crossing behind text."""
    for _ in range(count):
        y_base = random.randint(int(h * 0.25), int(h * 0.75))
        pts = []
        for x in range(-10, w + 10, 12):
            y = y_base + int(6 * math.sin(x * 0.045 + random.uniform(-0.5, 0.5))) + random.randint(-2, 2)
            y = max(4, min(h - 4, y))
            pts.append((x, y))
        # Dark but not black, thin
        draw.line(pts, fill=(90, 90, 90), width=1)


def _render_chars(img: Image.Image, text: str, colors,
                  rot_range: float = 10.0, size_jitter: float = 0.06,
                  wave_amp: int = 4, overlap: float = 0.04,
                  use_alt_font: bool = False, opacity: float = 1.0,
                  pixelate: bool = False):
    """Render each character on its own tile and paste it.

    Keeps every glyph fully inside the canvas; rotation/size/overlap are
    bounded so humans can still read the sequence.
    """
    char_count = len(text)
    # Evenly spaced, horizontally balanced
    step_x = (WIDTH - 64) / max(char_count - 1, 1)
    step_x *= (1.0 - overlap)
    font_px = FONT_SIZE
    for i, ch in enumerate(text):
        size = int(font_px * random.uniform(1.0 - size_jitter, 1.0 + size_jitter))
        size = max(30, size)
        font = _get_alt_font(size) if (use_alt_font and random.random() < 0.35) else _get_font(size)
        color = list(colors[i % len(colors)])
        tile = Image.new("RGBA", (size + 30, size + 30), (0, 0, 0, 0))
        td = ImageDraw.Draw(tile)
        td.text((15, 7), ch, font=font, fill=tuple(color))
        if pixelate:
            small = tile.resize((max(8, tile.width // 4), max(8, tile.height // 4)), Image.NEAREST)
            tile = small.resize(tile.size, Image.NEAREST)
        angle = random.uniform(-rot_range, rot_range)
        tile = tile.rotate(angle, expand=1, resample=Image.BICUBIC)
        if opacity < 1.0:
            alpha = tile.split()[3].point(lambda v: int(v * opacity))
            tile.putalpha(alpha)
        x_pos = int(32 + i * step_x - tile.width // 2)
        y_pos = (HEIGHT - tile.height) // 2 + int(
            random.uniform(-wave_amp, wave_amp) + 2.5 * math.sin(i * 1.6)
        )
        # Clamp to stay fully visible, no clipping
        x_pos = max(-6, min(WIDTH - tile.width + 6, x_pos))
        y_pos = max(-6, min(HEIGHT - tile.height + 6, y_pos))
        img.paste(tile, (x_pos, y_pos), tile)


def _style_textile(img: Image.Image, text: str):
    _draw_light_background(img)
    draw = ImageDraw.Draw(img)
    _draw_wave_lines(draw, WIDTH, HEIGHT, count=2)
    _render_chars(img, text, CHAR_COLORS,
                  rot_range=11, size_jitter=0.07, wave_amp=4, overlap=0.04)


def _style_grid(img: Image.Image, text: str):
    _draw_light_background(img)
    draw = ImageDraw.Draw(img)
    # Extra subtle grid accent for this style (slightly more pronounced dots)
    for x in range(12, WIDTH, 26):
        for y in range(8, HEIGHT, 14):
            if random.random() < 0.35:
                draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(200, 200, 200))
    _draw_wave_lines(draw, WIDTH, HEIGHT, count=2)
    _render_chars(img, text, CHAR_COLORS,
                  rot_range=10, size_jitter=0.06, wave_amp=3, overlap=0.03)


def _style_blocks(img: Image.Image, text: str):
    _draw_light_background(img)
    draw = ImageDraw.Draw(img)
    _draw_wave_lines(draw, WIDTH, HEIGHT, count=2)
    # Very light scribbles (thin, not occluding)
    for _ in range(2):
        x0, y0 = random.randint(10, WIDTH - 10), random.randint(10, HEIGHT - 10)
        x1, y1 = random.randint(10, WIDTH - 10), random.randint(10, HEIGHT - 10)
        draw.line([(x0, y0), ((x0 + x1) // 2, (y0 + y1) // 2), (x1, y1)],
                  fill=(180, 180, 180), width=1)
    _render_chars(img, text, CHAR_COLORS,
                  rot_range=12, size_jitter=0.07, wave_amp=4, overlap=0.04,
                  use_alt_font=True)


def _style_ink(img: Image.Image, text: str):
    _draw_light_background(img)
    draw = ImageDraw.Draw(img)
    _draw_wave_lines(draw, WIDTH, HEIGHT, count=2)
    # Opaque, no blur - keep characters sharp
    _render_chars(img, text, CHAR_COLORS,
                  rot_range=10, size_jitter=0.06, wave_amp=3, overlap=0.03,
                  opacity=1.0)


def _style_noisy(img: Image.Image, text: str):
    _draw_light_background(img)
    draw = ImageDraw.Draw(img)
    # Light speckle, not heavy
    px = img.load()
    for _ in range(300):
        x, y = random.randint(0, WIDTH - 1), random.randint(0, HEIGHT - 1)
        v = random.randint(220, 245)
        px[x, y] = (v, v, v)
    _draw_wave_lines(draw, WIDTH, HEIGHT, count=2)
    # Small dots, low opacity interference
    for _ in range(12):
        x, y = random.randint(0, WIDTH), random.randint(0, HEIGHT)
        draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(160, 160, 160))
    _render_chars(img, text, CHAR_COLORS,
                  rot_range=11, size_jitter=0.07, wave_amp=4, overlap=0.04,
                  opacity=1.0)


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
