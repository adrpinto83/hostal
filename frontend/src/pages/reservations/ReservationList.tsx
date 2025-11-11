import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { reservationsApi, guestsApi, roomsApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Reservation, ReservationCreate, Currency } from '@/types';
import { Plus, CheckCircle, XCircle, X, Calendar } from 'lucide-react';

const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
};

const statusColors = {
  pending: 'bg-yellow-500',
  confirmed: 'bg-green-500',
  cancelled: 'bg-red-500',
  completed: 'bg-blue-500',
};

export default function ReservationList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<ReservationCreate>({
    guest_id: 0,
    room_id: 0,
    start_date: '',
    end_date: '',
    total_amount: 0,
    currency: 'USD',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', searchQuery],
    queryFn: () => reservationsApi.getAll({ q: searchQuery || undefined }),
  });

  const { data: guests } = useQuery({
    queryKey: ['guests'],
    queryFn: guestsApi.getAll,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const confirmMutation = useMutation({
    mutationFn: reservationsApi.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      reservationsApi.cancel(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const resetForm = () => {
    setFormData({
      guest_id: 0,
      room_id: 0,
      start_date: '',
      end_date: '',
      total_amount: 0,
      currency: 'USD',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleConfirm = (id: number) => {
    if (confirm('¿Confirmar esta reserva?')) {
      confirmMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    const reason = prompt('Motivo de cancelación (opcional):');
    if (reason !== null) {
      cancelMutation.mutate({ id, reason });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Reserva
        </Button>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar reservas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {reservations?.map((reservation) => (
          <Card key={reservation.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-4">
                <Calendar className="h-6 w-6 text-blue-500" />
                <div>
                  <CardTitle className="text-lg font-bold">
                    {reservation.guest_name || `Huésped #${reservation.guest_id}`}
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Habitación {reservation.room_number || reservation.room_id}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge className={statusColors[reservation.status]}>
                  {statusLabels[reservation.status]}
                </Badge>
                {reservation.status === 'pending' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfirm(reservation.id)}
                      title="Confirmar"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(reservation.id)}
                      title="Cancelar"
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Check-in: </span>
                  <span className="font-medium">{formatDate(reservation.start_date)}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Check-out: </span>
                  <span className="font-medium">{formatDate(reservation.end_date)}</span>
                </div>
              </div>
              {reservation.total_amount && (
                <div>
                  <span className="text-sm text-gray-500">Monto: </span>
                  <span className="font-bold text-lg">
                    {reservation.total_amount} {reservation.currency}
                  </span>
                </div>
              )}
              {reservation.notes && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Notas:</span> {reservation.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nueva Reserva</h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="guest_id">Huésped</Label>
                <select
                  id="guest_id"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.guest_id}
                  onChange={(e) =>
                    setFormData({ ...formData, guest_id: parseInt(e.target.value) })
                  }
                  required
                >
                  <option value={0}>Seleccionar huésped</option>
                  {guests?.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.full_name} ({guest.document_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="room_id">Habitación</Label>
                <select
                  id="room_id"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.room_id}
                  onChange={(e) =>
                    setFormData({ ...formData, room_id: parseInt(e.target.value) })
                  }
                  required
                >
                  <option value={0}>Seleccionar habitación</option>
                  {rooms?.filter(r => r.status === 'available').map((room) => (
                    <option key={room.id} value={room.id}>
                      Habitación {room.number} ({room.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="start_date">Fecha de inicio</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">Fecha de fin</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="total_amount">Monto</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, total_amount: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <select
                    id="currency"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value as Currency })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  className="w-full px-3 py-2 border rounded-md"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Crear Reserva
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
