import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Filter } from 'lucide-react';
import { paymentsApi, guestsApi } from '@/lib/api';
import type { PaymentCreate, Currency, PaymentMethod, Guest } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function PaymentList() {
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Filters
  const [filters, setFilters] = useState({
    currency: '',
    method: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  // Form state
  const [formData, setFormData] = useState<PaymentCreate>({
    guest_id: 0,
    amount: 0,
    currency: 'USD',
    method: 'cash',
  });

  // Query payments with filters
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: () => paymentsApi.getAll(filters),
  });

  // Query guests for dropdown
  const { data: guests = [] } = useQuery<Guest[]>({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll(),
  });

  // Create payment mutation
  const createMutation = useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setShowModal(false);
      resetForm();
    },
  });

  // Delete payment mutation
  const deleteMutation = useMutation({
    mutationFn: paymentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const resetForm = () => {
    setFormData({
      guest_id: 0,
      amount: 0,
      currency: 'USD',
      method: 'cash',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.guest_id && formData.amount > 0) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Eliminar este pago?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

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

  const applyFilters = () => {
    // Filters are already applied via queryKey dependency
    setShowFilters(false);
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

  const payments = paymentsData?.payments || [];
  const total = paymentsData?.total || 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-gray-600">{total} pagos registrados</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Pago
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
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
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="mobile_payment">Pago Móvil</option>
                  <option value="zelle">Zelle</option>
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
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>Aplicar Filtros</Button>
              <Button variant="outline" onClick={clearFilters}>
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Huésped</th>
                  <th className="text-left p-2">Monto</th>
                  <th className="text-left p-2">Método</th>
                  <th className="text-left p-2">Estado</th>
                  <th className="text-left p-2">Fecha</th>
                  <th className="text-left p-2">Referencia</th>
                  <th className="text-left p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-4 text-gray-500">
                      No hay pagos registrados
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{payment.id}</td>
                      <td className="p-2">
                        {guests.find((g) => g.id === payment.guest_id)?.full_name || `ID: ${payment.guest_id}`}
                      </td>
                      <td className="p-2">
                        <span className="font-semibold">
                          {getCurrencySymbol(payment.currency)} {payment.amount.toFixed(2)}
                        </span>
                        {payment.amount_usd && payment.currency !== 'USD' && (
                          <span className="text-sm text-gray-600 ml-2">
                            (${payment.amount_usd.toFixed(2)})
                          </span>
                        )}
                      </td>
                      <td className="p-2">{getMethodLabel(payment.method)}</td>
                      <td className="p-2">
                        <Badge className={getStatusBadge(payment.status)}>
                          {payment.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="p-2 text-sm text-gray-600">
                        {payment.reference_number || '-'}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(payment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Nuevo Pago</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Huésped *</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.guest_id}
                  onChange={(e) =>
                    setFormData({ ...formData, guest_id: Number(e.target.value) })
                  }
                  required
                >
                  <option value={0}>Seleccionar huésped</option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <Label>Moneda *</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value as Currency })
                  }
                  required
                >
                  <option value="USD">USD - Dólar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="VES">VES - Bolívar</option>
                </select>
              </div>
              <div>
                <Label>Método de pago *</Label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.method}
                  onChange={(e) =>
                    setFormData({ ...formData, method: e.target.value as PaymentMethod })
                  }
                  required
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="mobile_payment">Pago Móvil</option>
                  <option value="zelle">Zelle</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <Label>Número de referencia</Label>
                <Input
                  type="text"
                  value={formData.reference_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_number: e.target.value })
                  }
                  placeholder="TX-12345"
                />
              </div>
              <div>
                <Label>Notas</Label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={formData.notes || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Notas adicionales..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Guardando...' : 'Guardar Pago'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
