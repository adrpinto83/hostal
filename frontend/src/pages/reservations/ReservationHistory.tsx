import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { reservationsApi } from '@/lib/api';
import type { Reservation } from '@/types';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react';

interface ReservationHistoryProps {
  onBack: () => void;
}

const statusLabels: Record<string, string> = {
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  checked_out: 'bg-blue-500',
  cancelled: 'bg-red-500',
};

export default function ReservationHistory({ onBack }: ReservationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allReservations, isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.getAll(),
    refetchOnMount: true,
  });

  const reservationList = allReservations ?? [];

  // Filter for completed/cancelled reservations only
  const historyReservations = reservationList.filter(
    (r) => r.status === 'checked_out' || r.status === 'cancelled'
  );

  // Filter by search
  const filteredReservations = historyReservations.filter((r) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      r.guest.full_name.toLowerCase().includes(searchLower) ||
      r.room.number.toLowerCase().includes(searchLower) ||
      r.notes?.toLowerCase().includes(searchLower) ||
      r.cancellation_reason?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  };

  const formatReservationNumber = (id: number) => {
    return `RES-${String(id).padStart(6, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">📋 Historial de Reservas</h1>
            <p className="text-sm text-gray-600 mt-1">Reservas completadas y canceladas</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar por huésped, habitación, notas o razón de cancelación..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Stats Summary */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Check-outs</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {historyReservations.filter((r) => r.status === 'checked_out').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {historyReservations.filter((r) => r.status === 'cancelled').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reservations List */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500">
          Cargando historial de reservas...
        </div>
      ) : filteredReservations.length > 0 ? (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Reserva</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Huésped</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fechas</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Razón / Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">
                      {formatReservationNumber(reservation.id)}
                    </span>
                    <span className="text-xs text-gray-500 block">Hab. {reservation.room.number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-gray-900">{reservation.guest.full_name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p className="text-xs">Inicio: {formatDate(reservation.start_date)}</p>
                    <p className="text-xs">Fin: {formatDate(reservation.end_date)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="font-medium">Bs {reservation.price_bs.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColors[reservation.status]}>
                      {statusLabels[reservation.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs">
                    {reservation.status === 'cancelled' && reservation.cancellation_reason ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-red-700">Razón:</p>
                        <p className="text-xs line-clamp-2">{reservation.cancellation_reason}</p>
                      </div>
                    ) : reservation.notes ? (
                      <span className="text-xs line-clamp-2">{reservation.notes}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin información</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          <p>
            {searchQuery
              ? `No se encontraron reservas procesadas para "${searchQuery}"`
              : 'No hay reservas procesadas en el historial'}
          </p>
        </div>
      )}
    </div>
  );
}
