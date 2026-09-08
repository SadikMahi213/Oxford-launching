"""Guard tests for scripts/reset_user_statistics.sql (Phase: safe reset workflow).

The reset script must:
- touch ONLY the users table,
- SET ONLY explicitly approved balance/statistic columns,
- never DELETE/DROP/TRUNCATE/ALTER anything,
- run inside one transaction (BEGIN/COMMIT),
- never reference protected columns (bonused_up_to, kyc snapshot,
  identity, KYC, referral ancestry, security state).

Run with: python test_reset_user_statistics.py
"""
import pathlib
import re

SCRIPT = pathlib.Path(__file__).with_name("scripts").joinpath("reset_user_statistics.sql")

APPROVED_COLUMNS = {
    "main_wallet", "deposit_wallet", "withdraw_wallet",
    "referral_wallet", "generation_wallet",
    "arbx_wallet", "arbx_mining_wallet",
    "captcha_wallet", "ad_view_wallet", "ecommerce_wallet",
    "matching_bonus_wallet",
    "daily_mined",
    "team_volume", "current_rank_id",
}

PROTECTED_TOKENS = {
    "bonused_up_to", "kyc_approved_team_volume",
    "hashed_password", "parent_lvl_", "referral_code",
    "admin_kyc_status", "account_status",
    "failed_attempts", "blocked_at",
}

FORBIDDEN_VERBS = {"delete", "drop", "truncate", "alter"}


def _text():
    assert SCRIPT.exists(), f"reset script missing: {SCRIPT}"
    return SCRIPT.read_text(encoding="utf-8")


def _strip_comments(text):
    return re.sub(r"--[^\n]*", "", text)


def test_single_update_on_users_only():
    body = _strip_comments(_text())
    updates = re.findall(r"(?i)\bupdate\s+(\w+)", body)
    assert updates, "no UPDATE found"
    assert set(updates) == {"users"}, f"must touch users only, got {set(updates)}"


def _update_block(body):
    m = re.search(r"(?is)\bupdate\s+users\s+set\s+(.*?);", body)
    assert m, "UPDATE users ... SET block not found"
    return m.group(1).lower()


def test_only_approved_columns_assigned():
    assigned = set(re.findall(r"([a-z_][a-z_0-9]*)\s*=", _update_block(_strip_comments(_text()))))
    unknown = assigned - APPROVED_COLUMNS
    assert not unknown, f"unapproved columns assigned: {sorted(unknown)}"
    missing = APPROVED_COLUMNS - assigned
    assert not missing, f"approved columns missing from reset: {sorted(missing)}"


def test_no_forbidden_statements_or_tokens():
    body = _strip_comments(_text())
    low = body.lower()
    for verb in FORBIDDEN_VERBS:
        assert re.search(rf"\b{verb}\b", low) is None, f"forbidden statement: {verb}"
    update_low = _update_block(body)
    for tok in PROTECTED_TOKENS:
        assert tok not in update_low, f"protected token assigned: {tok}"


def test_transaction_wrapped():
    body = _strip_comments(_text())
    assert re.search(r"(?i)^\s*begin\s*;", body, re.M), "missing BEGIN"
    assert re.search(r"(?i)^\s*commit\s*;", body, re.M), "missing COMMIT"


def test_verification_selects_present():
    body = _strip_comments(_text()).lower()
    for needle in ("user_count_after", "deposits_after", "bonused_up_to_total"):
        assert needle in body, f"missing verification query: {needle}"


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
    print(f"\n{len(passed)}/{total} RESET GUARD TESTS PASSED")
    raise SystemExit(0 if len(passed) == total else 1)
