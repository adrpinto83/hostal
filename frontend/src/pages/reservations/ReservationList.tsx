import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { reservationsApi, guestsApi, roomsApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Reservation, ReservationCreate, Period } from '@/types';
import { Plus, CheckCircle, XCircle, Calendar, TrendingUp, AlertCircle, CheckCheck, Archive } from 'lucide-react';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ReservationFormModal } from '@/components/reservations/ReservationFormModal';
import { CancellationDialog } from '@/components/reservations/CancellationDialog';
import ReservationHistory from './ReservationHistory';
import { toast } from 'sonner';

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
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'guest' | 'room' | 'date'>('guest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [cancellationDialog, setCancellationDialog] = useState<{
    isOpen: boolean;
    reservationId: number | null;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
  }>({
    isOpen: false,
    reservationId: null,
    reservationNumber: '',
    guestName: '',
    roomNumber: '',
  });

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

  const { data: reservations, isLoading, isFetching } = useQuery<Reservation[]>({
    queryKey: ['reservations', searchQuery],
    queryFn: () => reservationsApi.getAll({ q: searchQuery || undefined }),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const reservationList = reservations ?? [];
  const isInitialLoading = !reservations && isLoading;

  // Filtrar reservas no procesadas (excluir checked_out y cancelled)
  const activeReservations = useMemo(() => {
    let filtered = reservationList.filter(r => r.status !== 'checked_out' && r.status !== 'cancelled');

    // Si se seleccionó un status específico del dashboard, filtrar por ese status
    if (selectedStatus) {
      filtered = filtered.filter(r => r.status === selectedStatus);
    }

    return filtered;
  }, [reservationList, selectedStatus]);

  // Calcular estadísticas
  const stats = useMemo(() => {
    return {
      pending: reservationList.filter(r => r.status === 'pending').length,
      active: reservationList.filter(r => r.status === 'active').length,
      checkedOut: reservationList.filter(r => r.status === 'checked_out').length,
      cancelled: reservationList.filter(r => r.status === 'cancelled').length,
      total: reservationList.length,
    };
  }, [reservationList]);

  const hasReservations = activeReservations.length > 0;

  // Sorting logic - usar activeReservations (sin completadas)
  const sortedReservations = useMemo(() => {
    const sorted = [...activeReservations];
    sorted.sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';

      switch (sortBy) {
        case 'guest':
          aValue = a.guest.full_name.toLowerCase();
          bValue = b.guest.full_name.toLowerCase();
          break;
        case 'room':
          aValue = a.room.number.toLowerCase();
          bValue = b.room.number.toLowerCase();
          break;
        case 'date':
          aValue = a.start_date;
          bValue = b.start_date;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return sorted;
  }, [activeReservations, sortBy, sortOrder, selectedStatus]);

  // Pagination logic
  const totalPages = Math.ceil(sortedReservations.length / itemsPerPage);
  const paginatedReservations = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return sortedReservations.slice(startIdx, endIdx);
  }, [sortedReservations, currentPage, itemsPerPage]);

  const handleSort = (column: 'guest' | 'room' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('✅ Reserva creada exitosamente', {
        description: `Reserva para ${data.guest.full_name} en habitación ${data.room.number}`,
      });
    },
    onError: (error) => {
      toast.error('❌ Error al crear la reserva', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
      handleApiError(error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: reservationsApi.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('✅ Reserva confirmada', {
        description: 'La reserva ha sido confirmada exitosamente',
      });
    },
    onError: (error) => {
      toast.error('❌ Error al confirmar la reserva', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
      handleApiError(error);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (variables: { reservationId: number; reason: string }) =>
      reservationsApi.cancel(variables.reservationId, variables.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('✅ Reserva cancelada', {
        description: 'La reserva ha sido cancelada con justificación',
      });
    },
    onError: (error) => {
      toast.error('❌ Error al cancelar la reserva', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo',
      });
      handleApiError(error);
    },
  });

  const handleFormSubmit = async (data: ReservationCreate) => {
    // Calcular el totalCost basado en los datos que se envían
    const selectedRoom = rooms?.find((r) => r.id === data.room_id);
    let totalDays = data.periods_count;

    switch (data.period) {
      case 'week':
        totalDays = data.periods_count * 7;
        break;
      case 'fortnight':
        totalDays = data.periods_count * 14;
        break;
      case 'month':
        totalDays = data.periods_count * 30;
        break;
    }

    const calculatedCost = selectedRoom && selectedRoom.price_bs ? selectedRoom.price_bs * totalDays : 0;

    const dataToSubmit = {
      ...data,
      price_bs: calculatedCost > 0 ? calculatedCost : undefined,
    };

    const result = await createMutation.mutateAsync(dataToSubmit);

    // Actualizar el cache manualmente
    if (result) {
      // Actualizar TODAS las queries de reservations
      queryClient.setQueryData(['reservations', searchQuery], (oldData: Reservation[] | undefined) => {
        if (!oldData) return undefined;
        // Agregar la nueva reservación al inicio
        return [result, ...oldData];
      });

      // Refetch de todas formas para asegurar sincronización
      await queryClient.refetchQueries({
        queryKey: ['reservations', searchQuery]
      });
    }
  };

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

  const handleDashboardCardClick = (status: string) => {
    // Si intenta filtrar por check-out o canceladas, mostrar sugerencia
    if (status === 'checked_out' || status === 'cancelled') {
      toast.info('📋 Historial de Reservas', {
        description: 'Las reservas completadas y canceladas están en el historial. ¿Quieres verlas?',
        action: {
          label: 'Ir al historial',
          onClick: () => setShowHistory(true),
        },
      });
      return;
    }

    // Para pendientes y activas, hacer el filtro normal
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  const handleCancelClick = (reservation: Reservation) => {
    setCancellationDialog({
      isOpen: true,
      reservationId: reservation.id,
      reservationNumber: `RES-${String(reservation.id).padStart(6, '0')}`,
      guestName: reservation.guest.full_name,
      roomNumber: reservation.room.number,
    });
  };

  const handleCancellationSubmit = async (reason: string) => {
    if (!cancellationDialog.reservationId) return;
    try {
      await cancelMutation.mutateAsync({
        reservationId: cancellationDialog.reservationId,
        reason,
      });
      setCancellationDialog({ isOpen: false, reservationId: null, reservationNumber: '', guestName: '', roomNumber: '' });
    } catch (error) {
      console.error('Error al cancelar:', error);
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

  const formatReservationNumber = (id: number) => {
    return `RES-${String(id).padStart(6, '0')}`;
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

  // Show history if requested
  if (showHistory) {
    return <ReservationHistory onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <Archive className="mr-2 h-4 w-4" />
            Historial
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Reserva
          </Button>
        </div>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pendientes */}
        <Card
          onClick={() => handleDashboardCardClick('pending')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'pending'
              ? 'border-2 border-yellow-400 bg-yellow-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-500">Aguardando confirmación</p>
          </CardContent>
        </Card>

        {/* Activas */}
        <Card
          onClick={() => handleDashboardCardClick('active')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'active'
              ? 'border-2 border-green-400 bg-green-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activas</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-gray-500">Reservas confirmadas</p>
          </CardContent>
        </Card>

        {/* Check-out */}
        <Card
          onClick={() => handleDashboardCardClick('checked_out')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'checked_out'
              ? 'border-2 border-blue-400 bg-blue-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Check-out</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.checkedOut}</div>
            <p className="text-xs text-gray-500">Completadas</p>
          </CardContent>
        </Card>

        {/* Canceladas */}
        <Card
          onClick={() => handleDashboardCardClick('cancelled')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'cancelled'
              ? 'border-2 border-red-400 bg-red-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-gray-500">Anuladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro Activo Indicator */}
      {selectedStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              Filtrado por: <span className="font-bold">{statusLabels[selectedStatus]}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedStatus(null)}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            Limpiar filtro ✕
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar en notas de reservas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>
      <div className="text-sm text-muted-foreground min-h-[1.25rem]">
        {isFetching && !isInitialLoading && <span>Actualizando resultados...</span>}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500">
          Cargando reservas...
        </div>
      ) : hasReservations ? (
        viewMode === 'grid' ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="items-per-page" className="text-sm font-medium">Registros por página:</Label>
                <select
                  id="items-per-page"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedReservations.length)} de {sortedReservations.length} registros
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
        {paginatedReservations.map((reservation) => (
          <Card
            key={reservation.id}
            className={reservation.status === 'pending' ? 'border-2 border-yellow-400 bg-yellow-50' : ''}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-4">
                <Calendar className="h-6 w-6 text-blue-500" />
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {reservation.guest.full_name}
                    {reservation.status === 'pending' && (
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded font-semibold">
                        ⚠ PENDIENTE
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-500">
                    <span className="font-mono font-semibold">{formatReservationNumber(reservation.id)}</span> · Habitación {reservation.room.number}
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
                      onClick={() => handleCancelClick(reservation)}
                      title="Cancelar"
                    >
                      <XCircle className="h-4 w-4 text-red-600" />
                    </Button>
                  </>
                )}
                {reservation.status === 'active' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelClick(reservation)}
                    title="Cancelar (con justificación)"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <XCircle className="h-4 w-4 text-red-600" />
                  </Button>
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

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <span className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedReservations.length)} de {sortedReservations.length} registros
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label htmlFor="items-per-page-table" className="text-sm font-medium">Registros por página:</Label>
                <select
                  id="items-per-page-table"
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedReservations.length)} de {sortedReservations.length} registros
              </div>
            </div>

            <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('guest')}>
                  Reserva {sortBy === 'guest' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                  Fechas {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedReservations.map((reservation) => (
                <tr
                  key={reservation.id}
                  className={reservation.status === 'pending' ? 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400' : 'hover:bg-gray-50'}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{reservation.guest.full_name}</span>
                        {reservation.status === 'pending' && (
                          <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-semibold">⚠ PENDIENTE</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        <span className="font-mono font-semibold">{formatReservationNumber(reservation.id)}</span> · Hab. {reservation.room.number}
                      </span>
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
                          <Button variant="ghost" size="sm" onClick={() => handleCancelClick(reservation)} title="Cancelar">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {reservation.status === 'active' && (
                        <Button variant="ghost" size="sm" onClick={() => handleCancelClick(reservation)} title="Cancelar (con justificación)">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      {reservation.status === 'checked_out' || reservation.status === 'cancelled' ? (
                        <span className="text-xs text-gray-500">Sin acciones</span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <span className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
              <div className="text-sm text-gray-600">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedReservations.length)} de {sortedReservations.length} registros
              </div>
            </div>
          </>
        )
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          No se encontraron reservas para “{searchQuery || 'la búsqueda actual'}”.
        </div>
      )}

      <ReservationFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        guests={guests}
        rooms={rooms}
        existingReservations={reservationList}
        isLoading={createMutation.isPending}
      />

      <CancellationDialog
        isOpen={cancellationDialog.isOpen}
        onClose={() =>
          setCancellationDialog({
            isOpen: false,
            reservationId: null,
            reservationNumber: '',
            guestName: '',
            roomNumber: '',
          })
        }
        onSubmit={handleCancellationSubmit}
        reservationNumber={cancellationDialog.reservationNumber}
        guestName={cancellationDialog.guestName}
        roomNumber={cancellationDialog.roomNumber}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
