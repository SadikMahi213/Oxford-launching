"""Exact-money Qt inputs: integer-paisa spin boxes (no binary float in the UI)."""
from __future__ import annotations

from decimal import Decimal

from PySide6.QtWidgets import QSpinBox

from app.domain.money import to_money


class MoneySpin(QSpinBox):
    """Money input stored as integer paisa. Max 10,000,000.00 BDT."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setRange(0, 1_000_000_000)
        self.setSingleStep(100)  # 1 BDT steps
        self.setSuffix(" paisa")

    def setAmount(self, value) -> None:
        paisa = int((to_money(value) * 100).to_integral_value())
        self.setValue(paisa)

    def amount(self) -> Decimal:
        return (Decimal(self.value()) / Decimal(100)).quantize(Decimal("0.01"))
