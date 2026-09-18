"""
One-shot script: Creates ALL tables in the database from SQLAlchemy models.
Creates each table individually so one failure won't roll back everything.
"""
import asyncio
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.core.config import settings
from app.core.base import Base

# Import every model so SQLAlchemy knows about all the tables
from app.models import (
    User, KYC, KycPackage, PaymentStatus,
    DepositNetwork, Deposit, Withdrawal,
    ROISetting, Investment, InvestmentProfitHistory,
    ReferralProfitHistory, PlatformStats,
    Announcement, Seller, Product,
    Order, OrderItem, OrderStatusLog,
    AdminDeliveryZone, SellerDeliveryZone,
    ReturnRequest,
    EcommerceConfig, SystemConfig,
    MiningLog, Package, TaskType,
    CaptchaChallenge, CaptchaEarning,
    AdView, Ad, UserAdView,
    Invoice, TransferLog,
    VisitorLog, AdminNotification,
    Rank, RankHistory, MatchingBonus,
    RankBonusConfig, BankInfo,
    Category, Brand,
    ProductVariant, ProductAttribute,
    ProductAttributeValue, ProductTag,
    ProductReview,
    Cart, CartItem,
    Coupon, CouponUsage,
    WishlistItem, CompareItem,
    ShippingZone, ShippingClass, ShippingRate,
    CommissionRule,
    FlashDeal, FlashDealProduct,
    VendorWithdraw, ProductView,
    WithdrawalMethod,
)

async def create_all_tables():
    connect_args = {}
    if settings.DB_SSL_REQUIRED:
        connect_args["ssl"] = True

    # Use AUTOCOMMIT so each statement commits immediately
    # This means a failed index creation won't roll back a successful table creation
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        isolation_level="AUTOCOMMIT",
        echo=False,
    )

    print("Connecting to database...")

    created = 0
    skipped = 0
    errors = []

    # Use a sync connection via run_sync to create tables one by one
    async with engine.connect() as conn:
        for table in Base.metadata.sorted_tables:
            try:
                await conn.run_sync(lambda sync_conn, t=table: t.create(sync_conn, checkfirst=True))
                print(f"  ✅ {table.name}")
                created += 1
            except Exception as e:
                err_msg = str(e).split('\n')[0]
                print(f"  ⚠️  {table.name}: {err_msg}")
                errors.append((table.name, err_msg))
                skipped += 1

    await engine.dispose()

    print(f"\n{'='*50}")
    print(f"✅ Created: {created} tables")
    if skipped:
        print(f"⚠️  Skipped/errors: {skipped} tables")
        for name, err in errors:
            print(f"   - {name}: {err}")
    print(f"{'='*50}")
    print("\nDatabase setup complete! Now run: python seed.py")

if __name__ == "__main__":
    asyncio.run(create_all_tables())
