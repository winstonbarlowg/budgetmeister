import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getBankDisplayName } from '../utils/csvParser';

interface TransactionUploadProps {
  onUpload: (file: File) => void;
  isProcessing?: boolean;
  selectedBank: string | null;
  onBankChange: (bank: string) => void;
}

export const TransactionUpload: React.FC<TransactionUploadProps> = ({
  onUpload,
  isProcessing = false,
  selectedBank,
  onBankChange
}) => {
  const bankOptions = [
    { value: 'auto', label: 'Auto-detect bank format' },
    { value: 'amex-uk', label: getBankDisplayName('amex-uk') },
    { value: 'barclays', label: getBankDisplayName('barclays') },
    { value: 'hsbc', label: getBankDisplayName('hsbc') },
    { value: 'monzo', label: getBankDisplayName('monzo') },
    { value: 'starling', label: getBankDisplayName('starling') },
    { value: 'generic', label: getBankDisplayName('generic') },
  ];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const openFilePicker = () => {
    if (!isProcessing) fileInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!isProcessing && files.length > 0 && files[0].name.toLowerCase().endsWith('.csv')) {
      onUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
    e.target.value = ''; // allow picking the same file again
  };

  return (
    <div className="space-y-4">
      {/* Bank selector */}
      <div className="space-y-2 rounded-lg border border-info/30 bg-info/10 p-4">
        <Label htmlFor="bank-format">Bank Format</Label>
        <Select value={selectedBank || 'auto'} onValueChange={onBankChange}>
          <SelectTrigger id="bank-format" className="w-full">
            <SelectValue placeholder="Select bank format" />
          </SelectTrigger>
          <SelectContent>
            {bankOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Select your bank to ensure correct transaction parsing. Use "Auto-detect" if unsure.
        </p>
      </div>

      {/* Drop zone: click, keyboard or drag a file onto it */}
      <div
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-disabled={isProcessing}
        onClick={openFilePicker}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        className={cn(
          'rounded-lg border-2 border-dashed p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isProcessing ? 'cursor-wait opacity-60' : 'cursor-pointer hover:border-primary hover:bg-muted/40',
          isDragging && 'border-primary bg-primary/5'
        )}
      >
        <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-4 text-sm text-muted-foreground">
          {isProcessing ? 'Processing...' : isDragging ? 'Drop the CSV file to import it' : 'Drag & drop a CSV file here, or click to browse'}
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          onClick={e => e.stopPropagation()}
          className="hidden"
          disabled={isProcessing}
        />
        <Button variant="outline" type="button" disabled={isProcessing} tabIndex={-1}>
          Choose File
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Supports: Amex UK, Barclays, HSBC, Monzo, Starling, and generic CSV formats
        </p>
      </div>
    </div>
  );
};
