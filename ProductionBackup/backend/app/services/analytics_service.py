import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select, func, text, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.visitor_log import VisitorLog
from app.core.database import AsyncSessionLocal


def parse_user_agent(ua: str) -> dict[str, str]:
    ua_lower = ua.lower()

    if "iphone" in ua_lower or "ipad" in ua_lower or "ipod" in ua_lower:
        device_type = "mobile"
    elif "android" in ua_lower and "mobile" in ua_lower:
        device_type = "mobile"
    elif "android" in ua_lower:
        device_type = "tablet"
    elif "windows" in ua_lower:
        device_type = "desktop"
    elif "macintosh" in ua_lower or "mac os" in ua_lower:
        device_type = "desktop"
    elif "linux" in ua_lower:
        device_type = "desktop"
    else:
        device_type = "desktop"

    if "windows" in ua_lower:
        os = "Windows"
    elif "mac os" in ua_lower or "macintosh" in ua_lower:
        os = "macOS"
    elif "android" in ua_lower:
        os = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ipod" in ua_lower:
        os = "iOS"
    elif "linux" in ua_lower:
        os = "Linux"
    elif "cros" in ua_lower:
        os = "ChromeOS"
    else:
        os = "Other"

    if "edge" in ua_lower or "edg/" in ua_lower:
        browser = "Edge"
    elif "chrome" in ua_lower and "chromium" not in ua_lower:
        browser = "Chrome"
    elif "firefox" in ua_lower:
        browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser = "Safari"
    elif "opera" in ua_lower or "opr/" in ua_lower:
        browser = "Opera"
    elif "msie" in ua_lower or "trident" in ua_lower:
        browser = "Internet Explorer"
    else:
        browser = "Other"

    return {"device_type": device_type, "os": os, "browser": browser}


def determine_traffic_source(referrer: str) -> str:
    if not referrer:
        return "direct"
    r = referrer.lower()
    if "google.com" in r:
        return "google"
    if "facebook.com" in r or "fb.com" in r:
        return "facebook"
    if "youtube.com" in r or "youtu.be" in r:
        return "youtube"
    if "instagram.com" in r:
        return "instagram"
    if "tiktok.com" in r:
        return "tiktok"
    return "referral"


async def log_visit_async(
    session_id: str,
    ip_address: str,
    user_agent: str,
    device_type: str,
    os: str,
    browser: str,
    traffic_source: str,
    referrer_url: str | None,
    page_url: str,
) -> None:
    try:
        async with AsyncSessionLocal() as db:
            entry = VisitorLog(
                session_id=session_id[:64],
                ip_address=ip_address[:45],
                user_agent=user_agent[:500] if user_agent else "",
                device_type=device_type,
                os=os,
                browser=browser,
                traffic_source=traffic_source,
                referrer_url=referrer_url[:500] if referrer_url else None,
                page_url=page_url[:500],
            )
            db.add(entry)
            await db.commit()
    except Exception:
        pass


class AnalyticsTracker:

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_summary(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        week_start = today_start - timedelta(days=now.weekday())
        month_start = today_start.replace(day=1)
        year_start = today_start.replace(month=1, day=1)
        online_cutoff = now - timedelta(minutes=15)

        async def count_since(dt: datetime) -> int:
            result = await self.db.execute(
                select(func.count(func.distinct(VisitorLog.session_id))).where(
                    VisitorLog.visited_at >= dt
                )
            )
            return result.scalar() or 0

        total = await self.db.execute(
            select(func.count(func.distinct(VisitorLog.session_id)))
        )

        return {
            "totalVisitors": total.scalar() or 0,
            "todayVisitors": await count_since(today_start),
            "yesterdayVisitors": await count_since(yesterday_start) - await count_since(today_start),
            "weeklyVisitors": await count_since(week_start),
            "monthlyVisitors": await count_since(month_start),
            "yearlyVisitors": await count_since(year_start),
            "currentlyOnline": await count_since(online_cutoff),
        }

    async def get_countries(self, limit: int = 10) -> list[dict[str, Any]]:
        total_q = await self.db.execute(
            select(func.count(VisitorLog.id))
        )
        total = total_q.scalar() or 1

        result = await self.db.execute(
            select(
                VisitorLog.country,
                func.count(VisitorLog.id).label("count"),
            )
            .where(VisitorLog.country.isnot(None))
            .group_by(VisitorLog.country)
            .order_by(text("count DESC"))
            .limit(limit)
        )

        rows = []
        for row in result:
            rows.append({
                "country": row[0] or "Unknown",
                "visitors": row[1],
                "percentage": round(row[1] / total * 100, 1) if total else 0,
            })

        return rows

    async def get_device_report(self) -> dict[str, Any]:
        result = await self.db.execute(
            select(
                VisitorLog.device_type,
                func.count(VisitorLog.id).label("count"),
            )
            .group_by(VisitorLog.device_type)
            .order_by(text("count DESC"))
        )
        devices = [{"device": r[0], "visitors": r[1]} for r in result]

        os_result = await self.db.execute(
            select(
                VisitorLog.os,
                func.count(VisitorLog.id).label("count"),
            )
            .group_by(VisitorLog.os)
            .order_by(text("count DESC"))
        )
        os_list = [{"os": r[0], "visitors": r[1]} for r in os_result]

        return {"devices": devices, "operatingSystems": os_list}

    async def get_traffic_sources(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(
                VisitorLog.traffic_source,
                func.count(VisitorLog.id).label("count"),
            )
            .group_by(VisitorLog.traffic_source)
            .order_by(text("count DESC"))
        )
        return [{"source": r[0], "visitors": r[1]} for r in result]

    async def get_daily_visitors(self, days: int = 30) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=days)

        result = await self.db.execute(
            select(
                func.date(VisitorLog.visited_at).label("date"),
                func.count(func.distinct(VisitorLog.session_id)).label("count"),
            )
            .where(VisitorLog.visited_at >= cutoff)
            .group_by(text("date"))
            .order_by(text("date"))
        )
        return [{"date": str(r[0]), "visitors": r[1]} for r in result]

    async def get_weekly_visitors(self, weeks: int = 12) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(weeks=weeks)

        result = await self.db.execute(
            select(
                func.date_trunc("week", VisitorLog.visited_at).label("week"),
                func.count(func.distinct(VisitorLog.session_id)).label("count"),
            )
            .where(VisitorLog.visited_at >= cutoff)
            .group_by(text("week"))
            .order_by(text("week"))
        )
        return [{"week": str(r[0]), "visitors": r[1]} for r in result]

    async def get_monthly_visitors(self, months: int = 12) -> list[dict[str, Any]]:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(days=months * 31)

        result = await self.db.execute(
            select(
                func.date_trunc("month", VisitorLog.visited_at).label("month"),
                func.count(func.distinct(VisitorLog.session_id)).label("count"),
            )
            .where(VisitorLog.visited_at >= cutoff)
            .group_by(text("month"))
            .order_by(text("month"))
        )
        return [{"month": str(r[0]), "visitors": r[1]} for r in result]
