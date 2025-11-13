import { type ReactNode } from 'react';
import { LayoutGrid, Rows } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'table';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
  options?: Array<{
    value: ViewMode;
    label: string;
    icon: ReactNode;
  }>;
}

const defaultOptions = [
  { value: 'grid' as ViewMode, label: 'Tarjetas', icon: <LayoutGrid className="h-4 w-4" /> },
  { value: 'table' as ViewMode, label: 'Tabla', icon: <Rows className="h-4 w-4" /> },
];

export function ViewToggle({ value, onChange, className, options = defaultOptions }: ViewToggleProps) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg border bg-white p-1', className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'ghost'}
          className={cn(
            'flex items-center gap-2 text-sm',
            value === option.value ? 'shadow-sm' : 'text-gray-600 hover:text-gray-900'
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </Button>
      ))}
    </div>
  );
}
