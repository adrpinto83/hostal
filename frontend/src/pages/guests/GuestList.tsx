import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { guestsApi, devicesApi, bandwidthApi, mediaApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Guest, GuestCreate, GuestUpdate, Device, DeviceCreate } from '@/types';
import { Plus, Edit, Trash2, X, Wifi, WifiOff, User, Activity, FileText, Image as ImageIcon } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';

export default function GuestList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'devices' | 'files'>('info');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<GuestCreate>({
    full_name: '',
    document_id: '',
    phone: '',
    email: '',
    notes: '',
  });
  const [deviceData, setDeviceData] = useState<DeviceCreate>({
    mac: '',
    name: '',
    vendor: '',
  });

  const queryClient = useQueryClient();

  const { data: guests, isLoading } = useQuery({
    queryKey: ['guests', searchTerm],
    queryFn: () => guestsApi.getAll(searchTerm),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices', selectedGuest?.id],
    queryFn: () => devicesApi.getByGuest(selectedGuest!.id),
    enabled: !!selectedGuest,
  });

  const { data: guestBandwidth } = useQuery({
    queryKey: ['guest-bandwidth'],
    queryFn: () => bandwidthApi.getGuestBandwidth(7),
  });

  // Query for guest photos
  const { data: guestPhotos } = useQuery({
    queryKey: ['guest-photos'],
    queryFn: () => mediaApi.getAll({ category: 'guest_photo' }),
  });

  const createMutation = useMutation({
    mutationFn: guestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GuestUpdate }) =>
      guestsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setIsModalOpen(false);
      setEditingGuest(null);
      resetForm();
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: guestsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const createDeviceMutation = useMutation({
    mutationFn: ({ guestId, data }: { guestId: number; data: DeviceCreate }) =>
      devicesApi.create(guestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setDeviceData({ mac: '', name: '', vendor: '' });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: ({ guestId, deviceId }: { guestId: number; deviceId: number }) =>
      devicesApi.delete(guestId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const suspendDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => devicesApi.suspend(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const resumeDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => devicesApi.resume(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      document_id: '',
      phone: '',
      email: '',
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGuest) {
      updateMutation.mutate({ id: editingGuest.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      full_name: guest.full_name,
      document_id: guest.document_id,
      phone: guest.phone || '',
      email: guest.email || '',
      notes: guest.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar este huésped?')) {
      deleteMutation.mutate(id);
    }
  };

  const openDeviceModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setIsDeviceModalOpen(true);
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGuest) {
      createDeviceMutation.mutate({ guestId: selectedGuest.id, data: deviceData });
    }
  };

  const getGuestBandwidth = (guestId: number) => {
    return guestBandwidth?.find((gb) => gb.guest_id === guestId);
  };

  const getGuestPhoto = (guestId: number) => {
    return guestPhotos?.find((photo) => photo.guest_id === guestId);
  };

  const openDetailModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setActiveTab('info');
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Huéspedes</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nombre o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Huésped
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guests?.map((guest) => {
          const photo = getGuestPhoto(guest.id);
          return (
          <Card key={guest.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openDetailModal(guest)}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="relative">
                {photo ? (
                  <img
                    src={photo.url}
                    alt={guest.full_name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-bold truncate">
                  {guest.full_name}
                </CardTitle>
                <p className="text-sm text-gray-600">{guest.document_id}</p>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => openDeviceModal(guest)}>
                  <Wifi className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(guest)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(guest.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="font-semibold">Documento:</span> {guest.document_id}
              </p>
              {guest.phone && (
                <p className="text-sm">
                  <span className="font-semibold">Teléfono:</span> {guest.phone}
                </p>
              )}
              {guest.email && (
                <p className="text-sm">
                  <span className="font-semibold">Email:</span> {guest.email}
                </p>
              )}
              {guest.notes && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Notas:</span> {guest.notes}
                </p>
              )}
              {(() => {
                const bandwidth = getGuestBandwidth(guest.id);
                if (bandwidth) {
                  return (
                    <div className="pt-2 mt-2 border-t">
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold">Uso Internet (7d):</span>
                        <span className="text-blue-600 font-bold">
                          {bandwidth.usage_gb.toFixed(2)} GB
                        </span>
                      </div>
                      {bandwidth.device_count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {bandwidth.device_count} dispositivo{bandwidth.device_count > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Modal de Guest */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingGuest ? 'Editar Huésped' : 'Nuevo Huésped'}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="document_id">Documento de Identidad</Label>
                <Input
                  id="document_id"
                  value={formData.document_id}
                  onChange={(e) =>
                    setFormData({ ...formData, document_id: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
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
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingGuest ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Devices */}
      {isDeviceModalOpen && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Dispositivos de {selectedGuest.full_name}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setIsDeviceModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-4 mb-6 p-4 border rounded">
              <h3 className="font-semibold">Agregar Dispositivo</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mac">MAC Address</Label>
                  <Input
                    id="mac"
                    placeholder="AA:BB:CC:DD:EE:FF"
                    value={deviceData.mac}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, mac: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="device_name">Nombre</Label>
                  <Input
                    id="device_name"
                    placeholder="iPhone de Juan"
                    value={deviceData.name}
                    onChange={(e) =>
                      setDeviceData({ ...deviceData, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <Button type="submit" disabled={createDeviceMutation.isPending}>
                Agregar
              </Button>
            </form>

            <div className="space-y-2">
              <h3 className="font-semibold">Dispositivos Conectados</h3>
              {devices?.length === 0 && (
                <p className="text-gray-500">No hay dispositivos registrados</p>
              )}
              {devices?.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <p className="font-semibold">{device.name || device.mac}</p>
                    <p className="text-sm text-gray-600">{device.mac}</p>
                    {device.last_ip && (
                      <p className="text-xs text-gray-500">IP: {device.last_ip}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {device.is_online && (
                      <Badge className="bg-green-500">En línea</Badge>
                    )}
                    {device.suspended ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resumeDeviceMutation.mutate(device.id)}
                      >
                        <Wifi className="h-4 w-4 text-green-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => suspendDeviceMutation.mutate(device.id)}
                      >
                        <WifiOff className="h-4 w-4 text-orange-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteDeviceMutation.mutate({
                          guestId: selectedGuest.id,
                          deviceId: device.id,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detallado con Pestañas */}
      {isDetailModalOpen && selectedGuest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {(() => {
                  const photo = getGuestPhoto(selectedGuest.id);
                  return photo ? (
                    <img
                      src={photo.url}
                      alt={selectedGuest.full_name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-10 w-10 text-gray-500" />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-2xl font-bold">{selectedGuest.full_name}</h2>
                  <p className="text-gray-600">{selectedGuest.document_id}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Tabs */}
            <div className="border-b mb-6">
              <div className="flex gap-4">
                <button
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'info'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('info')}
                >
                  <User className="inline h-4 w-4 mr-2" />
                  Información
                </button>
                <button
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'devices'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('devices')}
                >
                  <Wifi className="inline h-4 w-4 mr-2" />
                  Dispositivos
                </button>
                <button
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'files'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('files')}
                >
                  <FileText className="inline h-4 w-4 mr-2" />
                  Archivos
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Personal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-gray-600">Nombre Completo</Label>
                        <p className="font-medium">{selectedGuest.full_name}</p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Documento</Label>
                        <p className="font-medium">{selectedGuest.document_id}</p>
                      </div>
                      {selectedGuest.phone && (
                        <div>
                          <Label className="text-gray-600">Teléfono</Label>
                          <p className="font-medium">{selectedGuest.phone}</p>
                        </div>
                      )}
                      {selectedGuest.email && (
                        <div>
                          <Label className="text-gray-600">Email</Label>
                          <p className="font-medium">{selectedGuest.email}</p>
                        </div>
                      )}
                      {selectedGuest.notes && (
                        <div>
                          <Label className="text-gray-600">Notas</Label>
                          <p className="text-gray-700">{selectedGuest.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {(() => {
                    const bandwidth = getGuestBandwidth(selectedGuest.id);
                    if (bandwidth) {
                      return (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="h-5 w-5" />
                              Uso de Internet
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                              {bandwidth.usage_gb.toFixed(2)} GB
                            </div>
                            <p className="text-sm text-gray-600">
                              Últimos 7 días • {bandwidth.device_count} dispositivo
                              {bandwidth.device_count > 1 ? 's' : ''}
                            </p>
                          </CardContent>
                        </Card>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {activeTab === 'devices' && (
                <div className="space-y-3">
                  {devices && devices.length > 0 ? (
                    devices.map((device) => (
                      <Card key={device.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold">{device.name || device.mac}</p>
                              <p className="text-sm text-gray-600">{device.mac}</p>
                              {device.last_ip && (
                                <p className="text-xs text-gray-500">IP: {device.last_ip}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {device.is_online && (
                                <Badge className="bg-green-500">En línea</Badge>
                              )}
                              {device.suspended ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resumeDeviceMutation.mutate(device.id)}
                                >
                                  <Wifi className="h-4 w-4 text-green-500" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => suspendDeviceMutation.mutate(device.id)}
                                >
                                  <WifiOff className="h-4 w-4 text-orange-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm('¿Eliminar este dispositivo?')) {
                                    deleteDeviceMutation.mutate({
                                      guestId: selectedGuest.id,
                                      deviceId: device.id,
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No hay dispositivos registrados</p>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Agregar Dispositivo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddDevice} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="mac">MAC Address</Label>
                            <Input
                              id="mac"
                              placeholder="AA:BB:CC:DD:EE:FF"
                              value={deviceData.mac}
                              onChange={(e) =>
                                setDeviceData({ ...deviceData, mac: e.target.value })
                              }
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="device_name">Nombre</Label>
                            <Input
                              id="device_name"
                              placeholder="iPhone de Juan"
                              value={deviceData.name}
                              onChange={(e) =>
                                setDeviceData({ ...deviceData, name: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <Button type="submit" disabled={createDeviceMutation.isPending}>
                          Agregar Dispositivo
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-4">
                  <FileUpload
                    category="guest_photo"
                    guestId={selectedGuest.id}
                    title="Foto de perfil"
                    maxSizeMB={5}
                    accept="image/*"
                    onUploadSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['guest-photos'] });
                    }}
                  />
                  <FileUpload
                    category="guest_id"
                    guestId={selectedGuest.id}
                    title="Documento de identidad"
                    maxSizeMB={10}
                    accept="image/*,application/pdf"
                    onUploadSuccess={() => {
                      queryClient.invalidateQueries({ queryKey: ['media'] });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
