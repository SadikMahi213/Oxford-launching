"""
Safe user cleanup script.
Deletes all non-admin users while preserving admin accounts and database integrity.
Uses transactions and handles cascading deletes.

Usage:
    python cleanup_users.py              # Dry run (preview only)
    python cleanup_users.py --confirm    # Actually delete users
    python cleanup_users.py --confirm --backup   # Backup before deletion
"""

import asyncio
import sys
import json
from datetime import datetime

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.user import User


async def cleanup(confirm: bool = False, backup: bool = False):
    print("=" * 60)
    print("USER CLEANUP SCRIPT")
    print("=" * 60)

    async with AsyncSessionLocal() as db:
        # Find admin users
        result = await db.execute(select(User).where(User.is_admin == True))
        admins = result.scalars().all()

        # Find non-admin users
        result = await db.execute(
            select(User).where(User.is_admin == False).order_by(User.id)
        )
        non_admins = result.scalars().all()

        print(f"\nAdmin users ({len(admins)}):")
        for a in admins:
            print(f"  ID={a.id}, name={a.full_name}, email={a.email}")

        print(f"\nNon-admin users to delete ({len(non_admins)}):")
        for u in non_admins[:20]:
            print(f"  ID={u.id}, name={u.full_name}, email={u.email}")
        if len(non_admins) > 20:
            print(f"  ... and {len(non_admins) - 20} more")

        if not non_admins:
            print("\nNo non-admin users found. Nothing to do.")
            return

        print(f"\nTotal: {len(admins)} admin(s) preserved, {len(non_admins)} user(s) to delete")

        if not confirm:
            print("\n⚠ Dry run — no changes made. Pass --confirm to execute deletion.")
            return

        # Backup if requested
        if backup:
            backup_data = []
            for u in non_admins:
                backup_data.append({
                    "id": u.id,
                    "full_name": u.full_name,
                    "email": u.email,
                    "username": u.username,
                })
            backup_file = f"user_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            with open(backup_file, "w") as f:
                json.dump(backup_data, f, indent=2)
            print(f"\nBackup saved to {backup_file}")

        # Delete non-admin users in a transaction
        user_ids = [u.id for u in non_admins]
        try:
            async with db.begin():
                # Delete related records (cascade should handle most, but be explicit)
                for uid in user_ids:
                    # Delete KYC
                    await db.execute(text(f"DELETE FROM kyc_verifications WHERE user_id = {uid}"))
                    # Delete investments
                    await db.execute(text(f"DELETE FROM investments WHERE user_id = {uid}"))
                    # Delete deposits
                    await db.execute(text(f"DELETE FROM deposits WHERE user_id = {uid}"))
                    # Delete withdrawals
                    await db.execute(text(f"DELETE FROM withdrawals WHERE user_id = {uid}"))
                    # Delete mining logs
                    await db.execute(text(f"DELETE FROM mining_logs WHERE user_id = {uid}"))
                    # Delete captcha challenges
                    await db.execute(text(f"DELETE FROM captcha_challenges WHERE user_id = {uid}"))
                    # Delete captcha earnings
                    await db.execute(text(f"DELETE FROM captcha_earnings WHERE user_id = {uid}"))
                    # Delete ad views
                    await db.execute(text(f"DELETE FROM ad_views WHERE user_id = {uid}"))
                    # Delete user ad views
                    await db.execute(text(f"DELETE FROM user_ad_views WHERE user_id = {uid}"))
                    # Delete invoices
                    await db.execute(text(f"DELETE FROM invoices WHERE user_id = {uid}"))
                    # Delete transfer logs (sender or receiver)
                    await db.execute(text(f"DELETE FROM transfer_logs WHERE sender_id = {uid} OR receiver_id = {uid}"))
                    # Delete seller
                    await db.execute(text(f"DELETE FROM sellers WHERE user_id = {uid}"))
                    # Delete admin notifications
                    await db.execute(text(f"DELETE FROM admin_notifications WHERE user_id = {uid}"))
                    # Delete investment profit history via investments
                    # Delete referral profit history

                # Finally delete the users
                await db.execute(
                    text(f"DELETE FROM users WHERE id IN ({','.join(str(i) for i in user_ids)})")
                )

            print(f"\n✅ Successfully deleted {len(non_admins)} user(s)")
        except Exception as e:
            print(f"\n❌ Error during deletion: {e}")
            raise


if __name__ == "__main__":
    confirm = "--confirm" in sys.argv
    backup = "--backup" in sys.argv

    asyncio.run(cleanup(confirm=confirm, backup=backup))
