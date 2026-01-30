import { BudgetConfig, MonthData, YearlyData, TransactionConfig, CategorizationRule, ImportSession } from '../types';

const DEFAULT_CATEGORIES: BudgetConfig = {
  categories: [
    { id: 'rent', name: 'Rent/Mortgage', type: 'fixed', budgetAmount: 1500, color: '#ef4444' },
    { id: 'utilities', name: 'Utilities', type: 'fixed', budgetAmount: 200, color: '#f97316' },
    { id: 'insurance', name: 'Insurance', type: 'fixed', budgetAmount: 150, color: '#f59e0b' },
    { id: 'groceries', name: 'Groceries', type: 'variable', budgetAmount: 600, color: '#84cc16' },
    { id: 'dining', name: 'Dining Out', type: 'variable', budgetAmount: 300, color: '#22c55e' },
    { id: 'entertainment', name: 'Entertainment', type: 'variable', budgetAmount: 200, color: '#06b6d4' },
    { id: 'transport', name: 'Transportation', type: 'variable', budgetAmount: 250, color: '#3b82f6' },
    { id: 'shopping', name: 'Shopping', type: 'variable', budgetAmount: 300, color: '#8b5cf6' },
  ],
  incomeSources: [],
  lastModified: new Date().toISOString(),
};

export class FileSystemManager {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private budgetDataHandle: FileSystemDirectoryHandle | null = null;

  async requestDirectory(): Promise<boolean> {
    try {
      this.dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      });

      // Create or get budget-data directory
      this.budgetDataHandle = await this.dirHandle.getDirectoryHandle('budget-data', {
        create: true,
      });

      return true;
    } catch (err) {
      console.error('Failed to access directory:', err);
      return false;
    }
  }

  async loadConfig(): Promise<BudgetConfig> {
    if (!this.budgetDataHandle) {
      throw new Error('Directory not initialized');
    }

    try {
      const fileHandle = await this.budgetDataHandle.getFileHandle('config.json');
      const file = await fileHandle.getFile();
      const text = await file.text();
      const config = JSON.parse(text);

      // Backwards compatibility: add incomeSources if missing
      if (!config.incomeSources) {
        config.incomeSources = [];
      }

      // Backwards compatibility: add transactionConfig if missing
      if (!config.transactionConfig) {
        config.transactionConfig = {
          rules: [],
          importSessions: [],
          lastModified: new Date().toISOString()
        };
      }

      return config;
    } catch {
      // If config doesn't exist, create default
      await this.saveConfig(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
  }

  async saveConfig(config: BudgetConfig): Promise<void> {
    if (!this.budgetDataHandle) {
      throw new Error('Directory not initialized');
    }

    const fileHandle = await this.budgetDataHandle.getFileHandle('config.json', {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(config, null, 2));
    await writable.close();
  }

  async loadMonthData(year: number, month: number): Promise<MonthData> {
    if (!this.budgetDataHandle) {
      throw new Error('Directory not initialized');
    }

    try {
      const yearHandle = await this.budgetDataHandle.getDirectoryHandle(
        year.toString(),
        { create: true }
      );

      const monthStr = month.toString().padStart(2, '0');
      const monthName = new Date(year, month - 1).toLocaleString('en', { month: 'long' }).toLowerCase();
      const fileName = `${monthStr}-${monthName}.json`;

      const fileHandle = await yearHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const text = await file.text();
      const data = JSON.parse(text);

      // Backwards compatibility: add income if missing
      if (!data.income) {
        data.income = [];
      }

      // Backwards compatibility: add moneyMovements if missing
      if (!data.moneyMovements) {
        data.moneyMovements = [];
      }

      // Backwards compatibility: migrate old expense format to new structure
      if (data.expenses) {
        data.expenses = data.expenses.map((expense: any) => {
          // If already has new structure, return as-is
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
        });
      }

      return data;
    } catch {
      // Return empty month data if file doesn't exist
      return {
        year,
        month,
        expenses: [],
        income: [],
        moneyMovements: [],
      };
    }
  }

  async saveMonthData(data: MonthData): Promise<void> {
    if (!this.budgetDataHandle) {
      throw new Error('Directory not initialized');
    }

    const yearHandle = await this.budgetDataHandle.getDirectoryHandle(
      data.year.toString(),
      { create: true }
    );

    const monthStr = data.month.toString().padStart(2, '0');
    const monthName = new Date(data.year, data.month - 1).toLocaleString('en', { month: 'long' }).toLowerCase();
    const fileName = `${monthStr}-${monthName}.json`;

    const fileHandle = await yearHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  }

  async loadYearData(year: number): Promise<YearlyData> {
    if (!this.budgetDataHandle) {
      throw new Error('Directory not initialized');
    }

    const yearData: YearlyData = {};

    try {
      // Year handle created but not used - we load data via loadMonthData
      await this.budgetDataHandle.getDirectoryHandle(
        year.toString(),
        { create: true }
      );

      for (let month = 1; month <= 12; month++) {
        const monthStr = month.toString().padStart(2, '0');
        const data = await this.loadMonthData(year, month);
        yearData[monthStr] = data;
      }
    } catch (err) {
      console.error('Failed to load year data:', err);
    }

    return yearData;
  }

  isInitialized(): boolean {
    return this.budgetDataHandle !== null;
  }

  async loadTransactionConfig(): Promise<TransactionConfig> {
    const config = await this.loadConfig();
    if (!config.transactionConfig) {
      return {
        rules: [],
        importSessions: [],
        lastModified: new Date().toISOString()
      };
    }
    return config.transactionConfig;
  }

  async saveTransactionConfig(transactionConfig: TransactionConfig): Promise<void> {
    const config = await this.loadConfig();
    config.transactionConfig = {
      ...transactionConfig,
      lastModified: new Date().toISOString()
    };
    await this.saveConfig(config);
  }

  async addCategorizationRule(rule: CategorizationRule): Promise<void> {
    const transactionConfig = await this.loadTransactionConfig();

    // Check if rule with same pattern and category already exists
    const existingIndex = transactionConfig.rules.findIndex(
      r => r.pattern === rule.pattern && r.categoryId === rule.categoryId
    );

    if (existingIndex !== -1) {
      // Update existing rule
      transactionConfig.rules[existingIndex] = rule;
    } else {
      // Add new rule
      transactionConfig.rules.push(rule);
    }

    await this.saveTransactionConfig(transactionConfig);
  }

  async saveImportSession(session: ImportSession): Promise<void> {
    const transactionConfig = await this.loadTransactionConfig();
    transactionConfig.importSessions.push(session);
    await this.saveTransactionConfig(transactionConfig);
  }

  async removeImportSession(sessionId: string): Promise<{ year: number; month: number } | null> {
    // Load transaction config to find the session
    const transactionConfig = await this.loadTransactionConfig();
    const sessionIndex = transactionConfig.importSessions.findIndex(s => s.id === sessionId);

    if (sessionIndex === -1) {
      throw new Error('Import session not found');
    }

    const session = transactionConfig.importSessions[sessionIndex];

    if (!session.targetYear || !session.targetMonth) {
      // Remove from config only if it wasn't applied
      transactionConfig.importSessions.splice(sessionIndex, 1);
      await this.saveTransactionConfig(transactionConfig);
      return null;
    }

    // Load the month data to remove the transactions
    const monthData = await this.loadMonthData(session.targetYear, session.targetMonth);

    // Update expenses: remove transactions that belong to this import session
    const updatedExpenses = monthData.expenses.map(expense => {
      const linkedIds = expense.linkedTransactionIds || [];

      // Filter out transaction IDs that start with this session's ID
      // (transaction IDs are formatted as `${importBatchId}-${rowIndex}`)
      const remainingIds = linkedIds.filter(id => !id.startsWith(sessionId));

      if (remainingIds.length === linkedIds.length) {
        // No transactions from this import in this expense
        return expense;
      }

      // Recalculate imported amount by removing this session's contribution
      // We need to set importedAmount to 0 and manualAmount to actualAmount
      // since we don't track which specific transaction contributed what amount
      return {
        categoryId: expense.categoryId,
        actualAmount: expense.manualAmount || 0, // Keep only manual adjustments
        importedAmount: 0,
        manualAmount: expense.manualAmount || 0,
        linkedTransactionIds: remainingIds
      };
    });

    // Filter out expenses that have no amount left
    const filteredExpenses = updatedExpenses.filter(e => e.actualAmount > 0 || (e.importedAmount || 0) > 0 || (e.manualAmount || 0) > 0);

    // Save updated month data
    await this.saveMonthData({
      ...monthData,
      expenses: filteredExpenses
    });

    // Remove session from config
    transactionConfig.importSessions.splice(sessionIndex, 1);
    await this.saveTransactionConfig(transactionConfig);

    return { year: session.targetYear, month: session.targetMonth };
  }
}

export const fileSystemManager = new FileSystemManager();
