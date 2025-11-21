# 💳 Plan de Mejora - Sistema de Pagos

## 📋 Resumen Ejecutivo

Implementar un **Sistema de Pagos Profesional y Completo** con:
- ✅ Integración con pasarelas de pago (Stripe + PayPal)
- ✅ Generación automática de facturas en PDF
- ✅ Reportes financieros avanzados
- ✅ Facturación automática por reserva
- ✅ Gestión de deudas pendientes
- ✅ Webhooks de pagos en tiempo real

---

## 🎯 Objetivos

### Fase 1: Fundacional (Semana 1-2)
- Implementar Stripe como gateway principal
- Crear sistema de facturación automática
- Implementar webhooks de pagos

### Fase 2: Reportes (Semana 2-3)
- Dashboard financiero avanzado
- Reportes de ingresos y análisis
- Reconciliación de pagos

### Fase 3: Automatización (Semana 3-4)
- Recordatorios de pago automáticos
- Procesamiento de reembolsos
- Auditoría financiera

---

## 📊 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PaymentProcessing.tsx     FinancialReports.tsx              │
│  ├─ Checkout Modal         ├─ Income Dashboard               │
│  ├─ Stripe Elements        ├─ Expense Tracking               │
│  └─ Payment Status         └─ Forecasting                    │
│                                                               │
│  InvoiceView.tsx           PaymentReconciliation.tsx         │
│  ├─ Invoice List           ├─ Bank Matching                  │
│  ├─ PDF Download           ├─ Discrepancy Reports           │
│  └─ Email Integration      └─ Audit Trail                    │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    BACKEND (FastAPI)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PAYMENT PROCESSING LAYER                                    │
│  ├─ payments_stripe.py (Stripe integration)                  │
│  ├─ payments_paypal.py (PayPal integration)                  │
│  ├─ payment_webhooks.py (Webhook handlers)                   │
│  └─ payment_processor.py (Main orchestrator)                 │
│                                                               │
│  INVOICING LAYER                                             │
│  ├─ invoice_generator.py (PDF generation)                    │
│  ├─ invoice_templates.py (Template management)               │
│  ├─ invoice_storage.py (S3/Local storage)                    │
│  └─ invoice_workflow.py (Auto-generation logic)              │
│                                                               │
│  REPORTING LAYER                                             │
│  ├─ financial_reports.py (Report generation)                 │
│  ├─ analytics.py (Data aggregation)                          │
│  ├─ forecasting.py (Revenue prediction)                      │
│  └─ reconciliation.py (Payment matching)                     │
│                                                               │
│  ROUTERS                                                     │
│  ├─ routers/payments_v2.py (Enhanced payment endpoints)      │
│  ├─ routers/invoices.py (Invoice management)                 │
│  ├─ routers/reports.py (Financial reports)                   │
│  ├─ routers/webhooks.py (Payment webhooks)                   │
│  └─ routers/reconciliation.py (Reconciliation)               │
│                                                               │
│  MODELS                                                      │
│  ├─ models/payment.py (Updated)                              │
│  ├─ models/invoice.py (NEW)                                  │
│  ├─ models/expense.py (NEW)                                  │
│  ├─ models/financial_transaction.py (NEW)                    │
│  └─ models/stripe_webhook_event.py (NEW)                     │
│                                                               │
│  SERVICES                                                    │
│  ├─ services/currency.py (Existing)                          │
│  ├─ services/payment_gateway.py (NEW)                        │
│  ├─ services/invoice_service.py (NEW)                        │
│  ├─ services/financial_service.py (NEW)                      │
│  └─ services/email_service.py (Enhanced)                     │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              EXTERNAL SERVICES & DATABASES                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  PAYMENT GATEWAYS          EXTERNAL SERVICES                 │
│  ├─ Stripe                 ├─ SendGrid (Email)               │
│  │  ├─ Card processing     ├─ AWS S3 (PDF storage)           │
│  │  ├─ Webhooks            ├─ Twilio (SMS alerts)            │
│  │  └─ Disputes            └─ ExchangeRate API               │
│  │                                                            │
│  └─ PayPal                 DATABASES                          │
│     ├─ Transactions        ├─ PostgreSQL (Main)              │
│     ├─ Webhooks            ├─ Redis (Cache)                  │
│     └─ Disputes            └─ S3 (Invoice PDFs)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes a Implementar

### FASE 1: Integración de Pasarelas de Pago

#### 1.1 Backend - Models
**Archivo: `backend/app/models/invoice.py`** (NUEVO)
```python
class Invoice(Base):
    """Invoice model for billing"""
    __tablename__ = "invoices"

    id: uuid
    invoice_number: str (unique, sequential)
    guest_id: FK → guests
    reservation_id: FK → reservations (optional)

    # Invoice Details
    issue_date: datetime
    due_date: datetime
    paid_date: datetime (nullable)

    # Amounts
    subtotal: float (VES)
    tax_amount: float
    total: float (VES)
    paid_amount: float (default 0)
    remaining_balance: float

    # Multi-currency
    total_usd, total_eur (calculated)
    exchange_rates: JSON (historical)

    # Status
    status: enum (draft, issued, sent, viewed, pending, partially_paid, paid, overdue, cancelled, refunded)

    # Items
    line_items: relationship → InvoiceLineItem

    # Metadata
    notes: text
    terms_conditions: text
    created_by: FK → users
    updated_at: datetime

    # PDF Storage
    pdf_url: string
    pdf_generated_at: datetime
```

**Archivo: `backend/app/models/stripe_webhook_event.py`** (NUEVO)
```python
class StripeWebhookEvent(Base):
    """Store Stripe webhook events for audit and retry"""

    id: uuid
    event_id: str (from Stripe, unique)
    event_type: str (payment_intent.succeeded, etc)
    event_timestamp: datetime
    payload: JSON (raw webhook data)

    payment_intent_id: str

    # Processing
    processed: bool
    processed_at: datetime (nullable)
    processing_status: enum (pending, success, failed, retry)
    error_message: text
    retry_count: int

    created_at: datetime
```

**Archivo: `backend/app/models/financial_transaction.py`** (NUEVO)
```python
class FinancialTransaction(Base):
    """Track all financial movements (payments, refunds, adjustments)"""

    id: uuid
    transaction_type: enum (payment, refund, adjustment, invoice, expense)

    # Links
    invoice_id: FK (nullable)
    payment_id: FK (nullable)
    guest_id: FK
    user_id: FK (who created)

    # Amounts
    amount: float
    currency: enum (VES, USD, EUR)
    amount_ves: float (normalized)

    # Gateway
    gateway: enum (stripe, paypal, manual, bank_transfer)
    gateway_transaction_id: str
    gateway_reference: str

    # Status
    status: enum (pending, completed, failed, refunded, disputed)

    description: text
    metadata: JSON

    created_at: datetime
```

#### 1.2 Backend - Services
**Archivo: `backend/app/services/payment_gateway.py`** (NUEVO)
```python
class PaymentGatewayService:
    """Unified payment gateway interface"""

    async def create_payment_intent(
        guest_id: str,
        amount: float,
        currency: str,
        invoice_id: str,
        metadata: dict
    ) -> PaymentIntent

    async def process_payment(
        payment_intent_id: str,
        payment_method_id: str
    ) -> PaymentResult

    async def refund_payment(
        payment_id: str,
        amount: float,
        reason: str
    ) -> RefundResult

    async def verify_webhook_signature(
        payload: bytes,
        signature: str
    ) -> bool

    async def handle_webhook_event(
        event: dict
    ) -> WebhookResult
```

**Archivo: `backend/app/services/stripe_service.py`** (NUEVO)
```python
class StripeService:
    """Stripe-specific implementation"""

    async def create_checkout_session(
        invoice_id: str,
        success_url: str,
        cancel_url: str
    ) -> str  # redirect URL

    async def create_payment_intent(
        amount: float,
        currency: str,
        metadata: dict
    ) -> stripe.PaymentIntent

    async def process_webhook(
        event: dict,
        db: Session
    ) -> None

    async def refund_charge(
        charge_id: str,
        amount: float,
        reason: str
    ) -> stripe.Refund

    async def list_transactions(
        start_date: datetime,
        end_date: datetime
    ) -> List[StripeTransaction]
```

#### 1.3 Backend - Routers
**Archivo: `backend/app/routers/webhooks.py`** (NUEVO)
```python
@router.post("/stripe/webhook")
async def handle_stripe_webhook(
    request: Request,
    db: Session
) -> dict
    """
    Webhook endpoint for Stripe events:
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - charge.refunded
    - customer.subscription.updated
    """
    # Verify signature
    # Process event
    # Update payment status
    # Update invoice status
    # Send notifications
    # Return 200 OK
```

**Archivo: `backend/app/routers/payments_v2.py`** (NUEVO)
```python
@router.post("/checkout/session")
async def create_checkout_session(
    invoice_id: str,
    current_user: User
) -> CheckoutSessionResponse
    """Create Stripe checkout session for invoice"""

@router.post("/webhook/payment-method")
async def attach_payment_method(
    payment_method_id: str,
    guest_id: str
) -> PaymentMethodResponse
    """Save payment method for guest"""

@router.post("/refund/{payment_id}")
async def refund_payment(
    payment_id: str,
    amount: float,
    reason: str
) -> RefundResponse
    """Process refund for payment"""

@router.get("/status/{intent_id}")
async def get_payment_status(
    intent_id: str
) -> PaymentStatusResponse
    """Get real-time payment status from Stripe"""
```

#### 1.4 Frontend - Components
**Archivo: `frontend/src/components/payments/CheckoutModal.tsx`** (NUEVO)
```typescript
interface CheckoutModalProps {
  invoiceId: string
  amount: number
  currency: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId: string) => void
}

export function CheckoutModal({...}: CheckoutModalProps) {
  // Stripe Elements setup
  // CardElement component
  // Handle payment processing
  // Show loading states
  // Handle errors
  // Redirect on success
}
```

**Archivo: `frontend/src/components/payments/PaymentMethodManager.tsx`** (NUEVO)
```typescript
// Add/remove saved payment methods
// Set default payment method
// Display saved cards
// Delete stored cards
```

---

### FASE 2: Sistema de Facturación

#### 2.1 Backend - Invoice Service
**Archivo: `backend/app/services/invoice_service.py`** (NUEVO)
```python
class InvoiceService:
    """Complete invoice lifecycle management"""

    async def create_invoice_from_reservation(
        reservation_id: str,
        db: Session
    ) -> Invoice
        """Auto-generate invoice on checkout"""

    async def generate_invoice_pdf(
        invoice_id: str,
        db: Session
    ) -> bytes
        """Generate PDF with Reportlab"""

    async def send_invoice_email(
        invoice_id: str,
        recipient_email: str
    ) -> bool
        """Send invoice via email"""

    async def apply_payment_to_invoice(
        invoice_id: str,
        payment_id: str,
        amount: float
    ) -> InvoiceUpdateResult
        """Update invoice paid status"""

    async def generate_invoice_number(
        db: Session
    ) -> str
        """Create sequential invoice number"""

    async def create_refund_memo(
        invoice_id: str,
        reason: str
    ) -> CreditMemo
```

**Archivo: `backend/app/services/invoice_templates.py`** (NUEVO)
```python
class InvoiceTemplate:
    """Configurable invoice template"""

    def render(invoice: Invoice, logo_path: str) -> str
        """Generate HTML for PDF conversion"""

    # Template sections:
    # - Header (company info, logo)
    # - Invoice details (number, date, due date)
    # - Line items table
    # - Subtotal / Tax / Total
    # - Payment terms
    # - Notes
    # - Footer (bank details, company details)
```

#### 2.2 Backend - Routers
**Archivo: `backend/app/routers/invoices.py`** (NUEVO)
```python
@router.get("/invoices/")
async def list_invoices(
    guest_id: str = None,
    status: str = None,
    start_date: date = None,
    end_date: date = None
) -> List[InvoiceOut]

@router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str) -> InvoiceOut

@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str
) -> FileResponse  # PDF file

@router.post("/invoices/{invoice_id}/send")
async def send_invoice_email(
    invoice_id: str,
    email_override: str = None
) -> EmailResultResponse

@router.post("/invoices/generate-missing")
async def auto_generate_invoices(
    current_user: User
) -> dict
    """Generate invoices for checkout reservations without invoices"""

@router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(
    invoice_id: str,
    payment_date: datetime
) -> InvoiceOut
```

#### 2.3 Frontend - Invoice Components
**Archivo: `frontend/src/components/invoices/InvoiceList.tsx`** (NUEVO)
**Archivo: `frontend/src/components/invoices/InvoicePreview.tsx`** (NUEVO)
**Archivo: `frontend/src/components/invoices/InvoiceForm.tsx`** (NUEVO)

---

### FASE 3: Reportes Financieros

#### 3.1 Backend - Analytics Service
**Archivo: `backend/app/services/financial_reports.py`** (NUEVO)
```python
class FinancialReportService:
    """Generate comprehensive financial reports"""

    async def get_revenue_summary(
        start_date: date,
        end_date: date,
        group_by: str  # day, week, month
    ) -> RevenueSummary
        """Revenue by period with currency breakdown"""

    async def get_income_statement(
        start_date: date,
        end_date: date
    ) -> IncomeStatement
        """Profit & Loss statement"""

    async def get_cash_flow(
        start_date: date,
        end_date: date
    ) -> CashFlowReport
        """Cash in/out analysis"""

    async def get_payment_method_analysis(
        start_date: date,
        end_date: date
    ) -> PaymentMethodStats
        """Revenue by payment method"""

    async def get_guest_spending_analysis(
        limit: int = 10
    ) -> List[GuestSpendingStats]
        """Top spenders, average spend, etc"""

    async def get_outstanding_balances(
        as_of_date: date = None
    ) -> OutstandingBalancesReport
        """Who owes money and how much"""

    async def forecast_revenue(
        months: int = 12
    ) -> RevenueForecast
        """Predict future revenue based on trends"""

    async def get_tax_report(
        year: int
    ) -> TaxReport
        """Tax-ready financial summary"""
```

**Archivo: `backend/app/services/reconciliation.py`** (NUEVO)
```python
class ReconciliationService:
    """Payment reconciliation and matching"""

    async def reconcile_stripe_transactions(
        start_date: date,
        end_date: date
    ) -> ReconciliationResult
        """Match Stripe transactions to invoices"""

    async def reconcile_bank_deposits(
        deposits: List[BankDeposit]
    ) -> BankReconciliationResult
        """Match bank deposits to payments"""

    async def find_discrepancies(
        start_date: date,
        end_date: date
    ) -> List[Discrepancy]
        """Find unmatched transactions"""

    async def auto_match_payments(
        db: Session
    ) -> MatchingResult
        """Auto-match based on amount/date"""
```

#### 3.2 Backend - Routers
**Archivo: `backend/app/routers/reports.py`** (NUEVO)
```python
@router.get("/reports/revenue-summary")
async def get_revenue_summary(
    start_date: date,
    end_date: date,
    group_by: str = "day"
) -> RevenueSummaryResponse

@router.get("/reports/income-statement")
async def get_income_statement(
    start_date: date,
    end_date: date
) -> IncomeStatementResponse

@router.get("/reports/cash-flow")
async def get_cash_flow_report(
    start_date: date,
    end_date: date
) -> CashFlowResponse

@router.get("/reports/payment-methods")
async def get_payment_method_report(
    start_date: date,
    end_date: date
) -> PaymentMethodReportResponse

@router.get("/reports/top-guests")
async def get_top_guests_report(
    limit: int = 10
) -> TopGuestsResponse

@router.get("/reports/outstanding-balances")
async def get_outstanding_balances(
    as_of_date: date = None
) -> OutstandingBalancesResponse

@router.get("/reports/revenue-forecast")
async def get_revenue_forecast(
    months: int = 12
) -> RevenueForecastResponse

@router.get("/reports/tax-summary")
async def get_tax_report(
    year: int
) -> TaxReportResponse

@router.get("/reports/export/{format}")
async def export_report(
    format: str,  # csv, excel, pdf
    report_type: str,
    start_date: date,
    end_date: date
) -> FileResponse
```

#### 3.3 Frontend - Dashboard & Reports
**Archivo: `frontend/src/pages/financial/FinancialDashboard.tsx`** (NUEVO)
- KPI Cards: Total Revenue, Pending Payments, etc.
- Revenue Chart (line chart by period)
- Payment Method Breakdown (pie chart)
- Cash Flow Chart
- Recent Transactions Table
- Quick Actions

**Archivo: `frontend/src/pages/financial/ReportsPage.tsx`** (NUEVO)
- Report selector (Income Statement, Cash Flow, etc.)
- Date range picker
- Filter options
- Data table with export
- Charts and visualizations

**Archivo: `frontend/src/pages/financial/ReconciliationPage.tsx`** (NUEVO)
- Bank statement upload
- Automatic matching
- Manual matching interface
- Discrepancy list
- Reconciliation status

---

## 🔧 Tecnologías a Usar

### Backend
```
# Payment Gateways
stripe==8.5.0
stripe-cli (for local testing)
paypalrestsdk (optional, Phase 2)

# PDF Generation
reportlab==4.0.9
Pillow==10.1.0  (for images in PDFs)

# Email
fastapi-mail==1.4.1
jinja2==3.1.2

# Data Analysis
pandas==2.1.4
numpy==1.24.3

# Excel Export
openpyxl==3.1.2

# Async Tasks (for email/PDF generation)
celery==5.3.4
redis==5.0.1
```

### Frontend
```
@stripe/react-stripe-js
@stripe/stripe-js
recharts (for charts)
```

---

## 📅 Plan de Implementación

### Week 1: Foundation
- [ ] Setup Stripe account & API keys
- [ ] Create Invoice model & migration
- [ ] Implement StripeWebhookEvent model
- [ ] Create invoice service
- [ ] Implement PDF generation
- [ ] Create webhook endpoint

### Week 2: Integration
- [ ] Implement Stripe payment processing
- [ ] Create checkout session endpoint
- [ ] Build frontend checkout modal
- [ ] Test webhook handling
- [ ] Implement refund logic

### Week 3: Automation
- [ ] Auto-generate invoices on checkout
- [ ] Auto-send invoice emails
- [ ] Update invoice status on payment
- [ ] Implement payment reconciliation

### Week 4: Reporting
- [ ] Create financial dashboard
- [ ] Implement revenue reports
- [ ] Create cash flow analysis
- [ ] Implement tax report
- [ ] Add export functionality

---

## 🧪 Testing Strategy

### Backend Tests
```
# Unit Tests
- PaymentGatewayService
- InvoiceService
- FinancialReportService

# Integration Tests
- Stripe webhook handling
- Invoice generation & email
- Payment reconciliation

# End-to-End Tests
- Complete checkout flow
- Invoice creation → Payment → Email
```

### Frontend Tests
```
# Component Tests
- CheckoutModal
- InvoiceList
- PaymentMethodManager

# E2E Tests
- Complete payment flow
- Invoice download
- Report generation
```

---

## 🔒 Security Considerations

1. **PCI Compliance**
   - Use Stripe.js (not storing card data)
   - No card data in logs
   - TLS 1.2+ for all connections

2. **Webhook Security**
   - Verify Stripe signatures
   - Idempotency for webhook processing
   - Webhook event deduplication

3. **Access Control**
   - Admin only for financial reports
   - Guests only see their own invoices
   - Payment confirmation requires auth

4. **Encryption**
   - Store Stripe API keys in environment variables
   - Encrypt webhook payloads in database
   - HTTPS only for payment endpoints

---

## 📈 Success Metrics

- [ ] 100% of checkouts generate invoices automatically
- [ ] 95%+ webhook processing success rate
- [ ] Financial dashboard loads in < 2 seconds
- [ ] All reports exportable to CSV/Excel
- [ ] Zero PCI compliance violations
- [ ] Email delivery rate > 98%

---

## 📝 Configuration Required

### Environment Variables
```
# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Email
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=billing@hostal.com

# AWS S3 (for PDF storage - optional)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=hostal-invoices

# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Database Migrations
- Create invoices table
- Create invoice_line_items table
- Create stripe_webhook_events table
- Create financial_transactions table
- Update payments table with stripe_id field

---

## 🚀 Rollout Plan

1. **Development** - Local testing with Stripe test keys
2. **Staging** - Test in staging environment with live-like data
3. **Canary** - Roll out to 10% of users
4. **Full Rollout** - 100% of users
5. **Monitor** - Track errors, webhook failures, reconciliation issues

---

**Owner:** Development Team
**Status:** Planning
**Start Date:** [To Be Scheduled]
**Estimated Duration:** 4 weeks (full implementation)
