import asyncio
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, email: str, reset_link: str):
    from app.utils.email import send_password_reset_email
    from pydantic import EmailStr

    async def _run():
        await send_password_reset_email(EmailStr(email), reset_link)

    try:
        asyncio.run(_run())
        logger.info("Password reset email sent to %s", email)
    except Exception as exc:
        logger.exception("Failed to send password reset email to %s", email)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_verification_task(
    self,
    email: str,
    otp_code: str,
    user_name: str | None = None,
    expires_minutes: int = 10,
):
    from app.utils.email import send_email_verification
    from pydantic import EmailStr

    async def _run():
        await send_email_verification(EmailStr(email), otp_code, user_name, expires_minutes)

    try:
        asyncio.run(_run())
        logger.info("Verification email sent to %s", email)
    except Exception as exc:
        logger.exception("Failed to send verification email to %s", email)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_deposit_success_email_task(
    self,
    userid: int,
    amount: str,
    currency: str,
    tx_hash: str | None = None,
):
    from app.utils.email import send_deposit_success_email

    async def _run():
        await send_deposit_success_email(userid, amount, currency, tx_hash)

    try:
        asyncio.run(_run())
        logger.info("Deposit success email sent to userid=%s", userid)
    except Exception as exc:
        logger.exception("Failed to send deposit email to userid=%s", userid)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_withdraw_success_email_task(
    self,
    userid: int,
    amount: str,
    currency: str,
    wallet_address: str,
    tx_hash: str | None = None,
):
    from app.utils.email import send_withdraw_success_email

    async def _run():
        await send_withdraw_success_email(userid, amount, currency, wallet_address, tx_hash)

    try:
        asyncio.run(_run())
        logger.info("Withdrawal success email sent to userid=%s", userid)
    except Exception as exc:
        logger.exception("Failed to send withdrawal email to userid=%s", userid)
        raise self.retry(exc=exc)
