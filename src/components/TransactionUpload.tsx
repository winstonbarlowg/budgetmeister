import { Upload } from 'lucide-react';
import { Button } from './ui/button';

interface TransactionUploadProps {
  onUpload: (file: File) => void;
  isProcessing?: boolean;
}

export const TransactionUpload: React.FC<TransactionUploadProps> = ({ onUpload, isProcessing = false }) => {
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
    </div>
  );
};
