"""Manager approval workflow for sensitive actions (§15).

Thresholds live in settings (editable by settings.manage holders, audited):
  approval.refund_above          default 1000  (BDT estimated refund total)
  approval.cancel_above          default 5000  (BDT sale total)
  approval.discount_pct_above    default 20    (% max item discount)
  approval.invoice_discount_above default 500  (BDT invoice-level discount)

Flow: authorize() records an approval row in all cases (audit trail).
- requester holds approve.action (or explicit approver session does) → approved.
- otherwise → pending row + ApprovalRequired raised (carries approval_id).
- a privileged user then calls decide() and the caller retries with approver=.
"""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.domain.money import to_money
from app.services import settings_service

DEFAULTS = {
    "approval.refund_above": "1000",
    "approval.cancel_above": "5000",
    "approval.discount_pct_above": "20",
    "approval.invoice_discount_above": "500",
    "approval.purchase_return_above": "2000",
}


class ApprovalRequired(Exception):
    def __init__(self, approval_id: int, action: str, amount=None):
        super().__init__(
            f"Manager approval required for {action}"
            + (f" (amount {amount})" if amount is not None else "")
            + f" [approval #{approval_id}]")
        self.approval_id = approval_id
        self.action = action
        self.amount = amount


def seed_defaults(conn: sqlite3.Connection) -> None:
    for k, v in DEFAULTS.items():
        if conn.execute("SELECT 1 FROM settings WHERE key=?", (k,)).fetchone() is None:
            conn.execute("INSERT INTO settings(key, value) VALUES(?,?)", (k, v))


def get_threshold(conn: sqlite3.Connection, key: str) -> Decimal:
    return to_money(settings_service.get(conn, key, DEFAULTS[key]))


def record_approval(conn: sqlite3.Connection, *, action: str, requester_id: int | None,
                    approver_id: int | None, status: str, entity: str = "",
                    entity_id: str = "", old_value: str = "", new_value: str = "",
                    reason: str = "", amount=None) -> int:
    cur = conn.execute(
        """INSERT INTO approvals(action, entity, entity_id, requester_id, approver_id,
               old_value, new_value, reason, amount, status)
           VALUES(?,?,?,?,?,?,?,?,?,?)""",
        (action, entity, str(entity_id), requester_id, approver_id,
         str(old_value)[:2000], str(new_value)[:2000], str(reason)[:1000],
         str(to_money(amount)) if amount is not None else None, status))
    return int(cur.lastrowid)


def authorize(conn: sqlite3.Connection, *, session, action: str, amount=None,
              entity: str = "", entity_id: str = "", old_value: str = "",
              new_value: str = "", reason: str = "", approver=None) -> int:
    """Returns approved approval id, or raises ApprovalRequired (pending row kept)."""
    approver_id = None
    if session.can("approve.action"):
        approver_id = session.user_id
    elif approver is not None and approver.can("approve.action"):
        approver_id = approver.user_id
    if approver_id is not None:
        return record_approval(conn, action=action, requester_id=session.user_id,
                               approver_id=approver_id, status="approved", entity=entity,
                               entity_id=entity_id, old_value=old_value, new_value=new_value,
                               reason=reason, amount=amount)
    aid = record_approval(conn, action=action, requester_id=session.user_id,
                          approver_id=None, status="pending", entity=entity,
                          entity_id=entity_id, old_value=old_value, new_value=new_value,
                          reason=reason, amount=amount)
    raise ApprovalRequired(aid, action, amount)


def decide(conn: sqlite3.Connection, *, session, approval_id: int,
           approve: bool, reason: str = "") -> None:
    session.require("approve.action")
    with conn:
        row = conn.execute("SELECT * FROM approvals WHERE id=?", (approval_id,)).fetchone()
        if row is None:
            raise ValueError("Approval not found")
        if row["status"] != "pending":
            raise ValueError(f"Approval already {row['status']}")
        conn.execute("UPDATE approvals SET status=?, approver_id=?, reason=?,"
                     " decided_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
                     ("approved" if approve else "rejected", session.user_id, reason, approval_id))
        from app.services.audit_service import record
        record(conn, user_id=session.user_id, action="approval.decided", entity="approval",
               entity_id=str(approval_id), new_value="approved" if approve else "rejected",
               reason=reason)
