"""
Invoice Scheduler — disabled.
Per-transaction invoices are generated on demand at deposit/withdrawal approval time.
"""
import logging

logger = logging.getLogger(__name__)


async def start_invoice_scheduler():
    logger.info("Invoice scheduler disabled (per-transaction invoices only)")


async def stop_invoice_scheduler():
    pass
