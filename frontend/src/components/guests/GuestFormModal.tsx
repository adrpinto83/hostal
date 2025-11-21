import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, X, User, FileText, Phone, Mail, FileUp, Check, AlertCircle } from 'lucide-react';
import type { Guest, GuestCreate, GuestUpdate } from '@/types';

const NOTES_MAX_LENGTH = 280;

interface GuestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GuestCreate | GuestUpdate) => Promise<void>;
  editingGuest?: Guest | null;
  isLoading?: boolean;
}

interface ValidationErrors {
  full_name?: string;
  document_id?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

const PHONE_REGEX = /^(\+\d{1,3})?[\s.-]?\(?(\d{3})\)?[\s.-]?(\d{3})[\s.-]?(\d{4,6})$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOCUMENT_REGEX = /^[A-Za-z0-9\-\s]+$/;

export function GuestFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingGuest,
  isLoading = false,
}: GuestFormModalProps) {
  const [formData, setFormData] = useState<GuestCreate>({
    full_name: '',
    document_id: '',
    phone: '',
    email: '',
    notes: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingGuest) {
      setFormData({
        full_name: editingGuest.full_name,
        document_id: editingGuest.document_id,
        phone: editingGuest.phone || '',
        email: editingGuest.email || '',
        notes: editingGuest.notes || '',
      });
    } else {
      setFormData({
        full_name: '',
        document_id: '',
        phone: '',
        email: '',
        notes: '',
      });
    }
    setErrors({});
    setTouched({});
  }, [editingGuest, isOpen]);

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'full_name':
        if (!value.trim()) return 'El nombre completo es requerido';
        if (value.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres';
        if (value.trim().length > 100) return 'El nombre no puede exceder 100 caracteres';
        return undefined;

      case 'document_id':
        if (!value.trim()) return 'El documento de identidad es requerido';
        if (value.trim().length < 3) return 'El documento debe tener al menos 3 caracteres';
        if (!DOCUMENT_REGEX.test(value)) return 'El documento solo puede contener letras, números, guiones y espacios';
        if (value.trim().length > 50) return 'El documento no puede exceder 50 caracteres';
        return undefined;

      case 'phone':
        if (value && !PHONE_REGEX.test(value.replace(/[\s().-]/g, ''))) {
          return 'Formato de teléfono inválido. Usa: +58 412-1234567 o (412) 123-4567';
        }
        return undefined;

      case 'email':
        if (value && !EMAIL_REGEX.test(value)) return 'Email inválido';
        if (value && value.length > 100) return 'El email no puede exceder 100 caracteres';
        return undefined;

      case 'notes':
        if (value.length > NOTES_MAX_LENGTH) return `Las notas no pueden exceder ${NOTES_MAX_LENGTH} caracteres`;
        return undefined;

      default:
        return undefined;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key as keyof GuestCreate] || '');
      if (error) newErrors[key as keyof ValidationErrors] = error;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    const error = validateField(field, formData[field as keyof GuestCreate] || '');
    if (error) {
      setErrors({ ...errors, [field]: error });
    } else {
      const { [field]: _, ...rest } = errors;
      setErrors(rest);
    }
  };

  const handleChange = (field: keyof GuestCreate, value: string) => {
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
      // onSubmit ahora retorna una Promise que completa DESPUÉS del refetch
      await onSubmit(formData);
      // Esperar un pequeño delay para asegurar que el refetch se completó
      await new Promise(resolve => setTimeout(resolve, 200));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const notesValue = formData.notes ?? '';
  const remainingChars = NOTES_MAX_LENGTH - notesValue.length;
  const notesPercentage = (notesValue.length / NOTES_MAX_LENGTH) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {editingGuest ? '✏️ Editar Huésped' : '➕ Nuevo Huésped'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editingGuest
                ? 'Actualiza la información del huésped'
                : 'Completa todos los campos obligatorios'}
            </p>
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
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Información importante</p>
              <p className="text-blue-700 mt-1">
                Los datos marcados con <span className="text-red-600 font-bold">*</span> son obligatorios.
                El teléfono y email se usarán para notificaciones automáticas.
              </p>
            </div>
          </div>

          {/* Section 1: Información Personal */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Información Personal</h3>
            </div>

            {/* Full Name */}
            <div>
              <Label htmlFor="full_name" className="text-gray-700 font-semibold flex gap-2">
                <User className="h-4 w-4 text-blue-600" />
                Nombre Completo
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <Input
                  id="full_name"
                  placeholder="Ej. María Fernanda Suárez"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  onBlur={() => handleBlur('full_name')}
                  className={`pl-4 py-2.5 text-base ${
                    errors.full_name && touched.full_name
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {errors.full_name && touched.full_name && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
                {!errors.full_name && touched.full_name && formData.full_name && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
              </div>
              {errors.full_name && touched.full_name && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.full_name}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Usa el nombre exacto como aparece en el documento oficial.
              </p>
            </div>

            {/* Document ID */}
            <div>
              <Label htmlFor="document_id" className="text-gray-700 font-semibold flex gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                Documento de Identidad
                <span className="text-red-600">*</span>
              </Label>
              <div className="mt-2 relative">
                <Input
                  id="document_id"
                  placeholder="V-12345678 / DNI / Pasaporte"
                  value={formData.document_id}
                  onChange={(e) => handleChange('document_id', e.target.value)}
                  onBlur={() => handleBlur('document_id')}
                  className={`pl-4 py-2.5 text-base font-mono ${
                    errors.document_id && touched.document_id
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {errors.document_id && touched.document_id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                )}
                {!errors.document_id && touched.document_id && formData.document_id && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                )}
              </div>
              {errors.document_id && touched.document_id && (
                <p className="mt-1 text-sm text-red-600 flex gap-1">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {errors.document_id}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600">
                Aceptamos letras, números, guiones y espacios. Se usará para búsquedas rápidas.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 2: Contacto */}
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-indigo-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Información de Contacto</h3>
              <span className="text-xs text-gray-500">(Opcional)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-gray-700 font-semibold flex gap-2">
                  <Phone className="h-4 w-4 text-indigo-600" />
                  Teléfono
                </Label>
                <div className="mt-2 relative">
                  <Input
                    id="phone"
                    placeholder="+58 412-1234567"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    className={`pl-4 py-2.5 text-base ${
                      errors.phone && touched.phone
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && touched.phone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                  {!errors.phone && touched.phone && formData.phone && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
                {errors.phone && touched.phone && (
                  <p className="mt-1 text-sm text-red-600 flex gap-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errors.phone}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-600">
                  Incluye código de país. Usaremos para WhatsApp y SMS.
                </p>
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email" className="text-gray-700 font-semibold flex gap-2">
                  <Mail className="h-4 w-4 text-indigo-600" />
                  Email
                </Label>
                <div className="mt-2 relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    className={`pl-4 py-2.5 text-base ${
                      errors.email && touched.email
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300'
                    }`}
                  />
                  {errors.email && touched.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                  )}
                  {!errors.email && touched.email && formData.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  )}
                </div>
                {errors.email && touched.email && (
                  <p className="mt-1 text-sm text-red-600 flex gap-1">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {errors.email}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-600">
                  Para notificaciones, confirmaciones y recordatorios.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200"></div>

          {/* Section 3: Notas Adicionales */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-1 w-1 bg-green-600 rounded-full"></div>
              <h3 className="text-lg font-semibold text-gray-800">Notas Adicionales</h3>
              <span className="text-xs text-gray-500">(Opcional)</span>
            </div>

            <div>
              <Label htmlFor="notes" className="text-gray-700 font-semibold flex gap-2">
                <FileUp className="h-4 w-4 text-green-600" />
                Información Adicional
              </Label>
              <div className="mt-2">
                <textarea
                  id="notes"
                  className={`w-full px-4 py-2.5 border rounded-lg resize-none focus:outline-none focus:ring-2 transition-colors ${
                    errors.notes && touched.notes
                      ? 'border-red-500 focus:ring-red-500 bg-red-50'
                      : 'border-gray-300 focus:border-green-500 focus:ring-green-500'
                  }`}
                  rows={4}
                  value={notesValue}
                  placeholder="Preferencias especiales, restricciones alimenticias, contactos de emergencia, alergias, etc..."
                  maxLength={NOTES_MAX_LENGTH}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  onBlur={() => handleBlur('notes')}
                />
                <div className="mt-3 flex items-center justify-between gap-4">
                  <p className="text-xs text-gray-600">
                    Información útil para el personal del hostal.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-colors ${
                          notesPercentage < 50 ? 'bg-green-500' : notesPercentage < 80 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${notesPercentage}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 w-16 text-right">
                      {remainingChars}/{NOTES_MAX_LENGTH}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 border-t border-gray-200 flex gap-3 justify-end rounded-b-lg">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).length > 0}
              className="px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {editingGuest ? 'Actualizando...' : 'Creando...'}
                </span>
              ) : editingGuest ? (
                'Actualizar Huésped'
              ) : (
                'Crear Huésped'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
