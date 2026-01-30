import { RawTransaction } from '../types';

// Simple CSV parser (handles quoted fields)
export function parseCSV(csvContent: string): string[][] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }

  return result;
}

// Detect bank format based on headers
export function detectBankFormat(csvContent: string): string | null {
  const rows = parseCSV(csvContent);
  if (rows.length === 0) return null;

  const headers = rows[0].map(h => h.toLowerCase());
  const headerString = headers.join(',');

  // Amex UK: has "Extended Details" or "Appears On Your Statement As"
  if (headerString.includes('extended details') ||
      headerString.includes('appears on your statement as')) {
    return 'amex-uk';
  }

  // Barclays: has "Number", "Account", "Subcategory"
  if (headerString.includes('number') &&
      headerString.includes('account') &&
      headerString.includes('subcategory')) {
    return 'barclays';
  }

  // HSBC: typically has "Date", "Payee", "Credit Amount", "Debit Amount"
  if (headerString.includes('credit amount') && headerString.includes('debit amount')) {
    return 'hsbc';
  }

  // Monzo: has "Transaction ID", "Name"
  if (headerString.includes('transaction id') && headerString.includes('name')) {
    return 'monzo';
  }

  // Starling: has "Type", "Reference"
  if (headerString.includes('type') && headerString.includes('reference')) {
    return 'starling';
  }

  // Generic fallback: must have Date, Description, Amount
  if (headerString.includes('date') &&
      (headerString.includes('description') || headerString.includes('payee')) &&
      headerString.includes('amount')) {
    return 'generic';
  }

  return null;
}

// Parse UK date formats (DD/MM/YYYY)
function parseUKDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  // Fallback to standard parse
  return new Date(dateStr);
}

// Parse Amex UK format
export function parseAmexUK(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.indexOf('date');
  const descIdx = headers.indexOf('description');
  const amountIdx = headers.indexOf('amount');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const dateStr = row[dateIdx];
    const description = row[descIdx];
    const amountStr = row[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')));
    const isDebit = parseFloat(amountStr) < 0;

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      source: 'csv-import',
      importBatchId,
      bankSource: 'amex-uk'
    });
  }

  return transactions;
}

// Parse Barclays format
export function parseBarclays(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.indexOf('date');
  const memoIdx = headers.indexOf('memo');
  const amountIdx = headers.indexOf('amount');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const dateStr = row[dateIdx];
    const description = row[memoIdx];
    const amountStr = row[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')));
    const isDebit = parseFloat(amountStr) < 0;

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      source: 'csv-import',
      importBatchId,
      bankSource: 'barclays'
    });
  }

  return transactions;
}

// Parse HSBC format
export function parseHSBC(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.indexOf('date');
  const payeeIdx = headers.indexOf('payee');
  const creditIdx = headers.indexOf('credit amount');
  const debitIdx = headers.indexOf('debit amount');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const dateStr = row[dateIdx];
    const description = row[payeeIdx];
    const creditStr = row[creditIdx];
    const debitStr = row[debitIdx];

    if (!dateStr || !description) continue;

    let amount = 0;
    let type: 'debit' | 'credit' = 'debit';

    if (debitStr && debitStr.trim()) {
      amount = Math.abs(parseFloat(debitStr.replace(/[^0-9.-]/g, '')));
      type = 'debit';
    } else if (creditStr && creditStr.trim()) {
      amount = Math.abs(parseFloat(creditStr.replace(/[^0-9.-]/g, '')));
      type = 'credit';
    }

    if (amount === 0) continue;

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type,
      source: 'csv-import',
      importBatchId,
      bankSource: 'hsbc'
    });
  }

  return transactions;
}

// Parse Monzo format
export function parseMonzo(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.indexOf('date');
  const nameIdx = headers.indexOf('name');
  const amountIdx = headers.indexOf('amount');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const dateStr = row[dateIdx];
    const description = row[nameIdx];
    const amountStr = row[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')));
    const isDebit = parseFloat(amountStr) < 0;

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      source: 'csv-import',
      importBatchId,
      bankSource: 'monzo'
    });
  }

  return transactions;
}

// Parse Starling format
export function parseStarling(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.indexOf('date');
  const refIdx = headers.indexOf('reference');
  const amountIdx = headers.indexOf('amount');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const dateStr = row[dateIdx];
    const description = row[refIdx];
    const amountStr = row[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')));
    const isDebit = parseFloat(amountStr) < 0;

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      source: 'csv-import',
      importBatchId,
      bankSource: 'starling'
    });
  }

  return transactions;
}

// Parse generic CSV format
export function parseGeneric(rows: string[][], importBatchId: string): RawTransaction[] {
  const transactions: RawTransaction[] = [];
  const headers = rows[0].map(h => h.toLowerCase());

  const dateIdx = headers.findIndex(h => h.includes('date'));
  const descIdx = headers.findIndex(h => h.includes('description') || h.includes('payee') || h.includes('merchant'));
  const amountIdx = headers.findIndex(h => h.includes('amount'));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error('Unable to detect required columns (Date, Description, Amount)');
  }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const dateStr = row[dateIdx];
    const description = row[descIdx];
    const amountStr = row[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    const amount = Math.abs(parseFloat(amountStr.replace(/[^0-9.-]/g, '')));
    const isDebit = parseFloat(amountStr) < 0 || !amountStr.includes('+');

    transactions.push({
      id: `${importBatchId}-${i}`,
      date: parseUKDate(dateStr),
      description: description,
      rawDescription: description,
      amount,
      type: isDebit ? 'debit' : 'credit',
      source: 'csv-import',
      importBatchId,
      bankSource: 'generic'
    });
  }

  return transactions;
}

// Main entry point
export async function parseBankCSV(file: File): Promise<{ transactions: RawTransaction[]; bankSource: string | null }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        if (!csvContent) {
          reject(new Error('Failed to read file'));
          return;
        }

        const rows = parseCSV(csvContent);
        if (rows.length < 2) {
          reject(new Error('CSV file is empty or has no data rows'));
          return;
        }

        const bankSource = detectBankFormat(csvContent);
        if (!bankSource) {
          reject(new Error('Unable to detect bank format. Please ensure CSV has Date, Description, and Amount columns.'));
          return;
        }

        const importBatchId = Date.now().toString();
        let transactions: RawTransaction[] = [];

        switch (bankSource) {
          case 'amex-uk':
            transactions = parseAmexUK(rows, importBatchId);
            break;
          case 'barclays':
            transactions = parseBarclays(rows, importBatchId);
            break;
          case 'hsbc':
            transactions = parseHSBC(rows, importBatchId);
            break;
          case 'monzo':
            transactions = parseMonzo(rows, importBatchId);
            break;
          case 'starling':
            transactions = parseStarling(rows, importBatchId);
            break;
          case 'generic':
            transactions = parseGeneric(rows, importBatchId);
            break;
          default:
            reject(new Error(`Unsupported bank format: ${bankSource}`));
            return;
        }

        if (transactions.length === 0) {
          reject(new Error('No valid transactions found in CSV'));
          return;
        }

        resolve({ transactions, bankSource });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
