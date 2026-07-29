from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.referral import get_referral_level_rates
from app.models.deposit import Deposit
from app.models.user import User
from app.models.package import Package
from app.models.investments import Investment
from app.models.kyc import KYC, KYCStatus
from app.models.referral_profit_history import ReferralProfitHistory
from app.models.system_config import SystemConfig
from app.schemas.deposit import DepositCreate, DepositStatusUpdate
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.tasks.email_tasks import send_deposit_success_email_task
from app.services.invoice_service import generate_deposit_invoice
from app.utils.notifications import notify_admin

router = APIRouter(prefix="/deposits", tags=["Deposits"])


# User Create Deposit Request

@router.post("/")
async def create_deposit_request(
    data: DepositCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    # check duplicate TXID
    result = await db.execute(
        select(Deposit).where(Deposit.txid == data.txid)
    )

    existing_tx = result.scalar_one_or_none()

    if existing_tx:
        raise HTTPException(
            status_code=400,
            detail="This transaction hash has already been submitted"
        )

    config_result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "min_deposit_amount")
    )
    min_deposit_row = config_result.scalar_one_or_none()
    min_deposit_amount = Decimal(min_deposit_row.value) if min_deposit_row else Decimal("10")

    if data.amount < min_deposit_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum deposit amount is {min_deposit_amount} USDT"
        )

    deposit = Deposit(
        user_id=current_user.id,
        network_name=data.network_name,
        amount=data.amount,
        txid=data.txid,
    )

    db.add(deposit)

    await db.commit()
    await db.refresh(deposit)

    await notify_admin(
        db=db, type="deposit_request",
        message=f"User {current_user.full_name} requested deposit of {deposit.amount} USDT via {deposit.network_name}",
        user_id=current_user.id, request=request,
    )

    return {
        "message": "Deposit request submitted successfully",
        "data": deposit
    }


@router.get("/my")
async def get_my_deposits(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    offset = (page - 1) * limit

    total_result = await db.execute(
        select(func.count(Deposit.id)).where(Deposit.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    result = await db.execute(
        select(Deposit)
        .where(Deposit.user_id == current_user.id)
        .order_by(Deposit.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    deposits = result.scalars().all()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "data": deposits
    }


@router.get("/admin")
async def get_admin_deposits(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):

    base_query = select(Deposit)

    if status:
        base_query = base_query.where(Deposit.status == status.lower())

    total_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = total_result.scalar() or 0

    total_pages = (total + limit - 1) // limit if total > 0 else 1

    query = (
        base_query
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    result = await db.execute(query)

    deposits = result.scalars().all()

    data = []

    for d in deposits:
        data.append({
            "id": d.id,
            "amount": float(d.amount),
            "network": d.network_name,
            "txid": d.txid,
            "status": d.status,
            "date": d.created_at,
            "user": {
                "name": d.user.full_name,
                "email": d.user.email
            }
        })

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "total_pages": total_pages,
        "data": data
    }


@router.patch("/{deposit_id}")
async def update_deposit_status(
    deposit_id: int,
    data: DepositStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user)
):

    result = await db.execute(
        select(Deposit).where(Deposit.id == deposit_id)
    )

    deposit = result.scalar_one_or_none()

    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")

    # Prevent double approval
    if deposit.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="Deposit already processed"
        )

    # Update deposit status
    deposit.status = data.status

    # If approved → credit wallets
    if data.status == "approved":

        user_result = await db.execute(
            select(User).where(User.id == deposit.user_id)
        )

        user = user_result.scalar_one()

        amount = Decimal(deposit.amount)
        balance_before = float(user.deposit_wallet)
        main_wallet_before = float(user.main_wallet or 0)

        user.deposit_wallet += amount

        # Distribute direct referral and generation bonuses on deposit (flat rates)
        wprec = Decimal("0.00000000000001")
        rates = await get_referral_level_rates(db)
        # Build parent ancestry chain dynamically from configured levels.
        # This adapts automatically when new levels (e.g. commission_l6) are added.
        parent_ids: list[int | None] = []
        for lvl in range(1, len(rates) + 1):
            ancestor_id = getattr(user, f"parent_lvl_{lvl}_id", None)
            parent_ids.append(ancestor_id)
        parent_rows = await db.execute(
            select(User).where(User.id.in_([p for p in parent_ids if p]))
        )
        parents_map = {p.id: p for p in parent_rows.scalars().all()}
        for level_idx, pid in enumerate(parent_ids):
            if not pid:
                continue
            parent = parents_map.get(pid)
            if not parent:
                continue
            rate = rates[level_idx + 1]
            bonus = (amount * Decimal(str(rate)) / Decimal("100")).quantize(wprec, rounding=ROUND_HALF_UP)
            if bonus <= 0:
                continue
            if level_idx == 0:
                parent.referral_wallet += bonus
            else:
                parent.generation_wallet += bonus
            db.add(ReferralProfitHistory(
                source_user_id=deposit.user_id,
                receiver_user_id=pid,
                deposit_id=deposit.id,
                level=level_idx + 1,
                percentage=Decimal(str(rate)),
                amount=bonus,
                type="deposit_referral" if level_idx == 0 else "deposit_generation",
            ))

        # Commit deposit + wallet + referral bonuses first so rank evaluation
        # can read the committed deposit in get_team_volume().
        await db.commit()
        await db.refresh(deposit)
        await db.refresh(user)

        # Trigger rank evaluation for the deposit user
        from app.services.rank_service import evaluate_and_process_rank
        await evaluate_and_process_rank(
            user_id=deposit.user_id,
            db=db,
            source_user_id=deposit.user_id,
            reference_id=deposit.id,
            reference_type="deposit",
        )

        # Also trigger rank evaluation for ALL ancestors up the parent_lvl_1_id chain
        next_id = user.parent_lvl_1_id
        while next_id:
            await evaluate_and_process_rank(
                user_id=next_id,
                db=db,
                source_user_id=deposit.user_id,
                reference_id=deposit.id,
                reference_type="deposit",
            )
            # Walk up the chain
            par = await db.get(User, next_id)
            next_id = par.parent_lvl_1_id if par else None

        await db.commit()
        await db.refresh(user)

        # If user has a pending package, activate them
        if user.pending_package_id:
            pkg = await db.get(Package, user.pending_package_id)
            if pkg and user.deposit_wallet >= pkg.investment_amount:
                now = datetime.now(timezone.utc)
                user.deposit_wallet -= pkg.investment_amount
                investment = Investment(
                    user_id=user.id,
                    package_name=pkg.name,
                    invested_amount=pkg.investment_amount,
                    roi_percent=Decimal("0"),
                    expected_profit=Decimal("0"),
                    daily_payment=pkg.daily_payment,
                    captcha_required_per_day=pkg.captcha_required_per_day,
                    earn_per_captcha=pkg.earn_per_captcha,
                    daily_captcha_limit=pkg.daily_captcha_limit,
                    captchas_typed_today=0,
                    start_date=now,
                    end_date=now,
                    status="active",
                )
                db.add(investment)
                user.account_status = "active"
                user.pending_package_id = None
                await db.commit()

    notif_type = "deposit_approved" if data.status == "approved" else "deposit_rejected"
    await notify_admin(
        db=db, type=notif_type,
        message=f"Deposit #{deposit.id} of {deposit.amount} USDT by user #{deposit.user_id} was {data.status} by admin",
        user_id=deposit.user_id, request=request,
    )

    if data.status == "approved":
        try:
            send_deposit_success_email_task.delay(
                userid=deposit.user_id,
                amount=f"{Decimal(str(deposit.amount)):.2f}",
                currency="USDT",
                tx_hash=deposit.txid,
            )
        except Exception as mail_error:
            print(f"[warn] Failed to enqueue deposit approval email: {mail_error}")

        # Save values before invoice generation to avoid lazy-load after commit/rollback
        _deposit_id = deposit.id
        _deposit_status = deposit.status

        # Auto-generate deposit invoice (in a savepoint so failure doesn't expire the session)
        try:
            await generate_deposit_invoice(
                db=db,
                user=user,
                deposit=deposit,
                tx_data={
                    "network": deposit.network_name,
                    "transaction_hash": deposit.txid,
                    "previous_balance": balance_before,
                    "current_balance": balance_before + float(deposit.amount),
                    "main_wallet_balance": float(user.main_wallet or 0),
                    "wallet_name": "Deposit Wallet",
                    "wallet_balance": float(user.deposit_wallet or 0),
                },
            )
            await db.commit()
        except Exception as inv_error:
            print(f"[warn] Failed to generate deposit invoice: {inv_error}")
            # No rollback here — the deposit approval is already committed above.
            # Rolling back would expire ORM objects and cause MissingGreenlet on return.

    return {
        "message": f"Deposit {_deposit_status}",
        "data": {
            "deposit_id": _deposit_id,
            "status": _deposit_status
        }
    }
