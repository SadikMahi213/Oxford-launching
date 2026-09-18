"""Promotion engine, Release-2 subset (§20): percent, fixed, category %, group %.

Deterministic and auditable by design:
- exactly ONE promotion applies per sale (the largest eligible discount;
  ties break by lowest promotion id),
- the discount is stored invoice-level (sales.promotion_id + promotion_discount)
  so line math — and reconcile.check_sale — stays exact,
- every application is traceable to a promotion row with validity window.
"""
from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from decimal import Decimal

from app.domain.money import to_money

KINDS = ("percent", "fixed", "category_percent", "group_percent")


@dataclass
class PromotionResult:
    promotion_id: int
    name: str
    discount: Decimal


def create_promotion(conn: sqlite3.Connection, data: dict, session=None) -> int:
    if session is not None:
        session.require("discount.apply")
    kind = data.get("kind", "")
    if kind not in KINDS:
        raise ValueError(f"Unknown promotion kind: {kind!r}")
    value = Decimal(str(data.get("value", 0)))
    if kind in ("percent", "category_percent", "group_percent") and not (0 < value <= 100):
        raise ValueError("Percent promotions must be within 0..100")
    if kind == "fixed" and value <= 0:
        raise ValueError("Fixed promotion must be positive")
    if kind == "category_percent" and not str(data.get("target", "")).strip():
        raise ValueError("Category promotion needs a category id target")
    if kind == "group_percent" and not str(data.get("target", "")).strip():
        raise ValueError("Customer-group promotion needs a group id target")
    cur = conn.execute(
        """INSERT INTO promotions(name, kind, scope, target, value, min_qty, start_at, end_at, is_active)
           VALUES(?,?,?,?,?,?,?,?,?)""",
        (data.get("name", kind), kind, data.get("scope", "invoice"), str(data.get("target", "")),
         str(value), str(Decimal(str(data.get("min_qty", 0)))),
         data.get("start_at"), data.get("end_at"), int(bool(data.get("is_active", True)))))
    conn.commit()
    return int(cur.lastrowid)


def _now_utc() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def active_promotions(conn: sqlite3.Connection, at: str | None = None) -> list[dict]:
    now = at or _now_utc()
    return [dict(r) for r in conn.execute(
        """SELECT * FROM promotions WHERE is_active=1
           AND (start_at IS NULL OR start_at='' OR start_at <= ?)
           AND (end_at IS NULL OR end_at='' OR end_at >= ?)
           ORDER BY id""", (now, now)).fetchall()]


def _discount_for(promo: dict, lines: list[dict], subtotal: Decimal,
                  total_qty: Decimal, customer_group_id: int | None) -> Decimal:
    kind = promo["kind"]
    value = Decimal(str(promo["value"]))
    min_qty = Decimal(str(promo["min_qty"] or 0))
    if kind == "percent":
        if total_qty < min_qty:
            return Decimal("0.00")
        return to_money(subtotal * value / Decimal("100"))
    if kind == "fixed":
        if total_qty < min_qty:
            return Decimal("0.00")
        return min(to_money(value), subtotal)
    if kind == "category_percent":
        qual = [ln for ln in lines if str(ln.get("category_id", "")) == str(promo["target"])]
        if sum((Decimal(str(ln["qty"])) for ln in qual), Decimal("0")) < min_qty:
            return Decimal("0.00")
        base = sum((to_money(ln["gross"]) for ln in qual), Decimal("0.00"))
        return to_money(base * value / Decimal("100"))
    if kind == "group_percent":
        if customer_group_id is None or str(customer_group_id) != str(promo["target"]):
            return Decimal("0.00")
        if total_qty < min_qty:
            return Decimal("0.00")
        return to_money(subtotal * value / Decimal("100"))
    return Decimal("0.00")


def evaluate(conn: sqlite3.Connection, lines: list[dict], subtotal,
             customer_id: int | None = None, promotion_id: int | None = None,
             at: str | None = None) -> PromotionResult | None:
    """lines: [{product_id, qty, gross, category_id}]. Returns best (or requested) promo."""
    sub = to_money(subtotal)
    if sub <= 0:
        return None
    total_qty = sum((Decimal(str(ln["qty"])) for ln in lines), Decimal("0"))
    group_id = None
    if customer_id is not None:
        row = conn.execute("SELECT group_id FROM customers WHERE id=?", (customer_id,)).fetchone()
        if row is not None:
            group_id = row["group_id"]
    promos = active_promotions(conn, at)
    if promotion_id is not None:
        promos = [p for p in promos if int(p["id"]) == int(promotion_id)]
        if not promos:
            raise ValueError("Promotion not found, inactive, or outside validity window")
    best: PromotionResult | None = None
    for p in promos:
        d = _discount_for(p, lines, sub, total_qty, group_id)
        if d > 0 and (best is None or d > best.discount):
            best = PromotionResult(int(p["id"]), p["name"], d)
    return best
