from fastapi import APIRouter
from app.api.v1.endpoints import (
    invoices,
    taxes,
    discounts,
    payments,
    billing,
    flexibill,
    pulse,
    analytics,
)

api_router = APIRouter()
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(taxes.router, prefix="/taxes", tags=["taxes"])
api_router.include_router(discounts.router, prefix="/discounts", tags=["discounts"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(flexibill.router, prefix="/flexi-bill", tags=["flexi-bill"])
api_router.include_router(pulse.router, prefix="/pulse", tags=["pulse"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["finance-analytics"])
