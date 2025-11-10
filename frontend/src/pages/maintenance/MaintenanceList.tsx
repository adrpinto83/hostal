import { useQuery } from '@tanstack/react-query';
import { maintenanceApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, getMaintenancePriorityColor, getMaintenanceStatusColor } from '@/lib/utils';

const maintenanceTypeLabels: Record<string, string> = {
  plomeria: 'Plomería',
  electricidad: 'Electricidad',
  pintura: 'Pintura',
  limpieza_profunda: 'Limpieza Profunda',
  reparacion_muebles: 'Reparación de Muebles',
  aire_acondicionado: 'Aire Acondicionado',
  cerrajeria: 'Cerrajería',
  electrodomesticos: 'Electrodomésticos',
  otro: 'Otro',
};

export default function MaintenanceList() {
  const { data: maintenances, isLoading } = useQuery({
    queryKey: ['maintenances'],
    queryFn: () => maintenanceApi.getAll(),
  });

  if (isLoading) return <div>Cargando mantenimientos...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Mantenimiento</h1>

      <div className="grid gap-4">
        {maintenances?.map((task) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <div className="flex gap-2">
                  <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + getMaintenancePriorityColor(task.priority)}>
                    {task.priority}
                  </span>
                  <span className={"rounded-full px-2.5 py-0.5 text-xs font-medium " + getMaintenanceStatusColor(task.status)}>
                    {task.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Habitación:</span>
                  <span className="font-medium">{task.room_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">{maintenanceTypeLabels[task.type] || task.type}</span>
                </div>
                {task.assigned_staff_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Asignado a:</span>
                    <span className="font-medium">{task.assigned_staff_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Reportado:</span>
                  <span className="font-medium">{formatDate(task.reported_at)}</span>
                </div>
                {task.estimated_cost && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Costo estimado:</span>
                    <span className="font-medium">${task.estimated_cost}</span>
                  </div>
                )}
                {task.description && (
                  <div className="mt-2">
                    <p className="text-gray-600">Descripción:</p>
                    <p className="mt-1">{task.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
