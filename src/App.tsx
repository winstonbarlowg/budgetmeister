import { useState, useEffect } from 'react';
import { FolderOpen, Calendar, BarChart3, Settings, TrendingUp, Upload, AlertTriangle } from 'lucide-react';
import { SettingsManager } from './components/SettingsManager';
import { MonthlyEntry } from './components/MonthlyEntry';
import { Visualizations } from './components/Visualizations';
import { YearlyDashboard } from './components/YearlyDashboard';
import { BankTransactions } from './components/BankTransactions';
import { fileSystemManager } from './utils/fileSystem';
import { calculateMonthSummary } from './utils/calculations';
import { BudgetConfig, MonthData, MonthSummary, CategorizedTransaction } from './types';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { Toaster } from './components/ui/sonner';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [yearData, setYearData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly');
  const [monthlyHasChanges, setMonthlyHasChanges] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    { type: 'tab'; tab: string } | { type: 'month'; year: number; month: number } | null
  >(null);

  const handleOpenDirectory = async () => {
    setLoading(true);
    const success = await fileSystemManager.requestDirectory();
    if (success) {
      await loadData();
      setIsInitialized(true);
    }
    setLoading(false);
  };

  const loadData = async () => {
    try {
      const loadedConfig = await fileSystemManager.loadConfig();
      setConfig(loadedConfig);

      const loadedMonthData = await fileSystemManager.loadMonthData(currentYear, currentMonth);
      setMonthData(loadedMonthData);

      await loadYearData();
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const loadYearData = async (year?: number) => {
    try {
      const targetYear = year || currentYear;
      const loadedConfig = config || await fileSystemManager.loadConfig();
      const yearlyData = await fileSystemManager.loadYearData(targetYear);

      const summaries: MonthSummary[] = [];
      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        const data = yearlyData[monthStr] || { year: targetYear, month, expenses: [], income: [] };
        summaries.push(calculateMonthSummary(loadedConfig, data));
      }

      setYearData(summaries);
    } catch (err) {
      console.error('Failed to load year data:', err);
    }
  };

  const handleSaveConfig = async (updatedConfig: BudgetConfig) => {
    try {
      const newConfig = { ...updatedConfig, lastModified: new Date().toISOString() };
      await fileSystemManager.saveConfig(newConfig);
      setConfig(newConfig);
      await loadYearData();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  const handleSaveMonthData = async (data: MonthData) => {
    try {
      await fileSystemManager.saveMonthData(data);
      setMonthData(data);
      await loadYearData();
    } catch (err) {
      console.error('Failed to save month data:', err);
    }
  };

  const handleMonthChange = async (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);

    try {
      const loadedMonthData = await fileSystemManager.loadMonthData(year, month);
      setMonthData(loadedMonthData);

      if (year !== currentYear) {
        await loadYearData(year);
      }
    } catch (err) {
      console.error('Failed to load month data:', err);
    }
  };

  const handleYearChange = async (year: number) => {
    try {
      await loadYearData(year);
    } catch (err) {
      console.error('Failed to load year data:', err);
    }
  };

  const handleTabChange = (tab: string) => {
    if (activeTab === 'monthly' && monthlyHasChanges) {
      setPendingNavigation({ type: 'tab', tab });
      return;
    }
    setActiveTab(tab);
  };

  const handleMonthChangeWithGuard = (year: number, month: number) => {
    if (monthlyHasChanges) {
      setPendingNavigation({ type: 'month', year, month });
      return;
    }
    handleMonthChange(year, month);
  };

  const handleDiscardAndNavigate = () => {
    if (!pendingNavigation) return;
    setMonthlyHasChanges(false);
    if (pendingNavigation.type === 'tab') {
      setActiveTab(pendingNavigation.tab);
    } else {
      handleMonthChange(pendingNavigation.year, pendingNavigation.month);
    }
    setPendingNavigation(null);
  };

  useEffect(() => {
    if (isInitialized) {
      loadYearData();
    }
  }, [currentYear]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted p-4 md:p-8">
        <div className="mx-auto max-w-4xl space-y-8 pt-20">
          <div className="text-center space-y-4">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight">Budget Tracker</h1>
            <p className="text-xl text-muted-foreground">
              File-based budget management for you and your family
            </p>
          </div>

          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Select a directory to store your budget data. This can be a shared folder on
                Dropbox, Google Drive, or any location accessible to both you and your wife.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">Choose a Folder</h3>
                    <p className="text-sm text-muted-foreground">
                      Select any folder on your computer or cloud storage
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">Automatic Setup</h3>
                    <p className="text-sm text-muted-foreground">
                      We'll create a budget-data folder with default categories
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">Start Tracking</h3>
                    <p className="text-sm text-muted-foreground">
                      Begin entering expenses and managing your budget together
                    </p>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleOpenDirectory}
                disabled={loading}
              >
                <FolderOpen className="h-5 w-5" />
                {loading ? 'Loading...' : 'Open Budget Directory'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!config || !monthData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="text-muted-foreground">Loading your budget data...</p>
        </div>
      </div>
    );
  }

  const currentMonthSummary = calculateMonthSummary(config, monthData);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Fixed Left Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r bg-card shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Budget Tracker</h1>
              <p className="text-xs text-muted-foreground">Managing finances</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => handleTabChange('monthly')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'monthly'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Monthly Entry</span>
          </button>

          <button
            onClick={() => handleTabChange('bank-transactions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'bank-transactions'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Upload className="h-5 w-5" />
            <span>Bank Transactions</span>
          </button>

          <button
            onClick={() => handleTabChange('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => handleTabChange('yearly')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'yearly'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Yearly Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {activeTab === 'monthly' && (
            <div className="space-y-4">
              <MonthlyEntry
                categories={config.categories}
                incomeSources={config.incomeSources}
                config={config}
                monthData={monthData}
                onSave={handleSaveMonthData}
                onMonthChange={handleMonthChangeWithGuard}
                onHasChangesChange={setMonthlyHasChanges}
              />
            </div>
          )}

          {activeTab === 'bank-transactions' && (
            <div className="space-y-4">
            <BankTransactions
              config={config}
              currentYear={currentYear}
              currentMonth={currentMonth}
              onConfigUpdate={async (updatedConfig) => {
                await fileSystemManager.saveConfig(updatedConfig);
                setConfig(updatedConfig);
              }}
              onApplyToMonth={async (transactions: CategorizedTransaction[], year: number, month: number) => {
                // Group transactions by category and collect transaction IDs
                const transactionMap = new Map<string, { amount: number; ids: string[] }>();

                transactions
                  .filter(t => t.finalCategoryId && t.type === 'debit')
                  .forEach(t => {
                    const existing = transactionMap.get(t.finalCategoryId!) || { amount: 0, ids: [] };
                    existing.amount += t.amount;
                    existing.ids.push(t.id);
                    transactionMap.set(t.finalCategoryId!, existing);
                  });

                // Load target month data
                const targetMonthData = await fileSystemManager.loadMonthData(year, month);

                // Update expenses with new import tracking structure
                const updatedExpenses = targetMonthData.expenses.map(expense => {
                  const imported = transactionMap.get(expense.categoryId);

                  if (imported) {
                    // Set imported amount and link transaction IDs
                    const newImportedAmount = imported.amount;
                    const newActualAmount = Math.max(expense.actualAmount || 0, newImportedAmount);
                    const newManualAmount = newActualAmount - newImportedAmount;

                    return {
                      categoryId: expense.categoryId,
                      actualAmount: newActualAmount,
                      importedAmount: newImportedAmount,
                      manualAmount: newManualAmount,
                      linkedTransactionIds: imported.ids
                    };
                  }

                  // No imports for this category - preserve existing structure
                  return {
                    categoryId: expense.categoryId,
                    actualAmount: expense.actualAmount || 0,
                    importedAmount: expense.importedAmount || 0,
                    manualAmount: expense.manualAmount || 0,
                    linkedTransactionIds: expense.linkedTransactionIds || []
                  };
                });

                // Add new categories if needed
                transactionMap.forEach((imported, categoryId) => {
                  if (!updatedExpenses.find(e => e.categoryId === categoryId)) {
                    updatedExpenses.push({
                      categoryId,
                      actualAmount: imported.amount,
                      importedAmount: imported.amount,
                      manualAmount: 0,
                      linkedTransactionIds: imported.ids
                    });
                  }
                });

                // Save updated month data
                const updatedMonthData = { ...targetMonthData, expenses: updatedExpenses };
                await fileSystemManager.saveMonthData(updatedMonthData);

                // Refresh UI if current month
                if (year === currentYear && month === currentMonth) {
                  setMonthData(updatedMonthData);
                  await loadYearData();
                }
              }}
              onDataChange={async () => {
                // Reload current month data and year data after import removal
                const updatedMonthData = await fileSystemManager.loadMonthData(currentYear, currentMonth);
                setMonthData(updatedMonthData);
                await loadYearData();
              }}
            />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Analytics & Insights</CardTitle>
                  <CardDescription>
                    Visual insights into your spending patterns and budget performance
                  </CardDescription>
                </CardHeader>
              </Card>
              <Visualizations
                currentMonth={currentMonthSummary}
                yearData={yearData}
                onYearChange={handleYearChange}
              />
            </div>
          )}

          {activeTab === 'yearly' && (
            <div className="space-y-4">
              <YearlyDashboard year={currentYear} yearData={yearData} />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <SettingsManager
                categories={config.categories}
                incomeSources={config.incomeSources}
                onSaveCategories={(categories) => handleSaveConfig({ ...config, categories })}
                onSaveIncomeSources={(incomeSources) => handleSaveConfig({ ...config, incomeSources })}
              />
            </div>
          )}
        </div>
      </main>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={pendingNavigation !== null} onOpenChange={(open) => { if (!open) setPendingNavigation(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Unsaved Changes
            </DialogTitle>
            <DialogDescription>
              You have unsaved changes that will be lost if you leave this page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPendingNavigation(null)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndNavigate}>
              Discard & Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors closeButton />
    </div>
  );
}

export default App;
