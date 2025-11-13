import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { roomsApi, mediaApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Room, RoomUpdate, Media } from '@/types';
import { Plus, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';

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
  const [formData, setFormData] = useState<FormData>({
    number: '',
    type: 'single',
    price_amount: undefined,
    price_currency: 'VES',
    notes: '',
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

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const { data: roomPhotos = [], refetch: refetchPhotos } = useQuery<Media[]>({
    queryKey: ['room-photos'],
    queryFn: () => mediaApi.getAll({ category: 'room_photo' }),
  });

  const createMutation = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoomUpdate }) =>
      roomsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsModalOpen(false);
      setEditingRoom(null);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const resetForm = () => {
    setFormData({ number: '', type: 'single', price_amount: undefined, price_currency: 'VES', notes: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

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

      {viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms?.map((room) => {
          const photos = getRoomPhotos(room.id);
          const primaryPhoto = photos[0];
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
              </CardContent>
            </Card>
          );
        })}
      </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Habitación</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Precio</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rooms?.map((room) => {
                const photos = getRoomPhotos(room.id);
                const primaryPhoto = photos[0];
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
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingRoom ? 'Editar Habitación' : 'Nueva Habitación'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="number">Número de Habitación</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) =>
                    setFormData({ ...formData, number: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as 'single' | 'double' | 'suite',
                    })
                  }
                >
                  <option value="single">Individual</option>
                  <option value="double">Doble</option>
                  <option value="suite">Suite</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="price_amount">Precio por Noche</Label>
                  <Input
                    id="price_amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price_amount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, price_amount: parseFloat(e.target.value) || undefined })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="price_currency">Moneda</Label>
                  <select
                    id="price_currency"
                    className="w-full px-3 py-2 border rounded-md"
                    value={formData.price_currency || 'VES'}
                    onChange={(e) =>
                      setFormData({ ...formData, price_currency: e.target.value as 'VES' | 'USD' | 'EUR' })
                    }
                  >
                    <option value="VES">Bs (VES)</option>
                    <option value="USD">$ (USD)</option>
                    <option value="EUR">€ (EUR)</option>
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
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingRoom ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
