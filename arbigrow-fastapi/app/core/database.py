from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings


_connect_args = {}
if settings.DB_SSL_REQUIRED:
    _connect_args["ssl"] = True
else:
    _connect_args["ssl"] = False


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def check_db_connection():
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
