<<<<<<< HEAD
class GAService:
    enabled = False
    def get_overview(self):
        return None
    def get_daily_visitors(self):
        return None
    def get_realtime_active_users(self):
        return None
    def get_top_pages(self):
        return None
    def get_landing_pages(self):
        return None
    def get_countries(self):
        return None
    def get_cities(self):
        return None
    def get_devices(self):
        return None
    def get_operating_systems(self):
        return None
    def get_browsers(self):
        return None
    def get_traffic_sources(self):
        return None

ga4_service = GAService()
=======
import json
import base64
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from cachetools import TTLCache

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    DateRange,
    Dimension,
    Metric,
    RunReportRequest,
    RunRealtimeReportRequest,
)
from google.oauth2.service_account import Credentials
from google.api_core import exceptions as google_exceptions

from app.core.config import settings

logger = logging.getLogger(__name__)


class GoogleAnalyticsService:
    _SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

    def __init__(self):
        self._client: BetaAnalyticsDataClient | None = None
        self._property_id: str = ""
        self._enabled = False
        self._cache = TTLCache(maxsize=32, ttl=600)

        self._init_client()

    def _init_client(self):
        raw = settings.GOOGLE_ANALYTICS_CREDENTIALS
        prop = settings.GOOGLE_ANALYTICS_PROPERTY_ID

        if not raw or not prop:
            logger.warning("GA4 not configured — skipping analytics init")
            return

        try:
            decoded = base64.b64decode(raw).decode("utf-8")
            info = json.loads(decoded)
            creds = Credentials.from_service_account_info(info, scopes=self._SCOPES)
            self._client = BetaAnalyticsDataClient(credentials=creds)
            self._property_id = prop
            self._enabled = True
        except Exception as exc:
            logger.error("Failed to init GA4 client: %s", exc)

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _run_report(
        self,
        dimensions: list[str] | None = None,
        metrics: list[str] | None = None,
        date_ranges: list[tuple[str, str]] | None = None,
        order_by: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        if not self._enabled:
            return []

        dims = [Dimension(name=d) for d in dimensions] if dimensions else []
        mets = [Metric(name=m) for m in metrics] if metrics else []
        ranges = (
            [DateRange(start_date=s, end_date=e) for s, e in date_ranges]
            if date_ranges
            else [DateRange(start_date="30daysAgo", end_date="today")]
        )

        request = RunReportRequest(
            property=f"properties/{self._property_id}",
            dimensions=dims,
            metrics=mets,
            date_ranges=ranges,
            limit=limit,
        )

        try:
            response = self._client.run_report(request)
        except google_exceptions.PermissionDenied as exc:
            logger.warning("GA4 API permission denied: %s", exc)
            raise
        except google_exceptions.GoogleAPIError as exc:
            logger.error("GA4 API error: %s", exc)
            return []
        return self._rows_to_dicts(response)

    def _run_realtime(
        self,
        dimensions: list[str] | None = None,
        metrics: list[str] | None = None,
        limit: int = 30,
    ) -> list[dict[str, Any]]:
        if not self._enabled:
            return []

        dims = [Dimension(name=d) for d in dimensions] if dimensions else []
        mets = [Metric(name=m) for m in metrics] if metrics else []

        request = RunRealtimeReportRequest(
            property=f"properties/{self._property_id}",
            dimensions=dims,
            metrics=mets,
            limit=limit,
        )

        response = self._client.run_realtime_report(request)
        return self._rows_to_dicts(response)

    @staticmethod
    def _rows_to_dicts(response) -> list[dict[str, Any]]:
        rows = []
        header_dim = [d.name for d in response.dimension_headers]
        header_met = [m.name for m in response.metric_headers]

        for row in response.rows:
            entry = {}
            for i, dv in enumerate(row.dimension_values):
                entry[header_dim[i]] = dv.value
            for i, mv in enumerate(row.metric_values):
                entry[header_met[i]] = mv.value
            rows.append(entry)
        return rows

    # ── Public API methods ──────────────────────────────────────

    def get_overview(self) -> dict[str, Any]:
        key = "overview"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            metrics=[
                "totalUsers",
                "newUsers",
                "sessions",
                "screenPageViews",
                "averageSessionDuration",
                "bounceRate",
            ],
            date_ranges=[("30daysAgo", "today"), ("60daysAgo", "31daysAgo")],
        )

        current = rows[0] if rows else {}
        previous = rows[1] if len(rows) > 1 else {}

        result = {
            "totalUsers": int(current.get("totalUsers", 0)),
            "newUsers": int(current.get("newUsers", 0)),
            "sessions": int(current.get("sessions", 0)),
            "pageViews": int(current.get("screenPageViews", 0)),
            "avgEngagementTime": float(current.get("averageSessionDuration", 0)),
            "bounceRate": float(current.get("bounceRate", 0)),
            "previous": {
                "totalUsers": int(previous.get("totalUsers", 0)),
                "newUsers": int(previous.get("newUsers", 0)),
                "sessions": int(previous.get("sessions", 0)),
                "pageViews": int(previous.get("screenPageViews", 0)),
            },
        }

        self._cache[key] = result
        return result

    def get_daily_visitors(self, days: int = 30) -> list[dict[str, Any]]:
        key = f"daily_{days}"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["date"],
            metrics=["totalUsers", "newUsers", "sessions"],
            date_ranges=[(f"{days}daysAgo", "today")],
        )

        self._cache[key] = rows
        return rows

    def get_countries(self) -> list[dict[str, Any]]:
        key = "countries"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["country"],
            metrics=["totalUsers", "newUsers", "sessions"],
            limit=50,
        )

        self._cache[key] = rows
        return rows

    def get_cities(self) -> list[dict[str, Any]]:
        key = "cities"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["city"],
            metrics=["totalUsers", "newUsers"],
            limit=50,
        )

        self._cache[key] = rows
        return rows

    def get_devices(self) -> list[dict[str, Any]]:
        key = "devices"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["deviceCategory"],
            metrics=["totalUsers", "sessions"],
        )

        self._cache[key] = rows
        return rows

    def get_operating_systems(self) -> list[dict[str, Any]]:
        key = "os"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["operatingSystem"],
            metrics=["totalUsers"],
            limit=20,
        )

        self._cache[key] = rows
        return rows

    def get_browsers(self) -> list[dict[str, Any]]:
        key = "browsers"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["browser"],
            metrics=["totalUsers"],
            limit=20,
        )

        self._cache[key] = rows
        return rows

    def get_traffic_sources(self) -> list[dict[str, Any]]:
        key = "traffic"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["sessionSource", "sessionMedium"],
            metrics=["totalUsers", "sessions"],
            limit=20,
        )

        self._cache[key] = rows
        return rows

    def get_top_pages(self, limit: int = 20) -> list[dict[str, Any]]:
        key = f"pages_{limit}"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["pagePathPlusQueryString"],
            metrics=["screenPageViews", "totalUsers"],
            limit=limit,
        )

        self._cache[key] = rows
        return rows

    def get_landing_pages(self, limit: int = 20) -> list[dict[str, Any]]:
        key = f"landing_{limit}"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_report(
            dimensions=["landingPagePlusQueryString"],
            metrics=["sessions", "totalUsers"],
            limit=limit,
        )

        self._cache[key] = rows
        return rows

    def get_realtime_active_users(self) -> int:
        key = "realtime"
        if key in self._cache:
            return self._cache[key]

        rows = self._run_realtime(
            metrics=["activeUsers"],
            limit=1,
        )

        count = int(rows[0].get("activeUsers", 0)) if rows else 0
        self._cache[key] = count
        return count

    def invalidate_cache(self):
        self._cache.clear()


ga4_service = GoogleAnalyticsService()
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
