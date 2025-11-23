import { useState, useEffect, useMemo, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invoicesApi, guestsApi, occupancyApi, roomsApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { Invoice, InvoiceCreate, InvoiceLineCreate, Guest, Occupancy, Room } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, X, Home } from 'lucide-react';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  guests?: Array<{ id: number; full_name: string }>;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
  tax_percentage: number;
}

const TAX_PERCENTAGE = 16.0; // Venezuelan IVA

export function InvoiceFormModal({
  isOpen,
  onClose,
  invoice,
  guests = [],
}: InvoiceFormModalProps) {
  const [formData, setFormData] = useState({
    invoice_type: 'factura' as const,
    client_name: '',
    client_rif: '',
    client_email: '',
    client_phone: '',
    currency: 'VES' as const,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    guest_id: undefined as number | undefined,
  });

  const [lines, setLines] = useState<LineItem[]>([
    {
      description: '',
      quantity: 1,
      unit_price: 0,
      is_taxable: true,
      tax_percentage: TAX_PERCENTAGE,
    },
  ]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [guestSearchTerm, setGuestSearchTerm] = useState('');
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const guestDropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close guest dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(event.target as Node)) {
        setShowGuestDropdown(false);
      }
    };

    if (showGuestDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showGuestDropdown]);

  // Fetch guests
  const { data: allGuests = [] } = useQuery<Guest[]>({
    queryKey: ['guests'],
    queryFn: () => guestsApi.getAll({ limit: 1000 }),
  });

  // Filter guests based on search term
  const filteredGuests = useMemo(() => {
    if (!guestSearchTerm.trim()) return allGuests;
    return allGuests.filter(
      (guest) =>
        guest.full_name?.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
        guest.email?.toLowerCase().includes(guestSearchTerm.toLowerCase()) ||
        guest.phone?.includes(guestSearchTerm)
    );
  }, [allGuests, guestSearchTerm]);

  // Fetch active occupancies for the selected guest
  const { data: guestOccupancies = [] } = useQuery<Occupancy[]>({
    queryKey: ['occupancies', formData.guest_id],
    queryFn: () => occupancyApi.getAll({ guest_id: formData.guest_id, active_only: true }),
    enabled: !!formData.guest_id,
  });

  // Fetch rooms to get pricing
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getPaginated({ limit: 100 }),
  });

  const rooms = useMemo(() => {
    return roomsData?.items ?? [];
  }, [roomsData]);

  const handleSelectGuest = (guest: Guest) => {
    setFormData({
      ...formData,
      guest_id: guest.id,
      client_name: guest.full_name || '',
      client_email: guest.email || '',
      client_phone: guest.phone || '',
    });
    setGuestSearchTerm('');
    setShowGuestDropdown(false);
  };

  // Auto-generate invoice lines from active occupancies
  const handleGenerateLinesFromOccupancy = () => {
    if (guestOccupancies.length === 0) {
      alert('No hay ocupancias activas para este huésped');
      return;
    }

    const newLines: LineItem[] = guestOccupancies.map((occ) => {
      const room = rooms.find((r) => r.id === occ.room_id);
      const checkInDate = new Date(occ.check_in);
      const checkOutDate = occ.check_out ? new Date(occ.check_out) : new Date();
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const pricePerNight = room?.price_bs || 0;
      const totalPrice = nights * pricePerNight;

      return {
        description: `Hospedaje - Habitación ${room?.number || 'N/A'} (${nights} noche${nights !== 1 ? 's' : ''})`,
        quantity: nights,
        unit_price: pricePerNight,
        is_taxable: true,
        tax_percentage: 16,
      };
    });

    setLines(newLines);
  };

  // Initialize form with invoice data if editing
  useEffect(() => {
    if (invoice) {
      setFormData({
        invoice_type: invoice.invoice_type,
        client_name: invoice.client_name,
        client_rif: invoice.client_rif || '',
        client_email: invoice.client_email || '',
        client_phone: invoice.client_phone || '',
        currency: invoice.currency as any,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date || '',
        notes: invoice.notes || '',
        guest_id: invoice.guest_id,
      });
      if (invoice.lines) {
        setLines(
          invoice.lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unit_price: line.unit_price,
            is_taxable: line.is_taxable,
            tax_percentage: line.tax_percentage,
          }))
        );
      }
    }
  }, [invoice, isOpen]);

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;

    lines.forEach((line) => {
      const lineTotal = line.quantity * line.unit_price;
      subtotal += lineTotal;
      if (line.is_taxable) {
        taxAmount += lineTotal * (line.tax_percentage / 100);
      }
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [lines]);

  // Create/Update invoice mutation
  const mutation = useMutation({
    mutationFn: (data: InvoiceCreate) => {
      if (invoice) {
        return invoicesApi.update(invoice.id!, data as any);
      }
      return invoicesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      setSuccess(
        invoice ? '✅ Factura actualizada exitosamente' : '✅ Factura creada exitosamente'
      );
      setTimeout(() => {
        onClose();
        setSuccess('');
        setError('');
      }, 1500);
    },
    onError: (error) => {
      setError('❌ Error al guardar la factura: ' + handleApiError(error));
    },
  });

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        is_taxable: true,
        tax_percentage: TAX_PERCENTAGE,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleLineChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const validateRIF = (rif: string): boolean => {
    // Venezuelan RIF format: 9-10 digits optionally followed by check digit
    return /^\d{9,10}(-\d{1})?$/.test(rif) || rif === '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.client_name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    if (formData.client_rif && !validateRIF(formData.client_rif)) {
      setError('Formato de RIF inválido. Debe ser 9-10 dígitos');
      return;
    }

    if (lines.length === 0) {
      setError('Debe agregar al menos una línea de factura');
      return;
    }

    if (lines.some((line) => !line.description.trim() || line.unit_price <= 0)) {
      setError('Todas las líneas deben tener descripción y precio válido');
      return;
    }

    // Create invoice data
    const invoiceData: InvoiceCreate = {
      ...formData,
      due_date: formData.due_date && formData.due_date.trim() ? formData.due_date : null,
      tax_percentage: TAX_PERCENTAGE,
      lines: lines.map((line) => ({
        ...line,
        code: undefined,
      })),
    } as any;

    mutation.mutate(invoiceData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {invoice ? 'Editar Factura' : 'Nueva Factura'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                {success}
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Información General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Factura</Label>
                  <select
                    value={formData.invoice_type}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border rounded mt-1"
                    disabled={!!invoice}
                  >
                    <option value="factura">Factura</option>
                    <option value="nota_credito">Nota de Crédito</option>
                    <option value="nota_debito">Nota de Débito</option>
                  </select>
                </div>

                <div>
                  <Label>Moneda</Label>
                  <select
                    value={formData.currency}
                    onChange={(e) =>
                      setFormData({ ...formData, currency: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border rounded mt-1"
                  >
                    <option value="VES">Bolívares (VES)</option>
                    <option value="USD">Dólares (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                  </select>
                </div>

                <div>
                  <Label>Fecha de Factura</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) =>
                      setFormData({ ...formData, invoice_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Fecha de Vencimiento (Opcional)</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold">Información del Cliente</h3>

              {/* Guest Selection */}
              <div className="relative" ref={guestDropdownRef}>
                <Label>Seleccionar Huésped (Opcional)</Label>
                <Input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={guestSearchTerm}
                  onChange={(e) => {
                    setGuestSearchTerm(e.target.value);
                    setShowGuestDropdown(true);
                  }}
                  onFocus={() => setShowGuestDropdown(true)}
                  className="mt-1"
                />

                {/* Guest Dropdown */}
                {showGuestDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-[10000] max-h-48 overflow-y-auto">
                    {filteredGuests.length > 0 ? (
                      filteredGuests.map((guest) => (
                        <button
                          key={guest.id}
                          type="button"
                          onClick={() => handleSelectGuest(guest)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="font-medium">{guest.full_name}</div>
                          <div className="text-xs text-gray-500">
                            {guest.email} {guest.phone && `• ${guest.phone}`}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500 text-sm">
                        {guestSearchTerm.length > 0 ? 'No se encontraron huéspedes' : 'Cargando huéspedes...'}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Guest Display */}
                {formData.guest_id && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded space-y-2">
                    <div className="text-blue-900 font-medium">
                      ✓ Huésped seleccionado
                    </div>

                    {/* Auto-generate lines button */}
                    {guestOccupancies.length > 0 && (
                      <Button
                        type="button"
                        onClick={handleGenerateLinesFromOccupancy}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm"
                      >
                        <Home className="mr-2 h-4 w-4" />
                        Generar Facturas de Hospedaje ({guestOccupancies.length} habitación{guestOccupancies.length !== 1 ? 'es' : ''})
                      </Button>
                    )}

                    {guestOccupancies.length === 0 && (
                      <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                        No hay ocupancias activas para este huésped
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          guest_id: undefined,
                          client_name: '',
                          client_email: '',
                          client_phone: '',
                        });
                        setGuestSearchTerm('');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Cambiar huésped
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre del Cliente *</Label>
                  <Input
                    value={formData.client_name}
                    onChange={(e) =>
                      setFormData({ ...formData, client_name: e.target.value })
                    }
                    placeholder="Nombre completo"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label>RIF (Opcional)</Label>
                  <Input
                    value={formData.client_rif}
                    onChange={(e) =>
                      setFormData({ ...formData, client_rif: e.target.value })
                    }
                    placeholder="Ej: 123456789-0"
                    className="mt-1"
                  />
                  {formData.client_rif && !validateRIF(formData.client_rif) && (
                    <p className="text-xs text-red-600 mt-1">Formato de RIF inválido</p>
                  )}
                </div>

                <div>
                  <Label>Email (Opcional)</Label>
                  <Input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) =>
                      setFormData({ ...formData, client_email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Teléfono (Opcional)</Label>
                  <Input
                    value={formData.client_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, client_phone: e.target.value })
                    }
                    placeholder="+58 123 4567890"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Invoice Lines */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Líneas de Factura</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Línea
                </Button>
              </div>

              <div className="space-y-3">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg space-y-3 bg-gray-50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <Label>Descripción</Label>
                        <Input
                          value={line.description}
                          onChange={(e) =>
                            handleLineChange(index, 'description', e.target.value)
                          }
                          placeholder="Descripción del servicio/producto"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              'quantity',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Precio Unitario</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              'unit_price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>¿Gravable?</Label>
                        <select
                          value={line.is_taxable ? 'true' : 'false'}
                          onChange={(e) =>
                            handleLineChange(index, 'is_taxable', e.target.value === 'true')
                          }
                          className="w-full px-3 py-2 border rounded mt-1"
                        >
                          <option value="true">Sí (16% IVA)</option>
                          <option value="false">No</option>
                        </select>
                      </div>

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label>Total Línea</Label>
                          <div className="px-3 py-2 border rounded mt-1 bg-white font-semibold text-right">
                            {formatCurrency(line.quantity * line.unit_price)}
                          </div>
                        </div>
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveLine(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-2 pt-4 border-t bg-gray-50 p-4 rounded">
              <div className="flex justify-between">
                <span className="font-semibold">Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">IVA (16%):</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2 pt-4 border-t">
              <Label>Notas (Opcional)</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionales para la factura..."
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>Guardando...</>
                ) : invoice ? (
                  <>Actualizar Factura</>
                ) : (
                  <>Crear Factura</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
