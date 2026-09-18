"""Authentication + RBAC enforced server/application-side (never UI-only)."""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

from app.infra.security import hash_password, verify_password

SESSION_TIMEOUT_MIN = 15
MAX_ATTEMPTS = 5


class PasswordChangeRequired(ValueError):
    """Forced rotation: the password verified, but the account must set a new one."""

    def __init__(self, user_id: int):
        super().__init__("Password change required - set a new password to continue")
        self.user_id = user_id

# R1 flat codes → R2 dotted codes. Session.can() resolves these so Release-1
# databases and role assignments keep working unchanged.
PERMISSION_ALIASES: dict[str, set[str]] = {
    "sale.create": {"sell"},
    "sale.refund": {"refund"},
    "sale.cancel": {"cancel_invoice"},
    "sale.reprint": {"sell"},
    "discount.apply": {"give_discount"},
    "discount.override": {"give_discount"},
    "price.change": {"change_price"},
    "product.manage": {"edit_product"},
    "inventory.adjust": {"adjust_stock"},
    "inventory.transfer": {"adjust_stock"},
    "purchase.create": {"edit_product", "approve"},
    "purchase.approve": {"approve"},
    "supplier.payment": {"approve"},
    "customer.credit": {"sell"},
    "expense.create": {"sell"},
    "shift.manage": {"sell"},
    "shift.close": {"sell"},
    "shift.correct": {"approve"},
    "report.view": {"access_reports"},
    "audit.view": {"access_reports"},
    "backup.create": {"backup"},
    "backup.restore": {"restore"},
    "user.manage": {"manage_users"},
    "license.manage": {"manage_settings"},
    "settings.manage": {"manage_settings"},
    "terminal.manage": {"manage_settings"},
    "sync.manage": {"manage_settings"},
    "approve.action": {"approve"},
}


@dataclass
class Session:
    user_id: int
    username: str
    full_name: str
    role: str
    permissions: set[str]
    terminal_code: str = "POS-01"

    def can(self, code: str) -> bool:
        if "*" in self.permissions or code in self.permissions:
            return True
        return bool(PERMISSION_ALIASES.get(code, set()) & self.permissions)

    def require(self, code: str) -> None:
        if not self.can(code):
            raise PermissionError(f"Permission denied: {code}")


def create_user(conn: sqlite3.Connection, username: str, full_name: str, password: str,
                role_name: str, pin: str | None = None, created_by=None) -> int:
    """created_by (Session) is required at all app call sites; None is allowed only
    for tests and first-boot flows that already hold an equivalent privilege."""
    if created_by is not None:
        created_by.require("user.manage")
    role = conn.execute("SELECT id FROM roles WHERE name=?", (role_name,)).fetchone()
    if role is None:
        raise ValueError(f"Unknown role: {role_name}")
    ph, salt = hash_password(password)
    pin_hash = None
    if pin:
        pinh, _ = hash_password("pin:" + pin, salt)
        pin_hash = pinh
    cur = conn.execute(
        "INSERT INTO users(username, full_name, password_hash, password_salt, pin_hash, role_id)"
        " VALUES(?,?,?,?,?,?)", (username.strip(), full_name.strip(), ph, salt, pin_hash, role["id"]))
    conn.commit()
    return int(cur.lastrowid)


def _permissions(conn: sqlite3.Connection, role_id: int) -> set[str]:
    role = conn.execute("SELECT name FROM roles WHERE id=?", (role_id,)).fetchone()
    if role and role["name"] in ("Super Admin", "Owner"):
        return {"*"}
    rows = conn.execute(
        "SELECT p.code FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id"
        " WHERE rp.role_id=?", (role_id,)).fetchall()
    return {r["code"] for r in rows}


def login(conn: sqlite3.Connection, username: str, password: str,
          terminal_code: str = "") -> Session:
    from app.services.audit_service import record
    row = conn.execute(
        "SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id"
        " WHERE u.username=?", (username.strip(),)).fetchone()
    if row is None or not row["is_active"]:
        record(conn, user_id=None, action="login.failed", entity="user",
               entity_id=username.strip(), new_value="unknown-or-disabled",
               terminal_code=terminal_code)
        conn.commit()
        raise ValueError("Invalid username or password")
    if row["locked_until"]:
        try:
            locked = datetime.fromisoformat(row["locked_until"])
            if locked.tzinfo is None:
                locked = locked.replace(tzinfo=timezone.utc)
            if locked > datetime.now(timezone.utc):
                record(conn, user_id=int(row["id"]), action="login.failed", entity="user",
                       entity_id=row["username"], new_value="locked", terminal_code=terminal_code)
                conn.commit()
                raise ValueError("Account locked - try later")
        except ValueError as e:
            if "locked" in str(e):
                raise
    ok = False
    try:
        ok = verify_password(password, row["password_hash"], row["password_salt"])
    except Exception:
        ok = False
    if not ok and row["pin_hash"]:
        try:
            _, salt = hash_password("pin:" + password, row["password_salt"])
            import hmac as _hm
            ok = _hm.compare_digest(row["pin_hash"], _)
        except Exception:
            ok = False
    if not ok:
        attempts = int(row["failed_attempts"]) + 1
        lock = None
        if attempts >= MAX_ATTEMPTS:
            lock = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        conn.execute("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?",
                     (attempts, lock, row["id"]))
        record(conn, user_id=int(row["id"]), action="login.failed", entity="user",
               entity_id=row["username"], new_value=f"attempt {attempts}",
               terminal_code=terminal_code)
        conn.commit()
        raise ValueError("Invalid username or password")
    if row["must_change_password"]:
        record(conn, user_id=int(row["id"]), action="login.rotation_required", entity="user",
               entity_id=row["username"], terminal_code=terminal_code)
        conn.execute("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?", (row["id"],))
        conn.commit()
        raise PasswordChangeRequired(int(row["id"]))
    conn.execute("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?", (row["id"],))
    record(conn, user_id=int(row["id"]), action="login.success", entity="user",
           entity_id=row["username"], terminal_code=terminal_code)
    conn.commit()
    return Session(int(row["id"]), row["username"], row["full_name"], row["role"],
                   _permissions(conn, int(row["role_id"])), terminal_code=terminal_code)


def change_password(conn: sqlite3.Connection, user_id: int,
                    old_password: str, new_password: str) -> None:
    """Self-service rotation (proves knowledge of the current password/PIN)."""
    row = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if row is None:
        raise ValueError("User not found")
    ok = False
    try:
        ok = verify_password(old_password, row["password_hash"], row["password_salt"])
    except Exception:
        ok = False
    if not ok:
        raise ValueError("Current password incorrect")
    ph, salt = hash_password(new_password)
    with conn:
        conn.execute("UPDATE users SET password_hash=?, password_salt=?, must_change_password=0,"
                     " failed_attempts=0, locked_until=NULL WHERE id=?", (ph, salt, user_id))
        from app.services.audit_service import record
        record(conn, user_id=user_id, action="user.password_changed", entity="user",
               entity_id=str(user_id))


def set_password(conn: sqlite3.Connection, *, session, user_id: int, new_password: str,
                 must_change: bool = True) -> None:
    """Admin reset (requires user.manage); forces rotation by default."""
    session.require("user.manage")
    ph, salt = hash_password(new_password)
    with conn:
        conn.execute("UPDATE users SET password_hash=?, password_salt=?, must_change_password=?,"
                     " failed_attempts=0, locked_until=NULL WHERE id=?",
                     (ph, salt, int(must_change), user_id))
        from app.services.audit_service import record
        record(conn, user_id=session.user_id, action="user.password_reset", entity="user",
               entity_id=str(user_id))


def bootstrap_admin(conn: sqlite3.Connection, username: str = "admin",
                    password: str = "Admin@123") -> bool:
    """Create default owner on first run. Returns True if created. Caller must force change."""
    n = conn.execute("SELECT COUNT(*) c FROM users").fetchone()["c"]
    if n:
        return False
    rid = conn.execute("SELECT id FROM roles WHERE name='Owner'").fetchone()["id"]
    ph, salt = hash_password(password)
    conn.execute("INSERT INTO users(username, full_name, password_hash, password_salt, role_id,"
                 " must_change_password) VALUES(?,?,?,?,?,1)",
                 (username, "Store Owner", ph, salt, rid))
    conn.commit()
    return True
