"""
WhatsApp API Routes — configuration and messaging.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.v1.deps import get_current_user, get_current_admin_user
from app.models.user import User
from app.models.system_config import SystemConfig

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.get("/config")
async def get_whatsapp_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get WhatsApp configuration for the user-facing button."""
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "whatsapp_config")
    )
    config = result.scalar_one_or_none()

    if not config:
        return {"config": {"enabled": False, "whatsapp_number": "", "default_message": ""}}

    import json
    try:
        value = json.loads(config.value)
    except (json.JSONDecodeError, TypeError):
        value = {}

    return {
        "config": {
            "enabled": value.get("enabled", False),
            "whatsapp_number": value.get("whatsapp_number", ""),
            "default_message": value.get("default_message", ""),
        }
    }


class WhatsAppConfigUpdate(BaseModel):
    enabled: bool = False
    whatsapp_number: str = ""
    default_message: str = ""


@router.put("/config")
async def update_whatsapp_config(
    body: WhatsAppConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Admin: Update WhatsApp configuration."""
    import json

    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == "whatsapp_config")
    )
    config = result.scalar_one_or_none()

    value = json.dumps(body.model_dump())

    if config:
        config.value = value
    else:
        config = SystemConfig(key="whatsapp_config", value=value)
        db.add(config)

    await db.commit()
    return {"message": "WhatsApp config updated", "config": body.model_dump()}


class WhatsAppSend(BaseModel):
    message: str


@router.post("/send")
async def send_whatsapp_message(
    body: WhatsAppSend,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a WhatsApp message to support (logs the message)."""
    # For now, just log the message. In production, integrate with WhatsApp Business API.
    import logging
    logger = logging.getLogger(__name__)
    logger.info(
        f"WhatsApp message from user {current_user.id} "
        f"({current_user.email}): {body.message}"
    )
    return {"message": "Message received", "status": "logged"}
