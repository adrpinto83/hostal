import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckoutModal } from './CheckoutModal';
import { StripeProvider } from './StripeProvider';

/**
 * Example component showing how to use CheckoutModal
 *
 * Usage:
 * 1. Wrap your application with StripeProvider in main.tsx
 * 2. Use CheckoutModal component to render the modal
 * 3. Handle onPaymentSuccess and pass the payment data to your backend
 *
 * Example in main.tsx:
 * ```tsx
 * import { StripeProvider } from '@/components/payments/StripeProvider'
 *
 * ReactDOM.createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <StripeProvider>
 *       <App />
 *     </StripeProvider>
 *   </React.StrictMode>,
 * )
 * ```
 */

export function CheckoutExample() {
  const [isOpen, setIsOpen] = useState(false);

  const handlePaymentSuccess = (paymentId: number, token?: string) => {
    console.log('Payment successful!', { paymentId, token });
    // Handle successful payment
    // Update UI, redirect, etc.
  };

  return (
    <StripeProvider>
      <div className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Procesar Pago</h2>

        <div className="flex gap-4">
          {/* USD Payment (Stripe) */}
          <Button
            onClick={() => setIsOpen(true)}
            variant="default"
          >
            Pagar con Tarjeta (USD 100)
          </Button>

          {/* VES Payment (Banco Móvil) */}
          <Button
            onClick={() => setIsOpen(true)}
            variant="outline"
          >
            Pagar con Banco Móvil (VES 100,000)
          </Button>
        </div>

        {/* Checkout Modal */}
        <CheckoutModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          guestId={1}
          amount={100}
          currency="usd"
          invoiceId={1}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </div>
    </StripeProvider>
  );
}
