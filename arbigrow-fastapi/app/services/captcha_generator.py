import io
import base64
import random
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 280, 80
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


def generate_captcha_image(text: str) -> str:
    text = text.upper()
    r, g, b = _random_color(200, 245)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(r, g, b))
    draw = ImageDraw.Draw(img)

    font = _get_font()
    text_color = (random.randint(20, 60), random.randint(20, 60), random.randint(20, 60))
    char_images = []
    for ch in text:
        ch_img = Image.new("RGBA", (FONT_SIZE + 10, FONT_SIZE + 10), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        ch_draw.text((5, 2), ch, font=font, fill=text_color)
        angle = random.uniform(-8, 8)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)
        char_images.append(ch_img)

    total_w = sum(im.width for im in char_images)
    x_offset = (WIDTH - total_w) // 2
    for ch_img in char_images:
        offset_y = (HEIGHT - ch_img.height) // 2
        img.paste(ch_img, (x_offset, offset_y), ch_img)
        x_offset += ch_img.width - 2

    if random.randint(0, 1):
        draw.line([(0, random.randint(0, HEIGHT)), (WIDTH, random.randint(0, HEIGHT))],
                  fill=_random_color(140, 200), width=1)

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
