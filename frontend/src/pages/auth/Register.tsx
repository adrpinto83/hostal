import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { handleApiError } from '@/lib/api/client';
import { AlertCircle, Eye, EyeOff, Loader2, Star, CheckCircle2 } from 'lucide-react';

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

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    document_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      setError('Email, contraseña y nombre son requeridos');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    if (formData.full_name.length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        phone: formData.phone || undefined,
        document_id: formData.document_id || undefined,
      });

      setSuccess(response.message || 'Registro exitoso. Será redirigido al login en 3 segundos...');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden bg-muted lg:block">
        <div className="flex flex-col justify-between h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-blue-900 p-8 text-white">
          <div className="flex items-center gap-2 text-lg font-medium">
            <Star className="h-6 w-6" />
            <span>JADS Hostal Manager</span>
          </div>
          <div className="mt-auto space-y-6">
            <blockquote className="space-y-2">
              <p className="text-lg leading-relaxed">
                "Únete a nuestro equipo y sé parte de la transformación digital de nuestro hostal. Gestión moderna y eficiente para el éxito del equipo."
              </p>
              <footer className="text-sm">Bienvenida al portal de empleados</footer>
            </blockquote>
            <div className="space-y-3 text-sm border-t border-zinc-700 pt-6">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Acceso rápido al sistema de gestión</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Herramientas para administrar reservas y huéspedes</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Colaboración eficiente con el equipo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 bg-gradient-to-b from-gray-50 to-gray-100">
        <Card className="mx-auto w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">Registrarse</CardTitle>
            <CardDescription>
              Crea tu cuenta como empleado. Requiere aprobación del administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {/* Full Name Input */}
              <div className="grid gap-2">
                <Label htmlFor="full_name">Nombre Completo *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="border-gray-300"
                />
              </div>

              {/* Email Input */}
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="border-gray-300"
                />
              </div>

              {/* Password Input */}
              <div className="grid gap-2 relative">
                <Label htmlFor="password">Contraseña *</Label>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="border-gray-300"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute bottom-1 right-1 h-7 w-7 text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>

              {/* Confirm Password Input */}
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="border-gray-300"
                />
              </div>

              {/* Phone Input - Optional */}
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono (Opcional)</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+58 416 1234567"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  className="border-gray-300"
                />
              </div>

              {/* Document ID Input - Optional */}
              <div className="grid gap-2">
                <Label htmlFor="document_id">Documento de Identidad (Opcional)</Label>
                <Input
                  id="document_id"
                  name="document_id"
                  type="text"
                  placeholder="V-12345678"
                  value={formData.document_id}
                  onChange={handleChange}
                  disabled={loading}
                  className="border-gray-300"
                />
              </div>

              {/* Alerts */}
              {error && <ErrorAlert message={error} />}
              {success && <SuccessAlert message={success} />}

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Registrando...' : 'Registrarse'}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                  Inicia sesión aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
