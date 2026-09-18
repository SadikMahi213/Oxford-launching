"""Barcode scanners (§17): USB HID wedges arrive as keystrokes (no driver needed);
this module provides validation plus a scripted simulator for tests/admin checks."""
from __future__ import annotations

from abc import ABC, abstractmethod


class BarcodeScanner(ABC):
    @abstractmethod
    def last_scan(self) -> str: ...

    @abstractmethod
    def available(self) -> bool: ...


def clean_scan(raw: str) -> str:
    """Strip wedge suffixes (CR/LF/TAB) and surrounding whitespace."""
    return (raw or "").strip().strip("\r\n\t")


class WedgeScanner(BarcodeScanner):
    """Real keyboard-wedge scanner: passive (OS delivers keystrokes to the focused
    search box). available() is True by design — any HID wedge works."""

    def __init__(self):
        self._last = ""

    def feed(self, raw: str) -> str:
        self._last = clean_scan(raw)
        return self._last

    def last_scan(self) -> str:
        return self._last

    def available(self) -> bool:
        return True


class SimulatorScanner(BarcodeScanner):
    """Scripted codes for automated tests and Help→Diagnostics hardware checks."""

    def __init__(self, codes: list[str]):
        self._codes = [clean_scan(c) for c in codes]
        self._pos = 0

    def last_scan(self) -> str:
        if self._pos >= len(self._codes):
            return ""
        code = self._codes[self._pos]
        self._pos += 1
        return code

    def available(self) -> bool:
        return True
