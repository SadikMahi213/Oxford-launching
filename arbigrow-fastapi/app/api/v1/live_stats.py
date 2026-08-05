import random
from datetime import date, datetime

from fastapi import APIRouter


router = APIRouter(prefix="/live-stats", tags=["Live Stats"])


def _odd(n: int) -> int:
    return n if n % 2 else n + 1


def _daily_seed() -> int:
    return int(date.today().strftime("%Y%m%d"))


class _LiveStatsState:
    def __init__(self):
        self._day = date.today()
        self._tasks = self._daily_odd_tasks()
        self._earnings = self._daily_odd_earnings()
        self.last_online = self._seed_live_online()

    def _check_day(self):
        today = date.today()
        if today != self._day:
            self._day = today
            self._tasks = self._daily_odd_tasks()
            self._earnings = self._daily_odd_earnings()

    def _daily_odd_tasks(self) -> int:
        r = random.Random(_daily_seed() * 2 + 1)
        return _odd(r.randint(17000, 22000))

    def _daily_odd_earnings(self) -> float:
        r = random.Random(_daily_seed() * 3 + 1)
        dollars = _odd(r.randint(5000, 8000))
        cents = r.randint(0, 99)
        return dollars + cents / 100.0

    def _seed_live_online(self) -> int:
        r = random.Random(_daily_seed())
        lo_min, lo_max = self._time_range()
        return _odd(r.randint(lo_min, lo_max))

    def _time_range(self):
        h = datetime.now().hour
        if 6 <= h < 12:
            return (236_589, 360_000)
        if 12 <= h < 18:
            return (280_000, 520_000)
        if 18 <= h < 24:
            return (420_000, 900_000)
        return (650_000, 1_200_000)

    def tick_live_online(self) -> int:
        self._check_day()
        lo_min, lo_max = self._time_range()
        step = random.randint(-800, 800)
        val = self.last_online + step
        val = max(lo_min, min(lo_max, val))
        val = _odd(val)
        self.last_online = val
        return val

    def tasks(self) -> int:
        self._check_day()
        return self._tasks

    def earnings(self) -> float:
        self._check_day()
        return self._earnings


_state = _LiveStatsState()


@router.get("/")
async def get_live_stats():
    return {
        "live_online": _state.tick_live_online(),
        "tasks_completed_today": _state.tasks(),
        "earnings_paid_today": _state.earnings(),
    }
