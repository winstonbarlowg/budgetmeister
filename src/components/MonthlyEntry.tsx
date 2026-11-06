import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, DollarSign, CalendarCheck, RotateCcw } from 'lucide-react';
import { MonthData, Category, MonthSummary, BudgetConfig, IncomeSource, MonthlyExpense } from '../types';
import {
  calculateMonthSummary, formatCurrency, normalizeExpense, updateExpenseAmount,
  getEffectiveExpenses, isAutoFillActive,
} from '../utils/calculations';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { MonthlyIncomeEntry } from './MonthlyIncomeEntry';
import { MonthlySavingsEntry } from './MonthlySavingsEntry';
import { CurrencyInput } from './CurrencyInput';
import { MonthPicker } from './MonthPicker';

interface MonthlyEntryProps {
  categories: Category[];
  incomeSources: IncomeSource[];
  config: BudgetConfig;
  monthData: MonthData;
  onSave: (data: MonthData) => void;
  onMonthChange: (year: number, month: number) => void;
}

const emptyExpense = (categoryId: string): MonthlyExpense => ({
  categoryId,
  actualAmount: 0,
  importedAmount: 0,
  manualAmount: 0,
  linkedTransactionIds: [],
});

export const MonthlyEntry: React.FC<MonthlyEntryProps> = ({
  categories,
  incomeSources,
  config,
  monthData,
  onSave,
  onMonthChange,
}) => {
  // Saved amounts plus auto-fill defaults from Settings, derived on every render
  const effectiveById = new Map(getEffectiveExpenses(categories, monthData).map(e => [e.categoryId, e]));
  const savedById = new Map(monthData.expenses.map(e => [e.categoryId, normalizeExpense(e) as MonthlyExpense]));

  const saveExpense = (expense: MonthlyExpense | null, categoryId: string) => {
    const others = monthData.expenses.filter(e => e.categoryId !== categoryId);
    onSave({ ...monthData, expenses: expense ? [...others, expense] : others });
  };

  // Each edit is saved straight away as this month's amount for that category
  const handleExpenseChange = (category: Category, amount: number) => {
    const current = savedById.get(category.id) || emptyExpense(category.id);
    const updated = updateExpenseAmount(current, amount);
    const autoFill = isAutoFillActive(category, monthData.year, monthData.month);
    // Typing the default amount back in means there is nothing to override any more
    if (autoFill && !updated.importedAmount && Math.abs(updated.actualAmount - category.budgetAmount) < 0.005) {
      handleUseDefault(category.id);
      return;
    }
    saveExpense({ ...updated, ...(autoFill ? { manualOverride: true } : {}) }, category.id);
  };

  const handleUseDefault = (categoryId: string) => {
    const current = savedById.get(categoryId);
    if (!current) return;
    const { manualOverride: _manualOverride, ...rest } = current;
    const cleared = { ...rest, manualAmount: 0, actualAmount: current.importedAmount || 0 };
    saveExpense(cleared.importedAmount ? cleared : null, categoryId);
  };

  const handlePrevMonth = () => {
    let newMonth = monthData.month - 1;
    let newYear = monthData.year;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    onMonthChange(newYear, newMonth);
  };

  const handleNextMonth = () => {
    let newMonth = monthData.month + 1;
    let newYear = monthData.year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    onMonthChange(newYear, newMonth);
  };

  const today = new Date();
  const isCurrentMonth = monthData.year === today.getFullYear() && monthData.month === today.getMonth() + 1;

  const handleCurrentMonth = () => {
    onMonthChange(today.getFullYear(), today.getMonth() + 1);
  };

  const summary: MonthSummary = calculateMonthSummary(config, monthData);

  const fixedCategories = summary.categories.filter((c) => c.type === 'fixed');
  const variableCategories = summary.categories.filter((c) => c.type === 'variable');

  const isUnderBudget = summary.totalVariance <= 0;

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <MonthPicker year={monthData.year} month={monthData.month} onSelect={onMonthChange} />
              <CardDescription className="mt-1">Enter your expenses for this month. Changes save automatically.</CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrentMonth && (
              <Button variant="outline" size="sm" onClick={handleCurrentMonth}>
                <CalendarCheck className="h-4 w-4" /> This month
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Budget</CardDescription>
            <CardTitle className="text-2xl text-primary">{formatCurrency(summary.totalBudget)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Monthly allocation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-info/20 to-info/5 border-info/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Total Spent</CardDescription>
            <CardTitle className="text-2xl text-info">{formatCurrency(summary.totalActual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {summary.totalActual > 0
                  ? `${((summary.totalActual / summary.totalBudget) * 100).toFixed(1)}% of budget`
                  : 'No expenses yet'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={isUnderBudget ? "bg-gradient-to-br from-success/20 to-success/5 border-success/40" : "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/40"}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Variance</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {isUnderBudget ? (
                <TrendingDown className="h-5 w-5 text-success" />
              ) : (
                <TrendingUp className="h-5 w-5 text-destructive" />
              )}
              <span className={isUnderBudget ? 'text-success' : 'text-destructive'}>
                {summary.totalVariance > 0 ? '+' : ''}
                {formatCurrency(summary.totalVariance)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xs font-medium ${isUnderBudget ? 'text-success' : 'text-destructive'}`}>
              {isUnderBudget ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.disposableIncome >= 0 ? "bg-gradient-to-br from-highlight/20 to-highlight/5 border-highlight/40" : "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/40"}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Disposable Income</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className={`h-5 w-5 ${summary.disposableIncome >= 0 ? 'text-highlight' : 'text-destructive'}`} />
              <span className={summary.disposableIncome >= 0 ? 'text-highlight font-bold' : 'text-destructive font-bold'}>
                {formatCurrency(summary.disposableIncome)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
            {summary.totalMoneyMovements > 0 && (
              <div className="mt-2 pt-2 border-t border-highlight/30">
                <p className="text-xs text-muted-foreground">After Savings & Investments:</p>
                <div className={`text-base font-semibold ${summary.netDisposableIncome >= 0 ? 'text-highlight' : 'text-destructive'}`}>
                  {formatCurrency(summary.netDisposableIncome)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Entry */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Income</CardTitle>
          <CardDescription>Review and adjust your income for this month</CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyIncomeEntry
            incomeSources={incomeSources}
            monthData={monthData}
            year={monthData.year}
            month={monthData.month}
            onSave={(income) => onSave({ ...monthData, income })}
          />
        </CardContent>
      </Card>

      {/* Savings & Investments Entry */}
      <MonthlySavingsEntry
        monthData={monthData}
        onSave={onSave}
      />

      {/* Expense Entry */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Fixed Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Fixed Expenses</CardTitle>
            <CardDescription>
              {formatCurrency(summary.fixedActual)} / {formatCurrency(summary.fixedBudget)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {fixedCategories.map((category) => {
              const detail = effectiveById.get(category.id);
              const hasImports = (detail?.importedAmount || 0) > 0;
              const minimum = detail?.importedAmount || 0;

              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <Label htmlFor={category.id} className="font-medium">
                          {category.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Budget: {formatCurrency(category.budgetAmount)}
                          {hasImports && (
                            <span className="ml-1 text-info font-medium">
                              • {formatCurrency(detail?.importedAmount || 0)} imported
                            </span>
                          )}
                          {detail?.isDefault && <span className="ml-1">• Default from Settings</span>}
                          {detail?.manualOverride && isAutoFillActive(category, monthData.year, monthData.month) && (
                            <button
                              type="button"
                              onClick={() => handleUseDefault(category.id)}
                              className="ml-1 inline-flex items-center gap-0.5 text-info hover:underline"
                            >
                              • <RotateCcw className="h-3 w-3" /> Use default
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                    <CurrencyInput
                      id={category.id}
                      value={detail?.actualAmount || 0}
                      onChange={(value) => handleExpenseChange(category, value)}
                      className={detail?.isDefault ? 'w-32 text-muted-foreground' : 'w-32'}
                      min={minimum}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between font-semibold">
                <span>Fixed Total</span>
                <span className={summary.fixedActual > summary.fixedBudget ? 'text-destructive' : 'text-success'}>
                  {formatCurrency(summary.fixedActual)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variable Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Variable Expenses</CardTitle>
            <CardDescription>
              {formatCurrency(summary.variableActual)} / {formatCurrency(summary.variableBudget)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {variableCategories.map((category) => {
              const detail = effectiveById.get(category.id);
              const hasImports = (detail?.importedAmount || 0) > 0;
              const minimum = detail?.importedAmount || 0;

              return (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-1 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <Label htmlFor={category.id} className="font-medium">
                          {category.name}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Budget: {formatCurrency(category.budgetAmount)}
                          {hasImports && (
                            <span className="ml-1 text-info font-medium">
                              • {formatCurrency(detail?.importedAmount || 0)} imported
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <CurrencyInput
                      id={category.id}
                      value={detail?.actualAmount || 0}
                      onChange={(value) => handleExpenseChange(category, value)}
                      className="w-32"
                      min={minimum}
                    />
                  </div>
                  {category.budgetAmount > 0 && (
                    <>
                      <Progress
                        value={category.actualAmount}
                        max={category.budgetAmount}
                        variant={category.percentUsed > 100 ? 'destructive' : category.percentUsed > 90 ? 'warning' : 'success'}
                      />
                      {category.percentUsed > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                          {category.percentUsed.toFixed(1)}% used
                          {category.variance !== 0 && (
                            <span className={category.variance > 0 ? 'text-destructive ml-2' : 'text-success ml-2'}>
                              ({category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)})
                            </span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between font-semibold">
                <span>Variable Total</span>
                <span className={summary.variableActual > summary.variableBudget ? 'text-destructive' : 'text-success'}>
                  {formatCurrency(summary.variableActual)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
