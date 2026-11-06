// What a fixed cost is expected to be over a period; used for months with nothing imported
export interface ExpectedAmount {
  amount: number;
  from?: string;                 // "YYYY-MM"; omitted means every month before until
  until?: string | null;         // "YYYY-MM" or null/omitted for ongoing
}

export interface Category {
  id: string;
  name: string;
  type: 'fixed' | 'variable';
  budgetAmount: number;          // Variable categories only; fixed costs have no budget
  color?: string;
  expectedAmounts?: ExpectedAmount[];  // Fixed categories only
}

export interface MonthlyExpense {
  categoryId: string;
  actualAmount: number;              // Total amount (importedAmount + manualAmount)
  importedAmount?: number;            // Amount from CSV imports (minimum floor)
  manualAmount?: number;              // Additional manual adjustments on top of imports
  linkedTransactionIds?: string[];    // Transaction IDs that contribute to importedAmount
  manualOverride?: boolean;           // Amount typed for this month; replaces the expected amount (even £0)
}

// A month's expense after expected amounts from Settings are applied
export interface EffectiveExpense extends MonthlyExpense {
  isDefault: boolean;                 // actualAmount is the category's expected amount for the month
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

// Transaction stored in a month file (written by scripts/import_emma.py)
export interface MonthTransaction {
  id: string;
  date: string;                  // "YYYY-MM-DD"
  description: string;
  merchant?: string | null;
  amount: number;                // Always positive; see direction
  direction: 'debit' | 'credit';
  account: string;               // Short source label, e.g. "Amex" or "HSBC"
  accountName?: string;          // Full account name from the bank
  type?: string;                 // Bank transaction type, e.g. "Direct Debit"
  categoryId: string | null;     // Category id, INCOME_CATEGORY_ID, or null when uncategorised
  sourceCategory?: string;       // Category in the original export
  excluded: boolean;             // Not counted towards expenses (e.g. transfers between own accounts)
  excludeReason?: string;
  userEdited?: boolean;          // Changed in the app; re-imports keep the user's choice
  categorySource?: 'import' | 'rule' | 'manual';  // Who set categoryId/excluded; userEdited means manual
  ruleId?: string;               // CategoryRule that set the category
  importCategoryId?: string | null;  // Category from the import, kept so removing a rule can restore it
  importExcluded?: boolean;
  importExcludeReason?: string;
  amazonItems?: string[];        // Amazon order items matched to this charge
  source: 'emma';
}

// Categorises (or excludes) matching transactions in every month
export interface CategoryRule {
  id: string;
  text: string;                  // Matched case-insensitively against transactionKey()
  minAmount?: number;
  maxAmount?: number;
  direction?: 'debit' | 'credit';
  categoryId: string | null;     // Ignored when exclude is true
  exclude?: boolean;
  createdAt: string;
}

export interface MonthData {
  year: number;
  month: number; // 1-12
  expenses: MonthlyExpense[];
  income: MonthlyIncome[];
  moneyMovements: MoneyMovement[];
  transactions?: MonthTransaction[];
}

export interface BudgetConfig {
  categories: Category[];
  incomeSources: IncomeSource[];
  transactionConfig?: TransactionConfig;
  categoryRules?: CategoryRule[];
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
  totalActual: number;          // All spending, fixed and variable
  fixedActual: number;          // Fixed costs; these have no budget
  variableBudget: number;
  variableActual: number;
  variableVariance: number;     // variableActual - variableBudget
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
  transactionType?: 'expense' | 'refund' | 'payment' | 'transfer';  // Bank-specific interpretation
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
  isDuplicate?: boolean;          // Flagged as duplicate within same import
  duplicateSource?: string;       // Where duplicate was found (e.g., 'same-import')
  isExcluded?: boolean;           // User manually excluded this transaction from being applied
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
