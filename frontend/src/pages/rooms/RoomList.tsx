import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { roomsApi, mediaApi, occupancyApi, maintenanceApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Room, RoomUpdate, Media, Occupancy, Maintenance, PaginatedResponse } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Plus, Edit, Trash2, X, Image as ImageIcon, CheckCircle, XCircle, UserCircle, Wrench } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { RoomFormModal } from '@/components/rooms/RoomFormModal';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

interface FormData {
  number: string;
  type: 'single' | 'double' | 'suite';
  price_amount?: number;
  price_currency?: 'VES' | 'USD' | 'EUR';
  notes: string;
}

const roomTypeLabels = {
  single: 'Individual',
  double: 'Doble',
  suite: 'Suite',
};

const statusLabels = {
  available: 'Disponible',
  occupied: 'Ocupada',
  cleaning: 'Limpieza',
  maintenance: 'Mantenimiento',
  out_of_service: 'Fuera de servicio',
};

const statusColors = {
  available: 'bg-green-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-yellow-500',
  maintenance: 'bg-orange-500',
  out_of_service: 'bg-gray-500',
};

export default function RoomList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formData, setFormData] = useState<FormData>({
    number: '',
    type: 'single',
    price_amount: undefined,
    price_currency: 'VES',
    notes: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'number' | 'type' | 'status'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const {
    data: roomsPage,
    isLoading,
    isFetching,
  } = useQuery<PaginatedResponse<Room>>({
    queryKey: ['rooms', searchTerm, currentPage, itemsPerPage, sortBy, sortOrder],
    queryFn: () =>
      roomsApi.getPaginated({
        q: searchTerm || undefined,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      }),
    keepPreviousData: true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const roomList = roomsPage?.items ?? [];
  const totalRooms = roomsPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRooms / itemsPerPage));
  const isInitialLoading = !roomsPage && isLoading;
  const hasRooms = totalRooms > 0;
  const startItem = hasRooms ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = hasRooms ? Math.min(currentPage * itemsPerPage, totalRooms) : 0;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSort = (column: 'number' | 'type' | 'status') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const { data: activeOccupancies } = useQuery<Occupancy[]>({
    queryKey: ['rooms', 'active-occupancies'],
    queryFn: () => occupancyApi.getAll({ active_only: true }),
  });

  const { data: pendingMaintenance } = useQuery<Maintenance[]>({
    queryKey: ['rooms', 'maintenance', 'pending'],
    queryFn: () => maintenanceApi.getAll(),
  });

  const { data: roomPhotos = [], refetch: refetchPhotos } = useQuery<Media[]>({
    queryKey: ['room-photos'],
    queryFn: () => mediaApi.getAll({ category: 'room_photo' }),
  });

  const occupancyMap = useMemo(() => {
    const map: Record<number, Occupancy> = {};
    (activeOccupancies ?? []).forEach((occ) => {
      if (!occ.room_id || map[occ.room_id]) return;
      map[occ.room_id] = occ;
    });
    return map;
  }, [activeOccupancies]);

  const maintenanceMap = useMemo(() => {
    const map: Record<number, Maintenance[]> = {};
    (pendingMaintenance ?? []).forEach((task) => {
      if (!task.room_id) return;
      if (!map[task.room_id]) {
        map[task.room_id] = [];
      }
      map[task.room_id].push(task);
    });
    return map;
  }, [pendingMaintenance]);

  const createMutation = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormSuccess('✅ Habitación creada exitosamente');
    },
    onError: (error) => {
      setFormError(handleApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoomUpdate }) =>
      roomsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setFormSuccess('✅ Habitación actualizada exitosamente');
    },
    onError: (error) => {
      setFormError(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      alert('Error al eliminar la habitación: ' + handleApiError(error));
    },
  });

  const resetForm = () => {
    setFormData({ number: '', type: 'single', price_amount: undefined, price_currency: 'VES', notes: '' });
  };

  const handleFormSubmit = async (data: FormData) => {
    let result: Room | undefined;

    if (editingRoom) {
      result = await updateMutation.mutateAsync({ id: editingRoom.id, data });
    } else {
      result = await createMutation.mutateAsync(data);
    }

    // Actualizar el cache manualmente
    if (result) {
      // Actualizar TODAS las queries de rooms
      queryClient.setQueryData(['rooms', searchTerm], (oldData: Room[] | undefined) => {
        if (!oldData) return undefined;

        if (editingRoom) {
          // Si es una actualización, reemplazar la room existente
          return oldData.map(r => r.id === result.id ? result : r);
        } else {
          // Si es una creación, agregar la nueva room al inicio
          return [result, ...oldData];
        }
      });

      // Refetch de todas formas para asegurar sincronización
      await queryClient.refetchQueries({
        queryKey: ['rooms', searchTerm]
      });
    }

    // Cerrar modal después de refetch
    setTimeout(() => {
      setIsModalOpen(false);
      setEditingRoom(null);
      resetForm();
      setFormSuccess('');
      setFormError('');
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      number: room.number,
      type: room.type || 'single',
      price_amount: room.price_bs || undefined,
      price_currency: 'VES', // Show in VES when editing
      notes: room.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar esta habitación?')) {
      deleteMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
    resetForm();
    setFormError('');
    setFormSuccess('');
  };

  const validateForm = (): boolean => {
    setFormError('');

    if (!formData.number.trim()) {
      setFormError('El número de habitación es obligatorio');
      return false;
    }

    if (formData.number.trim().length > 10) {
      setFormError('El número de habitación no puede exceder 10 caracteres');
      return false;
    }

    if (formData.price_amount !== undefined && formData.price_amount < 0) {
      setFormError('El precio no puede ser negativo');
      return false;
    }

    return true;
  };

  const getRoomPhotos = (roomId: number) => {
    return roomPhotos
      .filter((photo) => photo.room_id === roomId)
      .sort(
        (a, b) => Number(b.is_primary ?? false) - Number(a.is_primary ?? false)
      );
  };

  const openPhotoModal = (room: Room) => {
    setSelectedRoom(room);
    setIsPhotoModalOpen(true);
    // Refrescar fotos cuando se abre el modal
    refetchPhotos();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Habitaciones</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Habitación
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar por número o notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>
      <div className="text-sm text-muted-foreground min-h-[1.25rem]">
        {isFetching && !isInitialLoading && <span>Actualizando resultados...</span>}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500">
          Cargando habitaciones...
        </div>
      ) : hasRooms ? (
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
                Mostrando {startItem} - {endItem} de {totalRooms} registros
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomList.map((room) => {
                    const photos = getRoomPhotos(room.id);
                    const primaryPhoto = photos[0];
                    const activeOccupancy = occupancyMap[room.id];
                    const roomMaintenance = maintenanceMap[room.id] ?? [];
                    const maintenanceSummary = roomMaintenance[0];
                    return (
                      <Card
                        key={room.id}
                        className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow"
                      >
                        {/* Imagen destacada */}
                        <div className="relative aspect-[4/3] bg-gray-100 group order-first">
                          {primaryPhoto ? (
                            <div className="relative h-full w-full">
                              <img
                                src={primaryPhoto.url}
                                alt={`Habitación ${room.number}`}
                                className="w-full h-full object-cover"
                              />
                              {primaryPhoto.is_primary && (
                                <span className="absolute top-4 left-4 bg-white/90 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full shadow">
                                  Foto principal
                                </span>
                              )}
                              {photos.length > 1 && (
                                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openPhotoModal(room)}
                                    className="bg-white/80 hover:bg-white rounded-full p-2 shadow"
                                    title="Ver galería"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => openPhotoModal(room)}
                                    className="bg-white/80 hover:bg-white rounded-full p-2 shadow"
                                    title="Ver galería"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                              <div
                                className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer hover:bg-black/80"
                                onClick={() => openPhotoModal(room)}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {photos.length} foto{photos.length === 1 ? '' : 's'}
                              </div>
                            </div>
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors"
                              onClick={() => openPhotoModal(room)}
                            >
                              <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-gray-500 font-medium text-center">Agregar fotos</p>
                              <p className="text-gray-400 text-xs text-center mt-1">Haz clic para subir imágenes</p>
                            </div>
                          )}
                        </div>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                          <div>
                            <CardTitle className="text-2xl font-bold">
                              Habitación {room.number}
                            </CardTitle>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPhotoModal(room)}
                              title="Gestionar fotos"
                              className="flex items-center gap-1"
                            >
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(room)}
                              title="Editar habitación"
                            >
                              <Edit className="h-4 w-4 text-gray-600" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(room.id)}
                              title="Eliminar habitación"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-3">
                          <div className="grid grid-cols-2 gap-4 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">TIPO</p>
                              <Badge variant="secondary">
                                {roomTypeLabels[room.type || 'single']}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 font-medium mb-1">ESTADO</p>
                              <Badge className={statusColors[room.status]}>
                                {statusLabels[room.status]}
                              </Badge>
                            </div>
                          </div>

                          {room.price_bs && (
                            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                              <p className="font-semibold text-green-900 mb-2 text-sm">Precio por Noche</p>
                              <div className="space-y-1">
                                <p className="text-green-800 font-semibold">💵 Bs {room.price_bs.toFixed(2)}</p>
                                {exchangeRates && exchangeRates.USD > 0 && (
                                  <p className="text-green-700 text-sm">💲 USD ${(room.price_bs / exchangeRates.USD).toFixed(2)}</p>
                                )}
                                {exchangeRates && exchangeRates.EUR > 0 && (
                                  <p className="text-green-700 text-sm">€ EUR €{(room.price_bs / exchangeRates.EUR).toFixed(2)}</p>
                                )}
                              </div>
                            </div>
                          )}

                          {room.notes && (
                            <div className="p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs text-blue-900 font-medium mb-1">NOTAS</p>
                              <p className="text-sm text-blue-800">{room.notes}</p>
                            </div>
                          )}

                          {activeOccupancy && (
                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-xs text-purple-700 font-semibold mb-1 flex items-center gap-1">
                                <UserCircle className="h-3.5 w-3.5" />
                                Ocupada por
                              </p>
                              <p className="text-base font-semibold text-purple-900">
                                {activeOccupancy.guest_name || 'Huésped en curso'}
                              </p>
                              <p className="text-xs text-purple-700 mt-1">
                                Check-in: {formatDateTime(activeOccupancy.check_in)}
                              </p>
                              {activeOccupancy.reservation_id && (
                                <p className="text-xs text-purple-600">
                                  Reserva #{activeOccupancy.reservation_id}
                                </p>
                              )}
                            </div>
                          )}

                          {maintenanceSummary && (
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                              <p className="text-xs text-orange-700 font-semibold mb-1 flex items-center gap-1">
                                <Wrench className="h-3.5 w-3.5" />
                                Mantenimiento pendiente
                              </p>
                              <p className="text-base font-semibold text-orange-900">
                                {maintenanceSummary.title}
                              </p>
                              <p className="text-xs text-orange-700 mt-1 capitalize">
                                Estado: {maintenanceSummary.status}
                              </p>
                              <p className="text-xs text-orange-700">
                                Responsable: {maintenanceSummary.assigned_staff_name || 'Sin asignar'}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
            })}
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
                Mostrando {startItem} - {endItem} de {totalRooms} registros
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
                Mostrando {startItem} - {endItem} de {totalRooms} registros
              </div>
            </div>

            <div className="bg-white border rounded-lg overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('number')}>
                    Habitación {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('type')}>
                    Tipo {sortBy === 'type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                    Estado {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Precio</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actividad</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roomList.map((room) => {
                          const photos = getRoomPhotos(room.id);
                          const primaryPhoto = photos[0];
                          const activeOccupancy = occupancyMap[room.id];
                          const roomMaintenance = maintenanceMap[room.id] ?? [];
                          const maintenanceSummary = roomMaintenance[0];
                          return (
                            <tr key={room.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {primaryPhoto ? (
                                    <img
                                      src={`${primaryPhoto.url}?thumb=1`}
                                      alt={`Habitación ${room.number}`}
                                      className="h-12 w-16 rounded-md object-cover border"
                                    />
                                  ) : (
                                    <div className="h-12 w-16 rounded-md bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                      Sin foto
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-semibold text-gray-900">#{room.number}</p>
                                    <p className="text-xs text-gray-500">{photos.length} foto{photos.length === 1 ? '' : 's'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant="secondary">{roomTypeLabels[room.type || 'single']}</Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={statusColors[room.status]}>
                                  {statusLabels[room.status]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {room.price_bs ? `Bs ${room.price_bs.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-600 max-w-sm">
                                {room.notes ? <span className="line-clamp-2">{room.notes}</span> : <span className="text-gray-400">Sin notas</span>}
                              </td>
                              <td className="px-4 py-3 text-gray-700 space-y-2">
                                {activeOccupancy && (
                                  <div>
                                    <p className="font-semibold text-purple-900 flex items-center gap-1">
                                      <UserCircle className="h-4 w-4" />
                                      {activeOccupancy.guest_name || 'Huésped en curso'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Check-in: {formatDateTime(activeOccupancy.check_in)}
                                    </p>
                                  </div>
                                )}
                                {maintenanceSummary && (
                                  <div>
                                    <p className="font-semibold text-orange-900 flex items-center gap-1">
                                      <Wrench className="h-4 w-4" />
                                      {maintenanceSummary.title}
                                    </p>
                                    <p className="text-xs text-gray-500 capitalize">
                                      Estado: {maintenanceSummary.status}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Responsable: {maintenanceSummary.assigned_staff_name || 'Sin asignar'}
                                    </p>
                                  </div>
                                )}
                                {!activeOccupancy && !maintenanceSummary && (
                                  <span className="text-gray-400">Sin actividad</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openPhotoModal(room)} title="Gestionar fotos">
                                    <ImageIcon className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(room)} title="Editar">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDelete(room.id)} title="Eliminar">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                })}
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
                Mostrando {startItem} - {endItem} de {totalRooms} registros
              </div>
            </div>
          </>
        )
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          No se encontraron habitaciones para “{searchTerm || 'la búsqueda actual'}”.
        </div>
      )}

      <RoomFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        editingRoom={editingRoom}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Modal de Fotos */}
      {isPhotoModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Fotos de Habitación {selectedRoom.number}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  // Refrescar las fotos cuando se cierra el modal
                  setTimeout(() => refetchPhotos(), 100);
                }}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Carrusel de imágenes */}
              {(() => {
                const photos = getRoomPhotos(selectedRoom.id);
                return photos.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Galería de Fotos</h3>
                    <ImageCarousel images={photos} />
                  </div>
                );
              })()}

              {/* Upload Section */}
              <FileUpload
                category="room_photo"
                roomId={selectedRoom.id}
                title={`Fotos de habitación ${selectedRoom.number}`}
                maxSizeMB={5}
                accept="image/*"
                onUploadSuccess={() => {
                  // Refetch fotos después de cargar
                  setTimeout(() => refetchPhotos(), 800);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
