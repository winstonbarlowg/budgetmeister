import { CategorizedTransaction, Category } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TransactionRow } from './TransactionRow';

interface TransactionReviewTableProps {
  transactions: CategorizedTransaction[];
  categories: Category[];
  filter: string;
  onFilterChange: (filter: string) => void;
  onCategoryChange: (transactionId: string, categoryId: string) => void;
  onExcludeToggle: (transactionId: string, excluded: boolean) => void;
}

export const TransactionReviewTable: React.FC<TransactionReviewTableProps> = ({
  transactions,
  categories,
  filter,
  onFilterChange,
  onCategoryChange,
  onExcludeToggle
}) => {
  // Filter transactions based on confidence
  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'uncategorized') return !t.suggestedCategoryId;
    if (filter === 'high') return (t.confidence || 0) > 0.8;
    if (filter === 'medium') return (t.confidence || 0) > 0.5 && (t.confidence || 0) <= 0.8;
    if (filter === 'low') return (t.confidence || 0) > 0 && (t.confidence || 0) <= 0.5;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Review Transactions</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'uncategorized' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('uncategorized')}
            >
              Uncategorized
            </Button>
            <Button
              variant={filter === 'low' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange('low')}
            >
              Low
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions match the selected filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map(transaction => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                onCategoryChange={onCategoryChange}
                onExcludeToggle={onExcludeToggle}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
