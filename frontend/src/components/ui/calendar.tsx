import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface CalendarProps {
  startDate?: string;
  endDate?: string;
  onDateSelect?: (date: string) => void;
}

export function Calendar({ startDate, endDate, onDateSelect }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(
    startDate ? new Date(startDate) : new Date()
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentMonth.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const isDateInRange = (day: number): boolean => {
    if (!startDate || !endDate) return false;

    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const date = new Date(dateStr);
    const start = new Date(startDate);
    const end = new Date(endDate);

    return date >= start && date <= end;
  };

  const isStartDate = (day: number): boolean => {
    if (!startDate) return false;

    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return dateStr === startDate;
  };

  const isEndDate = (day: number): boolean => {
    if (!endDate) return false;

    const dateStr = `${currentMonth.getFullYear()}-${String(
      currentMonth.getMonth() + 1
    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return dateStr === endDate;
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goToPreviousMonth}
          className="p-1"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold capitalize text-gray-900">
          {monthName}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          className="p-1"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 h-8 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty days */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-8"></div>
        ))}

        {/* Days with highlighting */}
        {days.map((day) => {
          const inRange = isDateInRange(day);
          const isStart = isStartDate(day);
          const isEnd = isEndDate(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                const dateStr = `${currentMonth.getFullYear()}-${String(
                  currentMonth.getMonth() + 1
                ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                onDateSelect?.(dateStr);
              }}
              className={`h-8 text-sm rounded flex items-center justify-center transition-colors ${
                isStart || isEnd
                  ? 'bg-blue-600 text-white font-semibold'
                  : inRange
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {startDate && endDate && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-blue-600 rounded"></div>
            <span className="text-gray-600">Fecha inicio/fin</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span className="text-gray-600">Período reservado</span>
          </div>
        </div>
      )}
    </div>
  );
}
