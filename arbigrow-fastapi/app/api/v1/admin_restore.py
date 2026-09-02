"""Admin Account Restore API — Task-Earning Reconciliation.

Detects affected accounts from real production data by cross-referencing:
- TaskAttempt records (completed tasks)
- CaptchaEarning records (actual captcha earnings)
- AdView records (actual ad view earnings)
- User wallet balances (captcha_wallet, ad_view_wallet)
- Investment records (expected rates)

Provides controlled restore actions with duplicate protection.
"""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy import select, func, and_, or_, case, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.models.captcha import CaptchaEarning
from app.models.ad_view import AdView
from app.models.investments import Investment
from app.models.package import Package
from app.models.task_errors import (
    TaskAttempt,
    TaskError,
    AccountSuspension,
    UserRestriction,
    UserWarning,
    AccountRestoreRecord,
    AdminAuditLog,
)
from app.services.task_error_service import expire_stale_suspensions, check_task_access
from app.services.security_logger import SecurityLogger

router = APIRouter(prefix="/admin/restore", tags=["Admin Account Restore"])

WALLET_PRECISION = Decimal("0.00000000000001")


class RestoreExecuteRequest(BaseModel):
    record_id: int
    reason: str = ""
    confirmed: bool = False


class DismissRequest(BaseModel):
    record_id: int
    reason: str = ""


# ── Reconciliation Engine ─────────────────────────────────────────────────────


async def _reconcile_captcha_earnings(db: AsyncSession) -> list[dict]:
    """Detect captcha earning inconsistencies.

    Checks:
    1. Completed captchas where wallet was not credited (missing_earning)
    2. Captcha earnings where amount doesn't match investment rate (incorrect_earning)
    3. Wallet balance mismatch vs sum of earnings (wallet_mismatch)
    """
    issues = []

    # Check 1: Completed tasks with no correct earning record
    completed_no_earning = await db.execute(
        text("""
            SELECT ta.id as attempt_id, ta.user_id, ta.reference_id, ta.created_at
            FROM task_attempts ta
            WHERE ta.status = 'completed'
              AND ta.task_type = 'captcha'
              AND ta.reference_type = 'CaptchaChallenge'
              AND NOT EXISTS (
                SELECT 1 FROM captcha_earnings ce
                WHERE ce.user_id = ta.user_id
                  AND ce.is_correct = true
                  AND ce.created_at >= ta.created_at - INTERVAL '5 minutes'
                  AND ce.created_at <= ta.created_at + INTERVAL '5 minutes'
              )
        """)
    )
    for row in completed_no_earning.mappings():
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "missing_earning",
            "task_type": "captcha",
            "reference_id": row["attempt_id"],
            "reference_type": "TaskAttempt",
            "expected_amount": Decimal("0"),
            "actual_amount": Decimal("0"),
            "difference": Decimal("0"),
            "affected_wallet": "captcha_wallet",
            "description": f"Captcha task completed (attempt #{row['attempt_id']}) but no earning record found",
            "task_date": row["created_at"].isoformat() if row["created_at"] else None,
        })

    # Check 2: Earnings where amount doesn't match investment rate
    incorrect_earnings = await db.execute(
        text("""
            SELECT ce.id as earning_id, ce.user_id, ce.amount_earned, ce.created_at,
                   inv.earn_per_captcha as expected_rate, inv.package_name
            FROM captcha_earnings ce
            JOIN investments inv ON inv.user_id = ce.user_id AND inv.status = 'active'
            WHERE ce.is_correct = true
              AND ce.amount_earned > 0
              AND inv.earn_per_captcha > 0
              AND ABS(ce.amount_earned - inv.earn_per_captcha) > 0.00000000000001
              AND NOT EXISTS (
                SELECT 1 FROM account_restore_records arr
                WHERE arr.user_id = ce.user_id
                  AND arr.reference_id = ce.id
                  AND arr.reference_type = 'CaptchaEarning'
                  AND arr.restore_status != 'dismissed'
              )
        """)
    )
    for row in incorrect_earnings.mappings():
        expected = row["expected_rate"]
        actual = row["amount_earned"]
        diff = actual - expected
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "incorrect_earning",
            "task_type": "captcha",
            "reference_id": row["earning_id"],
            "reference_type": "CaptchaEarning",
            "expected_amount": expected,
            "actual_amount": actual,
            "difference": diff,
            "affected_wallet": "captcha_wallet",
            "description": f"Captcha earning ${actual} differs from investment rate ${expected} ({row['package_name']})",
            "task_date": row["created_at"].isoformat() if row["created_at"] else None,
        })

    # Check 3: Wallet balance vs sum of earnings mismatch
    wallet_mismatch = await db.execute(
        text("""
            SELECT u.id as user_id, u.username, u.captcha_wallet,
                   COALESCE(SUM(ce.amount_earned), 0) as total_earned,
                   u.captcha_wallet - COALESCE(SUM(ce.amount_earned), 0) as difference
            FROM users u
            LEFT JOIN captcha_earnings ce ON ce.user_id = u.id AND ce.is_correct = true
            WHERE u.is_admin = false
              AND u.captcha_wallet > 0
            GROUP BY u.id, u.username, u.captcha_wallet
            HAVING ABS(u.captcha_wallet - COALESCE(SUM(ce.amount_earned), 0)) > 0.00000000000001
              AND NOT EXISTS (
                SELECT 1 FROM account_restore_records arr
                WHERE arr.user_id = u.id
                  AND arr.issue_type = 'wallet_mismatch'
                  AND arr.affected_wallet = 'captcha_wallet'
                  AND arr.restore_status != 'dismissed'
              )
        """)
    )
    for row in wallet_mismatch.mappings():
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "wallet_mismatch",
            "task_type": "captcha",
            "reference_id": None,
            "reference_type": None,
            "expected_amount": row["total_earned"],
            "actual_amount": row["captcha_wallet"],
            "difference": row["difference"],
            "affected_wallet": "captcha_wallet",
            "description": f"Captcha wallet balance ${row['captcha_wallet']} differs from total earned ${row['total_earned']}",
            "task_date": None,
        })

    return issues


async def _reconcile_ad_earnings(db: AsyncSession) -> list[dict]:
    """Detect ad view earning inconsistencies."""
    issues = []

    # Check 1: Completed ad views with zero earning (should have earned)
    zero_earned = await db.execute(
        text("""
            SELECT av.id as view_id, av.user_id, av.started_at
            FROM ad_views av
            WHERE av.is_completed = true
              AND (av.amount_earned = 0 OR av.amount_earned IS NULL)
              AND NOT EXISTS (
                SELECT 1 FROM account_restore_records arr
                WHERE arr.user_id = av.user_id
                  AND arr.reference_id = av.id
                  AND arr.reference_type = 'AdView'
                  AND arr.restore_status != 'dismissed'
              )
        """)
    )
    for row in zero_earned.mappings():
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "missing_earning",
            "task_type": "ad_view",
            "reference_id": row["view_id"],
            "reference_type": "AdView",
            "expected_amount": Decimal("0"),
            "actual_amount": Decimal("0"),
            "difference": Decimal("0"),
            "affected_wallet": "ad_view_wallet",
            "description": f"Ad view #{row['view_id']} completed but earning was not credited",
            "task_date": row["started_at"].isoformat() if row["started_at"] else None,
        })

    # Check 2: Ad view earnings where amount doesn't match investment rate
    incorrect_ad_earnings = await db.execute(
        text("""
            SELECT av.id as view_id, av.user_id, av.amount_earned, av.started_at,
                   inv.earn_per_captcha as expected_rate, inv.package_name
            FROM ad_views av
            JOIN investments inv ON inv.user_id = av.user_id AND inv.status = 'active'
            JOIN packages pkg ON pkg.name = inv.package_name AND pkg.task_type = 'ad_view'
            WHERE av.is_completed = true
              AND av.amount_earned > 0
              AND inv.earn_per_captcha > 0
              AND ABS(av.amount_earned - inv.earn_per_captcha) > 0.00000000000001
              AND NOT EXISTS (
                SELECT 1 FROM account_restore_records arr
                WHERE arr.user_id = av.user_id
                  AND arr.reference_id = av.id
                  AND arr.reference_type = 'AdView'
                  AND arr.restore_status != 'dismissed'
              )
        """)
    )
    for row in incorrect_ad_earnings.mappings():
        expected = row["expected_rate"]
        actual = row["amount_earned"]
        diff = actual - expected
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "incorrect_earning",
            "task_type": "ad_view",
            "reference_id": row["view_id"],
            "reference_type": "AdView",
            "expected_amount": expected,
            "actual_amount": actual,
            "difference": diff,
            "affected_wallet": "ad_view_wallet",
            "description": f"Ad view earning ${actual} differs from package rate ${expected} ({row['package_name']})",
            "task_date": row["started_at"].isoformat() if row["started_at"] else None,
        })

    # Check 3: Wallet balance vs sum of earnings mismatch
    wallet_mismatch = await db.execute(
        text("""
            SELECT u.id as user_id, u.username, u.ad_view_wallet,
                   COALESCE(SUM(av.amount_earned), 0) as total_earned,
                   u.ad_view_wallet - COALESCE(SUM(av.amount_earned), 0) as difference
            FROM users u
            LEFT JOIN ad_views av ON av.user_id = u.id AND av.is_completed = true
            WHERE u.is_admin = false
              AND u.ad_view_wallet > 0
            GROUP BY u.id, u.username, u.ad_view_wallet
            HAVING ABS(u.ad_view_wallet - COALESCE(SUM(av.amount_earned), 0)) > 0.00000000000001
              AND NOT EXISTS (
                SELECT 1 FROM account_restore_records arr
                WHERE arr.user_id = u.id
                  AND arr.issue_type = 'wallet_mismatch'
                  AND arr.affected_wallet = 'ad_view_wallet'
                  AND arr.restore_status != 'dismissed'
              )
        """)
    )
    for row in wallet_mismatch.mappings():
        issues.append({
            "user_id": row["user_id"],
            "issue_type": "wallet_mismatch",
            "task_type": "ad_view",
            "reference_id": None,
            "reference_type": None,
            "expected_amount": row["total_earned"],
            "actual_amount": row["ad_view_wallet"],
            "difference": row["difference"],
            "affected_wallet": "ad_view_wallet",
            "description": f"Ad view wallet balance ${row['ad_view_wallet']} differs from total earned ${row['total_earned']}",
            "task_date": None,
        })

    return issues


async def _detect_overpayment_from_wrong_investment(db: AsyncSession) -> list[dict]:
    """Detect users who earned at a higher rate because the code used the wrong investment.

    When a user has multiple active investments, the code picks the first one
    by ID (DESC). If a user has a Free Access investment (low rate) and a Pro
    investment (high rate), the Pro rate gets used for all tasks.
    """
    issues = []

    # Find users with multiple active investments with different rates
    result = await db.execute(
        text("""
            WITH user_rates AS (
                SELECT
                    inv.user_id,
                    inv.id as investment_id,
                    inv.package_name,
                    inv.earn_per_captcha as inv_rate,
                    pkg.task_type,
                    pkg.is_active,
                    ROW_NUMBER() OVER (PARTITION BY inv.user_id, pkg.task_type ORDER BY inv.id DESC) as rn
                FROM investments inv
                JOIN packages pkg ON pkg.name = inv.package_name
                WHERE inv.status = 'active'
            ),
            -- For each user+task_type, get the first (highest ID) and all rates
            user_task_rates AS (
                SELECT
                    user_id,
                    task_type,
                    MAX(CASE WHEN rn = 1 THEN inv_rate END) as code_uses_rate,
                    MIN(inv_rate) as min_rate,
                    COUNT(DISTINCT investment_id) as investment_count
                FROM user_rates
                WHERE is_active = true
                GROUP BY user_id, task_type
                HAVING COUNT(DISTINCT investment_id) > 1
            )
            SELECT
                utr.user_id,
                utr.task_type,
                utr.code_uses_rate,
                utr.min_rate,
                utr.investment_count
            FROM user_task_rates utr
            WHERE utr.code_uses_rate > utr.min_rate
        """)
    )

    for row in result.mappings():
        user_id = row["user_id"]
        task_type = row["task_type"]
        code_rate = row["code_uses_rate"]
        correct_rate = row["min_rate"]

        if task_type == "captcha":
            # Sum of earnings at the wrong rate
            earnings_result = await db.execute(
                text("""
                    SELECT COUNT(*) as cnt, COALESCE(SUM(amount_earned), 0) as total
                    FROM captcha_earnings
                    WHERE user_id = :uid AND is_correct = true
                      AND amount_earned = :wrong_rate
                """),
                {"uid": user_id, "wrong_rate": code_rate},
            )
            earn_data = earnings_result.mappings().first()
            if not earn_data or earn_data["cnt"] == 0:
                continue

            cnt = earn_data["cnt"]
            total_wrong = earn_data["total"]
            total_correct = Decimal(str(cnt)) * correct_rate
            overpayment = total_wrong - total_correct

            if overpayment > 0:
                # Check if already recorded
                existing = await db.execute(
                    select(func.count(AccountRestoreRecord.id)).where(
                        and_(
                            AccountRestoreRecord.user_id == user_id,
                            AccountRestoreRecord.issue_type == "incorrect_earning",
                            AccountRestoreRecord.task_type == "captcha",
                            AccountRestoreRecord.restore_status != "dismissed",
                        )
                    )
                )
                if (existing.scalar() or 0) == 0:
                    issues.append({
                        "user_id": user_id,
                        "issue_type": "incorrect_earning",
                        "task_type": "captcha",
                        "reference_id": None,
                        "reference_type": "investment_rate_mismatch",
                        "expected_amount": total_correct,
                        "actual_amount": total_wrong,
                        "difference": overpayment,
                        "affected_wallet": "captcha_wallet",
                        "description": f"Code used ${code_rate}/captcha (wrong investment) instead of ${correct_rate}/captcha. {cnt} captchas affected.",
                        "task_date": None,
                    })

        elif task_type == "ad_view":
            earnings_result = await db.execute(
                text("""
                    SELECT COUNT(*) as cnt, COALESCE(SUM(amount_earned), 0) as total
                    FROM ad_views
                    WHERE user_id = :uid AND is_completed = true
                      AND amount_earned = :wrong_rate
                """),
                {"uid": user_id, "wrong_rate": code_rate},
            )
            earn_data = earnings_result.mappings().first()
            if not earn_data or earn_data["cnt"] == 0:
                continue

            cnt = earn_data["cnt"]
            total_wrong = earn_data["total"]
            total_correct = Decimal(str(cnt)) * correct_rate
            overpayment = total_wrong - total_correct

            if overpayment > 0:
                existing = await db.execute(
                    select(func.count(AccountRestoreRecord.id)).where(
                        and_(
                            AccountRestoreRecord.user_id == user_id,
                            AccountRestoreRecord.issue_type == "incorrect_earning",
                            AccountRestoreRecord.task_type == "ad_view",
                            AccountRestoreRecord.restore_status != "dismissed",
                        )
                    )
                )
                if (existing.scalar() or 0) == 0:
                    issues.append({
                        "user_id": user_id,
                        "issue_type": "incorrect_earning",
                        "task_type": "ad_view",
                        "reference_id": None,
                        "reference_type": "investment_rate_mismatch",
                        "expected_amount": total_correct,
                        "actual_amount": total_wrong,
                        "difference": overpayment,
                        "affected_wallet": "ad_view_wallet",
                        "description": f"Code used ${code_rate}/ad view (wrong investment) instead of ${correct_rate}/ad view. {cnt} ad views affected.",
                        "task_date": None,
                    })

    return issues


# ── API Endpoints ─────────────────────────────────────────────────────────────


@router.get("/affected-accounts")
async def get_affected_accounts(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Detect all affected accounts from real production data.

    Runs live reconciliation against the database every time.
    Returns affected accounts with per-task breakdown.
    """
    await expire_stale_suspensions(db)

    # Run all reconciliation checks
    captcha_issues = await _reconcile_captcha_earnings(db)
    ad_issues = await _reconcile_ad_earnings(db)
    overpayment_issues = await _detect_overpayment_from_wrong_investment(db)

    all_issues = captcha_issues + ad_issues + overpayment_issues

    # Group by user
    user_map = {}
    for issue in all_issues:
        uid = issue["user_id"]
        if uid not in user_map:
            user_map[uid] = {
                "user_id": uid,
                "username": None,
                "email": None,
                "issues": [],
                "total_affected_amount": Decimal("0"),
                "issue_count": 0,
            }
        user_map[uid]["issues"].append(issue)
        user_map[uid]["total_affected_amount"] += abs(issue["difference"])
        user_map[uid]["issue_count"] += 1

    # Fetch user info
    if user_map:
        user_ids = list(user_map.keys())
        users_result = await db.execute(
            select(User.id, User.username, User.email, User.captcha_wallet, User.ad_view_wallet, User.account_status)
            .where(User.id.in_(user_ids))
        )
        for row in users_result.all():
            if row.id in user_map:
                user_map[row.id]["username"] = row.username
                user_map[row.id]["email"] = row.email
                user_map[row.id]["captcha_wallet"] = float(row.captcha_wallet or 0)
                user_map[row.id]["ad_view_wallet"] = float(row.ad_view_wallet or 0)
                user_map[row.id]["account_status"] = row.account_status

        # Check suspension status for each affected user
        for uid in user_ids:
            access = await check_task_access(db, uid)
            user_map[uid]["is_suspended"] = not access.get("allowed", True)
            user_map[uid]["access_status"] = access.get("status", "active")
            user_map[uid]["access_reason"] = access.get("reason")

            # Count active suspensions
            susp_result = await db.execute(
                select(func.count(AccountSuspension.id)).where(
                    and_(
                        AccountSuspension.user_id == uid,
                        AccountSuspension.status == "active",
                    )
                )
            )
            user_map[uid]["active_suspension_count"] = susp_result.scalar() or 0

    # Get existing restore records for these users
    if user_map:
        records_result = await db.execute(
            select(AccountRestoreRecord).where(
                AccountRestoreRecord.user_id.in_(list(user_map.keys()))
            )
        )
        for rec in records_result.scalars().all():
            uid = rec.user_id
            if uid in user_map:
                for issue in user_map[uid]["issues"]:
                    if (issue["reference_id"] == rec.reference_id and
                        issue["reference_type"] == rec.reference_type and
                        issue["issue_type"] == rec.issue_type):
                        issue["restore_record_id"] = rec.id
                        issue["restore_status"] = rec.restore_status
                        break

    # Sort by total affected amount descending
    users_list = sorted(user_map.values(), key=lambda x: x["total_affected_amount"], reverse=True)

    # Summary stats
    total_affected_users = len(users_list)
    total_affected_tasks = sum(u["issue_count"] for u in users_list)
    total_affected_amount = sum(float(u["total_affected_amount"]) for u in users_list)
    pending_count = sum(
        1 for u in users_list
        for i in u["issues"]
        if i.get("restore_status", "pending") == "pending"
    )

    return {
        "summary": {
            "total_affected_users": total_affected_users,
            "total_affected_tasks": total_affected_tasks,
            "total_affected_amount": round(total_affected_amount, 14),
            "pending_restore": pending_count,
        },
        "users": [
            {
                "user_id": u["user_id"],
                "username": u.get("username"),
                "email": u.get("email"),
                "captcha_wallet": u.get("captcha_wallet", 0),
                "ad_view_wallet": u.get("ad_view_wallet", 0),
                "account_status": u.get("account_status", "active"),
                "is_suspended": u.get("is_suspended", False),
                "access_status": u.get("access_status", "active"),
                "access_reason": u.get("access_reason"),
                "active_suspension_count": u.get("active_suspension_count", 0),
                "issue_count": u["issue_count"],
                "total_affected_amount": float(u["total_affected_amount"]),
                "issues": [
                    {
                        "restore_record_id": i.get("restore_record_id"),
                        "issue_type": i["issue_type"],
                        "task_type": i["task_type"],
                        "reference_id": i.get("reference_id"),
                        "reference_type": i.get("reference_type"),
                        "expected_amount": float(i["expected_amount"]),
                        "actual_amount": float(i["actual_amount"]),
                        "difference": float(i["difference"]),
                        "affected_wallet": i["affected_wallet"],
                        "description": i["description"],
                        "task_date": i.get("task_date"),
                        "restore_status": i.get("restore_status", "pending"),
                    }
                    for i in u["issues"]
                ],
            }
            for u in users_list
        ],
    }


@router.get("/affected-accounts/summary")
async def get_affected_summary(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Quick summary of affected accounts (lighter endpoint)."""
    result = await get_affected_accounts(db=db, admin=admin)
    return result["summary"]


@router.post("/execute-restore")
async def execute_restore(
    body: RestoreExecuteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Execute a restore action for a specific affected task.

    Credit/Debit difference to the affected wallet.
    Requires confirmed=true. Idempotent - cannot restore same record twice.
    """
    if not body.confirmed:
        raise HTTPException(400, detail="Confirmation required. Set confirmed=true to proceed.")

    record = await db.get(AccountRestoreRecord, body.record_id)
    if not record:
        raise HTTPException(404, detail="Restore record not found")

    if record.restore_status == "restored":
        raise HTTPException(400, detail="This record has already been restored.")
    if record.restore_status == "dismissed":
        raise HTTPException(400, detail="This record has been dismissed.")

    user = await db.get(User, record.user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    difference = Decimal(str(record.difference))
    if difference == 0:
        raise HTTPException(400, detail="No amount to restore (difference is zero).")

    # Apply the correction to the wallet
    wallet_field = record.affected_wallet
    current_balance = getattr(user, wallet_field, None)
    if current_balance is None:
        raise HTTPException(400, detail=f"Wallet field {wallet_field} not found on user.")

    if difference < 0:
        # Overpayment: debit the wallet (but don't go below zero)
        new_balance = max(Decimal("0"), current_balance + difference)
        actual_correction = new_balance - current_balance
    else:
        # Underpayment: credit the wallet
        new_balance = (current_balance + difference).quantize(WALLET_PRECISION, rounding=ROUND_HALF_UP)
        actual_correction = difference

    setattr(user, wallet_field, new_balance)

    # Update restore record
    record.restore_status = "restored"
    record.restored_amount = actual_correction
    record.restored_at = datetime.now(timezone.utc)
    record.restored_by = admin.id
    record.restore_notes = body.reason or f"Restored {wallet_field} by ${actual_correction}"

    # Audit log
    log = AdminAuditLog(
        admin_id=admin.id,
        action="execute_account_restore",
        target_user_id=record.user_id,
        details=f"Restore record #{record.id}: {record.issue_type} on {record.task_type}. "
                f"Wallet: {wallet_field}. Correction: ${actual_correction}. Reason: {body.reason or 'N/A'}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type="admin_account_restore",
        user_id=record.user_id,
        email=user.email,
        ip_address=request.client.host if request.client else None,
        device=(request.headers.get("user-agent", "") or "")[:255],
        details=f"Account restored by admin {admin.full_name}. Record #{record.id}: {record.issue_type}. "
                f"Wallet: {wallet_field}. Correction: ${actual_correction}. Reason: {body.reason or 'N/A'}",
    )

    await db.commit()

    return {
        "success": True,
        "record_id": record.id,
        "user_id": record.user_id,
        "wallet": wallet_field,
        "correction": float(actual_correction),
        "new_balance": float(new_balance),
    }


@router.post("/dismiss")
async def dismiss_record(
    body: DismissRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Dismiss an affected account record (mark as false positive)."""
    record = await db.get(AccountRestoreRecord, body.record_id)
    if not record:
        raise HTTPException(404, detail="Restore record not found")

    if record.restore_status == "restored":
        raise HTTPException(400, detail="Cannot dismiss a restored record.")

    record.restore_status = "dismissed"
    record.restore_notes = body.reason or "Dismissed by admin"

    log = AdminAuditLog(
        admin_id=admin.id,
        action="dismiss_account_restore",
        target_user_id=record.user_id,
        details=f"Dismissed restore record #{record.id}: {record.issue_type}. Reason: {body.reason or 'N/A'}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    await db.commit()

    return {"success": True, "record_id": record.id}


@router.get("/audit-log")
async def get_restore_audit_log(
    user_id: int = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """View audit log of restore actions."""
    conditions = [
        AdminAuditLog.action.in_(["execute_account_restore", "dismiss_account_restore"]),
    ]
    if user_id:
        conditions.append(AdminAuditLog.target_user_id == user_id)

    from sqlalchemy import and_
    count_result = await db.execute(
        select(func.count(AdminAuditLog.id)).where(and_(*conditions))
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(AdminAuditLog)
        .where(and_(*conditions))
        .order_by(AdminAuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    logs = result.scalars().all()

    admin_ids = list(set(l.admin_id for l in logs))
    admin_map = {}
    if admin_ids:
        admins_result = await db.execute(
            select(User.id, User.full_name, User.email).where(User.id.in_(admin_ids))
        )
        for row in admins_result.all():
            admin_map[row.id] = {"full_name": row.full_name, "email": row.email}

    target_ids = list(set(l.target_user_id for l in logs if l.target_user_id))
    target_map = {}
    if target_ids:
        targets_result = await db.execute(
            select(User.id, User.username, User.email).where(User.id.in_(target_ids))
        )
        for row in targets_result.all():
            target_map[row.id] = {"username": row.username, "email": row.email}

    return {
        "total": total,
        "data": [
            {
                "id": l.id,
                "admin_id": l.admin_id,
                "admin_name": admin_map.get(l.admin_id, {}).get("full_name"),
                "action": l.action,
                "target_user_id": l.target_user_id,
                "target_username": target_map.get(l.target_user_id, {}).get("username"),
                "details": l.details,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ],
    }


# ── Suspension Management ──────────────────────────────────────────────────────


class LiftSuspensionRequest(BaseModel):
    user_id: int
    reason: str = ""


@router.post("/lift-suspension")
async def lift_suspension_from_restore(
    body: LiftSuspensionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Lift all active suspensions for a user and restore account status.

    Callable from the Account Restore section to ensure suspended users
    in the affected-accounts list are properly unsuspended.
    """
    await expire_stale_suspensions(db)

    user = await db.get(User, body.user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    now = datetime.now(timezone.utc)

    result = await db.execute(
        update(AccountSuspension)
        .where(and_(
            AccountSuspension.user_id == body.user_id,
            AccountSuspension.status == "active",
        ))
        .values(status="expired", lifted_at=now)
    )
    lifted_count = result.rowcount

    if user.account_status == "on_hold":
        user.account_status = "active"
        user.account_issue = None

    log = AdminAuditLog(
        admin_id=admin.id,
        action="lift_suspension",
        target_user_id=body.user_id,
        details=f"Lifted {lifted_count} active suspension(s). Reason: {body.reason or 'Admin restore action'}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type="admin_restore_lift_suspension",
        user_id=body.user_id,
        email=user.email,
        ip_address=request.client.host if request.client else None,
        device=(request.headers.get("user-agent", "") or "")[:255],
        details=f"Suspension lifted by admin {admin.full_name}. Lifted {lifted_count} suspension(s). Reason: {body.reason or 'N/A'}",
    )

    await db.commit()

    return {
        "success": True,
        "user_id": body.user_id,
        "lifted_count": lifted_count,
        "account_status": user.account_status,
    }


# ── Legacy endpoints (preserved for backward compatibility) ────────────────────


@router.get("/user/{user_id}")
async def get_restore_status(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Get comprehensive user status for restore evaluation."""
    await expire_stale_suspensions(db)

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    active_suspensions_result = await db.execute(
        select(AccountSuspension).where(
            and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
            )
        ).order_by(AccountSuspension.suspended_at.desc())
    )
    active_suspensions = active_suspensions_result.scalars().all()

    active_restrictions_result = await db.execute(
        select(UserRestriction).where(
            and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
            )
        ).order_by(UserRestriction.created_at.desc())
    )
    active_restrictions = active_restrictions_result.scalars().all()

    active_warnings_result = await db.execute(
        select(UserWarning).where(
            and_(
                UserWarning.user_id == user_id,
                UserWarning.is_active == True,
            )
        ).order_by(UserWarning.created_at.desc())
    )
    active_warnings = active_warnings_result.scalars().all()

    is_blocked = user.blocked_at is not None
    is_suspended = len(active_suspensions) > 0
    is_restricted = len(active_restrictions) > 0
    is_warned = len(active_warnings) > 0
    is_on_hold = (user.account_status or "").lower() == "on_hold"

    restorable_actions = []
    if is_suspended:
        restorable_actions.append("lift_suspension")
    if is_restricted:
        restorable_actions.append("lift_restriction")
    if is_warned:
        restorable_actions.append("dismiss_warnings")
    if is_blocked:
        restorable_actions.append("unblock_login")
    if is_on_hold and not is_suspended:
        restorable_actions.append("restore_account_status")
    if len(restorable_actions) > 1:
        restorable_actions.append("full_restore")

    return {
        "user": {
            "id": user.id,
            "user_no": user.user_no,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "account_status": user.account_status,
            "account_issue": user.account_issue,
            "email_verified": user.email_verified,
            "is_blocked": is_blocked,
            "blocked_at": user.blocked_at.isoformat() if user.blocked_at else None,
            "blocked_reason": user.blocked_reason,
        },
        "active_suspensions": [
            {
                "id": s.id,
                "suspension_type": s.suspension_type,
                "reason": s.reason,
                "status": s.status,
                "duration_hours": s.duration_hours,
                "suspended_at": s.suspended_at.isoformat(),
                "expires_at": s.expires_at.isoformat() if s.expires_at else None,
                "suspended_by": s.suspended_by,
            }
            for s in active_suspensions
        ],
        "active_restrictions": [
            {
                "id": r.id,
                "restriction_type": r.restriction_type,
                "reason": r.reason,
                "is_active": r.is_active,
                "expires_at": r.expires_at.isoformat() if r.expires_at else None,
                "issued_by": r.issued_by,
            }
            for r in active_restrictions
        ],
        "active_warnings": [
            {
                "id": w.id,
                "warning_type": w.warning_type,
                "reason": w.reason,
                "is_active": w.is_active,
                "issued_by": w.issued_by,
            }
            for w in active_warnings
        ],
        "restorable_actions": restorable_actions,
        "is_affected": len(restorable_actions) > 0,
    }


class RestoreActionRequest(BaseModel):
    action: str
    reason: str = ""
    confirmed: bool = False


@router.post("/user/{user_id}")
async def execute_restore_action(
    user_id: int,
    body: RestoreActionRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Execute a restore action on a user account."""
    if not body.confirmed:
        raise HTTPException(400, detail="Confirmation required. Set confirmed=true to proceed.")

    valid_actions = {
        "lift_suspension", "lift_restriction", "dismiss_warnings",
        "unblock_login", "restore_account_status", "full_restore",
    }
    if body.action not in valid_actions:
        raise HTTPException(400, detail=f"Invalid action. Must be one of: {', '.join(sorted(valid_actions))}")

    await expire_stale_suspensions(db)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail="User not found")

    now = datetime.now(timezone.utc)
    changes = []

    if body.action in ("lift_suspension", "full_restore", "restore_account_status"):
        from sqlalchemy import update
        result = await db.execute(
            update(AccountSuspension)
            .where(and_(
                AccountSuspension.user_id == user_id,
                AccountSuspension.status == "active",
            ))
            .values(status="expired", lifted_at=now)
        )
        if result.rowcount > 0:
            changes.append(f"Lifted {result.rowcount} active suspension(s)")
        if user.account_status == "on_hold":
            user.account_status = "active"
            user.account_issue = None
            changes.append("Restored account status from on_hold to active")

    if body.action in ("lift_restriction", "full_restore"):
        from sqlalchemy import update
        result = await db.execute(
            update(UserRestriction)
            .where(and_(
                UserRestriction.user_id == user_id,
                UserRestriction.is_active == True,
            ))
            .values(is_active=False)
        )
        if result.rowcount > 0:
            changes.append(f"Deactivated {result.rowcount} active restriction(s)")

    if body.action in ("dismiss_warnings", "full_restore"):
        from sqlalchemy import update
        result = await db.execute(
            update(UserWarning)
            .where(and_(
                UserWarning.user_id == user_id,
                UserWarning.is_active == True,
            ))
            .values(is_active=False)
        )
        if result.rowcount > 0:
            changes.append(f"Dismissed {result.rowcount} active warning(s)")

    if body.action in ("unblock_login", "full_restore"):
        if user.blocked_at:
            user.failed_attempts = 0
            user.blocked_at = None
            user.blocked_reason = None
            changes.append("Removed login block")

    if not changes:
        raise HTTPException(400, detail="No restorable issues found for this user.")

    log = AdminAuditLog(
        admin_id=admin.id,
        action=f"restore_{body.action}",
        target_user_id=user_id,
        details=f"Action: {body.action}. Changes: {'; '.join(changes)}. Reason: {body.reason or 'No reason provided'}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    sec_logger = SecurityLogger(db)
    await sec_logger.log(
        event_type=f"admin_restore_{body.action}",
        user_id=user_id,
        email=user.email,
        ip_address=request.client.host if request.client else None,
        device=(request.headers.get("user-agent", "") or "")[:255],
        details=f"Restored by admin {admin.full_name}. Action: {body.action}. Reason: {body.reason or 'N/A'}",
    )

    await db.commit()

    return {"success": True, "action": body.action, "changes": changes, "user_id": user_id}
