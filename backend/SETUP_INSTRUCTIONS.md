# Setup Instructions - Phase 1 Payment System

## Status: ✅ COMPLETED

- ✅ Database migrations applied
- ✅ 1,117 test data records created
- ✅ Stripe package installed
- ✅ Backend verified and running
- ✅ All payment system services implemented

## Quick Start

### 1. Activate Virtual Environment
```bash
cd backend
source venv/bin/activate
```

### 2. Start Backend Server
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The server will start at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### 3. Database Status

**Migration State**: `phase1_stripe_and_invoice_system`

View all migrations:
```bash
alembic heads
alembic current
```

### 4. Test Data

Generated test data includes:
- 100 Rooms
- 97 Guests with 97 Occupancies
- 187 Guest Devices
- 150 Reservations
- 200 Payments (various methods)
- 6 Staff Members
- 80 Maintenance Orders
- 5 Network Devices
- 300 Network Activity Records

To regenerate test data:
```bash
python generate_test_data.py
```

## Environment Variables Required

Add to `.env` in the backend directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/hostal_db

# Stripe Configuration (Optional for now)
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
STRIPE_PUBLIC_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
SECRET_KEY=your-secret-key-here
DEBUG=False (or True for development)
APP_ENV=development (or production)
```

## Payment System Features

### Venezuelan Banco Móvil Payments
- Validate phone numbers (+58 and 0XXX formats)
- Validate cedulas (V, E, J, G, P types)
- Support 40+ Venezuelan banks
- Mobile operator detection (Movistar, Digitel, ANDES)

### Stripe Integration
- Create payment intents with client_secret
- Webhook event processing with signature verification
- Automatic payment status updates
- Refund processing (full and partial)

### Endpoints Implemented
See `API_PAYMENT_ENDPOINTS_REFERENCE.md` for complete endpoint documentation

## Database Schema

7 new tables created:
1. `invoices` - Invoicing with multi-currency support
2. `invoice_line_items` - Line-item details
3. `invoice_payments` - Payment-invoice linking
4. `stripe_webhook_events` - Webhook storage
5. `stripe_webhook_logs` - Webhook audit trail
6. `financial_transactions` - Unified transaction ledger
7. `exchange_rate_snapshots` - Historical rates

Payment table enhanced with 12 Stripe fields.

## Testing the API

### Test Venezuelan Payment (Banco Móvil)
```bash
curl -X POST http://localhost:8000/api/v1/payments-v2/mobile-venezuela \
  -H "Authorization: Bearer YOUR_TOKEN" \
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
    "invoice_id": null
  }'
```

### Test Stripe Payment Intent
```bash
curl -X POST http://localhost:8000/api/v1/payments-v2/stripe/create-intent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "guest_id": 1,
    "amount": 100.00,
    "currency": "usd",
    "description": "Room payment",
    "invoice_id": null
  }'
```

### Get Stripe Payment Status
```bash
curl -X GET http://localhost:8000/api/v1/payments-v2/stripe/pi_XXXXX/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Integration (Next Phase)

The following React components need to be implemented:

1. **CheckoutModal** - Main payment modal component
   - Support for multiple payment methods
   - Stripe.js integration for card payments
   - Venezuelan payment form for Banco Móvil

2. **PaymentMethodSelector** - Choose payment method UI

3. **StripeCheckoutForm** - Stripe Elements integration
   - Card input field
   - Postal code field
   - Submit handling

4. **VenezuelanPaymentForm** - Banco Móvil form
   - Phone number input with operator detection
   - Cedula input with format validation
   - Bank dropdown
   - Transaction reference input

5. **PaymentStatusIndicator** - Show payment progress
   - Loading states
   - Success/error messages
   - Link to invoice

6. **InvoiceViewer** - Display and download invoices
   - PDF viewer
   - Download button
   - Invoice details

## Common Issues

### Issue: "Address already in use"
**Solution**: Another uvicorn instance is running on port 8000
```bash
lsof -i :8000  # Find process ID
kill -9 PID    # Kill the process
```

### Issue: "ModuleNotFoundError: No module named 'stripe'"
**Solution**: Install Stripe package
```bash
pip install stripe
```

### Issue: "type 'invoice_status' does not exist"
**Solution**: Migration needs to be re-applied
```bash
alembic downgrade 70412c1f9804
alembic upgrade phase1_stripe_and_invoice_system
```

## Next Steps

1. **Implement Frontend Components** (Phase 2)
   - Create React checkout modal
   - Integrate Stripe.js
   - Build payment forms

2. **Invoice Management**
   - PDF generation
   - Email delivery
   - Invoice viewer

3. **Financial Reporting**
   - Dashboard with payment analytics
   - Transaction reports
   - Tax reporting

4. **PayPal Integration**
   - PayPal button implementation
   - Webhook handling
   - Refund processing

## Security Checklist

- ✅ HMAC-SHA256 webhook signature verification
- ✅ Role-based access control on all endpoints
- ✅ PCI compliance (Stripe handles card data)
- ✅ Audit logging for all operations
- ✅ Input validation and error handling
- ⚠️ TODO: Enable HTTPS in production
- ⚠️ TODO: Configure CORS properly for production
- ⚠️ TODO: Set strong SECRET_KEY for production
- ⚠️ TODO: Enable database backups

## Documentation

- `PAYMENT_SYSTEM_IMPLEMENTATION_GUIDE.md` - Technical reference
- `API_PAYMENT_ENDPOINTS_REFERENCE.md` - API endpoints documentation
- `PAYMENT_SYSTEM_PLAN.md` - 4-week implementation plan

## Support

For issues or questions:
1. Check webhook logs in `stripe_webhook_events` table
2. Review financial transactions in `financial_transactions` table
3. Check audit logs in `audit_logs` table
4. Review error logs in application console

## Version Info

- Python: 3.12
- FastAPI: latest
- SQLAlchemy: 2.x
- PostgreSQL: 12+
- Stripe: 14.0.0
- Alembic: latest
