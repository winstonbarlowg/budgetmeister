import { CategoryRule, MonthData, MonthTransaction } from '../types';
import { recalculateImportedExpenses } from './monthTransactions';

// Reference numbers, amounts and codes like "8622", "302.6792" or "CLP17"; not "1STCENTRAL..."
const isReferenceToken = (token: string) => {
  const digits = token.replace(/\D/g, '').length;
  return digits > 0 && digits / token.length >= 0.4;
};

/**
 * Merchant identity used for rules: the description in upper case without
 * reference numbers, e.g. "AMZNMKTPLACE*B20NI6MK4 AMAZON.CO.UK" -> "AMZNMKTPLACE AMAZON.CO.UK"
 * and "Douglas Wills & SoInvoice 8622" -> "DOUGLAS WILLS & SOINVOICE".
 */
export function transactionKey(transaction: Pick<MonthTransaction, 'description'>): string {
  return transaction.description
    .toUpperCase()
    .replace(/\*\S*/g, ' ')
    .split(/\s+/)
    .filter(token => token && !isReferenceToken(token))
    .join(' ');
}

export function normaliseRuleText(text: string): string {
  return text.toUpperCase().split(/\s+/).filter(Boolean).join(' ');
}

/** Set by the user in the app (or by the Amazon matching), so rules leave it alone */
export function isManuallyCategorised(transaction: MonthTransaction): boolean {
  return transaction.categorySource === 'manual' || (!!transaction.userEdited && transaction.categorySource !== 'rule');
}

export function hasAmountRange(rule: CategoryRule): boolean {
  return rule.minAmount !== undefined || rule.maxAmount !== undefined;
}

export function ruleMatches(rule: CategoryRule, transaction: MonthTransaction): boolean {
  const text = normaliseRuleText(rule.text);
  if (!text || !transactionKey(transaction).includes(text)) return false;
  if (rule.direction && rule.direction !== transaction.direction) return false;
  if (rule.minAmount !== undefined && transaction.amount < rule.minAmount - 0.005) return false;
  if (rule.maxAmount !== undefined && transaction.amount > rule.maxAmount + 0.005) return false;
  return true;
}

// Rules with an amount range beat merchant-only rules, then longer text, then newer rules
function compareSpecificity(a: CategoryRule, b: CategoryRule): number {
  return (
    Number(hasAmountRange(b)) - Number(hasAmountRange(a)) ||
    normaliseRuleText(b.text).length - normaliseRuleText(a.text).length ||
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function findRule(transaction: MonthTransaction, rules: CategoryRule[]): CategoryRule | undefined {
  return rules.filter(rule => ruleMatches(rule, transaction)).sort(compareSpecificity)[0];
}

function withRule(transaction: MonthTransaction, rule: CategoryRule): MonthTransaction {
  // Keep what the import chose, the first time a rule takes over
  const base: MonthTransaction = transaction.categorySource === 'rule'
    ? transaction
    : {
        ...transaction,
        importCategoryId: transaction.categoryId,
        importExcluded: transaction.excluded,
        importExcludeReason: transaction.excludeReason,
      };
  return {
    ...base,
    categorySource: 'rule',
    ruleId: rule.id,
    categoryId: rule.exclude ? (base.importCategoryId ?? null) : rule.categoryId,
    excluded: !!rule.exclude,
    excludeReason: rule.exclude ? `Rule: ${normaliseRuleText(rule.text)}` : undefined,
  };
}

function withoutRule(transaction: MonthTransaction): MonthTransaction {
  const {
    ruleId: _ruleId, importCategoryId, importExcluded, importExcludeReason, ...rest
  } = transaction;
  return {
    ...rest,
    categorySource: 'import',
    categoryId: importCategoryId ?? null,
    excluded: !!importExcluded,
    excludeReason: importExcludeReason,
  };
}

const sameCategorisation = (a: MonthTransaction, b: MonthTransaction) =>
  a.categoryId === b.categoryId &&
  a.excluded === b.excluded &&
  a.excludeReason === b.excludeReason &&
  a.categorySource === b.categorySource &&
  a.ruleId === b.ruleId;

/**
 * Apply rules to every transaction not categorised by hand. Transactions whose
 * rule no longer applies go back to what the import chose.
 */
export function applyRulesToMonth(
  monthData: MonthData,
  rules: CategoryRule[]
): { monthData: MonthData; changedCount: number } {
  let changedCount = 0;
  const transactions = (monthData.transactions || []).map(t => {
    if (isManuallyCategorised(t)) return t;
    const rule = findRule(t, rules);
    const next = rule ? withRule(t, rule) : t.categorySource === 'rule' ? withoutRule(t) : t;
    if (next === t || sameCategorisation(next, t)) return t;
    changedCount++;
    return next;
  });
  if (changedCount === 0) return { monthData, changedCount };
  const updated = { ...monthData, transactions };
  return { monthData: { ...updated, expenses: recalculateImportedExpenses(updated) }, changedCount };
}

/**
 * What adding (or replacing) a rule would do across the given months: transactions
 * it would end up categorising, and how many of those would change category.
 */
export function previewRule(
  rule: CategoryRule,
  otherRules: CategoryRule[],
  months: MonthData[]
): { matches: number; months: number; changes: number } {
  const rules = [...otherRules.filter(r => r.id !== rule.id), rule];
  let matches = 0;
  let changes = 0;
  const monthKeys = new Set<string>();
  months.forEach(month => {
    (month.transactions || []).forEach(t => {
      if (isManuallyCategorised(t) || findRule(t, rules)?.id !== rule.id) return;
      matches++;
      monthKeys.add(`${month.year}-${month.month}`);
      // Only a different category or exclusion counts, not a different rule setting the same one
      const next = withRule(t, rule);
      if (next.categoryId !== t.categoryId || next.excluded !== t.excluded) changes++;
    });
  });
  return { matches, months: monthKeys.size, changes };
}

export function createRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
