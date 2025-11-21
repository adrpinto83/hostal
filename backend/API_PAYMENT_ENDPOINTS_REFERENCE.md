# Payment System API - Quick Reference

## Endpoints Summary

### Venezuelan Banco Móvil Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/payments-v2/mobile-venezuela` | Create Banco Móvil payment | Admin, Recep |
| GET | `/api/v1/payments-v2/mobile-venezuela/info` | Get payment info | Public |
| GET | `/api/v1/payments-v2/mobile-venezuela/banks` | List valid banks | Public |
| GET | `/api/v1/payments-v2/mobile-venezuela/operators` | List mobile operators | Public |
| POST | `/api/v1/payments-v2/validate/phone` | Validate phone | Public |
| POST | `/api/v1/payments-v2/validate/cedula` | Validate cédula | Public |
| POST | `/api/v1/payments-v2/validate/bank-code` | Validate bank code | Public |
| POST | `/api/v1/payments-v2/validate/transaction-ref` | Validate transaction ref | Public |

### Stripe Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/payments-v2/stripe/create-intent` | Create PaymentIntent | Admin, Recep |
| GET | `/api/v1/payments-v2/stripe/{payment_intent_id}/status` | Check intent status | Admin, Recep |
| POST | `/api/v1/payments-v2/stripe/{payment_id}/refund` | Refund Stripe payment | Admin |

### Payment Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/payments-v2/{payment_id}` | Get payment details | Admin, Owner, Guest |
| GET | `/api/v1/payments-v2/guest/{guest_id}` | Get guest payments | Admin, Recep |
| POST | `/api/v1/payments-v2/{payment_id}/refund` | Refund payment | Admin |

### Webhooks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/webhooks/stripe` | Stripe webhook handler | Signature |

---

## Detailed Endpoint Documentation

### POST /api/v1/payments-v2/mobile-venezuela

Create a Banco Móvil payment for Venezuela.

**Request Body**:
```json
{
  "guest_id": 1,
  "amount": 100000,
  "currency": "VES",
  "phone_number": "0414-1234567",
  "cedula": "V-12.345.678",
  "bank_code": "0102",
  "transaction_reference": "123456",
  "description": "Pago de reserva",
  "invoice_id": 1,
  "reservation_id": 1
}
```

**Response**:
```json
{
  "success": true,
  "payment_id": 123,
  "gateway_transaction_id": "123456",
  "message": "Pago registrado exitosamente...",
  "data": {
    "phone_number": "0414-1234567",
    "bank_name": "BANCO DE VENEZUELA",
    "mobile_operator": "Movistar",
    "amount": 100000,
    "currency": "VES"
  }
}
```

---

### GET /api/v1/payments-v2/mobile-venezuela/info

Get Venezuelan mobile payment system information.

**Response**:
```json
{
  "banks": [
    {
      "code": "0001",
      "name": "BANCO DE VENEZUELA",
      "name_es": "BANCO DE VENEZUELA"
    },
    ...
  ],
  "mobile_operators": {
    "0414": "Movistar",
    "0424": "Movistar",
    "0412": "Digitel",
    "0416": "Digitel",
    "0426": "Digitel",
    "0410": "ANDES",
    "0430": "ANDES",
    "0440": "ANDES"
  },
  "instructions": {
    "es": "Realice una transferencia por Banco Móvil...",
    "en": "Make a transfer via Mobile Banking..."
  }
}
```

---

### GET /api/v1/payments-v2/mobile-venezuela/banks

List all valid Venezuelan banks for Banco Móvil.

**Response**:
```json
{
  "banks": [
    {"code": "0001", "name": "BANCO DE VENEZUELA", "name_es": "BANCO DE VENEZUELA"},
    {"code": "0002", "name": "BANESCO", "name_es": "BANESCO"},
    ...
  ],
  "total": 40
}
```

---

### GET /api/v1/payments-v2/mobile-venezuela/operators

List mobile operators in Venezuela.

**Response**:
```json
{
  "0414": "Movistar",
  "0424": "Movistar",
  "0412": "Digitel",
  "0416": "Digitel",
  "0426": "Digitel",
  "0410": "ANDES",
  "0430": "ANDES",
  "0440": "ANDES"
}
```

---

### POST /api/v1/payments-v2/validate/phone

Validate a Venezuelan phone number.

**Request Body**:
```json
{
  "phone_number": "0414-1234567"
}
```

**Response**:
```json
{
  "valid": true,
  "phone_number": "0414-1234567",
  "operator": "Movistar",
  "operator_code": "0414"
}
```

---

### POST /api/v1/payments-v2/validate/cedula

Validate a Venezuelan cédula.

**Request Body**:
```json
{
  "cedula": "V-12.345.678"
}
```

**Response**:
```json
{
  "valid": true,
  "cedula": "V-12.345.678"
}
```

---

### POST /api/v1/payments-v2/stripe/create-intent

Create a Stripe PaymentIntent for card payments.

**Request Body**:
```json
{
  "guest_id": 1,
  "amount": 100.00,
  "currency": "usd",
  "description": "Room payment for Room 101",
  "invoice_id": 1,
  "reservation_id": 1
}
```

**Response**:
```json
{
  "success": true,
  "payment_id": 456,
  "gateway_transaction_id": "pi_1234567890",
  "message": "PaymentIntent creado: pi_1234567890",
  "data": {
    "client_secret": "pi_1234567890_secret_abcdef",
    "payment_intent_id": "pi_1234567890",
    "amount": 100.00,
    "currency": "usd",
    "status": "requires_payment_method"
  }
}
```

**Frontend Usage**:
```javascript
// Use the client_secret with Stripe.js to confirm payment
const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: {
      name: guestName,
      email: guestEmail
    }
  }
});
```

---

### GET /api/v1/payments-v2/stripe/{payment_intent_id}/status

Check the status of a Stripe PaymentIntent.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 10000,
    "currency": "usd",
    "status": "succeeded",
    "client_secret": "pi_1234567890_secret_abcdef",
    "charges": [
      {
        "id": "ch_1234567890",
        "status": "succeeded",
        "amount": 10000
      }
    ]
  }
}
```

---

### POST /api/v1/payments-v2/stripe/{payment_id}/refund

Process a refund for a Stripe payment.

**Request Body**:
```json
{
  "amount": 50.00,
  "reason": "requested_by_customer"
}
```

**Response**:
```json
{
  "success": true,
  "payment_id": 456,
  "gateway_transaction_id": "re_1234567890",
  "message": "Reembolso de 50.00 USD procesado",
  "data": {
    "refund_id": "re_1234567890",
    "amount": 50.00,
    "currency": "usd",
    "status": "succeeded"
  }
}
```

---

### POST /api/v1/webhooks/stripe

Stripe webhook endpoint. Automatically called by Stripe when payment events occur.

**Headers Required**:
```
stripe-signature: t=timestamp,v1=signature
```

**Response**:
```json
{
  "success": true,
  "message": "Pago confirmado por Stripe"
}
```

---

### GET /api/v1/payments-v2/{payment_id}

Get payment details.

**Response**:
```json
{
  "id": 123,
  "guest_id": 1,
  "amount": 100000,
  "currency": "VES",
  "method": "mobile_payment",
  "status": "completed",
  "reference_number": "123456",
  "payment_date": "2024-01-15T10:30:00",
  "notes": "Pago de reserva..."
}
```

---

### GET /api/v1/payments-v2/guest/{guest_id}

Get payment history for a guest.

**Query Parameters**:
- `limit`: Max results (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)

**Response**:
```json
{
  "total": 5,
  "limit": 50,
  "offset": 0,
  "payments": [
    {
      "id": 1,
      "amount": 100000,
      "currency": "VES",
      "method": "mobile_payment",
      "status": "completed",
      "payment_date": "2024-01-15T10:30:00"
    },
    ...
  ],
  "summary": {
    "completed": 500000,
    "pending": 100000,
    "failed": 0,
    "refunded": 0
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error message here",
  "errors": {
    "field_name": "Error description"
  }
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Permiso denegado"
}
```

### 404 Not Found
```json
{
  "detail": "Payment not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": {
    "error": "Internal server error message"
  }
}
```

---

## Phone Format Examples

Valid formats for Venezuelan phone numbers:

| Format | Example | Description |
|--------|---------|-------------|
| International with dashes | `+58-414-1234567` | Country code + dashes |
| International no dashes | `+584141234567` | Country code + continuous |
| National with dashes | `0414-1234567` | Area code + dashes |
| National no dashes | `04141234567` | Area code + continuous |

---

## Cédula Format Examples

Valid formats for Venezuelan ID numbers:

| Type | Format | Example |
|------|--------|---------|
| Venezolana | `V-XX.XXX.XXX` | `V-12.345.678` |
| Venezolana | `VXX.XXX.XXX` | `V12.345.678` |
| Extranjería | `E-XX.XXX.XXX` | `E-12.345.678` |
| Jurídica | `J-XX.XXX.XXX` | `J-12.345.678` |
| Gubernamental | `G-XX.XXX.XXX` | `G-12.345.678` |
| Pasaporte | `P-XX.XXX.XXX` | `P-12.345.678` |

---

## Bank Codes

Common Venezuelan bank codes for Banco Móvil:

| Code | Bank Name |
|------|-----------|
| 0001 | BANCO DE VENEZUELA |
| 0002 | BANESCO |
| 0004 | CITIBANK |
| 0005 | BANCO MERCANTIL |
| 0008 | BANCO PROVINCIAL |
| 0006 | BANCO OCCIDENTAL |
| 0009 | BANCO CARONI |
| 0021 | SANTANDER |
| 0027 | HSBC |
| 0032 | SCOTIABANK |

See `/api/v1/payments-v2/mobile-venezuela/banks` for complete list.

---

## Rate Limiting

Current rate limits per endpoint:
- Public endpoints: 100 requests per minute
- Authenticated endpoints: 200 requests per minute
- Webhook endpoints: No limit (signature verified)

---

## Testing Credentials

### Stripe Test Keys
```
STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Test Card Numbers
- **Visa**: `4242 4242 4242 4242`
- **Visa (debit)**: `4000 0566 5566 5556`
- **Mastercard**: `5555 5555 5555 4444`
- **Amex**: `3782 822463 10005`

Use any future expiry date and any 3-digit CVC.
