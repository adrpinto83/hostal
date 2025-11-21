# 💳 Payment System Integration Guide

## Overview

The payment system supports two main payment methods:
1. **Stripe** - Credit/Debit card payments in USD, EUR
2. **Banco Móvil** - Venezuelan mobile bank transfers in VES

## Installation

### 1. Install Dependencies

```bash
npm install @stripe/react-stripe-js @stripe/js
```

### 2. Setup Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Then add your Stripe publishable key:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
VITE_API_BASE_URL=http://localhost:8000
```

Get your Stripe key from: https://dashboard.stripe.com/apikeys

### 3. Wrap App with StripeProvider

In `main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { StripeProvider } from './components/payments/StripeProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StripeProvider>
      <App />
    </StripeProvider>
  </React.StrictMode>,
)
```

## Usage

### Basic Usage

```tsx
import { useState } from 'react'
import { CheckoutModal } from '@/components/payments/CheckoutModal'
import { Button } from '@/components/ui/button'

export function PaymentExample() {
  const [isOpen, setIsOpen] = useState(false)

  const handlePaymentSuccess = (paymentId: number, token?: string) => {
    console.log('Payment successful!', paymentId)
    // Update your UI, redirect user, etc.
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Procesar Pago
      </Button>

      <CheckoutModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        guestId={1}
        amount={100}
        currency="usd"
        invoiceId={1}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  )
}
```

### Using the usePayment Hook

For more control over payment logic:

```tsx
import { usePayment } from '@/hooks/usePayment'

export function PaymentForm() {
  const { createStripeIntent, isLoading, error } = usePayment()

  const handleCreatePayment = async () => {
    try {
      const clientSecret = await createStripeIntent({
        guestId: 1,
        amount: 100,
        currency: 'usd',
        invoiceId: 1,
      })
      console.log('Client secret:', clientSecret)
    } catch (err) {
      console.error('Payment failed:', err)
    }
  }

  return (
    <button onClick={handleCreatePayment} disabled={isLoading}>
      {isLoading ? 'Processing...' : 'Create Payment'}
    </button>
  )
}
```

## Component Props

### CheckoutModal

```typescript
interface CheckoutModalProps {
  isOpen: boolean                          // Show/hide modal
  onClose: () => void                     // Called when modal closes
  guestId: number                         // Guest ID
  amount: number                          // Payment amount
  currency?: 'usd' | 'ves' | 'eur'       // Currency (default: 'usd')
  invoiceId?: number                      // Optional invoice ID
  reservationId?: number                  // Optional reservation ID
  onPaymentSuccess?: (paymentId: number, token?: string) => void
}
```

### StripeCheckoutForm

Used internally by CheckoutModal. Shows card input form.

### VenezuelanPaymentForm

Used internally by CheckoutModal. Shows Banco Móvil form.
- Auto-validates phone, cedula, bank code, transaction reference
- Shows mobile operator detection
- Supports all Venezuelan banks

## API Endpoints Used

The payment components interact with these backend endpoints:

### Create Stripe PaymentIntent
```
POST /api/v1/payments-v2/stripe/create-intent
```

### Create Banco Móvil Payment
```
POST /api/v1/payments-v2/mobile-venezuela
```

### Get Payment Status
```
GET /api/v1/payments-v2/stripe/{payment_intent_id}/status
```

### Validate Phone
```
POST /api/v1/payments-v2/validate/phone
```

### Validate Cedula
```
POST /api/v1/payments-v2/validate/cedula
```

### Validate Bank Code
```
POST /api/v1/payments-v2/validate/bank-code
```

### Validate Transaction Reference
```
POST /api/v1/payments-v2/validate/transaction-ref
```

See backend documentation for full API reference.

## Features

### Stripe Payments
- ✅ Card element with validation
- ✅ Real-time error feedback
- ✅ Automatic 3D Secure handling
- ✅ Support for USD, EUR
- ✅ Multi-currency display
- ✅ Transaction confirmation

### Banco Móvil Payments
- ✅ Phone number validation (supports +58 and 0XXX formats)
- ✅ Venezuelan cedula validation (V, E, J, G, P types)
- ✅ Bank selection dropdown (40+ banks)
- ✅ Mobile operator detection (Movistar, Digitel, ANDES)
- ✅ Transaction reference validation
- ✅ Real-time validation feedback
- ✅ VES currency only

## Security

### Frontend Security
- Uses Stripe Elements (PCI compliant)
- Never handles card data directly
- All validation on frontend + backend
- Secure token transmission
- CORS headers enforced by backend

### Backend Security
- HMAC-SHA256 webhook verification
- Role-based access control
- Input validation and sanitization
- Audit logging for all operations
- PCI compliance (no card storage)

## Error Handling

Both forms include comprehensive error handling:

```tsx
const handlePaymentError = (error: string) => {
  toast.error(error)
  // Handle error appropriately
}
```

Common errors:
- Invalid card number
- Expired card
- Invalid CVV
- Stripe not initialized
- Network errors
- Validation errors

## Testing

### Test Cards for Stripe

Use these test card numbers in development:

| Card | Number | CVC | Date |
|------|--------|-----|------|
| Visa | 4242 4242 4242 4242 | Any 3 digits | Any future date |
| Visa (debit) | 4000 0566 5566 5556 | Any 3 digits | Any future date |
| Mastercard | 5555 5555 5555 4444 | Any 3 digits | Any future date |
| Amex | 3782 822463 10005 | Any 4 digits | Any future date |

### Test Credentials

Use these for backend testing:

```
Admin User:
  Email: admin@hostal.local
  Password: admin123

Recepcionista:
  Email: recepcionista@hostal.local
  Password: recep123
```

## Styling

All components use Tailwind CSS and work with existing UI components:
- `Button`
- `Input`
- `Label`
- `Card`

Customize styling by modifying component className attributes.

## Common Issues

### "Stripe is not defined"
- Check that StripeProvider wraps your app
- Verify VITE_STRIPE_PUBLISHABLE_KEY is set
- Check browser console for errors

### "CardElement is not mounted"
- Ensure parent component is wrapped with Elements provider
- Check that CardElement is inside a form

### "User not approved"
- Login with approved user (admin or recepcionista)
- Contact system admin to approve account

### "Payment failed"
- Check network tab for API errors
- Verify backend is running
- Check auth token is valid
- Review backend logs

## Advanced Usage

### Custom Payment Flow

For custom payment flows, use the `usePayment` hook:

```tsx
const {
  createStripeIntent,
  getPaymentStatus,
  processMobilePayment,
  refundPayment,
  getPaymentDetails,
  getGuestPayments,
  isLoading,
  error,
  success,
  reset,
} = usePayment()

// Create payment
const clientSecret = await createStripeIntent({...})

// Check status
const status = await getPaymentStatus(paymentIntentId)

// Process mobile payment
const paymentId = await processMobilePayment({...})

// Refund payment
const refund = await refundPayment(paymentId)

// Get payment details
const payment = await getPaymentDetails(paymentId)

// Get guest payment history
const history = await getGuestPayments(guestId)
```

### Webhook Handling

The backend automatically handles Stripe webhooks. For manual webhook handling:

```tsx
// Backend updates payment status via webhook
// Frontend can poll for status:

const checkPaymentStatus = async (paymentIntentId: string) => {
  const status = await getPaymentStatus(paymentIntentId)
  console.log(status) // { status: 'succeeded', ... }
}

// Or listen for success callback from CheckoutModal
onPaymentSuccess={(paymentId) => {
  // Payment confirmed by webhook or form submission
}}
```

## Next Steps

1. **Configure Stripe Key** - Get key from Stripe dashboard
2. **Set Environment Variables** - Add to `.env`
3. **Wrap App with Provider** - Add StripeProvider to main.tsx
4. **Integrate CheckoutModal** - Use in your components
5. **Test Payment Flow** - Try test cards and API

## Support

- Backend Documentation: See `backend/PAYMENT_SYSTEM_IMPLEMENTATION_GUIDE.md`
- API Reference: See `backend/API_PAYMENT_ENDPOINTS_REFERENCE.md`
- Stripe Docs: https://stripe.com/docs
- React Stripe: https://stripe.com/docs/stripe-js/react

## Changelog

### v1.0.0 (Current)
- Initial implementation of payment system
- Stripe integration with Elements
- Banco Móvil support for Venezuelan payments
- Complete validation and error handling
- usePayment hook for custom flows
