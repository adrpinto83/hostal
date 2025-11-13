import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { reservationsApi, guestsApi, roomsApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { ReservationCreate, Period } from '@/types';
import { Plus, CheckCircle, XCircle, X, Calendar } from 'lucide-react';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  active: 'Activa',
  checked_out: 'Check-out',
  cancelled: 'Cancelada',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  active: 'bg-green-500',
  checked_out: 'bg-blue-500',
  cancelled: 'bg-red-500',
};

const periodLabels: Record<Period, string> = {
  day: 'Día(s)',
  week: 'Semana(s)',
  fortnight: 'Quincena(s)',
  month: 'Mes(es)',
};

const initialFormData: ReservationCreate = {
  guest_id: 0,
  room_id: 0,
  start_date: new Date().toISOString().split('T')[0],
  period: 'day',
  periods_count: 1,
  notes: '',
};

export default function ReservationList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState<ReservationCreate>(initialFormData);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);

  const queryClient = useQueryClient();

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

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['reservations', searchQuery],
    queryFn: () => reservationsApi.getAll({ q: searchQuery || undefined }),
  });

  const { data: guests } = useQuery({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll(),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: reservationsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      closeModal();
    },
    onError: (error) => {
      handleApiError(error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: reservationsApi.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      handleApiError(error);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      handleApiError(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.guest_id === 0 || formData.room_id === 0) {
      alert('Por favor, seleccione un huésped y una habitación.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleConfirm = (id: number) => {
    if (confirm('¿Confirmar esta reserva?')) {
      confirmMutation.mutate(id);
    }
  };

  const handleCancel = (id: number) => {
    if (confirm('¿Cancelar esta reserva?')) {
      cancelMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC', // Important for correct date display
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
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
          placeholder="Buscar en notas de reservas..."
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
                    {reservation.guest.full_name}
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    Habitación {reservation.room.number}
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
            <CardContent className="space-y-2 pt-4">
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
              <div className="mt-3 p-2 bg-purple-50 rounded">
                <p className="font-semibold text-purple-900 mb-1">Monto de Reserva:</p>
                <p className="text-purple-800">💵 Bs {reservation.price_bs.toFixed(2)}</p>
                {exchangeRates && exchangeRates.USD > 0 && (
                  <p className="text-purple-800">💲 USD ${(reservation.price_bs / exchangeRates.USD).toFixed(2)}</p>
                )}
                {exchangeRates && exchangeRates.EUR > 0 && (
                  <p className="text-purple-800">€ EUR €{(reservation.price_bs / exchangeRates.EUR).toFixed(2)}</p>
                )}
              </div>
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
                  <option value={0} disabled>Seleccionar huésped</option>
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
                  <option value={0} disabled>Seleccionar habitación</option>
                  {rooms?.map((room) => (
                    <option key={room.id} value={room.id}>
                      Habitación {room.number} ({room.type}) - {room.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="start_date">Fecha de inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periods_count">Cantidad</Label>
                  <Input
                    id="periods_count"
                    type="number"
                    min="1"
                    value={formData.periods_count}
                    onChange={(e) =>
                      setFormData({ ...formData, periods_count: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="period">Período</Label>
                  <select
                    id="period"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.period}
                    onChange={(e) =>
                      setFormData({ ...formData, period: e.target.value as Period })
                    }
                    required
                  >
                    {Object.entries(periodLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notas (Opcional)</Label>
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

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creando...' : 'Crear Reserva'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
