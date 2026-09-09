"""R2 Phase 9 tests: backup version compat, restore refusal/rollback, health."""
import json
import os
import sqlite3
import tempfile
import unittest
from unittest import mock

from app.infra import backup as backupmod
from app.infra import db as dbmod
from app.infra.migrations import initialize
from app.version import __db_version__


class TestBackupR2(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.db = os.path.join(self.tmp, "shop.db")
        self.bdir = os.path.join(self.tmp, "b")
        self.conn = initialize(self.db)
        self.conn.execute(
            "INSERT INTO users(username, full_name, password_hash, password_salt, role_id)"
            " VALUES('o','O','h','s',1)")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_manifest_records_version(self):
        m = backupmod.create_backup(self.conn, self.bdir)
        self.assertEqual(m["db_version"], __db_version__)
        v = backupmod.verify_backup(os.path.join(self.bdir, m["filename"]))
        self.assertEqual(v["db_version"], __db_version__)
        self.assertTrue(v["compatible"])

    def test_newer_schema_restore_refused(self):
        m = backupmod.create_backup(self.conn, self.bdir)
        path = os.path.join(self.bdir, m["filename"])
        c = sqlite3.connect(path)
        c.execute("DELETE FROM schema_version")
        c.execute("INSERT INTO schema_version(version) VALUES(999)")
        c.commit()
        c.close()
        # Re-sign manifest so the test isolates the VERSION check (not checksum).
        digest = backupmod.sha256_file(path)
        mp = path + ".manifest.json"
        with open(mp, encoding="utf-8") as f:
            man = json.load(f)
        man["sha256"] = digest
        with open(mp, "w", encoding="utf-8") as f:
            json.dump(man, f)
        v = backupmod.verify_backup(path)
        self.assertFalse(v["compatible"])
        with self.assertRaises(RuntimeError):
            backupmod.restore_backup(path, self.db)
        # Live DB untouched.
        self.assertIsNotNone(dbmod.connect(self.db).execute(
            "SELECT id FROM users WHERE username='o'").fetchone())

    def test_failed_restore_rolls_back(self):
        m = backupmod.create_backup(self.conn, self.bdir)
        path = os.path.join(self.bdir, m["filename"])
        self.conn.close()  # quiesce, mirroring the production restart-restore flow
        with mock.patch("app.infra.db.integrity_check", return_value="*** corrupt ***"):
            with self.assertRaises(RuntimeError) as cm:
                backupmod.restore_backup(path, self.db)
        self.assertIn("rolled back", str(cm.exception))
        conn = dbmod.connect(self.db)
        try:
            self.assertIsNotNone(conn.execute(
                "SELECT id FROM users WHERE username='o'").fetchone())
        finally:
            conn.close()
        self.conn = dbmod.connect(self.db)

    def test_restore_keeps_quarantine_and_health(self):
        m = backupmod.create_backup(self.conn, self.bdir)
        self.conn.close()  # quiesce, mirroring the production restart-restore flow
        backupmod.restore_backup(os.path.join(self.bdir, m["filename"]), self.db)
        self.conn = dbmod.connect(self.db)
        leftovers = [f for f in os.listdir(self.tmp) if ".pre-restore-" in f]
        self.assertTrue(leftovers)  # quarantine preserved for forensics
        h = backupmod.backup_health(self.conn, self.bdir)
        self.assertEqual(h["status"], "ok")
        h2 = backupmod.backup_health(self.conn, os.path.join(self.tmp, "empty"))
        # History rows survived the restore, but no files there → missing (correct).
        self.assertEqual(h2["status"], "missing")


if __name__ == "__main__":
    unittest.main()
