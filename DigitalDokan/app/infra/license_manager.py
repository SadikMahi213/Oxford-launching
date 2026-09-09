"""Offline commercial licensing (§29): signed keys, device binding, states, editions.

States: TRIAL → ACTIVE → EXPIRING → GRACE → EXPIRED, plus SUSPENDED.
- TRIAL: no key yet; full features for 30 days from first-user creation.
- ACTIVE / EXPIRING (≤7 days left): normal operation.
- GRACE (≤7 days past expiry): POS keeps working; admin is warned.
- EXPIRED / SUSPENDED: NEW transactions are refused (LicenseError), but
  historical data — reports, exports, backups, audit — always stays readable.
  Users are never locked out of their own records.

Editions (feature flags, same codebase): basic / professional / enterprise.
Trial grants all features. LAN requires professional or enterprise.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import sqlite3
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone

from app.infra.device_fingerprint import device_fingerprint

# NOTE: Release signing key must be injected at build time via env DIGITALDOKAN_LICENSE_SECRET.
_BUILD_SECRET = "dev-only-fallback-secret-change-at-build"
GRACE_DAYS = 7
TRIAL_DAYS = 30
EXPIRING_WITHIN_DAYS = 7

EDITIONS = ("basic", "professional", "enterprise")
EDITION_FEATURES: dict[str, set[str]] = {
    "basic": {"pos", "inventory", "customers", "reports.basic", "backup"},
    "professional": {"pos", "inventory", "customers", "supplier", "due", "reports",
                     "hardware", "backup", "lan", "promotions"},
    "enterprise": {"pos", "inventory", "customers", "supplier", "due", "reports",
                   "hardware", "backup", "lan", "promotions", "multibranch",
                   "audit", "sync", "api"},
}


def _secret() -> str:
    import os
    return os.environ.get("DIGITALDOKAN_LICENSE_SECRET") or _BUILD_SECRET


def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


class LicenseError(PermissionError):
    """Raised when a NEW transaction is attempted without transacting rights."""


@dataclass
class LicenseStatus:
    valid: bool
    state: str  # TRIAL ACTIVE EXPIRING GRACE EXPIRED SUSPENDED
    plan: str
    edition: str = "professional"
    terminals: int = 1
    branches: int = 1
    features: set[str] = field(default_factory=set)
    expires_at: int = 0  # epoch seconds, 0 = perpetual
    message: str = ""
    days_left: int = 0

    def can_transact(self) -> bool:
        return self.state in ("TRIAL", "ACTIVE", "EXPIRING", "GRACE") and self.valid

    def has_feature(self, name: str) -> bool:
        if self.state == "TRIAL" and self.valid:
            return True  # trial is full-featured
        if name in self.features:
            return True
        return name in EDITION_FEATURES.get(self.edition, set())


def issue_license(plan: str, days_valid: int, device_bound: str | None = None,
                  secret: str | None = None, edition: str = "professional",
                  terminals: int = 1, branches: int = 1,
                  features: list[str] | None = None, state: str = "active") -> str:
    if edition not in EDITIONS:
        raise ValueError(f"Unknown edition: {edition}")
    payload = {"plan": plan, "iat": int(time.time()),
               "exp": int(time.time()) + days_valid * 86400 if days_valid > 0 else 0,
               "device": device_bound or "", "edition": edition,
               "terminals": int(terminals), "branches": int(branches),
               "features": features or [], "state": state}
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
        if str(payload.get("state", "active")).lower() == "suspended":
            return False, payload, "License suspended - contact your reseller"
        return True, payload, "ok"
    except Exception as e:
        return False, {}, f"License parse error: {e}"


def _trial_start(conn: sqlite3.Connection) -> int | None:
    try:
        row = conn.execute("SELECT MIN(created_at) m FROM users").fetchone()
    except Exception:
        return None
    if row is None or not row["m"]:
        return None
    try:
        dt = datetime.fromisoformat(str(row["m"]).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return int(dt.timestamp())
    except Exception:
        return None


def _from_payload(payload: dict, ok: bool, msg: str) -> LicenseStatus:
    exp = int(payload.get("exp", 0))
    now = int(time.time())
    days_left = max(0, (exp - now) // 86400) if exp else 9999
    plan = str(payload.get("plan", "trial"))
    edition = str(payload.get("edition", "professional"))
    if edition not in EDITIONS:
        edition = "professional"
    base = LicenseStatus(valid=False, state="EXPIRED", plan=plan, edition=edition,
                         terminals=int(payload.get("terminals", 1)),
                         branches=int(payload.get("branches", 1)),
                         features=set(payload.get("features", []) or []),
                         expires_at=exp, days_left=days_left)
    if not ok:
        if msg.startswith("License suspended"):
            base.state, base.message = "SUSPENDED", msg
        elif exp and now > exp + GRACE_DAYS * 86400:
            base.message = "License expired (grace period over)"
        else:
            base.message = msg
        return base
    if exp and now > exp + GRACE_DAYS * 86400:
        base.message = "License expired (grace period over)"
        return base
    base.valid = True
    if exp == 0:
        base.state, base.message = "ACTIVE", "Licensed (perpetual)"
    elif now > exp:
        base.state, base.message = "GRACE", f"Grace period: {GRACE_DAYS - (now - exp) // 86400} days left"
    elif (exp - now) // 86400 <= EXPIRING_WITHIN_DAYS:
        base.state, base.message = "EXPIRING", f"License expires in {days_left} days"
    else:
        base.state, base.message = "ACTIVE", "Licensed"
    return base


def activate(conn: sqlite3.Connection, key: str) -> LicenseStatus:
    ok, payload, msg = verify_key(key)
    if not ok:
        raise ValueError(msg)
    conn.execute("INSERT OR REPLACE INTO licenses(id, payload, signature) VALUES(1,?,?)",
                 (json.dumps(payload), key))
    conn.commit()
    try:
        from app.services.audit_service import record
        record(conn, user_id=None, action="license.activated", entity="license",
               entity_id=str(payload.get("plan", "")), new_value=json.dumps(payload, default=str))
        conn.commit()
    except Exception:
        pass
    return status(conn)


def status(conn: sqlite3.Connection) -> LicenseStatus:
    row = conn.execute("SELECT payload, signature FROM licenses WHERE id=1").fetchone()
    if row is None:
        start = _trial_start(conn)
        if start is None:
            return LicenseStatus(False, "TRIAL", "trial", message="Trial starts at first user")
        left = TRIAL_DAYS - (int(time.time()) - start) // 86400
        if left < 0:
            return LicenseStatus(False, "EXPIRED", "trial",
                                 message="Trial expired - activate a license (data stays readable)")
        return LicenseStatus(True, "TRIAL", "trial", days_left=int(left),
                             message=f"Trial: {int(left)} days left")
    ok, payload, msg = verify_key(row["signature"])
    return _from_payload(payload, ok, msg)


def require_transact(conn: sqlite3.Connection) -> LicenseStatus:
    """Gate for NEW financial transactions. Reads/exports/backups never call this."""
    st = status(conn)
    if not st.can_transact():
        raise LicenseError(f"Transactions disabled ({st.state}): {st.message}. "
                           f"Your data stays readable - activate a license to resume selling.")
    return st


def require_feature(conn: sqlite3.Connection, name: str) -> LicenseStatus:
    st = status(conn)
    if not st.has_feature(name):
        raise LicenseError(f"Edition '{st.edition}' does not include '{name}'.")
    return st
