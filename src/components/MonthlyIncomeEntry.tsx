import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { IncomeSource, MonthlyIncome } from '../types';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { formatCurrency, getSuggestedIncome, validateIncomeAmounts } from '../utils/calculations';
import { CurrencyInput } from './CurrencyInput';

interface MonthlyIncomeEntryProps {
  incomeSources: IncomeSource[];
  monthData: { income: MonthlyIncome[] };
  year: number;
  month: number;
  onSave: (income: MonthlyIncome[]) => void;
}

export const MonthlyIncomeEntry: React.FC<MonthlyIncomeEntryProps> = ({
  incomeSources,
  monthData,
  year,
  month,
  onSave,
}) => {
  const [incomeData, setIncomeData] = useState<{ [sourceId: string]: MonthlyIncome }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<{ [sourceId: string]: string }>({});

  // Get suggested income sources for this month
  const suggestedIncome = getSuggestedIncome(incomeSources, year, month);
  const activeSourceIds = new Set(suggestedIncome.map(s => s.sourceId));
  const activeSources = incomeSources.filter(s => activeSourceIds.has(s.id));

  useEffect(() => {
    // Initialize income data from monthData or suggestions
    const incomeMap: { [sourceId: string]: MonthlyIncome } = {};
    let hasSuggestedData = false;

    // First, load existing income data
    (monthData.income || []).forEach((income) => {
      incomeMap[income.sourceId] = income;
    });

    // Then, for any missing active sources, use suggestions
    suggestedIncome.forEach((suggested) => {
      if (!incomeMap[suggested.sourceId]) {
        incomeMap[suggested.sourceId] = suggested;
        hasSuggestedData = true;
      }
    });

    setIncomeData(incomeMap);
    // If we're showing suggested data that hasn't been saved, enable the save button
    setHasChanges(hasSuggestedData && monthData.income?.length === 0);
    setValidationWarnings({});
  }, [year, month, monthData]);

  const handleIncomeChange = (
    sourceId: string,
    field: keyof Omit<MonthlyIncome, 'sourceId' | 'notes'>,
    value: number
  ) => {
    const currentIncome = incomeData[sourceId] || { sourceId, gross: 0, pension: 0, nationalInsurance: 0, tax: 0, net: 0 };
    const updatedIncome = { ...currentIncome, [field]: value };

    // Validate amounts
    const validation = validateIncomeAmounts(
      updatedIncome.gross,
      updatedIncome.pension,
      updatedIncome.nationalInsurance,
      updatedIncome.tax,
      updatedIncome.net
    );

    if (!validation.isValid) {
      setValidationWarnings({
        ...validationWarnings,
        [sourceId]: `Net should be ${formatCurrency(validation.expectedNet)} based on deductions`,
      });
    } else {
      const newWarnings = { ...validationWarnings };
      delete newWarnings[sourceId];
      setValidationWarnings(newWarnings);
    }

    setIncomeData({ ...incomeData, [sourceId]: updatedIncome });
    setHasChanges(true);
  };

  const handleUseDefaults = (sourceId: string) => {
    const suggested = suggestedIncome.find(s => s.sourceId === sourceId);
    if (suggested) {
      setIncomeData({ ...incomeData, [sourceId]: suggested });
      setHasChanges(true);

      // Clear validation warning since defaults are valid
      const newWarnings = { ...validationWarnings };
      delete newWarnings[sourceId];
      setValidationWarnings(newWarnings);
    }
  };

  const handleSave = () => {
    const incomeArray = Object.values(incomeData).filter(income =>
      activeSourceIds.has(income.sourceId) && income.gross > 0
    );
    onSave(incomeArray);
    setHasChanges(false);
  };

  const totalNet = Object.values(incomeData)
    .filter(income => activeSourceIds.has(income.sourceId))
    .reduce((sum, income) => sum + income.net, 0);

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
        const income = incomeData[source.id] || { sourceId: source.id, gross: 0, pension: 0, nationalInsurance: 0, tax: 0, net: 0 };
        const suggested = suggestedIncome.find(s => s.sourceId === source.id);
        const isSuggested = suggested && JSON.stringify(income) === JSON.stringify(suggested);

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
                  {isSuggested && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Using default values
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUseDefaults(source.id)}
                disabled={isSuggested}
              >
                <RefreshCw className="h-3 w-3" />
                Use Defaults
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`${source.id}-gross`} className="text-xs">Gross Income</Label>
                <CurrencyInput
                  id={`${source.id}-gross`}
                  value={income.gross || 0}
                  onChange={(value) => handleIncomeChange(source.id, 'gross', value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${source.id}-pension`} className="text-xs">Pension</Label>
                <CurrencyInput
                  id={`${source.id}-pension`}
                  value={income.pension || 0}
                  onChange={(value) => handleIncomeChange(source.id, 'pension', value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${source.id}-ni`} className="text-xs">National Insurance</Label>
                <CurrencyInput
                  id={`${source.id}-ni`}
                  value={income.nationalInsurance || 0}
                  onChange={(value) => handleIncomeChange(source.id, 'nationalInsurance', value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${source.id}-tax`} className="text-xs">Tax</Label>
                <CurrencyInput
                  id={`${source.id}-tax`}
                  value={income.tax || 0}
                  onChange={(value) => handleIncomeChange(source.id, 'tax', value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${source.id}-net`} className="text-xs font-semibold">Net Take-Home</Label>
                <CurrencyInput
                  id={`${source.id}-net`}
                  value={income.net || 0}
                  onChange={(value) => handleIncomeChange(source.id, 'net', value)}
                  className="text-sm"
                />
              </div>
            </div>

            {validationWarnings[source.id] && (
              <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-xs text-warning">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{validationWarnings[source.id]}</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
        <div>
          <div className="text-sm text-muted-foreground">Total Monthly Net Income</div>
          <div className="text-2xl font-semibold text-success">{formatCurrency(totalNet)}</div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges} variant="success">
          Save Income
        </Button>
      </div>
    </div>
  );
};
