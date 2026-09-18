"""LAN client: typed wrapper over the Store Server API with explicit offline policy.

Modes (settings lan.mode):
  standalone   — local services only (default; zero behavior change).
  lan-required — all transactions go to the server. Server unreachable or token
                 invalid → OfflineError. NEVER writes to a divergent local DB.

There is no silent fallback. If the server is down, the cashier gets one clear
message naming the policy instead of a second, conflicting database.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request


class OfflineError(RuntimeError):
    """Server unreachable while lan-required: operation refused, nothing written."""


class LanAuthError(RuntimeError):
    pass


class LanPermissionError(PermissionError):
    pass


class LanApprovalNeeded(Exception):
    def __init__(self, approval_id: int, message: str):
        super().__init__(message)
        self.approval_id = approval_id


class LanClient:
    def __init__(self, base_url: str, terminal_code: str = "POS-01", timeout: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.terminal_code = terminal_code
        self.timeout = timeout
        self.token: str | None = None
        self.username: str | None = None
        self.role: str | None = None

    # -- transport ------------------------------------------------------
    def _call(self, method: str, path: str, body: dict | None = None,
              query: dict | None = None) -> object:
        url = self.base_url + path
        if query:
            url += "?" + urllib.parse.urlencode(query)
        data = json.dumps(body or {}).encode() if method in ("POST", "PUT") else None
        req = urllib.request.Request(url, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
        if self.token:
            req.add_header("Authorization", f"Bearer {self.token}")
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                return json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as e:
            try:
                err = json.loads(e.read() or b"{}")
            except Exception:
                err = {"error": f"HTTP {e.code}"}
            msg = str(err.get("error", f"HTTP {e.code}"))
            if e.code == 401:
                raise LanAuthError(msg)
            if e.code == 403:
                raise LanPermissionError(msg)
            if e.code == 409:
                raise LanApprovalNeeded(int(err.get("approval_id", 0)), msg)
            raise RuntimeError(msg)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            raise OfflineError(
                f"Store server unreachable ({e}). LAN policy is lan-required: "
                f"the sale was NOT recorded anywhere. Check server/network and retry.") from e

    # -- auth ------------------------------------------------------------
    def login(self, username: str, password: str) -> dict:
        res = self._call("POST", "/auth/login",
                         {"username": username, "password": password,
                          "terminal_code": self.terminal_code})
        data = res["data"]
        self.token = data["token"]
        self.username, self.role = data["username"], data["role"]
        return data

    def ensure_login(self, username: str, password: str) -> None:
        if not self.token:
            self.login(username, password)

    # -- catalog ----------------------------------------------------------
    def search(self, q: str, limit: int = 20) -> list:
        return self._call("GET", "/catalog/search", query={"q": q, "limit": limit})

    def barcode(self, code: str):
        return self._call("GET", "/catalog/barcode", query={"code": code})

    def favorites(self) -> list:
        return self._call("GET", "/catalog/favorites")

    def sale_lookup(self, invoice_no: str) -> dict:
        return self._call("GET", "/sales/lookup", query={"invoice_no": invoice_no})

    def reprint_sale(self, sale_id: int) -> dict:
        return self._call("POST", f"/sales/{sale_id}/reprint", {})["data"]

    def sale_details(self, sale_id: int) -> dict:
        return self._call("GET", f"/sales/{sale_id}/details")

    def customer_lookup(self, query: str) -> dict:
        return self._call("GET", "/customers/lookup", query={"query": query})

    def active_promotions(self) -> list:
        return self._call("GET", "/promotions/active")

    # -- sales -------------------------------------------------------------
    def create_sale(self, **kw) -> dict:
        return self._call("POST", "/sales", kw)["data"]

    def return_sale(self, sale_id: int, **kw) -> dict:
        return self._call("POST", f"/sales/{sale_id}/return", kw)["data"]

    def cancel_sale(self, sale_id: int, **kw) -> dict:
        return self._call("POST", f"/sales/{sale_id}/cancel", kw)["data"]

    def held_list(self) -> list:
        return self._call("GET", "/held")

    def held_create(self, cart: dict, note: str = "") -> dict:
        return self._call("POST", "/held", {"cart": cart, "note": note})["data"]

    def held_resume(self, hold_id: int) -> dict:
        return self._call("POST", f"/held/{hold_id}/resume", {})["data"]

    # -- purchasing / ledger ------------------------------------------------
    def create_purchase(self, **kw) -> dict:
        return self._call("POST", "/purchases", kw)["data"]

    def return_purchase(self, purchase_id: int, **kw) -> dict:
        return self._call("POST", f"/purchases/{purchase_id}/return", kw)["data"]

    def supplier_pay(self, **kw) -> dict:
        return self._call("POST", "/supplier-pay", kw)["data"]

    def due_collect(self, **kw) -> dict:
        return self._call("POST", "/due-collect", kw)["data"]

    def shift_open(self, **kw) -> dict:
        return self._call("POST", "/shifts/open", kw)["data"]

    def shift_close(self, shift_id: int, **kw) -> dict:
        return self._call("POST", f"/shifts/{shift_id}/close", kw)["data"]

    def cash_io(self, **kw) -> dict:
        return self._call("POST", "/cash-io", kw)["data"]

    def add_expense(self, **kw) -> dict:
        return self._call("POST", "/expenses", kw)["data"]

    # -- reports / ops -------------------------------------------------------
    def report_sales(self, **kw) -> list:
        return self._call("GET", "/reports/sales", query=kw)

    def report_products(self, **kw) -> list:
        return self._call("GET", "/reports/products", query=kw)

    def report_stock(self) -> list:
        return self._call("GET", "/reports/stock")

    def report_profit(self, **kw) -> dict:
        return self._call("GET", "/reports/profit", query=kw)

    def register_terminal(self, code: str, name: str = "", register_no: str = "") -> dict:
        return self._call("POST", "/terminals/register",
                          {"code": code, "name": name, "register_no": register_no})["data"]

    def health(self) -> dict:
        return self._call("GET", "/health")
