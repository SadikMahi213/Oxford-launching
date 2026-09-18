from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings


_connect_args = {}
if settings.DB_SSL_REQUIRED:
    _connect_args["ssl"] = True
<<<<<<< HEAD
=======
else:
    _connect_args["ssl"] = False
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args=_connect_args,
<<<<<<< HEAD
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_pre_ping=True,
    pool_recycle=3600,
=======
    pool_pre_ping=True,
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
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
