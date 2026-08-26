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
from app.utils.transaction_id import generate_unique_transaction_id

logger = logging.getLogger(__name__)

COMPANY_INFO = {
    "name": "Oxford Financial Ads",
    "description": "Global Digital Advertising Platform",
    "address": "25 Business Square, Canary District, London, EC2A 4AB, United Kingdom",
    "email": "support.oxfordfinancialads@gmail.com",
    "website": "www.oxfordfinancialads.com",}

BUSINESS_HOURS = "24/7 Online Operations & Support"
SUPPORT_CONTACT = "support.oxfordfinancialads@gmail.com"
FOOTER_NOTES = "Serving Members Worldwide | 24/7 Online Operations & Support"

INVOICE_CSS = """
<style>
    @page { margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #2c2c2c; font-size: 12.5px; line-height: 1.25; background: #fff; }
    .page { width: 210mm; height: 297mm; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
    .content { padding: 8px 18px 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
    .header-left { display: flex; align-items: center; gap: 8px; }
    .logo-crest { width: 32px; height: 32px; flex-shrink: 0; }
    .company-name { font-size: 17px; font-weight: 800; color: #032F61; line-height: 1.15; }
    .company-sub { font-size: 10px; color: #6b7280; margin-top: 1px; }
    .header-right { text-align: right; }
    .invoice-title { font-size: 26px; font-weight: 800; color: #032F61; letter-spacing: 1.5px; line-height: 1; }
    .invoice-subtitle { font-size: 10px; color: #6b7280; margin-top: 2px; font-family: 'Courier New', monospace; }
    .divider-line { border: none; border-top: 2px solid #032F61; margin: 2px 0; }
    .accent-bar { height: 3px; background: linear-gradient(90deg, #032F61, #1a56a0, #B78A32); margin: 0 0 3px 0; border-radius: 2px; }
    .contact-row { display: flex; gap: 8px; margin-bottom: 3px; font-size: 9.5px; color: #555; flex-wrap: wrap; }
    .contact-row .col { display: flex; align-items: flex-start; gap: 3px; min-width: 120px; }
    .details-grid { display: flex; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 3px; overflow: hidden; }
    .details-grid .side { flex: 1; padding: 3px 7px; }
    .details-grid .vdivider { width: 1px; background: #d1d5db; }
    .detail-row { display: flex; justify-content: space-between; padding: 1.5px 0; font-size: 10px; }
    .detail-row .label { color: #6b7280; min-width: 70px; font-weight: 600; }
    .detail-row .value { color: #1f2937; font-weight: 700; text-align: right; }
    .box { border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 2.5px; overflow: hidden; }
    .box-header { background: #032F61; color: #fff; padding: 4px 9px; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; display: flex; align-items: center; gap: 5px; }
    .box-header svg { flex-shrink: 0; }
    .status-box { display: flex; border: 1px solid #d1d5db; border-radius: 4px; margin-bottom: 2.5px; overflow: hidden; }
    .status-box .col { flex: 1; padding: 4px 7px; }
    .status-box .vdivider { width: 1px; background: #d1d5db; }
    .status-label { font-size: 9px; color: #6b7280; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.4px; }
    .status-row { display: flex; align-items: center; gap: 5px; }
    .icon-circle { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .icon-circle.green { background: #059669; }
    .icon-circle.red { background: #DC2626; }
    .icon-circle.yellow { background: #D97706; }
    .tx-type { font-size: 14px; font-weight: 700; }
    .tx-type.green { color: #059669; }
    .tx-type.red { color: #DC2626; }
    .tx-type.yellow { color: #D97706; }
    .tx-sub { font-size: 9.5px; color: #6b7280; margin-top: 1px; }
    .status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 12px; font-size: 10.5px; font-weight: 700; color: #fff; }
    .status-badge.green { background: #059669; }
    .status-badge.red { background: #DC2626; }
    .status-badge.yellow { background: #D97706; }
    .status-sub { font-size: 9.5px; color: #6b7280; margin-top: 1px; }
    .tx-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .tx-table td { padding: 2px 7px; border-bottom: 1px solid #e5e7eb; }
    .tx-table tr:last-child td { border-bottom: none; }
    .tx-table .label { color: #6b7280; width: 130px; background: #f9fafb; font-weight: 600; }
    .tx-table .value { color: #1f2937; font-weight: 600; }
    .tx-table .val-green { color: #059669; font-weight: 700; }
    .tx-table .val-blue { color: #1a56a0; font-weight: 700; }
    .summary-grid { display: flex; }
    .summary-grid .scol { flex: 1; padding: 4px 3px; text-align: center; }
    .summary-grid .sdivider { width: 1px; background: #d1d5db; }
    .summary-label { font-size: 8.5px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.4px; }
    .summary-value { font-size: 15px; font-weight: 800; color: #1f2937; margin-top: 1px; }
    .summary-value.green { color: #059669; }
    .summary-value.large { font-size: 17px; }
    .notice { background: #F0FDF4; border: 1px solid #86efac; border-radius: 4px; padding: 3px 9px; margin-bottom: 2px; }
    .notice-title { font-size: 10.5px; font-weight: 700; color: #166534; margin-bottom: 2px; display: flex; align-items: center; gap: 4px; }
    .notice ul { list-style: none; padding: 0; margin: 0; }
    .notice li { font-size: 9.5px; color: #4b5563; padding: 0.5px 0 0.5px 12px; position: relative; }
    .notice li::before { content: "\2713"; position: absolute; left: 0; color: #059669; font-weight: 700; }
    .footer-info { display: flex; border-top: 1px solid #d1d5db; padding: 4px 18px; background: #f9fafb; }
    .footer-info .fcol { flex: 1; text-align: center; padding: 0 3px; }
    .footer-info .fcol .ftitle { font-size: 10px; font-weight: 700; color: #032F61; margin-bottom: 1px; }
    .footer-info .fcol .ftext { font-size: 9px; color: #6b7280; line-height: 1.15; }
    .footer-band { background: linear-gradient(135deg, #032F61, #0a4180); padding: 4px 18px; text-align: center; }
    .footer-band p { color: #FCD34D; font-size: 9.5px; line-height: 1.15; }
</style>"""

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
        return f"{v:,.{decimals}f} USDT"
    except (ValueError, TypeError):
        return "0.00 USDT"


def _sanitize_transaction_id(txid: str) -> str:
    """Ensure a transaction ID is never purely numeric. If it is, prefix with 'TXN-'."""
    if not txid:
        return txid
    if txid.isdigit():
        return f"TXN-{txid}"
    return txid


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
        _logo_cache = f'<img src="data:image/png;base64,{b64}" alt="Oxford Financial Ads" style="width:36px;height:36px;object-fit:contain;border-radius:3px;" />'
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
    *,
    user_id: Optional[str] = None,
    
    payment_method: Optional[str] = None,
    remarks: Optional[str] = None,
    prev_balance: Optional[float] = None,
    current_balance: Optional[float] = None,
    main_wallet_balance: Optional[float] = None,
    account_holder_name: Optional[str] = None,
    company_info: Optional[dict] = None,
    business_hours: Optional[str] = None,
    support_contact: Optional[str] = None,
    footer_notes: Optional[str] = None,
) -> str:
    """Build professional A4 invoice HTML matching the reference design."""
    ci = company_info or COMPANY_INFO
    bhours = business_hours or BUSINESS_HOURS
    scontact = support_contact or SUPPORT_CONTACT
    fnotes = footer_notes or FOOTER_NOTES

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
    tx_id_val = tx_data.get("transaction_id", "") if tx_data else ""
    pm = payment_method or network or (bank_info.get("bank_name", "") if bank_info else "") or "-"

    amt_fmt = _fmt_currency(amount)
    amt_sign = "+" if is_deposit else "-"
    prev_bal_fmt = _fmt_currency(prev_balance) if prev_balance is not None else "-"
    curr_bal_fmt = _fmt_currency(current_balance) if current_balance is not None else "-"
    if main_wallet_balance is None and tx_data:
        raw_mw = tx_data.get("main_wallet_balance")
        main_wallet_balance = float(raw_mw) if raw_mw is not None else None
    mw_bal_fmt = _fmt_currency(main_wallet_balance) if main_wallet_balance is not None else "-"
    wallet_name = tx_data.get("wallet_name", "Main Wallet") if tx_data else "Main Wallet"
    raw_wb = tx_data.get("wallet_balance") if tx_data else None
    wallet_balance_val = float(raw_wb) if raw_wb is not None else main_wallet_balance
    wallet_balance_fmt = _fmt_currency(wallet_balance_val) if wallet_balance_val is not None else "-"

    ref_col = ""
    ref_col += f'<div class="detail-row"><span class="label">Invoice No</span><span class="value">{invoice_number}</span></div>'
    if is_deposit and tx_id_val:
        ref_col += f'<div class="detail-row"><span class="label">Deposit TX ID</span><span class="value">{_sanitize_transaction_id(tx_id_val)}</span></div>'
    elif is_withdrawal and tx_id_val:
        ref_col += f'<div class="detail-row"><span class="label">Withdrawal Ref ID</span><span class="value">{_sanitize_transaction_id(tx_id_val)}</span></div>'
    elif tx_id_val:
        ref_col += f'<div class="detail-row"><span class="label">Transaction ID</span><span class="value">{_sanitize_transaction_id(tx_id_val)}</span></div>'
    if tx_hash and tx_hash != tx_id_val:
        ref_col += f'<div class="detail-row"><span class="label">Tx Hash</span><span class="value">{_sanitize_transaction_id(tx_hash_display)}</span></div>'
    ref_col += f'<div class="detail-row"><span class="label">User ID</span><span class="value">{user_id or "-"}</span></div>'
    ref_col += f'<div class="detail-row"><span class="label">Customer</span><span class="value">{user_name}</span></div>'
    ref_col += f'<div class="detail-row"><span class="label">Email</span><span class="value">{user_email}</span></div>'

    period_col = f'<div class="detail-row"><span class="label">Date</span><span class="value">{created_at}</span></div>'
    if account_holder_name:
        period_col += f'<div class="detail-row"><span class="label">Account Holder</span><span class="value">{account_holder_name}</span></div>'
    if bank_info:
        period_col += f'<div class="detail-row"><span class="label">Bank</span><span class="value">{bank_info.get("bank_name", "-")}</span></div>'
        period_col += f'<div class="detail-row"><span class="label">Account</span><span class="value">{bank_info.get("account_number", "-")[-4:].rjust(4, "*")}</span></div>'
    if network:
        period_col += f'<div class="detail-row"><span class="label">Network</span><span class="value">{network}</span></div>'

    html_mid_rows = ""
    if remarks:
        html_mid_rows += f'<tr><td class="label">Remarks / Notes</td><td class="value">{remarks}</td></tr>'
    if network:
        html_mid_rows += f'<tr><td class="label">Network</td><td class="value">{network}</td></tr>'
    if bank_info:
        html_mid_rows += f'<tr><td class="label">Bank Name</td><td class="value">{bank_info.get("bank_name", "-")}</td></tr>'
        html_mid_rows += f'<tr><td class="label">Account Holder</td><td class="value">{bank_info.get("account_holder", "-")}</td></tr>'
        html_mid_rows += f'<tr><td class="label">Account Number</td><td class="value">****{bank_info.get("account_number", "")[-4:]}</td></tr>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Invoice {invoice_number}</title>{INVOICE_CSS}</head>
<body>
<div class="page">
<div class="content">

  <div class="header">
    <div class="header-left">
      {logo_img}
      <div>
        <div class="company-name">{ci["name"]}</div>
        <div class="company-sub">{ci.get("description", "")}</div>
      </div>
    </div>
    <div class="header-right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-subtitle">{invoice_number}</div>
    </div>
  </div>

  <hr class="divider-line">
  <div class="accent-bar"></div>

  <div class="contact-row">
    <div class="col"><span style="color:#032F61;font-weight:700;">&#9906;</span> {ci["address"]}</div>
    <div class="col"><span style="color:#032F61;font-weight:700;">&#9993;</span> {ci["email"]}</div>
    <div class="col"><span style="color:#032F61;font-weight:700;">&#127760;</span> {ci["website"]}</div>
  </div>
  <div style="text-align:center;font-size:8px;color:#6b7280;margin-bottom:3px;padding:2px 0;border-top:1px solid #d1d5db;border-bottom:1px solid #d1d5db;">
    {ci["description"]} | Serving Members Worldwide | 24/7 Online Operations &amp; Support
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
      <div class="status-label">Current Status</div>
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
    <div class="box-header"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> {tx_label} Transaction Details</div>
    <table class="tx-table">
      <tr><td class="label">Transaction Type</td><td class="value">{tx_label}</td></tr>
      <tr><td class="label">Current Status</td><td class="value">{badge_text}</td></tr>
      {"<tr><td class=\"label\">Deposit Transaction ID</td><td class=\"value\">" + _sanitize_transaction_id(tx_id_val) + "</td></tr>" if is_deposit and tx_id_val else ""}
      {"<tr><td class=\"label\">Withdrawal Reference ID</td><td class=\"value\">" + _sanitize_transaction_id(tx_id_val) + "</td></tr>" if is_withdrawal and tx_id_val else ""}
      {"<tr><td class=\"label\">Transaction ID</td><td class=\"value\">" + _sanitize_transaction_id(tx_id_val) + "</td></tr>" if not is_deposit and not is_withdrawal and tx_id_val else ""}
      <tr><td class="label">Invoice Number</td><td class="value val-blue">{invoice_number}</td></tr>
      <tr><td class="label">Payment Method</td><td class="value">{pm}</td></tr>
      <tr><td class="label">{tx_label} Amount</td><td class="value val-green">{amt_fmt}</td></tr>
      <tr><td class="label">Processing Fee</td><td class="value">{_fmt_currency(fee)}</td></tr>
      <tr><td class="label">Total Amount</td><td class="value val-blue">{_fmt_currency(total_amount)}</td></tr>
      <tr><td class="label">Transaction Date &amp; Time</td><td class="value">{created_at}</td></tr>
      {html_mid_rows}
    </table>
  </div>

  <div class="box">
    <div class="box-header"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg> Amount Summary</div>
    <div class="summary-grid">
      <div class="scol"><div class="summary-label">Subtotal</div><div class="summary-value">{amt_fmt}</div></div>
      <div class="sdivider"></div>
      <div class="scol"><div class="summary-label">Fee</div><div class="summary-value">{_fmt_currency(fee)}</div></div>
      <div class="sdivider"></div>
      <div class="scol"><div class="summary-label">Total Amount</div><div class="summary-value green large">{_fmt_currency(total_amount)}</div></div>
    </div>
  </div>

  <div class="box">
    <div class="box-header"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Account Summary</div>
    <table class="tx-table">
      <tr><td class="label">Transaction Amount</td><td class="value val-green">{amt_sign} {amt_fmt}</td></tr>
      <tr><td class="label">Processing Fee</td><td class="value">{_fmt_currency(fee)}</td></tr>
      <tr><td class="label">Total Amount</td><td class="value val-blue">{_fmt_currency(total_amount)}</td></tr>
      <tr><td class="label" style="padding-top:6px;border-top:1px solid #E0E0E0;">{wallet_name} Balance</td><td class="value val-blue" style="padding-top:6px;border-top:1px solid #E0E0E0;font-size:13px;">{wallet_balance_fmt}</td></tr>
    </table>
  </div>

  <div class="notice">
    <div class="notice-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg> Important Notice</div>
    <ul>
      <li>This invoice is computer-generated and does not require a physical signature.</li>
      <li>For any discrepancies, please contact support within 48 hours.</li>
      <li>Keep this invoice for your records. Do not share sensitive details publicly.</li>
    </ul>
  </div>

</div>

  <div class="footer-info">
    <div class="fcol"><div class="ftitle">{ci["name"]}</div><div class="ftext">{ci.get("description", "")}</div></div>
    <div class="fcol"><div class="ftitle">Business Hours</div><div class="ftext">{bhours}</div></div>
    <div class="fcol"><div class="ftitle">Support</div><div class="ftext">{scontact}</div></div>
  </div>

  <div class="footer-band">
    <p>{ci["name"]} &mdash; {ci.get("description", "")} &bull; {ci["website"]}</p>
    <p style="font-size:8px;color:#B78A32;opacity:0.8;">{ci["address"]} | {ci["email"]}</p>
    <p style="font-size:7px;color:#B78A32;opacity:0.7;">{fnotes}</p>
  </div>

</div>
</body></html>"""


# ── PDF Generation ──────────────────────────────────────────────────────────


async def generate_invoice_pdf(html_content: str, output_path: str) -> bool:
    """Generate a PDF from HTML using Playwright (Chromium).

    Never raises: PDF generation is best-effort. If the PDF cannot be written
    (e.g. missing permissions), a placeholder is attempted and False is returned
    so that invoice DB record creation can still proceed.
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
        try:
            _create_placeholder_pdf(output_path, html_content)
        except Exception as e:
            logger.warning(f"Failed to create placeholder PDF: {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to generate PDF: {e}", exc_info=True)
        try:
            _create_placeholder_pdf(output_path, html_content)
        except Exception as pe:
            logger.warning(f"Failed to create placeholder PDF: {pe}")
        return False


def _create_placeholder_pdf(output_path: str, html_content: str):
    """Create a simple text-based placeholder when Playwright is unavailable.

    Never raises: placeholder creation must not abort invoice generation.
    """
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
        try:
            with open(output_path, "w") as f:
                f.write("PDF generation unavailable. Install Playwright.\n")
        except OSError as e:
            logger.warning(f"Could not write placeholder PDF to {output_path}: {e}")
    except OSError as e:
        logger.warning(f"Could not write placeholder PDF to {output_path}: {e}")


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
    type_code = {
        "deposit": "DEPO", "withdrawal": "WITH", "daily": "DAIL",
        "weekly": "WEEK", "monthly": "MNTH", "statement": "STMT",
        "investment": "INVT", "referral_bonus": "RBNS",
        "matching_bonus": "MBON", "captcha_earning": "CAPT",
        "ad_view_earning": "ADVW", "mining_reward": "MINE",
    }.get(invoice_type, invoice_type.upper()[:4])
    inv_number = f"INV-{type_code}-{user.id}-{ts_str}"

    if not description:
        type_labels = {
            "deposit": "Deposit Confirmation",
            "withdrawal": "Withdrawal Confirmation",
            "daily": "Daily Earnings Statement",
            "weekly": "Weekly Earnings Statement",
            "monthly": "Monthly Earnings Statement",
            "statement": "Account Statement",
            "investment": "Investment Confirmation",
            "referral_bonus": "Referral Bonus Credit",
            "matching_bonus": "Matching Bonus Credit",
            "captcha_earning": "CAPTCHA Task Earnings",
            "ad_view_earning": "Ad View Earnings",
            "mining_reward": "Mining Reward Credit",
        }
        description = type_labels.get(invoice_type, f"{invoice_type.replace('_', ' ').title()} Invoice")

    
    user_id_str = user.user_no or str(user.id)
    account_holder_name = user.full_name or None
    raw_prev = tx_data.get("previous_balance") if tx_data else None
    raw_curr = tx_data.get("current_balance") if tx_data else None
    prev_balance = float(raw_prev) if raw_prev is not None else None
    current_balance = float(raw_curr) if raw_curr is not None else None
    raw_mw = tx_data.get("main_wallet_balance") if tx_data else None
    main_wallet_balance = float(raw_mw) if raw_mw is not None else None
    payment_method = tx_data.get("payment_method") if tx_data else None
    remarks = tx_data.get("remarks") if tx_data else None

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
        user_id=user_id_str,
        
        payment_method=payment_method,
        remarks=remarks,
        prev_balance=prev_balance,
        current_balance=current_balance,
        main_wallet_balance=main_wallet_balance,
        account_holder_name=account_holder_name,
    )

    pdf_dir = os.path.join(os.path.dirname(__file__), "..", "..", "storage", "invoices")
    os.makedirs(pdf_dir, exist_ok=True)
    pdf_filename = f"{inv_number}.pdf"
    pdf_path = os.path.join(pdf_dir, pdf_filename)

    success = await generate_invoice_pdf(html, pdf_path)
    if not success:
        logger.warning(f"PDF generation failed for invoice {inv_number}")

    raw_txid = (tx_data or {}).get("transaction_id", "") or ""
    if raw_txid:
        transaction_id = raw_txid
    else:
        transaction_id = await generate_unique_transaction_id(db, Invoice)

    if tx_data is not None:
        tx_data["transaction_id"] = transaction_id
    else:
        tx_data = {"transaction_id": transaction_id}

    invoice = Invoice(
        user_id=user.id,
        invoice_type=invoice_type,
        invoice_number=inv_number,
        transaction_id=transaction_id,
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
    data = dict(tx_data or {})
    if "fee" not in data:
        data.setdefault("fee", 0)
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
    data = dict(tx_data or {})
    if "fee" not in data and withdrawal.charge is not None:
        data["fee"] = float(withdrawal.charge)
    if "remarks" not in data and withdrawal.note:
        data["remarks"] = withdrawal.note
    if "bank_info" not in data and withdrawal.bank_info:
        bi = withdrawal.bank_info
        data["bank_info"] = {
            "bank_name": getattr(bi, "bank_name", ""),
            "account_holder": getattr(bi, "account_holder", ""),
            "account_number": getattr(bi, "account_number", ""),
            "network": getattr(bi, "network", withdrawal.network_name or ""),
        }
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
        "transaction_id": invoice.transaction_id,
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
