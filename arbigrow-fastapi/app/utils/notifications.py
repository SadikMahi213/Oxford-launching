from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.notification_service import NotificationService


_NOTIFICATION_TEMPLATES = {
    "new_registration": {"title": "New Registration", "priority": "normal"},
    "login": {"title": "User Login", "priority": "low"},
    "logout": {"title": "User Logout", "priority": "low"},
    "password_change": {"title": "Password Changed", "priority": "high"},
    "failed_login": {"title": "Failed Login Attempt", "priority": "high"},
    "deposit_request": {"title": "Deposit Request", "priority": "high"},
    "deposit_approved": {"title": "Deposit Approved", "priority": "normal"},
    "deposit_rejected": {"title": "Deposit Rejected", "priority": "high"},
    "withdrawal_request": {"title": "Withdrawal Request", "priority": "high"},
    "withdrawal_approved": {"title": "Withdrawal Approved", "priority": "normal"},
    "withdrawal_rejected": {"title": "Withdrawal Rejected", "priority": "high"},
    "kyc_submitted": {"title": "KYC Submitted", "priority": "high"},
    "kyc_approved": {"title": "KYC Approved", "priority": "normal"},
    "kyc_rejected": {"title": "KYC Rejected", "priority": "high"},
    "package_purchased": {"title": "Package Purchased", "priority": "normal"},
    "wallet_updated": {"title": "Wallet Updated", "priority": "critical"},
    "user_deleted": {"title": "User Deleted", "priority": "critical"},
    "profit_credited": {"title": "Profit Credited", "priority": "normal"},
    "mining_claimed": {"title": "Mining Claimed", "priority": "low"},
    "wallet_transfer": {"title": "Wallet Transfer", "priority": "normal"},
    "send_funds": {"title": "Funds Sent", "priority": "normal"},
    "ofa_converted": {"title": "OFA Converted", "priority": "normal"},
    "profile_updated": {"title": "Profile Updated", "priority": "low"},
    "ad_completed": {"title": "Ad Completed", "priority": "low"},
    "captcha_completed": {"title": "Captcha Completed", "priority": "low"},
    "seller_registered": {"title": "Seller Registered", "priority": "high"},
    "seller_approved": {"title": "Seller Approved", "priority": "normal"},
    "seller_rejected": {"title": "Seller Rejected", "priority": "normal"},
    "order_created": {"title": "Order Created", "priority": "normal"},
    "order_completed": {"title": "Order Completed", "priority": "normal"},
    "order_cancelled": {"title": "Order Cancelled", "priority": "normal"},
    "investment_completed": {"title": "Investment Completed", "priority": "normal"},
    "referral_commission": {"title": "Referral Commission", "priority": "low"},
    "account_blocked": {"title": "Account Blocked", "priority": "critical"},
    "account_unblocked": {"title": "Account Unblocked", "priority": "high"},
}


async def notify_admin(
    db: AsyncSession,
    type: str,
    message: str,
    user_id: int | None = None,
    request: Request | None = None,
    metadata_dict: dict | None = None,
):
    template = _NOTIFICATION_TEMPLATES.get(type)
    if not template:
        return

    ip_address = None
    device = None
    if request:
        ip_address = request.client.host if request.client else None
        if request.headers.get("x-forwarded-for"):
            ip_address = request.headers["x-forwarded-for"].split(",")[0].strip()
        device = request.headers.get("user-agent", "")[:255] if request.headers.get("user-agent") else None

    service = NotificationService(db)
    await service.create_notification(
        type=type,
        title=template["title"],
        message=message,
        priority=template["priority"],
        user_id=user_id,
        ip_address=ip_address,
        device=device,
        metadata_dict=metadata_dict,
    )
