"""Login dialog: offline authentication, bootstrap admin on first run."""
from __future__ import annotations

from PySide6.QtWidgets import (QDialog, QVBoxLayout, QLabel, QLineEdit, QPushButton,
                               QMessageBox, QFormLayout)

from app.services import auth_service


class LoginDialog(QDialog):
    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        from app.i18n.manager import t
        lang = ctx.language
        self.setWindowTitle(f"{t(lang, 'app_title')} - {t(lang, 'login')}")
        self.setMinimumWidth(340)
        layout = QVBoxLayout(self)
        form = QFormLayout()
        self.username = QLineEdit()
        self.password = QLineEdit()
        self.password.setEchoMode(QLineEdit.Password)
        form.addRow(f"{t(lang, 'username')}:", self.username)
        form.addRow(t(lang, "password_pin"), self.password)
        layout.addLayout(form)
        self.info = QLabel("")
        layout.addWidget(self.info)
        btn = QPushButton(t(lang, "login_enter"))
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
        except auth_service.PasswordChangeRequired as e:
            if self._force_rotation(e.user_id):
                try:
                    sess = auth_service.login(self.ctx.conn, self.username.text(),
                                              self.password.text())
                    self.ctx.session = sess
                    self.accept()
                except Exception as e2:
                    QMessageBox.warning(self, "Login failed", str(e2))
        except Exception as e:
            QMessageBox.warning(self, "Login failed", str(e))

    def _force_rotation(self, user_id: int) -> bool:
        from PySide6.QtWidgets import QInputDialog
        new, ok = QInputDialog.getText(self, "Password change required",
                                       "Set a new password (min 4 chars):")
        if not ok or not new.strip():
            return False
        try:
            auth_service.change_password(self.ctx.conn, user_id, self.password.text(), new.strip())
            self.password.setText(new.strip())
            QMessageBox.information(self, "Password updated", "Password changed. Logging in.")
            return True
        except Exception as e:
            QMessageBox.warning(self, "Change failed", str(e))
            return False
