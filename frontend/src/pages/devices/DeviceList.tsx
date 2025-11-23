import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Wifi, WifiOff, Trash2, Search, Activity, Download, Upload, X } from 'lucide-react';
import { devicesApi, bandwidthApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Device } from '@/types';

type DashboardFilter = 'total' | 'online' | 'suspended' | 'usage' | null;

export default function DeviceList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterSuspended, setFilterSuspended] = useState<'all' | 'active' | 'suspended'>('all');
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>(null);
  const queryClient = useQueryClient();

  const {
    data: devicesData,
    isLoading,
    isFetching,
  } = useQuery<Device[]>({
    queryKey: ['devices', searchTerm],
    queryFn: () => devicesApi.getAll({ q: searchTerm || undefined }),
    placeholderData: (previous) => previous,
  });
  const devices = devicesData ?? [];
  const isInitialLoading = !devicesData && isLoading;

  const { data: bandwidthSummary } = useQuery({
    queryKey: ['bandwidth-summary'],
    queryFn: () => bandwidthApi.getSummary(7),
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const online = devices.filter((d) => d.is_online).length;
    const suspended = devices.filter((d) => d.suspended).length;
    const totalUsage = bandwidthSummary?.total_usage?.gb || 0;

    return {
      total: devices.length,
      online,
      suspended,
      totalUsage,
    };
  }, [devices, bandwidthSummary]);

  const visibleDevices = useMemo(() => {
    return devices.filter((device) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        device.name?.toLowerCase().includes(term) ||
        device.mac.toLowerCase().includes(term) ||
        device.guest_name?.toLowerCase().includes(term);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'online' && device.is_online) ||
        (filterStatus === 'offline' && !device.is_online);

      const matchesSuspended =
        filterSuspended === 'all' ||
        (filterSuspended === 'active' && !device.suspended) ||
        (filterSuspended === 'suspended' && device.suspended);

      const matchesDashboardFilter =
        dashboardFilter === null ||
        dashboardFilter === 'total' ||
        (dashboardFilter === 'online' && device.is_online) ||
        (dashboardFilter === 'suspended' && device.suspended);

      return matchesSearch && matchesStatus && matchesSuspended && matchesDashboardFilter;
    });
  }, [devices, searchTerm, filterStatus, filterSuspended, dashboardFilter]);

  // Mutation to suspend device
  const suspendMutation = useMutation({
    mutationFn: (deviceId: number) => devicesApi.suspend(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Mutation to resume device
  const resumeMutation = useMutation({
    mutationFn: devicesApi.resume,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  // Mutation to delete device
  const deleteMutation = useMutation({
    mutationFn: async ({ guestId, deviceId }: { guestId: number; deviceId: number }) => {
      await devicesApi.delete(guestId, deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb > 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getDeviceBandwidth = (deviceId: number) => {
    return bandwidthSummary?.top_devices?.find((d) => d.device_id === deviceId);
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
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nombre, MAC o huésped..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <select
                className="w-full border rounded px-3 py-2"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
              >
                <option value="all">Todos los estados</option>
                <option value="online">En línea</option>
                <option value="offline">Fuera de línea</option>
              </select>
            </div>
            <div>
              <select
                className="w-full border rounded px-3 py-2"
                value={filterSuspended}
                onChange={(e) => setFilterSuspended(e.target.value as any)}
              >
                <option value="all">Todos (activos y suspendidos)</option>
                <option value="active">Solo activos</option>
                <option value="suspended">Solo suspendidos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground min-h-[1.25rem] mb-2">
        {isFetching && !isInitialLoading && <span>Actualizando resultados...</span>}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500 mb-6">
          Cargando dispositivos...
        </div>
      ) : (
        <>
      {/* Indexed Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Card */}
        <button
          onClick={() => setDashboardFilter(dashboardFilter === 'total' ? null : 'total')}
          className={`text-left transition-all ${
            dashboardFilter === 'total' ? 'ring-2 ring-gray-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-gray-600 hover:shadow-lg ${
            dashboardFilter === 'total' ? 'bg-gray-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
              <Monitor className="h-6 w-6 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics.total}</div>
              <p className="text-xs text-gray-600 mt-1">Dispositivos registrados</p>
            </CardContent>
          </Card>
        </button>

        {/* Online Card */}
        <button
          onClick={() => setDashboardFilter(dashboardFilter === 'online' ? null : 'online')}
          className={`text-left transition-all ${
            dashboardFilter === 'online' ? 'ring-2 ring-green-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-green-600 hover:shadow-lg ${
            dashboardFilter === 'online' ? 'bg-green-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-600">En Línea</CardTitle>
              <Wifi className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {metrics.online}
              </div>
              <p className="text-xs text-gray-600 mt-1">Conectados ahora</p>
            </CardContent>
          </Card>
        </button>

        {/* Suspended Card */}
        <button
          onClick={() => setDashboardFilter(dashboardFilter === 'suspended' ? null : 'suspended')}
          className={`text-left transition-all ${
            dashboardFilter === 'suspended' ? 'ring-2 ring-orange-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-orange-600 hover:shadow-lg ${
            dashboardFilter === 'suspended' ? 'bg-orange-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-600">Suspendidos</CardTitle>
              <WifiOff className="h-6 w-6 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {metrics.suspended}
              </div>
              <p className="text-xs text-gray-600 mt-1">Sin acceso a internet</p>
            </CardContent>
          </Card>
        </button>

        {/* Usage Card */}
        <button
          onClick={() => setDashboardFilter(dashboardFilter === 'usage' ? null : 'usage')}
          className={`text-left transition-all ${
            dashboardFilter === 'usage' ? 'ring-2 ring-blue-400' : ''
          }`}
        >
          <Card className={`border-l-4 border-l-blue-600 hover:shadow-lg ${
            dashboardFilter === 'usage' ? 'bg-blue-50' : ''
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Uso Total</CardTitle>
              <Activity className="h-6 w-6 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {metrics.totalUsage.toFixed(2)} GB
              </div>
              <p className="text-xs text-gray-600 mt-1">Últimos 7 días</p>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Active Filter Indicator */}
      {dashboardFilter && (
        <div className="mb-4 flex items-center gap-2">
          <Badge className="bg-blue-100 text-blue-800">
            Filtrando por: {dashboardFilter === 'total' ? 'Total' : dashboardFilter === 'online' ? 'En Línea' : dashboardFilter === 'suspended' ? 'Suspendidos' : 'Uso Total'}
          </Badge>
          <button
            onClick={() => setDashboardFilter(null)}
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
            <Monitor className="h-5 w-5" />
            Dispositivos de Red
            {dashboardFilter && (
              <Badge className="ml-auto bg-blue-100 text-blue-800">Filtrado</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Dispositivo</th>
                  <th className="text-left p-3">Huésped</th>
                  <th className="text-left p-3">MAC Address</th>
                  <th className="text-left p-3">IP</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-right p-3">Uso (7d)</th>
                  <th className="text-left p-3">Última Conexión</th>
                  <th className="text-center p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibleDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-gray-500">
                      No se encontraron dispositivos
                    </td>
                  </tr>
                ) : (
                  visibleDevices.map((device) => {
                    const usage = getDeviceBandwidth(device.id);
                    return (
                      <tr
                        key={device.id}
                        className={`border-b transition-colors ${
                          device.suspended
                            ? 'hover:bg-orange-50'
                            : device.is_online
                            ? 'hover:bg-green-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium">{device.name || 'Sin nombre'}</p>
                              {device.vendor && (
                                <p className="text-xs text-gray-500">{device.vendor}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-gray-700">{device.guest_name}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-sm">{device.mac}</span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-sm text-gray-600">
                            {device.last_ip || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {device.is_online ? (
                              <Badge className="bg-green-100 text-green-800 w-fit">
                                <Wifi className="h-3 w-3 mr-1" />
                                En línea
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 w-fit">
                                Fuera de línea
                              </Badge>
                            )}
                            {device.suspended && (
                              <Badge className="bg-orange-100 text-orange-800 w-fit">
                                Suspendido
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          {usage ? (
                            <div>
                              <p className="font-semibold text-blue-600">
                                {usage.usage_gb.toFixed(2)} GB
                              </p>
                              <div className="flex items-center justify-end gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  {formatBytes(device.total_bytes_downloaded)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Upload className="h-3 w-3" />
                                  {formatBytes(device.total_bytes_uploaded)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {device.last_seen ? (
                            <span className="text-sm text-gray-600">
                              {new Date(device.last_seen).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">Nunca</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            {device.suspended ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => resumeMutation.mutate(device.id)}
                                disabled={resumeMutation.isPending}
                                title="Reactivar dispositivo"
                              >
                                <Wifi className="h-4 w-4 text-green-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => suspendMutation.mutate(device.id)}
                                disabled={suspendMutation.isPending}
                                title="Suspender dispositivo"
                              >
                                <WifiOff className="h-4 w-4 text-orange-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('¿Eliminar este dispositivo?')) {
                                  deleteMutation.mutate({
                                    guestId: device.guest_id,
                                    deviceId: device.id,
                                  });
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Eliminar dispositivo"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
