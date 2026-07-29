"""
Database Cleanup - Preserve admin, delete all non-admin user data.
Runs each DELETE individually with its own commit to avoid transaction abort chain.
"""
import asyncio, sys
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def run(session, label, sql, admin_p=None):
    if admin_p:
        sql = sql.replace("{admin_p}", admin_p)
    try:
        r = await session.execute(text(sql))
        c = r.rowcount
        await session.commit()
        if c:
            print(f"  {label}: {c}")
        return c
    except Exception as e:
        await session.rollback()
        print(f"  {label}: ERROR - {e}")
        return -1


async def cleanup():
    async with AsyncSessionLocal() as session:
        # 1. Identify admin users
        result = await session.execute(
            text("SELECT id, full_name, email FROM users WHERE is_admin = TRUE")
        )
        admins = result.fetchall()
        if not admins:
            print("ERROR: No admin users found. Aborting.")
            sys.exit(1)

        print(f"Found {len(admins)} admin(s):")
        for a in admins:
            print(f"  ID={a[0]}, Name={a[1]}, Email={a[2]}")

        admin_ids = tuple(a[0] for a in admins)
        admin_p = ",".join(str(i) for i in admin_ids)

        result = await session.execute(
            text("SELECT COUNT(*) FROM users WHERE is_admin = FALSE")
        )
        non_admin_count = result.scalar()
        print(f"\nNon-admin users: {non_admin_count}")
        if non_admin_count == 0:
            print("Nothing to clean.")
            return
        await session.commit()

    # 2. Delete in strict FK order - each statement gets its own session
    deletes = [
        # --- Tables with ON DELETE CASCADE (safe) ---
        ("refresh_tokens", f"DELETE FROM refresh_tokens WHERE user_id NOT IN ({admin_p})"),
        ("captcha_challenges", f"DELETE FROM captcha_challenges WHERE user_id NOT IN ({admin_p})"),
        ("captcha_earnings", f"DELETE FROM captcha_earnings WHERE user_id NOT IN ({admin_p})"),
        ("ad_views", f"DELETE FROM ad_views WHERE user_id NOT IN ({admin_p})"),
        ("user_ad_views", f"DELETE FROM user_ad_views WHERE user_id NOT IN ({admin_p})"),
        ("rank_histories", f"DELETE FROM rank_histories WHERE user_id NOT IN ({admin_p})"),
        ("kyc_verifications", f"DELETE FROM kyc_verifications WHERE user_id NOT IN ({admin_p})"),

        # --- Referral/bonus (all user data, must come before investments) ---
        ("referral_profit_history", "DELETE FROM referral_profit_history"),
        ("matching_bonuses", "DELETE FROM matching_bonuses"),
        ("transfer_logs", "DELETE FROM transfer_logs"),
        ("investment_profit_history",
         f"DELETE FROM investment_profit_history WHERE investment_id IN (SELECT id FROM investments WHERE user_id NOT IN ({admin_p}))"),

        # --- Financial records ---
        ("investments", f"DELETE FROM investments WHERE user_id NOT IN ({admin_p})"),
        ("withdrawals", f"DELETE FROM withdrawals WHERE user_id NOT IN ({admin_p})"),
        ("deposits", f"DELETE FROM deposits WHERE user_id NOT IN ({admin_p})"),
        ("invoices", f"DELETE FROM invoices WHERE user_id NOT IN ({admin_p})"),

        # --- Other user-linked tables ---
        ("token_blacklist", "DELETE FROM token_blacklist"),
        ("security_logs", f"DELETE FROM security_logs WHERE user_id NOT IN ({admin_p})"),
        ("bank_info", f"DELETE FROM bank_info WHERE user_id NOT IN ({admin_p})"),
        ("mining_logs", f"DELETE FROM mining_logs WHERE user_id NOT IN ({admin_p})"),
        ("compare_items", f"DELETE FROM compare_items WHERE user_id NOT IN ({admin_p})"),
        ("wishlist_items", f"DELETE FROM wishlist_items WHERE user_id NOT IN ({admin_p})"),

        # --- Ecommerce orders ---
        ("return_requests", f"DELETE FROM return_requests WHERE user_id NOT IN ({admin_p})"),
        ("order_attachments",
         "DELETE FROM order_attachments WHERE order_id IN (SELECT id FROM orders WHERE user_id NOT IN ({admin_p}) OR user_id IS NULL)"),
        ("order_status_logs",
         "DELETE FROM order_status_logs WHERE order_id IN (SELECT id FROM orders WHERE user_id NOT IN ({admin_p}) OR user_id IS NULL)"),
        ("order_items",
         "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id NOT IN ({admin_p}) OR user_id IS NULL)"),
        ("ecommerce_wallet_transactions", f"DELETE FROM ecommerce_wallet_transactions WHERE user_id NOT IN ({admin_p})"),
        ("orders", f"DELETE FROM orders WHERE user_id NOT IN ({admin_p}) OR user_id IS NULL"),

        # --- Vendor / seller data ---
        ("vendor_withdraws", f"DELETE FROM vendor_withdraws WHERE user_id NOT IN ({admin_p})"),
        ("seller_delivery_zones",
         "DELETE FROM seller_delivery_zones WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p}))"),
        ("delivery_zones",
         "DELETE FROM delivery_zones WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p}))"),
        ("product_views",
         "DELETE FROM product_views WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p})))"),
        ("product_reviews", f"DELETE FROM product_reviews WHERE user_id NOT IN ({admin_p})"),
        ("product_tags",
         "DELETE FROM product_tags WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p})))"),
        ("product_attribute_values",
         "DELETE FROM product_attribute_values WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p})))"),
        ("product_variants",
         "DELETE FROM product_variants WHERE product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p})))"),
        ("products",
         "DELETE FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id NOT IN ({admin_p}))"),
        ("sellers", f"DELETE FROM sellers WHERE user_id NOT IN ({admin_p})"),

        # --- Cart / coupon ---
        ("cart_items",
         "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id NOT IN ({admin_p}))"),
        ("carts", f"DELETE FROM carts WHERE user_id NOT IN ({admin_p})"),
        ("coupon_usages", f"DELETE FROM coupon_usages WHERE user_id NOT IN ({admin_p})"),

        # --- Ads / notifications ---
        ("ad_views_cleanup", f"DELETE FROM ad_views WHERE user_id NOT IN ({admin_p})"),
        ("user_ad_views_cleanup", f"DELETE FROM user_ad_views WHERE user_id NOT IN ({admin_p})"),
        ("admin_notifications", f"DELETE FROM admin_notifications WHERE user_id NOT IN ({admin_p}) OR user_id IS NULL"),

        # --- Non-admin users ---
        ("users", "DELETE FROM users WHERE is_admin = FALSE"),
    ]

    total = 0
    errors = 0

    for tbl, sql in deletes:
        async with AsyncSessionLocal() as session:
            c = await run(session, tbl, sql, admin_p)
            if c < 0:
                errors += 1
            else:
                total += c

    # 3. Verify
    async with AsyncSessionLocal() as session:
        print("\n=== VERIFICATION ===")
        checks = [
            ("Non-admin users", "SELECT COUNT(*) FROM users WHERE is_admin = FALSE", 0),
            ("Admin users preserved", "SELECT COUNT(*) FROM users WHERE is_admin = TRUE", len(admin_ids)),
            ("Deposits", f"SELECT COUNT(*) FROM deposits WHERE user_id NOT IN ({admin_p})", 0),
            ("Withdrawals", f"SELECT COUNT(*) FROM withdrawals WHERE user_id NOT IN ({admin_p})", 0),
            ("Investments", f"SELECT COUNT(*) FROM investments WHERE user_id NOT IN ({admin_p})", 0),
            ("KYC records", f"SELECT COUNT(*) FROM kyc_verifications WHERE user_id NOT IN ({admin_p})", 0),
            ("Sellers", "SELECT COUNT(*) FROM sellers", 0),
            ("Orders", "SELECT COUNT(*) FROM orders", 0),
            ("Products", "SELECT COUNT(*) FROM products", 0),
            ("Carts", "SELECT COUNT(*) FROM carts", 0),
        ]

        all_ok = True
        for label, sql, expected in checks:
            r = await session.execute(text(sql))
            cnt = r.scalar()
            ok = cnt == expected
            if not ok:
                all_ok = False
            print(f"  {label}: {cnt} (expected {expected}) {'OK' if ok else '*** FAIL ***'}")

        await session.commit()

        print(f"\n=== SUMMARY ===")
        print(f"  Total rows deleted: {total}")
        if errors:
            print(f"  Errors: {errors}")
        print(f"  {'ALL CHECKS PASSED' if all_ok else 'SOME CHECKS FAILED - review above'}")
        print("  Done.")


if __name__ == "__main__":
    asyncio.run(cleanup())
