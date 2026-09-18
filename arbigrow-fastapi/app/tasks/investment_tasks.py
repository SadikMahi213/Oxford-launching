import asyncio
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def process_daily_roi(self):
    from app.services.investment_service import run_auto_roi_cycle

    async def _run():
        return await run_auto_roi_cycle()

    try:
        result = asyncio.run(_run())
        logger.info(
            "Daily ROI cycle completed: processed=%s credited=%s",
            result.get("processed", 0),
            result.get("credited", 0),
        )
        return result
    except Exception as exc:
        logger.exception("Daily ROI cycle failed")
        raise self.retry(exc=exc)
