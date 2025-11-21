import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi, roomsApi, staffApi } from '@/lib/api';
import type { Maintenance, MaintenanceCreate, Staff } from '@/types';
import { handleApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import {
  Calendar,
  CheckCircle2,
  Hammer,
  ListChecks,
  MapPin,
  Pause,
  Plus,
  ShieldAlert,
  Timer,
  User,
  Wrench,
  Archive,
} from 'lucide-react';
import {
  formatDate,
  formatDateTime,
  getMaintenancePriorityColor,
  getMaintenanceStatusColor,
} from '@/lib/utils';
import MaintenanceHistory from './MaintenanceHistory';

const priorityOptions = [
  { value: 'all', label: 'Todas las prioridades' },
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const statusOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const maintenanceTypes = [
  { value: 'repair', label: 'Reparación' },
  { value: 'cleaning', label: 'Limpieza' },
  { value: 'inspection', label: 'Inspección' },
  { value: 'upgrade', label: 'Mejora' },
  { value: 'other', label: 'Otro' },
];

const areaCategoryOptions = [
  { value: 'areas_comunes', label: 'Áreas comunes' },
  { value: 'banos', label: 'Baños' },
  { value: 'pasillos', label: 'Pasillos y escaleras' },
  { value: 'lobby', label: 'Lobby y recepción' },
  { value: 'fachadas', label: 'Fachadas / pintura exterior' },
  { value: 'techo', label: 'Azotea / techos' },
  { value: 'almacen', label: 'Depósitos y almacenes' },
  { value: 'otra_area', label: 'Otra área' },
];

const preventiveChecklist = [
  { label: 'Circuito cerrado de TV (CCTV): cámaras, grabación y almacenamiento', frequency: 'Semanal' },
  { label: 'Cerrajería y cerraduras inteligentes / tarjetas', frequency: 'Mensual' },
  { label: 'Habitaciones: mobiliario, colchones y acabados', frequency: 'Mensual' },
  { label: 'Sistema de plomería: fugas, presión y drenajes', frequency: 'Semanal' },
  { label: 'Bombillos e iluminación de áreas comunes', frequency: 'Semanal' },
  { label: 'Acceso inalámbrico: puntos Wi-Fi y controladores', frequency: 'Semanal' },
  { label: 'Pintura y retoques en pasillos y fachadas', frequency: 'Trimestral' },
];

export default function MaintenanceList() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLocationScope, setSelectedLocationScope] = useState<'all' | 'rooms' | 'areas'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [formData, setFormData] = useState<MaintenanceCreate>({
    room_id: undefined,
    type: 'repair',
    priority: 'medium',
    title: '',
    description: '',
    assigned_to: undefined,
    estimated_cost: undefined,
    notes: '',
  });
  const [locationType, setLocationType] = useState<'room' | 'common_area'>('room');
  const [commonAreaCategory, setCommonAreaCategory] = useState('areas_comunes');
  const [commonAreaLabel, setCommonAreaLabel] = useState('');

  // New states for assignment and pause dialogs
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<Maintenance | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<number | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);

  // Show history view if requested
  if (showHistory) {
    return <MaintenanceHistory onBack={() => setShowHistory(false)} />;
  }

  const { data: maintenanceStats } = useQuery({
    queryKey: ['maintenance-stats'],
    queryFn: maintenanceApi.getStats,
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(),
  });

  const { data: staff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(),
  });

  const { data: rawMaintenances = [], isLoading } = useQuery({
    queryKey: ['maintenances', selectedPriority, selectedStatus, onlyPending],
    queryFn: () =>
      maintenanceApi.getAll({
        priority: selectedPriority !== 'all' ? selectedPriority : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        pending_only: onlyPending ? true : undefined,
      }),
  });

  // Enrich maintenance tasks with assigned staff names from the staff list
  const maintenances = useMemo(() => {
    if (!staff) return rawMaintenances;
    return rawMaintenances.map((task) => ({
      ...task,
      assigned_staff_name:
        task.assigned_to && !task.assigned_staff_name
          ? staff.find((s) => s.id === task.assigned_to)?.full_name
          : task.assigned_staff_name,
    }));
  }, [rawMaintenances, staff]);

  const filteredTasks = useMemo(() => {
    return maintenances.filter((task) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = term
        ? task.title.toLowerCase().includes(term) ||
          task.description?.toLowerCase().includes(term) ||
          task.room_number?.toLowerCase().includes(term) ||
          task.location_label?.toLowerCase().includes(term) ||
          task.area_name?.toLowerCase().includes(term) ||
          task.assigned_staff_name?.toLowerCase().includes(term)
        : true;
      const isArea = task.location_type === 'common_area' || (!task.room_number && !task.room_id);
      const matchesScope =
        selectedLocationScope === 'all' ||
        (selectedLocationScope === 'rooms' && !isArea) ||
        (selectedLocationScope === 'areas' && isArea);
      return matchesSearch && matchesScope;
    });
  }, [maintenances, searchTerm, selectedLocationScope]);

  const upcomingTasks = useMemo(() => {
    return [...filteredTasks]
      .filter((task) => task.status !== 'completed')
      .sort((a, b) => new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime())
      .slice(0, 5);
  }, [filteredTasks]);

  const queryInvalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
  };

  const resolveLocationLabel = (task: Maintenance) => {
    if (task.location_label) return task.location_label;
    if (task.room_number) return `Habitación ${task.room_number}`;
    const areaLabel =
      areaCategoryOptions.find((opt) => opt.value === task.area_category)?.label || 'Área común';
    return task.area_name ? `${areaLabel} - ${task.area_name}` : areaLabel;
  };

  const createMutation = useMutation({
    mutationFn: maintenanceApi.create,
    onSuccess: () => {
      queryInvalidate();
      setFormData({
        room_id: undefined,
        type: 'repair',
        priority: 'medium',
        title: '',
        description: '',
        assigned_to: undefined,
        estimated_cost: undefined,
        notes: '',
      });
      setLocationType('room');
      setCommonAreaCategory('areas_comunes');
      setCommonAreaLabel('');
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const startMutation = useMutation({
    mutationFn: maintenanceApi.start,
    onSuccess: queryInvalidate,
    onError: (error) => alert(handleApiError(error)),
  });

  const completeMutation = useMutation({
    mutationFn: (payload: { id: number; actual_cost?: number }) =>
      maintenanceApi.complete(payload.id, payload.actual_cost),
    onSuccess: queryInvalidate,
    onError: (error) => alert(handleApiError(error)),
  });

  const pauseMutation = useMutation({
    mutationFn: (payload: { id: number; notes?: string }) =>
      maintenanceApi.pause(payload.id, payload.notes),
    onSuccess: queryInvalidate,
    onError: (error) => alert(handleApiError(error)),
  });

  const resumeMutation = useMutation({
    mutationFn: (id: number) => maintenanceApi.resume(id),
    onSuccess: queryInvalidate,
    onError: (error) => alert(handleApiError(error)),
  });

  const assignMutation = useMutation({
    mutationFn: (payload: { id: number; assigned_to: number | undefined }) =>
      maintenanceApi.update(payload.id, { assigned_to: payload.assigned_to }),
    onSuccess: (updatedTask) => {
      // Update the raw maintenances cache - the useMemo will handle enrichment
      queryClient.setQueryData<Maintenance[]>(
        ['maintenances', selectedPriority, selectedStatus, onlyPending],
        (oldData) => {
          if (!oldData) return oldData;
          return oldData.map((task) =>
            task.id === updatedTask.id ? updatedTask : task
          );
        }
      );

      setShowAssignDialog(false);
      setSelectedTaskForAssign(null);
      setSelectedStaffId(undefined);

      // Invalidate stats to refresh counters
      queryClient.invalidateQueries({ queryKey: ['maintenance-stats'] });
    },
    onError: (error) => alert(handleApiError(error)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationType === 'room' && !formData.room_id) {
      alert('Selecciona una habitación para esta tarea.');
      return;
    }
    if (!formData.title.trim()) {
      alert('Escribe un título para la tarea.');
      return;
    }

    const roomNumber = rooms?.find((room) => room.id === formData.room_id)?.number;
    const areaLabelBase = areaCategoryOptions.find((opt) => opt.value === commonAreaCategory)?.label ?? 'Área común';
    const locationLabel =
      locationType === 'room'
        ? roomNumber
          ? `Habitación ${roomNumber}`
          : undefined
        : commonAreaLabel
        ? `${areaLabelBase} - ${commonAreaLabel}`
        : areaLabelBase;

    const payload: MaintenanceCreate = {
      ...formData,
      room_id: locationType === 'room' ? formData.room_id : undefined,
      location_type: locationType,
      location_label: locationLabel,
      area_category: locationType === 'common_area' ? commonAreaCategory : undefined,
      area_name: locationType === 'common_area' ? commonAreaLabel || undefined : undefined,
    };
    createMutation.mutate(payload);
  };

  const handleStart = (task: Maintenance) => {
    if (task.status === 'pending') {
      startMutation.mutate(task.id);
    }
  };

  const handleComplete = (task: Maintenance) => {
    if (task.status !== 'completed') {
      const actualCost = prompt('Costo final (opcional):', task.estimated_cost?.toString() ?? '');
      const parsedCost = actualCost ? Number(actualCost) : undefined;
      completeMutation.mutate({ id: task.id, actual_cost: parsedCost });
    }
  };

  const handlePause = (task: Maintenance) => {
    const notes = prompt('Razón de la pausa (opcional):');
    pauseMutation.mutate({ id: task.id, notes: notes || undefined });
  };

  const handleResume = (task: Maintenance) => {
    resumeMutation.mutate(task.id);
  };

  const handleOpenAssignDialog = (task: Maintenance) => {
    setSelectedTaskForAssign(task);
    setSelectedStaffId(task.assigned_to);
    setShowAssignDialog(true);
  };

  const handleAssign = () => {
    if (!selectedTaskForAssign) {
      alert('Error: No task selected');
      return;
    }
    console.log('Assigning task:', selectedTaskForAssign.id, 'to staff:', selectedStaffId);
    assignMutation.mutate({ id: selectedTaskForAssign.id, assigned_to: selectedStaffId });
  };

  if (isLoading) {
    return <div className="p-6">Cargando tareas de mantenimiento...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operaciones de Mantenimiento</h1>
          <p className="text-sm text-gray-600">
            Monitorea las incidencias, asigna técnicos y controla los costos en un solo tablero.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => setOnlyPending((prev) => !prev)} variant={onlyPending ? 'default' : 'ghost'}>
            <ShieldAlert className="h-4 w-4 mr-2" />
            {onlyPending ? 'Mostrando pendientes' : 'Ver todo'}
          </Button>
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <Archive className="h-4 w-4 mr-2" />
            Historial
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase text-gray-500">Total de tickets</p>
            <CardTitle className="text-3xl">{maintenanceStats?.total ?? filteredTasks.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">Histórico de incidencias registradas</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase text-gray-500">Pendientes</p>
            <CardTitle className="text-3xl text-amber-600">{maintenanceStats?.pending ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">En espera de atención o repuestos</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase text-gray-500">Costos estimados</p>
            <CardTitle className="text-3xl">
              ${maintenanceStats?.costs?.total_estimated?.toFixed(2) ?? '0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">Monto proyectado del backlog</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-xs uppercase text-gray-500">En curso</p>
            <CardTitle className="text-3xl text-blue-600">
              {maintenanceStats?.by_status?.in_progress ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-500">Equipos trabajando ahora mismo</CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              placeholder="Filtrar por título, habitación o técnico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="priority">Prioridad</Label>
            <select
              id="priority"
              className="w-full border rounded-md px-3 py-2"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              className="w-full border rounded-md px-3 py-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="locationScope">Ubicación</Label>
            <select
              id="locationScope"
              className="w-full border rounded-md px-3 py-2"
              value={selectedLocationScope}
              onChange={(e) => setSelectedLocationScope(e.target.value as 'all' | 'rooms' | 'areas')}
            >
              <option value="all">Habitaciones y áreas</option>
              <option value="rooms">Solo habitaciones</option>
              <option value="areas">Solo áreas comunes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Main view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader className="space-y-3 pb-3">
                {/* Top Row: Title and Status Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    <Badge className={getMaintenancePriorityColor(task.priority)}>{task.priority}</Badge>
                    <Badge className={getMaintenanceStatusColor(task.status)}>{task.status}</Badge>
                  </div>
                </div>

                {/* Assigned Staff - Prominent Display */}
                {task.assigned_staff_name && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500 text-white rounded-full p-2 flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-semibold uppercase">Responsable</p>
                        <p className="text-sm font-bold text-blue-900">{task.assigned_staff_name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  {resolveLocationLabel(task)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 flex-1">
                {task.description && <p className="text-sm text-gray-700">{task.description}</p>}
                <div className="rounded-lg border p-3 bg-gray-50 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Reportado</span>
                    <span className="font-medium">{formatDate(task.reported_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tipo</span>
                    <Badge variant="outline">
                      {maintenanceTypes.find((t) => t.value === task.type)?.label || task.type}
                    </Badge>
                  </div>
                  {task.location_type === 'common_area' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Área</span>
                      <Badge variant="secondary">
                        {areaCategoryOptions.find((opt) => opt.value === task.area_category)?.label ??
                          'Área común'}
                      </Badge>
                    </div>
                  )}
                  {task.estimated_cost && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Costo estimado</span>
                      <span className="font-semibold">${task.estimated_cost.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-auto flex-wrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenAssignDialog(task)}
                    disabled={task.status === 'completed' || assignMutation.isPending}
                    title="Asignar personal"
                  >
                    <User className="h-4 w-4 mr-1" />
                    Asignar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStart(task)}
                    disabled={task.status !== 'pending' || startMutation.isPending}
                  >
                    <Hammer className="h-4 w-4 mr-1" />
                    Iniciar
                  </Button>
                  {task.status === 'cancelled' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResume(task)}
                      disabled={resumeMutation.isPending}
                      title="Reanudar"
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Reanudar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePause(task)}
                      disabled={!['pending', 'in_progress'].includes(task.status) || pauseMutation.isPending}
                      title="Pausar"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pausar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleComplete(task)}
                    disabled={task.status === 'completed' || completeMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Completar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredTasks.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-10 text-center text-gray-500">
                No hay tareas que coincidan con los filtros seleccionados.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tarea</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ubicación</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Prioridad</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Asignado</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-500 line-clamp-2">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{resolveLocationLabel(task)}</td>
                  <td className="px-4 py-3">
                    <Badge className={getMaintenancePriorityColor(task.priority)}>{task.priority}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={getMaintenanceStatusColor(task.status)}>{task.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {task.assigned_staff_name ? (
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-500 text-white rounded-full p-1.5">
                          <User className="h-3 w-3" />
                        </div>
                        <span className="font-medium text-gray-900">{task.assigned_staff_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(task)}
                        disabled={task.status === 'completed' || assignMutation.isPending}
                        title="Asignar"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStart(task)}
                        disabled={task.status !== 'pending'}
                        title="Iniciar"
                      >
                        <Hammer className="h-4 w-4" />
                      </Button>
                      {task.status === 'cancelled' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResume(task)}
                          disabled={resumeMutation.isPending}
                          title="Reanudar"
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePause(task)}
                          disabled={!['pending', 'in_progress'].includes(task.status) || pauseMutation.isPending}
                          title="Pausar"
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleComplete(task)}
                        disabled={task.status === 'completed'}
                        title="Completar"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Agenda y próximas intervenciones
            </CardTitle>
            <span className="text-xs text-gray-500">{upcomingTasks.length} próximas</span>
          </CardHeader>
            <CardContent className="space-y-4">
              {upcomingTasks.length === 0 && (
                <p className="text-sm text-gray-500">No hay tareas próximas en la agenda.</p>
              )}
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-4">
                  <div className="rounded-full bg-blue-100 text-blue-600 p-2 mt-1">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div className="flex-1 border-b pb-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{task.title}</p>
                      <Badge className={getMaintenancePriorityColor(task.priority)}>{task.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(task.reported_at)} — {resolveLocationLabel(task)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {task.assigned_staff_name ? `Asignado a ${task.assigned_staff_name}` : 'Sin técnico asignado'}
                    </p>
                    {task.location_type === 'common_area' && (
                      <p className="text-xs text-gray-400">
                        {areaCategoryOptions.find((opt) => opt.value === task.area_category)?.label}
                        {task.area_name ? ` • ${task.area_name}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-600" />
              Checklist Preventivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {preventiveChecklist.map((item) => (
              <div
                key={item.label}
                className="border rounded-lg p-3 flex items-center justify-between bg-emerald-50/40"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">Frecuencia: {item.frequency}</p>
                </div>
                <Badge variant="secondary" className="bg-white text-emerald-700 border-emerald-100">
                  {item.frequency}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Create task */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Registrar nuevo mantenimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
            <div className="md:col-span-2">
              <Label>Tipo de ubicación</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={locationType === 'room' ? 'default' : 'ghost'}
                  onClick={() => {
                    setLocationType('room');
                    setFormData((prev) => ({ ...prev, room_id: prev.room_id }));
                  }}
                >
                  Habitaciones
                </Button>
                <Button
                  type="button"
                  variant={locationType === 'common_area' ? 'default' : 'ghost'}
                  onClick={() => {
                    setLocationType('common_area');
                    setFormData((prev) => ({ ...prev, room_id: undefined }));
                  }}
                >
                  Áreas comunes
                </Button>
              </div>
            </div>

            {locationType === 'room' ? (
              <div>
                <Label htmlFor="room_id">Habitación</Label>
                <select
                  id="room_id"
                  className="w-full border rounded-md px-3 py-2"
                  value={formData.room_id ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, room_id: e.target.value ? Number(e.target.value) : undefined })
                  }
                  required
                >
                  <option value="">Seleccionar habitación</option>
                  {rooms?.map((room) => (
                    <option key={room.id} value={room.id}>
                      Hab. {room.number} • {room.type}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="area_category">Área</Label>
                  <select
                    id="area_category"
                    className="w-full border rounded-md px-3 py-2"
                    value={commonAreaCategory}
                    onChange={(e) => setCommonAreaCategory(e.target.value)}
                  >
                    {areaCategoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="area_label">Detalle / referencia</Label>
                  <Input
                    id="area_label"
                    placeholder="Ej. Pasillo del 2º piso"
                    value={commonAreaLabel}
                    onChange={(e) => setCommonAreaLabel(e.target.value)}
                  />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                className="w-full border rounded-md px-3 py-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as MaintenanceCreate['type'] })}
              >
                {maintenanceTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="priority">Prioridad</Label>
              <select
                id="priority"
                className="w-full border rounded-md px-3 py-2"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as MaintenanceCreate['priority'] })
                }
              >
                {priorityOptions
                  .filter((opt) => opt.value !== 'all')
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <Label htmlFor="assigned_to">Asignar a</Label>
              <select
                id="assigned_to"
                className="w-full border rounded-md px-3 py-2"
                value={formData.assigned_to ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assigned_to: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <option value="">Sin asignar</option>
                {staff
                  ?.filter((member: Staff) => member.role === 'mantenimiento' || member.role === 'limpieza')
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} • {member.role}
                    </option>
                  ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                className="w-full border rounded-md px-3 py-2"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="estimated_cost">Costo estimado (USD)</Label>
              <Input
                id="estimated_cost"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_cost ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    estimated_cost: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas internas</Label>
              <textarea
                id="notes"
                className="w-full border rounded-md px-3 py-2"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormData({
                    room_id: undefined,
                    type: 'repair',
                    priority: 'medium',
                    title: '',
                    description: '',
                    assigned_to: undefined,
                    estimated_cost: undefined,
                    notes: '',
                  });
                  setLocationType('room');
                  setCommonAreaCategory('areas_comunes');
                  setCommonAreaLabel('');
                }}
              >
                Limpiar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Assignment Dialog Modal */}
      {showAssignDialog && selectedTaskForAssign && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setShowAssignDialog(false);
            setSelectedTaskForAssign(null);
            setSelectedStaffId(undefined);
          }}
        >
          <Card
            className="w-full max-w-md relative z-50 bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Asignar personal a la tarea</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Tarea:</p>
                <p className="font-semibold text-gray-900">{selectedTaskForAssign.title}</p>
              </div>
              <div>
                <Label htmlFor="staff_select">Técnico de mantenimiento</Label>
                <select
                  id="staff_select"
                  className="w-full border rounded-md px-3 py-2"
                  value={selectedStaffId?.toString() ?? ''}
                  onChange={(e) => {
                    const value = e.target.value ? Number(e.target.value) : undefined;
                    setSelectedStaffId(value);
                  }}
                  autoFocus
                >
                  <option value="">Sin asignar</option>
                  {staff
                    ?.filter((member: Staff) => member.role === 'mantenimiento' || member.role === 'limpieza')
                    .map((member) => (
                      <option key={member.id} value={member.id.toString()}>
                        {member.full_name} • {member.role}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowAssignDialog(false);
                    setSelectedTaskForAssign(null);
                    setSelectedStaffId(undefined);
                  }}
                  disabled={assignMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignMutation.isPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {assignMutation.isPending ? 'Guardando...' : 'Confirmar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
