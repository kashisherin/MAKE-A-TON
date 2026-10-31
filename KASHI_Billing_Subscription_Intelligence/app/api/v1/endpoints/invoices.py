from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from app.core.database import get_db
from app.api.deps import get_tenant_context, require_role
from app.core.security import TenantContext, UserRole
from app.models.financial import Invoice
from app.schemas.invoices import (
    InvoiceCreate,
    InvoiceResponse,
    InvoiceListResponse,
)
from app.services.invoice_service import InvoiceService
from app.services.pdf_service import InvoicePDFService

router = APIRouter()


@router.post("/", response_model=InvoiceResponse, status_code=201)
def create_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return InvoiceService.create_invoice(db=db, data=data, ctx=ctx)


@router.get("/", response_model=InvoiceListResponse)
def list_invoices(
    customer_id: str | None = None,
    subscription_id: str | None = None,
    status: str | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    conditions = [Invoice.organization_id == ctx.organization_id]
    if customer_id:
        conditions.append(Invoice.customer_id == customer_id)
    if subscription_id:
        conditions.append(Invoice.subscription_id == subscription_id)
    if status:
        conditions.append(Invoice.status == status)

    total_stmt = select(func.count(Invoice.id)).where(and_(*conditions))
    total = db.scalar(total_stmt) or 0

    stmt = select(Invoice).where(and_(*conditions)).order_by(Invoice.id.desc()).offset(skip).limit(limit)
    items = db.scalars(stmt).all()

    return InvoiceListResponse(items=list(items), total=total)


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    inv = db.scalar(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.organization_id == ctx.organization_id,
            )
        )
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("/{invoice_id}/finalize", response_model=InvoiceResponse)
def finalize_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return InvoiceService.finalize_invoice(db=db, invoice_id=invoice_id, ctx=ctx)


@router.post("/{invoice_id}/void", response_model=InvoiceResponse)
def void_invoice(
    invoice_id: int,
    reason: str | None = None,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(require_role(UserRole.BILLING_SPECIALIST.value)),
):
    return InvoiceService.void_invoice(db=db, invoice_id=invoice_id, reason=reason, ctx=ctx)


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    ctx: TenantContext = Depends(get_tenant_context),
):
    inv = db.scalar(
        select(Invoice).where(
            and_(
                Invoice.id == invoice_id,
                Invoice.organization_id == ctx.organization_id,
            )
        )
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    pdf_bytes = InvoicePDFService.generate_invoice_pdf(inv)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="Invoice-{inv.invoice_number}.pdf"'},
    )
