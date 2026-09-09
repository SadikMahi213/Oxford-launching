"""Main window: tabbed commercial shell with role-gated tabs + auto-lock."""
from __future__ import annotations

from PySide6.QtCore import QTimer
from PySide6.QtWidgets import QMainWindow, QTabWidget, QLabel, QMessageBox

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
        tabs = QTabWidget()
        tabs.addTab(POSWidget(ctx), "POS")
        tabs.addTab(ProductsWidget(ctx), "Products")
        tabs.addTab(PurchasesWidget(ctx), "Purchases")
        tabs.addTab(CustomersWidget(ctx), "Customers")
        tabs.addTab(SuppliersWidget(ctx), "Suppliers")
        tabs.addTab(OpsWidget(ctx), "Shifts/Expenses")
        if ctx.session.can("access_reports"):
            tabs.addTab(ReportsWidget(ctx), "Reports")
        if ctx.session.can("manage_users"):
            tabs.addTab(UsersWidget(ctx), "Users")
        if ctx.session.can("manage_settings"):
            tabs.addTab(SettingsWidget(ctx), "Settings")
        if ctx.session.can("backup"):
            tabs.addTab(BackupWidget(ctx), "Backup")
        self.setCentralWidget(tabs)
        self.statusBar().showMessage(f"User: {ctx.session.username} | Terminal: {ctx.terminal_code} | OFFLINE READY")
        # Auto-lock after inactivity.
        self._idle_ms = 0
        self._timer = QTimer(self)
        self._timer.timeout.connect(self._idle_tick)
        self._timer.start(60_000)

    def _idle_tick(self):
        self._idle_ms += 60_000
        if self._idle_ms >= self.ctx.config.session_timeout_minutes * 60_000:
            QMessageBox.information(self, "Locked", "Session locked due to inactivity. Please login again.")
            self.close()
