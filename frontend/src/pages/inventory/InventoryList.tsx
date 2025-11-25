import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, maintenanceApi } from '@/lib/api';
import type { InventoryItem, InventoryTransaction, Maintenance } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleApiError } from '@/lib/api/client';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, Box, ClipboardList, Package, Plus, RefreshCcw } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  equipment: 'Equipos',
  consumable: 'Consumibles',
  cleaning: 'Limpieza',
  product: 'Productos',
  spare_part: 'Repuestos',
  other: 'Otros',
};

const transactionLabels: Record<InventoryTransaction['transaction_type'], string> = {
  purchase: 'Compra',
  adjustment: 'Ajuste',
  usage: 'Uso',
  transfer: 'Transferencia',
};

export default function InventoryList() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'consumable',
    unit: 'unidad',
    quantity_on_hand: 0,
    min_stock: 0,
    location: '',
  });
  const [adjustmentForm, setAdjustmentForm] = useState({
    itemId: 0,
    quantity: 0,
    transaction_type: 'adjustment',
    reference: '',
    notes: '',
  });
  const [usageForm, setUsageForm] = useState({
    maintenance_id: 0,
    inventory_item_id: 0,
    quantity_used: 1,
    unit_cost: '',
    notes: '',
  });

  const { data: items = [], isFetching: isFetchingItems } = useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => inventoryApi.getItems(),
  });

  const { data: lowStock = [] } = useQuery({
    queryKey: ['inventory-low-stock'],
    queryFn: () => inventoryApi.getLowStock(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['inventory-transactions'],
    queryFn: () => inventoryApi.getTransactions({ limit: 10 }),
  });

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenance-for-inventory'],
    queryFn: () =>
      maintenanceApi.getAll({
        pending_only: true,
        limit: 50,
      }),
  });

  const totalStockValue = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.cost_per_unit || 0) * item.quantity_on_hand, 0);
  }, [items]);

  const createMutation = useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      setNewItem({
        name: '',
        category: 'consumable',
        unit: 'unidad',
        quantity_on_hand: 0,
        min_stock: 0,
        location: '',
      });
    },
    onError: (error) => setErrorMessage(handleApiError(error)),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => inventoryApi.adjustStock(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      setAdjustmentForm({ itemId: 0, quantity: 0, transaction_type: 'adjustment', reference: '', notes: '' });
    },
    onError: (error) => setErrorMessage(handleApiError(error)),
  });

  const usageMutation = useMutation({
    mutationFn: inventoryApi.logUsage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-for-inventory'] });
      setUsageForm({ maintenance_id: 0, inventory_item_id: 0, quantity_used: 1, unit_cost: '', notes: '' });
    },
    onError: (error) => setErrorMessage(handleApiError(error)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      setErrorMessage('El nombre es obligatorio');
      return;
    }
    createMutation.mutate(newItem);
  };

  const handleAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentForm.itemId || adjustmentForm.quantity === 0) {
      setErrorMessage('Selecciona un item y una cantidad');
      return;
    }
    adjustMutation.mutate({
      id: adjustmentForm.itemId,
      payload: {
        quantity: adjustmentForm.quantity,
        transaction_type: adjustmentForm.transaction_type,
        reference: adjustmentForm.reference,
        notes: adjustmentForm.notes,
      },
    });
  };

  const handleUsage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageForm.inventory_item_id || !usageForm.maintenance_id) {
      setErrorMessage('Selecciona un item y una orden de mantenimiento');
      return;
    }
    usageMutation.mutate({
      maintenance_id: usageForm.maintenance_id,
      inventory_item_id: usageForm.inventory_item_id,
      quantity_used: usageForm.quantity_used,
      unit_cost: usageForm.unit_cost ? Number(usageForm.unit_cost) : undefined,
      notes: usageForm.notes,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventario</h1>
          <p className="text-gray-600">Control de equipos, productos y consumibles vinculados a mantenimiento.</p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['inventory-items'] })}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{items.length}</div>
            <p className="text-xs text-gray-500">{Object.keys(categoryLabels).length} categorías</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-amber-600">{lowStock.length}</div>
              <p className="text-xs text-gray-500">Necesitan reposición</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Valor Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalStockValue, 'USD')}</div>
            <p className="text-xs text-gray-500">Basado en costo unitario</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500">Movimientos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transactions.length}</div>
            <p className="text-xs text-gray-500">Últimos registros</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-600" />
              Registrar nuevo artículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreate}>
              <div className="md:col-span-1">
                <Label>Nombre</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Ej: Bombillos LED"
                  required
                />
              </div>
              <div>
                <Label>Categoría</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Cantidad inicial</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.quantity_on_hand}
                  onChange={(e) =>
                    setNewItem({ ...newItem, quantity_on_hand: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Unidad</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
              </div>
              <div>
                <Label>Stock mínimo</Label>
                <Input
                  type="number"
                  min="0"
                  value={newItem.min_stock}
                  onChange={(e) => setNewItem({ ...newItem, min_stock: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  placeholder="Depósito principal"
                />
              </div>
              <div className="md:col-span-3 flex justify-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ajustar inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleAdjust}>
              <div>
                <Label>Item</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={adjustmentForm.itemId}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, itemId: Number(e.target.value) })}
                >
                  <option value={0}>Seleccionar</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity_on_hand} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full rounded border px-3 py-2"
                    value={adjustmentForm.transaction_type}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, transaction_type: e.target.value })}
                  >
                    <option value="adjustment">Ajuste</option>
                    <option value="purchase">Ingreso</option>
                    <option value="usage">Consumo</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Referencia</Label>
                <Input
                  value={adjustmentForm.reference}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference: e.target.value })}
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={adjustmentForm.notes}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={adjustMutation.isPending}>
                Aplicar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Inventario</CardTitle>
            {isFetchingItems && <span className="text-xs text-gray-500">Actualizando...</span>}
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-gray-500">
                  <th className="p-2">Item</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2 text-right">Stock</th>
                  <th className="p-2 text-right">Mínimo</th>
                  <th className="p-2 hidden md:table-cell">Ubicación</th>
                  <th className="p-2 text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.sku || item.location || 'Sin referencia'}</div>
                    </td>
                    <td className="p-2">{categoryLabels[item.category] || item.category}</td>
                    <td className="p-2 text-right">{item.quantity_on_hand} {item.unit}</td>
                    <td className="p-2 text-right">{item.min_stock}</td>
                    <td className="p-2 hidden md:table-cell">{item.location || '-'}</td>
                    <td className="p-2 text-right">
                      {item.cost_per_unit ? formatCurrency(item.cost_per_unit, 'USD') : '—'}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-gray-500">
                      Aún no hay items registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.map((item) => (
              <div key={item.id} className="rounded border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-gray-600">{item.location || 'Ubicación no definida'}</p>
                  </div>
                  <span className="text-sm font-semibold text-amber-700">
                    {item.quantity_on_hand}/{item.min_stock}
                  </span>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && (
              <p className="text-sm text-gray-500">No hay alertas de stock en este momento.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consumir en mantenimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleUsage}>
              <div>
                <Label>Orden de mantenimiento</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={usageForm.maintenance_id}
                  onChange={(e) => setUsageForm({ ...usageForm, maintenance_id: Number(e.target.value) })}
                >
                  <option value={0}>Seleccionar</option>
                  {maintenanceTasks.map((task: Maintenance) => (
                    <option key={task.id} value={task.id}>
                      #{task.id} - {task.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Item de inventario</Label>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={usageForm.inventory_item_id}
                  onChange={(e) =>
                    setUsageForm({ ...usageForm, inventory_item_id: Number(e.target.value) })
                  }
                >
                  <option value={0}>Seleccionar</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.quantity_on_hand} {item.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    min="0"
                    value={usageForm.quantity_used}
                    onChange={(e) =>
                      setUsageForm({ ...usageForm, quantity_used: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Costo unitario (opcional)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={usageForm.unit_cost}
                    onChange={(e) => setUsageForm({ ...usageForm, unit_cost: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={usageForm.notes}
                  onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
                  placeholder="Ej: Reemplazo en habitación 203"
                />
              </div>
              <Button type="submit" className="w-full" disabled={usageMutation.isPending}>
                Registrar consumo
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-blue-600" />
              Movimientos recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 && (
              <p className="text-sm text-gray-500">Sin movimientos registrados.</p>
            )}
            {transactions.map((tx) => {
              const item = items.find((i) => i.id === tx.item_id);
              return (
                <div key={tx.id} className="rounded border bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{item?.name || `Item #${tx.item_id}`}</p>
                      <p className="text-xs text-gray-500">
                        {transactionLabels[tx.transaction_type]} •{' '}
                        {new Date(tx.created_at).toLocaleString('es-VE')}
                      </p>
                    </div>
                    <div className="text-right font-semibold">
                      {tx.quantity_change > 0 ? '+' : ''}
                      {tx.quantity_change}
                    </div>
                  </div>
                  {tx.reference && <p className="text-xs text-gray-500 mt-1">Ref: {tx.reference}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
