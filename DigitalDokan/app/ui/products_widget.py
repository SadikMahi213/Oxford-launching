"""Product management: list, create/edit, stock view, CSV import."""
from __future__ import annotations

import sqlite3

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QLineEdit, QPushButton,
                               QTableWidget, QTableWidgetItem, QMessageBox, QDialog, QFormLayout,
                               QDialogButtonBox, QDoubleSpinBox, QCheckBox, QFileDialog, QHeaderView)

from app.services import product_service
from app.services.import_export_service import read_csv_products, import_products


class ProductDialog(QDialog):
    def __init__(self, data: dict | None = None, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Product")
        self.fields: dict[str, QLineEdit | QDoubleSpinBox | QCheckBox] = {}
        lay = QFormLayout(self)
        data = data or {}
        for key in ("sku", "name", "name_bn", "barcode"):
            w = QLineEdit(str(data.get(key, "")))
            self.fields[key] = w
            lay.addRow(key + ":", w)
        for key in ("cost_price", "sell_price", "wholesale_price", "min_stock"):
            w = QDoubleSpinBox()
            w.setRange(0, 10_000_000)
            w.setValue(float(data.get(key, 0) or 0))
            self.fields[key] = w
            lay.addRow(key + ":", w)
        self.fields["track_expiry"] = QCheckBox()
        self.fields["track_expiry"].setChecked(bool(data.get("track_expiry", 0)))
        lay.addRow("track_expiry:", self.fields["track_expiry"])
        box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        box.accepted.connect(self.accept)
        box.rejected.connect(self.reject)
        lay.addWidget(box)

    def value(self) -> dict:
        g = lambda k: self.fields[k]
        return {"sku": g("sku").text(), "name": g("name").text(), "name_bn": g("name_bn").text(),
                "barcode": g("barcode").text(), "cost_price": g("cost_price").value(),
                "sell_price": g("sell_price").value(), "wholesale_price": g("wholesale_price").value(),
                "min_stock": g("min_stock").value(),
                "track_expiry": int(g("track_expiry").isChecked())}


class ProductsWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        top = QHBoxLayout()
        self.q = QLineEdit()
        self.q.setPlaceholderText("Search products...")
        self.q.returnPressed.connect(self.reload)
        add = QPushButton("Add product")
        add.clicked.connect(self.add)
        imp = QPushButton("Import CSV")
        imp.clicked.connect(self.do_import)
        top.addWidget(self.q)
        top.addWidget(add)
        top.addWidget(imp)
        lay.addLayout(top)
        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(["SKU", "Name", "Barcode", "Cost", "Price", "Stock"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.doubleClicked.connect(self.edit)
        lay.addWidget(self.table)
        self.reload()

    def reload(self):
        rows = product_service.search(self.ctx.conn, self.q.text().strip(), limit=200) if self.q.text().strip() \
            else product_service.search(self.ctx.conn, "", limit=200)
        # empty query with LIKE '%%' returns everything (bounded).
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            for j, k in enumerate(("sku", "name", "barcode", "cost_price", "sell_price", "stock")):
                self.table.setItem(i, j, QTableWidgetItem(str(r.get(k, ""))))

    def add(self):
        if not self.ctx.session.can("edit_product"):
            QMessageBox.warning(self, "Denied", "Permission denied: edit_product")
            return
        dlg = ProductDialog(parent=self)
        if dlg.exec() == QDialog.Accepted:
            try:
                product_service.upsert_product(self.ctx.conn, dlg.value())
                self.reload()
            except Exception as e:
                QMessageBox.critical(self, "Save failed", str(e))

    def edit(self):
        if not self.ctx.session.can("edit_product"):
            QMessageBox.warning(self, "Denied", "Permission denied: edit_product")
            return
        row = self.table.currentRow()
        if row < 0:
            return
        sku = self.table.item(row, 0).text()
        prod = product_service.search(self.ctx.conn, sku, limit=1)
        if not prod:
            return
        dlg = ProductDialog(prod[0], self)
        if dlg.exec() == QDialog.Accepted:
            try:
                product_service.upsert_product(self.ctx.conn, dlg.value())
                self.reload()
            except Exception as e:
                QMessageBox.critical(self, "Save failed", str(e))

    def do_import(self):
        if not self.ctx.session.can("edit_product"):
            QMessageBox.warning(self, "Denied", "Permission denied: edit_product")
            return
        path, _ = QFileDialog.getOpenFileName(self, "Import products CSV", filter="CSV (*.csv)")
        if not path:
            return
        try:
            rows = read_csv_products(path)
            res = import_products(self.ctx.conn, rows)
            msg = f"Imported {res['imported']} products."
            if res["errors"]:
                msg += "\nErrors:\n" + "\n".join(res["errors"][:10])
            QMessageBox.information(self, "Import", msg)
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Import failed", str(e))
