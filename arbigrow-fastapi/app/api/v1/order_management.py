from typing import Optional
import json
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query, HTTPException, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete, case
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.models.seller import Seller
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.order_status_log import OrderStatusLog
from app.models.admin_delivery_zone import AdminDeliveryZone
from app.models.seller_delivery_zone import SellerDeliveryZone
from app.models.return_request import ReturnRequest
from app.models.ecommerce_config import EcommerceConfig
from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
from app.models.notification import AdminNotification
from app.models.commission import CommissionRule
from app.utils.notifications import notify_admin
from app.utils.format_decimal import format_decimal

router = APIRouter(prefix="/orders", tags=["Order Management"])
WALLET_PRECISION = Decimal("0.00000000000001")
dec = lambda v: Decimal(str(v)).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)

ORDER_STATUSES = [
    "pending", "confirmed", "processing", "packed", "ready_to_ship",
    "picked_up", "out_for_delivery", "delivered", "completed",
    "cancelled", "refunded", "failed",
]

SELLER_UPDATABLE_STATUSES = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["processing", "cancelled"],
    "processing": ["packed", "cancelled"],
    "packed": ["ready_to_ship", "cancelled"],
    "ready_to_ship": ["picked_up", "cancelled"],
    "picked_up": ["out_for_delivery"],
    "out_for_delivery": ["delivered"],
    "delivered": ["completed"],
}

ADMIN_OVERRIDE_STATUSES = ORDER_STATUSES


async def _get_seller(db, user_id):
    r = await db.execute(select(Seller).where(Seller.user_id == user_id))
    return r.scalar_one_or_none()


async def _get_order(db, order_id):
    r = await db.execute(select(Order).where(Order.id == order_id))
    return r.scalar_one_or_none()


async def _log_status(db, order_id, from_status, to_status, changed_by, changed_by_id=None, note=None):
    log = OrderStatusLog(
        order_id=order_id, from_status=from_status, to_status=to_status,
        changed_by=changed_by, changed_by_id=changed_by_id, note=note,
    )
    db.add(log)
    await db.flush()


async def _calc_commission(db, seller_id, order_total):
    cfg_r = await db.execute(select(EcommerceConfig).limit(1))
    cfg = cfg_r.scalar_one_or_none()
    default_fee = Decimal(str(cfg.seller_order_fee_percent)) if cfg else Decimal("5.00")

    rules_r = await db.execute(
        select(CommissionRule).where(CommissionRule.is_active.is_(True)).order_by(CommissionRule.priority.asc())
    )
    rules = rules_r.scalars().all()

    for rule in rules:
        if rule.applies_to == "seller" and rule.applies_id == seller_id:
            fee = Decimal(str(rule.commission_value))
            fee_amount = (order_total * fee / Decimal("100")).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
            seller_payout = (order_total - fee_amount).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
            return fee, fee_amount, seller_payout

    fee = default_fee
    fee_amount = (order_total * fee / Decimal("100")).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
    seller_payout = (order_total - fee_amount).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
    return fee, fee_amount, seller_payout


async def _order_to_dict(o, db):
    items_r = await db.execute(select(OrderItem).where(OrderItem.order_id == o.id))
    items_list = items_r.scalars().all()
    product_ids = {oi.product_id for oi in items_list}
    products_r = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_map = {p.id: p for p in products_r.scalars().all()}
    items = []
    for oi in items_list:
        p = products_map.get(oi.product_id)
        items.append({
            "id": oi.id, "product_id": oi.product_id,
            "product_name": p.name if p else "Deleted Product",
            "quantity": oi.quantity, "price": float(oi.price),
        })

    logs_r = await db.execute(
        select(OrderStatusLog).where(OrderStatusLog.order_id == o.id).order_by(OrderStatusLog.created_at.asc())
    )
    timeline = [{
        "from_status": l.from_status, "to_status": l.to_status,
        "changed_by": l.changed_by, "note": l.note,
        "created_at": str(l.created_at),
    } for l in logs_r.scalars().all()]

    seller_r = await db.execute(select(Seller).where(Seller.id == o.seller_id))
    seller = seller_r.scalar_one_or_none()

    return {
        "id": o.id, "user_id": o.user_id, "seller_id": o.seller_id,
        "seller_name": seller.store_name if seller else "Unknown",
        "total": float(o.total), "fee_percent": float(o.fee_percent) if o.fee_percent else 0,
        "fee_amount": float(o.fee_amount) if o.fee_amount else 0,
        "seller_payout": float(o.seller_payout) if o.seller_payout else 0,
        "delivery_charge": float(o.delivery_charge) if hasattr(o, "delivery_charge") and o.delivery_charge else 0,
        "commission_rate": float(o.commission_rate) if hasattr(o, "commission_rate") and o.commission_rate else 0,
        "commission_amount": float(o.commission_amount) if hasattr(o, "commission_amount") and o.commission_amount else 0,
        "net_amount": float(o.net_amount) if hasattr(o, "net_amount") and o.net_amount else 0,
        "status": o.status, "payment_method": o.payment_method,
        "customer_name": o.customer_name, "customer_email": o.customer_email,
        "customer_phone": o.customer_phone, "customer_address": o.customer_address,
        "shipping_address": o.shipping_address,
        "tracking_number": getattr(o, "tracking_number", None),
        "cancellation_reason": getattr(o, "cancellation_reason", None),
        "refund_status": getattr(o, "refund_status", None),
        "refund_amount": float(o.refund_amount) if hasattr(o, "refund_amount") and o.refund_amount else 0,
        "is_return_requested": getattr(o, "is_return_requested", False),
        "return_reason": getattr(o, "return_reason", None),
        "notes": getattr(o, "notes", None),
        "items": items, "timeline": timeline,
        "created_at": str(o.created_at), "updated_at": str(o.updated_at),
    }


# ── Customer Endpoints ────────────────────────────────────────

@router.get("/my")
async def customer_orders(
    page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
    status: str = None,
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    q = select(Order).where(Order.user_id == current_user.id)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    orders = r.scalars().all()
    order_ids = [o.id for o in orders]
    items_r = await db.execute(select(OrderItem).where(OrderItem.order_id.in_(order_ids)))
    order_items_map = {}
    for oi in items_r.scalars().all():
        order_items_map.setdefault(oi.order_id, []).append(oi)
    all_product_ids = {oi.product_id for items_list in order_items_map.values() for oi in items_list}
    products_r = await db.execute(select(Product).where(Product.id.in_(all_product_ids)))
    products_map = {p.id: p for p in products_r.scalars().all()}
    result = []
    for o in orders:
        items_list = order_items_map.get(o.id, [])
        items = []
        for oi in items_list:
            p = products_map.get(oi.product_id)
            items.append({"product_id": oi.product_id, "product_name": p.name if p else "Unknown", "quantity": oi.quantity, "price": float(oi.price)})
        result.append({"id": o.id, "total": float(o.total), "status": o.status, "payment_method": o.payment_method, "created_at": str(o.created_at), "items": items, "item_count": len(items)})
    return {"orders": result, "total": total, "page": page, "per_page": per_page}


@router.get("/my/{order_id}")
async def customer_order_detail(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    o = await _get_order(db, order_id)
    if not o or o.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    return await _order_to_dict(o, db)


@router.post("/my/{order_id}/cancel")
async def customer_cancel_order(order_id: int, data: dict = Body(default={}), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    o = await _get_order(db, order_id)
    if not o or o.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    if o.status not in ("pending", "confirmed"):
        raise HTTPException(400, "Order can only be cancelled if pending or confirmed")
    reason = data.get("reason", "")
    await _log_status(db, order_id, o.status, "cancelled", "customer", current_user.id, reason)
    o.status = "cancelled"
    o.cancelled_at = datetime.now(timezone.utc)
    if hasattr(o, "cancellation_reason"):
        o.cancellation_reason = reason
    await db.commit()
    return {"message": "Order cancelled", "status": o.status}


@router.post("/my/{order_id}/return-request")
async def customer_return_request(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    o = await _get_order(db, order_id)
    if not o or o.user_id != current_user.id:
        raise HTTPException(404, "Order not found")
    if o.status not in ("delivered", "completed"):
        raise HTTPException(400, "Return only allowed for delivered/completed orders")
    reason = data.get("reason", "")
    if not reason:
        raise HTTPException(400, "Return reason is required")
    existing = await db.execute(select(ReturnRequest).where(ReturnRequest.order_id == order_id, ReturnRequest.user_id == current_user.id, ReturnRequest.status == "pending"))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Return request already submitted")
    rr = ReturnRequest(order_id=order_id, user_id=current_user.id, reason=reason)
    db.add(rr)
    if hasattr(o, "is_return_requested"):
        o.is_return_requested = True
    if hasattr(o, "return_reason"):
        o.return_reason = reason
    await db.commit()
    await notify_admin(db=db, type="return_request", message=f"Return requested for order #{order_id} by user #{current_user.id}: {reason[:100]}", user_id=current_user.id)
    return {"message": "Return request submitted", "id": rr.id}


# ── Seller Endpoints ──────────────────────────────────────────

@router.get("/seller")
async def seller_orders(
    status: str = None, page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    q = select(Order).where(Order.seller_id == seller.id)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    orders = r.scalars().all()
    order_ids = [o.id for o in orders]
    items_r = await db.execute(select(OrderItem).where(OrderItem.order_id.in_(order_ids)))
    order_items_map = {}
    for oi in items_r.scalars().all():
        order_items_map.setdefault(oi.order_id, []).append(oi)
    all_product_ids = {oi.product_id for items_list in order_items_map.values() for oi in items_list}
    products_r = await db.execute(select(Product).where(Product.id.in_(all_product_ids)))
    products_map = {p.id: p for p in products_r.scalars().all()}
    result = []
    for o in orders:
        items_list = order_items_map.get(o.id, [])
        items = []
        for oi in items_list:
            p = products_map.get(oi.product_id)
            items.append({"product_id": oi.product_id, "product_name": p.name if p else "Unknown", "quantity": oi.quantity, "price": float(oi.price)})
        result.append({
            "id": o.id, "total": float(o.total), "status": o.status,
            "customer_name": o.customer_name, "customer_email": o.customer_email, "customer_phone": o.customer_phone,
            "customer_address": o.customer_address, "shipping_address": o.shipping_address,
            "tracking_number": getattr(o, "tracking_number", None),
            "payment_method": o.payment_method,
            "created_at": str(o.created_at), "items": items,
        })
    return {"orders": result, "total": total, "page": page, "per_page": per_page}


@router.put("/seller/{order_id}/status")
async def seller_update_order_status(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    o = await _get_order(db, order_id)
    if not o or o.seller_id != seller.id:
        raise HTTPException(404, "Order not found")
    new_status = data.get("status")
    allowed = SELLER_UPDATABLE_STATUSES.get(o.status, [])
    if new_status not in allowed:
        raise HTTPException(400, f"Cannot transition from '{o.status}' to '{new_status}'. Allowed: {allowed}")
    note = data.get("note", "")
    await _log_status(db, order_id, o.status, new_status, "seller", seller.id, note)
    o.status = new_status
    if new_status == "cancelled" and "reason" in data:
        if hasattr(o, "cancellation_reason"):
            o.cancellation_reason = data["reason"]
        if hasattr(o, "cancelled_at"):
            o.cancelled_at = datetime.now(timezone.utc)
    if new_status == "delivered" and hasattr(o, "delivered_at"):
        o.delivered_at = datetime.now(timezone.utc)
    if new_status == "completed":
        # Calculate commission and credit seller wallet
        order_total = dec(o.total)
        fee_percent, fee_amount, seller_payout = await _calc_commission(db, seller.id, order_total)
        if hasattr(o, "commission_amount"):
            o.commission_amount = float(fee_amount)
        if hasattr(o, "seller_payout"):
            o.seller_payout = float(seller_payout)
        # Credit seller's ecommerce_wallet
        su_r = await db.execute(select(User).where(User.id == seller.user_id))
        seller_user = su_r.scalar_one_or_none()
        if seller_user:
            seller_user.ecommerce_wallet = (seller_user.ecommerce_wallet or Decimal("0")) + seller_payout
            db.add(seller_user)
            # Create wallet transaction record
            tx = EcommerceWalletTransaction(
                user_id=seller_user.id,
                order_id=order_id,
                amount=seller_payout,
                type="credit",
                description=f"Payout for order #{order_id} (commission: ${float(fee_amount):.2f})"
            )
            db.add(tx)
    await db.commit()
    return {"message": f"Status updated to {new_status}"}


@router.put("/seller/{order_id}/tracking")
async def seller_add_tracking(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    o = await _get_order(db, order_id)
    if not o or o.seller_id != seller.id:
        raise HTTPException(404, "Order not found")
    tracking = data.get("tracking_number", "").strip()
    if not tracking:
        raise HTTPException(400, "Tracking number required")
    if hasattr(o, "tracking_number"):
        o.tracking_number = tracking
    await _log_status(db, order_id, o.status, o.status, "seller", seller.id, f"Tracking added: {tracking}")
    await db.commit()
    return {"message": "Tracking number updated", "tracking_number": tracking}


@router.get("/seller/stats")
async def seller_order_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    counts_r = await db.execute(
        select(Order.status, func.count().label("cnt")).where(Order.seller_id == seller.id).group_by(Order.status)
    )
    counts = {s: 0 for s in ORDER_STATUSES}
    for row in counts_r.all():
        counts[row.status] = row.cnt
    rev_r = await db.execute(select(func.coalesce(func.sum(Order.total), 0)).where(and_(Order.seller_id == seller.id, Order.status.in_(["delivered", "completed"]))))
    gross_sales = float(rev_r.scalar() or 0)
    del_r = await db.execute(select(func.coalesce(func.sum(Order.delivery_charge), 0)).where(and_(Order.seller_id == seller.id, Order.status.in_(["delivered", "completed"]))))
    delivery_income = float(del_r.scalar() or 0)
    comm_r = await db.execute(select(func.coalesce(func.sum(Order.commission_amount), 0)).where(and_(Order.seller_id == seller.id, Order.status.in_(["delivered", "completed"]))))
    admin_commission = float(comm_r.scalar() or 0)
    net_r = await db.execute(select(func.coalesce(func.sum(Order.net_amount), 0)).where(and_(Order.seller_id == seller.id, Order.status.in_(["delivered", "completed"]))))
    net_earnings = float(net_r.scalar() or 0)
    pending_r = await db.execute(select(func.coalesce(func.sum(Order.seller_payout), 0)).where(and_(Order.seller_id == seller.id, Order.status.in_(["pending", "confirmed", "processing", "packed", "ready_to_ship", "picked_up", "out_for_delivery"]))))
    pending_balance = float(pending_r.scalar() or 0)
    return {
        "counts": counts, "gross_sales": gross_sales, "delivery_income": delivery_income,
        "admin_commission": admin_commission, "net_earnings": net_earnings,
        "pending_balance": pending_balance,
        "withdrawable_balance": float(current_user.ecommerce_wallet or 0),
    }


# ── Admin Endpoints ───────────────────────────────────────────

@router.get("/admin/list")
async def admin_list_orders(
    seller_id: int = None, user_id: int = None, status: str = None,
    payment_method: str = None, search: str = None,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user),
):
    q = select(Order)
    if seller_id:
        q = q.where(Order.seller_id == seller_id)
    if user_id:
        q = q.where(Order.user_id == user_id)
    if status:
        q = q.where(Order.status == status)
    if payment_method:
        q = q.where(Order.payment_method == payment_method)
    if search:
        try:
            search_id = int(search)
            q = q.where(Order.id == search_id)
        except ValueError:
            q = q.where(or_(Order.customer_name.ilike(f"%{search}%"), Order.customer_email.ilike(f"%{search}%"), Order.customer_phone.ilike(f"%{search}%")))
    q = q.order_by(Order.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    orders = r.scalars().all()
    seller_ids = {o.seller_id for o in orders}
    sellers_r = await db.execute(select(Seller).where(Seller.id.in_(seller_ids)))
    sellers_map = {s.id: s for s in sellers_r.scalars().all()}
    result = []
    for o in orders:
        s = sellers_map.get(o.seller_id)
        result.append({
            "id": o.id, "user_id": o.user_id, "seller_id": o.seller_id,
            "seller_name": s.store_name if s else "Unknown",
            "total": float(o.total), "status": o.status,
            "payment_method": o.payment_method,
            "customer_name": o.customer_name, "customer_email": o.customer_email,
            "customer_phone": o.customer_phone,
            "fee_amount": float(o.fee_amount) if o.fee_amount else 0,
            "seller_payout": float(o.seller_payout) if o.seller_payout else 0,
            "created_at": str(o.created_at),
        })
    return {"orders": result, "total": total, "page": page, "per_page": per_page}


@router.get("/admin/{order_id}")
async def admin_order_detail(order_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    o = await _get_order(db, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    return await _order_to_dict(o, db)


@router.put("/admin/{order_id}/status")
async def admin_update_order_status(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    o = await _get_order(db, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    new_status = data.get("status")
    if new_status not in ADMIN_OVERRIDE_STATUSES:
        raise HTTPException(400, f"Invalid status: {new_status}")
    note = data.get("note", "")
    await _log_status(db, order_id, o.status, new_status, "admin", admin.id, note)
    o.status = new_status
    if new_status == "cancelled":
        if hasattr(o, "cancelled_at"):
            o.cancelled_at = datetime.now(timezone.utc)
        if hasattr(o, "cancellation_reason") and not o.cancellation_reason:
            o.cancellation_reason = note or "Cancelled by admin"
    if new_status == "delivered" and hasattr(o, "delivered_at"):
        o.delivered_at = datetime.now(timezone.utc)
    if new_status == "refunded":
        o.refund_status = "completed" if hasattr(o, "refund_status") else None
        o.refund_amount = data.get("refund_amount", o.total) if hasattr(o, "refund_amount") else 0
    if new_status == "completed":
        seller_r = await db.execute(select(Seller).where(Seller.id == o.seller_id))
        seller_rec = seller_r.scalar_one_or_none()
        if seller_rec:
            order_total = dec(o.total)
            fee_percent, fee_amount, seller_payout = await _calc_commission(db, seller_rec.id, order_total)
            if hasattr(o, "commission_amount"):
                o.commission_amount = float(fee_amount)
            if hasattr(o, "seller_payout"):
                o.seller_payout = float(seller_payout)
            su_r = await db.execute(select(User).where(User.id == seller_rec.user_id))
            seller_user = su_r.scalar_one_or_none()
            if seller_user:
                seller_user.ecommerce_wallet = (seller_user.ecommerce_wallet or Decimal("0")) + seller_payout
                db.add(seller_user)
                tx = EcommerceWalletTransaction(
                    user_id=seller_user.id,
                    order_id=order_id,
                    amount=seller_payout,
                    type="credit",
                    description=f"Payout for order #{order_id} (admin override, commission: ${float(fee_amount):.2f})"
                )
                db.add(tx)
    await db.commit()
    return {"message": f"Status updated to {new_status}"}


@router.post("/admin/{order_id}/refund")
async def admin_refund_order(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    o = await _get_order(db, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    if o.status == "refunded":
        raise HTTPException(400, "Order already refunded")
    refund_amount = Decimal(str(data.get("refund_amount", o.total)))
    note = data.get("note", "")
    await _log_status(db, order_id, o.status, "refunded", "admin", admin.id, f"Refund: ${refund_amount}. {note}")
    o.status = "refunded"
    if hasattr(o, "refund_status"):
        o.refund_status = "completed"
    if hasattr(o, "refund_amount"):
        o.refund_amount = refund_amount
    await db.commit()
    return {"message": f"Order refunded ${float(refund_amount)}"}


# ── Return Requests (Admin) ──────────────────────────────────

@router.get("/admin/return-requests")
async def admin_list_return_requests(status: str = None, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(ReturnRequest).order_by(ReturnRequest.created_at.desc())
    if status:
        q = q.where(ReturnRequest.status == status)
    r = await db.execute(q)
    results = []
    for rr in r.scalars().all():
        o = await _get_order(db, rr.order_id)
        results.append({
            "id": rr.id, "order_id": rr.order_id, "user_id": rr.user_id,
            "reason": rr.reason, "status": rr.status,
            "refund_amount": float(rr.refund_amount) if rr.refund_amount else 0,
            "admin_note": rr.admin_note,
            "order_total": float(o.total) if o else 0,
            "created_at": str(rr.created_at),
        })
    return {"requests": results}


@router.put("/admin/return-requests/{request_id}")
async def admin_process_return(request_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(ReturnRequest).where(ReturnRequest.id == request_id))
    rr = r.scalar_one_or_none()
    if not rr:
        raise HTTPException(404, "Return request not found")
    new_status = data.get("status")
    if new_status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be approved or rejected")
    rr.status = new_status
    rr.admin_note = data.get("note", "")
    if new_status == "approved":
        rr.refund_amount = Decimal(str(data.get("refund_amount", 0)))
        o = await _get_order(db, rr.order_id)
        if o:
            await _log_status(db, o.id, o.status, "refunded", "admin", admin.id, f"Return approved: {rr.reason[:100]}")
            o.status = "refunded"
            if hasattr(o, "refund_status"):
                o.refund_status = "completed"
            if hasattr(o, "refund_amount"):
                o.refund_amount = rr.refund_amount
    await db.commit()
    return {"message": f"Return {new_status}", "id": rr.id}





@router.get("/delivery-zones/public")
async def public_delivery_zones(seller_id: Optional[int] = None, db: AsyncSession = Depends(get_db)):
    query = select(AdminDeliveryZone).where(AdminDeliveryZone.is_active.is_(True))
    if seller_id:
        # Return zones linked to this seller via SellerDeliveryZone
        query = query.join(SellerDeliveryZone, SellerDeliveryZone.zone_id == AdminDeliveryZone.id).where(SellerDeliveryZone.seller_id == seller_id)
    query = query.order_by(AdminDeliveryZone.zone_name)
    r = await db.execute(query)
    zones = r.scalars().all()
    return {"zones": [{
        "id": z.id, "zone_name": z.zone_name, "country": z.country,
        "state": z.state, "district": z.district, "city": z.city,
        "area": z.area, "postal_code": z.postal_code,
        "delivery_charge": float(z.delivery_charge),
        "free_delivery_threshold": float(z.free_delivery_threshold) if z.free_delivery_threshold else None,
        "estimated_days": z.estimated_days,
    } for z in zones]}


# ── Seller Delivery Zone Management (Full CRUD) ─────────────

@router.get("/seller/delivery-zones")
async def seller_list_delivery_zones(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    # Join SellerDeliveryZone with AdminDeliveryZone to get seller's zones
    r = await db.execute(
        select(AdminDeliveryZone)
        .join(SellerDeliveryZone, SellerDeliveryZone.zone_id == AdminDeliveryZone.id)
        .where(SellerDeliveryZone.seller_id == seller.id, SellerDeliveryZone.is_active.is_(True))
        .order_by(AdminDeliveryZone.zone_name)
    )
    zones = r.scalars().all()
    # Get seller overrides
    sz_r = await db.execute(select(SellerDeliveryZone).where(SellerDeliveryZone.seller_id == seller.id))
    overrides = {sz.zone_id: sz for sz in sz_r.scalars().all()}
    result = []
    for z in zones:
        sz = overrides.get(z.id)
        result.append({
            "zone_id": z.id, "zone_name": z.zone_name,
            "country": z.country, "state": z.state, "city": z.city,
            "area": z.area, "postal_code": z.postal_code,
            "delivery_charge": float(sz.delivery_charge) if sz and sz.delivery_charge is not None else float(z.delivery_charge),
            "free_delivery_threshold": float(sz.free_delivery_threshold) if sz and sz.free_delivery_threshold is not None else (float(z.free_delivery_threshold) if z.free_delivery_threshold else None),
            "estimated_days": z.estimated_days,
            "is_active": sz.is_active if sz else True,
        })
    return {"zones": result}


@router.post("/seller/delivery-zones")
async def seller_create_delivery_zone(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    zone = AdminDeliveryZone(
        zone_name=data.get("zone_name", "Untitled Zone"),
        country=data.get("country", ""),
        state=data.get("state", ""),
        district=data.get("district", ""),
        city=data.get("city", ""),
        area=data.get("area", ""),
        postal_code=data.get("postal_code", ""),
        delivery_charge=Decimal(str(data.get("delivery_charge", 0))),
        free_delivery_threshold=Decimal(str(data["free_delivery_threshold"])) if data.get("free_delivery_threshold") else None,
        estimated_days=data.get("estimated_days", ""),
        is_active=True,
    )
    db.add(zone)
    await db.flush()
    sz = SellerDeliveryZone(
        seller_id=seller.id,
        zone_id=zone.id,
        delivery_charge=Decimal(str(data.get("delivery_charge", 0))),
        free_delivery_threshold=Decimal(str(data["free_delivery_threshold"])) if data.get("free_delivery_threshold") else None,
        is_active=True,
    )
    db.add(sz)
    await db.commit()
    await db.refresh(zone)
    return {"message": "Zone created", "id": zone.id}


@router.put("/seller/delivery-zones/{zone_id}")
async def seller_update_delivery_zone(zone_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    r = await db.execute(select(AdminDeliveryZone).where(AdminDeliveryZone.id == zone_id))
    zone = r.scalar_one_or_none()
    if not zone:
        raise HTTPException(404, "Zone not found")
    zone.zone_name = data.get("zone_name", zone.zone_name)
    zone.country = data.get("country", zone.country)
    zone.state = data.get("state", zone.state)
    zone.city = data.get("city", zone.city)
    zone.area = data.get("area", zone.area)
    zone.postal_code = data.get("postal_code", zone.postal_code)
    zone.estimated_days = data.get("estimated_days", zone.estimated_days)
    if "delivery_charge" in data:
        zone.delivery_charge = Decimal(str(data["delivery_charge"]))
    if "free_delivery_threshold" in data and data["free_delivery_threshold"] is not None:
        zone.free_delivery_threshold = Decimal(str(data["free_delivery_threshold"]))
    elif "free_delivery_threshold" in data:
        zone.free_delivery_threshold = None
    sz_r = await db.execute(select(SellerDeliveryZone).where(SellerDeliveryZone.seller_id == seller.id, SellerDeliveryZone.zone_id == zone_id))
    sz = sz_r.scalar_one_or_none()
    if not sz:
        sz = SellerDeliveryZone(seller_id=seller.id, zone_id=zone_id)
        db.add(sz)
    if "delivery_charge" in data:
        sz.delivery_charge = Decimal(str(data["delivery_charge"]))
    if "free_delivery_threshold" in data and data["free_delivery_threshold"] is not None:
        sz.free_delivery_threshold = Decimal(str(data["free_delivery_threshold"]))
    elif "free_delivery_threshold" in data:
        sz.free_delivery_threshold = None
    if "is_active" in data:
        sz.is_active = data["is_active"]
    await db.commit()
    return {"message": "Zone updated"}


@router.delete("/seller/delivery-zones/{zone_id}")
async def seller_delete_delivery_zone(zone_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller(db, current_user.id)
    if not seller:
        raise HTTPException(403, "Not a seller")
    sz_r = await db.execute(select(SellerDeliveryZone).where(SellerDeliveryZone.seller_id == seller.id, SellerDeliveryZone.zone_id == zone_id))
    sz = sz_r.scalar_one_or_none()
    if not sz:
        raise HTTPException(404, "Zone link not found")
    sz.is_active = False
    await db.commit()
    return {"message": "Zone deactivated"}


# ── Delivery Charge Calculation ──────────────────────────────

@router.post("/calculate-delivery")
async def calculate_delivery(data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    zone_id = data.get("zone_id")
    seller_id = data.get("seller_id")
    order_amount = Decimal(str(data.get("order_amount", 0)))
    # Look up zone - must be active and owned by the seller (or general)
    query = select(AdminDeliveryZone).where(AdminDeliveryZone.id == zone_id, AdminDeliveryZone.is_active.is_(True))
    r = await db.execute(query)
    az = r.scalar_one_or_none()
    if not az:
        raise HTTPException(404, "Delivery zone not found")
    charge = az.delivery_charge
    free_threshold = az.free_delivery_threshold
    if seller_id:
        sz_r = await db.execute(select(SellerDeliveryZone).where(SellerDeliveryZone.seller_id == seller_id, SellerDeliveryZone.zone_id == zone_id, SellerDeliveryZone.is_active.is_(True)))
        sz = sz_r.scalar_one_or_none()
        if sz:
            if sz.delivery_charge is not None:
                charge = sz.delivery_charge
            if sz.free_delivery_threshold is not None:
                free_threshold = sz.free_delivery_threshold
    if free_threshold and order_amount >= free_threshold:
        charge = Decimal("0")
    # Fallback to seller's default delivery charge if no zone charge
    if charge == 0 and seller_id:
        sr = await db.execute(select(Seller).where(Seller.id == seller_id))
        s = sr.scalar_one_or_none()
        if s and s.default_delivery_charge:
            charge = Decimal(str(s.default_delivery_charge))
    return {
        "delivery_charge": float(charge),
        "free_delivery_threshold": float(free_threshold) if free_threshold else None,
        "is_free_delivery": charge == 0,
        "zone_name": az.zone_name if az else None,
        "estimated_days": az.estimated_days if az else None,
    }


# ── Reports ──────────────────────────────────────────────────

@router.get("/admin/reports/summary")
async def admin_reports_summary(
    start_date: str = None, end_date: str = None,
    db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user),
):
    q = select(Order)
    if start_date:
        q = q.where(Order.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        q = q.where(Order.created_at <= datetime.fromisoformat(end_date) + timedelta(days=1))
    r = await db.execute(q)
    orders = r.scalars().all()
    total_orders = len(orders)
    total_revenue = sum(float(o.total) for o in orders)
    total_commission = sum(float(o.fee_amount or 0) for o in orders)
    total_delivery_charges = sum(float(o.delivery_charge or 0) for o in orders if hasattr(o, "delivery_charge"))
    total_refunded = sum(float(o.refund_amount or 0) for o in orders if hasattr(o, "refund_amount"))
    status_counts = {}
    for o in orders:
        status_counts[o.status] = status_counts.get(o.status, 0) + 1
    return {
        "total_orders": total_orders, "total_revenue": total_revenue,
        "total_commission": total_commission, "total_delivery_charges": total_delivery_charges,
        "total_refunded": total_refunded, "status_counts": status_counts,
    }


@router.get("/admin/reports/daily")
async def admin_daily_report(days: int = Query(30, ge=1, le=365), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    r = await db.execute(
        select(
            func.date(Order.created_at).label("date"),
            func.count().label("count"),
            func.coalesce(func.sum(Order.total), 0).label("revenue"),
            func.coalesce(func.sum(Order.fee_amount), 0).label("commission"),
        ).where(Order.created_at >= since).group_by(func.date(Order.created_at)).order_by(func.date(Order.created_at).desc())
    )
    return {"daily": [{"date": str(row.date), "orders": row.count, "revenue": float(row.revenue), "commission": float(row.commission)} for row in r.all()]}


@router.get("/admin/reports/sellers")
async def admin_seller_report(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    sellers_r = await db.execute(select(Seller).order_by(Seller.store_name))
    sellers = sellers_r.scalars().all()
    seller_ids = [s.id for s in sellers]
    orders_r = await db.execute(
        select(Order.seller_id, func.count().label("count"), func.coalesce(func.sum(Order.total), 0).label("revenue"))
        .where(Order.seller_id.in_(seller_ids))
        .group_by(Order.seller_id)
    )
    stats_map = {row.seller_id: {"total_orders": row.count, "total_revenue": float(row.revenue)} for row in orders_r.all()}
    result = [{"seller_id": s.id, "seller_name": s.store_name, **stats_map.get(s.id, {"total_orders": 0, "total_revenue": 0})} for s in sellers]
    return {"sellers": sorted(result, key=lambda x: x["total_revenue"], reverse=True)}
