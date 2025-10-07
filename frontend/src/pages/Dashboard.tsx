import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom'; // 1. Import Link

interface User {
  email: string;
  role: string;
}

function DashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchUserData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/v1/users/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Sesión inválida.');
        const data: User = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al obtener datos.');
        logout();
        navigate('/login');
      }
    };
    fetchUserData();
  }, [token, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md text-white">
      <h1 className="text-2xl font-bold text-center">Panel de Control</h1>
      {error && <p className="text-center text-red-400">{error}</p>}
      {user ? (
        <div className="space-y-4">
          <p>Bienvenido, <span className="font-bold">{user.email}</span></p>
          <p>Rol: <span className="font-mono bg-gray-700 px-2 py-1 rounded">{user.role}</span></p>

          {/* --- 2. ADD THIS LINK/BUTTON --- */}
          <Link to="/rooms">
            <button className="w-full px-4 py-2 font-bold text-white bg-gray-600 rounded-md hover:bg-gray-700">
              Gestionar Habitaciones
            </button>
          </Link>
          {/* --- END OF BUTTON --- */}

          <button onClick={handleLogout} className="w-full px-4 py-2 font-bold text-white bg-red-600 rounded-md hover:bg-red-700">
            Cerrar Sesión
          </button>
        </div>
      ) : <p className="text-center">Cargando...</p>}
    </div>
  );
}

export default DashboardPage;
