// src/pages/Rooms.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import CreateRoomForm from '../components/CreateRoomForm'; // <-- 1. Importa el nuevo formulario

interface Room {
  id: number;
  number: string;
  type: 'single' | 'double' | 'suite';
  notes: string | null;
}

function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { token } = useAuth();

  // 2. Nuevo estado para controlar la visibilidad del formulario
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);

  // 3. Envuelve la lógica de fetch en un useCallback para poder llamarla de nuevo
  const fetchRooms = useCallback(async () => {
    if (!token) {
      setError('No estás autenticado.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/rooms/', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudieron cargar las habitaciones.');
      const data: Room[] = await response.json();
      setRooms(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error desconocido.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomCreated = () => {
    setIsCreateFormVisible(false); // Cierra el formulario
    fetchRooms(); // Vuelve a cargar la lista de habitaciones
  };

  if (loading && rooms.length === 0) {
    return <p className="text-white text-center">Cargando habitaciones...</p>;
  }

  if (error && rooms.length === 0) {
    return <p className="text-red-400 text-center">{error}</p>;
  }

  return (
    <>
      <div className="w-full max-w-4xl p-8 bg-gray-800 rounded-lg shadow-md text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestión de Habitaciones</h1>
          <div>
            {/* 4. Botón para abrir el formulario */}
            <button
              onClick={() => setIsCreateFormVisible(true)}
              className="px-4 py-2 mr-4 text-sm font-bold text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              Crear Nueva Habitación
            </button>
            <Link to="/dashboard">
              <button className="px-4 py-2 text-sm font-bold text-white bg-gray-600 rounded-md hover:bg-gray-700">
                Volver al Panel
              </button>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          {/* ... (el código de la tabla se mantiene igual) ... */}
        </div>
      </div>

      {/* 5. Muestra el formulario si el estado es 'true' */}
      {isCreateFormVisible && (
        <CreateRoomForm
          onRoomCreated={handleRoomCreated}
          onCancel={() => setIsCreateFormVisible(false)}
        />
      )}
    </>
  );
}

export default RoomsPage;
