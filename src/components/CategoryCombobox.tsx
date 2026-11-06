import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Category } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from './ui/command';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface CategoryComboboxProps {
  value: string | null;
  onChange: (value: string) => void;
  categories: Category[];
  // Choices outside the category list, e.g. Income or "All categories"
  leadingOptions?: ComboboxOption[];
  trailingOptions?: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Category picker you can type into, grouped into fixed and variable categories
export const CategoryCombobox: React.FC<CategoryComboboxProps> = ({
  value, onChange, categories, leadingOptions = [], trailingOptions = [],
  placeholder = 'Choose category', disabled, className,
}) => {
  const [open, setOpen] = useState(false);
  const options = [...leadingOptions, ...categories.map(c => ({ value: c.id, label: c.name })), ...trailingOptions];
  const selected = options.find(o => o.value === value);

  const groups = [
    { heading: undefined, options: leadingOptions },
    { heading: 'Fixed', options: categories.filter(c => c.type === 'fixed').map(c => ({ value: c.id, label: c.name })) },
    { heading: 'Variable', options: categories.filter(c => c.type === 'variable').map(c => ({ value: c.id, label: c.name })) },
    { heading: undefined, options: trailingOptions },
  ].filter(g => g.options.length > 0);

  const pick = (option: ComboboxOption) => {
    setOpen(false);
    if (option.value !== value) onChange(option.value);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-9 justify-between px-3 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[220px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Search categories…" />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            {groups.map((group, index) => (
              <div key={group.heading ?? `extra-${index}`}>
                {index > 0 && <CommandSeparator />}
                <CommandGroup heading={group.heading}>
                  {group.options.map(option => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      keywords={[option.label]}
                      onSelect={() => pick(option)}
                    >
                      <Check className={cn(option.value === value ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
