import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { exchangeRatesApi } from '@/lib/api';
import { handleApiError } from '@/lib/api/client';
import { RefreshCw, ArrowRightLeft, TrendingUp } from 'lucide-react';

export default function ExchangeRates() {
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('VES');
  const [amount, setAmount] = useState<number>(1);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  const queryClient = useQueryClient();

  const { data: rates, isLoading } = useQuery({
    queryKey: ['exchange-rates', baseCurrency],
    queryFn: () => exchangeRatesApi.getLatest(baseCurrency),
  });

  const updateMutation = useMutation({
    mutationFn: exchangeRatesApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      alert('Tasas de cambio actualizadas exitosamente');
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ amount, from, to }: { amount: number; from: string; to: string }) =>
      exchangeRatesApi.convert(amount, from, to),
    onSuccess: (data) => {
      setConvertedAmount(data.converted_amount);
    },
    onError: (error) => {
      alert(handleApiError(error));
    },
  });

  const handleUpdateRates = () => {
    if (confirm('¿Actualizar las tasas de cambio desde la API externa?')) {
      updateMutation.mutate();
    }
  };

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    convertMutation.mutate({ amount, from: convertFrom, to: convertTo });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Tasas de Cambio</h1>
        <Button onClick={handleUpdateRates} disabled={updateMutation.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${updateMutation.isPending ? 'animate-spin' : ''}`} />
          Actualizar Tasas
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasas actuales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tasas Actuales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="base">Moneda Base</Label>
              <select
                id="base"
                className="w-full px-3 py-2 border rounded-md mt-1"
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value)}
              >
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
                <option value="VES">VES - Bolívar Venezolano</option>
              </select>
            </div>

            {rates && (
              <>
                <div className="text-sm text-gray-500">
                  Última actualización: {formatDate(rates.last_updated)}
                </div>

                <div className="space-y-2">
                  {Object.entries(rates.rates).map(([currency, rate]) => (
                    <div
                      key={currency}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="font-medium">{currency}</span>
                      <span className="text-lg font-bold">
                        {typeof rate === 'number' ? rate.toFixed(4) : rate}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Conversor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Conversor de Monedas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <Label htmlFor="amount">Cantidad</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="from">De</Label>
                <select
                  id="from"
                  className="w-full px-3 py-2 border rounded-md"
                  value={convertFrom}
                  onChange={(e) => setConvertFrom(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="VES">VES</option>
                </select>
              </div>

              <div>
                <Label htmlFor="to">A</Label>
                <select
                  id="to"
                  className="w-full px-3 py-2 border rounded-md"
                  value={convertTo}
                  onChange={(e) => setConvertTo(e.target.value)}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="VES">VES</option>
                </select>
              </div>

              <Button type="submit" className="w-full" disabled={convertMutation.isPending}>
                Convertir
              </Button>

              {convertedAmount !== null && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-gray-600">Resultado:</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {amount} {convertFrom} = {convertedAmount.toFixed(2)} {convertTo}
                  </div>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
