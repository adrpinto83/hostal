import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { roomsApi, mediaApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Room, RoomCreate, RoomUpdate } from '@/types';
import { Plus, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';

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
  const [formData, setFormData] = useState<RoomCreate>({
    number: '',
    type: 'single',
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const { data: roomPhotos } = useQuery({
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
    setFormData({ number: '', type: 'single', notes: '' });
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
      type: room.type,
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

  const getRoomPhoto = (roomId: number) => {
    return roomPhotos?.find((photo) => photo.room_id === roomId);
  };

  const openPhotoModal = (room: Room) => {
    setSelectedRoom(room);
    setIsPhotoModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Habitaciones</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Habitación
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms?.map((room) => (
          <Card key={room.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xl font-bold">
                Habitación {room.number}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openPhotoModal(room)}
                  title="Gestionar fotos"
                >
                  <ImageIcon className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(room)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(room.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Tipo: </span>
                <Badge variant="outline">
                  {roomTypeLabels[room.type || 'single']}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-gray-500">Estado: </span>
                <Badge className={statusColors[room.status]}>
                  {statusLabels[room.status]}
                </Badge>
              </div>
              {room.notes && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Notas:</span> {room.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                Fotos de Habitación {selectedRoom.number}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsPhotoModalOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <FileUpload
              category="room_photo"
              roomId={selectedRoom.id}
              title={`Fotos de habitación ${selectedRoom.number}`}
              maxSizeMB={5}
              accept="image/*"
              onUploadSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['room-photos'] });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
