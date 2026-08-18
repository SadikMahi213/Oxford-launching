import math
import time
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import JSONResponse


router = APIRouter(prefix="/live-stats", tags=["Live Stats"])

# ─────────────────────────────────────────────────────────────────────────────
# Shared, server-authoritative presentation layer for Global Live Activity and
# OFA Cryptocurrency live stats.
#
# IMPORTANT: This is display-only data. Nothing here is written to the
# database and no real financial records are created. Every value is a pure
# function of the server clock, so all users, devices and (stateless) workers
# observe the IDENTICAL global stream — eliminating per-browser random
# divergence. The event sequence is anchored to `seq = floor(now / 1000)`,
# therefore it is independent of who is logged in, page refreshes, or which
# browser opened the page.
# ─────────────────────────────────────────────────────────────────────────────

EVENT_INTERVAL_MS = 1000
WINDOW = 8  # number of recent events returned per request

# Weighted activity types — terminology/i18n keys match the frontend exactly.
ACTIVITY_TYPES = [
    ("withdraw", "💸", "liveActivityFeed.types.withdraw", 10),
    ("deposit", "🏦", "liveActivityFeed.types.deposit", 10),
    ("captcha", "🔐", "liveActivityFeed.types.captcha", 20),
    ("ads", "📺", "liveActivityFeed.types.ads", 20),
    ("ecommerce", "🛒", "liveActivityFeed.types.ecommerce", 15),
    ("mining", "⛏️", "liveActivityFeed.types.mining", 10),
    ("task", "💻", "liveActivityFeed.types.task", 10),
    ("signup", "🎉", "liveActivityFeed.types.signup", 5),
]

TASK_KEYS = [
    "liveActivityFeed.tasks.dataEntry",
    "liveActivityFeed.tasks.graphics",
    "liveActivityFeed.tasks.videoEditing",
    "liveActivityFeed.tasks.digitalMarketing",
]

# Curated country list (code, display name, weight). Philippines is weighted
# higher to reflect the existing presentation bias.
COUNTRIES = [
    ("US", "United States", 3), ("GB", "United Kingdom", 3), ("IN", "India", 4),
    ("PH", "Philippines", 8), ("BD", "Bangladesh", 5), ("PK", "Pakistan", 4),
    ("NG", "Nigeria", 4), ("ID", "Indonesia", 4), ("BR", "Brazil", 3),
    ("EG", "Egypt", 3), ("KE", "Kenya", 3), ("VN", "Vietnam", 3),
    ("MX", "Mexico", 3), ("TR", "Turkey", 3), ("RU", "Russia", 2),
    ("JP", "Japan", 2), ("DE", "Germany", 2), ("FR", "France", 2),
    ("CA", "Canada", 2), ("AU", "Australia", 2), ("AE", "United Arab Emirates", 2),
    ("ZA", "South Africa", 2), ("LK", "Sri Lanka", 3), ("NP", "Nepal", 3),
]

FIRST_NAMES = [
    "James", "Maria", "Mohammed", "Aisha", "Liam", "Sofia", "Noah", "Emma",
    "Arjun", "Mei", "Lucas", "Olivia", "Hiro", "Fatima", "Daniel", "Grace",
    "Carlos", "Amara", "Yusuf", "Layla", "Ethan", "Chloe", "Ravi", "Ines",
    "Mateo", "Zara", "Kenji", "Nadia", "Omar", "Elena", "Pedro", "Aiko",
    "Sami", "Leila", "Tariq", "Sara", "Diego", "Yuki", "Hassan", "Maya",
]

LAST_NAMES = [
    "Smith", "Cruz", "Khan", "Rahman", "Johnson", "Garcia", "Patel", "Chen",
    "Müller", "Silva", "Tanaka", "Hassan", "Brown", "Lopez", "Singh", "Wang",
    "Rossi", "Kim", "Ahmed", "Nguyen", "Walker", "Diaz", "Sharma", "Lee",
    "Costa", "Ali", "Novak", "Reyes", "Okafor", "Haddad", "Schmidt", "Mbeki",
    "Fernandez", "Yamamoto", "Ibrahim", "Petrov", "Santos", "Cohen", "Park", "Mensah",
]


def _weighted_index(rng, weights):
    total = sum(weights)
    r = rng.random() * total
    for i, w in enumerate(weights):
        r -= w
        if r <= 0:
            return i
    return len(weights) - 1


def _amount(rng, atype, task_key):
    if atype == "withdraw":
        r = rng.random()
        if r < 0.5:
            raw = 10 + rng.random() * 80
        elif r < 0.8:
            raw = 90 + rng.random() * 160
        elif r < 0.95:
            raw = 250 + rng.random() * 250
        else:
            raw = 500 + rng.random() * 200
        raw = min(700, max(10, raw))
        return f"${raw:.2f}"
    if atype == "deposit":
        r = rng.random()
        if r < 0.45:
            raw = 10 + rng.random() * 90
        elif r < 0.75:
            raw = 100 + rng.random() * 200
        elif r < 0.93:
            raw = 300 + rng.random() * 400
        else:
            raw = 700 + rng.random() * 300
        return f"${round(raw)}"
    if atype == "captcha":
        return f"${(0.01 + rng.random() * 2):.2f}"
    if atype == "ads":
        return f"${(0.02 + rng.random() * 1.5):.2f}"
    if atype == "ecommerce":
        return f"${(5 + rng.random() * 195):.2f}"
    if atype == "mining":
        return f"{(0.5 + rng.random() * 19.5):.2f} OFA"
    if atype == "task":
        idx = TASK_KEYS.index(task_key) if task_key in TASK_KEYS else 3
        spans = [(2, 30), (8, 120), (10, 190), (5, 145)]
        lo, span = spans[idx]
        return f"${(lo + rng.random() * span):.2f}"
    return None


def _event_for_index(n):
    # Deterministic event for global sequence index `n`. Identical for every
    # request because the RNG is seeded by `n`.
    rng = __import__("random").Random(n)
    ti = _weighted_index(rng, [w for *_, w in ACTIVITY_TYPES])
    atype, icon, action_key, _ = ACTIVITY_TYPES[ti]
    task_key = TASK_KEYS[_weighted_index(rng, [25, 25, 25, 25])] if atype == "task" else None
    ci = _weighted_index(rng, [w for _, _, w in COUNTRIES])
    code, cname, _ = COUNTRIES[ci]
    name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
    amount = _amount(rng, atype, task_key)
    return {
        "id": n,
        "name": name,
        "country": {"code": code, "name": cname},
        "activity": {
            "type": atype,
            "icon": icon,
            "actionKey": action_key,
            "taskKey": task_key,
        },
        "amount": amount,
        "timestamp": n * 1000,
    }


def _daily_seed_int():
    return int(datetime.utcnow().strftime("%Y%m%d"))


def _triangle(now_s, period, amplitude):
    # Continuous triangular wave: rises 0→amplitude then falls back over
    # `period` seconds. Guarantees a minimum per-second change of
    # `2*amplitude/period` (constant slope), so the value can never appear
    # frozen and no two consecutive seconds can show the identical combo.
    phase = now_s % period
    half = period / 2.0
    if phase < half:
        return amplitude * (2.0 * phase / period)
    return amplitude * (2.0 - 2.0 * phase / period)


def _live_online(now_s):
    # Smooth, deterministic oscillation — evolves continuously (never frozen),
    # bounded to a believable range, identical for all users at a given time.
    val = 380000 + 185000 * math.sin(now_s / 720.0) + 32000 * math.sin(now_s / 95.0)
    val += _triangle(now_s, 300, 4000)
    return int(round(val)) | 1


def _tasks_completed_today(now_s):
    base = (_daily_seed_int() % 1000) * 37 + 18000
    frac = (now_s % 86400) / 86400.0
    # Daily upward trend plus a fast bounded wobble (min ~133 tasks/sec) so the
    # value visibly ticks up and down instead of creeping monotonically.
    val = base + frac * 72000 + _triangle(now_s, 90, 6000) + 400 * math.sin(now_s / 7.0)
    return int(round(val)) | 1


def _platform_earnings_activity(now_s):
    base = (_daily_seed_int() % 1000) * 11 + 19000
    frac = (now_s % 86400) / 86400.0
    # Daily upward trend plus a fast bounded wobble (min ~$26/sec) so the
    # displayed USD figure keeps moving every poll.
    val = base + frac * 9000 + _triangle(now_s, 60, 800) + 120 * math.sin(now_s / 13.0)
    return round(val, 2)


@router.get("/")
async def get_live_stats():
    now_ms = int(time.time() * 1000)
    now_s = now_ms // 1000
    seq = now_s
    events = [_event_for_index(n) for n in range(seq - WINDOW + 1, seq + 1)]
    payload = {
        "server_time": now_ms,
        "seq": seq,
        "live_online": _live_online(now_s),
        "tasks_completed_today": _tasks_completed_today(now_s),
        "platform_earnings_activity": _platform_earnings_activity(now_s),
        "activity": events,
    }
    return JSONResponse(payload, headers={"Cache-Control": "no-store"})
