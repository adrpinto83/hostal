import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardApi, bandwidthApi, occupancyApi, reservationsApi } from '@/lib/api';
import { Bed, Users, Wrench, UserCog, Activity, Download, Upload, DollarSign, CalendarDays, ArrowUp, ArrowDown, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend } from 'recharts';
import { ExchangeRates } from '@/components/ui/exchange-rates';
import { Button } from '@/components/ui/button';

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

// Circular Progress Component
const CircularProgress = ({ percentage, size = 120 }: { percentage: number; size?: number }) => {
  const radius = size / 2 - 5;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percentage >= 80 ? '#ef4444' : percentage >= 60 ? '#f97316' : '#22c55e'}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold">{percentage.toFixed(0)}%</div>
        <p className="text-xs text-gray-500">Ocupación</p>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });

  const { data: occupancies, isLoading: isLoadingOccupancies } = useQuery({
    queryKey: ['occupancies-active'],
    queryFn: occupancyApi.getActive,
  });

  const { data: reservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: reservationsApi.getAll,
  });

  const { data: bandwidth, isLoading: isLoadingBandwidth } = useQuery({
    queryKey: ['bandwidth-summary'],
    queryFn: () => bandwidthApi.getSummary(7),
  });

  // Calculate occupancy percentage
  const occupancyPercentage = stats
    ? (stats.rooms.occupied / stats.rooms.total) * 100
    : 0;

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Filter today's check-ins and check-outs
  const todaysCheckIns = reservations?.filter((r) => {
    const startDate = r.start_date.split('T')[0];
    return startDate === today && r.status !== 'cancelled';
  }) || [];

  const todaysCheckOuts = reservations?.filter((r) => {
    const endDate = r.end_date.split('T')[0];
    return endDate === today && (r.status === 'active' || r.status === 'checked_out');
  }) || [];

  // Get high-priority alerts
  const alerts = [
    ...(stats?.maintenance.pending && stats.maintenance.pending > 0
      ? [{ type: 'maintenance', count: stats.maintenance.pending, message: 'Tareas de mantenimiento pendientes' }]
      : []),
    ...(occupancyPercentage > 90
      ? [{ type: 'occupancy', count: null, message: 'Ocupación crítica (>90%)' }]
      : []),
    ...(todaysCheckOuts.length > 0
      ? [{ type: 'checkout', count: todaysCheckOuts.length, message: `${todaysCheckOuts.length} check-out${todaysCheckOuts.length > 1 ? 's' : ''} hoy` }]
      : []),
  ];

  const roomStatusData = [
    { name: 'Disponibles', value: stats?.rooms.available || 0, fill: '#22c55e' },
    { name: 'Ocupadas', value: stats?.rooms.occupied || 0, fill: '#3b82f6' },
    { name: 'Limpieza', value: stats?.rooms.cleaning || 0, fill: '#eab308' },
    { name: 'Mantenimiento', value: stats?.rooms.maintenance || 0, fill: '#f97316' },
    { name: 'Fuera de Servicio', value: stats?.rooms.out_of_service || 0, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard General</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

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

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="grid gap-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border-l-4 flex items-center gap-3 ${
                alert.type === 'maintenance'
                  ? 'bg-orange-50 border-orange-400'
                  : alert.type === 'occupancy'
                  ? 'bg-red-50 border-red-400'
                  : 'bg-blue-50 border-blue-400'
              }`}
            >
              <AlertCircle
                className={`h-5 w-5 flex-shrink-0 ${
                  alert.type === 'maintenance'
                    ? 'text-orange-600'
                    : alert.type === 'occupancy'
                    ? 'text-red-600'
                    : 'text-blue-600'
                }`}
              />
              <span className={`text-sm font-medium ${
                alert.type === 'maintenance'
                  ? 'text-orange-900'
                  : alert.type === 'occupancy'
                  ? 'text-red-900'
                  : 'text-blue-900'
              }`}>
                {alert.message} {alert.count && `(${alert.count})`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
          <ArrowDown className="h-5 w-5" />
          <span className="text-xs">Check-in</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
          <ArrowUp className="h-5 w-5" />
          <span className="text-xs">Check-out</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <span className="text-xs">Reserva</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-2">
          <Wrench className="h-5 w-5" />
          <span className="text-xs">Mantenimiento</span>
        </Button>
      </div>

      {/* Occupancy Rate and Today's Schedule */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            {isLoadingStats ? (
              <div className="h-32 w-32 rounded-full bg-gray-200 animate-pulse"></div>
            ) : (
              <div className="relative flex items-center justify-center">
                <CircularProgress percentage={occupancyPercentage} size={150} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Horario Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todaysCheckIns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDown className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">Check-ins ({todaysCheckIns.length})</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {todaysCheckIns.slice(0, 3).map((r) => (
                      <div key={r.id} className="text-xs text-gray-600">
                        <span className="font-medium">{r.guest.full_name}</span> - Hab. {r.room.number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {todaysCheckOuts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowUp className="h-4 w-4 text-orange-600" />
                    <span className="font-semibold text-sm">Check-outs ({todaysCheckOuts.length})</span>
                  </div>
                  <div className="space-y-1 pl-6">
                    {todaysCheckOuts.slice(0, 3).map((r) => (
                      <div key={r.id} className="text-xs text-gray-600">
                        <span className="font-medium">{r.guest.full_name}</span> - Hab. {r.room.number}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {todaysCheckIns.length === 0 && todaysCheckOuts.length === 0 && (
                <p className="text-xs text-gray-500 italic">Sin movimientos registrados hoy</p>
              )}
            </div>
          </CardContent>
        </Card>
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