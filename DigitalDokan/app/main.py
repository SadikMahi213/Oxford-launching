"""Application entry: offline-first startup, crash-safe error references."""
from __future__ import annotations

import sqlite3
import sys
import traceback
import uuid

from app.config import AppConfig
from app.infra import db as dbmod
from app.infra.logging_setup import log_event, setup_logging
from app.infra.migrations import initialize
from app.ui.app_context import AppContext


def _err_reference() -> str:
    import datetime
    return f"ERR-{datetime.datetime.now():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"


def main() -> int:
    from PySide6.QtWidgets import QApplication, QMessageBox
    config = AppConfig()
    config.ensure_dirs()
    logger = setup_logging(config.logs_dir)
    qt_app = QApplication(sys.argv)
    try:
        first_run = False
        try:
            conn = dbmod.connect(config.db_path)
            n = conn.execute("SELECT COUNT(*) c FROM sqlite_master WHERE type='table'"
                             " AND name='schema_version'").fetchone()["c"]
            conn.close()
            first_run = (n == 0)
        except Exception:
            first_run = True
        conn = initialize(config.db_path)
        # Pragmas re-applied per connection inside initialize->connect.
        ctx = AppContext(conn=conn, config=config,
                         language="en", terminal_code="POS-01")
        from app.ui.login_dialog import LoginDialog
        if LoginDialog(ctx).exec() != 1:
            return 0
        log_event(logger, "security", "login", user=str(ctx.session.user_id))
        from app.ui.main_window import MainWindow
        win = MainWindow(ctx)
        win.show()
        return qt_app.exec()
    except Exception as e:
        ref = _err_reference()
        try:
            log_event(logger, "error", "startup-failure", ref=ref, error=repr(e),
                      trace=traceback.format_exc()[-3000:])
        except Exception:
            pass
        try:
            QMessageBox.critical(None, "Something went wrong",
                                 f"Something went wrong.\nThe operation was not completed.\nReference: {ref}")
        except Exception:
            print(f"Fatal [{ref}]: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
