"""
Invoice Service — generates PDF invoices using Playwright (Chromium).
Professional A4 format per-transaction invoices for deposits and withdrawals.
"""
import os
import base64
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.models.invoice import Invoice

logger = logging.getLogger(__name__)

INVOICE_CSS = """
<style>
    @page { margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #4F4F4F; font-size: 11px; line-height: 1.5; background: #fff; }
    .page { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }
    .content { flex: 1; padding: 30px 35px 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo-crest { width: 44px; height: 44px; flex-shrink: 0; }
    .company-name { font-size: 17px; font-weight: 700; color: #032F61; line-height: 1.2; }
    .company-sub { font-size: 10px; color: #7A7A7A; margin-top: 1px; }
    .header-right { text-align: right; }
    .invoice-title { font-size: 30px; font-weight: 800; color: #032F61; letter-spacing: 1px; line-height: 1; }
    .invoice-subtitle { font-size: 11px; color: #7A7A7A; margin-top: 4px; }
    .divider-line { border: none; border-top: 1px solid #E0E0E0; margin: 14px 0; }
    .contact-row { display: flex; gap: 36px; margin-bottom: 16px; font-size: 10px; color: #4F4F4F; flex-wrap: wrap; }
    .contact-row .col { display: flex; align-items: flex-start; gap: 5px; min-width: 180px; }
    .details-grid { display: flex; border: 1px solid #E0E0E0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .details-grid .side { flex: 1; padding: 10px 14px; }
    .details-grid .vdivider { width: 1px; background: #E0E0E0; }
    .detail-row { display: flex; justify-content: space-between; padding: 2px 0; font-size: 10px; }
    .detail-row .label { color: #7A7A7A; min-width: 85px; }
    .detail-row .value { color: #4F4F4F; font-weight: 600; text-align: right; }
    .box { border: 1px solid #E0E0E0; border-radius: 8px; margin-bottom: 14px; overflow: hidden; }
    .box-header { background: #032F61; color: #fff; padding: 9px 16px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
    .status-box { display: flex; border: 1px solid #E0E0E0; border-radius: 8px; margin-bottom: 14px; overflow: hidden; }
    .status-box .col { flex: 1; padding: 14px 16px; }
    .status-box .vdivider { width: 1px; background: #E0E0E0; }
    .status-label { font-size: 10px; color: #7A7A7A; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
    .status-row { display: flex; align-items: center; gap: 8px; }
    .icon-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon-circle.green { background: #0B8B41; }
    .icon-circle.red { background: #DC2626; }
    .icon-circle.yellow { background: #D97706; }
    .tx-type { font-size: 15px; font-weight: 700; }
    .tx-type.green { color: #0B8B41; }
    .tx-type.red { color: #DC2626; }
    .tx-type.yellow { color: #D97706; }
    .tx-sub { font-size: 10px; color: #7A7A7A; margin-top: 2px; }
    .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; color: #fff; }
    .status-badge.green { background: #0B8B41; }
    .status-badge.red { background: #DC2626; }
    .status-badge.yellow { background: #D97706; }
    .status-sub { font-size: 10px; color: #7A7A7A; margin-top: 4px; }
    .tx-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .tx-table td { padding: 7px 14px; border-bottom: 1px solid #E0E0E0; }
    .tx-table tr:last-child td { border-bottom: none; }
    .tx-table .label { color: #7A7A7A; width: 140px; background: #FAFAFA; font-weight: 600; }
    .tx-table .value { color: #4F4F4F; font-weight: 600; }
    .tx-table .val-green { color: #0B8B41; font-weight: 700; }
    .tx-table .val-blue { color: #032F61; font-weight: 700; }
    .summary-grid { display: flex; }
    .summary-grid .scol { flex: 1; padding: 14px 10px; text-align: center; }
    .summary-grid .sdivider { width: 1px; background: #E0E0E0; }
    .summary-label { font-size: 9px; color: #7A7A7A; text-transform: uppercase; letter-spacing: 0.3px; }
    .summary-value { font-size: 14px; font-weight: 700; color: #4F4F4F; margin-top: 4px; }
    .summary-value.green { color: #0B8B41; }
    .summary-value.large { font-size: 16px; }
    .notice { background: #E3F2FD; border: 1px solid #BBDEFB; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; }
    .notice-title { font-size: 11px; font-weight: 700; color: #032F61; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .notice ul { list-style: none; padding: 0; margin: 0; }
    .notice li { font-size: 10px; color: #4F4F4F; padding: 2px 0 2px 14px; position: relative; }
    .notice li::before { content: "\\2022"; position: absolute; left: 2px; color: #032F61; }
    .footer-info { display: flex; border-top: 1px solid #E0E0E0; padding: 14px 35px; background: #FAFAFA; }
    .footer-info .fcol { flex: 1; text-align: center; padding: 0 6px; }
    .footer-info .fcol .ftitle { font-size: 10px; font-weight: 700; color: #032F61; margin-bottom: 3px; }
    .footer-info .fcol .ftext { font-size: 9px; color: #7A7A7A; line-height: 1.4; }
    .footer-band { background: #032F61; padding: 14px 35px; text-align: center; }
    .footer-band p { color: #B78A32; font-size: 11px; line-height: 1.5; }
</style>
"""

# ── Helpers ──────────────────────────────────────────────────────────────────


def _fmt_date(dt) -> str:
    if not dt:
        return "-"
    if isinstance(dt, str):
        return dt
    return dt.strftime("%b %d, %Y %H:%M")


def _fmt_currency(val, decimals=2) -> str:
    try:
        v = float(val or 0)
        return f"${v:,.{decimals}f}"
    except (ValueError, TypeError):
        return "$0.00"


# ── HTML Template ───────────────────────────────────────────────────────────

_logo_cache: Optional[str] = None

def _get_logo_data_uri() -> str:
    global _logo_cache
    if _logo_cache:
        return _logo_cache
    logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "oxford.png")
    try:
        with open(logo_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        _logo_cache = f'<img src="data:image/png;base64,{b64}" alt="Oxford Financial Ads" style="width:44px;height:44px;object-fit:contain;border-radius:3px;" />'
    except FileNotFoundError:
        _logo_cache = '<div style="width:44px;height:44px;background:#032F61;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#B78A32;font-weight:700;font-size:14px;">OF</div>'
    return _logo_cache

def _build_invoice_html(
    invoice_number: str,
    invoice_type: str,
    user_name: str,
    user_email: str,
    amount: Optional[Decimal],
    currency: str,
    status: str,
    description: str,
    created_at: str,
    tx_data: Optional[dict] = None,
) -> str:
    """Build professional A4 invoice HTML matching the reference design."""
    is_deposit = invoice_type == "deposit"
    is_withdrawal = invoice_type == "withdrawal"
    sl = status.lower()
    is_ok = sl in ("completed", "approved", "paid", "success")
    is_pending = sl in ("pending", "processing")
    badge_cls = "green" if is_ok else "yellow" if is_pending else "red"
    badge_text = "Completed" if is_ok else "Pending" if is_pending else status.title()
    tx_cls = "green" if is_deposit else "red"
    tx_icon_cls = "green" if is_deposit else "red"
    tx_label = "Deposit" if is_deposit else "Withdrawal"
    tx_arrow = "↓" if is_deposit else "↑"

    fee = float(tx_data.get("fee", 0)) if tx_data else 0
    net_amount = float(amount or 0)
    total_amount = net_amount + fee

    logo_img = _get_logo_data_uri()

    tx_hash = tx_data.get("transaction_hash", "") if tx_data else ""
    tx_hash_display = tx_hash[:16] + "..." if len(tx_hash) > 16 else tx_hash
    bank_info = tx_data.get("bank_info", {}) if tx_data else {}
    network = tx_data.get("network", "") or bank_info.get("network", "")

    ref_col = ""
    ref_col += f'<div class="detail-row"><span class="label">Reference</span><span class="value">{invoice_number}</span></div>'
    if tx_hash:
        ref_col += f'<div class="detail-row"><span class="label">Tx Hash</span><span class="value">{tx_hash_display}</span></div>'
    ref_col += f'<div class="detail-row"><span class="label">Customer</span><span class="value">{user_name}</span></div>'
    ref_col += f'<div class="detail-row"><span class="label">Email</span><span class="value">{user_email}</span></div>'

    period_col = f'<div class="detail-row"><span class="label">Date</span><span class="value">{created_at}</span></div>'
    if bank_info:
        period_col += f'<div class="detail-row"><span class="label">Bank</span><span class="value">{bank_info.get("bank_name", "-")}</span></div>'
        period_col += f'<div class="detail-row"><span class="label">Account</span><span class="value">{bank_info.get("account_number", "-")[-4:].rjust(4, "*")}</span></div>'
    if network:
        period_col += f'<div class="detail-row"><span class="label">Network</span><span class="value">{network}</span></div>'

    amt_fmt = _fmt_currency(amount)

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice {invoice_number}</title>{INVOICE_CSS}</head>
<body>
<div class="page">
<div class="content">

  <div class="header">
    <div class="header-left">
      {logo_img}
      <div>
        <div class="company-name">Oxford Financial Ads</div>
        <div class="company-sub">Professional Financial Services</div>
      </div>
    </div>
    <div class="header-right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-subtitle">{invoice_number}</div>
    </div>
  </div>

  <hr class="divider-line">

  <div class="contact-row">
    <div class="col"><strong style="color:#032F61;">Email:</strong> support@oxfordfinancialads.com</div>
    <div class="col"><strong style="color:#032F61;">Phone:</strong> +44 20 7946 0958</div>
    <div class="col"><strong style="color:#032F61;">Web:</strong> www.oxfordfinancialads.com</div>
  </div>

  <div class="details-grid">
    <div class="side">{ref_col}</div>
    <div class="vdivider"></div>
    <div class="side">{period_col}</div>
  </div>

  <div class="status-box">
    <div class="col">
      <div class="status-label">Transaction Type</div>
      <div class="status-row">
        <div class="icon-circle {tx_icon_cls}"><span style="color:#fff;font-size:16px;font-weight:700;">{tx_arrow}</span></div>
        <div>
          <div class="tx-type {tx_cls}">{tx_label}</div>
          <div class="tx-sub">{description}</div>
        </div>
      </div>
    </div>
    <div class="vdivider"></div>
    <div class="col">
      <div class="status-label">Status</div>
      <div>
        <div class="status-badge {badge_cls}">{badge_text}</div>
        <div class="status-sub">{created_at}</div>
      </div>
    </div>
    <div class="vdivider"></div>
    <div class="col">
      <div class="status-label">Currency &amp; Amount</div>
      <div>
        <div class="tx-type" style="color:#032F61;">{amt_fmt}</div>
        <div class="tx-sub">{currency}</div>
      </div>
    </div>
  </div>

  <div class="box">
    <div class="box-header">{tx_label} Transaction Details</div>
    <table class="tx-table">
      <tr><td class="label">{tx_label} Amount</td><td class="value val-green">{amt_fmt}</td></tr>
      <tr><td class="label">Transaction Fee</td><td class="value">{_fmt_currency(fee)}</td></tr>
      <tr><td class="label">Total Amount</td><td class="value val-blue">{_fmt_currency(total_amount)}</td></tr>
      <tr><td class="label">Currency</td><td class="value">{currency}</td></tr>"""

    if network:
        html_mid = f'<tr><td class="label">Network</td><td class="value">{network}</td></tr>'
    else:
        html_mid = ""

    if bank_info:
        html_mid += f'<tr><td class="label">Bank Name</td><td class="value">{bank_info.get("bank_name", "-")}</td></tr>'
        html_mid += f'<tr><td class="label">Account Holder</td><td class="value">{bank_info.get("account_holder", "-")}</td></tr>'
        html_mid += f'<tr><td class="label">Account Number</td><td class="value">****{bank_info.get("account_number", "")[-4:]}</td></tr>'

    html_mid += f"""      <tr><td class="label">Reference</td><td class="value">{invoice_number}</td></tr>
      <tr><td class="label">Date</td><td class="value">{created_at}</td></tr>
    </table>
  </div>

  <div class="box">
    <div class="box-header">Amount Summary</div>
    <div class="summary-grid">
      <div class="scol"><div class="summary-label">Subtotal</div><div class="summary-value">{amt_fmt}</div></div>
      <div class="sdivider"></div>
      <div class="scol"><div class="summary-label">Fee</div><div class="summary-value">{_fmt_currency(fee)}</div></div>
      <div class="sdivider"></div>
      <div class="scol"><div class="summary-label">Total Amount</div><div class="summary-value green large">{_fmt_currency(total_amount)}</div></div>
    </div>
  </div>

  <div class="notice">
    <div class="notice-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#032F61" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Important Notice</div>
    <ul>
      <li>This invoice is computer-generated and does not require a physical signature.</li>
      <li>For any discrepancies, please contact support within 48 hours.</li>
      <li>Keep this invoice for your records. Do not share sensitive details publicly.</li>
    </ul>
  </div>

</div>

  <div class="footer-info">
    <div class="fcol"><div class="ftitle">Oxford Financial</div><div class="ftext">Regulated Financial<br>Services Provider</div></div>
    <div class="fcol"><div class="ftitle">Contact</div><div class="ftext">support@oxfordfinancialads.com<br>+44 20 7946 0958</div></div>
    <div class="fcol"><div class="ftitle">Office</div><div class="ftext">71 Queen Victoria Street<br>London EC4V 4AY, UK</div></div>
  </div>

  <div class="footer-band">
    <p>Oxford Financial Ads &mdash; Professional Financial Services &bull; www.oxfordfinancialads.com</p>
    <p style="font-size:9px;color:#B78A32;opacity:0.8;">This invoice is a confidential document. Unauthorised distribution is prohibited.</p>
  </div>

</div>
</body></html>"""


# ── PDF Generation ──────────────────────────────────────────────────────────


async def generate_invoice_pdf(html_content: str, output_path: str) -> bool:
    """Generate a PDF from HTML using Playwright (Chromium)."""
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


# ── Invoice Generators ──────────────────────────────────────────────────────


async def generate_transaction_invoice(
    db: AsyncSession,
    user: User,
    invoice_type: str,
    amount: Optional[Decimal] = None,
    currency: str = "USDT",
    status: str = "generated",
    description: Optional[str] = None,
    reference_id: Optional[int] = None,
    reference_type: Optional[str] = None,
    tx_data: Optional[dict] = None,
) -> Optional[Invoice]:
    """Generate a per-transaction invoice: DB record, HTML, PDF."""
    timestamp = datetime.now(timezone.utc)
    ts_str = timestamp.strftime("%Y%m%d%H%M%S")
    inv_number = f"INV-{invoice_type.upper()[:4]}-{user.id}-{ts_str}"

    if not description:
        type_labels = {
            "deposit": "Deposit Confirmation",
            "withdrawal": "Withdrawal Confirmation",
        }
        description = type_labels.get(invoice_type, f"{invoice_type.replace('_', ' ').title()} Invoice")

    html = _build_invoice_html(
        invoice_number=inv_number,
        invoice_type=invoice_type,
        user_name=user.full_name or user.email,
        user_email=user.email,
        amount=amount,
        currency=currency,
        status=status,
        description=description,
        created_at=_fmt_date(timestamp),
        tx_data=tx_data,
    )

    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "invoices")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_filename = f"{inv_number}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)

    success = await generate_invoice_pdf(html, pdf_path)
    if not success:
        logger.warning(f"PDF generation failed for invoice {inv_number}")

    invoice = Invoice(
        user_id=user.id,
        invoice_type=invoice_type,
        invoice_number=inv_number,
        amount=amount,
        currency=currency,
        status=status if success else "failed",
        description=description,
        pdf_url=f"/storage/invoices/{pdf_filename}" if success else None,
        pdf_storage_key=pdf_filename if success else None,
        reference_id=reference_id,
        reference_type=reference_type,
    )
    db.add(invoice)
    await db.flush()
    await db.refresh(invoice)
    return invoice


async def generate_deposit_invoice(
    db: AsyncSession,
    user: User,
    deposit: Deposit,
    status: str = "completed",
    tx_data: Optional[dict] = None,
) -> Optional[Invoice]:
    """Generate an invoice for a deposit transaction."""
    data = tx_data or {}
    return await generate_transaction_invoice(
        db=db,
        user=user,
        invoice_type="deposit",
        amount=deposit.amount,
        currency="USDT",
        status=status,
        description=f"Deposit of {_fmt_currency(deposit.amount)} via {data.get('network', 'bank')}",
        reference_id=deposit.id,
        reference_type="deposit",
        tx_data=data,
    )


async def generate_withdrawal_invoice(
    db: AsyncSession,
    user: User,
    withdrawal: Withdrawal,
    status: str = "completed",
    tx_data: Optional[dict] = None,
) -> Optional[Invoice]:
    """Generate an invoice for a withdrawal transaction."""
    data = tx_data or {}
    return await generate_transaction_invoice(
        db=db,
        user=user,
        invoice_type="withdrawal",
        amount=withdrawal.amount,
        currency="USDT",
        status=status,
        description=f"Withdrawal of {_fmt_currency(withdrawal.amount)} via {data.get('network', 'bank')}",
        reference_id=withdrawal.id,
        reference_type="withdrawal",
        tx_data=data,
    )


def serialize_invoice(invoice: Invoice) -> dict:
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
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
    }
