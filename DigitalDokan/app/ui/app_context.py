"""Shared UI context: single DB connection, session, config, language."""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from app.config import AppConfig


@dataclass
class AppContext:
    conn: sqlite3.Connection
    config: AppConfig
    session: object = None  # auth_service.Session
    terminal_code: str = "POS-01"
    language: str = "en"
    shift_id: int | None = None
