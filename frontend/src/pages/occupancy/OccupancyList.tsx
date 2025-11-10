import { useQuery } from '@tanstack/react-query';
import { occupancyApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { CheckCircle, Clock } from 'lucide-react';

export default function OccupancyList() {
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
                <div>
                  <p className="text-sm text-gray-600">Pagado (VES):</p>
                  <p className="font-medium">{occ.amount_paid_bs ? formatCurrency(occ.amount_paid_bs, 'VES') : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pagado (USD):</p>
                  <p className="font-medium">{occ.amount_paid_usd ? formatCurrency(occ.amount_paid_usd, 'USD') : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
