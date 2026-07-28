from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

# Import and include routers from existing local modules
# These are progressively added as modules are created
try:
    from app.api.v1 import auth
    api_router.include_router(auth.router)
except ImportError:
    pass

try:
    from app.api.v1 import user
    api_router.include_router(user.router)
except ImportError:
    pass

try:
    from app.api.v1 import admin
    api_router.include_router(admin.router)
except ImportError:
    pass

try:
    from app.api.v1 import kyc
    api_router.include_router(kyc.router)
except ImportError:
    pass

try:
    from app.api.v1 import deposits
    api_router.include_router(deposits.router)
except ImportError:
    pass

try:
    from app.api.v1 import withdrawals
    api_router.include_router(withdrawals.router)
except ImportError:
    pass

try:
    from app.api.v1 import investments
    api_router.include_router(investments.router)
except ImportError:
    pass
