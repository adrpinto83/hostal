import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  X,
  AlertTriangle,
  Check,
  Calendar,
  Users,
  DoorOpen,
  Clock,
  BarChart3,
  FileText,
  AlertCircle,
} from 'lucide-react';
import type { ReservationCreate, Guest, Room, Period } from '@/types';
import { reservationsApi } from '@/lib/api';

interface ReservationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReservationCreate) => Promise<void>;
  guests?: Guest[];
  rooms?: Room[];
  isLoading?: boolean;
}

interface FormData extends ReservationCreate {
  notes?: string;
}

interface ValidationErrors {
  guest_id?: string;
  room_id?: string;
  start_date?: string;
  period?: string;
  periods_count?: string;
}

const periodLabels: Record<Period, string> = {
  day: 'Día(s)',
  week: 'Semana(s)',
  fortnight: 'Quincena(s)',
  month: 'Mes(es)',
};

const calculateEndDate = (startDate: string, period: Period, count: number): string => {
  const start = new Date(startDate);
  let end = new Date(start);

  switch (period) {
    case 'day':
      end.setDate(end.getDate() + count - 1);
      break;
    case 'week':
      end.setDate(end.getDate() + count * 7 - 1);
      break;
    case 'fortnight':
      end.setDate(end.getDate() + count * 14 - 1);
      break;
    case 'month':
      end.setMonth(end.getMonth() + count);
      end.setDate(end.getDate() - 1);
      break;
  }

  return end.toISOString().split('T')[0];
};

const calculateDays = (period: Period, count: number): number => {
  switch (period) {
    case 'day':
      return count;
    case 'week':
      return count * 7;
    case 'fortnight':
      return count * 14;
    case 'month':
      return count * 30;
  }
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export function ReservationFormModal({
  isOpen,
  onClose,
  onSubmit,
  guests = [],
  rooms = [],
  isLoading = false,
}: ReservationFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    guest_id: 0,
    room_id: 0,
    start_date: new Date().toISOString().split('T')[0],
    period: 'day',
    periods_count: 1,
    notes: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        guest_id: 0,
        room_id: 0,
        start_date: new Date().toISOString().split('T')[0],
        period: 'day',
        periods_count: 1,
        notes: '',
      });
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  const { data: roomReservations } = useQuery({
    queryKey: ['room-reservations', formData.room_id],
    queryFn: () => {
      if (!formData.room_id) {
        return Promise.resolve([]);
      }
      return reservationsApi.getAll({ room_id: formData.room_id });
    },
    enabled: !!formData.room_id,
  });
  const existingReservations = roomReservations ?? [];

  const validateField = (name: string, value: any): string | undefined => {
    switch (name) {
      case 'guest_id':
        if (!value || value === 0) return 'Debes seleccionar un huésped';
        return undefined;

      case 'room_id':
        if (!value || value === 0) return 'Debes seleccionar una habitación';
        return undefined;

      case 'start_date':
        if (!value) return 'La fecha de inicio es requerida';
        const selectedDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return 'La fecha no puede ser en el pasado';
        return undefined;

      case 'period':
        if (!value) return 'Debes seleccionar un período';
        return undefined;

      case 'periods_count':
        const count = parseInt(value);
        if (!value || count < 1) return 'La cantidad debe ser mayor a 0';
        if (count > 365) return 'La cantidad no puede exceder 365';
        return undefined;

      case 'notes':
        if (value && value.length > 500) return 'Las notas no pueden exceder 500 caracteres';
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    ['guest_id', 'room_id', 'start_date', 'period', 'periods_count'].forEach((field) => {
      const error = validateField(field, formData[field as keyof FormData]);
      if (error) newErrors[field as keyof ValidationErrors] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(field, formData[field as keyof FormData]);
    if (error) {
      setErrors({ ...errors, [field]: error });
    } else {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
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
      const dataToSubmit: ReservationCreate = {
        guest_id: formData.guest_id,
        room_id: formData.room_id,
        start_date: formData.start_date,
        period: formData.period,
        periods_count: formData.periods_count,
        notes: formData.notes || undefined,
      };
      await onSubmit(dataToSubmit);
      // Esperar un pequeño delay para asegurar que el refetch se completó
      await new Promise(resolve => setTimeout(resolve, 200));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRoom = rooms.find((r) => r.id === formData.room_id);
  const endDate = calculateEndDate(formData.start_date, formData.period, formData.periods_count);
  const totalDays = calculateDays(formData.period, formData.periods_count);
  const totalCost =
    selectedRoom && selectedRoom.price_bs ? selectedRoom.price_bs * totalDays : 0;

  // Check room availability
  const availabilityCheck = useMemo(() => {
    if (!formData.room_id || !formData.start_date) {
      return { isAvailable: true, conflict: null };
    }

    const selectedStart = new Date(formData.start_date);
    const selectedEnd = new Date(endDate);

    // Check for overlaps with existing reservations (excluding cancelled)
    const conflict = existingReservations.find((res) => {
      if (res.room_id !== formData.room_id) return false;
      if (res.status === 'cancelled' || res.status === 'checked_out') return false;

      const resStart = new Date(res.start_date);
      const resEnd = new Date(res.end_date);

      // Check if dates overlap (using < and > for consecutive bookings)
      return selectedStart < resEnd && selectedEnd > resStart;
    });

    return {
      isAvailable: !conflict,
      conflict: conflict || null,
    };
  }, [formData.room_id, formData.start_date, endDate, existingReservations]);

  const isFormValid =
    !isLoading &&
    Object.keys(errors).length === 0 &&
    availabilityCheck.isAvailable;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📅 Nueva Reserva</h2>
            <p className="text-sm text-gray-600 mt-1">Crea una nueva reserva seleccionando un huésped y habitación</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full hover:bg-blue-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 text-sm">Información importante</p>
              <p className="text-xs text-blue-700 mt-1">
                Los campos marcados con * son obligatorios. Selecciona un huésped disponible y una habitación.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 1: Información Principal */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Información Principal</h3>
            </div>

            {/* Guest Selection */}
            <div>
              <Label htmlFor="guest_id" className="text-gray-700 font-semibold flex gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Huésped
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <select
                  id="guest_id"
                  value={formData.guest_id}
                  onChange={(e) => handleChange('guest_id', parseInt(e.target.value))}
                  onBlur={() => handleBlur('guest_id')}
                  className={`w-full px-4 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.guest_id && touched.guest_id
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value={0}>Selecciona un huésped...</option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.full_name} ({guest.document_id})
                    </option>
                  ))}
                </select>
                {!errors.guest_id && touched.guest_id && formData.guest_id !== 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {errors.guest_id && touched.guest_id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
              </div>
              {errors.guest_id && touched.guest_id && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.guest_id}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Selecciona el huésped para esta reserva.
              </p>
            </div>

            {/* Room Selection */}
            <div>
              <Label htmlFor="room_id" className="text-gray-700 font-semibold flex gap-2">
                <DoorOpen className="h-4 w-4 text-blue-600" />
                Habitación
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <select
                  id="room_id"
                  value={formData.room_id}
                  onChange={(e) => handleChange('room_id', parseInt(e.target.value))}
                  onBlur={() => handleBlur('room_id')}
                  className={`w-full px-4 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.room_id && touched.room_id
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                >
                  <option value={0}>Selecciona una habitación...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Habitación {room.number} ({room.type}) - Bs {room.price_bs?.toFixed(2) || 'N/A'}/noche
                    </option>
                  ))}
                </select>
                {!errors.room_id && touched.room_id && formData.room_id !== 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {errors.room_id && touched.room_id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
              </div>
              {errors.room_id && touched.room_id && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.room_id}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Selecciona la habitación para esta reserva.
              </p>
            </div>

            {/* Room Availability Status */}
            {formData.room_id !== 0 && formData.start_date && (
              <>
                {availabilityCheck.isAvailable ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 text-sm">Habitación Disponible</p>
                      <p className="text-xs text-green-700 mt-1">
                        La habitación {selectedRoom?.number} está disponible para las fechas seleccionadas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900 text-sm">⚠ Habitación Ocupada</p>
                      <p className="text-xs text-red-700 mt-1">
                        La habitación {selectedRoom?.number} ya tiene una reserva desde el{' '}
                        <span className="font-semibold">{formatDate(availabilityCheck.conflict?.start_date || '')}</span> hasta el{' '}
                        <span className="font-semibold">{formatDate(availabilityCheck.conflict?.end_date || '')}</span>.
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Por favor, selecciona diferentes fechas o una habitación disponible.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 2: Fechas y Período */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Fechas y Período</h3>
            </div>

            {/* Start Date */}
            <div>
              <Label htmlFor="start_date" className="text-gray-700 font-semibold flex gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Fecha de Inicio
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  onBlur={() => handleBlur('start_date')}
                  className={`border ${
                    errors.start_date && touched.start_date
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {!errors.start_date && touched.start_date && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {errors.start_date && touched.start_date && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
              </div>
              {errors.start_date && touched.start_date && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.start_date}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Selecciona la fecha de inicio de la reserva.
              </p>
            </div>

            {/* Period and Count */}
            <div className="grid grid-cols-2 gap-4">
              {/* Period */}
              <div>
                <Label htmlFor="period" className="text-gray-700 font-semibold flex gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Período
                  <span className="text-red-600">*</span>
                </Label>
                <div className="mt-2 relative">
                  <select
                    id="period"
                    value={formData.period}
                    onChange={(e) => handleChange('period', e.target.value as Period)}
                    onBlur={() => handleBlur('period')}
                    className={`w-full px-4 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.period && touched.period
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500'
                    }`}
                  >
                    {Object.entries(periodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {!errors.period && touched.period && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Count */}
              <div>
                <Label htmlFor="periods_count" className="text-gray-700 font-semibold flex gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  Cantidad
                  <span className="text-red-600">*</span>
                </Label>
                <div className="mt-2 relative">
                  <Input
                    id="periods_count"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.periods_count}
                    onChange={(e) => handleChange('periods_count', parseInt(e.target.value))}
                    onBlur={() => handleBlur('periods_count')}
                    className={`border ${
                      errors.periods_count && touched.periods_count
                        ? 'border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {!errors.periods_count && touched.periods_count && formData.periods_count > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                  {errors.periods_count && touched.periods_count && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                </div>
                {errors.periods_count && touched.periods_count && (
                  <p className="mt-1 text-sm text-red-600 flex gap-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errors.periods_count}
                  </p>
                )}
              </div>
            </div>

            {/* Date and Cost Summary */}
            <div className="space-y-3">
              {/* Date Range */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">📍 Rango de Reserva:</p>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>Inicio: <span className="font-semibold">{formatDate(formData.start_date)}</span></p>
                  <p>Fin: <span className="font-semibold">{formatDate(endDate)}</span></p>
                  <p>Total: <span className="font-semibold">{totalDays} días</span></p>
                </div>
              </div>

              {/* Cost Calculation */}
              {selectedRoom && selectedRoom.price_bs && (
                <div className="p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                  <p className="text-sm text-green-900 font-semibold mb-3">💰 Costo de Reserva:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-green-800">
                      <span>Tarifa por día:</span>
                      <span className="font-semibold">Bs {selectedRoom.price_bs.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-green-800">
                      <span>Cantidad de días:</span>
                      <span className="font-semibold">{totalDays} días</span>
                    </div>
                    <div className="border-t border-green-300 pt-2 flex justify-between">
                      <span className="font-bold text-green-900">TOTAL RESERVA:</span>
                      <span className="text-lg font-bold text-green-700">Bs {totalCost.toFixed(2)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-3 italic">
                    💡 Este monto será acreditado a la cuenta del huésped
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 3: Notas Adicionales */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Notas Adicionales</h3>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes" className="text-gray-700 font-semibold flex gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Observaciones (Opcional)
              </Label>
              <div className="mt-2">
                <textarea
                  id="notes"
                  placeholder="Información adicional sobre la reserva, preferencias del huésped, etc..."
                  value={formData.notes || ''}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  onBlur={() => handleBlur('notes')}
                  maxLength={500}
                  rows={3}
                  className={`w-full px-4 py-2.5 text-base border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.notes && touched.notes
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {errors.notes && touched.notes && (
                  <p className="mt-1 text-sm text-red-600 flex gap-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errors.notes}
                  </p>
                )}
              </div>
              <div className="mt-2 flex justify-between items-center text-xs">
                <p className="text-gray-600">
                  {formData.notes?.length || 0}/{500} caracteres
                </p>
                {formData.notes && formData.notes.length > 450 && (
                  <p className="text-amber-600 font-semibold">Limite casi alcanzado</p>
                )}
              </div>
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
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Creando...
                </>
              ) : (
                '✅ Crear Reserva'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
