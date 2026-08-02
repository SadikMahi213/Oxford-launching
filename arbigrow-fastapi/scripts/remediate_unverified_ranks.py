"""
Remediate matching-bonus ranks/wallets assigned to users who were NEVER
KYC-approved. Business rule: a user must be fully KYC-verified (approved)
before they may qualify for a rank or receive a matching bonus.

This script:
  * Finds every user who currently holds a rank but whose effective KYC
    status is not 'approved'.
  * For each such user it marks ALL of their matching_bonuses rows as
    REVERSED (preserving history), recomputes matching_bonus_wallet to the
    sum of only non-reversed rows (so it drops to zero for these users),
    and clears current_rank_id.
  * Does NOT touch deposits, referral bonuses, kyc holds, or any other user.
  * Runs inside a single transaction and supports `--dry-run` so it can be
    previewed before anything is written.

Usage:
  python remediate_unverified_ranks.py --dry-run     # preview only
  python remediate_unverified_ranks.py               # apply (transactional)
"""
import asyncio
import argparse
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.matching_bonus import MatchingBonus
from app.utils.kyc_helper import is_kyc_approved

REASON = "Reversed: user not KYC-verified at time of rank/bonus assignment."
PRECISION = Decimal("0.00000000000001")


async def load_targets(db):
    """Return users with a rank whose effective KYC is not approved.

    Each element: (user, [matching_bonuses_to_reverse], current_wallet)
    """
    rows = (await db.execute(select(User).where(User.current_rank_id.isnot(None)))).scalars().all()
    targets = []
    for u in rows:
        if await is_kyc_approved(u, db):
            continue
        bonuses = (
            await db.execute(
                select(MatchingBonus).where(
                    MatchingBonus.user_id == u.id,
                    MatchingBonus.is_reversed == False,
                )
            )
        ).scalars().all()
        targets.append([u, list(bonuses), u.matching_bonus_wallet or Decimal("0")])
    return targets


async def run(dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        targets = await load_targets(db)

        if not targets:
            print("No users with a rank whose KYC is not approved. Nothing to do.")
            return

        total_bonus = sum(
            (b.bonus_amount or Decimal("0") for _, bonuses, _ in targets for b in bonuses),
            Decimal("0"),
        )
        print(f"Detected {len(targets)} user(s) holding a rank without KYC approval:\n")
        for u, bonuses, wallet in targets:
            bon_sum = sum((b.bonus_amount or Decimal("0") for b in bonuses), Decimal("0"))
            print(
                f"  user {u.id} rank={u.current_rank_id} wallet={wallet} "
                f"matching_bonus rows={len(bonuses)} total_bonus={bon_sum}"
            )
            for b in bonuses:
                print(
                    f"      id={b.id} rank_id={b.rank_id} type={b.bonus_type} "
                    f"amount={b.bonus_amount}"
                )
        print(f"\nTotal matching bonus to reverse: {total_bonus}")

        if dry_run:
            print("\nDRY RUN - no changes written.")
            return

        now = datetime.now(timezone.utc)
        reversed_ids = [b.id for _, bonuses, _ in targets for b in bonuses]
        reversed_user_ids = [u.id for u, _, _ in targets]

        if reversed_ids:
            await db.execute(
                update(MatchingBonus)
                .where(MatchingBonus.id.in_(reversed_ids))
                .values(
                    is_reversed=True,
                    reversed_at=now,
                    reversal_reason=REASON,
                    reversed_by=None,
                )
            )
        if reversed_user_ids:
            await db.execute(
                update(User).where(User.id.in_(reversed_user_ids)).values(current_rank_id=None)
            )

        per_user_new: dict[int, Decimal] = {}
        for u, _, wallet in targets:
            remaining = (
                await db.execute(
                    select(MatchingBonus).where(
                        MatchingBonus.user_id == u.id,
                        MatchingBonus.is_reversed == False,
                    )
                )
            ).scalars().all()
            new_wallet = sum(
                (b.bonus_amount or Decimal("0") for b in remaining), Decimal("0")
            ).quantize(PRECISION)
            per_user_new[u.id] = new_wallet
            print(f"  user {u.id}: wallet {wallet} -> {new_wallet}")

        for uid, new_wallet in per_user_new.items():
            await db.execute(
                update(User).where(User.id == uid).values(matching_bonus_wallet=new_wallet)
            )

        await db.commit()
        print(
            f"\nAPPLIED. Reversed {len(reversed_ids)} matching bonus row(s) for "
            f"{len(reversed_user_ids)} user(s)."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args.dry_run))