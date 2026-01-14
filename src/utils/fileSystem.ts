import { BudgetConfig, MonthData, YearlyData } from '../types';

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

      return data;
    } catch {
      // Return empty month data if file doesn't exist
      return {
        year,
        month,
        expenses: [],
        income: [],
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
}

export const fileSystemManager = new FileSystemManager();
