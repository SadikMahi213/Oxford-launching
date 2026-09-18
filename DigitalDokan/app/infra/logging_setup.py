"""Structured logging: app/security/hardware/error streams, no secrets."""
from __future__ import annotations

import json
import logging
import os
from logging.handlers import RotatingFileHandler


def setup_logging(logs_dir: str) -> logging.Logger:
    os.makedirs(logs_dir, exist_ok=True)
    logger = logging.getLogger("digitaldokan")
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger
    fmt = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
    for name in ("app.log",):
        h = RotatingFileHandler(os.path.join(logs_dir, name), maxBytes=2_000_000, backupCount=5,
                                encoding="utf-8")
        h.setFormatter(fmt)
        logger.addHandler(h)
    return logger


def redact(payload: dict) -> dict:
    secrets = {"password", "pin", "password_hash", "pin_hash", "signature", "license", "api_secret"}
    return {k: ("***" if k.lower() in secrets else v) for k, v in payload.items()}


def log_event(logger: logging.Logger, category: str, message: str, **fields) -> None:
    logger.info("%s | %s | %s", category, message, json.dumps(redact(fields), default=str))
