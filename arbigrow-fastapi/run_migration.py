"""
Migration: add matching_bonus_wallet column and backfill from matching_bonuses table.
"""
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def run():
    async with AsyncSessionLocal() as db:
        for stmt in [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS matching_bonus_wallet NUMERIC(24,14) DEFAULT 0",
        ]:
            await db.execute(text(stmt))
        # Backfill matching_bonus_wallet from existing MatchingBonus records
        await db.execute(text("""
            UPDATE users u
            SET matching_bonus_wallet = (
                SELECT COALESCE(SUM(mb.bonus_amount), 0)
                FROM matching_bonuses mb
                WHERE mb.user_id = u.id
            )
        """))
        await db.commit()
        print("Migration complete")

asyncio.run(run())
