import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { maintenanceApi, staffApi } from '@/lib/api';
import type { Maintenance, Staff } from '@/types';
import { ArrowLeft, CheckCircle2, XCircle, Wrench, DollarSign } from 'lucide-react';
import { formatDate, getMaintenanceStatusColor } from '@/lib/utils';

interface MaintenanceHistoryProps {
  onBack: () => void;
}

const maintenanceTypes: Record<string, string> = {
  repair: 'Reparación',
  cleaning: 'Limpieza',
  inspection: 'Inspección',
  upgrade: 'Mejora',
  other: 'Otro',
};

export default function MaintenanceHistory({ onBack }: MaintenanceHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: allMaintenances, isLoading } = useQuery({
    queryKey: ['maintenances-all'],
    queryFn: () =>
      maintenanceApi.getAll({
        pending_only: false,
      }),
    refetchOnMount: true,
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(),
  });

  const maintenanceList = allMaintenances ?? [];

  // Enrich with staff names
  const enrichedMaintenances = useMemo(() => {
    if (!staff) return maintenanceList;
    return maintenanceList.map((task) => ({
      ...task,
      assigned_staff_name:
        task.assigned_to && !task.assigned_staff_name
          ? staff.find((s) => s.id === task.assigned_to)?.full_name
          : task.assigned_staff_name,
    }));
  }, [maintenanceList, staff]);

  // Filter for completed/cancelled maintenance only
  const historyMaintenances = enrichedMaintenances.filter(
    (m) => m.status === 'completed' || m.status === 'cancelled'
  );

  // Filter by search
  const filteredMaintenances = historyMaintenances.filter((m) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(searchLower) ||
      m.description?.toLowerCase().includes(searchLower) ||
      m.location_label?.toLowerCase().includes(searchLower) ||
      m.assigned_staff_name?.toLowerCase().includes(searchLower)
    );
  });

  const completedCount = historyMaintenances.filter((m) => m.status === 'completed').length;
  const cancelledCount = historyMaintenances.filter((m) => m.status === 'cancelled').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">📋 Historial de Mantenimiento</h1>
            <p className="text-sm text-gray-600 mt-1">Tareas completadas y canceladas</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar por título, ubicación, responsable..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Stats Summary */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completadas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Canceladas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{cancelledCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance List */}
      {isLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500">
          Cargando historial de mantenimiento...
        </div>
      ) : filteredMaintenances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMaintenances.map((task) => (
            <Card key={task.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
                  </div>
                  <Badge className={getMaintenanceStatusColor(task.status)}>
                    {task.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </Badge>
                </div>

                {/* Assigned Staff */}
                {task.assigned_staff_name && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-500 text-white rounded-full p-1">
                        <Wrench className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-semibold">Responsable</p>
                        <p className="text-xs font-bold text-blue-900">{task.assigned_staff_name}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600">
                  📍 {task.location_label || 'Sin ubicación especificada'}
                </p>
              </CardHeader>

              <CardContent className="space-y-3">
                {task.description && <p className="text-sm text-gray-700">{task.description}</p>}

                <div className="rounded-lg border p-3 bg-gray-50 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tipo</span>
                    <Badge variant="outline">
                      {maintenanceTypes[task.type] || task.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Reportado</span>
                    <span className="font-medium">{formatDate(task.reported_at)}</span>
                  </div>
                  {task.estimated_cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Costo estimado</span>
                      <span className="font-semibold">${task.estimated_cost.toFixed(2)}</span>
                    </div>
                  )}
                  {task.actual_cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Costo real</span>
                      <span className="font-semibold text-green-600">
                        ${task.actual_cost.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          <p>
            {searchQuery
              ? `No se encontraron tareas procesadas para "${searchQuery}"`
              : 'No hay tareas procesadas en el historial'}
          </p>
        </div>
      )}
    </div>
  );
}
