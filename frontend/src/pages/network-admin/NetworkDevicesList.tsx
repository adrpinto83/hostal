import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetworkDevices } from '@/lib/hooks/useNetworkDevices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Network,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { NetworkDevice } from '@/types';

export default function NetworkDevicesList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { devices, devicesLoading, deleteDevice } = useNetworkDevices();

  const visibleDevices = devices.filter((device: NetworkDevice) => {
    const term = searchTerm.toLowerCase();
    return (
      term.length === 0 ||
      device.name?.toLowerCase().includes(term) ||
      device.ip_address?.toLowerCase().includes(term) ||
      device.brand?.toLowerCase().includes(term)
    );
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'testing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'disconnected':
        return 'Desconectado';
      case 'testing':
        return 'Probando';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  const handleDeleteDevice = async (id: number) => {
    if (confirm('¿Está seguro de que desea eliminar este dispositivo?')) {
      await deleteDevice.mutateAsync(id);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos de Red</h1>
          <p className="text-gray-600">
            {visibleDevices.length} dispositivo{visibleDevices.length !== 1 ? 's' : ''} encontrado
          </p>
        </div>
        <Button
          onClick={() => navigate('/network-devices/new')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Dispositivo
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre, IP, o marca..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
            <Network className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devices.length}</div>
            <p className="text-xs text-gray-600">Dispositivos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conectados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {devices.filter((d: NetworkDevice) => d.connection_status === 'connected').length}
            </div>
            <p className="text-xs text-gray-600">Dispositivos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Desconectados</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {devices.filter((d: NetworkDevice) => d.connection_status !== 'connected').length}
            </div>
            <p className="text-xs text-gray-600">Sin conexión</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card>
        <CardContent className="pt-6">
          {devicesLoading ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              Cargando dispositivos...
            </div>
          ) : visibleDevices.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-gray-500">
              No se encontraron dispositivos
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Nombre</th>
                    <th className="text-left p-3">Marca</th>
                    <th className="text-left p-3">Tipo</th>
                    <th className="text-left p-3">IP Address</th>
                    <th className="text-left p-3">Puerto</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Tasa de Éxito</th>
                    <th className="text-center p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDevices.map((device: NetworkDevice) => (
                    <tr key={device.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{device.name}</p>
                          {device.description && (
                            <p className="text-xs text-gray-500">{device.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="capitalize">{device.brand?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3">
                        <span className="capitalize">{device.device_type?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-mono text-sm">{device.ip_address}</span>
                      </td>
                      <td className="p-3">
                        <span className="text-sm">{device.port}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.connection_status || 'unknown')}
                          <span className="text-sm">{getStatusLabel(device.connection_status || 'unknown')}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            (device.success_rate || 0) >= 90
                              ? 'bg-green-100 text-green-800'
                              : (device.success_rate || 0) >= 70
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {(device.success_rate || 0).toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/network-devices/${device.id}/edit`)}
                            title="Editar dispositivo"
                          >
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDevice(device.id)}
                            disabled={deleteDevice.isPending}
                            title="Eliminar dispositivo"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
