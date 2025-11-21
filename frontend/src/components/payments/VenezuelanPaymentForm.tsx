import { useState, useEffect } from 'react';
import { Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface VenezuelanPaymentFormProps {
  guestId: number;
  amount: number;
  invoiceId?: number;
  reservationId?: number;
  onSuccess: (paymentId: number) => void;
  onError: (error: string) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
}

interface Bank {
  code: string;
  name: string;
  name_es: string;
}

interface MobileOperator {
  [key: string]: string;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export function VenezuelanPaymentForm({
  guestId,
  amount,
  invoiceId,
  reservationId,
  onSuccess,
  onError,
  isProcessing,
  onProcessingChange,
}: VenezuelanPaymentFormProps) {
  // Form State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cedula, setCedula] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [description, setDescription] = useState('');

  // Data State
  const [banks, setBanks] = useState<Bank[]>([]);
  const [operators, setOperators] = useState<MobileOperator>({});
  const [mobileOperator, setMobileOperator] = useState('');

  // Validation State
  const [phoneValidation, setPhoneValidation] = useState<ValidationStatus>('idle');
  const [cedulaValidation, setCedulaValidation] = useState<ValidationStatus>('idle');
  const [bankValidation, setBankValidation] = useState<ValidationStatus>('idle');
  const [refValidation, setRefValidation] = useState<ValidationStatus>('idle');

  const [phoneError, setPhoneError] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [bankError, setBankError] = useState('');
  const [refError, setRefError] = useState('');

  // Load banks and operators on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load banks
        const banksRes = await api.get('/payments-v2/mobile-venezuela/banks');
        setBanks(banksRes.data.banks || []);

        // Load operators
        const opsRes = await api.get('/payments-v2/mobile-venezuela/operators');
        setOperators(opsRes.data || {});
      } catch (error) {
        console.error('Error loading payment data:', error);
      }
    };

    loadData();
  }, []);

  // Validate phone number
  const validatePhoneNumber = async (phone: string) => {
    if (!phone) {
      setPhoneValidation('idle');
      setPhoneError('');
      setMobileOperator('');
      return;
    }

    setPhoneValidation('validating');
    try {
      const response = await api.post('/payments-v2/validate/phone', {
        phone_number: phone,
      });

      if (response.data.valid) {
        setPhoneValidation('valid');
        setPhoneError('');
        setMobileOperator(response.data.operator);
      } else {
        setPhoneValidation('invalid');
        setPhoneError(response.data.error || 'Teléfono inválido');
      }
    } catch (error: any) {
      setPhoneValidation('invalid');
      setPhoneError(
        error.response?.data?.detail?.error ||
        'Error al validar teléfono'
      );
    }
  };

  // Validate cedula
  const validateCedula = async (id: string) => {
    if (!id) {
      setCedulaValidation('idle');
      setCedulaError('');
      return;
    }

    setCedulaValidation('validating');
    try {
      const response = await api.post('/payments-v2/validate/cedula', {
        cedula: id,
      });

      if (response.data.valid) {
        setCedulaValidation('valid');
        setCedulaError('');
      } else {
        setCedulaValidation('invalid');
        setCedulaError(response.data.error || 'Cédula inválida');
      }
    } catch (error: any) {
      setCedulaValidation('invalid');
      setCedulaError(
        error.response?.data?.detail?.error ||
        'Error al validar cédula'
      );
    }
  };

  // Validate bank code
  const validateBankCode = async (code: string) => {
    if (!code) {
      setBankValidation('idle');
      setBankError('');
      return;
    }

    setBankValidation('validating');
    try {
      const response = await api.post('/payments-v2/validate/bank-code', {
        bank_code: code,
      });

      if (response.data.valid) {
        setBankValidation('valid');
        setBankError('');
      } else {
        setBankValidation('invalid');
        setBankError(response.data.error || 'Código de banco inválido');
      }
    } catch (error: any) {
      setBankValidation('invalid');
      setBankError(
        error.response?.data?.detail?.error ||
        'Error al validar código de banco'
      );
    }
  };

  // Validate transaction reference
  const validateTransactionRef = async (ref: string) => {
    if (!ref) {
      setRefValidation('idle');
      setRefError('');
      return;
    }

    setRefValidation('validating');
    try {
      const response = await api.post('/payments-v2/validate/transaction-ref', {
        reference: ref,
      });

      if (response.data.valid) {
        setRefValidation('valid');
        setRefError('');
      } else {
        setRefValidation('invalid');
        setRefError(response.data.error || 'Referencia inválida');
      }
    } catch (error: any) {
      setRefValidation('invalid');
      setRefError(
        error.response?.data?.detail?.error ||
        'Error al validar referencia'
      );
    }
  };

  const isFormValid =
    phoneValidation === 'valid' &&
    cedulaValidation === 'valid' &&
    bankValidation === 'valid' &&
    refValidation === 'valid' &&
    description.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) {
      onError('Por favor completa todos los campos correctamente');
      return;
    }

    onProcessingChange(true);

    try {
      const response = await api.post('/payments-v2/mobile-venezuela', {
        guest_id: guestId,
        amount: amount,
        currency: 'VES',
        phone_number: phoneNumber,
        cedula: cedula,
        bank_code: bankCode,
        transaction_reference: transactionRef,
        description: description,
        invoice_id: invoiceId,
        reservation_id: reservationId,
      });

      if (response.data.success) {
        toast.success('Pago registrado exitosamente');
        onSuccess(response.data.payment_id);
      } else {
        throw new Error(response.data.message || 'Error al procesar el pago');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      onError(errorMessage);
    } finally {
      onProcessingChange(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Phone Number */}
      <div>
        <Label htmlFor="phone">Número de Teléfono</Label>
        <div className="flex gap-2">
          <Input
            id="phone"
            placeholder="0414-1234567"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
            }}
            onBlur={() => validatePhoneNumber(phoneNumber)}
            disabled={isProcessing}
          />
          {phoneValidation === 'validating' && (
            <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {phoneValidation === 'valid' && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {phoneValidation === 'invalid' && (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>
        {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
        {phoneValidation === 'valid' && mobileOperator && (
          <p className="text-xs text-green-600 mt-1">✓ {mobileOperator}</p>
        )}
      </div>

      {/* Cedula */}
      <div>
        <Label htmlFor="cedula">Cédula de Identidad</Label>
        <div className="flex gap-2">
          <Input
            id="cedula"
            placeholder="V-12.345.678"
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value);
            }}
            onBlur={() => validateCedula(cedula)}
            disabled={isProcessing}
          />
          {cedulaValidation === 'validating' && (
            <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {cedulaValidation === 'valid' && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {cedulaValidation === 'invalid' && (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>
        {cedulaError && <p className="text-xs text-red-600 mt-1">{cedulaError}</p>}
      </div>

      {/* Bank Code */}
      <div>
        <Label htmlFor="bank">Banco</Label>
        <div className="flex gap-2">
          <select
            id="bank"
            value={bankCode}
            onChange={(e) => {
              setBankCode(e.target.value);
            }}
            onBlur={() => validateBankCode(bankCode)}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
          >
            <option value="">Selecciona un banco...</option>
            {banks.map((bank) => (
              <option key={bank.code} value={bank.code}>
                {bank.code} - {bank.name_es}
              </option>
            ))}
          </select>
          {bankValidation === 'validating' && (
            <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {bankValidation === 'valid' && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {bankValidation === 'invalid' && (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>
        {bankError && <p className="text-xs text-red-600 mt-1">{bankError}</p>}
      </div>

      {/* Transaction Reference */}
      <div>
        <Label htmlFor="ref">Referencia de Transacción</Label>
        <div className="flex gap-2">
          <Input
            id="ref"
            placeholder="123456 o ABC12345"
            value={transactionRef}
            onChange={(e) => {
              setTransactionRef(e.target.value.toUpperCase());
            }}
            onBlur={() => validateTransactionRef(transactionRef)}
            disabled={isProcessing}
          />
          {refValidation === 'validating' && (
            <Loader className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
          )}
          {refValidation === 'valid' && (
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          )}
          {refValidation === 'invalid' && (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>
        {refError && <p className="text-xs text-red-600 mt-1">{refError}</p>}
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="desc">Descripción del Pago</Label>
        <Input
          id="desc"
          placeholder="Pago de reserva, etc..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isProcessing}
        />
      </div>

      {/* Amount Display */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Monto a pagar:</span>
          <span className="text-2xl font-bold text-gray-900">
            {amount.toFixed(2)} VES
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-sm text-green-900">
        <p>
          📱 Realiza la transferencia por Banco Móvil con los datos anteriores y proporciona la referencia recibida.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isProcessing}
        className="w-full"
      >
        {isProcessing && <Loader className="w-4 h-4 mr-2 animate-spin" />}
        {isProcessing ? 'Procesando...' : 'Registrar Pago'}
      </Button>
    </form>
  );
}
