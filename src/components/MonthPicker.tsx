import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMonthName, getMonthShortName } from '../utils/calculations';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

interface MonthPickerProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({ year, month, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(year);

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setViewYear(year);
    setOpen(isOpen);
  };

  const handleSelect = (selectedMonth: number) => {
    setOpen(false);
    if (viewYear !== year || selectedMonth !== month) {
      onSelect(viewYear, selectedMonth);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg px-2 -mx-2 text-3xl font-semibold leading-none tracking-tight hover:bg-accent transition-colors"
          title="Choose a month"
        >
          {getMonthName(month)} {year}
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={() => setViewYear(viewYear - 1)} aria-label="Previous year">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">{viewYear}</span>
          <Button variant="ghost" size="icon" onClick={() => setViewYear(viewYear + 1)} aria-label="Next year">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
            const isSelected = viewYear === year && m === month;
            const isToday = viewYear === todayYear && m === todayMonth;
            return (
              <Button
                key={m}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                className={isToday && !isSelected ? 'border-primary font-bold' : ''}
                onClick={() => handleSelect(m)}
              >
                {getMonthShortName(m)}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
