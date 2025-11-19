import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { guestsApi, devicesApi, bandwidthApi, mediaApi, occupancyApi, paymentsApi, reservationsApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Guest, GuestCreate, GuestUpdate, DeviceCreate, Media } from '@/types';
import { Plus, Edit, Trash2, X, Wifi, WifiOff, User, Activity, FileText, AlertTriangle, Home, DollarSign, Calendar, Camera, Mail, Phone } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-lg p-4 flex items-center" role="alert">
      <AlertTriangle className="flex-shrink-0 h-4 w-4 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

const NOTES_MAX_LENGTH = 280;

export default function GuestList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<Guest | null>(null);
  const [guestForAvatarUpload, setGuestForAvatarUpload] = useState<Guest | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'devices' | 'files' | 'account'>('info');
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [error, setError] = useState<string | null>(null);
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
  const navigate = useNavigate();

  const formatMoney = (
    value?: number | null,
    currency: 'VES' | 'USD' | 'EUR' = 'VES'
  ): string => {
    const labels = {
      VES: 'Bs',
      USD: 'USD $',
      EUR: 'EUR €',
    };
    const amount = value ?? 0;
    return `${labels[currency]} ${amount.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const reservationStatusLabels: Record<string, string> = {
    pending: 'Pendiente',
    active: 'Activa',
    checked_out: 'Check-out',
    cancelled: 'Cancelada',
  };

  const notesValue = formData.notes ?? '';
  const remainingNotesChars = NOTES_MAX_LENGTH - notesValue.length;

  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');

  const { data: guests, isLoading, isFetching } = useQuery<Guest[]>({
    queryKey: ['guests', searchTerm],
    queryFn: () => guestsApi.getAll(searchTerm),
    placeholderData: (previous) => previous,
  });
  const guestList = guests ?? [];
  const isInitialLoading = !guests && isLoading;
  const hasGuests = guestList.length > 0;

  const { data: devices } = useQuery({
    queryKey: ['devices', selectedGuest?.id],
    queryFn: () => devicesApi.getByGuest(selectedGuest!.id),
    enabled: !!selectedGuest,
    retry: 1,
    throwOnError: false,
  });

  // Fetch bandwidth data for the selected guest when viewing details
  const { data: guestBandwidth } = useQuery({
    queryKey: ['guest-bandwidth', selectedGuest?.id],
    queryFn: () => selectedGuest ? bandwidthApi.getGuestBandwidth(selectedGuest.id, 30) : Promise.resolve(null),
    enabled: !!selectedGuest,
    retry: 1,
    throwOnError: false,
  });

  // Query for guest photos
  const { data: guestPhotos } = useQuery({
    queryKey: ['guest-photos'],
    queryFn: () => mediaApi.getAll({ category: 'guest_photo' }),
  });
  const guestPhotoMap = useMemo<Record<number, Media>>(() => {
    if (!guestPhotos) return {};
    const map: Record<number, Media> = {};
    for (const photo of guestPhotos) {
      if (typeof photo.guest_id !== 'number') continue;
      const current = map[photo.guest_id];
      if (!current || (photo.is_primary && !current.is_primary)) {
        map[photo.guest_id] = photo;
      }
    }
    return map;
  }, [guestPhotos]);

  // Query for active occupancies of the guest to delete
  const { data: guestOccupancies } = useQuery({
    queryKey: ['guest-occupancies', guestToDelete?.id],
    queryFn: () => guestToDelete ? occupancyApi.getAll({ guest_id: guestToDelete.id, active_only: true }) : Promise.resolve([]),
    enabled: !!guestToDelete && isDeleteConfirmModalOpen,
  });

  // Query for guest payments
  const { data: guestPayments } = useQuery({
    queryKey: ['guest-payments', guestToDelete?.id],
    queryFn: () => guestToDelete ? paymentsApi.getByGuest(guestToDelete.id) : Promise.resolve(null),
    enabled: !!guestToDelete && isDeleteConfirmModalOpen,
  });

  // Query for guest reservations
  const { data: guestReservations } = useQuery({
    queryKey: ['guest-reservations', guestToDelete?.id],
    queryFn: () => guestToDelete ? reservationsApi.getAll({ guest_id: guestToDelete.id }) : Promise.resolve([]),
    enabled: !!guestToDelete && isDeleteConfirmModalOpen,
  });

  // Query for guest account balance
  const {
    data: guestAccountData,
    isLoading: isAccountLoading,
    isError: isAccountError,
  } = useQuery({
    queryKey: ['guest-account', selectedGuest?.id],
    queryFn: async () => {
      if (!selectedGuest) return null;
      try {
        return await paymentsApi.getByGuest(selectedGuest.id);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!selectedGuest && isDetailModalOpen,
    retry: 1,
    throwOnError: false,
  });

  const accountSummary = useMemo(() => {
    if (!guestAccountData) {
      return {
        reservations: 0,
        reservationTotalVES: 0,
        reservationTotalUSD: 0,
        reservationTotalEUR: 0,
        paidVES: 0,
        paidUSD: 0,
        paidEUR: 0,
        outstandingVES: 0,
        outstandingUSD: 0,
        outstandingEUR: 0,
      };
    }
    const reservationTotalVES = guestAccountData.reservation_summary?.total_bs ?? 0;
    const reservationTotalUSD = guestAccountData.reservation_summary?.total_usd ?? 0;
    const reservationTotalEUR = guestAccountData.reservation_summary?.total_eur ?? 0;
    const paidVES = guestAccountData.totals?.ves ?? 0;
    const paidUSD = guestAccountData.totals?.usd ?? 0;
    const paidEUR = guestAccountData.totals?.eur ?? 0;
    const outstandingVES =
      guestAccountData.balance?.ves ?? Math.max(reservationTotalVES - paidVES, 0);
    const outstandingUSD =
      guestAccountData.balance?.usd ?? Math.max(reservationTotalUSD - paidUSD, 0);
    const outstandingEUR =
      guestAccountData.balance?.eur ?? Math.max(reservationTotalEUR - paidEUR, 0);

    return {
      reservations: guestAccountData.reservation_summary?.count ?? 0,
      reservationTotalVES,
      reservationTotalUSD,
      reservationTotalEUR,
      paidVES,
      paidUSD,
      paidEUR,
      outstandingVES,
      outstandingUSD,
      outstandingEUR,
    };
  }, [guestAccountData]);

  const createMutation = useMutation({
    mutationFn: guestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setIsModalOpen(false);
      resetForm();
      setError(null);
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: GuestUpdate }) =>
      guestsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      setIsModalOpen(false);
      setEditingGuest(null);
      resetForm();
      setError(null);
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: guestsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const createDeviceMutation = useMutation({
    mutationFn: ({ guestId, data }: { guestId: number; data: DeviceCreate }) =>
      devicesApi.create(guestId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setDeviceData({ mac: '', name: '', vendor: '' });
      setError(null);
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: ({ guestId, deviceId }: { guestId: number; deviceId: number }) =>
      devicesApi.delete(guestId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const suspendDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => devicesApi.suspend(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const resumeDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => devicesApi.resume(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: (error) => setError(handleApiError(error)),
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      document_id: '',
      phone: '',
      email: '',
      notes: '',
    });
    setError(null);
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      setError('El nombre completo es requerido.');
      return false;
    }
    if (!formData.document_id.trim()) {
      setError('El documento de identidad es requerido.');
      return false;
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('El formato del email no es válido.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
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
    setError(null);
  };

  const handleDeleteClick = (guest: Guest) => {
    setGuestToDelete(guest);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (guestToDelete) {
      deleteMutation.mutate(guestToDelete.id);
      setIsDeleteConfirmModalOpen(false);
      setGuestToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmModalOpen(false);
    setGuestToDelete(null);
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
    // Only return bandwidth if it's for the selected guest
    if (selectedGuest?.id === guestId && guestBandwidth) {
      return {
        usage_gb: guestBandwidth.total_usage?.total_gb || 0,
        device_count: guestBandwidth.total_devices || 0,
      };
    }
    return null;
  };

  const getGuestPhoto = (guestId: number) => guestPhotoMap[guestId];
  const avatarPreview = guestForAvatarUpload ? getGuestPhoto(guestForAvatarUpload.id) : null;

  const openDetailModal = (guest: Guest) => {
    setSelectedGuest(guest);
    setActiveTab('info');
    setIsDetailModalOpen(true);
  };

  const openAvatarUploadModal = (guest: Guest, e: React.MouseEvent) => {
    e.stopPropagation();
    setGuestForAvatarUpload(guest);
    setIsAvatarUploadOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Huéspedes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Huésped
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar por nombre o documento..."
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
          Cargando huéspedes...
        </div>
      ) : hasGuests ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guestList.map((guest) => {
              const photo = getGuestPhoto(guest.id);
              return (
                <Card
                  key={guest.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={(e) => {
                    if (
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('[data-no-detail]')
                    ) {
                      return;
                    }
                    openDetailModal(guest);
                  }}
                >
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                    <div
                      className="relative group cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAvatarUploadModal(guest, e);
                      }}
                      data-no-detail
                    >
                      {photo ? (
                        <img
                          src={`${photo.url}?v=${new Date(photo.uploaded_at).getTime()}`}
                          alt={guest.full_name}
                          loading="lazy"
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 group-hover:opacity-75 transition"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition">
                          <User className="h-8 w-8 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold truncate">{guest.full_name}</CardTitle>
                      <p className="text-sm text-gray-600">{guest.document_id}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => openDeviceModal(guest)}>
                        <Wifi className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(guest)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(guest)}>
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
                    <div className="pt-1">
                      {photo ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-50">
                          Foto confirmada
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="border border-dashed border-gray-300 text-gray-600 bg-transparent"
                        >
                          Sin foto • toca el avatar para cargar
                        </Badge>
                      )}
                    </div>
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
                                {bandwidth.device_count} dispositivo
                                {bandwidth.device_count > 1 ? 's' : ''}
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
        ) : (
          <div className="bg-white border rounded-lg overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Huésped</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Documento</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Teléfono</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Notas</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
              {guestList.map((guest) => {
                  const photo = getGuestPhoto(guest.id);
                  return (
                    <tr key={guest.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="relative"
                            onClick={(e) => openAvatarUploadModal(guest, e)}
                          >
                            {photo ? (
                              <img
                                src={`${photo.url}?thumb=1`}
                                alt={guest.full_name}
                                className="h-10 w-10 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                          </button>
                          <div>
                            <p className="font-semibold text-gray-900">{guest.full_name}</p>
                            {guest.email && <p className="text-xs text-gray-500">{guest.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{guest.document_id}</td>
                      <td className="px-4 py-3 text-gray-700">{guest.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        {guest.notes ? (
                          <span className="line-clamp-2">{guest.notes}</span>
                        ) : (
                          <span className="text-gray-400">Sin notas</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetailModal(guest)}>
                            Detalles
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDeviceModal(guest)}>
                            <Wifi className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(guest)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(guest)}>
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
        )
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          No se encontraron huéspedes para “{searchTerm || 'la búsqueda actual'}”.
        </div>
      )}

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

            {error && <ErrorAlert message={error} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Revisa los datos antes de guardar. El email y teléfono se usarán
                para enviar confirmaciones automáticas.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="full_name">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="full_name"
                      placeholder="Ej. María Fernanda Suárez"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      required
                      className="pl-10"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Usa el nombre tal como aparece en el documento oficial.
                    </p>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="document_id">Documento de Identidad</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="document_id"
                      placeholder="V-12345678 / DNI / Pasaporte"
                      value={formData.document_id}
                      onChange={(e) =>
                        setFormData({ ...formData, document_id: e.target.value })
                      }
                      required
                      className="pl-10"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Acepta letras y números. Se utilizará para búsquedas rápidas.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="phone"
                      placeholder="+58 412-1234567"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="pl-10"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Incluye el código de país para WhatsApp o SMS.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="pl-10"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Necesario para notificaciones y recordatorios.
                    </p>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label htmlFor="notes">Notas</Label>
                  <textarea
                    id="notes"
                    className="w-full px-3 py-2 border rounded-md"
                    rows={3}
                    value={notesValue}
                    placeholder="Preferencias, restricciones alimenticias, contactos de emergencia..."
                    maxLength={NOTES_MAX_LENGTH}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                  />
                  <div className="mt-1 text-xs text-gray-500 flex justify-between">
                    <span>Información útil para el personal.</span>
                    <span>{remainingNotesChars} caracteres restantes</span>
                  </div>
                </div>
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
                <button
                  className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'account'
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setActiveTab('account' as any)}
                >
                  <DollarSign className="inline h-4 w-4 mr-2" />
                  Cuenta
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

              {activeTab === 'account' && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Cuenta del Huésped
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => navigate(`/payments?guest=${selectedGuest.id}`)}
                      >
                        Ir a Pagos
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isAccountLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>Cargando información de cuenta...</p>
                        </div>
                      ) : guestAccountData ? (
                        <>
                          {/* Resumen de Cuenta */}
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                              <p className="text-xs text-red-600 font-semibold mb-1">SALDO PENDIENTE</p>
                              <p className="text-3xl font-bold text-red-700">
                                {formatMoney(accountSummary.outstandingVES, 'VES')}
                              </p>
                              <div className="text-sm text-red-700 space-y-1 mt-2">
                                {accountSummary.outstandingUSD > 0 && (
                                  <div>{formatMoney(accountSummary.outstandingUSD, 'USD')}</div>
                                )}
                                {accountSummary.outstandingEUR > 0 && (
                                  <div>{formatMoney(accountSummary.outstandingEUR, 'EUR')}</div>
                                )}
                              </div>
                              <p className={`text-xs mt-3 ${accountSummary.outstandingVES > 0 ? 'text-red-700' : 'text-green-700'}`}>
                                {accountSummary.outstandingVES > 0
                                  ? 'La deuda corresponde al total de reservas. Registra un pago para cancelarla.'
                                  : 'Cuenta al día.'}
                              </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-xs text-green-600 font-semibold mb-1">PAGADO</p>
                              <div className="text-2xl font-bold text-green-700 mb-2">
                                {guestAccountData.completed_payments || 0} pago{(guestAccountData.completed_payments || 0) === 1 ? '' : 's'}
                              </div>
                              <div className="space-y-1 text-sm text-green-900">
                                {accountSummary.paidVES > 0 && (
                                  <div>{formatMoney(accountSummary.paidVES, 'VES')}</div>
                                )}
                                {accountSummary.paidUSD > 0 && (
                                  <div>{formatMoney(accountSummary.paidUSD, 'USD')}</div>
                                )}
                                {accountSummary.paidEUR > 0 && (
                                  <div>{formatMoney(accountSummary.paidEUR, 'EUR')}</div>
                                )}
                                {guestAccountData.totals.ves === 0 &&
                                  guestAccountData.totals.usd === 0 &&
                                  guestAccountData.totals.eur === 0 && (
                                    <p className="text-gray-600">Sin pagos registrados</p>
                                  )}
                              </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <p className="text-xs text-blue-700 font-semibold mb-1">TOTAL RESERVAS</p>
                              <p className="text-2xl font-bold text-blue-900">
                                {accountSummary.reservations
                                  ? formatMoney(accountSummary.reservationTotalVES, 'VES')
                                  : 'Sin reservas activas'}
                              </p>
                              {accountSummary.reservations > 0 && (
                                <div className="text-sm text-blue-900 space-y-1 mt-2">
                                  {accountSummary.reservationTotalUSD > 0 && (
                                    <div>{formatMoney(accountSummary.reservationTotalUSD, 'USD')}</div>
                                  )}
                                  {accountSummary.reservationTotalEUR > 0 && (
                                    <div>{formatMoney(accountSummary.reservationTotalEUR, 'EUR')}</div>
                                  )}
                                  <p className="text-xs text-blue-700">
                                    {accountSummary.reservations} reserva{accountSummary.reservations === 1 ? '' : 's'} considerada{accountSummary.reservations === 1 ? '' : 's'} para la cuenta.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Reservas asociadas */}
                          {guestAccountData.reservation_summary ? (
                            guestAccountData.reservation_summary.reservations?.length ? (
                              <div className="p-4 bg-white rounded-lg border border-gray-200">
                                <p className="font-semibold text-gray-900 mb-3">Reservas asociadas a la cuenta:</p>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm text-left">
                                    <thead>
                                      <tr className="text-gray-500 uppercase text-xs">
                                        <th className="px-2 py-1">Habitación</th>
                                        <th className="px-2 py-1">Fechas</th>
                                        <th className="px-2 py-1">Estado</th>
                                        <th className="px-2 py-1 text-right">Monto</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {guestAccountData.reservation_summary.reservations.map((reservation) => (
                                        <tr key={reservation.id} className="border-t text-gray-700">
                                          <td className="px-2 py-1 font-medium">{reservation.room_number || '—'}</td>
                                          <td className="px-2 py-1">
                                            {formatDate(reservation.start_date)} - {formatDate(reservation.end_date)}
                                          </td>
                                          <td className="px-2 py-1">
                                            <Badge variant="secondary">
                                              {reservationStatusLabels[reservation.status] || reservation.status}
                                            </Badge>
                                          </td>
                                          <td className="px-2 py-1 text-right font-semibold">
                                            {formatMoney(reservation.price_bs, 'VES')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="text-xs text-gray-500 mt-3">
                                  El saldo pendiente se calcula proporcionalmente a estas reservas. Para cancelarlo, registra el pago correspondiente desde la sección de Pagos.
                                </p>
                              </div>
                            ) : (
                              <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm text-gray-600">
                                No se encontraron reservas activas para esta cuenta.
                              </div>
                            )
                          ) : null}

                          {/* Estado de pagos */}
                          {guestAccountData.total_payments > 0 ? (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="font-semibold text-gray-900 mb-3">Historial de Pagos:</p>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Total de pagos:</span>
                                  <span className="font-semibold text-gray-900">{guestAccountData.total_payments}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Completados:</span>
                                  <span className="font-semibold text-green-700">{guestAccountData.completed_payments}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-700">Pendientes:</span>
                                  <span className="font-semibold text-red-700">
                                    {guestAccountData.total_payments - guestAccountData.completed_payments}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                              <p className="text-gray-600 text-sm">
                                ✓ Sin deudas pendientes
                              </p>
                            </div>
                          )}
                          {accountSummary.outstandingVES === 0 && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-sm text-green-700">
                              Este huésped no tiene deudas pendientes en su cuenta.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 text-center text-gray-600 border border-dashed border-gray-300 rounded-lg">
                          {isAccountError
                            ? 'No pudimos obtener la información de cuenta. Intenta nuevamente.'
                            : 'Este huésped no tiene reservas ni pagos registrados, por lo que no existe una cuenta activa.'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmModalOpen && guestToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <h2 className="text-2xl font-bold text-red-600">Confirmar Eliminación</h2>
            </div>

            <p className="text-gray-700 mb-6">
              ¿Está seguro de que desea eliminar al huésped <strong>{guestToDelete.full_name}</strong>?
            </p>

            {/* Warnings */}
            <div className="space-y-3 mb-6">
              {guestReservations && guestReservations.length > 0 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex gap-3">
                  <Calendar className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Reservas Pendientes</p>
                    <p className="text-sm text-red-700">
                      Este huésped tiene {guestReservations.length} reserva{guestReservations.length > 1 ? 's' : ''}.
                      {guestReservations.map((res) => (
                        <div key={res.id} className="text-xs mt-1">
                          • Habitación {res.room?.number}: {new Date(res.start_date).toLocaleDateString('es-ES')} - {new Date(res.end_date).toLocaleDateString('es-ES')} ({res.status})
                        </div>
                      ))}
                    </p>
                    <p className="text-xs text-red-600 mt-2 font-semibold">
                      ⚠️ No se puede eliminar un huésped con reservas activas.
                    </p>
                  </div>
                </div>
              )}

              {guestOccupancies && guestOccupancies.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 flex gap-3">
                  <Home className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-900">Habitación Asignada</p>
                    <p className="text-sm text-orange-700">
                      Este huésped tiene {guestOccupancies.length} habitación{guestOccupancies.length > 1 ? 's' : ''} activa{guestOccupancies.length > 1 ? 's' : ''}.
                      {guestOccupancies.map((occ) => (
                        <span key={occ.id}>
                          {' '}Habitación {occ.room_number}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              )}

              {guestPayments && guestPayments.total_payments > 0 && (
                <>
                  {guestPayments.completed_payments < guestPayments.total_payments && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex gap-3">
                      <DollarSign className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Deudas Pendientes</p>
                        <p className="text-sm text-red-700">
                          Este huésped tiene {guestPayments.total_payments - guestPayments.completed_payments} pago{guestPayments.total_payments - guestPayments.completed_payments > 1 ? 's' : ''} pendiente{guestPayments.total_payments - guestPayments.completed_payments > 1 ? 's' : ''}.
                        </p>
                      </div>
                    </div>
                  )}

                  {guestPayments.totals && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Total pagado:</span>
                        {guestPayments.totals.usd > 0 && <span> USD {guestPayments.totals.usd.toFixed(2)}</span>}
                        {guestPayments.totals.eur > 0 && <span> EUR {guestPayments.totals.eur.toFixed(2)}</span>}
                        {guestPayments.totals.ves > 0 && <span> VES {guestPayments.totals.ves.toFixed(2)}</span>}
                      </p>
                    </div>
                  )}
                </>
              )}

              {guestOccupancies && guestOccupancies.length === 0 &&
               (!guestPayments || (guestPayments.completed_payments === guestPayments.total_payments)) &&
               guestReservations && guestReservations.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700">
                    ✓ No hay reservas, habitaciones activas ni deudas pendientes.
                  </p>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDelete}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={
                  deleteMutation.isPending ||
                  (guestReservations && guestReservations.length > 0) ||
                  (guestOccupancies && guestOccupancies.length > 0)
                }
                title={
                  guestReservations && guestReservations.length > 0
                    ? "No se puede eliminar un huésped con reservas"
                    : guestOccupancies && guestOccupancies.length > 0
                    ? "No se puede eliminar un huésped con habitación asignada"
                    : ""
                }
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar Huésped'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {isAvatarUploadOpen && guestForAvatarUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Foto de Perfil</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAvatarUploadOpen(false);
                  setGuestForAvatarUpload(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Sube una nueva foto para <strong>{guestForAvatarUpload.full_name}</strong>. Puedes marcarla como
              principal desde la lista si deseas reemplazar la actual.
            </p>

            {avatarPreview ? (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Foto actual</p>
                <img
                  src={avatarPreview.url}
                  alt={`Avatar de ${guestForAvatarUpload.full_name}`}
                  className="h-40 w-full rounded-lg object-cover border"
                />
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
                Aún no hay foto guardada para este huésped.
              </div>
            )}

            <FileUpload
              category="guest_photo"
              guestId={guestForAvatarUpload.id}
              title="Foto de Rostro"
              maxSizeMB={5}
              accept="image/*"
              onUploadSuccess={() => {
                setIsAvatarUploadOpen(false);
                setGuestForAvatarUpload(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
