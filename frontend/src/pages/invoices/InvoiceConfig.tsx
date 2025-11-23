import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { invoicesApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import type { InvoiceConfiguration, InvoiceConfigurationCreate } from '@/types';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function InvoiceConfig() {
  const [formData, setFormData] = useState<InvoiceConfigurationCreate>({
    company_name: '',
    company_rif: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    tax_percentage: 16.0,
    enable_iva_retention: false,
    iva_retention_percentage: 75.0,
    enable_islr_retention: false,
    islr_retention_percentage: 0.75,
    invoice_series: 'A',
    seniat_authorization_number: '',
    seniat_authorization_date: '',
    logo_path: '',
    invoice_header_color: '#1a3a52',
    invoice_footer_text: '',
    payment_terms: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const queryClient = useQueryClient();

  // Fetch current configuration
  const { data: config } = useQuery({
    queryKey: ['invoice-config'],
    queryFn: invoicesApi.getConfig,
  });

  // Initialize form with fetched config
  useEffect(() => {
    if (config) {
      setFormData({
        company_name: config.company_name,
        company_rif: config.company_rif,
        address: config.address,
        city: config.city,
        state: config.state,
        postal_code: config.postal_code || '',
        phone: config.phone || '',
        email: config.email || '',
        website: config.website || '',
        tax_percentage: config.tax_percentage,
        enable_iva_retention: config.enable_iva_retention,
        iva_retention_percentage: config.iva_retention_percentage,
        enable_islr_retention: config.enable_islr_retention,
        islr_retention_percentage: config.islr_retention_percentage,
        invoice_series: config.invoice_series,
        seniat_authorization_number: config.seniat_authorization_number || '',
        seniat_authorization_date: config.seniat_authorization_date || '',
        logo_path: config.logo_path || '',
        invoice_header_color: config.invoice_header_color,
        invoice_footer_text: config.invoice_footer_text || '',
        payment_terms: config.payment_terms || '',
      });
    }
  }, [config]);

  // Update configuration mutation
  const mutation = useMutation({
    mutationFn: invoicesApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-config'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      setSuccess('✅ Configuración guardada exitosamente');
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError('❌ Error al guardar la configuración: ' + handleApiError(error));
    },
  });

  const validateRIF = (rif: string): boolean => {
    // Venezuelan RIF format for companies: 9-10 digits without dashes
    return /^\d{9,10}$/.test(rif);
  };

  const validateHexColor = (color: string): boolean => {
    return /^#[0-9A-F]{6}$/i.test(color);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.company_name.trim()) {
      setError('El nombre de la empresa es obligatorio');
      return;
    }

    if (!validateRIF(formData.company_rif)) {
      setError('RIF debe ser 9 o 10 dígitos sin guiones');
      return;
    }

    if (!formData.address.trim()) {
      setError('La dirección es obligatoria');
      return;
    }

    if (!formData.city.trim()) {
      setError('La ciudad es obligatoria');
      return;
    }

    if (!formData.state.trim()) {
      setError('El estado es obligatorio');
      return;
    }

    if (!validateHexColor(formData.invoice_header_color)) {
      setError('Color del encabezado debe ser un código hexadecimal válido (ej: #1a3a52)');
      return;
    }

    if (formData.tax_percentage < 0 || formData.tax_percentage > 100) {
      setError('El porcentaje de IVA debe estar entre 0 y 100');
      return;
    }

    if (
      formData.enable_iva_retention &&
      (formData.iva_retention_percentage < 0 || formData.iva_retention_percentage > 100)
    ) {
      setError('El porcentaje de retención de IVA debe estar entre 0 y 100');
      return;
    }

    if (
      formData.enable_islr_retention &&
      (formData.islr_retention_percentage < 0 || formData.islr_retention_percentage > 100)
    ) {
      setError('El porcentaje de retención de ISLR debe estar entre 0 y 100');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuración de Facturación</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-800">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3 text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre de la Empresa *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Tu empresa S.A."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>RIF (sin guiones) *</Label>
                <Input
                  value={formData.company_rif}
                  onChange={(e) =>
                    setFormData({ ...formData, company_rif: e.target.value })
                  }
                  placeholder="1234567890"
                  maxLength={10}
                  className="mt-1"
                  required
                />
                {formData.company_rif && !validateRIF(formData.company_rif) && (
                  <p className="text-xs text-red-600 mt-1">
                    RIF debe ser 9 o 10 dígitos
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label>Dirección *</Label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Calle, número, edificio"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Ciudad *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Caracas"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Estado *</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Miranda"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label>Código Postal</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="1010"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+58 212 1234567"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@empresa.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Sitio Web</Label>
                <Input
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://www.empresa.com"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Impuestos (Venezuela)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Porcentaje de IVA (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tax_percentage: parseFloat(e.target.value),
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">Tasa estándar: 16%</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enable_iva_retention}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enable_iva_retention: e.target.checked,
                      })
                    }
                  />
                  Habilitar Retención de IVA
                </Label>
                {formData.enable_iva_retention && (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.iva_retention_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iva_retention_percentage: parseFloat(e.target.value),
                      })
                    }
                    placeholder="Porcentaje de retención"
                    className="mt-1"
                  />
                )}
                <p className="text-xs text-gray-600">
                  Retención sobre el monto del IVA (típicamente 75%)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.enable_islr_retention}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        enable_islr_retention: e.target.checked,
                      })
                    }
                  />
                  Habilitar Retención de ISLR
                </Label>
                {formData.enable_islr_retention && (
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.islr_retention_percentage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        islr_retention_percentage: parseFloat(e.target.value),
                      })
                    }
                    placeholder="Porcentaje de retención"
                    className="mt-1"
                  />
                )}
                <p className="text-xs text-gray-600">
                  Retención sobre la base imponible (típicamente 0.75%)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SENIAT Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración SENIAT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Serie de Facturas</Label>
                <Input
                  value={formData.invoice_series}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invoice_series: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="A"
                  maxLength={10}
                  className="mt-1"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Ej: A, B, C (usado en número de control)
                </p>
              </div>

              <div>
                <Label>Número de Autorización SENIAT</Label>
                <Input
                  value={formData.seniat_authorization_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seniat_authorization_number: e.target.value,
                    })
                  }
                  placeholder="0000000000000"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Fecha de Autorización SENIAT</Label>
                <Input
                  type="date"
                  value={formData.seniat_authorization_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      seniat_authorization_date: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Formatting */}
        <Card>
          <CardHeader>
            <CardTitle>Formato de Facturas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Color del Encabezado</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="color"
                    value={formData.invoice_header_color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_header_color: e.target.value,
                      })
                    }
                    className="h-10 w-20"
                  />
                  <Input
                    type="text"
                    value={formData.invoice_header_color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_header_color: e.target.value,
                      })
                    }
                    placeholder="#1a3a52"
                    className="flex-1"
                  />
                </div>
                {!validateHexColor(formData.invoice_header_color) && (
                  <p className="text-xs text-red-600 mt-1">Color inválido</p>
                )}
              </div>

              <div>
                <Label>Ruta del Logo</Label>
                <Input
                  value={formData.logo_path}
                  onChange={(e) =>
                    setFormData({ ...formData, logo_path: e.target.value })
                  }
                  placeholder="/uploads/logo.png"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Texto de Pie de Página</Label>
                <textarea
                  value={formData.invoice_footer_text}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_footer_text: e.target.value })
                  }
                  placeholder="Términos y condiciones, agradecimiento, etc."
                  className="w-full px-3 py-2 border rounded mt-1"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Condiciones de Pago</Label>
                <textarea
                  value={formData.payment_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: e.target.value })
                  }
                  placeholder="30 días desde la fecha de factura, etc."
                  className="w-full px-3 py-2 border rounded mt-1"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 flex-1"
          >
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
          </Button>
        </div>
      </form>
    </div>
  );
}
