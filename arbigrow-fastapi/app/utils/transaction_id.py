import secrets
import string

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.base import Base

ALPHANUMERIC = string.ascii_uppercase + string.digits


def generate_transaction_id(length: int = 16) -> str:
    return "".join(secrets.choice(ALPHANUMERIC) for _ in range(length))


async def generate_unique_transaction_id(
    db: AsyncSession,
    model: type[Base],
    column: str = "transaction_id",
    length: int = 16,
) -> str:
    while True:
        txid = generate_transaction_id(length)
        result = await db.execute(
            select(select(model).where(getattr(model, column) == txid).exists())
        )
        if not result.scalar():
            return txid
