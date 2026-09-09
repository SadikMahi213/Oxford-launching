"""Stable device fingerprint (tolerant to normal upgrades, no invasive IDs)."""
from __future__ import annotations

import hashlib
import os
import platform
import uuid


def device_fingerprint() -> str:
    parts = [platform.node(), str(uuid.getnode())]
    try:
        if os.name == "nt":
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                r"SOFTWARE\Microsoft\Cryptography") as k:
                guid, _ = winreg.QueryValueEx(k, "MachineGuid")
                parts.append(str(guid))
    except Exception:
        pass
    raw = "|".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]
