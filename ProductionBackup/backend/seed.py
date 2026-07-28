#!/usr/bin/env python3
"""
Oxford Financial Ads Database Seeder
========================
Generates realistic dummy data for local development.

Usage:
    python seed.py                         # seed with defaults
    python seed.py --force                 # drop existing data and re-seed
    python seed.py --users 50              # seed with more users

Requires DATABASE_URL to be set in .env or environment.
"""

import asyncio
import argparse
import logging
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from random import Random

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ── Project imports ──────────────────────────────────────────────────────────
from app.core.config import settings
from app.core.base import Base
from app.core.security import hash_password
from app.utils.generate_username import generate_username

from app.models.user import User
from app.models.kyc import KYC, DocumentType, KYCStatus
from app.models.deposit_network import DepositNetwork
from app.models.deposit import Deposit
from app.models.withdrawal import Withdrawal
from app.models.investments import Investment
from app.models.investment_profit_history import InvestmentProfitHistory
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.roi_setting import ROISetting
from app.models.platform_stats import PlatformStats
from app.models.announcement import Announcement
from app.models.package import Package

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("seed")

# ── Constants ────────────────────────────────────────────────────────────────

DEFAULT_USERS = 15  # total users including admin

PACKAGES = [
    # (package_name, investment_amount, total_return, duration_days, captcha_required_per_day, captcha_task_duration_seconds, earn_per_captcha, daily_captcha_limit)
    ("Starter Package", 10, 20, 365, 12, 30, Decimal("0.01"), 12),
    ("Growth Package", 25, 50, 365, 20, 30, Decimal("0.02"), 20),
    ("Advanced Package", 50, 100, 365, 25, 30, Decimal("0.03"), 25),
    ("Pro Package", 100, 200, 365, 30, 30, Decimal("0.05"), 30),
    ("Elite Package", 500, 1000, 365, 40, 30, Decimal("0.08"), 40),
    ("VIP Package", 1000, 2000, 365, 60, 30, Decimal("0.12"), 60),
]

NETWORKS = [
    {"network_name": "TRC20", "display_name": "USDT (TRC20)", "wallet_address": "TXr4nT1xK5j3mP9qR2sV7bW8cD6fG0hJ"},
    {"network_name": "ERC20", "display_name": "USDT (ERC20)", "wallet_address": "0x8f3E8A8e8b8C8d8E8f8A8b8C8d8E8f8A8b8C8d8"},
    {"network_name": "BTC", "display_name": "Bitcoin", "wallet_address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"},
    {"network_name": "ETH", "display_name": "Ethereum", "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"},
]

USERS_SEED = [
    # (full_name, email, password, is_admin, balance)
    ("Oxford Financial Ads Admin", "admin@oxfordfinancialads.com", "Admin@123", True, Decimal("10000")),
    ("John Anderson", "john@example.com", "Test@123", False, Decimal("5000")),
    ("Sarah Mitchell", "sarah@example.com", "Test@123", False, Decimal("3500")),
    ("Michael Chen", "michael@example.com", "Test@123", False, Decimal("8000")),
    ("Emily Rodriguez", "emily@example.com", "Test@123", False, Decimal("2000")),
    ("David Kim", "david@example.com", "Test@123", False, Decimal("6000")),
    ("Jessica Taylor", "jessica@example.com", "Test@123", False, Decimal("1500")),
    ("Robert Brown", "robert@example.com", "Test@123", False, Decimal("4000")),
    ("Olivia Davis", "olivia@example.com", "Test@123", False, Decimal("2500")),
    ("James Wilson", "james@example.com", "Test@123", False, Decimal("7000")),
    ("Sophia Garcia", "sophia@example.com", "Test@123", False, Decimal("1800")),
    ("William Lee", "william@example.com", "Test@123", False, Decimal("3200")),
    ("Emma Martinez", "emma@example.com", "Test@123", False, Decimal("4500")),
    ("Daniel Thompson", "daniel@example.com", "Test@123", False, Decimal("5500")),
    ("Ava Anderson", "ava@example.com", "Test@123", False, Decimal("2800")),
]


def _random(rng: Random, low: int, high: int) -> int:
    return rng.randint(low, high)


# ── Main seeder ──────────────────────────────────────────────────────────────

async def seed_database(force: bool = False, user_count: int = DEFAULT_USERS):
    logger.info("Connecting to database...")
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"ssl": True} if settings.DB_SSL_REQUIRED else {},
    )
    async_session_factory = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    rng = Random(42)  # deterministic seed for reproducibility

    async with async_session_factory() as db:
        # ── Check existing data ────────────────────────────────────────────
        result = await db.execute(select(User).limit(1))
        existing = result.scalar_one_or_none()

        if existing and not force:
            logger.info("Database already contains users. Use --force to re-seed. Exiting.")
            return

        if force and existing:
            logger.warning("Force mode: dropping all existing data...")
            for table in reversed(Base.metadata.sorted_tables):
                await db.execute(text(f'TRUNCATE TABLE "{table.name}" CASCADE'))
            await db.commit()
            logger.info("All tables truncated.")

        # ── 1. Create Users ────────────────────────────────────────────────
        logger.info("Creating users...")
        user_count = min(user_count, len(USERS_SEED))
        created_users = []

        for i in range(user_count):
            full_name, email, password, is_admin, balance = USERS_SEED[i]

            user = User(
                full_name=full_name,
                email=email,
                hashed_password=hash_password(password),
                is_admin=is_admin,
                email_verified=True,
                account_status="active",
                username=f"temp_{i}",  # unique temp username
                referral_code=f"temp_{i}",  # unique temp referral code
                main_wallet=balance,
                deposit_wallet=balance * Decimal("0.5"),
                withdraw_wallet=balance * Decimal("0.3"),
                referral_wallet=Decimal("0"),
                generation_wallet=Decimal("0"),
                arbx_wallet=Decimal("100"),
                arbx_mining_wallet=Decimal("0"),
            )
            db.add(user)

        await db.flush()

        # Fetch all created users
        result = await db.execute(select(User).order_by(User.id))
        all_users = result.scalars().all()

        for user in all_users:
            user.referral_code = str(user.id).zfill(8)
            user.username = generate_username(user.full_name, user.id)

        # Build referral chain (user 0 = admin, no referrer)
        for idx, user in enumerate(all_users):
            if idx == 0:
                continue  # admin has no referrer
            # Referrer is the previous user (simple chain)
            referrer = all_users[idx - 1]
            user.parent_lvl_1_id = referrer.id
            user.parent_lvl_2_id = referrer.parent_lvl_1_id
            user.parent_lvl_3_id = referrer.parent_lvl_2_id
            user.parent_lvl_4_id = referrer.parent_lvl_3_id
            user.parent_lvl_5_id = referrer.parent_lvl_4_id

            # Give referrer 10 ARBX
            if referrer:
                referrer.arbx_wallet += Decimal("10")

        await db.commit()

        # Re-fetch after commit to get clean state
        result = await db.execute(select(User).order_by(User.id))
        all_users = result.scalars().all()
        logger.info(f"  ✓ {len(all_users)} users created")

        # ── 2. Create KYC records ──────────────────────────────────────────
        logger.info("Creating KYC records...")
        kyc_countries = [
            "United States", "United Kingdom", "Canada", "Australia",
            "Germany", "France", "Japan", "Singapore", "UAE", "India"
        ]
        for i, user in enumerate(all_users):
            if user.is_admin or i > user_count // 2:
                continue  # skip admin and some users

            kyc = KYC(
                user_id=user.id,
                country=kyc_countries[i % len(kyc_countries)],
                phone_number=f"+1{_random(rng, 200_000_0000, 999_999_9999)}",
                document_type=DocumentType.passport if i % 2 == 0 else DocumentType.nid,
                document_number=f"{'AB' if i % 2 == 0 else 'NID'}{_random(rng, 100000, 999999)}",
                front_image_key="seed/placeholder-front.png",
                back_image_key="seed/placeholder-back.png",
                status=KYCStatus.approved if i % 3 != 0 else KYCStatus.pending,
            )
            db.add(kyc)

        await db.commit()
        logger.info(f"  ✓ KYC records created")

        # ── 3. Create Deposit Networks ─────────────────────────────────────
        logger.info("Creating deposit networks...")
        for net in NETWORKS:
            network = DepositNetwork(
                network_name=net["network_name"],
                display_name=net["display_name"],
                wallet_address=net["wallet_address"],
                status=True,
            )
            db.add(network)
        await db.commit()
        logger.info(f"  ✓ {len(NETWORKS)} deposit networks created")

        # ── 4. Fetch networks ──────────────────────────────────────────────
        result = await db.execute(select(DepositNetwork))
        networks = result.scalars().all()

        # ── 5. Create Deposits ─────────────────────────────────────────────
        logger.info("Creating deposits...")
        for i, user in enumerate(all_users):
            if user.is_admin:
                continue
            num_deposits = _random(rng, 1, 3)
            for j in range(num_deposits):
                network = networks[_random(rng, 0, len(networks) - 1)]
                amount = Decimal(str(_random(rng, 50, 5000)))
                deposit = Deposit(
                    user_id=user.id,
                    network_name=network.network_name,
                    amount=amount,
                    txid=f"0x{uuid4_hex(rng)}{user.id}{j}",
                    status="approved" if i % 4 != 0 else "pending",
                )
                db.add(deposit)
        await db.commit()
        logger.info(f"  ✓ Deposits created")

        # ── 6. Create Packages ────────────────────────────────────────────
        logger.info("Creating packages...")
        created_packages = []
        for pkg_data in PACKAGES:
            pkg_name, invest_amt, total_ret, duration, captcha_per_day, captcha_dur, earn_per, daily_limit = pkg_data
            daily_pmt = Decimal(str(total_ret)) / Decimal(str(duration))
            package = Package(
                name=pkg_name,
                investment_amount=Decimal(str(invest_amt)),
                total_return=Decimal(str(total_ret)),
                daily_payment=daily_pmt,
                duration_days=duration,
                captcha_required_per_day=captcha_per_day,
                captcha_task_duration_seconds=captcha_dur,
                earn_per_captcha=earn_per,
                daily_captcha_limit=daily_limit,
                is_active=True,
            )
            db.add(package)
            created_packages.append(package)
        await db.commit()
        logger.info(f"  ✓ {len(created_packages)} packages created")

        # ── 7. Create Investments ──────────────────────────────────────────
        logger.info("Creating investments...")
        now = datetime.now(timezone.utc)
        investments_created = 0
        investment_profit_entries = []  # collect profit history to add after flush

        for i, user in enumerate(all_users):
            if user.is_admin:
                continue
            num_investments = _random(rng, 1, 3)
            for j in range(num_investments):
                pkg_name, invest_amt, total_ret, duration, captcha_per_day, captcha_dur, earn_per, daily_limit = PACKAGES[
                    _random(rng, 0, len(PACKAGES) - 1)
                ]
                amount = Decimal(str(invest_amt))
                total_return = Decimal(str(total_ret))
                daily_pmt = total_return / Decimal(str(duration))
                expected_profit = total_return - amount
                roi_percent = (total_return / amount) * Decimal("100")

                start_date = now - timedelta(days=_random(rng, 10, 60))
                end_date = start_date + timedelta(days=duration)

                # Some completed, some active
                status = "active"
                profit_earned = Decimal("0")
                profit_pct_paid = Decimal("0")
                if i % 5 == 0:  # every 5th user gets completed investment
                    status = "completed"
                    profit_earned = expected_profit
                    profit_pct_paid = roi_percent

                investment = Investment(
                    user_id=user.id,
                    package_name=pkg_name,
                    invested_amount=amount,
                    roi_percent=roi_percent,
                    expected_profit=expected_profit,
                    daily_payment=daily_pmt,
                    captcha_required_per_day=captcha_per_day,
                    earn_per_captcha=earn_per,
                    daily_captcha_limit=daily_limit,
                    captchas_typed_today=0,
                    profit_earned=profit_earned,
                    profit_percentage_paid=profit_pct_paid,
                    start_date=start_date,
                    end_date=end_date,
                    status=status,
                )
                db.add(investment)
                investments_created += 1

                # Store profit history configs — we'll add them after the flush
                # once we have the investment ID
                if status == "active":
                    num_credits = _random(rng, 1, 5)
                    for k in range(num_credits):
                        credit_date = start_date + timedelta(
                            days=k * (duration // (num_credits + 1))
                        )
                        investment_profit_entries.append({
                            "investment": investment,
                            "amount": daily_pmt,
                            "percentage": Decimal("0"),
                            "created_at": credit_date,
                        })

        # Flush investments to get their IDs before creating profit history
        await db.flush()

        # Now create profit history records with real investment IDs
        for entry in investment_profit_entries:
            profit_entry = InvestmentProfitHistory(
                investment_id=entry["investment"].id,
                amount=entry["amount"],
                percentage=entry["percentage"],
                created_at=entry["created_at"],
            )
            db.add(profit_entry)

        await db.commit()
        logger.info(f"  ✓ {investments_created} investments created")

        # ── 8. Create ROI Settings ────────────────────────────────────────
        logger.info("Creating ROI settings...")
        roi_settings_data = {
            "global_roi_percent": "5.00",
            "scheduled_pkg:Starter Package": "0.0548",
            "scheduled_pkg:Growth Package": "0.1370",
            "scheduled_pkg:Advanced Package": "0.2740",
            "scheduled_pkg:Pro Package": "0.5479",
            "scheduled_pkg:Elite Package": "2.7397",
            "scheduled_pkg:VIP Package": "5.4795",
        }
        for key, val in roi_settings_data.items():
            setting = ROISetting(
                key=key,
                roi_percent=Decimal(val),
            )
            db.add(setting)
        await db.commit()
        logger.info(f"  ✓ {len(roi_settings_data)} ROI settings created")

        # ── 8. Create Platform Stats ───────────────────────────────────────
        logger.info("Creating platform stats...")
        stats = PlatformStats(
            total_users=len(all_users),
            total_invested=sum(
                u.main_wallet for u in all_users if not u.is_admin
            ),
            total_withdrawn=Decimal("25000"),
            total_profit_shared=Decimal("15000"),
            active_investors=sum(
                1 for u in all_users if not u.is_admin
            ),
        )
        db.add(stats)
        await db.commit()
        logger.info("  ✓ Platform stats created")

        # ── 9. Create Announcements ────────────────────────────────────────
        logger.info("Creating announcements...")
        announcements_data = [
            {
                "title": "Welcome to Oxford Financial Ads!",
                "message": "We are excited to announce the launch of our AI-powered arbitrage trading platform. Start earning today!",
                "is_active": True,
            },
            {
                "title": "New Package Tiers Available",
                "message": "Check out our new Oxford Financial Ads Captcha Typing packages with daily payment model.",
                "is_active": True,
            },
            {
                "title": "ARBX Token Airdrop",
                "message": "All registered users receive 100 ARBX tokens for free. Complete your KYC to unlock!",
                "is_active": True,
            },
            {
                "title": "Scheduled Maintenance",
                "message": "The platform will undergo maintenance on Sunday from 2 AM to 4 AM UTC.",
                "is_active": False,
            },
        ]
        for ann_data in announcements_data:
            announcement = Announcement(
                title=ann_data["title"],
                message=ann_data["message"],
                is_active=ann_data["is_active"],
                created_by=all_users[0].id,  # admin
            )
            db.add(announcement)
        await db.commit()
        logger.info(f"  ✓ {len(announcements_data)} announcements created")

    await engine.dispose()
    logger.info("")
    logger.info("=" * 55)
    logger.info("  ✅  Database seeding complete!")
    logger.info("=" * 55)
    logger.info("")
    logger.info("  Admin Login:")
    logger.info("    Email:    admin@oxfordfinancialads.com")
    logger.info("    Password: Admin@123")
    logger.info("")
    logger.info("  Test User Logins (all with same password):")
    logger.info("    Email:    john@example.com (or any user@example.com)")
    logger.info("    Password: Test@123")
    logger.info("")
    logger.info("  API Docs: http://localhost:8000/docs")
    logger.info("")


def uuid4_hex(rng: Random) -> str:
    """Generate a deterministic hex string resembling a UUID."""
    return "".join(rng.choice("0123456789abcdef") for _ in range(32))





def main():
    parser = argparse.ArgumentParser(
        description="Seed the Oxford Financial Ads database with test data."
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Drop existing data and re-seed",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=DEFAULT_USERS,
        help=f"Number of users to create (default: {DEFAULT_USERS})",
    )
    args = parser.parse_args()

    asyncio.run(seed_database(force=args.force, user_count=args.users))


if __name__ == "__main__":
    main()
