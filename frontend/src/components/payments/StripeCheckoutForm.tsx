import { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface StripeCheckoutFormProps {
  guestId: number;
  amount: number;
  currency: 'usd' | 'ves' | 'eur';
  invoiceId?: number;
  reservationId?: number;
  onSuccess: (paymentId: number, token?: string) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

export function StripeCheckoutForm({
  guestId,
  amount,
  currency,
  invoiceId,
  reservationId,
  onSuccess,
  onError,
  isProcessing,
  onProcessingChange,
}: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [cardComplete, setCardComplete] = useState(false);

  const handleCardChange = (event: any) => {
    setCardError(event.error?.message || '');
    setCardComplete(event.complete);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setCardError('Stripe no se ha cargado correctamente');
      return;
    }

    onProcessingChange(true);

    try {
      // 1. Crear PaymentIntent en el backend
      const response = await api.post('/payments-v2/stripe/create-intent', {
        guest_id: guestId,
        amount: amount,
        currency: currency.toLowerCase(),
        description: `Pago de reserva - Huésped ${guestId}`,
        invoice_id: invoiceId,
        reservation_id: reservationId,
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Error al crear el pago');
      }

      const { client_secret, payment_id } = response.data.data;

      // 2. Confirmar el pago con Stripe.js
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Elemento de tarjeta no encontrado');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Opcionalmente agregar más detalles
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Error al procesar la tarjeta');
      }

      if (paymentIntent?.status === 'succeeded') {
        // El pago fue exitoso
        onSuccess(payment_id);
      } else if (paymentIntent?.status === 'requires_action') {
        // Se requiere autenticación 3D Secure
        toast.info('Se requiere autenticación adicional...');
        // La autenticación se maneja automáticamente por Stripe
      } else {
        throw new Error('El pago no se completó correctamente');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setCardError(errorMessage);
      onError(errorMessage);
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card Element */}
      <div className="p-4 border border-gray-200 rounded-lg bg-white">
        <CardElement
          onChange={handleCardChange}
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#fa755a',
              },
            },
            hidePostalCode: false,
          }}
        />
      </div>

      {/* Card Error */}
      {cardError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{cardError}</p>
        </div>
      )}

      {/* Amount Display */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Monto a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">
            {amount.toFixed(2)} {currency.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-900">
        <p>
          🔒 Tu información de tarjeta es segura y se procesa a través de Stripe.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!cardComplete || isProcessing || !stripe}
        className="w-full"
      >
        {isProcessing && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {isProcessing ? 'Procesando...' : `Pagar ${amount.toFixed(2)} ${currency.toUpperCase()}`}
      </Button>
    </form>
  );
}
