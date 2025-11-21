import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Download, Upload, Wifi, Monitor, TrendingUp } from 'lucide-react';
import { bandwidthApi, guestsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function NetworkMonitoring() {
  const [days, setDays] = useState(7);

  // Query bandwidth summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['bandwidth-summary', days],
    queryFn: () => bandwidthApi.getSummary(days),
  });

  // Query recent activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => bandwidthApi.getRecentActivity(20),
  });

  // Query guests for name lookup
  const { data: guests = [] } = useQuery({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll(),
  });

  const getGuestName = (guestId: number) => {
    const guest = guests.find((g) => g.id === guestId);
    return guest?.full_name || `Huésped #${guestId}`;
  };

  if (summaryLoading) {
    return <div className="p-6">Cargando datos de red...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Monitoreo de Red</h1>
          <p className="text-gray-600">Control de uso de internet y ancho de banda</p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={1}>Último día</option>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Uso Total
            </CardTitle>
            <Activity className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.total_usage?.gb?.toFixed(2) || '0.00'} GB
            </div>
            <p className="text-xs text-gray-600">Últimos {days} días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Descarga
            </CardTitle>
            <Download className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.recent_usage?.downloaded_gb?.toFixed(2) || '0.00'} GB
            </div>
            <p className="text-xs text-gray-600">Tráfico de descarga</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Carga
            </CardTitle>
            <Upload className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.recent_usage?.uploaded_gb?.toFixed(2) || '0.00'} GB
            </div>
            <p className="text-xs text-gray-600">Tráfico de carga</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Dispositivos Activos
            </CardTitle>
            <Monitor className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.top_devices?.length || 0}
            </div>
            <p className="text-xs text-gray-600">Dispositivos registrados</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Devices and Top Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Devices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Dispositivos con Mayor Uso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary?.top_devices && summary.top_devices.length > 0 ? (
                summary.top_devices.map((device, index) => (
                  <div key={device.device_id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {device.name || device.mac}
                        </div>
                        <div className="text-sm text-gray-600">{device.mac}</div>
                        <div className="text-xs text-gray-500">
                          {getGuestName(device.guest_id)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        {device.usage_gb.toFixed(2)} GB
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No hay datos de dispositivos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Dispositivo</th>
                  <th className="text-left p-2">Huésped</th>
                  <th className="text-left p-2">MAC</th>
                  <th className="text-left p-2">IP</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-right p-2">Uso</th>
                  <th className="text-left p-2">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <tr key={activity.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <Wifi className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">
                            {activity.device?.name || 'Sin nombre'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2">{getGuestName(activity.device?.guest_id || 0)}</td>
                      <td className="p-2">
                        <span className="font-mono text-xs">{activity.device?.mac}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-xs">{activity.ip_address || '-'}</span>
                      </td>
                      <td className="p-2">
                        <Badge className="bg-gray-100 text-gray-800">Actividad</Badge>
                      </td>
                      <td className="p-2 text-right">
                        <span className="font-semibold">
                          {((activity.downloaded_mb + activity.uploaded_mb) / 1024).toFixed(2)} GB
                        </span>
                      </td>
                      <td className="p-2 text-sm text-gray-600">
                        {new Date(activity.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-gray-500">
                      No hay actividad reciente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
