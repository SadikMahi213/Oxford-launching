import io
import base64
import random
from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 280, 80
FONT_SIZE = 42


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
    r, g, b = _random_color(220, 250)
    img = Image.new("RGB", (WIDTH, HEIGHT), color=(r, g, b))
    draw = ImageDraw.Draw(img)

    for _ in range(random.randint(2, 4)):
        x1 = random.randint(0, WIDTH)
        y1 = random.randint(0, HEIGHT)
        x2 = random.randint(0, WIDTH)
        y2 = random.randint(0, HEIGHT)
        draw.line([(x1, y1), (x2, y2)], fill=_random_color(130, 200), width=random.randint(1, 2))

    font = _get_font()
    text_color = (random.randint(15, 50), random.randint(15, 50), random.randint(15, 50))
    char_images = []
    for ch in text:
        ch_img = Image.new("RGBA", (FONT_SIZE + 10, FONT_SIZE + 10), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        ch_draw.text((5, 2), ch, font=font, fill=text_color)
        angle = random.uniform(-12, 12)
        ch_img = ch_img.rotate(angle, expand=1, resample=Image.BICUBIC)
        char_images.append(ch_img)

    total_w = sum(im.width for im in char_images)
    x_offset = (WIDTH - total_w) // 2
    for ch_img in char_images:
        offset_y = random.randint((HEIGHT - ch_img.height) // 2 - 4, (HEIGHT - ch_img.height) // 2 + 4)
        img.paste(ch_img, (x_offset, offset_y), ch_img)
        x_offset += ch_img.width - 2

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode()
