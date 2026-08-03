"""
Remediate rank entitlements for users who are NOT KYC-approved.

Business rule (KYC-first): a user must be fully KYC-verified (approved) before
they may hold a rank, qualify via team volume, or receive a matching bonus.

This script finds every user whose effective KYC status is not 'approved' and
strips every rank artifact:
  * current_rank_id -> NULL
  * team_volume -> 0
  * all active matching_bonuses rows marked REVERSED (history preserved)
  * matching_bonus_wallet recomputed from remaining (non-reversed) rows
  * active rank_histories marked REVERSED (auditable)
It never touches deposits, referral bonuses, KYC holds, or approved users.

Runs inside a single transaction and supports `--dry-run` so it can be
previewed before anything is written.

Usage:
  python remediate_unverified_ranks.py --dry-run     # preview only
  python remediate_unverified_ranks.py               # apply (transactional)
"""
import asyncio
import argparse
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.rank_history import RankHistory
from app.models.matching_bonus import MatchingBonus
from app.services.rank_service import enforce_kyc_rank_gate
from app.utils.kyc_helper import is_kyc_approved

PRECISION = Decimal("0.00000000000001")


async def collect_artifacts(db, user_id: int) -> dict:
    """Snapshot the rank artifacts held by one user."""
    bonuses = (
        await db.execute(
            select(MatchingBonus).where(
                MatchingBonus.user_id == user_id,
                MatchingBonus.is_reversed == False,
            )
        )
    ).scalars().all()
    histories = (
        await db.execute(
            select(RankHistory).where(
                RankHistory.user_id == user_id,
                RankHistory.status == "achieved",
            )
        )
    ).scalars().all()
    return {
        "active_bonuses": list(bonuses),
        "active_histories": list(histories),
        "bonus_total": sum((b.bonus_amount or Decimal("0") for b in bonuses), Decimal("0")),
    }


async def run(dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        rows = (await db.execute(select(User))).scalars().all()
        targets = []
        for u in rows:
            if await is_kyc_approved(u, db):
                continue
            if u.current_rank_id is None and not (u.team_volume or Decimal("0")) > 0:
                artifacts = await collect_artifacts(db, u.id)
                if not artifacts["active_bonuses"] and not artifacts["active_histories"]:
                    continue
                targets.append((u, artifacts))
            else:
                targets.append((u, await collect_artifacts(db, u.id)))

        if not targets:
            print("No non-KYC users holding any rank artifact. Nothing to do.")
            return

        total_bonus = sum((a["bonus_total"] for _, a in targets), Decimal("0"))
        total_histories = sum((len(a["active_histories"]) for _, a in targets), 0)
        print(
            f"Detected {len(targets)} non-KYC user(s) holding rank artifacts "
            f"({total_bonus} USDT in matching bonuses, {total_histories} rank histories):\n"
        )
        for u, a in targets:
            print(
                f"  user {u.id} (user_no={u.user_no}) rank={u.current_rank_id} "
                f"team_volume={u.team_volume} bonuses={len(a['active_bonuses'])} "
                f"bonus_total={a['bonus_total']} histories={len(a['active_histories'])}"
            )

        print(f"\nTotal matching bonus to reverse: {total_bonus}")

        if dry_run:
            print("\nDRY RUN - no changes written.")
            return

        now = datetime.now(timezone.utc)
        for u, a in targets:
            before_wallet = u.matching_bonus_wallet or Decimal("0")
            await enforce_kyc_rank_gate(u, db)
            remaining = sum(
                (b.bonus_amount or Decimal("0") for b in a["active_bonuses"]),
                Decimal("0"),
            ).quantize(PRECISION)
            print(
                f"  user {u.id}: rank {u.current_rank_id} -> None, "
                f"team_volume -> 0, wallet {before_wallet} -> "
                f"{u.matching_bonus_wallet} (reversed {len(a['active_bonuses'])} bonus, "
                f"{len(a['active_histories'])} history)"
            )

        await db.commit()
        print(
            f"\nAPPLIED. Cleaned {len(targets)} non-KYC user(s): reversed "
            f"{total_bonus} USDT of matching bonuses and {total_histories} rank history row(s)."
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(run(args.dry_run))
