"""Live-stats 10s bucket cache regression tests.

- First request in a bucket generates; second request in the same bucket
  reuses the cached payload (no recompute).
- A request in the next bucket regenerates.
- Response schema/keys are unchanged; server_time stays fresh per response.

Run with: python test_live_stats_cache.py
"""
import asyncio
import time

from app.api.v1 import live_stats as ls


def _fresh_state():
    ls._stats_cache.clear()


def test_same_bucket_reuses_cache():
    _fresh_state()
    now_s = 1_700_000_003  # mid-bucket: +3s stays in the same 10s window
    first = ls._bucket_payload(now_s)
    second = ls._bucket_payload(now_s + 3)
    assert second is first, "same 10s bucket must return the cached object"
    assert first["seq"] == (now_s // 10) * 10
    assert set(first) == {"seq", "live_online", "tasks_completed_today",
                          "platform_earnings_activity", "activity"}
    assert len(first["activity"]) == ls.WINDOW


def test_next_bucket_regenerates():
    _fresh_state()
    now_s = 1_700_000_007
    first = ls._bucket_payload(now_s)
    nxt = ls._bucket_payload(now_s + 10)
    assert nxt is not first, "new bucket must regenerate"
    assert nxt["seq"] == first["seq"] + 10
    assert len(ls._stats_cache) <= ls._STATS_CACHE_MAX_BUCKETS


def test_cache_bounded_and_deterministic_across_calls():
    _fresh_state()
    a = ls._bucket_payload(1_700_000_050)
    b = ls._bucket_payload(1_700_000_050)
    assert a == b, "same bucket must be value-identical (worker consistency)"
    assert a["live_online"] == ls._live_online(1_700_000_050 - (1_700_000_050 % 10))


def test_endpoint_schema_and_fresh_server_time():
    _fresh_state()

    async def run():
        return await ls.get_live_stats()

    r1 = asyncio.run(run())
    assert r1.status_code == 200
    import json
    body1 = json.loads(r1.body.decode())
    assert set(body1) == {"server_time", "seq", "live_online",
                          "tasks_completed_today", "platform_earnings_activity",
                          "activity"}, f"schema changed: {sorted(body1)}"
    assert body1["activity"] and len(body1["activity"]) == ls.WINDOW
    time.sleep(0.02)
    r2 = asyncio.run(run())
    body2 = json.loads(r2.body.decode())
    assert body2["server_time"] >= body1["server_time"], "server_time must stay fresh"
    assert body2["seq"] == body1["seq"], "same bucket must share seq"
    assert body2["live_online"] == body1["live_online"]


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                passed.append(name)
                print(f"PASS {name}")
            except Exception as e:
                print(f"FAIL {name}: {e}")
    total = len([n for n, f in globals().items() if n.startswith("test_") and callable(f)])
    print(f"\n{len(passed)}/{total} LIVE-STATS CACHE TESTS PASSED")
    raise SystemExit(0 if len(passed) == total else 1)
