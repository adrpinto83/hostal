import React, { useState } from 'react';

// El componente ahora acepta una propiedad `onLoginSuccess`
function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Ocurrió un error');
      } else {
        // ¡Éxito!
        localStorage.setItem('authToken', data.access_token);
        // Llamamos a la función que nos pasó el componente padre (App.tsx)
        onLoginSuccess();
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor.');
    }
  };

  // El resto del JSX del formulario se mantiene igual
  return (
    <div className="w-full max-w-xs p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center text-white">Iniciar Sesión</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <p className="text-sm text-center text-red-400">{error}</p>}
        <button
          type="submit"
          className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
