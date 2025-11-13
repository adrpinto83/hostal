import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { handleApiError } from '@/lib/api/client';
import { AlertCircle, CheckCircle2, Trash2, Loader2, Mail, Calendar, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROLES_DEFINITION, getAvailableRoles } from '@/lib/roles-permissions';

interface PendingUser {
  id: number;
  email: string;
  full_name: string | null;
  created_at: string | null; // ISO format datetime string
  approved: boolean;
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-lg p-4 flex items-center" role="alert">
      <AlertCircle className="flex-shrink-0 h-4 w-4 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="bg-green-50 border border-green-200 text-sm text-green-800 rounded-lg p-4 flex items-center" role="alert">
      <CheckCircle2 className="flex-shrink-0 h-4 w-4 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export default function UserApprovals() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<{ [key: number]: string }>({});
  const [showRoleInfo, setShowRoleInfo] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const AVAILABLE_ROLES = getAvailableRoles();

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const users = await authApi.getPendingUsers();
        setPendingUsers(users);
        // Initialize all roles to 'recepcionista'
        const initialRoles: { [key: number]: string } = {};
        users.forEach((user) => {
          initialRoles[user.id] = 'recepcionista';
        });
        setSelectedRoles(initialRoles);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    fetchPendingUsers();
  }, []);

  const handleApprove = async (userId: number) => {
    try {
      setApproving(userId);
      setSuccess('');
      setError('');
      const selectedRole = selectedRoles[userId] || 'recepcionista';
      const roleLabel = AVAILABLE_ROLES.find(r => r.value === selectedRole)?.label || selectedRole;
      await authApi.approveUser(userId, true, selectedRole);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess(`Usuario aprobado exitosamente como ${roleLabel}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (userId: number) => {
    try {
      setApproving(userId);
      setSuccess('');
      setError('');
      await authApi.approveUser(userId, false);
      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccess('Usuario rechazado y eliminado');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setApproving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aprobación de Usuarios</h1>
        <p className="text-gray-600 mt-2">Gestiona las solicitudes de nuevos empleados y asigna sus roles</p>
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Roles y Responsabilidades</CardTitle>
          </div>
          <CardDescription>
            Los roles definen qué acciones puede realizar cada empleado en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {AVAILABLE_ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => setShowRoleInfo(showRoleInfo === role.value ? null : role.value)}
                className="text-left p-4 rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-100 transition cursor-pointer"
              >
                <h4 className="font-semibold text-blue-900">{role.label}</h4>
                <p className="text-sm text-blue-700 mt-1">{role.description}</p>
                {showRoleInfo === role.value && (
                  <div className="mt-3 pt-3 border-t border-blue-300 space-y-2">
                    {ROLES_DEFINITION[role.value] &&
                      Object.entries(ROLES_DEFINITION[role.value].permissions)
                        .filter(([, perm]) => perm.enabled)
                        .map(([key, perm]) => (
                          <div key={key} className="flex items-start gap-2 text-xs text-blue-800">
                            <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{perm.label}</span>
                          </div>
                        ))}
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4 flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Haz click en un rol para ver más detalles de sus permisos
          </p>
        </CardContent>
      </Card>

      {error && <ErrorAlert message={error} />}
      {success && <SuccessAlert message={success} />}

      {pendingUsers.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No hay usuarios pendientes</h3>
              <p className="text-gray-600 mt-2">Todos los usuarios han sido aprobados</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingUsers.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900">
                        {user.full_name || user.email}
                      </h3>
                      {user.full_name && (
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <a href={`mailto:${user.email}`} className="hover:text-blue-600 truncate">
                            {user.email}
                          </a>
                        </div>
                      )}
                      {user.created_at && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>
                            Solicitó acceso el{' '}
                            {new Date(user.created_at).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Selection and Actions */}
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Shield className="h-4 w-4" />
                        Rol
                      </label>
                      <select
                        value={selectedRoles[user.id] || 'recepcionista'}
                        onChange={(e) => setSelectedRoles(prev => ({ ...prev, [user.id]: e.target.value }))}
                        disabled={approving === user.id}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {AVAILABLE_ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label} - {role.description}
                          </option>
                        ))}
                      </select>
                      {selectedRoles[user.id] && (
                        <p className="text-xs text-gray-600 mt-1">
                          {ROLES_DEFINITION[selectedRoles[user.id]]?.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(user.id)}
                      disabled={approving === user.id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {approving === user.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Aprobar
                    </Button>
                    <Button
                      onClick={() => handleReject(user.id)}
                      disabled={approving === user.id}
                      variant="destructive"
                    >
                      {approving === user.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Trash2 className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
