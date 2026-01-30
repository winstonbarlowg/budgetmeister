import { CategorizedTransaction } from '../types';

export interface DuplicateCheckResult {
  transactionId: string;
  isDuplicate: boolean;
  duplicateSource?: {
    month: number;
    year: number;
    categoryId: string;
  };
}

/**
 * Generate a unique hash for a transaction based on date, description, amount, and bank source
 */
export function generateTransactionHash(
  date: Date,
  description: string,
  amount: number,
  bankSource?: string
): string {
  const dateStr = date.toISOString().split('T')[0];
  const cleanDesc = description.toLowerCase().trim();
  return `${dateStr}-${cleanDesc}-${amount.toFixed(2)}-${bankSource || 'unknown'}`;
}

/**
 * Detect duplicate transactions within the same import batch
 * This MVP version only checks for duplicates within the same CSV file
 */
export function detectDuplicates(
  newTransactions: CategorizedTransaction[]
): Map<string, DuplicateCheckResult> {
  const results = new Map<string, DuplicateCheckResult>();
  const seenHashes = new Set<string>();

  newTransactions.forEach(transaction => {
    const hash = generateTransactionHash(
      transaction.date,
      transaction.description,
      transaction.amount,
      transaction.bankSource
    );

    const isDuplicate = seenHashes.has(hash);
    seenHashes.add(hash);

    results.set(transaction.id, {
      transactionId: transaction.id,
      isDuplicate,
      duplicateSource: isDuplicate ? { month: 0, year: 0, categoryId: 'same-import' } : undefined
    });
  });

  return results;
}
