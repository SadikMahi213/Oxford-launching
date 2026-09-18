"""
Auto-translation service for dynamic content.
Translates announcement text into all supported UI languages automatically
using the Google Translate free API (no API key needed).
"""

import json
import logging

import httpx

logger = logging.getLogger(__name__)

# Maps frontend lang codes to Google Translate target codes
LANG_MAP = {
    "bn": "bn",
    "hi": "hi",
    "ur": "ur",
    "id": "id",
    "vi": "vi",
    "ms": "ms",
    "tl": "tl",
    "pt-BR": "pt",
    "es-MX": "es",
    "en-NG": "en",
}

GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"


async def _google_translate(text: str, target: str) -> str:
    """Translate a single text string using Google Translate free API."""
    params = {
        "client": "gtx",
        "sl": "en",
        "tl": target,
        "dt": "t",
        "q": text,
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(GOOGLE_TRANSLATE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        # Response format: [[["translated", "original", ...], ...], ...]
        sentences = data[0] if data else []
        return "".join(s[0] for s in sentences if isinstance(s, list) and len(s) > 0)


async def auto_translate(title: str, message: str | None) -> dict | None:
    """Auto-translate title and message into all supported languages.

    Returns a dict like:
    {
      "bn": {"title": "..."},
      "hi": {"title": "...", "message": "..."},
      ...
    }
    Returns None if translation fails entirely.
    """
    try:
        texts_to_translate = [title]
        has_message = bool(message and message.strip())
        if has_message:
            texts_to_translate.append(message)

        result = {}

        for lang_code, target_lang in LANG_MAP.items():
            try:
                if has_message:
                    t_title = await _google_translate(texts_to_translate[0], target_lang)
                    t_msg = await _google_translate(texts_to_translate[1], target_lang)
                    entry = {}
                    if t_title:
                        entry["title"] = t_title
                    if t_msg:
                        entry["message"] = t_msg
                    if entry:
                        result[lang_code] = entry
                else:
                    t_title = await _google_translate(texts_to_translate[0], target_lang)
                    if t_title:
                        result[lang_code] = {"title": t_title}
            except Exception as e:
                logger.debug(f"Translation failed for {lang_code}: {e}")
                continue

        return result if result else None
    except Exception as e:
        logger.warning(f"Auto-translation failed: {e}")
        return None
