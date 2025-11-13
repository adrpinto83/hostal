import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usersApi, staffApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { User, UserCreate, UserUpdate, Staff } from '@/types';
import { Plus, X, UserCircle, Shield, Edit, Trash2, AlertCircle, Users, Link2, Unlink2 } from 'lucide-react';

const roleLabels = {
  admin: 'Administrador',
  gerente: 'Gerente',
  recepcionista: 'Recepcionista',
  mantenimiento: 'Mantenimiento',
  staff: 'Personal',
};

const roleColors = {
  admin: 'bg-purple-500',
  gerente: 'bg-blue-500',
  recepcionista: 'bg-green-500',
  mantenimiento: 'bg-orange-500',
  staff: 'bg-yellow-500',
};

type ModalMode = 'create' | 'edit' | null;

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-lg p-4 flex items-center gap-3">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function UserList() {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForStaffAssignment, setUserForStaffAssignment] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    password: '',
    role: 'recepcionista',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: staffApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      setError('');
    },
    onError: (error) => {
      setError(handleApiError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdate }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
      setError('');
    },
    onError: (error) => {
      setError(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setError('');
    },
    onError: (error) => {
      setError(handleApiError(error));
    },
  });

  const assignStaffMutation = useMutation({
    mutationFn: ({ userId, staffId }: { userId: number; staffId: number }) =>
      usersApi.assignStaff(userId, staffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setShowStaffModal(false);
      setUserForStaffAssignment(null);
      setSuccess('Empleado asignado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
      setError('');
    },
    onError: (error) => {
      setError(handleApiError(error));
    },
  });

  const unassignStaffMutation = useMutation({
    mutationFn: (userId: number) => usersApi.unassignStaff(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setSuccess('Empleado desasignado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
      setError('');
    },
    onError: (error) => {
      setError(handleApiError(error));
    },
  });

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      role: 'recepcionista',
      full_name: '',
    });
    setModalMode('create');
    setError('');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role as UserCreate['role'],
      full_name: user.full_name || '',
    });
    setModalMode('edit');
    setError('');
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({
      email: '',
      password: '',
      role: 'recepcionista',
      full_name: '',
    });
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalMode === 'create') {
      if (!formData.password) {
        setError('Password is required when creating a new user');
        return;
      }
      createMutation.mutate(formData);
    } else if (modalMode === 'edit' && selectedUser) {
      const updateData: UserUpdate = {};

      if (formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.password) updateData.password = formData.password;
      if (formData.role !== selectedUser.role) updateData.role = formData.role as UserUpdate['role'];
      if ((formData.full_name || '') !== (selectedUser.full_name || '')) {
        updateData.full_name = formData.full_name || undefined;
      }

      updateMutation.mutate({
        id: selectedUser.id,
        data: updateData,
      });
    }
  };

  const handleDelete = (user: User) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.email}? Esta acción no se puede deshacer.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const openStaffModal = (user: User) => {
    setUserForStaffAssignment(user);
    setShowStaffModal(true);
  };

  const handleAssignStaff = (staffId: number) => {
    if (userForStaffAssignment) {
      assignStaffMutation.mutate({
        userId: userForStaffAssignment.id,
        staffId,
      });
    }
  };

  const getAssignedStaff = (userId: number): Staff | undefined => {
    return staffList?.find((s) => s.user_id === userId);
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Usuarios del Sistema</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {error && <ErrorAlert message={error} />}

      {success && (
        <div className="bg-green-50 border border-green-200 text-sm text-green-800 rounded-lg p-4 flex items-center gap-3">
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users?.map((user) => (
          <Card key={user.id} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3 flex-1">
                {user.role === 'admin' ? (
                  <Shield className="h-8 w-8 text-purple-500 flex-shrink-0" />
                ) : (
                  <UserCircle className="h-8 w-8 text-blue-500 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <CardTitle className="text-lg font-bold truncate">{user.email}</CardTitle>
                  {user.full_name && (
                    <p className="text-sm text-gray-500 truncate">{user.full_name}</p>
                  )}
                  <p className="text-xs text-gray-400">ID: {user.id}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-sm text-gray-500">Rol: </span>
                <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                  {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                </Badge>
              </div>

              {user.approved && (
                <div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    ✓ Aprobado
                  </Badge>
                </div>
              )}

              <div className="border-t pt-3">
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Empleado Asignado
                </p>
                {getAssignedStaff(user.id) ? (
                  <div className="bg-blue-50 rounded p-2 mb-2">
                    <p className="text-sm font-medium text-blue-900">{getAssignedStaff(user.id)?.full_name}</p>
                    <p className="text-xs text-blue-700">{getAssignedStaff(user.id)?.role}</p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin empleado asignado</p>
                )}
              </div>

              <div className="flex gap-2 pt-2 flex-col">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openEditModal(user)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDelete(user)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => openStaffModal(user)}
                    disabled={assignStaffMutation.isPending}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Asignar
                  </Button>
                  {getAssignedStaff(user.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => unassignStaffMutation.mutate(user.id)}
                      disabled={unassignStaffMutation.isPending}
                    >
                      <Unlink2 className="h-4 w-4 mr-1" />
                      Desasignar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {users && users.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No hay usuarios creados. Crea uno nuevo para comenzar.
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {error && <ErrorAlert message={error} />}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input
                  id="full_name"
                  type="text"
                  value={formData.full_name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Ej: Juan García"
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Contraseña {modalMode === 'edit' && '(dejar vacío para no cambiar)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={modalMode === 'create'}
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="role">Rol *</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as UserCreate['role'],
                    })
                  }
                  required
                >
                  <option value="recepcionista">Recepcionista</option>
                  <option value="gerente">Gerente</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="staff">Personal</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                >
                  {modalMode === 'create' ? 'Crear' : 'Actualizar'} Usuario
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Selection Modal */}
      {showStaffModal && userForStaffAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Asignar Empleado</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStaffModal(false);
                  setUserForStaffAssignment(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Selecciona un empleado para asignar a: <strong>{userForStaffAssignment.email}</strong>
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {staffList && staffList.length > 0 ? (
                staffList.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleAssignStaff(staff.id)}
                    disabled={assignStaffMutation.isPending}
                    className={`w-full p-3 rounded-lg border-2 text-left transition ${
                      staff.user_id
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium">{staff.full_name}</div>
                    <div className="text-sm text-gray-600">
                      {staff.role} • Doc: {staff.document_id}
                    </div>
                    {staff.user_id && (
                      <div className="text-xs text-gray-500 mt-1">
                        (Ya asignado a otro usuario)
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">No hay empleados disponibles</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowStaffModal(false);
                  setUserForStaffAssignment(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
