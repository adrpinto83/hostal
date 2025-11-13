import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auditApi, type AuditLog } from '@/lib/api/audit';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  TrendingUp,
  Filter,
  Save,
  Trash2,
  Clock,
  User,
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Zap,
} from 'lucide-react';

interface QueryFilter {
  id?: string;
  name?: string;
  user_email?: string;
  action?: string;
  resource_type?: string;
  success?: boolean | null;
  start_date?: string;
  end_date?: string;
  resource_id?: number;
}

interface SavedQuery {
  id: string;
  name: string;
  filters: QueryFilter;
  created_at: string;
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 text-sm text-red-800 rounded-lg p-4 flex items-center">
      <AlertCircle className="flex-shrink-0 h-4 w-4 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

function SuccessAlert({ message }: { message: string }) {
  return (
    <div className="bg-green-50 border border-green-200 text-sm text-green-800 rounded-lg p-4 flex items-center">
      <CheckCircle2 className="flex-shrink-0 h-4 w-4 mr-2" />
      <span className="font-medium">{message}</span>
    </div>
  );
}

export default function LogAnalytics() {
  const [filters, setFilters] = useState<QueryFilter>({});
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() => {
    const saved = localStorage.getItem('audit_saved_queries');
    return saved ? JSON.parse(saved) : [];
  });
  const [queryName, setQueryName] = useState('');
  const [showSuspicious, setShowSuspicious] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  // Fetch logs based on filters
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs-analytics', filters],
    queryFn: () => auditApi.getLogs({
      ...filters,
      success: filters.success === null ? undefined : filters.success,
      limit: 500
    }),
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

  const saveQuery = () => {
    if (!queryName.trim()) {
      setError('Por favor ingresa un nombre para la consulta');
      return;
    }

    const newQuery: SavedQuery = {
      id: Date.now().toString(),
      name: queryName,
      filters,
      created_at: new Date().toISOString(),
    };

    const updated = [...savedQueries, newQuery];
    setSavedQueries(updated);
    localStorage.setItem('audit_saved_queries', JSON.stringify(updated));

    setSuccess(`Consulta "${queryName}" guardada`);
    setQueryName('');
    setTimeout(() => setSuccess(''), 3000);
  };

  const loadQuery = (query: SavedQuery) => {
    setFilters(query.filters);
    setSuccess(`Consulta "${query.name}" cargada`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const deleteQuery = (id: string) => {
    const updated = savedQueries.filter((q) => q.id !== id);
    setSavedQueries(updated);
    localStorage.setItem('audit_saved_queries', JSON.stringify(updated));
  };

  const detectSuspiciousActivity = (): AuditLog[] => {
    if (!logs) return [];

    const suspicious: AuditLog[] = [];

    logs.forEach((log) => {
      // 1. Intentos fallidos de login
      if (log.action === 'login' && !log.success) {
        suspicious.push(log);
      }

      // 2. Cambios de rol
      if (log.action === 'approve' && log.details?.includes('admin')) {
        suspicious.push(log);
      }

      // 3. Eliminación de usuarios
      if (log.action === 'delete' && log.resource_type === 'user') {
        suspicious.push(log);
      }

      // 4. Cambios fallidos
      if (!log.success && log.action !== 'login') {
        suspicious.push(log);
      }

      // 5. Accesos fuera de horario (ej: después de las 22:00)
      const hour = new Date(log.timestamp).getHours();
      if (hour >= 22 || hour < 6) {
        if (log.action === 'delete' || log.action === 'approve') {
          suspicious.push(log);
        }
      }
    });

    // Eliminar duplicados
    return Array.from(new Map(suspicious.map((item) => [item.id, item])).values());
  };

  const suspiciousLogs = showSuspicious ? detectSuspiciousActivity() : [];

  const logStats = {
    total: logs?.length || 0,
    successful: logs?.filter((l) => l.success).length || 0,
    failed: logs?.filter((l) => !l.success).length || 0,
    byAction: logs
      ? Object.entries(
          logs.reduce(
            (acc, log) => {
              acc[log.action] = (acc[log.action] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      : [],
    byUser: logs
      ? Object.entries(
          logs.reduce(
            (acc, log) => {
              const email = log.user_email || 'Sistema';
              acc[email] = (acc[email] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          )
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      : [],
  };

  const clearFilters = () => {
    setFilters({});
  };

  const exportJSON = () => {
    const data = showSuspicious ? suspiciousLogs : logs;
    if (!data) return;

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportHTML = () => {
    const data = showSuspicious ? suspiciousLogs : logs;
    if (!data) return;

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Audit Logs Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .success { color: green; }
        .error { color: red; }
        h1 { color: #333; }
        .timestamp { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <h1>Audit Logs Report</h1>
    <p>Generated: ${new Date().toLocaleString('es-ES')}</p>
    <p>Total Records: ${data.length}</p>
    <table>
        <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Status</th>
        </tr>
`;

    data.forEach((log) => {
      html += `
        <tr>
            <td class="timestamp">${new Date(log.timestamp).toLocaleString('es-ES')}</td>
            <td>${log.user_email || 'System'}</td>
            <td>${log.action}</td>
            <td>${log.resource_type}${log.resource_id ? `#${log.resource_id}` : ''}</td>
            <td class="${log.success ? 'success' : 'error'}">${log.success ? '✓' : '✗'}</td>
        </tr>
`;
    });

    html += `
    </table>
</body>
</html>
`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Análisis Avanzado de Logs
        </h1>
        <p className="text-gray-600 mt-2">Consultas dinámicas, análisis profundo y detección de anomalías</p>
      </div>

      {error && <ErrorAlert message={error} />}
      {success && <SuccessAlert message={success} />}

      {/* Constructor de Consultas */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Constructor de Consultas
          </CardTitle>
          <CardDescription>
            Crea consultas personalizadas para analizar logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Usuario</label>
              <Input
                placeholder="admin@hostal.com"
                value={filters.user_email || ''}
                onChange={(e) => setFilters({ ...filters, user_email: e.target.value || undefined })}
              />
            </div>

            {/* Acción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {availableActions?.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Recurso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Recurso</label>
              <select
                value={filters.resource_type || ''}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value || undefined })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {availableResourceTypes?.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={filters.success === undefined ? '' : filters.success ? 'true' : 'false'}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    success:
                      e.target.value === ''
                        ? undefined
                        : e.target.value === 'true'
                  })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                <option value="true">✓ Exitoso</option>
                <option value="false">✗ Fallido</option>
              </select>
            </div>

            {/* ID Recurso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Recurso</label>
              <Input
                type="number"
                placeholder="123"
                value={filters.resource_id || ''}
                onChange={(e) => setFilters({ ...filters, resource_id: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
              <Input
                type="datetime-local"
                value={filters.start_date || ''}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value || undefined })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
              <Input
                type="datetime-local"
                value={filters.end_date || ''}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value || undefined })}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() => refetch()}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                onClick={clearFilters}
                variant="outline"
                className="flex-1"
              >
                Limpiar
              </Button>
            </div>
          </div>

          {/* Guardar Consulta */}
          <div className="flex gap-2 border-t pt-4">
            <Input
              placeholder="Nombre de la consulta..."
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={saveQuery}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Consultas Guardadas */}
      {savedQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consultas Guardadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {savedQueries.map((query) => (
                <div key={query.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-medium">{query.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(query.created_at).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => loadQuery(query)}
                    >
                      Cargar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteQuery(query.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{logStats.total}</div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <Activity className="h-4 w-4" />
              Total de Acciones
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-600">{logStats.successful}</div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-4 w-4" />
              Exitosas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-600">{logStats.failed}</div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <XCircle className="h-4 w-4" />
              Fallidas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-orange-600">{suspiciousLogs.length}</div>
            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-4 w-4" />
              Sospechosas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análisis de Patrones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Acciones Más Frecuentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logStats.byAction.map(([action, count]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{action}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(count / logStats.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Usuarios Más Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logStats.byUser.map(([user, count]) => (
                <div key={user} className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{user}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(count / logStats.total) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detección de Anomalías */}
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-600" />
              Detección de Actividad Sospechosa
            </CardTitle>
            <Button
              onClick={() => setShowSuspicious(!showSuspicious)}
              variant={showSuspicious ? 'default' : 'outline'}
              size="sm"
            >
              {showSuspicious ? 'Ocultando' : 'Mostrar'} Sospechosas ({suspiciousLogs.length})
            </Button>
          </div>
          <CardDescription>
            Análisis automático de actividades anómalas: intentos fallidos, cambios de rol, eliminaciones,
            accesos fuera de horario
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Logs (Normales o Sospechosos) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {showSuspicious ? 'Actividades Sospechosas' : 'Todas las Actividades'}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportJSON} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button onClick={exportHTML} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                HTML
              </Button>
            </div>
          </div>
          <CardDescription>
            {showSuspicious ? suspiciousLogs.length : logs?.length || 0} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(showSuspicious ? suspiciousLogs : logs)?.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2 flex-1">
                    {log.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">
                        {log.action.toUpperCase()} • {log.resource_type}
                        {log.resource_id && ` #${log.resource_id}`}
                      </p>
                      <p className="text-sm text-gray-600">{log.user_email || 'Sistema'}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.timestamp).toLocaleString('es-ES')}
                      </p>
                    </div>
                  </div>
                </div>

                {expandedLog === log.id && log.details && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                    <pre>{JSON.stringify(JSON.parse(log.details), null, 2)}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
