import { BudgetConfig, Category, EffectiveExpense, ExpectedAmount, MonthData, MonthSummary, CategoryWithActual, IncomeSource, MonthlyIncome, IncomeWithSource } from '../types';

export function calculateMonthSummary(
  config: BudgetConfig,
  monthData: MonthData
): MonthSummary {
  const expenses = getEffectiveExpenses(config.categories, monthData);
  const categories: CategoryWithActual[] = config.categories.map((category) => {
    const expense = expenses.find((e) => e.categoryId === category.id);
    const actualAmount = expense?.actualAmount || 0;
    // Fixed costs are known in advance, so only variable categories have a budget
    const budgetAmount = category.type === 'variable' ? category.budgetAmount : 0;
    const variance = category.type === 'variable' ? actualAmount - budgetAmount : 0;
    const percentUsed = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

    return {
      ...category,
      budgetAmount,
      actualAmount,
      variance,
      percentUsed,
    };
  });

  const fixedCategories = categories.filter((c) => c.type === 'fixed');
  const variableCategories = categories.filter((c) => c.type === 'variable');

  const totalActual = categories.reduce((sum, c) => sum + c.actualAmount, 0);
  const fixedActual = fixedCategories.reduce((sum, c) => sum + c.actualAmount, 0);
  const variableBudget = variableCategories.reduce((sum, c) => sum + c.budgetAmount, 0);
  const variableActual = variableCategories.reduce((sum, c) => sum + c.actualAmount, 0);

  // Income calculations
  const income = getEffectiveIncome(config.incomeSources, monthData);
  const incomeWithSource: IncomeWithSource[] = income.map(entry => {
    const source = config.incomeSources.find(s => s.id === entry.sourceId);
    return {
      ...entry,
      sourceName: source?.name || 'Unknown',
      sourceColor: source?.color
    };
  });

  const totalIncomeGross = income.reduce((sum, i) => sum + i.gross, 0);
  const totalIncomeNet = income.reduce((sum, i) => sum + i.net, 0);
  const totalDeductions = income.reduce(
    (sum, i) => sum + i.pension + i.nationalInsurance + i.tax,
    0
  );
  const disposableIncome = totalIncomeNet - totalActual;

  // Money movements calculations
  const totalSavings = (monthData.moneyMovements || [])
    .filter(m => m.type === 'savings')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalInvestments = (monthData.moneyMovements || [])
    .filter(m => m.type === 'investment')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalMoneyMovements = totalSavings + totalInvestments;
  const netDisposableIncome = disposableIncome - totalMoneyMovements;

  return {
    year: monthData.year,
    month: monthData.month,
    totalActual,
    fixedActual,
    variableBudget,
    variableActual,
    variableVariance: variableActual - variableBudget,
    categories,
    totalIncomeGross,
    totalIncomeNet,
    totalDeductions,
    disposableIncome,
    incomeBreakdown: incomeWithSource,
    totalSavings,
    totalInvestments,
    totalMoneyMovements,
    netDisposableIncome,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function getMonthName(month: number): string {
  return new Date(2000, month - 1).toLocaleString('en', { month: 'long' });
}

export function getMonthShortName(month: number): string {
  return new Date(2000, month - 1).toLocaleString('en', { month: 'short' });
}

export function getSuggestedIncome(
  incomeSources: IncomeSource[],
  year: number,
  month: number
): MonthlyIncome[] {
  const targetDate = `${year}-${month.toString().padStart(2, '0')}`;

  return incomeSources
    .filter(source => {
      const isAfterStart = targetDate >= source.startDate;
      const isBeforeEnd = !source.endDate || targetDate <= source.endDate;
      return isAfterStart && isBeforeEnd;
    })
    .map(source => ({
      sourceId: source.id,
      gross: source.defaultGross,
      pension: source.defaultPension,
      nationalInsurance: source.defaultNI,
      tax: source.defaultTax,
      net: source.defaultNet
    }));
}

/**
 * Income for a month: amounts saved for that month win, and any active source
 * with nothing saved falls back to its defaults from Settings.
 */
export function getEffectiveIncome(
  incomeSources: IncomeSource[],
  monthData: Pick<MonthData, 'year' | 'month' | 'income'>
): MonthlyIncome[] {
  const saved = monthData.income || [];
  const savedIds = new Set(saved.map(i => i.sourceId));
  const defaults = getSuggestedIncome(incomeSources, monthData.year, monthData.month)
    .filter(s => !savedIds.has(s.sourceId));
  return [...saved, ...defaults];
}

const toMonthKey = (year: number, month: number) => `${year}-${month.toString().padStart(2, '0')}`;

/**
 * What a fixed category is expected to cost in a month, from the period in Settings
 * covering it (the latest-starting one if periods overlap). Null for months not covered
 * and for months that haven't started.
 */
export function getExpectedAmount(category: Category, year: number, month: number, today = new Date()): number | null {
  if (category.type !== 'fixed' || !category.expectedAmounts?.length) return null;
  const target = toMonthKey(year, month);
  if (target > toMonthKey(today.getFullYear(), today.getMonth() + 1)) return null;
  const period = category.expectedAmounts
    .filter(p => (!p.from || target >= p.from) && (!p.until || target <= p.until))
    .sort((a, b) => (b.from || '').localeCompare(a.from || ''))[0];
  return period ? period.amount : null;
}

/** The expected amount that applies now, or most recently, for showing in Settings */
export function getCurrentExpectedAmount(category: Category, today = new Date()): ExpectedAmount | null {
  const current = toMonthKey(today.getFullYear(), today.getMonth() + 1);
  const started = (category.expectedAmounts || []).filter(p => !p.from || p.from <= current);
  return started.find(p => !p.until || p.until >= current)
    || started.sort((a, b) => (b.until || '').localeCompare(a.until || ''))[0]
    || null;
}

/**
 * Expenses for a month: amounts saved for that month win, and fixed categories
 * with nothing imported or typed fall back to their expected amount from Settings.
 */
export function getEffectiveExpenses(
  categories: Category[],
  monthData: Pick<MonthData, 'year' | 'month' | 'expenses'>,
  today = new Date()
): EffectiveExpense[] {
  const saved = new Map(monthData.expenses.map(e => [e.categoryId, normalizeExpense(e)]));
  const effective: EffectiveExpense[] = monthData.expenses.map(e => ({ ...saved.get(e.categoryId), isDefault: false }));

  categories.forEach(category => {
    const expected = getExpectedAmount(category, monthData.year, monthData.month, today);
    if (expected === null) return;
    const expense = saved.get(category.id);
    if (expense && (expense.manualOverride || expense.importedAmount > 0 || expense.manualAmount > 0)) return;
    const filled: EffectiveExpense = {
      categoryId: category.id,
      actualAmount: expected,
      importedAmount: 0,
      manualAmount: 0,
      linkedTransactionIds: [],
      isDefault: true,
    };
    const index = effective.findIndex(e => e.categoryId === category.id);
    if (index >= 0) effective[index] = filled;
    else effective.push(filled);
  });

  return effective;
}

export function validateIncomeAmounts(
  gross: number,
  pension: number,
  ni: number,
  tax: number,
  net: number
): { isValid: boolean; expectedNet: number } {
  const expectedNet = gross - pension - ni - tax;
  return {
    isValid: Math.abs(expectedNet - net) < 0.01, // Allow for rounding
    expectedNet
  };
}

// Helper functions for managing imported vs manual expense amounts

/**
 * Normalize expense to ensure backward compatibility
 * Old expenses only have actualAmount, new ones have importedAmount + manualAmount
 */
export function normalizeExpense(expense: any) {
  // If already has the new structure, return as-is
  if (expense.importedAmount !== undefined || expense.manualAmount !== undefined) {
    return {
      ...expense,
      importedAmount: expense.importedAmount || 0,
      manualAmount: expense.manualAmount || 0,
      linkedTransactionIds: expense.linkedTransactionIds || []
    };
  }

  // Old format: treat existing actualAmount as manual entry
  return {
    ...expense,
    importedAmount: 0,
    manualAmount: expense.actualAmount || 0,
    linkedTransactionIds: []
  };
}

/**
 * Calculate the minimum allowed amount for an expense (imported amount)
 */
export function getMinimumExpenseAmount(expense: any): number {
  return expense.importedAmount || 0;
}

/**
 * Update expense with new manual amount, enforcing minimum
 */
export function updateExpenseAmount(
  expense: any,
  newActualAmount: number
): any {
  const normalized = normalizeExpense(expense);
  const minimum = normalized.importedAmount;

  // Enforce minimum: actualAmount cannot be less than importedAmount
  const safeAmount = Math.max(newActualAmount, minimum);
  const newManualAmount = safeAmount - minimum;

  return {
    ...expense,
    actualAmount: safeAmount,
    importedAmount: minimum,
    manualAmount: newManualAmount,
    linkedTransactionIds: normalized.linkedTransactionIds
  };
}
