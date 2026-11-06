import { useEffect, useMemo, useState } from 'react';
import { Category, CategoryRule, MonthData } from '../types';
import { INCOME_CATEGORY_ID } from '../utils/monthTransactions';
import { hasAmountRange, previewRule } from '../utils/categoryRules';
import { formatCurrency } from '../utils/calculations';
import { fileSystemManager } from '../utils/fileSystem';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { MoneyInput } from './MoneyInput';

const EXCLUDE_VALUE = '__exclude';

type Scope = 'none' | 'merchant' | 'amount';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Starting point: an existing rule to edit, or a draft built from a transaction
  rule: CategoryRule;
  // The amount of the transaction the draft came from, offered as the default range
  amount?: number;
  // After recategorising a transaction: offer "Just this one" as well
  offerSkip?: boolean;
  categories: Category[];
  rules: CategoryRule[];
  onSave: (rule: CategoryRule) => Promise<void>;
}

export const RuleDialog: React.FC<RuleDialogProps> = ({
  open, onOpenChange, rule, amount, offerSkip, categories, rules, onSave,
}) => {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [scope, setScope] = useState<Scope>('merchant');
  const [text, setText] = useState('');
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(0);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setScope(offerSkip ? 'none' : hasAmountRange(rule) ? 'amount' : 'merchant');
    setText(rule.text);
    setMinAmount(rule.minAmount ?? amount ?? 0);
    setMaxAmount(rule.maxAmount ?? amount ?? 0);
    setTarget(rule.exclude ? EXCLUDE_VALUE : rule.categoryId || '');
    fileSystemManager.loadAllMonths().then(setMonths).catch(() => setMonths([]));
  }, [open, rule, amount, offerSkip]);

  const draft = useMemo<CategoryRule>(() => ({
    ...rule,
    text: text.trim(),
    minAmount: scope === 'amount' ? Math.min(minAmount, maxAmount) : undefined,
    maxAmount: scope === 'amount' ? Math.max(minAmount, maxAmount) : undefined,
    categoryId: target === EXCLUDE_VALUE ? null : target || null,
    exclude: target === EXCLUDE_VALUE || undefined,
  }), [rule, text, scope, minAmount, maxAmount, target]);

  const preview = useMemo(() => previewRule(draft, rules, months), [draft, rules, months]);
  const isNew = !rules.some(r => r.id === rule.id);
  const canSave = scope === 'none' || (draft.text.length > 0 && (draft.exclude || !!draft.categoryId));

  const handleSave = async () => {
    if (scope === 'none') {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{offerSkip ? 'Apply to other transactions?' : isNew ? 'New rule' : 'Edit rule'}</DialogTitle>
          <DialogDescription>
            Rules categorise matching transactions in every month, including future imports.
            Transactions you change by hand are never touched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                ))}
                <SelectItem value={INCOME_CATEGORY_ID}>Income (not spending)</SelectItem>
                <SelectItem value={EXCLUDE_VALUE}>Exclude from expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-text">Description contains</Label>
            <Input id="rule-text" value={text} onChange={e => setText(e.target.value)} disabled={scope === 'none'} />
          </div>

          <RadioGroup value={scope} onValueChange={value => setScope(value as Scope)} className="space-y-1">
            {offerSkip && (
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="scope-none" />
                <Label htmlFor="scope-none" className="font-normal cursor-pointer">Just this transaction</Label>
              </div>
            )}
            <div className="flex items-center gap-2">
              <RadioGroupItem value="merchant" id="scope-merchant" />
              <Label htmlFor="scope-merchant" className="font-normal cursor-pointer">Any amount</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="amount" id="scope-amount" />
              <Label htmlFor="scope-amount" className="font-normal cursor-pointer">Only amounts between</Label>
            </div>
          </RadioGroup>

          {scope === 'amount' && (
            <div className="flex items-center gap-2 pl-6">
              <MoneyInput value={minAmount} onChange={setMinAmount} aria-label="Minimum amount" />
              <span className="text-muted-foreground">and</span>
              <MoneyInput value={maxAmount} onChange={setMaxAmount} aria-label="Maximum amount" />
            </div>
          )}

          {scope !== 'none' && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {months.length === 0
                ? 'Counting matches…'
                : `Matches ${preview.matches} transaction${preview.matches === 1 ? '' : 's'} in ${preview.months} month${preview.months === 1 ? '' : 's'}; ${preview.changes} would change.`}
              {scope === 'amount' && ` Range ${formatCurrency(draft.minAmount || 0)}–${formatCurrency(draft.maxAmount || 0)}.`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {scope === 'none' ? 'Done' : isNew ? 'Create rule' : 'Save rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
