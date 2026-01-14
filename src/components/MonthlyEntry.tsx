import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, TrendingDown, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { MonthData, Category, MonthSummary, BudgetConfig, IncomeSource } from '../types';
import { calculateMonthSummary, formatCurrency, getMonthName } from '../utils/calculations';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { MonthlyIncomeEntry } from './MonthlyIncomeEntry';
import { CurrencyInput } from './CurrencyInput';

interface MonthlyEntryProps {
  categories: Category[];
  incomeSources: IncomeSource[];
  config: BudgetConfig;
  monthData: MonthData;
  onSave: (data: MonthData) => void;
  onMonthChange: (year: number, month: number) => void;
}

export const MonthlyEntry: React.FC<MonthlyEntryProps> = ({
  categories,
  incomeSources,
  config,
  monthData,
  onSave,
  onMonthChange,
}) => {
  const [expenses, setExpenses] = useState<{ [categoryId: string]: number }>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const expenseMap: { [categoryId: string]: number } = {};
    monthData.expenses.forEach((expense) => {
      expenseMap[expense.categoryId] = expense.actualAmount;
    });
    setExpenses(expenseMap);
    setHasChanges(false);
  }, [monthData]);

  const handleExpenseChange = (categoryId: string, amount: number) => {
    setExpenses({ ...expenses, [categoryId]: amount });
    setHasChanges(true);
  };

  const handleApplyFixedDefaults = () => {
    const updatedExpenses = { ...expenses };
    categories
      .filter(cat => cat.type === 'fixed')
      .forEach(cat => {
        updatedExpenses[cat.id] = cat.budgetAmount;
      });
    setExpenses(updatedExpenses);
    setHasChanges(true);
  };

  const handleSave = () => {
    const updatedExpenses = categories.map((category) => ({
      categoryId: category.id,
      actualAmount: expenses[category.id] || 0,
    }));

    onSave({
      ...monthData,
      expenses: updatedExpenses,
    });
    setHasChanges(false);
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

  const summary: MonthSummary = calculateMonthSummary(
    config,
    {
      year: monthData.year,
      month: monthData.month,
      expenses: categories.map(c => ({ categoryId: c.id, actualAmount: expenses[c.id] || 0 })),
      income: monthData.income || []
    }
  );

  const fixedCategories = summary.categories.filter((c) => c.type === 'fixed');
  const variableCategories = summary.categories.filter((c) => c.type === 'variable');

  const isUnderBudget = summary.totalVariance <= 0;

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-3xl">
                  {getMonthName(monthData.month)} {monthData.year}
                </CardTitle>
                <CardDescription>Enter your expenses for this month</CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <Button onClick={handleSave} disabled={!hasChanges} size="lg" variant="success">
              <Save className="h-5 w-5" /> Save Changes
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40 shadow-lg shadow-primary/10">
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Total Budget</CardDescription>
            <CardTitle className="text-3xl text-primary">{formatCurrency(summary.totalBudget)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Monthly allocation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/40 shadow-lg shadow-blue-500/10">
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Total Spent</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{formatCurrency(summary.totalActual)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {summary.totalActual > 0
                  ? `${((summary.totalActual / summary.totalBudget) * 100).toFixed(1)}% of budget`
                  : 'No expenses yet'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className={isUnderBudget ? "bg-gradient-to-br from-success/20 to-success/5 border-success/40 shadow-lg shadow-success/10" : "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/40 shadow-lg shadow-destructive/10"}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Variance</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {isUnderBudget ? (
                <TrendingDown className="h-8 w-8 text-success" />
              ) : (
                <TrendingUp className="h-8 w-8 text-destructive" />
              )}
              <span className={isUnderBudget ? 'text-success' : 'text-destructive'}>
                {summary.totalVariance > 0 ? '+' : ''}
                {formatCurrency(summary.totalVariance)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-sm font-semibold ${isUnderBudget ? 'text-success' : 'text-destructive'}`}>
              {isUnderBudget ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card className={summary.disposableIncome >= 0 ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/40 shadow-lg shadow-purple-500/10" : "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/40 shadow-lg shadow-destructive/10"}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Disposable Income</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <DollarSign className={`h-8 w-8 ${summary.disposableIncome >= 0 ? 'text-purple-600' : 'text-destructive'}`} />
              <span className={summary.disposableIncome >= 0 ? 'text-purple-600 font-bold' : 'text-destructive font-bold'}>
                {formatCurrency(summary.disposableIncome)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground mb-2">
              Income: <span className="font-semibold">{formatCurrency(summary.totalIncomeNet)}</span> - Expenses: <span className="font-semibold">{formatCurrency(summary.totalActual)}</span>
            </p>
            {monthData.income?.length === 0 && incomeSources.length > 0 && (
              <p className="text-xs text-warning font-medium flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Income not saved - scroll down to save your monthly income
              </p>
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

      {/* Expense Entry */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fixed Expenses */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Fixed Expenses</CardTitle>
                <CardDescription>
                  {formatCurrency(summary.fixedActual)} / {formatCurrency(summary.fixedBudget)}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyFixedDefaults}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Apply Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fixedCategories.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <Label htmlFor={category.id} className="text-base font-semibold">
                        {category.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Budget: {formatCurrency(category.budgetAmount)}
                      </p>
                    </div>
                  </div>
                  <CurrencyInput
                    id={category.id}
                    value={expenses[category.id] || 0}
                    onChange={(value) => handleExpenseChange(category.id, value)}
                    className="w-32"
                  />
                </div>
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
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-semibold">
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
          <CardContent className="space-y-4">
            {variableCategories.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <Label htmlFor={category.id} className="text-base font-semibold">
                        {category.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Budget: {formatCurrency(category.budgetAmount)}
                      </p>
                    </div>
                  </div>
                  <CurrencyInput
                    id={category.id}
                    value={expenses[category.id] || 0}
                    onChange={(value) => handleExpenseChange(category.id, value)}
                    className="w-32"
                  />
                </div>
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
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-semibold">
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
