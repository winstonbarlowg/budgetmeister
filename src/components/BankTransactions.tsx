import { useState } from 'react';
import { BudgetConfig, CategorizedTransaction } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TransactionUpload } from './TransactionUpload';
import { TransactionSummary } from './TransactionSummary';
import { TransactionReviewTable } from './TransactionReviewTable';
import { parseBankCSV } from '../utils/csvParser';
import { categorizeTransactions, learnFromCorrection } from '../utils/categorization';
import { fileSystemManager } from '../utils/fileSystem';

interface BankTransactionsProps {
  config: BudgetConfig;
  currentYear: number;
  currentMonth: number;
  onConfigUpdate: (config: BudgetConfig) => Promise<void>;
  onApplyToMonth: (transactions: CategorizedTransaction[], year: number, month: number) => Promise<void>;
}

export const BankTransactions: React.FC<BankTransactionsProps> = ({
  config,
  currentYear,
  currentMonth,
  onConfigUpdate: _onConfigUpdate,
  onApplyToMonth
}) => {
  const [importedTransactions, setImportedTransactions] = useState<CategorizedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'uncategorized'>('all');
  const [bankSource, setBankSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      // 1. Parse CSV
      const { transactions, bankSource: detectedBank } = await parseBankCSV(file);
      setBankSource(detectedBank);

      // 2. Auto-categorize
      const transactionConfig = await fileSystemManager.loadTransactionConfig();
      const categorized = categorizeTransactions(
        transactions,
        config.categories,
        transactionConfig.rules
      );

      // 3. Set state
      setImportedTransactions(categorized);
      setImportSessionId(Date.now().toString());

      // Auto-filter to uncategorized if there are any
      const uncategorizedCount = categorized.filter(t => !t.suggestedCategoryId).length;
      if (uncategorizedCount > 0) {
        setFilter('uncategorized');
      } else {
        setFilter('all');
      }
    } catch (error) {
      alert(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    // Update transaction category
    const updatedTransactions = importedTransactions.map(t => {
      if (t.id === transactionId) {
        return {
          ...t,
          finalCategoryId: categoryId,
          isReviewed: true
        };
      }
      return t;
    });

    setImportedTransactions(updatedTransactions);

    // Learn from correction if it's different from suggested
    const transaction = importedTransactions.find(t => t.id === transactionId);
    if (transaction && transaction.suggestedCategoryId !== categoryId) {
      const transactionConfig = await fileSystemManager.loadTransactionConfig();
      const newRule = learnFromCorrection(transaction, categoryId, transactionConfig.rules);
      await fileSystemManager.addCategorizationRule(newRule);
    }
  };

  const handleApplyToMonth = async () => {
    if (!importSessionId) return;

    try {
      // Apply to current month
      await onApplyToMonth(importedTransactions, currentYear, currentMonth);

      // Save import session
      const categorizedCount = importedTransactions.filter(
        t => t.suggestedCategoryId || t.finalCategoryId
      ).length;

      await fileSystemManager.saveImportSession({
        id: importSessionId,
        fileName,
        importDate: new Date().toISOString(),
        bankSource: bankSource || undefined,
        transactionCount: importedTransactions.length,
        categorizedCount,
        appliedToMonth: true,
        targetYear: currentYear,
        targetMonth: currentMonth
      });

      // Mark all as applied
      setImportedTransactions(importedTransactions.map(t => ({ ...t, isApplied: true })));

      alert(`Successfully applied ${importedTransactions.length} transactions to ${currentMonth}/${currentYear}`);
    } catch (error) {
      alert(`Failed to apply transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const allReviewed = importedTransactions.length > 0 &&
    importedTransactions.every(t => t.suggestedCategoryId || t.finalCategoryId);

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Bank Transactions</CardTitle>
          <CardDescription>Upload CSV files from UK banks or Amex</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionUpload onUpload={handleFileUpload} isProcessing={isProcessing} />
          {bankSource && (
            <div className="mt-4 text-sm text-muted-foreground">
              Detected format: <span className="font-semibold">{bankSource}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review section (shown after upload) */}
      {importedTransactions.length > 0 && (
        <>
          <TransactionSummary transactions={importedTransactions} />

          <TransactionReviewTable
            transactions={importedTransactions}
            categories={config.categories}
            filter={filter}
            onFilterChange={(newFilter) => setFilter(newFilter as 'all' | 'high' | 'medium' | 'low' | 'uncategorized')}
            onCategoryChange={handleCategoryChange}
          />

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Ready to apply transactions to <span className="font-semibold">{currentMonth}/{currentYear}</span>
                  </p>
                  {!allReviewed && (
                    <p className="text-xs text-yellow-600">
                      Some transactions are uncategorized. They will be skipped.
                    </p>
                  )}
                </div>
                <Button onClick={handleApplyToMonth} size="lg" disabled={importedTransactions.every(t => t.isApplied)}>
                  {importedTransactions.some(t => t.isApplied) ? 'Applied' : 'Apply to Monthly Expenses'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Import history (optional) */}
      {!isProcessing && importedTransactions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Imports</CardTitle>
            <CardDescription>View your import history</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No import history yet. Upload a CSV file to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
