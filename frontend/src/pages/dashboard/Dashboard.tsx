import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, bandwidthApi } from '@/lib/api';
import { Bed, Users, Wrench, UserCog, Activity, Download, Upload, DollarSign, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ExchangeRates } from '@/components/ui/exchange-rates';

// Skeleton Card Component
const SkeletonCard = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 w-24 rounded bg-gray-200"></div>
      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 w-1/2 rounded bg-gray-200 mb-2"></div>
      <div className="h-3 w-3/4 rounded bg-gray-200"></div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: bandwidth, isLoading: isLoadingBandwidth } = useQuery({
    queryKey: ['bandwidth-summary'],
    queryFn: () => bandwidthApi.getSummary(7),
  });

  const roomStatusData = [
    { name: 'Disponibles', value: stats?.rooms.available || 0, fill: '#22c55e' },
    { name: 'Ocupadas', value: stats?.rooms.occupied || 0, fill: '#3b82f6' },
    { name: 'Limpieza', value: stats?.rooms.cleaning || 0, fill: '#eab308' },
    { name: 'Mantenimiento', value: stats?.rooms.maintenance || 0, fill: '#f97316' },
    { name: 'Fuera de Servicio', value: stats?.rooms.out_of_service || 0, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard General</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingStats ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Revenue and Room Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos por Ocupación</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="space-y-2">
                <div className="h-4 w-full rounded bg-gray-200"></div>
                <div className="h-4 w-full rounded bg-gray-200"></div>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado de Habitaciones</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-[200px]">
            {isLoadingStats ? (
              <div className="h-full w-full rounded bg-gray-200 animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value">
                    {roomStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exchange Rates */}
      <ExchangeRates />

      {/* Internet Usage */}
      <div className="grid gap-4 lg:grid-cols-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uso de Internet (7 días)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingBandwidth ? (
              <div className="space-y-3">
                <div className="h-8 w-1/3 rounded bg-gray-200"></div>
                <div className="h-3 w-1/2 rounded bg-gray-200"></div>
                <div className="flex gap-4">
                  <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                  <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                </div>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}