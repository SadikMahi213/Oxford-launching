"""Quick verification script for matching bonus system deployment."""
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def verify():
    async with AsyncSessionLocal() as db:
        # Check ranks
        r = await db.execute(text("SELECT count(*) FROM ranks"))
        rank_count = r.scalar()
        print(f"Ranks: {rank_count}")

        # Check user columns
        for col in ["current_rank_id", "team_volume"]:
            r = await db.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name=:c"),
                {"c": col},
            )
            print(f"users.{col}: {'OK' if r.first() else 'MISSING'}")

        # Check new tables exist
        for tbl in ["ranks", "rank_histories", "matching_bonuses"]:
            r = await db.execute(
                text("SELECT table_name FROM information_schema.tables WHERE table_name=:t"),
                {"t": tbl},
            )
            print(f"Table {tbl}: {'OK' if r.first() else 'MISSING'}")

    print("All checks complete.")


if __name__ == "__main__":
    asyncio.run(verify())
