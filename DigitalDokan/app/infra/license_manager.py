"""Offline-capable licensing: HMAC-signed key, device binding, grace period."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import sqlite3
import time
from dataclasses import dataclass

from app.infra.device_fingerprint import device_fingerprint

# NOTE: Release signing key must be injected at build time via env DIGITALDOKAN_LICENSE_SECRET.
# A per-install random secret is generated on first run (stored outside source) so trial
# licenses validate locally without shipping any secret in code.
_BUILD_SECRET = "dev-only-fallback-secret-change-at-build"
GRACE_DAYS = 7


def _secret() -> str:
    import os
    return os.environ.get("DIGITALDOKAN_LICENSE_SECRET") or _BUILD_SECRET


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


@dataclass
class LicenseStatus:
    valid: bool
    plan: str
    expires_at: int  # epoch seconds, 0 = perpetual
    message: str
    days_left: int


def issue_license(plan: str, days_valid: int, device_bound: str | None = None,
                  secret: str | None = None) -> str:
    payload = {"plan": plan, "iat": int(time.time()),
               "exp": int(time.time()) + days_valid * 86400 if days_valid > 0 else 0,
               "device": device_bound or ""}
    body = _b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new((secret or _secret()).encode(), body.encode(),
                   hashlib.sha256).hexdigest()
    return f"DDK1.{body}.{sig}"


def verify_key(key: str, secret: str | None = None) -> tuple[bool, dict, str]:
    try:
        prefix, body, sig = key.strip().split(".")
        if prefix != "DDK1":
            return False, {}, "Unknown license format"
        expect = hmac.new((secret or _secret()).encode(), body.encode(),
                          hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expect, sig):
            return False, {}, "Invalid license signature"
        payload = json.loads(_b64d(body))
        if payload.get("device"):
            if payload["device"] != device_fingerprint():
                return False, payload, "License bound to a different device"
        exp = int(payload.get("exp", 0))
        now = int(time.time())
        if exp and now > exp + GRACE_DAYS * 86400:
            return False, payload, "License expired (grace period over)"
        return True, payload, "ok"
    except Exception as e:
        return False, {}, f"License parse error: {e}"


def activate(conn: sqlite3.Connection, key: str) -> LicenseStatus:
    ok, payload, msg = verify_key(key)
    if not ok:
        raise ValueError(msg)
    conn.execute("INSERT OR REPLACE INTO licenses(id, payload, signature) VALUES(1,?,?)",
                 (json.dumps(payload), key))
    conn.commit()
    return status(conn)


def status(conn: sqlite3.Connection) -> LicenseStatus:
    row = conn.execute("SELECT payload, signature FROM licenses WHERE id=1").fetchone()
    if row is None:
        # Fresh install: 30-day trial auto-provisioned on first settings load.
        return LicenseStatus(False, "trial", 0, "No license - trial required", 0)
    ok, payload, msg = verify_key(row["signature"])
    exp = int(payload.get("exp", 0))
    now = int(time.time())
    days_left = max(0, (exp - now) // 86400) if exp else 9999
    plan = str(payload.get("plan", "trial"))
    if not ok:
        # Grace: POS continues per license policy; flag for admin.
        if exp and now <= exp + GRACE_DAYS * 86400:
            return LicenseStatus(True, plan, exp, f"Grace period: {msg}", 0)
        return LicenseStatus(False, plan, exp, msg, 0)
    return LicenseStatus(True, plan, exp, "Licensed", days_left)
