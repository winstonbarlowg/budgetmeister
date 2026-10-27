import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { IncomeSource, MonthlyIncome } from '../types';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { formatCurrency, getEffectiveIncome, getSuggestedIncome, validateIncomeAmounts } from '../utils/calculations';
import { CurrencyInput } from './CurrencyInput';

interface MonthlyIncomeEntryProps {
  incomeSources: IncomeSource[];
  monthData: { income: MonthlyIncome[] };
  year: number;
  month: number;
  onSave: (income: MonthlyIncome[]) => void;
}

type IncomeField = keyof Omit<MonthlyIncome, 'sourceId' | 'notes'>;

const INCOME_FIELDS: { field: IncomeField; label: string; idSuffix: string }[] = [
  { field: 'gross', label: 'Gross Income', idSuffix: 'gross' },
  { field: 'pension', label: 'Pension', idSuffix: 'pension' },
  { field: 'nationalInsurance', label: 'National Insurance', idSuffix: 'ni' },
  { field: 'tax', label: 'Tax', idSuffix: 'tax' },
  { field: 'net', label: 'Net Take-Home', idSuffix: 'net' },
];

const matchesDefaults = (income: MonthlyIncome, defaults?: MonthlyIncome) =>
  !!defaults && INCOME_FIELDS.every(({ field }) => Math.abs((income[field] || 0) - (defaults[field] || 0)) < 0.005);

export const MonthlyIncomeEntry: React.FC<MonthlyIncomeEntryProps> = ({
  incomeSources,
  monthData,
  year,
  month,
  onSave,
}) => {
  // Sources without amounts saved for this month follow their defaults from Settings
  const savedIncome = monthData.income || [];
  const overriddenIds = new Set(savedIncome.map(i => i.sourceId));
  const effectiveIncome = getEffectiveIncome(incomeSources, { year, month, income: savedIncome });
  const incomeBySource = new Map(effectiveIncome.map(i => [i.sourceId, i]));
  const activeSources = incomeSources.filter(s => incomeBySource.has(s.id));
  const defaultsBySource = new Map(getSuggestedIncome(incomeSources, year, month).map(i => [i.sourceId, i]));

  // Each edit is saved straight away as this month's override for that source
  const handleIncomeChange = (sourceId: string, field: IncomeField, value: number) => {
    const current = incomeBySource.get(sourceId) || { sourceId, gross: 0, pension: 0, nationalInsurance: 0, tax: 0, net: 0 };
    const updated = { ...current, [field]: value };
    const others = savedIncome.filter(i => i.sourceId !== sourceId);
    // Back to the Settings defaults means there is nothing to override any more
    if (matchesDefaults(updated, defaultsBySource.get(sourceId))) {
      onSave(others);
      return;
    }
    onSave(
      overriddenIds.has(sourceId)
        ? savedIncome.map(i => (i.sourceId === sourceId ? updated : i))
        : [...savedIncome, updated]
    );
  };

  const handleUseDefaults = (sourceId: string) => {
    onSave(savedIncome.filter(i => i.sourceId !== sourceId));
  };

  const totalNet = activeSources.reduce((sum, s) => sum + (incomeBySource.get(s.id)?.net || 0), 0);

  if (activeSources.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">No income sources active for this month</p>
        <p className="text-xs text-muted-foreground">
          Go to Settings → Income Sources to add income streams with date ranges
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeSources.map((source) => {
        const income = incomeBySource.get(source.id)!;
        const isDefault = !overriddenIds.has(source.id) || matchesDefaults(income, defaultsBySource.get(source.id));
        const validation = validateIncomeAmounts(income.gross, income.pension, income.nationalInsurance, income.tax, income.net);

        return (
          <div
            key={source.id}
            className="relative rounded-lg border bg-card p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-1 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <div>
                  <h4 className="font-semibold text-lg">{source.name}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    {isDefault ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" />
                        Using defaults from Settings
                      </>
                    ) : (
                      'Adjusted for this month'
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUseDefaults(source.id)}
                disabled={isDefault}
              >
                <RefreshCw className="h-3 w-3" />
                Use Defaults
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {INCOME_FIELDS.map(({ field, label, idSuffix }) => (
                <div key={field} className="space-y-2 rounded-md bg-muted p-3">
                  <Label htmlFor={`${source.id}-${idSuffix}`} className={field === 'net' ? 'text-xs font-semibold' : 'text-xs'}>
                    {label}
                  </Label>
                  <CurrencyInput
                    id={`${source.id}-${idSuffix}`}
                    value={income[field] || 0}
                    onChange={(value) => handleIncomeChange(source.id, field, value)}
                    className="text-sm"
                  />
                </div>
              ))}
            </div>

            {!validation.isValid && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Net should be {formatCurrency(validation.expectedNet)} based on deductions</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="text-sm text-muted-foreground">Total Monthly Net Income</div>
        <div className="text-2xl font-semibold text-success">{formatCurrency(totalNet)}</div>
      </div>
    </div>
  );
};
