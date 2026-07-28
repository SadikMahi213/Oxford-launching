"""Email sending utilities.

Currently logs emails to console. When SMTP/email queue is deployed,
replace with actual email sending implementation.
"""

import logging

logger = logging.getLogger(__name__)


async def send_password_reset_email(email: str, body: str) -> None:
    logger.info("Password reset email to %s: %s", email, body[:100])


async def send_email_verification(email: str, otp_code: str, full_name: str) -> None:
    logger.info("Verification email to %s (OTP: %s)", email, otp_code)
