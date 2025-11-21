import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  AlertTriangle,
  Check,
  DoorOpen,
  Bed,
  DollarSign,
  FileText,
} from 'lucide-react';
import type { Room } from '@/types';

interface RoomFormData {
  number: string;
  type: 'single' | 'double' | 'suite';
  price_amount?: number;
  price_currency?: 'VES' | 'USD' | 'EUR';
  notes: string;
}

interface RoomFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: RoomFormData) => Promise<void>;
  editingRoom?: Room | null;
  isLoading?: boolean;
}

interface ValidationErrors {
  number?: string;
  type?: string;
  price_amount?: string;
  notes?: string;
}

const roomTypeLabels = {
  single: 'Individual (1 cama)',
  double: 'Doble (2 camas o 1 grande)',
  suite: 'Suite (Premium)',
};

const roomTypeDescriptions = {
  single: 'Habitación para una persona',
  double: 'Habitación para dos personas',
  suite: 'Habitación de lujo con servicios premium',
};

const currencies = [
  { value: 'VES', label: 'Bolívares (Bs)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
];

const NOTES_MAX_LENGTH = 500;

export function RoomFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingRoom,
  isLoading = false,
}: RoomFormModalProps) {
  const [formData, setFormData] = useState<RoomFormData>({
    number: '',
    type: 'single',
    price_amount: undefined,
    price_currency: 'VES',
    notes: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (editingRoom) {
        setFormData({
          number: editingRoom.number,
          type: editingRoom.type as 'single' | 'double' | 'suite',
          price_amount: editingRoom.price_bs || undefined,
          price_currency: 'VES',
          notes: editingRoom.notes || '',
        });
      } else {
        setFormData({
          number: '',
          type: 'single',
          price_amount: undefined,
          price_currency: 'VES',
          notes: '',
        });
      }
      setErrors({});
      setTouched({});
    }
  }, [isOpen, editingRoom]);

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'number':
        if (!value.trim()) return 'El número de habitación es requerido';
        if (value.trim().length < 1) return 'El número debe tener al menos 1 carácter';
        if (value.trim().length > 10) return 'El número no puede exceder 10 caracteres';
        return undefined;

      case 'type':
        if (!value) return 'Debes seleccionar un tipo de habitación';
        if (!['single', 'double', 'suite'].includes(value)) return 'Tipo de habitación inválido';
        return undefined;

      case 'price_amount':
        if (value !== undefined && value !== null && value !== '') {
          const num = parseFloat(value);
          if (isNaN(num)) return 'El precio debe ser un número válido';
          if (num < 0) return 'El precio no puede ser negativo';
          if (num > 999999) return 'El precio es demasiado alto';
        }
        return undefined;

      case 'notes':
        if (value && value.length > NOTES_MAX_LENGTH) {
          return `Las notas no pueden exceder ${NOTES_MAX_LENGTH} caracteres`;
        }
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    ['number', 'type', 'price_amount', 'notes'].forEach((field) => {
      const error = validateField(field, formData[field as keyof RoomFormData]);
      if (error) newErrors[field as keyof ValidationErrors] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(field, formData[field as keyof RoomFormData]);
    if (error) {
      setErrors({ ...errors, [field]: error });
    } else {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleChange = (field: keyof RoomFormData, value: any) => {
    setFormData({ ...formData, [field]: value });

    if (touched[field]) {
      const error = validateField(field, value);
      if (error) {
        setErrors({ ...errors, [field]: error });
      } else {
        const { [field]: _, ...rest } = errors;
        setErrors(rest);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dataToSubmit: RoomFormData = {
        number: formData.number.trim(),
        type: formData.type,
        price_amount: formData.price_amount,
        price_currency: formData.price_currency,
        notes: formData.notes || '',
      };
      await onSubmit(dataToSubmit);
      // Esperar un pequeño delay para asegurar que el refetch se completó
      await new Promise(resolve => setTimeout(resolve, 200));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    !isLoading && Object.keys(errors).length === 0 && formData.number.trim().length > 0;
  const notesLength = formData.notes?.length || 0;
  const notesPercentage = (notesLength / NOTES_MAX_LENGTH) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingRoom ? '✏️ Editar Habitación' : '➕ Nueva Habitación'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editingRoom
                ? `Habitación #${editingRoom.number}`
                : 'Crea una nueva habitación en el hostal'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full hover:bg-purple-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900 text-sm">Información importante</p>
              <p className="text-xs text-purple-700 mt-1">
                Los campos marcados con * son obligatorios. El precio y notas son opcionales.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 1: Información de la Habitación */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-purple-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Información de la Habitación</h3>
            </div>

            {/* Room Number */}
            <div>
              <Label htmlFor="number" className="text-gray-700 font-semibold flex gap-2">
                <DoorOpen className="h-4 w-4 text-purple-600" />
                Número de Habitación
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <Input
                  id="number"
                  placeholder="Ej: 101, A-205, Suite 1"
                  maxLength={10}
                  value={formData.number}
                  onChange={(e) => handleChange('number', e.target.value)}
                  onBlur={() => handleBlur('number')}
                  className={`pl-4 py-2.5 text-base font-semibold tracking-wide ${
                    errors.number && touched.number
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {!errors.number && touched.number && formData.number && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {errors.number && touched.number && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
              </div>
              {errors.number && touched.number && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.number}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Identificador único de la habitación (máximo 10 caracteres)
              </p>
            </div>

            {/* Room Type */}
            <div>
              <Label htmlFor="type" className="text-gray-700 font-semibold flex gap-2">
                <Bed className="h-4 w-4 text-purple-600" />
                Tipo de Habitación
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-3 space-y-2">
                {Object.entries(roomTypeLabels).map(([value, label]) => (
                  <label key={value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 transition">
                    <input
                      type="radio"
                      name="type"
                      value={value}
                      checked={formData.type === value}
                      onChange={(e) => handleChange('type', e.target.value as 'single' | 'double' | 'suite')}
                      onBlur={() => handleBlur('type')}
                      className="mt-1 h-4 w-4 text-purple-600 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{label}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {roomTypeDescriptions[value as keyof typeof roomTypeDescriptions]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {errors.type && touched.type && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.type}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 2: Precio */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-purple-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Precio</h3>
            </div>

            {/* Price and Currency */}
            <div>
              <Label className="text-gray-700 font-semibold flex gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Precio por Noche (Opcional)
              </Label>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {/* Price Amount */}
                <div className="col-span-2 relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999"
                    placeholder="0.00"
                    value={formData.price_amount || ''}
                    onChange={(e) =>
                      handleChange('price_amount', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    onBlur={() => handleBlur('price_amount')}
                    className={`border ${
                      errors.price_amount && touched.price_amount
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {!errors.price_amount && touched.price_amount && formData.price_amount && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>

                {/* Currency Selector */}
                <select
                  value={formData.price_currency || 'VES'}
                  onChange={(e) => handleChange('price_currency', e.target.value as 'VES' | 'USD' | 'EUR')}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {currencies.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.value}
                    </option>
                  ))}
                </select>
              </div>
              {errors.price_amount && touched.price_amount && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.price_amount}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Tarifa diaria de la habitación. Puedes dejar vacío si no tienes precio definido.
              </p>
            </div>

            {/* Price Summary */}
            {formData.price_amount && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-900 font-semibold">Precio Configurado:</p>
                <p className="text-lg font-bold text-green-700 mt-1">
                  {formData.price_amount.toFixed(2)} {formData.price_currency}
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 3: Notas Adicionales */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-purple-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Notas Adicionales</h3>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-gray-700 font-semibold flex gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Características Especiales (Opcional)
              </Label>
              <div className="mt-2">
                <textarea
                  id="notes"
                  placeholder="Ej: Con vista al mar, televisión inteligente, WiFi, aire acondicionado, minibar, balcón..."
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  onBlur={() => handleBlur('notes')}
                  maxLength={NOTES_MAX_LENGTH}
                  rows={4}
                  className={`w-full px-4 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.notes && touched.notes
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-purple-500'
                  }`}
                />
                {errors.notes && touched.notes && (
                  <p className="mt-1 text-sm text-red-600 flex gap-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errors.notes}
                  </p>
                )}
              </div>

              {/* Character Counter with Progress Bar */}
              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <p className="text-gray-600">
                    {notesLength}/{NOTES_MAX_LENGTH} caracteres
                  </p>
                  {notesPercentage > 80 && notesPercentage < 100 && (
                    <p className="text-amber-600 font-semibold">⚠️ Límite casi alcanzado</p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      notesPercentage <= 50
                        ? 'bg-green-500'
                        : notesPercentage <= 80
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(notesPercentage, 100)}%` }}
                  />
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-600">
                Describe características especiales, servicios o detalles de la habitación.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`${
                isFormValid && !isSubmitting
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  {editingRoom ? 'Actualizando...' : 'Creando...'}
                </>
              ) : editingRoom ? (
                '✏️ Actualizar Habitación'
              ) : (
                '✅ Crear Habitación'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
