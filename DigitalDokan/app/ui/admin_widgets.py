"""Reports, settings/business profile, users, backup widgets."""
from __future__ import annotations

from PySide6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QPushButton, QTableWidget,
                               QTableWidgetItem, QLabel, QLineEdit, QFormLayout, QComboBox,
                               QMessageBox, QFileDialog, QHeaderView)

from app.infra import backup as backupmod
from app.infra import license_manager
from app.services import auth_service, report_service, settings_service


def _fill(table: QTableWidget, rows: list[dict]):
    cols = list(rows[0].keys()) if rows else []
    table.setColumnCount(len(cols))
    table.setHorizontalHeaderLabels(cols)
    table.setRowCount(len(rows))
    for i, r in enumerate(rows):
        for j, c in enumerate(cols):
            table.setItem(i, j, QTableWidgetItem(str(r[c])))
    table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)


class ReportsWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        top = QHBoxLayout()
        self.start = QLineEdit()
        self.start.setPlaceholderText("Start YYYY-MM-DD (optional)")
        self.end = QLineEdit()
        self.end.setPlaceholderText("End YYYY-MM-DD (optional)")
        for label, fn in (("Daily sales", self.daily), ("Products", self.products),
                          ("Stock", self.stock), ("Profit", self.profit),
                          ("Near expiry", self.expiry), ("Export sales CSV", self.export)):
            b = QPushButton(label)
            b.clicked.connect(fn)
            top.addWidget(b)
        lay.addLayout(top)
        lay.addWidget(self.start)
        lay.addWidget(self.end)
        self.info = QLabel("")
        lay.addWidget(self.info)
        self.table = QTableWidget()
        lay.addWidget(self.table)

    def _range(self):
        return (self.start.text().strip() or None, self.end.text().strip() or None)

    def daily(self):
        s, e = self._range()
        _fill(self.table, report_service.sales_summary(self.ctx.conn, s, e, "day"))

    def products(self):
        s, e = self._range()
        _fill(self.table, report_service.product_sales(self.ctx.conn, s, e))

    def stock(self):
        _fill(self.table, report_service.stock_report(self.ctx.conn))

    def profit(self):
        s, e = self._range()
        p = report_service.profit_summary(self.ctx.conn, s, e)
        self.info.setText(f"Revenue ৳{p['revenue']} | COGS ৳{p['cogs']} | Gross ৳{p['gross_profit']} "
                          f"| Expenses ৳{p['expenses']} | Net(est) ৳{p['net_estimate']}")
        _fill(self.table, [p])

    def expiry(self):
        _fill(self.table, report_service.near_expiry(self.ctx.conn))

    def export(self):
        from app.services.import_export_service import export_sales_csv
        path, _ = QFileDialog.getSaveFileName(self, "Export sales", "sales.csv", "CSV (*.csv)")
        if not path:
            return
        s, e = self._range()
        export_sales_csv(self.ctx.conn, path, s, e)
        QMessageBox.information(self, "Export", f"Saved to {path}")


class SettingsWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QFormLayout(self)
        self.biz_name = QLineEdit()
        self.biz_addr = QLineEdit()
        self.biz_phone = QLineEdit()
        self.biz_bin = QLineEdit()
        self.printer = QLineEdit()
        self.size = QComboBox()
        self.size.addItems(["80mm", "58mm"])
        self.lang = QComboBox()
        self.lang.addItems(["en", "bn"])
        for w, k in ((self.biz_name, "Store name"), (self.biz_addr, "Address"),
                     (self.biz_phone, "Phone"), (self.biz_bin, "BIN"),
                     (self.printer, "Printer name"), (self.size, "Receipt size"),
                     (self.lang, "Language")):
            lay.addRow(k + ":", w)
        save = QPushButton("Save settings")
        save.clicked.connect(self.save)
        lay.addWidget(save)
        self.lic = QLabel("")
        lay.addWidget(self.lic)
        act = QPushButton("Activate license key")
        act.clicked.connect(self.activate)
        lay.addWidget(act)
        self.load()

    def load(self):
        biz = settings_service.get_business(self.ctx.conn)
        self.biz_name.setText(biz.get("name", ""))
        self.biz_addr.setText(biz.get("address", ""))
        self.biz_phone.setText(biz.get("phone", ""))
        self.biz_bin.setText(biz.get("bin_no", ""))
        self.printer.setText(settings_service.get(self.ctx.conn, "printer_name"))
        st = license_manager.status(self.ctx.conn)
        self.lic.setText(f"License: {st.plan} | valid={st.valid} | {st.message}")

    def save(self):
        if not self.ctx.session.can("manage_settings"):
            QMessageBox.warning(self, "Denied", "Permission denied: manage_settings")
            return
        settings_service.save_business(self.ctx.conn, {
            "name": self.biz_name.text(), "address": self.biz_addr.text(),
            "phone": self.biz_phone.text(), "bin_no": self.biz_bin.text()})
        settings_service.set(self.ctx.conn, "printer_name", self.printer.text().strip())
        settings_service.set(self.ctx.conn, "language", self.lang.currentText())
        self.ctx.language = self.lang.currentText()
        QMessageBox.information(self, "Saved", "Settings saved")

    def activate(self):
        from PySide6.QtWidgets import QInputDialog
        key, ok = QInputDialog.getText(self, "License", "Paste license key:")
        if not ok or not key.strip():
            return
        try:
            st = license_manager.activate(self.ctx.conn, key.strip())
            self.lic.setText(f"License: {st.plan} | valid={st.valid} | {st.message}")
        except Exception as e:
            QMessageBox.critical(self, "Activation failed", str(e))


class UsersWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        top = QHBoxLayout()
        self.u = QLineEdit()
        self.u.setPlaceholderText("username")
        self.n = QLineEdit()
        self.n.setPlaceholderText("full name")
        self.p = QLineEdit()
        self.p.setPlaceholderText("password")
        self.p.setEchoMode(QLineEdit.Password)
        self.role = QComboBox()
        self.role.addItems(["Cashier", "Manager", "Inventory Manager", "Accountant",
                            "Supervisor", "Owner"])
        add = QPushButton("Create user")
        add.clicked.connect(self.add)
        for w in (self.u, self.n, self.p, self.role, add):
            top.addWidget(w)
        lay.addLayout(top)
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["ID", "Username", "Name", "Role"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        lay.addWidget(self.table)
        self.reload()

    def reload(self):
        rows = self.ctx.conn.execute(
            "SELECT u.id, u.username, u.full_name, r.name AS role FROM users u"
            " JOIN roles r ON r.id=u.role_id ORDER BY u.id").fetchall()
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            for j, k in enumerate(("id", "username", "full_name", "role")):
                self.table.setItem(i, j, QTableWidgetItem(str(r[k])))

    def add(self):
        if not self.ctx.session.can("manage_users"):
            QMessageBox.warning(self, "Denied", "Permission denied: manage_users")
            return
        try:
            auth_service.create_user(self.ctx.conn, self.u.text(), self.n.text(),
                                     self.p.text(), self.role.currentText())
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Create failed", str(e))


class BackupWidget(QWidget):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        lay = QVBoxLayout(self)
        row = QHBoxLayout()
        b1 = QPushButton("Backup now")
        b1.clicked.connect(self.do_backup)
        b2 = QPushButton("Verify latest backup")
        b2.clicked.connect(self.verify)
        b3 = QPushButton("Restore from file...")
        b3.clicked.connect(self.restore)
        for b in (b1, b2, b3):
            row.addWidget(b)
        lay.addLayout(row)
        self.info = QLabel("")
        lay.addWidget(self.info)
        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["File", "Size", "SHA256", "When"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        lay.addWidget(self.table)
        self.reload()

    def reload(self):
        rows = self.ctx.conn.execute("SELECT filename, size_bytes, sha256, created_at FROM backups"
                                     " ORDER BY id DESC LIMIT 30").fetchall()
        self.table.setRowCount(len(rows))
        for i, r in enumerate(rows):
            self.table.setItem(i, 0, QTableWidgetItem(str(r["filename"])))
            self.table.setItem(i, 1, QTableWidgetItem(str(r["size_bytes"])))
            self.table.setItem(i, 2, QTableWidgetItem(str(r["sha256"])[:16] + "..."))
            self.table.setItem(i, 3, QTableWidgetItem(str(r["created_at"])))

    def do_backup(self):
        if not self.ctx.session.can("backup"):
            QMessageBox.warning(self, "Denied", "Permission denied: backup")
            return
        try:
            m = backupmod.create_backup(self.ctx.conn, self.ctx.config.backup_dir, note="manual-ui")
            self.info.setText(f"Backup OK: {m['filename']} sha256={m['sha256'][:16]}...")
            self.reload()
        except Exception as e:
            QMessageBox.critical(self, "Backup failed", str(e))

    def verify(self):
        import os
        rows = self.ctx.conn.execute("SELECT filename FROM backups ORDER BY id DESC LIMIT 1").fetchone()
        if not rows:
            self.info.setText("No backups yet")
            return
        path = os.path.join(self.ctx.config.backup_dir, rows["filename"])
        try:
            v = backupmod.verify_backup(path)
            self.info.setText(f"integrity={v['integrity']} manifest_match={v['manifest_match']}")
        except Exception as e:
            QMessageBox.critical(self, "Verify failed", str(e))

    def restore(self):
        if not self.ctx.session.can("restore"):
            QMessageBox.warning(self, "Denied", "Permission denied: restore")
            return
        path, _ = QFileDialog.getOpenFileName(self, "Select backup .db file", filter="DB (*.db)")
        if not path:
            return
        ret = QMessageBox.question(self, "Restore",
                                   "Restore will quarantine the current database first. Continue?")
        if ret != QMessageBox.Yes:
            return
        try:
            backupmod.restore_backup(path, self.ctx.config.db_path)
            QMessageBox.information(self, "Restored", "Database restored. Please restart the app.")
        except Exception as e:
            QMessageBox.critical(self, "Restore failed", str(e))
