"""Stock transfers between batches (paired ledger movements, §7)."""
from __future__ import annotations

import sqlite3
from decimal import Decimal

from app.services import approval_service
from app.services.audit_service import record


def transfer_stock(conn: sqlite3.Connection, *, session, lines: list[dict],
                   reason: str, to_batch_no: str = "") -> int:
    """Move qty from FEFO batches (or a given batch) into a target batch.

    Each line: {product_id, qty, from_batch_no (optional), to_batch_no (optional)}.
    Writes paired transfer_out / transfer_in movements so the ledger invariant holds.
    """
    session.require("inventory.transfer")
    if not reason.strip():
        raise ValueError("Transfer reason required")
    if not lines:
        raise ValueError("No transfer lines")
    with conn:
        cur = conn.execute("INSERT INTO stock_transfers(from_note, to_note, user_id) VALUES(?,?,?)",
                           (reason.strip(), to_batch_no.strip(), session.user_id))
        tid = int(cur.lastrowid)
        for ln in lines:
            pid = int(ln["product_id"])
            qty = Decimal(str(ln["qty"]))
            if qty <= 0:
                raise ValueError("Transfer quantity must be positive")
            src_no = (ln.get("from_batch_no") or "").strip()
            dst_no = (ln.get("to_batch_no") or to_batch_no or "").strip()
            if src_no == dst_no:
                # Same-batch transfer is a no-op; keep ledger clean by skipping.
                continue
            if src_no:
                src = conn.execute("SELECT id, qty FROM inventory_batches WHERE product_id=? AND batch_no=?",
                                   (pid, src_no)).fetchone()
                if src is None or Decimal(str(src["qty"])) < qty:
                    raise ValueError("Insufficient stock in source batch")
                src_bids = [(int(src["id"]), qty)]
            else:
                # FEFO draw-down across batches.
                src_bids: list[tuple[int, Decimal]] = []
                need = qty
                for b in conn.execute(
                        """SELECT id, qty FROM inventory_batches WHERE product_id=? AND qty > 0
                           ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date='' THEN 1 ELSE 0 END,
                                    expiry_date ASC, id ASC""", (pid,)):
                    if need <= 0:
                        break
                    take = min(Decimal(str(b["qty"])), need)
                    src_bids.append((int(b["id"]), take))
                    need -= take
                if need > 0:
                    raise ValueError("Insufficient stock for transfer")
            dst = conn.execute("SELECT id FROM inventory_batches WHERE product_id=? AND batch_no=?",
                               (pid, dst_no)).fetchone()
            if dst is None:
                dst_id = int(conn.execute(
                    "INSERT INTO inventory_batches(product_id, batch_no, qty, unit_cost)"
                    " VALUES(?,?,0,0)", (pid, dst_no)).lastrowid)
            else:
                dst_id = int(dst["id"])
            for bid, take in src_bids:
                conn.execute("UPDATE inventory_batches SET qty = qty - ? WHERE id=?",
                             (str(take), bid))
                after = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches"
                                     " WHERE product_id=?", (pid,)).fetchone()["s"]
                conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change,"
                             " qty_after, source_type, source_id, reason, user_id)"
                             " VALUES(?,?,?,?,?,?,?,?)",
                             (pid, bid, str(-take), str(after), "transfer_out", tid, reason,
                              session.user_id))
                conn.execute("UPDATE inventory_batches SET qty = qty + ? WHERE id=?",
                             (str(take), dst_id))
                after2 = conn.execute("SELECT IFNULL(SUM(qty),0) s FROM inventory_batches"
                                      " WHERE product_id=?", (pid,)).fetchone()["s"]
                conn.execute("INSERT INTO inventory_movements(product_id, batch_id, qty_change,"
                             " qty_after, source_type, source_id, reason, user_id)"
                             " VALUES(?,?,?,?,?,?,?,?)",
                             (pid, dst_id, str(take), str(after2), "transfer_in", tid, reason,
                              session.user_id))
            conn.execute("INSERT INTO stock_transfer_items(transfer_id, product_id, from_batch_id,"
                         " to_batch_no, qty) VALUES(?,?,?,?,?)",
                         (tid, pid, src_bids[0][0] if len(src_bids) == 1 else None, dst_no, str(qty)))
        record(conn, user_id=session.user_id, action="stock.transferred", entity="transfer",
               entity_id=str(tid), new_value=reason)
        approval_service.record_approval(conn, action="inventory.transfer",
                                         requester_id=session.user_id,
                                         approver_id=session.user_id, status="approved",
                                         entity="transfer", entity_id=str(tid), new_value=reason)
    return tid
