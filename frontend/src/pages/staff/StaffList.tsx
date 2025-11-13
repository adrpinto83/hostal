import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { staffApi, mediaApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Staff, StaffCreate, StaffUpdate } from '@/types';
import { Plus, Edit, Trash2, X, UserCheck, CheckCircle2, Circle, Camera } from 'lucide-react';
import { CameraCapture } from '@/components/ui/camera-capture';

const staffRoleLabels = {
  recepcionista: 'Recepcionista',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
  gerente: 'Gerente',
};

const staffStatusLabels = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'De permiso',
};

const statusColors = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  on_leave: 'bg-yellow-500',
};

export default function StaffList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isAvatarUploadOpen, setIsAvatarUploadOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [staffForAvatarUpload, setStaffForAvatarUpload] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffCreate>({
    full_name: '',
    document_id: '',
    phone: '',
    email: '',
    role: 'recepcionista',
    status: 'active',
    hire_date: '',
    salary: 0,
    notes: '',
  });

  const queryClient = useQueryClient();

  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  // Query for staff photos
  const { data: staffPhotos } = useQuery({
    queryKey: ['staff-photos'],
    queryFn: () => mediaApi.getAll({ category: 'staff_photo' }),
  });

  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: StaffUpdate }) =>
      staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsModalOpen(false);
      setEditingStaff(null);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: staffApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'inactive' | 'on_leave' }) =>
      staffApi.changeStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setIsStatusModalOpen(false);
      setSelectedStaff(null);
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const resetForm = () => {
    setFormData({
      full_name: '',
      document_id: '',
      phone: '',
      email: '',
      role: 'recepcionista',
      status: 'active',
      hire_date: '',
      salary: 0,
      notes: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      full_name: member.full_name,
      document_id: member.document_id,
      phone: member.phone || '',
      email: member.email || '',
      role: member.role as StaffCreate['role'],
      status: member.status as StaffCreate['status'],
      hire_date: member.hire_date || '',
      salary: member.salary || 0,
      notes: member.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar este empleado?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleChangeStatus = (member: Staff) => {
    setSelectedStaff(member);
    setIsStatusModalOpen(true);
  };

  const openAvatarUploadModal = (member: Staff, e: React.MouseEvent) => {
    e.stopPropagation();
    setStaffForAvatarUpload(member);
    setIsAvatarUploadOpen(true);
  };

  const getStaffPhoto = (staffId: number) => {
    return staffPhotos?.find((photo) => photo.staff_id === staffId);
  };

  const submitStatusChange = (newStatus: 'active' | 'inactive' | 'on_leave') => {
    if (selectedStaff) {
      changeStatusMutation.mutate({ id: selectedStaff.id, status: newStatus });
    }
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Personal del Hostal</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Empleado
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff?.map((member) => {
          const photo = getStaffPhoto(member.id);
          return (
          <Card key={member.id}>
            <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
              <div className="relative group cursor-pointer" onClick={(e) => openAvatarUploadModal(member, e)}>
                {photo ? (
                  <img
                    src={photo.url}
                    alt={member.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gray-200 group-hover:opacity-75 transition"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                    <span className="text-lg font-bold text-blue-600">
                      {member.full_name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                  <Camera className="h-3 w-3 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-bold">{member.full_name}</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleChangeStatus(member)}
                  title="Cambiar estado"
                >
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(member)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(member.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <Badge className={statusColors[member.status as keyof typeof statusColors]}>
                  {staffStatusLabels[member.status as keyof typeof staffStatusLabels]}
                </Badge>
                <Badge variant="outline">
                  {staffRoleLabels[member.role as keyof typeof staffRoleLabels] || member.role}
                </Badge>
                {member.user_id ? (
                  <Badge className="bg-blue-500 hover:bg-blue-600 flex gap-1 items-center">
                    <CheckCircle2 className="h-3 w-3" />
                    Sistema Asignado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex gap-1 items-center">
                    <Circle className="h-3 w-3" />
                    Sin Sistema
                  </Badge>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Documento:</strong> {member.document_id}</p>
                {member.phone && <p><strong>Teléfono:</strong> {member.phone}</p>}
                {member.email && <p><strong>Email:</strong> {member.email}</p>}
                {member.salary && <p><strong>Salario:</strong> ${member.salary}</p>}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>

      {/* Modal de Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {editingStaff ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
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
                  type="tel"
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
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as StaffCreate['role'] })
                  }
                  required
                >
                  <option value="recepcionista">Recepcionista</option>
                  <option value="limpieza">Limpieza</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="gerente">Gerente</option>
                </select>
              </div>

              <div>
                <Label htmlFor="salary">Salario</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div>
                <Label htmlFor="hire_date">Fecha de Contratación</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
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
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingStaff ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cambio de Estado */}
      {isStatusModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Cambiar Estado</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsStatusModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Cambiar estado de: <strong>{selectedStaff.full_name}</strong>
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => submitStatusChange('active')}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  Activo
                </Button>
                <Button
                  onClick={() => submitStatusChange('on_leave')}
                  className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                  De Permiso
                </Button>
                <Button
                  onClick={() => submitStatusChange('inactive')}
                  className="w-full bg-gray-500 hover:bg-gray-600"
                >
                  Inactivo
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {isAvatarUploadOpen && staffForAvatarUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Foto de Perfil</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAvatarUploadOpen(false);
                  setStaffForAvatarUpload(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Captura una foto de rostro para <strong>{staffForAvatarUpload.full_name}</strong>
            </p>

            <CameraCapture
              category="staff_photo"
              staffId={staffForAvatarUpload.id}
              title="Foto de Rostro"
              onUploadSuccess={() => {
                setIsAvatarUploadOpen(false);
                setStaffForAvatarUpload(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
