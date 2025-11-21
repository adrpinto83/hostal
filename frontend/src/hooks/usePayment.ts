import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PaymentState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  paymentId: number | null;
}

interface PaymentOptions {
  guestId: number;
  amount: number;
  currency: 'usd' | 'ves' | 'eur';
  invoiceId?: number;
  reservationId?: number;
}

export function usePayment() {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error: null,
    success: false,
    paymentId: null,
  });

  // Create Stripe PaymentIntent
  const createStripeIntent = useCallback(
    async (options: PaymentOptions) => {
      setState({ isLoading: true, error: null, success: false, paymentId: null });

      try {
        const response = await api.post('/payments-v2/stripe/create-intent', {
          guest_id: options.guestId,
          amount: options.amount,
          currency: options.currency,
          invoice_id: options.invoiceId,
          reservation_id: options.reservationId,
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al crear el pago');
        }

        setState({
          isLoading: false,
          error: null,
          success: true,
          paymentId: response.data.payment_id,
        });

        return response.data.data.client_secret;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState({
          isLoading: false,
          error: errorMessage,
          success: false,
          paymentId: null,
        });
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  // Get Stripe Payment Status
  const getPaymentStatus = useCallback(
    async (paymentIntentId: string) => {
      try {
        const response = await api.get(
          `/payments-v2/stripe/${paymentIntentId}/status`
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al obtener estado');
        }

        return response.data.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      }
    },
    []
  );

  // Process Venezuelan Mobile Payment
  const processMobilePayment = useCallback(
    async (
      options: PaymentOptions & {
        phoneNumber: string;
        cedula: string;
        bankCode: string;
        transactionReference: string;
        description: string;
      }
    ) => {
      setState({ isLoading: true, error: null, success: false, paymentId: null });

      try {
        const response = await api.post('/payments-v2/mobile-venezuela', {
          guest_id: options.guestId,
          amount: options.amount,
          currency: 'VES',
          phone_number: options.phoneNumber,
          cedula: options.cedula,
          bank_code: options.bankCode,
          transaction_reference: options.transactionReference,
          description: options.description,
          invoice_id: options.invoiceId,
          reservation_id: options.reservationId,
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al procesar el pago');
        }

        setState({
          isLoading: false,
          error: null,
          success: true,
          paymentId: response.data.payment_id,
        });

        toast.success('Pago registrado exitosamente');
        return response.data.payment_id;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState({
          isLoading: false,
          error: errorMessage,
          success: false,
          paymentId: null,
        });
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  // Refund Payment
  const refundPayment = useCallback(
    async (
      paymentId: number,
      amount?: number,
      reason: string = 'requested_by_customer'
    ) => {
      setState({ isLoading: true, error: null, success: false, paymentId: null });

      try {
        const response = await api.post(
          `/payments-v2/stripe/${paymentId}/refund`,
          {
            amount,
            reason,
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || 'Error al procesar reembolso');
        }

        setState({
          isLoading: false,
          error: null,
          success: true,
          paymentId: response.data.payment_id,
        });

        toast.success('Reembolso procesado exitosamente');
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setState({
          isLoading: false,
          error: errorMessage,
          success: false,
          paymentId: null,
        });
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  // Get Payment Details
  const getPaymentDetails = useCallback(
    async (paymentId: number) => {
      try {
        const response = await api.get(`/payments-v2/${paymentId}`);
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  // Get Guest Payment History
  const getGuestPayments = useCallback(
    async (guestId: number, limit: number = 50, offset: number = 0) => {
      try {
        const response = await api.get(
          `/payments-v2/guest/${guestId}?limit=${limit}&offset=${offset}`
        );
        return response.data;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        toast.error(errorMessage);
        throw error;
      }
    },
    []
  );

  // Reset state
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      paymentId: null,
    });
  }, []);

  return {
    // State
    ...state,
    // Methods
    createStripeIntent,
    getPaymentStatus,
    processMobilePayment,
    refundPayment,
    getPaymentDetails,
    getGuestPayments,
    reset,
  };
}
