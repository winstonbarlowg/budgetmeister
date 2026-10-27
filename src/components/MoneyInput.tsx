import * as React from 'react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
}

// Number input with a £ prefix; an empty box reads as 0
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, className, ...props }, ref) => (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className={cn('pl-7 tabular-nums', className)}
        value={Number.isFinite(value) && value !== 0 ? value : ''}
        placeholder="0.00"
        onChange={e => onChange(e.target.value === '' ? 0 : e.target.valueAsNumber)}
        {...props}
      />
    </div>
  )
);
MoneyInput.displayName = 'MoneyInput';
