import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  X,
  Filter,
  CreditCard,
  Wallet,
  TrendingUp,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  PieChart as PieChartIcon,
  Activity,
} from 'lucide-react';
import { paymentsApi, guestsApi } from '@/lib/api';
import type { PaymentCreate, Currency, PaymentMethod, Guest, Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { handleApiError } from '@/lib/api/client';

const methodLabels: Record<PaymentMethod | string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mobile_payment: 'Pago móvil',
  zelle: 'Zelle',
  paypal: 'PayPal',
  crypto: 'Cripto',
  other: 'Otro',
};

const currencySymbol: Record<Currency | string, string> = {
  USD: '$',
  EUR: '€',
  VES: 'Bs.',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function PaymentList() {
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    currency: '',
    method: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  const normalizedFilters = useMemo(() => {
    const entries = Object.entries(filters).filter(([, value]) => Boolean(value));
    return Object.fromEntries(entries);
  }, [filters]);

  const [formData, setFormData] = useState<PaymentCreate>({
    guest_id: 0,
    amount: 0,
    currency: 'USD',
    method: 'cash',
    reference_number: '',
    notes: '',
  });

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', normalizedFilters],
    queryFn: () => paymentsApi.getAll(normalizedFilters),
  });

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => paymentsApi.getStats(30),
  });

  const { data: guests = [] } = useQuery<Guest[]>({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      resetForm();
      setShowModal(false);
    },
    onError: (error) => {
      setFormError(handleApiError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
    },
  });

  const payments = paymentsData?.payments ?? [];
  const total = paymentsData?.total ?? 0;
  const recentPayments = payments.slice(0, 5);

  const resetForm = () => {
    setFormData({
      guest_id: 0,
      amount: 0,
      currency: 'USD',
      method: 'cash',
      reference_number: '',
      notes: '',
    });
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_id) {
      setFormError('Selecciona un huésped');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setFormError('El monto debe ser mayor a cero');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este pago?')) {
      deleteMutation.mutate(id);
    }
  };

  const clearFilters = () => {
    setFilters({
      currency: '',
      method: '',
      status: '',
      start_date: '',
      end_date: '',
    });
  };

  if (isLoading) {
    return <div className="p-6">Cargando pagos...</div>;
  }

  const renderStatusBadge = (status: string) => (
    <Badge className={statusColors[status] ?? 'bg-gray-100 text-gray-800'}>{status}</Badge>
  );

  const renderAmount = (payment: Payment) => (
    <>
      {currencySymbol[payment.currency] ?? payment.currency}{' '}
      {payment.amount.toFixed(2)}
    </>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagos</h1>
          <p className="text-gray-600">{total} registros encontrados</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button variant="outline" onClick={() => setShowFilters((prev) => !prev)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payments Card */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Pagos Completados</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">
                  {stats?.total_payments ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Últimos 30 días</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Ingresos USD</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">
                  ${stats?.total_usd?.toFixed(2) ?? '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Conversión automática</p>
              </div>
              <DollarSign className="h-12 w-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments Card */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Pagos Pendientes</p>
                <p className="text-3xl font-bold mt-2 text-amber-600">
                  {stats?.by_status?.find((s) => s.status === 'pending')?.count ?? 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">En revisión</p>
              </div>
              <Clock className="h-12 w-12 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Método Popular</p>
                <p className="text-lg font-bold mt-2 text-gray-900 capitalize">
                  {stats?.by_method?.[0]?.method?.replace('_', ' ') ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.by_method?.[0]?.count ?? 0} transacciones
                </p>
              </div>
              <CreditCard className="h-12 w-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* By Status Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Estado de Pagos
            </p>
            <div className="space-y-3">
              {stats?.by_status?.slice(0, 3).map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        item.status === 'completed'
                          ? 'bg-green-500'
                          : item.status === 'pending'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    ></div>
                    <span className="text-sm text-gray-700 capitalize">
                      {item.status === 'completed' ? 'Completados' : item.status === 'pending' ? 'Pendientes' : 'Fallidos'}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Métodos de Pago
            </p>
            <div className="space-y-3">
              {stats?.by_method?.slice(0, 3).map((item) => (
                <div key={item.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-700 capitalize">
                      {item.method.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Currency Breakdown */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <p className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Monedas
            </p>
            <div className="space-y-3">
              {['USD', 'EUR', 'VES'].map((currency) => {
                const count = stats?.by_method?.length ?? 0; // Placeholder, you might want to add actual currency breakdown in the API
                return (
                  <div key={currency} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{currency}</span>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                      {currencySymbol[currency]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

  {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <Label>Moneda</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={filters.currency}
                  onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                >
                  <option value="">Todas</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="VES">VES</option>
                </select>
              </div>
              <div>
                <Label>Método</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                >
                  <option value="">Todos</option>
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="completed">Completado</option>
                  <option value="pending">Pendiente</option>
                  <option value="failed">Fallido</option>
                  <option value="refunded">Reembolsado</option>
                </select>
              </div>
              <div>
                <Label>Desde</Label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Hasta</Label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>
              <Button onClick={() => setShowFilters(false)}>Aplicar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xl font-semibold">{renderAmount(payment)}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      {methodLabels[payment.method] ?? payment.method}
                    </p>
                    {payment.reference_number && (
                      <p className="text-xs text-gray-400">Ref: {payment.reference_number}</p>
                    )}
                  </div>
                  {renderStatusBadge(payment.status)}
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Huésped #{payment.guest_id}</span>
                  <span>{new Date(payment.payment_date).toLocaleDateString('es-ES')}</span>
                </div>
                {payment.notes && (
                  <p className="text-sm text-gray-600 bg-gray-50 border rounded px-3 py-2">
                    {payment.notes}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {payments.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-10 text-center text-gray-500">
                No hay pagos que coincidan con los filtros actuales.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Pago</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Método</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Referencia</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{renderAmount(payment)}</p>
                    <p className="text-xs text-gray-500">
                      Huésped #{payment.guest_id} •{' '}
                      {new Date(payment.payment_date).toLocaleDateString('es-ES')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {methodLabels[payment.method] ?? payment.method}
                  </td>
                  <td className="px-4 py-3">{renderStatusBadge(payment.status)}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {payment.reference_number || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Últimos pagos registrados
          </p>
          {recentPayments.length === 0 && (
            <p className="text-sm text-gray-500">Aún no hay pagos registrados.</p>
          )}
          {recentPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-semibold text-gray-900">{renderAmount(payment)}</p>
                <p className="text-xs text-gray-500">
                  Huésped #{payment.guest_id} •{' '}
                  {new Date(payment.payment_date).toLocaleString('es-ES', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              {renderStatusBadge(payment.status)}
            </div>
          ))}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Registrar pago</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="guest_id">Huésped</Label>
                <select
                  id="guest_id"
                  className="w-full border rounded px-3 py-2"
                  value={formData.guest_id}
                  onChange={(e) =>
                    setFormData({ ...formData, guest_id: Number(e.target.value) })
                  }
                  required
                >
                  <option value={0} disabled>
                    Seleccionar huésped
                  </option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: Number(e.target.value) })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <select
                    id="currency"
                    className="w-full border rounded px-3 py-2"
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value as Currency })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="VES">VES</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="method">Método de pago</Label>
                <select
                  id="method"
                  className="w-full border rounded px-3 py-2"
                  value={formData.method}
                  onChange={(e) =>
                    setFormData({ ...formData, method: e.target.value as PaymentMethod })
                  }
                >
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="reference_number">Referencia</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number ?? ''}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notas</Label>
                <textarea
                  id="notes"
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={formData.notes ?? ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Limpiar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Guardar pago
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
