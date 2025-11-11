# app/routers/payments.py
"""
Endpoints para gestión de pagos multimoneda.
Incluye CRUD completo, conversión automática, reportes y estadísticas.
"""
import structlog
from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, Field

from ..core.audit import log_action
from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.guest import Guest
from ..models.payment import Currency, Payment, PaymentMethod, PaymentStatus
from ..models.user import User
from ..services.currency import CurrencyService

router = APIRouter(prefix="/payments", tags=["Payments"])
log = structlog.get_logger()


# ============================================================================
# SCHEMAS
# ============================================================================

class PaymentCreate(BaseModel):
    """Esquema para crear un pago."""
    guest_id: int
    reservation_id: Optional[int] = None
    occupancy_id: Optional[int] = None
    amount: float = Field(gt=0, description="Monto del pago")
    currency: Currency
    method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    """Esquema para actualizar un pago."""
    status: Optional[PaymentStatus] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    """Esquema de salida de pago."""
    id: int
    guest_id: int
    reservation_id: Optional[int]
    occupancy_id: Optional[int]
    amount: float
    currency: str
    amount_eur: Optional[float]
    amount_usd: Optional[float]
    amount_ves: Optional[float]
    method: str
    status: str
    reference_number: Optional[str]
    notes: Optional[str]
    payment_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# CRUD ENDPOINTS
# ============================================================================

@router.post(
    "/",
    response_model=PaymentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Registrar nuevo pago",
    description="Crea un registro de pago con conversión automática a todas las monedas.",
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra un nuevo pago con conversión automática."""
    # Verificar que el huésped existe
    guest = db.get(Guest, payment_data.guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    # Convertir el monto a todas las monedas
    conversions = CurrencyService.convert_to_all_currencies(
        db, payment_data.amount, payment_data.currency.value
    )

    # Obtener tasas de cambio usadas
    rates = CurrencyService.get_latest_rates(db, payment_data.currency.value)

    # Crear el pago
    payment = Payment(
        guest_id=payment_data.guest_id,
        reservation_id=payment_data.reservation_id,
        occupancy_id=payment_data.occupancy_id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        amount_eur=conversions.get("EUR"),
        amount_usd=conversions.get("USD"),
        amount_ves=conversions.get("VES"),
        exchange_rate_eur=rates.get("EUR"),
        exchange_rate_usd=rates.get("USD"),
        exchange_rate_ves=rates.get("VES"),
        method=payment_data.method,
        status=PaymentStatus.completed,  # Por defecto completado
        reference_number=payment_data.reference_number,
        notes=payment_data.notes,
        payment_date=datetime.utcnow(),
        created_by=current_user.id,
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Auditoría
    log_action(
        "create_payment",
        "payment",
        payment.id,
        current_user,
        details={
            "guest_id": payment_data.guest_id,
            "amount": payment_data.amount,
            "currency": payment_data.currency.value,
            "method": payment_data.method.value,
        },
    )

    log.info(
        "payment_created",
        payment_id=payment.id,
        guest_id=payment_data.guest_id,
        amount=payment_data.amount,
        currency=payment_data.currency.value,
        user_id=current_user.id,
    )

    return payment


@router.get(
    "/",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Listar pagos",
    description="Obtiene lista de pagos con filtros opcionales.",
)
def list_payments(
    guest_id: Optional[int] = None,
    currency: Optional[str] = None,
    method: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Lista pagos con filtros."""
    query = db.query(Payment)

    # Aplicar filtros
    if guest_id:
        query = query.filter(Payment.guest_id == guest_id)
    if currency:
        query = query.filter(Payment.currency == currency)
    if method:
        query = query.filter(Payment.method == method)
    if status:
        query = query.filter(Payment.status == status)
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    if end_date:
        end_datetime = datetime.combine(end_date, datetime.max.time())
        query = query.filter(Payment.payment_date <= end_datetime)

    total = query.count()
    payments = query.order_by(Payment.payment_date.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "payments": [
            {
                "id": p.id,
                "guest_id": p.guest_id,
                "amount": p.amount,
                "currency": p.currency.value,
                "method": p.method.value,
                "status": p.status.value,
                "reference_number": p.reference_number,
                "payment_date": p.payment_date.isoformat(),
                "amount_usd": p.amount_usd,
            }
            for p in payments
        ],
    }


@router.get(
    "/{payment_id}",
    response_model=PaymentOut,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Obtener pago",
)
def get_payment(payment_id: int, db: Session = Depends(get_db)):
    """Obtiene un pago específico."""
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


@router.patch(
    "/{payment_id}",
    response_model=PaymentOut,
    dependencies=[Depends(require_roles("admin"))],
    summary="Actualizar pago",
)
def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualiza un pago existente."""
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Actualizar campos
    if payment_data.status is not None:
        payment.status = payment_data.status
    if payment_data.reference_number is not None:
        payment.reference_number = payment_data.reference_number
    if payment_data.notes is not None:
        payment.notes = payment_data.notes

    db.commit()
    db.refresh(payment)

    log_action("update_payment", "payment", payment_id, current_user)

    return payment


@router.delete(
    "/{payment_id}",
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar pago",
)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina un pago."""
    payment = db.get(Payment, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()

    log_action("delete_payment", "payment", payment_id, current_user)

    return {"message": "Payment deleted successfully"}


# ============================================================================
# REPORTES Y ESTADÍSTICAS
# ============================================================================

@router.get(
    "/stats/summary",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Resumen de pagos",
    description="Estadísticas generales de pagos en todas las monedas.",
)
def get_payment_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """Obtiene estadísticas de pagos."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    # Total de pagos completados
    total_payments = db.query(Payment).filter(
        Payment.status == PaymentStatus.completed,
        Payment.payment_date >= cutoff
    ).count()

    # Suma por moneda (solo pagos completados)
    by_currency = db.query(
        Payment.currency,
        func.sum(Payment.amount).label('total'),
        func.count(Payment.id).label('count')
    ).filter(
        Payment.status == PaymentStatus.completed,
        Payment.payment_date >= cutoff
    ).group_by(Payment.currency).all()

    # Total en USD (usando conversiones)
    total_usd = db.query(
        func.sum(Payment.amount_usd)
    ).filter(
        Payment.status == PaymentStatus.completed,
        Payment.payment_date >= cutoff
    ).scalar() or 0

    # Por método de pago
    by_method = db.query(
        Payment.method,
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount_usd).label('total_usd')
    ).filter(
        Payment.status == PaymentStatus.completed,
        Payment.payment_date >= cutoff
    ).group_by(Payment.method).all()

    # Por estado
    by_status = db.query(
        Payment.status,
        func.count(Payment.id).label('count')
    ).filter(
        Payment.payment_date >= cutoff
    ).group_by(Payment.status).all()

    return {
        "period_days": days,
        "total_payments": total_payments,
        "total_usd": round(total_usd, 2),
        "by_currency": [
            {
                "currency": curr.value,
                "total": float(total),
                "count": count
            }
            for curr, total, count in by_currency
        ],
        "by_method": [
            {
                "method": meth.value,
                "count": count,
                "total_usd": round(total_usd or 0, 2)
            }
            for meth, count, total_usd in by_method
        ],
        "by_status": [
            {
                "status": st.value,
                "count": count
            }
            for st, count in by_status
        ]
    }


@router.get(
    "/reports/by-date",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Reporte de pagos por fecha",
    description="Obtiene pagos agrupados por día en un rango de fechas.",
)
def get_payments_by_date(
    start_date: date,
    end_date: date,
    currency: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Genera reporte de pagos por fecha."""
    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 365 days"
        )

    query = db.query(
        func.date(Payment.payment_date).label('date'),
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount_usd).label('total_usd'),
        func.sum(Payment.amount).label('total_original')
    ).filter(
        Payment.status == PaymentStatus.completed,
        Payment.payment_date >= start_date,
        Payment.payment_date <= datetime.combine(end_date, datetime.max.time())
    )

    if currency:
        query = query.filter(Payment.currency == currency)

    result = query.group_by(func.date(Payment.payment_date)).order_by('date').all()

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "currency_filter": currency,
        "daily_totals": [
            {
                "date": day.isoformat(),
                "count": count,
                "total_usd": round(total_usd or 0, 2),
                "total_original": round(total_original or 0, 2)
            }
            for day, count, total_usd, total_original in result
        ]
    }


@router.get(
    "/reports/by-guest/{guest_id}",
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Reporte de pagos de un huésped",
)
def get_guest_payments_report(
    guest_id: int,
    db: Session = Depends(get_db),
):
    """Genera reporte completo de pagos de un huésped."""
    guest = db.get(Guest, guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    payments = db.query(Payment).filter(Payment.guest_id == guest_id).order_by(
        Payment.payment_date.desc()
    ).all()

    # Totales
    total_usd = sum(p.amount_usd or 0 for p in payments if p.status == PaymentStatus.completed)
    total_eur = sum(p.amount_eur or 0 for p in payments if p.status == PaymentStatus.completed)
    total_ves = sum(p.amount_ves or 0 for p in payments if p.status == PaymentStatus.completed)

    return {
        "guest_id": guest_id,
        "guest_name": guest.full_name,
        "total_payments": len(payments),
        "completed_payments": sum(1 for p in payments if p.status == PaymentStatus.completed),
        "totals": {
            "usd": round(total_usd, 2),
            "eur": round(total_eur, 2),
            "ves": round(total_ves, 2),
        },
        "payments": [
            {
                "id": p.id,
                "amount": p.amount,
                "currency": p.currency.value,
                "method": p.method.value,
                "status": p.status.value,
                "payment_date": p.payment_date.isoformat(),
                "reference_number": p.reference_number,
            }
            for p in payments
        ]
    }


@router.get(
    "/reports/export",
    dependencies=[Depends(require_roles("admin"))],
    summary="Exportar datos de pagos",
    description="Exporta datos de pagos en formato CSV (retorna datos listos para CSV).",
)
def export_payments(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
):
    """Exporta pagos en formato CSV."""
    payments = db.query(Payment).filter(
        Payment.payment_date >= start_date,
        Payment.payment_date <= datetime.combine(end_date, datetime.max.time())
    ).order_by(Payment.payment_date).all()

    # Retornar datos en formato listo para CSV
    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "count": len(payments),
        "data": [
            {
                "id": p.id,
                "date": p.payment_date.isoformat(),
                "guest_id": p.guest_id,
                "amount": p.amount,
                "currency": p.currency.value,
                "amount_usd": p.amount_usd,
                "amount_eur": p.amount_eur,
                "amount_ves": p.amount_ves,
                "method": p.method.value,
                "status": p.status.value,
                "reference": p.reference_number or "",
                "notes": p.notes or "",
            }
            for p in payments
        ]
    }
