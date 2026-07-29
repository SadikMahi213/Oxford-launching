from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)):
    db_healthy = False
    try:
        await db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        pass

    healthy = db_healthy

    if not healthy:
        from fastapi import Response
        return Response(
            status_code=503,
            content="Service Unhealthy"
        )

    return {
        "status": "ok",
        "database": "healthy" if db_healthy else "unhealthy",
    }
