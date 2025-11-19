import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { AlertCircle, Download, Trash2, RotateCcw, HardDrive, CheckCircle2, Clock } from 'lucide-react';
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

export default function BackupManager() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Actualizar cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [backupsRes, healthRes] = await Promise.all([
        api.get('/admin/backup/list'),
        api.get('/admin/backup/health'),
      ]);
      setBackups(backupsRes.data.backups || []);
      setHealth(healthRes.data);
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

  return (
    <div className="space-y-6">
      {/* Health Status */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Base de Datos</CardTitle>
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
              <CardTitle className="text-sm font-medium text-gray-600">Respaldos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.backups_available}</div>
              <p className="text-xs text-gray-500">disponibles</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Tamaño Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health.total_backup_size_mb}</div>
              <p className="text-xs text-gray-500">MB</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Último Respaldo</CardTitle>
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

      {/* Create Backup Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Crear Nuevo Respaldo
          </CardTitle>
          <CardDescription>
            Genera un respaldo completo de la base de datos del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleCreateBackup}
            disabled={isCreating || isLoading}
            className="w-full md:w-auto"
            size="lg"
          >
            {isCreating ? 'Creando respaldo...' : 'Crear Respaldo Ahora'}
          </Button>
          <p className="text-sm text-gray-600 mt-4">
            ⚠️ Los respaldos grandes pueden tomar varios minutos.
          </p>
        </CardContent>
      </Card>

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
    </div>
  );
}
