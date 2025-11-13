import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const presetEmail = params.get('email') ?? '';
  const presetToken = params.get('token') ?? '';

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState(presetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (data) => {
      setSuccessMessage(data?.message ?? 'Contraseña actualizada');
      setErrorMessage(null);
    },
    onError: (error: any) => {
      setSuccessMessage(null);
      setErrorMessage(error?.response?.data?.detail ?? 'No se pudo actualizar la contraseña');
    },
  });

  const isDisabled = useMemo(() => {
    return (
      !email ||
      !token ||
      !newPassword ||
      newPassword.length < 6 ||
      newPassword !== confirmPassword ||
      mutation.isLoading
    );
  }, [email, token, newPassword, confirmPassword, mutation.isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled) return;
    authApi.resetPassword({ email, token, new_password: newPassword });
    mutation.mutate({ email, token, new_password: newPassword });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Crear nueva contraseña</h1>
            <p className="text-sm text-gray-600">
              Ingresa el código recibido en tu correo y define una nueva contraseña segura.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="token">Código de recuperación</Label>
              <Input
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                {errorMessage}
              </p>
            )}
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded px-3 py-2">
                {successMessage}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isDisabled}>
              {mutation.isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </Button>
          </form>
          <div className="text-center text-sm text-gray-600">
            <Link to="/login" className="text-blue-600 hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
