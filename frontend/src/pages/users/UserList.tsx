import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usersApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { User, UserCreate } from '@/types';
import { Plus, X, UserCircle, Shield } from 'lucide-react';

const roleLabels = {
  admin: 'Administrador',
  gerente: 'Gerente',
  recepcionista: 'Recepcionista',
  mantenimiento: 'Mantenimiento',
};

const roleColors = {
  admin: 'bg-purple-500',
  gerente: 'bg-blue-500',
  recepcionista: 'bg-green-500',
  mantenimiento: 'bg-orange-500',
};

export default function UserList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    password: '',
    role: 'recepcionista',
  });

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: 'recepcionista',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Usuarios del Sistema</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users?.map((user) => (
          <Card key={user.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                {user.role === 'admin' ? (
                  <Shield className="h-8 w-8 text-purple-500" />
                ) : (
                  <UserCircle className="h-8 w-8 text-blue-500" />
                )}
                <div>
                  <CardTitle className="text-lg font-bold">{user.email}</CardTitle>
                  <p className="text-sm text-gray-500">ID: {user.id}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm text-gray-500">Rol: </span>
                <Badge className={roleColors[user.role as keyof typeof roleColors]}>
                  {roleLabels[user.role as keyof typeof roleLabels] || user.role}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nuevo Usuario</h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
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
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Crear Usuario
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
