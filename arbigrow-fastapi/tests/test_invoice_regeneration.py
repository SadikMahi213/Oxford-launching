"""Invoice PDF regeneration fallback (download of orphaned files).

Covers Phase 2: PDFs live on ephemeral local disk, so container rebuilds
orphan previously generated files while their DB rows survive. The download
endpoint regenerates the identical-layout document from authoritative
records instead of 404ing.

- missing file + valid deposit reference -> True, real file written,
  invoice financial fields untouched
- unknown reference type -> False (caller keeps existing 404)
- missing deposit row -> False
- missing storage key -> False

No real database is touched (FakeSession); Playwright is stubbed; the probe
file is removed afterwards.
"""
import os
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.models.deposit import Deposit
from app.models.invoice import Invoice
from app.models.user import User
from app.services import invoice_service
from app.services.invoice_service import regenerate_invoice_pdf


class FakeResult:
    def __init__(self, obj=None):
        self.obj = obj

    def scalar_one_or_none(self):
        return self.obj


class FakeSession:
    def __init__(self, user=None, deposit=None):
        self.user = user
        self.deposit = deposit

    async def execute(self, stmt):
        sql = str(stmt.compile(compile_kwargs={"literal_binds": True}))
        if "FROM deposits" in sql:
            return FakeResult(self.deposit)
        if "FROM users" in sql:
            return FakeResult(self.user)
        return FakeResult(None)


def _user():
    return User(
        id=2,
        user_no="55252766996",
        full_name="John Example",
        email="john@example.com",
        main_wallet=Decimal("10"),
        deposit_wallet=Decimal("20"),
    )


def _deposit():
    return Deposit(
        id=1, user_id=2, amount=Decimal("100"),
        network_name="TRC20", txid="probehash123",
    )


def _invoice(key="TEST-PROBE-regen.pdf"):
    return Invoice(
        id=9001, user_id=2, invoice_type="deposit",
        invoice_number="OFA009001", transaction_id="probehash123",
        amount=Decimal("100"), currency="USDT", status="completed",
        description="Deposit of 100.00 USDT via TRC20",
        reference_id=1, reference_type="deposit",
        pdf_url="/storage/invoices/" + key, pdf_storage_key=key,
        created_at=datetime.now(timezone.utc),
    )


def _probe_path(key):
    base = os.path.join(
        os.path.dirname(invoice_service.__file__), "..", "..",
        "storage", "invoices",
    )
    return os.path.normpath(os.path.join(base, key))


@pytest.fixture
def stub_pdf(monkeypatch):
    async def _fake(html, path):
        assert "OFA009001" in html
        assert "John Example" in html
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(b"%PDF-1.4 stub")
        return True

    monkeypatch.setattr(invoice_service, "generate_invoice_pdf", _fake)


def _run(coro):
    import asyncio
    return asyncio.run(coro)


def test_regenerate_missing_file_from_deposit(stub_pdf):
    key = "TEST-PROBE-regen.pdf"
    path = _probe_path(key)
    if os.path.exists(path):
        os.remove(path)
    try:
        inv = _invoice(key)
        ok = _run(regenerate_invoice_pdf(FakeSession(_user(), _deposit()), inv))
        assert ok is True
        assert os.path.exists(path)
        with open(path, "rb") as f:
            assert f.read(8) == b"%PDF-1.4"
        # Financial fields untouched.
        assert inv.amount == Decimal("100")
        assert inv.status == "completed"
        assert inv.invoice_number == "OFA009001"
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_regenerate_unknown_type_returns_false(stub_pdf):
    inv = _invoice()
    inv.reference_type = "mystery"
    assert _run(regenerate_invoice_pdf(FakeSession(_user(), _deposit()), inv)) is False


def test_regenerate_missing_deposit_returns_false(stub_pdf):
    inv = _invoice()
    assert _run(regenerate_invoice_pdf(FakeSession(_user(), None), inv)) is False


def test_regenerate_missing_key_returns_false(stub_pdf):
    inv = _invoice()
    inv.pdf_storage_key = None
    assert _run(regenerate_invoice_pdf(FakeSession(_user(), _deposit()), inv)) is False
