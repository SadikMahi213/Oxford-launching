"""Hardware abstraction: replace implementations without touching business logic."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PrintResult:
    ok: bool
    message: str


class IPrinter(ABC):
    @abstractmethod
    def print_receipt(self, text: str) -> PrintResult: ...
    @abstractmethod
    def open_drawer(self) -> PrintResult: ...


class IScanner(ABC):
    @abstractmethod
    def last_scan(self) -> str: ...


class IScale(ABC):
    @abstractmethod
    def read_kg(self) -> float: ...


class NullPrinter(IPrinter):
    def print_receipt(self, text: str) -> PrintResult:
        return PrintResult(False, "No printer configured - sale completed, reprint later")

    def open_drawer(self) -> PrintResult:
        return PrintResult(False, "Cash drawer not configured")


class Win32RawPrinter(IPrinter):
    """Thermal ESC/POS via Windows raw spool (80/58mm). Failures never crash POS."""

    def __init__(self, printer_name: str):
        self.printer_name = printer_name

    def print_receipt(self, text: str) -> PrintResult:
        try:
            import win32print, win32api  # type: ignore
            data = text.replace("\n", "\r\n").encode("utf-8", errors="ignore")
            h = win32print.OpenPrinter(self.printer_name)
            try:
                win32print.StartDocPrinter(h, 1, ("DigitalDokan Receipt", None, "RAW"))
                win32print.StartPagePrinter(h)
                win32print.WritePrinter(h, data + b"\n\n\n\x1dV\x00")
                win32print.EndPagePrinter(h)
                win32print.EndDocPrinter(h)
            finally:
                win32print.ClosePrinter(h)
            return PrintResult(True, "Printed")
        except ImportError:
            try:
                with open(f"print-{self.printer_name or 'receipt'}.txt", "w", encoding="utf-8") as f:
                    f.write(text)
                return PrintResult(False, "win32print unavailable - receipt saved to file instead")
            except Exception as e:
                return PrintResult(False, f"Printer unavailable: {e}. Sale completed, reprint later.")
        except Exception as e:
            return PrintResult(False, f"Printer unavailable: {e}. Sale completed, reprint later.")

    def open_drawer(self) -> PrintResult:
        return self.print_receipt("\x1bp\x00\x19\xfa")


def get_printer(printer_name: str) -> IPrinter:
    if not printer_name:
        return NullPrinter()
    return Win32RawPrinter(printer_name)
