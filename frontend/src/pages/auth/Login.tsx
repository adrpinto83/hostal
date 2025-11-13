import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { handleApiError } from '@/lib/api/client';
import { AlertCircle, Eye, EyeOff, Loader2, Star, CheckCircle2 } from 'lucide-react';

// Componente de Alerta para mostrar errores de forma más destacada
function ErrorAlert({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-lg p-4 flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <AlertCircle className="flex-shrink-0 h-4 w-4 mr-2" />
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-red-800 hover:text-red-900 font-bold"
          aria-label="Cerrar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Componente de Alerta para información
function InfoAlert({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="bg-blue-50 border border-blue-200 text-sm text-blue-800 rounded-lg p-4 flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <AlertCircle className="flex-shrink-0 h-4 w-4 mr-2" />
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-blue-800 hover:text-blue-900 font-bold"
          aria-label="Cerrar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// Componente de Alerta de éxito
function SuccessAlert({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <div className="bg-green-50 border border-green-200 text-sm text-green-800 rounded-lg p-4 flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <CheckCircle2 className="flex-shrink-0 h-4 w-4 mr-2" />
        <span className="font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-green-800 hover:text-green-900 font-bold"
          aria-label="Cerrar alerta"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [info, setInfo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MESSAGE = `Demasiados intentos fallidos. Intenta nuevamente en 1 minuto.`;

  const handleCloseError = () => {
    setError('');
  };

  const handleCloseSuccess = () => {
    setSuccess('');
  };

  const handleCloseInfo = () => {
    setInfo('');
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Limpiar error cuando el usuario modifica el email
    if (error) setError('');
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Limpiar error cuando el usuario modifica la contraseña
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Si está bloqueado, no permitir intentos
    if (isBlocked) {
      setError(LOCKOUT_MESSAGE);
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.login({ username: email, password });
      localStorage.setItem('access_token', response.access_token);
      const user = await authApi.getCurrentUser();
      setAuth(user, response.access_token);
      setSuccess('¡Inicio de sesión exitoso!');
      setFailedAttempts(0); // Resetear contador
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (err) {
      localStorage.removeItem('access_token');
      const errorMessage = handleApiError(err);

      // Incrementar contador de intentos fallidos
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      // Si se alcanzó el límite de intentos
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setError(`${errorMessage} - Se bloqueó la cuenta después de ${MAX_ATTEMPTS} intentos fallidos.`);

        // Desbloquear después de 1 minuto
        setTimeout(() => {
          setIsBlocked(false);
          setFailedAttempts(0);
          setError('');
          setInfo('Puedes intentar nuevamente.');
        }, 60000);
      } else {
        // Mostrar error con número de intentos
        const remainingAttempts = MAX_ATTEMPTS - newAttempts;
        setError(`${errorMessage} (Intentos restantes: ${remainingAttempts}/${MAX_ATTEMPTS})`);
      }
    } finally {
      setLoading(false);
    }
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
                "Este sistema ha transformado por completo la gestión de hostales. Es intuitivo, rápido y ahorra horas de trabajo cada día."
              </p>
              <footer className="text-sm">Adrian Pinto - CEO - JADS Software - +584248886222</footer>
            </blockquote>
            <div className="space-y-3 text-sm border-t border-zinc-700 pt-6">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Gestión integral de reservaciones</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Control de huéspedes y ocupación</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-400 mt-1" />
                <span>Procesamiento seguro de pagos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12 px-4 bg-gradient-to-b from-gray-50 to-gray-100">
        <Card className="mx-auto w-full max-w-sm shadow-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription>
              Accede al panel de administración de tu hostal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4">
              {/* Email Input */}
              <div className="grid gap-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  disabled={loading}
                  className="border-gray-300"
                  autoComplete="email"
                />
              </div>

              {/* Password Input */}
              <div className="grid gap-2 relative">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  disabled={loading}
                  className="border-gray-300"
                  autoComplete="current-password"
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

              <div className="text-right text-sm">
                <Link to="/forgot-password" className="text-blue-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Alerts */}
              {error && <ErrorAlert message={error} onClose={handleCloseError} />}
              {success && <SuccessAlert message={success} onClose={handleCloseSuccess} />}
              {info && <InfoAlert message={info} onClose={handleCloseInfo} />}

              {/* Failed Attempts Counter */}
              {failedAttempts > 0 && !isBlocked && (
                <div className="bg-yellow-50 border border-yellow-200 text-xs text-yellow-800 rounded-lg p-3 text-center">
                  <span className="font-semibold">Intentos fallidos: {failedAttempts}/{MAX_ATTEMPTS}</span>
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                className={`w-full text-white font-semibold ${
                  isBlocked
                    ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={loading || isBlocked}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isBlocked
                  ? 'Cuenta bloqueada (1 minuto)'
                  : loading
                    ? 'Iniciando sesión...'
                    : 'Iniciar Sesión'}
              </Button>

              {/* Register Link */}
              <div className="text-center text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-blue-600 hover:underline font-semibold">
                  Regístrate aquí
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
