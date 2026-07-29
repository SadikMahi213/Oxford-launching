import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from decimal import Decimal
from pydantic import BaseModel, EmailStr
import re

from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.models.seller import Seller
from app.models.product import Product
from app.models.seller_delivery_zone import SellerDeliveryZone
from app.models.vendor_withdraw import VendorWithdraw
from app.models.order import Order, OrderItem
from app.models.ecommerce_config import EcommerceConfig
from app.models.cart import CartItem
from app.models.wishlist import WishlistItem
from app.models.compare import CompareItem
from app.models.product_review import ProductReview
from app.models.product_view import ProductView
from app.models.product_variant import ProductVariant
from app.models.product_attribute_value import ProductAttributeValue
from app.models.product_tag import ProductTag
from app.models.flash_deal import FlashDealProduct
from app.services.b2_service import upload_to_b2, generate_presigned_url
from app.utils.notifications import notify_admin

router = APIRouter(prefix="/ecommerce", tags=["Ecommerce"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"}

async def validate_upload_file(file: UploadFile, max_size: int = MAX_UPLOAD_SIZE):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, f"Invalid file type '{file.content_type}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_TYPES))}")
    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(400, f"File too large ({len(contents)} bytes). Max: {max_size} bytes")
    await file.seek(0)
    return file

WALLET_PRECISION = Decimal("0.00000000000001")


class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int = 1


class PlaceOrderRequest(BaseModel):
    items: list[OrderItemRequest]
    customer_name: str
    customer_email: str
    customer_phone: str
    customer_address: str
    shipping_address: str | None = None


# ── Seller Registration ─────────────────────────────────────────────

@router.post("/seller/register")
async def register_seller(
    store_name: str,
    description: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = Seller(user_id=current_user.id, store_name=store_name, description=description)
    db.add(seller)
    await db.commit()
    await db.refresh(seller)

    await notify_admin(
        db=db, type="seller_registered",
        message=f"New seller '{store_name}' registered by {current_user.full_name or current_user.email}",
        user_id=current_user.id,
    )
    return {"seller_id": seller.id, "status": seller.status}


@router.get("/seller/stores")
async def list_my_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Seller)
        .where(Seller.user_id == current_user.id)
        .order_by(Seller.created_at.desc())
    )
    sellers = result.scalars().all()
    return {
        "stores": [
            _seller_to_dict(s, current_user) for s in sellers
        ]
    }


async def _get_seller(db: AsyncSession, current_user: User, seller_id: int | None = None):
    if seller_id:
        result = await db.execute(
            select(Seller).where(Seller.id == seller_id, Seller.user_id == current_user.id)
        )
        seller = result.scalar_one_or_none()
        if not seller:
            raise HTTPException(404, "Store not found")
        return seller
    result = await db.execute(
        select(Seller).where(Seller.user_id == current_user.id).order_by(Seller.created_at.desc())
    )
    seller = result.scalars().first()
    if not seller:
        raise HTTPException(404, "Seller profile not found")
    return seller


def _compute_profile_completion(seller, user):
    score = 0.0
    if user.full_name: score += 8.33
    if user.email: score += 8.33
    if seller.phone: score += 8.34
    if seller.store_name: score += 6.25
    if seller.description: score += 6.25
    if seller.store_logo_key: score += 6.25
    if seller.store_banner_key: score += 6.25
    if seller.nid_number: score += 8.33
    if seller.nid_front_image_key: score += 8.33
    if seller.nid_back_image_key: score += 8.34
    if seller.country: score += 6.25
    if seller.division_state: score += 6.25
    if seller.district_city: score += 6.25
    if seller.full_address: score += 6.25
    return round(min(score, 100.0), 2)


def _seller_to_dict(seller, user):
    return {
        "id": seller.id,
        "user_id": seller.user_id,
        "store_name": seller.store_name,
        "description": seller.description,
        "status": seller.status,
        "phone": seller.phone,
        "whatsapp_number": seller.whatsapp_number,
        "nid_number": seller.nid_number,
        "nid_front_image_key": seller.nid_front_image_key,
        "nid_back_image_key": seller.nid_back_image_key,
        "country": seller.country,
        "division_state": seller.division_state,
        "district_city": seller.district_city,
        "full_address": seller.full_address,
        "store_logo_key": seller.store_logo_key,
        "store_banner_key": seller.store_banner_key,
        "facebook_url": seller.facebook_url,
        "youtube_url": seller.youtube_url,
        "tiktok_url": seller.tiktok_url,
        "website_url": seller.website_url,
        "default_delivery_charge": float(seller.default_delivery_charge or 0) if seller.default_delivery_charge is not None else 0,
        "profile_completion": float(seller.profile_completion or 0),
        "rejection_reason": seller.rejection_reason,
        "submitted_at": seller.submitted_at.isoformat() if seller.submitted_at else None,
        "user_name": user.full_name,
        "user_email": user.email,
        "created_at": seller.created_at.isoformat() if seller.created_at else None,
        "updated_at": seller.updated_at.isoformat() if seller.updated_at else None,
    }


@router.get("/seller/profile")
async def get_seller_profile(
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)
    return _seller_to_dict(seller, current_user)


class SellerProfileUpdate(BaseModel):
    store_name: str | None = None
    description: str | None = None
    phone: str | None = None
    whatsapp_number: str | None = None
    nid_number: str | None = None
    nid_front_image_key: str | None = None
    nid_back_image_key: str | None = None
    country: str | None = None
    division_state: str | None = None
    district_city: str | None = None
    full_address: str | None = None
    store_logo_key: str | None = None
    store_banner_key: str | None = None
    facebook_url: str | None = None
    youtube_url: str | None = None
    tiktok_url: str | None = None
    website_url: str | None = None
    default_delivery_charge: float | None = None


@router.put("/seller/profile/update")
async def update_seller_profile(
    body: SellerProfileUpdate,
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)
    ALLOWED_SELLER_FIELDS = {"store_name", "description", "phone", "whatsapp_number", "nid_number", "nid_front_image_key", "nid_back_image_key", "country", "division_state", "district_city", "full_address", "store_logo_key", "store_banner_key", "facebook_url", "youtube_url", "tiktok_url", "website_url", "default_delivery_charge"}
    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        if field not in ALLOWED_SELLER_FIELDS:
            raise HTTPException(status_code=400, detail=f"Field '{field}' cannot be updated")
        setattr(seller, field, value)
    completion = _compute_profile_completion(seller, current_user)
    seller.profile_completion = completion
    await db.commit()
    await db.refresh(seller)
    return {"status": "updated", "profile_completion": completion}


@router.post("/seller/submit")
async def seller_submit_for_review(
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)
    if seller.status != "draft":
        raise HTTPException(400, f"Cannot submit seller with status '{seller.status}'")
    completion = _compute_profile_completion(seller, current_user)
    seller.profile_completion = completion
    if completion < 100.0:
        raise HTTPException(400, f"Complete your profile first (currently {completion}%)")
    seller.status = "pending_review"
    seller.submitted_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "pending_review", "profile_completion": completion}


@router.get("/seller/profile/completion")
async def get_seller_profile_completion(
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)
    completion = _compute_profile_completion(seller, current_user)
    seller.profile_completion = completion
    await db.commit()
    return {"profile_completion": completion, "status": seller.status}


# ── Wallet Transfer ──────────────────────────────────────────────────

@router.post("/wallet/transfer")
async def transfer_to_ecommerce_wallet(
    amount: float,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dec_amount = Decimal(str(amount)).quantize(WALLET_PRECISION)
    available = current_user.main_wallet or Decimal("0")
    if available < dec_amount:
        raise HTTPException(400, "Insufficient main wallet balance")

    current_user.main_wallet = (available - dec_amount).quantize(WALLET_PRECISION)
    current_user.ecommerce_wallet = (current_user.ecommerce_wallet or 0) + dec_amount
    await db.commit()
    return {
        "transferred": float(dec_amount),
        "ecommerce_wallet": float(current_user.ecommerce_wallet),
        "main_wallet": float(current_user.main_wallet),
    }


@router.get("/wallet/balance")
async def get_ecommerce_wallet(
    current_user: User = Depends(get_current_user),
):
    return {
        "ecommerce_wallet": float(current_user.ecommerce_wallet or 0),
        "main_wallet": float(current_user.main_wallet or 0),
    }


# ── Products ─────────────────────────────────────────────────────────

@router.post("/products")
async def create_product(
    name: str,
    price: float,
    seller_id: int | None = None,
    description: str | None = None,
    image_url: str | None = None,
    image_urls: str | list[str] | None = None,
    category: str | None = None,
    arbx_allocated: float = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)
    if not seller:
        raise HTTPException(400, "You must be a seller to add products")
    if seller.status != "approved":
        raise HTTPException(403, "Your seller account is not yet approved")

    if arbx_allocated > 0:
        dec_arbx = Decimal(str(arbx_allocated)).quantize(WALLET_PRECISION)
        if (current_user.arbx_wallet or 0) < dec_arbx:
            raise HTTPException(400, "Insufficient ARBX balance")
        current_user.arbx_wallet = (current_user.arbx_wallet or 0) - dec_arbx

    urls = []
    if image_urls:
        if isinstance(image_urls, list):
            urls = [u.strip() for u in image_urls if u.strip()]
        else:
            urls = [u.strip() for u in image_urls.split(",") if u.strip()]
    if image_url and image_url not in urls:
        urls.insert(0, image_url)

    product = Product(
        seller_id=seller.id,
        name=name,
        description=description,
        price=Decimal(str(price)).quantize(WALLET_PRECISION),
        image_url=image_url,
        image_urls=json.dumps(urls) if urls else None,
        category=category,
        arbx_allocated=Decimal(str(arbx_allocated)).quantize(WALLET_PRECISION),
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return {"product_id": product.id, "name": product.name}


@router.get("/products")
async def list_products(
    category: str | None = None,
    search: str | None = None,
    sort: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_active == True)

    if category:
        query = query.where(Product.category.ilike(f"%{category}%"))
    if search:
        query = query.where(Product.name.ilike(f"%{search}%"))

    if sort == "popular":
        query = query.order_by(Product.arbx_allocated.desc(), Product.created_at.desc())
    elif sort == "newest":
        query = query.order_by(Product.created_at.desc())
    elif sort == "price_low":
        query = query.order_by(Product.price.asc())
    elif sort == "price_high":
        query = query.order_by(Product.price.desc())
    else:
        query = query.order_by(Product.arbx_allocated.desc(), Product.created_at.desc())

    offset = (page - 1) * limit
    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar() or 0

    result = await db.execute(query.offset(offset).limit(limit))
    products = result.scalars().all()

    seller_ids = list(set(p.seller_id for p in products))
    sellers_map = {}
    seller_whatsapp_map = {}
    if seller_ids:
        sellers_result = await db.execute(
            select(Seller).where(Seller.id.in_(seller_ids))
        )
        for s in sellers_result.scalars().all():
            sellers_map[s.id] = s.store_name
            seller_whatsapp_map[s.id] = s.whatsapp_number or ""

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "image_url": p.image_url,
                "image_urls": p.get_image_urls(),
                "category": p.category,
                "store_name": sellers_map.get(p.seller_id, ""),
                "seller_whatsapp": seller_whatsapp_map.get(p.seller_id, ""),
                "arbx_allocated": float(p.arbx_allocated),
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in products
        ],
    }


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
):
    product = await db.execute(select(Product).where(Product.id == product_id))
    product = product.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    seller = await db.execute(select(Seller).where(Seller.id == product.seller_id))
    seller = seller.scalar_one_or_none()

    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "image_url": product.image_url,
        "image_urls": product.get_image_urls(),
        "category": product.category,
        "store_name": seller.store_name if seller else "",
        "seller_status": seller.status if seller else "",
        "seller_whatsapp": seller.whatsapp_number if seller else "",
        "arbx_allocated": float(product.arbx_allocated),
        "is_active": product.is_active,
        "created_at": product.created_at.isoformat() if product.created_at else None,
    }


@router.put("/products/{product_id}")
async def update_product(
    product_id: int,
    name: str | None = None,
    price: float | None = None,
    description: str | None = None,
    image_url: str | None = None,
    image_urls: str | list[str] | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)

    product = await db.execute(select(Product).where(Product.id == product_id))
    product = product.scalar_one_or_none()
    if not product or product.seller_id != seller.id:
        raise HTTPException(404, "Product not found or not yours")

    if name:
        product.name = name
    if price is not None:
        product.price = Decimal(str(price)).quantize(WALLET_PRECISION)
    if description is not None:
        product.description = description
    if image_url is not None:
        product.image_url = image_url
    if image_urls is not None:
        if isinstance(image_urls, list):
            urls = [u.strip() for u in image_urls if u.strip()]
        else:
            urls = [u.strip() for u in image_urls.split(",") if u.strip()]
        if image_url and image_url not in urls:
            urls.insert(0, image_url)
        product.image_urls = json.dumps(urls) if urls else None
    if category is not None:
        product.category = category
    if is_active is not None:
        product.is_active = is_active
    await db.commit()
    return {"status": "updated"}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)

    product = await db.execute(select(Product).where(Product.id == product_id))
    product = product.scalar_one_or_none()
    if not product or product.seller_id != seller.id:
        raise HTTPException(404, "Product not found or not yours")

    await db.execute(delete(CartItem).where(CartItem.product_id == product_id))
    await db.execute(delete(WishlistItem).where(WishlistItem.product_id == product_id))
    await db.execute(delete(CompareItem).where(CompareItem.product_id == product_id))
    await db.execute(delete(ProductReview).where(ProductReview.product_id == product_id))
    await db.execute(delete(ProductView).where(ProductView.product_id == product_id))
    await db.execute(delete(ProductTag).where(ProductTag.product_id == product_id))
    await db.execute(delete(FlashDealProduct).where(FlashDealProduct.product_id == product_id))
    await db.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id == product_id))
    await db.execute(delete(ProductVariant).where(ProductVariant.product_id == product_id))

    await db.delete(product)
    await db.commit()
    return {"status": "deleted"}


# ── Seller's Own Products ────────────────────────────────────────────

@router.get("/seller/products")
async def get_my_products(
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)

    result = await db.execute(
        select(Product).where(Product.seller_id == seller.id).order_by(Product.created_at.desc())
    )
    products = result.scalars().all()
    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "price": float(p.price),
                "image_url": p.image_url,
                "image_urls": p.get_image_urls(),
                "category": p.category,
                "arbx_allocated": float(p.arbx_allocated),
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in products
        ]
    }


@router.post("/products/upload-image")
async def upload_product_image(
    file: UploadFile = File(...),
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await validate_upload_file(file)
    seller = await _get_seller(db, current_user, seller_id)

    object_key = await upload_to_b2(file, f"products/{seller.id}")
    presigned = generate_presigned_url(object_key)
    if presigned:
        return {"image_url": presigned, "object_key": object_key}
    return {"object_key": object_key}


# ── Seller Image Upload ────────────────────────────────────────────


@router.post("/seller/upload-image")
async def upload_seller_image(
    file: UploadFile = File(...),
    image_type: str = "logo",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a seller store image (logo, banner, nid_front, nid_back).
    Returns the object key which can be saved to the seller profile.
    """
    if image_type not in ("logo", "banner", "nid_front", "nid_back"):
        raise HTTPException(400, f"Invalid image_type: {image_type}. Use: logo, banner, nid_front, nid_back")
    await validate_upload_file(file)

    result = await db.execute(
        select(Seller).where(Seller.user_id == current_user.id).order_by(Seller.created_at.desc())
    )
    seller = result.scalars().first()
    if not seller:
        raise HTTPException(400, "You must be a seller first")

    object_key = await upload_to_b2(file, f"sellers/{seller.id}/{image_type}")
    presigned = generate_presigned_url(object_key)
    if presigned:
        return {"image_url": presigned, "object_key": object_key}
    return {"object_key": object_key}


# ── Orders (COD) ─────────────────────────────────────────────────────

@router.post("/orders")
async def place_order(
    order_data: PlaceOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not order_data.items:
        raise HTTPException(400, "Order must have at least one item")

    customer_name = (order_data.customer_name or current_user.full_name or "").strip()
    customer_email = (order_data.customer_email or current_user.email or "").strip().lower()
    customer_phone = (order_data.customer_phone or "").strip()
    customer_address = (order_data.customer_address or "").strip()

    if not customer_name:
        raise HTTPException(400, "Full name is required")
    if not customer_email:
        raise HTTPException(400, "Email is required")
    if "@" not in customer_email or "." not in customer_email.split("@")[-1]:
        raise HTTPException(400, "Invalid email format")
    if not customer_phone or not re.match(r"^\+?[\d\s\-\(\)]{7,20}$", customer_phone):
        raise HTTPException(400, "Valid phone number is required")
    if not customer_address:
        raise HTTPException(400, "Delivery address is required")

    product_ids = [i.product_id for i in order_data.items]
    result = await db.execute(
        select(Product).where(Product.id.in_(product_ids), Product.is_active == True)
    )
    products = {p.id: p for p in result.scalars().all()}

    total = Decimal("0")
    order_items_data = []
    seller_id = None

    for item in order_data.items:
        pid = item.product_id
        qty = max(1, int(item.quantity))
        product = products.get(pid)
        if not product:
            raise HTTPException(400, f"Product {pid} not found or inactive")

        if seller_id is None:
            seller_id = product.seller_id
        elif product.seller_id != seller_id:
            raise HTTPException(400, "All items must be from the same seller")

        price = product.price
        line_total = price * qty
        total += line_total
        order_items_data.append({
            "product_id": pid,
            "quantity": qty,
            "price": price,
        })

    config = await db.execute(select(EcommerceConfig).limit(1))
    cfg = config.scalar_one_or_none()
    fee_percent = cfg.seller_order_fee_percent if cfg else Decimal("5.00")
    fee_amount = (total * fee_percent / Decimal("100")).quantize(WALLET_PRECISION)
    seller_payout = (total - fee_amount).quantize(WALLET_PRECISION)

    order = Order(
        user_id=current_user.id,
        seller_id=seller_id,
        total=total.quantize(WALLET_PRECISION),
        fee_percent=fee_percent,
        fee_amount=fee_amount,
        seller_payout=seller_payout,
        payment_method="cod",
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        customer_address=customer_address,
        shipping_address=order_data.shipping_address or customer_address,
    )
    db.add(order)
    await db.flush()

    for oi in order_items_data:
        db.add(OrderItem(order_id=order.id, **oi))

    await db.commit()
    await db.refresh(order)
    return {
        "order_id": order.id,
        "total": float(order.total),
        "fee_percent": float(order.fee_percent),
        "fee_amount": float(order.fee_amount),
        "seller_payout": float(order.seller_payout),
        "status": order.status,
    }


@router.get("/orders")
async def list_my_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return {
        "orders": [
            {
                "id": o.id,
                "total": float(o.total),
                "fee_percent": float(o.fee_percent) if o.fee_percent else None,
                "fee_amount": float(o.fee_amount) if o.fee_amount else 0,
                "seller_payout": float(o.seller_payout) if o.seller_payout else 0,
                "status": o.status,
                "payment_method": o.payment_method,
                "customer_name": o.customer_name,
                "customer_email": o.customer_email,
                "customer_phone": o.customer_phone,
                "customer_address": o.customer_address,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ]
    }


@router.get("/orders/{order_id}")
async def get_order_detail(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = order.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    items_result = await db.execute(
        select(OrderItem).where(OrderItem.order_id == order.id)
    )
    items = items_result.scalars().all()

    return {
        "id": order.id,
        "total": float(order.total),
        "fee_percent": float(order.fee_percent) if order.fee_percent else None,
        "fee_amount": float(order.fee_amount) if order.fee_amount else 0,
        "seller_payout": float(order.seller_payout) if order.seller_payout else 0,
        "status": order.status,
        "payment_method": order.payment_method,
        "customer_name": order.customer_name,
        "customer_email": order.customer_email,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "shipping_address": order.shipping_address,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [
            {
                "product_id": i.product_id,
                "quantity": i.quantity,
                "price": float(i.price),
            }
            for i in items
        ],
    }


# ── Seller Orders ────────────────────────────────────────────────────

@router.get("/seller/orders")
async def get_seller_orders(
    seller_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller(db, current_user, seller_id)

    result = await db.execute(
        select(Order)
        .where(Order.seller_id == seller.id)
        .order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return {
        "orders": [
            {
                "id": o.id,
                "total": float(o.total),
                "fee_percent": float(o.fee_percent) if o.fee_percent else None,
                "fee_amount": float(o.fee_amount) if o.fee_amount else 0,
                "seller_payout": float(o.seller_payout) if o.seller_payout else 0,
                "status": o.status,
                "payment_method": o.payment_method,
                "customer_name": o.customer_name,
                "customer_email": o.customer_email,
                "customer_phone": o.customer_phone,
                "customer_address": o.customer_address,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ]
    }


# ── ARBX Config (public read) ────────────────────────────────────────

@router.get("/config")
async def get_public_config(
    db: AsyncSession = Depends(get_db),
):
    config = await db.execute(select(EcommerceConfig).limit(1))
    cfg = config.scalar_one_or_none()
    if not cfg:
        return {"signup_bonus_arbx": 50}
    return {"signup_bonus_arbx": float(cfg.signup_bonus_arbx)}


# ── Admin Endpoints ──────────────────────────────────────────────────

@router.get("/admin/sellers")
async def admin_list_sellers(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    query = select(Seller)
    if status_filter:
        query = query.where(Seller.status == status_filter)
    query = query.order_by(Seller.created_at.desc())

    result = await db.execute(query)
    sellers = result.scalars().all()

    user_ids = [s.user_id for s in sellers]
    users_map = {}
    if user_ids:
        users_result = await db.execute(
            select(User).where(User.id.in_(user_ids))
        )
        for u in users_result.scalars().all():
            users_map[u.id] = {"email": u.email, "full_name": u.full_name}

    return {
        "sellers": [
            {
                "id": s.id,
                "user_id": s.user_id,
                "store_name": s.store_name,
                "description": s.description,
                "status": s.status,
                "phone": s.phone,
                "whatsapp_number": s.whatsapp_number,
                "nid_number": s.nid_number,
                "nid_front_image_key": s.nid_front_image_key,
                "nid_back_image_key": s.nid_back_image_key,
                "country": s.country,
                "division_state": s.division_state,
                "district_city": s.district_city,
                "full_address": s.full_address,
                "store_logo_key": s.store_logo_key,
                "store_banner_key": s.store_banner_key,
                "facebook_url": s.facebook_url,
                "youtube_url": s.youtube_url,
                "tiktok_url": s.tiktok_url,
                "website_url": s.website_url,
                "profile_completion": float(s.profile_completion or 0),
                "rejection_reason": s.rejection_reason,
                "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
                "user_email": users_map.get(s.user_id, {}).get("email", ""),
                "user_name": users_map.get(s.user_id, {}).get("full_name", ""),
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in sellers
        ]
    }


@router.patch("/admin/sellers/{seller_id}/status")
async def admin_update_seller_status(
    seller_id: int,
    status: str,
    rejection_reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    if status not in ("pending_review", "approved", "rejected"):
        raise HTTPException(400, "Invalid status. Use: pending_review, approved, rejected")

    seller = await db.execute(select(Seller).where(Seller.id == seller_id))
    seller = seller.scalar_one_or_none()
    if not seller:
        raise HTTPException(404, "Seller not found")

    was_approved = seller.status == "approved"
    seller.status = status

    if status == "rejected":
        seller.rejection_reason = rejection_reason
    elif status == "approved" and not was_approved:
        user = await db.execute(select(User).where(User.id == seller.user_id))
        user = user.scalar_one_or_none()
        if user:
            config = await db.execute(select(EcommerceConfig).limit(1))
            cfg = config.scalar_one_or_none()
            bonus = cfg.signup_bonus_arbx if cfg else Decimal("50")
            user.arbx_wallet = (user.arbx_wallet or 0) + bonus

    await db.commit()
    return {"status": "updated", "seller_status": status}


@router.get("/admin/ecommerce-config")
async def admin_get_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    config = await db.execute(select(EcommerceConfig).limit(1))
    cfg = config.scalar_one_or_none()
    if not cfg:
        cfg = EcommerceConfig()
        db.add(cfg)
        await db.commit()
        await db.refresh(cfg)
    return {
        "signup_bonus_arbx": float(cfg.signup_bonus_arbx),
        "seller_order_fee_percent": float(cfg.seller_order_fee_percent),
    }


@router.put("/admin/ecommerce-config")
async def admin_update_config(
    signup_bonus_arbx: float | None = None,
    seller_order_fee_percent: float | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    config = await db.execute(select(EcommerceConfig).limit(1))
    cfg = config.scalar_one_or_none()
    if not cfg:
        cfg = EcommerceConfig()
        db.add(cfg)
    if signup_bonus_arbx is not None:
        cfg.signup_bonus_arbx = Decimal(str(signup_bonus_arbx)).quantize(WALLET_PRECISION)
    if seller_order_fee_percent is not None:
        cfg.seller_order_fee_percent = Decimal(str(seller_order_fee_percent)).quantize(Decimal("0.01"))
    await db.commit()
    return {
        "status": "updated",
        "signup_bonus_arbx": float(cfg.signup_bonus_arbx),
        "seller_order_fee_percent": float(cfg.seller_order_fee_percent),
    }


@router.get("/admin/sellers/{seller_id}/products")
async def admin_list_seller_products(
    seller_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Product).where(Product.seller_id == seller_id).order_by(Product.created_at.desc())
    )
    products = result.scalars().all()
    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "price": float(p.price),
                "image_urls": p.get_image_urls(),
                "is_active": p.is_active,
                "arbx_allocated": float(p.arbx_allocated),
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in products
        ]
    }


@router.delete("/seller/store/{seller_id}")
async def delete_seller_store(
    seller_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Seller).where(Seller.id == seller_id, Seller.user_id == current_user.id)
    )
    seller = result.scalar_one_or_none()
    if not seller:
        raise HTTPException(404, "Store not found")

    prod_result = await db.execute(
        select(Product).where(Product.seller_id == seller.id)
    )
    products = prod_result.scalars().all()
    for product in products:
        await db.execute(delete(CartItem).where(CartItem.product_id == product.id))
        await db.execute(delete(WishlistItem).where(WishlistItem.product_id == product.id))
        await db.execute(delete(CompareItem).where(CompareItem.product_id == product.id))
        await db.execute(delete(ProductReview).where(ProductReview.product_id == product.id))
        await db.execute(delete(ProductView).where(ProductView.product_id == product.id))
        await db.execute(delete(ProductTag).where(ProductTag.product_id == product.id))
        await db.execute(delete(FlashDealProduct).where(FlashDealProduct.product_id == product.id))
        await db.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id == product.id))
        await db.execute(delete(ProductVariant).where(ProductVariant.product_id == product.id))
        await db.delete(product)

    await db.execute(delete(SellerDeliveryZone).where(SellerDeliveryZone.seller_id == seller.id))
    await db.execute(delete(VendorWithdraw).where(VendorWithdraw.seller_id == seller.id))

    o_result = await db.execute(
        select(Order).where(Order.seller_id == seller.id)
    )
    orders = o_result.scalars().all()
    for order in orders:
        await db.execute(delete(OrderItem).where(OrderItem.order_id == order.id))
        await db.delete(order)

    await db.delete(seller)
    await db.commit()

    return {"status": "deleted", "seller_id": seller_id}


@router.get("/admin/sellers/stats")
async def admin_get_seller_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    result = await db.execute(
        select(Seller.status, func.count(Seller.id))
        .group_by(Seller.status)
    )
    rows = result.all()
    counts = {row[0]: row[1] for row in rows}
    return {
        "total": sum(counts.values()),
        "draft": counts.get("draft", 0),
        "pending_review": counts.get("pending_review", 0),
        "approved": counts.get("approved", 0),
        "rejected": counts.get("rejected", 0),
    }
