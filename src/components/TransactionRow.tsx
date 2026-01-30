import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { CategorizedTransaction, Category } from '../types';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatCurrency } from '../utils/calculations';

interface TransactionRowProps {
  transaction: CategorizedTransaction;
  categories: Category[];
  onCategoryChange: (transactionId: string, categoryId: string) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  categories,
  onCategoryChange
}) => {
  const confidenceColor =
    !transaction.confidence ? 'bg-red-100 border-red-300' :
    transaction.confidence > 0.8 ? 'bg-green-100 border-green-300' :
    transaction.confidence > 0.5 ? 'bg-yellow-100 border-yellow-300' :
    'bg-orange-100 border-orange-300';

  const confidenceIcon =
    !transaction.confidence ? <AlertCircle className="h-4 w-4 text-red-600" /> :
    transaction.confidence > 0.8 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
    <AlertTriangle className="h-4 w-4 text-yellow-600" />;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${confidenceColor}`}>
      <div className="flex items-center gap-3 flex-1">
        {confidenceIcon}
        <div className="flex-1">
          <div className="font-medium">{transaction.description}</div>
          <div className="text-xs text-muted-foreground">
            {format(transaction.date, 'dd MMM yyyy')} • {formatCurrency(transaction.amount)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {transaction.confidence && (
          <Badge variant="outline">
            {Math.round(transaction.confidence * 100)}%
          </Badge>
        )}

        <Select
          value={transaction.finalCategoryId || transaction.suggestedCategoryId || ''}
          onValueChange={(value) => onCategoryChange(transaction.id, value)}
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
