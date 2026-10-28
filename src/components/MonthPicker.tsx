import { useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { getMonthName, getMonthShortName } from '../utils/calculations';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface MonthGridProps {
  selected: { year: number; month: number } | null;
  initialYear: number;
  onSelect: (year: number, month: number) => void;
}

// Year navigation plus a 3x4 grid of months; the real current month is outlined
const MonthGrid: React.FC<MonthGridProps> = ({ selected, initialYear, onSelect }) => {
  const [viewYear, setViewYear] = useState(initialYear);

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear(viewYear - 1)} aria-label="Previous year">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold">{viewYear}</span>
        <Button type="button" variant="ghost" size="icon" onClick={() => setViewYear(viewYear + 1)} aria-label="Next year">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const isSelected = selected?.year === viewYear && selected.month === m;
          const isToday = viewYear === todayYear && m === todayMonth;
          return (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={isSelected ? 'default' : 'outline'}
              className={isToday && !isSelected ? 'border-primary font-bold' : ''}
              onClick={() => onSelect(viewYear, m)}
            >
              {getMonthShortName(m)}
            </Button>
          );
        })}
      </div>
    </>
  );
};

interface MonthPickerProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
}

// Large month title that opens the month grid (Monthly Entry header)
export const MonthPicker: React.FC<MonthPickerProps> = ({ year, month, onSelect }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (selectedYear: number, selectedMonth: number) => {
    setOpen(false);
    if (selectedYear !== year || selectedMonth !== month) {
      onSelect(selectedYear, selectedMonth);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg px-2 -mx-2 text-xl font-semibold leading-tight tracking-tight hover:bg-accent transition-colors"
          title="Choose a month"
        >
          {getMonthName(month)} {year}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <MonthGrid selected={{ year, month }} initialYear={year} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
};

interface MonthPickerFieldProps {
  id?: string;
  value: string;                 // "YYYY-MM", or "" when empty
  onChange: (value: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

const toYearMonth = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

// Form field for picking a month, styled like the shadcn date picker
export const MonthPickerField: React.FC<MonthPickerFieldProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Pick a month',
  clearable = false,
  className,
  ...ariaProps
}) => {
  const [open, setOpen] = useState(false);
  const selected = value ? { year: parseInt(value.slice(0, 4)), month: parseInt(value.slice(5, 7)) } : null;
  const today = new Date();

  const pick = (newValue: string) => {
    onChange(newValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start font-normal aria-[invalid=true]:border-destructive',
            !selected && 'text-muted-foreground',
            className
          )}
          {...ariaProps}
        >
          <CalendarDays className="h-4 w-4 opacity-60" />
          {selected ? `${getMonthName(selected.month)} ${selected.year}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <MonthGrid
          selected={selected}
          initialYear={selected?.year ?? today.getFullYear()}
          onSelect={(year, month) => pick(toYearMonth(year, month))}
        />
        <div className="flex justify-between mt-3 pt-3 border-t">
          {clearable ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => pick('')} disabled={!selected}>
              Clear
            </Button>
          ) : <span />}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => pick(toYearMonth(today.getFullYear(), today.getMonth() + 1))}
          >
            This month
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
