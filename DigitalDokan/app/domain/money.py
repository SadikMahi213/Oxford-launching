"""Deterministic monetary arithmetic for BDT (Rule 5: never float for money)."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import Union

TWOPLACES = Decimal("0.01")
MoneyLike = Union[str, int, float, Decimal]


def to_money(value: MoneyLike) -> Decimal:
    """Convert to Decimal quantized to 2 places. Floats are rejected unless finite
    and are converted via str() to avoid binary representation leakage."""
    if isinstance(value, Decimal):
        d = value
    elif isinstance(value, int):
        d = Decimal(value)
    elif isinstance(value, float):
        if not (value == value and value not in (float("inf"), float("-inf"))):
            raise ValueError("Invalid monetary value")
        d = Decimal(str(value))
    elif isinstance(value, str):
        try:
            d = Decimal(value.strip() or "0")
        except InvalidOperation as e:
            raise ValueError(f"Invalid monetary value: {value!r}") from e
    else:
        raise TypeError(f"Unsupported monetary type: {type(value)}")
    return d.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def money_add(a: MoneyLike, b: MoneyLike) -> Decimal:
    return (to_money(a) + to_money(b)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def money_sub(a: MoneyLike, b: MoneyLike) -> Decimal:
    return (to_money(a) - to_money(b)).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def money_mul(a: MoneyLike, qty: MoneyLike) -> Decimal:
    q = Decimal(str(qty))
    return (to_money(a) * q).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def money_pct(base: MoneyLike, pct: MoneyLike) -> Decimal:
    p = Decimal(str(pct))
    if p < 0 or p > 100:
        raise ValueError("Percent must be within 0..100")
    return (to_money(base) * p / Decimal("100")).quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def format_bdt(value: MoneyLike, symbol: str = "৳") -> str:
    d = to_money(value)
    return f"{symbol}{d:,.2f}"
