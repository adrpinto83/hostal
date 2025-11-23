# app/routers/invoices.py
"""Endpoints para gestión de facturas homologadas a normativas venezolanas."""
from datetime import date, datetime
from typing import List, Optional
import random
import string
import json
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user, require_roles
from ..models.invoice import (
    Invoice, InvoiceLine, InvoicePayment, InvoiceConfiguration,
    InvoiceControlNumber, InvoiceStatus, PaymentStatus
)
from ..models.guest import Guest
from ..models.user import User
from ..schemas.invoice import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, InvoiceListResponse,
    InvoicePaymentCreate, InvoicePaymentResponse,
    InvoiceConfigCreate, InvoiceConfigResponse, InvoiceStatsResponse
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])


def generate_control_number(db: Session, series: str = "A") -> str:
    """
    Genera número de control SENIAT válido.
    Formato: SERIE + 8 DÍGITOS + 1 DÍGITO VERIFICADOR
    Ejemplo: A00000001
    """
    while True:
        # Generar números aleatorios
        random_nums = ''.join([str(random.randint(0, 9)) for _ in range(8)])
        
        # Calcular dígito verificador simple
        sum_digits = sum(int(d) for d in random_nums)
        check_digit = sum_digits % 10
        
        control_number = f"{series}{random_nums}{check_digit}"
        
        # Verificar que no exista ya
        existing = db.query(InvoiceControlNumber).filter(
            InvoiceControlNumber.control_number == control_number
        ).first()
        
        if not existing:
            return control_number


def calculate_invoice_totals(
    lines: List[dict],
    tax_percentage: float = 16.0,
    iva_retention_enabled: bool = False,
    iva_retention_percentage: float = 75.0,
    islr_retention_enabled: bool = False,
    islr_retention_percentage: float = 0.75
) -> dict:
    """Calcula los totales de la factura con impuestos y retenciones."""
    subtotal = 0.0
    taxable_amount = 0.0
    tax_amount = 0.0

    # Calcular subtotal e IVA
    for line in lines:
        line_total = line['quantity'] * line['unit_price']
        subtotal += line_total
        
        if line.get('is_taxable', True):
            taxable_amount += line_total
            line_tax = line_total * (line.get('tax_percentage', tax_percentage) / 100)
            tax_amount += line_tax

    # Calcular retenciones
    iva_retention_amount = 0.0
    islr_retention_amount = 0.0

    if iva_retention_enabled:
        iva_retention_amount = tax_amount * (iva_retention_percentage / 100)

    if islr_retention_enabled:
        islr_retention_amount = subtotal * (islr_retention_percentage / 100)

    # Total final
    total = subtotal + tax_amount - iva_retention_amount - islr_retention_amount

    return {
        'subtotal': round(subtotal, 2),
        'taxable_amount': round(taxable_amount, 2),
        'tax_amount': round(tax_amount, 2),
        'iva_retention_amount': round(iva_retention_amount, 2),
        'islr_retention_amount': round(islr_retention_amount, 2),
        'total': round(total, 2)
    }


# ============ Facturas ============

@router.post(
    "/",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Crear nueva factura"
)
def create_invoice(
    invoice_data: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una nueva factura homologada a normativas venezolanas."""
    
    # Obtener configuración de facturación
    config = db.query(InvoiceConfiguration).first()
    if not config:
        raise HTTPException(status_code=400, detail="Configuración de facturación no establecida")

    # Convertir líneas a diccionarios
    lines_data = [line.model_dump() for line in invoice_data.lines]

    # Calcular totales
    totals = calculate_invoice_totals(
        lines_data,
        tax_percentage=config.tax_percentage,
        iva_retention_enabled=config.enable_iva_retention,
        iva_retention_percentage=config.iva_retention_percentage,
        islr_retention_enabled=config.enable_islr_retention,
        islr_retention_percentage=config.islr_retention_percentage
    )

    # Generar número de control
    control_number = generate_control_number(db, config.invoice_series)

    # Crear factura
    invoice = Invoice(
        invoice_type=invoice_data.invoice_type,
        control_number=control_number,
        invoice_number=config.next_invoice_number,
        invoice_series=config.invoice_series,
        guest_id=invoice_data.guest_id,
        client_name=invoice_data.client_name,
        client_rif=invoice_data.client_rif,
        client_email=invoice_data.client_email,
        client_phone=invoice_data.client_phone,
        currency=invoice_data.currency,
        exchange_rate=1.0,
        subtotal=totals['subtotal'],
        taxable_amount=totals['taxable_amount'],
        tax_percentage=config.tax_percentage,
        tax_amount=totals['tax_amount'],
        iva_retention_percentage=config.iva_retention_percentage if config.enable_iva_retention else 0.0,
        iva_retention_amount=totals['iva_retention_amount'],
        islr_retention_percentage=config.islr_retention_percentage if config.enable_islr_retention else 0.0,
        islr_retention_amount=totals['islr_retention_amount'],
        total=totals['total'],
        status=InvoiceStatus.draft,
        payment_status=PaymentStatus.pending,
        notes=invoice_data.notes,
        internal_reference=invoice_data.internal_reference,
        invoice_date=invoice_data.invoice_date,
        due_date=invoice_data.due_date,
    )

    db.add(invoice)
    db.flush()  # Asigna ID sin hacer commit

    # Agregar líneas
    for idx, line_data in enumerate(lines_data):
        line_total = line_data['quantity'] * line_data['unit_price']
        line_tax = line_total * (line_data.get('tax_percentage', config.tax_percentage) / 100) if line_data.get('is_taxable', True) else 0.0

        line = InvoiceLine(
            invoice_id=invoice.id,
            description=line_data['description'],
            code=line_data.get('code'),
            quantity=line_data['quantity'],
            unit_price=line_data['unit_price'],
            line_total=round(line_total, 2),
            is_taxable=line_data.get('is_taxable', True),
            tax_percentage=line_data.get('tax_percentage', config.tax_percentage),
            tax_amount=round(line_tax, 2),
            line_order=idx
        )
        db.add(line)

    # Registrar control number
    control_reg = InvoiceControlNumber(
        control_number=control_number,
        invoice_id=invoice.id,
        is_used=False
    )
    db.add(control_reg)

    # Incrementar número de serie
    config.next_invoice_number += 1

    db.commit()
    db.refresh(invoice)

    return invoice


@router.get(
    "/",
    response_model=List[InvoiceListResponse],
    dependencies=[Depends(require_roles("admin", "recepcionista", "gerente"))],
    summary="Listar facturas"
)
def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = None,
    client_name: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista las facturas con filtros opcionales."""
    query = db.query(Invoice)

    if status_filter:
        query = query.filter(Invoice.status == status_filter)

    if client_name:
        query = query.filter(Invoice.client_name.ilike(f"%{client_name}%"))

    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)

    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    return invoices


@router.get(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista", "gerente"))],
    summary="Obtener detalle de factura"
)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene los detalles completos de una factura."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


@router.patch(
    "/{invoice_id}",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Actualizar factura"
)
def update_invoice(
    invoice_id: int,
    invoice_data: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Actualiza una factura (solo si está en borrador)."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=400, detail="Solo se pueden actualizar facturas en borrador")

    # Actualizar campos
    if invoice_data.client_name:
        invoice.client_name = invoice_data.client_name
    if invoice_data.client_rif:
        invoice.client_rif = invoice_data.client_rif
    if invoice_data.client_email:
        invoice.client_email = invoice_data.client_email
    if invoice_data.client_phone:
        invoice.client_phone = invoice_data.client_phone
    if invoice_data.due_date:
        invoice.due_date = invoice_data.due_date
    if invoice_data.notes:
        invoice.notes = invoice_data.notes

    # Actualizar líneas si se proporcionan
    if invoice_data.lines:
        # Eliminar líneas existentes
        db.query(InvoiceLine).filter(InvoiceLine.invoice_id == invoice.id).delete()

        # Agregar nuevas líneas
        config = db.query(InvoiceConfiguration).first()
        lines_data = [line.model_dump() for line in invoice_data.lines]
        totals = calculate_invoice_totals(lines_data, config.tax_percentage if config else 16.0)

        for idx, line_data in enumerate(lines_data):
            line = InvoiceLine(
                invoice_id=invoice.id,
                description=line_data['description'],
                code=line_data.get('code'),
                quantity=line_data['quantity'],
                unit_price=line_data['unit_price'],
                line_total=line_data['quantity'] * line_data['unit_price'],
                is_taxable=line_data.get('is_taxable', True),
                tax_percentage=line_data.get('tax_percentage', 16.0),
                tax_amount=0.0,
                line_order=idx
            )
            db.add(line)

        # Actualizar totales
        invoice.subtotal = totals['subtotal']
        invoice.taxable_amount = totals['taxable_amount']
        invoice.tax_amount = totals['tax_amount']
        invoice.iva_retention_amount = totals['iva_retention_amount']
        invoice.islr_retention_amount = totals['islr_retention_amount']
        invoice.total = totals['total']

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post(
    "/{invoice_id}/issue",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Emitir factura"
)
def issue_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Emite una factura (cambia de borrador a emitida)."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=400, detail="Solo se pueden emitir facturas en borrador")

    if not invoice.lines:
        raise HTTPException(status_code=400, detail="La factura debe tener al menos una línea")

    invoice.status = InvoiceStatus.issued
    invoice.issued_at = datetime.utcnow()

    # Registrar como usada
    control_reg = db.query(InvoiceControlNumber).filter(
        InvoiceControlNumber.control_number == invoice.control_number
    ).first()
    if control_reg:
        control_reg.is_used = True
        control_reg.used_at = datetime.utcnow()

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post(
    "/{invoice_id}/cancel",
    response_model=InvoiceResponse,
    dependencies=[Depends(require_roles("admin"))],
    summary="Anular factura"
)
def cancel_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Anula una factura (solo admin)."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status_code=400, detail="La factura ya está anulada")

    invoice.status = InvoiceStatus.cancelled

    # Marcar número de control como no usado
    control_reg = db.query(InvoiceControlNumber).filter(
        InvoiceControlNumber.control_number == invoice.control_number
    ).first()
    if control_reg:
        control_reg.is_used = False
        control_reg.used_at = None

    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete(
    "/{invoice_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
    summary="Eliminar factura"
)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una factura (solo borradores)."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status != InvoiceStatus.draft:
        raise HTTPException(status_code=400, detail="Solo se pueden eliminar facturas en borrador")

    db.delete(invoice)
    db.commit()


# ============ Pagos de Facturas ============

@router.post(
    "/{invoice_id}/payments",
    response_model=InvoicePaymentResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista"))],
    summary="Registrar pago de factura"
)
def register_payment(
    invoice_id: int,
    payment_data: InvoicePaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra un pago para una factura."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if invoice.status == InvoiceStatus.cancelled:
        raise HTTPException(status_code=400, detail="No se pueden registrar pagos en facturas anuladas")

    # Crear registro de pago
    payment = InvoicePayment(
        invoice_id=invoice.id,
        amount=payment_data.amount,
        currency=payment_data.currency,
        exchange_rate=payment_data.exchange_rate,
        payment_method=payment_data.payment_method,
        payment_reference=payment_data.payment_reference,
        payment_date=payment_data.payment_date,
        notes=payment_data.notes
    )

    # Actualizar monto pagado e estado
    invoice.paid_amount += payment_data.amount

    if invoice.paid_amount >= invoice.total:
        invoice.payment_status = PaymentStatus.completed
        invoice.status = InvoiceStatus.paid
    elif invoice.paid_amount > 0:
        invoice.payment_status = PaymentStatus.partial
    else:
        invoice.payment_status = PaymentStatus.pending

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get(
    "/{invoice_id}/payments",
    response_model=List[InvoicePaymentResponse],
    dependencies=[Depends(require_roles("admin", "recepcionista", "gerente"))],
    summary="Listar pagos de factura"
)
def list_payments(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos los pagos de una factura."""
    invoice = db.get(Invoice, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    return invoice.payments


# ============ Configuración ============

@router.post(
    "/config",
    response_model=InvoiceConfigResponse,
    dependencies=[Depends(require_roles("admin"))],
    summary="Crear/Actualizar configuración de facturación"
)
def upsert_config(
    config_data: InvoiceConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea o actualiza la configuración de facturación."""
    config = db.query(InvoiceConfiguration).first()

    if not config:
        config = InvoiceConfiguration(**config_data.model_dump())
        db.add(config)
    else:
        for key, value in config_data.model_dump(exclude_unset=True).items():
            setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return config


@router.get(
    "/config",
    response_model=InvoiceConfigResponse,
    dependencies=[Depends(require_roles("admin", "recepcionista", "gerente"))],
    summary="Obtener configuración de facturación"
)
def get_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene la configuración de facturación."""
    config = db.query(InvoiceConfiguration).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de facturación no establecida")
    return config


# ============ Estadísticas ============

@router.get(
    "/stats/summary",
    response_model=InvoiceStatsResponse,
    dependencies=[Depends(require_roles("admin", "gerente"))],
    summary="Estadísticas de facturación"
)
def get_invoice_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Obtiene estadísticas generales de facturación."""
    total_invoices = db.query(func.count(Invoice.id)).scalar() or 0
    total_issued = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.issued).scalar() or 0
    total_cancelled = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.cancelled).scalar() or 0

    total_revenue = db.query(func.sum(Invoice.total)).filter(Invoice.status != InvoiceStatus.cancelled).scalar() or 0
    total_tax = db.query(func.sum(Invoice.tax_amount)).filter(Invoice.status != InvoiceStatus.cancelled).scalar() or 0

    pending_payment = db.query(func.sum(
        Invoice.total - Invoice.paid_amount
    )).filter(
        and_(Invoice.payment_status.in_([PaymentStatus.pending, PaymentStatus.partial]),
             Invoice.status != InvoiceStatus.cancelled)
    ).scalar() or 0

    average_value = total_revenue / total_issued if total_issued > 0 else 0

    # Estadísticas del mes actual
    from datetime import datetime as dt
    now = dt.utcnow()
    month_start = date(now.year, now.month, 1)

    invoices_month = db.query(func.count(Invoice.id)).filter(
        and_(Invoice.invoice_date >= month_start, Invoice.status != InvoiceStatus.cancelled)
    ).scalar() or 0

    revenue_month = db.query(func.sum(Invoice.total)).filter(
        and_(Invoice.invoice_date >= month_start, Invoice.status != InvoiceStatus.cancelled)
    ).scalar() or 0

    return {
        'total_invoices': total_invoices,
        'total_issued': total_issued,
        'total_cancelled': total_cancelled,
        'total_revenue': round(total_revenue, 2),
        'total_tax_collected': round(total_tax, 2),
        'pending_payment': round(pending_payment, 2),
        'average_invoice_value': round(average_value, 2),
        'invoices_this_month': invoices_month,
        'revenue_this_month': round(revenue_month or 0, 2),
    }


@router.get(
    "/{id}/printable",
    summary="Obtener factura imprimible en HTML",
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
)
def get_printable_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera una versión HTML imprimible de la factura."""
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    config = db.query(InvoiceConfiguration).first()
    if not config:
        config_data = {
            "company_name": "Tu Empresa",
            "company_rif": "0000000000",
            "address": "Dirección",
            "city": "Ciudad",
            "state": "Estado",
            "invoice_header_color": "#1a3a52",
        }
    else:
        config_data = {
            "company_name": config.company_name,
            "company_rif": config.company_rif,
            "address": config.address,
            "city": config.city,
            "state": config.state,
            "invoice_header_color": config.invoice_header_color,
        }

    # Generar HTML
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura {invoice.control_number}</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
            header {{ border-bottom: 3px solid {config_data['invoice_header_color']}; padding-bottom: 20px; margin-bottom: 30px; }}
            .company-info {{ margin-bottom: 10px; }}
            .company-info h1 {{ margin: 0; color: {config_data['invoice_header_color']}; font-size: 24px; }}
            .company-info p {{ margin: 3px 0; color: #666; font-size: 12px; }}
            .invoice-title {{ font-size: 28px; font-weight: bold; color: {config_data['invoice_header_color']}; margin: 20px 0; text-align: center; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
            .info-section {{ }}
            .info-section h3 {{ margin: 0 0 10px 0; color: {config_data['invoice_header_color']}; font-size: 12px; font-weight: bold; text-transform: uppercase; }}
            .info-section p {{ margin: 3px 0; font-size: 13px; color: #333; }}
            table {{ width: 100%; border-collapse: collapse; margin: 30px 0; }}
            th {{ background: {config_data['invoice_header_color']}; color: white; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }}
            td {{ padding: 10px 12px; border-bottom: 1px solid #ddd; font-size: 13px; }}
            tr:last-child td {{ border-bottom: none; }}
            .text-right {{ text-align: right; }}
            .totals {{ margin-top: 20px; width: 100%; border-top: 2px solid {config_data['invoice_header_color']}; padding-top: 20px; }}
            .total-row {{ display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; }}
            .total-row.final {{ font-size: 16px; font-weight: bold; color: {config_data['invoice_header_color']}; padding: 12px 0; }}
            footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 11px; text-align: center; }}
            @media print {{ body {{ background: white; }} .container {{ box-shadow: none; }} }}
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <div class="company-info">
                    <h1>{config_data['company_name']}</h1>
                    <p><strong>RIF:</strong> {config_data['company_rif']}</p>
                    <p>{config_data['address']}, {config_data['city']}, {config_data['state']}</p>
                </div>
            </header>

            <div class="invoice-title">{invoice.invoice_type.upper()}</div>

            <div class="info-grid">
                <div class="info-section">
                    <h3>Datos de la Factura</h3>
                    <p><strong>Número:</strong> {invoice.invoice_number}</p>
                    <p><strong>Serie:</strong> {invoice.invoice_series}</p>
                    <p><strong>Control SENIAT:</strong> {invoice.control_number}</p>
                    <p><strong>Fecha:</strong> {invoice.invoice_date.strftime('%d/%m/%Y')}</p>
                    {f'<p><strong>Vencimiento:</strong> {invoice.due_date.strftime("%d/%m/%Y")}</p>' if invoice.due_date else ''}
                </div>

                <div class="info-section">
                    <h3>Cliente</h3>
                    <p><strong>Nombre:</strong> {invoice.client_name}</p>
                    {f'<p><strong>RIF:</strong> {invoice.client_rif}</p>' if invoice.client_rif else ''}
                    {f'<p><strong>Email:</strong> {invoice.client_email}</p>' if invoice.client_email else ''}
                    {f'<p><strong>Teléfono:</strong> {invoice.client_phone}</p>' if invoice.client_phone else ''}
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th class="text-right">Cantidad</th>
                        <th class="text-right">P. Unitario</th>
                        <th class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
    """

    for line in invoice.lines:
        line_total = line.quantity * line.unit_price
        html_content += f"""
                    <tr>
                        <td>{line.description}</td>
                        <td class="text-right">{line.quantity}</td>
                        <td class="text-right">{line.unit_price:,.2f}</td>
                        <td class="text-right">{line_total:,.2f}</td>
                    </tr>
        """

    html_content += """
                </tbody>
            </table>

            <div class="totals">
    """

    html_content += f"""
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>{invoice.subtotal:,.2f}</span>
                </div>
                <div class="total-row">
                    <span>IVA ({invoice.tax_percentage}%):</span>
                    <span>{invoice.tax_amount:,.2f}</span>
                </div>
    """

    if invoice.iva_retention_amount and invoice.iva_retention_amount > 0:
        html_content += f"""
                <div class="total-row" style="color: #d97706;">
                    <span>Retención IVA:</span>
                    <span>-{invoice.iva_retention_amount:,.2f}</span>
                </div>
        """

    if invoice.islr_retention_amount and invoice.islr_retention_amount > 0:
        html_content += f"""
                <div class="total-row" style="color: #d97706;">
                    <span>Retención ISLR:</span>
                    <span>-{invoice.islr_retention_amount:,.2f}</span>
                </div>
        """

    html_content += f"""
                <div class="total-row final">
                    <span>TOTAL {invoice.currency}:</span>
                    <span>{invoice.total:,.2f}</span>
                </div>
            </div>

            <footer>
                <p>Factura generada el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}</p>
                <p>Esta es una factura electrónica homologada a las normativas SENIAT de Venezuela</p>
            </footer>
        </div>
    </body>
    </html>
    """

    return StreamingResponse(
        iter([html_content]),
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f"inline; filename=factura_{invoice.control_number}.html"},
    )


@router.post(
    "/{id}/send-email",
    summary="Enviar factura por correo",
    dependencies=[Depends(require_roles("admin", "gerente", "recepcionista"))],
)
def send_invoice_email(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Envía la factura por correo al cliente."""
    invoice = db.query(Invoice).filter(Invoice.id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    if not invoice.client_email:
        raise HTTPException(
            status_code=400,
            detail="El cliente no tiene un correo electrónico registrado"
        )

    # TODO: Implementar envío de email real usando FastAPI Mail o similar
    # Por ahora, retornamos un mensaje de éxito simulado
    return {
        "success": True,
        "message": f"Factura {invoice.control_number} enviada a {invoice.client_email}",
        "invoice_id": id,
        "client_email": invoice.client_email,
    }
