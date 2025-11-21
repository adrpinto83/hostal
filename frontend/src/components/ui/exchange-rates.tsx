import { useEffect, useState } from 'react';
import { Card } from './card';

interface ExchangeRates {
  USD: number;
  EUR: number;
  timestamp: string;
}

export function ExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    fetchRates();
    // Actualizar cada 30 minutos
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchRates = async () => {
    try {
      const response = await fetch('/api/v1/exchange-rates/current');
      if (response.ok) {
        const data = await response.json();
        setRates(data);
        setLastUpdate(new Date().toLocaleTimeString('es-VE'));
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !rates) {
    return (
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="text-center text-sm text-gray-500">Cargando tasas...</div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* USD */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-600 uppercase font-semibold">USD</div>
          <div className="text-lg font-bold text-blue-600">
            ${rates.USD.toFixed(2)} Bs
          </div>
        </div>

        {/* EUR */}
        <div className="flex flex-col items-center">
          <div className="text-xs text-gray-600 uppercase font-semibold">EUR</div>
          <div className="text-lg font-bold text-amber-600">
            €{rates.EUR.toFixed(2)} Bs
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-gray-500 text-center">
          <div>Actualizado</div>
          <div className="font-semibold">{lastUpdate || 'hace poco'}</div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchRates}
          className="text-xs px-3 py-1 rounded bg-white border border-gray-300 hover:bg-gray-50 transition text-gray-700"
        >
          Actualizar
        </button>
      </div>
    </Card>
  );
}

// Componente simplificado para mostrar en línea
export function ExchangeRatesInline() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/v1/exchange-rates/current');
        if (response.ok) {
          const data = await response.json();
          setRates(data);
        }
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };

    fetchRates();
    const interval = setInterval(fetchRates, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!rates) {
    return <span className="text-xs text-gray-500">Tasas...</span>;
  }

  return (
    <span className="text-sm font-medium text-gray-700">
      $ {rates.USD.toFixed(2)} Bs | € {rates.EUR.toFixed(2)} Bs
    </span>
  );
}
