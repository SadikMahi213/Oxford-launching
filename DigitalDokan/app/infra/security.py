"""Password/PIN hashing with PBKDF2-HMAC-SHA256 (stdlib, no plaintext storage)."""
from __future__ import annotations

import hashlib
import hmac
import os

ITERATIONS = 260_000


def hash_password(password: str, salt_hex: str | None = None) -> tuple[str, str]:
    if len(password) < 4:
        raise ValueError("Password too short (min 4 chars)")
    salt = bytes.fromhex(salt_hex) if salt_hex else os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return dk.hex(), salt.hex()


def verify_password(password: str, hash_hex: str, salt_hex: str) -> bool:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), ITERATIONS)
    return hmac.compare_digest(dk.hex(), hash_hex)
