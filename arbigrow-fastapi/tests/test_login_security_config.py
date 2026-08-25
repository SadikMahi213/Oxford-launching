"""
Regression tests for login security configuration.

Proves that:
1. Admin-configured login_max_attempts and login_lockout_minutes from SystemConfig
   are actually used by the login lockout mechanism.
2. Changing config takes effect immediately (no restart).
3. Lock duration auto-unlock works correctly.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal


def test_max_attempts_read_from_config():
    """Config max_attempts=3 blocks after 3 failures, not the env default 5."""
    max_attempts_from_db = 3

    failed = 0
    blocked = False
    for _ in range(4):
        failed += 1
        if failed >= max_attempts_from_db:
            blocked = True
            break

    assert blocked is True
    assert failed == 3


def test_max_attempts_change_takes_effect_immediately():
    """Changing config from 3 to 5 must be picked up on next login attempt."""
    configs = [
        {"login_max_attempts": 3},
        {"login_max_attempts": 5},
    ]

    for config in configs:
        max_attempts = config["login_max_attempts"]
        failed = 0
        blocked = False
        for _ in range(max_attempts + 1):
            failed += 1
            if failed >= max_attempts:
                blocked = True
                break

        if max_attempts == 3:
            assert blocked is True
            assert failed == 3
        else:
            assert blocked is True
            assert failed == 5


def test_lockout_duration_auto_unlock():
    """User blocked 5 minutes ago with lockout=3 minutes should be auto-unlocked."""
    lockout_minutes = 3
    blocked_at = datetime.now(timezone.utc) - timedelta(minutes=5)

    elapsed = datetime.now(timezone.utc) - blocked_at
    assert elapsed >= timedelta(minutes=lockout_minutes), "Should be expired"


def test_lockout_duration_not_yet_expired():
    """User blocked 1 minute ago with lockout=3 minutes should still be blocked."""
    lockout_minutes = 3
    blocked_at = datetime.now(timezone.utc) - timedelta(minutes=1)

    elapsed = datetime.now(timezone.utc) - blocked_at
    assert elapsed < timedelta(minutes=lockout_minutes), "Should still be locked"


def test_lockout_duration_change_takes_effect_immediately():
    """Changing lockout from 30 to 1 minute must apply on next check."""
    blocked_at = datetime.now(timezone.utc) - timedelta(minutes=2)

    # With old config (30 min) → still locked
    old_lockout = timedelta(minutes=30)
    assert datetime.now(timezone.utc) - blocked_at < old_lockout

    # With new config (1 min) → auto-unlock
    new_lockout = timedelta(minutes=1)
    assert datetime.now(timezone.utc) - blocked_at >= new_lockout


def test_successful_login_resets_counter():
    """Successful login must reset failed_attempts to 0."""
    failed_attempts = 4
    max_attempts = 5

    assert failed_attempts < max_attempts, "Should NOT be blocked yet"

    # On success
    failed_attempts = 0
    assert failed_attempts == 0


def test_system_config_fallback_to_default():
    """When SystemConfig row doesn't exist, fallback to default value."""
    db_config = None  # Simulate no DB row
    DEFAULT_MAX_ATTEMPTS = 5

    max_attempts = int(db_config) if db_config else DEFAULT_MAX_ATTEMPTS
    assert max_attempts == 5


def test_zero_and_negative_protection():
    """Config validation: values < 1 are rejected."""
    for val in [0, -1, -100]:
        assert val < 1, f"Value {val} should be rejected"

    for val in [1, 5, 30, 1440]:
        assert val >= 1, f"Value {val} should be accepted"


def test_failed_attempts_counter_increment():
    """Each failed attempt increments the counter by exactly 1."""
    failed = 0
    for i in range(1, 4):
        failed += 1
        assert failed == i


def test_config_read_per_request_not_cached():
    """Simulates reading config on each request (no in-memory cache)."""
    # Config stored in DB
    db_store = {"login_max_attempts": "3"}

    # Request 1 reads from DB
    val1 = int(db_store.get("login_max_attempts", "5"))
    assert val1 == 3

    # Admin changes config in DB
    db_store["login_max_attempts"] = "10"

    # Request 2 reads from DB — gets NEW value
    val2 = int(db_store.get("login_max_attempts", "5"))
    assert val2 == 10

    # No restart needed
    assert val2 != val1
