"""Customer display + barcode label printer (§17), each with a simulator."""
from __future__ import annotations

from abc import ABC, abstractmethod


class CustomerDisplay(ABC):
    @abstractmethod
    def show_total(self, total: str) -> bool: ...

    @abstractmethod
    def show_text(self, line1: str, line2: str = "") -> bool: ...

    @abstractmethod
    def clear(self) -> bool: ...


class SerialCustomerDisplay(CustomerDisplay):
    """2-line pole display over serial (pyserial optional). Never raises."""

    def __init__(self, port: str = "COM2", baud: int = 9600):
        self.port = port
        self.baud = baud
        self._ser = None

    def _write(self, data: bytes) -> bool:
        try:
            if self._ser is None:
                import serial  # type: ignore
                self._ser = serial.Serial(self.port, self.baud, timeout=1)
            self._ser.write(b"\x0c" + data[:40])
            return True
        except Exception:
            return False

    def show_total(self, total: str) -> bool:
        return self.show_text("TOTAL", str(total))

    def show_text(self, line1: str, line2: str = "") -> bool:
        return self._write(f"{line1[:20]:<20}{line2[:20]:<20}".encode(errors="ignore"))

    def clear(self) -> bool:
        return self._write(b" " * 40)


class SimulatorDisplay(CustomerDisplay):
    def __init__(self):
        self.last: tuple[str, str] = ("", "")

    def show_total(self, total: str) -> bool:
        return self.show_text("TOTAL", str(total))

    def show_text(self, line1: str, line2: str = "") -> bool:
        self.last = (line1, line2)
        return True

    def clear(self) -> bool:
        self.last = ("", "")
        return True


class BarcodeLabelPrinter(ABC):
    @abstractmethod
    def print_label(self, *, sku: str, name: str, price: str, barcode: str,
                    copies: int = 1) -> bool: ...


class EscposLabelPrinter(BarcodeLabelPrinter):
    """Renders a text label template and sends it through an IPrinter."""

    def __init__(self, printer):
        self.printer = printer

    def render(self, *, sku: str, name: str, price: str, barcode: str) -> str:
        return f"{name[:28]}\nSKU:{sku}  Tk {price}\n|| {barcode} ||"

    def print_label(self, *, sku: str, name: str, price: str, barcode: str,
                    copies: int = 1) -> bool:
        try:
            for _ in range(max(1, copies)):
                res = self.printer.print_receipt(
                    self.render(sku=sku, name=name, price=price, barcode=barcode))
                if not res.ok:
                    return False
            return True
        except Exception:
            return False


class SimulatorLabelPrinter(BarcodeLabelPrinter):
    def __init__(self):
        self.labels: list[dict] = []

    def print_label(self, *, sku: str, name: str, price: str, barcode: str,
                    copies: int = 1) -> bool:
        self.labels.append({"sku": sku, "name": name, "price": price,
                            "barcode": barcode, "copies": copies})
        return True
