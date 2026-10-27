import { MonthData, MonthlyExpense, MonthTransaction } from '../types';

// Category id for income transactions; they are listed but never count as expenses
export const INCOME_CATEGORY_ID = '__income';

export function countsAsExpense(transaction: MonthTransaction): boolean {
  return !transaction.excluded && !!transaction.categoryId && transaction.categoryId !== INCOME_CATEGORY_ID;
}

export function signedAmount(transaction: MonthTransaction): number {
  return transaction.direction === 'debit' ? transaction.amount : -transaction.amount;
}

/**
 * Rebuild each category's importedAmount from the month's included transactions
 * (debits minus refunds), keeping manual adjustments on top.
 * scripts/import_emma.py mirrors this logic.
 */
export function recalculateImportedExpenses(monthData: MonthData): MonthlyExpense[] {
  const totals = new Map<string, { amount: number; ids: string[] }>();
  (monthData.transactions || []).filter(countsAsExpense).forEach(t => {
    const entry = totals.get(t.categoryId!) || { amount: 0, ids: [] };
    entry.amount += signedAmount(t);
    entry.ids.push(t.id);
    totals.set(t.categoryId!, entry);
  });

  const categoryIds = [
    ...monthData.expenses.map(e => e.categoryId),
    ...[...totals.keys()].filter(id => !monthData.expenses.some(e => e.categoryId === id)),
  ];

  return categoryIds
    .map(categoryId => {
      const manualAmount = monthData.expenses.find(e => e.categoryId === categoryId)?.manualAmount || 0;
      const imported = totals.get(categoryId);
      const importedAmount = Math.round(Math.max(0, imported?.amount || 0) * 100) / 100;
      return {
        categoryId,
        actualAmount: Math.round((importedAmount + manualAmount) * 100) / 100,
        importedAmount,
        manualAmount,
        linkedTransactionIds: imported?.ids || [],
      };
    })
    .filter(e => e.importedAmount > 0 || e.manualAmount > 0);
}

export function updateTransaction(
  monthData: MonthData,
  transactionId: string,
  changes: Partial<Pick<MonthTransaction, 'categoryId' | 'excluded' | 'excludeReason'>>
): MonthData {
  const transactions = (monthData.transactions || []).map(t =>
    t.id === transactionId ? { ...t, ...changes, userEdited: true } : t
  );
  const updated = { ...monthData, transactions };
  return { ...updated, expenses: recalculateImportedExpenses(updated) };
}
