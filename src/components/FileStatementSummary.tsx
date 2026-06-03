import { CategorizedTransaction } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { formatCurrency, getMonthName } from '../utils/calculations';
import { getBankDisplayName } from '../utils/csvParser';
import { X } from 'lucide-react';

interface FileStatementSummaryProps {
  fileName: string;
  bankSource: string | null;
  transactions: CategorizedTransaction[];
  onCancel: () => void;
}

export const FileStatementSummary: React.FC<FileStatementSummaryProps> = ({
  fileName,
  bankSource,
  transactions,
  onCancel
}) => {
  // Calculate statement period from transaction dates
  const getStatementPeriod = (): string => {
    if (transactions.length === 0) return 'N/A';

    const dates = transactions.map(t => t.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const minMonth = getMonthName(minDate.getMonth() + 1);
    const minYear = minDate.getFullYear();
    const maxMonth = getMonthName(maxDate.getMonth() + 1);
    const maxYear = maxDate.getFullYear();

    if (minMonth === maxMonth && minYear === maxYear) {
      return `${minMonth} ${minYear}`;
    } else if (minYear === maxYear) {
      return `${minMonth} - ${maxMonth} ${minYear}`;
    } else {
      return `${minMonth} ${minYear} - ${maxMonth} ${maxYear}`;
    }
  };

  // Calculate total debit amount
  const totalDebitAmount = transactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Card className="border-info/30 bg-info/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Statement Summary</CardTitle>
            <CardDescription className="mt-1">
              {getBankDisplayName(bankSource)}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">File Name</p>
            <p className="font-medium truncate" title={fileName}>{fileName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Period</p>
            <p className="font-medium">{getStatementPeriod()}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Transactions</p>
            <p className="font-medium">{transactions.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Total Debits</p>
            <p className="font-bold text-info">{formatCurrency(totalDebitAmount)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
