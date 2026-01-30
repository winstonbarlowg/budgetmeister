export interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  budgetAmount: number;
  color?: string;
}

export interface MonthlyExpense {
  categoryId: string;
  actualAmount: number;
}

export interface IncomeSource {
  id: string;
  name: string;
  color?: string;
  startDate: string; // "YYYY-MM" format
  endDate: string | null; // "YYYY-MM" or null for ongoing
  defaultGross: number;
  defaultPension: number;
  defaultNI: number;
  defaultTax: number;
  defaultNet: number;
}

export interface MonthlyIncome {
  sourceId: string;
  gross: number;
  pension: number;
  nationalInsurance: number;
  tax: number;
  net: number;
  notes?: string;
}

export interface IncomeWithSource extends MonthlyIncome {
  sourceName: string;
  sourceColor?: string;
}

export interface MoneyMovement {
  id: string;
  amount: number;
  sourceAccount: string;
  destinationAccount: string;
  type: 'savings' | 'investment';
  category: string;
  notes?: string;
}

export interface MonthData {
  year: number;
  month: number; // 1-12
  expenses: MonthlyExpense[];
  income: MonthlyIncome[];
  moneyMovements: MoneyMovement[];
}

export interface BudgetConfig {
  categories: Category[];
  incomeSources: IncomeSource[];
  transactionConfig?: TransactionConfig;
  lastModified: string;
}

export interface YearlyData {
  [month: string]: MonthData; // "01", "02", etc.
}

export interface CategoryWithActual extends Category {
  actualAmount: number;
  variance: number;
  percentUsed: number;
}

export interface MonthSummary {
  year: number;
  month: number;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  fixedBudget: number;
  fixedActual: number;
  variableBudget: number;
  variableActual: number;
  categories: CategoryWithActual[];
  totalIncomeGross: number;
  totalIncomeNet: number;
  totalDeductions: number;
  disposableIncome: number;
  incomeBreakdown: IncomeWithSource[];
  totalSavings: number;
  totalInvestments: number;
  totalMoneyMovements: number;
  netDisposableIncome: number;
}

// Bank transaction types
export interface RawTransaction {
  id: string;
  date: Date;
  description: string;
  rawDescription: string;
  amount: number;
  type: 'debit' | 'credit';
  balance?: number;
  source: 'csv-import';
  importBatchId: string;
  bankSource?: string;
}

export interface CategorizedTransaction extends RawTransaction {
  suggestedCategoryId?: string;
  confidence?: number;
  finalCategoryId?: string;
  merchantPattern?: string;
  isReviewed: boolean;
  isApplied: boolean;
}

export interface CategorizationRule {
  id: string;
  pattern: string;
  categoryId: string;
  confidence: number;
  source: 'user' | 'system' | 'learned';
  frequency: number;
  lastUsed: string;
  createdAt: string;
}

export interface ImportSession {
  id: string;
  fileName: string;
  importDate: string;
  bankSource?: string;
  transactionCount: number;
  categorizedCount: number;
  appliedToMonth: boolean;
  targetYear?: number;
  targetMonth?: number;
}

export interface TransactionConfig {
  rules: CategorizationRule[];
  importSessions: ImportSession[];
  lastModified: string;
}
