// src/components/CreateRoomForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Esta función será llamada por el componente padre (`RoomsPage`) cuando se cree una habitación
interface CreateRoomFormProps {
  onRoomCreated: () => void;
  onCancel: () => void;
}

function CreateRoomForm({ onRoomCreated, onCancel }: CreateRoomFormProps) {
  const [number, setNumber] = useState('');
  const [type, setType] = useState<'single' | 'double' | 'suite'>('single');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const { token } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/rooms/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ number, type, notes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'No se pudo crear la habitación.');
      }

      alert('¡Habitación creada exitosamente!');
      onRoomCreated(); // Avisa al padre que la habitación fue creada para que pueda refrescar la lista
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-white">Crear Nueva Habitación</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Número de Habitación</label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'single' | 'double' | 'suite')}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md"
            >
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="suite">Suite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Notas (Opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded-md"
            />
          </div>
          {error && <p className="text-sm text-center text-red-400">{error}</p>}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 font-bold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Crear Habitación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRoomForm;
