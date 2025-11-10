import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi } from '@/lib/api';
import { Bed, Users, Wrench, UserCog, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
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

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  );
}
