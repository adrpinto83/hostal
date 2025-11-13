import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auditApi } from '@/lib/api/audit';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Eye,
  Filter,
  TrendingUp,
} from 'lucide-react';

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    success: undefined as boolean | undefined,
  });
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Fetch logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['audit-logs', searchTerm, filters],
    queryFn: () =>
      auditApi.getLogs({
        user_email: searchTerm || undefined,
        action: filters.action || undefined,
        resource_type: filters.resource_type || undefined,
        success: filters.success,
        limit: 200,
      }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch summary
  const { data: summary } = useQuery({
    queryKey: ['audit-summary'],
    queryFn: () => auditApi.getSummary(7),
    refetchInterval: 60000,
  });

  // Fetch available filters
  const { data: availableActions } = useQuery({
    queryKey: ['audit-actions'],
    queryFn: () => auditApi.getAvailableActions(),
  });

  const { data: availableResourceTypes } = useQuery({
    queryKey: ['audit-resource-types'],
    queryFn: () => auditApi.getAvailableResourceTypes(),
  });

  const handleExport = () => {
    if (!logs) return;

    // Crear CSV
    const headers = [
      'Timestamp',
      'User Email',
      'Action',
      'Resource Type',
      'Resource ID',
      'Success',
      'Details',
    ];
    const rows = logs.map((log) => [
      log.timestamp,
      log.user_email || 'N/A',
      log.action,
      log.resource_type,
      log.resource_id || 'N/A',
      log.success ? 'Yes' : 'No',
      log.description || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Descargar
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (logsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría del Sistema</h1>
        <p className="text-gray-600 mt-2">Registro completo de todas las acciones del sistema</p>
      </div>

      {/* Summary Cards */}
      {summary && summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.length}</div>
              <p className="text-sm text-gray-600">Usuarios Activos (7d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {summary.reduce((sum, s) => sum + s.total_actions, 0)}
              </div>
              <p className="text-sm text-gray-600">Total de Acciones (7d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {summary.reduce((sum, s) => sum + s.failed_actions, 0)}
              </div>
              <p className="text-sm text-gray-600">Acciones Fallidas (7d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {summary.reduce((sum, s) => sum + s.successful_actions, 0)}
              </div>
              <p className="text-sm text-gray-600">Acciones Exitosas (7d)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search by email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario (Email)</label>
              <Input
                placeholder="admin@hostal.com"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Filter by action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas las acciones</option>
                {availableActions?.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by resource type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Recurso</label>
              <select
                value={filters.resource_type}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todos los tipos</option>
                {availableResourceTypes?.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by success */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.success === undefined ? '' : filters.success ? 'true' : 'false'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    success: e.target.value === '' ? undefined : e.target.value === 'true',
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="true">Exitoso</option>
                <option value="false">Fallido</option>
              </select>
            </div>
          </div>

          <Button onClick={handleExport} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Descargar CSV
          </Button>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Registro de Acciones
          </CardTitle>
          <CardDescription>Total de registros: {logs?.length || 0}</CardDescription>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {log.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-semibold">
                          {log.action.toUpperCase()} - {log.resource_type}
                        </span>
                        {log.resource_id && <span className="text-sm text-gray-600">#{log.resource_id}</span>}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Usuario:</span>
                          <p>{log.user_email || 'Sistema'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Rol:</span>
                          <p>{log.user_role || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="font-medium">Fecha:</span>
                          <p>{new Date(log.timestamp).toLocaleString('es-ES')}</p>
                        </div>
                        <div>
                          <span className="font-medium">Estado:</span>
                          <p>{log.success ? '✓ Exitoso' : '✗ Fallido'}</p>
                        </div>
                      </div>

                      {log.description && (
                        <p className="text-sm text-gray-700 mt-2">{log.description}</p>
                      )}

                      {expandedLog === log.id && log.details && (
                        <div className="mt-4 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                          <pre>{JSON.stringify(JSON.parse(log.details), null, 2)}</pre>
                        </div>
                      )}
                    </div>

                    {log.details && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedLog(expandedLog === log.id ? null : log.id)
                        }
                      >
                        {expandedLog === log.id ? 'Ocultar' : 'Detalles'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">No se encontraron registros de auditoría</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Activity Summary */}
      {summary && summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen de Actividad por Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Usuario</th>
                    <th className="text-center py-2">Rol</th>
                    <th className="text-center py-2">Total Acciones</th>
                    <th className="text-center py-2">Exitosas</th>
                    <th className="text-center py-2">Fallidas</th>
                    <th className="text-left py-2">Último Acceso</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((user) => (
                    <tr key={user.user_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{user.user_email}</td>
                      <td className="text-center">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {user.user_role}
                        </span>
                      </td>
                      <td className="text-center">{user.total_actions}</td>
                      <td className="text-center text-green-600">{user.successful_actions}</td>
                      <td className="text-center text-red-600">{user.failed_actions}</td>
                      <td className="text-left">
                        {new Date(user.last_action).toLocaleString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
