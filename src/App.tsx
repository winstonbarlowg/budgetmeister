import { useState, useEffect } from 'react';
import { FolderOpen, Calendar, BarChart3, Settings, TrendingUp } from 'lucide-react';
import { SettingsManager } from './components/SettingsManager';
import { MonthlyEntry } from './components/MonthlyEntry';
import { Visualizations } from './components/Visualizations';
import { YearlyDashboard } from './components/YearlyDashboard';
import { fileSystemManager } from './utils/fileSystem';
import { calculateMonthSummary } from './utils/calculations';
import { BudgetConfig, MonthData, MonthSummary } from './types';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [config, setConfig] = useState<BudgetConfig | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [yearData, setYearData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <TrendingUp className="h-6 w-6" />
            </div>
            Budget Tracker
          </h1>
          <p className="text-muted-foreground text-lg">Managing your finances together</p>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="monthly" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="monthly" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Monthly Entry</span>
              <span className="sm:hidden">Monthly</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Charts</span>
            </TabsTrigger>
            <TabsTrigger value="yearly" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Yearly Overview</span>
              <span className="sm:hidden">Yearly</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-4">
            <MonthlyEntry
              categories={config.categories}
              incomeSources={config.incomeSources}
              config={config}
              monthData={monthData}
              onSave={handleSaveMonthData}
              onMonthChange={handleMonthChange}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="yearly" className="space-y-4">
            <YearlyDashboard year={currentYear} yearData={yearData} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsManager
              categories={config.categories}
              incomeSources={config.incomeSources}
              onSaveCategories={(categories) => handleSaveConfig({ ...config, categories })}
              onSaveIncomeSources={(incomeSources) => handleSaveConfig({ ...config, incomeSources })}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
