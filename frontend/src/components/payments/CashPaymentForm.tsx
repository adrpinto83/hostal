import { useState } from 'react';
import { Loader, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface CashPaymentFormProps {
  guestId: number;
  amount: number;
  currency: 'usd' | 'ves' | 'eur';
  invoiceId?: number;
  reservationId?: number;
  onSuccess: (paymentId: number) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

export function CashPaymentForm({
  guestId,
  amount,
  currency,
  invoiceId,
  reservationId,
  onSuccess,
  onError,
  isProcessing,
  onProcessingChange,
}: CashPaymentFormProps) {
  const [billSerialNumber, setBillSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Determinar si la referencia es obligatoria
  // USD y EUR: obligatoria (código del billete)
  // VES: opcional
  const isReferenceRequired = currency === 'usd' || currency === 'eur';

  const isFormValid = () => {
    if (isReferenceRequired) {
      return billSerialNumber.trim().length > 0;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) {
      const message = isReferenceRequired
        ? 'El código del billete es obligatorio para pagos en efectivo en USD y EUR'
        : 'Por favor completa el formulario';
      onError(message);
      return;
    }

    onProcessingChange(true);

    try {
      const response = await api.post('/payments/', {
        guest_id: guestId,
        reservation_id: reservationId,
        occupancy_id: null,
        amount: amount,
        currency: currency.toUpperCase(),
        method: 'cash',
        reference_number: billSerialNumber.trim() || null,
        notes: notes.trim() || null,
      });

      if (response.data) {
        toast.success('Pago en efectivo registrado exitosamente');
        onSuccess(response.data.id);
      } else {
        throw new Error('Error al procesar el pago');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        'Error al procesar el pago en efectivo';
      onError(errorMessage);
      toast.error(errorMessage);
    } finally {
      onProcessingChange(false);
    }
  };

  const getCurrencySymbol = () => {
    switch (currency) {
      case 'usd':
        return '$';
      case 'eur':
        return '€';
      case 'ves':
        return 'Bs.';
      default:
        return '';
    }
  };

  const getCurrencyName = () => {
    switch (currency) {
      case 'usd':
        return 'Dólares';
      case 'eur':
        return 'Euros';
      case 'ves':
        return 'Bolívares';
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Serial Number / Reference */}
      <div>
        <Label htmlFor="serial">
          {isReferenceRequired
            ? `Código del Billete ${isReferenceRequired ? '*' : '(Opcional)'}`
            : 'Referencia (Opcional)'}
        </Label>
        <Input
          id="serial"
          placeholder={
            isReferenceRequired
              ? 'Ej: AB12345678C'
              : 'Número de referencia (opcional)'
          }
          value={billSerialNumber}
          onChange={(e) => setBillSerialNumber(e.target.value.toUpperCase())}
          disabled={isProcessing}
          className={isReferenceRequired && !billSerialNumber ? 'border-red-300' : ''}
        />
        <p className="text-xs text-gray-600 mt-1">
          {isReferenceRequired ? (
            <>
              Ingresa el código serial del billete de {getCurrencyName()}. Este campo es <strong>obligatorio</strong> para pagos en USD y EUR.
            </>
          ) : (
            'Puedes agregar una referencia opcional para identificar este pago.'
          )}
        </p>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notas (Opcional)</Label>
        <textarea
          id="notes"
          placeholder="Observaciones adicionales sobre el pago..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isProcessing}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
        />
      </div>

      {/* Amount Display */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Monto a pagar en efectivo:</span>
          <span className="text-2xl font-bold text-gray-900">
            {getCurrencySymbol()} {amount.toFixed(2)}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <strong>{getCurrencyName()}</strong>
        </div>
      </div>

      {/* Info */}
      <div className={`p-3 rounded-lg border text-sm ${
        isReferenceRequired
          ? 'bg-amber-50 border-amber-200 text-amber-900'
          : 'bg-blue-50 border-blue-200 text-blue-900'
      }`}>
        <p className="flex items-start gap-2">
          <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {isReferenceRequired ? (
              <>
                <strong>Importante:</strong> Para pagos en efectivo en USD y EUR, el código del billete es obligatorio para efectos de auditoría y control.
              </>
            ) : (
              <>
                Registra el pago en efectivo recibido. La referencia es opcional para pagos en bolívares.
              </>
            )}
          </span>
        </p>
      </div>

      {/* Validation Warning */}
      {isReferenceRequired && !billSerialNumber && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-sm text-red-900">
          <p>⚠️ Debes ingresar el código del billete antes de continuar.</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid() || isProcessing}
        className="w-full"
      >
        {isProcessing && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {isProcessing ? 'Procesando...' : 'Registrar Pago en Efectivo'}
      </Button>
    </form>
  );
}
