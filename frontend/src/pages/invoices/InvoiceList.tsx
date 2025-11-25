import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { invoicesApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Invoice, InvoiceListResponse, InvoiceStats } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Plus, Eye, CheckCircle, XCircle, DollarSign, FileText, Clock, TrendingUp, AlertCircle, Printer, Settings } from 'lucide-react';
import { InvoiceFormModal } from '@/components/invoices/InvoiceFormModal';

type SupportedCurrency = 'VES' | 'USD' | 'EUR';

interface ExchangeRatesResponse {
  USD: number;
  EUR: number;
  timestamp?: string;
}

const invoiceStatusLabels = {
  draft: 'Borrador',
  issued: 'Emitida',
  cancelled: 'Cancelada',
  paid: 'Pagada',
};

const invoiceStatusColors = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-green-100 text-green-800',
};

const paymentStatusLabels = {
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Completado',
};

const paymentStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

export default function InvoiceList() {
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchClient, setSearchClient] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('VES');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRatesResponse | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/v1/exchange-rates/current');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setExchangeRates(data);
          }
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const supportedCurrencies: SupportedCurrency[] = ['VES', 'USD', 'EUR'];

  const normalizeCurrency = (currency?: string | null): SupportedCurrency | null => {
    if (!currency) {
      return 'VES';
    }
    const upper = currency.toUpperCase() as SupportedCurrency;
    return supportedCurrencies.includes(upper) ? upper : null;
  };

  const convertAmount = (amount: number, sourceCurrency: SupportedCurrency): number => {
    if (sourceCurrency === displayCurrency) {
      return amount;
    }
    if (!exchangeRates) {
      return amount;
    }

    const ratesToVES: Record<SupportedCurrency, number> = {
      VES: 1,
      USD: exchangeRates.USD,
      EUR: exchangeRates.EUR,
    };

    const amountInVES = sourceCurrency === 'VES' ? amount : amount * ratesToVES[sourceCurrency];
    if (displayCurrency === 'VES') {
      return amountInVES;
    }
    return amountInVES / ratesToVES[displayCurrency];
  };

  const formatAmount = (amount?: number | null, sourceCurrency?: string | null): string => {
    const safeAmount = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
    const normalizedSource = normalizeCurrency(sourceCurrency);

    if (!normalizedSource) {
      const labelCurrency = (sourceCurrency || 'VES').toUpperCase();
      return formatCurrency(safeAmount, labelCurrency);
    }

    if (normalizedSource === displayCurrency) {
      return formatCurrency(safeAmount, displayCurrency);
    }

    if (!exchangeRates) {
      return formatCurrency(safeAmount, normalizedSource);
    }

    const converted = convertAmount(safeAmount, normalizedSource);
    return formatCurrency(converted, displayCurrency);
  };

  // Fetch invoices with filters
  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery<InvoiceListResponse[]>({
    queryKey: ['invoices', filterStatus, searchClient, startDate, endDate],
    queryFn: () =>
      invoicesApi.getAll({
        status: filterStatus || undefined,
        client_name: searchClient || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    refetchOnWindowFocus: true,
  });

  // Fetch statistics
  const { data: stats = {
    total_invoices: 0,
    total_issued: 0,
    total_cancelled: 0,
    total_revenue: 0,
    total_tax_collected: 0,
    pending_payment: 0,
    average_invoice_value: 0,
    invoices_this_month: 0,
    revenue_this_month: 0,
  } as InvoiceStats } = useQuery({
    queryKey: ['invoices-stats'],
    queryFn: invoicesApi.getStats,
  });

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return invoices.slice(start, end);
  }, [invoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const hasInvoices = invoices.length > 0;

  // Issue invoice mutation
  const issueMutation = useMutation({
    mutationFn: invoicesApi.issue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      setSuccessMessage('✅ Factura emitida exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setErrorMessage('❌ Error al emitir la factura: ' + handleApiError(error));
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  // Cancel invoice mutation
  const cancelDraftMutation = useMutation({
    mutationFn: (id: number) => invoicesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      setSuccessMessage('✅ Factura cancelada (borrador) exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setErrorMessage('❌ Error al cancelar la factura: ' + handleApiError(error));
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  const annulMutation = useMutation({
    mutationFn: ({ id, reason, authorizationCode }: { id: number; reason: string; authorizationCode: string }) =>
      invoicesApi.annul(id, { reason, authorization_code: authorizationCode }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      setSuccessMessage('✅ Factura anulada con autorización SENIAT');
      setTimeout(() => setSuccessMessage(''), 3000);
    },
    onError: (error) => {
      setErrorMessage('❌ Error al anular la factura: ' + handleApiError(error));
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  const handleIssueInvoice = (invoiceId: number) => {
    if (confirm('¿Está seguro de que desea emitir esta factura?')) {
      issueMutation.mutate(invoiceId);
    }
  };

  const handleCancelInvoice = (invoiceSummary: { id: number; status?: string }) => {
    if (!invoiceSummary?.status) {
      setErrorMessage('❌ Estado desconocido de la factura, no se puede cancelar/anular.');
      setTimeout(() => setErrorMessage(''), 5000);
      return;
    }

    if (invoiceSummary.status === 'draft') {
      if (confirm('¿Está seguro de que desea cancelar esta factura en borrador?')) {
        cancelDraftMutation.mutate(invoiceSummary.id);
      }
      return;
    }

    if (invoiceSummary.status === 'issued') {
      const reason = window.prompt('Ingresa el motivo de anulación autorizado por SENIAT (mínimo 10 caracteres):');
      if (!reason || reason.trim().length < 10) {
        setErrorMessage('❌ Debes especificar un motivo de anulación válido.');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }
      const authorizationCode = window.prompt('Ingresa el código de autorización SENIAT recibido para esta anulación:');
      if (!authorizationCode || authorizationCode.trim().length < 5) {
        setErrorMessage('❌ Debes indicar el código de autorización SENIAT.');
        setTimeout(() => setErrorMessage(''), 5000);
        return;
      }

      annulMutation.mutate({
        id: invoiceSummary.id,
        reason: reason.trim(),
        authorizationCode: authorizationCode.trim(),
      });
      return;
    }

    setErrorMessage('❌ Solo las facturas en borrador pueden cancelarse. Las emitidas se anulan con autorización.');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleViewDetails = async (invoiceId: number) => {
    try {
      const invoice = await invoicesApi.getById(invoiceId);
      setSelectedInvoice(invoice);
    } catch (error) {
      setErrorMessage('❌ Error al cargar los detalles de la factura');
    }
  };

  const handlePrintInvoice = async (invoiceId: number) => {
    try {
      const html = await invoicesApi.getPrintable(invoiceId);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        setErrorMessage('❌ El navegador bloqueó la ventana de impresión. Permite pop-ups e inténtalo de nuevo.');
        URL.revokeObjectURL(url);
        return;
      }
      printWindow.addEventListener('load', () => {
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      setErrorMessage('❌ Error al generar la factura imprimible');
    }
  };

  const handleSendByEmail = async (invoiceId: number) => {
    try {
      const result = await invoicesApi.sendByEmail(invoiceId);
      setSuccessMessage(`✅ ${result.message}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage('❌ Error al enviar la factura por correo: ' + handleApiError(error));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Facturación</h1>
          <p className="text-sm text-gray-500">Cambia la moneda mostrada usando las tasas del dashboard.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-gray-600">Moneda</Label>
            <select
              className="border rounded px-3 py-2 text-sm"
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as SupportedCurrency)}
              disabled={!exchangeRates}
            >
              {supportedCurrencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency === 'VES' ? 'VES (Bs)' : currency === 'USD' ? 'USD ($)' : 'EUR (€)'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/invoices/config')}
              variant="outline"
              className="border-gray-300"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Button>
            <Button
              onClick={() => {
                setEditingInvoice(undefined);
                setIsFormModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices Card */}
        <Card
          className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setFilterStatus(null)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Total Facturas</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">
                  {stats.total_invoices}
                </p>
                <p className="text-xs text-gray-500 mt-1">Todas las facturas</p>
              </div>
              <FileText className="h-12 w-12 text-blue-500 opacity-10" />
            </div>
          </CardContent>
        </Card>

        {/* Issued Invoices Card */}
        <Card
          className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setFilterStatus('issued')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Emitidas</p>
                <p className="text-3xl font-bold mt-2 text-green-600">
                  {stats.total_issued}
                </p>
                <p className="text-xs text-gray-500 mt-1">Facturas emitidas</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500 opacity-10" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Card */}
        <Card
          className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setFilterStatus(null)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Ingresos Totales</p>
                <p className="text-3xl font-bold mt-2 text-gray-900">
                  {formatAmount(stats.total_revenue, 'VES')}
                </p>
                <p className="text-xs text-gray-500 mt-1">Valor de facturas</p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-500 opacity-10" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Payment Card */}
        <Card
          className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => setFilterStatus(null)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase text-gray-500 font-semibold">Pagos Pendientes</p>
                <p className="text-3xl font-bold mt-2 text-orange-600">
                  {formatAmount(stats.pending_payment, 'VES')}
                </p>
                <p className="text-xs text-gray-500 mt-1">Por cobrar</p>
              </div>
              <Clock className="h-12 w-12 text-orange-500 opacity-10" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Buscar Cliente</Label>
              <Input
                placeholder="Nombre del cliente..."
                value={searchClient}
                onChange={(e) => {
                  setSearchClient(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="mt-1"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchClient('');
                  setStartDate('');
                  setEndDate('');
                  setFilterStatus(null);
                  setCurrentPage(1);
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Facturas ({invoices.length})
            </CardTitle>
            {isInvoicesLoading && <span className="text-sm text-gray-500">Cargando...</span>}
          </div>
        </CardHeader>
        <CardContent>
          {!hasInvoices ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No hay facturas disponibles</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Control</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Moneda</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Pago</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{invoice.control_number}</td>
                      <td className="px-4 py-3">{invoice.client_name}</td>
                      <td className="px-4 py-3 font-semibold">{invoice.currency}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatAmount(invoice.total, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={invoiceStatusColors[invoice.status as keyof typeof invoiceStatusColors]}>
                          {invoiceStatusLabels[invoice.status as keyof typeof invoiceStatusLabels]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={paymentStatusColors[invoice.payment_status as keyof typeof paymentStatusColors]}>
                          {paymentStatusLabels[invoice.payment_status as keyof typeof paymentStatusLabels]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(invoice.invoice_date).toLocaleDateString('es-VE')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(invoice.id)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {invoice.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleIssueInvoice(invoice.id)}
                              title="Emitir factura"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {invoice.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvoice(invoice)}
                              title={invoice.status === 'draft' ? 'Cancelar borrador' : 'Anular factura emitida'}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInvoice(invoice.id)}
                            title="Imprimir"
                          >
                            <Printer className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendByEmail(invoice.id)}
                            title="Enviar por correo"
                          >
                            📧
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Mostrando {paginatedInvoices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(currentPage * itemsPerPage, invoices.length)} de {invoices.length}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  ← Anterior
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Form Modal */}
      <InvoiceFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingInvoice(undefined);
        }}
        invoice={editingInvoice}
      />

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Detalles de la Factura</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Control</Label>
                  <p className="font-mono text-sm">{selectedInvoice.control_number}</p>
                </div>
                <div>
                  <Label>Factura #</Label>
                  <p>{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <Label>Cliente</Label>
                  <p>{selectedInvoice.client_name}</p>
                </div>
                <div>
                  <Label>RIF</Label>
                  <p>{selectedInvoice.client_rif || 'N/A'}</p>
                </div>
              </div>

              {/* Invoice Lines */}
              {selectedInvoice.lines && selectedInvoice.lines.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Líneas de Factura</h3>
                  <table className="w-full text-xs border">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left">Descripción</th>
                        <th className="px-2 py-1 text-right">Cantidad</th>
                        <th className="px-2 py-1 text-right">Precio Unit.</th>
                        <th className="px-2 py-1 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedInvoice.lines.map((line) => (
                        <tr key={line.id}>
                          <td className="px-2 py-1">{line.description}</td>
                          <td className="px-2 py-1 text-right">{line.quantity}</td>
                          <td className="px-2 py-1 text-right">{formatAmount(line.unit_price, selectedInvoice.currency)}</td>
                          <td className="px-2 py-1 text-right">{formatAmount(line.line_total || 0, selectedInvoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 pt-4 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(selectedInvoice.subtotal || 0, selectedInvoice.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA ({selectedInvoice.tax_percentage}%):</span>
                  <span>{formatAmount(selectedInvoice.tax_amount || 0, selectedInvoice.currency)}</span>
                </div>
                {selectedInvoice.iva_retention_amount && selectedInvoice.iva_retention_amount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Retención IVA:</span>
                    <span>-{formatAmount(selectedInvoice.iva_retention_amount, selectedInvoice.currency)}</span>
                  </div>
                )}
                {selectedInvoice.islr_retention_amount && selectedInvoice.islr_retention_amount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Retención ISLR:</span>
                    <span>-{formatAmount(selectedInvoice.islr_retention_amount, selectedInvoice.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatAmount(selectedInvoice.total || 0, selectedInvoice.currency)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedInvoice(null)}>
                  Cerrar
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handlePrintInvoice(selectedInvoice.id!)}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleSendByEmail(selectedInvoice.id!)}
                >
                  📧 Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
