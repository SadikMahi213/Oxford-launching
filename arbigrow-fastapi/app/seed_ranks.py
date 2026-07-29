"""
Seed script: Populate the ranks table with 21 default ranks.
Run: python -m app.seed_ranks
"""
import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.models.rank import Rank
from app.models.rank_bonus_config import RankBonusConfig


RANK_DATA = [
    {"name": "Starter", "slug": "starter", "sort_order": 1, "target_volume": 100, "matching_percent": Decimal("2.00")},
    {"name": "Silver", "slug": "silver", "sort_order": 2, "target_volume": 500, "matching_percent": Decimal("3.00")},
    {"name": "Gold", "slug": "gold", "sort_order": 3, "target_volume": 1000, "matching_percent": Decimal("4.00")},
    {"name": "Platinum", "slug": "platinum", "sort_order": 4, "target_volume": 3000, "matching_percent": Decimal("5.00")},
    {"name": "Diamond", "slug": "diamond", "sort_order": 5, "target_volume": 5000, "matching_percent": Decimal("6.00")},
    {"name": "Ruby", "slug": "ruby", "sort_order": 6, "target_volume": 10000, "matching_percent": Decimal("7.00")},
    {"name": "Emerald", "slug": "emerald", "sort_order": 7, "target_volume": 20000, "matching_percent": Decimal("8.00")},
    {"name": "Sapphire", "slug": "sapphire", "sort_order": 8, "target_volume": 35000, "matching_percent": Decimal("9.00")},
    {"name": "Pearl", "slug": "pearl", "sort_order": 9, "target_volume": 50000, "matching_percent": Decimal("10.00")},
    {"name": "Coral", "slug": "coral", "sort_order": 10, "target_volume": 75000, "matching_percent": Decimal("11.00")},
    {"name": "Opal", "slug": "opal", "sort_order": 11, "target_volume": 100000, "matching_percent": Decimal("12.00")},
    {"name": "Topaz", "slug": "topaz", "sort_order": 12, "target_volume": 150000, "matching_percent": Decimal("13.00")},
    {"name": "Amethyst", "slug": "amethyst", "sort_order": 13, "target_volume": 200000, "matching_percent": Decimal("14.00")},
    {"name": "Crystal", "slug": "crystal", "sort_order": 14, "target_volume": 300000, "matching_percent": Decimal("15.00")},
    {"name": "Jade", "slug": "jade", "sort_order": 15, "target_volume": 500000, "matching_percent": Decimal("16.00")},
    {"name": "Obsidian", "slug": "obsidian", "sort_order": 16, "target_volume": 750000, "matching_percent": Decimal("17.00")},
    {"name": "Titanium", "slug": "titanium", "sort_order": 17, "target_volume": 1000000, "matching_percent": Decimal("18.00")},
    {"name": "Crown", "slug": "crown", "sort_order": 18, "target_volume": 1500000, "matching_percent": Decimal("19.00")},
    {"name": "Royal", "slug": "royal", "sort_order": 19, "target_volume": 2000000, "matching_percent": Decimal("20.00")},
    {"name": "Emperor", "slug": "emperor", "sort_order": 20, "target_volume": 3000000, "matching_percent": Decimal("22.00")},
    {"name": "Legend", "slug": "legend", "sort_order": 21, "target_volume": 5000000, "matching_percent": Decimal("25.00")},
]


async def seed_ranks():
    session: AsyncSession
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(Rank).limit(1))
        if existing.scalar_one_or_none():
            print("Ranks already seeded. Skipping.")
            return

        for data in RANK_DATA:
            matching_pct = data.pop("matching_percent")
            rank = Rank(**data)
            session.add(rank)
            await session.flush()

            session.add(RankBonusConfig(
                rank_id=rank.id,
                bonus_type="matching",
                bonus_percent=matching_pct,
                sort_order=0,
            ))

        await session.commit()
        print(f"Seeded {len(RANK_DATA)} ranks.")


if __name__ == "__main__":
    asyncio.run(seed_ranks())
