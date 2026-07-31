"""
Cron job: recalculate ranks for all users or a specific user.
Run from host via: docker exec arbigrow-backend python /app/scripts/recalculate_ranks.py
Or add to system crontab.
"""
import asyncio
import sys
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.rank_service import evaluate_and_process_rank


async def recalculate_all():
    async with AsyncSessionLocal() as db:
        total = await db.execute(select(func.count(User.id)))
        count = total.scalar() or 0
        print(f"Recalculating ranks for {count} users...")
        batch_size = 100
        offset = 0
        while offset < count:
            result = await db.execute(
                select(User.id).where(User.team_volume > 0).order_by(User.id).offset(offset).limit(batch_size)
            )
            user_ids = [row[0] for row in result.all()]
            if not user_ids:
                break
            for uid in user_ids:
                try:
                    await evaluate_and_process_rank(user_id=uid, db=db)
                except Exception as e:
                    print(f"  Error for user {uid}: {e}")
            await db.commit()
            offset += batch_size
            print(f"  Processed {offset}/{count}")
        print("Done.")


async def recalculate_user(user_id: int):
    async with AsyncSessionLocal() as db:
        try:
            result = await evaluate_and_process_rank(user_id=user_id, db=db)
            await db.commit()
            print(f"User {user_id}: {result}")
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        asyncio.run(recalculate_user(int(sys.argv[1])))
    else:
        asyncio.run(recalculate_all())
