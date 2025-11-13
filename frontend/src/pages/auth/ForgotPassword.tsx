import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: authApi.requestPasswordReset,
    onSuccess: (data) => {
      setSuccessMessage(data?.message ?? 'Si el correo es válido, enviaremos un enlace.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    mutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
            <p className="text-sm text-gray-600">
              Ingresa tu correo y te enviaremos un enlace para restablecerla.
            </p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {successMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded px-3 py-2">
                {successMessage}
              </p>
            )}
            {mutation.isError && !successMessage && (
              <p className="text-sm text-red-600">
                Ocurrió un error al enviar el correo. Inténtalo nuevamente.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Enviando...' : 'Enviar instrucciones'}
            </Button>
          </form>
          <div className="text-center text-sm text-gray-600">
            <Link to="/login" className="text-blue-600 hover:underline">
              Volver a iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
