"""Central printing service (§18): thermal receipt, A4 invoice model, reprint.

All POS/UI printing flows through here. Print status is recorded in print_jobs
(queued→ok/failed) separately from financial records, and print failure NEVER
propagates into transaction handling — callers treat PrintResult.message as UX.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass

from app.hardware.devices import PrintResult, get_printer
from app.i18n.manager import t
from app.printing.receipt import build_a4_html, build_receipt
from app.services import pos_service, settings_service


@dataclass
class PrinterConfig:
    name: str = ""
    width: int = 42
    drawer_enabled: bool = False
    fallback_dir: str | None = None
    language: str = "en"


def config_from_db(conn: sqlite3.Connection, fallback_dir: str | None = None) -> PrinterConfig:
    size = str(settings_service.get(conn, "receipt_size", "80mm"))
    return PrinterConfig(
        name=settings_service.get(conn, "printer_name", ""),
        width=32 if size == "58mm" else 42,
        drawer_enabled=str(settings_service.get(conn, "cash_drawer_enabled", "0")) == "1",
        fallback_dir=fallback_dir,
        language=settings_service.get(conn, "language", "en"))


def _job(conn: sqlite3.Connection, kind: str, reference: str, payload: str,
         ok: bool, message: str, user_id: int | None) -> None:
    try:
        conn.execute("INSERT INTO print_jobs(kind, reference, payload, status, message, user_id)"
                     " VALUES(?,?,?,?,?,?)",
                     (kind, reference, payload[:8000], "ok" if ok else "failed",
                      message[:500], user_id))
        conn.commit()
    except Exception:
        pass  # job logging must never break the sale flow


def deliver_text(conn: sqlite3.Connection, *, kind: str, reference: str, text: str,
                 session=None, fallback_dir: str | None = None) -> PrintResult:
    """Deliver already-built receipt text to the configured printer and log the job.

    Used by the LAN path (text built from server data, delivered client-locally).
    """
    cfg = config_from_db(conn, fallback_dir)
    printer = get_printer(cfg.name, cfg.fallback_dir)
    result = printer.print_receipt(text)
    if result.ok and cfg.drawer_enabled:
        printer.open_drawer()
    uid = session.user_id if session is not None else None
    _job(conn, kind, reference, text, result.ok, result.message, uid)
    return result


def print_receipt(conn: sqlite3.Connection, *, sale_id: int, session=None,
                  kind: str = "receipt", fallback_dir: str | None = None) -> PrintResult:
    """Print (or reprint) a sale receipt. Returns status; records print_jobs row."""
    cfg = config_from_db(conn, fallback_dir)
    try:
        det = pos_service.sale_details(conn, sale_id)
    except Exception as e:
        return PrintResult(False, f"Print failed: {e}")
    biz = settings_service.get_business(conn)
    item_rows = [{"name": r["name"], "qty": r["qty"], "unit_price": r["unit_price"],
                  "line_total": r["line_total"], "discount_pct": r.get("discount_pct", 0)}
                 for r in det["items"]]
    cashier = ""
    if det["sale"].get("user_id"):
        u = conn.execute("SELECT username FROM users WHERE id=?",
                         (det["sale"]["user_id"],)).fetchone()
        cashier = u["username"] if u else ""
    text = build_receipt(business=biz, sale=det["sale"], items=item_rows,
                         payments=det["payments"], width=cfg.width, cashier=cashier,
                         footer=t(cfg.language, "receipt_thanks"))
    result = deliver_text(conn, kind=kind, reference=det["sale"]["invoice_no"], text=text,
                          session=session, fallback_dir=fallback_dir)
    if session is not None and kind == "reprint":
        from app.services.audit_service import record
        try:
            record(conn, user_id=session.user_id, action="sale.reprint", entity="sale",
                   entity_id=det["sale"]["invoice_no"], new_value=result.message)
            conn.commit()
        except Exception:
            pass
    return result


def build_text_for_details(conn: sqlite3.Connection, det: dict,
                             fallback_dir: str | None = None) -> tuple[str, str]:
    """Build receipt text from a details dict (local or LAN-fetched). Returns (text, invoice_no)."""
    cfg = config_from_db(conn, fallback_dir)
    biz = settings_service.get_business(conn)
    item_rows = [{"name": r.get("name", "?"), "qty": r["qty"], "unit_price": r["unit_price"],
                  "line_total": r["line_total"], "discount_pct": r.get("discount_pct", 0)}
                 for r in det["items"]]
    cashier = det.get("cashier", "")
    if not cashier and det["sale"].get("user_id"):
        u = conn.execute("SELECT username FROM users WHERE id=?",
                         (det["sale"]["user_id"],)).fetchone()
        cashier = u["username"] if u else ""
    text = build_receipt(business=biz, sale=det["sale"], items=item_rows,
                         payments=det["payments"], width=cfg.width, cashier=cashier,
                         footer=t(cfg.language, "receipt_thanks"))
    return text, det["sale"]["invoice_no"]


def build_invoice_a4(conn: sqlite3.Connection, sale_id: int, cashier: str = "") -> str:
    det = pos_service.sale_details(conn, sale_id)
    biz = settings_service.get_business(conn)
    item_rows = [{"name": r["name"], "qty": r["qty"], "unit_price": r["unit_price"],
                  "line_total": r["line_total"]} for r in det["items"]]
    return build_a4_html(business=biz, sale=det["sale"], items=item_rows,
                         payments=det["payments"], cashier=cashier)


def hardware_self_test(kind: str, **kwargs) -> dict:
    """Admin toolkit checks (Help→Diagnostics): simulators prove the code path;
    real devices report available/unavailable without raising. (§37)"""
    try:
        if kind == "scanner":
            from app.hardware.scanner import SimulatorScanner
            s = SimulatorScanner(kwargs.get("codes", ["8901234567890"]))
            code = s.last_scan()
            return {"ok": True, "message": f"Scanner path OK, read: {code}"}
        if kind == "scale":
            from app.hardware.scale import SimulatorScale
            s = SimulatorScale(kwargs.get("weights", [1.25]))
            s.open()
            r = s.read_kg()
            s.close()
            return {"ok": r.ok, "message": f"Scale path OK: {r.kg} kg ({r.message})"}
        if kind == "display":
            from app.hardware.peripherals import SimulatorDisplay
            d = SimulatorDisplay()
            d.show_total("৳1,250.00")
            return {"ok": True, "message": f"Display path OK: {d.last}"}
        if kind == "label":
            from app.hardware.peripherals import SimulatorLabelPrinter
            lb = SimulatorLabelPrinter()
            lb.print_label(sku="T", name="T", price="1", barcode="1")
            return {"ok": True, "message": "Label path OK"}
        if kind == "printer":
            from app.hardware.devices import NullPrinter
            r = NullPrinter().print_receipt("test")
            return {"ok": True, "message": f"Printer path OK (null backend): {r.message}"}
        if kind == "scale_line":
            from app.hardware.scale import parse_weight
            r = parse_weight(kwargs.get("raw", "  2.500 kg"), kwargs.get("pattern",
                             r"([-+]?\d+(?:\.\d+)?)\s*kg"))
            return {"ok": r.ok, "message": f"{r.kg} kg ({r.message})"}
        return {"ok": False, "message": f"Unknown hardware kind: {kind}"}
    except Exception as e:
        return {"ok": False, "message": f"{kind} test failed: {e}"}
