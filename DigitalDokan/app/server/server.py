"""DigitalDokan LAN Store Server (§26): stdlib HTTP, single-writer SQLite.

One process per store owns the central database file; counters talk to it over
the LAN. The SAME service functions as single-PC mode execute inside request
transactions, so all invariants (atomicity, RBAC, approvals, idempotency) hold.

Offline policy (explicit, never silent):
  - server unreachable / token invalid → client raises OfflineError;
  - NO local divergent writes are ever made. Fail closed, say why.

Run: python -m app.server.server --db <path> --host 0.0.0.0 --port 8765
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
import threading
import time
import traceback
import urllib.parse
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SERVER_VERSION = "2.0.0"

# ---------------------------------------------------------------- tokens

def _b64e(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _b64d(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def issue_token(secret: str, user_id: int, terminal: str, ttl_h: int = 12) -> str:
    payload = {"uid": user_id, "terminal": terminal,
               "exp": int(time.time()) + ttl_h * 3600, "nonce": secrets.token_hex(4)}
    body = _b64e(json.dumps(payload).encode())
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{sig}"


def verify_token(secret: str, token: str) -> dict | None:
    try:
        body, sig = token.split(".")
        expect = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expect, sig):
            return None
        payload = json.loads(_b64d(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


# ---------------------------------------------------------------- server

class OfflinePolicy(Exception):
    pass


class StoreServer:
    """Owns db_path. Start with .start() (background) or .serve_forever()."""

    def __init__(self, db_path: str, host: str = "127.0.0.1", port: int = 0,
                 secret: str | None = None):
        from app.infra import db as dbmod
        from app.infra.migrations import initialize
        self.db_path = db_path
        self.host = host
        self.secret = secret or secrets.token_hex(32)
        initialize(db_path)  # ensure current schema
        self._dbmod = dbmod
        handler = self._make_handler()
        self.httpd = ThreadingHTTPServer((host, port), handler)
        self.httpd.daemon_threads = True
        self.port = self.httpd.server_address[1]

    # -- plumbing -------------------------------------------------------
    def _conn(self) -> sqlite3.Connection:
        return self._dbmod.connect(self.db_path)

    def _make_handler(self):
        server = self

        class Handler(BaseHTTPRequestHandler):
            server_version = "DigitalDokanLAN/" + SERVER_VERSION

            def log_message(self, *a):  # keep test output clean; server logs to system_logs
                pass

            def _body(self) -> dict:
                try:
                    n = int(self.headers.get("Content-Length", 0))
                except ValueError:
                    n = 0
                if not n:
                    return {}
                try:
                    return json.loads(self.rfile.read(n) or b"{}")
                except Exception:
                    return {"_parse_error": True}

            def _send(self, code: int, obj: dict) -> None:
                data = json.dumps(obj, default=str).encode()
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def _session(self):
                from app.services import auth_service
                auth = self.headers.get("Authorization", "")
                if not auth.startswith("Bearer "):
                    return None, None
                payload = verify_token(server.secret, auth[7:].strip())
                if payload is None:
                    return None, None
                conn = server._conn()
                try:
                    row = conn.execute(
                        "SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id"
                        " WHERE u.id=? AND u.is_active=1", (payload["uid"],)).fetchone()
                    if row is None:
                        return None, None
                    sess = auth_service.Session(
                        int(row["id"]), row["username"], row["full_name"], row["role"],
                        auth_service._permissions(conn, int(row["role_id"])),
                        terminal_code=payload.get("terminal", "POS-01"))
                    return sess, payload
                finally:
                    conn.close()

            def _require(self):
                sess, payload = self._session()
                return sess

            # -- routing ------------------------------------------------
            def do_GET(self):
                parsed = urllib.parse.urlparse(self.path)
                path, qs = parsed.path, urllib.parse.parse_qs(parsed.query)
                try:
                    if path == "/health":
                        return self._route_health()
                    sess = self._require()
                    if sess is None:
                        return self._send(401, {"error": "login required"})
                    if path == "/catalog/search":
                        return self._route(lambda c: _catalog_search(c, qs))
                    if path == "/catalog/barcode":
                        return self._route(lambda c: _catalog_barcode(c, qs))
                    if path == "/catalog/favorites":
                        return self._route(lambda c: _catalog_favorites(c))
                    if path == "/sales/lookup":
                        return self._route(lambda c: _sale_lookup(c, qs))
                    if path == "/customers/lookup":
                        return self._route(lambda c: _customer_lookup(c, qs))
                    if path == "/promotions/active":
                        return self._route(lambda c: _promotions_active(c))
                    if path == "/held":
                        return self._route(lambda c: _held_list(c, sess))
                    if path.startswith("/sales/") and path.endswith("/details"):
                        sid = path.split("/")[2]
                        return self._route(lambda c: _sale_details_for_ops(c, sess, sid))
                    if path == "/reports/sales":
                        return self._route(lambda c: _rep_sales(c, sess, qs))
                    if path == "/reports/products":
                        return self._route(lambda c: _rep_products(c, sess, qs))
                    if path == "/reports/stock":
                        return self._route(lambda c: _rep_stock(c, sess, qs))
                    if path == "/reports/profit":
                        return self._route(lambda c: _rep_profit(c, sess, qs))
                    if path == "/outbox":
                        return self._route(lambda c: _outbox_list(c, sess, qs))
                    return self._send(404, {"error": "unknown endpoint"})
                except Exception as e:  # noqa: BLE001 - mapped below
                    return self._send(500, {"error": f"ERR-SRV-{traceback.format_exc()[-200:]}",
                                            "detail": str(e)[:300]})

            def do_POST(self):
                parsed = urllib.parse.urlparse(self.path)
                path = parsed.path
                body = self._body()
                if body.get("_parse_error"):
                    return self._send(400, {"error": "invalid JSON"})
                try:
                    if path == "/auth/login":
                        return self._route_login(body)
                    if path == "/terminals/register":
                        return self._route_authed(lambda c, s: _terminal_register(c, s, body))
                    if path == "/sales":
                        return self._route_authed(
                            lambda c, s: _sale_create(c, s, body, server.secret))
                    if path.startswith("/sales/") and path.endswith("/return"):
                        sid = path.split("/")[2]
                        return self._route_authed(
                            lambda c, s: _sale_return(c, s, sid, body, server.secret))
                    if path.startswith("/sales/") and path.endswith("/cancel"):
                        sid = path.split("/")[2]
                        return self._route_authed(
                            lambda c, s: _sale_cancel(c, s, sid, body, server.secret))
                    if path.startswith("/sales/") and path.endswith("/reprint"):
                        sid = path.split("/")[2]
                        return self._route_authed(lambda c, s: _sale_reprint(c, s, sid))
                    if path == "/held":
                        return self._route_authed(lambda c, s: _held_create(c, s, body))
                    if path.startswith("/held/") and path.endswith("/resume"):
                        hid = path.split("/")[2]
                        return self._route_authed(lambda c, s: _held_resume(c, s, hid))
                    if path == "/purchases":
                        return self._route_authed(lambda c, s: _purchase_create(c, s, body))
                    if path.startswith("/purchases/") and path.endswith("/return"):
                        pid = path.split("/")[2]
                        return self._route_authed(
                            lambda c, s: _purchase_return(c, s, pid, body, server.secret))
                    if path == "/supplier-pay":
                        return self._route_authed(lambda c, s: _supplier_pay(c, s, body))
                    if path == "/due-collect":
                        return self._route_authed(lambda c, s: _due_collect(c, s, body))
                    if path == "/shifts/open":
                        return self._route_authed(lambda c, s: _shift_open(c, s, body))
                    if path.startswith("/shifts/") and path.endswith("/close"):
                        sid = path.split("/")[2]
                        return self._route_authed(lambda c, s: _shift_close(c, s, sid, body))
                    if path == "/cash-io":
                        return self._route_authed(lambda c, s: _cash_io(c, s, body))
                    if path == "/expenses":
                        return self._route_authed(lambda c, s: _expense(c, s, body))
                    return self._send(404, {"error": "unknown endpoint"})
                except Exception as e:  # noqa: BLE001
                    return self._send(500, {"error": f"ERR-SRV-{traceback.format_exc()[-200:]}",
                                            "detail": str(e)[:300]})

            # -- route helpers ------------------------------------------
            def _route(self, fn):
                conn = server._conn()
                try:
                    return self._send(200, fn(conn))
                except PermissionError as e:
                    return self._send(403, {"error": str(e)})
                except ValueError as e:
                    return self._send(422, {"error": str(e)})
                finally:
                    conn.close()

            def _route_authed(self, fn):
                sess = self._require()
                if sess is None:
                    return self._send(401, {"error": "login required"})
                conn = server._conn()
                try:
                    return self._send(200, {"ok": True, "data": fn(conn, sess)})
                except PermissionError as e:
                    return self._send(403, {"error": str(e)})
                except _Approval as e:
                    return self._send(409, {"error": str(e), "approval_id": e.approval_id})
                except ValueError as e:
                    return self._send(422, {"error": str(e)})
                finally:
                    conn.close()

            def _route_health(self):
                conn = server._conn()
                try:
                    from app.infra import license_manager
                    st = license_manager.status(conn)
                    pend = conn.execute("SELECT COUNT(*) c FROM outbox WHERE status='pending'").fetchone()["c"]
                    return self._send(200, {"app": SERVER_VERSION,
                                            "integrity": server._dbmod.integrity_check(conn),
                                            "license": {"plan": st.plan, "valid": st.valid},
                                            "outbox_pending": pend,
                                            "now": datetime.now(timezone.utc).isoformat()})
                finally:
                    conn.close()

            def _route_login(self, body):
                from app.services import auth_service
                conn = server._conn()
                try:
                    sess = auth_service.login(conn, body.get("username", ""),
                                              body.get("password", ""))
                    term = str(body.get("terminal_code", "POS-01"))
                    conn.execute("UPDATE terminals SET last_seen="
                                 "strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code=?", (term,))
                    conn.commit()
                    token = issue_token(server.secret, sess.user_id, term)
                    return self._send(200, {"ok": True, "data": {"token": token,
                                                                 "username": sess.username,
                                                                 "role": sess.role,
                                                                 "terminal": term}})
                except ValueError as e:
                    return self._send(401, {"error": str(e)})
                finally:
                    conn.close()

        return Handler

    # -- lifecycle ------------------------------------------------------
    def start(self) -> "StoreServer":
        t = threading.Thread(target=self.httpd.serve_forever, kwargs={"poll_interval": 0.05},
                             daemon=True)
        t.start()
        self._thread = t
        return self

    def stop(self) -> None:
        self.httpd.shutdown()
        self.httpd.server_close()
        self._thread.join(timeout=5)

    @property
    def url(self) -> str:
        return f"http://{self.host}:{self.port}"


# ---------------------------------------------------------------- handlers
# Each runs inside one request connection; services own their transactions.

class _Approval(Exception):
    def __init__(self, approval_id: int, message: str):
        super().__init__(message)
        self.approval_id = approval_id


def _approver(conn, body, secret: str) -> object | None:
    tok = body.get("approver_token")
    if not tok:
        return None
    payload = verify_token(secret, tok)
    if payload is None:
        raise ValueError("Invalid approver token")
    from app.services import auth_service
    row = conn.execute("SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id=u.role_id"
                       " WHERE u.id=?", (payload["uid"],)).fetchone()
    if row is None:
        raise ValueError("Approver not found")
    return auth_service.Session(int(row["id"]), row["username"], row["full_name"], row["role"],
                                auth_service._permissions(conn, int(row["role_id"])),
                                terminal_code=payload.get("terminal", "POS-01"))


def _wrap_approval(fn, *a, **k):
    from app.services.approval_service import ApprovalRequired
    try:
        return fn(*a, **k)
    except ApprovalRequired as e:
        raise _Approval(e.approval_id, str(e))


def _catalog_favorites(conn):
    from app.services import product_service
    return product_service.list_favorites(conn)


def _sale_lookup(conn, qs):
    from app.services import pos_service
    found = pos_service.find_sale(conn, qs.get("invoice_no", [""])[0])
    if found is None:
        raise ValueError("Sale not found")
    return {"id": found["id"], "invoice_no": found["invoice_no"],
            "status": found["status"], "total": str(found["total"])}


def _sale_details_for_ops(conn, sess, sid):
    """Read-only line details for return/cancel flows (no audit side effects)."""
    if not (sess.can("sale.refund") or sess.can("sale.reprint") or sess.can("sale.cancel")):
        raise PermissionError("Permission denied: sale details")
    from app.services import pos_service
    return pos_service.sale_details(conn, int(sid))


def _sale_reprint(conn, sess, sid):
    from app.services import pos_service
    from app.services.audit_service import record
    det = pos_service.sale_details(conn, int(sid))
    record(conn, user_id=sess.user_id, action="sale.reprint", entity="sale",
           entity_id=det["sale"]["invoice_no"], new_value="lan reprint",
           terminal_code=sess.terminal_code)
    conn.commit()
    return det


def _promotions_active(conn):
    from app.domain import promotions as _promos
    return [{"id": p["id"], "name": p["name"], "kind": p["kind"]} for p in _promos.active_promotions(conn)]


def _customer_lookup(conn, qs):
    from app.services import party_service
    found = party_service.find_customer(conn, qs.get("query", [""])[0])
    if found is None:
        raise ValueError("Customer not found")
    return {"id": found["id"], "name": found["name"], "phone": found["phone"],
            "balance": str(found["balance"])}


def _catalog_search(conn, qs):
    from app.services import product_service
    return product_service.search(conn, qs.get("q", [""])[0], int(qs.get("limit", ["20"])[0]))


def _catalog_barcode(conn, qs):
    from app.services import product_service
    return product_service.lookup_barcode(conn, qs.get("code", [""])[0])


def _sale_create(conn, sess, body, secret):
    from decimal import Decimal
    from app.services import pos_service
    res = _wrap_approval(
        pos_service.complete_sale, conn, session=sess,
        items=body.get("items", []), payments=body.get("payments", []),
        customer_id=body.get("customer_id"), invoice_discount=Decimal(str(body.get("invoice_discount", 0))),
        terminal_code=sess.terminal_code, shift_id=body.get("shift_id"),
        idempotency_key=body.get("idempotency_key"), approver=_approver(conn, body, secret),
        promotion_id=body.get("promotion_id"), auto_promotion=bool(body.get("auto_promotion", False)))
    res["totals"] = {k: str(v) for k, v in res["totals"].__dict__.items()}
    return res


def _sale_return(conn, sess, sid, body, secret):
    from app.services import pos_service
    return _wrap_approval(pos_service.process_return, conn, session=sess, sale_id=int(sid),
                          items=body.get("items", []), reason=body.get("reason", ""),
                          approver=_approver(conn, body, secret))


def _sale_cancel(conn, sess, sid, body, secret):
    from app.services import pos_service
    _wrap_approval(pos_service.cancel_invoice, conn, session=sess, sale_id=int(sid),
                   reason=body.get("reason", ""), approver=_approver(conn, body, secret))
    return {"cancelled": int(sid)}


def _held_list(conn, sess):
    from app.services import pos_service
    return pos_service.list_held(conn)


def _held_create(conn, sess, body):
    from app.services import pos_service
    return {"hold_id": pos_service.hold_sale(conn, session=sess, cart=body.get("cart", {}),
                                             note=body.get("note", ""))}


def _held_resume(conn, sess, hid):
    from app.services import pos_service
    return pos_service.resume_held(conn, int(hid), session=sess)


def _purchase_create(conn, sess, body):
    from decimal import Decimal
    from app.services import purchase_service
    return {k: (str(v) if isinstance(v, Decimal) else v)
            for k, v in purchase_service.receive_purchase(
                conn, session=sess, supplier_id=body.get("supplier_id"),
                items=body.get("items", []), discount=Decimal(str(body.get("discount", 0))),
                paid=Decimal(str(body.get("paid", 0))), note=body.get("note", ""),
                idempotency_key=body.get("idempotency_key")).items()}


def _purchase_return(conn, sess, pid, body, secret):
    from app.services import purchase_service
    res = _wrap_approval(purchase_service.process_purchase_return, conn, session=sess,
                         purchase_id=int(pid), items=body.get("items", []),
                         reason=body.get("reason", ""), approver=_approver(conn, body, secret))
    return {k: str(v) for k, v in res.items()}


def _supplier_pay(conn, sess, body):
    from decimal import Decimal
    from app.services import purchase_service
    purchase_service.pay_supplier(conn, session=sess, supplier_id=int(body["supplier_id"]),
                                  amount=Decimal(str(body["amount"])),
                                  method=body.get("method", "cash"), note=body.get("note", ""))
    return {"paid": True}


def _due_collect(conn, sess, body):
    from decimal import Decimal
    from app.services import party_service
    party_service.collect_due(conn, session=sess, customer_id=int(body["customer_id"]),
                              amount=Decimal(str(body["amount"])),
                              method=body.get("method", "cash"), note=body.get("note", ""))
    return {"collected": True}


def _shift_open(conn, sess, body):
    from decimal import Decimal
    from app.services import shift_service
    return {"shift_id": shift_service.open_shift(conn, session=sess,
                                                 terminal_code=sess.terminal_code,
                                                 opening_cash=Decimal(str(body.get("opening_cash", 0))))}


def _shift_close(conn, sess, sid, body):
    from decimal import Decimal
    from app.services import shift_service
    return {k: (str(v) if isinstance(v, Decimal) else v)
            for k, v in shift_service.close_shift(
                conn, session=sess, shift_id=int(sid),
                actual_cash=Decimal(str(body.get("actual_cash", 0)))).items()}


def _cash_io(conn, sess, body):
    from decimal import Decimal
    from app.services import shift_service
    shift_service.cash_io(conn, session=sess, shift_id=int(body["shift_id"]),
                          direction=body["direction"], amount=Decimal(str(body["amount"])),
                          reason=body.get("reason", ""))
    return {"recorded": True}


def _expense(conn, sess, body):
    from decimal import Decimal
    from app.services import shift_service
    return {"expense_id": shift_service.add_expense(
        conn, session=sess, category_id=int(body["category_id"]),
        amount=Decimal(str(body["amount"])), method=body.get("method", "cash"),
        note=body.get("note", ""), shift_id=body.get("shift_id"))}


def _rep_sales(conn, sess, qs):
    from app.services import report_service
    return report_service.sales_summary(conn, qs.get("start", [None])[0], qs.get("end", [None])[0],
                                        qs.get("group", ["day"])[0], session=sess)


def _rep_products(conn, sess, qs):
    from app.services import report_service
    return report_service.product_sales(conn, qs.get("start", [None])[0], qs.get("end", [None])[0],
                                        int(qs.get("limit", ["50"])[0]), session=sess)


def _rep_stock(conn, sess, qs):
    from app.services import report_service
    return report_service.stock_report(conn, session=sess)


def _rep_profit(conn, sess, qs):
    from app.services import report_service
    return report_service.profit_summary(conn, qs.get("start", [None])[0],
                                         qs.get("end", [None])[0], session=sess)


def _outbox_list(conn, sess, qs):
    sess.require("sync.manage")
    rows = conn.execute("SELECT id, topic, status, attempts, next_retry_at, created_at FROM outbox"
                        " WHERE status=? ORDER BY id LIMIT ?",
                        (qs.get("status", ["pending"])[0], int(qs.get("limit", ["100"])[0]))).fetchall()
    return [dict(r) for r in rows]


def _terminal_register(conn, sess, body):
    sess.require("terminal.manage")
    code = str(body.get("code", "")).strip().upper()
    if not code:
        raise ValueError("Terminal code required")
    conn.execute("INSERT INTO terminals(code, name, register_no) VALUES(?,?,?)"
                 " ON CONFLICT(code) DO UPDATE SET name=excluded.name, register_no=excluded.register_no",
                 (code, body.get("name", code), body.get("register_no", "")))
    conn.commit()
    return {"registered": code}


def create_server(db_path: str, host: str = "127.0.0.1", port: int = 0,
                  secret: str | None = None) -> StoreServer:
    return StoreServer(db_path, host, port, secret)


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="DigitalDokan LAN Store Server")
    ap.add_argument("--db", required=True)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--secret", default=None,
                    help="Server token secret (env DIGITALDOKAN_SERVER_SECRET or random per boot)")
    args = ap.parse_args()
    import os as _os
    secret = args.secret or _os.environ.get("DIGITALDOKAN_SERVER_SECRET")
    srv = create_server(args.db, args.host, args.port, secret)
    print(f"DigitalDokan Store Server on {srv.url} (db: {args.db})", flush=True)
    try:
        srv.httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
