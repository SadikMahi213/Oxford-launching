"""Headless diagnostics: version, DB health, license, backup status (no PII)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import AppConfig
from app.infra import db as dbmod
from app.infra.migrations import initialize
from app.version import __version__, __db_version__


def main():
    cfg = AppConfig()
    print(f"app={__version__} db_schema={__db_version__}")
    conn = initialize(cfg.db_path)
    print("db_integrity:", dbmod.integrity_check(conn))
    sales = conn.execute("SELECT COUNT(*) c FROM sales").fetchone()["c"]
    prods = conn.execute("SELECT COUNT(*) c FROM products").fetchone()["c"]
    print(f"sales={sales} products={prods}")
    from app.infra import license_manager
    st = license_manager.status(conn)
    print(f"license plan={st.plan} valid={st.valid} msg={st.message}")
    last = conn.execute("SELECT filename, created_at FROM backups ORDER BY id DESC LIMIT 1").fetchone()
    print("last_backup:", dict(last) if last else "none")
    conn.close()


if __name__ == "__main__":
    main()
