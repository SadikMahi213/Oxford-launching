"""Weighing scales (§17): configurable serial integration, no vendor hard-coding.

ScaleProtocol is implemented by GenericSerialScale (raw serial + configurable
regex/unit/divisor covers most vendors) and RegexAdapterScale (per-vendor mapping
profiles). SimulatorScale feeds scripted weights for tests and diagnostics.
pyserial is optional: absent → clear error naming the missing package.
"""
from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ScaleReading:
    ok: bool
    kg: float = 0.0
    message: str = ""


class ScaleProtocol(ABC):
    @abstractmethod
    def open(self) -> None: ...

    @abstractmethod
    def read_kg(self) -> ScaleReading: ...

    @abstractmethod
    def close(self) -> None: ...


def parse_weight(raw: str, pattern: str, unit: str = "kg", divisor: float = 1.0) -> ScaleReading:
    m = re.search(pattern, raw or "")
    if not m:
        return ScaleReading(False, 0.0, f"Unparseable scale data: {raw!r}")
    try:
        value = float(m.group(1)) / divisor
    except (ValueError, IndexError, ZeroDivisionError) as e:
        return ScaleReading(False, 0.0, f"Bad scale value: {e}")
    unit = unit.lower()
    if unit in ("g", "gram", "grams"):
        value /= 1000.0
    elif unit in ("lb", "lbs", "pound"):
        value *= 0.45359237
    elif unit not in ("kg", "kilogram"):
        return ScaleReading(False, 0.0, f"Unknown weight unit: {unit}")
    if value < 0 or value > 500:
        return ScaleReading(False, 0.0, f"Implausible weight: {value} kg")
    return ScaleReading(True, round(value, 3), "ok")


class GenericSerialScale(ScaleProtocol):
    """RS232/USB-serial scale with configurable port/baud/pattern/unit."""

    def __init__(self, port: str = "COM1", baud: int = 9600,
                 pattern: str = r"([-+]?\d+(?:\.\d+)?)\s*kg", unit: str = "kg",
                 divisor: float = 1.0, timeout: float = 2.0):
        self.port = port
        self.baud = baud
        self.pattern = pattern
        self.unit = unit
        self.divisor = divisor
        self.timeout = timeout
        self._ser = None

    def open(self) -> None:
        try:
            import serial  # type: ignore
        except ImportError as e:
            raise RuntimeError("pyserial not installed - weighing scale unavailable") from e
        self._ser = serial.Serial(self.port, self.baud, timeout=self.timeout)

    def read_kg(self) -> ScaleReading:
        if self._ser is None:
            return ScaleReading(False, 0.0, "Scale not open")
        try:
            raw = self._ser.readline().decode(errors="ignore")
        except Exception as e:
            return ScaleReading(False, 0.0, f"Scale read error: {e}")
        return parse_weight(raw, self.pattern, self.unit, self.divisor)

    def close(self) -> None:
        try:
            if self._ser is not None:
                self._ser.close()
        finally:
            self._ser = None


# Per-vendor mapping profiles (extend without code changes via settings).
VENDOR_PROFILES: dict[str, dict] = {
    "generic_kg": {"pattern": r"([-+]?\d+(?:\.\d+)?)\s*kg", "unit": "kg", "divisor": 1.0},
    "generic_g": {"pattern": r"([-+]?\d+(?:\.\d+)?)\s*g", "unit": "g", "divisor": 1.0},
    "cas_lp": {"pattern": r"WT\s*([-+]?\d+(?:\.\d+)?)", "unit": "kg", "divisor": 1.0},
}


class RegexAdapterScale(GenericSerialScale):
    """Vendor adapter: GenericSerial with a named profile from VENDOR_PROFILES."""

    def __init__(self, profile: str = "generic_kg", port: str = "COM1",
                 baud: int = 9600, timeout: float = 2.0):
        if profile not in VENDOR_PROFILES:
            raise ValueError(f"Unknown scale profile: {profile}")
        p = VENDOR_PROFILES[profile]
        super().__init__(port, baud, p["pattern"], p["unit"], p["divisor"], timeout)
        self.profile = profile


class SimulatorScale(ScaleProtocol):
    """Scripted weights for tests and admin hardware checks."""

    def __init__(self, weights_kg: list[float]):
        self._weights = list(weights_kg)
        self._pos = 0
        self.opened = False

    def open(self) -> None:
        self.opened = True

    def read_kg(self) -> ScaleReading:
        if not self.opened:
            return ScaleReading(False, 0.0, "Scale not open")
        if self._pos >= len(self._weights):
            return ScaleReading(False, 0.0, "No more scripted weights")
        w = self._weights[self._pos]
        self._pos += 1
        return ScaleReading(True, round(w, 3), "ok (simulated)")

    def close(self) -> None:
        self.opened = False
