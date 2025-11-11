import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, bandwidthApi } from '@/lib/api';
import { Bed, Users, Wrench, UserCog, Activity, Download, Upload } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: bandwidth } = useQuery({
    queryKey: ['bandwidth-summary'],
    queryFn: () => bandwidthApi.getSummary(7),
  });

  if (isLoading) {
    return <div>Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Habitaciones Disponibles</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rooms.available || 0}</div>
            <p className="text-xs text-muted-foreground">de {stats?.rooms.total || 0} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupación Activa</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.occupancy.active_occupancies || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.occupancy.occupied_rooms || 0} habitaciones ocupadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Activo</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.staff.active || 0}</div>
            <p className="text-xs text-muted-foreground">de {stats?.staff.total || 0} totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento Pendiente</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.maintenance.pending || 0}</div>
            <p className="text-xs text-muted-foreground">tareas pendientes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Ocupación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bolívares (VES):</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(stats?.occupancy.revenue.total_bs || 0, 'VES')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Dólares (USD):</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(stats?.occupancy.revenue.total_usd || 0, 'USD')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Habitaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Disponibles:</span>
                <span className="font-semibold text-green-600">{stats?.rooms.available || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Ocupadas:</span>
                <span className="font-semibold text-blue-600">{stats?.rooms.occupied || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Limpieza:</span>
                <span className="font-semibold text-yellow-600">{stats?.rooms.cleaning || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Mantenimiento:</span>
                <span className="font-semibold text-orange-600">{stats?.rooms.maintenance || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Uso de Internet (7 días)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold">
                  {bandwidth?.total_usage?.gb?.toFixed(2) || '0.00'} GB
                </div>
                <p className="text-xs text-muted-foreground">Uso total</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3 text-blue-600" />
                  <span className="text-gray-600">
                    {bandwidth?.recent_usage?.downloaded_gb?.toFixed(1) || '0.0'} GB
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Upload className="h-3 w-3 text-green-600" />
                  <span className="text-gray-600">
                    {bandwidth?.recent_usage?.uploaded_gb?.toFixed(1) || '0.0'} GB
                  </span>
                </div>
              </div>
              {bandwidth?.top_devices && bandwidth.top_devices.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-600 mb-1">Dispositivo principal:</p>
                  <div className="text-sm font-medium">
                    {bandwidth.top_devices[0].name || bandwidth.top_devices[0].mac}
                  </div>
                  <p className="text-xs text-gray-500">
                    {bandwidth.top_devices[0].usage_gb.toFixed(2)} GB
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
