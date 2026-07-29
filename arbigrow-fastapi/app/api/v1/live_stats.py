import random
import time
from datetime import datetime

from fastapi import APIRouter


router = APIRouter(prefix="/live-stats", tags=["Live Stats"])


class _LiveStatsState:
    def __init__(self):
        now = datetime.now()
        self._day = now.day
        self._hour = now.hour
        self.last_tick = time.time()
        self.live_online = 236_589
        self.tasks_completed = 18_432
        self.earnings_paid = 5782.40

    def _check_reset(self):
        now = datetime.now()
        if now.day != self._day:
            self._day = now.day
            self.tasks_completed = random.randint(15_000, 22_000)
            self.earnings_paid = round(random.uniform(4500, 6500), 2)
            self._hour = now.hour

    def _get_time_range(self):
        h = datetime.now().hour
        if 6 <= h < 12:
            return (236_589, 360_000)
        if 12 <= h < 18:
            return (280_000, 520_000)
        if 18 <= h < 24:
            return (420_000, 900_000)
        return (650_000, 1_200_000)

    def tick(self):
        self._check_reset()
        now = time.time()
        elapsed = now - self.last_tick
        self.last_tick = now

        lo_min, lo_max = self._get_time_range()
        target = random.randint(lo_min, lo_max)
        step = int((target - self.live_online) * 0.25 * min(elapsed / 5, 1))
        if step == 0:
            step = random.choice([-1, 1]) * random.randint(50, 300)
        self.live_online = max(236_589, min(1_500_000, self.live_online + step))

        self.tasks_completed += random.randint(3, 25) * max(1, int(elapsed / 3))
        self.earnings_paid = round(
            self.earnings_paid + random.uniform(0.3, 7.0) * max(1, elapsed / 3), 2
        )


_state = _LiveStatsState()


@router.get("/")
async def get_live_stats():
    _state.tick()
    return {
        "live_online": _state.live_online,
        "tasks_completed_today": _state.tasks_completed,
        "earnings_paid_today": _state.earnings_paid,
    }
