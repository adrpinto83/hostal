# Phase 1 - Payment System Implementation Guide

## Overview

This document describes the complete implementation of Phase 1 of the hostal management system's improved payment system. Phase 1 includes:

1. **Database Models** - Complete invoice, webhook, and financial transaction tracking
2. **Payment Validation Services** - Venezuelan mobile payment validation and general payment validation
3. **Payment Gateway Service** - Unified interface for multiple payment methods
4. **Stripe Integration** - Full Stripe payment processing with webhook support
5. **REST API Endpoints** - Complete payment processing endpoints
6. **Webhook Handling** - Automatic processing of payment provider webhooks

## Completed Components

### 1. Database Models

#### Invoice System
**File**: `app/models/invoice.py`

- **Invoice**: Tracks invoices with multi-currency support
  - Supports partial payments and payment tracking
  - PDF generation and email delivery tracking
  - Automatic calculation of remaining balance
  - Associated line items and payments

- **InvoiceLineItem**: Individual line items in an invoice
  - Support for different item types (service, charge, discount, tax)
  - Quantity and unit price tracking

- **InvoicePayment**: Link between payments and invoices
  - Tracks which payments are applied to which invoices

#### Stripe Webhook Integration
**File**: `app/models/stripe_webhook_event.py`

- **StripeWebhookEvent**: Stores incoming webhook events
  - Event deduplication to prevent double-processing
  - Detailed error logging and retry tracking
  - Webhook signature verification support

- **StripeWebhookLog**: Audit trail for webhook processing
  - Tracks processing status and errors
  - Retry history and timestamps

#### Financial Transactions
**File**: `app/models/financial_transaction.py`

- **FinancialTransaction**: Unified transaction ledger
  - All payments are recorded here for reporting
  - Tracks transaction type, status, and error information
  - Links to payments, invoices, and guests

- **ExchangeRateSnapshot**: Historical exchange rate records
  - Records rates at transaction time for accurate reporting
  - Supports multi-currency conversion

### 2. Payment Validation Services

#### Venezuelan Mobile Payment Validation
**File**: `app/services/payment_validators.py`

**VenezuelanBankCode Enum**
- 40+ Venezuelan banks with 4-digit codes
- Examples: 0001 (Banco de Venezuela), 0002 (Banesco), etc.

**VenezuelanMobilePaymentValidator Class**
- **Phone Validation**: Supports multiple formats
  - International: `+58-414-1234567`
  - National: `0414-1234567`
  - Minimal: `04141234567`
  - Detects mobile operator (Movistar, Digitel, ANDES)

- **Cédula Validation**: Venezuelan ID validation
  - Types: V (Venezolana), E (Extranjería), J (Jurídica), G (Gubernamental), P (Pasaporte)
  - Formats: `V-12.345.678` or `V12345678`

- **Bank Code Validation**: 4-digit bank codes
  - Validates against known Venezuelan banks

- **Transaction Reference Validation**: 6-20 alphanumeric characters
  - Ensures proper format for transaction reference

- **Complete Request Validation**: Validates entire payment request
  - Returns normalized data ready for processing
  - Mobile operator and bank name lookups included

**PaymentValidator Class**
- Email validation
- Amount validation (min/max limits)
- Currency validation (VES, USD, EUR)
- Payment method validation

### 3. Payment Gateway Service

**File**: `app/services/payment_gateway.py`

**PaymentGatewayService Class**
- Unified interface for multiple payment methods
- Supports: Stripe, PayPal, Manual payments, Venezuelan Mobile

**Key Methods**:

```python
async def process_mobile_payment_venezuela(
    guest_id, amount, currency, phone_number, cedula,
    bank_code, transaction_reference, description,
    invoice_id, reservation_id, user_id
) -> PaymentResult
```
- Validates all Venezuelan mobile payment data
- Creates payment record in database
- Links to invoices and updates invoice status
- Logs to financial transactions for reporting

```python
async def refund_payment(
    payment_id, amount, reason, user_id
) -> PaymentResult
```
- Processes refunds (full or partial)
- Updates payment and invoice status
- Logs refund transaction

### 4. Stripe Integration Service

**File**: `app/services/stripe_service.py`

**StripeService Class**
- Complete Stripe payment processing
- Webhook event handling
- Refund processing

**Key Methods**:

```python
async def create_payment_intent(
    amount, currency, guest_id, description,
    invoice_id, reservation_id, metadata, user_id
) -> PaymentResult
```
- Creates a Stripe PaymentIntent
- Stores payment record with Stripe reference
- Returns client_secret for frontend processing

```python
async def process_webhook(
    payload, signature
) -> PaymentResult
```
- Verifies webhook signature using HMAC-SHA256
- Deduplicates webhook events
- Routes events to appropriate handlers
- Automatically updates payment status

```python
async def refund_payment(
    payment_id, amount, reason, user_id
) -> PaymentResult
```
- Creates Stripe refund
- Updates payment status
- Logs to financial transactions

**Webhook Events Handled**:
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

### 5. REST API Endpoints

#### Venezuelan Mobile Payment Endpoints
**File**: `app/routers/payments_v2.py`

```
POST /api/v1/payments-v2/mobile-venezuela
```
- Create a Banco Móvil payment
- Full validation and invoice linking
- Requires: admin or recepcionista role

```
GET /api/v1/payments-v2/mobile-venezuela/info
```
- Get payment system information
- Banks list and operators

```
POST /api/v1/payments-v2/validate/phone
```
- Validate Venezuelan phone number
- Returns operator information

```
POST /api/v1/payments-v2/validate/cedula
```
- Validate Venezuelan cédula
- Normalizes format

```
POST /api/v1/payments-v2/validate/bank-code
```
- Validate bank code

```
POST /api/v1/payments-v2/validate/transaction-ref
```
- Validate transaction reference

```
GET /api/v1/payments-v2/mobile-venezuela/banks
```
- Complete list of valid banks with codes

```
GET /api/v1/payments-v2/mobile-venezuela/operators
```
- List of mobile operators with codes

#### Stripe Payment Endpoints

```
POST /api/v1/payments-v2/stripe/create-intent
```
- Create a Stripe PaymentIntent
- Returns client_secret for frontend
- Parameters: guest_id, amount, currency, description, invoice_id, reservation_id
- Requires: admin or recepcionista role

```
GET /api/v1/payments-v2/stripe/{payment_intent_id}/status
```
- Check PaymentIntent status from Stripe
- Useful for frontend polling
- Requires: admin or recepcionista role

```
POST /api/v1/payments-v2/stripe/{payment_id}/refund
```
- Process a Stripe refund
- Parameters: amount (optional), reason
- Requires: admin role only

#### Payment History Endpoints

```
GET /api/v1/payments-v2/{payment_id}
```
- Get payment details
- Accessible by payment creator, guest, or admin

```
GET /api/v1/payments-v2/guest/{guest_id}
```
- Get guest payment history
- Includes payment summary by status
- Requires: admin or recepcionista role

```
POST /api/v1/payments-v2/{payment_id}/refund
```
- Generic refund endpoint (uses PaymentGatewayService)
- Requires: admin role

### 6. Webhook Router

**File**: `app/routers/webhooks.py`

```
POST /api/v1/webhooks/stripe
```
- Handles Stripe webhook events
- Verifies webhook signature
- Deduplicates events
- Processes payment updates automatically
- Returns 200 OK on success

**Webhook Configuration**:
- Set your Stripe webhook URL to: `https://yourdomain.com/api/v1/webhooks/stripe`
- Stripe will send events to this endpoint
- Enable events: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded

## Environment Configuration

Create a `.env` file with:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_PUBLIC_KEY=pk_live_... (or pk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook endpoint settings)

# Multi-currency
SUPPORTED_CURRENCIES=VES,USD,EUR
DEFAULT_CURRENCY=VES
```

## Database Migration

Run the Phase 1 migration:

```bash
cd backend
alembic upgrade phase1_stripe_and_invoice_system
```

This creates:
- 7 new enum types
- 14 new tables
- 25+ performance indices

## API Usage Examples

### Creating a Venezuelan Mobile Payment

```bash
curl -X POST http://localhost:8000/api/v1/payments-v2/mobile-venezuela \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": 1,
    "amount": 100000,
    "currency": "VES",
    "phone_number": "0414-1234567",
    "cedula": "V-12.345.678",
    "bank_code": "0102",
    "transaction_reference": "123456",
    "description": "Pago de reserva",
    "invoice_id": 1
  }'
```

### Creating a Stripe Payment Intent

```bash
curl -X POST http://localhost:8000/api/v1/payments-v2/stripe/create-intent \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": 1,
    "amount": 100.00,
    "currency": "usd",
    "description": "Room payment",
    "invoice_id": 1
  }'
```

Response:
```json
{
  "success": true,
  "payment_id": 123,
  "data": {
    "client_secret": "pi_1234567890_secret_abcdef",
    "payment_intent_id": "pi_1234567890",
    "amount": 100.00,
    "currency": "usd"
  }
}
```

### Processing a Refund

```bash
curl -X POST http://localhost:8000/api/v1/payments-v2/stripe/1/refund \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "reason": "requested_by_customer"
  }'
```

## Frontend Integration (Next Phase)

The following components need to be implemented in React:

1. **PaymentMethodSelector** - Let user choose payment method
2. **StripeCheckoutModal** - Integrate Stripe Elements
3. **VenezuelanPaymentForm** - Form for Banco Móvil payments
4. **PaymentStatusDisplay** - Show payment status and history
5. **InvoiceGenerator** - Display and download invoices

## Security Considerations

1. **Webhook Signature Verification**: All Stripe webhooks are verified using HMAC-SHA256
2. **Role-Based Access Control**: Payment endpoints require appropriate user roles
3. **Audit Logging**: All payment operations are logged for compliance
4. **PCI Compliance**: Never store card data - Stripe handles all sensitive data
5. **Secure Configuration**: API keys are environment variables, never hardcoded

## Testing Checklist

- [ ] Create Venezuelan mobile payment with valid data
- [ ] Validate Venezuelan phone numbers (all formats)
- [ ] Validate Venezuelan cédulas (all types)
- [ ] Create Stripe PaymentIntent
- [ ] Process Stripe webhook (test event)
- [ ] Verify webhook deduplication
- [ ] Process refund (full and partial)
- [ ] Check invoice status updates
- [ ] Verify financial transaction logging
- [ ] Test role-based access control
- [ ] Verify audit logging

## Next Steps

**Phase 2** will include:
1. Frontend React components (CheckoutModal, PaymentForm, etc.)
2. Invoice PDF generation and email delivery
3. Financial reporting endpoints and dashboard
4. PayPal integration
5. Payment reconciliation features
6. Tax report generation

## Support

For issues or questions:
1. Check webhook logs in `stripe_webhook_events` table
2. Review financial transactions in `financial_transactions` table
3. Check audit logs in `audit_logs` table
4. Enable debug logging in development environment
