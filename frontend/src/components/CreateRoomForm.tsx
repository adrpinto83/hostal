// src/components/CreateRoomForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
      onRoomCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear Nueva Habitación</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="number">Número de Habitación</Label>
              <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo</Label>
              <Select onValueChange={(value) => setType(value as any)} defaultValue={type}>
                <SelectTrigger><SelectValue placeholder="Selecciona un tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="double">Double</SelectItem>
                  <SelectItem value="suite">Suite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && <p className="text-sm text-center text-red-500">{error}</p>}
            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
              <Button type="submit">Crear Habitación</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateRoomForm;
