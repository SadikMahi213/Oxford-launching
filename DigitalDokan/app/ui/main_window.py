"""Main window: tabbed commercial shell with role-gated tabs + auto-lock."""
from __future__ import annotations

from PySide6.QtCore import QTimer
from PySide6.QtWidgets import (QMainWindow, QTabWidget, QLabel, QMessageBox, QDialog,
                               QVBoxLayout, QTextEdit, QPushButton, QHBoxLayout, QFileDialog)


class DiagnosticsDialog(QDialog):
    """Help → Diagnostics (§36): versions, integrity, license, backup, LAN, hardware."""

    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.setWindowTitle("Diagnostics")
        self.resize(640, 480)
        lay = QVBoxLayout(self)
        self.text = QTextEdit()
        self.text.setReadOnly(True)
        lay.addWidget(self.text)
        row = QHBoxLayout()
        refresh = QPushButton("Refresh")
        refresh.clicked.connect(self.reload)
        hw = QPushButton("Hardware self-test")
        hw.clicked.connect(self.hw_test)
        audit = QPushButton("Recent audit")
        audit.clicked.connect(self.show_audit)
        export = QPushButton("Export diagnostics")
        export.clicked.connect(self.export)
        for b in (refresh, hw, audit, export):
            row.addWidget(b)
        lay.addLayout(row)
        self.reload()

    def _collect(self):
        from app.services import diagnostics as _dg
        from app.services import settings_service as _ss
        lan = getattr(self.ctx, "lan", None)
        return _dg.collect(self.ctx.conn, backup_dir=self.ctx.config.backup_dir,
                           lan_mode=_ss.get(self.ctx.conn, "lan.mode", "standalone"),
                           lan_reachable=(lan.token is not None) if lan else None)

    def reload(self):
        from app.services import diagnostics as _dg
        try:
            self.text.setPlainText(_dg.format_text(self._collect()))
        except Exception as e:
            self.text.setPlainText(f"Diagnostics failed: {e}")

    def hw_test(self):
        from app.services import print_service as _ps
        lines = []
        for kind in ("scanner", "scale", "display", "label", "printer"):
            r = _ps.hardware_self_test(kind)
            lines.append(f"{kind}: {'OK' if r['ok'] else 'FAIL'} - {r['message']}")
        self.text.setPlainText("\n".join(lines))

    def show_audit(self):
        if not self.ctx.session.can("audit.view"):
            QMessageBox.warning(self, "Denied", "Permission denied: audit.view")
            return
        from app.services import audit_service as _au
        rows = _au.search(self.ctx.conn, limit=100)
        lines = [f"#{r['id']} {r['created_at'][:19]} {r['username'] or r['user_id']} "
                 f"{r['action']} {r['entity']}:{r['entity_id']}" for r in rows]
        self.text.setPlainText("\n".join(lines) or "No audit rows.")

    def export(self):
        import json
        path, _ = QFileDialog.getSaveFileName(self, "Export diagnostics",
                                              "diagnostics.json", "JSON (*.json)")
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(self._collect(), f, indent=2, default=str)
            QMessageBox.information(self, "Exported", f"Saved to {path}")
        except Exception as e:
            QMessageBox.critical(self, "Export failed", str(e))

from app.ui.admin_widgets import BackupWidget, ReportsWidget, SettingsWidget, UsersWidget
from app.ui.ops_widgets import CustomersWidget, OpsWidget, PurchasesWidget, SuppliersWidget
from app.ui.pos_widget import POSWidget
from app.ui.products_widget import ProductsWidget


class MainWindow(QMainWindow):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.setWindowTitle(f"DigitalDokan - {ctx.session.full_name} ({ctx.session.role})")
        self.resize(1280, 800)
        from app.i18n.manager import t
        lang = ctx.language
        tabs = QTabWidget()
        tabs.addTab(POSWidget(ctx), t(lang, "pos"))
        tabs.addTab(ProductsWidget(ctx), t(lang, "products"))
        tabs.addTab(PurchasesWidget(ctx), t(lang, "purchases"))
        tabs.addTab(CustomersWidget(ctx), t(lang, "customers"))
        tabs.addTab(SuppliersWidget(ctx), t(lang, "suppliers"))
        tabs.addTab(OpsWidget(ctx), t(lang, "shifts_expenses"))
        if ctx.session.can("access_reports"):
            tabs.addTab(ReportsWidget(ctx), t(lang, "reports"))
        if ctx.session.can("manage_users"):
            tabs.addTab(UsersWidget(ctx), t(lang, "users"))
        if ctx.session.can("manage_settings"):
            tabs.addTab(SettingsWidget(ctx), t(lang, "settings"))
        if ctx.session.can("backup"):
            tabs.addTab(BackupWidget(ctx), t(lang, "backup"))
        self.setCentralWidget(tabs)
        lan = getattr(ctx, "lan", None)
        net = f" | LAN: {lan.base_url} ({lan.terminal_code})" if lan is not None else ""
        self.statusBar().showMessage(
            f"User: {ctx.session.username} | Terminal: {ctx.terminal_code}{net} | "
            f"{t(lang, 'offline_ready')}")
        help_menu = self.menuBar().addMenu("Help")
        diag_action = help_menu.addAction("Diagnostics")
        diag_action.triggered.connect(lambda: DiagnosticsDialog(ctx, self).exec())
        # Auto-lock after inactivity.
        self._idle_ms = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._idle_tick)
        self._timer.start(60_000)

    def _idle_tick(self):
        self._idle_ms += 60_000
        if self._idle_ms >= self.ctx.config.session_timeout_minutes * 60_000:
            from app.i18n.manager import t
            QMessageBox.information(self, t(self.ctx.language, "locked"),
                                    "Session locked due to inactivity. Please login again.")
            self.close()

    def closeEvent(self, event):
        try:
            from app.services.audit_service import record
            if getattr(self.ctx, "session", None) is not None:
                record(self.ctx.conn, user_id=self.ctx.session.user_id, action="logout",
                       entity="user", entity_id=self.ctx.session.username)
                self.ctx.conn.commit()
        except Exception:
            pass
        super().closeEvent(event)
