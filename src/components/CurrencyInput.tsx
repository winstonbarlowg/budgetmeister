import { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '../utils/calculations';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  id?: string;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  className = '',
  id,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      // When entering edit mode, show the raw number value (or empty string if 0)
      setInputValue(value === 0 ? '' : value.toString());
      // Focus and select all text
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, value]);

  const handleBlur = () => {
    setIsEditing(false);
    // Parse the input value and update
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue !== value) {
      onChange(numValue);
    } else if (inputValue === '' && value !== 0) {
      onChange(0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        id={id}
        type="number"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        step="0.01"
        min="0"
        className={`${className} px-3 py-2 border rounded-md text-right`}
        placeholder="0.00"
      />
    );
  }

  return (
    <div
      id={id}
      onClick={() => setIsEditing(true)}
      className={`${className} px-3 py-2 cursor-pointer hover:bg-accent/50 rounded-md transition-colors text-right font-bold`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsEditing(true);
        }
      }}
    >
      {formatCurrency(value)}
    </div>
  );
};
