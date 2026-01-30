import { CategorizedTransaction } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { formatCurrency } from '../utils/calculations';

interface TransactionSummaryProps {
  transactions: CategorizedTransaction[];
}

export const TransactionSummary: React.FC<TransactionSummaryProps> = ({ transactions }) => {
  const stats = {
    total: transactions.length,
    highConfidence: transactions.filter(t => (t.confidence || 0) > 0.8).length,
    mediumConfidence: transactions.filter(t => (t.confidence || 0) > 0.5 && (t.confidence || 0) <= 0.8).length,
    lowConfidence: transactions.filter(t => (t.confidence || 0) > 0 && (t.confidence || 0) <= 0.5).length,
    uncategorized: transactions.filter(t => !t.suggestedCategoryId).length,
    totalAmount: transactions.reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : 0), 0),
    duplicates: transactions.filter(t => t.isDuplicate).length,
    excluded: transactions.filter(t => t.isExcluded).length,
    refunds: transactions.filter(t => t.transactionType === 'refund' || t.transactionType === 'payment').length
  };

  const hasDuplicates = stats.duplicates > 0;
  const hasExcluded = stats.excluded > 0;

  const gridCols = hasDuplicates && hasExcluded ? 'md:grid-cols-6' :
                   hasDuplicates || hasExcluded ? 'md:grid-cols-5' :
                   'md:grid-cols-4';

  return (
    <div className={`grid gap-4 ${gridCols}`}>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Transactions</CardDescription>
          <CardTitle className="text-3xl">{stats.total}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Total: {formatCurrency(stats.totalAmount)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>High Confidence</CardDescription>
          <CardTitle className="text-3xl text-green-600">{stats.highConfidence}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Auto-approved ready</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Needs Review</CardDescription>
          <CardTitle className="text-3xl text-yellow-600">
            {stats.mediumConfidence + stats.lowConfidence}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Medium/Low confidence</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Uncategorized</CardDescription>
          <CardTitle className="text-3xl text-red-600">{stats.uncategorized}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Requires manual category</p>
        </CardContent>
      </Card>

      {hasDuplicates && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader className="pb-2">
            <CardDescription>Duplicate Transactions</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{stats.duplicates}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Found in same import</p>
          </CardContent>
        </Card>
      )}

      {hasExcluded && (
        <Card className="border-gray-300 bg-gray-50">
          <CardHeader className="pb-2">
            <CardDescription>Excluded</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{stats.excluded}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Won't be applied</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
