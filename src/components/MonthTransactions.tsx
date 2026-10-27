import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Search } from 'lucide-react';
import { Category, MonthData, MonthTransaction } from '../types';
import { formatCurrency, getMonthName } from '../utils/calculations';
import {
  INCOME_CATEGORY_ID,
  countsAsExpense,
  recalculateImportedExpenses,
  signedAmount,
  updateTransaction,
} from '../utils/monthTransactions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface MonthTransactionsProps {
  categories: Category[];
  monthData: MonthData;
  onSave: (data: MonthData) => Promise<void>;
  disabled?: boolean;
}

const ACCOUNT_BADGE_STYLES: Record<string, string> = {
  Amex: 'bg-info/15 text-info border-info/30',
  HSBC: 'bg-highlight/15 text-highlight border-highlight/30',
};

type StatusFilter = 'all' | 'included' | 'excluded';

export const MonthTransactions: React.FC<MonthTransactionsProps> = ({
  categories,
  monthData,
  onSave,
  disabled = false,
}) => {
  const [accountFilter, setAccountFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const transactions = monthData.transactions || [];
  const accounts = useMemo(() => [...new Set(transactions.map(t => t.account))].sort(), [transactions]);

  const filtered = transactions.filter(t => {
    if (accountFilter !== 'all' && t.account !== accountFilter) return false;
    if (statusFilter === 'included' && t.excluded) return false;
    if (statusFilter === 'excluded' && !t.excluded) return false;
    if (categoryFilter === 'uncategorised' && t.categoryId) return false;
    if (categoryFilter !== 'all' && categoryFilter !== 'uncategorised' && t.categoryId !== categoryFilter) return false;
    if (search) {
      const needle = search.toLowerCase();
      return t.description.toLowerCase().includes(needle) || (t.merchant || '').toLowerCase().includes(needle);
    }
    return true;
  });

  const countedTotal = recalculateImportedExpenses(monthData).reduce((sum, e) => sum + (e.importedAmount || 0), 0);
  const excludedCount = transactions.filter(t => t.excluded).length;
  const filteredTotal = filtered.filter(countsAsExpense).reduce((sum, t) => sum + signedAmount(t), 0);

  const handleCategoryChange = (transaction: MonthTransaction, categoryId: string) => {
    onSave(updateTransaction(monthData, transaction.id, { categoryId }));
  };

  const handleIncludeToggle = (transaction: MonthTransaction, included: boolean) => {
    onSave(updateTransaction(monthData, transaction.id, {
      excluded: !included,
      excludeReason: included ? undefined : 'Excluded manually',
    }));
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions</CardTitle>
        <CardDescription>
          {transactions.length} transactions in {getMonthName(monthData.month)} {monthData.year} •{' '}
          {formatCurrency(countedTotal)} counted towards expenses • {excludedCount} excluded
        </CardDescription>
        {disabled && (
          <p className="text-sm text-warning font-medium pt-1">
            Save your expense changes above before editing transactions.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1">
            {['all', ...accounts].map(account => (
              <Button
                key={account}
                size="sm"
                variant={accountFilter === account ? 'default' : 'outline'}
                onClick={() => setAccountFilter(account)}
              >
                {account === 'all' ? 'All accounts' : account}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            {(['all', 'included', 'excluded'] as StatusFilter[]).map(status => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status === 'included' ? 'Included' : 'Excluded'}
              </Button>
            ))}
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="uncategorised">Uncategorised</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
              ))}
              <SelectItem value={INCOME_CATEGORY_ID}>Income</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transactions"
              className="pl-9 h-9"
            />
          </div>
        </div>

        {filtered.length !== transactions.length && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {transactions.length} • {formatCurrency(filteredTotal)} counted
          </p>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(transaction => (
              <div
                key={transaction.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${transaction.excluded ? 'opacity-60 bg-muted' : ''}`}
              >
                <Checkbox
                  checked={!transaction.excluded}
                  disabled={disabled}
                  onCheckedChange={checked => handleIncludeToggle(transaction, checked === true)}
                  title={transaction.excluded ? 'Click to include in expenses' : 'Click to exclude from expenses'}
                />
                <div className="w-16 shrink-0 text-xs text-muted-foreground">
                  {format(parseISO(transaction.date), 'dd MMM')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate" title={transaction.description}>
                    {transaction.merchant || transaction.description}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {transaction.merchant ? `${transaction.description} • ` : ''}
                    {transaction.type}
                    {transaction.excluded && transaction.excludeReason && (
                      <span className="text-warning"> • {transaction.excludeReason}</span>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={ACCOUNT_BADGE_STYLES[transaction.account] || ''}
                  title={transaction.accountName}
                >
                  {transaction.account}
                </Badge>
                <div
                  className={`w-24 shrink-0 text-right font-semibold tabular-nums ${transaction.direction === 'credit' ? 'text-success' : ''}`}
                >
                  {transaction.direction === 'credit' ? '+' : ''}
                  {formatCurrency(transaction.amount)}
                </div>
                <Select
                  value={transaction.categoryId || ''}
                  onValueChange={value => handleCategoryChange(transaction, value)}
                  disabled={disabled || transaction.excluded}
                >
                  <SelectTrigger className="w-[180px] shrink-0">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                    <SelectItem value={INCOME_CATEGORY_ID}>Income (not spending)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
