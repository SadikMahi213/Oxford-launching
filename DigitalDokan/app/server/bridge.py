"""UI bridge for LAN mode (§26): routes POS operations to the store server.

Standalone (ctx.lan is None): zero behavior change — local services.
lan-required (ctx.lan set): catalog + sales go over HTTP; OfflineError surfaces
as a cashier-readable message; nothing is ever written to a divergent local DB.

Server credentials are asked once per app run (never stored).
"""
from __future__ import annotations

from app.server.client import LanClient, OfflineError


def get_lan(ctx) -> LanClient | None:
    return getattr(ctx, "lan", None)


def is_lan(ctx) -> bool:
    lan = get_lan(ctx)
    return lan is not None and lan.token is not None


def ensure_server_login(ctx, parent=None) -> LanClient | None:
    """Return a logged-in client, prompting once for server credentials."""
    lan = get_lan(ctx)
    if lan is None:
        return None
    if lan.token:
        return lan
    from PySide6.QtWidgets import QDialog, QFormLayout, QLineEdit, QDialogButtonBox
    dlg = QDialog(parent)
    dlg.setWindowTitle(f"Store server login ({lan.base_url})")
    lay = QFormLayout(dlg)
    user = QLineEdit()
    pw = QLineEdit()
    pw.setEchoMode(QLineEdit.Password)
    lay.addRow("Server username:", user)
    lay.addRow("Server password:", pw)
    box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
    box.accepted.connect(dlg.accept)
    box.rejected.connect(dlg.reject)
    lay.addWidget(box)
    if dlg.exec() != QDialog.Accepted or not user.text().strip():
        return None
    lan.login(user.text().strip(), pw.text())
    return lan


def connect_from_settings(conn, terminal_code: str = "POS-01") -> LanClient | None:
    """Build a LanClient from persisted settings; None when standalone."""
    from app.services import settings_service
    if str(settings_service.get(conn, "lan.mode", "standalone")) != "lan-required":
        return None
    url = str(settings_service.get(conn, "lan.server_url", "")).strip()
    if not url:
        return None
    term = str(settings_service.get(conn, "lan.terminal", terminal_code)).strip() or terminal_code
    return LanClient(url, term)
