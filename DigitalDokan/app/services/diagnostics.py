"""Support diagnostics (§36): version, DB, OS, printer, integrity, license,
backup, LAN — counts only, no secrets, no PII. Powers Help → Diagnostics."""
from __future__ import annotations

import platform
import sqlite3
import sys

from app.version import __db_version__, __release_name__, __version__


def collect(conn: sqlite3.Connection, *, backup_dir: str = "",
            lan_mode: str = "standalone", lan_reachable: bool | None = None) -> dict:
    from app.infra import backup as backupmod
    from app.infra import db as dbmod
    from app.infra import license_manager
    from app.infra.migrations import get_db_version
    from app.services import settings_service
    st = license_manager.status(conn)
    try:
        outbox = conn.execute("SELECT COUNT(*) c FROM outbox WHERE status='pending'").fetchone()["c"]
    except Exception:
        outbox = -1
    counts = {}
    for tbl in ("sales", "products", "users", "customers", "suppliers"):
        try:
            counts[tbl] = conn.execute(f"SELECT COUNT(*) c FROM {tbl}").fetchone()["c"]
        except Exception:
            counts[tbl] = -1
    return {
        "app": __version__, "release": __release_name__, "db_version": __db_version__,
        "schema_version": get_db_version(conn),
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "python": sys.version.split()[0],
        "integrity": dbmod.integrity_check(conn),
        "license": {"state": st.state, "plan": st.plan, "edition": st.edition,
                    "valid": st.valid, "message": st.message, "days_left": st.days_left},
        "backup": backupmod.backup_health(conn, backup_dir) if backup_dir else {"status": "unknown"},
        "lan": {"mode": lan_mode, "reachable": lan_reachable},
        "printer": {"configured": bool(settings_service.get(conn, "printer_name", "")),
                    "size": settings_service.get(conn, "receipt_size", "80mm")},
        "outbox_pending": outbox,
        "counts": counts,
    }


def format_text(diag: dict) -> str:
    L = [f"DigitalDokan {diag['app']} ({diag['release']})",
         f"DB schema v{diag['schema_version']} (app v{diag['db_version']}) | OS: {diag['os']} | "
         f"Python {diag['python']}",
         f"Integrity: {diag['integrity']}",
         f"License: {diag['license']['state']} plan={diag['license']['plan']} "
         f"edition={diag['license']['edition']} valid={diag['license']['valid']} - "
         f"{diag['license']['message']}",
         f"Backup: {diag['backup'].get('status')} - {diag['backup'].get('message', '')}",
         f"LAN: mode={diag['lan']['mode']} reachable={diag['lan']['reachable']} | "
         f"Printer configured={diag['printer']['configured']} ({diag['printer']['size']}) | "
         f"Outbox pending={diag['outbox_pending']}",
         "Counts: " + ", ".join(f"{k}={v}" for k, v in diag["counts"].items())]
    return "\n".join(L)
