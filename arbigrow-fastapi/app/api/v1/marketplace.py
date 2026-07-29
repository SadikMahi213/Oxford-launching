import json, math, re
from datetime import datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File, Form, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete, desc, asc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.utils.notifications import notify_admin
from app.models.user import User
from app.models.seller import Seller
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.ecommerce_config import EcommerceConfig
from app.models.ecommerce_wallet_transaction import EcommerceWalletTransaction
from app.models.delivery_zone import DeliveryZone
from app.models.category import Category
from app.models.brand import Brand
from app.models.product_variant import ProductVariant
from app.models.product_attribute import ProductAttribute
from app.models.product_attribute_value import ProductAttributeValue
from app.models.product_tag import ProductTag
from app.models.product_review import ProductReview
from app.models.cart import Cart, CartItem
from app.models.coupon import Coupon, CouponUsage
from app.models.wishlist import WishlistItem
from app.models.compare import CompareItem
from app.models.shipping import ShippingZone, ShippingClass, ShippingRate
from app.models.commission import CommissionRule
from app.models.flash_deal import FlashDeal, FlashDealProduct
from app.models.admin_delivery_zone import AdminDeliveryZone
from app.models.seller_delivery_zone import SellerDeliveryZone
from app.models.vendor_withdraw import VendorWithdraw
from app.models.product_view import ProductView
from app.services.b2_service import upload_to_b2, generate_presigned_url

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
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
def dec(v):
    return Decimal(str(v)).quantize(WALLET_PRECISION)

# ── Helpers ───────────────────────────────────────────────────────

async def _get_seller_for_user(db, user_id, seller_id=None):
    q = select(Seller).where(Seller.user_id == user_id)
    if seller_id:
        q = q.where(Seller.id == seller_id)
    r = await db.execute(q)
    if seller_id:
        s = r.scalar_one_or_none()
    else:
        s = r.scalars().first()
    if not s:
        raise HTTPException(404, "Store not found")
    return s

async def _get_product(db, product_id):
    r = await db.execute(select(Product).where(Product.id == product_id))
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    return p

async def _get_category(db, category_id):
    r = await db.execute(select(Category).where(Category.id == category_id))
    c = r.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Category not found")
    return c

def _seller_to_dict(seller):
    return {
        "id": seller.id,
        "user_id": seller.user_id,
        "store_name": seller.store_name,
        "description": seller.description,
        "status": seller.status,
        "phone": seller.phone,
        "whatsapp_number": seller.whatsapp_number,
        "country": seller.country,
        "division_state": seller.division_state,
        "district_city": seller.district_city,
        "full_address": seller.full_address,
        "store_logo_url": generate_presigned_url(seller.store_logo_key),
        "store_banner_url": generate_presigned_url(seller.store_banner_key),
        "facebook_url": seller.facebook_url,
        "youtube_url": seller.youtube_url,
        "tiktok_url": seller.tiktok_url,
        "website_url": seller.website_url,
        "profile_completion": float(seller.profile_completion or 0),
        "rejection_reason": seller.rejection_reason,
        "submitted_at": str(seller.submitted_at) if seller.submitted_at else None,
        "created_at": str(seller.created_at),
    }

def _product_to_dict(product, include_variants=True):
    d = {
        "id": product.id,
        "seller_id": product.seller_id,
        "name": product.name,
        "description": product.description,
        "price": float(product.price),
        "image_urls": product.get_image_urls(),
        "category": product.category,
        "is_active": product.is_active,
        "created_at": str(product.created_at),
        "sku": getattr(product, "sku", None),
        "stock_quantity": getattr(product, "stock_quantity", 0),
        "discount_price": float(product.discount_price) if hasattr(product, "discount_price") and product.discount_price else None,
    }
    if include_variants:
        d["variants"] = []
    return d

def _presign_product_images(product):
    urls = product.get_image_urls()
    return [generate_presigned_url(u) if u and not u.startswith("http") else u for u in urls]

# ──────────────────────────────────────────────────────────────────
#  CATEGORIES
# ──────────────────────────────────────────────────────────────────

@router.get("/categories")
async def list_categories(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Category).where(Category.is_active == True).order_by(Category.sort_order))
    cats = r.scalars().all()
    return {
        "categories": [
            {
                "id": c.id,
                "parent_id": c.parent_id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "icon": c.icon,
                "image_url": generate_presigned_url(c.image_key),
                "sort_order": c.sort_order,
            }
            for c in cats
        ]
    }

@router.get("/admin/categories")
async def admin_list_categories(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Category).order_by(Category.sort_order))
    cats = r.scalars().all()
    return {"categories": [{"id": c.id, "parent_id": c.parent_id, "name": c.name, "slug": c.slug, "description": c.description, "icon": c.icon, "image_url": generate_presigned_url(c.image_key), "sort_order": c.sort_order, "is_active": c.is_active} for c in cats]}

@router.post("/admin/categories")
async def create_category(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    cat = Category(name=data["name"], slug=data.get("slug", data["name"].lower().replace(" ", "-")),
                   parent_id=data.get("parent_id"), description=data.get("description"),
                   icon=data.get("icon"), sort_order=data.get("sort_order", 0))
    if data.get("is_active") is not None:
        cat.is_active = data["is_active"]
    db.add(cat)
    await db.commit()
    await db.refresh(cat)
    return {"category": {"id": cat.id, "name": cat.name, "slug": cat.slug}}

@router.put("/admin/categories/{category_id}")
async def update_category(category_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    cat = await _get_category(db, category_id)
    for field in ("name", "slug", "parent_id", "description", "icon", "sort_order", "is_active"):
        if field in data:
            setattr(cat, field, data[field])
    await db.commit()
    await db.refresh(cat)
    return {"category": {"id": cat.id, "name": cat.name, "slug": cat.slug}}

@router.delete("/admin/categories/{category_id}")
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    cat = await _get_category(db, category_id)
    await db.delete(cat)
    await db.commit()
    return {"message": "Category deleted"}

@router.post("/admin/categories/image")
async def upload_category_image(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    await validate_upload_file(file)
    key = await upload_to_b2(file, "categories")
    return {"image_key": key, "image_url": generate_presigned_url(key)}

# ──────────────────────────────────────────────────────────────────
#  BRANDS
# ──────────────────────────────────────────────────────────────────

@router.get("/brands")
async def list_brands(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Brand).where(Brand.is_active == True).order_by(Brand.sort_order))
    return {"brands": [{"id": b.id, "name": b.name, "slug": b.slug, "description": b.description, "logo_url": generate_presigned_url(b.logo_key), "website_url": b.website_url} for b in r.scalars().all()]}

@router.get("/admin/brands")
async def admin_list_brands(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Brand).order_by(Brand.sort_order))
    return {"brands": [{"id": b.id, "name": b.name, "slug": b.slug, "description": b.description, "logo_url": generate_presigned_url(b.logo_key), "website_url": b.website_url, "is_active": b.is_active} for b in r.scalars().all()]}

@router.post("/admin/brands")
async def create_brand(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    brand = Brand(name=data["name"], slug=data.get("slug", data["name"].lower().replace(" ", "-")),
                  description=data.get("description"), website_url=data.get("website_url"),
                  sort_order=data.get("sort_order", 0), is_active=data.get("is_active", True))
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return {"brand": {"id": brand.id, "name": brand.name}}

@router.put("/admin/brands/{brand_id}")
async def update_brand(brand_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = r.scalar_one_or_none()
    if not brand:
        raise HTTPException(404, "Brand not found")
    for field in ("name", "slug", "description", "website_url", "sort_order", "is_active"):
        if field in data:
            setattr(brand, field, data[field])
    await db.commit()
    await db.refresh(brand)
    return {"brand": {"id": brand.id, "name": brand.name}}

@router.delete("/admin/brands/{brand_id}")
async def delete_brand(brand_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = r.scalar_one_or_none()
    if not brand:
        raise HTTPException(404, "Brand not found")
    await db.delete(brand)
    await db.commit()
    return {"message": "Brand deleted"}

@router.post("/admin/brands/logo")
async def upload_brand_logo(file: UploadFile = File(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    await validate_upload_file(file)
    key = await upload_to_b2(file, "brands")
    return {"logo_key": key, "logo_url": generate_presigned_url(key)}

# ──────────────────────────────────────────────────────────────────
#  PRODUCTS EXTENDED
# ──────────────────────────────────────────────────────────────────

@router.get("/products")
async def list_products(
    category: str = None, search: str = None, min_price: float = None, max_price: float = None,
    sort_by: str = "newest", page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    seller_id: int = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).where(Product.is_active == True)
    if category:
        q = q.where(Product.category == category)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%"))
    if min_price is not None:
        q = q.where(Product.price >= Decimal(str(min_price)))
    if max_price is not None:
        q = q.where(Product.price <= Decimal(str(max_price)))
    if seller_id:
        q = q.where(Product.seller_id == seller_id)

    # count
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    if sort_by == "price_asc":
        q = q.order_by(Product.price.asc())
    elif sort_by == "price_desc":
        q = q.order_by(Product.price.desc())
    else:
        q = q.order_by(Product.created_at.desc())

    offset = (page - 1) * per_page
    q = q.offset(offset).limit(per_page)
    r = await db.execute(q)
    products = r.scalars().all()

    return {
        "products": [_product_to_dict(p) for p in products],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if total > 0 else 0,
    }

@router.get("/products/featured")
async def featured_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product).where(Product.is_active == True).order_by(Product.created_at.desc()).limit(8))
    return {"products": [_product_to_dict(p) for p in r.scalars().all()]}

@router.get("/products/best-selling")
async def best_selling_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product).where(Product.is_active == True, Product.discount_price.isnot(None)).order_by(Product.discount_price.desc(), Product.created_at.desc()).limit(8))
    return {"products": [_product_to_dict(p) for p in r.scalars().all()]}

@router.get("/products/new-arrivals")
async def new_arrivals(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product).where(Product.is_active == True).order_by(Product.created_at.desc()).limit(8))
    return {"products": [_product_to_dict(p) for p in r.scalars().all()]}

@router.get("/products/trending")
async def trending_products(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(Product).where(Product.is_active == True).order_by(func.random()).limit(8))
    return {"products": [_product_to_dict(p) for p in r.scalars().all()]}

@router.post("/products")
async def create_marketplace_product(
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller_for_user(db, current_user.id)
    if not seller:
        raise HTTPException(400, "You must be a seller to create products")
    if seller.status != "approved":
        raise HTTPException(403, "Your seller account is not yet approved")

    product = Product(
        seller_id=seller.id,
        name=data["name"],
        description=data.get("description"),
        price=Decimal(str(data["price"])).quantize(WALLET_PRECISION),
        category=data.get("category"),
        image_urls=json.dumps(data.get("image_urls", [])) if data.get("image_urls") else None,
        image_url=data.get("image_url"),
        is_active=False,
    )
    # Set optional fields if they exist on the model
    for field in ("sku", "stock_quantity", "discount_price"):
        if field in data and hasattr(product, field):
            val = data[field]
            if field in ("discount_price",) and val is not None:
                val = Decimal(str(val)).quantize(WALLET_PRECISION)
            setattr(product, field, val)

    db.add(product)
    await db.commit()
    await db.refresh(product)
    return {"product": _product_to_dict(product)}

@router.put("/products/{product_id}")
async def update_marketplace_product(
    product_id: int,
    data: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    seller = await _get_seller_for_user(db, current_user.id)
    if not seller:
        raise HTTPException(400, "Not a seller")
    p = await _get_product(db, product_id)
    if p.seller_id != seller.id:
        raise HTTPException(403, "Not your product")

    updatable = {"name", "description", "price", "category", "sku", "stock_quantity", "discount_price", "is_active", "image_urls", "image_url"}
    for k, v in data.items():
        if k in updatable and hasattr(p, k):
            if k in ("price", "discount_price") and v is not None:
                v = Decimal(str(v)).quantize(WALLET_PRECISION)
            if k == "image_urls" and isinstance(v, list):
                v = json.dumps(v)
            setattr(p, k, v)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return {"product": _product_to_dict(p)}

@router.get("/products/{product_id}")
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    p = await _get_product(db, product_id)
    d = _product_to_dict(p)
    d["image_urls"] = _presign_product_images(p)

    # Get variants
    vr = await db.execute(select(ProductVariant).where(ProductVariant.product_id == p.id, ProductVariant.is_active == True).order_by(ProductVariant.sort_order))
    d["variants"] = [{"id": v.id, "name": v.name, "sku": v.sku, "price": float(v.price), "compare_at_price": float(v.compare_at_price) if v.compare_at_price else None, "stock": v.stock, "low_stock_threshold": v.low_stock_threshold, "weight": float(v.weight) if v.weight else None, "image_url": generate_presigned_url(v.image_key), "is_default": v.is_default} for v in vr.scalars().all()]

    # Tags
    tr = await db.execute(select(ProductTag).where(ProductTag.product_id == p.id))
    d["tags"] = [t.tag for t in tr.scalars().all()]

    # Attributes
    ar = await db.execute(select(ProductAttributeValue).where(ProductAttributeValue.product_id == p.id))
    avs = ar.scalars().all()
    attr_ids = [av.attribute_id for av in avs]
    if attr_ids:
        atr = await db.execute(select(ProductAttribute).where(ProductAttribute.id.in_(attr_ids)))
        attrs = {a.id: a.name for a in atr.scalars().all()}
    else:
        attrs = {}
    d["attributes"] = [{"attribute": attrs.get(av.attribute_id, "Unknown"), "value": av.value} for av in avs]

    # Rating
    rr = await db.execute(select(func.avg(ProductReview.rating), func.count(ProductReview.id)).where(ProductReview.product_id == p.id, ProductReview.is_approved == True))
    row = rr.first()
    d["rating_avg"] = float(row[0]) if row and row[0] else 0
    d["rating_count"] = row[1] if row else 0

    # Seller info
    sr = await db.execute(select(Seller).where(Seller.id == p.seller_id))
    seller = sr.scalar_one_or_none()
    d["seller"] = {"id": seller.id, "store_name": seller.store_name, "store_logo_url": generate_presigned_url(seller.store_logo_key), "whatsapp_number": seller.whatsapp_number} if seller else None

    return {"product": d}

@router.post("/products/{product_id}/view")
async def track_product_view(product_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = await _get_product(db, product_id)
    pv = ProductView(product_id=product_id, user_id=current_user.id)
    db.add(pv)
    await db.commit()
    return {"message": "View tracked"}

# ──────────────────────────────────────────────────────────────────
#  CART
# ──────────────────────────────────────────────────────────────────

@router.get("/cart")
async def get_cart(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = r.scalar_one_or_none()
    if not cart:
        return {"cart": None, "items": [], "total": 0, "item_count": 0}

    ir = await db.execute(
        select(CartItem).where(CartItem.cart_id == cart.id)
    )
    items = ir.scalars().all()
    product_ids = {ci.product_id for ci in items}
    variant_ids = {ci.variant_id for ci in items if ci.variant_id}
    products_r = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products_map = {p.id: p for p in products_r.scalars().all()}
    variants_map = {}
    if variant_ids:
        vr = await db.execute(select(ProductVariant).where(ProductVariant.id.in_(variant_ids)))
        for v in vr.scalars().all():
            variants_map[v.id] = v
    item_list = []
    total = Decimal("0")
    for ci in items:
        p = products_map.get(ci.product_id)
        if not p:
            continue
        price = Decimal("0")
        variant = None
        if ci.variant_id and ci.variant_id in variants_map:
            v = variants_map[ci.variant_id]
            price = dec(v.price)
            variant = {"id": v.id, "name": v.name, "sku": v.sku}
        if price == 0:
            price = dec(p.price)
        subtotal = dec(price * Decimal(str(ci.quantity)))
        total += subtotal
        item_list.append({
            "id": ci.id,
            "product_id": p.id,
            "seller_id": p.seller_id,
            "product_name": p.name,
            "product_image": _presign_product_images(p)[0] if p.get_image_urls() else None,
            "variant": variant,
            "quantity": ci.quantity,
            "price": float(price),
            "subtotal": float(subtotal),
        })

    return {"cart": {"id": cart.id}, "items": item_list, "total": float(total), "item_count": len(item_list)}

@router.post("/cart/add")
async def add_to_cart(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_id = data["product_id"]
    quantity = data.get("quantity", 1)
    variant_id = data.get("variant_id")

    p = await _get_product(db, product_id)
    if not p.is_active:
        raise HTTPException(400, "Product is not available")

    if variant_id:
        vr = await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id, ProductVariant.product_id == product_id))
        v = vr.scalar_one_or_none()
        if not v or not v.is_active:
            raise HTTPException(400, "Variant not available")

    # Get or create cart
    r = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = r.scalar_one_or_none()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.add(cart)
        await db.flush()

    # Check if item already in cart
    eq = select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
    if variant_id:
        eq = eq.where(CartItem.variant_id == variant_id)
    else:
        eq = eq.where(CartItem.variant_id == None)

    er = await db.execute(eq)
    existing = er.scalar_one_or_none()
    if existing:
        existing.quantity += quantity
    else:
        ci = CartItem(cart_id=cart.id, product_id=product_id, variant_id=variant_id, quantity=quantity)
        db.add(ci)

    await db.commit()
    return {"message": "Added to cart"}

@router.put("/cart/item/{item_id}")
async def update_cart_item(item_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(CartItem).join(Cart).where(CartItem.id == item_id, Cart.user_id == current_user.id))
    ci = r.scalar_one_or_none()
    if not ci:
        raise HTTPException(404, "Cart item not found")
    ci.quantity = data.get("quantity", ci.quantity)
    await db.commit()
    return {"message": "Cart updated"}

@router.delete("/cart/item/{item_id}")
async def remove_cart_item(item_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(CartItem).join(Cart).where(CartItem.id == item_id, Cart.user_id == current_user.id))
    ci = r.scalar_one_or_none()
    if not ci:
        raise HTTPException(404, "Cart item not found")
    await db.delete(ci)
    await db.commit()
    return {"message": "Item removed"}

@router.delete("/cart")
async def clear_cart(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = r.scalar_one_or_none()
    if cart:
        await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
        await db.commit()
    return {"message": "Cart cleared"}

# ──────────────────────────────────────────────────────────────────
#  WISHLIST
# ──────────────────────────────────────────────────────────────────

@router.get("/wishlist")
async def get_wishlist(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(WishlistItem).where(WishlistItem.user_id == current_user.id).order_by(WishlistItem.created_at.desc()))
    items = r.scalars().all()
    return {"wishlist": [{"id": w.id, "product_id": w.product_id, "created_at": str(w.created_at)} for w in items]}

@router.post("/wishlist/add")
async def add_to_wishlist(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_id = data["product_id"]
    p = await _get_product(db, product_id)
    # Check if already exists
    r = await db.execute(select(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id))
    if not r.scalar_one_or_none():
        w = WishlistItem(user_id=current_user.id, product_id=product_id)
        db.add(w)
        await db.commit()
    return {"message": "Added to wishlist"}

@router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await db.execute(delete(WishlistItem).where(WishlistItem.user_id == current_user.id, WishlistItem.product_id == product_id))
    await db.commit()
    return {"message": "Removed from wishlist"}

# ──────────────────────────────────────────────────────────────────
#  COMPARE
# ──────────────────────────────────────────────────────────────────

@router.get("/compare")
async def get_compare(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(CompareItem).where(CompareItem.user_id == current_user.id))
    return {"compare": [{"id": c.id, "product_id": c.product_id} for c in r.scalars().all()]}

@router.post("/compare/add")
async def add_to_compare(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    product_id = data["product_id"]
    p = await _get_product(db, product_id)
    # Check count (max 4)
    cr = await db.execute(select(func.count()).select_from(select(CompareItem).where(CompareItem.user_id == current_user.id).subquery()))
    count = cr.scalar() or 0
    if count >= 4:
        raise HTTPException(400, "Maximum 4 products can be compared")
    r = await db.execute(select(CompareItem).where(CompareItem.user_id == current_user.id, CompareItem.product_id == product_id))
    if not r.scalar_one_or_none():
        c = CompareItem(user_id=current_user.id, product_id=product_id)
        db.add(c)
        await db.commit()
    return {"message": "Added to compare"}

@router.delete("/compare/{product_id}")
async def remove_from_compare(product_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await db.execute(delete(CompareItem).where(CompareItem.user_id == current_user.id, CompareItem.product_id == product_id))
    await db.commit()
    return {"message": "Removed from compare"}

# ──────────────────────────────────────────────────────────────────
#  COUPONS
# ──────────────────────────────────────────────────────────────────

@router.post("/coupons/validate")
async def validate_coupon(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    code = data.get("code", "").strip().upper()
    order_total = dec(data.get("order_total", 0))

    r = await db.execute(select(Coupon).where(Coupon.code == code, Coupon.is_active == True))
    coupon = r.scalar_one_or_none()
    if not coupon:
        raise HTTPException(400, "Invalid coupon code")

    now = datetime.now(timezone.utc)
    if coupon.start_date and coupon.start_date > now:
        raise HTTPException(400, "Coupon not yet active")
    if coupon.end_date and coupon.end_date < now:
        raise HTTPException(400, "Coupon has expired")
    if coupon.usage_limit and coupon.used_count >= coupon.usage_limit:
        raise HTTPException(400, "Coupon usage limit reached")
    if coupon.minimum_order_amount and order_total < dec(coupon.minimum_order_amount):
        raise HTTPException(400, f"Minimum order amount of ${float(coupon.minimum_order_amount):.2f} required")
    if coupon.usage_limit_per_user:
        ur = await db.execute(select(func.count()).select_from(select(CouponUsage).where(CouponUsage.coupon_id == coupon.id, CouponUsage.user_id == current_user.id).subquery()))
        if (ur.scalar() or 0) >= coupon.usage_limit_per_user:
            raise HTTPException(400, "Coupon usage limit reached for this user")

    # Calculate discount
    if coupon.discount_type == "percentage":
        discount = dec(order_total * coupon.discount_value / Decimal("100"))
        if coupon.maximum_discount and discount > dec(coupon.maximum_discount):
            discount = dec(coupon.maximum_discount)
    else:
        discount = dec(coupon.discount_value)
        if discount > order_total:
            discount = order_total

    return {"valid": True, "coupon_id": coupon.id, "code": coupon.code, "discount": float(discount), "discount_type": coupon.discount_type}

# ──────────────────────────────────────────────────────────────────
#  CHECKOUT & ORDERS
# ──────────────────────────────────────────────────────────────────

@router.post("/checkout")
async def checkout(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    items_data = data.get("items", [])
    if not items_data:
        raise HTTPException(400, "No items in order")

    customer_name = data.get("customer_name", current_user.full_name or current_user.username)
    customer_email = data.get("customer_email", current_user.email)
    customer_phone = data.get("customer_phone", "")
    customer_address = data.get("customer_address", "")
    shipping_address = data.get("shipping_address", customer_address)
    zone_id = data.get("zone_id")
    coupon_code = data.get("coupon_code")
    shipping_method = data.get("shipping_method", "flat_rate")
    payment_method = data.get("payment_method", "cod")

    # Get config
    cr = await db.execute(select(EcommerceConfig).limit(1))
    config = cr.scalar_one_or_none()
    seller_fee = dec(config.seller_order_fee_percent) if config else dec("5.00")

    # Group items by seller
    seller_groups = {}
    for item_data in items_data:
        pid = item_data["product_id"]
        qty = item_data.get("quantity", 1)
        variant_id = item_data.get("variant_id")

        pr = await db.execute(select(Product).where(Product.id == pid))
        p = pr.scalar_one_or_none()
        if not p or not p.is_active:
            raise HTTPException(400, f"Product {pid} not found or inactive")

        price = dec(p.price)
        if variant_id:
            vr = await db.execute(select(ProductVariant).where(ProductVariant.id == variant_id, ProductVariant.product_id == pid))
            v = vr.scalar_one_or_none()
            if v:
                price = dec(v.price)

        if p.seller_id not in seller_groups:
            seller_groups[p.seller_id] = []
        seller_groups[p.seller_id].append({"product": p, "variant_id": variant_id, "quantity": qty, "price": price})

    # Process coupon
    discount_amount = dec("0")
    if coupon_code:
        cr = await db.execute(select(Coupon).where(Coupon.code == coupon_code.upper(), Coupon.is_active == True))
        coupon = cr.scalar_one_or_none()
        if coupon:
            total_before = sum(item["price"] * Decimal(str(item["quantity"])) for items in seller_groups.values() for item in items)
            if coupon.discount_type == "percentage":
                discount_amount = dec(total_before * coupon.discount_value / Decimal("100"))
                if coupon.maximum_discount and discount_amount > dec(coupon.maximum_discount):
                    discount_amount = dec(coupon.maximum_discount)
            else:
                discount_amount = dec(coupon.discount_value)
                if discount_amount > total_before:
                    discount_amount = total_before

    created_orders = []
    for seller_id, items in seller_groups.items():
        subtotal = sum(item["price"] * Decimal(str(item["quantity"])) for item in items)
        fee_amount = dec(subtotal * seller_fee / Decimal("100"))
        seller_payout = subtotal - fee_amount

        # Distribute discount proportionally
        total_before = sum(item["price"] * Decimal(str(item["quantity"])) for item in items)
        discount_ratio = dec(discount_amount / total_before if total_before > 0 else 0)
        if discount_ratio > 1:
            discount_ratio = dec("1")
        item_discount = dec(discount_amount * subtotal / total_before) if total_before > 0 else dec("0") if len(seller_groups.values()) > 0 else dec("0")
        after_discount = subtotal - item_discount

        # Calculate delivery charge
        delivery_charge = dec("0")
        if zone_id:
            try:
                zid = int(zone_id)
                dz_r = await db.execute(select(AdminDeliveryZone).where(AdminDeliveryZone.id == zid, AdminDeliveryZone.is_active.is_(True)))
                dz = dz_r.scalar_one_or_none()
                if dz:
                    dc = dz.delivery_charge
                    ft = dz.free_delivery_threshold
                    sd_r = await db.execute(select(SellerDeliveryZone).where(
                        SellerDeliveryZone.seller_id == seller_id,
                        SellerDeliveryZone.zone_id == zid,
                        SellerDeliveryZone.is_active.is_(True)))
                    sd = sd_r.scalar_one_or_none()
                    if sd:
                        if sd.delivery_charge is not None:
                            dc = sd.delivery_charge
                        if sd.free_delivery_threshold is not None:
                            ft = sd.free_delivery_threshold
                    if ft and after_discount >= dec(str(ft)):
                        dc = dec("0")
                    delivery_charge = dec(str(dc))
            except (ValueError, TypeError):
                pass

        # Fallback to seller default delivery charge if no zone charge
        if delivery_charge == 0:
            sr = await db.execute(select(Seller).where(Seller.id == seller_id))
            s = sr.scalar_one_or_none()
            if s and s.default_delivery_charge:
                delivery_charge = dec(str(s.default_delivery_charge))

        total_with_delivery = after_discount + delivery_charge

        order = Order(
            user_id=current_user.id, seller_id=seller_id,
            total=total_with_delivery, delivery_charge=delivery_charge,
            fee_percent=seller_fee, fee_amount=fee_amount,
            seller_payout=seller_payout, status="pending", payment_method=payment_method,
            customer_name=customer_name, customer_email=customer_email,
            customer_phone=customer_phone, customer_address=customer_address,
            shipping_address=shipping_address,
        )
        db.add(order)
        await db.flush()

        for item in items:
            oi = OrderItem(order_id=order.id, product_id=item["product"].id, quantity=item["quantity"], price=item["price"])
            db.add(oi)

        created_orders.append(order.id)

    # Update coupon usage
    if coupon_code and discount_amount > 0:
        coupon.used_count = (coupon.used_count or 0) + 1
        cu = CouponUsage(coupon_id=coupon.id, user_id=current_user.id, order_id=created_orders[0] if created_orders else None)
        db.add(cu)

    # Wallet payment processing
    if payment_method == "wallet":
        # Fetch all orders in a single query
        o_result = await db.execute(
            select(Order).where(Order.id.in_(created_orders))
        )
        orders_list = o_result.scalars().all()
        total_amount = sum((o.total or 0) for o in orders_list)

        if (current_user.ecommerce_wallet or 0) < total_amount:
            await db.rollback()
            raise HTTPException(400, f"Insufficient ecommerce wallet balance. Need {total_amount}, have {current_user.ecommerce_wallet}")

        current_user.ecommerce_wallet = (current_user.ecommerce_wallet or 0) - total_amount
        db.add(current_user)

        tx = EcommerceWalletTransaction(
            user_id=current_user.id, order_id=created_orders[0],
            amount=-total_amount, type="debit",
            description=f"Payment for order(s) {created_orders}"
        )
        db.add(tx)

        for order in orders_list:
            order.status = "confirmed"
            db.add(order)

            sr = await db.execute(select(Seller).where(Seller.id == order.seller_id))
            seller_rec = sr.scalar_one_or_none()
            if seller_rec:
                ur = await db.execute(select(User).where(User.id == seller_rec.user_id))
                seller_user = ur.scalar_one_or_none()
                if seller_user:
                    seller_user.ecommerce_wallet = (seller_user.ecommerce_wallet or 0) + order.seller_payout
                    db.add(seller_user)

                    tx2 = EcommerceWalletTransaction(
                        user_id=seller_user.id, order_id=order.id,
                        amount=order.seller_payout, type="credit",
                        description=f"Payout for order #{order.id}"
                    )
                    db.add(tx2)

    # Decrement stock
    for item_data in items_data:
        pid = item_data["product_id"]
        qty = item_data.get("quantity", 1)
        pr = await db.execute(select(Product).where(Product.id == pid))
        p = pr.scalar_one_or_none()
        if p and hasattr(p, "stock_quantity") and p.stock_quantity is not None:
            p.stock_quantity = max(0, p.stock_quantity - qty)
            db.add(p)

    # Clear cart
    cr = await db.execute(select(Cart).where(Cart.user_id == current_user.id))
    cart = cr.scalar_one_or_none()
    if cart:
        await db.execute(delete(CartItem).where(CartItem.cart_id == cart.id))

    await db.commit()

    await notify_admin(
        db=db, type="order_created",
        message=f"New order(s) {created_orders} by {current_user.full_name or current_user.email}",
        user_id=current_user.id,
    )
    return {"message": "Order placed successfully", "order_ids": created_orders}

@router.get("/orders")
async def get_my_orders(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = select(Order).where(Order.user_id == current_user.id).order_by(Order.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
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
        item_list = []
        for oi in items_list:
            p = products_map.get(oi.product_id)
            item_list.append({
                "product_id": oi.product_id,
                "product_name": p.name if p else "Unknown",
                "quantity": oi.quantity,
                "price": float(oi.price),
            })
        result.append({
            "id": o.id,
            "total": float(o.total),
            "status": o.status,
            "payment_method": o.payment_method,
            "created_at": str(o.created_at),
            "items": item_list,
        })

    return {"orders": result, "total": total, "page": page, "per_page": per_page}

@router.get("/orders/{order_id}")
async def get_order_detail(order_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(select(Order).where(Order.id == order_id, Order.user_id == current_user.id))
    o = r.scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Order not found")
    sir = await db.execute(select(OrderItem).where(OrderItem.order_id == o.id))
    items = []
    for oi in sir.scalars().all():
        pr = await db.execute(select(Product).where(Product.id == oi.product_id))
        p = pr.scalar_one_or_none()
        items.append({"id": oi.id, "product_id": oi.product_id, "product_name": p.name if p else "Unknown", "quantity": oi.quantity, "price": float(oi.price)})
    return {
        "order": {
            "id": o.id, "total": float(o.total), "status": o.status,
            "payment_method": o.payment_method, "fee_percent": float(o.fee_percent) if o.fee_percent else None,
            "fee_amount": float(o.fee_amount) if o.fee_amount else None,
            "customer_name": o.customer_name, "customer_email": o.customer_email,
            "customer_phone": o.customer_phone, "customer_address": o.customer_address,
            "shipping_address": o.shipping_address,
            "created_at": str(o.created_at), "updated_at": str(o.updated_at),
            "items": items,
        }
    }

# ──────────────────────────────────────────────────────────────────
#  REVIEWS
# ──────────────────────────────────────────────────────────────────

@router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: int, page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50), db: AsyncSession = Depends(get_db)):
    p = await _get_product(db, product_id)
    q = select(ProductReview).where(ProductReview.product_id == product_id, ProductReview.is_approved == True).order_by(ProductReview.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    reviews = r.scalars().all()
    return {
        "reviews": [
            {
                "id": rev.id, "rating": rev.rating, "title": rev.title,
                "comment": rev.comment, "is_verified_purchase": rev.is_verified_purchase,
                "helpful_count": rev.helpful_count, "created_at": str(rev.created_at),
            }
            for rev in reviews
        ],
        "total": total, "page": page, "per_page": per_page,
    }

@router.post("/products/{product_id}/reviews")
async def create_review(product_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    p = await _get_product(db, product_id)
    rating = data.get("rating", 5)
    if rating < 1 or rating > 5:
        raise HTTPException(400, "Rating must be between 1 and 5")
    rev = ProductReview(product_id=product_id, user_id=current_user.id, rating=rating,
                        title=data.get("title"), comment=data.get("comment"),
                        is_verified_purchase=False)
    db.add(rev)
    await db.commit()
    return {"message": "Review submitted", "review_id": rev.id}

# ──────────────────────────────────────────────────────────────────
#  FLASH DEALS
# ──────────────────────────────────────────────────────────────────

@router.get("/flash-deals")
async def get_active_deals(db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    r = await db.execute(select(FlashDeal).where(FlashDeal.is_active == True, FlashDeal.start_date <= now, FlashDeal.end_date >= now).order_by(FlashDeal.created_at.desc()))
    deals = r.scalars().all()
    deal_ids = [d.id for d in deals]
    dpr = await db.execute(select(FlashDealProduct).where(FlashDealProduct.deal_id.in_(deal_ids)))
    deal_products_map = {}
    all_product_ids = set()
    for dp in dpr.scalars().all():
        deal_products_map.setdefault(dp.deal_id, []).append(dp)
        all_product_ids.add(dp.product_id)
    products_r = await db.execute(select(Product).where(Product.id.in_(all_product_ids)))
    products_map = {p.id: p for p in products_r.scalars().all()}
    result = []
    for deal in deals:
        products = []
        for dp in deal_products_map.get(deal.id, []):
            p = products_map.get(dp.product_id)
            if p:
                products.append({"product_id": p.id, "name": p.name, "deal_price": float(dp.deal_price) if dp.deal_price else float(p.price), "original_price": float(p.price), "image_urls": _presign_product_images(p), "sold_count": dp.sold_count, "quantity_limit": dp.quantity_limit})
        result.append({
            "id": deal.id, "title": deal.title, "description": deal.description,
            "banner_url": generate_presigned_url(deal.banner_key),
            "discount_type": deal.discount_type, "discount_value": float(deal.discount_value),
            "start_date": str(deal.start_date), "end_date": str(deal.end_date),
            "products": products,
        })
    return {"deals": result}

# ──────────────────────────────────────────────────────────────────
#  VENDOR DASHBOARD & EARNINGS
# ──────────────────────────────────────────────────────────────────

@router.get("/vendor/dashboard")
async def vendor_dashboard(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)

    # Orders stats
    or_r = await db.execute(select(func.count()).where(Order.seller_id == seller.id))
    total_orders = or_r.scalar() or 0

    pr_r = await db.execute(select(func.count()).where(and_(Order.seller_id == seller.id, Order.status == "pending")))
    pending_orders = pr_r.scalar() or 0

    cr_r = await db.execute(select(func.count()).where(and_(Order.seller_id == seller.id, Order.status == "completed")))
    completed_orders = cr_r.scalar() or 0

    cn_r = await db.execute(select(func.count()).where(and_(Order.seller_id == seller.id, Order.status == "cancelled")))
    cancelled_orders = cn_r.scalar() or 0

    # Revenue
    rev_r = await db.execute(select(func.coalesce(func.sum(Order.total), 0)).where(and_(Order.seller_id == seller.id, Order.status == "completed")))
    revenue = float(rev_r.scalar() or 0)

    # Pending payout
    pp_r = await db.execute(select(func.coalesce(func.sum(Order.seller_payout), 0)).where(and_(Order.seller_id == seller.id, Order.status == "pending")))
    pending_payout = float(pp_r.scalar() or 0)

    # Product count
    prod_r = await db.execute(select(func.count()).where(Product.seller_id == seller.id))
    total_products = prod_r.scalar() or 0

    # Wallet
    wallet_balance = float(current_user.ecommerce_wallet or 0)

    return {
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "revenue": revenue,
        "pending_payout": pending_payout,
        "total_products": total_products,
        "wallet_balance": wallet_balance,
        "store_status": seller.status,
    }

@router.get("/vendor/orders")
async def vendor_orders(status: str = None, page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)
    q = select(Order).where(Order.seller_id == seller.id)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc())

    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
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
        result.append({"id": o.id, "total": float(o.total), "status": o.status, "customer_name": o.customer_name, "customer_phone": o.customer_phone, "customer_address": o.customer_address, "shipping_address": o.shipping_address, "created_at": str(o.created_at), "items": items})

    return {"orders": result, "total": total, "page": page, "per_page": per_page}

@router.put("/vendor/orders/{order_id}/status")
async def update_order_status(order_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)
    r = await db.execute(select(Order).where(Order.id == order_id, Order.seller_id == seller.id))
    o = r.scalar_one_or_none()
    if not o:
        raise HTTPException(404, "Order not found")
    new_status = data.get("status")
    allowed = ["confirmed", "processing", "shipped", "delivered", "completed", "cancelled"]
    if new_status not in allowed:
        raise HTTPException(400, f"Invalid status. Allowed: {allowed}")
    o.status = new_status
    await db.commit()
    return {"message": f"Order status updated to {new_status}"}

@router.get("/vendor/products")
async def vendor_products(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)
    q = select(Product).where(Product.seller_id == seller.id).order_by(Product.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    products = r.scalars().all()
    return {"products": [_product_to_dict(p) for p in products], "total": total, "page": page, "per_page": per_page}

@router.get("/vendor/earnings")
async def vendor_earnings_history(page: int = Query(1, ge=1), per_page: int = Query(10, ge=1, le=50), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    r = await db.execute(
        select(EcommerceWalletTransaction).where(EcommerceWalletTransaction.user_id == current_user.id).order_by(EcommerceWalletTransaction.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )
    txs = r.scalars().all()
    count_r = await db.execute(select(func.count()).where(EcommerceWalletTransaction.user_id == current_user.id))
    total = count_r.scalar() or 0
    return {"transactions": [{"id": t.id, "order_id": t.order_id, "amount": float(t.amount), "type": t.type, "description": t.description, "created_at": str(t.created_at)} for t in txs], "total": total, "page": page, "per_page": per_page}

@router.post("/vendor/withdraw")
async def vendor_withdraw_request(data: dict = Body(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)
    amount = dec(data.get("amount", 0))
    if amount <= 0:
        raise HTTPException(400, "Invalid amount")
    if amount > dec(current_user.ecommerce_wallet or 0):
        raise HTTPException(400, "Insufficient balance")
    vw = VendorWithdraw(seller_id=seller.id, user_id=current_user.id, amount=amount)
    db.add(vw)
    current_user.ecommerce_wallet = dec(current_user.ecommerce_wallet or 0) - amount
    await db.commit()

    await notify_admin(
        db=db, type="withdrawal_request",
        message=f"Vendor '{seller.store_name}' requested withdraw of ${amount}",
        user_id=current_user.id,
    )
    return {"message": "Withdraw request submitted", "id": vw.id}

@router.get("/vendor/withdraws")
async def vendor_withdraw_history(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    seller = await _get_seller_for_user(db, current_user.id)
    r = await db.execute(select(VendorWithdraw).where(VendorWithdraw.seller_id == seller.id).order_by(VendorWithdraw.created_at.desc()).limit(50))
    return {"withdraws": [{"id": w.id, "amount": float(w.amount), "status": w.status, "note": w.note, "created_at": str(w.created_at)} for w in r.scalars().all()]}

# ──────────────────────────────────────────────────────────────────
#  SHIPPING
# ──────────────────────────────────────────────────────────────────

@router.get("/shipping/zones")
async def list_shipping_zones(db: AsyncSession = Depends(get_db)):
    r = await db.execute(select(ShippingZone).where(ShippingZone.is_active == True))
    return {"zones": [{"id": z.id, "name": z.name, "countries": z.countries.split(",") if z.countries else []} for z in r.scalars().all()]}

@router.post("/shipping/rates")
async def get_shipping_rates(data: dict = Body(...), db: AsyncSession = Depends(get_db)):
    zone_id = data.get("zone_id")
    order_amount = dec(data.get("order_amount", 0))
    q = select(ShippingRate).where(ShippingRate.is_active == True)
    if zone_id:
        q = q.where(ShippingRate.zone_id == zone_id)
    r = await db.execute(q)
    rates = r.scalars().all()
    valid = []
    for rate in rates:
        if rate.min_order_amount and order_amount < dec(rate.min_order_amount):
            continue
        if rate.max_order_amount and order_amount > dec(rate.max_order_amount):
            continue
        valid.append({"id": rate.id, "method": rate.method, "cost": float(rate.cost), "is_free_shipping": rate.is_free_shipping, "estimated_days": rate.estimated_days})
    return {"rates": valid}

# ──────────────────────────────────────────────────────────────────
#  ADMIN MARKETPLACE
# ──────────────────────────────────────────────────────────────────

@router.get("/admin/dashboard")
async def admin_marketplace_dashboard(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    total_vendors = (await db.execute(select(func.count()).where(Seller.status == "approved"))).scalar() or 0
    pending_vendors = (await db.execute(select(func.count()).where(Seller.status == "pending_review"))).scalar() or 0
    total_products = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0
    total_orders = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    rev_r = await db.execute(select(func.coalesce(func.sum(Order.total), 0)))
    total_revenue = float(rev_r.scalar() or 0)
    fee_r = await db.execute(select(func.coalesce(func.sum(Order.fee_amount), 0)))
    total_commission = float(fee_r.scalar() or 0)

    return {
        "total_vendors": total_vendors,
        "pending_vendors": pending_vendors,
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_commission": total_commission,
    }

@router.get("/admin/sellers")
async def admin_list_sellers(status: str = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(Seller)
    if status:
        q = q.where(Seller.status == status)
    q = q.order_by(Seller.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    sellers = r.scalars().all()
    return {"sellers": [_seller_to_dict(s) for s in sellers], "total": total, "page": page, "per_page": per_page}

@router.put("/admin/sellers/{seller_id}/status")
async def admin_update_seller_status(seller_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Seller).where(Seller.id == seller_id))
    seller = r.scalar_one_or_none()
    if not seller:
        raise HTTPException(404, "Seller not found")
    seller.status = data.get("status", seller.status)
    seller.rejection_reason = data.get("rejection_reason")
    await db.commit()

    notif_type = "seller_approved" if seller.status == "approved" else "seller_rejected"
    await notify_admin(
        db=db, type=notif_type,
        message=f"Seller '{seller.store_name}' (ID: {seller.id}) has been {seller.status}",
        user_id=seller.user_id,
    )
    return {"message": "Seller status updated"}

@router.get("/admin/orders")
async def admin_list_orders(status: str = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
    q = q.order_by(Order.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    orders = r.scalars().all()
    return {"orders": [{"id": o.id, "total": float(o.total), "status": o.status, "payment_method": o.payment_method, "customer_name": o.customer_name, "created_at": str(o.created_at)} for o in orders], "total": total, "page": page, "per_page": per_page}

@router.get("/admin/vendor-withdraws")
async def admin_list_vendor_withdraws(status: str = None, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(VendorWithdraw)
    if status:
        q = q.where(VendorWithdraw.status == status)
    q = q.order_by(VendorWithdraw.created_at.desc())
    r = await db.execute(q)
    ws = r.scalars().all()
    return {"withdraws": [{"id": w.id, "seller_id": w.seller_id, "user_id": w.user_id, "amount": float(w.amount), "status": w.status, "note": w.note, "created_at": str(w.created_at)} for w in ws]}

@router.put("/admin/vendor-withdraws/{withdraw_id}")
async def admin_process_vendor_withdraw(withdraw_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(VendorWithdraw).where(VendorWithdraw.id == withdraw_id))
    w = r.scalar_one_or_none()
    if not w:
        raise HTTPException(404, "Withdraw request not found")
    w.status = data.get("status", w.status)
    w.note = data.get("note", w.note)
    w.processed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Withdraw request updated"}

@router.get("/admin/products")
async def admin_list_all_products(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(Product).order_by(Product.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    products = r.scalars().all()
    return {"products": [_product_to_dict(p) for p in products], "total": total, "page": page, "per_page": per_page}

@router.put("/admin/products/{product_id}/approve")
async def admin_approve_product(product_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Product).where(Product.id == product_id))
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = True
    await db.commit()

    sr = await db.execute(select(Seller).where(Seller.id == p.seller_id))
    seller = sr.scalar_one_or_none()
    await notify_admin(
        db=db, type="product_approved",
        message=f"Product '{p.name}' (ID: {p.id}) has been approved",
        user_id=seller.user_id if seller else None,
    )
    return {"message": "Product approved"}

@router.put("/admin/products/{product_id}/reject")
async def admin_reject_product(product_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Product).where(Product.id == product_id))
    p = r.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Product not found")
    p.is_active = False
    await db.commit()
    return {"message": "Product rejected"}

@router.post("/admin/commission-rules")
async def create_commission_rule(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    rule = CommissionRule(name=data["name"], commission_type=data.get("commission_type", "percentage"),
                          commission_value=data["commission_value"], applies_to=data.get("applies_to"),
                          applies_id=data.get("applies_id"), priority=data.get("priority", 0))
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"rule": {"id": rule.id, "name": rule.name, "commission_value": float(rule.commission_value)}}

@router.get("/admin/commission-rules")
async def list_commission_rules(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(CommissionRule).order_by(CommissionRule.priority))
    return {"rules": [{"id": rule.id, "name": rule.name, "commission_type": rule.commission_type, "commission_value": float(rule.commission_value), "applies_to": rule.applies_to, "applies_id": rule.applies_id, "is_active": rule.is_active, "priority": rule.priority} for rule in r.scalars().all()]}

@router.post("/admin/flash-deals")
async def create_flash_deal(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    deal = FlashDeal(title=data["title"], description=data.get("description"),
                     discount_type=data.get("discount_type", "percentage"),
                     discount_value=data["discount_value"],
                     start_date=datetime.fromisoformat(data["start_date"]),
                     end_date=datetime.fromisoformat(data["end_date"]))
    db.add(deal)
    await db.commit()
    await db.refresh(deal)
    return {"deal": {"id": deal.id, "title": deal.title}}

@router.get("/admin/flash-deals")
async def admin_list_flash_deals(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(FlashDeal).order_by(FlashDeal.created_at.desc()))
    return {"deals": [{"id": d.id, "title": d.title, "discount_type": d.discount_type, "discount_value": float(d.discount_value), "start_date": str(d.start_date), "end_date": str(d.end_date), "is_active": d.is_active} for d in r.scalars().all()]}

@router.delete("/admin/flash-deals/{deal_id}")
async def delete_flash_deal(deal_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(FlashDeal).where(FlashDeal.id == deal_id))
    deal = r.scalar_one_or_none()
    if not deal:
        raise HTTPException(404, "Deal not found")
    await db.delete(deal)
    await db.commit()
    return {"message": "Deal deleted"}

@router.get("/admin/reviews")
async def admin_list_reviews(approved: bool = None, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    q = select(ProductReview)
    if approved is not None:
        q = q.where(ProductReview.is_approved == approved)
    q = q.order_by(ProductReview.created_at.desc())
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * per_page
    r = await db.execute(q.offset(offset).limit(per_page))
    reviews = r.scalars().all()
    return {"reviews": [{"id": rev.id, "product_id": rev.product_id, "rating": rev.rating, "title": rev.title, "comment": rev.comment, "is_approved": rev.is_approved, "created_at": str(rev.created_at)} for rev in reviews], "total": total, "page": page, "per_page": per_page}

@router.put("/admin/reviews/{review_id}/approve")
async def admin_approve_review(review_id: int, data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(ProductReview).where(ProductReview.id == review_id))
    rev = r.scalar_one_or_none()
    if not rev:
        raise HTTPException(404, "Review not found")
    rev.is_approved = data.get("is_approved", True)
    await db.commit()
    return {"message": "Review updated"}

@router.get("/admin/coupons")
async def admin_list_coupons(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    return {"coupons": [{"id": c.id, "code": c.code, "discount_type": c.discount_type, "discount_value": float(c.discount_value), "is_active": c.is_active, "used_count": c.used_count, "usage_limit": c.usage_limit, "start_date": str(c.start_date) if c.start_date else None, "end_date": str(c.end_date) if c.end_date else None} for c in r.scalars().all()]}

@router.post("/admin/coupons")
async def create_coupon(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    coupon = Coupon(code=data["code"].upper(), description=data.get("description"),
                    discount_type=data.get("discount_type", "percentage"),
                    discount_value=data["discount_value"],
                    minimum_order_amount=data.get("minimum_order_amount"),
                    maximum_discount=data.get("maximum_discount"),
                    usage_limit=data.get("usage_limit"), is_active=data.get("is_active", True),
                    start_date=datetime.fromisoformat(data["start_date"]) if data.get("start_date") else None,
                    end_date=datetime.fromisoformat(data["end_date"]) if data.get("end_date") else None)
    db.add(coupon)
    await db.commit()
    await db.refresh(coupon)
    return {"coupon": {"id": coupon.id, "code": coupon.code}}

@router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = r.scalar_one_or_none()
    if not coupon:
        raise HTTPException(404, "Coupon not found")
    await db.delete(coupon)
    await db.commit()
    return {"message": "Coupon deleted"}

@router.get("/admin/shipping-zones")
async def admin_list_shipping_zones(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(ShippingZone).order_by(ShippingZone.name))
    return {"zones": [{"id": z.id, "name": z.name, "countries": z.countries, "is_active": z.is_active} for z in r.scalars().all()]}

@router.post("/admin/shipping-zones")
async def create_shipping_zone(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    zone = ShippingZone(name=data["name"], countries=data.get("countries"), is_active=data.get("is_active", True))
    db.add(zone)
    await db.commit()
    await db.refresh(zone)
    return {"zone": {"id": zone.id, "name": zone.name}}

@router.get("/admin/shipping-rates")
async def admin_list_shipping_rates(db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    r = await db.execute(select(ShippingRate).order_by(ShippingRate.zone_id))
    return {"rates": [{"id": rate.id, "zone_id": rate.zone_id, "method": rate.method, "cost": float(rate.cost), "is_free_shipping": rate.is_free_shipping, "estimated_days": rate.estimated_days, "is_active": rate.is_active} for rate in r.scalars().all()]}

@router.post("/admin/shipping-rates")
async def create_shipping_rate(data: dict = Body(...), db: AsyncSession = Depends(get_db), admin: User = Depends(get_current_admin_user)):
    rate = ShippingRate(zone_id=data["zone_id"], method=data.get("method", "flat_rate"),
                        cost=data["cost"], is_free_shipping=data.get("is_free_shipping", False),
                        estimated_days=data.get("estimated_days"), is_active=data.get("is_active", True))
    db.add(rate)
    await db.commit()
    await db.refresh(rate)
    return {"rate": {"id": rate.id, "method": rate.method, "cost": float(rate.cost)}}


@router.get("/wallet-transactions")
async def get_my_wallet_transactions(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EcommerceWalletTransaction)
        .where(EcommerceWalletTransaction.user_id == current_user.id)
        .order_by(EcommerceWalletTransaction.created_at.desc())
        .limit(limit)
    )
    txs = result.scalars().all()
    return {
        "data": [
            {
                "id": t.id,
                "order_id": t.order_id,
                "amount": float(t.amount),
                "type": t.type,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in txs
        ]
    }
