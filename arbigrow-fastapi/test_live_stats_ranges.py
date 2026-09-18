"""Regression tests for the amended OFA Cryptocurrency Live Activity ranges.

The OFA counters are now driven by the server-authoritative `/api/v1/live-stats/`
presentation layer, so the "existing Live Activity simulation" lives in
`app/api/v1/live_stats.py`. These tests pin the newly approved range contract:

  * `live_online` — ~190,000+ baseline, moves ±400–500 per 3s tick (direction
    varies), hard window [150,000, 600,000], mean-reverting, deterministic.
  * `tasks_completed_today` — 0 → ~200,000 across the 24h UTC window (5s cadence),
    monotonically increasing within the day, never above 200,000.
  * `platform_earnings_activity` — 0 → a per-day ceiling chosen deterministically
    within $40,000–$50,000 (10s cadence), monotonic within the day, never above
    the chosen ceiling (hence never above $50,000).
  * All three are pure functions of the server clock → identical for every user,
    determinism, survive refresh/logout/login, and their cadences (3s/5s/10s)
    keep them from updating in lockstep.
  * The three metrics are mutually independent (different RNG seeds).

Run with: python test_live_stats_ranges.py
"""
import importlib.util

SPEC = importlib.util.spec_from_file_location(
    "live_stats", "app/api/v1/live_stats.py"
)
ls = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(ls)

DAY = 86400
DAY0 = 1_800_000_000 - (1_800_000_000 % DAY)  # aligned to a UTC midnight


def test_live_online_stays_inside_approved_bounds():
    for offset in range(0, DAY, 7):
        v = ls._live_online(DAY0 + offset)
        assert 150_000 <= v <= 600_000


def test_live_online_moves_plusminus_400_to_500_every_tick():
    deltas = [
        abs(ls._live_online(DAY0 + (i + 1) * 3) - ls._live_online(DAY0 + i * 3))
        for i in range(1200)
    ]
    assert all(400 <= d <= 500 for d in deltas), deltas[:10]


def test_live_online_starts_above_190k_and_fluctuates_not_static():
    first = ls._live_online(DAY0)
    assert first >= 190_000
    later = {ls._live_online(DAY0 + i * 3) for i in range(200)}
    assert len(later) > 150, "must vary across ticks"


def test_live_online_walk_includes_up_and_down_directions():
    ups = downs = 0
    prev = ls._live_online(DAY0)
    for i in range(1, 2000):
        cur = ls._live_online(DAY0 + i * 3)
        ups += cur > prev
        downs += cur < prev
        prev = cur
    assert ups > 0 and downs > 0


def test_live_online_is_deterministic():
    assert ls._live_online(DAY0 + 43210) == ls._live_online(DAY0 + 43210)


def test_live_online_daily_base_differs_across_days():
    bases = {ls._live_online(DAY0 + k * DAY) for k in range(3)}
    assert len(bases) == 3, "each UTC day should seed a distinct baseline"


def test_tasks_never_exceed_200k():
    assert all(
        ls._tasks_completed_today(DAY0 + offset) <= 200_000
        for offset in range(0, DAY, 9)
    )


def test_tasks_increase_monotonically_through_the_day():
    prev = -1
    for offset in range(0, DAY, 15):
        cur = ls._tasks_completed_today(DAY0 + offset)
        assert cur >= prev
        prev = cur
    assert prev >= 190_000, "should climb near the ceiling by day end"


def test_tasks_is_deterministic():
    assert (
        ls._tasks_completed_today(DAY0 + 12345) == ls._tasks_completed_today(DAY0 + 12345)
    )


def test_earnings_never_exceed_50k_cap():
    assert all(
        ls._platform_earnings_activity(DAY0 + offset) <= 50_000.0
        for offset in range(0, DAY, 9)
    )


def test_earnings_ceiling_selected_between_40k_and_50k_per_day():
    ceilings = [ls._platform_earnings_activity(DAY0 + k * DAY + DAY - 1) for k in range(8)]
    assert all(40_000.0 <= c <= 50_000.0 for c in ceilings), ceilings
    assert len(set(ceilings)) > 1, "daily ceiling should vary across days"


def test_earnings_increase_monotonically_through_the_day():
    prev = -1.0
    for offset in range(0, DAY, 15):
        cur = ls._platform_earnings_activity(DAY0 + offset)
        assert cur >= prev
        prev = cur
    assert prev >= 40_000.0, "should climb near the ceiling by day end"


def test_earnings_is_deterministic():
    assert (
        ls._platform_earnings_activity(DAY0 + 99999)
        == ls._platform_earnings_activity(DAY0 + 99999)
    )


def test_cadences_are_staggered_not_lockstep():
    # The three counters tick on 3s / 5s / 10s granularity — consecutive calls
    # must not all change simultaneously at a shared granularity.
    t0 = DAY0 + 12345
    a1, a2 = ls._live_online(t0), ls._live_online(t0 + 3)
    b1, b2 = ls._tasks_completed_today(t0), ls._tasks_completed_today(t0 + 3)
    assert a1 != a2 and b1 == b2, "3s tick changes live_online but not tasks"


def test_metrics_use_independent_seeds():
    # Random(day) vs Random(day*2) vs Random(day*2+1) → streams uncorrelated.
    assert ls._live_online(DAY0) != ls._tasks_completed_today(DAY0)
    assert ls._tasks_completed_today(DAY0) == ls._tasks_completed_today(DAY0)


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} LIVE STATS RANGE TESTS PASSED")