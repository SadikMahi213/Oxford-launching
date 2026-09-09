"""Bangla/English localization manager."""
from __future__ import annotations

import json
from pathlib import Path

_DIR = Path(__file__).parent
_cache: dict[str, dict] = {}


def strings(lang: str) -> dict:
    if lang not in _cache:
        path = _DIR / f"{lang}.json"
        if not path.exists():
            path = _DIR / "en.json"
        _cache[lang] = json.loads(path.read_text(encoding="utf-8"))
    return _cache[lang]


def t(lang: str, key: str) -> str:
    s = strings(lang)
    return s.get(key, strings("en").get(key, key))
