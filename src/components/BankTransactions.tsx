import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { BudgetConfig, CategorizedTransaction, ImportSession } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { useConfirm } from './ui/confirm-dialog';
import { TransactionUpload } from './TransactionUpload';
import { TransactionSummary } from './TransactionSummary';
import { TransactionReviewTable } from './TransactionReviewTable';
import { FileStatementSummary } from './FileStatementSummary';
import { ImportHistoryItem } from './ImportHistoryItem';
import { parseBankCSV } from '../utils/csvParser';
import { categorizeTransactions, learnFromCorrection } from '../utils/categorization';
import { fileSystemManager } from '../utils/fileSystem';
import { detectDuplicates } from '../utils/duplicateDetection';

interface BankTransactionsProps {
  config: BudgetConfig;
  currentYear: number;
  currentMonth: number;
  onConfigUpdate: (config: BudgetConfig) => Promise<void>;
  onApplyToMonth: (transactions: CategorizedTransaction[], year: number, month: number) => Promise<void>;
  onDataChange?: () => Promise<void>;
}

export const BankTransactions: React.FC<BankTransactionsProps> = ({
  config,
  currentYear,
  currentMonth,
  onConfigUpdate: _onConfigUpdate,
  onApplyToMonth,
  onDataChange
}) => {
  const [importedTransactions, setImportedTransactions] = useState<CategorizedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low' | 'uncategorized'>('all');
  const [bankSource, setBankSource] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [ignoreDuplicates, setIgnoreDuplicates] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportSession[]>([]);
  const [removingSessionId, setRemovingSessionId] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string>('auto');
  const confirm = useConfirm();

  // Load import history on mount and when import is applied
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const transactionConfig = await fileSystemManager.loadTransactionConfig();
        // Sort by import date, most recent first
        const sorted = [...transactionConfig.importSessions].sort((a, b) =>
          new Date(b.importDate).getTime() - new Date(a.importDate).getTime()
        );
        setImportHistory(sorted);
      } catch (error) {
        console.error('Failed to load import history:', error);
      }
    };
    loadHistory();
  }, [importedTransactions]);

  const handleRemoveImport = async (sessionId: string) => {
    const confirmed = await confirm({
      title: 'Remove this import?',
      description: 'All transactions from this import will be removed from the monthly expenses.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!confirmed) {
      return;
    }

    setRemovingSessionId(sessionId);

    try {
      const result = await fileSystemManager.removeImportSession(sessionId);

      // Reload import history
      const transactionConfig = await fileSystemManager.loadTransactionConfig();
      const sorted = [...transactionConfig.importSessions].sort((a, b) =>
        new Date(b.importDate).getTime() - new Date(a.importDate).getTime()
      );
      setImportHistory(sorted);

      // Notify parent to refresh data if the removed import affected current/viewed month
      if (result && onDataChange) {
        await onDataChange();
      }

      toast.success('Import removed successfully');
    } catch (error) {
      toast.error(`Failed to remove import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRemovingSessionId(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);

    try {
      // 1. Parse CSV with bank selection (null = auto-detect, otherwise use selected)
      const bankOverride = selectedBank === 'auto' ? null : selectedBank;
      const { transactions, bankSource: detectedBankSource } = await parseBankCSV(file, bankOverride);
      setBankSource(detectedBankSource);

      // 2. Auto-categorize
      const transactionConfig = await fileSystemManager.loadTransactionConfig();
      const categorized = categorizeTransactions(
        transactions,
        config.categories,
        transactionConfig.rules
      );

      // 3. Detect duplicates within same import
      const duplicates = detectDuplicates(categorized);

      // 4. Mark transactions as duplicates and initialize exclusion state
      const withDuplicateFlags = categorized.map(t => ({
        ...t,
        isDuplicate: duplicates.get(t.id)?.isDuplicate || false,
        duplicateSource: duplicates.get(t.id)?.duplicateSource?.categoryId,
        isExcluded: false // Initialize as not excluded
      }));

      // 5. Set state
      setImportedTransactions(withDuplicateFlags);
      setImportSessionId(Date.now().toString());

      // Auto-filter to uncategorized if there are any
      const uncategorizedCount = categorized.filter(t => !t.suggestedCategoryId).length;
      if (uncategorizedCount > 0) {
        setFilter('uncategorized');
      } else {
        setFilter('all');
      }
    } catch (error) {
      toast.error(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const handleBankChange = (bank: string) => {
    setSelectedBank(bank);
  };

  const handleExcludeToggle = (transactionId: string, excluded: boolean) => {
    const updatedTransactions = importedTransactions.map(t =>
      t.id === transactionId ? { ...t, isExcluded: excluded } : t
    );
    setImportedTransactions(updatedTransactions);
  };

  const handleCancelImport = async () => {
    // Confirmation dialog
    if (importedTransactions.length > 0) {
      const confirmed = await confirm({
        title: 'Cancel this import?',
        description: 'All categorizations will be lost.',
        confirmLabel: 'Discard import',
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    }

    // Reset state
    setImportedTransactions([]);
    setImportSessionId(null);
    setFileName('');
    setBankSource(null);
    setSelectedBank('auto');
    setFilter('all');
    setIgnoreDuplicates(false);
  };

  const handleApplyToMonth = async () => {
    if (!importSessionId) return;

    try {
      // Filter out excluded transactions and optionally duplicates
      let transactionsToApply = importedTransactions.filter(t => !t.isExcluded);
      if (ignoreDuplicates) {
        transactionsToApply = transactionsToApply.filter(t => !t.isDuplicate);
      }

      // Apply to current month
      await onApplyToMonth(transactionsToApply, currentYear, currentMonth);

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

      toast.success(`Successfully applied ${importedTransactions.length} transactions to ${currentMonth}/${currentYear}`);
    } catch (error) {
      toast.error(`Failed to apply transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const allReviewed = importedTransactions.length > 0 &&
    importedTransactions.every(t => t.suggestedCategoryId || t.finalCategoryId);

  const hasDuplicates = importedTransactions.some(t => t.isDuplicate);

  return (
    <div className="space-y-6">
      {/* Upload section */}
      <Card>
        <CardHeader>
          <CardTitle>Import Bank Transactions</CardTitle>
          <CardDescription>Upload CSV files from UK banks or Amex</CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionUpload
            onUpload={handleFileUpload}
            isProcessing={isProcessing}
            selectedBank={selectedBank}
            onBankChange={handleBankChange}
          />
        </CardContent>
      </Card>

      {/* Review section (shown after upload) */}
      {importedTransactions.length > 0 && (
        <>
          <FileStatementSummary
            fileName={fileName}
            bankSource={bankSource}
            transactions={importedTransactions}
            onCancel={handleCancelImport}
          />

          <TransactionSummary transactions={importedTransactions} />

          <TransactionReviewTable
            transactions={importedTransactions}
            categories={config.categories}
            filter={filter}
            onFilterChange={(newFilter) => setFilter(newFilter as 'all' | 'high' | 'medium' | 'low' | 'uncategorized')}
            onCategoryChange={handleCategoryChange}
            onExcludeToggle={handleExcludeToggle}
          />

          {hasDuplicates && (
            <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/30 rounded-lg">
              <Checkbox
                id="ignore-duplicates"
                checked={ignoreDuplicates}
                onCheckedChange={(checked) => setIgnoreDuplicates(checked === true)}
              />
              <label htmlFor="ignore-duplicates" className="text-sm font-medium cursor-pointer flex-1">
                Ignore duplicate transactions when applying to monthly expenses
              </label>
              <span className="text-xs text-muted-foreground">
                {importedTransactions.filter(t => t.isDuplicate).length} duplicates will be excluded
              </span>
            </div>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Ready to apply transactions to <span className="font-semibold">{currentMonth}/{currentYear}</span>
                  </p>
                  {!allReviewed && (
                    <p className="text-xs text-warning">
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

      {/* Import history */}
      {!isProcessing && importedTransactions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>
              {importHistory.length > 0
                ? 'View and manage your previous imports'
                : 'No import history yet. Upload a CSV file to get started.'}
            </CardDescription>
          </CardHeader>
          {importHistory.length > 0 && (
            <CardContent className="space-y-3">
              {importHistory.map(session => (
                <ImportHistoryItem
                  key={session.id}
                  session={session}
                  onRemove={handleRemoveImport}
                  isRemoving={removingSessionId === session.id}
                />
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
};
