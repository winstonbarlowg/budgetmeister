import { Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getBankDisplayName } from '../utils/csvParser';

interface TransactionUploadProps {
  onUpload: (file: File) => void;
  isProcessing?: boolean;
  detectedBank?: string | null;
  selectedBank?: string | null;
  onBankChange?: (bank: string) => void;
}

export const TransactionUpload: React.FC<TransactionUploadProps> = ({
  onUpload,
  isProcessing = false,
  detectedBank,
  selectedBank,
  onBankChange
}) => {
  const bankOptions = [
    { value: 'amex-uk', label: getBankDisplayName('amex-uk') },
    { value: 'barclays', label: getBankDisplayName('barclays') },
    { value: 'hsbc', label: getBankDisplayName('hsbc') },
    { value: 'monzo', label: getBankDisplayName('monzo') },
    { value: 'starling', label: getBankDisplayName('starling') },
    { value: 'generic', label: getBankDisplayName('generic') },
  ];
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      onUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
    >
      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground mb-4">
        {isProcessing ? 'Processing...' : 'Drag & drop CSV file here, or click to browse'}
      </p>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
        id="csv-upload"
        disabled={isProcessing}
      />
      <label htmlFor="csv-upload">
        <Button variant="outline" disabled={isProcessing} type="button" onClick={(e) => {
          if (!isProcessing) {
            document.getElementById('csv-upload')?.click();
          }
          e.preventDefault();
        }}>
          Choose File
        </Button>
      </label>
      <p className="text-xs text-muted-foreground mt-4">
        Supports: Amex UK, Barclays, HSBC, Monzo, Starling, and generic CSV formats
      </p>

      {detectedBank && onBankChange && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-muted-foreground mb-2">
            Detected format: <span className="font-semibold">{getBankDisplayName(detectedBank)}</span>
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium">Bank Format:</label>
            <Select value={selectedBank || detectedBank} onValueChange={onBankChange}>
              <SelectTrigger className="w-[200px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bankOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
