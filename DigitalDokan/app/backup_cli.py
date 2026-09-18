"""Scheduled/manual backup entry point (for Windows Task Scheduler daily runs)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import AppConfig
from app.infra import backup as backupmod
from app.infra import db as dbmod


def main() -> int:
    cfg = AppConfig()
    cfg.ensure_dirs()
    conn = dbmod.connect(cfg.db_path)
    try:
        m = backupmod.create_backup(conn, cfg.backup_dir, note="scheduled",
                                    retention=cfg.backup_retention)
        print(f"OK {m['filename']} {m['sha256']}")
        return 0
    except Exception as e:
        print(f"BACKUP FAILED: {e}")
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
