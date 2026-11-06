import { useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Category } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useConfirm } from './ui/confirm-dialog';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { MoneyInput } from './MoneyInput';
import { MonthPickerField } from './MonthPicker';
import { formatCurrency, getCurrentExpectedAmount } from '../utils/calculations';

interface CategoryManagerProps {
  categories: Category[];
  onSave: (categories: Category[]) => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const slugify = (name: string) => name.trim().toLowerCase().replace(/\s+/g, '-');

type ExpectedAmountValues = { amount: number; from: string; until: string };

type CategoryFormValues = {
  name: string;
  type: 'fixed' | 'variable';
  budgetAmount: number;
  color: string;
  expectedAmounts: ExpectedAmountValues[];
};

const formatMonth = (value: string) =>
  new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1).toLocaleString('en', { month: 'short', year: 'numeric' });

const toMonthValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const previousMonth = (value: string) => toMonthValue(new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 2));

// Fixed categories show what they're expected to cost, or that they come from transactions
const describeFixed = (category: Category) => {
  const current = getCurrentExpectedAmount(category);
  if (!current) return 'From transactions';
  const range = current.until
    ? `${current.from ? formatMonth(current.from) : 'until'} – ${formatMonth(current.until)}`
    : current.from ? `since ${formatMonth(current.from)}` : 'every month';
  const periods = category.expectedAmounts?.length || 0;
  return `${formatCurrency(current.amount)} expected ${range}${periods > 1 ? ` • ${periods} periods` : ''}`;
};

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onSave }) => {
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Rebuilt per render so the duplicate check knows which category is being edited
  const categorySchema = z.object({
    name: z
      .string()
      .trim()
      .min(1, 'Give this category a name')
      .refine(
        name => !categories.some(c =>
          c.id !== editingCategory?.id &&
          (c.name.toLowerCase() === name.toLowerCase() || (!editingCategory && c.id === slugify(name)))
        ),
        'A category with this name already exists'
      ),
    type: z.enum(['fixed', 'variable']),
    budgetAmount: z.number().min(0, 'Must be zero or more'),
    color: z.string(),
    expectedAmounts: z.array(
      z.object({
        amount: z.number().min(0, 'Must be zero or more'),
        from: z.string(),
        until: z.string(),
      }).refine(v => !v.from || !v.until || v.until >= v.from, {
        message: 'Must be after From',
        path: ['until'],
      })
    ),
  });

  const schemaRef = useRef(categorySchema);
  schemaRef.current = categorySchema;

  const form = useForm<CategoryFormValues>({
    resolver: (values, context, options) => zodResolver(schemaRef.current)(values, context, options),
    defaultValues: {
      name: '', type: 'variable', budgetAmount: 0, color: PRESET_COLORS[0], expectedAmounts: [],
    },
  });
  const expectedAmounts = useFieldArray({ control: form.control, name: 'expectedAmounts' });

  // A new period starts this month: the current one now ends last month, and the new one
  // keeps its end date (e.g. when a loan finishes)
  const handleAmountChanged = () => {
    const thisMonth = toMonthValue(new Date());
    const rows = form.getValues('expectedAmounts');
    const lastIndex = rows.length - 1;
    const last = rows[lastIndex] && { ...rows[lastIndex] };  // copy: setValue below changes the form's object
    const lastRunsOn = !!last && (!last.until || last.until >= thisMonth) && (!last.from || last.from < thisMonth);
    if (lastRunsOn) {
      form.setValue(`expectedAmounts.${lastIndex}.until`, previousMonth(thisMonth));
    }
    expectedAmounts.append({ amount: last?.amount || 0, from: thisMonth, until: lastRunsOn ? last.until : '' });
  };

  const handleAdd = () => {
    setEditingCategory(null);
    form.reset({
      name: '',
      type: 'variable',
      budgetAmount: 0,
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      expectedAmounts: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      type: category.type,
      budgetAmount: category.budgetAmount,
      color: category.color || PRESET_COLORS[0],
      expectedAmounts: (category.expectedAmounts || []).map(p => ({
        amount: p.amount,
        from: p.from || '',
        until: p.until || '',
      })),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    const confirmed = await confirm({
      title: 'Delete this category?',
      description: 'This category will be removed from your budget configuration.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (confirmed) {
      onSave(categories.filter((c) => c.id !== categoryId));
    }
  };

  const handleSubmit = (values: CategoryFormValues) => {
    const { expectedAmounts: periods, ...rest } = values;
    const isFixed = rest.type === 'fixed';
    const data: Omit<Category, 'id'> = {
      ...rest,
      name: rest.name.trim(),
      // Fixed costs have no budget; variable categories have no expected amounts
      budgetAmount: isFixed ? 0 : rest.budgetAmount,
      expectedAmounts: isFixed && periods.length
        ? periods.map(p => ({ amount: p.amount, from: p.from || undefined, until: p.until || undefined }))
        : undefined,
    };

    if (editingCategory) {
      onSave(
        categories.map((c) =>
          c.id === editingCategory.id ? { ...c, ...data } : c
        )
      );
    } else {
      const newCategory: Category = {
        id: slugify(data.name),
        ...data,
      };
      onSave([...categories, newCategory]);
    }

    setIsModalOpen(false);
  };

  const fixedCategories = categories.filter((c) => c.type === 'fixed');
  const variableCategories = categories.filter((c) => c.type === 'variable');

  const variableTotal = variableCategories.reduce((sum, c) => sum + c.budgetAmount, 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Budget Categories</CardTitle>
              <CardDescription>Fixed costs are tracked as they are; budgets apply to variable spending</CardDescription>
            </div>
            <Button onClick={handleAdd} size="lg">
              <Plus className="h-5 w-5" /> Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Fixed Expenses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Fixed Expenses</h3>
                <span className="text-sm font-medium text-muted-foreground">No budget</span>
              </div>
              <div className="space-y-1.5">
                {fixedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="group relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {describeFixed(category)}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {fixedCategories.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No fixed expenses yet. Click "Add Category" to get started.
                  </div>
                )}
              </div>
            </div>

            {/* Variable Expenses */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Variable Expenses</h3>
                <span className="text-sm font-medium text-muted-foreground">
                  {formatCurrency(variableTotal)}/mo budget
                </span>
              </div>
              <div className="space-y-1.5">
                {variableCategories.map((category) => (
                  <div
                    key={category.id}
                    className="group relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                  >
                    <div
                      className="h-8 w-1 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(category.budgetAmount)} budget per month
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleDelete(category.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {variableCategories.length === 0 && (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No variable expenses yet. Click "Add Category" to get started.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Summary */}
          <div className="mt-4 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between font-semibold">
              <span>Monthly Variable Budget</span>
              <span className="text-xl text-primary">{formatCurrency(variableTotal)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Fixed costs come from their transactions, or their expected amount when nothing is imported.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Update the details for this budget category.'
                : 'Create a new budget category to track your expenses.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed - Same amount every month</SelectItem>
                      <SelectItem value="variable">Variable - Changes each month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('type') === 'variable' ? (
              <FormField
                control={form.control}
                name="budgetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Budget</FormLabel>
                    <FormControl>
                      <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-2 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">Expected amount (optional)</div>
                  <p className="text-xs text-muted-foreground">
                    Fixed costs have no budget. Leave this empty if the cost comes through your bank transactions.
                    Set it for payments from accounts not in Emma: it fills in any month with nothing imported.
                  </p>
                </div>
                {expectedAmounts.fields.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`expectedAmounts.${index}.amount`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">Amount</FormLabel>}
                          <FormControl>
                            <MoneyInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} ref={field.ref} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`expectedAmounts.${index}.from`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">From</FormLabel>}
                          <FormControl>
                            <MonthPickerField value={field.value} onChange={field.onChange} placeholder="Always" clearable />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`expectedAmounts.${index}.until`}
                      render={({ field }) => (
                        <FormItem>
                          {index === 0 && <FormLabel className="text-xs">Until</FormLabel>}
                          <FormControl>
                            <MonthPickerField value={field.value} onChange={field.onChange} placeholder="Ongoing" clearable />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={index === 0 ? 'mt-[22px]' : ''}
                      onClick={() => expectedAmounts.remove(index)}
                      aria-label="Remove this period"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAmountChanged}>
                  <Plus className="h-3.5 w-3.5" />
                  {expectedAmounts.fields.length === 0 ? 'Add expected amount' : 'Amount changed'}
                </Button>
              </div>
            )}

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
              <Button type="submit">{editingCategory ? 'Save Changes' : 'Add Category'}</Button>
            </DialogFooter>
          </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
