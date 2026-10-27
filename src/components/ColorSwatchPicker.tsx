import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ColorSwatchPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}

export const ColorSwatchPicker: React.FC<ColorSwatchPickerProps> = ({ colors, value, onChange }) => (
  <div className="grid grid-cols-8 gap-2" role="radiogroup">
    {colors.map(color => {
      const isSelected = value === color;
      return (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={isSelected}
          aria-label={color}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isSelected && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        >
          {isSelected && <Check className="h-4 w-4 text-white drop-shadow" />}
        </button>
      );
    })}
  </div>
);
