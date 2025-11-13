import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { occupancyApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { CheckCircle, Clock } from 'lucide-react';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

export default function OccupancyList() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('/api/v1/exchange-rates/current');
        if (response.ok) {
          const data = await response.json();
          setExchangeRates(data);
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchExchangeRates();
  }, []);

  const { data: occupancies, isLoading } = useQuery({
    queryKey: ['occupancies'],
    queryFn: () => occupancyApi.getAll(),
  });

  if (isLoading) return <div>Cargando ocupaciones...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ocupación de Habitaciones</h1>

      <div className="grid gap-4">
        {occupancies?.map((occ) => (
          <Card key={occ.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Habitación {occ.room_number} - {occ.guest_name}
                </CardTitle>
                {occ.is_active ? (
                  <span className="inline-flex items-center text-green-600">
                    <Clock className="mr-1 h-4 w-4" />
                    Activa
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-500">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Finalizada
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Check-in:</p>
                  <p className="font-medium">{formatDateTime(occ.check_in)}</p>
                </div>
                {occ.check_out && (
                  <div>
                    <p className="text-sm text-gray-600">Check-out:</p>
                    <p className="font-medium">{formatDateTime(occ.check_out)}</p>
                  </div>
                )}
                <div className="md:col-span-2">
                  {occ.amount_paid_bs && (
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-600 font-semibold mb-1">Monto Pagado:</p>
                      <p className="text-blue-800">💵 Bs {occ.amount_paid_bs.toFixed(2)}</p>
                      {exchangeRates && exchangeRates.USD > 0 && (
                        <p className="text-blue-800">💲 USD ${(occ.amount_paid_bs / exchangeRates.USD).toFixed(2)}</p>
                      )}
                      {exchangeRates && exchangeRates.EUR > 0 && (
                        <p className="text-blue-800">€ EUR €{(occ.amount_paid_bs / exchangeRates.EUR).toFixed(2)}</p>
                      )}
                    </div>
                  )}
                  {occ.amount_paid_usd && !occ.amount_paid_bs && (
                    <div className="p-2 bg-blue-50 rounded">
                      <p className="text-sm text-blue-600 font-semibold mb-1">Monto Pagado:</p>
                      <p className="text-blue-800">💲 USD ${occ.amount_paid_usd.toFixed(2)}</p>
                      {exchangeRates && exchangeRates.USD > 0 && (
                        <p className="text-blue-800">💵 Bs {(occ.amount_paid_usd * exchangeRates.USD).toFixed(2)}</p>
                      )}
                      {exchangeRates && exchangeRates.EUR > 0 && (
                        <p className="text-blue-800">€ EUR €{(occ.amount_paid_usd * exchangeRates.USD / exchangeRates.EUR).toFixed(2)}</p>
                      )}
                    </div>
                  )}
                  {!occ.amount_paid_bs && !occ.amount_paid_usd && (
                    <p className="text-sm text-gray-500">No hay pagos registrados</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
