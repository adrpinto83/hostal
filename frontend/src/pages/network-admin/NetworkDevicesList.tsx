import { useState, useMemo } from 'react';
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
  Clock,
  X
} from 'lucide-react';
import type { NetworkDevice } from '@/types';

type FilterType = 'total' | 'connected' | 'disconnected' | null;

export default function NetworkDevicesList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>(null);
  const { devices, devicesLoading, deleteDevice } = useNetworkDevices();

  // Calculate metrics
  const metrics = useMemo(() => {
    const connected = devices.filter((d: NetworkDevice) => d.connection_status === 'connected').length;
    const disconnected = devices.filter((d: NetworkDevice) => d.connection_status !== 'connected').length;

    return {
      total: devices.length,
      connected,
      disconnected,
      successRate: devices.length > 0
        ? (devices.reduce((sum: number, d: NetworkDevice) => sum + (d.success_rate || 0), 0) / devices.length).toFixed(1)
        : 0,
    };
  }, [devices]);

  // Filter devices based on search term and status filter
  const visibleDevices = useMemo(() => {
    return devices.filter((device: NetworkDevice) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        device.name?.toLowerCase().includes(term) ||
        device.ip_address?.toLowerCase().includes(term) ||
        device.brand?.toLowerCase().includes(term);

      const matchesFilter =
        filter === null ||
        filter === 'total' ||
        (filter === 'connected' && device.connection_status === 'connected') ||
        (filter === 'disconnected' && device.connection_status !== 'connected');

      return matchesSearch && matchesFilter;
    });
  }, [devices, searchTerm, filter]);

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

      {/* Indexed Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Card */}
        <button
          onClick={() => setFilter(filter === 'total' ? null : 'total')}
          className={`text-left transition-all ${
            filter === 'total' ? 'ring-2 ring-gray-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-gray-600 hover:shadow-lg ${
            filter === 'total' ? 'bg-gray-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
              <Network className="h-6 w-6 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.total}</div>
              <p className="text-xs text-gray-600 mt-1">Dispositivos registrados</p>
            </CardContent>
          </Card>
        </button>

        {/* Connected Card */}
        <button
          onClick={() => setFilter(filter === 'connected' ? null : 'connected')}
          className={`text-left transition-all ${
            filter === 'connected' ? 'ring-2 ring-green-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-green-600 hover:shadow-lg ${
            filter === 'connected' ? 'bg-green-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Conectados</CardTitle>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {metrics.connected}
              </div>
              <p className="text-xs text-gray-600 mt-1">Dispositivos activos</p>
            </CardContent>
          </Card>
        </button>

        {/* Disconnected Card */}
        <button
          onClick={() => setFilter(filter === 'disconnected' ? null : 'disconnected')}
          className={`text-left transition-all ${
            filter === 'disconnected' ? 'ring-2 ring-red-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-red-600 hover:shadow-lg ${
            filter === 'disconnected' ? 'bg-red-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Desconectados</CardTitle>
              <AlertCircle className="h-6 w-6 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {metrics.disconnected}
              </div>
              <p className="text-xs text-gray-600 mt-1">Sin conexión</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Active Filter Indicator */}
      {filter && (
        <div className="mb-4 flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            Filtrando por: {filter === 'total' ? 'Total' : filter === 'connected' ? 'Conectados' : 'Desconectados'}
          </Badge>
          <button
            onClick={() => setFilter(null)}
            className="text-gray-600 hover:text-gray-900"
            title="Limpiar filtro"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Dispositivos de Red
            {filter && (
              <Badge className="ml-auto bg-blue-100 text-blue-800">Filtrado</Badge>
            )}
          </CardTitle>
        </CardHeader>
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
                    <tr
                      key={device.id}
                      className={`border-b transition-colors ${
                        device.connection_status === 'connected'
                          ? 'hover:bg-green-50'
                          : 'hover:bg-red-50'
                      }`}
                    >
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
                          <span className="text-sm font-medium">
                            {getStatusLabel(device.connection_status || 'unknown')}
                          </span>
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
