from fastapi import APIRouter
from app.api.v1 import (
    health,
    auth,
    kyc,
    admin,
    user,
    deposit_network,
    deposits,
    investments,
    admin_investments,
    withdrawals,
    admin_roi,
    platform_stats,
    announcements,
    ecommerce,
    captcha,
    ads,
    admin_ads,
    invoice,
    whatsapp,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(kyc.router)
api_router.include_router(admin.router)
api_router.include_router(deposit_network.router)
api_router.include_router(deposits.router)
api_router.include_router(withdrawals.router)
api_router.include_router(investments.router)
api_router.include_router(admin_investments.router)
api_router.include_router(admin_roi.router)
api_router.include_router(platform_stats.router)
api_router.include_router(announcements.router)
api_router.include_router(ecommerce.router)
api_router.include_router(captcha.router)
api_router.include_router(ads.router)
api_router.include_router(admin_ads.router)
api_router.include_router(invoice.router)
api_router.include_router(whatsapp.router)
