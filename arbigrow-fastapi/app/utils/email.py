from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from fastapi_mail.schemas import MultipartSubtypeEnum
from app.core.config import settings
from pydantic import EmailStr
from html import escape
from pathlib import Path

from datetime import datetime
from app.utils.email_header import get_email_header
from app.utils.email_footer import get_email_footer
from app.models.user import User
from app.core.database import AsyncSessionLocal


conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
)


# async def send_password_reset_email(email: EmailStr, reset_link: str):

#     company_name = "Oxford Financial Ads"
#     website_url = settings.FRONTEND_DOMAIN
#     year = datetime.now().year

#     header = get_email_header()
#     footer = get_email_footer(company_name, year, website_url)

#     html_content = f"""
#                     <!DOCTYPE html>
#                     <html>
#                     <head>
#                     <meta charset="UTF-8">
#                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
#                     <title>Reset Password</title>

#                     <style>
#                         /* Mobile Styles */
#                         @media only screen and (max-width: 600px) {{
#                             .container {{
#                                 width: 100% !important;
#                                 padding: 20px !important;
#                             }}

#                             .content-box {{
#                                 padding: 25px !important;
#                                 border-radius: 0 !important;
#                             }}

#                             .btn {{
#                                 display: block !important;
#                                 width: 100% !important;
#                                 box-sizing: border-box;
#                             }}

#                             .mobile-center {{
#                                 text-align: center !important;
#                             }}

#                             .logo img {{
#                                 width: 120px !important;
#                             }}
#                         }}
#                     </style>
#                     </head>

#                     <body style="margin:0; padding:0; background-color:#f8fafc; font-family:Arial, sans-serif;">

#                         <!-- WRAPPER -->
#                         <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
#                             <tr>
#                                 <td align="center">

#                                     {header}

#                                     <!-- MAIN CONTAINER -->
#                                     <table class="container" width="600" cellpadding="0" cellspacing="0" border="0"
#                                         style="width:600px; max-width:600px; margin:0 auto;">

#                                         <tr>
#                                             <td align="center" style="padding:20px;">

#                                                 <!-- CONTENT BOX -->
#                                                 <table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0"
#                                                     style="
#                                                         background-color:#ffffff;
#                                                         border-radius:12px;
#                                                         padding:40px;
#                                                         border:1px solid #e2e8f0;
#                                                     ">

#                                                     <tr>
#                                                         <td align="center" style="padding-bottom:20px;">
#                                                             <h2 style="margin:0; color:#0f172a; font-size:24px;">
#                                                                 Reset Your Password
#                                                             </h2>
#                                                         </td>
#                                                     </tr>

#                                                     <tr>
#                                                         <td style="font-size:15px; line-height:1.7; color:#475569; padding-bottom:25px;">
#                                                             We received a request to reset your password.
#                                                             Click the button below to securely create a new one.
#                                                         </td>
#                                                     </tr>

#                                                     <tr>
#                                                         <td align="center" style="padding-bottom:30px;">
#                                                             <a href="{reset_link}"
#                                                             class="btn"
#                                                             style="
#                                                                 display:inline-block;
#                                                                 padding:14px 28px;
#                                                                 background-color:#2563eb;
#                                                                 color:#ffffff;
#                                                                 text-decoration:none;
#                                                                 font-weight:bold;
#                                                                 border-radius:8px;
#                                                                 font-size:15px;
#                                                             ">
#                                                             Reset Password
#                                                             </a>
#                                                         </td>
#                                                     </tr>

#                                                     <tr>
#                                                         <td style="font-size:13px; color:#64748b; line-height:1.6;">
#                                                             This link will expire in <strong>15 minutes</strong> for security reasons.
#                                                             <br><br>
#                                                             If you did not request this, you can safely ignore this email.
#                                                         </td>
#                                                     </tr>

#                                                 </table>

#                                             </td>
#                                         </tr>

#                                     </table>

#                                     {footer}

#                                 </td>
#                             </tr>
#                         </table>

#                     </body>
#                     </html>
#                     """
#     message = MessageSchema(
#         subject="Reset Your Password",
#         recipients=[email],
#         body=html_content,
#         subtype="html"
#     )

#     fm = FastMail(conf)
#     await fm.send_message(message)
async def send_password_reset_email(email: EmailStr, reset_link: str):

    company_name = "Oxford Financial Ads"
    website_url = settings.FRONTEND_DOMAIN
    year = datetime.now().year

    header = get_email_header()
    footer = get_email_footer(company_name, year, website_url)

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>

    <style>
        @media only screen and (max-width: 600px) {{
            .container {{
                width: 100% !important;
                padding: 12px !important;
            }}

            .content-box {{
                padding: 24px !important;
                border-radius: 10px !important;
            }}

            .hero-title {{
                font-size: 24px !important;
            }}
        }}
    </style>
    </head>

    <body style="margin:0; padding:0; background-color:#eef4ff; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background-color:#eef4ff; background-image:linear-gradient(180deg,#f7fbff 0%,#e9f2ff 100%);">

            <tr>
                <td align="center">

                    {header}

                    <table class="container" width="600" cellpadding="0" cellspacing="0" border="0"
                        style="width:600px; max-width:600px; margin:0 auto;">

                        <tr>
                            <td align="center" style="padding:10px 20px 20px 20px;">

                                <table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0"
                                    style="background-color:rgba(255,255,255,0.62);
                                    border-radius:16px;
                                    padding:34px;
                                    border:1px solid #7dd3fc;
                                    box-shadow:0 0 0 1px rgba(56,189,248,0.35), 0 12px 32px rgba(14,116,144,0.22);">

                                    <tr>
                                        <td style="padding-bottom:20px;">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="border-radius:12px; overflow:hidden;
                                                background-image:linear-gradient(135deg,#051128 0%,#0f2f5a 62%,#0b5f8e 100%);
                                                border:1px solid #38bdf8;">
                                                <tr>
                                                    <td style="padding:26px 24px;">
                                                        <p style="margin:0 0 10px 0; color:#67e8f9; font-size:12px;
                                                        font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                                            Security Notice
                                                        </p>
                                                        <h2 class="hero-title"
                                                            style="margin:0; color:#ffffff; font-size:28px;">
                                                            Reset Your Password
                                                        </h2>
                                                        <p style="margin:10px 0 0 0; color:#e2e8f0; font-size:14px;">
                                                            Secure your Oxford Financial Ads account with a new password.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="font-size:15px; line-height:1.8; color:#1e293b;">
                                            <p style="margin:0 0 16px 0;">
                                                We received a request to reset your password.
                                            </p>

                                            <p style="margin:0 0 16px 0;">
                                                Click the secure button below to create a new password and regain
                                                access to your account.
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding:20px 0 28px 0;">
                                            <a href="{reset_link}"
                                                style="
                                                display:inline-block;
                                                padding:14px 30px;
                                                background:#2563eb;
                                                color:#ffffff;
                                                font-weight:bold;
                                                border-radius:8px;
                                                text-decoration:none;
                                                font-size:15px;">
                                                Reset Password
                                            </a>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="font-size:14px; color:#334155; line-height:1.8;">
                                            <p style="margin:0 0 10px 0;">
                                                This link will expire in <strong>15 minutes</strong> for security reasons.
                                            </p>

                                            <p style="margin:0;">
                                                If you did not request this password reset, you can safely ignore
                                                this email. Your account will remain secure.
                                            </p>
                                        </td>
                                    </tr>

                                </table>

                            </td>
                        </tr>

                    </table>

                    {footer}

                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Oxford Financial Ads Security - Reset Your Password",
        recipients=[email],
        body=html_content,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_email_verification(
    email: EmailStr,
    otp_code: str,
    user_name: str | None = None,
    expires_minutes: int = 10
):

    company_name = "Oxford Financial Ads"
    website_url = settings.FRONTEND_DOMAIN
    year = datetime.now().year

    logo_path = (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "email"
        / "arbigrow-logo-email.png"
    )
    logo_src = "https://i.ibb.co/J1v8jYk/Arbigrow-Logo.png"
    attachments = []
    multipart_subtype = MultipartSubtypeEnum.mixed

    if logo_path.exists():
        logo_src = "cid:arbigrow_logo"
        attachments = [
            {
                "file": str(logo_path),
                "mime_type": "image",
                "mime_subtype": "png",
                "headers": {
                    "Content-ID": "<arbigrow_logo>",
                    "Content-Disposition": "inline; filename=arbigrow-logo-email.png",
                },
            }
        ]
        multipart_subtype = MultipartSubtypeEnum.related

    header = get_email_header(logo_src=logo_src)
    footer = get_email_footer(company_name, year, website_url)

    safe_user_name = "User"
    if user_name and user_name.strip():
        safe_user_name = escape(user_name.strip())

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Oxford Financial Ads</title>

    <style>
        @media only screen and (max-width: 600px) {{
            .container {{
                width: 100% !important;
                padding: 12px !important;
            }}

            .content-box {{
                padding: 24px !important;
                border-radius: 10px !important;
            }}

            .hero-title {{
                font-size: 24px !important;
            }}

            .otp-box {{
                font-size: 28px !important;
                letter-spacing: 6px !important;
            }}
        }}
    </style>
    </head>

    <body style="margin:0; padding:0; background-color:#eef4ff; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef4ff; background-image:linear-gradient(180deg,#f7fbff 0%,#e9f2ff 100%);">
            <tr>
                <td align="center">
                    {header}

                    <table class="container" width="600" cellpadding="0" cellspacing="0" border="0"
                        style="width:600px; max-width:600px; margin:0 auto;">
                        <tr>
                            <td align="center" style="padding:10px 20px 20px 20px;">
                                <table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0"
                                    style="background-color:#ffffff; background-color:rgba(255,255,255,0.62); border-radius:16px; padding:34px; border:1px solid #7dd3fc; box-shadow:0 0 0 1px rgba(56,189,248,0.35), 0 12px 32px rgba(14,116,144,0.22);">
                                    <tr>
                                        <td style="padding-bottom:20px;">
                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="border-radius:12px; overflow:hidden; background:#051128; background-image:linear-gradient(135deg,#051128 0%,#0f2f5a 62%,#0b5f8e 100%); border:1px solid #38bdf8;">
                                                <tr>
                                                    <td style="padding:26px 24px;">
                                                        <p style="margin:0 0 10px 0; color:#67e8f9; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                                                            Email Verification
                                                        </p>
                                                        <h2 class="hero-title" style="margin:0; color:#ffffff; font-size:28px; line-height:1.25;">
                                                            Welcome to Oxford Financial Ads
                                                        </h2>
                                                        <p style="margin:10px 0 0 0; color:#e2e8f0; font-size:14px; line-height:1.6;">
                                                            Secure your account and unlock AI-powered arbitrage on Arbitrum.
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="font-size:15px; line-height:1.8; color:#1e293b;">
                                            <p style="margin:0 0 16px 0;">Hello {safe_user_name},</p>
                                            <p style="margin:0 0 16px 0;">
                                                Welcome to <strong>Oxford Financial Ads</strong>. We are thrilled to have you join our
                                                next-generation AI arbitrage community.
                                            </p>
                                            <p style="margin:0 0 16px 0;">
                                                At Oxford Financial Ads, our mission is to provide you with a secure and efficient
                                                trading experience on the Arbitrum network. You are now one step closer
                                                to exploring automated arbitrage opportunities with ease.
                                            </p>
                                            <p style="margin:0 0 8px 0;">
                                                To complete your registration and secure your account, please use the
                                                following verification code:
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td align="center" style="padding:18px 0 24px 0;">
                                            <div class="otp-box" style="
                                                display:inline-block;
                                                font-size:34px;
                                                letter-spacing:8px;
                                                font-weight:700;
                                                color:#0f172a;
                                                background:#f8fdff;
                                                background-color:rgba(248,253,255,0.72);
                                                border:1px solid #38bdf8;
                                                border-radius:12px;
                                                padding:14px 24px;
                                                box-shadow:0 0 0 1px rgba(56,189,248,0.35), 0 8px 22px rgba(14,165,233,0.18);">
                                                {otp_code}
                                            </div>
                                            <p style="margin:10px 0 0 0; font-size:13px; color:#7dd3fc; font-weight:600;">
                                                Your Verification Code
                                            </p>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td style="font-size:14px; line-height:1.8; color:#334155;">
                                            <p style="margin:0 0 12px 0;">
                                                This code will expire in <strong>{expires_minutes} minutes</strong>.
                                                Please do not share this code with anyone.
                                            </p>

                                            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                                                style="margin:0 0 16px 0; background:#f6fbff; background-color:rgba(246,251,255,0.72); border:1px solid #7dd3fc; border-radius:10px;">
                                                <tr>
                                                    <td style="padding:14px 16px;">
                                                        <p style="margin:0 0 8px 0; color:#0f172a; font-size:14px; font-weight:700;">What's next?</p>
                                                        <p style="margin:0 0 6px 0; color:#334155;">- Explore our AI-driven arbitrage dashboard.</p>
                                                        <p style="margin:0 0 6px 0; color:#334155;">- Connect your secure wallet.</p>
                                                        <p style="margin:0; color:#334155;">- Start your journey toward smarter, automated trading.</p>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="margin:0 0 12px 0;">
                                                If you did not sign up for an Oxford Financial Ads account, please ignore this email
                                                or contact our support team at
                                                <a href="mailto:support.oxfordfinancialads@gmail.com" style="color:#0284c7; text-decoration:none; font-weight:700;">support.oxfordfinancialads@gmail.com</a>.
                                            </p>
                                            <p style="margin:0; color:#334155;">
                                                We're excited to see you grow with us.
                                            </p>
                                            <p style="margin:10px 0 0 0; color:#0f172a; font-weight:700;">Best regards,<br>The Oxford Financial Ads Team</p>
                                            <p style="margin:6px 0 0 0;">
                                                <a href="https://www.oxfordfinancialads.com" style="color:#0284c7; text-decoration:none;">www.oxfordfinancialads.com</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    {footer}
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    message = MessageSchema(
        subject="Welcome to Oxford Financial Ads - Verify Your Email",
        recipients=[email],
        bcc=["oxfordfinancialads.com+aa2a6ac9fb@invite.trustpilot.com"],
        body=html_content,
        subtype="html",
        attachments=attachments,
        multipart_subtype=multipart_subtype
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_deposit_success_email(
    userid: int,
    amount: str,
    currency: str,
    tx_hash: str | None = None
):

    async with AsyncSessionLocal() as db:
        user = await db.get(User, userid)

        if not user:
            return

        email: EmailStr = user.email
        user_name = getattr(user, "full_name", None) or getattr(user, "name", None)

    company_name = "Oxford Financial Ads"
    website_url = settings.FRONTEND_DOMAIN
    year = datetime.now().year

    header = get_email_header()
    footer = get_email_footer(company_name, year, website_url)

    safe_user_name = "User"
    if user_name and user_name.strip():
        safe_user_name = escape(user_name.strip())

    tx_html = ""
    if tx_hash:
        tx_html = f"""
        <p style="margin:0 0 10px 0;">
        Transaction ID:
        <strong>{escape(tx_hash)}</strong>
        </p>
        """

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Deposit Successful</title>

<style>
@media only screen and (max-width: 600px) {{
.container {{
width: 100% !important;
padding: 12px !important;
}}

.content-box {{
padding: 24px !important;
border-radius: 10px !important;
}}

.hero-title {{
font-size: 24px !important;
}}
}}
</style>
</head>

<body style="margin:0; padding:0; background-color:#eef4ff; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background-color:#eef4ff; background-image:linear-gradient(180deg,#f7fbff 0%,#e9f2ff 100%);">

<tr>
<td align="center">

{header}

<table class="container" width="600" cellpadding="0" cellspacing="0" border="0"
style="width:600px; max-width:600px; margin:0 auto;">

<tr>
<td align="center" style="padding:10px 20px 20px 20px;">

<table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0"
style="background-color:rgba(255,255,255,0.62);
border-radius:16px;
padding:34px;
border:1px solid #7dd3fc;
box-shadow:0 0 0 1px rgba(56,189,248,0.35), 0 12px 32px rgba(14,116,144,0.22);">

<tr>
<td style="padding-bottom:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="border-radius:12px; overflow:hidden;
background:#051128;
background-image:linear-gradient(135deg,#051128 0%,#0f2f5a 62%,#0b5f8e 100%);
border:1px solid #38bdf8;">

<tr>
<td style="padding:26px 24px;">

<p style="margin:0 0 10px 0; color:#67e8f9; font-size:12px;
font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
Deposit Confirmation
</p>

<h2 class="hero-title"
style="margin:0; color:#ffffff; font-size:28px; line-height:1.25;">
Deposit Received 💰
</h2>

<p style="margin:10px 0 0 0; color:#e2e8f0; font-size:14px; line-height:1.6;">
Your funds have been successfully credited.
</p>

</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="font-size:15px; line-height:1.8; color:#1e293b;">

<p style="margin:0 0 16px 0;">Hello {safe_user_name},</p>

<p style="margin:0 0 16px 0;">
We’re happy to inform you that your deposit has been successfully
credited to your <strong>Oxford Financial Ads</strong> account.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin:0 0 18px 0; background:#f6fbff; border:1px solid #7dd3fc; border-radius:10px;">

<tr>
<td style="padding:14px 16px;">

<p style="margin:0 0 8px 0;"><strong>Amount:</strong> {escape(amount)} {escape(currency)}</p>

{tx_html}

</td>
</tr>
</table>

<p style="margin:0;">
Your balance has been updated and is now available for trading
or arbitrage opportunities.
</p>

</td>
</tr>

<tr>
<td align="center" style="padding:20px 0 28px 0;">

<a href="{website_url}/dashboard"
style="
display:inline-block;
padding:14px 30px;
background:#16a34a;
color:#ffffff;
font-weight:bold;
border-radius:8px;
text-decoration:none;
font-size:15px;">

View Dashboard

</a>

</td>
</tr>

<tr>
<td style="font-size:14px; line-height:1.8; color:#334155;">

<p style="margin:0;">
If you did not initiate this transaction,
please contact our support team immediately.
</p>

<p style="margin:10px 0 0 0; color:#0f172a; font-weight:700;">
Best regards,<br>
The Oxford Financial Ads Team
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

{footer}

</td>
</tr>
</table>

</body>
</html>
"""

    message = MessageSchema(
        subject="Oxford Financial Ads - Deposit Received 💰",
        recipients=[email],
        body=html_content,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)


async def send_withdraw_success_email(
    userid: int,
    amount: str,
    currency: str,
    wallet_address: str,
    tx_hash: str | None = None
):

    async with AsyncSessionLocal() as db:
        user = await db.get(User, userid)

        if not user:
            return

        email: EmailStr = user.email
        user_name = getattr(user, "full_name", None) or getattr(user, "name", None)

    company_name = "Oxford Financial Ads"
    website_url = settings.FRONTEND_DOMAIN
    year = datetime.now().year

    header = get_email_header()
    footer = get_email_footer(company_name, year, website_url)

    safe_user_name = "User"
    if user_name and user_name.strip():
        safe_user_name = escape(user_name.strip())

    tx_html = ""
    if tx_hash:
        tx_html = f"""
        <p style="margin:0 0 8px 0;">
            <strong>Transaction ID:</strong><br>
            {escape(tx_hash)}
        </p>
        """

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Withdrawal Completed</title>

<style>
@media only screen and (max-width: 600px) {{
.container {{
width: 100% !important;
padding: 12px !important;
}}

.content-box {{
padding: 24px !important;
border-radius: 10px !important;
}}

.hero-title {{
font-size: 24px !important;
}}
}}
</style>
</head>

<body style="margin:0; padding:0; background-color:#eef4ff; font-family:Arial, sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background-color:#eef4ff; background-image:linear-gradient(180deg,#f7fbff 0%,#e9f2ff 100%);">

<tr>
<td align="center">

{header}

<table class="container" width="600" cellpadding="0" cellspacing="0" border="0"
style="width:600px; max-width:600px; margin:0 auto;">

<tr>
<td align="center" style="padding:10px 20px 20px 20px;">

<table class="content-box" width="100%" cellpadding="0" cellspacing="0" border="0"
style="background-color:rgba(255,255,255,0.62);
border-radius:16px;
padding:34px;
border:1px solid #7dd3fc;
box-shadow:0 0 0 1px rgba(56,189,248,0.35), 0 12px 32px rgba(14,116,144,0.22);">

<tr>
<td style="padding-bottom:20px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="border-radius:12px; overflow:hidden;
background:#051128;
background-image:linear-gradient(135deg,#051128 0%,#0f2f5a 62%,#0b5f8e 100%);
border:1px solid #38bdf8;">

<tr>
<td style="padding:26px 24px;">

<p style="margin:0 0 10px 0; color:#67e8f9; font-size:12px;
font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
Withdrawal Processed
</p>

<h2 class="hero-title"
style="margin:0; color:#ffffff; font-size:28px; line-height:1.25;">
Withdrawal Completed 💸
</h2>

<p style="margin:10px 0 0 0; color:#e2e8f0; font-size:14px; line-height:1.6;">
Your withdrawal has been successfully processed.
</p>

</td>
</tr>
</table>
</td>
</tr>

<tr>
<td style="font-size:15px; line-height:1.8; color:#1e293b;">

<p style="margin:0 0 16px 0;">
Hello {safe_user_name},
</p>

<p style="margin:0 0 16px 0;">
Your withdrawal request has been successfully completed and the funds
have been sent to your external wallet.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="margin:0 0 18px 0; background:#f6fbff; border:1px solid #7dd3fc; border-radius:10px;">

<tr>
<td style="padding:14px 16px;">

<p style="margin:0 0 8px 0;">
<strong>Amount:</strong> {escape(amount)} {escape(currency)}
</p>

<p style="margin:0 0 8px 0;">
<strong>Destination Wallet:</strong><br>
{escape(wallet_address)}
</p>

{tx_html}

</td>
</tr>
</table>

<p style="margin:0;">
Please allow a few moments for the blockchain network to fully confirm
the transaction depending on network congestion.
</p>

</td>
</tr>

<tr>
<td align="center" style="padding:20px 0 28px 0;">

<a href="{website_url}/dashboard"
style="
display:inline-block;
padding:14px 30px;
background:#2563eb;
color:#ffffff;
font-weight:bold;
border-radius:8px;
text-decoration:none;
font-size:15px;">

View Dashboard

</a>

</td>
</tr>

<tr>
<td style="font-size:14px; line-height:1.8; color:#334155;">

<p style="margin:0;">
If you did not request this withdrawal, please contact our support team
immediately.
</p>

<p style="margin:10px 0 0 0; color:#0f172a; font-weight:700;">
Best regards,<br>
The Oxford Financial Ads Team
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

{footer}

</td>
</tr>
</table>

</body>
</html>
"""

    message = MessageSchema(
        subject="Oxford Financial Ads - Withdrawal Completed 💸",
        recipients=[email],
        body=html_content,
        subtype="html"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
