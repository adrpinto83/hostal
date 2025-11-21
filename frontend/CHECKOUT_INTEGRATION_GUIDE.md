# 📍 CheckoutModal Integration Guide - Where to See It

## Overview

The CheckoutModal payment system is now integrated into your application. Here's exactly where you can see and use it.

---

## ✅ What Was Done

### 1. **StripeProvider Wrapper (main.tsx)**
- ✅ Added StripeProvider to wrap entire application
- ✅ Enables Stripe Elements and payment context everywhere
- ✅ Loads from `VITE_STRIPE_PUBLISHABLE_KEY` environment variable

```tsx
<React.StrictMode>
  <StripeProvider>
    <App />
  </StripeProvider>
</React.StrictMode>
```

### 2. **PaymentList Page (src/pages/payments/PaymentList.tsx)**
- ✅ Added CheckoutModal import
- ✅ Added Stripe/Banco Móvil buttons to UI
- ✅ Wired up payment success to refresh payment list

---

## 🎯 WHERE TO SEE IT

### **Location 1: Payments Page (`/payments`)**

#### What You'll See:
```
┌─────────────────────────────────────────────┐
│  Pagos                                      │
│  150 registros encontrados                  │
├─────────────────────────────────────────────┤
│ [Filtros] [Pago Manual] [Pagar Tarjeta] [Banco Móvil] │
└─────────────────────────────────────────────┘
```

#### Button Actions:
1. **"Pago Manual"** → Opens old form for cash/transfer entries
2. **"Pagar con Tarjeta"** ← NEW - Opens CheckoutModal with Stripe form
3. **"Banco Móvil VES"** ← NEW - Opens CheckoutModal with Venezuelan form

#### Click Flow:
```
User clicks "Pagar con Tarjeta"
         ↓
    CheckoutModal opens with tabs:
    - Stripe Card Form
    - Banco Móvil Form
         ↓
   User selects payment method and enters details
         ↓
    Payment processed via backend
         ↓
    Payment list automatically refreshes
         ↓
    Modal closes
```

#### What Happens:
- When you click **"Pagar con Tarjeta"**, a modal appears with:
  - Guest selection dropdown
  - Amount and currency inputs
  - Two tabs: "Tarjeta" and "Banco Móvil"

- **Stripe Tab** (Credit Cards):
  - Card element from Stripe
  - Full card validation
  - 3D Secure support
  - USD/EUR support

- **Banco Móvil Tab** (Venezuelan):
  - Phone number field (with format detection)
  - Cedula field (Venezuelan ID)
  - Bank dropdown (40+ banks)
  - Transaction reference field
  - VES currency only

---

## 🚀 How to Test It

### **Step 1: Setup Environment Variables**

Create `.env` in frontend directory:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

Get your test key from: https://dashboard.stripe.com/apikeys

### **Step 2: Start the Application**

```bash
cd frontend
npm install  # if needed
npm run dev
```

### **Step 3: Navigate to Payments Page**

1. Login with: `admin@hostal.local` / `admin123`
2. Click "Pagos" in sidebar
3. You'll see the three payment buttons in the top right

### **Step 4: Click Payment Buttons**

**Try "Pagar con Tarjeta":**
- Guest selection: Choose any guest
- Amount: Enter 100
- Currency: USD
- Click "Tarjeta" tab
- Card number: `4242 4242 4242 4242` (test card)
- Expiry: Any future date
- CVC: 123
- Click "Pagar"

**Try "Banco Móvil VES":**
- Guest selection: Choose any guest
- Amount: Enter 100,000
- Currency: Will auto-set to VES
- Click "Banco Móvil" tab
- Phone: +58414XXXXXXX or 0414XXXXXXX
- Cedula: V12345678
- Bank: Select from dropdown
- Reference: 123456
- Click "Pagar"

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── main.tsx ✅ (UPDATED - Added StripeProvider)
│   ├── pages/
│   │   └── payments/
│   │       └── PaymentList.tsx ✅ (UPDATED - Added CheckoutModal buttons)
│   ├── components/
│   │   └── payments/
│   │       ├── CheckoutModal.tsx ✅ (NEW - Main payment modal)
│   │       ├── StripeCheckoutForm.tsx ✅ (NEW - Card payment form)
│   │       ├── VenezuelanPaymentForm.tsx ✅ (NEW - Banco Móvil form)
│   │       ├── StripeProvider.tsx ✅ (NEW - Context provider)
│   │       └── CheckoutExample.tsx ✅ (NEW - Usage example)
│   └── hooks/
│       └── usePayment.ts ✅ (NEW - Payment logic hook)
├── .env ← Create this file with your Stripe key
└── PAYMENT_INTEGRATION.md ← Complete integration documentation
```

---

## 🔄 Data Flow Diagram

```
┌─────────────┐
│  PaymentList│
│   Component │
└──────┬──────┘
       │ User clicks "Pagar con Tarjeta"
       ↓
┌─────────────────────────────┐
│  CheckoutModal              │
│  - Shows guest dropdown      │
│  - Shows amount input        │
│  - Shows currency selector   │
│  - Shows payment method tabs │
└──────┬──────────────────────┘
       │ User selects Stripe or Banco Móvil
       ↓
   ┌───────────────────────────────────┐
   │  StripeCheckoutForm OR            │
   │  VenezuelanPaymentForm            │
   │  - Real-time validation           │
   │  - Async field validation         │
   │  - Error messages                 │
   └──────┬────────────────────────────┘
          │ User submits form
          ↓
   ┌─────────────────────────────┐
   │  usePayment Hook            │
   │  - Calls API endpoint       │
   │  - Shows loading state      │
   │  - Handles errors           │
   └──────┬──────────────────────┘
          │
          ↓
   ┌──────────────────────────────┐
   │  Backend API                 │
   │  /payments-v2/stripe/...     │
   │  /payments-v2/mobile-...     │
   └──────┬───────────────────────┘
          │
          ↓
   ┌──────────────────────────────┐
   │  Payment Processed           │
   │  - Stripe processes card     │
   │  - Manual entry for Banco    │
   │  - Returns payment ID        │
   └──────┬───────────────────────┘
          │
          ↓
   ┌──────────────────────────────┐
   │  PaymentSuccess Callback     │
   │  - Refresh payment list      │
   │  - Close modal               │
   │  - Show success message      │
   └──────────────────────────────┘
```

---

## 🎨 Component Props

### CheckoutModal
```typescript
interface CheckoutModalProps {
  isOpen: boolean              // Controls visibility
  onClose: () => void         // Called when modal closes
  guestId: number             // Which guest making payment
  amount: number              // Payment amount
  currency?: 'usd' | 'ves' | 'eur'  // Currency (defaults to 'usd')
  invoiceId?: number          // Optional invoice reference
  reservationId?: number      // Optional reservation reference
  onPaymentSuccess?: (paymentId: number, token?: string) => void
}
```

---

## 🔌 API Endpoints Called

When you use the CheckoutModal, these backend endpoints are called:

### Stripe Payments:
```
POST /api/v1/payments-v2/stripe/create-intent
{
  "guest_id": 1,
  "amount": 100,
  "currency": "usd",
  "invoice_id": null,
  "reservation_id": null
}
```

### Banco Móvil Payments:
```
POST /api/v1/payments-v2/mobile-venezuela
{
  "guest_id": 1,
  "amount": 100000,
  "currency": "VES",
  "phone_number": "+58414XXXXXXX",
  "cedula": "V12345678",
  "bank_code": "0102",
  "transaction_reference": "123456",
  "description": "Payment for reservation"
}
```

### Validation Endpoints:
```
POST /api/v1/payments-v2/validate/phone
POST /api/v1/payments-v2/validate/cedula
POST /api/v1/payments-v2/validate/bank-code
POST /api/v1/payments-v2/validate/transaction-ref
```

---

## 💡 Additional Integration Examples

### Example 1: Quick Pay Button in Reservation Card

In ReservationList, you could add a "Pay Now" button:

```tsx
import { CheckoutModal } from '@/components/payments/CheckoutModal';

export function ReservationCard({ reservation, guest }: Props) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <Card>
        <CardContent>
          {/* ... reservation details ... */}
          <Button onClick={() => setShowPayment(true)}>
            Procesar Pago
          </Button>
        </CardContent>
      </Card>

      <CheckoutModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        guestId={guest.id}
        amount={reservation.total_amount}
        currency="usd"
        reservationId={reservation.id}
        onPaymentSuccess={() => setShowPayment(false)}
      />
    </>
  );
}
```

### Example 2: Guest Balance Payment

In GuestDetail page:

```tsx
export function GuestDetail({ guestId }: Props) {
  const [showPayment, setShowPayment] = useState(false);
  const { guest } = useGuest(guestId);

  return (
    <>
      <Card>
        <h3>Balance: {guest.balance_due}</h3>
        <Button onClick={() => setShowPayment(true)}>
          Pay Balance
        </Button>
      </Card>

      <CheckoutModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        guestId={guestId}
        amount={guest.balance_due}
        currency={guest.preferred_currency}
        onPaymentSuccess={() => {
          // Refresh guest data
        }}
      />
    </>
  );
}
```

---

## ✨ Features at a Glance

### Stripe Form Features:
- ✅ Card element with PCI compliance
- ✅ Real-time validation feedback
- ✅ Automatic 3D Secure handling
- ✅ Multi-currency support (USD, EUR)
- ✅ Error handling and recovery
- ✅ Loading states during processing

### Banco Móvil Features:
- ✅ Phone validation (3 formats supported)
- ✅ Cedula validation (5 types)
- ✅ Bank dropdown (40+ banks)
- ✅ Mobile operator detection
- ✅ Transaction reference validation
- ✅ VES currency support

### General Features:
- ✅ Guest selection dropdown
- ✅ Amount and currency inputs
- ✅ Toast notifications
- ✅ Error messages
- ✅ Loading indicators
- ✅ Auto-refresh payment list
- ✅ Modal close on success

---

## 🐛 Troubleshooting

### "CheckoutModal not showing"
- ✅ Verify `isOpen={showCheckout}` prop is true
- ✅ Check that StripeProvider wraps your app in main.tsx
- ✅ Check browser console for errors

### "Stripe is not defined"
- ✅ Check VITE_STRIPE_PUBLISHABLE_KEY is set in .env
- ✅ Verify .env is in frontend directory
- ✅ Restart npm dev server after changing .env

### "Payment form not working"
- ✅ Verify backend is running on port 8000
- ✅ Check VITE_API_BASE_URL in .env
- ✅ Check network tab for API errors
- ✅ Verify user is logged in and approved

### "Can't select guest"
- ✅ Verify guests exist in database
- ✅ Check guest list is loading in payment list
- ✅ Verify you're logged in as admin or recepcionista

---

## 🎯 Next Steps

1. ✅ **Done**: StripeProvider added to main.tsx
2. ✅ **Done**: CheckoutModal integrated into PaymentList
3. **TODO**: Add payment buttons to other pages (Reservations, Guests)
4. **TODO**: Implement invoice integration
5. **TODO**: Setup Stripe webhook endpoint configuration
6. **TODO**: Add payment refund UI
7. **TODO**: Create payment reports dashboard

---

## 📚 Related Documentation

- `PAYMENT_INTEGRATION.md` - Complete integration guide
- `backend/PAYMENT_SYSTEM_IMPLEMENTATION_GUIDE.md` - Backend implementation
- `backend/API_PAYMENT_ENDPOINTS_REFERENCE.md` - Full API reference
- Stripe Docs: https://stripe.com/docs/stripe-js/react

