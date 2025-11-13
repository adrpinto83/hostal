import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { occupancyApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle, Clock } from 'lucide-react';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

export default function OccupancyList() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Ocupación de Habitaciones</h1>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'grid' ? (
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
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Habitación</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Huésped</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Check-in</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Check-out</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Pagos</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {occupancies?.map((occ) => (
                <tr key={occ.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">#{occ.room_number}</td>
                  <td className="px-4 py-3 text-gray-700">{occ.guest_name}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDateTime(occ.check_in)}</td>
                  <td className="px-4 py-3 text-gray-700">{occ.check_out ? formatDateTime(occ.check_out) : '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {occ.amount_paid_bs
                      ? `Bs ${occ.amount_paid_bs.toFixed(2)}`
                      : occ.amount_paid_usd
                      ? `USD ${occ.amount_paid_usd.toFixed(2)}`
                      : 'Sin pagos'}
                  </td>
                  <td className="px-4 py-3">
                    {occ.is_active ? (
                      <span className="inline-flex items-center text-green-600">
                        <Clock className="mr-1 h-4 w-4" /> Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-500">
                        <CheckCircle className="mr-1 h-4 w-4" /> Finalizada
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
