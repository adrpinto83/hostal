import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import {
  AlertCircle,
  Download,
  Trash2,
  RotateCcw,
  HardDrive,
  CheckCircle2,
  Clock,
  Database,
  XCircle,
  RefreshCw,
  Zap,
  Info,
  FileText,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface Backup {
  id: string;
  filename: string;
  created_at: string;
  size_bytes: number;
  size_mb: number;
  description?: string;
}

interface SystemHealth {
  database: string;
  backups_available: number;
  latest_backup?: string;
  total_backup_size_mb: number;
  timestamp: string;
}

interface DatabaseInfo {
  total_records: number;
  tables: Record<string, number>;
  timestamp: string;
}

interface BackupSchedule {
  enabled: boolean;
  interval_minutes: number;
  next_run?: string | null;
  last_run?: string | null;
  description?: string | null;
}

export default function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showTestDataDialog, setShowTestDataDialog] = useState(false);
  const [showTestDataWarningDialog, setShowTestDataWarningDialog] = useState(false);
  const [testDataCount, setTestDataCount] = useState(10);
  const [existingDataInfo, setExistingDataInfo] = useState<any>(null);
  const defaultSchedule: BackupSchedule = {
    enabled: false,
    interval_minutes: 1440,
    next_run: null,
    last_run: null,
    description: 'Respaldo programado automático',
  };
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    enabled: defaultSchedule.enabled,
    interval_minutes: defaultSchedule.interval_minutes,
    description: defaultSchedule.description || '',
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const schedulePromise = api.get('/admin/backup/schedule').catch(() => ({ data: defaultSchedule }));
      const [backupsRes, healthRes, dbInfoRes, scheduleRes] = await Promise.all([
        api.get('/admin/backup/list'),
        api.get('/admin/backup/health'),
        api.get('/admin/backup/database-info'),
        schedulePromise,
      ]);
      setBackups(backupsRes.data.backups || []);
      setHealth(healthRes.data);
      setDbInfo(dbInfoRes.data);
      setSchedule(scheduleRes.data);
      setScheduleForm({
        enabled: scheduleRes.data.enabled,
        interval_minutes: scheduleRes.data.interval_minutes,
        description: scheduleRes.data.description || '',
      });
    } catch (error) {
      toast.error('Error cargando datos de respaldos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true);
      const res = await api.post('/admin/backup/create', {
        description: `Respaldo manual ${new Date().toLocaleString()}`,
      });
      toast.success(`Respaldo creado: ${res.data.filename}`);
      loadData();
    } catch (error) {
      toast.error('Error creando respaldo');
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    try {
      setIsLoading(true);
      await api.post('/admin/backup/restore', {
        backup_id: selectedBackup.id,
        confirm: true,
      });
      toast.success('Base de datos restaurada correctamente');
      setShowRestoreDialog(false);
      loadData();
    } catch (error) {
      toast.error('Error restaurando respaldo');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const res = await api.get(`/admin/backup/download/${backup.id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', backup.filename);
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      toast.success('Respaldo descargado');
    } catch (error) {
      toast.error('Error descargando respaldo');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!selectedBackup) return;

    try {
      setIsLoading(true);
      await api.post(`/admin/backup/delete/${selectedBackup.id}`);
      toast.success('Respaldo eliminado');
      setShowDeleteDialog(false);
      loadData();
    } catch (error) {
      toast.error('Error eliminando respaldo');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    try {
      setIsLoading(true);
      const res = await api.post('/admin/backup/reset-database', null, {
        params: { confirm: true },
      });
      toast.success(`Base de datos reseteada: ${res.data.records_deleted} registros eliminados`);
      setShowResetDialog(false);
      loadData();
    } catch (error) {
      toast.error('Error reseteando base de datos');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTestData = async (force: boolean = false) => {
    try {
      setIsLoading(true);
      const res = await api.post('/admin/backup/generate-test-data', null, {
        params: { count: testDataCount, force },
      });
      toast.success(`Datos de prueba generados: ${res.data.total_records_created} registros creados`);
      setShowTestDataDialog(false);
      setShowTestDataWarningDialog(false);
      setExistingDataInfo(null);
      loadData();
    } catch (error: any) {
      // Si hay un conflicto (409), mostrar diálogo de advertencia
      if (error.response?.status === 409) {
        const errorData = error.response.data.detail;
        setExistingDataInfo(errorData);
        setShowTestDataDialog(false);
        setShowTestDataWarningDialog(true);
      } else {
        toast.error('Error generando datos de prueba');
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGenerateWithData = async () => {
    await handleGenerateTestData(true);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('es-ES');
  };

  const formatDateTimeFriendly = (value?: string | null) => {
    if (!value) return 'No disponible';
    return new Date(value).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Respaldos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Administra respaldos, resetea la base de datos o genera datos de prueba
        </p>
      </div>

      {/* Health Status */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-semibold capitalize">{health.database}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Respaldos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.backups_available}</div>
              <p className="text-xs text-gray-500">disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Tamaño Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.total_backup_size_mb}</div>
              <p className="text-xs text-gray-500">MB</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Último Respaldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  {health.latest_backup ? formatDate(health.latest_backup) : 'Ninguno'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database Info */}
      {dbInfo && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Info className="h-5 w-5" />
              Información de la Base de Datos
            </CardTitle>
            <CardDescription>Resumen de registros por tabla</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border border-purple-100">
                <div className="text-2xl font-bold text-purple-600">{formatNumber(dbInfo.total_records)}</div>
                <p className="text-xs text-gray-600 font-medium mt-1">Total</p>
              </div>
              {Object.entries(dbInfo.tables).map(([table, count]) => (
                <div key={table} className="text-center p-3 bg-white rounded-lg border border-gray-200">
                  <div className="text-lg font-bold text-gray-900">{formatNumber(count)}</div>
                  <p className="text-xs text-gray-600 capitalize mt-1">{table}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Última actualización: {formatDate(dbInfo.timestamp)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="text-purple-600"
              >
                <RefreshCw className="h-3 w-3 mr-2" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Backup Schedule */}
      {schedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Programación de Respaldos
            </CardTitle>
            <CardDescription>Configura respaldos automáticos recurrentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={scheduleForm.enabled}
                  onChange={(e) => setScheduleForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                />
                Activar respaldos automáticos
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Intervalo:</span>
                <select
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  value={scheduleForm.interval_minutes}
                  onChange={(e) =>
                    setScheduleForm((prev) => ({
                      ...prev,
                      interval_minutes: parseInt(e.target.value, 10),
                    }))
                  }
                  disabled={!scheduleForm.enabled}
                >
                  <option value={60}>Cada 1 hora</option>
                  <option value={120}>Cada 2 horas</option>
                  <option value={360}>Cada 6 horas</option>
                  <option value={720}>Cada 12 horas</option>
                  <option value={1440}>Cada 24 horas</option>
                  <option value={2880}>Cada 48 horas</option>
                  <option value={10080}>Cada semana</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción (opcional)
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Respaldo programado automático"
                value={scheduleForm.description}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!scheduleForm.enabled}
              />
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-semibold text-gray-800">Próxima ejecución:</p>
                  <p>{schedule.next_run ? formatDateTimeFriendly(schedule.next_run) : 'No programada'}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Último respaldo automático:</p>
                  <p>{schedule.last_run ? formatDateTimeFriendly(schedule.last_run) : 'Nunca ejecutado'}</p>
                </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSavingSchedule ? 'Guardando...' : 'Guardar Programación'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Create Backup */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <HardDrive className="h-5 w-5" />
              Crear Respaldo
            </CardTitle>
            <CardDescription>Genera un respaldo completo de la BD</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isCreating ? 'Creando...' : 'Crear Respaldo'}
            </Button>
            <p className="text-xs text-gray-600 mt-3">
              ⚠️ Los respaldos grandes pueden tomar varios minutos
            </p>
          </CardContent>
        </Card>

        {/* Generate Test Data */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Zap className="h-5 w-5" />
              Datos de Prueba
            </CardTitle>
            <CardDescription>Genera datos de ejemplo para testing</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowTestDataDialog(true)}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              Generar Datos
            </Button>
            <p className="text-xs text-gray-600 mt-3">
              ✅ Crea huéspedes, habitaciones, reservas y más
            </p>
          </CardContent>
        </Card>

        {/* Reset Database */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" />
              Resetear BD
            </CardTitle>
            <CardDescription>Elimina todos los datos excepto admin</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowResetDialog(true)}
              disabled={isLoading}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              Resetear Base de Datos
            </Button>
            <p className="text-xs text-red-600 font-semibold mt-3">
              ⚠️ ADVERTENCIA: Acción irreversible
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Respaldos Disponibles</CardTitle>
          <CardDescription>
            Gestiona tus respaldos existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <AlertCircle className="h-5 w-5 mr-2" />
              No hay respaldos disponibles
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{backup.filename}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(backup.created_at)} • {formatSize(backup.size_bytes)}
                    </p>
                    {backup.description && (
                      <p className="text-sm text-gray-500 mt-1">{backup.description}</p>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(backup)}
                      disabled={isLoading}
                      title="Descargar respaldo"
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setShowRestoreDialog(true);
                      }}
                      disabled={isLoading}
                      className="text-yellow-600 hover:text-yellow-700"
                      title="Restaurar desde este respaldo"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBackup(backup);
                        setShowDeleteDialog(true);
                      }}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700"
                      title="Eliminar respaldo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Restaurar Respaldo
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  ⚠️ <strong>ADVERTENCIA:</strong> Esta acción eliminará todos los datos actuales
                  y los reemplazará con los del respaldo.
                </p>
                <p>Respaldo: <code className="bg-gray-100 px-2 py-1 rounded">{selectedBackup?.filename}</code></p>
                <p>Fecha: {selectedBackup && formatDate(selectedBackup.created_at)}</p>
                <p className="text-red-600 font-semibold">
                  ¿Estás seguro de que deseas restaurar este respaldo?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRestore}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? 'Restaurando...' : 'Sí, restaurar'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Eliminar Respaldo
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p>
                  ⚠️ <strong>ADVERTENCIA:</strong> Esta acción es irreversible.
                </p>
                <p>Respaldo: <code className="bg-gray-100 px-2 py-1 rounded">{selectedBackup?.filename}</code></p>
                <p className="text-red-600 font-semibold">
                  ¿Estás seguro de que deseas eliminar este respaldo?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Eliminando...' : 'Sí, eliminar'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Database Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Resetear Base de Datos
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p className="text-red-700 font-bold text-lg">
                  🚨 ADVERTENCIA CRÍTICA 🚨
                </p>
                <p>
                  Esta acción eliminará <strong>TODOS</strong> los datos del sistema de forma <strong>PERMANENTE</strong>:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Todos los huéspedes y sus datos</li>
                  <li>Todas las habitaciones y reservas</li>
                  <li>Todos los pagos y facturas</li>
                  <li>Todo el personal y mantenimientos</li>
                  <li>Todos los dispositivos y configuraciones</li>
                  <li>Todos los registros de auditoría</li>
                </ul>
                <p className="bg-yellow-50 border-l-4 border-yellow-500 p-3 text-sm">
                  <strong>Lo único que se preservará:</strong> Tu usuario administrador actual
                </p>
                <p className="text-red-600 font-bold">
                  ¿Estás ABSOLUTAMENTE seguro de que deseas continuar?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleResetDatabase}
            disabled={isLoading}
            className="bg-red-700 hover:bg-red-800"
          >
            {isLoading ? 'Reseteando...' : 'SÍ, ELIMINAR TODO'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Data Dialog */}
      <AlertDialog open={showTestDataDialog} onOpenChange={setShowTestDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-600">
              <Zap className="h-5 w-5" />
              Generar Datos de Prueba
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>
                  Se generarán datos de prueba para testing y desarrollo.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad base de registros (1-500):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={testDataCount}
                    onChange={(e) => setTestDataCount(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esto generará aproximadamente {testDataCount * 15}-{testDataCount * 25} registros en total
                  </p>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-sm">
                  <p className="font-semibold mb-2">Se generarán:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>{testDataCount} Habitaciones con {testDataCount * 3} tarifas</li>
                    <li>{testDataCount * 3} Huéspedes con nombres realistas</li>
                    <li>{testDataCount * 2} Reservas (varios períodos)</li>
                    <li>{testDataCount * 2} Pagos (múltiples monedas)</li>
                    <li>{testDataCount * 2} Facturas con {testDataCount * 2 * 3} líneas</li>
                    <li>{testDataCount} Personal</li>
                    <li>{Math.floor(testDataCount / 3)} Dispositivos de red</li>
                    <li>{testDataCount * 4} Dispositivos de huéspedes</li>
                    <li>{testDataCount * 5} Actividades de red</li>
                    <li>{testDataCount} Mantenimientos asignados</li>
                    <li>Ocupancias, tasas de cambio y más...</li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => handleGenerateTestData(false)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Generando...' : 'Generar Datos'}
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Test Data Warning Dialog - When data already exists */}
      <AlertDialog open={showTestDataWarningDialog} onOpenChange={setShowTestDataWarningDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              La base de datos ya contiene datos
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <p className="text-yellow-800 font-semibold mb-2">
                    ⚠️ Advertencia: Se detectaron datos existentes
                  </p>
                  <p className="text-yellow-700 text-sm">
                    Generar datos de prueba agregará <strong>{testDataCount * 15}-{testDataCount * 25} registros adicionales</strong> a
                    los datos existentes. Esto podría causar confusión si hay datos reales en el sistema.
                  </p>
                </div>

                {existingDataInfo && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900 mb-3">
                      Datos existentes en la base de datos:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                      {Object.entries(existingDataInfo.tables || {}).map(([table, count]) => (
                        count > 0 && (
                          <div key={table} className="bg-white border border-gray-200 rounded p-2">
                            <div className="text-lg font-bold text-gray-900">{formatNumber(count as number)}</div>
                            <div className="text-xs text-gray-600 capitalize">{table}</div>
                          </div>
                        )
                      ))}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-gray-700">
                      Total: {formatNumber(existingDataInfo.existing_records)} registros
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border-l-4 border-blue-500 p-3">
                  <p className="text-sm font-semibold text-blue-900 mb-2">💡 Recomendaciones:</p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Si estos son datos reales, considera <strong>resetear la BD</strong> primero</li>
                    <li>Si quieres agregar más datos de prueba, puedes continuar</li>
                    <li>Crea un <strong>respaldo</strong> antes de continuar por seguridad</li>
                  </ul>
                </div>

                <p className="text-sm text-gray-600">
                  ¿Deseas continuar y agregar {testDataCount * 15}-{testDataCount * 25} registros de prueba adicionales?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel onClick={() => setExistingDataInfo(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmGenerateWithData}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Generando...' : 'Sí, agregar datos de prueba'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
  const handleSaveSchedule = async () => {
    try {
      setIsSavingSchedule(true);
      const res = await api.post('/admin/backup/schedule', {
        enabled: scheduleForm.enabled,
        interval_minutes: scheduleForm.interval_minutes,
        description: scheduleForm.description,
      });
      setSchedule(res.data);
      setScheduleForm({
        enabled: res.data.enabled,
        interval_minutes: res.data.interval_minutes,
        description: res.data.description || '',
      });
      toast.success('Programación de respaldos actualizada');
    } catch (error) {
      toast.error('Error actualizando la programación de respaldos');
      console.error(error);
    } finally {
      setIsSavingSchedule(false);
    }
  };
