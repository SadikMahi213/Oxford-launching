"""
Invoice Service — generates PDF invoices using Playwright (Chromium).
Invoices are rendered from HTML templates and saved as PDFs.
"""
import os
import logging
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.user import User
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.models.invoice import Invoice
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.referral_profit_history import ReferralProfitHistory

logger = logging.getLogger(__name__)

# ── HTML Templates ──────────────────────────────────────────────────────────

INVOICE_CSS = """
<style>
    @page { margin: 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; font-size: 11px; line-height: 1.5; background: #f8fafc; }
    .invoice-wrapper { max-width: 210mm; margin: 0 auto; background: #fff; min-height: 297mm; padding: 30px 35px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
    .header-left h1 { font-size: 26px; color: #0f172a; margin-bottom: 4px; }
    .header-left .subtitle { font-size: 11px; color: #64748b; }
    .header-right { text-align: right; }
    .header-right .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-generated { background: #dbeafe; color: #1d4ed8; }
    .badge-paid { background: #d1fae5; color: #059669; }
    .badge-pending { background: #fef3c7; color: #d97706; }
    .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 25px; padding: 16px 20px; background: #f1f5f9; border-radius: 8px; }
    .meta-item label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .meta-item .value { font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    .user-details { margin-bottom: 25px; }
    .user-details h3 { font-size: 13px; color: #2563eb; margin-bottom: 4px; }
    .user-details p { font-size: 11px; color: #475569; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #2563eb; color: #fff; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .amount-col { text-align: right; font-family: 'Courier New', monospace; }
    .totals { margin-left: auto; width: 280px; }
    .totals table { margin-bottom: 0; }
    .totals td { padding: 6px 12px; border: none; font-size: 11px; }
    .totals .grand-total td { font-weight: 700; font-size: 14px; color: #2563eb; border-top: 2px solid #2563eb; padding-top: 8px; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
    .footer p { margin-bottom: 3px; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; color: rgba(37, 99, 235, 0.04); font-weight: 900; pointer-events: none; z-index: -1; }
    .balance-summary { margin-bottom: 20px; }
    .balance-summary h3 { font-size: 12px; color: #2563eb; margin-bottom: 8px; }
    .balance-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .balance-item { background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; }
    .balance-item label { font-size: 9px; color: #64748b; text-transform: uppercase; }
    .balance-item .value { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
</style>
"""


def _format_date(dt) -> str:
    if not dt:
        return "-"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%b %d, %Y %H:%M")


def _format_currency(val, decimals=2) -> str:
    try:
        v = float(val or 0)
        return f"${v:,.{decimals}f}"
    except (ValueError, TypeError):
        return "$0.00"


def _build_invoice_html(
    invoice_number: str,
    invoice_type: str,
    user_name: str,
    user_email: str,
    amount: Optional[Decimal],
    currency: str,
    status: str,
    description: str,
    period_start: Optional[str],
    period_end: Optional[str],
    created_at: str,
    items: list,
    balance_summary: Optional[dict] = None,
) -> str:
    period_html = ""
    if period_start and period_end:
        period_html = f"""
        <div class="meta-item">
            <label>Period</label>
            <div class="value">{period_start} — {period_end}</div>
        </div>
        """

    items_rows = ""
    if items:
        for item in items:
            items_rows += f"""
            <tr>
                <td>{item.get('description', '')}</td>
                <td class="amount-col">{item.get('amount', '')}</td>
                <td class="amount-col">{item.get('status', '')}</td>
            </tr>
            """
    else:
        items_rows = f"""
        <tr>
            <td>{description or invoice_type.replace('_', ' ').title()}</td>
            <td class="amount-col">{_format_currency(amount)}</td>
            <td class="amount-col">{status.title()}</td>
        </tr>
        """

    balance_html = ""
    if balance_summary:
        balance_html = '<div class="balance-summary"><h3>Account Balance Summary</h3><div class="balance-grid">'
        for label, val in balance_summary.items():
            balance_html += f'<div class="balance-item"><label>{label.replace("_", " ").title()}</label><div class="value">{_format_currency(val, 2)}</div></div>'
        balance_html += "</div></div>"

    badge_class = "badge-generated"
    if status.lower() in ("completed", "approved", "paid"):
        badge_class = "badge-paid"
    elif status.lower() in ("pending", "processing"):
        badge_class = "badge-pending"

    date_str = _format_date(datetime.now(timezone.utc))

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice {invoice_number}</title>{INVOICE_CSS}</head>
<body>
<div class="invoice-wrapper">
    <div class="watermark">Oxford Financial Ads</div>
    <div class="header">
        <div class="header-left">
            <h1>INVOICE</h1>
            <div class="subtitle">Oxford Financial Ads — Professional Financial Services</div>
        </div>
        <div class="header-right">
            <div class="badge {badge_class}">{status.title()}</div>
            <div style="margin-top:8px; font-size:10px; color:#64748b;">{date_str}</div>
        </div>
    </div>

    <div class="invoice-meta">
        <div class="meta-item">
            <label>Invoice #</label>
            <div class="value">{invoice_number}</div>
        </div>
        <div class="meta-item">
            <label>Type</label>
            <div class="value">{invoice_type.replace('_', ' ').title()}</div>
        </div>
        <div class="meta-item">
            <label>Date</label>
            <div class="value">{created_at}</div>
        </div>
        <div class="meta-item">
            <label>Currency</label>
            <div class="value">{currency}</div>
        </div>
        {period_html}
    </div>

    <div class="user-details">
        <h3>Customer Details</h3>
        <p><strong>{user_name}</strong><br>{user_email}</p>
    </div>

    <table>
        <thead>
            <tr><th style="width:55%;">Description</th><th style="width:25%;" class="amount-col">Amount</th><th style="width:20%;" class="amount-col">Status</th></tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr><td>Subtotal</td><td class="amount-col">{_format_currency(amount)}</td></tr>
            <tr><td>Fee</td><td class="amount-col">$0.00</td></tr>
            <tr class="grand-total"><td>Total</td><td class="amount-col">{_format_currency(amount)} {currency}</td></tr>
        </table>
    </div>

    {balance_html}

    <div class="footer">
        <p><strong>Oxford Financial Ads</strong> — Professional Financial Services</p>
        <p>If you have any questions, please contact support@oxfordfinancialads.com</p>
        <p>This invoice was generated automatically. Thank you for your business.</p>
    </div>
</div>
</body></html>"""


async def generate_invoice_pdf(html_content: str, output_path: str) -> bool:
    """
    Generate a PDF from HTML using Playwright (Chromium).
    Falls back to a placeholder if Playwright is not available.
    """
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
            page = await browser.new_page()
            await page.set_content(html_content, wait_until="networkidle")
            await page.pdf(
                path=output_path,
                format="A4",
                margin={"top": "0mm", "bottom": "0mm", "left": "0mm", "right": "0mm"},
                print_background=True,
            )
            await browser.close()
        return True
    except ImportError:
        logger.warning("Playwright not installed. Creating placeholder PDF.")
        _create_placeholder_pdf(output_path, html_content)
        return False
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}", exc_info=True)
        _create_placeholder_pdf(output_path, html_content)
        return False


def _create_placeholder_pdf(output_path: str, html_content: str):
    """Create a simple text-based placeholder when Playwright is unavailable."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet

        doc = SimpleDocTemplate(output_path, pagesize=A4)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Oxford Financial Ads - Invoice", styles["Title"]))
        story.append(Spacer(1, 20))
        story.append(Paragraph("PDF generation requires Playwright with Chromium.", styles["Normal"]))
        story.append(Paragraph("Install with: pip install playwright && playwright install chromium", styles["Normal"]))
        doc.build(story)
    except ImportError:
        with open(output_path, "w") as f:
            f.write("PDF generation unavailable. Install Playwright.\n")


async def generate_user_invoice(
    db: AsyncSession,
    user: User,
    invoice_type: str,
    amount: Optional[Decimal] = None,
    currency: str = "USDT",
    description: Optional[str] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    period_start: Optional[datetime] = None,
    period_end: Optional[datetime] = None,
    items: Optional[list] = None,
) -> Optional[Invoice]:
    """
    Generate a full invoice: create DB record, render HTML, produce PDF, store reference.
    """
    timestamp = datetime.now(timezone.utc)
    ts_str = timestamp.strftime("%Y%m%d%H%M%S")
    inv_number = f"INV-{invoice_type.upper()[:4]}-{user.id}-{ts_str}"

    if not description:
        type_labels = {
            "daily": f"Daily Transaction Summary",
            "weekly": f"Weekly Transaction Summary",
            "monthly": f"Monthly Transaction Summary",
            "deposit": f"Deposit Confirmation",
            "withdrawal": f"Withdrawal Confirmation",
            "statement": f"Full Account Statement",
        }
        description = type_labels.get(invoice_type, f"{invoice_type.replace('_', ' ').title()} Invoice")

    # Prepare balance summary
    balance_summary = {
        "main_wallet": float(user.main_wallet or 0),
        "deposit_wallet": float(user.deposit_wallet or 0),
        "withdraw_wallet": float(user.withdraw_wallet or 0),
        "referral_wallet": float(user.referral_wallet or 0),
        "generation_wallet": float(user.generation_wallet or 0),
        "arbx_wallet": float(user.arbx_wallet or 0),
    }

    html = _build_invoice_html(
        invoice_number=inv_number,
        invoice_type=invoice_type,
        user_name=user.full_name,
        user_email=user.email,
        amount=amount,
        currency=currency,
        status="generated",
        description=description or "",
        period_start=_format_date(period_start) if period_start else None,
        period_end=_format_date(period_end) if period_end else None,
        created_at=_format_date(timestamp),
        items=items or [],
        balance_summary=balance_summary,
    )

    # Save PDF
    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "invoices")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_filename = f"{inv_number}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)

    success = await generate_invoice_pdf(html, pdf_path)
    if not success:
        logger.warning(f"PDF generation failed for invoice {inv_number}")

    # Create DB record
    invoice = Invoice(
        user_id=user.id,
        invoice_type=invoice_type,
        invoice_number=inv_number,
        amount=amount,
        currency=currency,
        status="generated" if success else "failed",
        description=description,
        pdf_url=f"/storage/invoices/{pdf_filename}" if success else None,
        pdf_storage_key=pdf_filename if success else None,
        reference_id=reference_id,
        reference_type=reference_type,
        period_start=period_start,
        period_end=period_end,
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)
    return invoice


def _serialize_invoice(invoice: Invoice) -> dict:
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "invoice_type": invoice.invoice_type,
        "amount": float(invoice.amount) if invoice.amount else None,
        "currency": invoice.currency,
        "status": invoice.status,
        "description": invoice.description,
        "pdf_url": invoice.pdf_url,
        "reference_id": invoice.reference_id,
        "reference_type": invoice.reference_type,
        "period_start": invoice.period_start.isoformat() if invoice.period_start else None,
        "period_end": invoice.period_end.isoformat() if invoice.period_end else None,
        "emailed": invoice.emailed,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
    }
