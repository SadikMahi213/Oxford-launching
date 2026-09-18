"""Regression tests for Fund Send / MB Transfer user search access.

Issue: GET /user/list was gated behind get_current_admin_user, so normal
(non-admin) users could never search for a recipient on the Fund Send page.

Fix: the endpoint now accepts any authenticated user; non-admin users may only
search (a search term is required), while admins keep the full user list.

Run with: python test_user_search_access.py
"""
import asyncio
from datetime import datetime, timezone

from app.api.v1.user import get_user_list


class _FakeScalars:
    def __init__(self, items=None):
        self._items = items or []

    def all(self):
        return self._items


class _FakeRow:
    def __init__(self, val, items=None):
        self.val = val
        self._items = items

    def scalar_one_or_none(self):
        return self.val

    def scalar(self):
        return self.val

    def scalars(self):
        return _FakeScalars(self._items)


class _FakeUser:
    def __init__(self, user_id, *, is_admin=False, account_status="active"):
        self.id = user_id
        self.is_admin = is_admin
        self.account_status = account_status
        self.user_no = f"U{user_id}"
        self.full_name = f"User {user_id}"
        self.email = f"user{user_id}@example.com"
        self.username = f"user{user_id}"
        self.created_at = datetime(2026, 8, 1, 12, 0, 0, tzinfo=timezone.utc)


class _FakeDB:
    def __init__(self, users):
        self.users = users

    async def execute(self, stmt):
        text = str(stmt)
        if "count(" in text:
            return _FakeRow(len(self.users))
        return _FakeRow(None, self.users)


def _run(users, search, current_user):
    db = _FakeDB(users)

    async def run():
        return await get_user_list(
            page=1,
            limit=50,
            search=search,
            db=db,
            current_user=current_user,
        )

    return asyncio.run(run())


def test_non_admin_can_search_users():
    """Normal user searches for another user -> results are returned."""
    users = [_FakeUser(2), _FakeUser(3)]
    result = _run(users, search="user", current_user=_FakeUser(1, is_admin=False))
    assert result["users"], "normal user search must return recipients"
    assert all(u.get("full_name") for u in result["users"])
    assert all(u.get("email") for u in result["users"])


def test_non_admin_cannot_list_all_users_without_search():
    """Normal users must not be able to enumerate the full user directory."""
    users = [_FakeUser(2), _FakeUser(3)]
    result = _run(users, search=None, current_user=_FakeUser(1, is_admin=False))
    assert result["users"] == []
    assert result["total"] == 0


def test_admin_can_list_without_search():
    """Admin user-list behaviour is unchanged."""
    users = [_FakeUser(2), _FakeUser(3)]
    result = _run(users, search=None, current_user=_FakeUser(1, is_admin=True))
    assert len(result["users"]) == 2
    assert result["total"] == 2


def test_admin_search_unaffected():
    users = [_FakeUser(2)]
    result = _run(users, search="2", current_user=_FakeUser(1, is_admin=True))
    assert len(result["users"]) == 1


def test_response_shape_matches_frontend_consumer():
    """Fund Send reads res.data.users with id/full_name/email fields."""
    result = _run([_FakeUser(7)], search="user", current_user=_FakeUser(1, is_admin=False))
    u = result["users"][0]
    for field in ("id", "user_no", "full_name", "email", "username", "status"):
        assert field in u, f"missing field {field}"


if __name__ == "__main__":
    passed = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            passed.append(name)
            print(f"PASS {name}")
    print(f"\nALL {len(passed)} USER SEARCH ACCESS TESTS PASSED")
