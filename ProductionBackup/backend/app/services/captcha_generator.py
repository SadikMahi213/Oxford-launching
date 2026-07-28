import io
import base64
import math
import random
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 300, 90
FONT_SIZE = 44


def _get_font() -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype("arial.ttf", FONT_SIZE)
    except (IOError, OSError):
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", FONT_SIZE)
        except (IOError, OSError):
            return ImageFont.load_default()


def _random_color(min_val: int = 0, max_val: int = 200) -> tuple[int, int, int]:
    return (random.randint(min_val, max_val),
            random.randint(min_val, max_val),
            random.randint(min_val, max_val))


def _draw_shapes(draw: ImageDraw.ImageDraw, w: int, h: int):
    for _ in range(random.randint(2, 4)):
        x, y = random.randint(0, w), random.randint(0, h)
        rx, ry = random.randint(15, 50), random.randint(15, 50)
        draw.ellipse([x - rx, y - ry, x + rx, y + ry],
                     outline=_random_color(140, 200), width=1)


def generate_captcha_image(text: str) -> str:
# text = text.upper()  # removed - preserve case for 8-char captcha
    bg = _random_color(230, 252)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=bg)
    draw = ImageDraw.Draw(img)

    _draw_shapes(draw, WIDTH, HEIGHT)

    font = _get_font()
    text_color = (random.randint(10, 55), random.randint(10, 55), random.randint(10, 55))

    char_count = len(text)
    step_x = (WIDTH - 50) / max(char_count - 1, 1)

    for i, ch in enumerate(text):
        ch_img = Image.new("RGBA", (FONT_SIZE + 20, FONT_SIZE + 20), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        ch_draw.text((5, 1), ch, font=font, fill=text_color)

        angle = random.uniform(-12, 12)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)

        wave_y = int(math.sin(i / max(char_count - 1, 1) * math.pi * 1.5) * 6)
        x_pos = int(25 + i * step_x - ch_img.width // 2)
        y_pos = (HEIGHT - ch_img.height) // 2 + wave_y + random.randint(-3, 3)

        img.paste(ch_img, (x_pos, y_pos), ch_img)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
