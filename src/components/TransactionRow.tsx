import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, AlertTriangle, Copy, CreditCard } from 'lucide-react';
import { CategorizedTransaction, Category } from '../types';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatCurrency } from '../utils/calculations';

interface TransactionRowProps {
  transaction: CategorizedTransaction;
  categories: Category[];
  onCategoryChange: (transactionId: string, categoryId: string) => void;
  onExcludeToggle: (transactionId: string, excluded: boolean) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  categories,
  onCategoryChange,
  onExcludeToggle
}) => {
  const confidenceColor =
    !transaction.confidence ? 'bg-destructive/10 border-destructive/30' :
    transaction.confidence > 0.8 ? 'bg-success/10 border-success/30' :
    'bg-warning/10 border-warning/30';

  const confidenceIcon =
    !transaction.confidence ? <AlertCircle className="h-4 w-4 text-destructive" /> :
    transaction.confidence > 0.8 ? <CheckCircle2 className="h-4 w-4 text-success" /> :
    <AlertTriangle className="h-4 w-4 text-warning" />;

  const isExcluded = transaction.isExcluded || false;
  const isRefund = transaction.transactionType === 'refund' || transaction.transactionType === 'payment';

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${confidenceColor} ${isExcluded ? 'opacity-50 bg-muted' : ''}`}>
      <div className="flex items-center gap-3 flex-1">
        <Checkbox
          checked={!isExcluded}
          onCheckedChange={(checked) => onExcludeToggle(transaction.id, checked !== true)}
          title={isExcluded ? 'Click to include in expenses' : 'Click to exclude from expenses'}
        />
        {confidenceIcon}
        <div className="flex-1">
          <div className="font-medium">{transaction.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(transaction.date, 'dd MMM yyyy')} • {formatCurrency(transaction.amount)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isRefund && (
          <Badge variant="secondary" className="gap-1 bg-success/15 text-success border-success/30">
            <CreditCard className="h-3 w-3" />
            {transaction.transactionType === 'refund' ? 'Refund' : 'Payment'}
          </Badge>
        )}

        {transaction.isDuplicate && (
          <Badge variant="destructive" className="gap-1">
            <Copy className="h-3 w-3" />
            Duplicate
          </Badge>
        )}

        {transaction.confidence && (
          <Badge variant="outline">
            {Math.round(transaction.confidence * 100)}%
          </Badge>
        )}

        <Select
          value={transaction.finalCategoryId || transaction.suggestedCategoryId || ''}
          onValueChange={(value) => onCategoryChange(transaction.id, value)}
          disabled={isExcluded}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
