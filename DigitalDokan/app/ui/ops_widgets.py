"""Purchases, customers/suppliers, expenses/shifts widgets (functional, compact)."""
from __future__ import annotations

from decimal import Decimal

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton,
                               QTableWidget, QTableWidgetItem, QMessageBox, QInputDialog,
                               QHeaderView, QLabel, QComboBox)

from app.services import party_service, product_service, purchase_service, shift_service


class PurchasesWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        lay.addWidget(QLabel("Purchase entry: Supplier ID + 'SKU=qty@cost' lines, e.g. RICE-1=10@62"))
        top = QHBoxLayout()
        self.supplier = QLineEdit()
        self.supplier.setPlaceholderText("Supplier ID (optional)")
        self.lines = QLineEdit()
        self.lines.setPlaceholderText("RICE-1=10@62, OIL-2=5@150")
        go = QPushButton("Receive purchase")
        go.clicked.connect(self.receive)
        top.addWidget(self.supplier)
        top.addWidget(self.lines)
        top.addWidget(go)
        lay.addLayout(top)
        self.table = QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["Invoice", "Supplier", "Total", "Paid", "Due"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        lay.addWidget(self.table)
        self.reload()

    def reload(self):
        rows = self.ctx.conn.execute(
            "SELECT p.*, s.name AS sname FROM purchases p LEFT JOIN suppliers s ON s.id=p.supplier_id"
            " ORDER BY p.id DESC LIMIT 100").fetchall()
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            for j, k in enumerate(("invoice_no", "sname", "total", "paid", "due")):
                self.table.setItem(i, j, QTableWidgetItem(str(r[k] or "")))

    def receive(self):
        try:
            items = []
            for part in self.lines.text().split(","):
                part = part.strip()
                if not part:
                    continue
                sku_qty, cost = part.split("@")
                sku, qty = sku_qty.split("=")
                found = product_service.search(self.ctx.conn, sku.strip(), limit=1)
                if not found:
                    raise ValueError(f"Unknown SKU: {sku}")
                items.append({"product_id": found[0]["id"], "qty": qty.strip(),
                              "cost": cost.strip()})
            if not items:
                raise ValueError("No lines entered")
            sup = int(self.supplier.text().strip()) if self.supplier.text().strip() else None
            res = purchase_service.receive_purchase(self.ctx.conn, session=self.ctx.session,
                                                    supplier_id=sup, items=items)
            QMessageBox.information(self, "Purchase", f"Received {res['invoice_no']} total ৳{res['total']}")
            self.lines.clear()
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Purchase failed", f"Rolled back. {e}")


class PartiesWidget(QWidget):
    kind: str = "customer"

    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        top = QHBoxLayout()
        self.name = QLineEdit()
        self.name.setPlaceholderText(f"{self.kind} name")
        self.phone = QLineEdit()
        self.phone.setPlaceholderText("Phone")
        add = QPushButton(f"Add {self.kind}")
        add.clicked.connect(self.add)
        collect = QPushButton("Collect/Pay ৳")
        collect.clicked.connect(self.money)
        top.addWidget(self.name)
        top.addWidget(self.phone)
        top.addWidget(add)
        top.addWidget(collect)
        lay.addLayout(top)
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["ID", "Name", "Phone", "Balance"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        lay.addWidget(self.table)
        self.reload()

    def _table(self):
        return "customers" if self.kind == "customer" else "suppliers"

    def reload(self):
        rows = self.ctx.conn.execute(f"SELECT id, name, phone, balance FROM {self._table()}"
                                     f" ORDER BY id DESC LIMIT 200").fetchall()
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            for j, k in enumerate(("id", "name", "phone", "balance")):
                self.table.setItem(i, j, QTableWidgetItem(str(r[k] or "")))

    def _selected_id(self) -> int | None:
        row = self.table.currentRow()
        if row < 0:
            # fall back to first row if user typed without selecting
            if self.table.rowCount():
                return int(self.table.item(0, 0).text())
            return None
        return int(self.table.item(row, 0).text())

    def add(self):
        try:
            if self.kind == "customer":
                party_service.create_customer(self.ctx.conn, self.name.text(), self.phone.text())
            else:
                party_service.create_supplier(self.ctx.conn, self.name.text(), self.phone.text())
            self.name.clear()
            self.phone.clear()
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Save failed", str(e))

    def money(self):
        pid = self._selected_id()
        if pid is None:
            QMessageBox.warning(self, "Select", "Select a row first")
            return
        amt, ok = QInputDialog.getDouble(self, "Amount", "Amount (BDT):", min=1, max=10_000_000)
        if not ok:
            return
        try:
            if self.kind == "customer":
                party_service.collect_due(self.ctx.conn, session=self.ctx.session,
                                          customer_id=pid, amount=Decimal(str(amt)))
            else:
                purchase_service.pay_supplier(self.ctx.conn, session=self.ctx.session,
                                              supplier_id=pid, amount=Decimal(str(amt)))
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Failed", str(e))


class CustomersWidget(PartiesWidget):
    kind = "customer"


class SuppliersWidget(PartiesWidget):
    kind = "supplier"


class OpsWidget(QWidget):
    """Shift open/close, cash in/out, expense entry."""

    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        self.status = QLabel("Shift: not opened")
        lay.addWidget(self.status)
        row = QHBoxLayout()
        open_btn = QPushButton("Open shift (opening cash)")
        open_btn.clicked.connect(self.open_shift)
        io_btn = QPushButton("Cash in/out")
        io_btn.clicked.connect(self.io)
        exp_btn = QPushButton("Add expense")
        exp_btn.clicked.connect(self.expense)
        close_btn = QPushButton("Close shift")
        close_btn.clicked.connect(self.close_shift)
        for b in (open_btn, io_btn, exp_btn, close_btn):
            row.addWidget(b)
        lay.addLayout(row)
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["ID", "Opened", "Opening", "Status"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        lay.addWidget(self.table)
        self.reload()

    def reload(self):
        rows = self.ctx.conn.execute("SELECT id, opened_at, opening_cash, status FROM cash_sessions"
                                     " ORDER BY id DESC LIMIT 20").fetchall()
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            for j, k in enumerate(("id", "opened_at", "opening_cash", "status")):
                self.table.setItem(i, j, QTableWidgetItem(str(r[k])))
        if self.ctx.shift_id:
            self.status.setText(f"Shift: OPEN #{self.ctx.shift_id}")

    def open_shift(self):
        amt, ok = QInputDialog.getDouble(self, "Opening cash", "Opening cash:", min=0, max=10_000_000)
        if not ok:
            return
        sid = shift_service.open_shift(self.ctx.conn, session=self.ctx.session,
                                       opening_cash=Decimal(str(amt)))
        self.ctx.shift_id = sid
        self.reload()

    def io(self):
        if not self.ctx.shift_id:
            QMessageBox.warning(self, "Shift", "Open a shift first")
            return
        direction, ok = QInputDialog.getItem(self, "Cash movement", "Direction:", ["in", "out"])
        if not ok:
            return
        amt, ok = QInputDialog.getDouble(self, "Amount", "Amount:", min=1, max=10_000_000)
        if not ok:
            return
        shift_service.cash_io(self.ctx.conn, session=self.ctx.session, shift_id=self.ctx.shift_id,
                              direction=direction, amount=Decimal(str(amt)), reason="counter")
        QMessageBox.information(self, "OK", "Recorded")

    def expense(self):
        cats = [dict(r) for r in self.ctx.conn.execute("SELECT * FROM expense_categories").fetchall()]
        names = [c["name"] for c in cats]
        name, ok = QInputDialog.getItem(self, "Expense", "Category:", names)
        if not ok:
            return
        amt, ok = QInputDialog.getDouble(self, "Expense", "Amount:", min=1, max=10_000_000)
        if not ok:
            return
        cid = next(c["id"] for c in cats if c["name"] == name)
        shift_service.add_expense(self.ctx.conn, session=self.ctx.session, category_id=cid,
                                  amount=Decimal(str(amt)), note=name)
        QMessageBox.information(self, "OK", "Expense recorded")

    def close_shift(self):
        if not self.ctx.shift_id:
            return
        amt, ok = QInputDialog.getDouble(self, "Close shift", "Actual cash counted:", min=0,
                                         max=10_000_000)
        if not ok:
            return
        try:
            res = shift_service.close_shift(self.ctx.conn, session=self.ctx.session,
                                            shift_id=self.ctx.shift_id,
                                            actual_cash=Decimal(str(amt)))
            QMessageBox.information(
                self, "Shift closed",
                f"Expected ৳{res['expected']} Actual ৳{res['actual']} Diff ৳{res['difference']}")
            self.ctx.shift_id = None
            self.status.setText("Shift: closed")
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Close failed", str(e))
