import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface CancellationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  reservationNumber: string;
  guestName: string;
  roomNumber: string;
  isLoading?: boolean;
}

export function CancellationDialog({
  isOpen,
  onClose,
  onSubmit,
  reservationNumber,
  guestName,
  roomNumber,
  isLoading = false,
}: CancellationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 10) {
      setError('La razón de cancelación debe tener al menos 10 caracteres');
      return;
    }

    if (reason.length > 500) {
      setError('La razón no puede exceder 500 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reason);
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">⚠️ Cancelar Reserva</h2>
            <p className="text-sm text-gray-600 mt-1">Proporciona una justificación para cancelar esta reserva</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full hover:bg-red-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Reservation Details */}
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Número de Reserva:</span>
              <span className="font-semibold text-gray-900">{reservationNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Huésped:</span>
              <span className="font-semibold text-gray-900">{guestName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Habitación:</span>
              <span className="font-semibold text-gray-900">{roomNumber}</span>
            </div>
          </div>

          {/* Warning Box */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 text-sm">Cancelación Activa</p>
              <p className="text-xs text-red-700 mt-1">
                Estás a punto de cancelar una reserva activa. Esta acción requiere una justificación.
              </p>
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label htmlFor="cancellation_reason" className="block text-sm font-semibold text-gray-700 mb-2">
              Razón de Cancelación <span className="text-red-600">*</span>
            </label>
            <textarea
              id="cancellation_reason"
              placeholder="Explica brevemente la razón por la que se cancela esta reserva..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              maxLength={500}
              rows={4}
              className={`w-full px-4 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                error
                  ? 'border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isSubmitting}
            />
            <div className="mt-2 flex justify-between items-center text-xs">
              <p className={`${reason.length > 450 ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                {reason.length}/500 caracteres
              </p>
              {reason.length < 10 && (
                <p className="text-gray-500">Mínimo 10 caracteres requeridos</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Mantener Reserva
            </Button>
            <Button
              type="submit"
              disabled={reason.length < 10 || isSubmitting || isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting || isLoading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Cancelando...
                </>
              ) : (
                '❌ Cancelar Reserva'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
