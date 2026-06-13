import io
import base64
import random
import string
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 280, 80
FONT_SIZE = 42
CHAR_COUNT = 5


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


def _draw_noise(draw: ImageDraw.ImageDraw, width: int, height: int):
    for _ in range(random.randint(3, 6)):
        x1 = random.randint(0, width)
        y1 = random.randint(0, height)
        x2 = random.randint(0, width)
        y2 = random.randint(0, height)
        draw.line([(x1, y1), (x2, y2)], fill=_random_color(100, 220), width=random.randint(1, 2))
    for _ in range(random.randint(100, 250)):
        draw.point(
            (random.randint(0, width), random.randint(0, height)),
            fill=_random_color(80, 200),
        )


def generate_captcha_image(text: str) -> str:
    text = text.upper()
    img = Image.new("RGB", (WIDTH, HEIGHT), color=_random_color(180, 240))
    draw = ImageDraw.Draw(img)

    _draw_noise(draw, WIDTH, HEIGHT)

    font = _get_font()
    char_images = []
    for ch in text:
        ch_img = Image.new("RGBA", (FONT_SIZE, FONT_SIZE), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        ch_draw.text((2, -4), ch, font=font, fill=_random_color(10, 80))
        angle = random.uniform(-25, 25)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)
        char_images.append(ch_img)

    total_w = sum(im.width for im in char_images)
    x_offset = (WIDTH - total_w) // 2
    y_offset = (HEIGHT - FONT_SIZE) // 2 + random.randint(-5, 5)
    for ch_img in char_images:
        offset_y = y_offset + random.randint(-6, 6)
        img.paste(ch_img, (x_offset, offset_y), ch_img)
        x_offset += ch_img.width - 2

    img = img.filter(ImageFilter.GaussianBlur(radius=0.5))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
