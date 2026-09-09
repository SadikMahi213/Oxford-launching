"""Central application configuration (no hard-coded business data in code)."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field


def _app_data_dir() -> str:
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
        return os.path.join(base, "DigitalDokan")
    return os.path.join(os.path.expanduser("~"), ".digitaldokan")


@dataclass
class AppConfig:
    app_data_dir: str = field(default_factory=_app_data_dir)
    db_filename: str = "digitaldokan.db"
    backup_dirname: str = "backups"
    logs_dirname: str = "logs"
    receipt_width_80mm_chars: int = 42
    receipt_width_58mm_chars: int = 32
    currency: str = "BDT"
    currency_symbol: str = "৳"
    default_language: str = "en"  # "en" | "bn"
    session_timeout_minutes: int = 15
    backup_retention: int = 14
    allow_negative_stock: bool = False

    @property
    def db_path(self) -> str:
        return os.path.join(self.app_data_dir, self.db_filename)

    @property
    def backup_dir(self) -> str:
        return os.path.join(self.app_data_dir, self.backup_dirname)

    @property
    def logs_dir(self) -> str:
        return os.path.join(self.app_data_dir, self.logs_dirname)

    def ensure_dirs(self) -> None:
        for d in (self.app_data_dir, self.backup_dir, self.logs_dir):
            os.makedirs(d, exist_ok=True)


DEFAULT_CONFIG = AppConfig()
