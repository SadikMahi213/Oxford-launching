"""POS widget: keyboard-first (F3 search, F9 charge, F7 hold), barcode-ready."""
from __future__ import annotations

from decimal import Decimal

from PySide6.QtCore import Qt
from PySide6.QtGui import QShortcut, QKeySequence
from PySide6.QtWidgets import (QWidget, QHBoxLayout, QVBoxLayout, QLineEdit, QListWidget,
                               QTableWidget, QTableWidgetItem, QLabel, QPushButton, QMessageBox,
                               QComboBox, QSpinBox, QDoubleSpinBox, QDialog, QFormLayout,
                               QDialogButtonBox, QHeaderView)

from app.domain.money import to_money
from app.hardware.devices import get_printer
from app.printing.receipt import build_receipt
from app.services import pos_service, product_service, settings_service, shift_service


class PaymentDialog(QDialog):
    def __init__(self, total: Decimal, parent=None):
        super().__init__(parent)
        self.setWindowTitle(f"Payment - Total ৳{total}")
        self.total = total
        lay = QFormLayout(self)
        self.method = QComboBox()
        self.method.addItems(["cash", "card", "bkash", "nagad", "rocket", "bank", "due", "other"])
        self.amount = QDoubleSpinBox()
        self.amount.setRange(0, 10_000_000)
        self.amount.setValue(float(total))
        self.ref = QLineEdit()
        lay.addRow("Method:", self.method)
        lay.addRow("Amount:", self.amount)
        lay.addRow("Reference:", self.ref)
        box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        box.accepted.connect(self.accept)
        box.rejected.connect(self.reject)
        lay.addWidget(box)

    def value(self):
        return {"method": self.method.currentText(), "amount": self.amount.value(),
                "reference": self.ref.text().strip()}


class POSWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.cart: list[dict] = []  # {product_id, name, qty, unit_price, discount_pct}
        root = QHBoxLayout(self)
        left = QVBoxLayout()
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
        right.addWidget(self.table)
        self.total_lbl = QLabel("Total: ৳0.00")
        self.total_lbl.setStyleSheet("font-size: 28px; font-weight: bold;")
        self.total_lbl.setAlignment(Qt.AlignRight)
        right.addWidget(self.total_lbl)
        btns = QHBoxLayout()
        self.charge_btn = QPushButton("Charge (F9)")
        self.hold_btn = QPushButton("Hold (F7)")
        self.clear_btn = QPushButton("Clear")
        self.charge_btn.clicked.connect(self.checkout)
        self.hold_btn.clicked.connect(self.hold)
        self.clear_btn.clicked.connect(self.clear_cart)
        btns.addWidget(self.charge_btn)
        btns.addWidget(self.hold_btn)
        btns.addWidget(self.clear_btn)
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

    # ---- cart ops ----
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
            if ln["product_id"] == found["id"]:
                ln["qty"] = str(Decimal(str(ln["qty"])) + 1)
                break
        else:
            self.cart.append({"product_id": found["id"], "name": found["name"], "qty": "1",
                              "unit_price": str(found["sell_price"]), "discount_pct": "0"})
        self.search.clear()
        self.results.clear()
        self.refresh()

    def refresh(self):
        self.table.setRowCount(len(self.cart))
        total = Decimal("0.00")
        for i, ln in enumerate(self.cart):
            line = to_money(ln["unit_price"]) * Decimal(str(ln["qty"]))
            total += line
            for j, v in enumerate([ln["name"], str(ln["qty"]), str(ln["unit_price"]),
                                   str(ln["discount_pct"]), f"{line:.2f}"]):
                self.table.setItem(i, j, QTableWidgetItem(v))
        self.total_lbl.setText(f"Total: ৳{total:.2f}")

    def clear_cart(self):
        self.cart = []
        self.refresh()

    def _sale_id_from_input(self) -> int | None:
        inv = self.inv_input.text().strip()
        if not inv:
            QMessageBox.warning(self, "Invoice", "Enter an invoice number first")
            return None
        row = self.ctx.conn.execute("SELECT id FROM sales WHERE invoice_no=?", (inv,)).fetchone()
        if row is None:
            QMessageBox.warning(self, "Invoice", f"Invoice '{inv}' not found")
            return None
        return int(row["id"])

    def do_return(self):
        sid = self._sale_id_from_input()
        if sid is None:
            return
        items = [dict(r) for r in self.ctx.conn.execute(
            "SELECT si.*, p.name FROM sale_items si JOIN products p ON p.id=si.product_id"
            " WHERE sale_id=?", (sid,))]
        if not items:
            return
        # Quick full-line return: user edits quantities as "product_id=qty" pairs.
        from PySide6.QtWidgets import QInputDialog
        default = ", ".join(f"{r['product_id']}={r['qty']}" for r in items)
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

    def do_reprint(self):
        sid = self._sale_id_from_input()
        if sid is None:
            return
        try:
            sale = self.ctx.conn.execute("SELECT * FROM sales WHERE id=?", (sid,)).fetchone()
            items = [dict(r) for r in self.ctx.conn.execute(
                "SELECT si.*, p.name FROM sale_items si JOIN products p ON p.id=si.product_id"
                " WHERE sale_id=?", (sid,))]
            item_rows = [{"name": r["name"], "qty": r["qty"], "unit_price": r["unit_price"],
                          "line_total": r["line_total"]} for r in items]
            pay_rows = [dict(r) for r in self.ctx.conn.execute(
                "SELECT * FROM sale_payments WHERE sale_id=?", (sid,))]
            biz = settings_service.get_business(self.ctx.conn)
            text = build_receipt(business=biz, sale=dict(sale), items=item_rows,
                                 payments=pay_rows, width=42)
            pr = get_printer(settings_service.get(self.ctx.conn, "printer_name")).print_receipt(text)
            QMessageBox.information(self, "Reprint", pr.message)
        except Exception as e:
            QMessageBox.critical(self, "Reprint failed", str(e))

    def hold(self):
        if not self.cart:
            return
        hid = pos_service.hold_sale(self.ctx.conn, session=self.ctx.session,
                                    cart={"items": self.cart}, note="held at POS")
        QMessageBox.information(self, "Held", f"Sale held as #{hid}. Resume from Sales > Held bills.")
        self.clear_cart()

    def checkout(self):
        if not self.cart:
            return
        total = sum(to_money(l["unit_price"]) * Decimal(str(l["qty"])) for l in self.cart)
        dlg = PaymentDialog(total, self)
        if dlg.exec() != QDialog.Accepted:
            return
        pay = dlg.value()
        customer_id = None
        cust_txt = self.customer.text().strip()
        if cust_txt:
            row = self.ctx.conn.execute(
                "SELECT id FROM customers WHERE phone=? OR CAST(id AS TEXT)=?",
                (cust_txt, cust_txt)).fetchone()
            if row is None:
                QMessageBox.warning(self, "Customer", f"No customer '{cust_txt}' - create it first")
                return
            customer_id = int(row["id"])
        try:
            res = pos_service.complete_sale(
                self.ctx.conn, session=self.ctx.session,
                items=[{"product_id": l["product_id"], "qty": l["qty"],
                        "unit_price": l["unit_price"], "discount_pct": l["discount_pct"]}
                       for l in self.cart],
                payments=[pay], customer_id=customer_id, shift_id=self.ctx.shift_id,
                allow_negative_stock=False)
        except PermissionError as e:
            QMessageBox.warning(self, "Denied", str(e))
            return
        except Exception as e:
            QMessageBox.critical(self, "Sale failed", f"Transaction was NOT completed.\n{e}")
            return
        # Printing must never roll back the completed sale.
        try:
            sale = self.ctx.conn.execute("SELECT * FROM sales WHERE id=?",
                                         (res["sale_id"],)).fetchone()
            items = [dict(r) for r in self.ctx.conn.execute(
                "SELECT si.*, p.name FROM sale_items si JOIN products p ON p.id=si.product_id"
                " WHERE sale_id=?", (res["sale_id"],))]
            item_rows = [{"name": r["name"], "qty": r["qty"], "unit_price": r["unit_price"],
                          "line_total": r["line_total"]} for r in items]
            pay_rows = [dict(r) for r in self.ctx.conn.execute(
                "SELECT * FROM sale_payments WHERE sale_id=?", (res["sale_id"],))]
            biz = settings_service.get_business(self.ctx.conn)
            text = build_receipt(business=biz, sale=dict(sale), items=item_rows,
                                 payments=pay_rows, width=42)
            printer = get_printer(settings_service.get(self.ctx.conn, "printer_name"))
            pr = printer.print_receipt(text)
            msg = f"Sale {res['invoice_no']} completed.\n{pr.message}"
            if str(settings_service.get(self.ctx.conn, "cash_drawer_enabled")) == "1":
                printer.open_drawer()
            QMessageBox.information(self, "Sale completed", msg)
        except Exception as e:
            QMessageBox.information(
                self, "Sale completed",
                f"Sale {res['invoice_no']} completed successfully.\nPrint note: {e}\nYou can reprint later.")
        self.clear_cart()
