"""CPU-bound work offloaded from the event loop (anyio threadpool).

Guards the exact call patterns used by the login/signup/reset-password and
captcha-next endpoints: identical inputs must produce identical verification
results and valid PNG output through the threadpool path.
"""
import asyncio
import base64

import anyio

from app.core.security import hash_password, verify_password
from app.services.captcha_generator import WIDTH, HEIGHT, generate_captcha_image


def run(coro):
    return asyncio.run(coro)


def test_bcrypt_roundtrip_via_threadpool():
    async def _go():
        hashed = await anyio.to_thread.run_sync(hash_password, "K6test123!")
        ok = await anyio.to_thread.run_sync(verify_password, "K6test123!", hashed)
        bad = await anyio.to_thread.run_sync(verify_password, "wrong-pass", hashed)
        return ok, bad

    ok, bad = run(_go())
    assert ok is True
    assert bad is False


def test_captcha_image_valid_png_via_threadpool():
    async def _go():
        return await anyio.to_thread.run_sync(generate_captcha_image, "Ab12Cd")

    raw = base64.b64decode(run(_go()))
    assert raw[:8] == b"\x89PNG\r\n\x1a\n"
    from PIL import Image
    import io

    with Image.open(io.BytesIO(raw)) as img:
        assert img.size == (WIDTH, HEIGHT)
        assert img.format == "PNG"
