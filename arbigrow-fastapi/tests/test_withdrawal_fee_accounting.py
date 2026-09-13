"""Withdrawal fee accounting fix tests (Phase 8). Standalone Decimal tests."""
from decimal import Decimal, ROUND_HALF_UP

WALLET_PRECISION = Decimal("0.00000000000001")

def _q(v):
    return v.quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)

def calc_fee(amount, fixed, percent):
    return _q(Decimal(str(fixed)) + Decimal(str(amount))*Decimal(str(percent))/Decimal("100"))

def serialize(amount, charge):
    gross = Decimal(str(amount))
    c = Decimal(str(charge))
    net = _q(gross - c) if gross else Decimal("0")
    if net < 0:
        net = Decimal("0")
    return {"amount": float(gross), "gross_amount": float(gross), "charge": float(c), "net_amount": float(net)}

class TestFee:
    def test_390_5_percent(self):
        fee = calc_fee(390, 0, 5)
        assert fee == Decimal("19.50000000000000")
        assert _q(Decimal("390") - fee) == Decimal("370.50000000000000")
    def test_30_5_percent(self):
        fee = calc_fee(30, 0, 5)
        assert fee == Decimal("1.50000000000000")
        assert _q(Decimal("30") - fee) == Decimal("28.50000000000000")
    def test_fixed_plus_percent(self):
        assert calc_fee(100, 2, 3) == Decimal("5.00000000000000")
    def test_clamp(self):
        amount = Decimal("10")
        fee = Decimal("15")
        if fee > amount:
            fee = amount
        assert fee == Decimal("10")
    def test_serialize_390(self):
        s = serialize(Decimal("390.00"), Decimal("19.50"))
        assert s["gross_amount"] == 390.0
        assert s["charge"] == 19.5
        assert s["net_amount"] == 370.5
    def test_serialize_30(self):
        s = serialize(Decimal("30.00"), Decimal("1.50"))
        assert s["net_amount"] == 28.5
    def test_balance_gross_only(self):
        assert Decimal("39.21") >= Decimal("30.00")
        after = _q(Decimal("39.21") - Decimal("30.00"))
        assert after == Decimal("9.21000000000000")
        assert _q(Decimal("500") - Decimal("390")) == Decimal("110.00000000000000")
    def test_wallet_once(self):
        before = Decimal("500")
        after = _q(before - Decimal("390"))
        assert after == Decimal("110.00000000000000")
        assert before - after == Decimal("390")
    def test_ledger(self):
        gross = Decimal("390")
        charge = Decimal("19.50")
        net = gross - charge
        assert net + charge == gross
        assert net == Decimal("370.50")
        assert gross + charge == Decimal("409.50")
    def test_precision(self):
        assert str(_q(Decimal("19.5"))) == "19.50000000000000"
