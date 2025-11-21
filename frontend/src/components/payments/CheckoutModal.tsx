import { useState } from 'react';
import { X, CreditCard, Banknote, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StripeCheckoutForm } from './StripeCheckoutForm';
import { VenezuelanPaymentForm } from './VenezuelanPaymentForm';

export type PaymentMethod = 'stripe' | 'banco-movil';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestId: number;
  amount: number;
  currency?: 'usd' | 'ves' | 'eur';
  invoiceId?: number;
  reservationId?: number;
  onPaymentSuccess?: (paymentId: number, token?: string) => void;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export function CheckoutModal({
  isOpen,
  onClose,
  guestId,
  amount,
  currency = 'usd',
  invoiceId,
  reservationId,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handlePaymentSuccess = (paymentId: number, token?: string) => {
    setPaymentStatus('success');
    setSuccessMessage('¡Pago realizado exitosamente!');
    toast.success('Pago completado correctamente');

    if (onPaymentSuccess) {
      onPaymentSuccess(paymentId, token);
    }

    // Cerrar modal después de 2 segundos
    setTimeout(() => {
      onClose();
      setSelectedMethod(null);
      setPaymentStatus('idle');
      setErrorMessage('');
      setSuccessMessage('');
    }, 2000);
  };

  const handlePaymentError = (error: string) => {
    setPaymentStatus('error');
    setErrorMessage(error);
    toast.error(error);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Procesar Pago</h2>
            <p className="text-sm text-gray-600 mt-1">
              Monto: {amount.toFixed(2)} {currency.toUpperCase()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Messages */}
          {paymentStatus === 'success' && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Pago Exitoso</h3>
                <p className="text-sm text-green-800 mt-1">{successMessage}</p>
              </div>
            </div>
          )}

          {paymentStatus === 'error' && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error en el Pago</h3>
                <p className="text-sm text-red-800 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          {!selectedMethod ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona tu método de pago preferido:
              </p>

              {/* Stripe Option */}
              <button
                onClick={() => setSelectedMethod('stripe')}
                disabled={paymentStatus === 'processing'}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tarjeta de Crédito/Débito</h3>
                    <p className="text-sm text-gray-600">Paga con Stripe</p>
                  </div>
                </div>
              </button>

              {/* Banco Móvil Option */}
              {currency === 'ves' && (
                <button
                  onClick={() => setSelectedMethod('banco-movil')}
                  disabled={paymentStatus === 'processing'}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Banknote className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Banco Móvil</h3>
                      <p className="text-sm text-gray-600">Paga desde tu teléfono</p>
                    </div>
                  </div>
                </button>
              )}

              {/* Currency Note */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  💡 <strong>Nota:</strong> El método Banco Móvil solo está disponible para pagos en VES (Bolívares Venezolanos)
                </p>
              </div>
            </div>
          ) : (
            <div>
              {/* Back Button */}
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setPaymentStatus('idle');
                  setErrorMessage('');
                }}
                disabled={paymentStatus === 'processing'}
                className="text-sm text-blue-600 hover:text-blue-800 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Volver a métodos de pago
              </button>

              {/* Stripe Form */}
              {selectedMethod === 'stripe' && (
                <StripeCheckoutForm
                  guestId={guestId}
                  amount={amount}
                  currency={currency}
                  invoiceId={invoiceId}
                  reservationId={reservationId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={paymentStatus === 'processing'}
                  onProcessingChange={(processing) => {
                    setPaymentStatus(processing ? 'processing' : 'idle');
                  }}
                />
              )}

              {/* Banco Móvil Form */}
              {selectedMethod === 'banco-movil' && (
                <VenezuelanPaymentForm
                  guestId={guestId}
                  amount={amount}
                  invoiceId={invoiceId}
                  reservationId={reservationId}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={paymentStatus === 'processing'}
                  onProcessingChange={(processing) => {
                    setPaymentStatus(processing ? 'processing' : 'idle');
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedMethod === null && (
          <div className="border-t p-6 bg-gray-50">
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
