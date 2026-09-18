"""Central application configuration (no hard-coded business data in code)."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field


def _app_data_dir() -> str:
    """User data home. Precedence: env override > machine layout (opt-in via
    DIGITALDOKAN_MACHINE=1, used by multi-user installs) > per-user %APPDATA%.

    The default stays %APPDATA% so existing single-PC installs never move.
    No automatic relocation is ever performed (data integrity > convenience).
    """
    import os
    override = os.environ.get("DIGITALDOKAN_DATA_DIR")
    if override:
        return override
    if sys.platform == "win32" and os.environ.get("DIGITALDOKAN_MACHINE") == "1":
        program_data = os.environ.get("PROGRAMDATA") or r"C:\ProgramData"
        return os.path.join(program_data, "DigitalDokan", "data")
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
        return os.path.join(base, "DigitalDokan")
    return os.path.join(os.path.expanduser("~"), ".digitaldokan")


def _machine_base() -> str | None:
    import os
    if sys.platform == "win32":
        program_data = os.environ.get("PROGRAMDATA") or r"C:\ProgramData"
        return os.path.join(program_data, "DigitalDokan")
    return None


@dataclass
class AppConfig:
    app_data_dir: str = field(default_factory=_app_data_dir)
    db_filename: str = "digitaldokan.db"
    backup_dirname: str = "backups"
    logs_dirname: str = "logs"
    licenses_dirname: str = "licenses"
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

    @property
    def licenses_dir(self) -> str:
        """Reserved for file-based license artifacts (machine layout); the live
        license of record stays in the database licenses table."""
        return os.path.join(self.app_data_dir, self.licenses_dirname)

    def ensure_dirs(self) -> None:
        for d in (self.app_data_dir, self.backup_dir, self.logs_dir, self.licenses_dir):
            os.makedirs(d, exist_ok=True)


DEFAULT_CONFIG = AppConfig()
