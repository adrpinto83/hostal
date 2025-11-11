import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CreditCard, Calendar, Download } from 'lucide-react';
import { paymentsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PaymentReports() {
  const [days, setDays] = useState(30);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });

  // Query payment stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-stats', days],
    queryFn: () => paymentsApi.getStats(days),
  });

  // Query payments by date (only when date range is set)
  const { data: byDate } = useQuery({
    queryKey: ['payments-by-date', dateRange],
    queryFn: () =>
      paymentsApi.getByDate(dateRange.start, dateRange.end),
    enabled: !!dateRange.start && !!dateRange.end,
  });

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      VES: 'Bs.',
    };
    return symbols[currency] || currency;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
      mobile_payment: 'Pago Móvil',
      zelle: 'Zelle',
      paypal: 'PayPal',
      crypto: 'Crypto',
      other: 'Otro',
    };
    return labels[method] || method;
  };

  if (statsLoading) {
    return <div className="p-6">Cargando reportes...</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes de Pagos</h1>
          <p className="text-gray-600">Análisis financiero y estadísticas</p>
        </div>
        <div className="flex gap-2">
          <select
            className="border rounded px-3 py-2"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Pagos
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_payments || 0}</div>
            <p className="text-xs text-gray-600">Últimos {days} días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total en USD
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.total_usd.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-gray-600">Convertido a USD</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Métodos de Pago
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.by_method.length || 0}
            </div>
            <p className="text-xs text-gray-600">Métodos utilizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Monedas
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.by_currency.length || 0}
            </div>
            <p className="text-xs text-gray-600">Monedas aceptadas</p>
          </CardContent>
        </Card>
      </div>

      {/* By Currency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Pagos por Moneda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.by_currency.map((item) => (
                <div key={item.currency} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.currency}</div>
                    <div className="text-sm text-gray-600">{item.count} pagos</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {getCurrencySymbol(item.currency)} {item.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* By Method */}
        <Card>
          <CardHeader>
            <CardTitle>Pagos por Método</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.by_method.map((item) => (
                <div key={item.method} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{getMethodLabel(item.method)}</div>
                    <div className="text-sm text-gray-600">{item.count} pagos</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      ${item.total_usd.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* By Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Estado de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stats?.by_status.map((item) => (
              <div key={item.status} className="text-center p-4 border rounded">
                <div className="text-2xl font-bold">{item.count}</div>
                <div className="text-sm text-gray-600 capitalize">{item.status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date Range Report */}
      <Card>
        <CardHeader>
          <CardTitle>Reporte por Rango de Fechas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  // Query will auto-execute when dates are set
                }}
                disabled={!dateRange.start || !dateRange.end}
              >
                Generar Reporte
              </Button>
            </div>
          </div>

          {byDate && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">
                  Totales por Día ({byDate.daily_totals.length} días)
                </h3>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-right p-2">Cantidad</th>
                      <th className="text-right p-2">Total USD</th>
                      <th className="text-right p-2">Total Original</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDate.daily_totals.map((day) => (
                      <tr key={day.date} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {new Date(day.date).toLocaleDateString()}
                        </td>
                        <td className="text-right p-2">{day.count}</td>
                        <td className="text-right p-2 font-semibold text-green-600">
                          ${day.total_usd.toFixed(2)}
                        </td>
                        <td className="text-right p-2">
                          {day.total_original.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr>
                      <td className="p-2 font-bold">Total</td>
                      <td className="text-right p-2 font-bold">
                        {byDate.daily_totals.reduce((sum, d) => sum + d.count, 0)}
                      </td>
                      <td className="text-right p-2 font-bold text-green-600">
                        $
                        {byDate.daily_totals
                          .reduce((sum, d) => sum + d.total_usd, 0)
                          .toFixed(2)}
                      </td>
                      <td className="text-right p-2 font-bold">
                        {byDate.daily_totals
                          .reduce((sum, d) => sum + d.total_original, 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
