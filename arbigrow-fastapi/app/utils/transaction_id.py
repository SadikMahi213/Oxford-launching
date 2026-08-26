import secrets
import string

from sqlalchemy import select, func
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


def format_invoice_number(record_id: int) -> str:
    """Generate OFA invoice number: OFA + 6-digit zero-padded ID.

    Uses the database auto-increment ID (post-insert) for guaranteed
    uniqueness — no collision possible since IDs are sequential.
    """
    return f"OFA{record_id:06d}"


def format_withdrawal_reference(record_id: int) -> str:
    """Generate withdrawal reference: OFAWD-XXXXXXXX (8 random alphanumeric chars).

    Uses cryptographically secure random generation for uniqueness.
    The record_id parameter is kept for backward compatibility but not used
    in the new format to avoid exposing sequential information.
    """
    random_suffix = "".join(secrets.choice(ALPHANUMERIC) for _ in range(8))
    return f"OFAWD-{random_suffix}"
