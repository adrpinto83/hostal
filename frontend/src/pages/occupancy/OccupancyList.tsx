import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { occupancyApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { CheckCircle, Clock, Users, TrendingUp } from 'lucide-react';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { toast } from 'sonner';
import type { Occupancy } from '@/types';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

export default function OccupancyList() {
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('/api/v1/exchange-rates/current');
        if (response.ok) {
          const data = await response.json();
          setExchangeRates(data);
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchExchangeRates();
  }, []);

  const { data: occupancies, isLoading, isFetching } = useQuery<Occupancy[]>({
    queryKey: ['occupancies', searchTerm],
    queryFn: () => occupancyApi.getAll({ q: searchTerm || undefined }),
    placeholderData: (previous) => previous,
  });
  const occupancyList = occupancies ?? [];
  const isInitialLoading = !occupancies && isLoading;

  // Calcular estadísticas
  const stats = useMemo(() => {
    return {
      active: occupancyList.filter(o => o.is_active).length,
      finalized: occupancyList.filter(o => !o.is_active).length,
      total: occupancyList.length,
    };
  }, [occupancyList]);

  // Filtrar ocupaciones por status
  const filteredOccupancies = useMemo(() => {
    let filtered = occupancyList;

    if (selectedStatus === 'active') {
      filtered = filtered.filter(o => o.is_active);
    } else if (selectedStatus === 'finalized') {
      filtered = filtered.filter(o => !o.is_active);
    }

    return filtered;
  }, [occupancyList, selectedStatus]);

  const hasOccupancies = filteredOccupancies.length > 0;

  // Sorting y paginación
  const totalPages = Math.ceil(filteredOccupancies.length / itemsPerPage);
  const paginatedOccupancies = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredOccupancies.slice(startIdx, endIdx);
  }, [filteredOccupancies, currentPage, itemsPerPage]);

  const handleDashboardCardClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
    setCurrentPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">🏠 Ocupación de Habitaciones</h1>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Activas */}
        <Card
          onClick={() => handleDashboardCardClick('active')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'active'
              ? 'border-2 border-green-400 bg-green-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activas</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-gray-500 mt-1">Habitaciones ocupadas</p>
          </CardContent>
        </Card>

        {/* Finalizadas */}
        <Card
          onClick={() => handleDashboardCardClick('finalized')}
          className={`cursor-pointer transition-all ${
            selectedStatus === 'finalized'
              ? 'border-2 border-blue-400 bg-blue-50 shadow-lg'
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Finalizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.finalized}</div>
            <p className="text-xs text-gray-500 mt-1">Check-out completados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro Activo Indicator */}
      {selectedStatus && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">
              Filtrado por: <span className="font-bold">{selectedStatus === 'active' ? 'Activas' : 'Finalizadas'}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStatus(null);
              setCurrentPage(1);
            }}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            Limpiar filtro ✕
          </Button>
        </div>
      )}

      {/* Búsqueda */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Input
          placeholder="Buscar por huésped, habitación o notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs"
        />
      </div>
      <div className="text-sm text-muted-foreground min-h-[1.25rem]">
        {isFetching && !isInitialLoading && <span>Actualizando resultados...</span>}
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center rounded-lg border bg-white p-6 text-sm text-gray-500">
          Cargando ocupaciones...
        </div>
      ) : hasOccupancies ? (
        viewMode === 'grid' ? (
          <>
            {/* Items per page selector */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
              <Label htmlFor="items-per-page" className="font-medium text-gray-700">
                Registros por página:
              </Label>
              <select
                id="items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Grid */}
            <div className="grid gap-4">
              {paginatedOccupancies.map((occ) => (
              <Card key={occ.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Habitación {occ.room_number} - {occ.guest_name}
                    </CardTitle>
                    {occ.is_active ? (
                      <span className="inline-flex items-center text-green-600">
                        <Clock className="mr-1 h-4 w-4" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-500">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Finalizada
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-600">Check-in:</p>
                      <p className="font-medium">{formatDateTime(occ.check_in)}</p>
                    </div>
                    {occ.check_out && (
                      <div>
                        <p className="text-sm text-gray-600">Check-out:</p>
                        <p className="font-medium">{formatDateTime(occ.check_out)}</p>
                      </div>
                    )}
                    <div className="md:col-span-2">
                      {occ.amount_paid_bs && (
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm text-blue-600 font-semibold mb-1">Monto Pagado:</p>
                          <p className="text-blue-800">💵 Bs {occ.amount_paid_bs.toFixed(2)}</p>
                          {exchangeRates && exchangeRates.USD > 0 && (
                            <p className="text-blue-800">💲 USD ${(occ.amount_paid_bs / exchangeRates.USD).toFixed(2)}</p>
                          )}
                          {exchangeRates && exchangeRates.EUR > 0 && (
                            <p className="text-blue-800">€ EUR €{(occ.amount_paid_bs / exchangeRates.EUR).toFixed(2)}</p>
                          )}
                        </div>
                      )}
                      {occ.amount_paid_usd && !occ.amount_paid_bs && (
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm text-blue-600 font-semibold mb-1">Monto Pagado:</p>
                          <p className="text-blue-800">💲 USD ${occ.amount_paid_usd.toFixed(2)}</p>
                          {exchangeRates && exchangeRates.USD > 0 && (
                            <p className="text-blue-800">💵 Bs {(occ.amount_paid_usd * exchangeRates.USD).toFixed(2)}</p>
                          )}
                          {exchangeRates && exchangeRates.EUR > 0 && (
                            <p className="text-blue-800">
                              € EUR €{(occ.amount_paid_usd * exchangeRates.USD / exchangeRates.EUR).toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}
                      {!occ.amount_paid_bs && !occ.amount_paid_usd && (
                        <p className="text-sm text-gray-500">No hay pagos registrados</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-600">
                Mostrando {paginatedOccupancies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredOccupancies.length)} de {filteredOccupancies.length} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <span className="text-sm font-medium px-3 py-2 bg-white border rounded">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Items per page selector for table view */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
              <Label htmlFor="items-per-page-table" className="font-medium text-gray-700">
                Registros por página:
              </Label>
              <select
                id="items-per-page-table"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="bg-white border rounded-lg overflow-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Habitación</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Huésped</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Check-in</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Check-out</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Pagos</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedOccupancies.map((occ) => (
                  <tr key={occ.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">#{occ.room_number}</td>
                    <td className="px-4 py-3 text-gray-700">{occ.guest_name}</td>
                    <td className="px-4 py-3 text-gray-700">{formatDateTime(occ.check_in)}</td>
                    <td className="px-4 py-3 text-gray-700">{occ.check_out ? formatDateTime(occ.check_out) : '—'}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {occ.amount_paid_bs
                        ? `Bs ${occ.amount_paid_bs.toFixed(2)}`
                        : occ.amount_paid_usd
                        ? `USD ${occ.amount_paid_usd.toFixed(2)}`
                        : 'Sin pagos'}
                    </td>
                    <td className="px-4 py-3">
                      {occ.is_active ? (
                        <span className="inline-flex items-center text-green-600">
                          <Clock className="mr-1 h-4 w-4" /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-gray-500">
                          <CheckCircle className="mr-1 h-4 w-4" /> Finalizada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination Controls for Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border">
              <div className="text-sm text-gray-600">
                Mostrando {paginatedOccupancies.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredOccupancies.length)} de {filteredOccupancies.length} registros
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  ← Anterior
                </Button>
                <span className="text-sm font-medium px-3 py-2 bg-white border rounded">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          </>
        )
      ) : (
        <div className="rounded-lg border border-dashed bg-white p-6 text-center text-gray-500">
          No se encontraron ocupaciones para “{searchTerm || 'la búsqueda actual'}”.
        </div>
      )}
    </div>
  );
}
