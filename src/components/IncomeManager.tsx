import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';
import { IncomeSource } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useConfirm } from './ui/confirm-dialog';
import { MonthPickerField } from './MonthPicker';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { MoneyInput } from './MoneyInput';
import { formatCurrency, validateIncomeAmounts } from '../utils/calculations';

interface IncomeManagerProps {
  incomeSources: IncomeSource[];
  onSave: (incomeSources: IncomeSource[]) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const incomeSchema = z
  .object({
    name: z.string().trim().min(1, 'Give this income source a name'),
    color: z.string(),
    startDate: z.string().min(1, 'Choose a start month'),
    endDate: z.string(),
    defaultGross: z.number().min(0, 'Must be zero or more'),
    defaultPension: z.number().min(0, 'Must be zero or more'),
    defaultNI: z.number().min(0, 'Must be zero or more'),
    defaultTax: z.number().min(0, 'Must be zero or more'),
    defaultNet: z.number().min(0, 'Must be zero or more'),
  })
  .refine(v => !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End month must be on or after the start month',
  });

type IncomeFormValues = z.infer<typeof incomeSchema>;

const emptyForm = (): IncomeFormValues => ({
  name: '',
  color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
  startDate: new Date().toISOString().slice(0, 7),
  endDate: '',
  defaultGross: 0,
  defaultPension: 0,
  defaultNI: 0,
  defaultTax: 0,
  defaultNet: 0,
});

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomeSources, onSave }) => {
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: emptyForm(),
  });

  const handleAdd = () => {
    setEditingSource(null);
    form.reset(emptyForm());
    setIsModalOpen(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source);
    form.reset({
      name: source.name,
      color: source.color || PRESET_COLORS[0],
      startDate: source.startDate,
      endDate: source.endDate || '',
      defaultGross: source.defaultGross,
      defaultPension: source.defaultPension,
      defaultNI: source.defaultNI,
      defaultTax: source.defaultTax,
      defaultNet: source.defaultNet,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (sourceId: string) => {
    const confirmed = await confirm({
      title: 'Delete this income source?',
      description: 'This income source will be removed from your configuration.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      onSave(incomeSources.filter((s) => s.id !== sourceId));
    }
  };

  // Net that doesn't add up is a warning, not an error
  const [gross, pension, ni, tax, net] = form.watch(['defaultGross', 'defaultPension', 'defaultNI', 'defaultTax', 'defaultNet']);
  const amountCheck = validateIncomeAmounts(gross, pension, ni, tax, net);

  const handleSubmit = (values: IncomeFormValues) => {
    const newSource: IncomeSource = {
      id: editingSource?.id || values.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: values.name.trim(),
      color: values.color,
      startDate: values.startDate,
      endDate: values.endDate || null,
      defaultGross: values.defaultGross,
      defaultPension: values.defaultPension,
      defaultNI: values.defaultNI,
      defaultTax: values.defaultTax,
      defaultNet: values.defaultNet,
    };

    if (editingSource) {
      onSave(incomeSources.map((s) => (s.id === editingSource.id ? newSource : s)));
    } else {
      onSave([...incomeSources, newSource]);
    }

    setIsModalOpen(false);
  };

  const formatDateRange = (startDate: string, endDate: string | null): string => {
    const start = new Date(startDate + '-01');
    const startStr = start.toLocaleString('en', { month: 'short', year: 'numeric' });

    if (!endDate) {
      return `${startStr} - Ongoing`;
    }

    const end = new Date(endDate + '-01');
    const endStr = end.toLocaleString('en', { month: 'short', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const totalGross = incomeSources.reduce((sum, s) => sum + s.defaultGross, 0);
  const totalNet = incomeSources.reduce((sum, s) => sum + s.defaultNet, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Income Sources</CardTitle>
              <CardDescription>
                Manage your income streams with date ranges and default amounts
              </CardDescription>
            </div>
            <Button onClick={handleAdd} size="lg">
              <Plus className="h-5 w-5" /> Add Income Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incomeSources.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
                <p className="mb-2 font-semibold">No income sources defined yet</p>
                <p>Click "Add Income Source" to set up your first income stream</p>
              </div>
            ) : (
              <>
                {incomeSources.map((source) => (
                  <div
                    key={source.id}
                    className="group relative flex items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:shadow-md"
                  >
                    <div
                      className="h-16 w-1 rounded-full"
                      style={{ backgroundColor: source.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-lg">{source.name}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-4 w-4" />
                            {formatDateRange(source.startDate, source.endDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {formatCurrency(source.defaultNet)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Gross: {formatCurrency(source.defaultGross)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                        <div>Pension: {formatCurrency(source.defaultPension)}</div>
                        <div>NI: {formatCurrency(source.defaultNI)}</div>
                        <div>Tax: {formatCurrency(source.defaultTax)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(source)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(source.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Total Summary */}
                <div className="mt-6 rounded-lg bg-muted/50 p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Total Monthly Gross</div>
                      <div className="text-2xl font-semibold text-primary">
                        {formatCurrency(totalGross)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Total Monthly Net</div>
                      <div className="text-2xl font-semibold text-success">
                        {formatCurrency(totalNet)}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSource ? 'Edit Income Source' : 'Add New Income Source'}
            </DialogTitle>
            <DialogDescription>
              Define an income source with date range and default monthly amounts
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Income Source Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Salary, Freelance, Benefits" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Month</FormLabel>
                    <FormControl>
                      <MonthPickerField value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Month (Optional)</FormLabel>
                    <FormControl>
                      <MonthPickerField value={field.value} onChange={field.onChange} placeholder="Ongoing" clearable />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-semibold">Monthly Income Breakdown</h4>

                  <FormField
                    control={form.control}
                    name="defaultGross"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gross Income</FormLabel>
                        <FormControl>
                          <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

              <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultPension"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pension</FormLabel>
                        <FormControl>
                          <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultNI"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Insurance</FormLabel>
                        <FormControl>
                          <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="defaultTax"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax</FormLabel>
                        <FormControl>
                          <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

                  <FormField
                    control={form.control}
                    name="defaultNet"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Take-Home Pay</FormLabel>
                        <FormControl>
                          <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

              {!amountCheck.isValid && (
                <div className="rounded-md bg-warning/10 p-3 text-sm text-warning">
                  Net would normally be {formatCurrency(amountCheck.expectedNet)} after these deductions. You can still save.
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <ColorSwatchPicker colors={PRESET_COLORS} value={field.value} onChange={field.onChange} />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingSource ? 'Save Changes' : 'Add Income Source'}
              </Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
