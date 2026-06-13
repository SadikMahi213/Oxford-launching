import io
import base64
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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
        rx, ry = random.randint(10, 40), random.randint(10, 40)
        draw.ellipse([x - rx, y - ry, x + rx, y + ry],
                     outline=_random_color(100, 180), width=random.randint(1, 2))
    for _ in range(random.randint(1, 3)):
        cx, cy = random.randint(0, w), random.randint(0, h)
        draw.arc([cx - 30, cy - 30, cx + 30, cy + 30],
                 random.randint(0, 360), random.randint(0, 360),
                 fill=_random_color(100, 180), width=2)


def generate_captcha_image(text: str) -> str:
    text = text.upper()
    bg = _random_color(225, 250)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=bg)
    draw = ImageDraw.Draw(img)

    _draw_shapes(draw, WIDTH, HEIGHT)

    font = _get_font()
    shadow_color = (random.randint(80, 120), random.randint(80, 120), random.randint(80, 120))
    text_color = (random.randint(10, 50), random.randint(10, 50), random.randint(10, 50))

    char_count = len(text)
    step_x = (WIDTH - 40) / max(char_count - 1, 1)

    for i, ch in enumerate(text):
        ch_img = Image.new("RGBA", (FONT_SIZE + 20, FONT_SIZE + 20), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)

        ch_draw.text((7, 3), ch, font=font, fill=shadow_color)
        ch_draw.text((5, 1), ch, font=font, fill=text_color)

        angle = random.uniform(-15, 15)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)

        wave_y = int(math.sin(i / max(char_count - 1, 1) * math.pi * 1.5) * 8)
        x_pos = int(20 + i * step_x - ch_img.width // 2)
        y_pos = (HEIGHT - ch_img.height) // 2 + wave_y + random.randint(-3, 3)

        ch_img = ch_img.filter(ImageFilter.SMOOTH)
        img.paste(ch_img, (x_pos, y_pos), ch_img)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
