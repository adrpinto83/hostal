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
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

    // Incluir el precio_bs calculado
    const dataToSubmit = {
      ...formData,
      price_bs: totalCost > 0 ? totalCost : undefined,
    };

    createMutation.mutate(dataToSubmit);
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

  const calculateEndDate = (startDate: string, period: Period, periodsCount: number): string => {
    const date = new Date(startDate);

    switch (period) {
      case 'day':
        date.setDate(date.getDate() + periodsCount - 1);
        break;
      case 'week':
        date.setDate(date.getDate() + (periodsCount * 7) - 1);
        break;
      case 'fortnight':
        date.setDate(date.getDate() + (periodsCount * 14) - 1);
        break;
      case 'month':
        date.setMonth(date.getMonth() + periodsCount);
        date.setDate(date.getDate() - 1);
        break;
    }

    return date.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate(formData.start_date, formData.period, formData.periods_count);

  // Calcular costo total de la reserva
  const calculateTotalCost = (): number => {
    if (formData.room_id === 0) return 0;

    const selectedRoom = rooms?.find((r) => r.id === formData.room_id);
    if (!selectedRoom || !selectedRoom.price_bs) return 0;

    // El precio_bs de la habitación es el precio POR DÍA
    // Calcular el número total de días
    let totalDays = formData.periods_count;

    switch (formData.period) {
      case 'week':
        totalDays = formData.periods_count * 7;
        break;
      case 'fortnight':
        totalDays = formData.periods_count * 14;
        break;
      case 'month':
        // Aproximar un mes a 30 días
        totalDays = formData.periods_count * 30;
        break;
      // case 'day': totalDays = formData.periods_count (ya está correcto)
    }

    return selectedRoom.price_bs * totalDays;
  };

  const totalCost = calculateTotalCost();

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar en notas de reservas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {viewMode === 'grid' ? (
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
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Reserva</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fechas</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations?.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{reservation.guest.full_name}</span>
                      <span className="text-xs text-gray-500">Hab. {reservation.room.number}</span>
                      <Badge className={statusColors[reservation.status]}>{statusLabels[reservation.status]}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p>Inicio: {formatDate(reservation.start_date)}</p>
                    <p>Fin: {formatDate(reservation.end_date)}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    Bs {reservation.price_bs.toFixed(2)}
                    {exchangeRates && exchangeRates.USD > 0 && (
                      <p className="text-xs text-gray-500">USD {(reservation.price_bs / exchangeRates.USD).toFixed(2)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-sm">
                    {reservation.notes ? (
                      <span className="line-clamp-2">{reservation.notes}</span>
                    ) : (
                      <span className="text-gray-400">Sin notas</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {reservation.status === 'pending' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleConfirm(reservation.id)} title="Confirmar">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleCancel(reservation.id)} title="Cancelar">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {reservation.status !== 'pending' && (
                        <span className="text-xs text-gray-500">Sin acciones</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">📅 Nueva Reserva</h2>
              <Button variant="ghost" size="sm" onClick={closeModal} className="rounded-full">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Huésped */}
                  <div>
                    <Label htmlFor="guest_id" className="text-sm font-semibold">
                      👤 Huésped
                    </Label>
                    <select
                      id="guest_id"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                  {/* Habitación */}
                  <div>
                    <Label htmlFor="room_id" className="text-sm font-semibold">
                      🛏️ Habitación
                    </Label>
                    <select
                      id="room_id"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                  {/* Fecha de inicio */}
                  <div>
                    <Label htmlFor="start_date" className="text-sm font-semibold">
                      📅 Fecha de Inicio
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData({ ...formData, start_date: e.target.value })
                      }
                      className="mt-2 border-gray-300"
                      required
                    />
                  </div>

                  {/* Cantidad y Período */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="periods_count" className="text-sm font-semibold">
                        📊 Cantidad
                      </Label>
                      <Input
                        id="periods_count"
                        type="number"
                        min="1"
                        value={formData.periods_count}
                        onChange={(e) =>
                          setFormData({ ...formData, periods_count: parseInt(e.target.value) })
                        }
                        className="mt-2 border-gray-300"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="period" className="text-sm font-semibold">
                        ⏱️ Período
                      </Label>
                      <select
                        id="period"
                        className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                  {/* Resumen de fechas y costo */}
                  <div className="space-y-3">
                    {/* Dates */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900 font-semibold mb-2">📍 Rango de Reserva:</p>
                      <div className="space-y-1 text-sm text-blue-800">
                        <p>Inicio: <span className="font-semibold">{formatDate(formData.start_date)}</span></p>
                        <p>Fin: <span className="font-semibold">{formatDate(endDate)}</span></p>
                        <p>Total: <span className="font-semibold">{formData.periods_count} {periodLabels[formData.period].toLowerCase()}</span></p>
                      </div>
                    </div>

                    {/* Cost Calculation */}
                    {totalCost > 0 && (
                      <div className="p-4 bg-green-50 border-2 border-green-400 rounded-lg">
                        <p className="text-sm text-green-900 font-semibold mb-3">💰 Costo de Reserva:</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between text-green-800">
                            <span>Tarifa por día:</span>
                            <span className="font-semibold">Bs {rooms?.find(r => r.id === formData.room_id)?.price_bs?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between text-green-800">
                            <span>Cantidad de días:</span>
                            <span className="font-semibold">
                              {formData.period === 'day' ? formData.periods_count :
                               formData.period === 'week' ? formData.periods_count * 7 :
                               formData.period === 'fortnight' ? formData.periods_count * 14 :
                               formData.periods_count * 30} días
                            </span>
                          </div>
                          <div className="border-t border-green-300 pt-2 flex justify-between">
                            <span className="font-bold text-green-900">TOTAL RESERVA:</span>
                            <span className="text-lg font-bold text-green-700">Bs {totalCost.toFixed(2)}</span>
                          </div>
                          {exchangeRates && exchangeRates.USD > 0 && (
                            <div className="text-xs text-green-700 text-right">
                              ≈ USD ${(totalCost / exchangeRates.USD).toFixed(2)}
                            </div>
                          )}
                          {exchangeRates && exchangeRates.EUR > 0 && (
                            <div className="text-xs text-green-700 text-right">
                              ≈ EUR €{(totalCost / exchangeRates.EUR).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-green-700 mt-3 italic">
                          💡 Este monto será acreditado a la cuenta del huésped y podrá pagarse después
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div>
                    <Label htmlFor="notes" className="text-sm font-semibold">
                      📝 Notas (Opcional)
                    </Label>
                    <textarea
                      id="notes"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={2}
                      placeholder="Información adicional sobre la reserva..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2 justify-end pt-4">
                    <Button type="button" variant="outline" onClick={closeModal}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                      {createMutation.isPending ? '⏳ Creando...' : '✅ Crear Reserva'}
                    </Button>
                  </div>
                </form>

                {/* Calendario */}
                <div className="hidden lg:block">
                  <CalendarComponent
                    startDate={formData.start_date}
                    endDate={endDate}
                    onDateSelect={(date) =>
                      setFormData({ ...formData, start_date: date })
                    }
                  />
                </div>
              </div>

              {/* Calendario móvil (debajo en pantallas pequeñas) */}
              <div className="lg:hidden border-t border-gray-200 pt-6">
                <CalendarComponent
                  startDate={formData.start_date}
                  endDate={endDate}
                  onDateSelect={(date) =>
                    setFormData({ ...formData, start_date: date })
                  }
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <p className="text-xs text-gray-600 text-center">
                💡 El calendario muestra el rango de fechas reservado en azul
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
