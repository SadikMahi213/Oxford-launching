"""A4 invoice printing via Qt (standard Windows printing path). PySide6 imports
stay inside functions so headless/service contexts never require a display."""
from __future__ import annotations

from abc import ABC, abstractmethod


class A4Printer(ABC):
    @abstractmethod
    def print_html(self, html: str, printer_name: str = "") -> tuple[bool, str]: ...

    @abstractmethod
    def preview_html(self, html: str): ...


class QtA4Printer(A4Printer):
    def print_html(self, html: str, printer_name: str = "") -> tuple[bool, str]:
        try:
            from PySide6.QtGui import QTextDocument
            from PySide6.QtPrintSupport import QPrinter, QPrintDialog
            from PySide6.QtWidgets import QApplication
            app = QApplication.instance() or QApplication([])
            void = app
            doc = QTextDocument()
            doc.setHtml(html)
            printer = QPrinter(QPrinter.HighResolution)
            if printer_name:
                printer.setPrinterName(printer_name)
            dlg = QPrintDialog(printer)
            if dlg.exec() != QPrintDialog.Accepted:
                return False, "Print cancelled"
            doc.print_(printer)
            return True, "Printed"
        except Exception as e:
            return False, f"A4 print failed: {e}"

    def preview_html(self, html: str):
        from PySide6.QtGui import QTextDocument
        from PySide6.QtPrintSupport import QPrintPreviewDialog, QPrinter
        doc = QTextDocument()
        doc.setHtml(html)
        printer = QPrinter(QPrinter.HighResolution)
        dlg = QPrintPreviewDialog(printer)
        dlg.paintRequested.connect(doc.print_)
        return dlg
