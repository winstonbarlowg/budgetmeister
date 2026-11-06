import { CategoryRule, MonthData, MonthTransaction } from '../types';
import { recalculateImportedExpenses } from './monthTransactions';

// Reference numbers, amounts and codes like "8622", "302.6792" or "CLP17"; not "1STCENTRAL..."
const isReferenceToken = (token: string) => {
  const digits = token.replace(/\D/g, '').length;
  return digits > 0 && digits / token.length >= 0.4;
};

// Keys are needed for every transaction against every rule, so build each one once
const keyCache = new WeakMap<object, { description: string; key: string }>();

/**
 * Merchant identity used for rules: the description in upper case without
 * reference numbers, e.g. "AMZNMKTPLACE*B20NI6MK4 AMAZON.CO.UK" -> "AMZNMKTPLACE AMAZON.CO.UK"
 * and "Douglas Wills & SoInvoice 8622" -> "DOUGLAS WILLS & SOINVOICE".
 */
export function transactionKey(transaction: Pick<MonthTransaction, 'description'>): string {
  const cached = keyCache.get(transaction);
  if (cached !== undefined && cached.description === transaction.description) return cached.key;
  const key = transaction.description
    .toUpperCase()
    .replace(/\*\S*/g, ' ')
    .split(/\s+/)
    .filter(token => token && !isReferenceToken(token))
    .join(' ');
  keyCache.set(transaction, { description: transaction.description, key });
  return key;
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

// A rule with its text normalised once; lists of these are kept most specific first
interface CompiledRule {
  rule: CategoryRule;
  text: string;
  ranged: boolean;
}

function matchesCompiled({ rule, text }: CompiledRule, transaction: MonthTransaction): boolean {
  if (!text || !transactionKey(transaction).includes(text)) return false;
  if (rule.direction && rule.direction !== transaction.direction) return false;
  if (rule.minAmount !== undefined && transaction.amount < rule.minAmount - 0.005) return false;
  if (rule.maxAmount !== undefined && transaction.amount > rule.maxAmount + 0.005) return false;
  return true;
}

// Rules with an amount range beat merchant-only rules, then longer text, then newer rules
export function compileRules(rules: CategoryRule[]): CompiledRule[] {
  return rules
    .map(rule => ({ rule, text: normaliseRuleText(rule.text), ranged: hasAmountRange(rule) }))
    .sort((a, b) =>
      Number(b.ranged) - Number(a.ranged) ||
      b.text.length - a.text.length ||
      b.rule.createdAt.localeCompare(a.rule.createdAt)
    );
}

const findCompiled = (transaction: MonthTransaction, compiled: CompiledRule[]) =>
  compiled.find(c => matchesCompiled(c, transaction))?.rule;

export function ruleMatches(rule: CategoryRule, transaction: MonthTransaction): boolean {
  return matchesCompiled({ rule, text: normaliseRuleText(rule.text), ranged: hasAmountRange(rule) }, transaction);
}

export function findRule(transaction: MonthTransaction, rules: CategoryRule[]): CategoryRule | undefined {
  return findCompiled(transaction, compileRules(rules));
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
  const compiled = compileRules(rules);
  const transactions = (monthData.transactions || []).map(t => {
    if (isManuallyCategorised(t)) return t;
    const rule = findCompiled(t, compiled);
    const next = rule ? withRule(t, rule) : t.categorySource === 'rule' ? withoutRule(t) : t;
    if (next === t || sameCategorisation(next, t)) return t;
    changedCount++;
    return next;
  });
  if (changedCount === 0) return { monthData, changedCount };
  const updated = { ...monthData, transactions };
  return { monthData: { ...updated, expenses: recalculateImportedExpenses(updated) }, changedCount };
}

interface IndexedTransaction {
  transaction: MonthTransaction;
  monthKey: string;
}

// Transactions rules can change, grouped by key, so a rule only looks at keys containing its text
const indexCache = new WeakMap<MonthData[], Map<string, IndexedTransaction[]>>();

function indexByKey(months: MonthData[]): Map<string, IndexedTransaction[]> {
  const cached = indexCache.get(months);
  if (cached) return cached;
  const index = new Map<string, IndexedTransaction[]>();
  months.forEach(month => {
    const monthKey = `${month.year}-${month.month}`;
    (month.transactions || []).forEach(transaction => {
      if (isManuallyCategorised(transaction)) return;
      const key = transactionKey(transaction);
      const entries = index.get(key);
      if (entries) entries.push({ transaction, monthKey });
      else index.set(key, [{ transaction, monthKey }]);
    });
  });
  indexCache.set(months, index);
  return index;
}

/** How many transactions each rule currently categorises, in one pass */
export function countRuleMatches(rules: CategoryRule[], months: MonthData[]): Map<string, number> {
  const compiled = compileRules(rules);
  const counts = new Map(rules.map(rule => [rule.id, 0]));
  indexByKey(months).forEach(entries => entries.forEach(({ transaction }) => {
    const rule = findCompiled(transaction, compiled);
    if (rule) counts.set(rule.id, (counts.get(rule.id) || 0) + 1);
  }));
  return counts;
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
  const text = normaliseRuleText(rule.text);
  const compiled = compileRules([...otherRules.filter(r => r.id !== rule.id), rule]);
  let matches = 0;
  let changes = 0;
  const monthKeys = new Set<string>();
  if (!text) return { matches, months: 0, changes };
  indexByKey(months).forEach((entries, key) => {
    if (!key.includes(text)) return;
    entries.forEach(({ transaction: t, monthKey }) => {
      if (findCompiled(t, compiled)?.id !== rule.id) return;
      matches++;
      monthKeys.add(monthKey);
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
