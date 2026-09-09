"""Backup/restore with integrity validation and retention (mandatory module)."""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime, timezone


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def create_backup(conn: sqlite3.Connection, backup_dir: str, note: str = "manual",
                  retention: int = 14, session=None) -> dict:
    """Online backup via VACUUM INTO (safe while app runs). Validates integrity first."""
    if session is not None:
        session.require("backup.create")
    os.makedirs(backup_dir, exist_ok=True)
    integrity = conn.execute("PRAGMA integrity_check;").fetchone()[0]
    if str(integrity) != "ok":
        conn.execute("INSERT INTO system_logs(level, category, message) VALUES('ERROR','backup',?)",
                     (f"Backup refused: integrity_check={integrity}",))
        raise RuntimeError(f"Database integrity check failed: {integrity}")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    filename = f"digitaldokan-{stamp}.db"
    dest = os.path.join(backup_dir, filename)
    conn.execute("VACUUM INTO ?", (dest,))
    digest = sha256_file(dest)
    size = os.path.getsize(dest)
    manifest = {"filename": filename, "sha256": digest, "size_bytes": size,
                "created_utc": stamp, "note": note, "db_version": 1}
    with open(dest + ".manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    conn.execute("INSERT INTO backups(filename, sha256, size_bytes, status, note) VALUES(?,?,?,?,?)",
                 (filename, digest, size, "ok", note))
    conn.commit()
    # Retention: keep newest N .db files.
    dbs = sorted(f for f in os.listdir(backup_dir) if f.startswith("digitaldokan-") and f.endswith(".db"))
    for old in dbs[: max(0, len(dbs) - retention)]:
        try:
            os.remove(os.path.join(backup_dir, old))
        except OSError:
            pass
    return manifest


def verify_backup(backup_file: str) -> dict:
    if not os.path.exists(backup_file):
        raise FileNotFoundError(backup_file)
    manifest_path = backup_file + ".manifest.json"
    digest = sha256_file(backup_file)
    result = {"sha256": digest, "manifest_match": None, "integrity": None}
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            m = json.load(f)
        result["manifest_match"] = (m.get("sha256") == digest)
    c = sqlite3.connect(backup_file)
    try:
        result["integrity"] = c.execute("PRAGMA integrity_check;").fetchone()[0]
    finally:
        c.close()
    return result


def restore_backup(backup_file: str, db_path: str, session=None) -> str:
    """Guided restore: validates, quarantines current DB with timestamp, copies backup in."""
    if session is not None:
        session.require("backup.restore")
    v = verify_backup(backup_file)
    if v["integrity"] != "ok":
        raise RuntimeError(f"Backup failed integrity check: {v['integrity']}")
    if v["manifest_match"] is False:
        raise RuntimeError("Backup checksum mismatch - refusing restore")
    if os.path.exists(db_path):
        ts = time.strftime("%Y%m%d-%H%M%S")
        os.replace(db_path, db_path + f".pre-restore-{ts}.bak")
        for suffix in ("-wal", "-shm"):
            p = db_path + suffix
            if os.path.exists(p):
                os.remove(p)
    with open(backup_file, "rb") as src, open(db_path, "wb") as dst:
        dst.write(src.read())
    return db_path
