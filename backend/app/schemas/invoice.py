# app/schemas/invoice.py
"""Schemas Pydantic para facturas homologadas a normativas venezolanas."""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import re


class InvoiceLineCreate(BaseModel):
    """Esquema para crear línea de factura."""
    description: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    is_taxable: bool = Field(True)
    tax_percentage: float = Field(16.0, ge=0, le=100)


class InvoiceLineResponse(InvoiceLineCreate):
    """Esquema de respuesta para línea de factura."""
    id: int
    invoice_id: int
    line_total: float
    tax_amount: float
    line_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceLineUpdate(BaseModel):
    """Esquema para actualizar línea de factura."""
    description: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    quantity: Optional[float] = Field(None, gt=0)
    unit_price: Optional[float] = Field(None, ge=0)
    is_taxable: Optional[bool] = None
    tax_percentage: Optional[float] = Field(None, ge=0, le=100)


class InvoicePaymentCreate(BaseModel):
    """Esquema para crear pago de factura."""
    amount: float = Field(..., gt=0)
    currency: str = Field("VES", max_length=3)
    exchange_rate: float = Field(1.0, ge=0)
    payment_method: str = Field(..., min_length=1, max_length=50)
    payment_reference: Optional[str] = Field(None, max_length=100)
    payment_date: date
    notes: Optional[str] = None


class InvoicePaymentResponse(InvoicePaymentCreate):
    """Esquema de respuesta para pago de factura."""
    id: int
    invoice_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    """Esquema para crear factura."""
    invoice_type: str = Field("factura", pattern="^(factura|nota_credito|nota_debito)$")
    guest_id: Optional[int] = None
    client_name: str = Field(..., min_length=1, max_length=255)
    client_rif: Optional[str] = Field(None, max_length=50)
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    currency: str = Field("VES", max_length=3)
    invoice_date: date
    due_date: Optional[date] = None
    notes: Optional[str] = None
    internal_reference: Optional[str] = Field(None, max_length=50)
    lines: List[InvoiceLineCreate] = Field(..., min_items=1)

    @field_validator('invoice_date')
    @classmethod
    def validate_invoice_date(cls, v):
        """Validar que la fecha de factura no sea futura."""
        if v > date.today():
            raise ValueError('La fecha de factura no puede ser futura')
        return v

    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v, values):
        """Validar que due_date sea posterior a invoice_date."""
        if v and 'invoice_date' in values.data:
            if v < values.data['invoice_date']:
                raise ValueError('La fecha de vencimiento debe ser posterior a la fecha de factura')
        return v

    @field_validator('client_rif')
    @classmethod
    def validate_rif(cls, v):
        """Validar formato del RIF venezolano."""
        if v:
            # RIF formato: XXXXXXXXX-X (ej: 123456789-0)
            if not re.match(r'^\d{9,10}(-\d{1})?$', v):
                raise ValueError('Formato de RIF inválido. Debe ser 9 o 10 dígitos, opcionalmente seguido de un dígito verificador')
        return v


class InvoiceUpdate(BaseModel):
    """Esquema para actualizar factura."""
    client_name: Optional[str] = Field(None, min_length=1, max_length=255)
    client_rif: Optional[str] = Field(None, max_length=50)
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    lines: Optional[List[InvoiceLineCreate]] = None

    @field_validator('client_rif')
    @classmethod
    def validate_rif(cls, v):
        """Validar formato del RIF venezolano."""
        if v:
            if not re.match(r'^\d{9,10}(-\d{1})?$', v):
                raise ValueError('Formato de RIF inválido')
        return v


class InvoiceResponse(BaseModel):
    """Esquema de respuesta para factura."""
    id: int
    invoice_type: str
    control_number: str
    invoice_number: int
    invoice_series: str
    guest_id: Optional[int]
    client_name: str
    client_rif: Optional[str]
    client_email: Optional[str]
    client_phone: Optional[str]
    currency: str
    exchange_rate: float
    subtotal: float
    taxable_amount: float
    tax_percentage: float
    tax_amount: float
    iva_retention_percentage: float
    iva_retention_amount: float
    islr_retention_percentage: float
    islr_retention_amount: float
    total: float
    payment_status: str
    paid_amount: float
    status: str
    notes: Optional[str]
    internal_reference: Optional[str]
    invoice_date: date
    due_date: Optional[date]
    issued_at: Optional[datetime]
    cancellation_reason: Optional[str]
    cancellation_authorization_code: Optional[str]
    cancellation_authorized_at: Optional[datetime]
    cancellation_authorized_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    lines: List[InvoiceLineResponse]
    payments: List[InvoicePaymentResponse]

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Esquema resumido para listado de facturas."""
    id: int
    control_number: str
    invoice_number: int
    client_name: str
    currency: str
    subtotal: float
    tax_amount: float
    total: float
    payment_status: str
    status: str
    invoice_date: date
    due_date: Optional[date]

    class Config:
        from_attributes = True


class InvoiceConfigCreate(BaseModel):
    """Esquema para crear/actualizar configuración de facturación."""
    company_name: str = Field(..., min_length=1, max_length=255)
    company_rif: str = Field(..., max_length=50)
    address: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=10)
    phone: Optional[str] = Field(None, max_length=50)
    email: Optional[str] = None
    website: Optional[str] = None
    tax_percentage: float = Field(16.0, ge=0, le=100)
    enable_iva_retention: bool = Field(False)
    iva_retention_percentage: float = Field(75.0, ge=0, le=100)
    enable_islr_retention: bool = Field(False)
    islr_retention_percentage: float = Field(0.75, ge=0, le=100)
    invoice_series: str = Field("A", max_length=10)
    seniat_authorization_number: Optional[str] = Field(None, max_length=50)
    seniat_authorization_date: Optional[date] = None
    logo_path: Optional[str] = None
    invoice_header_color: str = Field("#1a3a52", pattern="^#[0-9A-F]{6}$")
    invoice_footer_text: Optional[str] = None
    payment_terms: Optional[str] = None

    @field_validator('company_rif')
    @classmethod
    def validate_rif(cls, v):
        """Validar formato del RIF venezolano."""
        if not re.match(r'^\d{9,10}$', v):
            raise ValueError('RIF debe ser 9 o 10 dígitos sin guiones ni caracteres especiales')
        return v


class InvoiceConfigResponse(InvoiceConfigCreate):
    """Esquema de respuesta para configuración de facturación."""
    id: int
    next_invoice_number: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceStatsResponse(BaseModel):
    """Estadísticas de facturación."""
    total_invoices: int
    total_issued: int
    total_cancelled: int
    total_revenue: float
    total_tax_collected: float
    pending_payment: float
    average_invoice_value: float
    invoices_this_month: int
    revenue_this_month: float


class InvoiceAnnulmentRequest(BaseModel):
    """Esquema para solicitar anulación de factura emitida."""
    reason: str = Field(..., min_length=10, max_length=500)
    authorization_code: str = Field(..., min_length=5, max_length=50)
