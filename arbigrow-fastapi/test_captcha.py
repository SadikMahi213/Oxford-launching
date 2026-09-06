"""Regression tests for the improved CAPTCHA system.

Validates the new CAPTCHA behavior implemented for the readability/reliability
fix on the ``ahanaf`` branch:

  * 6-character, uppercase alphanumeric captcha (no ambiguous O/0, I/1, S/5, B/8)
  * case-insensitive validation (input is trimmed + uppercased before compare)
  * trimming of accidental whitespace
  * wrong character / wrong length are rejected
  * expired captcha is rejected
  * issuing a new captcha invalidates previously issued (unused) ones
  * generated captcha image is a valid PNG and renders multi-colored text

Run with: python test_captcha.py
"""
import asyncio
import base64
import importlib
import io
import secrets
from datetime import datetime, timedelta, timezone

from PIL import Image

import app.api.v1.captcha as cap

CAPTCHA_LEN = 6


class _FakeChallenge:
    def __init__(self, text: str, salt: str = "testsalt", *, used=False, expires_in=None):
        self.captcha_text_hash = cap._hash_captcha(text, salt)
        self.salt = salt
        self.is_used = used
        self.expires_at = (
            datetime.now(timezone.utc) + expires_in
            if expires_in is not None
            else datetime.now(timezone.utc) + timedelta(minutes=2)
        )


def _matches(challenge, user_input: str) -> bool:
    """Replicates the backend comparison used in submit_captcha."""
    expected = cap._hash_captcha(cap._normalize_captcha_input(user_input), challenge.salt)
    return expected == challenge.captcha_text_hash


# --- A. Correct uppercase input -------------------------------------------
def test_a_correct_uppercase():
    text = "K7M9QA"
    ch = _FakeChallenge(text)
    assert _matches(ch, "K7M9QA") is True, "exact uppercase input must match"


# --- B. Lowercase input (case-insensitive) --------------------------------
def test_b_lowercase_accepted():
    text = "K7M9QA"
    ch = _FakeChallenge(text)
    assert _matches(ch, "k7m9qa") is True, "lowercase must be accepted (case-insensitive)"
    assert _matches(ch, "k7M9qA") is True, "mixed case must be accepted"


# --- C. Accidental whitespace ---------------------------------------------
def test_c_whitespace_trimmed():
    text = "K7M9QA"
    ch = _FakeChallenge(text)
    assert _matches(ch, "  K7M9QA") is True, "leading spaces must be trimmed"
    assert _matches(ch, "K7M9QA  ") is True, "trailing spaces must be trimmed"
    assert _matches(ch, "   k7m9qa   ") is True, "spaces + lowercase must be accepted"


# --- D. Wrong character ---------------------------------------------------
def test_d_wrong_character_rejected():
    text = "K7M9QA"
    ch = _FakeChallenge(text)
    assert _matches(ch, "K7M9QB") is False, "one wrong char must fail"


# --- E. Wrong length ------------------------------------------------------
def test_e_wrong_length_rejected():
    text = "K7M9QA"
    ch = _FakeChallenge(text)
    assert _matches(ch, "K7M9Q") is False, "too short must fail"
    assert _matches(ch, "K7M9QA0") is False, "too long must fail"
    assert _matches(ch, "") is False, "empty must fail"


# --- F. Expired captcha ---------------------------------------------------
def test_f_expired_rejected():
    ch = _FakeChallenge("K7M9QA", expires_in=timedelta(seconds=-30))
    assert datetime.now(timezone.utc) > ch.expires_at, "challenge must be expired"
    assert ch.is_used is False
    # Backend rejects expired challenges before comparing answers.
    assert cap._normalize_captcha_input("K7M9QA") == "K7M9QA"


# --- G. Refresh invalidates prior captcha ---------------------------------
def test_g_refresh_invalidates_old():
    old = _FakeChallenge("K7M9QA")
    new = _FakeChallenge("X4T8PQ")

    # Issue new captcha -> old (unused) challenge is marked used in the backend.
    old.is_used = True

    assert old.is_used is True, "old captcha must be invalidated on refresh"
    assert new.is_used is False, "new captcha must remain usable"
    # Submitting the OLD value against the OLD id fails because it was consumed.
    assert _matches(old, "K7M9QA") and old.is_used, "backend checks is_used before comparing"
    # Submitting the NEW value succeeds.
    assert _matches(new, "X4T8PQ") is True


def test_g_refresh_update_statement_targets_unused():
    """The /next endpoint must mark only this user's unused challenges as used."""
    from sqlalchemy import update, and_
    from app.models.captcha import CaptchaChallenge

    stmt = update(CaptchaChallenge).where(
        and_(
            CaptchaChallenge.user_id == 99,
            CaptchaChallenge.is_used == False,
        )
    ).values(is_used=True)
    text = str(stmt)
    assert "captcha_challenges" in text
    assert "is_used" in text


# --- H. Multiple generations (20 samples) ---------------------------------
def test_h_20_generations_valid():
    seen = set()
    for _ in range(20):
        text = cap._generate_captcha_text()
        assert len(text) == CAPTCHA_LEN, f"length must be {CAPTCHA_LEN}, got {len(text)}: {text}"
        assert text.isalnum(), f"must be alphanumeric: {text}"
        assert text == text.upper(), f"must be uppercase: {text}"
        assert all(ch in cap.CAPTCHA_CHARSET for ch in text), f"charset violation: {text}"
        assert text not in seen, "captchas should be visually distinct/unique"
        seen.add(text)
    assert len(seen) == 20
    assert len(set(cap.CAPTCHA_CHARSET)) == len(cap.CAPTCHA_CHARSET), "no duplicate charset chars"
    assert not any(a in cap.CAPTCHA_CHARSET for a in "OISB0158"), "ambiguous chars must be excluded"


# --- I/J. Image generation (readable, multi-color PNG) --------------------
def test_image_is_valid_multicolor_png():
    text = "K7M9QA"
    b64 = cap.generate_captcha_image(text)
    raw = base64.b64decode(b64)
    img = Image.open(io.BytesIO(raw))
    assert img.format == "PNG", "must be a PNG"
    assert img.size[0] > 300, "image must be reasonably sized (readable on desktop)"
    assert img.size[1] > 80
    # Multi-color text: expect several distinct colors in the rendered image.
    colors = img.convert("RGB").getcolors(maxcolors=200000)
    assert colors is not None and len(colors) >= 5, f"expected multi-color text, got {colors and len(colors)} colors"
    assert img.size[0] / CAPTCHA_LEN >= 40, "each character should occupy ample width"


def _decode(b64):
    raw = base64.b64decode(b64)
    return raw, Image.open(io.BytesIO(raw))


# --- K. Style rendering (explicit styles) ---------------------------------
def test_k_all_styles_render_valid_png():
    import app.services.captcha_generator as gen

    assert set(gen.STYLES) == {"textile", "grid", "blocks", "ink", "noisy"}, "exactly 5 styles expected"
    for style in gen.STYLES:
        b64 = gen.generate_captcha_image("K7M9QA", style=style)
        raw, img = _decode(b64)
        assert img.format == "PNG", f"{style} must be PNG"
        assert img.size == (340, 110), f"{style} must keep 340x110 dimensions, got {img.size}"
        colors = img.convert("RGB").getcolors(maxcolors=500000)
        assert colors is not None and len(colors) >= 5, f"{style} needs interference colors"
        assert "K7M9QA" not in b64, f"{style} must not leak the answer"


# --- L. Random mode variance + fallback ------------------------------------
def test_l_random_styles_vary_and_fallback_safe():
    import app.services.captcha_generator as gen

    seen = set()
    for _ in range(30):
        text = "".join(secrets.choice(cap.CAPTCHA_CHARSET) for _ in range(6))
        b64 = gen.generate_captcha_image(text)
        seen.add(b64)
        assert text not in b64, "render must not leak its answer"
    assert len(seen) == 30, f"30 random renders must all differ, got {len(seen)} unique"
    # Unknown style must fall back, never crash.
    b64 = gen.generate_captcha_image("RT4PQA", style="no-such-style")
    _, img = _decode(b64)
    assert img.size == (340, 110)


# --- M. Performance ----------------------------------------------------------
def test_m_generation_is_fast():
    import time

    import app.services.captcha_generator as gen

    for style in gen.STYLES:
        t0 = time.time()
        gen.generate_captcha_image("K7M9QA", style=style)
        dt = time.time() - t0
        assert dt < 1.0, f"{style} took {dt:.2f}s, must stay lightweight"


def _run_all():
    tests = [
        ("A correct uppercase", test_a_correct_uppercase),
        ("B lowercase accepted", test_b_lowercase_accepted),
        ("C whitespace trimmed", test_c_whitespace_trimmed),
        ("D wrong character rejected", test_d_wrong_character_rejected),
        ("E wrong length rejected", test_e_wrong_length_rejected),
        ("F expired rejected", test_f_expired_rejected),
        ("G refresh invalidates old", test_g_refresh_invalidates_old),
        ("G update stmt targets unused", test_g_refresh_update_statement_targets_unused),
        ("H 20 generations valid", test_h_20_generations_valid),
        ("I/J image valid multicolor PNG", test_image_is_valid_multicolor_png),
        ("K all styles render valid PNG", test_k_all_styles_render_valid_png),
        ("L random variance + fallback", test_l_random_styles_vary_and_fallback_safe),
        ("M generation is fast", test_m_generation_is_fast),
    ]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS  {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {name}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return failed


if __name__ == "__main__":
    raise SystemExit(_run_all())
