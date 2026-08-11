import io
import base64
import random
from PIL import Image, ImageDraw, ImageFont

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


def _get_font() -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", FONT_SIZE)
    except (IOError, OSError):
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", FONT_SIZE)
        except (IOError, OSError):
            return ImageFont.load_default()


def _random_bg_color() -> tuple[int, int, int]:
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


def generate_captcha_image(text: str) -> str:
    bg = _random_bg_color()
    img = Image.new("RGB", (WIDTH, HEIGHT), color=bg)
    draw = ImageDraw.Draw(img)

    _draw_shapes(draw, WIDTH, HEIGHT)

    font = _get_font()

    char_count = len(text)
    step_x = (WIDTH - 60) / max(char_count - 1, 1)

    for i, ch in enumerate(text):
        ch_img = Image.new("RGBA", (FONT_SIZE + 24, FONT_SIZE + 24), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        # One character -> one color from the readable palette.
        color = CHAR_COLORS[i % len(CHAR_COLORS)]
        ch_draw.text((12, 4), ch, font=font, fill=color)

        # Small, subtle rotation only - readability is the priority.
        angle = random.uniform(-6, 6)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)

        x_pos = int(30 + i * step_x - ch_img.width // 2)
        y_pos = (HEIGHT - ch_img.height) // 2 + random.randint(-2, 2)

        img.paste(ch_img, (x_pos, y_pos), ch_img)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
