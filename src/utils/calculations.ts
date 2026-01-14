import { BudgetConfig, MonthData, MonthSummary, CategoryWithActual, IncomeSource, MonthlyIncome, IncomeWithSource } from '../types';

export function calculateMonthSummary(
  config: BudgetConfig,
  monthData: MonthData
): MonthSummary {
  const categories: CategoryWithActual[] = config.categories.map((category) => {
    const expense = monthData.expenses.find((e) => e.categoryId === category.id);
    const actualAmount = expense?.actualAmount || 0;
    const variance = actualAmount - category.budgetAmount;
    const percentUsed = category.budgetAmount > 0
      ? (actualAmount / category.budgetAmount) * 100
      : 0;

    return {
      ...category,
      actualAmount,
      variance,
      percentUsed,
    };
  });

  const fixedCategories = categories.filter((c) => c.type === 'fixed');
  const variableCategories = categories.filter((c) => c.type === 'variable');

  const totalBudget = categories.reduce((sum, c) => sum + c.budgetAmount, 0);
  const totalActual = categories.reduce((sum, c) => sum + c.actualAmount, 0);
  const fixedBudget = fixedCategories.reduce((sum, c) => sum + c.budgetAmount, 0);
  const fixedActual = fixedCategories.reduce((sum, c) => sum + c.actualAmount, 0);
  const variableBudget = variableCategories.reduce((sum, c) => sum + c.budgetAmount, 0);
  const variableActual = variableCategories.reduce((sum, c) => sum + c.actualAmount, 0);

  // Income calculations
  const incomeWithSource: IncomeWithSource[] = (monthData.income || []).map(income => {
    const source = config.incomeSources.find(s => s.id === income.sourceId);
    return {
      ...income,
      sourceName: source?.name || 'Unknown',
      sourceColor: source?.color
    };
  });

  const totalIncomeGross = (monthData.income || []).reduce((sum, i) => sum + i.gross, 0);
  const totalIncomeNet = (monthData.income || []).reduce((sum, i) => sum + i.net, 0);
  const totalDeductions = (monthData.income || []).reduce(
    (sum, i) => sum + i.pension + i.nationalInsurance + i.tax,
    0
  );
  const disposableIncome = totalIncomeNet - totalActual;

  return {
    year: monthData.year,
    month: monthData.month,
    totalBudget,
    totalActual,
    totalVariance: totalActual - totalBudget,
    fixedBudget,
    fixedActual,
    variableBudget,
    variableActual,
    categories,
    totalIncomeGross,
    totalIncomeNet,
    totalDeductions,
    disposableIncome,
    incomeBreakdown: incomeWithSource,
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
