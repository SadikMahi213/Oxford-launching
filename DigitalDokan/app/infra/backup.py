"""Backup/restore with integrity validation and retention (mandatory module)."""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
import time
from datetime import datetime, timezone

from app.version import __db_version__ as _APP_DB_VERSION


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
    # Record the row BEFORE the snapshot so the backup file itself contains its
    # own history row (survives restore); finalize after the copy verifies.
    conn.execute("INSERT INTO backups(filename, sha256, size_bytes, status, note)"
                 " VALUES(?,'',0,'in-progress',?)", (filename, note))
    conn.commit()
    try:
        conn.execute("VACUUM INTO ?", (dest,))
    except Exception:
        conn.execute("UPDATE backups SET status='failed' WHERE filename=?", (filename,))
        conn.commit()
        raise
    digest = sha256_file(dest)
    size = os.path.getsize(dest)
    manifest = {"filename": filename, "sha256": digest, "size_bytes": size,
                "created_utc": stamp, "note": note, "db_version": _APP_DB_VERSION,
                "app": "digitaldokan"}
    with open(dest + ".manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    conn.execute("UPDATE backups SET sha256=?, size_bytes=?, status='ok' WHERE filename=?",
                 (digest, size, filename))
    conn.commit()
    # Retention: keep newest N .db files; drop rows for pruned/missing files.
    dbs = sorted(f for f in os.listdir(backup_dir) if f.startswith("digitaldokan-") and f.endswith(".db"))
    for old in dbs[: max(0, len(dbs) - retention)]:
        try:
            os.remove(os.path.join(backup_dir, old))
            try:
                os.remove(os.path.join(backup_dir, old + ".manifest.json"))
            except OSError:
                pass
        except OSError:
            pass
        conn.execute("DELETE FROM backups WHERE filename=?", (old,))
    live = {f for f in os.listdir(backup_dir) if f.startswith("digitaldokan-") and f.endswith(".db")}
    for (fn,) in conn.execute("SELECT filename FROM backups").fetchall():
        if fn not in live:
            conn.execute("DELETE FROM backups WHERE filename=?", (fn,))
    conn.commit()
    return manifest


def _backup_db_version(backup_file: str) -> int | None:
    """Read schema_version from the backup file without opening it as the live DB."""
    c = sqlite3.connect(backup_file)
    c.row_factory = sqlite3.Row
    try:
        try:
            row = c.execute("SELECT MAX(version) v FROM schema_version").fetchone()
        except Exception:
            return None
        return int(row["v"]) if row and row["v"] is not None else None
    finally:
        c.close()


def verify_backup(backup_file: str) -> dict:
    if not os.path.exists(backup_file):
        raise FileNotFoundError(backup_file)
    manifest_path = backup_file + ".manifest.json"
    digest = sha256_file(backup_file)
    result = {"sha256": digest, "manifest_match": None, "integrity": None,
              "db_version": None, "compatible": None}
    manifest_version = None
    if os.path.exists(manifest_path):
        with open(manifest_path, encoding="utf-8") as f:
            m = json.load(f)
        result["manifest_match"] = (m.get("sha256") == digest)
        manifest_version = m.get("db_version")
    c = sqlite3.connect(backup_file)
    try:
        result["integrity"] = c.execute("PRAGMA integrity_check;").fetchone()[0]
    finally:
        c.close()
    ver = _backup_db_version(backup_file)
    if ver is None:
        ver = manifest_version
    result["db_version"] = ver
    # Compatible when the running app understands the backup schema (no silent upgrade).
    result["compatible"] = (ver is not None and ver <= _APP_DB_VERSION)
    return result


def restore_backup(backup_file: str, db_path: str, session=None) -> str:
    """Guided restore: pre-restore validation, quarantine, copy, post-restore
    verification, and failed-restore rollback from quarantine."""
    if session is not None:
        session.require("backup.restore")
    v = verify_backup(backup_file)  # pre-restore validation
    if v["integrity"] != "ok":
        raise RuntimeError(f"Backup failed integrity check: {v['integrity']}")
    if v["manifest_match"] is False:
        raise RuntimeError("Backup checksum mismatch - refusing restore")
    if v["compatible"] is False:
        raise RuntimeError(
            f"Backup schema v{v['db_version']} is newer than this app (v{_APP_DB_VERSION}) - "
            f"update the application first, restore refused")
    quarantine = None
    if os.path.exists(db_path):
        _assert_quiesced(db_path)  # checkpoint WAL; refuse if writers are active
        ts = time.strftime("%Y%m%d-%H%M%S")
        quarantine = db_path + f".pre-restore-{ts}.bak"
        _checkpoint_and_copy(db_path, quarantine)
        for suffix in ("-wal", "-shm"):
            p = db_path + suffix
            if os.path.exists(p):
                try:
                    os.remove(p)
                except PermissionError as e:
                    raise RuntimeError(f"Cannot replace live database ({p} locked) - "
                                       f"close the application and retry restore") from e
    with open(backup_file, "rb") as src, open(db_path, "wb") as dst:
        dst.write(src.read())
    # Post-restore verification; on failure roll the quarantine copy back.
    try:
        from app.infra import db as dbmod
        chk = dbmod.connect(db_path)
        try:
            ok = dbmod.integrity_check(chk) == "ok"
            if ok:
                # The restored file passed pre-restore verification, so its own
                # history row (snapshotted as in-progress) is finalized here.
                chk.execute("UPDATE backups SET status='ok' WHERE filename=?",
                            (os.path.basename(backup_file),))
                chk.commit()
        finally:
            chk.close()
        if not ok:
            raise RuntimeError("restored database failed integrity check")
    except Exception as e:
        if quarantine and os.path.exists(quarantine):
            for suffix in ("", "-wal", "-shm", "-journal"):
                p = db_path + suffix
                if os.path.exists(p):
                    os.remove(p)
            with open(quarantine, "rb") as src, open(db_path, "wb") as dst:
                dst.write(src.read())
            raise RuntimeError(f"Restore failed and was rolled back ({e}); "
                               f"previous database preserved (quarantine: {quarantine})")
        raise
    return db_path


def _assert_quiesced(db_path: str) -> None:
    """Checkpoint the WAL and refuse restore while a writer transaction is active."""
    from app.infra import db as dbmod
    conn = dbmod.connect(db_path)
    try:
        row = conn.execute("PRAGMA wal_checkpoint(TRUNCATE);").fetchone()
        busy = int(row[2]) if row is not None else 1
        if busy:
            raise RuntimeError("Database is busy (open transaction) - "
                               "finish current work and retry restore")
    finally:
        conn.close()


def _checkpoint_and_copy(src: str, dest: str) -> None:
    from app.infra import db as dbmod
    conn = dbmod.connect(src)
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    finally:
        conn.close()
    with open(src, "rb") as fsrc, open(dest, "wb") as fdst:
        fdst.write(fsrc.read())


def backup_health(conn: sqlite3.Connection, backup_dir: str) -> dict:
    """Backup health indicator for diagnostics, driven by the backup directory
    (survives restores) with the backups table as fallback history."""
    try:
        files = sorted(f for f in os.listdir(backup_dir)
                       if f.startswith("digitaldokan-") and f.endswith(".db"))
    except OSError:
        files = []
    if not files:
        n = conn.execute("SELECT COUNT(*) c FROM backups").fetchone()["c"]
        if n:
            return {"status": "missing",
                    "message": "Backups recorded but files are gone - check the backup drive"}
        return {"status": "none", "message": "No backups recorded yet"}
    latest = files[-1]
    path = os.path.join(backup_dir, latest)
    manifest_ok = os.path.exists(path + ".manifest.json")
    try:
        age_h = (time.time() - os.path.getmtime(path)) / 3600.0
    except OSError:
        age_h = -1
    fresh = 0 <= age_h <= 30
    size = 0
    try:
        size = os.path.getsize(path)
    except OSError:
        pass
    if size == 0:
        return {"status": "missing", "filename": latest,
                "message": "Latest backup file is empty/missing"}
    if not manifest_ok:
        return {"status": "unverified", "filename": latest, "age_hours": round(age_h, 1),
                "message": "Latest backup has no manifest - verify it manually"}
    return {"status": "ok" if fresh else "stale", "filename": latest,
            "age_hours": round(age_h, 1), "size_bytes": size,
            "message": "Latest backup fresh" if fresh else
                       f"Latest backup is {age_h:.1f}h old - check scheduled backups"}
