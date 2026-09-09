"""POS widget: keyboard-first (F3 search, F9 charge, F7 hold), barcode-ready.

Business rules live in services; this widget only gathers validated input,
calls services, and renders results. Money enters via paisa-integer inputs.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from PySide6.QtCore import Qt
from PySide6.QtGui import QShortcut, QKeySequence
from PySide6.QtWidgets import (QWidget, QHBoxLayout, QVBoxLayout, QLineEdit, QListWidget,
                               QTableWidget, QTableWidgetItem, QLabel, QPushButton, QMessageBox,
                               QComboBox, QDialog, QFormLayout, QDialogButtonBox, QHeaderView,
                               QCheckBox)

from app.domain.money import to_money
from app.domain.pricing import CartLine, compute_totals
from app.hardware.devices import get_printer
from app.printing.receipt import build_receipt
from app.services import pos_service, product_service, settings_service
from app.ui.widgets import MoneySpin

PAY_METHODS = ["cash", "card", "bkash", "nagad", "rocket", "upay", "bank", "due", "other"]


class PaymentDialog(QDialog):
    """Split-payment dialog: add multiple tender lines, invoice discount, promotion."""

    def __init__(self, base_total: Decimal, promos: list[dict], parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Payment - Subtotal ৳{base_total}")
        self.base_total = to_money(base_total)
        self.tenders: list[dict] = []
        lay = QFormLayout(self)
        # Promotion selector.
        self.promo = QComboBox()
        self.promo.addItem("No promotion", None)
        for p in promos:
            self.promo.addItem(f"{p['name']} ({p['kind']})", int(p["id"]))
        self.promo_auto = QCheckBox("Auto: best eligible promotion")
        lay.addRow("Promotion:", self.promo)
        lay.addWidget(self.promo_auto)
        # Invoice discount.
        self.inv_disc = MoneySpin()
        lay.addRow("Invoice discount:", self.inv_disc)
        # Tender entry.
        row = QHBoxLayout()
        self.method = QComboBox()
        self.method.addItems(PAY_METHODS)
        self.amount = MoneySpin()
        self.amount.setAmount(self.base_total)
        self.ref = QLineEdit()
        self.ref.setPlaceholderText("Reference (optional)")
        add = QPushButton("Add tender")
        add.clicked.connect(self.add_tender)
        for w in (self.method, self.amount, self.ref, add):
            row.addWidget(w)
        lay.addRow("Tender:", row)
        self.tender_list = QListWidget()
        lay.addWidget(self.tender_list)
        self.remaining_lbl = QLabel("")
        lay.addWidget(self.remaining_lbl)
        self._refresh_remaining()
        box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        box.accepted.connect(self.accept)
        box.rejected.connect(self.reject)
        lay.addWidget(box)

    def _payable(self) -> Decimal:
        return to_money(self.base_total - self.inv_disc.amount())

    def _tendered(self) -> Decimal:
        return sum((to_money(t["amount"]) for t in self.tenders), Decimal("0.00"))

    def _refresh_remaining(self):
        self.remaining_lbl.setText(
            f"Payable: ৳{self._payable():.2f}   Tendered: ৳{self._tendered():.2f}")

    def add_tender(self):
        amt = self.amount.amount()
        if amt <= 0:
            QMessageBox.warning(self, "Tender", "Amount must be positive")
            return
        self.tenders.append({"method": self.method.currentText(), "amount": str(amt),
                             "reference": self.ref.text().strip()})
        self.tender_list.addItem(f"{self.method.currentText()}: ৳{amt:.2f}")
        self.ref.clear()
        self._refresh_remaining()

    def value(self):
        if not self.tenders:  # single-tender fast path (SCAN→PAY UX)
            self.tenders = [{"method": self.method.currentText(),
                             "amount": str(self.amount.amount()),
                             "reference": self.ref.text().strip()}]
        pid = self.promo.currentData()
        return {"payments": self.tenders, "invoice_discount": self.inv_disc.amount(),
                "promotion_id": pid, "auto_promotion": self.promo_auto.isChecked()}


class LineDialog(QDialog):
    """Edit one cart line with Decimal-validated inputs."""

    def __init__(self, line: dict, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Edit line - {line['name']}")
        lay = QFormLayout(self)
        self.qty = QLineEdit(str(line["qty"]))
        self.price = MoneySpin()
        self.price.setAmount(line["unit_price"])
        self.disc = QLineEdit(str(line.get("discount_pct", "0")))
        lay.addRow("Qty:", self.qty)
        lay.addRow("Unit price:", self.price)
        lay.addRow("Discount %:", self.disc)
        box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        box.accepted.connect(self.accept)
        box.rejected.connect(self.reject)
        lay.addWidget(box)

    def value(self):
        qty = Decimal(self.qty.text().strip())
        disc = Decimal(self.disc.text().strip())
        if qty <= 0:
            raise ValueError("Quantity must be positive")
        if disc < 0 or disc > 100:
            raise ValueError("Discount % must be 0..100")
        return {"qty": str(qty), "unit_price": str(self.price.amount()), "discount_pct": str(disc)}


class HeldDialog(QDialog):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.setWindowTitle("Held bills")
        lay = QVBoxLayout(self)
        self.list = QListWidget()
        lay.addWidget(self.list)
        for h in pos_service.list_held(self.ctx.conn):
            self.list.addItem(f"#{h['id']} - {h['created_at'][:16]} - {h['note']}")
        row = QHBoxLayout()
        ok = QPushButton("Resume selected")
        ok.clicked.connect(self.accept)
        lay.addLayout(row)
        row.addWidget(ok)

    def selected_id(self) -> int | None:
        item = self.list.currentItem()
        if item is None:
            return None
        return int(item.text().split()[0][1:])


class POSWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.cart: list[dict] = []  # {product_id, name, qty, unit_price, discount_pct, vat_pct}
        root = QHBoxLayout(self)
        left = QVBoxLayout()
        left.addWidget(QLabel("Favorites"))
        self.favs = QListWidget()
        self.favs.itemActivated.connect(self.add_favorite)
        left.addWidget(self.favs)
        self.search = QLineEdit()
        self.search.setPlaceholderText("Scan barcode / search name / SKU (F3)")
        self.search.returnPressed.connect(self.add_from_search)
        left.addWidget(self.search)
        self.results = QListWidget()
        self.results.itemActivated.connect(lambda *_: self.add_from_search())
        left.addWidget(self.results)
        self.search.textChanged.connect(self.live_search)
        root.addLayout(left, 2)

        right = QVBoxLayout()
        cust_row = QHBoxLayout()
        self.customer = QLineEdit()
        self.customer.setPlaceholderText("Customer phone/ID for due sale (optional)")
        cust_row.addWidget(self.customer)
        right.addLayout(cust_row)
        self.table = QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["Item", "Qty", "Price", "Disc%", "Total"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.doubleClicked.connect(self.edit_line)
        right.addWidget(self.table)
        self.detail_lbl = QLabel("")
        self.detail_lbl.setAlignment(Qt.AlignRight)
        right.addWidget(self.detail_lbl)
        self.total_lbl = QLabel("Total: ৳0.00")
        self.total_lbl.setStyleSheet("font-size: 28px; font-weight: bold;")
        self.total_lbl.setAlignment(Qt.AlignRight)
        right.addWidget(self.total_lbl)
        btns = QHBoxLayout()
        self.charge_btn = QPushButton("Charge (F9)")
        self.hold_btn = QPushButton("Hold (F7)")
        self.held_btn = QPushButton("Held bills")
        self.remove_btn = QPushButton("Remove line (Del)")
        self.clear_btn = QPushButton("Clear")
        self.charge_btn.clicked.connect(self.checkout)
        self.hold_btn.clicked.connect(self.hold)
        self.held_btn.clicked.connect(self.show_held)
        self.remove_btn.clicked.connect(self.remove_line)
        self.clear_btn.clicked.connect(self.clear_cart)
        for b in (self.charge_btn, self.hold_btn, self.held_btn, self.remove_btn, self.clear_btn):
            btns.addWidget(b)
        right.addLayout(btns)
        ops = QHBoxLayout()
        self.inv_input = QLineEdit()
        self.inv_input.setPlaceholderText("Invoice no for return / cancel / reprint")
        self.ret_btn = QPushButton("Return")
        self.cancel_btn = QPushButton("Cancel invoice")
        self.reprint_btn = QPushButton("Reprint")
        self.ret_btn.clicked.connect(self.do_return)
        self.cancel_btn.clicked.connect(self.do_cancel)
        self.reprint_btn.clicked.connect(self.do_reprint)
        ops.addWidget(self.inv_input)
        ops.addWidget(self.ret_btn)
        ops.addWidget(self.cancel_btn)
        ops.addWidget(self.reprint_btn)
        right.addLayout(ops)
        root.addLayout(right, 3)

        QShortcut(QKeySequence("F3"), self, activated=lambda: self.search.setFocus())
        QShortcut(QKeySequence("F9"), self, activated=self.checkout)
        QShortcut(QKeySequence("F7"), self, activated=self.hold)
        QShortcut(QKeySequence("Delete"), self, activated=self.remove_line)
        self.reload_favorites()

    # ---- catalog ----
    def reload_favorites(self):
        self.favs.clear()
        for p in product_service.list_favorites(self.ctx.conn):
            self.favs.addItem(f"{p['sku']} | {p['name']} | ৳{p['sell_price']}")

    def add_favorite(self, item):
        self.search.setText(item.text().split(" | ")[0])
        self.add_from_search()

    def live_search(self, text: str):
        self.results.clear()
        if len(text.strip()) < 2:
            return
        for p in product_service.search(self.ctx.conn, text.strip(), limit=20):
            self.results.addItem(f"{p['sku']} | {p['name']} | ৳{p['sell_price']} | stock {p['stock']}")

    def add_from_search(self):
        code = self.search.text().strip()
        if not code:
            return
        found = product_service.lookup_barcode(self.ctx.conn, code)
        if found is None:
            founds = product_service.search(self.ctx.conn, code, limit=1)
            found = founds[0] if founds else None
        if found is None:
            QMessageBox.warning(self, "Not found", f"No product for '{code}'")
            return
        for ln in self.cart:
            if ln["product_id"] == found["id"] and ln["unit_price"] == str(found["sell_price"]):
                ln["qty"] = str(Decimal(str(ln["qty"])) + 1)
                break
        else:
            self.cart.append({"product_id": found["id"], "name": found["name"], "qty": "1",
                              "unit_price": str(found["sell_price"]), "discount_pct": "0",
                              "vat_pct": str(found.get("vat_pct", 0))})
        self.search.clear()
        self.results.clear()
        self.refresh()

    # ---- cart (discount-aware via domain engine) ----
    def _cart_totals(self):
        lines = [CartLine(l["product_id"], l["name"], Decimal(str(l["qty"])),
                          to_money(l["unit_price"]), to_money(l.get("discount_pct", 0)),
                          to_money(l.get("vat_pct", 0))) for l in self.cart]
        return lines, compute_totals(lines)

    def refresh(self):
        lines, t = self._cart_totals()
        self.table.setRowCount(len(self.cart))
        for i, (ln, cl) in enumerate(zip(self.cart, lines)):
            for j, v in enumerate([ln["name"], str(ln["qty"]), str(ln["unit_price"]),
                                   str(ln["discount_pct"]), f"{cl.line_net() + cl.line_vat():.2f}"]):
                self.table.setItem(i, j, QTableWidgetItem(v))
        self.detail_lbl.setText(f"Subtotal ৳{t.subtotal:.2f}   Discount ৳{t.item_discount:.2f}   "
                                f"VAT ৳{t.vat_total:.2f}")
        self.total_lbl.setText(f"Total: ৳{t.grand_total:.2f}")

    def clear_cart(self):
        self.cart = []
        self.refresh()

    def remove_line(self):
        row = self.table.currentRow()
        if 0 <= row < len(self.cart):
            del self.cart[row]
            self.refresh()

    def edit_line(self):
        row = self.table.currentRow()
        if not (0 <= row < len(self.cart)):
            return
        dlg = LineDialog(self.cart[row], self)
        if dlg.exec() != QDialog.Accepted:
            return
        try:
            self.cart[row].update(dlg.value())
            self.refresh()
        except Exception as e:
            QMessageBox.warning(self, "Invalid line", str(e))

    # ---- held bills ----
    def hold(self):
        if not self.cart:
            return
        hid = pos_service.hold_sale(self.ctx.conn, session=self.ctx.session,
                                    cart={"items": self.cart}, note="held at POS")
        QMessageBox.information(self, "Held", f"Sale held as #{hid}.")
        self.clear_cart()

    def show_held(self):
        dlg = HeldDialog(self.ctx, self)
        if dlg.exec() != QDialog.Accepted:
            return
        hid = dlg.selected_id()
        if hid is None:
            return
        try:
            cart = pos_service.resume_held(self.ctx.conn, hid, session=self.ctx.session)
            self.cart = cart.get("items", [])
            self.refresh()
        except Exception as e:
            QMessageBox.warning(self, "Resume failed", str(e))

    # ---- invoice ops (reads via service helpers, writes via services) ----
    def _sale_id_from_input(self) -> int | None:
        inv = self.inv_input.text().strip()
        if not inv:
            QMessageBox.warning(self, "Invoice", "Enter an invoice number first")
            return None
        found = pos_service.find_sale(self.ctx.conn, inv)
        if found is None:
            QMessageBox.warning(self, "Invoice", f"Invoice '{inv}' not found")
            return None
        return int(found["id"])

    def do_return(self):
        sid = self._sale_id_from_input()
        if sid is None:
            return
        try:
            det = pos_service.sale_details(self.ctx.conn, sid)
        except Exception as e:
            QMessageBox.warning(self, "Invoice", str(e))
            return
        if not det["items"]:
            return
        from PySide6.QtWidgets import QInputDialog
        default = ", ".join(f"{r['product_id']}={r['qty']}" for r in det["items"])
        txt, ok = QInputDialog.getText(self, "Return quantities", "product_id=qty pairs:", text=default)
        if not ok:
            return
        try:
            pairs = []
            for part in txt.split(","):
                pid, qty = part.strip().split("=")
                pairs.append({"product_id": int(pid), "qty": qty.strip()})
            res = pos_service.process_return(self.ctx.conn, session=self.ctx.session,
                                             sale_id=sid, items=pairs, reason="counter return")
            QMessageBox.information(self, "Returned", f"Refund total ৳{res['total']}")
        except PermissionError as e:
            QMessageBox.warning(self, "Denied", str(e))
        except Exception as e:
            QMessageBox.critical(self, "Return failed", str(e))

    def do_cancel(self):
        sid = self._sale_id_from_input()
        if sid is None:
            return
        from PySide6.QtWidgets import QInputDialog
        reason, ok = QInputDialog.getText(self, "Cancel invoice", "Reason (required):")
        if not ok or not reason.strip():
            return
        try:
            pos_service.cancel_invoice(self.ctx.conn, session=self.ctx.session,
                                       sale_id=sid, reason=reason.strip())
            QMessageBox.information(self, "Cancelled", "Invoice cancelled (reversal recorded)")
        except PermissionError as e:
            QMessageBox.warning(self, "Denied", str(e))
        except Exception as e:
            QMessageBox.critical(self, "Cancel failed", str(e))

    def _print_details(self, det: dict) -> str:
        from app.services import settings_service as _ss
        biz = _ss.get_business(self.ctx.conn)
        width = 32 if str(_ss.get(self.ctx.conn, "receipt_size")) == "58mm" else 42
        item_rows = [{"name": r["name"], "qty": r["qty"], "unit_price": r["unit_price"],
                      "line_total": r["line_total"]} for r in det["items"]]
        text = build_receipt(business=biz, sale=det["sale"], items=item_rows,
                             payments=det["payments"], width=width,
                             cashier=self.ctx.session.username)
        printer = get_printer(_ss.get(self.ctx.conn, "printer_name"))
        pr = printer.print_receipt(text)
        if str(_ss.get(self.ctx.conn, "cash_drawer_enabled")) == "1":
            printer.open_drawer()
        return pr.message

    def do_reprint(self):
        sid = self._sale_id_from_input()
        if sid is None:
            return
        try:
            det = pos_service.sale_details(self.ctx.conn, sid)
            QMessageBox.information(self, "Reprint", self._print_details(det))
        except Exception as e:
            QMessageBox.critical(self, "Reprint failed", str(e))

    # ---- checkout ----
    def _receipt_width(self) -> int:
        return 32 if str(settings_service.get(self.ctx.conn, "receipt_size")) == "58mm" else 42

    def checkout(self):
        if not self.cart:
            return
        _, t = self._cart_totals()
        from app.domain import promotions as _promos
        dlg = PaymentDialog(t.grand_total, _promos.active_promotions(self.ctx.conn), self)
        if dlg.exec() != QDialog.Accepted:
            return
        pay = dlg.value()
        customer_id = None
        cust_txt = self.customer.text().strip()
        if cust_txt:
            from app.services import party_service as _ps
            found = _ps.find_customer(self.ctx.conn, cust_txt)
            if found is None:
                QMessageBox.warning(self, "Customer", f"No customer '{cust_txt}' - create it first")
                return
            customer_id = int(found["id"])
        self.charge_btn.setEnabled(False)  # double-click guard; key is per-attempt
        try:
            res = pos_service.complete_sale(
                self.ctx.conn, session=self.ctx.session,
                items=[{"product_id": l["product_id"], "qty": l["qty"],
                        "unit_price": l["unit_price"], "discount_pct": l["discount_pct"]}
                       for l in self.cart],
                payments=pay["payments"], customer_id=customer_id, shift_id=self.ctx.shift_id,
                allow_negative_stock=False, idempotency_key=uuid.uuid4().hex,
                invoice_discount=pay["invoice_discount"], promotion_id=pay["promotion_id"],
                auto_promotion=pay["auto_promotion"])
        except PermissionError as e:
            QMessageBox.warning(self, "Denied", str(e))
            return
        except Exception as e:
            QMessageBox.critical(self, "Sale failed", f"Transaction was NOT completed.\n{e}")
            return
        finally:
            self.charge_btn.setEnabled(True)
        # Printing must never roll back the completed sale.
        try:
            det = pos_service.sale_details(self.ctx.conn, res["sale_id"])
            msg = f"Sale {res['invoice_no']} completed.\n{self._print_details(det)}"
            QMessageBox.information(self, "Sale completed", msg)
        except Exception as e:
            QMessageBox.information(
                self, "Sale completed",
                f"Sale {res['invoice_no']} completed successfully.\nPrint note: {e}\nYou can reprint later.")
        self.clear_cart()
