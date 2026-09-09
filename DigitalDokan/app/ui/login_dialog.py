"""Login dialog: offline authentication, bootstrap admin on first run."""
from __future__ import annotations

from PySide6.QtWidgets import (QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton,
                               QMessageBox, QFormLayout)

from app.services import auth_service


class LoginDialog(QDialog):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self.setWindowTitle("DigitalDokan - Login")
        self.setMinimumWidth(340)
        layout = QVBoxLayout(self)
        form = QFormLayout()
        self.username = QLineEdit()
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)
        form.addRow("Username:", self.username)
        form.addRow("Password/PIN:", self.password)
        layout.addLayout(form)
        self.info = QLabel("")
        layout.addWidget(self.info)
        btn = QPushButton("Login (Enter)")
        btn.clicked.connect(self.try_login)
        layout.addWidget(btn)
        self.password.returnPressed.connect(self.try_login)
        if auth_service.bootstrap_admin(self.ctx.conn):
            self.info.setText("First run: default admin / Admin@123 - change it immediately.")

    def try_login(self):
        try:
            sess = auth_service.login(self.ctx.conn, self.username.text(), self.password.text())
            self.ctx.session = sess
            self.accept()
        except Exception as e:
            QMessageBox.warning(self, "Login failed", str(e))
