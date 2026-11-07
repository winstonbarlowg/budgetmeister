import { useMemo, useState } from 'react';
import { Edit2, Lightbulb, Plus, Trash2, Wand2 } from 'lucide-react';
import { Category, CategoryRule, MonthData, MonthTransaction } from '../types';
import { INCOME_CATEGORY_ID } from '../utils/monthTransactions';
import {
  countRuleMatches, createRuleId, hasAmountRange, isManuallyCategorised, normaliseRuleText, previewRule,
  transactionKey,
} from '../utils/categoryRules';
import { formatCurrency } from '../utils/calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useConfirm } from './ui/confirm-dialog';
import { RuleDialog } from './RuleDialog';

interface RuleManagerProps {
  categories: Category[];
  months: MonthData[];
  rules: CategoryRule[];
  onSaveRules: (rules: CategoryRule[]) => Promise<void>;
  onSaveRule: (rule: CategoryRule) => Promise<void>;
}

interface Suggestion {
  rule: CategoryRule;
  amount: number;
  examples: number;
  changes: number;
}

const targetOf = (t: Pick<MonthTransaction, 'excluded' | 'categoryId'>) => (t.excluded ? 'exclude' : t.categoryId || '');

/**
 * Rules worth creating from edits made by hand: the same merchant appears in other
 * months under a different category. When one merchant was split between categories
 * (e.g. two Vodafone direct debits), each suggestion covers its own amount range.
 */
function buildSuggestions(months: MonthData[], rules: CategoryRule[]): Suggestion[] {
  const groups = new Map<string, MonthTransaction[]>();
  months.forEach(month => (month.transactions || []).forEach(t => {
    if (!isManuallyCategorised(t) || t.amazonItems || !targetOf(t)) return;
    const text = transactionKey(t);
    if (!text) return;
    const key = `${text}|${targetOf(t)}`;
    groups.set(key, [...(groups.get(key) || []), t]);
  }));

  const targetsByText = new Map<string, Set<string>>();
  groups.forEach((_, key) => {
    const [text, target] = key.split('|');
    targetsByText.set(text, (targetsByText.get(text) || new Set()).add(target));
  });

  const rangeOf = (transactions: MonthTransaction[]) => {
    const amounts = transactions.map(t => t.amount);
    return { min: Math.min(...amounts), max: Math.max(...amounts) };
  };

  const suggestions: Suggestion[] = [];
  groups.forEach((transactions, key) => {
    const [text, target] = key.split('|');
    const amounts = transactions.map(t => t.amount);
    const split = (targetsByText.get(text)?.size || 0) > 1;
    // A split merchant is only suggested when its amount ranges don't overlap (e.g. two Vodafone direct debits)
    const { min, max } = rangeOf(transactions);
    const overlaps = split && [...groups.entries()].some(([otherKey, others]) => {
      if (otherKey === key || otherKey.split('|')[0] !== text) return false;
      const other = rangeOf(others);
      return other.min <= max && other.max >= min;
    });
    if (overlaps) return;
    const rule: CategoryRule = {
      id: createRuleId(),
      text,
      direction: transactions[0].direction,
      categoryId: target === 'exclude' ? null : target,
      exclude: target === 'exclude' || undefined,
      minAmount: split ? min : undefined,
      maxAmount: split ? max : undefined,
      createdAt: new Date().toISOString(),
    };
    const preview = previewRule(rule, rules, months);
    if (preview.changes > 0) {
      suggestions.push({ rule, amount: amounts[0], examples: transactions.length, changes: preview.changes });
    }
  });
  return suggestions.sort((a, b) => b.changes - a.changes);
}

export const RuleManager: React.FC<RuleManagerProps> = ({ categories, months, rules, onSaveRules, onSaveRule }) => {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ rule: CategoryRule; amount?: number } | null>(null);

  const categoryName = (rule: CategoryRule) =>
    rule.exclude
      ? 'Excluded'
      : rule.categoryId === INCOME_CATEGORY_ID
        ? 'Income'
        : categories.find(c => c.id === rule.categoryId)?.name || 'Unknown category';

  const describeAmount = (rule: CategoryRule) =>
    !hasAmountRange(rule)
      ? 'Any amount'
      : rule.minAmount === rule.maxAmount
        ? formatCurrency(rule.minAmount || 0)
        : `${formatCurrency(rule.minAmount || 0)}–${formatCurrency(rule.maxAmount || 0)}`;

  // Rules and months arrive together from App, so counts and suggestions always reflect saved rules
  const matchCounts = useMemo(() => countRuleMatches(rules, months), [rules, months]);
  const suggestions = useMemo(() => buildSuggestions(months, rules), [months, rules]);

  const handleNew = () => setEditing({
    rule: { id: createRuleId(), text: '', direction: 'debit', categoryId: null, createdAt: new Date().toISOString() },
  });

  const handleDelete = async (rule: CategoryRule) => {
    const ok = await confirm({
      title: `Delete the rule for "${normaliseRuleText(rule.text)}"?`,
      description: 'Transactions it categorised go back to the category from the import. Changes you made by hand stay.',
      confirmLabel: 'Delete rule',
      destructive: true,
    });
    if (ok) await onSaveRules(rules.filter(r => r.id !== rule.id));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Category rules</CardTitle>
              <CardDescription>
                Categorise matching transactions in every month, past and future. The most specific rule wins:
                one with an amount range beats one for any amount.
              </CardDescription>
            </div>
            <Button onClick={handleNew}>
              <Plus className="h-4 w-4" /> New rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No rules yet. Change a transaction's category on the Monthly page, or start from a suggestion below.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {[...rules].sort((a, b) => normaliseRuleText(a.text).localeCompare(normaliseRuleText(b.text))).map(rule => (
                <div key={rule.id} className="group flex items-center gap-3 px-3 py-2">
                  <Wand2 className="h-4 w-4 shrink-0 text-info" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{normaliseRuleText(rule.text)}</div>
                    <div className="text-xs text-muted-foreground">
                      {describeAmount(rule)} • {matchCounts.get(rule.id) ?? 0} transactions
                    </div>
                  </div>
                  <div className="text-sm">{categoryName(rule)}</div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing({ rule })} title="Edit rule">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(rule)} title="Delete rule">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-warning" /> Suggested from your changes
            </CardTitle>
            <CardDescription>
              Transactions you recategorised by hand whose merchant appears elsewhere under a different category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-lg border">
              {suggestions.map(s => (
                <div key={`${s.rule.text}|${s.rule.categoryId}|${s.rule.exclude}`} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.rule.text}</div>
                    <div className="text-xs text-muted-foreground">
                      {describeAmount(s.rule)} → {categoryName(s.rule)} • would update {s.changes} transaction{s.changes === 1 ? '' : 's'}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing({ rule: s.rule, amount: s.amount })}>
                    Create rule
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {editing && (
        <RuleDialog
          open
          onOpenChange={isOpen => !isOpen && setEditing(null)}
          rule={editing.rule}
          amount={editing.amount}
          categories={categories}
          rules={rules}
          months={months}
          onSave={onSaveRule}
        />
      )}
    </div>
  );
};
